// src/pages/Notifications.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Shield,
  Wrench,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
} from "@/API/notification.api";
import { useToast } from "@/hooks/use-toast";
import { RawNotificationItem } from "@/types/notification/notifications.types";

// --------------------------------------------------
// 🟦  FIXED COLOR + ICON MAPPING BASED ON SERVER TYPES
// --------------------------------------------------

const serverTypeConfig: Record<
  string,
  {
    icon: any;
    chip: string;
    border: string;
    bg: string;
    dot: string;
    badge: string;
    label: string;
  }
> = {
  SECURITY: {
    icon: Shield,
    chip: "bg-red-100 text-red-700",
    border: "border-l-2 border-red-500",
    bg: "bg-red-50",
    dot: "bg-red-600",
    badge: "bg-red-50 text-red-700 border border-red-200",
    label: "SECURITY",
  },
  ALERT: {
    icon: AlertTriangle,
    chip: "bg-yellow-100 text-yellow-800",
    border: "border-l-2 border-yellow-500",
    bg: "bg-yellow-50",
    dot: "bg-yellow-500",
    badge: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    label: "ALERT",
  },
  UPDATE: {
    icon: Info,
    chip: "bg-blue-100 text-blue-800",
    border: "border-l-2 border-blue-500",
    bg: "bg-blue-50",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    label: "UPDATE",
  },
  PROMOTION: {
    icon: Gift,
    chip: "bg-emerald-100 text-emerald-800",
    border: "border-l-2 border-emerald-500",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    label: "SUCCESS",
  },
  MAINTENANCE: {
    icon: Wrench,
    chip: "bg-purple-100 text-purple-800",
    border: "border-l-2 border-purple-500",
    bg: "bg-purple-50",
    dot: "bg-purple-500",
    badge: "bg-purple-50 text-purple-700 border border-purple-200",
    label: "MAINTENANCE",
  },
};

// fallback for unknown types
const defaultTypeConfig = {
  ...serverTypeConfig.UPDATE,
  label: "UPDATE",
};

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

export default function Notifications() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const {
    data: raw,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetNotificationsQuery();

  const [markRead, { isLoading: markLoading }] =
    useMarkNotificationReadMutation();

  // Map notifications with consistent color styling
  const notifications = useMemo(() => {
    const items: RawNotificationItem[] = raw?.notifications ?? [];
    return items.map((it) => {
      const serverType = (it.notification.type || "UPDATE").toUpperCase();
      const style = serverTypeConfig[serverType] || defaultTypeConfig;

      return {
        id: String(it.id),
        rawId: it.id,
        title: it.notification.title,
        message: it.notification.description,
        time: it.createdAt,
        timeAgo: formatDistanceToNow(new Date(it.createdAt), {
          addSuffix: true,
        }),
        read: Boolean(it.isRead),
        serverType,
        style,
        label: style.label || serverType,
      };
    });
  }, [raw]);

  const unreadCount = useMemo(
    () => raw?.unreadCount ?? notifications.filter((n) => !n.read).length,
    [raw, notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    return notifications.filter((n) => {
      if (filter === "unread") return !n.read;
      if (filter === "read") return n.read;
      return true;
    });
  }, [filter, notifications]);

  useEffect(() => {
    document.title = "Notifications | Account updates";
    const desc = "View your latest notifications and account updates.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  const handleMarkAsRead = async (rawId: number) => {
    try {
      await markRead({ id: rawId }).unwrap();
      toast({
        title: "Marked read",
        description: "Notification marked as read.",
      });
      refetch();
    } catch (err: any) {
      console.error("Failed to mark read", err);
      toast({
        title: "Error",
        description: "Could not mark notification as read.",
        variant: "destructive",
      });
    }
  };

  const SkeletonCard = () => (
    <Card className="border-border">
      <CardContent className="p-4 sm:p-5 md:p-6">
        <div className="animate-pulse flex gap-4">
          <div className="h-10 w-10 rounded-md bg-muted/40" />
          <div className="flex-1">
            <div className="h-3 bg-muted/40 rounded w-1/3 mb-3" />
            <div className="h-3 bg-muted/40 rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted/40 rounded w-1/2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <main className="space-y-6 sm:space-y-8">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground tracking-tight">
            Notifications
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
            Stay updated with your account activity
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Badge className="bg-primary text-primary-foreground">
            {unreadCount} unread
          </Badge>
        </div>
      </header>

      {/* Filter */}
      <Card className="border-border">
        <CardContent className="p-4 sm:p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={filter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
              className="rounded-lg"
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("unread")}
              className="rounded-lg"
            >
              Unread ({unreadCount})
            </Button>
            <Button
              variant={filter === "read" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("read")}
              className="rounded-lg"
            >
              Read ({notifications.length - unreadCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        {isLoading || isFetching ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : isError ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Unable to load notifications
              </h3>
              <Button onClick={() => refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {filteredNotifications.map((n) => {
              const Icon = n.style.icon;

              return (
                <Card
                  key={n.id}
                  className={cn("transition-colors bg-card", n.style.border)}
                >
                  <div
                    className={cn(
                      "p-4 sm:p-5 md:p-6 rounded-md",
                      !n.read && n.style.bg
                    )}
                  >
                    <div className="flex gap-3 sm:gap-4">
                      <div
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-md",
                          n.style.chip
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap justify-between items-center">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground">
                            {n.title}
                          </h3>
                          <Badge
                            className={cn(
                              "text-xs px-2 py-0.5 rounded",
                              n.style.badge
                            )}
                          >
                            {n.label}
                          </Badge>
                        </div>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {n.message}
                        </p>

                        <div className="mt-3 flex justify-between items-center">
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            {!n.read && (
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  n.style.dot
                                )}
                              />
                            )}
                            <Clock className="h-3 w-3" />
                            <span>{n.timeAgo}</span>
                          </div>

                          {!n.read && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsRead(Number(n.rawId))}
                              disabled={markLoading}
                            >
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </main>
  );
}
