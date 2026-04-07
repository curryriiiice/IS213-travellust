import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications, type Notification } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

function NotificationItem({
  notification,
  onMarkAsRead,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  // Determine icon/color based on notification type
  const isSuccess = notification.type.includes("success");
  const isFailure = notification.type.includes("failure");

  return (
    <div
      className={cn(
        "px-3 py-2.5 border-b border-border last:border-b-0 transition-colors",
        !notification.is_read && "bg-accent/5"
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "w-2 h-2 rounded-full mt-1.5 shrink-0",
            isSuccess && "bg-green-500",
            isFailure && "bg-destructive",
            !isSuccess && !isFailure && "bg-accent"
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p
              className={cn(
                "text-xs font-medium truncate",
                !notification.is_read && "text-foreground",
                notification.is_read && "text-muted-foreground"
              )}
            >
              {notification.title}
            </p>
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                title="Mark as read"
              >
                <Check className="w-3 h-3" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
            {timeAgo}
          </p>
        </div>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);

  // Highlight bell when new notification arrives
  useEffect(() => {
    if (unreadCount > 0 && !isOpen) {
      setHasNewNotification(true);
      // Reset highlight after animation
      const timer = setTimeout(() => setHasNewNotification(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount, isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 relative",
            hasNewNotification && "animate-pulse"
          )}
        >
          <Bell
            className={cn(
              "w-4 h-4 transition-colors",
              hasNewNotification && "text-accent"
            )}
          />
          {/* Unread badge */}
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] font-medium",
                "bg-accent text-accent-foreground rounded-full",
                "flex items-center justify-center",
                hasNewNotification && "animate-bounce"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          {/* Connection status indicator */}
          <span
            className={cn(
              "absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full",
              isConnected ? "bg-green-500" : "bg-muted-foreground"
            )}
            title={isConnected ? "Connected" : "Disconnected"}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 max-h-[400px] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-card">
          <h3 className="text-sm font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={markAllAsRead}
            >
              <CheckCheck className="w-3 h-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                You'll see booking updates and alerts here
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-3 py-2 border-t border-border bg-card/50">
            <p className="text-[10px] text-muted-foreground text-center font-mono">
              {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
