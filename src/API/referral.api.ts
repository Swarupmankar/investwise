// src/api/referral.api.ts
import {
  ReferralCommissionHistoryResponse,
  ReferralStatsResponse,
} from "@/types/referral/referral.types";
import { baseApi } from "./baseApi";
import { ENDPOINTS } from "@/constants/apiEndpoints";

export const referralApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    //-- GET REFERRAL STATS --//
    getReferralStats: build.query<ReferralStatsResponse, void>({
      query: () => ({
        url: ENDPOINTS.REFERRAL.STATS,
        method: "GET",
      }),
      providesTags: (_res) => [{ type: "Referral" as const, id: "STATS" }],
      transformResponse: (res: unknown) => {
        const payload = (res ?? {}) as Record<string, unknown>;

        const referralRaw = (payload.referral ?? {}) as Record<string, unknown>;
        const statsRaw = (payload.stats ?? {}) as Record<string, unknown>;

        const referral = {
          id: Number(referralRaw.id ?? 0),
          code: String(referralRaw.code ?? ""),
          balance:
            referralRaw.balance !== undefined && referralRaw.balance !== null
              ? String(referralRaw.balance)
              : "0",
        };

        const stats = {
          totalReferredUsers: Number(statsRaw.totalReferredUsers ?? 0),
          totalOverallEarnings:
            statsRaw.totalOverallEarnings !== undefined &&
            statsRaw.totalOverallEarnings !== null
              ? String(statsRaw.totalOverallEarnings)
              : "0",
          totalActiveInvestments: Number(statsRaw.totalActiveInvestments ?? 0),
        };

        return { referral, stats } as ReferralStatsResponse;
      },
    }),

    //-- GET COMMISSION HISTORY --//
    getReferralCommissionHistory: build.query<
      ReferralCommissionHistoryResponse,
      void
    >({
      query: () => ({
        url: ENDPOINTS.REFERRAL.COMMISSION_HISTORY,
        method: "GET",
      }),
      providesTags: [{ type: "Referral" as const, id: "HISTORY" }],
      transformResponse: (res: unknown) => {
        const payload = (res ?? {}) as any;
        const rawItems = Array.isArray(payload.items) ? payload.items : [];

        const items = rawItems.map((it: any) => {
          const backendAmount =
            it.amount !== undefined && it.amount !== null
              ? String(it.amount)
              : "0";

          return {
            id: Number(it.id ?? 0),
            userName: it.userName ? String(it.userName) : "",
            userEmail: it.userEmail ? String(it.userEmail) : "",
            investmentId: Number(it.investmentId ?? 0),

            // keep amounts as strings
            investmentAmount:
              it.investmentAmount !== undefined && it.investmentAmount !== null
                ? String(it.investmentAmount)
                : "0",

            // ✅ commission from backend, exposed under all likely keys
            amount: backendAmount,
            commissionEarned: backendAmount,
            commission: backendAmount,

            // dates as strings
            dateInvestmentCreated: it.dateInvestmentCreated
              ? String(it.dateInvestmentCreated)
              : "",
            createdAt: it.createdAt ? String(it.createdAt) : "",
            status: it.status ? String(it.status) : "",
            transactionType: it.transactionType
              ? String(it.transactionType)
              : "",
          };
        });

        return { items } as ReferralCommissionHistoryResponse;
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetReferralStatsQuery,
  useGetReferralCommissionHistoryQuery,
} = referralApi;
