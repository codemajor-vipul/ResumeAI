using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResumeAI.Notification.API.Services;
using ResumeAI.Shared.DTOs;

namespace ResumeAI.Notification.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationController(INotificationService notifService) : ControllerBase
{
    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException());

    [HttpGet]
    public async Task<IActionResult> GetByRecipient()
    {
        var notifs = await notifService.GetByRecipientAsync(CurrentUserId);
        return Ok(ApiResponse<IList<NotificationDto>>.Ok(notifs));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var count = await notifService.GetUnreadCountAsync(CurrentUserId);
        return Ok(ApiResponse<int>.Ok(count));
    }

    [HttpPut("{notificationId:int}/read")]
    public async Task<IActionResult> MarkAsRead(int notificationId)
    {
        await notifService.MarkAsReadAsync(notificationId);
        return NoContent();
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await notifService.MarkAllReadAsync(CurrentUserId);
        return NoContent();
    }

    [HttpDelete("{notificationId:int}")]
    public async Task<IActionResult> Delete(int notificationId)
    {
        await notifService.DeleteAsync(notificationId);
        return NoContent();
    }

    [Authorize(Roles = "ADMIN")]
    [HttpPost("bulk")]
    public async Task<IActionResult> SendBulk(
        [FromBody] SendBulkNotificationRequest request,
        [FromQuery] List<int>? recipientIds = null)
    {
        // In production: lookup recipients by plan tier from Auth service
        var ids = recipientIds ?? new List<int>();
        await notifService.SendBulkAsync(request, ids);
        return NoContent();
    }
}
