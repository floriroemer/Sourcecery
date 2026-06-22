import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { notebooks } from "@/db/schema";

/**
 * POST /api/chat — stub chat endpoint.
 * Saves the user message and returns a placeholder response.
 * Real LLM integration (OpenAI) is deferred to a later phase.
 */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notebookId, message } = await req.json();

  if (!notebookId || !message) {
    return NextResponse.json(
      { error: "Missing notebookId or message" },
      { status: 400 }
    );
  }

  // Verify notebook ownership
  const [notebook] = await db
    .select()
    .from(notebooks)
    .where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, userId)))
    .limit(1);

  if (!notebook) {
    return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
  }

  // Save user message
  await db.insert(chatMessages).values({
    notebookId,
    role: "user",
    content: message,
  });

  // Stub response — real AI integration coming later
  const response = `Thanks for your question! Once AI processing is enabled, I'll analyze your uploaded sources and provide a grounded answer with citations. For now, this is a placeholder response. Your message "${message.slice(0, 100)}" has been saved.`;

  // Save assistant response
  await db.insert(chatMessages).values({
    notebookId,
    role: "assistant",
    content: response,
  });

  return NextResponse.json({ response });
}