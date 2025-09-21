import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  CreditCard, 
  TrendingUp, 
  Shield, 
  Headphones,
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";

const instructionTypes = [
  {
    id: "kyc",
    title: "KYC Verification",
    icon: Shield,
    badge: "Required"
  },
  {
    id: "deposit",
    title: "Deposit Funds",
    icon: CreditCard,
    badge: null
  },
  {
    id: "investment",
    title: "Investment Plans",
    icon: TrendingUp,
    badge: "New"
  },
  {
    id: "withdrawal",
    title: "Withdrawal Process",
    icon: CreditCard,
    badge: null
  },
  {
    id: "support",
    title: "Support & Help",
    icon: Headphones,
    badge: null
  }
];

const instructionContent = {
  kyc: {
    title: "Complete Your KYC Verification",
    steps: [
      "Upload a clear photo of your government-issued ID (passport, driver's license, or national ID)",
      "Take a selfie holding your ID document next to your face",
      "Ensure all text on the document is clearly visible and readable",
      "Wait for verification (usually 24-48 hours)",
      "Once approved, you can access all platform features"
    ]
  },
  deposit: {
    title: "How to Deposit Funds",
    steps: [
      "Navigate to the Deposit page from the sidebar",
      "Copy the provided USDT (TRC20) wallet address",
      "Send your USDT from your wallet to the provided address",
      "Upload proof of payment (screenshot of transaction)",
      "Enter the transaction ID if required",
      "Wait for confirmation (usually 10-30 minutes)"
    ]
  },
  investment: {
    title: "Understanding Investment Plans",
    steps: [
      "Review available investment plans and their ROI rates",
      "Choose a plan that matches your risk tolerance",
      "Ensure you have sufficient balance in your account",
      "Click 'Create Investment' and select your preferred plan",
      "Confirm the investment amount and duration",
      "Monitor your investment progress in the dashboard"
    ]
  },
  withdrawal: {
    title: "Withdraw Your Funds",
    steps: [
      "Go to the Withdraw page from the sidebar",
      "Enter your USDT (TRC20) wallet address",
      "Specify the withdrawal amount (minimum limits apply)",
      "Complete 2FA verification if enabled",
      "Submit your withdrawal request",
      "Track the status in your withdrawal history"
    ]
  },
  support: {
    title: "Getting Help & Support",
    steps: [
      "Visit the Support page to create a new ticket",
      "Provide a clear subject and detailed description",
      "Attach relevant screenshots or documents",
      "Submit your ticket and wait for admin response",
      "Check back regularly for updates and replies",
      "Rate the support quality after resolution"
    ]
  }
};

export default function Instructions() {
  const [selectedType, setSelectedType] = useState("kyc");
  
  const currentContent = instructionContent[selectedType as keyof typeof instructionContent];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Platform Instructions</h1>
        <p className="text-muted-foreground text-lg">Step-by-step guides for using our platform</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Instruction Menu */}
        <div className="lg:col-span-1">
          <Card className="border-slate-200/60">
            <CardHeader className="border-b border-slate-200/60 bg-slate-50/50">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Quick Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {instructionTypes.map((type) => (
                <Button
                  key={type.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-between h-auto p-4 rounded-none border-b border-slate-100/50",
                    "hover:bg-slate-50",
                    selectedType === type.id && "bg-slate-100 border-l-4 border-l-primary"
                  )}
                  onClick={() => setSelectedType(type.id)}
                >
                  <div className="flex items-center space-x-3">
                    <type.icon className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">{type.title}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {type.badge && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-primary/10 text-primary border-primary/20"
                      >
                        {type.badge}
                      </Badge>
                    )}
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Instruction Content */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200/60">
            <CardHeader className="border-b border-slate-200/60 bg-slate-50/50">
              <CardTitle className="text-xl font-semibold text-slate-900">
                {currentContent.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                {currentContent.steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 text-primary text-sm font-semibold rounded-full flex items-center justify-center mt-1">
                      {index + 1}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}