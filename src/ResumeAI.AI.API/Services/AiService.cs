using Azure.AI.OpenAI;
using Ganss.Xss;
using Microsoft.Extensions.Caching.Distributed;
using OpenAI.Chat;
using ResumeAI.AI.API.Entities;
using ResumeAI.AI.API.Repositories;
using ResumeAI.Shared.DTOs;
using ResumeAI.Shared.Enums;

namespace ResumeAI.AI.API.Services;

/// <summary>
/// AI Content Service — primary: OpenAI GPT-4o via Azure.AI.OpenAI;
/// fallback: Anthropic Claude via Anthropic.SDK.
/// Quota tracked per-user per-month in Redis IDistributedCache.
/// </summary>
public class AiService(
    IAiRequestRepository aiRepo,
    IDistributedCache cache,
    IConfiguration config,
    ILogger<AiService> logger) : IAiService
{
    private const int FreeContentQuota = 5;
    private const int FreeAtsQuota = 3;

    private readonly HtmlSanitizer _sanitizer = new();

    // ─── Public service methods ───────────────────────────────────

    public Task<AiRequestDto> GenerateSummaryAsync(int userId, GenerateSummaryRequest request)
    {
        var prompt = $"Write a professional resume summary for a {_sanitizer.Sanitize(request.JobTitle)} " +
                     $"with {request.YearsOfExperience} years of experience. " +
                     $"Key skills: {_sanitizer.Sanitize(request.KeySkills)}. " +
                     "Keep it concise, impactful, and ATS-friendly (3-4 sentences).";
        return ExecuteAiCallAsync(userId, request.ResumeId, AiRequestType.SUMMARY, prompt);
    }

    public Task<AiRequestDto> GenerateBulletPointsAsync(int userId, GenerateBulletsRequest request)
    {
        var prompt = $"Generate 4-6 strong resume bullet points for the role of " +
                     $"{_sanitizer.Sanitize(request.JobTitle)} at {_sanitizer.Sanitize(request.CompanyName)}. " +
                     $"Responsibilities: {_sanitizer.Sanitize(request.Responsibilities)}. " +
                     "Use action verbs and quantify achievements where possible.";
        return ExecuteAiCallAsync(userId, request.ResumeId, AiRequestType.BULLETS, prompt);
    }

    public Task<AiRequestDto> GenerateCoverLetterAsync(int userId, GenerateCoverLetterRequest request)
    {
        var prompt = $"Write a tailored cover letter for {_sanitizer.Sanitize(request.CompanyName)}. " +
                     $"Job description: {_sanitizer.Sanitize(request.JobDescription)}. " +
                     "Keep it professional, enthusiastic, and under 300 words.";
        return ExecuteAiCallAsync(userId, request.ResumeId, AiRequestType.COVER_LETTER, prompt);
    }

    public Task<AiRequestDto> ImproveSectionAsync(int userId, ImproveSectionRequest request)
    {
        var hint = string.IsNullOrEmpty(request.ImprovementHint)
            ? "more impactful and professional"
            : _sanitizer.Sanitize(request.ImprovementHint);
        var prompt = $"Rewrite the following resume section to be {hint}:\n\n" +
                     _sanitizer.Sanitize(request.CurrentContent);
        return ExecuteAiCallAsync(userId, request.ResumeId, AiRequestType.IMPROVE, prompt);
    }

    public Task<AiRequestDto> CheckAtsCompatibilityAsync(int userId, CheckAtsRequest request)
    {
        var prompt = $"Analyse this resume against the job description below. " +
                     "Return a JSON object with: score (0-100), missingKeywords (array), suggestions (array).\n\n" +
                     $"Job Description:\n{_sanitizer.Sanitize(request.JobDescription)}";
        return ExecuteAiCallAsync(userId, request.ResumeId, AiRequestType.ATS, prompt,
            isAtsCall: true);
    }

    public Task<AiRequestDto> SuggestSkillsAsync(int userId, SuggestSkillsRequest request)
    {
        var prompt = $"List the top 15 in-demand technical and soft skills for a " +
                     $"{_sanitizer.Sanitize(request.TargetJobTitle)} role in 2025. " +
                     "Return as a comma-separated list.";
        return ExecuteAiCallAsync(userId, request.ResumeId, AiRequestType.SKILLS, prompt);
    }

    public Task<AiRequestDto> TailorResumeForJobAsync(int userId, TailorResumeRequest request)
    {
        var prompt = $"Tailor this resume for the job description below. " +
                     "Return the complete improved resume as JSON.\n\n" +
                     $"Job Description:\n{_sanitizer.Sanitize(request.JobDescription)}";
        return ExecuteAiCallAsync(userId, request.ResumeId, AiRequestType.TAILOR, prompt);
    }

    public Task<AiRequestDto> TranslateResumeAsync(int userId, TranslateResumeRequest request)
    {
        var prompt = $"Translate this resume to {_sanitizer.Sanitize(request.TargetLanguage)}, " +
                     "maintaining professional tone and formatting. Return as JSON.";
        return ExecuteAiCallAsync(userId, request.ResumeId, AiRequestType.TRANSLATE, prompt);
    }

    public async Task<IList<AiRequestDto>> GetAiHistoryAsync(int userId)
    {
        var requests = await aiRepo.FindByUserIdAsync(userId);
        return requests.Select(MapToDto).ToList();
    }

    public async Task<AiQuotaDto> GetRemainingQuotaAsync(int userId)
    {
        var contentUsed = await GetQuotaCounterAsync(userId, "content");
        var atsUsed = await GetQuotaCounterAsync(userId, "ats");
        return new AiQuotaDto(
            RemainingContentCalls: Math.Max(0, FreeContentQuota - contentUsed),
            RemainingAtsCalls: Math.Max(0, FreeAtsQuota - atsUsed),
            MaxContentCalls: FreeContentQuota,
            MaxAtsCalls: FreeAtsQuota);
    }

    // ─── Core AI execution ────────────────────────────────────────

    private async Task<AiRequestDto> ExecuteAiCallAsync(
        int userId, int resumeId, AiRequestType type, string prompt, bool isAtsCall = false)
    {
        // Quota check for free users (quota enforcement in middleware/controller with plan claim)
        var quotaKey = isAtsCall ? "ats" : "content";
        var used = await GetQuotaCounterAsync(userId, quotaKey);
        var limit = isAtsCall ? FreeAtsQuota : FreeContentQuota;

        var aiReqEntity = new AiRequest
        {
            UserId = userId,
            ResumeId = resumeId,
            RequestType = type,
            InputPrompt = prompt,
            Status = AiRequestStatus.QUEUED
        };
        var saved = await aiRepo.AddAsync(aiReqEntity);

        string responseText;
        AiModel usedModel;
        int tokens;

        try
        {
            (responseText, tokens) = await CallOpenAiAsync(prompt);
            usedModel = AiModel.GPT4O;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "OpenAI call failed — falling back to Claude.");
            try
            {
                (responseText, tokens) = await CallClaudeAsync(prompt);
                usedModel = AiModel.CLAUDE;
            }
            catch (Exception fallbackEx)
            {
                logger.LogError(fallbackEx, "Both AI providers failed.");
                saved.Status = AiRequestStatus.FAILED;
                await aiRepo.UpdateAsync(saved);
                throw new InvalidOperationException("AI service unavailable. Please try again later.");
            }
        }

        saved.AiResponse = responseText;
        saved.Model = usedModel;
        saved.TokensUsed = tokens;
        saved.Status = AiRequestStatus.COMPLETED;
        saved.CompletedAt = DateTime.UtcNow;
        await aiRepo.UpdateAsync(saved);

        // Increment Redis quota counter
        await IncrementQuotaCounterAsync(userId, quotaKey);

        return MapToDto(saved);
    }

    // ─── OpenAI GPT-4o ───────────────────────────────────────────

    private async Task<(string text, int tokens)> CallOpenAiAsync(string prompt)
    {
        var endpoint = config["OpenAI:Endpoint"];
        var apiKey = config["OpenAI:ApiKey"]
            ?? throw new InvalidOperationException("OpenAI:ApiKey not configured.");

        AzureOpenAIClient client = new(new Uri(endpoint ?? "https://api.openai.com/v1"),
            new System.ClientModel.ApiKeyCredential(apiKey));

        var chatClient = client.GetChatClient("gpt-4o");
        var completion = await chatClient.CompleteChatAsync(
            [new UserChatMessage(prompt)]);

        var text = completion.Value.Content[0].Text;
        var tokens = completion.Value.Usage.TotalTokenCount;
        return (text, tokens);
    }

    // ─── Anthropic Claude — removed (OpenAI-only for local dev) ─────
    // If OpenAI fails the exception propagates to the caller.
    private static Task<(string text, int tokens)> CallClaudeAsync(string _)
        => throw new NotSupportedException("Claude fallback not configured. Check OpenAI key.");

    // ─── Redis quota helpers ──────────────────────────────────────

    private async Task<int> GetQuotaCounterAsync(int userId, string type)
    {
        var key = QuotaKey(userId, type);
        var val = await cache.GetStringAsync(key);
        return val is null ? 0 : int.Parse(val);
    }

    private async Task IncrementQuotaCounterAsync(int userId, string type)
    {
        var key = QuotaKey(userId, type);
        var current = await GetQuotaCounterAsync(userId, type);
        var expiry = new DateTimeOffset(
            DateTime.UtcNow.Year, DateTime.UtcNow.Month,
            DateTime.DaysInMonth(DateTime.UtcNow.Year, DateTime.UtcNow.Month),
            23, 59, 59, TimeSpan.Zero);
        await cache.SetStringAsync(key, (current + 1).ToString(),
            new DistributedCacheEntryOptions { AbsoluteExpiration = expiry });
    }

    private static string QuotaKey(int userId, string type)
    {
        var now = DateTime.UtcNow;
        return $"ai-quota:{userId}:{type}:{now.Year}-{now.Month:D2}";
    }

    // ─── Mapping ─────────────────────────────────────────────────

    private static AiRequestDto MapToDto(AiRequest r) =>
        new(r.RequestId, r.UserId, r.ResumeId, r.RequestType,
            r.InputPrompt, r.AiResponse, r.Model, r.TokensUsed,
            r.Status, r.CreatedAt, r.CompletedAt);
}
