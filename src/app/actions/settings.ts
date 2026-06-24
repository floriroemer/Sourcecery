"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { MAX_ENABLED_MODELS, DEFAULT_ENABLED_MODELS } from "@/lib/models";
import { fetchAvailableModels, invalidateModelCache } from "@/lib/model-registry";

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
 *   - All model IDs exist in the gateway's available models
 *   - No more than MAX_ENABLED_MODELS are enabled
 */
export async function updateEnabledModels(modelIds: string[]) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  // Validate count
  if (modelIds.length > MAX_ENABLED_MODELS) {
    throw new Error(`You can enable at most ${MAX_ENABLED_MODELS} models`);
  }

  // Validate all IDs against the dynamic gateway model list.
  // If the list is empty (API unavailable), skip validation.
  // Models that were enabled before but no longer exist in the gateway
  // are allowed (so the user can deselect them) — we only reject NEW
  // model IDs that aren't in the gateway.
  const available = await fetchAvailableModels();
  if (available.length > 0) {
    const validIds = new Set(available.map((m) => m.id));
    // Get currently enabled models so we don't reject stale ones
    const [user] = await db
      .select({ enabledModels: users.enabledModels })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const currentlyEnabled = new Set(user?.enabledModels ?? []);
    for (const id of modelIds) {
      if (!validIds.has(id) && !currentlyEnabled.has(id)) {
        throw new Error(`Invalid model ID: ${id}`);
      }
    }
  }

  await db
    .update(users)
    .set({ enabledModels: modelIds, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

/**
 * Fetch all available models from the Vercel AI Gateway API.
 * Returns ~280+ models with id, name, description, provider, and pricing.
 * Cached for 1 hour on the server side.
 */
export async function getAvailableModels() {
  return fetchAvailableModels();
}

/**
 * Force-refresh the model cache (e.g. when user clicks "Refresh" in settings).
 */
export async function refreshModelCache() {
  invalidateModelCache();
  return fetchAvailableModels();
}