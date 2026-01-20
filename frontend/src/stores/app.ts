import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FileInfo, ConversionJob, ConverterType } from "@/types";

// File extension to converter mapping
export type FileConverterMapping = Record<string, ConverterType | "auto">;

// Default file extensions grouped by category
export const FILE_EXTENSIONS = {
  documents: ["pdf", "docx", "doc", "pptx", "ppt", "xlsx", "xls", "odt", "rtf"],
  web: ["html", "htm", "xhtml", "xml", "json", "csv", "tsv"],
  images: ["png", "jpg", "jpeg", "gif", "tiff", "bmp", "webp", "heic"],
  audio: ["mp3", "wav", "m4a", "ogg", "flac"],
  code: ["tex", "latex", "rst", "ipynb", "org"],
  ebooks: ["epub", "mobi", "fb2"],
  other: ["txt", "md", "eml", "msg", "zip"],
} as const;

export const ALL_EXTENSIONS = Object.values(FILE_EXTENSIONS).flat();

interface ConverterSettingsState {
  // Custom file type to converter mapping
  fileConverterMapping: FileConverterMapping;
  setFileConverterMapping: (ext: string, converter: ConverterType | "auto") => void;
  resetFileConverterMapping: () => void;

  // Whether custom settings mode is enabled
  useCustomSettings: boolean;
  setUseCustomSettings: (value: boolean) => void;
}

interface AppState extends ConverterSettingsState {
  // Uploaded files
  uploadedFiles: FileInfo[];
  addUploadedFiles: (files: FileInfo[]) => void;
  removeUploadedFile: (id: string) => void;
  clearUploadedFiles: () => void;

  // Selected converter
  selectedConverter: ConverterType | "custom";
  setSelectedConverter: (converter: ConverterType | "custom") => void;

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

  // Custom settings panel visibility
  customSettingsOpen: boolean;
  setCustomSettingsOpen: (value: boolean) => void;
}

// Get converter for a specific file extension
export const getConverterForExtension = (
  ext: string,
  mapping: FileConverterMapping,
  useCustom: boolean
): ConverterType => {
  if (!useCustom) return "auto";
  const converter = mapping[ext.toLowerCase()];
  return converter && converter !== "auto" ? converter : "auto";
};

// Create default mapping (all auto)
const createDefaultMapping = (): FileConverterMapping => {
  const mapping: FileConverterMapping = {};
  ALL_EXTENSIONS.forEach((ext) => {
    mapping[ext] = "auto";
  });
  return mapping;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
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

      // Custom settings
      customSettingsOpen: false,
      setCustomSettingsOpen: (value) => set({ customSettingsOpen: value }),

      // File converter mapping
      fileConverterMapping: createDefaultMapping(),
      setFileConverterMapping: (ext, converter) =>
        set((state) => ({
          fileConverterMapping: {
            ...state.fileConverterMapping,
            [ext.toLowerCase()]: converter,
          },
        })),
      resetFileConverterMapping: () =>
        set({ fileConverterMapping: createDefaultMapping() }),

      useCustomSettings: false,
      setUseCustomSettings: (value) => set({ useCustomSettings: value }),
    }),
    {
      name: "tomd-settings",
      partialize: (state) => ({
        fileConverterMapping: state.fileConverterMapping,
        useCustomSettings: state.useCustomSettings,
        selectedConverter: state.selectedConverter,
      }),
    }
  )
);
