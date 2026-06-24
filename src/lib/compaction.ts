/**
 * Context window management — compacts messages when approaching the
 * model's context window limit.
 *
 * Context window sizes are fetched dynamically from the Vercel AI Gateway
 * REST API at /v1/models/{modelId}, which returns `context_window` and
 * `max_tokens` per model.
 */

const GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const GATEWAY_BASE = "https://ai-gateway.vercel.sh/v1";

// Cache: modelId -> { contextWindow, maxTokens, fetchedAt }
const modelCache = new Map<
  string,
  { contextWindow: number; maxTokens: number; fetchedAt: number }
>();

const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const DEFAULT_CONTEXT_WINDOW = 128_000;

/**
 * Fetch the context window for a model from the AI Gateway API.
 * Cached for 1 hour.
 */
export async function getContextWindow(
  modelId: string
): Promise<number> {
  // Check cache
  const cached = modelCache.get(modelId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.contextWindow;
  }

  if (!GATEWAY_API_KEY) {
    return DEFAULT_CONTEXT_WINDOW;
  }

  try {
    const res = await fetch(`${GATEWAY_BASE}/models/${modelId}`, {
      headers: { Authorization: `Bearer ${GATEWAY_API_KEY}` },
    });

    if (!res.ok) {
      console.error(`[Compaction] Failed to fetch model info for ${modelId}: ${res.status}`);
      return DEFAULT_CONTEXT_WINDOW;
    }

    const data = await res.json();
    const contextWindow = data.context_window ?? DEFAULT_CONTEXT_WINDOW;
    const maxTokens = data.max_tokens ?? 0;

    modelCache.set(modelId, {
      contextWindow,
      maxTokens,
      fetchedAt: Date.now(),
    });

    return contextWindow;
  } catch (err) {
    console.error(`[Compaction] Error fetching model info:`, (err as Error).message);
    return DEFAULT_CONTEXT_WINDOW;
  }
}

/**
 * Rough token estimate: ~4 characters per token for English text.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate the total token count of a JSON-serialized message array.
 */
export function estimateMessageTokens(messages: any[]): number {
  let total = 0;
  for (const msg of messages) {
    total += 4; // overhead per message
    if (msg.content) {
      if (typeof msg.content === "string") {
        total += estimateTokens(msg.content);
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.text) total += estimateTokens(part.text);
          if (part.output) total += estimateTokens(JSON.stringify(part.output));
          if (part.input) total += estimateTokens(JSON.stringify(part.input));
        }
      }
    }
  }
  return total;
}

/**
 * Compact messages when approaching 80% of the model's context window.
 *
 * Fetches the model's context window from the AI Gateway API, estimates
 * the current token count, and if at/above 80%, replaces older messages
 * with a summary placeholder while keeping the last 6 messages intact.
 *
 * @param messages - The model messages to compact
 * @param modelId - The model ID (e.g. "openai/gpt-4.1")
 * @returns The compacted messages (or original if under threshold)
 */
export async function compactMessages(
  messages: any[],
  modelId: string
): Promise<any[]> {
  const contextWindow = await getContextWindow(modelId);
  const threshold = Math.floor(contextWindow * 0.8); // 80%

  const estimatedTokens = estimateMessageTokens(messages);

  // If we're under 80%, no compaction needed
  if (estimatedTokens < threshold) {
    return messages;
  }

  console.log(
    `[Compaction] Estimated ${estimatedTokens} tokens, threshold ${threshold} (context window ${contextWindow}). Compacting...`
  );

  // Keep the last 6 messages fully intact
  const KEEP_RECENT = 6;
  if (messages.length <= KEEP_RECENT) {
    return messages;
  }

  const recentMessages = messages.slice(-KEEP_RECENT);
  const olderMessages = messages.slice(0, -KEEP_RECENT);

  const compactedCount = olderMessages.length;
  const toolCallCount = olderMessages.filter(
    (m) =>
      m.role === "assistant" &&
      Array.isArray(m.content) &&
      m.content.some(
        (p: any) => p.type === "tool-call" || p.type === "tool-result"
      )
  ).length;

  const summaryMessage = {
    role: "system" as const,
    content: `[Conversation history compacted — ${compactedCount} earlier messages summarized to save context. ` +
      `This included ${toolCallCount} tool calls (source reads, searches, etc.). ` +
      `Key information from these messages has been saved as summaries and notes in the database. ` +
      `If you need details from an earlier source, call getSummary or readSourceText to re-read it.]`,
  };

  return [summaryMessage, ...recentMessages];
}