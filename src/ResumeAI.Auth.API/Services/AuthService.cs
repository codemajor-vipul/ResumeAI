using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using ResumeAI.Auth.API.Entities;
using ResumeAI.Auth.API.Repositories;
using ResumeAI.Shared.DTOs;
using ResumeAI.Shared.Enums;

namespace ResumeAI.Auth.API.Services;

public class AuthService(
    IUserRepository userRepo,
    IConfiguration config,
    IPasswordHasher<User> hasher) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (await userRepo.ExistsByEmailAsync(request.Email))
            throw new InvalidOperationException("Email already registered.");

        var user = new User
        {
            FullName = request.FullName,
            Email = request.Email,
            Phone = request.Phone,
            Provider = AuthProvider.LOCAL
        };
        user.PasswordHash = hasher.HashPassword(user, request.Password);

        var saved = await userRepo.AddAsync(user);
        return BuildAuthResponse(saved);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await userRepo.FindByEmailAsync(request.Email)
                   ?? throw new UnauthorizedAccessException("Invalid credentials.");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Account suspended.");

        var result = hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            throw new UnauthorizedAccessException("Invalid credentials.");

        return BuildAuthResponse(user);
    }

    public Task LogoutAsync(int userId) => Task.CompletedTask; // stateless JWT

    public async Task<UserDto?> GetUserByIdAsync(int userId)
    {
        var user = await userRepo.FindByUserIdAsync(userId);
        return user is null ? null : MapToDto(user);
    }

    public async Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        var user = await userRepo.FindByUserIdAsync(userId)
                   ?? throw new KeyNotFoundException("User not found.");
        user.FullName = request.FullName;
        user.Phone = request.Phone;
        var updated = await userRepo.UpdateAsync(user);
        return MapToDto(updated);
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        var user = await userRepo.FindByUserIdAsync(userId)
                   ?? throw new KeyNotFoundException("User not found.");

        var verification = hasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
        if (verification == PasswordVerificationResult.Failed)
            throw new UnauthorizedAccessException("Current password is incorrect.");

        user.PasswordHash = hasher.HashPassword(user, request.NewPassword);
        await userRepo.UpdateAsync(user);
    }

    public async Task UpdateSubscriptionAsync(int userId, SubscriptionPlan plan)
    {
        var user = await userRepo.FindByUserIdAsync(userId)
                   ?? throw new KeyNotFoundException("User not found.");
        user.SubscriptionPlan = plan;
        await userRepo.UpdateAsync(user);
    }

    public async Task DeactivateAccountAsync(int userId)
    {
        var user = await userRepo.FindByUserIdAsync(userId)
                   ?? throw new KeyNotFoundException("User not found.");
        user.IsActive = false;
        await userRepo.UpdateAsync(user);
    }

    public Task<string> RefreshTokenAsync(string refreshToken)
    {
        // TODO: implement refresh token store (Redis or DB table)
        throw new NotImplementedException("Refresh token store not yet implemented.");
    }

    public async Task<IList<UserDto>> GetAllUsersAsync()
    {
        var all = await userRepo.FindAllByRoleAsync(Role.USER);
        return all.Select(MapToDto).ToList();
    }

    public async Task<AuthResponse> OAuthLoginAsync(
        AuthProvider provider, string email, string fullName)
    {
        var existing = await userRepo.FindByEmailAsync(email);

        if (existing is not null)
        {
            // Guard: if the account was created locally, don't silently merge it.
            if (existing.Provider == AuthProvider.LOCAL)
                throw new InvalidOperationException(
                    $"An account with this email already exists. " +
                    $"Please log in with your password instead.");

            // Guard: prevent one OAuth provider from hijacking another provider's account.
            if (existing.Provider != provider)
                throw new InvalidOperationException(
                    $"This email is already linked to a {existing.Provider} account. " +
                    $"Please log in with {existing.Provider} instead.");

            if (!existing.IsActive)
                throw new UnauthorizedAccessException("Account is suspended.");

            return BuildAuthResponse(existing);
        }

        // First-time OAuth login: create the user. No password — OAuth users
        // authenticate exclusively through their provider.
        var user = new User
        {
            FullName     = fullName,
            Email        = email,
            PasswordHash = string.Empty,
            Provider     = provider,
            Role         = Role.USER,
            SubscriptionPlan = SubscriptionPlan.FREE
        };

        var saved = await userRepo.AddAsync(user);
        return BuildAuthResponse(saved);
    }

    // ─── Helpers ──────────────────────────────────────────────────
    private AuthResponse BuildAuthResponse(User user)
    {
        var token = GenerateJwt(user);
        return new AuthResponse(
            Token: token,
            RefreshToken: Guid.NewGuid().ToString(), // placeholder
            ExpiresAt: DateTime.UtcNow.AddHours(8),
            User: MapToDto(user));
    }

    private string GenerateJwt(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(config["Jwt:Secret"]
                ?? throw new InvalidOperationException("JWT secret not configured.")));

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("plan", user.SubscriptionPlan.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static UserDto MapToDto(User u) =>
        new(u.UserId, u.FullName, u.Email, u.Phone,
            u.Role, u.Provider, u.IsActive, u.SubscriptionPlan, u.CreatedAt);
}
