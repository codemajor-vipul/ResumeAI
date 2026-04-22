using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ResumeAI.JobMatch.API.Data;
using ResumeAI.JobMatch.API.Repositories;
using ResumeAI.JobMatch.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<JobMatchDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("JobMatchDb")));

builder.Services.AddScoped<IJobMatchRepository, JobMatchRepository>();
builder.Services.AddScoped<IJobMatchService, JobMatchService>();

// ─── External API clients (basic HttpClient — add Polly if needed in prod) ──
builder.Services.AddHttpClient("LinkedIn", c =>
{
    c.BaseAddress = new Uri(builder.Configuration["ExternalApis:LinkedInBaseUrl"]
        ?? "https://api.linkedin.com");
    c.DefaultRequestHeaders.Add("Authorization",
        $"Bearer {builder.Configuration["ExternalApis:LinkedInToken"]}");
});

builder.Services.AddHttpClient("Naukri", c =>
{
    c.BaseAddress = new Uri(builder.Configuration["ExternalApis:NaukriBaseUrl"]
        ?? "https://api.naukri.com");
    c.DefaultRequestHeaders.Add("X-Api-Key",
        builder.Configuration["ExternalApis:NaukriApiKey"] ?? "");
});

var jwtSecret = builder.Configuration["Jwt:Secret"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true
        };
    });

builder.Services.AddAuthorization(opts =>
{
    opts.AddPolicy("PremiumOnly", p => p.RequireClaim("plan", "PREMIUM"));
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<JobMatchDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
