using Microsoft.AspNetCore.SignalR;

namespace ResumeAI.Notification.API.Hubs;

/// <summary>
/// SignalR hub for real-time unread badge count updates in the nav bar.
/// Clients subscribe to their own user group on connect.
/// </summary>
public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);
        }
        await base.OnConnectedAsync();
    }
}
