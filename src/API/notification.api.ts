import { baseApi } from "./baseApi";
import { ENDPOINTS } from "@/constants/apiEndpoints";
import type { GetAllNotificationsResponse } from "@/types/notification/notifications.types";

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<GetAllNotificationsResponse, void>({
      query: () => ({
        url: ENDPOINTS.NOTIFICATIONS.ALL,
        method: "GET",
      }),
      providesTags: (_res) => [{ type: "Notification" as const, id: "LIST" }],
      transformResponse: (res: unknown) => {
        return (res ?? {}) as GetAllNotificationsResponse;
      },
    }),

    markNotificationRead: build.mutation<any, { id: number }>({
      query: ({ id }) => ({
        url: ENDPOINTS.NOTIFICATIONS.READ(id),
        method: "PATCH",
      }),
      invalidatesTags: [{ type: "Notification" as const, id: "LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetNotificationsQuery, useMarkNotificationReadMutation } =
  notificationApi;
