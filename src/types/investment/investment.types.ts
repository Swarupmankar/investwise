export interface InvestmentPortfolioRawResponse {
  walletBalance: string;
  investmentWallet: string;
  investmentReturns: string;
  referralEarnings: string;
}

export interface InvestmentPortfolio {
  walletBalance: number;
  investmentWallet: number;
  investmentReturns: number;
  referralEarnings: number;
}

export interface InvestmentRaw {
  id: number;
  name: string;
  amount: string;
  forWhome?: string;
  duration: string;
  investmentStatus: string;
  returns: string;
  thisMonthsReturns: string;
  lastReturnsRecieved?: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentNormalized {
  id: number;
  name: string;
  amount: number;
  forWhome?: string;
  durationLabel: string;
  durationMonths: number;
  durationDays: number;
  duration: number;
  status: string;
  returns: number;
  thisMonthsReturns?: number;
  lastReturnsRecieved?: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
  startDate: string;
  roi: number;
}

export type CreateInvestmentRequest = {
  amount: number;
  name: string;
  forWhome: string;
  duration: string;
  referralCode?: string;
};
