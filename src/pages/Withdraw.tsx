import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  ArrowUpFromLine,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  Target,
  Shield,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  useSendWithdrawOTPMutation,
  useCreateWithdrawTransactionMutation,
  useUploadWithdrawProofMutation,
} from "@/API/withdraw.api";
import { useGetInvestmentPortfolioQuery } from "@/API/investmentApi";
import { useGetTransactionsQuery } from "@/API/transactions.api";
import WithdrawalVerification from "@/components/WithdrawalVerification";

const MAX_PENDING_UPLOADS = 3;

// Minimums per source
const MIN_WITHDRAWAL: Record<FormType, number> = {
  investment: 50,
  referral: 50,
  principal: 100,
};

// Generate withdrawal options with awareness of a minimum amount
const generateWithdrawalOptions = (balance: number, minAmount = 50) => {
  const options: { value: string; label: string }[] = [];
  // include smaller increments so users can pick 50/100 when allowed
  const increments = [50, 100, 500, 1000, 2500, 5000];
  for (const inc of increments) {
    if (inc < minAmount) continue; // don't offer increments below min
    if (inc <= balance)
      options.push({
        value: inc.toString(),
        label: `$${inc.toLocaleString()}`,
      });
  }
  if (balance > minAmount)
    options.push({
      value: balance.toString(),
      label: `$${balance.toLocaleString()} (Max Available)`,
    });
  options.push({ value: "custom", label: "Custom Amount" });
  return options;
};

type FormType = "investment" | "referral" | "principal";

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso as string;
  }
};

const formatStatusForLabel = (statusRaw: string) => {
  const s = (statusRaw || "").toUpperCase();
  switch (s) {
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "COMPLETED":
    case "APPROVED":
      return "Completed";
    case "FAILED":
    case "REJECTED":
    case "CANCELLED":
      return "Rejected";
    default:
      return statusRaw;
  }
};

const getStatusBadge = (statusRaw: string) => {
  const s = (statusRaw || "").toUpperCase();
  if (s === "COMPLETED" || s === "APPROVED")
    return "bg-success/10 text-success border-success/20";
  if (s === "FAILED" || s === "REJECTED" || s === "CANCELLED")
    return "bg-destructive/10 text-destructive border-destructive/20";
  if (s === "PENDING" || s === "PROCESSING")
    return "bg-warning/10 text-warning border-warning/20";
  return "bg-muted text-muted-foreground border-border";
};

const getStatusIcon = (statusRaw: string) => {
  const s = (statusRaw || "").toUpperCase();
  if (s === "COMPLETED" || s === "APPROVED")
    return <CheckCircle className="h-4 w-4" />;
  if (s === "FAILED" || s === "REJECTED" || s === "CANCELLED")
    return <XCircle className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
};

const isValidTrc20Address = (addr: string) =>
  /^T[a-zA-Z0-9]{33}$/.test((addr || "").trim());

const WithdrawalForm = ({
  title,
  balance,
  amount,
  setAmount,
  icon: Icon,
  gradientColor,
  iconBg,
  formType,
  address,
  setAddress,
  currentStep,
  setCurrentStep,
  customAmount,
  setCustomAmount,
  twoFactorCode,
  setTwoFactorCode,
  onSendOTP,
  onCreateWithdrawal,
  isSendingOTP,
  isCreatingWithdrawal,
  isLoadingBalance,
  isGloballyBlocked,
  globalPendingCount,
  maxPendingUploads,
}: {
  title: string;
  balance: number;
  amount: string;
  setAmount: (v: string) => void;
  icon: any;
  gradientColor: string;
  iconBg: string;
  formType: FormType;
  address: string;
  setAddress: (v: string) => void;
  currentStep: { investment: number; referral: number; principal: number };
  setCurrentStep: React.Dispatch<
    React.SetStateAction<{
      investment: number;
      referral: number;
      principal: number;
    }>
  >;
  customAmount: { investment: boolean; referral: boolean; principal: boolean };
  setCustomAmount: React.Dispatch<
    React.SetStateAction<{
      investment: boolean;
      referral: boolean;
      principal: boolean;
    }>
  >;
  twoFactorCode: { investment: string; referral: string; principal: string };
  setTwoFactorCode: React.Dispatch<
    React.SetStateAction<{
      investment: string;
      referral: string;
      principal: string;
    }>
  >;
  onSendOTP: () => Promise<void>;
  onCreateWithdrawal: (otp: string) => Promise<void>;
  isSendingOTP: boolean;
  isCreatingWithdrawal: boolean;
  isLoadingBalance: boolean;
  isGloballyBlocked: boolean;
  globalPendingCount: number;
  maxPendingUploads: number;
}) => {
  const minAmount = MIN_WITHDRAWAL[formType];
  const withdrawalOptions = generateWithdrawalOptions(balance, minAmount);
  const step = currentStep[formType];

  const handleSendOTP = async () => {
    if (isGloballyBlocked) return; // guard already in parent but double-check
    if (!amount || parseFloat(amount) <= 0) return;
    if (parseFloat(amount) > balance) return;
    if (parseFloat(amount) < minAmount) return;
    if (!address || !isValidTrc20Address(address)) return;
    await onSendOTP();
  };

  const handleContinueTo2FA = () => {
    setCurrentStep((prev) => ({ ...prev, [formType]: 2 }));
    handleSendOTP();
  };

  return (
    <div className="space-y-6">
      {isGloballyBlocked && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">
                Withdrawals Temporarily Blocked
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                You have {globalPendingCount}/{maxPendingUploads} pending
                screenshot uploads. Please upload required proofs on your recent
                withdrawals before making a new request.
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "card-premium p-6 relative overflow-hidden",
          gradientColor
        )}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              {isLoadingBalance ? (
                <div className="space-y-2">
                  <div className="h-8 bg-muted rounded w-32 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-foreground">
                    ${balance.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ready to Withdraw
                  </p>
                </>
              )}
            </div>
            <div
              className={cn(
                "h-16 w-16 rounded-full flex items-center justify-center",
                iconBg
              )}
            >
              <Icon className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <div className="flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5" />
              {title} Withdrawal
            </div>
            <div className="text-sm text-muted-foreground">
              Step {step} of 2
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <Label>USDT Wallet Address (TRC20)</Label>

                <div className="flex items-center gap-2">
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your USDT wallet address"
                    className="font-mono text-sm"
                    aria-invalid={
                      address ? !isValidTrc20Address(address) : undefined
                    }
                  />
                  <div aria-hidden>
                    {address ? (
                      isValidTrc20Address(address) ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )
                    ) : null}
                  </div>
                </div>

                <p
                  className={
                    "text-xs " +
                    (address
                      ? isValidTrc20Address(address)
                        ? "text-success"
                        : "text-destructive"
                      : "text-muted-foreground")
                  }
                >
                  {address
                    ? isValidTrc20Address(address)
                      ? "Valid TRC20 address"
                      : "Invalid TRC20 address — should start with 'T' and be 34 characters."
                    : "Ensure this is a valid TRC20 USDT address"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Withdrawal Amount</Label>
                {isLoadingBalance ? (
                  <div className="space-y-2">
                    <div className="h-10 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                  </div>
                ) : (
                  <>
                    <Select
                      value={
                        customAmount[formType]
                          ? "custom"
                          : withdrawalOptions.find(
                              (opt) => opt.value === amount
                            )?.value ?? ""
                      }
                      onValueChange={(val) => {
                        if (val === "custom") {
                          setCustomAmount((p) => ({ ...p, [formType]: true }));
                          setAmount("");
                        } else {
                          setCustomAmount((p) => ({ ...p, [formType]: false }));
                          setAmount(val);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Select withdrawal amount" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        className="w-full max-w-[400px]"
                      >
                        {withdrawalOptions.map((o) => (
                          <SelectItem
                            key={o.value}
                            value={o.value}
                            className="text-sm"
                          >
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {customAmount[formType] && (
                      <div className="relative mt-3">
                        <Input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Enter custom amount"
                          className="pr-16"
                          max={balance}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          USDT
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Minimum: ${minAmount}</span>
                      <span>Available: ${balance.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              <Button
                className="w-full gradient-primary text-white"
                disabled={
                  isGloballyBlocked ||
                  isLoadingBalance ||
                  !address ||
                  !isValidTrc20Address(address) ||
                  !amount ||
                  parseFloat(amount) > balance ||
                  parseFloat(amount) < minAmount
                }
                onClick={handleContinueTo2FA}
              >
                Continue to 2FA Verification
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <h4 className="font-semibold text-foreground mb-3">
                    Withdrawal Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-semibold text-foreground">
                        ${parseFloat(amount).toLocaleString()} USDT
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">To Address:</span>
                      <span className="font-mono text-xs text-foreground break-all">
                        {address.slice(0, 20)}...{address.slice(-10)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source:</span>
                      <span className="text-foreground">{title}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-muted/20 rounded-xl border border-border">
                  <Label className="flex items-center gap-2 text-lg font-semibold">
                    <Shield className="h-5 w-5" />
                    2FA Code (Required)
                  </Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={twoFactorCode[formType]}
                      onChange={(value) =>
                        setTwoFactorCode((prev) => ({
                          ...prev,
                          [formType]: value,
                        }))
                      }
                      containerClassName="gap-4"
                    >
                      <InputOTPGroup className="gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <InputOTPSlot
                            key={i}
                            index={i}
                            className="h-14 w-14 text-lg font-semibold border-2 rounded-lg"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Enter your 6-digit 2FA code to authorize the withdrawal
                  </p>

                  <Button
                    variant="outline"
                    onClick={onSendOTP}
                    disabled={isSendingOTP || isGloballyBlocked}
                    className="w-full"
                  >
                    {isSendingOTP ? "Sending OTP..." : "Resend OTP Code"}
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setCurrentStep((prev) => ({ ...prev, [formType]: 1 }));
                      setTwoFactorCode((prev) => ({ ...prev, [formType]: "" }));
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-2 gradient-primary text-white"
                    disabled={
                      isGloballyBlocked ||
                      twoFactorCode[formType].length !== 6 ||
                      isCreatingWithdrawal
                    }
                    onClick={() => onCreateWithdrawal(twoFactorCode[formType])}
                  >
                    {isCreatingWithdrawal
                      ? "Processing..."
                      : "Submit Withdrawal Request"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* -------------------- Main Withdraw page -------------------- */

export default function Withdraw() {
  const { toast } = useToast();
  const [sendWithdrawOTP, { isLoading: isSendingOTP }] =
    useSendWithdrawOTPMutation();
  const [createWithdrawTransaction, { isLoading: isCreatingWithdrawal }] =
    useCreateWithdrawTransactionMutation();
  const [uploadWithdrawProof] = useUploadWithdrawProofMutation();

  const {
    data: portfolioData,
    isLoading: portfolioLoading,
    error: portfolioError,
    refetch: refetchPortfolio,
  } = useGetInvestmentPortfolioQuery();
  const { data: transactionsData, refetch: refetchTransactions } =
    useGetTransactionsQuery();

  // Persist active tab across page refreshes using localStorage
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      return localStorage.getItem("withdraw_active_tab") || "investment";
    } catch {
      return "investment";
    }
  });

  const [investmentWithdrawAddress, setInvestmentWithdrawAddress] =
    useState("");
  const [referralWithdrawAddress, setReferralWithdrawAddress] = useState("");
  const [principalWithdrawAddress, setPrincipalWithdrawAddress] = useState("");
  const [investmentWithdrawAmount, setInvestmentWithdrawAmount] = useState("");
  const [referralWithdrawAmount, setReferralWithdrawAmount] = useState("");
  const [principalWithdrawAmount, setPrincipalWithdrawAmount] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState({
    investment: "",
    referral: "",
    principal: "",
  });
  const [currentStep, setCurrentStep] = useState({
    investment: 1,
    referral: 1,
    principal: 1,
  });
  const [customAmount, setCustomAmount] = useState({
    investment: false,
    referral: false,
    principal: false,
  });

  const balances = {
    investment: portfolioData?.investmentReturns ?? 0,
    referral: portfolioData?.referralEarnings ?? 0,
    principal: portfolioData?.walletBalance ?? 0,
  };

  // OTP handler with block check
  const handleSendOTP = async () => {
    if (isGloballyBlocked) {
      toast({
        title: "Withdrawals Temporarily Blocked",
        description:
          "You have 3 pending screenshot uploads. Upload required proofs before creating a new withdrawal.",
        variant: "destructive",
      });
      return;
    }
    try {
      await sendWithdrawOTP().unwrap();
      toast({
        title: "OTP Sent",
        description: "Verification code has been sent to your email",
      });
    } catch (err: any) {
      toast({
        title: "Failed to send OTP",
        description: err?.data?.message || "Please try again later",
        variant: "destructive",
      });
    }
  };

  const handleCreateWithdrawal = async (otp: string, formType: FormType) => {
    if (isGloballyBlocked) {
      toast({
        title: "Withdrawals Temporarily Blocked",
        description:
          "You have 3 pending screenshot uploads. Upload required proofs before creating a new withdrawal.",
        variant: "destructive",
      });
      return;
    }

    const amount =
      formType === "investment"
        ? investmentWithdrawAmount
        : formType === "referral"
        ? referralWithdrawAmount
        : principalWithdrawAmount;
    const address =
      formType === "investment"
        ? investmentWithdrawAddress
        : formType === "referral"
        ? referralWithdrawAddress
        : principalWithdrawAddress;

    if (!amount || !address || !otp) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    const requestedAmount = parseFloat(amount);
    const availableBalance = balances[formType];
    const minAmount = MIN_WITHDRAWAL[formType];

    if (requestedAmount > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have $${availableBalance.toLocaleString()} available for withdrawal`,
        variant: "destructive",
      });
      return;
    }
    if (requestedAmount < minAmount) {
      toast({
        title: "Minimum Amount Required",
        description: `Minimum withdrawal amount is $${minAmount}`,
        variant: "destructive",
      });
      return;
    }

    const withdrawFromMap = {
      investment: "INVESTMENT_RETURNS" as const,
      referral: "REFERRAL_EARNING" as const,
      principal: "FUNDS_AVAILABLE" as const,
    };

    try {
      await createWithdrawTransaction({
        otp,
        amount: requestedAmount,
        withdrawFrom: withdrawFromMap[formType],
        userWallet: address,
      }).unwrap();

      toast({
        title: "Withdrawal Request Submitted",
        description: `Your withdrawal of $${requestedAmount} has been initiated`,
      });

      setTwoFactorCode((p) => ({ ...p, [formType]: "" }));
      setCurrentStep((p) => ({ ...p, [formType]: 1 }));
      if (formType === "investment") {
        setInvestmentWithdrawAmount("");
        setInvestmentWithdrawAddress("");
      }
      if (formType === "referral") {
        setReferralWithdrawAmount("");
        setReferralWithdrawAddress("");
      }
      if (formType === "principal") {
        setPrincipalWithdrawAmount("");
        setPrincipalWithdrawAddress("");
      }
      setCustomAmount((p) => ({ ...p, [formType]: false }));

      await Promise.allSettled([refetchTransactions(), refetchPortfolio()]);
    } catch (err: any) {
      toast({
        title: "Withdrawal Failed",
        description:
          err?.data?.message || "Please check your information and try again",
        variant: "destructive",
      });
    }
  };

  // Build withdrawalTransaction list from API
  const withdrawalTransactions = useMemo(() => {
    if (!transactionsData) return [] as any[];
    const rawArr =
      (transactionsData as any)?.withdrawals ??
      (transactionsData as any)?.data ??
      (transactionsData as any)?.transactions ??
      [];

    return (rawArr as any[]).map((w: any) => {
      const adminProofUrl =
        w.adminProofUrl ??
        w.admin_proof_url ??
        w.proofUrl ??
        w.admin_proof ??
        null;
      const screenshotUrl =
        w.screenshotUrl ?? w.clientProofUrl ?? w.client_proof ?? null;
      const updatedAt = w.updatedAt ?? w.processedAt ?? w.approvedAt ?? null;
      const createdAt = w.createdAt ?? w.requestedAt ?? null;

      return {
        id: String(
          w.id ??
            w.transactionId ??
            w._id ??
            Math.random().toString(36).slice(2, 9)
        ),
        txIdRaw: w.transactionId ?? w.id ?? w._id,
        amount: Number(String(w.amount ?? "0").replace(/,/g, "")) || 0,
        source: (() => {
          const withdrawFrom = (w.withdrawFrom ?? w.source ?? "")
            .toString()
            .toLowerCase();
          if (withdrawFrom === "funds_available") return "Principal";
          if (withdrawFrom === "investment_returns") return "Returns";
          if (withdrawFrom.includes("referral")) return "Referral";
          return withdrawFrom || "—";
        })(),
        status: (w.status ?? w.transactionStatus ?? "")
          .toString()
          .toUpperCase(),
        walletAddress: w.userWallet ?? w.wallet ?? "—",
        requestDate: createdAt ? formatDate(createdAt) : "—",
        processedDate: updatedAt ? formatDate(updatedAt) : null,
        updatedAtRaw: updatedAt,
        createdAtRaw: createdAt,
        adminProofUrl,
        screenshotUrl,
        rawData: w,
      } as const;
    });
  }, [transactionsData]);

  const isRecentlyCompleted = (t: any) => {
    if (!t || (t.status !== "COMPLETED" && t.status !== "APPROVED"))
      return false;
    const when = t.updatedAtRaw ?? t.rawData?.updatedAt ?? null;
    if (!when) return true; // if we don't know when, treat as recent (safer)
    try {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      return Date.now() - new Date(when).getTime() < SEVEN_DAYS_MS;
    } catch {
      return true;
    }
  };

  const getWithdrawalsBySource = (
    sourceType: "return" | "referral" | "principal"
  ) => {
    if (sourceType === "return")
      return withdrawalTransactions.filter((t) => t.source === "Returns");
    if (sourceType === "referral")
      return withdrawalTransactions.filter((t) => t.source === "Referral");
    return withdrawalTransactions.filter((t) => t.source === "Principal");
  };

  // ===== Pending upload detection =====
  const countsAsPendingUpload = (t: any) => {
    if (!t) return false;
    const status = (t?.status || "").toUpperCase();
    // count any ADMIN_PROOF_UPLOADED that does NOT have a client screenshot yet
    return status === "ADMIN_PROOF_UPLOADED" && !t.screenshotUrl;
  };

  // sort newest -> oldest (safe clone)
  const sortedWithdrawals = [...withdrawalTransactions].sort((a, b) => {
    const aTime = a?.createdAtRaw
      ? new Date(a.createdAtRaw).getTime()
      : a?.updatedAtRaw
      ? new Date(a.updatedAtRaw).getTime()
      : 0;
    const bTime = b?.createdAtRaw
      ? new Date(b.createdAtRaw).getTime()
      : b?.updatedAtRaw
      ? new Date(b.updatedAtRaw).getTime()
      : 0;
    return bTime - aTime;
  });

  // Total pending (counts ALL admin-proof-uploaded entries missing client screenshot).
  // This matches the case you reported: 3 items across the list should be counted.
  const totalPendingUploads = sortedWithdrawals.filter(
    countsAsPendingUpload
  ).length;

  // Keep a consecutive count as an optional internal value (not used for blocking by default).
  let consecutivePendingUploads = 0;
  for (let i = 0; i < sortedWithdrawals.length; i += 1) {
    if (countsAsPendingUpload(sortedWithdrawals[i]))
      consecutivePendingUploads += 1;
    else break;
  }
  const isGloballyBlocked = totalPendingUploads >= MAX_PENDING_UPLOADS;

  // ===== Withdrawal history component =====
  const WithdrawalHistory = ({
    withdrawals,
    type,
  }: {
    withdrawals: any[];
    type: string;
    globalPendingCount: number;
  }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const pendingVerifications = withdrawals.filter((w) => {
      const s = (w.status || "").toUpperCase();
      const showStatuses = [
        "PENDING",
        "PROCESSING",
        "ADMIN_PROOF_UPLOADED",
        "REVIEW",
      ];
      return showStatuses.includes(s);
    });

    const historicalWithdrawals = withdrawals.filter((w) => {
      if (!w || !w.status) return false;
      if (
        w.status === "FAILED" ||
        w.status === "REJECTED" ||
        w.status === "CANCELLED"
      )
        return true;
      if (w.status === "COMPLETED" || w.status === "APPROVED")
        return isRecentlyCompleted(w);
      return false;
    });

    const totalPages = Math.ceil(historicalWithdrawals.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedWithdrawals = historicalWithdrawals.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    // Add a key to each WithdrawalVerification to prevent re-mounting
    return (
      <div className="space-y-4">
        {pendingVerifications.length > 0 &&
          pendingVerifications.map((withdrawal) => (
            <div key={`verification-${withdrawal.id}`} className="mb-4">
              <WithdrawalVerification
                key={`verification-component-${withdrawal.id}`} // Add unique key
                withdrawal={withdrawal}
                pendingUploadsCount={totalPendingUploads}
                onUploadScreenshot={async (file: File) => {
                  const txId = Number(withdrawal.txIdRaw ?? withdrawal.id);
                  try {
                    await uploadWithdrawProof({
                      transactionId: txId,
                      screenshot: file,
                    }).unwrap();
                    return { success: true };
                  } catch (error) {
                    return { success: false };
                  }
                }}
              />
            </div>
          ))}

        <Card className="card-premium">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">
                {type} Withdrawal History
              </CardTitle>

              {historicalWithdrawals.length > 5 && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Show:</Label>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(v) => {
                      setItemsPerPage(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-28">
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {historicalWithdrawals.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-
                {Math.min(
                  startIndex + itemsPerPage,
                  historicalWithdrawals.length
                )}{" "}
                of {historicalWithdrawals.length} withdrawals
              </p>
            )}
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {paginatedWithdrawals.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No withdrawal history found
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your withdrawal requests will appear here
                  </p>
                </div>
              ) : (
                <>
                  {paginatedWithdrawals.map((withdrawal) => (
                    <div
                      key={withdrawal.id}
                      className="p-4 bg-muted/30 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(withdrawal.status)}
                            <span className="font-bold text-foreground">
                              ${withdrawal.amount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            "border",
                            getStatusBadge(withdrawal.status)
                          )}
                        >
                          {formatStatusForLabel(withdrawal.status)}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm">
                        <p className="text-muted-foreground">
                          Date: {withdrawal.requestDate}
                        </p>
                        <p className="text-muted-foreground font-mono break-all">
                          To: {withdrawal.walletAddress.slice(0, 20)}...
                        </p>
                        {withdrawal.processedDate && (
                          <p className="text-muted-foreground">
                            Processed: {withdrawal.processedDate}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(p - 1, 1))
                        }
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-10"
                          >
                            {page}
                          </Button>
                        )
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(p + 1, totalPages))
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Withdraw Funds
          </h1>
          <p className="text-muted-foreground text-lg">
            Withdraw your investment returns, referral earnings, and principal
          </p>
        </div>
      </div>

      {portfolioError && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  Failed to load portfolio data
                </p>
                <p className="text-sm text-muted-foreground">
                  Unable to fetch your balances. Some features may be limited.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          try {
            localStorage.setItem("withdraw_active_tab", v);
          } catch {}
        }}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger
            value="investment"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-3 px-4 font-medium transition-all"
          >
            <TrendingUp className="h-4 w-4 mr-2" /> Investment Returns
          </TabsTrigger>
          <TabsTrigger
            value="referral"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-3 px-4 font-medium transition-all"
          >
            <Users className="h-4 w-4 mr-2" /> Referral Earnings
          </TabsTrigger>
          <TabsTrigger
            value="principal"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-3 px-4 font-medium transition-all"
          >
            <Target className="h-4 w-4 mr-2" /> Investment Principal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="investment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WithdrawalForm
              title="Investment Returns"
              balance={balances.investment}
              amount={investmentWithdrawAmount}
              setAmount={setInvestmentWithdrawAmount}
              icon={TrendingUp}
              gradientColor="bg-gradient-to-br from-success/5 to-success/10"
              iconBg="bg-success/10 text-success"
              formType="investment"
              address={investmentWithdrawAddress}
              setAddress={setInvestmentWithdrawAddress}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              customAmount={customAmount}
              setCustomAmount={setCustomAmount}
              twoFactorCode={twoFactorCode}
              setTwoFactorCode={setTwoFactorCode}
              onSendOTP={handleSendOTP}
              onCreateWithdrawal={(otp: string) =>
                handleCreateWithdrawal(otp, "investment")
              }
              isSendingOTP={isSendingOTP}
              isCreatingWithdrawal={isCreatingWithdrawal}
              isLoadingBalance={portfolioLoading}
              isGloballyBlocked={isGloballyBlocked}
              globalPendingCount={totalPendingUploads}
              maxPendingUploads={MAX_PENDING_UPLOADS}
            />
            <WithdrawalHistory
              withdrawals={getWithdrawalsBySource("return")}
              type="Investment Returns"
              globalPendingCount={totalPendingUploads}
            />
          </div>
        </TabsContent>

        <TabsContent value="referral" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WithdrawalForm
              title="Referral Earnings"
              balance={balances.referral}
              amount={referralWithdrawAmount}
              setAmount={setReferralWithdrawAmount}
              icon={Users}
              gradientColor="bg-gradient-to-br from-purple-500/5 to-purple-600/10"
              iconBg="bg-purple-500/10 text-purple-600"
              formType="referral"
              address={referralWithdrawAddress}
              setAddress={setReferralWithdrawAddress}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              customAmount={customAmount}
              setCustomAmount={setCustomAmount}
              twoFactorCode={twoFactorCode}
              setTwoFactorCode={setTwoFactorCode}
              onSendOTP={handleSendOTP}
              onCreateWithdrawal={(otp: string) =>
                handleCreateWithdrawal(otp, "referral")
              }
              isSendingOTP={isSendingOTP}
              isCreatingWithdrawal={isCreatingWithdrawal}
              isLoadingBalance={portfolioLoading}
              isGloballyBlocked={isGloballyBlocked}
              globalPendingCount={totalPendingUploads}
              maxPendingUploads={MAX_PENDING_UPLOADS}
            />
            <WithdrawalHistory
              withdrawals={getWithdrawalsBySource("referral")}
              type="Referral Earnings"
              globalPendingCount={totalPendingUploads}
            />
          </div>
        </TabsContent>

        <TabsContent value="principal" className="space-y-6">
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-warning rounded-full mt-2"></div>
                <div>
                  <p className="font-semibold text-warning mb-2">
                    Important Notice
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Investment principal can only be withdrawn from your main
                    wallet balance. To withdraw invested funds, you must first
                    close mature investments from the Dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WithdrawalForm
              title="Investment Principal"
              balance={balances.principal}
              amount={principalWithdrawAmount}
              setAmount={setPrincipalWithdrawAmount}
              icon={Target}
              gradientColor="bg-gradient-to-br from-blue-500/5 to-blue-600/10"
              iconBg="bg-blue-500/10 text-blue-600"
              formType="principal"
              address={principalWithdrawAddress}
              setAddress={setPrincipalWithdrawAddress}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              customAmount={customAmount}
              setCustomAmount={setCustomAmount}
              twoFactorCode={twoFactorCode}
              setTwoFactorCode={setTwoFactorCode}
              onSendOTP={handleSendOTP}
              onCreateWithdrawal={(otp: string) =>
                handleCreateWithdrawal(otp, "principal")
              }
              isSendingOTP={isSendingOTP}
              isCreatingWithdrawal={isCreatingWithdrawal}
              isLoadingBalance={portfolioLoading}
              isGloballyBlocked={isGloballyBlocked}
              globalPendingCount={totalPendingUploads}
              maxPendingUploads={MAX_PENDING_UPLOADS}
            />
            <WithdrawalHistory
              withdrawals={getWithdrawalsBySource("principal")}
              type="Investment Principal"
              globalPendingCount={totalPendingUploads}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
