using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResumeAI.Resume.API.Services;
using ResumeAI.Shared.DTOs;

namespace ResumeAI.Resume.API.Controllers;

[ApiController]
[Route("api/resumes")]
[Authorize]
public class ResumeController(IResumeService resumeService) : ControllerBase
{
    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException());

    [HttpPost]
    public async Task<IActionResult> CreateResume([FromBody] CreateResumeRequest request)
    {
        var resume = await resumeService.CreateResumeAsync(CurrentUserId, request);
        return CreatedAtAction(nameof(GetById), new { resumeId = resume.ResumeId },
            ApiResponse<ResumeDto>.Ok(resume));
    }

    [HttpPost("{resumeId:int}/duplicate")]
    public async Task<IActionResult> Duplicate(int resumeId)
    {
        try
        {
            var copy = await resumeService.DuplicateResumeAsync(resumeId, CurrentUserId);
            return Ok(ApiResponse<ResumeDto>.Ok(copy));
        }
        catch (KeyNotFoundException ex) { return NotFound(ApiResponse<ResumeDto>.Fail(ex.Message)); }
    }

    [HttpGet("{resumeId:int}")]
    public async Task<IActionResult> GetById(int resumeId)
    {
        var resume = await resumeService.GetResumeByIdAsync(resumeId);
        if (resume is null) return NotFound();
        // Increment view count for public resumes viewed by others
        if (resume.IsPublic && resume.UserId != CurrentUserId)
            await resumeService.IncrementViewCountAsync(resumeId);
        return Ok(ApiResponse<ResumeDto>.Ok(resume));
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyResumes()
    {
        var resumes = await resumeService.GetResumesByUserAsync(CurrentUserId);
        return Ok(ApiResponse<IList<ResumeDto>>.Ok(resumes));
    }

    [AllowAnonymous]
    [HttpGet("public")]
    public async Task<IActionResult> GetPublicGallery()
    {
        var resumes = await resumeService.GetPublicResumesAsync();
        return Ok(ApiResponse<IList<ResumeDto>>.Ok(resumes));
    }

    [HttpGet("by-template/{templateId:int}")]
    public async Task<IActionResult> GetByTemplate(int templateId)
    {
        var resumes = await resumeService.GetResumesByTemplateAsync(templateId);
        return Ok(ApiResponse<IList<ResumeDto>>.Ok(resumes));
    }

    [HttpPut("{resumeId:int}")]
    public async Task<IActionResult> UpdateResume(int resumeId, [FromBody] UpdateResumeRequest request)
    {
        try
        {
            var resume = await resumeService.UpdateResumeAsync(resumeId, request);
            return Ok(ApiResponse<ResumeDto>.Ok(resume));
        }
        catch (KeyNotFoundException ex) { return NotFound(ApiResponse<ResumeDto>.Fail(ex.Message)); }
    }

    [HttpPut("{resumeId:int}/publish")]
    public async Task<IActionResult> Publish(int resumeId)
    {
        try
        {
            var resume = await resumeService.PublishResumeAsync(resumeId);
            return Ok(ApiResponse<ResumeDto>.Ok(resume));
        }
        catch (KeyNotFoundException ex) { return NotFound(ApiResponse<ResumeDto>.Fail(ex.Message)); }
    }

    [HttpPut("{resumeId:int}/unpublish")]
    public async Task<IActionResult> Unpublish(int resumeId)
    {
        try
        {
            var resume = await resumeService.UnpublishResumeAsync(resumeId);
            return Ok(ApiResponse<ResumeDto>.Ok(resume));
        }
        catch (KeyNotFoundException ex) { return NotFound(ApiResponse<ResumeDto>.Fail(ex.Message)); }
    }

    [HttpPut("{resumeId:int}/ats-score")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> UpdateAtsScore(int resumeId, [FromBody] int score)
    {
        await resumeService.UpdateAtsScoreAsync(resumeId, score);
        return NoContent();
    }

    [HttpDelete("{resumeId:int}")]
    public async Task<IActionResult> DeleteResume(int resumeId)
    {
        await resumeService.DeleteResumeAsync(resumeId);
        return NoContent();
    }
}
