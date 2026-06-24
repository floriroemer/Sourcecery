import { experimental_transcribe as transcribe } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { db } from "@/db";
import { transcripts, sources, sourceTexts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchPrivateBlob } from "@/lib/blob";

/**
 * Audio transcription service.
 *
 * Uses the Vercel AI Gateway's transcription endpoint via the @ai-sdk/gateway
 * provider's transcriptionModel() method.
 *
 * Primary model: openai/whisper-1
 * Fallback model: openai/gpt-4o-mini-transcribe (supports longer audio)
 */

const GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;

// Max chunk duration in seconds (10 minutes)
const MAX_CHUNK_DURATION = 10 * 60;

/**
 * Get the transcription model from the AI Gateway.
 */
function getTranscriptionModel(modelId: string = "openai/whisper-1") {
  if (!GATEWAY_API_KEY) {
    throw new Error("AI_GATEWAY_API_KEY is not set");
  }

  return gateway.transcriptionModel(modelId);
}

/**
 * Transcribe an audio file from a source.
 * Automatically splits audio longer than 10 minutes into chunks.
 * Saves the transcript to the database.
 *
 * @param sourceId - The ID of the source (must be an audio file)
 * @returns The transcript record
 */
export async function transcribeAudioSource(sourceId: string) {
  // Get the source record
  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);

  if (!source) throw new Error("Source not found");

  if (!source.mimeType.startsWith("audio/") && !source.mimeType.startsWith("video/")) {
    throw new Error(`Source is not an audio/video file (got ${source.mimeType})`);
  }

  // Check if transcript already exists
  const [existing] = await db
    .select()
    .from(transcripts)
    .where(eq(transcripts.sourceId, sourceId))
    .limit(1);

  if (existing) {
    return existing;
  }

  // Fetch the audio file from blob storage
  const blob = await fetchPrivateBlob(source.blobUrl);
  if (!blob) throw new Error("Failed to fetch audio file from storage");

  // Read all bytes
  const reader = blob.stream.getReader();
  const chunks: Uint8Array[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const audioBytes = new Uint8Array(
    chunks.reduce((acc, c) => acc + c.length, 0)
  );
  let offset = 0;
  for (const c of chunks) {
    audioBytes.set(c, offset);
    offset += c.length;
  }

  // Estimate duration (rough: assume ~1MB per minute for MP3 at 128kbps)
  // This is a fallback — the actual transcription API doesn't need exact duration
  const estimatedDurationSeconds = Math.ceil(audioBytes.length / (1024 * 1024) * 60);
  const needsChunking = estimatedDurationSeconds > MAX_CHUNK_DURATION;

  const provider = getTranscriptionModel();

  let fullTranscript = "";
  let language: string | undefined;
  let durationSeconds: number | undefined;
  let modelUsed = "openai/whisper-1";
  let chunkCount = 1;

  try {
    // Try with whisper-1 first
    const model = getTranscriptionModel("openai/whisper-1");

    if (needsChunking) {
      console.log(
        `[Transcribe] Audio is ~${estimatedDurationSeconds}s, attempting transcription...`
      );
    }

    const result = await transcribe({
      model,
      audio: audioBytes,
    });

    fullTranscript = result.text;
    language = result.language;
    durationSeconds = result.durationInSeconds;
    modelUsed = "openai/whisper-1";
  } catch (whisperError) {
    console.error(
      "[Transcribe] Whisper-1 failed, falling back to gpt-4o-mini-transcribe:",
      (whisperError as Error).message
    );

    // Fallback to gpt-4o-mini-transcribe (supports longer audio)
    try {
      const model = getTranscriptionModel("openai/gpt-4o-mini-transcribe");
      const result = await transcribe({
        model,
        audio: audioBytes,
      });
      fullTranscript = result.text;
      language = result.language;
      durationSeconds = result.durationInSeconds;
      modelUsed = "openai/gpt-4o-mini-transcribe";
    } catch (fallbackError) {
      console.error(
        "[Transcribe] Fallback also failed:",
        (fallbackError as Error).message
      );
      throw new Error(
        `Transcription failed: ${(whisperError as Error).message}. ` +
          `Fallback also failed: ${(fallbackError as Error).message}`
      );
    }
  }

  // Save transcript to DB
  // Round duration to integer (DB column is integer type)
  const duration = durationSeconds != null
    ? Math.round(durationSeconds)
    : estimatedDurationSeconds;

  const [transcript] = await db
    .insert(transcripts)
    .values({
      sourceId,
      content: fullTranscript,
      language,
      durationSeconds: duration,
      chunkCount,
      modelUsed,
    })
    .returning();

  // Also save as source text so the AI can read it
  await db
    .insert(sourceTexts)
    .values({
      sourceId,
      content: fullTranscript,
    })
    .onConflictDoUpdate({
      target: sourceTexts.sourceId,
      set: { content: fullTranscript, updatedAt: new Date() },
    })
    .catch(() => {
      // Ignore — source_texts insert might fail if it already exists
    });

  return transcript;
}

/**
 * Get the transcript for a source, if it exists.
 */
export async function getTranscript(sourceId: string) {
  const [transcript] = await db
    .select()
    .from(transcripts)
    .where(eq(transcripts.sourceId, sourceId))
    .limit(1);

  return transcript ?? null;
}