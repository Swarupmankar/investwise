export interface ReportRaw {
  id: number | string;
  title: string;
  summary: string | null;
  fileUrl: string | null;
  createdAt: string | null;
  banner?: string | null; // optional legacy "name"
  bannerUrl?: string | null; // API may send full URL
}

export interface ReportNormalized {
  id: number;
  title: string;
  summary: string;
  bannerName: string;
  bannerUrl: string;
  hasBanner: boolean;
  fileUrl: string;
  createdAt: string; 
  fileName: string;
  fileExt: string;
  isPdf: boolean;
  isImage: boolean;
}

export type GetReportsResponse = ReportNormalized[];
export type GetReportResponse = ReportNormalized;
