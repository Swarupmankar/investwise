import React from "react";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function EmptyCard({
  title = "Nothing here",
  message = "No items to show.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-8 sm:p-10 md:p-12 text-center">
        <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
