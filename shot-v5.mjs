// Screenshot dedicado: ecrã de criação (editor de avatar) + editor em jogo
import { chromium } from "playwright";

const BASE = "http://localhost:8099";

async function main() {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);

  // limpar localStorage para forçar criação
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  const nameInput = page.locator('input[placeholder="Nome do teu herói"]');
  await nameInput.waitFor({ state: "visible", timeout: 40000 });

  // escolher classe + personalizar
  await page.locator('button:has-text("Mago")').first().click();
  await page.locator('[data-testid="bw-av-skin-4"]').click();
  await page.locator('[data-testid="bw-av-tab-cabelo"]').click();
  await page.locator('[data-testid="bw-av-hair-4"]').click(); // afro
  await page.locator('[data-testid="bw-av-hairc-2"]').click(); // avelã
  await page.waitForTimeout(600);
  await page.locator('[data-testid="bw-avatar-editor"]').screenshot({ path: "shots/v5-editor-criacao.png" });
  console.log("shot: v5-editor-criacao.png");

  // entrar no mundo
  await nameInput.fill("RainhaZula");
  await page.locator('button:has-text("ENTRAR NO MUNDO")').first().click();
  const canvas = page.locator('[data-testid="bateu-world"] canvas').first();
  await canvas.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(2500);

  // abrir Herói → Personalizar
  await page.getByRole("button", { name: "Herói", exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.locator('[data-testid="bw-appearance"]').click();
  await page.waitForTimeout(800);
  await page.locator('[data-testid="bw-panel"]').screenshot({ path: "shots/v5-editor-emjogo.png" });
  console.log("shot: v5-editor-emjogo.png");

  // screenshot do mundo com o herói
  const closeBtn = page.locator('[data-testid="bw-panel"] button').first();
  await closeBtn.click();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="bateu-world"]').screenshot({ path: "shots/v5-mundo-heroi.png" });
  console.log("shot: v5-mundo-heroi.png");

  await browser.close();
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
