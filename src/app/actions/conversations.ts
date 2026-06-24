"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { conversations, chatMessages, notebooks } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";

/**
 * Get all conversations for a notebook, ordered by most recently updated.
 */
export async function getConversations(notebookId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  // Verify notebook ownership
  const [notebook] = await db
    .select({ id: notebooks.id })
    .from(notebooks)
    .where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, userId)))
    .limit(1);

  if (!notebook) return [];

  return db
    .select()
    .from(conversations)
    .where(eq(conversations.notebookId, notebookId))
    .orderBy(desc(conversations.updatedAt));
}

/**
 * Create a new conversation in a notebook.
 * This is the server action version (callable from client components).
 */
export async function createConversation(notebookId: string, title?: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  // Verify notebook ownership
  const [notebook] = await db
    .select({ id: notebooks.id })
    .from(notebooks)
    .where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, userId)))
    .limit(1);

  if (!notebook) throw new Error("Notebook not found");

  const [conversation] = await db
    .insert(conversations)
    .values({
      notebookId,
      title: title ?? "New conversation",
    })
    .returning();

  revalidatePath(`/notebooks/${notebookId}`);
  return conversation;
}

/**
 * Create a new conversation without revalidatePath.
 * Safe to call during server-side rendering (e.g. in page components).
 */
export async function createConversationRender(
  notebookId: string,
  title?: string
) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  const [notebook] = await db
    .select({ id: notebooks.id })
    .from(notebooks)
    .where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, userId)))
    .limit(1);

  if (!notebook) throw new Error("Notebook not found");

  const [conversation] = await db
    .insert(conversations)
    .values({
      notebookId,
      title: title ?? "New conversation",
    })
    .returning();

  return conversation;
}

/**
 * Get a single conversation with its messages.
 * Verifies ownership via the notebook relation.
 */
export async function getConversationWithMessages(
  conversationId: string,
  notebookId: string
) {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  // Verify conversation belongs to a notebook owned by the user
  const [conversation] = await db
    .select()
    .from(conversations)
    .innerJoin(notebooks, eq(conversations.notebookId, notebooks.id))
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.notebookId, notebookId),
        eq(notebooks.userId, userId)
      )
    )
    .limit(1);

  if (!conversation) return null;

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(chatMessages.createdAt);

  // Convert to UIMessage format for useChat
  // Restore citations as tool-citeSource parts so the chat panel can render them
  const uiMessages = messages.map((msg) => {
    const parts: Array<any> = [{ type: "text" as const, text: msg.content }];

    // Restore citations as completed tool parts
    if (msg.citations && msg.citations.length > 0) {
      for (let ci = 0; ci < msg.citations.length; ci++) {
        const citation = msg.citations[ci];
        // Keep toolCallId under 64 chars (API limit)
        const toolCallId = `cit-${msg.id.slice(0, 8)}-${ci}`;
        parts.push({
          type: "tool-citeSource",
          state: "output-available",
          toolCallId,
          output: citation,
        });
      }
    }

    return {
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts,
    };
  });

  return {
    conversation: conversation.conversations,
    messages: uiMessages,
  };
}

/**
 * Delete a conversation and all its messages.
 */
export async function deleteConversation(
  conversationId: string,
  notebookId: string
) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  // Verify ownership
  const [conversation] = await db
    .select()
    .from(conversations)
    .innerJoin(notebooks, eq(conversations.notebookId, notebooks.id))
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(notebooks.userId, userId)
      )
    )
    .limit(1);

  if (!conversation) throw new Error("Conversation not found or unauthorized");

  await db
    .delete(conversations)
    .where(eq(conversations.id, conversationId));

  revalidatePath(`/notebooks/${notebookId}`);
}

/**
 * Update conversation title.
 */
export async function renameConversation(
  conversationId: string,
  title: string,
  notebookId: string
) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");

  // Verify ownership
  const [conversation] = await db
    .select()
    .from(conversations)
    .innerJoin(notebooks, eq(conversations.notebookId, notebooks.id))
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(notebooks.userId, userId)
      )
    )
    .limit(1);

  if (!conversation) throw new Error("Conversation not found or unauthorized");

  await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  revalidatePath(`/notebooks/${notebookId}`);
}