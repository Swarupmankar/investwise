import { useState, useEffect } from "react";
import {
  User,
  Investment,
  TransactionLog,
  Withdrawal,
  PendingPrincipalWithdrawal,
} from "@/types/investment";
import { useToast } from "@/hooks/use-toast";

// Mock data - In production, this would come from a backend API
const INITIAL_USER: User = {
  id: "user_1",
  walletBalance: 12450.75, // USDT Available for investment
  investmentWallet: 25000, // Total actively invested
  investmentReturnBalance: 3260, // Returns ready to withdraw
  referralEarnings: 1842.3, // Referral commissions
  referralCode: "REF123456",
  questionnaireCompleted: false, // Track questionnaire completion
  withdrawalBlocked: false, // Track withdrawal blocking status
};

const INITIAL_INVESTMENTS: Investment[] = [
  {
    id: "inv_1",
    userId: "user_1",
    planId: "plan_monthly",
    planName: "Monthly Growth",
    amount: 5000,
    roi: 5.0,
    startDate: "2024-01-15",
    nextPayoutDate: "2024-03-01",
    duration: 365,
    status: "active",
    name: "My First Investment",
  },
  {
    id: "inv_2",
    userId: "user_1",
    planId: "plan_monthly",
    planName: "Monthly Growth",
    amount: 10000,
    roi: 5.0,
    startDate: "2024-02-01",
    nextPayoutDate: "2024-03-01",
    duration: 180,
    status: "active",
    name: "Growth Portfolio",
  },
  {
    id: "inv_3",
    userId: "user_1",
    planId: "plan_premium",
    planName: "Premium Portfolio",
    amount: 15000,
    roi: 7.5,
    startDate: "2024-01-20",
    nextPayoutDate: "2024-03-01",
    duration: 270,
    status: "mature",
    name: "Premium Diversified",
  },
  {
    id: "inv_4",
    userId: "user_1",
    planId: "plan_basic",
    planName: "Basic Savings",
    amount: 3000,
    roi: 3.5,
    startDate: "2024-02-10",
    nextPayoutDate: "2024-03-01",
    duration: 90,
    status: "completed",
    name: "Emergency Fund",
  },
  {
    id: "inv_5",
    userId: "user_1",
    planId: "plan_aggressive",
    planName: "Aggressive Growth",
    amount: 20000,
    roi: 9.0,
    startDate: "2024-01-05",
    nextPayoutDate: "2024-03-01",
    duration: 540,
    status: "active",
    name: "High Yield Investment",
  },
  {
    id: "inv_6",
    userId: "user_1",
    planId: "plan_balanced",
    planName: "Balanced Portfolio",
    amount: 8000,
    roi: 6.0,
    startDate: "2024-02-15",
    nextPayoutDate: "2024-03-01",
    duration: 365,
    status: "active",
    name: "Balanced Mix",
  },
  {
    id: "inv_7",
    userId: "user_1",
    planId: "plan_conservative",
    planName: "Conservative Growth",
    amount: 12000,
    roi: 4.5,
    startDate: "2024-01-25",
    nextPayoutDate: "2024-03-01",
    duration: 180,
    status: "closed",
    name: "Safe Haven",
  },
  {
    id: "inv_8",
    userId: "user_1",
    planId: "plan_tech",
    planName: "Tech Innovation",
    amount: 18000,
    roi: 8.5,
    startDate: "2024-02-05",
    nextPayoutDate: "2024-03-01",
    duration: 450,
    status: "active",
    name: "Future Tech Fund",
  },
  {
    id: "inv_9",
    userId: "user_1",
    planId: "plan_green",
    planName: "Green Energy",
    amount: 7500,
    roi: 6.5,
    startDate: "2024-01-30",
    nextPayoutDate: "2024-03-01",
    duration: 365,
    status: "mature",
    name: "Sustainable Energy",
  },
  {
    id: "inv_10",
    userId: "user_1",
    planId: "plan_health",
    planName: "Healthcare Sector",
    amount: 9500,
    roi: 7.0,
    startDate: "2024-02-12",
    nextPayoutDate: "2024-03-01",
    duration: 270,
    status: "active",
    name: "Medical Innovation",
  },
  {
    id: "inv_11",
    userId: "user_1",
    planId: "plan_real_estate",
    planName: "Real Estate Fund",
    amount: 25000,
    roi: 5.5,
    startDate: "2024-01-08",
    nextPayoutDate: "2024-03-01",
    duration: 720,
    status: "active",
    name: "Property Investment",
  },
  {
    id: "inv_12",
    userId: "user_1",
    planId: "plan_crypto",
    planName: "Cryptocurrency",
    amount: 6000,
    roi: 12.0,
    startDate: "2024-02-08",
    nextPayoutDate: "2024-03-01",
    duration: 180,
    status: "pending",
    name: "Digital Assets",
  },
  {
    id: "inv_13",
    userId: "user_1",
    planId: "plan_international",
    planName: "Global Markets",
    amount: 14000,
    roi: 6.8,
    startDate: "2024-01-12",
    nextPayoutDate: "2024-03-01",
    duration: 365,
    status: "active",
    name: "Worldwide Diversification",
  },
  {
    id: "inv_14",
    userId: "user_1",
    planId: "plan_emerging",
    planName: "Emerging Markets",
    amount: 11000,
    roi: 8.0,
    startDate: "2024-02-18",
    nextPayoutDate: "2024-03-01",
    duration: 450,
    status: "mature",
    name: "Growth Opportunities",
  },
  {
    id: "inv_15",
    userId: "user_1",
    planId: "plan_dividend",
    planName: "Dividend Focus",
    amount: 16000,
    roi: 4.8,
    startDate: "2024-01-22",
    nextPayoutDate: "2024-03-01",
    duration: 365,
    status: "completed",
    name: "Income Generation",
  },
  {
    id: "inv_16",
    userId: "user_1",
    planId: "plan_startup",
    planName: "Startup Ventures",
    amount: 22000,
    roi: 10.5,
    startDate: "2024-02-20",
    nextPayoutDate: "2024-03-01",
    duration: 540,
    status: "active",
    name: "Innovation Fund",
  },
  {
    id: "inv_17",
    userId: "user_1",
    planId: "plan_ai",
    planName: "AI & Robotics",
    amount: 13500,
    roi: 9.2,
    startDate: "2024-01-28",
    nextPayoutDate: "2024-03-01",
    duration: 450,
    status: "closed",
    name: "Artificial Intelligence",
  },
  {
    id: "inv_18",
    userId: "user_1",
    planId: "plan_space",
    planName: "Space Technology",
    amount: 19000,
    roi: 11.0,
    startDate: "2024-02-25",
    nextPayoutDate: "2024-03-01",
    duration: 600,
    status: "active",
    name: "Space Exploration",
  },
];

const INITIAL_TRANSACTIONS: TransactionLog[] = [
  {
    id: "txn_1",
    userId: "user_1",
    type: "deposit",
    amount: 15000,
    date: "2024-01-10",
    status: "success",
    description: "USDT Deposit",
  },
  {
    id: "txn_2",
    userId: "user_1",
    type: "investment",
    amount: 5000,
    date: "2024-01-15",
    status: "success",
    description: "Investment Created - Monthly Growth",
    relatedId: "inv_1",
  },
  {
    id: "txn_3",
    userId: "user_1",
    type: "return",
    amount: 250,
    date: "2024-02-15",
    status: "success",
    description: "5% Monthly Return - My First Investment",
  },
];

const INITIAL_WITHDRAWALS: Withdrawal[] = [
  {
    id: "withdraw_1",
    userId: "user_1",
    amount: 500,
    source: "return",
    status: "admin_approved",
    walletAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    requestDate: "2024-08-05T10:30:00Z",
    adminProofUrl: "/placeholder.svg",
    verificationAttempts: 0,
  },
  {
    id: "withdraw_2",
    userId: "user_1",
    amount: 750,
    source: "referral",
    status: "admin_review",
    walletAddress: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
    requestDate: "2024-08-03T14:20:00Z",
    screenshotUrl: "/placeholder.svg",
    adminProofUrl: "/placeholder.svg",
    verificationAttempts: 1,
    verificationStatus: "pending",
  },
  {
    id: "withdraw_3",
    userId: "user_1",
    amount: 1000,
    source: "return",
    status: "completed",
    walletAddress: "TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireA9",
    requestDate: "2024-07-28T09:15:00Z",
    processedDate: "2024-07-30T16:45:00Z",
    transactionId: "txn_approved_001",
    verificationStatus: "verified",
  },
  {
    id: "withdraw_4",
    userId: "user_1",
    amount: 300,
    source: "principal",
    status: "pending",
    walletAddress: "TLyqzVGLV1srkB7dToTAEqgDQpNETY11d5",
    requestDate: "2024-08-07T11:00:00Z",
    verificationAttempts: 0,
  },
  {
    id: "withdraw_5",
    userId: "user_1",
    amount: 200,
    source: "referral",
    status: "client_verification_pending",
    walletAddress: "TKzxdSv2FZKQrEqkKVgp5DcwEXBEKwvaKR",
    requestDate: "2024-08-06T16:45:00Z",
    adminProofUrl: "/placeholder.svg",
    verificationAttempts: 0,
  },
  {
    id: "withdraw_6",
    userId: "user_1",
    amount: 850,
    source: "return",
    status: "admin_approved",
    walletAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    requestDate: "2024-08-08T09:30:00Z",
    adminProofUrl: "/placeholder.svg",
    verificationAttempts: 0,
  },
  {
    id: "withdraw_7",
    userId: "user_1",
    amount: 450,
    source: "referral",
    status: "completed",
    walletAddress: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
    requestDate: "2024-07-25T11:20:00Z",
    processedDate: "2024-07-27T14:10:00Z",
    transactionId: "txn_approved_002",
    verificationStatus: "verified",
  },
  {
    id: "withdraw_8",
    userId: "user_1",
    amount: 1200,
    source: "return",
    status: "rejected",
    walletAddress: "TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireA9",
    requestDate: "2024-07-20T15:45:00Z",
    processedDate: "2024-07-22T10:30:00Z",
    verificationStatus: "failed",
  },
  {
    id: "withdraw_9",
    userId: "user_1",
    amount: 320,
    source: "principal",
    status: "completed",
    walletAddress: "TLyqzVGLV1srkB7dToTAEqgDQpNETY11d5",
    requestDate: "2024-07-18T08:15:00Z",
    processedDate: "2024-07-20T12:45:00Z",
    transactionId: "txn_approved_003",
    verificationStatus: "verified",
  },
  {
    id: "withdraw_10",
    userId: "user_1",
    amount: 680,
    source: "referral",
    status: "completed",
    walletAddress: "TKzxdSv2FZKQrEqkKVgp5DcwEXBEKwvaKR",
    requestDate: "2024-07-15T13:30:00Z",
    processedDate: "2024-07-17T09:20:00Z",
    transactionId: "txn_approved_004",
    verificationStatus: "verified",
  },
];

export function useInvestmentStore() {
  // Initialize user with questionnaire status from localStorage
  const [user, setUser] = useState<User>(() => {
    const questionnaireCompleted =
      localStorage.getItem("questionnaireCompleted") === "true";
    const withdrawalBlocked =
      localStorage.getItem("withdrawalBlocked") === "true";
    return {
      ...INITIAL_USER,
      questionnaireCompleted,
      withdrawalBlocked,
    };
  });
  const [investments, setInvestments] =
    useState<Investment[]>(INITIAL_INVESTMENTS);
  const [transactions, setTransactions] =
    useState<TransactionLog[]>(INITIAL_TRANSACTIONS);
  const [withdrawals, setWithdrawals] =
    useState<Withdrawal[]>(INITIAL_WITHDRAWALS);
  const [pendingPrincipalWithdrawals, setPendingPrincipalWithdrawals] =
    useState<PendingPrincipalWithdrawal[]>([]);
  const { toast } = useToast();

  // Calculate the first of next month
  const getFirstOfNextMonth = () => {
    const now = new Date();
    const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return firstOfNextMonth.toISOString().split("T")[0];
  };

  // Calculate pro-rated return for mid-month investments
  const calculateProRatedReturn = (
    investment: Investment,
    targetMonth: Date
  ) => {
    const startDate = new Date(investment.startDate);
    const monthStart = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0
    );
    const daysInMonth = monthEnd.getDate();

    // If investment started this month, calculate pro-rated return
    if (
      startDate.getMonth() === targetMonth.getMonth() &&
      startDate.getFullYear() === targetMonth.getFullYear()
    ) {
      const daysRemaining = daysInMonth - startDate.getDate() + 1;
      const monthlyReturn = (investment.amount * investment.roi) / 100;
      return (monthlyReturn * daysRemaining) / daysInMonth;
    }

    // For full months, return full monthly ROI
    return (investment.amount * investment.roi) / 100;
  };

  // Check if today is the 2nd of the month (withdrawal window)
  const canCloseInvestment = (): boolean => {
    const today = new Date();
    return today.getDate() === 2;
  };

  // Get next closure date (2nd of current or next month)
  const getNextClosureDate = (): Date => {
    const today = new Date();
    const currentMonth2nd = new Date(today.getFullYear(), today.getMonth(), 2);

    if (today.getDate() <= 2) {
      return currentMonth2nd;
    } else {
      return new Date(today.getFullYear(), today.getMonth() + 1, 2);
    }
  };

  // Create a new investment
  const createInvestment = (
    planId: string,
    planName: string,
    amount: number,
    roi: number,
    name?: string
  ) => {
    if (amount > user.walletBalance) {
      toast({
        title: "Insufficient Funds",
        description: "You don't have enough balance for this investment.",
        variant: "destructive",
      });
      return false;
    }

    const newInvestment: Investment = {
      id: `inv_${Date.now()}`,
      userId: user.id,
      planId,
      planName,
      amount,
      roi,
      startDate: new Date().toISOString().split("T")[0],
      nextPayoutDate: getFirstOfNextMonth(), // Set to 1st of next month
      duration: 365,
      status: "active",
      name,
    };

    // Update balances: walletBalance -> investmentWallet
    setUser((prev) => ({
      ...prev,
      walletBalance: prev.walletBalance - amount,
      investmentWallet: prev.investmentWallet + amount,
    }));

    setInvestments((prev) => [...prev, newInvestment]);

    // Log the transaction
    const transaction: TransactionLog = {
      id: `txn_${Date.now()}`,
      userId: user.id,
      type: "investment",
      amount,
      date: new Date().toISOString().split("T")[0],
      status: "success",
      description: `Investment Created - ${planName}`,
      relatedId: newInvestment.id,
    };

    setTransactions((prev) => [...prev, transaction]);

    toast({
      title: "Investment Created",
      description: `Successfully invested $${amount.toLocaleString()} in ${planName}`,
    });

    return true;
  };

  // Process monthly returns (only on 1st of month) - all investments mature on 1st
  const processMonthlyReturns = () => {
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    const isFirstOfMonth = today.getDate() === 1;

    // Only process on the 1st of the month
    if (!isFirstOfMonth) return;

    investments.forEach((investment) => {
      if (investment.status === "active") {
        const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const returnAmount = calculateProRatedReturn(investment, currentMonth);

        if (returnAmount > 0) {
          // Update user balance
          setUser((prev) => ({
            ...prev,
            investmentReturnBalance:
              prev.investmentReturnBalance + returnAmount,
          }));

          // All investments mature on the 1st of every month
          // Set next payout to 1st of next month
          const firstOfNextMonth = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            1
          );
          setInvestments((prev) =>
            prev.map((inv) =>
              inv.id === investment.id
                ? {
                    ...inv,
                    nextPayoutDate: firstOfNextMonth
                      .toISOString()
                      .split("T")[0],
                    status: "mature" as const, // All investments become mature on 1st of month
                  }
                : inv
            )
          );

          // Log the return
          const transaction: TransactionLog = {
            id: `txn_${Date.now()}_${investment.id}`,
            userId: user.id,
            type: "return",
            amount: returnAmount,
            date: todayString,
            status: "success",
            description: `Monthly Return (${investment.roi}%) - ${
              investment.name || investment.planName
            } (${today.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })})`,
            relatedId: investment.id,
          };

          setTransactions((prev) => [...prev, transaction]);
        }
      }
    });

    // Process pending principal withdrawals
    processPendingPrincipalWithdrawals();
  };

  // Process pending principal withdrawals (15-day delay)
  const processPendingPrincipalWithdrawals = () => {
    const today = new Date().toISOString().split("T")[0];

    pendingPrincipalWithdrawals
      .filter(
        (pending) =>
          pending.status === "pending" && pending.processDate <= today
      )
      .forEach((pending) => {
        // Move money to withdrawable balance
        setUser((prev) => ({
          ...prev,
          walletBalance: prev.walletBalance + pending.amount,
        }));

        // Mark as processed
        setPendingPrincipalWithdrawals((prev) =>
          prev.map((p) =>
            p.id === pending.id ? { ...p, status: "processed" as const } : p
          )
        );

        // Log the completion
        const transaction: TransactionLog = {
          id: `txn_${Date.now()}_processed`,
          userId: user.id,
          type: "principal_processing",
          amount: pending.amount,
          date: today,
          status: "success",
          description: `Principal Processing Complete - Investment Principal Available for Withdrawal`,
          relatedId: pending.investmentId,
        };

        setTransactions((prev) => [...prev, transaction]);

        toast({
          title: "Principal Processing Complete",
          description: `$${pending.amount.toLocaleString()} principal has been processed and is now available for withdrawal`,
        });
      });
  };

  // Close mature investment (only on 2nd of month) and start 15-day principal processing
  const closeMatureInvestment = (investmentId: string) => {
    const investment = investments.find((inv) => inv.id === investmentId);
    if (!investment || investment.status !== "mature") {
      toast({
        title: "Cannot Close Investment",
        description: "Investment must be mature to close",
        variant: "destructive",
      });
      return false;
    }

    // Check if it's the 2nd of the month (withdrawal window)
    if (!canCloseInvestment()) {
      toast({
        title: "Withdrawal Window Closed",
        description: "Investments can only be closed on the 2nd of each month",
        variant: "destructive",
      });
      return false;
    }

    // Update investment status to closed
    setInvestments((prev) =>
      prev.map((inv) =>
        inv.id === investmentId ? { ...inv, status: "closed" as const } : inv
      )
    );

    // Remove from investment wallet immediately (no longer earning returns)
    setUser((prev) => ({
      ...prev,
      investmentWallet: prev.investmentWallet - investment.amount,
    }));

    // Create pending principal withdrawal (15-day processing)
    const processDate = new Date();
    processDate.setDate(processDate.getDate() + 15);

    const pendingWithdrawal: PendingPrincipalWithdrawal = {
      id: `pending_${Date.now()}`,
      userId: user.id,
      investmentId: investment.id,
      amount: investment.amount,
      processDate: processDate.toISOString().split("T")[0],
      requestDate: new Date().toISOString().split("T")[0],
      status: "pending",
    };

    setPendingPrincipalWithdrawals((prev) => [...prev, pendingWithdrawal]);

    // Log the investment closure
    const transaction: TransactionLog = {
      id: `txn_${Date.now()}`,
      userId: user.id,
      type: "close_investment",
      amount: investment.amount,
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      description: `Investment Closed - Principal processing (15 days) - ${
        investment.name || investment.planName
      }`,
      relatedId: investment.id,
    };

    setTransactions((prev) => [...prev, transaction]);

    toast({
      title: "Investment Closed",
      description: `$${investment.amount.toLocaleString()} principal will be available for withdrawal in 15 days`,
    });

    return true;
  };

  // Complete questionnaire
  const completeQuestionnaire = () => {
    setUser((prev) => ({ ...prev, questionnaireCompleted: true }));
    localStorage.setItem("questionnaireCompleted", "true");
  };

  // Upload withdrawal screenshot
  const uploadWithdrawalScreenshot = (withdrawalId: string, file: File) => {
    const withdrawal = withdrawals.find((w) => w.id === withdrawalId);
    if (!withdrawal) return;

    // Simulate file upload and processing
    const mockUrl = URL.createObjectURL(file);

    setWithdrawals((prev) =>
      prev.map((w) =>
        w.id === withdrawalId
          ? {
              ...w,
              screenshotUrl: mockUrl,
              status: "admin_review" as const,
              verificationDeadline: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
              )
                .toISOString()
                .split("T")[0],
            }
          : w
      )
    );

    toast({
      title: "Screenshot Uploaded",
      description: "Your proof has been uploaded and is being reviewed",
    });
  };

  // Complete withdrawal verification
  const completeWithdrawalVerification = (withdrawalId: string) => {
    const withdrawal = withdrawals.find((w) => w.id === withdrawalId);
    if (!withdrawal) return;

    // Simulate verification process (mock approval/rejection)
    const isApproved = Math.random() > 0.3; // 70% approval rate for demo

    if (isApproved) {
      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === withdrawalId
            ? {
                ...w,
                status: "completed" as const,
                processedDate: new Date().toISOString().split("T")[0],
              }
            : w
        )
      );

      toast({
        title: "Verification Approved",
        description: "Your withdrawal has been verified and processed",
      });
    } else {
      // Failed verification - increment attempts
      const newAttempts = (withdrawal.verificationAttempts || 0) + 1;
      const isBlocked = newAttempts >= 3;

      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === withdrawalId
            ? {
                ...w,
                status: "verification_failed" as const,
                verificationAttempts: newAttempts,
                isBlocked,
                screenshotUrl: undefined, // Clear screenshot for retry
              }
            : w
        )
      );

      if (isBlocked) {
        setUser((prev) => ({ ...prev, withdrawalBlocked: true }));
        localStorage.setItem("withdrawalBlocked", "true");

        toast({
          title: "Withdrawal Blocked",
          description:
            "Maximum verification attempts exceeded. Contact support for assistance.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: `Verification failed. ${
            3 - newAttempts
          } attempts remaining.`,
          variant: "destructive",
        });
      }
    }
  };

  // Create withdrawal request
  const createWithdrawal = (
    amount: number,
    source: "return" | "referral" | "principal",
    walletAddress: string,
    twoFactorCode?: string
  ) => {
    // Validate 2FA code is provided and is 6 digits
    if (
      !twoFactorCode ||
      twoFactorCode.length !== 6 ||
      !/^\d{6}$/.test(twoFactorCode)
    ) {
      toast({
        title: "2FA Required",
        description: "Please enter a valid 6-digit 2FA code",
        variant: "destructive",
      });
      return { success: false, error: "Valid 6-digit 2FA code is required" };
    }

    // Simulate 2FA validation (in production, this would validate against actual 2FA service)
    if (twoFactorCode !== "123456") {
      // Mock validation - accept 123456 for demo
      toast({
        title: "Invalid 2FA Code",
        description: "The 2FA code you entered is incorrect",
        variant: "destructive",
      });
      return { success: false, error: "Invalid 2FA code" };
    }

    // Check if user has 3+ pending screenshot uploads
    const pendingUploads = withdrawals.filter(
      (w) => w.status === "admin_approved" && !w.screenshotUrl
    ).length;

    if (pendingUploads >= 3) {
      return {
        success: false,
        error:
          "You have 3 or more withdrawals pending screenshot upload. Please upload screenshots for previous withdrawals before creating new ones.",
      };
    }

    const availableBalance =
      source === "return"
        ? user.investmentReturnBalance
        : source === "referral"
        ? user.referralEarnings
        : user.walletBalance;

    if (amount > availableBalance || amount < 10) {
      toast({
        title: "Invalid Amount",
        description:
          amount > availableBalance
            ? "Insufficient balance"
            : "Minimum withdrawal is $10",
        variant: "destructive",
      });
      return {
        success: false,
        error:
          amount > availableBalance
            ? "Insufficient balance"
            : "Minimum withdrawal is $10",
      };
    }

    const withdrawal: Withdrawal = {
      id: `wd_${Date.now()}`,
      userId: user.id,
      amount,
      source,
      status: "pending",
      walletAddress,
      requestDate: new Date().toISOString().split("T")[0],
      verificationAttempts: 0,
      isBlocked: false,
    };

    // Deduct from balance immediately (pending approval)
    setUser((prev) => ({
      ...prev,
      ...(source === "return" && {
        investmentReturnBalance: prev.investmentReturnBalance - amount,
      }),
      ...(source === "referral" && {
        referralEarnings: prev.referralEarnings - amount,
      }),
      ...(source === "principal" && {
        walletBalance: prev.walletBalance - amount,
      }),
    }));

    setWithdrawals((prev) => [...prev, withdrawal]);

    // Log the withdrawal request
    const transaction: TransactionLog = {
      id: `txn_${Date.now()}`,
      userId: user.id,
      type: "withdraw",
      amount,
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      description: `Withdrawal Request - ${
        source === "return"
          ? "Investment Returns"
          : source === "referral"
          ? "Referral Earnings"
          : "Investment Principal"
      }`,
      relatedId: withdrawal.id,
    };

    setTransactions((prev) => [...prev, transaction]);

    toast({
      title: "Withdrawal Requested",
      description: `$${amount.toLocaleString()} withdrawal request submitted for review`,
    });

    return { success: true };
  };

  // Add referral bonus
  const addReferralBonus = (amount: number, description: string) => {
    setUser((prev) => ({
      ...prev,
      referralEarnings: prev.referralEarnings + amount,
    }));

    const transaction: TransactionLog = {
      id: `txn_${Date.now()}`,
      userId: user.id,
      type: "referral",
      amount,
      date: new Date().toISOString().split("T")[0],
      status: "success",
      description,
    };

    setTransactions((prev) => [...prev, transaction]);
  };

  // Simulate auto-processing returns on component mount
  useEffect(() => {
    processMonthlyReturns();
  }, []);

  // Update investment name
  const updateInvestmentName = (investmentId: string, newName: string) => {
    setInvestments((prev) =>
      prev.map((inv) =>
        inv.id === investmentId ? { ...inv, name: newName } : inv
      )
    );

    toast({
      title: "Investment Renamed",
      description: `Investment name updated to "${newName}"`,
    });
  };

  // Add admin simulation methods for demo purposes
  const simulateAdminApproval = (withdrawalId: string) => {
    setWithdrawals((prev) =>
      prev.map((w) =>
        w.id === withdrawalId && w.status === "pending"
          ? {
              ...w,
              status: "admin_approved",
              adminProofUrl: "/placeholder.svg", // Mock admin proof
            }
          : w
      )
    );

    toast({
      title: "Admin Action Simulated",
      description: "Withdrawal approved and admin proof uploaded",
    });
  };

  const simulateClientScreenshotUpload = (withdrawalId: string) => {
    setWithdrawals((prev) =>
      prev.map((w) =>
        w.id === withdrawalId &&
        (w.status === "admin_approved" ||
          w.status === "client_verification_pending")
          ? {
              ...w,
              status: "client_verification_pending",
              screenshotUrl: "/placeholder.svg", // Mock client screenshot
            }
          : w
      )
    );

    toast({
      title: "Client Screenshot Simulated",
      description: "Client proof uploaded - ready for admin review",
    });
  };

  return {
    user,
    investments,
    transactions,
    withdrawals,
    pendingPrincipalWithdrawals,
    createInvestment,
    createWithdrawal,
    closeMatureInvestment,
    updateInvestmentName,
    addReferralBonus,
    processMonthlyReturns,
    canCloseInvestment,
    getNextClosureDate,
    completeQuestionnaire,
    uploadWithdrawalScreenshot,
    completeWithdrawalVerification,
    simulateAdminApproval,
    simulateClientScreenshotUpload,
  };
}
