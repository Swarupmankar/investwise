// Core data types for the investment system

export interface User {
  id: string;
  walletBalance: number; // Main USDT deposits
  investmentWallet: number; // Total actively invested amount
  investmentReturnBalance: number; // Profits ready to withdraw
  referralEarnings: number; // Referral commissions
  referralCode: string;
  referrerId?: string;
  questionnaireCompleted?: boolean;
  withdrawalBlocked?: boolean;
  blockedUntil?: string;
}

export interface Investment {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  roi: number;
  startDate: string;
  nextPayoutDate: string;
  duration: number; // in days
  status: "active" | "completed" | "pending" | "mature" | "closed";
  name?: string; // Custom investment name
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  source: "return" | "referral" | "principal";
  status:
    | "pending"
    | "admin_approved"
    | "client_verification_pending"
    | "admin_review"
    | "completed"
    | "rejected"
    | "verification_failed";
  walletAddress: string;
  transactionId?: string;
  requestDate: string;
  processedDate?: string;
  verificationAttempts?: number;
  isBlocked?: boolean;
  screenshotUrl?: string;
  adminProofUrl?: string;
  verificationStatus?: "pending" | "verified" | "failed";
  verificationDeadline?: string;
}

export interface TransactionLog {
  id: string;
  userId: string;
  type:
    | "deposit"
    | "investment"
    | "return"
    | "referral"
    | "withdraw"
    | "close_investment"
    | "principal_processing";
  amount: number;
  date: string;
  status: "success" | "pending" | "rejected";
  description: string;
  relatedId?: string; // Investment ID, Withdrawal ID, etc.
}

export interface PendingPrincipalWithdrawal {
  id: string;
  userId: string;
  investmentId: string;
  amount: number;
  processDate: string; // Date when it will be processed
  requestDate: string;
  status: "pending" | "processed";
}

export interface InvestmentPlan {
  id: string;
  name: string;
  roi: number;
  roiPeriod: string;
  minAmount: number;
  maxAmount: number;
  minWithdrawal: number;
  duration: string;
  description: string;
  risk: string;
  isAvailable: boolean;
}
