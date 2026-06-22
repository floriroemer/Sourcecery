import { put, getDownloadUrl } from "@vercel/blob";

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
 * Generate a signed download URL for a private blob.
 * Expires after the given number of seconds (default 1 hour).
 */
export async function getSignedUrl(blobUrl: string, expiresInSeconds = 3600) {
  return getDownloadUrl(blobUrl, {
    expiresInSeconds,
  });
}