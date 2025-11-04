export interface ReportRaw {
  id: number | string;
  title: string;
  summary: string | null;
  fileUrl: string | null;
  fileUrls?: string[] | null;
  createdAt: string | null;
  banner?: string | null;
  bannerUrl?: string | null;
}

export interface ReportFile {
  url: string;
  name: string;
  ext: string;
  isPdf: boolean;
  isImage: boolean;
}

export interface ReportNormalized {
  id: number;
  title: string;
  summary: string;
  bannerName: string;
  bannerUrl: string;
  hasBanner: boolean;
  files: ReportFile[];
  hasFiles: boolean;
  createdAt: string;
}

export type GetReportsResponse = ReportNormalized[];
export type GetReportResponse = ReportNormalized;
