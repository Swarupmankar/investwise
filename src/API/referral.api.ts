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
          balance: Number(referralRaw.balance ?? 0),
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

        return { referral, stats } as unknown as ReferralStatsResponse;
      },
    }),

    //-- GET COMMISSION HISTORY --//
    getReferralCommissionHistory: build.query<
      ReferralCommissionHistoryResponse,
      void
    >({
      query: () => ({
        url: ENDPOINTS.REFERRAL.COMMISSION_HISTORY, // e.g. "/users/referral/commssion-history"
        method: "GET",
      }),
      providesTags: [{ type: "Referral" as const, id: "HISTORY" }],
      transformResponse: (res: unknown) => {
        const payload = (res ?? {}) as any;
        const items = Array.isArray(payload.items) ? payload.items : [];
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
