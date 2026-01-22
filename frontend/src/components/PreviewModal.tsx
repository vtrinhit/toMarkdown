import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app";
import { converterApi } from "@/lib/api";
import { Loader2, Copy, Check, Download, Code, Eye, ZoomIn, ZoomOut } from "lucide-react";

export function PreviewModal() {
  const { previewJobId, setPreviewJobId, jobs } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [imageScale, setImageScale] = useState(100);

  const job = jobs.find((j) => j.id === previewJobId);

  const { data: preview, isLoading } = useQuery({
    queryKey: ["preview", previewJobId],
    queryFn: () => converterApi.previewResult(previewJobId!),
    enabled: !!previewJobId && job?.status === "completed",
  });

  const handleCopy = async () => {
    if (preview?.content) {
      await navigator.clipboard.writeText(preview.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    if (!previewJobId) return;
    try {
      const blob = await converterApi.downloadResult(previewJobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${job?.file_info.name.replace(/\.[^.]+$/, "")}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  // Image scale style
  const imageScaleStyle = useMemo(() => ({
    "--image-scale": `${imageScale}%`,
  } as React.CSSProperties), [imageScale]);

  return (
    <Dialog open={!!previewJobId} onOpenChange={() => setPreviewJobId(null)}>
      <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-8">
            <span className="truncate text-base sm:text-lg" title={job?.file_info.name}>
              Preview: {job?.file_info.name}
            </span>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 flex-wrap">
              {/* View toggle */}
              <Button
                variant={showRaw ? "default" : "outline"}
                size="sm"
                onClick={() => setShowRaw(!showRaw)}
                className="gap-1.5 h-8"
              >
                {showRaw ? (
                  <>
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Rendered</span>
                  </>
                ) : (
                  <>
                    <Code className="h-4 w-4" />
                    <span className="hidden sm:inline">Source</span>
                  </>
                )}
              </Button>

              {/* Image scale controls (only in rendered view) */}
              {!showRaw && (
                <div className="flex items-center gap-1 border rounded-md">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageScale(Math.max(25, imageScale - 25))}
                    disabled={imageScale <= 25}
                    className="h-8 w-8 p-0"
                    title="Zoom out images"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs w-10 text-center">{imageScale}%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageScale(Math.min(200, imageScale + 25))}
                    disabled={imageScale >= 200}
                    className="h-8 w-8 p-0"
                    title="Zoom in images"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="h-6 w-px bg-border hidden sm:block" />

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 h-8"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="hidden sm:inline">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-1.5 h-8"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            {preview?.truncated && (
              <span className="text-yellow-600 dark:text-yellow-400">
                Preview truncated ({Math.round(preview.total_length / 1024)}KB total). Download for full content.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 rounded-lg border bg-muted/30 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : showRaw ? (
            /* Raw markdown source */
            <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words overflow-x-auto">
              {preview?.content || ""}
            </pre>
          ) : (
            /* Rendered markdown */
            <div
              className="p-4 markdown-preview"
              style={imageScaleStyle}
            >
              <div className="prose dark:prose-invert prose-sm sm:prose-base max-w-none
                prose-headings:font-semibold prose-headings:text-foreground
                prose-p:text-foreground prose-p:leading-relaxed
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-strong:text-foreground prose-strong:font-semibold
                prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg
                prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:px-4
                prose-ul:text-foreground prose-ol:text-foreground
                prose-li:marker:text-muted-foreground
                prose-hr:border-border
                prose-table:border-collapse prose-table:w-full
                prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold
                prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2
                prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto
              ">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    // Custom image component with scale support
                    img: ({ src, alt, ...props }) => (
                      <img
                        src={src}
                        alt={alt || "Image"}
                        {...props}
                        style={{
                          maxWidth: `var(--image-scale, 100%)`,
                          height: "auto"
                        }}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    ),
                    // Custom link to open in new tab
                    a: ({ href, children, ...props }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      >
                        {children}
                      </a>
                    ),
                    // Custom code block styling
                    pre: ({ children, ...props }) => (
                      <pre
                        className="overflow-x-auto p-4 rounded-lg bg-muted border text-sm"
                        {...props}
                      >
                        {children}
                      </pre>
                    ),
                    code: ({ className, children, ...props }) => {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code
                            className="text-primary bg-muted px-1.5 py-0.5 rounded text-sm"
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    // Custom table wrapper for horizontal scroll
                    table: ({ children, ...props }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full" {...props}>
                          {children}
                        </table>
                      </div>
                    ),
                  }}
                >
                  {preview?.content || ""}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
