using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using ResumeAI.Notification.API.Data;
using ResumeAI.Notification.API.Entities;
using ResumeAI.Notification.API.Hubs;
using ResumeAI.Shared.DTOs;
using ResumeAI.Shared.Enums;

namespace ResumeAI.Notification.API.Services;

public interface INotificationService
{
    Task<NotificationDto> SendAsync(int recipientId, string title, string message,
        NotificationType type, NotificationChannel channel = NotificationChannel.APP,
        string? relatedId = null, string? relatedType = null);
    Task SendBulkAsync(SendBulkNotificationRequest request, IList<int> recipientIds);
    Task<IList<NotificationDto>> GetByRecipientAsync(int recipientId);
    Task<int> GetUnreadCountAsync(int recipientId);
    Task MarkAsReadAsync(int notificationId);
    Task MarkAllReadAsync(int recipientId);
    Task DeleteAsync(int notificationId);
}

public class NotificationService(
    NotificationDbContext db,
    IConfiguration config,
    IHubContext<NotificationHub> hubContext,
    ILogger<NotificationService> logger) : INotificationService
{
    public async Task<NotificationDto> SendAsync(
        int recipientId, string title, string message,
        NotificationType type, NotificationChannel channel = NotificationChannel.APP,
        string? relatedId = null, string? relatedType = null)
    {
        var notification = new NotificationRecord
        {
            RecipientId = recipientId,
            Type = type,
            Title = title,
            Message = message,
            Channel = channel,
            RelatedId = relatedId,
            RelatedType = relatedType
        };

        db.Notifications.Add(notification);
        await db.SaveChangesAsync();

        if (channel == NotificationChannel.EMAIL)
        {
            await SendEmailAsync(recipientId, title, message);
        }

        // Push unread count update via SignalR
        var unreadCount = await GetUnreadCountAsync(recipientId);
        await hubContext.Clients.User(recipientId.ToString())
            .SendAsync("UnreadCountUpdated", unreadCount);

        return MapToDto(notification);
    }

    public async Task SendBulkAsync(SendBulkNotificationRequest request, IList<int> recipientIds)
    {
        var notifications = recipientIds.Select(id => new NotificationRecord
        {
            RecipientId = id,
            Type = request.Type,
            Title = request.Title,
            Message = request.Message,
            Channel = NotificationChannel.APP
        }).ToList();

        db.Notifications.AddRange(notifications);
        await db.SaveChangesAsync();

        // Push to each recipient via SignalR
        foreach (var id in recipientIds)
        {
            await hubContext.Clients.User(id.ToString())
                .SendAsync("NewNotification", request.Title);
        }
    }

    public async Task<IList<NotificationDto>> GetByRecipientAsync(int recipientId)
        => await db.Notifications
            .Where(n => n.RecipientId == recipientId)
            .OrderByDescending(n => n.SentAt)
            .Select(n => MapToDto(n))
            .ToListAsync();

    public Task<int> GetUnreadCountAsync(int recipientId)
        => db.Notifications.CountAsync(n => n.RecipientId == recipientId && !n.IsRead);

    public async Task MarkAsReadAsync(int notificationId)
        => await db.Notifications
            .Where(n => n.NotificationId == notificationId)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

    public async Task MarkAllReadAsync(int recipientId)
        => await db.Notifications
            .Where(n => n.RecipientId == recipientId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

    public async Task DeleteAsync(int notificationId)
        => await db.Notifications
            .Where(n => n.NotificationId == notificationId)
            .ExecuteDeleteAsync();

    // ─── Email via MailKit ────────────────────────────────────────

    private async Task SendEmailAsync(int recipientId, string subject, string body)
    {
        try
        {
            var smtpHost = config["Smtp:Host"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(config["Smtp:Port"] ?? "587");
            var smtpUser = config["Smtp:Username"];
            var smtpPass = config["Smtp:Password"];

            if (string.IsNullOrEmpty(smtpUser))
            {
                logger.LogWarning("SMTP not configured — email not sent for recipient {RecipientId}", recipientId);
                return;
            }

            var email = new MimeMessage();
            email.From.Add(MailboxAddress.Parse(smtpUser));
            email.To.Add(MailboxAddress.Parse($"user{recipientId}@resumeai.dev")); // placeholder
            email.Subject = subject;
            email.Body = new TextPart("html") { Text = $"<p>{body}</p>" };

            using var smtp = new SmtpClient();
            await smtp.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
            await smtp.AuthenticateAsync(smtpUser, smtpPass);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email to recipient {RecipientId}", recipientId);
        }
    }

    private static NotificationDto MapToDto(NotificationRecord n) =>
        new(n.NotificationId, n.RecipientId, n.Type, n.Title,
            n.Message, n.Channel, n.RelatedId, n.RelatedType, n.IsRead, n.SentAt);
}
