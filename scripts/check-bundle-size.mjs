/**
 * Bundle size regression guard for Next.js App Router build output.
 *
 * Approach: Read build-manifest.json to find initial JS chunks (rootMainFiles
 * and polyfillFiles — the files loaded on every page), then compute each
 * file's gzipped size using zlib.gzipSync. Exits 1 if total exceeds 80kB.
 *
 * The manifest uses paths relative to .next/ (e.g., "static/chunks/foo.js").
 * We resolve these directly against packages/frontend/.next/.
 *
 * Note: The 80kB budget is currently exceeded due to aws-amplify (~68kB
 * gzipped alone) — a known architectural constraint from Phase 3. The CI
 * bundle-size job runs with continue-on-error: true until aws-amplify is
 * replaced or tree-shaken. The script still exits 1 to document the overage.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_BYTES = 80 * 1024; // 80 kB = 81920 bytes
const NEXT_DIR = "packages/frontend/.next";

// Read build manifest
let manifest;
try {
  manifest = JSON.parse(readFileSync(join(NEXT_DIR, "build-manifest.json"), "utf-8"));
} catch (err) {
  console.error(`ERROR: Could not read ${NEXT_DIR}/build-manifest.json`);
  console.error("Run 'npm run build --workspace=packages/frontend' first.");
  console.error(`Details: ${err.message}`);
  process.exit(1);
}

// Collect initial JS files: rootMainFiles + polyfillFiles
// rootMainFiles = JS always loaded in App Router (framework, main-app, webpack runtime)
// polyfillFiles = polyfills served on every page
const initialFiles = new Set();

for (const f of manifest.rootMainFiles ?? []) {
  if (f.endsWith(".js")) initialFiles.add(f);
}

for (const f of manifest.polyfillFiles ?? []) {
  if (f.endsWith(".js")) initialFiles.add(f);
}

if (initialFiles.size === 0) {
  console.error("ERROR: No initial JS files found in build-manifest.json (rootMainFiles + polyfillFiles).");
  console.error("Verify that the Next.js build completed successfully.");
  process.exit(1);
}

// Compute gzipped sizes for each initial file
// Manifest paths are relative to .next/ (e.g., "static/chunks/abc123.js")
const results = [];
let totalGzipped = 0;

for (const relativePath of initialFiles) {
  const filePath = join(NEXT_DIR, relativePath);
  let raw;
  try {
    raw = readFileSync(filePath);
  } catch {
    // Skip files missing on disk (unusual; log a warning below)
    console.warn(`  WARN: File not found on disk: ${filePath}`);
    continue;
  }
  const gzippedSize = gzipSync(raw).length;
  totalGzipped += gzippedSize;
  results.push({ file: relativePath, gzipped: gzippedSize });
}

// Sort by size descending for readability
results.sort((a, b) => b.gzipped - a.gzipped);

// Print summary table
const COL = 56;
console.log("\nBundle Size Report (gzipped initial JS)");
console.log("─".repeat(COL + 12));
console.log(`${"File".padEnd(COL)} ${"Size".padStart(10)}`);
console.log("─".repeat(COL + 12));
for (const { file, gzipped } of results) {
  const kb = (gzipped / 1024).toFixed(1);
  const truncated = file.length > COL ? "..." + file.slice(-(COL - 3)) : file;
  console.log(`${truncated.padEnd(COL)} ${(kb + " kB").padStart(10)}`);
}
console.log("─".repeat(COL + 12));
const totalKb = (totalGzipped / 1024).toFixed(1);
const budgetKb = (BUDGET_BYTES / 1024).toFixed(0);
console.log(`${"TOTAL".padEnd(COL)} ${(totalKb + " kB").padStart(10)}`);
console.log(`${"BUDGET".padEnd(COL)} ${(budgetKb + " kB").padStart(10)}`);
console.log("─".repeat(COL + 12));

if (totalGzipped > BUDGET_BYTES) {
  const overKb = ((totalGzipped - BUDGET_BYTES) / 1024).toFixed(1);
  console.error(
    `\nFAIL: Initial JS is ${totalKb} kB gzipped — ${overKb} kB over the ${budgetKb} kB budget.`,
  );
  console.error(`Reduce bundle size or adjust the budget in scripts/check-bundle-size.mjs.\n`);
  process.exit(1);
} else {
  const underKb = ((BUDGET_BYTES - totalGzipped) / 1024).toFixed(1);
  console.log(
    `\nPASS: Initial JS is ${totalKb} kB gzipped — ${underKb} kB under the ${budgetKb} kB budget.\n`,
  );
  process.exit(0);
}
