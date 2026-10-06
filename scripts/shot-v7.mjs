// Screenshot dedicado do mundo v7 (canvas em destaque) — espelha o fluxo do E2E
import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const tok = { access_token: "x." + Date.now(), token_type: "bearer", expires_in: 315360000, expires_at: Math.floor(Date.now() / 1000) + 315360000, refresh_token: "r-" + Date.now(), user: { id: "e2e00000-1111-4222-8333-444455556666", aud: "authenticated", role: "authenticated", email: "shot@bateu.mz", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: { display_name: "ShotHero" }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } };
await page.addInitScript((t) => { try { localStorage.setItem("sb-ngxrdpplyghlugoowjqj-auth-token", JSON.stringify(t)); } catch {} }, tok);
await page.goto("http://localhost:8099/lives?game=mmorpg", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3000);
// criação (espelha o E2E)
const nameInput = page.locator('input[placeholder="Nome do teu herói"]');
const hasCreate = await nameInput.waitFor({ state: "visible", timeout: 40000 }).then(() => true).catch(() => false);
if (hasCreate) {
  await nameInput.fill("ShotHero");
  await page.locator('button:has-text("Guerreiro")').first().click().catch(() => {});
  await page.locator('[data-testid="bw-av-random"]').click().catch(() => {});
  await page.locator('button:has-text("ENTRAR NO MUNDO")').first().click().catch(() => {});
}
await page.waitForSelector('[data-testid="bateu-world"] canvas', { timeout: 40000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: "shots/v7-mundo-biomas.png" });
// evento de meteoros em ação
await page.evaluate(() => { const e = window.__bw; if (e && e.debugForceEvent) e.debugForceEvent("meteors"); });
await page.waitForTimeout(3600);
await page.screenshot({ path: "shots/v7-meteoros.png" });
// aurora: forçar noite (avançar 3/4 do ciclo com teleporte não é possível; captura normal) — frenesi
await page.evaluate(() => { const e = window.__bw; if (e && e.debugForceEvent) e.debugForceEvent("frenzy"); });
await page.waitForTimeout(1200);
await page.screenshot({ path: "shots/v7-frenesi.png" });
await browser.close();
console.log("shots v7 ok");
