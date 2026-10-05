// ============================================================
// E2E — Bateu World 3D (MMO da plataforma)
// Requisitos: playwright (chromium), vite dev server na porta 8099
// Uso: node test-world.mjs
// ============================================================

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passed = 0;
let failed = 0;
const fails = [];

function ok(name, cond) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name}`); }
}

// Erros de consola que NÃO vêm do jogo (pré-existentes na plataforma)
const NOISE = [
  "navigator.vibrate",
  "<line> attribute",
  "validateDOMNesting",
  "two children with the same key",
  "same key",
  "Failed to load resource",
  "websocket", "WebSocket", "realtime", "supabase", "ERR_", "net::",
  "ResizeObserver", "AudioContext", "React Router Future Flag",
];

async function main() {
  console.log(`\n🌍 Bateu World E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  // helper: abrir painel com retry
  const openPanel = async (label) => {
    for (let i = 0; i < 3; i++) {
      await page.locator(`button:has-text("${label}")`).first().click({ timeout: 6000 });
      const vis = await page.locator('[data-testid="bw-panel"]').isVisible().catch(() => false);
      if (vis) {
        const t = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "");
        if (t.length > 0) return t;
      }
      await page.waitForTimeout(700);
      // se o painel não abriu, talvez tenha aberto e fechado; fecha-o se existir
      const closeBtn = page.locator('[data-testid="bw-panel"] button').first();
      if (await closeBtn.count().catch(() => 0) > 0) { await closeBtn.click().catch(() => {}); await page.waitForTimeout(400); }
    }
    return "";
  };

  const closePanel = async () => {
    const btn = page.locator('[data-testid="bw-panel"] button').first();
    if (await btn.count().catch(() => 0) > 0) { await btn.click().catch(() => {}); await page.waitForTimeout(350); }
  };

  // ── 1. Página carrega ──
  console.log("▶ Carregamento");
  const resp = await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok("GET /lives?game=mmorpg → 200", resp && resp.ok());

  // ── 2. Criar personagem ou entrar direto ──
  console.log("▶ Criação de personagem");
  const nameInput = page.locator('input[placeholder="Nome do teu herói"]');
  const hasCreate = await nameInput.waitFor({ state: "visible", timeout: 40000 }).then(() => true).catch(() => false);
  if (hasCreate) {
    const worldAlready = await page.locator('[data-testid="bateu-world"]').count();
    ok("Ecrã de criação visível", worldAlready === 0);
    await nameInput.fill("TesteHero");
    ok("Nome preenchido", true);
    await page.locator('button:has-text("Guerreiro")').first().click();
    ok("Classe Guerreiro selecionada", true);
    await page.locator('button:has-text("ENTRAR NO MUNDO")').first().click();
    ok("Botão ENTRAR clicado", true);
  } else {
    console.log("  ℹ️ personagem persistida — entrada direta");
  }

  // ── 3. Mundo 3D + HUD ──
  console.log("▶ Mundo 3D");
  const canvas = page.locator('[data-testid="bateu-world"] canvas');
  await canvas.waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  ok("Canvas 3D visível", await canvas.count() > 0);

  const attack = page.locator('[data-testid="bw-attack"]');
  await attack.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  ok("Botão ATACAR visível", await attack.count() > 0);

  ok("Minimapa presente", await page.locator("#bw-minimap").count() > 0);
  ok("Joystick presente", await page.locator('[data-testid="bw-joystick"]').count() > 0);
  const hudText = await page.locator('[data-testid="bateu-world"]').innerText().catch(() => "");
  ok("HUD mostra nível", hudText.includes("Nv"));
  ok("Botões Herói/Missões/Ranking", hudText.includes("Herói") && hudText.includes("Missões") && hudText.includes("Ranking"));
  ok("Botão Chat presente", hudText.includes("Chat"));

  await page.screenshot({ path: "shots/world-01-entry.png" });

  // ── 4. Combate ──
  console.log("▶ Combate");
  await attack.click();
  await page.waitForTimeout(700);
  await attack.click();
  await page.waitForTimeout(700);
  ok("Ataques executados sem erro", true);

  // ── 5. Painel Herói ──
  console.log("▶ Painel Herói");
  const heroTxt = await openPanel("Herói");
  ok("Painel Herói abre", heroTxt.includes("Meu Herói"));
  ok("Mostra Pontos disponíveis", heroTxt.includes("Pontos disponíveis"));
  ok("Mostra Ataque/Vida/Velocidade", heroTxt.includes("Ataque") && heroTxt.includes("Vida") && heroTxt.includes("Velocidade"));
  await page.screenshot({ path: "shots/world-02-heroi.png" });
  await closePanel();

  // ── 6. Missões ──
  console.log("▶ Missões");
  const qTxt = await openPanel("Missões");
  ok("Painel Missões abre", qTxt.includes("Missões Diárias"));
  ok("Missão de bugs presente", qTxt.includes("Derrota 10 Bugs"));
  ok("Missão de cupões presente", qTxt.includes("baú de cupões"));
  await page.screenshot({ path: "shots/world-03-missoes.png" });
  await closePanel();

  // ── 7. Ranking ──
  console.log("▶ Ranking");
  const rTxt = await openPanel("Ranking");
  ok("Painel Ranking abre", rTxt.includes("Ranking do Mundo"));
  ok("Jogador listado no ranking", rTxt.includes("TesteHero"));
  await page.screenshot({ path: "shots/world-04-ranking.png" });
  await closePanel();

  // ── 8. Chat ──
  console.log("▶ Chat");
  await page.locator('button:has-text("Chat")').first().click();
  const chatInput = page.locator('input[placeholder="Mensagem..."]');
  await chatInput.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  ok("Input de chat aparece", await chatInput.count() > 0);
  if (await chatInput.count() > 0) {
    await chatInput.fill("Olá mundo!");
    await chatInput.press("Enter");
    await page.waitForTimeout(500);
    const cTxt = await page.locator("body").innerText();
    ok("Mensagem enviada aparece", cTxt.includes("Olá mundo!"));
  }

  // ── 9. Persistência ──
  console.log("▶ Persistência");
  await page.reload({ waitUntil: "domcontentloaded" });
  const canvas2 = page.locator('[data-testid="bateu-world"] canvas');
  await canvas2.waitFor({ state: "visible", timeout: 40000 }).catch(() => {});
  ok("Após reload entra direto no mundo (canvas)", await canvas2.count() > 0);
  const noCreate = await page.locator('input[placeholder="Nome do teu herói"]').count();
  ok("Não pede criação de novo", noCreate === 0);
  await page.screenshot({ path: "shots/world-05-persist.png" });

  // ── 10. Estabilidade ──
  console.log("▶ Estabilidade");
  const relevantErrors = consoleErrors.filter((e) => !NOISE.some((n) => e.includes(n)));
  ok("Sem erros JS críticos", relevantErrors.length === 0);
  if (relevantErrors.length > 0) console.log("   erros:", relevantErrors.slice(0, 5));

  await browser.close();

  console.log(`\n════════════════════════════`);
  console.log(`  PASSOU: ${passed}  FALHOU: ${failed}`);
  if (fails.length) console.log("  Falhas: " + fails.join(" | "));
  console.log(`════════════════════════════\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(2); });
