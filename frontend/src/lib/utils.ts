import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDuration(seconds: number): string {
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

export function getFileIcon(extension: string): string {
  const icons: Record<string, string> = {
    pdf: "file-text",
    docx: "file-text",
    doc: "file-text",
    xlsx: "file-spreadsheet",
    xls: "file-spreadsheet",
    pptx: "presentation",
    ppt: "presentation",
    html: "code",
    htm: "code",
    csv: "file-spreadsheet",
    json: "braces",
    xml: "code",
    png: "image",
    jpg: "image",
    jpeg: "image",
    gif: "image",
    mp3: "music",
    wav: "music",
    txt: "file-text",
    md: "file-text",
  };
  return icons[extension.toLowerCase()] || "file";
}

export function getConverterColor(converter: string): string {
  const colors: Record<string, string> = {
    markitdown: "bg-blue-500",
    docling: "bg-purple-500",
    marker: "bg-green-500",
    pypandoc: "bg-orange-500",
    unstructured: "bg-pink-500",
    mammoth: "bg-yellow-500",
    html2text: "bg-cyan-500",
    auto: "bg-gray-500",
  };
  return colors[converter] || "bg-gray-500";
}
