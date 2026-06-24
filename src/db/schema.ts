import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  vector,
  index,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Citation data stored with chat messages.
 * Populated when the AI calls the citeSource tool.
 */
export interface Citation {
  sourceId: string;
  filename: string;
  mimeType: string;
  blobUrl: string;
  quote: string;
  label: string;
}

/**
 * Users — synced from Clerk via webhook.
 * The Clerk user ID is the source of truth; this table holds app-specific data.
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  imageUrl: text("image_url"),
  // Array of model IDs the user has enabled for chat (max 10)
  enabledModels: jsonb("enabled_models").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  notebooks: many(notebooks),
}));

/**
 * Notebooks — a collection of sources with its own chat context.
 */
export const notebooks = pgTable(
  "notebooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("notebooks_user_id_idx").on(t.userId),
  })
);

export const notebooksRelations = relations(notebooks, ({ one, many }) => ({
  user: one(users, { fields: [notebooks.userId], references: [users.id] }),
  sources: many(sources),
  conversations: many(conversations),
}));

/**
 * Sources — individual files uploaded to a notebook.
 * Stored in Vercel Blob; this table holds metadata + processing status.
 */
export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "document" | "video" | "audio"
    filename: text("filename").notNull(),
    blobUrl: text("blob_url").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    // "pending" → "processing" → "ready" | "error"
    status: text("status").default("pending").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    notebookIdx: index("sources_notebook_id_idx").on(t.notebookId),
  })
);

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  notebook: one(notebooks, { fields: [sources.notebookId], references: [notebooks.id] }),
  embeddings: many(embeddings),
  sourceText: one(sourceTexts, {
    fields: [sources.id],
    references: [sourceTexts.sourceId],
  }),
  summaries: many(summaries),
  transcripts: many(transcripts),
}));

/**
 * Transcripts — transcribed text from audio/video sources.
 * Populated automatically when an audio file is uploaded.
 * Audio longer than 10 minutes is split into chunks, each transcribed separately.
 */
export const transcripts = pgTable(
  "transcripts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    language: text("language"),
    durationSeconds: integer("duration_seconds"),
    chunkCount: integer("chunk_count").default(1).notNull(),
    modelUsed: text("model_used"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sourceIdx: index("transcripts_source_id_idx").on(t.sourceId),
  })
);

export const transcriptsRelations = relations(transcripts, ({ one }) => ({
  source: one(sources, { fields: [transcripts.sourceId], references: [sources.id] }),
}));

/**
 * Source texts — extracted text content from a source file.
 * Populated when a PDF is parsed via RunPod/docling, or when a text file is uploaded.
 * This lets the AI read document content without re-sending the whole file each time.
 */
export const sourceTexts = pgTable(
  "source_texts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" })
      .unique(),
    content: text("content").notNull(),
    pages: integer("pages"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sourceIdx: index("source_texts_source_id_idx").on(t.sourceId),
  })
);

/**
 * Summaries — AI-generated summaries of individual sources.
 * The AI saves these so it doesn't have to re-read the full document each time.
 */
export const summaries = pgTable(
  "summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sourceIdx: index("summaries_source_id_idx").on(t.sourceId),
  })
);

export const summariesRelations = relations(summaries, ({ one }) => ({
  source: one(sources, { fields: [summaries.sourceId], references: [sources.id] }),
}));

/**
 * Notes — AI-saved notes about a notebook (key facts, findings, insights).
 * These persist across chat sessions so the AI has context without re-reading everything.
 */
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    // When true, this note has been converted into a source (text file in blob storage)
    isSource: boolean("is_source").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    notebookIdx: index("notes_notebook_id_idx").on(t.notebookId),
  })
);

export const notesRelations = relations(notes, ({ one }) => ({
  notebook: one(notebooks, { fields: [notes.notebookId], references: [notebooks.id] }),
}));

/**
 * Embeddings — chunked source content with vector embeddings (pgvector).
 * Ready for the later AI phase; not populated in this phase.
 */
export const embeddings = pgTable(
  "embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sourceIdx: index("embeddings_source_id_idx").on(t.sourceId),
  })
);

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  source: one(sources, { fields: [embeddings.sourceId], references: [sources.id] }),
}));

/**
 * Conversations — individual chat threads within a notebook.
 * Users can have multiple conversations per notebook, switch between them,
 * and continue past conversations.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    title: text("title").default("New conversation").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    notebookIdx: index("conversations_notebook_id_idx").on(t.notebookId),
  })
);

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  notebook: one(notebooks, { fields: [conversations.notebookId], references: [notebooks.id] }),
  messages: many(chatMessages),
}));

/**
 * Chat messages — conversation history per conversation.
 */
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // "user" | "assistant"
    content: text("content").notNull(),
    // JSON array of citations: [{ sourceId, filename, mimeType, blobUrl, quote, label }]
    citations: jsonb("citations").$type<Citation[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    conversationIdx: index("chat_messages_conversation_id_idx").on(t.conversationId),
  })
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(conversations, { fields: [chatMessages.conversationId], references: [conversations.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Notebook = typeof notebooks.$inferSelect;
export type NewNotebook = typeof notebooks.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;