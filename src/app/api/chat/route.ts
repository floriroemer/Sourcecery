import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { db } from "@/db";
import { chatMessages, conversations, notebooks, users } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { DEFAULT_ENABLED_MODELS } from "@/lib/models";
import { createChatTools } from "@/lib/ai-tools";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await req.json();
  const { notebookId, conversationId, model: requestedModel } = body;
  const messages = body.messages;

  if (!notebookId || !conversationId || !messages) {
    return new Response(
      JSON.stringify({ error: "Missing notebookId, conversationId, or messages" }),
      { status: 400 }
    );
  }

  // Fetch the user's enabled models
  const [user] = await db
    .select({ enabledModels: users.enabledModels })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const enabledModels = user?.enabledModels?.length
    ? user.enabledModels
    : DEFAULT_ENABLED_MODELS;

  // Validate model is in the user's enabled list
  const model = enabledModels.includes(requestedModel)
    ? requestedModel
    : enabledModels[0];

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

  // Verify the conversation belongs to this notebook
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.notebookId, notebookId)
      )
    )
    .limit(1);

  if (!conversation) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), {
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
        conversationId,
        role: "user",
        content: userText,
      });

      // Auto-title the conversation from the first user message
      if (conversation.title === "New conversation") {
        const title = userText.slice(0, 50) + (userText.length > 50 ? "..." : "");
        await db
          .update(conversations)
          .set({ title, updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));
      } else {
        // Just update the timestamp
        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));
      }
    }
  }

  const systemPrompt = `You are Sourcecery, a helpful AI research assistant. You help users understand their uploaded sources.

You have access to tools that let you read the user's uploaded documents, transcribe audio, save summaries, and take notes.

## IMPORTANT: Tool Usage Strategy

When a user asks about their sources, follow this order:
1. **Call getNotes first** — check if you have saved notes from previous sessions
2. **Call listSources** — see what files are in the notebook
3. **Call getSummary for each relevant source** — check if a summary already exists
4. **Only if no summary exists, read the document:**
   - Use **getTranscript** for audio/video sources (transcribes via Whisper if needed)
   - Use **readSourceFile** for PDFs if you support direct PDF input (you can see layout, images, tables)
   - Use **readSourceText** for text files, or for PDFs if you don't support direct PDF input (extracts text via docling)
5. **After reading a document, call saveSummary** — so you don't have to re-read it next time
6. **Call saveNote** for any important findings you discover

This strategy saves time and tokens — always check summaries and notes BEFORE reading full documents.

You can think step by step and call tools in a loop until you have a complete answer.
Be concise, clear, and cite specific details from the sources when possible.

You also have a fun tool called "showThinkingGif" that displays a funny thinking GIF to the user.
Call it when you're about to do complex work or read documents.`;

  // Convert UI messages to model messages for the AI.
  // Filter out parts that don't match the ModelMessage schema:
  // - file parts (from readSourceFile dataUrl)
  // - incomplete tool calls (input-streaming state)
  // - tool calls without outputs (input-available without output-available)
  const cleanedMessages = messages
    .map((msg: any) => ({
      ...msg,
      parts: msg.parts?.filter((part: any) => {
        // Drop file/data parts
        if (part.type === "file") return false;

        // For tool parts, only keep completed ones (with output)
        if (part.type?.startsWith("tool-")) {
          // Keep only tool parts that have output available
          return part.state === "output-available" || part.state === "output-error";
        }

        // Keep text, reasoning, and everything else
        return true;
      }),
    }))
    // Drop messages that have no parts after filtering
    .filter((msg: any) => msg.parts && msg.parts.length > 0);

  const modelMessages = await convertToModelMessages(cleanedMessages);

  // Create tools with notebook + user context for security
  const tools = createChatTools(notebookId, userId, model);

  // Stream the response using Vercel AI Gateway with an agentic tool loop
  const result = streamText({
    model: gateway(model),
    system: systemPrompt,
    messages: modelMessages,
    stopWhen: stepCountIs(10), // Run up to 10 steps (agentic loop)
    tools,
    onError: ({ error }) => {
      const err = error as Error;
      console.error("[Chat] Stream error:", err.message);

      // Check for rate limit errors and log a helpful message
      if (
        err.message.includes("rate-limited") ||
        err.message.includes("429") ||
        err.message.includes("RateLimit")
      ) {
        console.error(
          "[Chat] Rate limited by AI Gateway. Free tier limits exceeded. " +
            "Upgrade at https://vercel.com to get unrestricted access."
        );
      }
    },
    onFinish: async ({ text }) => {
      // Save assistant response to DB after streaming completes
      if (text.trim()) {
        await db.insert(chatMessages).values({
          conversationId,
          role: "assistant",
          content: text,
        });
        // Update conversation timestamp
        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));
      }
    },
  });

  // Return as a UI message stream (compatible with useChat)
  return result.toUIMessageStreamResponse();
}