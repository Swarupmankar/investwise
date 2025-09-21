export interface ReportRaw {
  id: number | string;
  title: string;
  summary: string | null;
  fileUrl: string | null;
  createdAt: string | null;
}

export interface ReportNormalized {
  id: number;
  title: string;
  summary: string;
  fileUrl: string;
  createdAt: Date;
  fileName: string;
  fileExt: string;
  isPdf: boolean;
  isImage: boolean;
}

export type GetReportsResponse = ReportNormalized[];
export type GetReportResponse = ReportNormalized;
