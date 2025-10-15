// src/pages/CreateInvestment.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  ArrowRight,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Shield,
  Target,
  Users,
  Clock,
  Gift,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useInvestmentStore } from "@/hooks/useInvestmentStore";
import {
  useCreateInvestmentMutation,
  useGetInvestmentPortfolioQuery,
} from "@/API/investmentApi";

const monthlyGrowthPlan = {
  id: 1,
  name: "Monthly Growth",
  roi: 5.0,
  roiPeriod: "per month",
  minWithdrawal: 100,
  duration: "1 month",
  description:
    "Earn 5% monthly returns with flexible deposits and easy withdrawals.",
  risk: "Medium",
  isAvailable: true,
};

export default function CreateInvestment() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createInvestment: localCreateInvestment } = useInvestmentStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<any>(monthlyGrowthPlan);
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [investmentName, setInvestmentName] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  // Questionnaire state — human-readable values
  const [investmentPurpose, setInvestmentPurpose] = useState(""); // e.g. "For myself"
  const [investmentDuration, setInvestmentDuration] = useState(""); // e.g. "1 to 3 months"
  const [referralCode, setReferralCode] = useState("");

  // portfolio/stats fetched from server (used for available funds)
  const {
    data: portfolio,
    isLoading: portfolioLoading,
    isFetching: portfolioFetching,
    isError: portfolioError,
  } = useGetInvestmentPortfolioQuery();

  // live available balance from server (fallback to 0)
  const availableBalance = Number(portfolio?.walletBalance ?? 0);

  // RTK Query mutation hook
  const [createInvestmentApi, { isLoading: createLoading }] =
    useCreateInvestmentMutation();

  // SEO: title + meta
  useEffect(() => {
    document.title = "Monthly Growth Investment | Create Investment";
    const desc =
      "Create a Monthly Growth investment and earn 5% monthly returns.";
    let meta = document.querySelector(
      'meta[name="description"]'
    ) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;
    let link = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      link.href = window.location.href;
      document.head.appendChild(link);
    } else {
      link.href = window.location.href;
    }
  }, []);

  // handlers
  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan);
    setCurrentStep(2);
  };

  const handleAmountSubmit = () => {
    if (!investmentAmount || isNaN(Number(investmentAmount))) return;

    const amount = Number(investmentAmount);
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid investment amount",
        variant: "destructive",
      });
      return;
    }

    if (amount < 1000) {
      toast({
        title: "Minimum Investment Required",
        description: "Minimum investment amount is $1,000",
        variant: "destructive",
      });
      return;
    }

    if (amount % 500 !== 0) {
      toast({
        title: "Invalid Amount",
        description: "Investment amount must be in multiples of $500",
        variant: "destructive",
      });
      return;
    }

    // Validate against server-side funds (portfolio)
    if (amount > availableBalance) {
      toast({
        title: "Insufficient Funds",
        description: `You only have $${availableBalance.toLocaleString()} available in your wallet`,
        variant: "destructive",
      });
      return;
    }

    setCurrentStep(3);
  };

  const handleQuestionnaireSubmit = () => {
    if (!investmentPurpose || !investmentDuration) {
      toast({
        title: "Incomplete Information",
        description: "Please answer all required questions",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep(4);
  };

  // --------- FIX: use proper typed payload instead of Record<string, any> ----------
  type CreateInvestmentPayload = {
    amount: number;
    name: string;
    forWhome: string;
    duration: string;
    referralCode?: string;
  };

  const handleConfirmInvestment = async () => {
    if (!investmentPurpose || !investmentDuration) {
      toast({
        title: "Missing selection",
        description: "Please answer the questionnaire before confirming.",
        variant: "destructive",
      });
      setCurrentStep(3);
      return;
    }

    const payload: CreateInvestmentPayload = {
      amount: Number(investmentAmount),
      name: investmentName?.trim()
        ? investmentName.trim()
        : selectedPlan?.name ?? "",
      forWhome: investmentPurpose,
      duration: investmentDuration,
    };

    if (referralCode?.trim()) payload.referralCode = referralCode.trim();

    try {
      const res = await createInvestmentApi(payload).unwrap();
      try {
        localCreateInvestment(
          `plan_${selectedPlan.id}`,
          selectedPlan.name,
          Number(investmentAmount),
          selectedPlan.roi,
          investmentName || undefined
        );
      } catch (e) {
        // ignore local update errors
      }

      toast({
        title: "Investment Created Successfully!",
        description: `Your investment of $${Number(
          investmentAmount
        ).toLocaleString()} has been submitted.`,
      });

      navigate("/");
    } catch (err: any) {
      const errorMessage = err?.data?.message || err?.message || "";

      if (
        errorMessage.includes("referral") ||
        errorMessage.includes("Referral") ||
        errorMessage.includes("invalid") ||
        errorMessage.includes("Invalid") ||
        err?.data?.errors?.referralCode
      ) {
        toast({
          title: "Invalid Referral Code",
          description:
            "The referral code you entered is invalid. Please check and try again.",
          variant: "destructive",
        });
      } else {
        // For other errors, show the server message
        const serverMessage =
          errorMessage ||
          err?.data?.errors ||
          "Failed to create investment. Please try again.";

        toast({
          title: "Create Failed",
          description: String(serverMessage),
          variant: "destructive",
        });
      }
    }
  };

  // small helpers
  const formatCurrency = (n?: number) =>
    Number.isFinite(n ?? NaN) ? (n as number).toLocaleString() : "0";

  // -- Render steps (inside component) --
  const renderStep1 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg">
          <TrendingUp className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">
            Monthly Growth Plan
          </h1>
          <p className="text-muted-foreground text-base max-w-2xl mx-auto">
            Earn consistent 5% monthly returns with flexible deposits.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="relative overflow-hidden ring-1 ring-primary/10 shadow-xl">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />

          <CardHeader className="p-6 sm:p-8 pb-4 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-md">
                  <TrendingUp className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl sm:text-3xl">
                    {monthlyGrowthPlan.name}
                  </CardTitle>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {monthlyGrowthPlan.description}
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-4xl font-extrabold text-primary">
                  {monthlyGrowthPlan.roi}%
                </div>
                <p className="text-sm text-muted-foreground">
                  {monthlyGrowthPlan.roiPeriod}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Min Withdrawal
                </span>
                <span className="text-base font-bold text-foreground">
                  ${monthlyGrowthPlan.minWithdrawal}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Min Duration
                </span>
                <span className="text-base font-bold text-foreground">
                  {monthlyGrowthPlan.duration}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Deposit Limit
                </span>
                <span className="text-base font-bold text-foreground">
                  No Limit
                </span>
              </div>
            </div>

            <Button
              onClick={() => handlePlanSelect(monthlyGrowthPlan)}
              className="w-full h-12 text-base font-semibold rounded-lg gradient-primary text-white shadow-lg hover:shadow-xl"
            >
              Continue
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-primary font-semibold text-sm">
              All investments are secured and regulated
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="max-w-lg mx-auto space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20">
          <DollarSign className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Investment Amount</h2>
        <p className="text-muted-foreground text-sm">
          Specify your investment amount
        </p>
      </div>

      <div className="card-premium p-4 space-y-4">
        {/* Selected Plan Summary */}
        <div className="text-center p-3 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">
              {selectedPlan?.name}
            </h3>
            <Badge className="bg-success/10 text-success border-success/20 px-2 py-1 text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />+{selectedPlan?.roi}% ROI
            </Badge>
            <p className="text-xs text-muted-foreground">
              {selectedPlan?.description}
            </p>
          </div>
        </div>

        {/* Wallet Balance Display (live from portfolio API) */}
        <div className="p-3 bg-gradient-to-br from-blue-500/5 to-blue-600/10 rounded-lg border border-blue-500/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Available Balance:
            </span>
            <span className="text-lg font-bold text-foreground">
              ${formatCurrency(availableBalance)}
            </span>
          </div>
          {portfolioFetching && (
            <div className="text-xs text-muted-foreground mt-1">
              Fetching latest balance…
            </div>
          )}
          {portfolioError && (
            <div className="text-xs text-danger mt-1">
              Unable to fetch balance — using 0 for validation
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-sm font-semibold">
            Investment Amount (USD)
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount (minimum $1,000, multiples of $500)"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(e.target.value)}
              className="pl-10 h-10 text-base font-semibold bg-white border-2 focus:border-primary/50"
              max={availableBalance}
              step={500}
              min={1000}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Min: $1,000 (multiples of $500)</span>
            <span>Available: ${formatCurrency(availableBalance)}</span>
          </div>

          {/* Plan Info */}
          <div className="flex justify-between items-center p-2 bg-muted/30 rounded-lg text-xs">
            <div className="text-center">
              <p className="text-muted-foreground">Min Withdrawal</p>
              <p className="font-semibold text-foreground">
                ${selectedPlan?.minWithdrawal}
              </p>
            </div>
            <div className="h-3 w-px bg-border"></div>
            <div className="text-center">
              <p className="text-muted-foreground">Min Duration</p>
              <p className="font-semibold text-foreground">
                {selectedPlan?.duration}
              </p>
            </div>
            <div className="h-3 w-px bg-border"></div>
            <div className="text-center">
              <p className="text-muted-foreground">Deposit Limit</p>
              <p className="font-semibold text-foreground">No Limit</p>
            </div>
          </div>
        </div>

        {/* Investment Name Input */}
        <div className="space-y-2">
          <Label htmlFor="investmentName" className="text-sm font-semibold">
            Investment Name (Optional)
          </Label>
          <div className="relative">
            <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="investmentName"
              type="text"
              placeholder="e.g., My First Investment, Retirement Fund..."
              value={investmentName}
              onChange={(e) => setInvestmentName(e.target.value)}
              className="pl-10 h-10 text-base bg-white border-2 focus:border-primary/50"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Give your investment a memorable name for easy tracking
          </p>
        </div>

        {/* Calculation Display */}
        {investmentAmount && Number(investmentAmount) > 0 && (
          <div className="p-3 bg-gradient-to-br from-success/5 to-emerald/5 border border-success/20 rounded-lg animate-scale-in">
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div>
                <p className="text-muted-foreground">Initial</p>
                <p className="text-lg font-bold text-foreground">
                  ${Number(investmentAmount).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Profit</p>
                <p className="text-lg font-bold text-success">
                  $
                  {(
                    (Number(investmentAmount) * selectedPlan?.roi) /
                    100
                  ).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-gradient">
                  $
                  {(
                    Number(investmentAmount) +
                    (Number(investmentAmount) * selectedPlan?.roi) / 100
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(1)}
          className="flex-1 h-10 border-2 hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleAmountSubmit}
          disabled={!investmentAmount || Number(investmentAmount) <= 0}
          className="flex-1 h-10 gradient-primary text-white shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20">
          <Users className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Investment Questionnaire
        </h2>
        <p className="text-muted-foreground text-sm">
          Help us understand your investment needs
        </p>
      </div>

      <div className="card-premium p-6 space-y-6">
        {/* Question 2: Investment Purpose - human-readable values */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            For whom are you making this investment? *
          </Label>
          <RadioGroup
            value={investmentPurpose}
            onValueChange={(v) => {
              setInvestmentPurpose(v);
            }}
          >
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="For myself" id="myself" />
              <Label htmlFor="myself" className="cursor-pointer">
                A) For myself
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="For my family" id="family" />
              <Label htmlFor="family" className="cursor-pointer">
                B) For my family (spouse, children, or close relatives)
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="For friends" id="friends" />
              <Label htmlFor="friends" className="cursor-pointer">
                C) For friends
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="For others" id="others" />
              <Label htmlFor="others" className="cursor-pointer">
                D) For others (managing funds on their behalf)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Question 3: Investment Duration - human-readable values */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            For how long would you like this fund to be invested? *
          </Label>
          <p className="text-xs text-muted-foreground">
            Minimum duration is 1 month
          </p>
          <RadioGroup
            value={investmentDuration}
            onValueChange={(v) => {
              setInvestmentDuration(v);
            }}
          >
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="1 to 3 months" id="1-3months" />
              <Label htmlFor="1-3months" className="cursor-pointer">
                A) 1 to 3 months
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="3 to 6 months" id="3-6months" />
              <Label htmlFor="3-6months" className="cursor-pointer">
                B) 3 to 6 months
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="6 months to 1 year" id="6months-1year" />
              <Label htmlFor="6months-1year" className="cursor-pointer">
                C) 6 months to 1 year
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="More than 1 year" id="1year+" />
              <Label htmlFor="1year+" className="cursor-pointer">
                D) More than 1 year
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="Other" id="other" />
              <Label htmlFor="other" className="cursor-pointer">
                E) Other
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Question 4: Referral Code */}
        <div className="space-y-3">
          <Label
            htmlFor="referralCode"
            className="text-sm font-semibold flex items-center gap-2"
          >
            <Gift className="h-4 w-4" />
            Would you like to make this investment under a referral code?
          </Label>
          <div className="relative">
            <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="referralCode"
              type="text"
              placeholder="Enter referral code (optional)"
              value={referralCode}
              onChange={(e) => {
                setReferralCode(e.target.value);
              }}
              className="pl-10 h-10 text-base bg-white border-2 focus:border-primary/50"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a referral code to get additional benefits
          </p>
        </div>

        {/* Summary */}
        <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
          <h3 className="font-semibold text-foreground mb-2">
            Investment Summary
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Amount:</span>
              <span className="ml-2 font-semibold">
                ${Number(investmentAmount).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Plan:</span>
              <span className="ml-2 font-semibold">{selectedPlan?.name}</span>
            </div>
            {investmentPurpose && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Purpose:</span>
                <span className="ml-2 font-semibold">{investmentPurpose}</span>
              </div>
            )}
            {investmentDuration && (
              <div className="col-span-2">
                <span className="text-muted-foreground">
                  Duration preference:
                </span>
                <span className="ml-2 font-semibold">{investmentDuration}</span>
              </div>
            )}
            {referralCode && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Referral code:</span>
                <span className="ml-2 font-semibold">{referralCode}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(2)}
          className="flex-1 h-10 border-2 hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleQuestionnaireSubmit}
          disabled={!investmentPurpose || !investmentDuration}
          className="flex-1 h-10 gradient-primary text-white shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="max-w-lg mx-auto space-y-4 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-success/20 to-emerald-500/20">
          <CheckCircle className="h-6 w-6 text-success" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Review Investment</h2>
        <p className="text-muted-foreground text-sm">
          Confirm your investment details
        </p>
      </div>

      <div className="space-y-3">
        <div className="card-premium p-4 space-y-3">
          <div className="text-center">
            <h3 className="text-lg font-bold text-foreground">
              Investment Summary
            </h3>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Selected Plan</span>
              <span className="font-semibold text-foreground">
                {selectedPlan?.name}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">ROI Rate</span>
              <span className="font-semibold text-success">
                +{selectedPlan?.roi}%
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-semibold text-foreground">
                {selectedPlan?.duration}
              </span>
            </div>

            <div className="h-px bg-border my-2"></div>

            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Investment Amount</span>
              <span className="font-bold text-foreground text-lg">
                ${Number(investmentAmount).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="card-premium p-4 bg-gradient-to-br from-success/5 to-emerald-500/5 border-success/20">
          <div className="space-y-3">
            <div className="text-center">
              <h3 className="text-lg font-bold text-success">
                Projected Returns
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-2 bg-white/50 rounded-lg">
                <p className="text-muted-foreground">Expected Profit</p>
                <p className="text-lg font-bold text-success">
                  $
                  {(
                    (Number(investmentAmount) * selectedPlan?.roi) /
                    100
                  ).toLocaleString()}
                </p>
              </div>

              <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                <p className="text-muted-foreground">Total Value</p>
                <p className="text-lg font-bold text-gradient">
                  $
                  {(
                    Number(investmentAmount) +
                    (Number(investmentAmount) * selectedPlan?.roi) / 100
                  ).toLocaleString()}
                </p>
              </div>

              <div className="p-2 bg-white/30 rounded-lg">
                <p className="text-muted-foreground">Profit Margin</p>
                <p className="text-lg font-bold text-success">
                  {selectedPlan?.roi}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(3)}
          className="flex-1 h-10 border-2 hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handleConfirmInvestment}
          disabled={createLoading}
          className="flex-1 h-10 gradient-primary text-white shadow-lg hover:shadow-xl"
        >
          {createLoading ? "Creating…" : "Create Investment"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2 hover:bg-muted/50 h-10 px-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {[
              { step: 1, label: "Select Plan" },
              { step: 2, label: "Set Amount" },
              { step: 3, label: "Questions" },
              { step: 4, label: "Confirm" },
            ].map(({ step, label }, index) => (
              <div key={step} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                      step <= currentStep
                        ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step <= currentStep ? (
                      step < currentStep ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        step
                      )
                    ) : (
                      step
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors hidden sm:block",
                      step <= currentStep
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </div>
                {index < 3 && (
                  <div
                    className={cn(
                      "h-0.5 w-8 transition-all duration-300",
                      step < currentStep ? "bg-primary shadow-sm" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
}

// small helper for currency formatting (kept outside to avoid redeclaring in render)
function formatCurrency(n?: number) {
  return Number.isFinite(n ?? NaN) ? (n as number).toLocaleString() : "0";
}
