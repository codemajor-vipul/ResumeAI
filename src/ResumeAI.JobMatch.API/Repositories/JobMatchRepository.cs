using Microsoft.EntityFrameworkCore;
using ResumeAI.JobMatch.API.Data;
using ResumeAI.JobMatch.API.Entities;

namespace ResumeAI.JobMatch.API.Repositories;

public interface IJobMatchRepository
{
    Task<IList<JobMatchRecord>> FindByResumeIdAsync(int resumeId);
    Task<IList<JobMatchRecord>> FindByUserIdAsync(int userId);
    Task<JobMatchRecord?> FindByMatchIdAsync(int matchId);
    Task<IList<JobMatchRecord>> FindByMatchScoreGreaterThanAsync(int minScore);
    Task<IList<JobMatchRecord>> FindByIsBookmarkedAsync(int userId, bool bookmarked);
    Task<IList<JobMatchRecord>> FindByJobTitleAsync(string jobTitle);
    Task<int> CountByUserIdAsync(int userId);
    Task<JobMatchRecord> AddAsync(JobMatchRecord match);
    Task BookmarkMatchAsync(int matchId, bool isBookmarked);
    Task DeleteByMatchIdAsync(int matchId);
}

public class JobMatchRepository(JobMatchDbContext db) : IJobMatchRepository
{
    public Task<IList<JobMatchRecord>> FindByResumeIdAsync(int resumeId)
        => db.JobMatches.Where(m => m.ResumeId == resumeId)
               .OrderByDescending(m => m.MatchScore).ToListAsync()
               .ContinueWith(t => (IList<JobMatchRecord>)t.Result);

    public Task<IList<JobMatchRecord>> FindByUserIdAsync(int userId)
        => db.JobMatches.Where(m => m.UserId == userId)
               .OrderByDescending(m => m.MatchedAt).ToListAsync()
               .ContinueWith(t => (IList<JobMatchRecord>)t.Result);

    public Task<JobMatchRecord?> FindByMatchIdAsync(int matchId)
        => db.JobMatches.FindAsync(matchId).AsTask();

    public Task<IList<JobMatchRecord>> FindByMatchScoreGreaterThanAsync(int minScore)
        => db.JobMatches.Where(m => m.MatchScore > minScore)
               .OrderByDescending(m => m.MatchScore).ToListAsync()
               .ContinueWith(t => (IList<JobMatchRecord>)t.Result);

    public Task<IList<JobMatchRecord>> FindByIsBookmarkedAsync(int userId, bool bookmarked)
        => db.JobMatches.Where(m => m.UserId == userId && m.IsBookmarked == bookmarked)
               .ToListAsync()
               .ContinueWith(t => (IList<JobMatchRecord>)t.Result);

    public Task<IList<JobMatchRecord>> FindByJobTitleAsync(string jobTitle)
        => db.JobMatches.Where(m => m.JobTitle.Contains(jobTitle))
               .ToListAsync()
               .ContinueWith(t => (IList<JobMatchRecord>)t.Result);

    public Task<int> CountByUserIdAsync(int userId)
        => db.JobMatches.CountAsync(m => m.UserId == userId);

    public async Task<JobMatchRecord> AddAsync(JobMatchRecord match)
    {
        db.JobMatches.Add(match);
        await db.SaveChangesAsync();
        return match;
    }

    public Task BookmarkMatchAsync(int matchId, bool isBookmarked)
        => db.JobMatches
             .Where(m => m.MatchId == matchId)
             .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsBookmarked, isBookmarked));

    public Task DeleteByMatchIdAsync(int matchId)
        => db.JobMatches.Where(m => m.MatchId == matchId).ExecuteDeleteAsync();
}
