"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Send,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Bot,
  Plus,
  MessageCircle,
  Trash2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getModelById } from "@/lib/models";
import { Markdown } from "@/components/markdown";
import {
  createConversation,
  deleteConversation,
} from "@/app/actions/conversations";
import { useRouter } from "next/navigation";

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export function ChatPanel({
  notebookId,
  enabledModels,
  conversations,
  activeConversationId,
  initialMessages,
}: {
  notebookId: string;
  enabledModels: string[];
  conversations: ConversationSummary[];
  activeConversationId: string;
  initialMessages: UIMessage[];
}) {
  const router = useRouter();

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
  const [convoMenuOpen, setConvoMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Recreate transport when model, notebookId, or conversation changes
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { notebookId, conversationId: activeConversationId, model },
      }),
    [notebookId, activeConversationId, model]
  );

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    transport,
    messages: initialMessages,
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

  // Find the active conversation title
  const activeConvo = conversations.find(
    (c) => c.id === activeConversationId
  );

  // Handle new conversation
  const handleNewConversation = useCallback(async () => {
    const convo = await createConversation(notebookId);
    router.push(`/notebooks/${notebookId}?c=${convo.id}`);
    router.refresh();
  }, [notebookId, router]);

  // Handle delete conversation
  const handleDeleteConversation = useCallback(
    async (convoId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      await deleteConversation(convoId, notebookId);
      router.refresh();
    },
    [notebookId, router]
  );

  // Format relative time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with conversation selector + model selector */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
        {/* Conversation selector dropdown */}
        <div className="relative">
          <button
            onClick={() => setConvoMenuOpen(!convoMenuOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <MessageCircle className="h-4 w-4 text-brand-600" />
            <span className="max-w-[180px] truncate">
              {activeConvo?.title ?? "New conversation"}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          {convoMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setConvoMenuOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-border bg-card p-1.5 shadow-xl">
                {/* New conversation button */}
                <button
                  onClick={() => {
                    handleNewConversation();
                    setConvoMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
                >
                  <Plus className="h-4 w-4" />
                  New conversation
                </button>

                {conversations.length > 0 && (
                  <div className="my-1 border-t border-border" />
                )}

                {/* Conversation list */}
                <div className="max-h-64 overflow-y-auto">
                  {conversations.map((convo) => (
                    <div
                      key={convo.id}
                      className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                        convo.id === activeConversationId
                          ? "bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-950/40 dark:ring-brand-800"
                          : ""
                      }`}
                    >
                      <button
                        onClick={() => {
                          router.push(
                            `/notebooks/${notebookId}?c=${convo.id}`
                          );
                          setConvoMenuOpen(false);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2"
                      >
                        <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{convo.title}</span>
                      </button>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatTime(convo.updatedAt)}
                      </span>
                      <button
                        onClick={(e) =>
                          handleDeleteConversation(convo.id, e)
                        }
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Model selector — prominent pill button */}
        <div className="relative ml-auto">
          <button
            onClick={() => setModelMenuOpen(!modelMenuOpen)}
            className="flex items-center gap-2 rounded-full border-2 border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm transition-all hover:border-brand-400 hover:bg-brand-100 hover:shadow-md dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300 dark:hover:bg-brand-900/60"
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
                        ? "bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-950/40 dark:ring-brand-800"
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
                      {m.provider.slice(0, 2).toUpperCase()}
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
              Upload files in the left panel, then ask questions. The AI can
              read your documents, search within them, and save summaries &
              notes. Powered by{" "}
              <span className="font-semibold text-brand-600">
                {selectedModel.label}
              </span>{" "}
              with an agentic tool loop.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((message) => {
              const text = getTextContent(message.parts);
              const toolParts = message.parts.filter((p) =>
                p.type.startsWith("tool-")
              );

              return (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[80%] space-y-2">
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
                          className="w-fit overflow-hidden rounded-2xl border border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/40"
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
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          message.role === "user"
                            ? "whitespace-pre-wrap bg-brand-600 text-white"
                            : "bg-card border border-border"
                        }`}
                      >
                        {message.role === "user" ? (
                          text
                        ) : (
                          <Markdown content={text} />
                        )}
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