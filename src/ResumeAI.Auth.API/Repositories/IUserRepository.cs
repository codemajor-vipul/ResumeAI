using ResumeAI.Auth.API.Entities;
using ResumeAI.Shared.Enums;

namespace ResumeAI.Auth.API.Repositories;

public interface IUserRepository
{
    Task<User?> FindByEmailAsync(string email);
    Task<User?> FindByUserIdAsync(int userId);
    Task<bool> ExistsByEmailAsync(string email);
    Task<IList<User>> FindAllByRoleAsync(Role role);
    Task<IList<User>> FindBySubscriptionPlanAsync(SubscriptionPlan plan);
    Task<IList<User>> FindByIsActiveAsync(bool isActive);
    Task<User> AddAsync(User user);
    Task<User> UpdateAsync(User user);
    Task DeleteByUserIdAsync(int userId);
}
