"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sources, notebooks } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";

export async function deleteSource(sourceId: string, notebookId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  // Verify the source belongs to a notebook owned by this user
  const [source] = await db
    .select()
    .from(sources)
    .innerJoin(notebooks, eq(sources.notebookId, notebooks.id))
    .where(
      and(
        eq(sources.id, sourceId),
        eq(notebooks.id, notebookId),
        eq(notebooks.userId, userId)
      )
    )
    .limit(1);

  if (!source) throw new Error("Source not found or unauthorized");

  await db.delete(sources).where(eq(sources.id, sourceId));

  revalidatePath(`/notebooks/${notebookId}`);
}