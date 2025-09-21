export interface Referral {
  id: number;
  code: string;
  balance: string;
}

export interface ReferralStats {
  totalReferredUsers: number;
  totalOverallEarnings: string;
  totalActiveInvestments: number;
}

export interface ReferralStatsResponse {
  referral: Referral;
  stats: ReferralStats;
}

export interface ReferralCommissionItem {
  id: number;
  userName: string;
  userEmail: string;
  investmentId: number;
  investmentAmount: string;
  dateInvestmentCreated: string;
  status: string;
  transactionType: string;
  createdAt: string;
}

export interface ReferralCommissionHistoryResponse {
  items: ReferralCommissionItem[];
}
