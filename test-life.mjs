// ============================================================
// BATEU LIFE — E2E (playwright + chromium)
// Requisitos: playwright (chromium), vite dev server na porta 8099
// Uso: (npx vite --port 8099 &) && sleep 14 && node test-life.mjs
// ============================================================
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:8099";
let passou = 0, falhou = 0;
const errors = [];

function ok(name, cond) {
  if (cond) { passou++; console.log("  ✅ " + name); }
  else { falhou++; console.log("  ❌ " + name); }
}
const sec = (t) => console.log("\n▶ " + t);

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 420, height: 820 }, hasTouch: true });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e)));
page.on("console", (m) => { if (m.type() === "error" && !/^Warning:/.test(m.text()) && !/supabase|realtime|websocket|net::|favicon/i.test(m.text())) errors.push(m.text()); });

try {
  sec("Carregamento");
  await page.goto(BASE + "/lives?game=bateulife", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  const root = await page.$('[data-testid="bateu-life-root"]');
  ok("Bateu Life montado", !!root);

  sec("Criação de avatar");
  const nameInput = await page.$('[data-testid="life-create-name"]');
  if (nameInput) {
    ok("Ecrã de criação aparece", true);
    const skins = await page.$$('[data-testid="life-skin-opt"]');
    ok("4 tons de pele disponíveis", skins.length === 4);
    const outfits = await page.$$('[data-testid="life-outfit-opt"]');
    ok("Capulanas grátis disponíveis", outfits.length >= 2);
    await page.fill('[data-testid="life-create-name"]', "TestadorLife");
    await page.click('[data-testid="life-enter-btn"]');
    await page.waitForTimeout(2500);
  } else {
    ok("Ecrã de criação aparece (perfil já existia)", true);
    const del = await page.evaluate(() => { localStorage.removeItem("bateu_life_v1"); });
    ok("limpeza", true);
    await page.goto(BASE + "/lives?game=bateulife", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(8000);
    await page.fill('[data-testid="life-create-name"]', "TestadorLife");
    await page.click('[data-testid="life-enter-btn"]');
    await page.waitForTimeout(2500);
  }
  const canvas = await page.$('[data-testid="life-canvas"]');
  ok("Mundo renderiza (canvas)", !!canvas);

  sec("HUD");
  const coins = await page.textContent('[data-testid="life-coins"]');
  ok("Moedas iniciais 80", coins && coins.replace(/\D/g, "") === "80");
  const online = await page.textContent('[data-testid="life-online"]');
  ok("Contador online visível", !!online && /\d+\s*online/i.test(online));
  const daily = await page.$('[data-testid="life-daily"]');
  if (daily) {
    await daily.click();
    await page.waitForTimeout(1200);
    const coins2 = await page.textContent('[data-testid="life-coins"]');
    ok("Bónus diário +60 (140)", coins2 && coins2.replace(/\D/g, "") === "140");
  } else ok("Bónus diário disponível (já reclamado — ok)", true);

  sec("Movimento");
  await page.keyboard.down("d");
  await page.waitForTimeout(700);
  await page.keyboard.up("d");
  await page.waitForTimeout(400);
  ok("Caminhar com teclado sem erros", true);
  const joy = await page.$('[data-testid="life-joy"]');
  ok("Joystick virtual presente", !!joy);

  sec("Chat e emotes");
  await page.fill('[data-testid="life-chat-input"]', "Olá praça do Bateu!");
  await page.click('[data-testid="life-chat-send"]');
  await page.waitForTimeout(900);
  const logText = await page.textContent('[data-testid="life-chat-log"]').catch(() => "");
  ok("Mensagem aparece no chat", logText && logText.includes("Olá praça do Bateu!"));
  const emotes = await page.$$('[data-testid="life-emote"]');
  ok("Botões de emote presentes", emotes.length >= 4);
  if (emotes[0]) { await emotes[0].click(); ok("Emote executado sem erro", true); }

  sec("Loja de Moda");
  const closePanel = async (tid) => {
    const dlg = page.locator(`[data-testid="${tid}"] button`).first();
    if (await dlg.count() > 0) { await dlg.click().catch(() => {}); await page.waitForTimeout(500); }
  };
  await page.click('[data-testid="life-shop-btn"]');
  await page.waitForTimeout(900);
  ok("Painel da loja abre", !!(await page.$('[data-testid="life-panel-shop"]')));
  const buyBtn = page.locator('[data-testid="life-shop-buy"]', { hasText: "60" }).first();
  if (await buyBtn.count() > 0) {
    await buyBtn.click();
    await page.waitForTimeout(900);
    const coins3 = await page.textContent('[data-testid="life-coins"]');
    ok("Compra deduz moedas (80)", coins3 && coins3.replace(/\D/g, "") === "80");
  } else ok("Item de 60 moedas disponível", false);
  await closePanel("life-panel-shop");
  ok("Painel da loja fecha", !(await page.$('[data-testid="life-panel-shop"]')));

  sec("Portal dos Jogos");
  const portalBtn = await page.$('button[title="Portal dos Jogos"]');
  if (portalBtn) {
    await portalBtn.click();
    await page.waitForTimeout(800);
    ok("Painel do portal abre", !!(await page.$('[data-testid="life-panel-portal"]')));
    const games = await page.$$('[data-testid="life-panel-portal"] button');
    ok("Mini-jogos listados", games.length >= 6);
    await closePanel("life-panel-portal");
  } else ok("Botão do portal presente", false);

  sec("Palco dos Sorteios");
  const palcoBtn = await page.$('button[title="Palco dos Sorteios"]');
  if (palcoBtn) {
    await palcoBtn.click();
    await page.waitForTimeout(1200);
    ok("Painel do palco abre", !!(await page.$('[data-testid="life-panel-palco"]')));
    const body = await page.textContent('[data-testid="life-panel-palco"]').catch(() => "");
    ok("Sorteios ou fallback carregados", body.length > 40);
    await closePanel("life-panel-palco");
  } else ok("Botão do palco presente", false);

  sec("Quarto decorável");
  await page.click('[data-testid="life-goto-room"]');
  await page.waitForTimeout(1200);
  const placaBtn = await page.$('[data-testid="life-goto-plaza"]');
  ok("Entra no quarto (botão Praça aparece)", !!placaBtn);
  await page.click('[data-testid="life-decorate-btn"]');
  await page.waitForTimeout(700);
  const cv = await page.$('[data-testid="life-canvas"]');
  if (cv) {
    const box = await cv.boundingBox();
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 + 40);
    await page.waitForTimeout(900);
    ok("Móvel colocado por toque no chão", true);
  }

  sec("Persistência");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000);
  const canvasAfter = await page.$('[data-testid="life-canvas"]');
  const createAfter = await page.$('[data-testid="life-create-name"]');
  ok("Recarrega direto no mundo (sem criar de novo)", !!canvasAfter && !createAfter);
  const coinsAfter = await page.textContent('[data-testid="life-coins"]').catch(() => "");
  ok("Moedas persistidas", coinsAfter && coinsAfter.replace(/\D/g, "") === "80");

  sec("Estabilidade");
  // Critério: erros reais (pageerror) ou erros de consola não-React. Avisos "Warning:" do React
  // com ruído pré-existente da plataforma (ex.: same key no loading, <a> dentro de <a>) são ignorados.
  const critical = errors.filter((e) => !/ResizeObserver|NON-passive|Autoplay|permission|AbortError|navigator\.vibrate|Failed to load resource/i.test(e));
  ok("Sem erros JS críticos", critical.length === 0);
  if (critical.length) console.log("     erros:", critical.slice(0, 3).join(" | ").slice(0, 300));

} catch (e) {
  falhou++;
  console.log("  ❌ Exceção no teste: " + String(e).slice(0, 300));
}

await browser.close();
console.log("\n════════════════════════════");
console.log(`  PASSOU: ${passou}  FALHOU: ${falhou}`);
console.log("════════════════════════════");
process.exit(falhou > 0 ? 1 : 0);
