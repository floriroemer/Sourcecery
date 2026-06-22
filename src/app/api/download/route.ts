import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl } from "@/lib/blob";

/**
 * GET /api/download?url=... — generate a signed download URL for a private blob.
 * The client calls this to get a temporary URL to view/download a source file.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const signedUrl = await getSignedUrl(url);
    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("Download URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}