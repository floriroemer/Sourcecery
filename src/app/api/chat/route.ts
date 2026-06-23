import { streamText, stepCountIs, tool, convertToModelMessages } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { db } from "@/db";
import { chatMessages, notebooks } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// Available models via Vercel AI Gateway
const AVAILABLE_MODELS = [
  "openai/gpt-5-nano",
  "meta/llama-3.1-8b",
] as const;

type ModelId = (typeof AVAILABLE_MODELS)[number];

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await req.json();
  const { notebookId, model: requestedModel } = body;
  const messages = body.messages;

  if (!notebookId || !messages) {
    return new Response(
      JSON.stringify({ error: "Missing notebookId or messages" }),
      { status: 400 }
    );
  }

  // Validate model
  const model: ModelId = AVAILABLE_MODELS.includes(requestedModel)
    ? requestedModel
    : "openai/gpt-5-nano";

  // Verify notebook ownership
  const [notebook] = await db
    .select()
    .from(notebooks)
    .where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, userId)))
    .limit(1);

  if (!notebook) {
    return new Response(JSON.stringify({ error: "Notebook not found" }), {
      status: 404,
    });
  }

  // Save the latest user message to DB
  const lastUserMessage = [...messages].reverse().find(
    (m: { role: string }) => m.role === "user"
  );
  if (lastUserMessage) {
    const userText =
      typeof lastUserMessage.content === "string"
        ? lastUserMessage.content
        : Array.isArray(lastUserMessage.parts)
          ? lastUserMessage.parts
              .filter((p: { type: string }) => p.type === "text")
              .map((p: { text: string }) => p.text)
              .join("")
          : "";
    if (userText) {
      await db.insert(chatMessages).values({
        notebookId,
        role: "user",
        content: userText,
      });
    }
  }

  const systemPrompt = `You are Sourcecery, a helpful AI research assistant. You help users understand your uploaded sources.
For now, you don't have access to the user's uploaded documents (RAG integration coming soon).
Be honest about this limitation — let the user know you can't see their files yet, but still help with general questions.

You have access to tools. Use them when appropriate. You can think step by step and call tools in a loop until you have a complete answer.
Be concise, clear, and cite specific details when possible.

You have a fun tool called "showThinkingGif" that displays a funny thinking GIF to the user for 3 seconds.
Call this tool when you need to think about something or when the user asks a complex question — it gives the user a visual cue that you're working on it.
You can call it at most once per response.`;

  // Convert UI messages to model messages for the AI
  const modelMessages = await convertToModelMessages(messages);

  // Stream the response using Vercel AI Gateway with an agentic tool loop
  const result = streamText({
    model: gateway(model),
    system: systemPrompt,
    messages: modelMessages,
    stopWhen: stepCountIs(10), // Run up to 10 steps (agentic loop)
    tools: {
      showThinkingGif: tool({
        description:
          "Display a funny thinking GIF to the user for 3 seconds while you think. " +
          "Call this when you need to ponder a question or want to give the user a visual cue that you're working on their request.",
        inputSchema: z.object({}),
        execute: async () => {
          // Pick a random thinking GIF — the AI doesn't choose, we do
          const gifs = ["thinking", "thinking1", "thinking2", "thinking3"];
          const gif = gifs[Math.floor(Math.random() * gifs.length)];
          return {
            displayed: true,
            gif,
            durationMs: 3000,
          };
        },
      }),
    },
    onError: (error) => {
      console.error("[Chat] Stream error:", error);
    },
    onFinish: async ({ text }) => {
      // Save assistant response to DB after streaming completes
      if (text.trim()) {
        await db.insert(chatMessages).values({
          notebookId,
          role: "assistant",
          content: text,
        });
      }
    },
  });

  // Return as a UI message stream (compatible with useChat)
  return result.toUIMessageStreamResponse();
}