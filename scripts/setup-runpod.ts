/**
 * Setup script: creates a RunPod template + endpoint for the Docling PDF parser.
 *
 * Usage:
 *   npx tsx scripts/setup-runpod.ts
 *
 * Prerequisites:
 *   - RUNPOD_API_KEY in .env
 *   - Docker image built and pushed to GHCR (done via GitHub Actions)
 *
 * After running, add the returned endpoint ID to .env as RUNPOD_ENDPOINT_ID.
 */

import { createTemplate, createEndpoint } from "../src/lib/runpod";

async function main() {
  const imageName = "ghcr.io/floriroemer/runpod-docling-worker:master";

  console.log("Creating RunPod template...");
  const templateId = await createTemplate({
    imageName,
    name: "docling-pdf-parser",
    containerDiskGb: 10,
  });
  console.log(`  ✓ Template created: ${templateId}`);

  console.log("Creating RunPod endpoint (CPU-only, 0-1 workers)...");
  const endpointId = await createEndpoint({
    templateId,
    name: "docling-pdf-parser",
    workersMin: 0,
    workersMax: 1,
  });
  console.log(`  ✓ Endpoint created: ${endpointId}`);

  console.log("\nAdd this to your .env:");
  console.log(`RUNPOD_ENDPOINT_ID=${endpointId}`);
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});