import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { sources, notebooks } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { uploadToBlob } from "@/lib/blob";
import {
  ALL_ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE,
  fileCategory,
} from "@/lib/files";

/**
 * POST /api/upload — upload a file to Vercel Blob and create a source record.
 * Expects multipart form data with:
 *   - file: the uploaded file
 *   - notebookId: the notebook to attach the source to
 */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const notebookId = formData.get("notebookId") as string | null;

  if (!file || !notebookId) {
    return NextResponse.json(
      { error: "Missing file or notebookId" },
      { status: 400 }
    );
  }

  // Validate file type
  if (!ALL_ACCEPTED_MIME_TYPES.includes(file.type as never)) {
    return NextResponse.json(
      { error: `File type ${file.type} is not supported` },
      { status: 415 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File exceeds maximum size of 100MB" },
      { status: 413 }
    );
  }

  // Verify the notebook belongs to the user
  const [notebook] = await db
    .select()
    .from(notebooks)
    .where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, userId)))
    .limit(1);

  if (!notebook) {
    return NextResponse.json(
      { error: "Notebook not found" },
      { status: 404 }
    );
  }

  try {
    // Upload to Vercel Blob
    const blob = await uploadToBlob(file.name, file, file.type);

    // Create source record — status is "ready" since the file is stored
    // (will become "processing" → "ready" when we add embedding pipeline later)
    const [source] = await db
      .insert(sources)
      .values({
        notebookId,
        type: fileCategory(file.type).toLowerCase(),
        filename: file.name,
        blobUrl: blob.url,
        mimeType: file.type,
        sizeBytes: file.size,
        status: "ready",
      })
      .returning();

    // Revalidate dashboard so source count updates
    revalidatePath("/dashboard");

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}