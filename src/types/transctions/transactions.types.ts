export interface DepositItem {
  id: number;
  userId: number;
  amount: string; // backend returns strings like "1000"
  txId: string | null;
  depositWallet?: string | null;
  proofUrl?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface WithdrawalItem {
  id: number;
  userId: number;
  amount: string;
  userWallet: string;
  txId: string | null;
  adminProofUrl?: string | null;
  userProofUrl?: string | null;
  status: string;
  withdrawFrom?: string;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface InvestmentSettlementItem {
  id: number;
  userId: number;
  investmemtId?: number | null;
  amount: string;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface GetTransactionsResponse {
  deposits: DepositItem[];
  withdrawals?: WithdrawalItem[];
  withdrawls?: WithdrawalItem[];
  investmentSettlements?: InvestmentSettlementItem[];
  [key: string]: any;
}
