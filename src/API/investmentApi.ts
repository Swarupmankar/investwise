// // api.ts
// import { baseApi } from "./baseApi";
// import { ENDPOINTS } from "@/constants/apiEndpoints";
// import {
//   CreateInvestmentRequest,
//   InvestmentNormalized,
//   InvestmentPortfolio,
//   InvestmentPortfolioRawResponse,
//   InvestmentRaw,
//   ReferralInvestmentType,
// } from "@/types/investment/investment.types";
// import { parseDuration } from "./helpers";

// /** normalize to ISO string so RTK cache stays serializable */
// const toIso = (v: unknown): string => {
//   const d = new Date(typeof v === "number" ? v : (v as any));
//   return Number.isNaN(d.getTime()) ? "" : d.toISOString();
// };

// export const investmentApi = baseApi.injectEndpoints({
//   endpoints: (build) => ({
//     getInvestmentPortfolio: build.query<InvestmentPortfolio, void>({
//       query: () => ({ url: ENDPOINTS.INVESTMENT.PORTFOLIO, method: "GET" }),
//       providesTags: (_res) => [
//         { type: "Investment" as const, id: "PORTFOLIO" },
//       ],
//       transformResponse: (res: unknown) => {
//         const payload = (res ?? {}) as InvestmentPortfolioRawResponse;

//         const safeNumber = (v: unknown) => {
//           if (v === undefined || v === null || v === "") return 0;
//           if (typeof v === "number") return v;
//           const parsed = Number(String(v).replace(/,/g, ""));
//           return Number.isFinite(parsed) ? parsed : 0;
//         };

//         const parsed: InvestmentPortfolio = {
//           walletBalance: safeNumber(payload.walletBalance),
//           investmentWallet: safeNumber(payload.investmentWallet),
//           investmentReturns: safeNumber(payload.investmentReturns),
//           referralEarnings: safeNumber(payload.referralEarnings),
//         };
//         return parsed;
//       },
//     }),

//     // all-investments
//     getAllInvestments: build.query<InvestmentNormalized[], void>({
//       query: () => ({
//         url: ENDPOINTS.INVESTMENT.ALL_INVESTMENTS,
//         method: "GET",
//       }),
//       providesTags: (_res) => [{ type: "Investment" as const, id: "ALL" }],
//       transformResponse: (res: unknown) => {
//         const items = Array.isArray(res) ? (res as InvestmentRaw[]) : [];

//         const parsed: InvestmentNormalized[] = items.map((it) => {
//           const amount = Number(String(it.amount ?? "0").replace(/,/g, ""));
//           const returns = Number(String(it.returns ?? "0").replace(/,/g, ""));

//           const createdAtIso = it.createdAt
//             ? toIso(it.createdAt)
//             : toIso(Date.now());
//           const updatedAtIso = it.updatedAt
//             ? toIso(it.updatedAt)
//             : createdAtIso;

//           const { months, days } = parseDuration(it.duration);

//           const referralCode =
//             (it as any)?.referralCode ??
//             (it as any)?.referredBy?.Referral?.code ??
//             null;

//           return {
//             id: Number(it.id),
//             name: it.name ?? `Investment #${it.id}`,
//             amount: Number.isFinite(amount) ? amount : 0,
//             forWhome: it.forWhome,
//             durationLabel: it.duration ?? "",
//             durationMonths: months,
//             durationDays: days,
//             duration: days,
//             status: String(it.investmentStatus ?? "").toLowerCase(),
//             returns: Number.isFinite(returns) ? returns : 0,
//             lastReturnsRecieved: it.lastReturnsRecieved ?? null,
//             userId: Number(it.userId ?? 0),

//             // keep strings in cache
//             createdAt: createdAtIso,
//             updatedAt: updatedAtIso,
//             startDate: createdAtIso,

//             roi: 0,

//             // NEW: pass-through from API
//             referralInvestmentType:
//               ((it.referralInvestmentType ??
//                 null) as ReferralInvestmentType | null) || undefined,
//             referralCode: referralCode ?? undefined,
//           };
//         });

//         parsed.sort(
//           (a, b) =>
//             new Date(b.createdAt as unknown as string).getTime() -
//             new Date(a.createdAt as unknown as string).getTime()
//         );

//         return parsed;
//       },
//     }),

//     // single-investment
//     getInvestment: build.query<InvestmentNormalized | undefined, number | void>(
//       {
//         query: (id) => ({
//           url: `${ENDPOINTS.INVESTMENT.ALL_INVESTMENTS}${id ? `/${id}` : ""}`,
//           method: "GET",
//         }),
//         providesTags: (res, err, id) =>
//           id
//             ? [{ type: "Investment" as const, id }]
//             : [{ type: "Investment" as const, id: "ALL" }],
//         transformResponse: (res: unknown) => {
//           const it =
//             res && !Array.isArray(res) ? (res as InvestmentRaw) : undefined;
//           if (!it) return undefined;

//           const amount = Number(String(it.amount ?? "0").replace(/,/g, ""));
//           const thisMonthsReturnsRaw =
//             it.thisMonthsReturns ?? it.returns ?? "0";
//           const thisMonthsReturns = Number(
//             String(thisMonthsReturnsRaw).replace(/,/g, "")
//           );

//           const createdAtIso = it.createdAt
//             ? toIso(it.createdAt)
//             : toIso(Date.now());
//           const updatedAtIso = it.updatedAt
//             ? toIso(it.updatedAt)
//             : createdAtIso;

//           const { months, days } = parseDuration(it.duration);

//           const parsed: InvestmentNormalized = {
//             id: Number(it.id),
//             name: it.name ?? `Investment #${it.id}`,
//             amount: Number.isFinite(amount) ? amount : 0,
//             forWhome: it.forWhome,
//             durationLabel: it.duration ?? "",
//             durationMonths: months,
//             durationDays: days,
//             duration: days,
//             status: String(it.investmentStatus ?? "").toLowerCase(),
//             returns: Number.isFinite(thisMonthsReturns) ? thisMonthsReturns : 0,
//             thisMonthsReturns: Number.isFinite(thisMonthsReturns)
//               ? thisMonthsReturns
//               : 0,
//             lastReturnsRecieved: it.lastReturnsRecieved ?? null,
//             userId: Number(it.userId ?? 0),

//             // keep strings in cache
//             createdAt: createdAtIso,
//             updatedAt: updatedAtIso,
//             startDate: createdAtIso,

//             roi: 0,

//             // NEW: pass-through from API
//             referralInvestmentType:
//               ((it.referralInvestmentType ??
//                 null) as ReferralInvestmentType | null) || undefined,
//           };

//           return parsed;
//         },
//       }
//     ),

//     createInvestment: build.mutation<any, CreateInvestmentRequest>({
//       query: (payload) => ({
//         url: ENDPOINTS.INVESTMENT.CREATE,
//         method: "POST",
//         data: payload,
//       }),
//       invalidatesTags: [
//         { type: "Investment" as const, id: "ALL" },
//         { type: "Investment" as const, id: "PORTFOLIO" },
//       ],
//     }),

//     closeInvestment: build.mutation<any, number>({
//       query: (investmentId: number) => ({
//         url: `/users/investment/close-investment/${investmentId}`,
//         method: "GET",
//       }),
//       invalidatesTags: (result, error, id) => [
//         { type: "Investment" as const, id: "ALL" },
//         { type: "Investment" as const, id },
//         { type: "Investment" as const, id: "PORTFOLIO" },
//       ],
//     }),
//   }),
//   overrideExisting: false,
// });

// export const {
//   useGetInvestmentPortfolioQuery,
//   useGetAllInvestmentsQuery,
//   useGetInvestmentQuery,
//   useCreateInvestmentMutation,
//   useCloseInvestmentMutation,
// } = investmentApi;

// api.ts
import { baseApi } from "./baseApi";
import { ENDPOINTS } from "@/constants/apiEndpoints";
import {
  CreateInvestmentRequest,
  InvestmentNormalized,
  InvestmentPortfolio,
  InvestmentPortfolioRawResponse,
  InvestmentRaw,
  ReferralInvestmentType,
} from "@/types/investment/investment.types";
import { parseDuration } from "./helpers";

/** normalize to ISO string so RTK cache stays serializable */
const toIso = (v: unknown): string => {
  const d = new Date(typeof v === "number" ? v : (v as any));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

export const investmentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getInvestmentPortfolio: build.query<InvestmentPortfolio, void>({
      query: () => ({ url: ENDPOINTS.INVESTMENT.PORTFOLIO, method: "GET" }),
      providesTags: (_res) => [
        { type: "Investment" as const, id: "PORTFOLIO" },
      ],
      transformResponse: (res: unknown) => {
        const payload = (res ?? {}) as InvestmentPortfolioRawResponse;

        const safeNumber = (v: unknown) => {
          if (v === undefined || v === null || v === "") return 0;
          if (typeof v === "number") return v;
          const parsed = Number(String(v).replace(/,/g, ""));
          return Number.isFinite(parsed) ? parsed : 0;
        };

        const parsed: InvestmentPortfolio = {
          walletBalance: safeNumber(payload.walletBalance),
          investmentWallet: safeNumber(payload.investmentWallet),
          investmentReturns: safeNumber(payload.investmentReturns),
          referralEarnings: safeNumber(payload.referralEarnings),
        };
        return parsed;
      },
    }),

    // all-investments
    getAllInvestments: build.query<InvestmentNormalized[], void>({
      query: () => ({
        url: ENDPOINTS.INVESTMENT.ALL_INVESTMENTS,
        method: "GET",
      }),
      providesTags: (_res) => [{ type: "Investment" as const, id: "ALL" }],
      transformResponse: (res: unknown) => {
        const items = Array.isArray(res) ? (res as InvestmentRaw[]) : [];

        const parsed: InvestmentNormalized[] = items.map((it) => {
          const amount = Number(String(it.amount ?? "0").replace(/,/g, ""));
          const returns = Number(String(it.returns ?? "0").replace(/,/g, ""));

          const createdAtIso = it.createdAt
            ? toIso(it.createdAt)
            : toIso(Date.now());
          const updatedAtIso = it.updatedAt
            ? toIso(it.updatedAt)
            : createdAtIso;

          const { months, days } = parseDuration(it.duration);

          // small helper: extract referral code from multiple possible shapes
          const referralCode =
            (it as any)?.referralCode ??
            (it as any)?.referredBy?.Referral?.code ??
            undefined;

          return {
            id: Number(it.id),
            name: it.name ?? `Investment #${it.id}`,
            amount: Number.isFinite(amount) ? amount : 0,
            forWhome: it.forWhome,
            durationLabel: it.duration ?? "",
            durationMonths: months,
            durationDays: days,
            duration: days,
            status: String(it.investmentStatus ?? "").toLowerCase(),
            returns: Number.isFinite(returns) ? returns : 0,
            lastReturnsRecieved: it.lastReturnsRecieved ?? null,
            userId: Number(it.userId ?? 0),

            // keep strings in cache
            createdAt: createdAtIso,
            updatedAt: updatedAtIso,
            startDate: createdAtIso,

            roi: 0,

            // NEW: pass-through from API (may be undefined)
            referralInvestmentType:
              ((it.referralInvestmentType ??
                null) as ReferralInvestmentType | null) || undefined,
            referralCode,
          };
        });

        parsed.sort(
          (a, b) =>
            new Date(b.createdAt as unknown as string).getTime() -
            new Date(a.createdAt as unknown as string).getTime()
        );

        return parsed;
      },
    }),

    // single-investment
    getInvestment: build.query<InvestmentNormalized | undefined, number | void>(
      {
        query: (id) => ({
          url: `${ENDPOINTS.INVESTMENT.ALL_INVESTMENTS}${id ? `/${id}` : ""}`,
          method: "GET",
        }),
        providesTags: (res, err, id) =>
          id
            ? [{ type: "Investment" as const, id }]
            : [{ type: "Investment" as const, id: "ALL" }],
        transformResponse: (res: unknown) => {
          const it =
            res && !Array.isArray(res) ? (res as InvestmentRaw) : undefined;
          if (!it) return undefined;

          const amount = Number(String(it.amount ?? "0").replace(/,/g, ""));
          const thisMonthsReturnsRaw =
            it.thisMonthsReturns ?? it.returns ?? "0";
          const thisMonthsReturns = Number(
            String(thisMonthsReturnsRaw).replace(/,/g, "")
          );

          const createdAtIso = it.createdAt
            ? toIso(it.createdAt)
            : toIso(Date.now());
          const updatedAtIso = it.updatedAt
            ? toIso(it.updatedAt)
            : createdAtIso;

          const { months, days } = parseDuration(it.duration);

          const referralCode =
            (it as any)?.referralCode ??
            (it as any)?.referredBy?.Referral?.code ??
            undefined;

          const parsed: InvestmentNormalized = {
            id: Number(it.id),
            name: it.name ?? `Investment #${it.id}`,
            amount: Number.isFinite(amount) ? amount : 0,
            forWhome: it.forWhome,
            durationLabel: it.duration ?? "",
            durationMonths: months,
            durationDays: days,
            duration: days,
            status: String(it.investmentStatus ?? "").toLowerCase(),
            returns: Number.isFinite(thisMonthsReturns) ? thisMonthsReturns : 0,
            thisMonthsReturns: Number.isFinite(thisMonthsReturns)
              ? thisMonthsReturns
              : 0,
            lastReturnsRecieved: it.lastReturnsRecieved ?? null,
            userId: Number(it.userId ?? 0),

            // keep strings in cache
            createdAt: createdAtIso,
            updatedAt: updatedAtIso,
            startDate: createdAtIso,

            roi: 0,

            // NEW: pass-through from API
            referralInvestmentType:
              ((it.referralInvestmentType ??
                null) as ReferralInvestmentType | null) || undefined,
            referralCode,
          };

          return parsed;
        },
      }
    ),

    createInvestment: build.mutation<any, CreateInvestmentRequest>({
      query: (payload) => ({
        url: ENDPOINTS.INVESTMENT.CREATE,
        method: "POST",
        data: payload,
      }),
      invalidatesTags: [
        { type: "Investment" as const, id: "ALL" },
        { type: "Investment" as const, id: "PORTFOLIO" },
      ],
    }),

    closeInvestment: build.mutation<any, number>({
      query: (investmentId: number) => ({
        url: `/users/investment/close-investment/${investmentId}`,
        method: "GET",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Investment" as const, id: "ALL" },
        { type: "Investment" as const, id },
        { type: "Investment" as const, id: "PORTFOLIO" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetInvestmentPortfolioQuery,
  useGetAllInvestmentsQuery,
  useGetInvestmentQuery,
  useCreateInvestmentMutation,
  useCloseInvestmentMutation,
} = investmentApi;
