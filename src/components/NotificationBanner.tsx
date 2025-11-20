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
  type: "info" | "warning" | "success" | "danger";
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
  // optional: danger (rejected) reuse warning palette or add new
  danger: {
    icon: AlertTriangle,
    wrapper:
      "bg-gradient-to-r from-red-50 to-red-100/40 border border-red-200 text-red-900",
    button: "text-red-700 hover:bg-red-100",
  },
};

export default function NotificationBanner() {
  const navigate = useNavigate();
  const [dismissedNotifications, setDismissedNotifications] = useState<
    string[]
  >([]);

  // KYC Status
  const { data: kycDataRaw } = useGetKycStatusQuery();
  // API might return { data: { ... } } or the object directly — handle both
  const kycData =
    (kycDataRaw && (kycDataRaw as any).data) || (kycDataRaw as any) || null;

  // Helper to build a KYC notification from the full KYC object returned by getKycStatus
  const buildKycNotification = (kyc: any): NotificationBannerItem | null => {
    if (!kyc || !kyc.status) return null;

    // expected shape:
    // kyc.status: 'not_submitted' | 'pending' | 'approved' | 'rejected'
    // kyc.documents: { passportFront, passportBack, selfieWithId, utilityBill }
    // each doc: { uploaded: boolean, status: 'NOT_SUBMITTED'|'PENDING'|'APPROVED'|'REJECTED', rejectionReason?: string|null }
    const docMap = [
      { key: "passportFront", label: "Passport Front" },
      { key: "passportBack", label: "Passport Back" },
      { key: "selfieWithId", label: "Selfie with ID" },
      { key: "utilityBill", label: "Utility Bill" },
    ];

    const perDocs = docMap.map((m) => ({
      key: m.key,
      label: m.label,
      ...(kyc.documents
        ? kyc.documents[m.key]
        : { uploaded: false, status: "NOT_SUBMITTED", rejectionReason: null }),
    }));

    const uploadedCount = perDocs.filter((d) => Boolean(d.uploaded)).length;
    const approvedCount = perDocs.filter((d) => d.status === "APPROVED").length;
    const rejectedDocs = perDocs.filter((d) => d.status === "REJECTED");
    const notSubmittedCount = perDocs.filter(
      (d) => d.status === "NOT_SUBMITTED"
    ).length;

    // Fully approved -> no banner
    if (kyc.status === "approved" || approvedCount === 4) {
      return null;
    }

    // Rejected -> explicit rejection banner (show reasons if available)
    if (
      kyc.status === "rejected" ||
      rejectedDocs.length > 0 ||
      (kyc.rejectionReason && String(kyc.rejectionReason).trim().length > 0)
    ) {
      // build short human readable reason list (doc label + reason if available)
      const reasonLines: string[] = [];

      rejectedDocs.forEach((d: any) => {
        if (d.rejectionReason)
          reasonLines.push(`${d.label}: ${d.rejectionReason}`);
        else reasonLines.push(`${d.label}: Rejected`);
      });

      if (
        kyc.rejectionReason &&
        String(kyc.rejectionReason).trim().length > 0
      ) {
        reasonLines.unshift(String(kyc.rejectionReason));
      }

      const reasonText = reasonLines.slice(0, 3).join("; "); // keep it concise

      return {
        id: "kyc-rejected",
        type: "danger",
        title: "KYC Rejected",
        message:
          reasonText.length > 0
            ? `One or more documents were rejected. ${reasonText}. Please review the reason(s) and re-upload the corrected document(s).`
            : "One or more of your KYC documents were rejected. Please review and re-submit.",
        dismissible: false,
        actionLabel: "View Status",
        actionHref: "/profile",
      };
    }

    // None uploaded -> prompt to complete KYC
    if (uploadedCount === 0 || kyc.status === "not_submitted") {
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
    }

    // Some uploaded but not all
    if (uploadedCount > 0 && uploadedCount < 4) {
      const remaining = 4 - uploadedCount;
      // If some uploaded are already approved -> ask to upload remaining
      if (approvedCount > 0) {
        return {
          id: "kyc-partial-upload",
          type: "warning",
          title: "More documents required",
          message: `We have received ${uploadedCount} of 4 documents. ${approvedCount} approved. Please upload the remaining ${remaining} document(s) to complete verification.`,
          dismissible: true,
          actionLabel: "Upload Documents",
          actionHref: "/profile",
        };
      }

      // No uploaded docs approved yet — guide to upload/complete
      return {
        id: "kyc-partial-upload-pending",
        type: "warning",
        title: "KYC Incomplete",
        message: `We have received ${uploadedCount} of 4 documents. Upload the remaining document(s) so we can verify your identity.`,
        dismissible: true,
        actionLabel: "Complete KYC",
        actionHref: "/profile",
      };
    }

    // All 4 uploaded but not all approved -> under review
    if (uploadedCount === 4 && approvedCount < 4) {
      const pendingCount = 4 - approvedCount;
      return {
        id: "kyc-under-review",
        type: "info",
        title: "KYC Under Review",
        message: `All documents have been uploaded. ${pendingCount} document(s) remaining under review. You’ll be notified once verification is complete.`,
        dismissible: true,
        actionLabel: "View Status",
        actionHref: "/profile",
      };
    }

    // Fallback pending
    return {
      id: "kyc-pending",
      type: "warning",
      title: "KYC Pending",
      message: "Your KYC is under review. You’ll be notified once approved.",
      dismissible: true,
      actionLabel: "View Status",
      actionHref: "/profile",
    };
  };

  const kycNotification: NotificationBannerItem | null =
    buildKycNotification(kycData);

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
          const cfg = (typeConfig as any)[n.type] || typeConfig.info;
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
