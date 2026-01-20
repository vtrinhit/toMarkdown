import axios from "axios";
import type {
  ConversionJob,
  ConverterInfo,
  ConverterType,
  FileInfo,
} from "@/types";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const converterApi = {
  // Get all available converters
  getConverters: async (): Promise<ConverterInfo[]> => {
    const { data } = await api.get("/convert/converters");
    return data;
  },

  // Upload files
  uploadFiles: async (
    files: File[]
  ): Promise<{ files: FileInfo[]; count: number }> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    const { data } = await api.post("/convert/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  // Remove uploaded file
  removeFile: async (fileId: string): Promise<void> => {
    await api.delete(`/convert/upload/${fileId}`);
  },

  // Start conversion
  startConversion: async (
    fileIds: string[],
    converter: ConverterType
  ): Promise<{ jobs: ConversionJob[]; count: number }> => {
    const formData = new FormData();
    fileIds.forEach((id) => formData.append("file_ids", id));
    formData.append("converter", converter);
    const { data } = await api.post("/convert/start", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  // Get all jobs
  getJobs: async (): Promise<ConversionJob[]> => {
    const { data } = await api.get("/convert/jobs");
    return data;
  },

  // Get single job
  getJob: async (jobId: string): Promise<ConversionJob> => {
    const { data } = await api.get(`/convert/jobs/${jobId}`);
    return data;
  },

  // Delete job
  deleteJob: async (jobId: string): Promise<void> => {
    await api.delete(`/convert/jobs/${jobId}`);
  },

  // Download result
  downloadResult: async (jobId: string): Promise<Blob> => {
    const { data } = await api.get(`/convert/download/${jobId}`, {
      responseType: "blob",
    });
    return data;
  },

  // Preview result
  previewResult: async (
    jobId: string
  ): Promise<{ content: string; truncated: boolean; total_length: number }> => {
    const { data } = await api.get(`/convert/preview/${jobId}`);
    return data;
  },

  // Download multiple results as ZIP
  downloadMultiple: async (jobIds: string[]): Promise<Blob> => {
    const { data } = await api.post(
      "/convert/download-multiple",
      { job_ids: jobIds },
      { responseType: "blob" }
    );
    return data;
  },

  // Delete multiple jobs
  deleteMultiple: async (jobIds: string[]): Promise<void> => {
    await api.post("/convert/delete-multiple", { job_ids: jobIds });
  },
};

export default api;
