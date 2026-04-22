using ResumeAI.Shared.DTOs;

namespace ResumeAI.Resume.API.Services;

public interface IResumeService
{
    Task<ResumeDto> CreateResumeAsync(int userId, CreateResumeRequest request);
    Task<ResumeDto?> GetResumeByIdAsync(int resumeId);
    Task<IList<ResumeDto>> GetResumesByUserAsync(int userId);
    Task<ResumeDto> UpdateResumeAsync(int resumeId, UpdateResumeRequest request);
    Task DeleteResumeAsync(int resumeId);
    Task<ResumeDto> DuplicateResumeAsync(int resumeId, int userId);
    Task UpdateAtsScoreAsync(int resumeId, int score);
    Task<ResumeDto> PublishResumeAsync(int resumeId);
    Task<ResumeDto> UnpublishResumeAsync(int resumeId);
    Task<IList<ResumeDto>> GetPublicResumesAsync();
    Task IncrementViewCountAsync(int resumeId);
    Task<IList<ResumeDto>> GetResumesByTemplateAsync(int templateId);
}
