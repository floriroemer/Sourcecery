import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { transcripts, sources, notebooks } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { transcribeAudioSource } from "@/lib/transcribe";

/**
 * GET /api/transcript?sourceId=... — get the transcript for a source.
 * Verifies the source belongs to a notebook owned by the current user.
 * If no transcript exists and retry=true, triggers transcription.
 */
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sourceId = req.nextUrl.searchParams.get("sourceId");
  const retry = req.nextUrl.searchParams.get("retry") === "true";

  if (!sourceId) {
    return NextResponse.json(
      { error: "Missing sourceId parameter" },
      { status: 400 }
    );
  }

  // Verify the source belongs to a notebook owned by the user
  const [sourceRow] = await db
    .select()
    .from(sources)
    .innerJoin(notebooks, eq(sources.notebookId, notebooks.id))
    .where(and(eq(sources.id, sourceId), eq(notebooks.userId, userId)))
    .limit(1);

  if (!sourceRow) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  const [transcript] = await db
    .select()
    .from(transcripts)
    .where(eq(transcripts.sourceId, sourceId))
    .limit(1);

  if (!transcript) {
    // If retry=true, trigger transcription now (synchronously)
    if (retry) {
      try {
        const result = await transcribeAudioSource(sourceId);
        return NextResponse.json({ transcript: result });
      } catch (err) {
        return NextResponse.json(
          {
            error: `Transcription failed: ${(err as Error).message}`,
            transcribing: false,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "No transcript available yet", transcribing: false },
      { status: 404 }
    );
  }

  return NextResponse.json({ transcript });
}