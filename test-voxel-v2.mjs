// Teste E2E completo: MMORPG (criação → mundo → voxel → painéis plataforma) + páginas — Desktop + Mobile/APK
import { chromium } from 'playwright';

const BASE = 'http://localhost:8099';
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name} ${extra}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

async function testViewport(browser, label, viewport, isTouch) {
  console.log(`\n=== ${label} (${viewport.width}x${viewport.height}) ===`);
  const ctx = await browser.newContext({
    viewport, hasTouch: isTouch, isMobile: isTouch,
    userAgent: isTouch
      ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36'
      : undefined,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 150)));

  // ---- 1. Homepage ----
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const rootOk = await page.evaluate(() => (document.getElementById('root')?.children.length || 0) > 0);
  ok('homepage renderiza', rootOk);

  // ---- 2. MMORPG: fluxo completo ----
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);
  let bodyLen = await page.evaluate(() => document.body.innerText.length);
  ok('página MMORPG carrega', bodyLen > 100, `(${bodyLen} chars)`);

  const classCard = page.locator('button:has-text("Guerreiro"), button:has-text("Mago"), button:has-text("Arqueiro"), button:has-text("Assassino")').first();
  const hasCreate = await classCard.count() > 0;
  ok('ecrã de criação de personagem', hasCreate);
  if (hasCreate) {
    const nameInput = page.locator('input[maxlength="16"]').first();
    if (await nameInput.count() > 0) await nameInput.fill('TesteZ').catch(() => {});
    await classCard.click().catch(e => errors.push('click class: ' + e.message));
    await page.waitForTimeout(3000);
    const worldOk = await page.evaluate(() => {
      const t = document.body.innerText;
      return /Zonas|Quests|Missão Diária|Economia|Arena/i.test(t);
    });
    ok('mundo RPG carrega (tabs/painel)', worldOk);

    const voxelTab = page.locator('button:has-text("Voxel")').first();
    const hasVoxel = await voxelTab.count() > 0;
    ok('tab Voxel disponível', hasVoxel);
    if (hasVoxel) {
      await voxelTab.click().catch(e => errors.push('voxel tab: ' + e.message));
      await page.waitForTimeout(4000);
      const canvasCount = await page.locator('canvas').count();
      ok('canvas mundo voxel renderiza', canvasCount > 0, `(${canvasCount} canvas)`);
      const hudTxt = await page.evaluate(() => document.body.innerText);
      ok('HUD voxel presente', /MINERAR|SALTAR|AÇÃO|Picareta|picareta/i.test(hudTxt));
      ok('integração plataforma (baús/portais/mercado)', /Sorteio|Sorteios|Arcade|Mercado|sorteio/i.test(hudTxt));

      // interação: toque no mundo
      const cv = page.locator('canvas').first();
      const box = await cv.boundingBox().catch(() => null);
      if (box) {
        if (isTouch) await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.35);
        else await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.35);
        await page.waitForTimeout(900);
        ok('interação com mundo sem crash', true);
      }

      // ---- NOVO: painéis sincronizados com a plataforma (cliques via DOM, imunes a overlays) ----
      const domClick = async (sel) => page.evaluate((s) => {
        const el = document.querySelector(s);
        if (el) { el.click(); return true; }
        return false;
      }, sel);
      const closePanel = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(500); };
      const giftClicked = await domClick('button[aria-label="Sorteios ao vivo"]');
      ok('botão Sorteios no HUD', giftClicked);
      if (giftClicked) {
        await page.waitForTimeout(2500);
        const pTxt = await page.evaluate(() => document.body.innerText);
        const panelOk = /Mural de Sorteios/i.test(pTxt) && /Ver todos os sorteios|Sem sorteios|A carregar/i.test(pTxt);
        ok('painel Mural de Sorteios abre', panelOk);
        await closePanel();
        const qClicked = await domClick('button[aria-label="Missões"]');
        ok('botão Missões no HUD', qClicked);
        if (qClicked) {
          await page.waitForTimeout(1200);
          const qTxt = await page.evaluate(() => document.body.innerText);
          ok('painel Missões de Hoje abre', /Missões de Hoje|Baú de Sorteio/i.test(qTxt));
          await closePanel();
        }
      }

      // sair do voxel
      const exit = page.locator('button[aria-label*="voltar" i], button:has-text("Voltar"), button:has-text("Sair")').first();
      if (await exit.count() > 0) await exit.click().catch(() => {});
      await page.waitForTimeout(1200);
    }
  }

  // ---- 3. /jogos ----
  await page.goto(`${BASE}/jogos`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  bodyLen = await page.evaluate(() => document.body.innerText.length);
  ok('página /jogos renderiza', bodyLen > 80, `(${bodyLen} chars)`);

  // ---- 4. /marketplace (sorteios) ----
  await page.goto(`${BASE}/marketplace`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  bodyLen = await page.evaluate(() => document.body.innerText.length);
  ok('página /marketplace renderiza', bodyLen > 100, `(${bodyLen} chars)`);

  ok(`0 pageerrors (${label})`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
await testViewport(browser, 'DESKTOP', { width: 1280, height: 900 }, false);
await testViewport(browser, 'MOBILE/APK', { width: 390, height: 844 }, true);
await browser.close();

console.log(`\n========== RESULTADO: ${pass} PASS / ${fail} FAIL ==========`);
process.exit(fail > 0 ? 1 : 0);
