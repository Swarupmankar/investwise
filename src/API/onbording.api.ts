// onboarding.api.ts
import { baseApi } from "./baseApi";
import { ENDPOINTS } from "@/constants/apiEndpoints";
import {
  Question,
  SaveAnswersRequest,
  UserAnswer,
  IsAnsweredResponse,
} from "@/types/onbording/onboarding.types";

export const onboardingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // SAVE ANSWERS
    saveAnswers: build.mutation<void, SaveAnswersRequest>({
      query: (body) => ({
        url: ENDPOINTS.ONBOARDING.SAVE_ANSWERS,
        method: "POST",
        data: body,
      }),
      // invalidate both the QUESTIONS and STATUS tags so isAnswered is re-fetched
      invalidatesTags: [
        { type: "Onboarding" as const, id: "QUESTIONS" },
        { type: "Onboarding" as const, id: "STATUS" },
      ],

      // optimistic local update: mark questionnaire completed immediately
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          // Optimistically mark localStorage as completed.
          // IMPORTANT: Cross-user apps should scope this key by user id.
          try {
            localStorage.setItem("questionnaireCompleted", "true");
          } catch {
            // ignore localStorage errors (e.g., private mode)
          }

          // Wait for server confirmation
          await queryFulfilled;
          // successful: invalidatesTags will trigger refetch of isAnswered
        } catch {
          // mutation failed — rollback optimistic local flag
          try {
            localStorage.setItem("questionnaireCompleted", "false");
          } catch {
            // ignore
          }
        }
      },
    }),

    // GET USER ANSWERS
    getUserAnswers: build.query<UserAnswer[], void>({
      query: () => ({
        url: ENDPOINTS.ONBOARDING.GET_USER_ANSWERS,
        method: "GET",
      }),
      providesTags: (_res) => [{ type: "Onboarding" as const, id: "ANSWERS" }],
      transformResponse: (res: unknown) => {
        return (res ?? []) as UserAnswer[];
      },
    }),

    // IS ANSWERED
    isAnswered: build.query<IsAnsweredResponse, void>({
      query: () => ({
        url: ENDPOINTS.ONBOARDING.IS_ANSWERED,
        method: "GET",
      }),
      providesTags: (_res) => [{ type: "Onboarding" as const, id: "STATUS" }],
      transformResponse: (res: unknown) => {
        return (res ?? { allAnswered: false }) as IsAnsweredResponse;
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useSaveAnswersMutation,
  useGetUserAnswersQuery,
  useIsAnsweredQuery,
} = onboardingApi;
