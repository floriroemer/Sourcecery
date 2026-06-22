/**
 * Centralised list of accepted file types for source uploads.
 * Grouped by category for UI labels and validation.
 */
export const ACCEPTED_FILE_TYPES = {
  document: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  audio: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a"],
} as const;

export const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".pptx",
  ".txt",
  ".md",
  ".markdown",
  ".mp4",
  ".webm",
  ".mov",
  ".mp3",
  ".wav",
  ".m4a",
];

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export const ALL_ACCEPTED_MIME_TYPES = [
  ...ACCEPTED_FILE_TYPES.document,
  ...ACCEPTED_FILE_TYPES.video,
  ...ACCEPTED_FILE_TYPES.audio,
];

/**
 * Human-readable category label for a MIME type.
 */
export function fileCategory(mime: string): "Document" | "Video" | "Audio" | "Other" {
  if (ACCEPTED_FILE_TYPES.document.includes(mime as never)) return "Document";
  if (ACCEPTED_FILE_TYPES.video.includes(mime as never)) return "Video";
  if (ACCEPTED_FILE_TYPES.audio.includes(mime as never)) return "Audio";
  return "Other";
}

/**
 * Pick an icon name (for lucide-react) based on mime type.
 */
export function fileIconName(mime: string): string {
  const cat = fileCategory(mime);
  if (mime === "application/pdf") return "FileText";
  if (mime.includes("presentation")) return "Presentation";
  if (cat === "Document") return "FileType";
  if (cat === "Video") return "Video";
  if (cat === "Audio") return "AudioLines";
  return "File";
}