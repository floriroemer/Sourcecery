"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Video,
  AudioLines,
  Presentation,
  FileType,
  File,
  Upload,
  Trash2,
  Loader2,
  Download,
  CheckCircle2,
} from "lucide-react";
import type { Source } from "@/db/schema";
import { deleteSource } from "@/app/actions/sources";
import { formatBytes } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE,
} from "@/lib/files";

function SourceIcon({ mimeType }: { mimeType: string }) {
  let Icon = File;
  if (mimeType === "application/pdf") Icon = FileText;
  else if (mimeType.includes("presentation")) Icon = Presentation;
  else if (mimeType.startsWith("video/")) Icon = Video;
  else if (mimeType.startsWith("audio/")) Icon = AudioLines;
  else if (mimeType.startsWith("text/")) Icon = FileType;
  return <Icon className="h-4 w-4 shrink-0 text-brand-600" />;
}

export function SourceList({
  notebookId,
  sources,
}: {
  notebookId: string;
  sources: Source[];
}) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);
      setError(null);

      try {
        for (const file of Array.from(files)) {
          if (file.size > MAX_FILE_SIZE) {
            setError(`${file.name} exceeds 100MB limit`);
            continue;
          }

          setUploadProgress(`Uploading ${file.name}...`);

          const formData = new FormData();
          formData.append("file", file);
          formData.append("notebookId", notebookId);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const data = await res.json();
            setError(data.error || "Upload failed");
          }
        }
        // Refresh server data to show new sources
        router.refresh();
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
    },
    [notebookId, router]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [handleUpload]
  );

  const handleDelete = async (sourceId: string) => {
    try {
      await deleteSource(sourceId, notebookId);
      router.refresh();
    } catch {
      setError("Failed to delete source");
    }
  };

  const handleDownload = async (source: Source) => {
    setDownloadingId(source.id);
    try {
      const res = await fetch(`/api/download?url=${encodeURIComponent(source.blobUrl)}`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      setError("Failed to download file");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-semibold">Sources</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Upload files to chat with
        </p>
      </div>

      {/* Upload dropzone */}
      <div className="p-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? "border-brand-500 bg-brand-50"
              : "border-border hover:border-brand-300 hover:bg-muted/50"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />
              {uploadProgress && (
                <p className="mt-2 text-xs text-brand-600">{uploadProgress}</p>
              )}
            </>
          ) : (
            <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {uploading ? "Uploading..." : "Drop files or click to browse"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.join(",")}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleUpload(e.target.files);
            }}
          />
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        )}
      </div>

      {/* Source list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {sources.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            No sources yet. Upload a file to get started.
          </p>
        ) : (
          <div className="space-y-1">
            {sources.map((source) => (
              <div
                key={source.id}
                className="group flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
              >
                <SourceIcon mimeType={source.mimeType} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {source.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(source.sizeBytes)}
                  </p>
                </div>
                {source.status === "pending" && (
                  <Badge variant="warning" className="shrink-0">
                    Pending
                  </Badge>
                )}
                {source.status === "ready" && (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
                )}
                {source.status === "error" && (
                  <Badge variant="outline" className="shrink-0 border-red-300 text-red-600">
                    Error
                  </Badge>
                )}
                <button
                  onClick={() => handleDownload(source)}
                  disabled={downloadingId === source.id}
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-brand-600 group-hover:opacity-100"
                  title="Download"
                >
                  {downloadingId === source.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(source.id)}
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}