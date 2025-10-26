import { useEffect, useMemo, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Download,
  Megaphone,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { useGetReportsQuery } from "@/API/reports.api";
import type { ReportNormalized } from "@/types/report/report.types";

const LAST_READ_KEY = "broadcast_last_read_id";

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
function fileNameFromUrl(url?: string) {
  if (!url) return "file";
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    return parts[parts.length - 1] || url;
  } catch {
    const parts = url.split("/");
    return parts[parts.length - 1] || url;
  }
}
function iconForType(ext: string) {
  const t = ext.toLowerCase();
  if (t === "pdf") return <FileText className="h-5 w-5" aria-hidden />;
  if (["csv", "xlsx", "xls"].includes(t))
    return <FileSpreadsheet className="h-5 w-5" aria-hidden />;
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif"].includes(t))
    return <ImageIcon className="h-5 w-5" aria-hidden />;
  return <File className="h-5 w-5" aria-hidden />;
}

async function fetchAsBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { mode: "cors", credentials: "include" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return await res.blob();
}

/** Banner with Skeleton (loading) and Placeholder (error/empty) */
function BannerImage({
  url,
  alt,
  onClick,
}: {
  url: string;
  alt: string;
  onClick?: () => void;
}) {
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(Boolean(url));
    setError(false);
  }, [url]);

  const showPlaceholder = !url || error;

  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-muted/5">
      <AspectRatio ratio={16 / 9}>
        {/* LOADING: skeleton covers area until image is ready */}
        {loading && !showPlaceholder && (
          <div className="h-full w-full">
            <Skeleton className="h-full w-full rounded-none" />
          </div>
        )}

        {/* IMAGE */}
        {!showPlaceholder && (
          <img
            src={url}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover ${
              onClick ? "cursor-zoom-in" : ""
            } ${loading ? "invisible" : "visible"}`}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            onClick={onClick}
          />
        )}

        {/* PLACEHOLDER */}
        {showPlaceholder && (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 bg-muted/20">
            <div className="p-3 rounded-md bg-background border">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              {url ? "Image failed to load" : "No banner"}
            </p>
          </div>
        )}
      </AspectRatio>
    </div>
  );
}

export default function Broadcasts() {
  const { toast } = useToast();

  const {
    data: reports,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetReportsQuery();

  const posts: ReportNormalized[] = useMemo(
    () =>
      (reports ?? [])
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [reports]
  );

  const latest = posts[0] ?? null;
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ReportNormalized | null>(
    null
  );

  // viewer state (used for banner/image preview)
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null); // blob: or original url
  const viewerTypeRef = useRef<"pdf" | "image" | "other" | null>(null);

  // track created blob urls for cleanup
  const createdBlobUrlsRef = useRef<string[]>([]);

  // read state
  const [isRead, setIsRead] = useState(false);
  useEffect(() => {
    if (latest?.id !== undefined) {
      const lastRead = localStorage.getItem(LAST_READ_KEY);
      setIsRead(String(lastRead) === String(latest.id));
    }
  }, [latest?.id]);

  useEffect(() => {
    document.title = `${
      latest && !isRead ? "Broadcast & Reports • New" : "Broadcast & Reports"
    } | VaultPro`;
    const descContent =
      "Latest admin broadcast with banner and downloadable report for your account.";
    let meta = document.querySelector(
      'meta[name="description"]'
    ) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = descContent;
  }, [isRead, latest?.id]);

  // cleanup blob urls on unmount
  useEffect(() => {
    return () => {
      createdBlobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      createdBlobUrlsRef.current = [];
    };
  }, []);

  async function openViewer(url?: string) {
    if (!url) return;
    const ext = extFromUrl(url);
    const isPdf = ext === "pdf";
    const isImage = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "bmp",
      "avif",
    ].includes(ext);

    try {
      const blob = await fetchAsBlob(url);
      const blobUrl = URL.createObjectURL(blob);
      createdBlobUrlsRef.current.push(blobUrl);
      setViewerUrl(blobUrl);
      viewerTypeRef.current = isPdf ? "pdf" : isImage ? "image" : "other";
      setViewerOpen(true);
      return;
    } catch {
      if (isImage) {
        setViewerUrl(url);
        viewerTypeRef.current = "image";
        setViewerOpen(true);
        return;
      }
      setViewerUrl(null);
      viewerTypeRef.current = isPdf ? "pdf" : "other";
      setViewerOpen(true);
      return;
    }
  }

  async function downloadResource(url: string, suggestedName?: string) {
    if (!url) return;
    try {
      if (url.startsWith("blob:")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = suggestedName ?? "download";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }
      // fetch actual resource as blob
      const blob = await fetchAsBlob(url);
      const blobUrl = URL.createObjectURL(blob);
      createdBlobUrlsRef.current.push(blobUrl);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = suggestedName ?? fileNameFromUrl(url);
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => {
        try {
          URL.revokeObjectURL(blobUrl);
          createdBlobUrlsRef.current = createdBlobUrlsRef.current.filter(
            (u) => u !== blobUrl
          );
        } catch {}
      }, 15_000);
    } catch {
      toast({
        title: "Downloading",
        description: "Opening link so you can download the file.",
      });
      window.open(url, "_blank", "noopener");
    }
  }

  function handleMarkLatestRead(checked: boolean) {
    if (!latest) return;
    if (checked) {
      localStorage.setItem(LAST_READ_KEY, String(latest.id));
      setIsRead(true);
    } else {
      localStorage.removeItem(LAST_READ_KEY);
      setIsRead(false);
    }
  }

  const pillClass = `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${
    isRead
      ? "bg-success/15 text-success ring-success/30"
      : "bg-primary/15 text-primary ring-primary/30"
  }`;

  return (
    <div>
      <header className="mb-8">
        <div className="mx-auto max-w-4xl px-2 sm:px-0">
          <div className="flex items-center gap-3">
            <Megaphone className="h-6 w-6 text-primary" aria-hidden />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Broadcast & Reports
            </h1>
            {latest && !isRead && (
              <span className="inline-flex items-center rounded-full bg-primary/20 text-primary text-xs px-2 py-0.5 ring-1 ring-primary/30">
                New
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Read the latest admin broadcast (with banner) and download the
            attached report.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl pb-8">
        {(isLoading || isFetching) && (
          <div className="space-y-6">
            {[0, 1, 2].map((i) => (
              <Card
                key={i}
                className="backdrop-blur-xl bg-card/80 border border-border/50 shadow-xl"
              >
                <CardHeader className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-6 w-24 rounded-full bg-primary/15" />
                  </div>
                  <Skeleton className="h-7 w-2/3" />
                  <Skeleton className="h-40 sm:h-56 w-full rounded-lg" />
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-11/12" />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-10 w-36" />
                    <Skeleton className="h-10 w-48" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className="space-y-4 text-center max-w-3xl mx-auto">
            <Card className="border-border">
              <CardContent className="p-8 sm:p-10 md:p-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  Unable to load reports
                </h3>
                <p className="text-muted-foreground">
                  There was a problem loading reports. Try refreshing.
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button variant="default" onClick={() => refetch()}>
                Refresh
              </Button>
            </div>
          </div>
        )}

        {/* Empty (no reports) */}
        {!isLoading && !isError && posts.length === 0 && (
          <Card className="backdrop-blur-xl bg-card/80 border border-border/50 shadow-xl text-center p-8 max-w-3xl mx-auto">
            <div className="mx-auto max-w-sm">
              <CardTitle className="text-xl">No reports yet</CardTitle>
              <CardDescription className="mt-2">
                Please check back later.
              </CardDescription>
            </div>
          </Card>
        )}

        {posts.length > 0 && (
          <div className="space-y-6">
            {posts.map((post, idx) => {
              const isTop = idx === 0;

              const fileUrl = post.fileUrl ?? "";
              const fileExt = (
                post.fileExt || extFromUrl(fileUrl)
              ).toLowerCase();
              const isFileImage =
                post.isImage ||
                ["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif"].includes(
                  fileExt
                );
              const isFilePdf = post.isPdf || fileExt === "pdf";

              // Banner (URL may be empty if backend gave only name we can't resolve)
              const bannerUrl = post.bannerUrl;
              const hasBanner = post.hasBanner;

              return (
                <Card
                  key={post.id}
                  className="relative backdrop-blur-xl bg-card/80 border border-border/50 shadow-xl"
                >
                  {isTop && (
                    <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-primary/10" />
                  )}
                  <CardHeader>
                    {isTop && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={pillClass} aria-live="polite">
                            Latest Update
                          </span>
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                          <Checkbox
                            id="mark-read"
                            checked={isRead}
                            onCheckedChange={(v) =>
                              handleMarkLatestRead(Boolean(v))
                            }
                            aria-label="Mark as read"
                          />
                          Mark as read
                        </label>
                      </div>
                    )}

                    <CardTitle className="text-2xl sm:text-3xl">
                      {post.title}
                    </CardTitle>

                    {/* BANNER PREVIEW: always render area with skeleton/placeholder */}
                    <div className="mt-1">
                      <BannerImage
                        url={hasBanner ? bannerUrl : ""}
                        alt={`${post.title} banner`}
                        onClick={
                          hasBanner ? () => openViewer(bannerUrl) : undefined
                        }
                      />
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" aria-hidden />
                      <time dateTime={post.createdAt.toISOString()}>
                        {formatDistanceToNow(post.createdAt, {
                          addSuffix: true,
                        })}
                      </time>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <article className="prose prose-invert max-w-none leading-relaxed">
                      <p className="text-base text-muted-foreground whitespace-pre-wrap">
                        {post.summary}
                      </p>
                    </article>

                    {/* FILE SECTION */}
                    <section aria-label="Report file" className="space-y-3">
                      <h3 className="text-sm font-medium text-foreground">
                        Attachment
                      </h3>

                      <div className="flex items-center justify-between gap-3 p-3 rounded border border-border/40 bg-muted/20">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 flex items-center justify-center rounded-md bg-background border">
                            {iconForType(fileExt)}
                          </div>
                          <div className="min-w-0">
                            <p
                              className="text-sm font-medium truncate max-w-[320px]"
                              title={post.fileName}
                            >
                              {post.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {fileExt ? fileExt.toUpperCase() : "FILE"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* PDFs: Download only */}
                          {isFilePdf && (
                            <Button
                              className="hover:shadow-lg"
                              size="sm"
                              variant="default"
                              onClick={() =>
                                downloadResource(fileUrl, post.fileName)
                              }
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          )}

                          {/* Images or others */}
                          {!isFilePdf && (
                            <>
                              {isFileImage && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => openViewer(fileUrl)}
                                >
                                  <ImageIcon className="h-4 w-4 mr-2" />
                                  Preview
                                </Button>
                              )}
                              <Button
                                className="hover:shadow-lg"
                                size="sm"
                                variant="default"
                                onClick={() =>
                                  downloadResource(fileUrl, post.fileName)
                                }
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </section>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detail dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-lg">
            {selectedPost && (
              <>
                <DialogHeader>
                  <DialogTitle className="pr-8">
                    {selectedPost.title}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedPost.createdAt.toLocaleString()}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedPost.summary}
                  </p>

                  {/* Banner uses the same resilient component */}
                  <BannerImage
                    url={selectedPost.hasBanner ? selectedPost.bannerUrl : ""}
                    alt={`${selectedPost.title} banner`}
                    onClick={
                      selectedPost.hasBanner
                        ? () => openViewer(selectedPost.bannerUrl)
                        : undefined
                    }
                  />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Attachment</h4>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 flex items-center justify-center rounded-md bg-muted">
                          {iconForType(selectedPost.fileExt)}
                        </div>
                        <div>
                          <p
                            className="text-sm truncate max-w-[240px]"
                            title={selectedPost.fileName}
                          >
                            {selectedPost.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedPost.fileExt.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          downloadResource(
                            selectedPost.fileUrl,
                            selectedPost.fileName
                          )
                        }
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button variant="secondary">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>

      {/* Simple viewer dialog for images / pdf */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="sm:max-w-3xl">
          {viewerTypeRef.current === "image" && viewerUrl && (
            <img
              src={viewerUrl}
              alt="Preview"
              className="max-h-[75vh] w-full object-contain rounded"
            />
          )}
          {viewerTypeRef.current === "pdf" && viewerUrl && (
            <iframe
              src={viewerUrl}
              className="w-full h-[75vh] rounded"
              title="PDF Preview"
            />
          )}
          {viewerTypeRef.current === "other" && (
            <p className="text-sm text-muted-foreground">
              Preview not available.
            </p>
          )}
          <DialogFooter className="mt-2">
            {viewerUrl && (
              <Button
                onClick={() => downloadResource(viewerUrl)}
                variant="default"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="secondary" size="sm">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
