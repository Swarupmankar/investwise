export interface DepositItem {
  id: number;
  userId: number;
  amount: string; // backend returns strings like "1000"
  txId: string;
  proofUrl?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface WithdrawalItem {
  id: number;
  userId: number;
  amount: string;
  adminProofUrl?: string | null;
  userProofUrl?: string | null;
  status: string;
  withdrawFrom?: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface GetTransactionsResponse {
  deposits: DepositItem[];
  withdrawls?: WithdrawalItem[];
}
