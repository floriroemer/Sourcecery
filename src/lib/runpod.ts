/**
 * RunPod serverless client.
 *
 * Submits PDF-parsing jobs to a RunPod serverless endpoint and polls for
 * results. The endpoint is a CPU-only Flash worker that uses PyMuPDF to
 * extract text from PDFs.
 *
 * Deployed via: flash deploy (see flash/parse_pdf.py)
 * Docs: https://docs.runpod.io/serverless/endpoints/send-requests
 */

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;

const RUNPOD_BASE = "https://api.runpod.ai/v2";
const RUNPOD_REST = "https://rest.runpod.io/v1";

/**
 * Submit a synchronous job (runsync) to the RunPod endpoint.
 * Waits for the job to complete and returns the result.
 *
 * @param pdfBase64 - base64-encoded PDF bytes
 * @param filename - optional filename for logging
 * @param timeoutMs - how long to wait before giving up (default 120s)
 */
export async function parsePdfSync(
  pdfBase64: string,
  filename = "document.pdf",
  timeoutMs = 300_000
): Promise<{ text: string; pages: number; filename: string }> {
  if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
    throw new Error("RUNPOD_API_KEY or RUNPOD_ENDPOINT_ID is not set");
  }

  const url = `${RUNPOD_BASE}/${RUNPOD_ENDPOINT_ID}/runsync`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: { pdf_base64: pdfBase64, filename },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`RunPod error ${res.status}: ${body}`);
    }

    const data = await res.json();

    // /runsync returns either the result directly or an error
    if (data.error) {
      throw new Error(`RunPod worker error: ${data.error}`);
    }

    const output = data.output ?? data;
    if (output.error) {
      throw new Error(`RunPod worker error: ${output.error}`);
    }

    return {
      text: output.text ?? "",
      pages: output.pages ?? 0,
      filename: output.filename ?? filename,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Submit an asynchronous job (/run) and poll /status until complete.
 * Use this for large PDFs that may exceed the runsync timeout.
 */
export async function parsePdfAsync(
  pdfBase64: string,
  filename = "document.pdf",
  timeoutMs = 300_000
): Promise<{ text: string; pages: number; filename: string }> {
  if (!RUNPOD_API_KEY || !RUNPOD_ENDPOINT_ID) {
    throw new Error("RUNPOD_API_KEY or RUNPOD_ENDPOINT_ID is not set");
  }

  // Submit the job
  const submitUrl = `${RUNPOD_BASE}/${RUNPOD_ENDPOINT_ID}/run`;
  const submitRes = await fetch(submitUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RUNPOD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: { pdf_base64: pdfBase64, filename },
    }),
  });

  if (!submitRes.ok) {
    const body = await submitRes.text();
    throw new Error(`RunPod submit error ${submitRes.status}: ${body}`);
  }

  const job = await submitRes.json();
  const jobId = job.id;
  if (!jobId) {
    throw new Error("RunPod did not return a job ID");
  }

  // Poll for status
  const statusUrl = `${RUNPOD_BASE}/${RUNPOD_ENDPOINT_ID}/status/${jobId}`;
  const deadline = Date.now() + timeoutMs;
  const pollInterval = 3_000;

  while (Date.now() < deadline) {
    await sleep(pollInterval);
    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
    });

    if (!statusRes.ok) {
      const body = await statusRes.text();
      throw new Error(`RunPod status error ${statusRes.status}: ${body}`);
    }

    const status = await statusRes.json();

    if (status.status === "COMPLETED") {
      const output = status.output ?? {};
      if (output.error) {
        throw new Error(`RunPod worker error: ${output.error}`);
      }
      return {
        text: output.text ?? "",
        pages: output.pages ?? 0,
        filename: output.filename ?? filename,
      };
    }

    if (status.status === "FAILED" || status.status === "CANCELLED") {
      const err = status.error ?? "Job failed without error message";
      throw new Error(`RunPod job ${status.status}: ${err}`);
    }

    // IN_QUEUE or RUNNING — keep polling
  }

  throw new Error("RunPod job timed out");
}

/**
 * Create a RunPod serverless endpoint via the REST API.
 * Returns the endpoint ID.
 */
export async function createEndpoint(opts: {
  templateId: string;
  name?: string;
  workersMin?: number;
  workersMax?: number;
}): Promise<string> {
  if (!RUNPOD_API_KEY) {
    throw new Error("RUNPOD_API_KEY is not set");
  }

  const res = await fetch(`${RUNPOD_REST}/endpoints`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RUNPOD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: opts.name ?? "docling-pdf-parser",
      templateId: opts.templateId,
      computeType: "CPU",
      cpuFlavorIds: ["cpu3c"],
      workersMin: opts.workersMin ?? 0,
      workersMax: opts.workersMax ?? 1,
      idleTimeout: 5,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create endpoint: ${res.status} ${body}`);
  }

  const data = await res.json();
  return data.id;
}

/**
 * Create a RunPod template pointing at a Docker image.
 */
export async function createTemplate(opts: {
  imageName: string;
  name?: string;
  containerDiskGb?: number;
}): Promise<string> {
  if (!RUNPOD_API_KEY) {
    throw new Error("RUNPOD_API_KEY is not set");
  }

  const res = await fetch(`${RUNPOD_REST}/templates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RUNPOD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: opts.name ?? "docling-pdf-parser",
      imageName: opts.imageName,
      isServerless: true,
      category: "CPU",
      containerDiskInGb: opts.containerDiskGb ?? 10,
      dockerStartCmd: ["python", "-u", "handler.py"],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create template: ${res.status} ${body}`);
  }

  const data = await res.json();
  return data.id;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}