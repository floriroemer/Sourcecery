import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  vector,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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
  messages: many(chatMessages),
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
 * Chat messages — conversation history per notebook.
 */
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // "user" | "assistant"
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    notebookIdx: index("chat_messages_notebook_id_idx").on(t.notebookId),
  })
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  notebook: one(notebooks, { fields: [chatMessages.notebookId], references: [notebooks.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Notebook = typeof notebooks.$inferSelect;
export type NewNotebook = typeof notebooks.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;