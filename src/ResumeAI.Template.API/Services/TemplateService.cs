using ResumeAI.Shared.DTOs;
using ResumeAI.Shared.Enums;
using ResumeAI.Template.API.Entities;
using ResumeAI.Template.API.Repositories;

namespace ResumeAI.Template.API.Services;

public interface ITemplateService
{
    Task<TemplateDto> CreateTemplateAsync(CreateTemplateRequest request);
    Task<TemplateDto?> GetTemplateByIdAsync(int templateId);
    Task<IList<TemplateDto>> GetAllTemplatesAsync();
    Task<IList<TemplateDto>> GetFreeTemplatesAsync();
    Task<IList<TemplateDto>> GetPremiumTemplatesAsync();
    Task<IList<TemplateDto>> GetByCategoryAsync(TemplateCategory category);
    Task<IList<TemplateDto>> GetPopularTemplatesAsync(int top = 10);
    Task<TemplateDto> UpdateTemplateAsync(int templateId, UpdateTemplateRequest request);
    Task DeactivateTemplateAsync(int templateId);
    Task IncrementUsageAsync(int templateId);
}

public class TemplateService(ITemplateRepository templateRepo) : ITemplateService
{
    public async Task<TemplateDto> CreateTemplateAsync(CreateTemplateRequest request)
    {
        var template = new ResumeTemplate
        {
            Name = request.Name,
            Description = request.Description,
            ThumbnailUrl = request.ThumbnailUrl,
            HtmlLayout = request.HtmlLayout,
            CssStyles = request.CssStyles,
            Category = request.Category,
            IsPremium = request.IsPremium
        };
        var saved = await templateRepo.AddAsync(template);
        return MapToDto(saved);
    }

    public async Task<TemplateDto?> GetTemplateByIdAsync(int templateId)
    {
        var t = await templateRepo.FindByTemplateIdAsync(templateId);
        return t is null ? null : MapToDto(t);
    }

    public async Task<IList<TemplateDto>> GetAllTemplatesAsync()
        => (await templateRepo.FindAllAsync()).Select(MapToDto).ToList();

    public async Task<IList<TemplateDto>> GetFreeTemplatesAsync()
        => (await templateRepo.FindByIsPremiumAsync(false)).Select(MapToDto).ToList();

    public async Task<IList<TemplateDto>> GetPremiumTemplatesAsync()
        => (await templateRepo.FindByIsPremiumAsync(true)).Select(MapToDto).ToList();

    public async Task<IList<TemplateDto>> GetByCategoryAsync(TemplateCategory category)
        => (await templateRepo.FindByCategoryAsync(category)).Select(MapToDto).ToList();

    public async Task<IList<TemplateDto>> GetPopularTemplatesAsync(int top = 10)
        => (await templateRepo.FindAllOrderByUsageCountDescAsync(top)).Select(MapToDto).ToList();

    public async Task<TemplateDto> UpdateTemplateAsync(int templateId, UpdateTemplateRequest request)
    {
        var template = await templateRepo.FindByTemplateIdAsync(templateId)
                       ?? throw new KeyNotFoundException("Template not found.");
        template.Name = request.Name;
        template.Description = request.Description;
        template.ThumbnailUrl = request.ThumbnailUrl;
        template.HtmlLayout = request.HtmlLayout;
        template.CssStyles = request.CssStyles;
        template.Category = request.Category;
        template.IsPremium = request.IsPremium;
        var updated = await templateRepo.UpdateAsync(template);
        return MapToDto(updated);
    }

    public async Task DeactivateTemplateAsync(int templateId)
    {
        var template = await templateRepo.FindByTemplateIdAsync(templateId)
                       ?? throw new KeyNotFoundException("Template not found.");
        template.IsActive = false;
        await templateRepo.UpdateAsync(template);
    }

    public Task IncrementUsageAsync(int templateId)
        => templateRepo.UpdateUsageCountAsync(templateId);

    private static TemplateDto MapToDto(ResumeTemplate t) =>
        new(t.TemplateId, t.Name, t.Description, t.ThumbnailUrl,
            t.Category, t.IsPremium, t.IsActive, t.UsageCount, t.CreatedAt);
}
