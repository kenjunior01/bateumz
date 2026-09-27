#!/usr/bin/env node
// Remove .gz/.br compression artifacts from Capacitor android assets.
// The vite compression plugin emits them next to the originals; Android's
// mergeDebugAssets treats them as duplicate resources and fails the build.
import { readdirSync, unlinkSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const assets = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "android", "app", "src", "main", "assets", "public"
);

let removed = 0;
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".gz") || entry.name.endsWith(".br")) {
      unlinkSync(full);
      removed++;
    }
  }
}

try {
  walk(assets);
  console.log(`clean-apk-assets: removed ${removed} compression artifact(s)`);
} catch (e) {
  console.log(`clean-apk-assets: skipped (${String(e.message).slice(0, 80)})`);
}
