import { put, get } from "@vercel/blob";

/**
 * Upload a file to Vercel Blob storage (private store).
 * Returns the blob URL and other metadata.
 */
export async function uploadToBlob(
  filename: string,
  file: File | Buffer,
  contentType: string
) {
  const blob = await put(filename, file, {
    access: "private",
    contentType,
    addRandomSuffix: true,
  });

  return blob;
}

/**
 * Fetch a private blob and stream it to the client.
 * Returns the blob stream, content type, and other metadata.
 */
export async function fetchPrivateBlob(blobUrl: string) {
  const result = await get(blobUrl, { access: "private" });

  if (!result || result.statusCode !== 200) {
    return null;
  }

  return result;
}