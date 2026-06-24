import { tool } from "ai";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  sources,
  sourceTexts,
  summaries,
  notes,
  notebooks,
} from "@/db/schema";
import { fetchPrivateBlob } from "@/lib/blob";
import { parsePdfSync } from "@/lib/runpod";
import { supportsPdfInput } from "@/lib/model-registry";

/**
 * AI Tools for the Sourcecery agentic chat.
 *
 * These tools let the AI:
 *   1. List and read source documents (text files directly, PDFs via RunPod/docling)
 *   2. Save and retrieve summaries (so it doesn't re-read full docs each time)
 *   3. Save and retrieve notes (persistent context across chat sessions)
 *   4. Search within source text
 *
 * The AI is instructed to check summaries/notes FIRST before reading full documents.
 */

/**
 * Validate that a source belongs to a notebook owned by the current user.
 * Returns the source record or throws.
 */
async function verifySourceOwnership(
  sourceId: string,
  userId: string
) {
  const [source] = await db
    .select()
    .from(sources)
    .innerJoin(notebooks, eq(sources.notebookId, notebooks.id))
    .where(
      and(
        eq(sources.id, sourceId),
        eq(notebooks.userId, userId)
      )
    )
    .limit(1);

  if (!source) throw new Error("Source not found or unauthorized");
  return source;
}

/**
 * Validate that a notebook belongs to the current user.
 */
async function verifyNotebookOwnership(
  notebookId: string,
  userId: string
) {
  const [notebook] = await db
    .select()
    .from(notebooks)
    .where(and(eq(notebooks.id, notebookId), eq(notebooks.userId, userId)))
    .limit(1);

  if (!notebook) throw new Error("Notebook not found or unauthorized");
  return notebook;
}

/**
 * Create the full set of AI tools for a given notebook + user context.
 * Each tool closure captures notebookId and userId for security.
 */
export function createChatTools(notebookId: string, userId: string, modelId: string) {
  // Track the last shown GIF so we never repeat twice in a row
  let lastGif: string | null = null;

  // Check if the current model supports direct PDF input
  const modelSupportsPdf = supportsPdfInput(modelId);

  return {
    // ──────────────────────────────────────────────────────────────
    // 1. LIST SOURCES — see what files are in this notebook
    // ──────────────────────────────────────────────────────────────
    listSources: tool({
      description:
        "List all source documents uploaded to this notebook. " +
        "Returns filename, type, size, and status for each. " +
        "ALWAYS call this first to see what sources are available before reading any.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await db
          .select({
            id: sources.id,
            filename: sources.filename,
            type: sources.type,
            mimeType: sources.mimeType,
            sizeBytes: sources.sizeBytes,
            status: sources.status,
          })
          .from(sources)
          .where(eq(sources.notebookId, notebookId))
          .orderBy(sources.createdAt);

        return {
          count: result.length,
          sources: result.map((s) => ({
            id: s.id,
            filename: s.filename,
            type: s.type,
            mimeType: s.mimeType,
            sizeKB: Math.round(s.sizeBytes / 1024),
            status: s.status,
          })),
        };
      },
    }),

    // ──────────────────────────────────────────────────────────────
    // 2. READ SOURCE TEXT — read extracted text from a source
    // ──────────────────────────────────────────────────────────────
    readSourceText: tool({
      description:
        "Read the extracted text content of a source document. " +
        "Works for text files (txt, markdown) and PDFs that have already been parsed. " +
        "If the text hasn't been extracted yet, it will be extracted automatically " +
        "(for text files, directly; for PDFs, via the RunPod/docling parser). " +
        "TIP: Check getSummary first — if a summary exists, read that instead to save time. " +
        "Only read the full text if the summary doesn't have what you need.",
      inputSchema: z.object({
        sourceId: z.string().uuid().describe("The ID of the source to read"),
      }),
      execute: async ({ sourceId }) => {
        await verifySourceOwnership(sourceId, userId);

        // Check if text is already extracted
        const [existing] = await db
          .select()
          .from(sourceTexts)
          .where(eq(sourceTexts.sourceId, sourceId))
          .limit(1);

        if (existing) {
          return {
            sourceId,
            text: existing.content,
            pages: existing.pages,
            cached: true,
            length: existing.content.length,
          };
        }

        // Text not extracted yet — need to fetch and parse
        const [source] = await db
          .select()
          .from(sources)
          .where(eq(sources.id, sourceId))
          .limit(1);

        if (!source) throw new Error("Source not found");

        // For text-based files, read directly from blob
        if (
          source.mimeType.startsWith("text/") ||
          source.mimeType === "application/markdown"
        ) {
          const blob = await fetchPrivateBlob(source.blobUrl);
          if (!blob) throw new Error("Failed to fetch source file");

          const text = await blob.stream
            .getReader()
            .read()
            .then(({ value }) =>
              new TextDecoder().decode(value)
            );

          // Save to DB for future use
          await db
            .insert(sourceTexts)
            .values({
              sourceId,
              content: text,
            })
            .onConflictDoUpdate({
              target: sourceTexts.sourceId,
              set: { content: text, updatedAt: new Date() },
            });

          return {
            sourceId,
            text,
            cached: false,
            length: text.length,
          };
        }

        // For PDFs, use the RunPod/docling parser
        if (source.mimeType === "application/pdf") {
          const blob = await fetchPrivateBlob(source.blobUrl);
          if (!blob) throw new Error("Failed to fetch PDF from storage");

          // Read all bytes and convert to base64
          const reader = blob.stream.getReader();
          const chunks: Uint8Array[] = [];
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
          const bytes = new Uint8Array(
            chunks.reduce((acc, c) => acc + c.length, 0)
          );
          let offset = 0;
          for (const c of chunks) {
            bytes.set(c, offset);
            offset += c.length;
          }
          const pdfBase64 = Buffer.from(bytes).toString("base64");

          // Parse via RunPod
          const result = await parsePdfSync(pdfBase64, source.filename);

          // Save to DB
          await db
            .insert(sourceTexts)
            .values({
              sourceId,
              content: result.text,
              pages: result.pages,
            })
            .onConflictDoUpdate({
              target: sourceTexts.sourceId,
              set: {
                content: result.text,
                pages: result.pages,
                updatedAt: new Date(),
              },
            });

          return {
            sourceId,
            text: result.text,
            pages: result.pages,
            cached: false,
            parsed: "runpod",
            length: result.text.length,
          };
        }

        // Unsupported type
        return {
          sourceId,
          text: "",
          error: `Cannot read files of type ${source.mimeType}. Only text files and PDFs are supported.`,
        };
      },
    }),

    // ──────────────────────────────────────────────────────────────
    // 2b. READ SOURCE FILE — pass file directly to the model (for PDF-capable models)
    // ──────────────────────────────────────────────────────────────
    readSourceFile: tool({
      description:
        "Read a source file directly as a file attachment (PDF). " +
        "Use this instead of readSourceText when you need to see the actual PDF " +
        "with its layout, images, tables, and charts — not just extracted text. " +
        "Only works if the current model supports direct PDF input. " +
        "If the model doesn't support PDFs, use readSourceText instead (which uses docling).",
      inputSchema: z.object({
        sourceId: z.string().uuid().describe("The ID of the source to read"),
      }),
      execute: async ({ sourceId }) => {
        await verifySourceOwnership(sourceId, userId);

        // Check if the current model supports PDF input
        if (!modelSupportsPdf) {
          return {
            error:
              `The current model (${modelId}) does not support direct PDF input. ` +
              "Use readSourceText instead, which extracts text via the docling parser.",
          };
        }

        const [source] = await db
          .select()
          .from(sources)
          .where(eq(sources.id, sourceId))
          .limit(1);

        if (!source) throw new Error("Source not found");

        // Only PDFs are supported for direct file input
        if (source.mimeType !== "application/pdf") {
          return {
            error:
              "Direct file input is only supported for PDFs. " +
              "For text files, use readSourceText.",
          };
        }

        // Fetch the PDF from blob storage
        const blob = await fetchPrivateBlob(source.blobUrl);
        if (!blob) throw new Error("Failed to fetch PDF from storage");

        // Read all bytes and convert to base64 data URL
        const reader = blob.stream.getReader();
        const chunks: Uint8Array[] = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        const bytes = new Uint8Array(
          chunks.reduce((acc, c) => acc + c.length, 0)
        );
        let offset = 0;
        for (const c of chunks) {
          bytes.set(c, offset);
          offset += c.length;
        }
        const base64 = Buffer.from(bytes).toString("base64");
        const dataUrl = `data:application/pdf;base64,${base64}`;

        return {
          sourceId,
          filename: source.filename,
          mimeType: "application/pdf",
          dataUrl,
          sizeBytes: bytes.length,
          note: "The PDF has been attached. You can now see its full content including layout, images, and tables.",
        };
      },
    }),

    // ──────────────────────────────────────────────────────────────
    // 3. SEARCH SOURCE TEXT — keyword search within a source
    // ──────────────────────────────────────────────────────────────
    searchSourceText: tool({
      description:
        "Search for a keyword or phrase within a source document's extracted text. " +
        "Returns matching excerpts with surrounding context. " +
        "Use this when you need to find specific information in a large document " +
        "without reading the whole thing. The source must have been read first (readSourceText).",
      inputSchema: z.object({
        sourceId: z.string().uuid().describe("The ID of the source to search"),
        query: z
          .string()
          .min(2)
          .describe("The keyword or phrase to search for (case-insensitive)"),
        contextChars: z
          .number()
          .optional()
          .describe("Characters of context around each match (default 200)"),
      }),
      execute: async ({ sourceId, query, contextChars = 200 }) => {
        await verifySourceOwnership(sourceId, userId);

        const [sourceText] = await db
          .select()
          .from(sourceTexts)
          .where(eq(sourceTexts.sourceId, sourceId))
          .limit(1);

        if (!sourceText) {
          return {
            error:
              "No text has been extracted for this source yet. Call readSourceText first.",
          };
        }

        const text = sourceText.content;
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const matches: Array<{
          position: number;
          excerpt: string;
        }> = [];

        let pos = 0;
        while (true) {
          const idx = lowerText.indexOf(lowerQuery, pos);
          if (idx === -1) break;

          const start = Math.max(0, idx - contextChars);
          const end = Math.min(text.length, idx + query.length + contextChars);
          const excerpt =
            (start > 0 ? "..." : "") +
            text.slice(start, end) +
            (end < text.length ? "..." : "");

          matches.push({ position: idx, excerpt });
          pos = idx + query.length;

          if (matches.length >= 20) break; // Cap at 20 matches
        }

        return {
          query,
          totalMatches: matches.length,
          matches,
        };
      },
    }),

    // ──────────────────────────────────────────────────────────────
    // 4. SAVE SUMMARY — persist an AI-generated summary
    // ──────────────────────────────────────────────────────────────
    saveSummary: tool({
      description:
        "Save a summary of a source document to the database. " +
        "This persists across chat sessions so you don't have to re-read the full document next time. " +
        "ALWAYS save a summary after reading a document for the first time. " +
        "When you need info from a source, check getSummary FIRST — only read the full text if the summary is insufficient.",
      inputSchema: z.object({
        sourceId: z.string().uuid().describe("The ID of the source being summarized"),
        summary: z
          .string()
          .min(50)
          .describe("A comprehensive summary of the source (min 50 characters)"),
      }),
      execute: async ({ sourceId, summary }) => {
        await verifySourceOwnership(sourceId, userId);

        const [saved] = await db
          .insert(summaries)
          .values({ sourceId, content: summary })
          .returning();

        return {
          saved: true,
          summaryId: saved.id,
          length: summary.length,
        };
      },
    }),

    // ──────────────────────────────────────────────────────────────
    // 5. GET SUMMARY — retrieve a saved summary
    // ──────────────────────────────────────────────────────────────
    getSummary: tool({
      description:
        "Get the most recent saved summary for a source document. " +
        "ALWAYS call this BEFORE readSourceText — if a summary exists, it's much faster " +
        "and cheaper than reading the full document. Only fall back to readSourceText " +
        "if the summary doesn't contain the information you need.",
      inputSchema: z.object({
        sourceId: z.string().uuid().describe("The ID of the source to get the summary for"),
      }),
      execute: async ({ sourceId }) => {
        await verifySourceOwnership(sourceId, userId);

        const result = await db
          .select()
          .from(summaries)
          .where(eq(summaries.sourceId, sourceId))
          .orderBy(sql`${summaries.createdAt} DESC`)
          .limit(1);

        if (result.length === 0) {
          return {
            hasSummary: false,
            message:
              "No summary saved yet. Read the source with readSourceText, then save a summary with saveSummary.",
          };
        }

        return {
          hasSummary: true,
          summary: result[0].content,
          createdAt: result[0].createdAt,
        };
      },
    }),

    // ──────────────────────────────────────────────────────────────
    // 6. SAVE NOTE — persist a key finding or note about the notebook
    // ──────────────────────────────────────────────────────────────
    saveNote: tool({
      description:
        "Save a note about this notebook — key facts, findings, insights, or conclusions. " +
        "Notes persist across chat sessions and help you remember important context. " +
        "Save notes when you discover important information that might be useful later.",
      inputSchema: z.object({
        title: z
          .string()
          .min(3)
          .max(200)
          .describe("A short title for the note (3-200 characters)"),
        content: z
          .string()
          .min(10)
          .describe("The note content — be detailed and specific"),
      }),
      execute: async ({ title, content }) => {
        await verifyNotebookOwnership(notebookId, userId);

        const [saved] = await db
          .insert(notes)
          .values({ notebookId, title, content })
          .returning();

        return {
          saved: true,
          noteId: saved.id,
          title: saved.title,
        };
      },
    }),

    // ──────────────────────────────────────────────────────────────
    // 7. GET NOTES — retrieve all saved notes for this notebook
    // ──────────────────────────────────────────────────────────────
    getNotes: tool({
      description:
        "Get all saved notes for this notebook. " +
        "Call this at the start of a conversation to recall important context " +
        "from previous chat sessions. Notes contain key facts and findings " +
        "that were saved earlier.",
      inputSchema: z.object({}),
      execute: async () => {
        await verifyNotebookOwnership(notebookId, userId);

        const result = await db
          .select()
          .from(notes)
          .where(eq(notes.notebookId, notebookId))
          .orderBy(sql`${notes.createdAt} DESC`);

        return {
          count: result.length,
          notes: result.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            createdAt: n.createdAt,
          })),
        };
      },
    }),

    // ──────────────────────────────────────────────────────────────
    // 8. SHOW THINKING GIF — fun visual cue (random GIF)
    // ──────────────────────────────────────────────────────────────
    showThinkingGif: tool({
      description:
        "Display a funny thinking GIF to the user for 3 seconds while you think. " +
        "Call this when you need to ponder a question or want to give the user a visual cue that you're working on their request.",
      inputSchema: z.object({}),
      execute: async () => {
        const gifs = ["thinking", "thinking1", "thinking2", "thinking3"];
        // Pick a random GIF that's different from the last one shown
        const available = gifs.filter((g) => g !== lastGif);
        const gif = available[Math.floor(Math.random() * available.length)];
        lastGif = gif;
        return {
          displayed: true,
          gif,
          durationMs: 3000,
        };
      },
    }),
  };
}