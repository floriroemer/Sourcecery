"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { ALL_MODELS, MAX_ENABLED_MODELS, DEFAULT_ENABLED_MODELS } from "@/lib/models";

/**
 * Get the current user's enabled model IDs.
 * Falls back to DEFAULT_ENABLED_MODELS if the user has none set.
 */
export async function getEnabledModels(): Promise<string[]> {
  const userId = await getCurrentUserId();
  if (!userId) return DEFAULT_ENABLED_MODELS;

  const [user] = await db
    .select({ enabledModels: users.enabledModels })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const models = user?.enabledModels ?? [];
  return models.length > 0 ? models : DEFAULT_ENABLED_MODELS;
}

/**
 * Update the current user's enabled models.
 * Validates that:
 *   - All model IDs exist in ALL_MODELS
 *   - No more than MAX_ENABLED_MODELS are enabled
 */
export async function updateEnabledModels(modelIds: string[]) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  // Validate count
  if (modelIds.length > MAX_ENABLED_MODELS) {
    throw new Error(`You can enable at most ${MAX_ENABLED_MODELS} models`);
  }

  // Validate all IDs are valid
  const validIds = new Set(ALL_MODELS.map((m) => m.id));
  for (const id of modelIds) {
    if (!validIds.has(id)) {
      throw new Error(`Invalid model ID: ${id}`);
    }
  }

  await db
    .update(users)
    .set({ enabledModels: modelIds, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}