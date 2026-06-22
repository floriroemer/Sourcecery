import { NextRequest, NextResponse } from "next/server";
import { fetchPrivateBlob } from "@/lib/blob";

/**
 * GET /api/download?url=... — stream a private blob to the client.
 * The client calls this to download/view a source file stored in a private blob store.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const result = await fetchPrivateBlob(url);

    if (!result) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${result.blob.pathname}"`,
        "Cache-Control": "private, no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}