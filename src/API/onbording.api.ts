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
      invalidatesTags: [{ type: "Onboarding" as const, id: "QUESTIONS" }],
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
