import { baseApi } from "./baseApi";
import type { UserProfile } from "@/types/users/user.types";
import { ENDPOINTS } from "@/constants/apiEndpoints";
import { KycDocType, KycStatusResponse } from "@/types/users/kyc.types";

export const userApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    //--GET PROFILE--//
    getUserProfile: build.query<UserProfile, void>({
      query: () => ({
        url: ENDPOINTS.USERS.USER_PROFILE,
        method: "GET",
      }),
      providesTags: (_res) => [{ type: "Users" as const, id: "PROFILE" }],
      transformResponse: (res: unknown) => {
        return res as UserProfile;
      },
    }),
    //--CHANGE PASSWORD--//
    changePassword: build.mutation<
      { currentPassword?: string; newPassword?: string },
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => ({
        url: ENDPOINTS.USERS.CHANGE_PASSWORD,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (_res, _err, _arg) => [
        { type: "Users" as const, id: "PROFILE" },
      ],
    }),

    //--KYC STATUS--//
    getKycStatus: build.query<KycStatusResponse, void>({
      query: () => ({
        url: ENDPOINTS.USERS.KYC_STATUS,
        method: "GET",
      }),
      providesTags: [{ type: "Users", id: "STATUS" }],
    }),

    //--KYC UPLOAD--//
    uploadKycDocs: build.mutation<
      { message?: string },
      {
        file: File;
        docType: KycDocType;
        address?: string;
      }
    >({
      query: ({ file, docType, address }) => {
        const formData = new FormData();
        formData.append("file", file);

        if (docType === "UTILITY_BILL" && address) {
          formData.append("address", address);
        }

        return {
          url: ENDPOINTS.USERS.KYC_UPLOAD,
          method: "POST",
          params: { docType },
          data: formData,
        };
      },
      invalidatesTags: (_res, _err, _arg) => [
        { type: "Users" as const, id: "STATUS" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetUserProfileQuery,
  useChangePasswordMutation,
  useGetKycStatusQuery,
  useUploadKycDocsMutation,
} = userApi;
