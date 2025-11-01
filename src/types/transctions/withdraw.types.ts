export interface WithdrawRequest {
  otp: string;
  amount: number;
  withdrawFrom: "FUNDS_AVAILABLE" | "INVESTMENT_RETURNS" | "REFERRAL_EARNING";
  userWallet: string;
}

export interface WithdrawOTPResponse {
  message: string;
  success: boolean;
}

export interface WithdrawTransactionResponse {
  id: number;
  transactionId: number;
  amount: string;
  status: string;
  withdrawFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadWithdrawProofRequest {
  transactionId: number;
  screenshot: File;
}

export interface UploadWithdrawProofResponse {
  message: string;
  success: boolean;
}

export interface WithdrawTransaction {
  id: number;
  transactionId: string;
  amount: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  withdrawFrom: "FUNDS_AVAILABLE" | "INVESTMENT_RETURNS" | "REFERRAL_EARNING";
  screenshotUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawBalanceInfo {
  fundsAvailable: string;
  investmentReturns: string;
  referralEarnings: string;
  totalBalance: string;
}
