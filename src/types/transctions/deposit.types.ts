export interface CreateDepositRequest {
  amount: number;
  txId: string;
  file: File;
}

export interface DepositResponse {
  id: number;
  userId?: number;
  amount: string | number;
  txId: string;
  proofUrl?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
}
