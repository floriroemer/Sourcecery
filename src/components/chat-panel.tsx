"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, MessageSquare, Sparkles, ChevronDown, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getModelById } from "@/lib/models";

export function ChatPanel({
  notebookId,
  enabledModels,
}: {
  notebookId: string;
  enabledModels: string[];
}) {
  // Build the model list from the user's enabled models
  const models = useMemo(
    () =>
      enabledModels
        .map((id) => {
          const opt = getModelById(id);
          return opt
            ? { id: opt.id, label: opt.label, provider: opt.provider }
            : null;
        })
        .filter((m): m is { id: string; label: string; provider: string } =>
          m !== null
        ),
    [enabledModels]
  );

  const [model, setModel] = useState<string>(models[0]?.id ?? "");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Recreate transport when model or notebookId changes
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { notebookId, model },
      }),
    [notebookId, model]
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    transport,
  });

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputRef.current?.value?.trim();
      if (!text) return;
      sendMessage({ text });
      if (inputRef.current) inputRef.current.value = "";
    },
    [sendMessage]
  );

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedModel = models.find((m) => m.id === model) ?? models[0];
  const isLoading = status === "submitted" || status === "streaming";

  // Extract text content from message parts
  const getTextContent = (parts: Array<{ type: string; text?: string }>) =>
    parts
      .filter((p) => p.type === "text")
      .map((p) => p.text ?? "")
      .join("");

  return (
    <div className="flex h-full flex-col">
      {/* Header with model selector */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
        <MessageSquare className="h-4 w-4 text-brand-600" />
        <span className="text-sm font-semibold">Chat</span>

        {/* Model selector — prominent pill button */}
        <div className="relative ml-auto">
          <button
            onClick={() => setModelMenuOpen(!modelMenuOpen)}
            className="flex items-center gap-2 rounded-full border-2 border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm transition-all hover:border-brand-400 hover:bg-brand-100 hover:shadow-md"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>{selectedModel.label}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {modelMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setModelMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl">
                <div className="mb-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Model
                </div>
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setModel(m.id);
                      setModelMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted ${
                      m.id === model
                        ? "bg-brand-50 ring-1 ring-brand-200"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        m.id === model
                          ? "bg-brand-600 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.provider === "OpenAI" ? "OA" : "ME"}
                    </div>
                    <div>
                      <div className="font-medium">{m.label}</div>
                      <div className="text-xs text-muted-foreground">
                        by {m.provider}
                      </div>
                    </div>
                    {m.id === model && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-brand-600" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
              <Sparkles className="h-7 w-7 text-brand-600" />
            </div>
            <h3 className="text-base font-semibold">
              Ask anything about your sources
            </h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Upload files in the left panel, then ask questions. AI responses
              are powered by{" "}
              <span className="font-semibold text-brand-600">
                {selectedModel.label}
              </span>{" "}
              with an agentic tool loop.
            </p>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠️ RAG integration coming soon — AI can&apos;t see your files yet.
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((message) => {
              const text = getTextContent(message.parts);
              const toolParts = message.parts.filter(
                (p) => p.type.startsWith("tool-")
              );

              return (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] space-y-2 ${
                      message.role === "user" ? "" : ""
                    }`}
                  >
                    {/* Tool invocations — show thinking GIF inline */}
                    {toolParts.map((part, i) => {
                      if (part.type !== "tool-showThinkingGif") return null;
                      const toolPart = part as {
                        type: string;
                        state: string;
                        input?: { gif?: string };
                        output?: { gif?: string; durationMs?: number };
                      };
                      const gifName =
                        toolPart.output?.gif ??
                        toolPart.input?.gif ??
                        "thinking";
                      return (
                        <div
                          key={i}
                          className="w-fit overflow-hidden rounded-2xl border border-brand-200 bg-brand-50"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/thinking-gifs/${gifName}.gif`}
                            alt="AI is thinking..."
                            className="block h-32 w-auto max-w-full object-contain"
                          />
                          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-700">
                            <span className="animate-pulse">🤔</span>
                            <span>AI is thinking...</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Text content */}
                    {text && (
                      <div
                        className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          message.role === "user"
                            ? "bg-brand-600 text-white"
                            : "bg-card border border-border"
                        }`}
                      >
                        {text}
                      </div>
                    )}

                    {/* Streaming indicator */}
                    {isLoading &&
                      message.role === "assistant" &&
                      !text &&
                      toolParts.length === 0 && (
                        <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-card px-4 py-2.5">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:0ms]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:150ms]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:300ms]" />
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
          {error.message.includes("rate-limited") ||
          error.message.includes("429") ? (
            <div>
              <p className="font-semibold">⚠️ Rate limit reached</p>
              <p className="mt-1">
                The AI Gateway free tier limit was hit. Try again in a minute,
                or upgrade your Vercel AI credits at{" "}
                <a
                  href="https://vercel.com/~/ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  vercel.com/~/ai
                </a>
                .
              </p>
            </div>
          ) : (
            error.message
          )}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-card p-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              placeholder="Ask a question about your sources..."
              rows={1}
              className="min-h-[44px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            {isLoading ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={stop}
                className="h-11 w-11 shrink-0"
                title="Stop"
              >
                <span className="h-3 w-3 rounded-sm bg-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}