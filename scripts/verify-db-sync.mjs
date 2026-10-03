#!/usr/bin/env node
/**
 * verify-db-sync — garante que a App Android (APK) e a versão Web
 * apontam para a MESMA base de dados Supabase.
 *
 * Compara:
 *   1. .env (fonte de verdade do build)
 *   2. Bundle Web (dist/assets/index-*.js)
 *   3. Assets nativos Android (android/app/src/main/assets/public/assets/index-*.js)
 *
 * Sai com código 1 se qualquer diferença for encontrada.
 * Uso: npm run verify:sync   (após npm run build + npx cap sync android)
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
let ok = true;
const fails = [];

function log(msg) { console.log(msg); }

/* 1. .env */
const envPath = join(root, ".env");
if (!existsSync(envPath)) {
  ok = false; fails.push(".env não encontrado");
  log("❌ .env não encontrado");
  process.exit(1);
}
const env = readFileSync(envPath, "utf8");
const envUrl = (env.match(/^VITE_SUPABASE_URL="?([^"\r\n]+)"?/m) || [])[1];
const envKey = (env.match(/^VITE_SUPABASE_PUBLISHABLE_KEY="?([^"\r\n]+)"?/m) || [])[1];
if (!envUrl || !envKey) { ok = false; fails.push("VITE_SUPABASE_URL/KEY ausentes no .env"); }
log(`📄 .env            → ${envUrl || "AUSENTE"}`);

/* extrai o primeiro par URL+key de um bundle JS */
function extractFromBundle(js) {
  const url = (js.match(/https:\/\/[a-z0-9-]+\.supabase\.co/) || [])[0];
  // anon key JWT do supabase (eyJ... typical)
  const key = (js.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/) || [])[0];
  return { url, key };
}

function checkBundle(label, dir) {
  if (!existsSync(dir)) {
    fails.push(`${label}: pasta ausente (${dir}) — corre ${label.includes("Android") ? "npx cap sync android" : "npm run build"} primeiro`);
    log(`⚠️  ${label}       → pasta ausente (skip)`);
    return;
  }
  const assetsDir = join(dir, "assets");
  let files = [];
  try {
    files = readdirSync(assetsDir).filter((f) => f.startsWith("index-") && f.endsWith(".js"));
  } catch { /* ignore */ }
  if (files.length === 0) {
    fails.push(`${label}: bundle index-*.js não encontrado`);
    log(`❌ ${label}       → bundle ausente`);
    return;
  }
  const js = readFileSync(join(assetsDir, files[0]), "utf8");
  const { url, key } = extractFromBundle(js);
  const urlMatch = url === envUrl;
  const keyMatch = key === envKey;
  if (!urlMatch) fails.push(`${label}: URL divergente (${url} ≠ ${envUrl})`);
  if (!keyMatch) fails.push(`${label}: KEY divergente`);
  log(`${urlMatch && keyMatch ? "✅" : "❌"} ${label.padEnd(16)} → ${url || "AUSENTE"} ${urlMatch && keyMatch ? "(= .env)" : "(≠ .env)"}`);
}

/* 2. Web dist */
checkBundle("Web (dist)", join(root, "dist"));

/* 3. Android nativo (assets já sincronizados pelo cap sync) */
checkBundle("App (Android)", join(root, "android", "app", "src", "main", "assets", "public"));

log("");
if (ok && fails.length === 0) {
  log("🎉 Sincronização confirmada: Web e App partilham a MESMA base de dados Supabase.");
} else {
  log("⚠️  Problemas de sincronização detetados:");
  fails.forEach((f) => log(`   - ${f}`));
  log("\nCorrige com:  npm run build && npx cap sync android");
  process.exit(1);
}
