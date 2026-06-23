/**
 * Catalog of all models available via Vercel AI Gateway.
 * Users can enable up to 10 of these in their settings.
 *
 * The IDs must match the GatewayModelId type from @ai-sdk/gateway.
 */
export interface ModelOption {
  id: string;
  label: string;
  provider: string;
}

export const ALL_MODELS: ModelOption[] = [
  // OpenAI
  { id: "openai/gpt-5-nano", label: "GPT-5 Nano", provider: "OpenAI" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI" },
  { id: "openai/gpt-5", label: "GPT-5", provider: "OpenAI" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  // Anthropic
  { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5", provider: "Anthropic" },
  { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", provider: "Anthropic" },
  // Google
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash", provider: "Google" },
  { id: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", provider: "Google" },
  // Meta
  { id: "meta/llama-3.1-8b", label: "Llama 3.1 8B", provider: "Meta" },
  { id: "meta/llama-3.1-70b", label: "Llama 3.1 70B", provider: "Meta" },
  { id: "meta/llama-3.3-70b", label: "Llama 3.3 70B", provider: "Meta" },
  // z.ai GLM
  { id: "zai/glm-5.2", label: "GLM-5.2", provider: "z.ai" },
  { id: "zai/glm-5.1", label: "GLM-5.1", provider: "z.ai" },
  { id: "zai/glm-5", label: "GLM-5", provider: "z.ai" },
  { id: "zai/glm-5-turbo", label: "GLM-5 Turbo", provider: "z.ai" },
  { id: "zai/glm-4.7", label: "GLM-4.7", provider: "z.ai" },
  { id: "zai/glm-4.7-flash", label: "GLM-4.7 Flash", provider: "z.ai" },
  { id: "zai/glm-4.6", label: "GLM-4.6", provider: "z.ai" },
  { id: "zai/glm-4.5", label: "GLM-4.5", provider: "z.ai" },
  { id: "zai/glm-4.5-air", label: "GLM-4.5 Air", provider: "z.ai" },
  // Moonshot Kimi
  { id: "moonshotai/kimi-k2.7-code", label: "Kimi K2.7 Code", provider: "Moonshot" },
  { id: "moonshotai/kimi-k2.6", label: "Kimi K2.6", provider: "Moonshot" },
  { id: "moonshotai/kimi-k2.5", label: "Kimi K2.5", provider: "Moonshot" },
  { id: "moonshotai/kimi-k2", label: "Kimi K2", provider: "Moonshot" },
  { id: "moonshotai/kimi-k2-thinking", label: "Kimi K2 Thinking", provider: "Moonshot" },
  // DeepSeek
  { id: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro", provider: "DeepSeek" },
  { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash", provider: "DeepSeek" },
  { id: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2", provider: "DeepSeek" },
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1", provider: "DeepSeek" },
  // Alibaba Qwen
  { id: "alibaba/qwen3.7-max", label: "Qwen 3.7 Max", provider: "Alibaba" },
  { id: "alibaba/qwen3.6-plus", label: "Qwen 3.6 Plus", provider: "Alibaba" },
  { id: "alibaba/qwen3.5-flash", label: "Qwen 3.5 Flash", provider: "Alibaba" },
  // Mistral
  { id: "mistral/mistral-large", label: "Mistral Large", provider: "Mistral" },
  { id: "mistral/codestral", label: "Codestral", provider: "Mistral" },
  // xAI
  { id: "xai/grok-4", label: "Grok 4", provider: "xAI" },
  { id: "xai/grok-4-fast", label: "Grok 4 Fast", provider: "xAI" },
  // Perplexity
  { id: "perplexity/sonar-pro", label: "Sonar Pro", provider: "Perplexity" },
  { id: "perplexity/sonar", label: "Sonar", provider: "Perplexity" },
  // Amazon
  { id: "amazon/nova-pro", label: "Nova Pro", provider: "Amazon" },
  { id: "amazon/nova-lite", label: "Nova Lite", provider: "Amazon" },
];

/** Maximum number of models a user can enable at once. */
export const MAX_ENABLED_MODELS = 10;

/** Default models enabled for new users. */
export const DEFAULT_ENABLED_MODELS = ["openai/gpt-5-nano", "meta/llama-3.1-8b"];

/** Get a model option by ID. */
export function getModelById(id: string): ModelOption | undefined {
  return ALL_MODELS.find((m) => m.id === id);
}

/** Get the label for a model ID, falling back to the ID itself. */
export function getModelLabel(id: string): string {
  return getModelById(id)?.label ?? id;
}