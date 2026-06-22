"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notebooks, sources } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { z } from "zod";

const createNotebookSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function createNotebook(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const parsed = createNotebookSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const [notebook] = await db
    .insert(notebooks)
    .values({ ...parsed.data, userId })
    .returning();

  revalidatePath("/dashboard");
  redirect(`/notebooks/${notebook.id}`);
}

export async function getNotebooks() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  return db
    .select()
    .from(notebooks)
    .where(eq(notebooks.userId, userId))
    .orderBy(desc(notebooks.updatedAt));
}

export async function getNotebook(id: string) {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const [notebook] = await db
    .select()
    .from(notebooks)
    .where(and(eq(notebooks.id, id), eq(notebooks.userId, userId)))
    .limit(1);

  return notebook ?? null;
}

export async function getNotebookWithSources(id: string) {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const [notebook] = await db
    .select()
    .from(notebooks)
    .where(and(eq(notebooks.id, id), eq(notebooks.userId, userId)))
    .limit(1);

  if (!notebook) return null;

  const notebookSources = await db
    .select()
    .from(sources)
    .where(eq(sources.notebookId, id))
    .orderBy(desc(sources.createdAt));

  return { notebook, sources: notebookSources };
}

export async function updateNotebook(id: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const parsed = createNotebookSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  await db
    .update(notebooks)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(notebooks.id, id), eq(notebooks.userId, userId)));

  revalidatePath("/dashboard");
  revalidatePath(`/notebooks/${id}`);
}

export async function deleteNotebook(id: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  await db
    .delete(notebooks)
    .where(and(eq(notebooks.id, id), eq(notebooks.userId, userId)));

  revalidatePath("/dashboard");
}