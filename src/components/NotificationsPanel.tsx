import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Clock, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "info" | "warning" | "success" | "transaction";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const notifications: Notification[] = [
  {
    id: "1",
    type: "success",
    title: "Deposit Confirmed",
    message: "Your USDT deposit of $5,000 has been confirmed and added to your balance.",
    time: "2 hours ago",
    read: false
  },
  {
    id: "2", 
    type: "info",
    title: "Investment Matured",
    message: "Your Growth Plus investment plan has matured. Profit of $775 added to balance.",
    time: "1 day ago",
    read: false
  },
  {
    id: "3",
    type: "warning",
    title: "KYC Verification",
    message: "Please complete your KYC verification to increase withdrawal limits.",
    time: "2 days ago",
    read: true
  },
  {
    id: "4",
    type: "transaction",
    title: "Withdrawal Processed",
    message: "Your withdrawal request of $2,500 has been successfully processed.",
    time: "3 days ago", 
    read: true
  }
];

const iconMap = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  transaction: Bell
};

const colorMap = {
  info: "text-blue-600",
  warning: "text-amber-600", 
  success: "text-green-600",
  transaction: "text-primary"
};

export default function NotificationsPanel() {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Card className="border-slate-200/60">
      <CardHeader className="border-b border-slate-200/60 bg-slate-50/50">
        <CardTitle className="flex items-center justify-between text-lg font-semibold text-slate-900">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground">
              {unreadCount} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {notifications.map((notification) => {
            const Icon = iconMap[notification.type];
            
            return (
              <div
                key={notification.id}
                className={cn(
                  "p-4 border-b border-slate-100/50 hover:bg-slate-50/50 cursor-pointer transition-colors",
                  !notification.read && "bg-blue-50/30 border-l-4 border-l-primary"
                )}
              >
                <div className="flex items-start space-x-3">
                  <div className={cn("mt-0.5", colorMap[notification.type])}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 ml-2" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center space-x-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span>{notification.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-200/60 bg-slate-50/30">
          <Button 
            variant="ghost" 
            className="w-full text-sm text-slate-600 hover:text-slate-900"
          >
            View All Notifications
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}