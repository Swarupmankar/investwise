import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useGetKycStatusQuery } from "@/API/userApi";
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
} from "@/API/notification.api";

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

const iconMap = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
};

const styleMap = {
  info: "border-blue-200 bg-blue-50/50 text-blue-800",
  warning: "border-amber-200 bg-amber-50/50 text-amber-800",
  success: "border-green-200 bg-green-50/50 text-green-800",
};

export default function NotificationBanner() {
  const navigate = useNavigate();
  const [dismissedNotifications, setDismissedNotifications] = useState<
    string[]
  >([]);

  // --- KYC status ---
  const { data: kycData } = useGetKycStatusQuery();

  const rawStatus =
    (kycData && (kycData as any).data && (kycData as any).data.status) ||
    (kycData && (kycData as any).status) ||
    "";
  const statusNormalized = String(rawStatus ?? "")
    .toLowerCase()
    .trim();

  const shouldShowKyc = (() => {
    if (!statusNormalized) return false;
    if (statusNormalized === "approved") return false;
    return /(pending|rejected|not[_\s]?submitted)/.test(statusNormalized);
  })();

  const kycNotification: NotificationBannerItem | null = shouldShowKyc
    ? ((): NotificationBannerItem => {
        if (/rejected/.test(statusNormalized)) {
          return {
            id: "kyc-rejected",
            type: "warning",
            title: "KYC Rejected",
            message:
              "Your KYC has been rejected. Please re-submit correct documents to continue using withdrawal features.",
            dismissible: true,
            actionLabel: "Resubmit KYC",
            actionHref: "/profile",
          };
        }

        if (/pending/.test(statusNormalized)) {
          return {
            id: "kyc-pending",
            type: "warning",
            title: "KYC Pending",
            message:
              "Your KYC is pending review. Once approved you will be able to access full features and withdrawals.",
            dismissible: true,
            actionLabel: "View KYC Status",
            actionHref: "/profile",
          };
        }

        return {
          id: "kyc-not-submitted",
          type: "warning",
          title: "KYC Required",
          message:
            "Complete your KYC verification to unlock all platform features and increase withdrawal limits.",
          dismissible: true,
          actionLabel: "Complete KYC",
          actionHref: "/profile",
        };
      })()
    : null;

  const {
    data: notificationsResp,
    isLoading: notificationsLoading,
    isError: notificationsError,
  } = useGetNotificationsQuery();

  const [markRead] = useMarkNotificationReadMutation();

  const latestUnreadNotification = (() => {
    const arr =
      notificationsResp &&
      Array.isArray((notificationsResp as any).notifications)
        ? (notificationsResp as any).notifications
        : [];

    const unread = arr.filter((n: any) => n && n.isRead === false);
    if (unread.length === 0) return null;

    unread.sort((a: any, b: any) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return tb - ta;
    });

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
    } as NotificationBannerItem;
  })();

  const dynamicNotifications: NotificationBannerItem[] = [
    ...(kycNotification ? [kycNotification] : []),
    ...(latestUnreadNotification ? [latestUnreadNotification] : []),
  ];

  const allNotifications = [...dynamicNotifications];

  const visibleNotifications = allNotifications.filter(
    (n) => !dismissedNotifications.includes(n.id)
  );

  const dismissNotification = async (item: NotificationBannerItem) => {
    setDismissedNotifications((prev) => [...prev, item.id]);

    if (item.rawId !== undefined) {
      try {
        await markRead({ id: item.rawId }).unwrap?.();
      } catch {}
    }
  };

  const handleAction = async (item: NotificationBannerItem) => {
    if (item.rawId !== undefined) {
      setDismissedNotifications((prev) => [...prev, item.id]);
      try {
        await markRead({ id: item.rawId }).unwrap?.();
      } catch {}
    }
    if (item.actionHref) navigate(item.actionHref);
  };

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {visibleNotifications.map((notification) => {
        const Icon = iconMap[notification.type] ?? Info;

        return (
          <Alert
            key={notification.id}
            className={cn("border-l-4 shadow-sm", styleMap[notification.type])}
          >
            <Icon className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div>
                  <span className="font-semibold">{notification.title}: </span>
                  <span>{notification.message}</span>
                </div>

                {notification.actionLabel && notification.actionHref && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAction(notification)}
                    >
                      {notification.actionLabel}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-start">
                {notification.dismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-white/50"
                    onClick={() => dismissNotification(notification)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
