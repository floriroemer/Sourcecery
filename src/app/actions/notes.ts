"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { notes, notebooks, sources, sourceTexts } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { uploadToBlob } from "@/lib/blob";

/**
 * Get all notes for a notebook.
 */
export async function getNotes(notebookId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  // Verify ownership
  const [notebook] = await db
    .select({ id: notebooks.id })
    .from(notebooks)
    .where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, userId)))
    .limit(1);

  if (!notebook) return [];

  return db
    .select()
    .from(notes)
    .where(eq(notes.notebookId, notebookId))
    .orderBy(desc(notes.createdAt));
}

/**
 * Create a new note manually.
 */
export async function createNote(notebookId: string, title: string, content: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  // Verify ownership
  const [notebook] = await db
    .select({ id: notebooks.id })
    .from(notebooks)
    .where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, userId)))
    .limit(1);

  if (!notebook) throw new Error("Notebook not found");

  const [note] = await db
    .insert(notes)
    .values({ notebookId, title, content })
    .returning();

  revalidatePath(`/notebooks/${notebookId}`);
  return note;
}

/**
 * Delete a note.
 */
export async function deleteNote(noteId: string, notebookId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  await db
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.notebookId, notebookId)));

  revalidatePath(`/notebooks/${notebookId}`);
}

/**
 * Convert a note into a source — uploads the note content as a text file
 * to blob storage, creates a source record, and marks the note as isSource.
 */
export async function convertNoteToSource(noteId: string, notebookId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  // Get the note
  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.notebookId, notebookId)))
    .limit(1);

  if (!note) throw new Error("Note not found");

  if (note.isSource) {
    throw new Error("Note is already a source");
  }

  // Create a text file from the note content
  const textContent = `# ${note.title}\n\n${note.content}`;
  const filename = `note-${note.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.md`;
  const file = new File([textContent], filename, { type: "text/markdown" });

  // Upload to blob
  const blob = await uploadToBlob(filename, file, "text/markdown");

  // Create source record
  const [source] = await db
    .insert(sources)
    .values({
      notebookId,
      type: "document",
      filename,
      blobUrl: blob.url,
      mimeType: "text/markdown",
      sizeBytes: textContent.length,
      status: "ready",
    })
    .returning();

  // Save the text content to source_texts so the AI can read it
  await db
    .insert(sourceTexts)
    .values({
      sourceId: source.id,
      content: textContent,
    })
    .onConflictDoNothing();

  // Mark note as converted
  await db
    .update(notes)
    .set({ isSource: true })
    .where(eq(notes.id, noteId));

  revalidatePath(`/notebooks/${notebookId}`);
  revalidatePath("/dashboard");

  return { note, source };
}

/**
 * Convert all notes in a notebook into sources.
 */
export async function convertAllNotesToSources(notebookId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  // Get all notes that haven't been converted yet
  const unconvertedNotes = await db
    .select()
    .from(notes)
    .where(and(eq(notes.notebookId, notebookId), eq(notes.isSource, false)));

  let count = 0;
  for (const note of unconvertedNotes) {
    try {
      await convertNoteToSource(note.id, notebookId);
      count++;
    } catch (err) {
      console.error(`Failed to convert note ${note.id}:`, err);
    }
  }

  revalidatePath(`/notebooks/${notebookId}`);
  return { converted: count, total: unconvertedNotes.length };
}