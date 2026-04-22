using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResumeAI.JobMatch.API.Services;
using ResumeAI.Shared.DTOs;

namespace ResumeAI.JobMatch.API.Controllers;

[ApiController]
[Route("api/job-matches")]
[Authorize(Policy = "PremiumOnly")]
public class JobMatchController(IJobMatchService matchService) : ControllerBase
{
    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException());

    [HttpPost("analyze")]
    public async Task<IActionResult> Analyze([FromBody] AnalyzeJobFitRequest request)
    {
        var match = await matchService.AnalyzeJobFitAsync(CurrentUserId, request);
        return Ok(ApiResponse<JobMatchDto>.Ok(match));
    }

    [HttpGet("by-resume/{resumeId:int}")]
    public async Task<IActionResult> GetByResume(int resumeId)
        => Ok(ApiResponse<IList<JobMatchDto>>.Ok(await matchService.GetMatchesByResumeAsync(resumeId)));

    [HttpGet("my")]
    public async Task<IActionResult> GetByUser()
        => Ok(ApiResponse<IList<JobMatchDto>>.Ok(await matchService.GetMatchesByUserAsync(CurrentUserId)));

    [HttpGet("{matchId:int}")]
    public async Task<IActionResult> GetById(int matchId)
    {
        var match = await matchService.GetMatchByIdAsync(matchId);
        return match is null ? NotFound() : Ok(ApiResponse<JobMatchDto>.Ok(match));
    }

    [HttpGet("top")]
    public async Task<IActionResult> GetTopMatches([FromQuery] int minScore = 70)
        => Ok(ApiResponse<IList<JobMatchDto>>.Ok(await matchService.GetTopMatchesAsync(CurrentUserId, minScore)));

    [HttpPost("{matchId:int}/bookmark")]
    public async Task<IActionResult> Bookmark(int matchId, [FromQuery] bool bookmarked = true)
    {
        await matchService.BookmarkMatchAsync(matchId, bookmarked);
        return NoContent();
    }

    [HttpPost("fetch/linkedin")]
    public async Task<IActionResult> FetchLinkedIn([FromQuery] int resumeId, [FromQuery] string keywords)
    {
        var matches = await matchService.FetchJobsFromLinkedInAsync(CurrentUserId, resumeId, keywords);
        return Ok(ApiResponse<IList<JobMatchDto>>.Ok(matches));
    }

    [HttpPost("fetch/naukri")]
    public async Task<IActionResult> FetchNaukri([FromQuery] int resumeId, [FromQuery] string keywords)
    {
        var matches = await matchService.FetchJobsFromNaukriAsync(CurrentUserId, resumeId, keywords);
        return Ok(ApiResponse<IList<JobMatchDto>>.Ok(matches));
    }

    [HttpGet("{matchId:int}/recommendations")]
    public async Task<IActionResult> GetRecommendations(int matchId)
    {
        try
        {
            var rec = await matchService.GetTailoringRecommendationsAsync(matchId);
            return Ok(ApiResponse<string>.Ok(rec));
        }
        catch (KeyNotFoundException ex) { return NotFound(ApiResponse<string>.Fail(ex.Message)); }
    }

    [HttpDelete("{matchId:int}")]
    public async Task<IActionResult> Delete(int matchId)
    {
        await matchService.DeleteMatchAsync(matchId);
        return NoContent();
    }
}
