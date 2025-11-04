import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useGetKycStatusQuery } from "@/API/userApi";
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
} from "@/API/notification.api";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationBannerItem {
  id: string;
  rawId?: number;
  type: "info" | "warning" | "success";
  title: string;
  message: string;
  dismissible?: boolean;
  actionLabel?: string;
  actionHref?: string;
}

// keep your palette (unchanged)
const typeConfig = {
  info: {
    icon: Info,
    wrapper:
      "bg-gradient-to-r from-blue-50 to-blue-100/40 border border-blue-200 text-blue-900",
    button: "text-blue-700 hover:bg-blue-100",
  },
  warning: {
    icon: AlertTriangle,
    wrapper:
      "bg-gradient-to-r from-amber-50 to-amber-100/40 border border-amber-200 text-amber-900",
    button: "text-amber-700 hover:bg-amber-100",
  },
  success: {
    icon: CheckCircle,
    wrapper:
      "bg-gradient-to-r from-emerald-50 to-emerald-100/40 border border-emerald-200 text-emerald-900",
    button: "text-emerald-700 hover:bg-emerald-100",
  },
};

export default function NotificationBanner() {
  const navigate = useNavigate();
  const [dismissedNotifications, setDismissedNotifications] = useState<
    string[]
  >([]);

  // KYC Status
  const { data: kycData } = useGetKycStatusQuery();
  const rawStatus =
    (kycData && (kycData as any).data?.status) ||
    (kycData && (kycData as any).status) ||
    "";
  const statusNormalized = String(rawStatus ?? "")
    .toLowerCase()
    .trim();

  const shouldShowKyc =
    !!statusNormalized &&
    /(pending|rejected|not[_\s]?submitted)/.test(statusNormalized);

  const kycNotification: NotificationBannerItem | null = shouldShowKyc
    ? (() => {
        if (/rejected/.test(statusNormalized)) {
          return {
            id: "kyc-rejected",
            type: "warning",
            title: "KYC Rejected",
            message:
              "Your KYC was rejected. Please re-submit correct documents to continue withdrawals.",
            dismissible: true,
            actionLabel: "Resubmit KYC",
            actionHref: "/profile",
          };
        }
        if (/pending/.test(statusNormalized)) {
          return {
            id: "kyc-pending",
            type: "info",
            title: "KYC Pending",
            message:
              "Your KYC is under review. You’ll be notified once approved.",
            dismissible: true,
            actionLabel: "View Status",
            actionHref: "/profile",
          };
        }
        return {
          id: "kyc-not-submitted",
          type: "warning",
          title: "KYC Required",
          message:
            "Complete your KYC verification to unlock all platform features.",
          dismissible: true,
          actionLabel: "Complete KYC",
          actionHref: "/profile",
        };
      })()
    : null;

  // Notifications
  const { data: notificationsResp, isLoading: notificationsLoading } =
    useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();

  const latestUnreadNotification = (() => {
    const arr =
      notificationsResp?.notifications &&
      Array.isArray(notificationsResp.notifications)
        ? notificationsResp.notifications
        : [];
    const unread = arr.filter((n: any) => n && n.isRead === false);
    if (unread.length === 0) return null;
    unread.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const top = unread[0];
    return {
      id: `notif-${top.id}`,
      rawId: top.id,
      type: "info" as const,
      title: String(top.notification?.title ?? "Notification"),
      message: String(top.notification?.description ?? ""),
      dismissible: true,
      actionLabel: "View",
      actionHref: "/notifications",
    };
  })();

  const dynamicNotifications: NotificationBannerItem[] = [
    ...(kycNotification ? [kycNotification] : []),
    ...(latestUnreadNotification ? [latestUnreadNotification] : []),
  ];

  const visibleNotifications = dynamicNotifications.filter(
    (n) => !dismissedNotifications.includes(n.id)
  );

  const dismissNotification = async (item: NotificationBannerItem) => {
    setDismissedNotifications((prev) => [...prev, item.id]);
    if (item.rawId) {
      try {
        await markRead({ id: item.rawId }).unwrap();
      } catch {}
    }
  };

  const handleAction = async (item: NotificationBannerItem) => {
    if (item.rawId) {
      try {
        await markRead({ id: item.rawId }).unwrap();
      } catch {}
    }
    if (item.actionHref) navigate(item.actionHref);
  };

  if (notificationsLoading) return null;
  if (visibleNotifications.length === 0) return null;

  return (
    // Keep same width/height context
    <motion.div layout className="space-y-3 mb-6">
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((n) => {
          const cfg = typeConfig[n.type] || typeConfig.info;
          const Icon = cfg.icon;

          return (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className={cn(
                  "relative flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl p-4 sm:p-5 shadow-sm backdrop-blur-md",
                  "border-l-4",
                  cfg.wrapper
                )}
              >
                <div className="flex items-start sm:items-center gap-3 flex-1">
                  <div className="flex-shrink-0 p-2 rounded-full bg-white/60 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Reserve room for the close button so content never overlaps */}
                  <div className="flex-1 space-y-1 pr-12 sm:pr-16">
                    <h3 className="font-semibold text-sm sm:text-base leading-tight">
                      {n.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{n.message}</p>

                    {n.actionLabel && (
                      <Button
                        size="sm"
                        variant="secondary" /* visible on gradients */
                        onClick={() => handleAction(n)}
                        className={cn("mt-2 text-xs rounded-md", cfg.button)}
                      >
                        {n.actionLabel}
                      </Button>
                    )}
                  </div>
                </div>

                {n.dismissible && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 hover:bg-white/50"
                    onClick={() => dismissNotification(n)}
                    aria-label="Dismiss notification"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
