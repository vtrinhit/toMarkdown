import { create } from "zustand";
import type { FileInfo, ConversionJob, ConverterType } from "@/types";

interface AppState {
  // Uploaded files
  uploadedFiles: FileInfo[];
  addUploadedFiles: (files: FileInfo[]) => void;
  removeUploadedFile: (id: string) => void;
  clearUploadedFiles: () => void;

  // Selected converter
  selectedConverter: ConverterType;
  setSelectedConverter: (converter: ConverterType) => void;

  // Jobs
  jobs: ConversionJob[];
  setJobs: (jobs: ConversionJob[]) => void;
  addJobs: (jobs: ConversionJob[]) => void;
  updateJob: (id: string, updates: Partial<ConversionJob>) => void;
  removeJob: (id: string) => void;

  // UI State
  isConverting: boolean;
  setIsConverting: (value: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (value: boolean) => void;
  previewJobId: string | null;
  setPreviewJobId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Uploaded files
  uploadedFiles: [],
  addUploadedFiles: (files) =>
    set((state) => ({ uploadedFiles: [...state.uploadedFiles, ...files] })),
  removeUploadedFile: (id) =>
    set((state) => ({
      uploadedFiles: state.uploadedFiles.filter((f) => f.id !== id),
    })),
  clearUploadedFiles: () => set({ uploadedFiles: [] }),

  // Selected converter
  selectedConverter: "auto",
  setSelectedConverter: (converter) => set({ selectedConverter: converter }),

  // Jobs
  jobs: [],
  setJobs: (jobs) => set({ jobs }),
  addJobs: (jobs) => set((state) => ({ jobs: [...jobs, ...state.jobs] })),
  updateJob: (id, updates) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
    })),
  removeJob: (id) =>
    set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) })),

  // UI State
  isConverting: false,
  setIsConverting: (value) => set({ isConverting: value }),
  settingsOpen: false,
  setSettingsOpen: (value) => set({ settingsOpen: value }),
  previewJobId: null,
  setPreviewJobId: (id) => set({ previewJobId: id }),
}));
