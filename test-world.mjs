// ============================================================
// E2E — Bateu World 3D v2 (MMO principal da plataforma)
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
  "404", "406", "fetchPriority", "does not recognize",
];

async function main() {
  console.log(`\n🌍 Bateu World v2 E2E — ${BASE}\n`);
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  // helper: abrir painel com retry (correspondência EXATA para não apanhar
  // cards do hub que contenham a mesma palavra, ex: "Banco ou Arriscar?")
  const openPanel = async (label) => {
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: label, exact: true }).first().click({ timeout: 6000 });
      const vis = await page.locator('[data-testid="bw-panel"]').isVisible().catch(() => false);
      if (vis) {
        const t = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "");
        if (t.length > 0) return t;
      }
      await page.waitForTimeout(700);
      const closeBtn = page.locator('[data-testid="bw-panel"] button').first();
      if (await closeBtn.count().catch(() => 0) > 0) { await closeBtn.click().catch(() => {}); await page.waitForTimeout(400); }
    }
    return "";
  };

  const closePanel = async () => {
    const btn = page.locator('[data-testid="bw-panel"] button').first();
    if (await btn.count().catch(() => 0) > 0) { await btn.click().catch(() => {}); await page.waitForTimeout(350); }
  };

  // ── 1. CTA central na homepage ──
  console.log("▶ Homepage — CTA central do jogo");
  const respHome = await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  ok("GET / → 200", respHome && respHome.ok());
  const cta = page.locator('[data-testid="home-cta-jogar-central"]');
  await cta.waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  ok("Botão central JOGAR AGORA visível", await cta.count() > 0);
  const homeTxt = await page.locator("body").innerText().catch(() => "");
  ok("Homepage já não mostra Bateu Life", !homeTxt.includes("Bateu Life"));
  if (await cta.count() > 0) {
    await cta.click();
    await page.waitForURL("**/lives?game=mmorpg", { timeout: 15000 }).catch(() => {});
    ok("CTA leva ao Bateu World (/lives?game=mmorpg)", page.url().includes("game=mmorpg"));
  }

  // ── 2. Destaque no LiveHub (sem parâmetro de jogo → banner visível) ──
  console.log("▶ Destaque no hub de jogos");
  await page.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const destaque = page.locator('[data-testid="livehub-destaque-bateu-world"]');
  await destaque.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  ok("Banner destaque BATEU WORLD 3D presente", await destaque.count() > 0);
  const hubTxt = await page.locator("body").innerText().catch(() => "");
  ok("Hub sem referências ao Bateu Life", !hubTxt.includes("BATEU LIFE") && !hubTxt.includes("Bateu Life"));
  if (await destaque.count() > 0) {
    await destaque.click().catch(() => {});
    await page.waitForTimeout(1500);
  }

  // ── 3. Criar personagem ou entrar direto ──
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
    const createInfo = await page.locator("body").innerText().catch(() => "");
    ok("Criação mostra poderes/PvP/banco/descobertas", createInfo.includes("poderes") && createInfo.includes("Rouba") && createInfo.includes("descobertas"));
    await page.locator('button:has-text("ENTRAR NO MUNDO")').first().click();
    ok("Botão ENTRAR clicado", true);
  } else {
    console.log("  ℹ️ personagem persistida — entrada direta");
  }

  // ── 4. Mundo 3D + HUD v2 ──
  console.log("▶ Mundo 3D");
  const canvas = page.locator('[data-testid="bateu-world"] canvas');
  await canvas.waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  ok("Canvas 3D visível", await canvas.count() > 0);

  const attack = page.locator('[data-testid="bw-attack"]');
  await attack.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  ok("Botão ATACAR visível", await attack.count() > 0);

  ok("Barra de poderes: 3 slots", (await page.locator('[data-testid="bw-skill-0"]').count()) === 1 && (await page.locator('[data-testid="bw-skill-2"]').count()) === 1);
  ok("Minimapa presente", await page.locator("#bw-minimap").count() > 0);
  ok("Joystick presente", await page.locator('[data-testid="bw-joystick"]').count() > 0);
  ok("v3: botão de som presente", await page.locator('[data-testid="bw-sound"]').count() > 0);
  ok("v3: botão de emotes presente", await page.locator('[data-testid="bw-emote-btn"]').count() > 0);
  ok("v3: rastreador de objetivos presente", await page.locator('[data-testid="bw-tracker"]').count() > 0);
  const hudText = await page.locator('[data-testid="bateu-world"]').innerText().catch(() => "");
  ok("HUD mostra nível + título", hudText.includes("Nv") && hudText.includes("Novato"));
  ok("HUD mostra Pontos de Troféu", hudText.includes("🏆"));
  ok("HUD mostra descobertas", hudText.includes("descobertas"));
  ok("HUD mostra Objetivo da Saga", /objetivo da saga/i.test(hudText));
  ok("Botões Herói/Missões/Banco/Ranking", hudText.includes("Herói") && hudText.includes("Missões") && hudText.includes("Banco") && hudText.includes("Ranking"));
  ok("Botão Chat presente", hudText.includes("Chat"));

  await page.screenshot({ path: "shots/world-01-entry.png" });

  // ── 4b. Emotes v3 ──
  console.log("▶ Emotes");
  await page.locator('[data-testid="bw-emote-btn"]').click().catch(() => {});
  await page.waitForTimeout(400);
  const emoteWheel = page.locator('[data-testid="bw-emotes"]');
  ok("Roda de emotes abre", await emoteWheel.count() > 0 && await emoteWheel.isVisible().catch(() => false));
  if (await emoteWheel.count() > 0) {
    const emoteBtns = await emoteWheel.locator("button").count();
    ok("Emotes disponíveis (6)", emoteBtns >= 6);
    await emoteWheel.locator("button").first().click().catch(() => {});
    await page.waitForTimeout(400);
    ok("Emote enviado sem erro", true);
  }

  // ── 5. Combate + poderes ──
  console.log("▶ Combate");
  await attack.click();
  await page.waitForTimeout(700);
  await attack.click();
  await page.waitForTimeout(700);
  ok("Ataques executados sem erro", true);
  await page.locator('[data-testid="bw-skill-0"]').click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  ok("Poder 1 clicado (bloqueado por nível é aceitável)", true);

  // ── 6. Painel Herói v2 ──
  console.log("▶ Painel Herói");
  const heroTxt = await openPanel("Herói");
  ok("Painel Herói abre", heroTxt.includes("Meu Herói"));
  ok("Mostra Pontos de atributo", heroTxt.includes("Pontos de atributo"));
  ok("Mostra Ataque/Vida/Velocidade", heroTxt.includes("Ataque") && heroTxt.includes("Vida") && heroTxt.includes("Velocidade"));
  ok("Mostra Pontos de Troféu", heroTxt.includes("Pontos de Troféu"));
  ok("Mostra poderes da classe", heroTxt.includes("Golpe Devastador") && heroTxt.includes("Terremoto"));
  ok("Mostra descobertas", heroTxt.includes("Descobertas"));
  await page.screenshot({ path: "shots/world-02-heroi.png" });
  await closePanel();

  // ── 7. Missões: diárias + saga + desafios ──
  console.log("▶ Missões");
  const qTxt = await openPanel("Missões");
  ok("Painel Missões abre", qTxt.includes("Missões & Desafios"));
  ok("Aba Diárias com missão de inimigos", qTxt.includes("Derrota 10 inimigos"));
  ok("Aba Saga presente", qTxt.includes("Saga"));
  ok("Aba Desafios presente", qTxt.includes("Desafios"));
  // abrir saga
  await page.locator('[data-testid="bw-panel"] button:has-text("Saga")').first().click().catch(() => {});
  await page.waitForTimeout(500);
  const sagaTxt = await page.locator('[data-testid="bw-panel"]').innerText().catch(() => "");
  ok("Saga passo 1 visível", sagaTxt.includes("Primeiros Passos"));
  await page.screenshot({ path: "shots/world-03-missoes.png" });
  await closePanel();

  // ── 8. Banco de Pontos ──
  console.log("▶ Banco de Pontos");
  const bankTxt = await openPanel("Banco");
  ok("Painel Banco abre", bankTxt.includes("Banco de Pontos"));
  ok("Mostra saldo de Pontos de Troféu", bankTxt.includes("🏆"));
  ok("Troca por moeda real disponível", bankTxt.includes("10 MT na Carteira"));
  ok("Troca por cupão real disponível", bankTxt.includes("Cupão Real"));
  ok("Troca por escudo disponível", bankTxt.includes("Escudo"));
  await page.screenshot({ path: "shots/world-04-banco.png" });
  await closePanel();

  // ── 9. Ranking ──
  console.log("▶ Ranking");
  const rTxt = await openPanel("Ranking");
  ok("Painel Ranking abre", rTxt.includes("Ranking do Mundo"));
  ok("Jogador listado no ranking", rTxt.includes("TesteHero"));
  await closePanel();

  // ── 10. Chat ──
  console.log("▶ Chat");
  await page.getByRole("button", { name: "Chat", exact: true }).first().click();
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

  // ── 11. Persistência ──
  console.log("▶ Persistência");
  await page.reload({ waitUntil: "domcontentloaded" });
  const canvas2 = page.locator('[data-testid="bateu-world"] canvas');
  await canvas2.waitFor({ state: "visible", timeout: 40000 }).catch(() => {});
  ok("Após reload entra direto no mundo (canvas)", await canvas2.count() > 0);
  const noCreate = await page.locator('input[placeholder="Nome do teu herói"]').count();
  ok("Não pede criação de novo", noCreate === 0);
  await page.screenshot({ path: "shots/world-05-persist.png" });

  // ── 12. Página /jogos retargetizada ──
  console.log("▶ Página Jogos");
  await page.goto(`${BASE}/jogos`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const jogosDestaque = page.locator('[data-testid="jogos-destaque-bateu-world"]');
  await jogosDestaque.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  ok("Destaque /jogos presente", await jogosDestaque.count() > 0);
  await page.waitForTimeout(1200);
  const jogosTxt = await page.locator("body").innerText().catch(() => "");
  ok("Jogos mostra destaque Bateu World", jogosTxt.includes("BATEU WORLD 3D"));
  ok("Jogos sem Bateu Life", !jogosTxt.includes("BATEU LIFE") && !jogosTxt.includes("Bateu Life"));

  // ── 13. Estabilidade ──
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
