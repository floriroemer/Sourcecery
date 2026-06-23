import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { parsePdfSync } from "@/lib/runpod";

/**
 * POST /api/parse — parse a PDF and return extracted text.
 *
 * Accepts multipart form data:
 *   - file: the PDF file
 *
 * Or JSON:
 *   { "pdf_base64": "<base64 PDF>" }
 *
 * Returns:
 *   { "text": "...", "pages": 3, "filename": "doc.pdf" }
 */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  try {
    let pdfBase64: string;
    let filename: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "Missing 'file' in form data" },
          { status: 400 }
        );
      }

      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { error: `File type ${file.type} is not supported. Only PDF is allowed.` },
          { status: 415 }
        );
      }

      const bytes = await file.arrayBuffer();
      pdfBase64 = Buffer.from(bytes).toString("base64");
      filename = file.name;
    } else {
      const body = await req.json();
      pdfBase64 = body.pdf_base64;
      filename = body.filename ?? "document.pdf";

      if (!pdfBase64) {
        return NextResponse.json(
          { error: "Missing 'pdf_base64' in JSON body" },
          { status: 400 }
        );
      }
    }

    const result = await parsePdfSync(pdfBase64, filename);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Parse error:", error);
    const message = error instanceof Error ? error.message : "Failed to parse PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}