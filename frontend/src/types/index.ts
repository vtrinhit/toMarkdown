export interface FileInfo {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  extension: string;
}

export interface ConversionJob {
  id: string;
  file_info: FileInfo;
  converter: ConverterType;
  status: ConversionStatus;
  progress: number;
  created_at: string;
  completed_at: string | null;
  output_file: string | null;
  output_size: number | null;
  error: string | null;
  processing_time: number | null;
}

export type ConverterType =
  | "markitdown"
  | "docling"
  | "marker"
  | "pypandoc"
  | "unstructured"
  | "mammoth"
  | "html2text"
  | "auto";

export type ConversionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface ConverterInfo {
  id: ConverterType;
  name: string;
  description: string;
  supported_extensions: string[];
  requires_api_key: boolean;
}

export interface Settings {
  openai_api_key_set: boolean;
  openai_base_url: string | null;
}

export interface UploadedFile extends File {
  id?: string;
  preview?: string;
}
