using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ResumeAI.AI.API.Data;
using ResumeAI.AI.API.Repositories;
using ResumeAI.AI.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AiDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("AiDb")));

builder.Services.AddScoped<IAiRequestRepository, AiRequestRepository>();
builder.Services.AddScoped<IAiService, AiService>();

// ─── Redis quota tracking ────────────────────────────────────────
builder.Services.AddStackExchangeRedisCache(opts =>
{
    opts.Configuration = builder.Configuration["Redis:ConnectionString"]
        ?? "localhost:6379";
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
    var db = scope.ServiceProvider.GetRequiredService<AiDbContext>();
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
