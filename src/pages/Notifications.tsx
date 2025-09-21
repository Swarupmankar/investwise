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
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
} from "@/API/notification.api";
import { useToast } from "@/hooks/use-toast";
import { RawNotificationItem } from "@/types/notification/notifications.types";

type UIType = "info" | "warning" | "success" | "transaction";

const iconMap: Record<UIType, any> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  transaction: Bell,
};

const typeStyle: Record<UIType, any> = {
  info: {
    icon: "text-accent-foreground",
    chip: "bg-accent/40 text-accent-foreground",
    border: "border-l-2 border-accent",
    bg: "bg-accent/10",
    dot: "bg-accent-foreground",
  },
  warning: {
    icon: "text-warning",
    chip: "bg-warning/15 text-warning",
    border: "border-l-2 border-warning",
    bg: "bg-warning/10",
    dot: "bg-warning",
  },
  success: {
    icon: "text-success",
    chip: "bg-success/15 text-success",
    border: "border-l-2 border-success",
    bg: "bg-success/10",
    dot: "bg-success",
  },
  transaction: {
    icon: "text-primary",
    chip: "bg-primary/10 text-primary",
    border: "border-l-2 border-primary",
    bg: "bg-primary/5",
    dot: "bg-primary",
  },
};

const labelMap: Record<UIType, string> = {
  info: "Information",
  warning: "Action Required",
  success: "Success",
  transaction: "Transaction",
};

/** Map server notification type to UI categories */
function mapServerTypeToUI(t: string): UIType {
  switch ((t || "").toUpperCase()) {
    case "SECURITY":
    case "ALERT":
      return "warning";
    case "PROMOTION":
      return "success";
    case "UPDATE":
    case "MAINTENANCE":
    default:
      return "info";
  }
}

/** Optional: map server type to a compact badge style (small text) */
function serverTypeBadgeClass(serverType: string) {
  const s = (serverType || "").toUpperCase();
  switch (s) {
    case "SECURITY":
      return "bg-red-50 text-red-700 border border-red-100";
    case "ALERT":
      return "bg-yellow-50 text-yellow-700 border border-yellow-100";
    case "PROMOTION":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "MAINTENANCE":
      return "bg-purple-50 text-purple-700 border border-purple-100";
    case "UPDATE":
    default:
      return "bg-slate-50 text-slate-700 border border-slate-100";
  }
}

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

  // map server notifications to UI-friendly shape, include serverType
  const notifications = useMemo(() => {
    const items: RawNotificationItem[] = raw?.notifications ?? [];
    return items.map((it) => {
      const uiType = mapServerTypeToUI(it.notification.type);
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
        uiType,
        serverType: it.notification.type ?? "UPDATE",
      };
    });
  }, [raw]);

  // Use the server-provided unreadCount as the "original" unread badge
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

    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", window.location.origin + "/notifications");
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

  // SKELETON card component
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

        {/* Original unread badge (server-provided count) */}
        <div className="flex items-center space-x-3">
          <Badge className="bg-primary text-primary-foreground">
            {unreadCount} unread
          </Badge>
        </div>
      </header>

      {/* Filter Tabs */}
      <Card className="border-border">
        <CardContent className="p-4 sm:p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground mr-2" />
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
            <CardContent className="p-8 sm:p-10 md:p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                Unable to load notifications
              </h3>
              <p className="text-muted-foreground">
                Something went wrong while fetching notifications. Try
                refreshing.
              </p>
              <div className="mt-4">
                <Button onClick={() => refetch()}>Retry</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {filteredNotifications.map((notification) => {
              const Icon = iconMap[notification.uiType];
              const styles = typeStyle[notification.uiType];

              return (
                <Card
                  key={notification.id}
                  className={cn(
                    "transition-colors duration-200 bg-card border-border",
                    styles.border
                  )}
                >
                  <div
                    className={cn(
                      "p-4 sm:p-5 md:p-6 rounded-md transition-colors hover:bg-muted/50",
                      !notification.read && styles.bg
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                      <div className="mt-0.5">
                        <div
                          className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-md",
                            styles.chip
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">
                              {notification.title}
                            </h3>

                            {/* --- SERVER TYPE BADGE (compact) --- */}
                            <Badge
                              className={cn(
                                "text-xs px-2 py-0.5 rounded",
                                serverTypeBadgeClass(notification.serverType)
                              )}
                            >
                              {notification.serverType}
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-2">
                            {!notification.read && (
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full flex-shrink-0",
                                  styles.dot
                                )}
                              />
                            )}
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{notification.timeAgo}</span>
                            </div>
                          </div>
                        </div>

                        <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {notification.message}
                        </p>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div>
                            <Badge
                              variant="secondary"
                              className={cn("rounded-full", styles.chip)}
                            >
                              {labelMap[notification.uiType]}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleMarkAsRead(Number(notification.rawId))
                                }
                                disabled={markLoading}
                                className="rounded-md"
                              >
                                Mark as read
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}

            {filteredNotifications.length === 0 && (
              <Card className="border-border">
                <CardContent className="p-8 sm:p-10 md:p-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                    No notifications
                  </h3>
                  <p className="text-muted-foreground">
                    {filter === "unread"
                      ? "You're all caught up! No unread notifications."
                      : "You don't have any notifications yet."}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}
