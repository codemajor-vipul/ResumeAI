using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResumeAI.Export.API.Services;
using ResumeAI.Shared.DTOs;

namespace ResumeAI.Export.API.Controllers;

[ApiController]
[Route("api/exports")]
[Authorize]
public class ExportController(IExportService exportService) : ControllerBase
{
    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException());

    [HttpPost("pdf")]
    public async Task<IActionResult> ExportPdf([FromBody] ExportRequest request)
    {
        var job = await exportService.ExportToPdfAsync(CurrentUserId, request);
        return Ok(ApiResponse<ExportJobDto>.Ok(job));
    }

    [Authorize(Policy = "PremiumOnly")]
    [HttpPost("docx")]
    public async Task<IActionResult> ExportDocx([FromBody] ExportRequest request)
    {
        var job = await exportService.ExportToDocxAsync(CurrentUserId, request);
        return Ok(ApiResponse<ExportJobDto>.Ok(job));
    }

    [Authorize(Policy = "PremiumOnly")]
    [HttpPost("json")]
    public async Task<IActionResult> ExportJson([FromBody] ExportRequest request)
    {
        var job = await exportService.ExportToJsonAsync(CurrentUserId, request);
        return Ok(ApiResponse<ExportJobDto>.Ok(job));
    }

    [HttpGet("{jobId}/status")]
    public async Task<IActionResult> GetStatus(string jobId)
    {
        var job = await exportService.GetJobStatusAsync(jobId);
        return job is null ? NotFound() : Ok(ApiResponse<ExportJobDto>.Ok(job));
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyExports()
    {
        var jobs = await exportService.GetExportsByUserAsync(CurrentUserId);
        return Ok(ApiResponse<IList<ExportJobDto>>.Ok(jobs));
    }

    [HttpGet("{jobId}/download")]
    public async Task<IActionResult> Download(string jobId)
    {
        try
        {
            var bytes = await exportService.DownloadFileAsync(jobId);
            return File(bytes, "application/octet-stream", jobId);
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpDelete("{jobId}")]
    public async Task<IActionResult> Delete(string jobId)
    {
        await exportService.DeleteExportAsync(jobId);
        return NoContent();
    }
}
