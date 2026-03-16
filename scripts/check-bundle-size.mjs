/**
 * Bundle size regression guard for Next.js App Router build output.
 *
 * Approach: Read build-manifest.json to find initial JS chunks, then compute
 * each file's gzipped size using zlib.gzipSync. Exits 1 if total exceeds 80kB.
 *
 * Note: The 80kB budget is currently exceeded due to aws-amplify (~68kB gzipped).
 * This is a known Phase 3 architectural constraint. The CI bundle-size job runs
 * with continue-on-error: true until aws-amplify is replaced.
 */

import { readFileSync } from "fs";
import { gzipSync } from "zlib";

const BUDGET_BYTES = 80 * 1024; // 80kB
const FRONTEND_NEXT = "packages/frontend/.next";

// Read build manifest
let manifest;
try {
  manifest = JSON.parse(readFileSync(`${FRONTEND_NEXT}/build-manifest.json`, "utf-8"));
} catch (err) {
  console.error(`ERROR: Could not read ${FRONTEND_NEXT}/build-manifest.json`);
  console.error("Run 'npm run build --workspace=packages/frontend' first.");
  process.exit(1);
}

// Collect all initial JS files from rootMainFiles and pages/_app
// rootMainFiles are always loaded on every page in App Router
const initialFiles = new Set();

if (manifest.rootMainFiles) {
  for (const f of manifest.rootMainFiles) {
    if (f.endsWith(".js")) initialFiles.add(f);
  }
}

// Also include any files from the root layout (pages key may include /_app or /index)
if (manifest.pages) {
  for (const [, files] of Object.entries(manifest.pages)) {
    if (Array.isArray(files)) {
      for (const f of files) {
        if (f.endsWith(".js")) initialFiles.add(f);
      }
    }
  }
}

if (initialFiles.size === 0) {
  console.error("ERROR: No initial JS files found in build-manifest.json.");
  console.error("Check that the build completed successfully.");
  process.exit(1);
}

// Compute gzipped sizes
const results = [];
let totalGzipped = 0;

for (const relativePath of initialFiles) {
  // relativePath looks like /_next/static/chunks/foo.js
  const filePath = `packages/frontend/.next${relativePath.replace("/_next", "")}`;
  let raw;
  try {
    raw = readFileSync(filePath);
  } catch {
    // Skip files that don't exist on disk (e.g. polyfills already inlined)
    continue;
  }
  const gzipped = gzipSync(raw).length;
  totalGzipped += gzipped;
  results.push({ file: relativePath, gzipped });
}

// Sort by size descending for readability
results.sort((a, b) => b.gzipped - a.gzipped);

// Print summary table
console.log("\nBundle Size Report (gzipped initial JS)");
console.log("─".repeat(72));
console.log(`${"File".padEnd(55)} ${"Size".padStart(10)}`);
console.log("─".repeat(72));
for (const { file, gzipped } of results) {
  const kb = (gzipped / 1024).toFixed(1);
  const truncated = file.length > 54 ? "..." + file.slice(-51) : file;
  console.log(`${truncated.padEnd(55)} ${(kb + " kB").padStart(10)}`);
}
console.log("─".repeat(72));
const totalKb = (totalGzipped / 1024).toFixed(1);
console.log(`${"TOTAL".padEnd(55)} ${(totalKb + " kB").padStart(10)}`);
console.log(`${"BUDGET".padEnd(55)} ${((BUDGET_BYTES / 1024).toFixed(1) + " kB").padStart(10)}`);
console.log("─".repeat(72));

if (totalGzipped > BUDGET_BYTES) {
  const overKb = ((totalGzipped - BUDGET_BYTES) / 1024).toFixed(1);
  console.log(
    `\nFAIL: Initial JS is ${totalKb} kB gzipped — ${overKb} kB over the ${BUDGET_BYTES / 1024} kB budget.\n`,
  );
  process.exit(1);
} else {
  const underKb = ((BUDGET_BYTES - totalGzipped) / 1024).toFixed(1);
  console.log(
    `\nPASS: Initial JS is ${totalKb} kB gzipped — ${underKb} kB under the ${BUDGET_BYTES / 1024} kB budget.\n`,
  );
  process.exit(0);
}
