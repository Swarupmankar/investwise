import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "info" | "warning" | "success";
  title: string;
  message: string;
  dismissible?: boolean;
}

const notifications: Notification[] = [
  {
    id: "kyc-pending",
    type: "warning",
    title: "KYC Verification Required",
    message: "Complete your KYC verification to unlock all platform features and increase withdrawal limits.",
    dismissible: true
  },
  {
    id: "market-update",
    type: "info", 
    title: "Market Update",
    message: "New investment plans with higher ROI are now available. Check them out in the investment section.",
    dismissible: true
  }
];

const iconMap = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle
};

const styleMap = {
  info: "border-blue-200 bg-blue-50/50 text-blue-800",
  warning: "border-amber-200 bg-amber-50/50 text-amber-800", 
  success: "border-green-200 bg-green-50/50 text-green-800"
};

export default function NotificationBanner() {
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);

  const visibleNotifications = notifications.filter(
    notification => !dismissedNotifications.includes(notification.id)
  );

  const dismissNotification = (id: string) => {
    setDismissedNotifications(prev => [...prev, id]);
  };

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {visibleNotifications.map((notification) => {
        const Icon = iconMap[notification.type];
        
        return (
          <Alert
            key={notification.id}
            className={cn(
              "border-l-4 shadow-sm",
              styleMap[notification.type]
            )}
          >
            <Icon className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <span className="font-semibold">{notification.title}: </span>
                {notification.message}
              </div>
              {notification.dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-white/50"
                  onClick={() => dismissNotification(notification.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}