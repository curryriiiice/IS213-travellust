import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { io, Socket } from "socket.io-client";

export interface Notification {
  id: string;
  user_id: string;
  trip_id?: string;
  type: string;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isConnected: false,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

const COLLAB_URL = "http://localhost:5010";
const NOTIFICATIONS_API_URL = "/api/notifications";

// Hardcoded user ID - same as used in other parts of the app
import { getCurrentUserId } from "@/lib/auth";
const CURRENT_USER_ID = getCurrentUserId();

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${NOTIFICATIONS_API_URL}?user_id=${CURRENT_USER_ID}`);
      if (!response.ok) throw new Error("Failed to fetch notifications");
      
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data || []);
        setUnreadCount(data.data?.filter((n: Notification) => !n.is_read).length || 0);
      }
    } catch (error) {
      console.error("[NotificationContext] Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${NOTIFICATIONS_API_URL}/${id}/read`, {
        method: "PATCH",
      });
      
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("[NotificationContext] Failed to mark as read:", error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch(`${NOTIFICATIONS_API_URL}/read-all?user_id=${CURRENT_USER_ID}`, {
        method: "PATCH",
      });
      
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("[NotificationContext] Failed to mark all as read:", error);
    }
  }, []);

  // Connect to Socket.IO for real-time notifications
  useEffect(() => {
    // Fetch initial notifications
    fetchNotifications();

    // Connect to Socket.IO (notification-only connection, no trip_id)
    const newSocket = io(COLLAB_URL, {
      query: { user_id: CURRENT_USER_ID },
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("[NotificationContext] Connected to collaboration service");
      setIsConnected(true);
    });

    newSocket.on("connected", (data) => {
      console.log("[NotificationContext] Socket connected:", data);
    });

    newSocket.on("notification", (notification: Notification) => {
      console.log("[NotificationContext] Received notification:", notification);
      // Add new notification to the top of the list
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    newSocket.on("disconnect", () => {
      console.log("[NotificationContext] Disconnected from collaboration service");
      setIsConnected(false);
    });

    newSocket.on("error", (err: { message: string }) => {
      console.error("[NotificationContext] Socket error:", err.message);
    });

    newSocket.on("connect_error", (err) => {
      console.error("[NotificationContext] Connection error:", err.message);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        isConnected,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
