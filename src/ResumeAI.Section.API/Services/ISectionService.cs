using ResumeAI.Shared.DTOs;
using ResumeAI.Shared.Enums;

namespace ResumeAI.Section.API.Services;

public interface ISectionService
{
    Task<SectionDto> AddSectionAsync(AddSectionRequest request);
    Task<IList<SectionDto>> GetSectionsByResumeAsync(int resumeId);
    Task<SectionDto?> GetSectionByIdAsync(int sectionId);
    Task<IList<SectionDto>> GetSectionsByTypeAsync(int resumeId, SectionType sectionType);
    Task<SectionDto> UpdateSectionAsync(int sectionId, UpdateSectionRequest request);
    Task DeleteSectionAsync(int sectionId);
    Task DeleteAllSectionsAsync(int resumeId);
    Task ReorderSectionsAsync(int resumeId, ReorderSectionsRequest request);
    Task<SectionDto> ToggleVisibilityAsync(int sectionId);
    Task<IList<SectionDto>> BulkUpdateSectionsAsync(BulkUpdateSectionsRequest request);
}
