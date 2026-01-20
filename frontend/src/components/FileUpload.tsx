import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  File,
  FileText,
  FileSpreadsheet,
  Image,
  Music,
  Code,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/stores/app";
import { converterApi } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import { useState } from "react";

const getFileIcon = (extension: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    pdf: <FileText className="h-5 w-5 text-red-500" />,
    docx: <FileText className="h-5 w-5 text-blue-500" />,
    doc: <FileText className="h-5 w-5 text-blue-500" />,
    xlsx: <FileSpreadsheet className="h-5 w-5 text-green-500" />,
    xls: <FileSpreadsheet className="h-5 w-5 text-green-500" />,
    csv: <FileSpreadsheet className="h-5 w-5 text-green-500" />,
    pptx: <FileText className="h-5 w-5 text-orange-500" />,
    ppt: <FileText className="h-5 w-5 text-orange-500" />,
    html: <Code className="h-5 w-5 text-purple-500" />,
    htm: <Code className="h-5 w-5 text-purple-500" />,
    json: <Code className="h-5 w-5 text-yellow-500" />,
    xml: <Code className="h-5 w-5 text-cyan-500" />,
    png: <Image className="h-5 w-5 text-pink-500" />,
    jpg: <Image className="h-5 w-5 text-pink-500" />,
    jpeg: <Image className="h-5 w-5 text-pink-500" />,
    gif: <Image className="h-5 w-5 text-pink-500" />,
    mp3: <Music className="h-5 w-5 text-indigo-500" />,
    wav: <Music className="h-5 w-5 text-indigo-500" />,
  };
  return iconMap[extension.toLowerCase()] || <File className="h-5 w-5 text-muted-foreground" />;
};

export function FileUpload() {
  const { uploadedFiles, addUploadedFiles, removeUploadedFile } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);
      try {
        const result = await converterApi.uploadFiles(acceptedFiles);
        addUploadedFiles(result.files);
      } catch (error) {
        console.error("Upload failed:", error);
      } finally {
        setIsUploading(false);
      }
    },
    [addUploadedFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const handleRemove = async (fileId: string) => {
    try {
      await converterApi.removeFile(fileId);
      removeUploadedFile(fileId);
    } catch (error) {
      console.error("Remove failed:", error);
      removeUploadedFile(fileId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          ) : (
            <Upload
              className={`h-12 w-12 transition-transform ${
                isDragActive ? "text-primary scale-110" : "text-muted-foreground"
              }`}
            />
          )}
          <div>
            <p className="text-lg font-medium">
              {isDragActive
                ? "Drop files here..."
                : isUploading
                ? "Uploading..."
                : "Drag & drop files here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse (PDF, Word, Excel, PowerPoint, HTML, Images, Audio, and more)
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ScrollArea className="h-[200px] rounded-lg border bg-muted/30 p-2">
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {uploadedFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, scale: 0.9 }}
                      layout
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background border"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {getFileIcon(file.extension)}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(file.size)} | .{file.extension}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
            <p className="text-sm text-muted-foreground mt-2">
              {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} selected
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
