import {
  GetReportsResponse,
  ReportNormalized,
  ReportRaw,
} from "@/types/report/report.types";
import { baseApi } from "./baseApi";
import { ENDPOINTS } from "@/constants/apiEndpoints";

/** helpers */
function fileNameFromUrl(url?: string) {
  if (!url) return "file";
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    return parts[parts.length - 1] || url;
  } catch {
    const parts = (url || "").split("/");
    return parts[parts.length - 1] || url;
  }
}
function extFromUrl(url?: string) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const path = u.pathname;
    const dot = path.lastIndexOf(".");
    if (dot === -1) return "";
    return path.slice(dot + 1).toLowerCase();
  } catch {
    const dot = (url || "").lastIndexOf(".");
    if (dot === -1) return "";
    return (url || "").slice(dot + 1).toLowerCase();
  }
}
function safeString(v: unknown) {
  if (v === undefined || v === null) return "";
  return String(v);
}

/** RTK Query endpoints for reports */
export const reportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getReports: build.query<GetReportsResponse, void>({
      query: () => ({
        url: ENDPOINTS.REPORTS.LIST,
        method: "GET",
      }),
      providesTags: (_res) => [{ type: "Report" as const, id: "LIST" }],
      transformResponse: (res: unknown) => {
        const items = Array.isArray(res) ? (res as ReportRaw[]) : [];
        const parsed: ReportNormalized[] = items.map((r) => {
          const fileUrl = safeString(r.fileUrl);
          const fileName = fileNameFromUrl(fileUrl);
          const fileExt = extFromUrl(fileUrl);
          const createdAt = r.createdAt
            ? new Date(String(r.createdAt))
            : new Date();
          const isPdf = fileExt === "pdf";
          const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(
            fileExt
          );

          return {
            id: Number(r.id),
            title: safeString(r.title),
            summary: safeString(r.summary),
            fileUrl,
            createdAt,
            fileName,
            fileExt,
            isPdf,
            isImage,
          } as ReportNormalized;
        });

        // sort newest first by createdAt
        parsed.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return parsed;
      },
    }),
  }),
  overrideExisting: false,
});

export const { useGetReportsQuery } = reportApi;
