import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Eye,
  Trash2,
  Clock,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useAppStore } from "@/stores/app";
import { converterApi } from "@/lib/api";
import { formatBytes, formatDuration } from "@/lib/utils";
import type { ConversionJob, ConversionStatus } from "@/types";

const converterColors: Record<string, string> = {
  markitdown: "bg-blue-500",
  docling: "bg-purple-500",
  marker: "bg-green-500",
  pypandoc: "bg-orange-500",
  unstructured: "bg-pink-500",
  mammoth: "bg-yellow-500",
  html2text: "bg-cyan-500",
  auto: "bg-gray-500",
};

const statusIcons: Record<ConversionStatus, React.ReactNode> = {
  pending: <Clock className="h-5 w-5 text-muted-foreground" />,
  processing: <Loader2 className="h-5 w-5 text-primary animate-spin" />,
  completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  failed: <XCircle className="h-5 w-5 text-destructive" />,
};

export function JobList() {
  const { jobs, setJobs, removeJob, setPreviewJobId } = useAppStore();
  const queryClient = useQueryClient();

  // Fetch jobs periodically
  const { data: fetchedJobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: converterApi.getJobs,
    refetchInterval: 1000, // Refetch every second for active jobs
  });

  useEffect(() => {
    if (fetchedJobs) {
      setJobs(fetchedJobs);
    }
  }, [fetchedJobs, setJobs]);

  const handleDownload = async (job: ConversionJob) => {
    try {
      const blob = await converterApi.downloadResult(job.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${job.file_info.name.replace(/\.[^.]+$/, "")}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      await converterApi.deleteJob(jobId);
      removeJob(jobId);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const hasActiveJobs = jobs.some(
    (j) => j.status === "pending" || j.status === "processing"
  );

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No conversions yet</p>
        <p className="text-sm">Upload files and click Convert to start</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Conversion Results</h3>
        {hasActiveJobs && (
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </span>
        )}
      </div>

      <ScrollArea className="h-[400px]">
        <AnimatePresence mode="popLayout">
          {jobs.map((job) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              layout
            >
              <Card className="p-4 mb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {statusIcons[job.status]}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{job.file_info.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span
                          className={`px-2 py-0.5 rounded-full text-white ${
                            converterColors[job.converter] || "bg-gray-500"
                          }`}
                        >
                          {job.converter}
                        </span>
                        <span>{formatBytes(job.file_info.size)}</span>
                        {job.output_size && (
                          <>
                            <span>→</span>
                            <span>{formatBytes(job.output_size)}</span>
                          </>
                        )}
                        {job.processing_time && (
                          <span>{formatDuration(job.processing_time)}</span>
                        )}
                      </div>

                      {/* Progress bar for processing */}
                      {(job.status === "pending" || job.status === "processing") && (
                        <Progress value={job.progress} className="mt-2 h-1" />
                      )}

                      {/* Error message */}
                      {job.status === "failed" && job.error && (
                        <p className="text-destructive text-sm mt-2 line-clamp-2">
                          {job.error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {job.status === "completed" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPreviewJobId(job.id)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(job)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(job.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
