using System.Text;
using System.Text.Json;
using Azure.Storage.Blobs;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using ResumeAI.Export.API.Entities;
using ResumeAI.Export.API.Repositories;
using ResumeAI.Shared.DTOs;
using ResumeAI.Shared.Enums;

namespace ResumeAI.Export.API.Services;

public interface IExportService
{
    Task<ExportJobDto> ExportToPdfAsync(int userId, ExportRequest request);
    Task<ExportJobDto> ExportToDocxAsync(int userId, ExportRequest request);
    Task<ExportJobDto> ExportToJsonAsync(int userId, ExportRequest request);
    Task<ExportJobDto?> GetJobStatusAsync(string jobId);
    Task<IList<ExportJobDto>> GetExportsByUserAsync(int userId);
    Task<byte[]> DownloadFileAsync(string jobId);
    Task DeleteExportAsync(string jobId);
}

/// <summary>
/// Export service — PDF via QuestPDF, DOCX via OpenXML SDK,
/// JSON via System.Text.Json. Files stored in Azure Blob Storage
/// with 7-day expiry.
/// </summary>
public class ExportService(
    IExportRepository exportRepo,
    IConfiguration config,
    ILogger<ExportService> logger) : IExportService
{
    public async Task<ExportJobDto> ExportToPdfAsync(int userId, ExportRequest request)
    {
        // Set QuestPDF community licence
        QuestPDF.Settings.License = LicenseType.Community;

        var job = await CreateJobAsync(userId, request, ExportFormat.PDF);

        try
        {
            job.Status = ExportStatus.PROCESSING;
            await exportRepo.UpdateAsync(job);

            var pdfBytes = GeneratePdf(request.ResumeId);
            var url = await UploadToBlobAsync(job.JobId, pdfBytes, "application/pdf");

            job.FileUrl = url;
            job.FileSizeKb = pdfBytes.Length / 1024;
            job.Status = ExportStatus.COMPLETED;
            job.CompletedAt = DateTime.UtcNow;
            job.ExpiresAt = DateTime.UtcNow.AddDays(7);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "PDF export failed for job {JobId}", job.JobId);
            job.Status = ExportStatus.FAILED;
        }

        var updated = await exportRepo.UpdateAsync(job);
        return MapToDto(updated);
    }

    public async Task<ExportJobDto> ExportToDocxAsync(int userId, ExportRequest request)
    {
        var job = await CreateJobAsync(userId, request, ExportFormat.DOCX);

        try
        {
            job.Status = ExportStatus.PROCESSING;
            await exportRepo.UpdateAsync(job);

            var docxBytes = GenerateDocx(request.ResumeId);
            var url = await UploadToBlobAsync(job.JobId, docxBytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

            job.FileUrl = url;
            job.FileSizeKb = docxBytes.Length / 1024;
            job.Status = ExportStatus.COMPLETED;
            job.CompletedAt = DateTime.UtcNow;
            job.ExpiresAt = DateTime.UtcNow.AddDays(7);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DOCX export failed for job {JobId}", job.JobId);
            job.Status = ExportStatus.FAILED;
        }

        var updated = await exportRepo.UpdateAsync(job);
        return MapToDto(updated);
    }

    public async Task<ExportJobDto> ExportToJsonAsync(int userId, ExportRequest request)
    {
        var job = await CreateJobAsync(userId, request, ExportFormat.JSON);

        try
        {
            job.Status = ExportStatus.PROCESSING;
            await exportRepo.UpdateAsync(job);

            // Serialise resume data — in production fetch from Resume service
            var payload = JsonSerializer.SerializeToUtf8Bytes(new { ResumeId = request.ResumeId });
            var url = await UploadToBlobAsync(job.JobId, payload, "application/json");

            job.FileUrl = url;
            job.FileSizeKb = payload.Length / 1024;
            job.Status = ExportStatus.COMPLETED;
            job.CompletedAt = DateTime.UtcNow;
            job.ExpiresAt = DateTime.UtcNow.AddDays(7);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "JSON export failed for job {JobId}", job.JobId);
            job.Status = ExportStatus.FAILED;
        }

        var updated = await exportRepo.UpdateAsync(job);
        return MapToDto(updated);
    }

    public async Task<ExportJobDto?> GetJobStatusAsync(string jobId)
    {
        var job = await exportRepo.FindByJobIdAsync(jobId);
        return job is null ? null : MapToDto(job);
    }

    public async Task<IList<ExportJobDto>> GetExportsByUserAsync(int userId)
        => (await exportRepo.FindByUserIdAsync(userId)).Select(MapToDto).ToList();

    public async Task<byte[]> DownloadFileAsync(string jobId)
    {
        var job = await exportRepo.FindByJobIdAsync(jobId)
                  ?? throw new KeyNotFoundException("Export job not found.");
        if (job.Status != ExportStatus.COMPLETED || job.FileUrl is null)
            throw new InvalidOperationException("Export not ready.");

        var blobClient = new BlobClient(new Uri(job.FileUrl));
        var download = await blobClient.DownloadContentAsync();
        return download.Value.Content.ToArray();
    }

    public Task DeleteExportAsync(string jobId)
        => exportRepo.DeleteByJobIdAsync(jobId);

    // ─── PDF Generation (QuestPDF) ────────────────────────────────

    private static byte[] GeneratePdf(int resumeId)
    {
        // Placeholder layout — production would receive full resume data
        return QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.Content().Column(col =>
                {
                    col.Item().Text($"Resume #{resumeId}")
                        .FontSize(24).Bold().FontColor(Colors.Blue.Medium);
                    col.Item().PaddingTop(10).Text("Generated by ResumeAI Platform")
                        .FontSize(12).FontColor(Colors.Grey.Medium);
                });
            });
        }).GeneratePdf();
    }

    // ─── DOCX Generation (OpenXML SDK) ───────────────────────────

    private static byte[] GenerateDocx(int resumeId)
    {
        using var ms = new MemoryStream();
        using var doc = WordprocessingDocument.Create(ms, WordprocessingDocumentType.Document);
        var mainPart = doc.AddMainDocumentPart();
        mainPart.Document = new DocumentFormat.OpenXml.Wordprocessing.Document(
            new Body(
                new Paragraph(
                    new Run(
                        new Text($"Resume #{resumeId} — Generated by ResumeAI")))));
        doc.Save();
        return ms.ToArray();
    }

    // ─── Azure Blob Storage upload ────────────────────────────────

    private async Task<string> UploadToBlobAsync(string jobId, byte[] data, string contentType)
    {
        var connString = config["AzureBlob:ConnectionString"];
        var containerName = config["AzureBlob:ContainerName"] ?? "resume-exports";

        if (string.IsNullOrEmpty(connString))
        {
            // Dev fallback: return a fake URL so local dev works without Azure
            logger.LogWarning("AzureBlob:ConnectionString not configured — using stub URL.");
            return $"https://stub.blob.core.windows.net/{containerName}/{jobId}";
        }

        var blobServiceClient = new BlobServiceClient(connString);
        var containerClient = blobServiceClient.GetBlobContainerClient(containerName);
        await containerClient.CreateIfNotExistsAsync();

        var blobClient = containerClient.GetBlobClient(jobId);
        await blobClient.UploadAsync(new BinaryData(data),
            new Azure.Storage.Blobs.Models.BlobUploadOptions
            {
                HttpHeaders = new Azure.Storage.Blobs.Models.BlobHttpHeaders
                    { ContentType = contentType }
            });
        return blobClient.Uri.ToString();
    }

    // ─── Helpers ─────────────────────────────────────────────────

    private async Task<ExportJob> CreateJobAsync(int userId, ExportRequest request, ExportFormat format)
    {
        var job = new ExportJob
        {
            ResumeId = request.ResumeId,
            UserId = userId,
            Format = format,
            TemplateId = 0, // caller should pass template ID if needed
            Customizations = request.Customizations
        };
        return await exportRepo.AddAsync(job);
    }

    private static ExportJobDto MapToDto(ExportJob j) =>
        new(j.JobId, j.ResumeId, j.UserId, j.Format, j.Status,
            j.FileUrl, j.FileSizeKb, j.RequestedAt, j.CompletedAt, j.ExpiresAt);
}
