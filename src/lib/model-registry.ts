import { gateway } from "@ai-sdk/gateway";

/**
 * Dynamic model registry — fetches all available models from the
 * Vercel AI Gateway API and caches them with a TTL.
 *
 * The API returns ~280+ models with id, name, description, pricing,
 * and provider info. It does NOT return capability flags (like "supports PDF"),
 * so we maintain a curated set of known PDF-capable model patterns.
 */

export interface GatewayModel {
  id: string;
  name: string;
  description?: string | null;
  provider: string; // e.g. "openai", "anthropic"
  pricing?: {
    input: string;
    output: string;
    cachedInputTokens?: string;
    cacheCreationInputTokens?: string;
  } | null;
}

// Cache
let cachedModels: GatewayModel[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Known PDF-capable model ID patterns.
 * These models can accept PDF files directly as input.
 * The gateway API doesn't expose this, so we curate it manually.
 */
const PDF_CAPABLE_PATTERNS: RegExp[] = [
  /^openai\/gpt-4o/,
  /^openai\/gpt-4\.1/,
  /^openai\/gpt-5$/,
  /^openai\/gpt-5-mini/,
  /^openai\/gpt-5\.1/,
  /^openai\/gpt-5\.2/,
  /^anthropic\/claude/,
  /^google\/gemini/,
  /^zai\/glm-4\.5v/,
  /^zai\/glm-4\.6v/,
  /^zai\/glm-5v/,
  /^alibaba\/qwen3-vl/,
];

/**
 * Check if a model ID supports direct PDF/file input.
 */
export function supportsPdfInput(modelId: string): boolean {
  return PDF_CAPABLE_PATTERNS.some((p) => p.test(modelId));
}

/**
 * Fetch all available language models from the Vercel AI Gateway.
 * Results are cached for 1 hour.
 */
export async function fetchAvailableModels(): Promise<GatewayModel[]> {
  // Return cache if fresh
  if (cachedModels && Date.now() - cacheTime < CACHE_TTL) {
    return cachedModels;
  }

  try {
    const response = await gateway.getAvailableModels();

    // Filter to language models only and map to our format
    const models: GatewayModel[] = response.models
      .filter((m) => m.modelType === "language" || m.modelType === null)
      .map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        provider: m.specification.provider,
        pricing: m.pricing
          ? {
              input: m.pricing.input,
              output: m.pricing.output,
              cachedInputTokens: m.pricing.cachedInputTokens,
              cacheCreationInputTokens: m.pricing.cacheCreationInputTokens,
            }
          : null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    cachedModels = models;
    cacheTime = Date.now();
    return models;
  } catch (error) {
    console.error("[ModelRegistry] Failed to fetch models:", error);
    // Return cache even if stale, or empty array
    return cachedModels ?? [];
  }
}

/**
 * Search available models by query string.
 * Matches against id, name, and provider.
 */
export async function searchModels(query: string): Promise<GatewayModel[]> {
  const models = await fetchAvailableModels();
  if (!query.trim()) return models;

  const lower = query.toLowerCase();
  return models.filter(
    (m) =>
      m.id.toLowerCase().includes(lower) ||
      m.name.toLowerCase().includes(lower) ||
      m.provider.toLowerCase().includes(lower)
  );
}

/**
 * Get a model by ID from the registry.
 */
export async function getModelInfo(
  modelId: string
): Promise<GatewayModel | undefined> {
  const models = await fetchAvailableModels();
  return models.find((m) => m.id === modelId);
}

/**
 * Get all unique provider names from available models, sorted.
 */
export async function getProviders(): Promise<string[]> {
  const models = await fetchAvailableModels();
  return [...new Set(models.map((m) => m.provider))].sort();
}

/**
 * Force-refresh the cache (e.g. when user clicks "refresh" in settings).
 */
export function invalidateModelCache() {
  cachedModels = null;
  cacheTime = 0;
}