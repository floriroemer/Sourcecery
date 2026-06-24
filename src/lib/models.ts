/**
 * Model configuration constants.
 *
 * The actual model catalog is fetched dynamically from the Vercel AI Gateway
 * API — see src/lib/model-registry.ts for fetchAvailableModels().
 */

/** Maximum number of models a user can enable at once. */
export const MAX_ENABLED_MODELS = 10;

/** Default models enabled for new users. */
export const DEFAULT_ENABLED_MODELS = [
  "openai/gpt-4.1",
  "anthropic/claude-sonnet-4.5",
];