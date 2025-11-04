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
function dirnameFromUrl(url?: string) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    parts.pop(); // remove filename
    u.pathname = parts.join("/") + (parts.length ? "/" : "");
    return u.toString();
  } catch {
    const idx = (url || "").lastIndexOf("/");
    if (idx === -1) return "";
    return url.slice(0, idx + 1);
  }
}
/** Try to resolve a banner name (no scheme) to a URL. */
function resolveBannerUrl(bannerName?: string, hintFileUrl?: string): string {
  const name = safeString(bannerName).trim();
  if (!name) return "";
  // already a full URL or data url
  if (/^(https?:)?\/\//i.test(name) || /^data:/i.test(name)) return name;

  // 1) same directory as the fileUrl
  const dir = dirnameFromUrl(hintFileUrl);
  if (dir) return dir + name;

  // 2) explicit base from endpoints (optional)
  const base =
    (ENDPOINTS as any)?.REPORTS?.BANNER_BASE ||
    (import.meta as any)?.env?.VITE_BANNER_BASE ||
    "";
  if (base) {
    return base.replace(/\/+$/, "") + "/" + name.replace(/^\/+/, "");
  }

  // 3) cannot resolve
  return "";
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
          // accept either fileUrls[] or legacy fileUrl
          const rawFileUrls = Array.isArray((r as any).fileUrls)
            ? ((r as any).fileUrls as (string | null | undefined)[])
            : r.fileUrl
            ? [r.fileUrl]
            : [];

          const files = rawFileUrls
            .map((u) => String(u || "").trim())
            .filter(Boolean)
            .map((url) => {
              const name = fileNameFromUrl(url);
              const ext = extFromUrl(url);
              const isPdf = ext.toLowerCase() === "pdf";
              const isImage = [
                "jpg",
                "jpeg",
                "png",
                "gif",
                "webp",
                "bmp",
                "avif",
              ].includes(ext.toLowerCase());
              return { url, name, ext, isPdf, isImage };
            });

          // IMPORTANT: keep it a string in Redux
          const createdAt: string = r.createdAt
            ? String(r.createdAt)
            : new Date().toISOString();

          // Banner resolution stays the same
          const explicitBannerUrl = safeString((r as any).bannerUrl);
          const bannerName = safeString((r as any).banner ?? (r as any).baner);
          const bannerUrl =
            explicitBannerUrl || resolveBannerUrl(bannerName, files[0]?.url);
          const hasBanner = !!bannerUrl;

          return {
            id: Number(r.id),
            title: safeString(r.title),
            summary: safeString(r.summary),

            bannerName,
            bannerUrl,
            hasBanner,

            files,
            hasFiles: files.length > 0,

            createdAt,
          } as ReportNormalized;
        });

        parsed.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return parsed;
      },
    }),
  }),
  overrideExisting: false,
});

export const { useGetReportsQuery } = reportApi;
