import { useEffect, useState } from "react";
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
  CheckSquare,
  PackageOpen,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/stores/app";
import { converterApi } from "@/lib/api";
import { formatBytes, formatDuration } from "@/lib/utils";
import type { ConversionJob, ConversionStatus } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  pending: <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />,
  processing: <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />,
  completed: <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />,
  failed: <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />,
};

export function JobList() {
  const { jobs, setJobs, removeJob, setPreviewJobId } = useAppStore();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch jobs periodically only when there are active jobs
  const hasActiveJobs = jobs.some(
    (j) => j.status === "pending" || j.status === "processing"
  );

  const { data: fetchedJobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: converterApi.getJobs,
    refetchInterval: hasActiveJobs ? 2000 : false,
  });

  useEffect(() => {
    if (fetchedJobs) {
      setJobs(fetchedJobs);
    }
  }, [fetchedJobs, setJobs]);

  // Clean up selected IDs when jobs change
  useEffect(() => {
    setSelectedIds((prev) => {
      const validIds = new Set(jobs.map((j) => j.id));
      const newSelected = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) newSelected.add(id);
      });
      return newSelected;
    });
  }, [jobs]);

  const completedJobs = jobs.filter((j) => j.status === "completed");
  const selectedJobs = jobs.filter((j) => selectedIds.has(j.id));
  const selectedCompletedJobs = selectedJobs.filter((j) => j.status === "completed");

  const allSelected = jobs.length > 0 && selectedIds.size === jobs.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobs.map((j) => j.id)));
    }
  };

  const toggleSelect = (jobId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

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

  const handleDownloadSelected = async () => {
    if (selectedCompletedJobs.length === 0) return;

    setIsDownloading(true);
    try {
      if (selectedCompletedJobs.length === 1) {
        // Single file download
        await handleDownload(selectedCompletedJobs[0]);
      } else {
        // Multiple files - download as ZIP
        const blob = await converterApi.downloadMultiple(
          selectedCompletedJobs.map((j) => j.id)
        );
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tomd-export-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (completedJobs.length === 0) return;

    setIsDownloading(true);
    try {
      if (completedJobs.length === 1) {
        await handleDownload(completedJobs[0]);
      } else {
        const blob = await converterApi.downloadMultiple(
          completedJobs.map((j) => j.id)
        );
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tomd-export-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
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

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => converterApi.deleteJob(id))
      );
      selectedIds.forEach((id) => removeJob(id));
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (jobs.length === 0) return;

    setIsDeleting(true);
    try {
      await Promise.all(jobs.map((j) => converterApi.deleteJob(j.id)));
      jobs.forEach((j) => removeJob(j.id));
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

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
    <TooltipProvider>
      <div className="h-full flex flex-col space-y-3">
        {/* Header with bulk actions */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Conversion Results</h3>
            {hasActiveJobs && (
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            )}
          </div>

          {/* Bulk Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-2 sm:p-3 rounded-lg bg-muted/50 border">
            {/* Single toggle for select all/none */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="h-8 px-2 gap-1.5"
                >
                  <CheckSquare className={`h-4 w-4 ${allSelected ? "text-primary" : ""}`} />
                  <span className="hidden sm:inline text-xs">
                    {allSelected ? "Deselect" : "Select All"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {allSelected ? "Deselect all" : "Select all"}
              </TooltipContent>
            </Tooltip>

            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* Selection info */}
            <span className="text-xs sm:text-sm text-muted-foreground">
              {selectedIds.size > 0 ? (
                <span className="text-foreground font-medium">
                  {selectedIds.size} selected
                </span>
              ) : (
                `${jobs.length} items`
              )}
            </span>

            <div className="flex-1" />

            {/* Bulk action buttons */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Download selected */}
              {selectedCompletedJobs.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadSelected}
                      disabled={isDownloading}
                      className="h-8 gap-1.5 px-2 sm:px-3"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Download</span>
                      <span className="text-xs">({selectedCompletedJobs.length})</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download selected files</TooltipContent>
                </Tooltip>
              )}

              {/* Download all completed */}
              {completedJobs.length > 0 && selectedIds.size === 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadAll}
                      disabled={isDownloading}
                      className="h-8 gap-1.5 px-2 sm:px-3"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PackageOpen className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">All</span>
                      <span className="text-xs">({completedJobs.length})</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download all completed files</TooltipContent>
                </Tooltip>
              )}

              {/* Delete selected */}
              {selectedIds.size > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={isDeleting}
                      className="h-8 gap-1.5 px-2 sm:px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Delete</span>
                      <span className="text-xs">({selectedIds.size})</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete selected items</TooltipContent>
                </Tooltip>
              )}

              {/* Clear all */}
              {selectedIds.size === 0 && jobs.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteAll}
                      disabled={isDeleting}
                      className="h-8 gap-1.5 px-2 sm:px-3 text-muted-foreground hover:text-destructive"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Clear</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear all items</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {/* Job list */}
        <ScrollArea className="flex-1 min-h-0">
          <AnimatePresence mode="popLayout">
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                layout
              >
                <Card
                  className={`p-3 sm:p-4 mb-3 transition-colors ${
                    selectedIds.has(job.id)
                      ? "ring-2 ring-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedIds.has(job.id)}
                      onCheckedChange={() => toggleSelect(job.id)}
                      className="mt-0.5 flex-shrink-0"
                    />

                    {/* Status icon */}
                    {statusIcons[job.status]}

                    {/* File info */}
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="font-medium truncate cursor-default">
                            {job.file_info.name}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="break-all">{job.file_info.name}</p>
                        </TooltipContent>
                      </Tooltip>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-xs text-muted-foreground">
                        <span
                          className={`px-1.5 sm:px-2 py-0.5 rounded-full text-white text-[10px] sm:text-xs ${
                            converterColors[job.converter] || "bg-gray-500"
                          }`}
                        >
                          {job.converter}
                        </span>
                        <span className="hidden xs:inline">{formatBytes(job.file_info.size)}</span>
                        {job.output_size && (
                          <>
                            <span className="hidden sm:inline">→</span>
                            <span className="hidden sm:inline">{formatBytes(job.output_size)}</span>
                          </>
                        )}
                        {job.processing_time && (
                          <span className="hidden md:inline">{formatDuration(job.processing_time)}</span>
                        )}
                      </div>

                      {/* Progress bar */}
                      {(job.status === "pending" || job.status === "processing") && (
                        <Progress value={job.progress} className="mt-2 h-1" />
                      )}

                      {/* Error message */}
                      {job.status === "failed" && job.error && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-destructive text-xs mt-2 line-clamp-1 cursor-default">
                              {job.error}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-sm">
                            <p className="break-all">{job.error}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {/* Individual actions */}
                    <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                      {job.status === "completed" && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => setPreviewJobId(job.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Preview</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => handleDownload(job)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(job.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
