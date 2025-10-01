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
} from "@/API/withdraw.api";
import { useGetInvestmentPortfolioQuery } from "@/API/investmentApi";
import { useGetTransactionsQuery } from "@/API/transactions.api";
import WithdrawalVerification from "@/components/WithdrawalVerification";

/**
 * Helper: generate options for select (keeps your original increments)
 */
const generateWithdrawalOptions = (balance: number) => {
  const options: { value: string; label: string }[] = [];
  const increments = [50, 100, 250, 500, 1000, 2500, 5000];

  for (const inc of increments) {
    if (inc <= balance)
      options.push({
        value: inc.toString(),
        label: `$${inc.toLocaleString()}`,
      });
  }

  if (balance > 10)
    options.push({
      value: balance.toString(),
      label: `$${balance.toLocaleString()} (Max Available)`,
    });

  options.push({ value: "custom", label: "Custom Amount" });
  return options;
};

type FormType = "investment" | "referral" | "principal";

/**
 * Small formatters
 */
const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const formatStatusForLabel = (statusRaw: string) => {
  const s = (statusRaw || "").toUpperCase();
  switch (s) {
    case "PENDING":
      return "Pending (In Progress)";
    case "ADMIN_PROOF_UPLOADED":
      return "Admin Proof Uploaded";
    case "REVIEW":
      return "Admin Review";
    case "APPROVED":
      return "Completed";
    case "REJECTED":
      return "Rejected";
    default:
      return statusRaw;
  }
};

/**
 * Badge color helper (keeps original look)
 */
const getStatusBadge = (statusRaw: string) => {
  const s = (statusRaw || "").toUpperCase();
  if (s === "APPROVED") return "bg-success/10 text-success border-success/20";
  if (s === "ADMIN_PROOF_UPLOADED" || s === "REVIEW")
    return "bg-warning/10 text-warning border-warning/20";
  if (s === "PENDING")
    return "bg-muted/10 text-muted-foreground border-muted/20";
  if (s === "REJECTED")
    return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-muted text-muted-foreground border-border";
};

const getStatusIcon = (statusRaw: string) => {
  const s = (statusRaw || "").toUpperCase();
  if (s === "APPROVED") return <CheckCircle className="h-4 w-4" />;
  if (s === "REJECTED") return <XCircle className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
};

/**
 * WithdrawalForm component (keeps your original form/flow)
 * Only minor wiring (same as your original).
 */
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
}) => {
  const withdrawalOptions = generateWithdrawalOptions(balance);
  const step = currentStep[formType];

  const handleSendOTP = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (parseFloat(amount) > balance) return;
    await onSendOTP();
  };

  const handleContinueTo2FA = () => {
    setCurrentStep((prev) => ({ ...prev, [formType]: 2 }));
    handleSendOTP(); // auto-send OTP upon continuing
  };

  return (
    <div className="space-y-6">
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
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your USDT wallet address"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Ensure this is a valid TRC20 USDT address
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
                      <span>Minimum: $10</span>
                      <span>Available: ${balance.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              <Button
                className="w-full gradient-primary text-white"
                disabled={
                  isLoadingBalance ||
                  !address ||
                  !amount ||
                  parseFloat(amount) > balance ||
                  parseFloat(amount) < 10
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
                        <InputOTPSlot
                          index={0}
                          className="h-14 w-14 text-lg font-semibold border-2 rounded-lg"
                        />
                        <InputOTPSlot
                          index={1}
                          className="h-14 w-14 text-lg font-semibold border-2 rounded-lg"
                        />
                        <InputOTPSlot
                          index={2}
                          className="h-14 w-14 text-lg font-semibold border-2 rounded-lg"
                        />
                        <InputOTPSlot
                          index={3}
                          className="h-14 w-14 text-lg font-semibold border-2 rounded-lg"
                        />
                        <InputOTPSlot
                          index={4}
                          className="h-14 w-14 text-lg font-semibold border-2 rounded-lg"
                        />
                        <InputOTPSlot
                          index={5}
                          className="h-14 w-14 text-lg font-semibold border-2 rounded-lg"
                        />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Enter your 6-digit 2FA code to authorize the withdrawal
                  </p>

                  <Button
                    variant="outline"
                    onClick={onSendOTP}
                    disabled={isSendingOTP}
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

/**
 * Main Withdraw page — updated to match your requested flow and backend types
 */
export default function Withdraw() {
  const { toast } = useToast();

  // RTK Query hooks with refetch available
  const [sendWithdrawOTP, { isLoading: isSendingOTP }] =
    useSendWithdrawOTPMutation();
  const [createWithdrawTransaction, { isLoading: isCreatingWithdrawal }] =
    useCreateWithdrawTransactionMutation();
  const {
    data: portfolioData,
    isLoading: portfolioLoading,
    error: portfolioError,
    refetch: refetchPortfolio,
  } = useGetInvestmentPortfolioQuery();
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useGetTransactionsQuery();

  // UI state
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

  // balances derived from portfolio API (keep original variable names)
  const balances = {
    investment: portfolioData?.investmentReturns ?? 0,
    referral: portfolioData?.referralEarnings ?? 0,
    principal: portfolioData?.walletBalance ?? 0,
  };

  /**
   * Backend endpoint interactions
   */
  const handleSendOTP = async () => {
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

    if (requestedAmount > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have $${availableBalance.toLocaleString()} available for withdrawal`,
        variant: "destructive",
      });
      return;
    }
    if (requestedAmount < 10) {
      toast({
        title: "Minimum Amount Required",
        description: "Minimum withdrawal amount is $10",
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

      // reset UI
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

      // REFRESH transactions & portfolio
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

  /**
   * Upload client screenshot — backend should update status to REVIEW
   * and we refetch transactions afterwards so UI updates instantly.
   */
  const uploadWithdrawalScreenshot = async (
    withdrawalId: string,
    file: File
  ) => {
    try {
      const fd = new FormData();
      fd.append("screenshot", file);

      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/v1/withdrawals/${withdrawalId}/screenshot`, {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Upload failed");
      }

      toast({
        title: "Screenshot Uploaded",
        description: "Client proof uploaded; admin will review shortly.",
      });

      await refetchTransactions();
      return { success: true };
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err?.message || "Could not upload screenshot",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  /**
   * Verification endpoint: used both for admin actions and for marking client_uploaded
   * Accepts action = "admin_approve" | "client_uploaded" | "reject"
   *
   * Backend must map these actions to the canonical statuses:
   * - "admin_approve" -> ADMIN_PROOF_UPLOADED (or APPROVED if admin finalizes)
   * - "client_uploaded" -> REVIEW
   * - "approve_final" -> APPROVED
   * - "reject" -> REJECTED
   *
   * Here we call generic /verify endpoint — update payload as per your backend.
   */
  const completeWithdrawalVerification = async (
    withdrawalId: string,
    action: "admin_approved" | "client_uploaded" | "reject" | "approve_final"
  ) => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/v1/withdrawals/${withdrawalId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Verification action failed");
      }

      toast({
        title: "Verification Updated",
        description: "Status updated successfully",
      });

      // REFRESH
      await Promise.allSettled([refetchTransactions(), refetchPortfolio()]);
      return { success: true };
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err?.message || "Could not update verification",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  // small convenience wrappers for dev / simulate usage (call the real endpoints above)
  const simulateAdminUploadProof = async (
    withdrawalId: string,
    file?: File
  ) => {
    // If you want to simulate admin uploading an image, call a dedicated admin upload route; here we call verify action for admin_approved
    return completeWithdrawalVerification(withdrawalId, "admin_approved");
  };

  /**
   * Build withdrawalTransaction list from transactionsData returned by API.
   * We normalize fields and pull adminProofUrl & screenshotUrl from common field names.
   */
  const withdrawalTransactions = useMemo(() => {
    if (!transactionsData) return [];

    // try common roots
    const rawArr =
      (transactionsData as any)?.withdrawals ??
      (transactionsData as any)?.withdrawls ??
      (transactionsData as any)?.data ??
      (transactionsData as any)?.transactions ??
      [];

    return (rawArr as any[]).map((w: any) => {
      // normalize status and urls with fallbacks
      const statusRaw = (
        w.status ??
        w.transactionStatus ??
        w.withdrawStatus ??
        ""
      ).toString();
      const adminProofUrl =
        w.adminProofUrl ??
        w.admin_proof_url ??
        w.admin_uploaded_proof ??
        w.proofUrl ??
        w.admin_proof ??
        null;
      const screenshotUrl =
        w.screenshotUrl ??
        w.clientProofUrl ??
        w.client_proof ??
        w.client_screenshot ??
        null;
      const updatedAt = w.updatedAt ?? w.processedAt ?? w.approvedAt ?? null;
      const createdAt = w.createdAt ?? w.requestedAt ?? null;

      // return normalized object used by UI (keeps original fields so your WithdrawalVerification continues to work)
      return {
        id: String(
          w.id ??
            w._id ??
            w.transactionId ??
            Math.random().toString(36).slice(2, 9)
        ),
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
        rawStatus: statusRaw,
        status: (statusRaw || "").toUpperCase(), // keep uppercase for matching backend types
        walletAddress: w.userWallet ?? w.wallet ?? "—",
        requestDate: createdAt ? formatDate(createdAt) : "—",
        processedDate: updatedAt ? formatDate(updatedAt) : null,
        updatedAtRaw: updatedAt, // used for 1-day logic
        adminProofUrl,
        screenshotUrl,
        rawData: w,
      };
    });
  }, [transactionsData]);

  /**
   * Active / history classification according to your requested flow and backend types:
   *
   * backend types (exact): PENDING, ADMIN_PROOF_UPLOADED, REVIEW, APPROVED, REJECTED
   *
   * Active (show in Verification area):
   *  - PENDING
   *  - ADMIN_PROOF_UPLOADED (admin has uploaded proof -> show admin proof + show client upload UI)
   *  - REVIEW (admin is reviewing client's uploaded proof)
   *  - APPROVED *for 24 hours* (show completed UI for 1 day)
   *
   * History:
   *  - REJECTED
   *  - APPROVED older than 24 hours
   */
  const ACTIVE_STATUSES = ["PENDING", "ADMIN_PROOF_UPLOADED", "REVIEW"];
  const isRecentlyApproved = (t: any) => {
    if (!t || t.status !== "APPROVED") return false;
    // use updatedAtRaw if available, else processedDate fallback
    const when =
      t.updatedAtRaw ?? t.rawData?.updatedAt ?? t.rawData?.approvedAt ?? null;
    if (!when) return true; // if backend didn't provide a timestamp, show it for 24h by default
    try {
      const then = new Date(when).getTime();
      const now = Date.now();
      return now - then < 24 * 60 * 60 * 1000; // less than 24 hours
    } catch {
      return true;
    }
  };

  // helpers to get lists by source
  const getWithdrawalsBySource = (
    sourceType: "return" | "referral" | "principal"
  ) => {
    if (sourceType === "return")
      return withdrawalTransactions.filter((t) => t.source === "Returns");
    if (sourceType === "referral")
      return withdrawalTransactions.filter((t) => t.source === "Referral");
    return withdrawalTransactions.filter((t) => t.source === "Principal");
  };

  /**
   * WithdrawalHistory component: shows pending (active) verifications first (if any) and historical list separately.
   * - When status === ADMIN_PROOF_UPLOADED, we ensure adminProofUrl is available in the withdrawal object so WithdrawalVerification can show it.
   * - Client upload is done by calling onUploadScreenshot; backend should set status to REVIEW and refetch will pick it up.
   */
  const WithdrawalHistory = ({
    withdrawals,
    type,
  }: {
    withdrawals: any[];
    type: string;
  }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    // active = PENDING | ADMIN_PROOF_UPLOADED | REVIEW | APPROVED (recent)
    const pendingVerifications = withdrawals.filter((w) => {
      if (!w || !w.status) return false;
      if (w.status === "APPROVED") return isRecentlyApproved(w);
      return ACTIVE_STATUSES.includes(w.status);
    });

    // historical = REJECTED OR APPROVED older than 24 hours
    const historicalWithdrawals = withdrawals.filter((w) => {
      if (!w || !w.status) return false;
      if (w.status === "REJECTED") return true;
      if (w.status === "APPROVED") return !isRecentlyApproved(w);
      return false; // everything else considered active
    });

    const totalPages = Math.ceil(historicalWithdrawals.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedWithdrawals = historicalWithdrawals.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    // count of client uploads required (ADMIN_PROOF_UPLOADED with no screenshot)
    const pendingUploadsCount = pendingVerifications.filter(
      (w) => w.status === "ADMIN_PROOF_UPLOADED" && !w.screenshotUrl
    ).length;

    return (
      <div className="space-y-4">
        {/* Pending / active verification blocks (only if present) */}
        {pendingVerifications.length > 0 &&
          pendingVerifications.map((withdrawal) => (
            <div key={withdrawal.id} className="mb-4">
              {/* If admin proof exists, show the admin proof image above the verification component so user sees it */}
              {withdrawal.status === "ADMIN_PROOF_UPLOADED" &&
                withdrawal.adminProofUrl && (
                  <Card className="mb-3">
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Admin Proof
                          </div>
                          <div className="text-foreground font-semibold">
                            {formatStatusForLabel(withdrawal.status)}
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

                      <div className="mt-3">
                        {/* adminProofUrl might be a full URL; render image if it looks like one */}
                        <img
                          src={withdrawal.adminProofUrl}
                          alt="Admin proof"
                          className="w-full max-h-60 object-contain rounded-md border border-border"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* WithdrawalVerification component is your original component — we pass normalized withdrawal data + handlers */}
              <WithdrawalVerification
                key={withdrawal.id}
                withdrawal={withdrawal}
                onUploadScreenshot={async (file: File) => {
                  const res = await uploadWithdrawalScreenshot(
                    withdrawal.id,
                    file
                  );
                  if (res.success) await refetchTransactions();
                  return res;
                }}
                onVerificationComplete={async (
                  action:
                    | "client_uploaded"
                    | "admin_approved"
                    | "approve_final"
                    | "reject"
                ) => {
                  // map to backend action names per your backend's verify endpoint contract
                  // here we pass action straight through — backend should map appropriately
                  const res = await completeWithdrawalVerification(
                    withdrawal.id,
                    action === "admin_approved"
                      ? "admin_approved"
                      : action === "client_uploaded"
                      ? "client_uploaded"
                      : action === "approve_final"
                      ? "approve_final"
                      : "reject"
                  );
                  if (res.success) await refetchTransactions();
                  return res;
                }}
                pendingUploadsCount={pendingUploadsCount}
                // expose simulate helpers if your verification UI uses them for dev/testing
                simulateAdminApproval={simulateAdminUploadProof}
                simulateClientScreenshotUpload={uploadWithdrawalScreenshot}
              />
            </div>
          ))}

        {/* Historical card */}
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
              {historicalWithdrawals.length === 0 ? (
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
                        <p className="text-muted-foreground font-mono">
                          ID: {withdrawal.id}
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
      {/* Header */}
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

      {/* Portfolio error */}
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

      {/* Tabs - unchanged UI */}
      <Tabs defaultValue="investment" className="space-y-6">
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
            />
            <WithdrawalHistory
              withdrawals={getWithdrawalsBySource("return")}
              type="Investment Returns"
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
            />
            <WithdrawalHistory
              withdrawals={getWithdrawalsBySource("referral")}
              type="Referral Earnings"
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
            />
            <WithdrawalHistory
              withdrawals={getWithdrawalsBySource("principal")}
              type="Investment Principal"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
