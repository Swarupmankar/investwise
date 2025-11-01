import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import type { AxiosRequestConfig, AxiosError } from "axios";
import api from "./axiosInstance";

type AxiosBaseQueryArgs = {
  url: string;
  method?: AxiosRequestConfig["method"]; 
  data?: AxiosRequestConfig["data"];
  params?: AxiosRequestConfig["params"];
  headers?: AxiosRequestConfig["headers"];
};

export const axiosBaseQuery =
  (): BaseQueryFn<AxiosBaseQueryArgs, unknown, unknown> =>
  async ({ url, method = "GET", data, params, headers }) => {
    // <-- default to GET
    try {
      const isFormData = data instanceof FormData;
      const result = await api({
        url,
        method,
        data,
        params,
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...headers,
        },
      });
      return { data: result.data };
    } catch (axiosError) {
      const err = axiosError as AxiosError<any>;
      return {
        error: {
          status: err.response?.status,
          data: err.response?.data || err.message,
        },
      };
    }
  };
