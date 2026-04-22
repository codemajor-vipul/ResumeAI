using System.Text.Json;
using ResumeAI.JobMatch.API.Entities;
using ResumeAI.JobMatch.API.Repositories;
using ResumeAI.Shared.DTOs;
using ResumeAI.Shared.Enums;

namespace ResumeAI.JobMatch.API.Services;

public interface IJobMatchService
{
    Task<JobMatchDto> AnalyzeJobFitAsync(int userId, AnalyzeJobFitRequest request);
    Task<IList<JobMatchDto>> GetMatchesByResumeAsync(int resumeId);
    Task<IList<JobMatchDto>> GetMatchesByUserAsync(int userId);
    Task<JobMatchDto?> GetMatchByIdAsync(int matchId);
    Task<IList<JobMatchDto>> GetTopMatchesAsync(int userId, int minScore = 70);
    Task BookmarkMatchAsync(int matchId, bool isBookmarked);
    Task<IList<JobMatchDto>> FetchJobsFromLinkedInAsync(int userId, int resumeId, string keywords);
    Task<IList<JobMatchDto>> FetchJobsFromNaukriAsync(int userId, int resumeId, string keywords);
    Task<string> GetTailoringRecommendationsAsync(int matchId);
    Task DeleteMatchAsync(int matchId);
}

public class JobMatchService(
    IJobMatchRepository matchRepo,
    IHttpClientFactory httpClientFactory,
    ILogger<JobMatchService> logger) : IJobMatchService
{
    public async Task<JobMatchDto> AnalyzeJobFitAsync(int userId, AnalyzeJobFitRequest request)
    {
        // Stub AI analysis — in production, call IAiService via HttpClient
        var score = Random.Shared.Next(40, 95); // stub score
        var match = new JobMatchRecord
        {
            ResumeId = request.ResumeId,
            UserId = userId,
            JobTitle = request.JobTitle,
            JobDescription = request.JobDescription,
            MatchScore = score,
            MissingSkills = "Leadership, Kubernetes, Terraform", // stub
            Recommendations = "Add more quantified achievements and relevant keywords.",
            Source = request.Source
        };
        var saved = await matchRepo.AddAsync(match);
        return MapToDto(saved);
    }

    public async Task<IList<JobMatchDto>> GetMatchesByResumeAsync(int resumeId)
        => (await matchRepo.FindByResumeIdAsync(resumeId)).Select(MapToDto).ToList();

    public async Task<IList<JobMatchDto>> GetMatchesByUserAsync(int userId)
        => (await matchRepo.FindByUserIdAsync(userId)).Select(MapToDto).ToList();

    public async Task<JobMatchDto?> GetMatchByIdAsync(int matchId)
    {
        var m = await matchRepo.FindByMatchIdAsync(matchId);
        return m is null ? null : MapToDto(m);
    }

    public async Task<IList<JobMatchDto>> GetTopMatchesAsync(int userId, int minScore = 70)
        => (await matchRepo.FindByMatchScoreGreaterThanAsync(minScore))
            .Where(m => m.UserId == userId)
            .Select(MapToDto).ToList();

    public Task BookmarkMatchAsync(int matchId, bool isBookmarked)
        => matchRepo.BookmarkMatchAsync(matchId, isBookmarked);

    public async Task<IList<JobMatchDto>> FetchJobsFromLinkedInAsync(
        int userId, int resumeId, string keywords)
    {
        // IHttpClientFactory typed client with Polly retry + circuit-breaker
        var client = httpClientFactory.CreateClient("LinkedIn");
        try
        {
            var response = await client.GetAsync(
                $"/v2/jobs?keywords={Uri.EscapeDataString(keywords)}&count=10");
            response.EnsureSuccessStatusCode();
            // In production: deserialise LinkedIn API response and create JobMatchRecord records
            logger.LogInformation("LinkedIn API call succeeded for keywords: {Keywords}", keywords);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "LinkedIn API unavailable — circuit-breaker engaged.");
        }
        // Return existing matches as fallback
        return (await matchRepo.FindByResumeIdAsync(resumeId)).Select(MapToDto).ToList();
    }

    public async Task<IList<JobMatchDto>> FetchJobsFromNaukriAsync(
        int userId, int resumeId, string keywords)
    {
        var client = httpClientFactory.CreateClient("Naukri");
        try
        {
            var response = await client.GetAsync(
                $"/api/jobs?query={Uri.EscapeDataString(keywords)}");
            response.EnsureSuccessStatusCode();
            logger.LogInformation("Naukri API call succeeded for keywords: {Keywords}", keywords);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Naukri API unavailable — circuit-breaker engaged.");
        }
        return (await matchRepo.FindByResumeIdAsync(resumeId)).Select(MapToDto).ToList();
    }

    public async Task<string> GetTailoringRecommendationsAsync(int matchId)
    {
        var match = await matchRepo.FindByMatchIdAsync(matchId)
                    ?? throw new KeyNotFoundException("Match not found.");
        return match.Recommendations;
    }

    public Task DeleteMatchAsync(int matchId)
        => matchRepo.DeleteByMatchIdAsync(matchId);

    private static JobMatchDto MapToDto(JobMatchRecord m) =>
        new(m.MatchId, m.ResumeId, m.UserId, m.JobTitle, m.JobDescription,
            m.MatchScore, m.MissingSkills, m.Recommendations,
            m.Source, m.MatchedAt, m.IsBookmarked);
}
