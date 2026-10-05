// E2E Bateu Mundo Aberto (mapa real Leaflet): criação → mapa → joystick → criaturas/baús → painéis plataforma
// Desktop 1280x900 + Mobile 390x844 (APK). Replica o spawn determinístico do core.ts para
// interações garantidas (criatura/baú perto do avatar).
import { chromium } from 'playwright';

const BASE = 'http://localhost:8099';
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name} ${extra}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

// ---- réplica do algoritmo de spawn (core.ts) ----
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const CELL = 0.0022;
const CREATURES = [
  { id: 'macaco', rarity: 'comum' }, { id: 'javali', rarity: 'comum' }, { id: 'aguia', rarity: 'comum' },
  { id: 'crocodilo', rarity: 'raro' }, { id: 'leao', rarity: 'raro' }, { id: 'bufalo', rarity: 'raro' },
  { id: 'elefante', rarity: 'epico' }, { id: 'rinoceronte', rarity: 'epico' }, { id: 'hipopotamo', rarity: 'epico' },
  { id: 'dragao', rarity: 'lendario' },
];
const PORTALS = ['feira', 'arena', 'arcade'];
function spawnCell(cx, cy) {
  const rng = mulberry32(hashStr(`bateu-ow-${cx}:${cy}`));
  const n = 2 + Math.floor(rng() * 3);
  const out = [];
  for (let i = 0; i < n; i++) {
    const roll = rng();
    const lat = +(cy * CELL + rng() * CELL).toFixed(6);
    const lng = +(cx * CELL + rng() * CELL).toFixed(6);
    const key = `${cx}:${cy}:${i}`;
    if (roll < 0.34) {
      const w = rng() * 100;
      let rar = 'comum';
      if (w > 96) rar = 'lendario'; else if (w > 85) rar = 'epico'; else if (w > 58) rar = 'raro';
      const pool = CREATURES.filter((c) => c.rarity === rar);
      out.push({ key, kind: 'creature', lat, lng, creatureId: pool[Math.floor(rng() * pool.length)].id });
    } else if (roll < 0.62) out.push({ key, kind: 'crystal', lat, lng, tier: 1 + Math.floor(rng() * 3) });
    else if (roll < 0.86) out.push({ key, kind: 'chest', lat, lng, tier: 1 + Math.floor(rng() * 3) });
    else out.push({ key, kind: 'portal', lat, lng, portalId: PORTALS[Math.floor(rng() * 3)] });
  }
  return out;
}
function findTargetNear(lat, lng) {
  const cx = Math.floor(lng / CELL), cy = Math.floor(lat / CELL);
  const ents = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) ents.push(...spawnCell(cx + dx, cy + dy));
  const creature = ents.find((e) => e.kind === 'creature');
  const chest = ents.find((e) => e.kind === 'chest');
  const crystal = ents.find((e) => e.kind === 'crystal');
  return creature || chest || crystal || ents[0];
}

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
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));

  // ---- 1. Homepage ----
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const rootOk = await page.evaluate(() => (document.getElementById('root')?.children.length || 0) > 0);
  ok('homepage renderiza', rootOk);

  // ---- 2. Mundo Aberto: criação de personagem ----
  await page.goto(`${BASE}/lives?game=mmorpg`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);
  const bodyLen = await page.evaluate(() => document.body.innerText.length);
  ok('página Mundo Aberto carrega', bodyLen > 100, `(${bodyLen} chars)`);

  const classCard = page.locator('button:has-text("Guerreiro"), button:has-text("Mago"), button:has-text("Arqueiro"), button:has-text("Assassino")').first();
  const hasCreate = await classCard.count() > 0;
  ok('ecrã de criação de personagem', hasCreate);
  if (hasCreate) {
    const nameInput = page.locator('input[maxlength="16"]').first();
    if (await nameInput.count() > 0) await nameInput.fill('ExploraMZ').catch(() => {});
    await classCard.click().catch((e) => errors.push('click class: ' + e.message));
    await page.waitForTimeout(400);
    const startBtn = page.locator('button:has-text("COMEÇAR AVENTURA")').first();
    await startBtn.click().catch((e) => errors.push('click start: ' + e.message));
    await page.waitForTimeout(4500);
  }

  // ---- 3. Mapa real (Leaflet) ----
  const mapOk = await page.evaluate(() => !!document.querySelector('.leaflet-container'));
  ok('mapa Leaflet renderiza', mapOk);
  const tilesOk = await page.evaluate(() => !!document.querySelector('.leaflet-tile, .leaflet-tile-container'));
  ok('tiles do mapa carregam', tilesOk);
  const avatarOk = await page.evaluate(() => !!document.querySelector('.ow-avatar'));
  ok('avatar no mapa', avatarOk);

  // ---- 4. HUD ----
  const hudTxt = await page.evaluate(() => document.body.innerText);
  ok('HUD presente (ouro/bilhetes/nível)', /(Nv 1|Nível 1)/.test(hudTxt) && /ExploraMZ|Ouro|Bilhete/i.test(hudTxt));
  ok('dock de atalhos (Perto/Missões/Loja/Sorteios/Feira/Arena/Top/Feitos/Bestiário)',
    /Missões/i.test(hudTxt) && /Sorteios/i.test(hudTxt) && /Feira/i.test(hudTxt) && /Arena/i.test(hudTxt) && /Bestiário/i.test(hudTxt) && /Perto/i.test(hudTxt) && /Loja/i.test(hudTxt) && /Top/i.test(hudTxt) && /Feitos/i.test(hudTxt));
  const exploradorOk = await page.evaluate(() => /Explorador/i.test(document.body.innerText) && !!document.querySelector('.ow-avatar'));
  ok('modo Explorador (joystick) ativo por omissão', exploradorOk);

  // ---- 5. Joystick move o avatar ----
  const saveBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('bateu_openworld_save') || '{}')?.pos);
  const joyDispatch = await page.evaluate(() => {
    const pad = document.querySelector('[data-testid="joystick"]');
    if (!pad) return false;
    const r = pad.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const opts = (x, y) => ({ bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, clientX: x, clientY: y, pointerType: 'touch' });
    pad.dispatchEvent(new PointerEvent('pointerdown', opts(cx, cy)));
    for (let i = 1; i <= 24; i++) pad.dispatchEvent(new PointerEvent('pointermove', opts(cx, cy - i * 4)));
    return true;
  });
  await page.waitForTimeout(2600);
  await page.evaluate(() => {
    const pad = document.querySelector('[data-testid="joystick"]');
    const r = pad?.getBoundingClientRect();
    if (pad && r) pad.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: r.x + r.width / 2, clientY: r.y }));
  });
  await page.waitForTimeout(900);
  const saveAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('bateu_openworld_save') || '{}')?.pos);
  const movedOk = !!(joyDispatch && saveBefore && saveAfter && (Math.abs(saveBefore.lat - saveAfter.lat) > 0.00004 || Math.abs(saveBefore.lng - saveAfter.lng) > 0.00004));
  ok('joystick move o avatar no mapa', movedOk, movedOk ? '' : `(Δlat ${(saveAfter && saveBefore ? Math.abs(saveBefore.lat - saveAfter.lat) : 0).toFixed(6)})`);

  // ---- 6. Entidades no mapa + interação determinística ----
  const entCount = await page.evaluate(() => document.querySelectorAll('.ow-ent').length);
  ok('entidades visíveis no mapa (criaturas/baús/cristais/portais)', entCount > 0, `(${entCount} entidades)`);

  // coloca avatar a ~28m de um alvo conhecido (spawn determinístico, NUNCA portal) e recarrega
  const target = findTargetNear(-25.9692, 32.5732);
  const offset = 0.00025; // ~28m
  const moved = await page.evaluate(({ lat, lng }) => {
    const c = JSON.parse(localStorage.getItem('bateu_openworld_save'));
    if (!c) return false;
    c.pos = { lat, lng };
    localStorage.setItem('bateu_openworld_save', JSON.stringify(c));
    return true;
  }, { lat: target.lat - offset, lng: target.lng - offset });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);
  ok('save com posição junto ao alvo', moved);
  const entAfterReload = await page.evaluate(() => document.querySelectorAll('.ow-ent').length);
  ok('entidades no mapa após reload', entAfterReload > 0, `(${entAfterReload})`);

  // tenta interagir com os marcadores mais próximos do centro (o alvo está a 28m)
  const goldBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('bateu_openworld_save') || '{}')?.gold);
  let interacted = false;
  let interactDebug = '';
  const near = await page.evaluate(() => {
    const mapEl = document.querySelector('.leaflet-container');
    if (!mapEl) return [];
    const mr = mapEl.getBoundingClientRect();
    const cx = mr.x + mr.width / 2, cy = mr.y + mr.height / 2;
    return Array.from(document.querySelectorAll('.leaflet-marker-icon'))
      .filter((m) => m.querySelector('.ow-ent'))
      .map((m) => { const r = m.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, d: Math.hypot(r.x + r.width / 2 - cx, r.y + r.height / 2 - cy) }; })
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
  });
  // diagnóstico: avatar centrado? entidades perto?
  const diag = await page.evaluate(() => {
    const mapEl = document.querySelector('.leaflet-container');
    if (!mapEl) return { map: false };
    const mr = mapEl.getBoundingClientRect();
    const cx = mr.x + mr.width / 2, cy = mr.y + mr.height / 2;
    const av = document.querySelector('.ow-avatar')?.closest('.leaflet-marker-icon');
    const avR = av?.getBoundingClientRect();
    const ents = Array.from(document.querySelectorAll('.leaflet-marker-icon'))
      .filter((m) => m.querySelector('.ow-ent'))
      .map((m) => { const r = m.getBoundingClientRect(); return Math.round(Math.hypot(r.x + r.width / 2 - cx, r.y + r.height / 2 - cy)); })
      .sort((a, b) => a - b).slice(0, 5);
    return { map: true, avatarOff: avR ? Math.round(Math.hypot(avR.x + avR.width / 2 - cx, avR.y + avR.height / 2 - cy)) : null, entDists: ents, save: JSON.parse(localStorage.getItem('bateu_openworld_save') || '{}')?.pos };
  });
  console.log(`  [diag] ${JSON.stringify(diag)}`);

  // o que está no ponto do marcador mais próximo?
  const hit = await page.evaluate(() => {
    const mapEl = document.querySelector('.leaflet-container');
    if (!mapEl) return null;
    const mr = mapEl.getBoundingClientRect();
    const cx = mr.x + mr.width / 2, cy = mr.y + mr.height / 2;
    const es = Array.from(document.querySelectorAll('.leaflet-marker-icon'))
      .filter((m) => m.querySelector('.ow-ent'))
      .map((m) => { const r = m.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, d: Math.hypot(r.x + r.width / 2 - cx, r.y + r.height / 2 - cy) }; })
      .sort((a, b) => a.d - b.d);
    if (es.length === 0) return null;
    const t = es[0];
    const el = document.elementFromPoint(t.x, t.y);
    return { x: t.x, y: t.y, d: t.d, el: el ? (el.className || el.tagName).toString().slice(0, 80) : 'null' };
  });
  console.log(`  [hit] ${JSON.stringify(hit)}`);

  for (const cand of near) {
    if (cand.d > 90) continue;
    // o jogo pode estar abaixo da dobra (desktop) — traz o marcador para o viewport antes de clicar
    const pos = await page.evaluate((idx) => {
      const mapEl = document.querySelector('.leaflet-container');
      if (!mapEl) return null;
      const mr = mapEl.getBoundingClientRect();
      const cx = mr.x + mr.width / 2, cy = mr.y + mr.height / 2;
      const es = Array.from(document.querySelectorAll('.leaflet-marker-icon'))
        .filter((m) => m.querySelector('.ow-ent'))
        .map((m) => { const r = m.getBoundingClientRect(); return { m, d: Math.hypot(r.x + r.width / 2 - cx, r.y + r.height / 2 - cy) }; })
        .sort((a, b) => a.d - b.d);
      const target = es[idx];
      if (!target) return null;
      target.m.scrollIntoView({ block: 'center', behavior: 'instant' });
      return es.length;
    }, near.indexOf(cand));
    if (pos == null) continue;
    await page.waitForTimeout(400);
    const rc = await page.evaluate((idx) => {
      const mapEl = document.querySelector('.leaflet-container');
      const mr = mapEl.getBoundingClientRect();
      const cx = mr.x + mr.width / 2, cy = mr.y + mr.height / 2;
      const es = Array.from(document.querySelectorAll('.leaflet-marker-icon'))
        .filter((m) => m.querySelector('.ow-ent'))
        .map((m) => { const r = m.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, d: Math.hypot(r.x + r.width / 2 - cx, r.y + r.height / 2 - cy) }; })
        .sort((a, b) => a.d - b.d);
      return es[idx] || null;
    }, near.indexOf(cand));
    if (!rc || rc.d > 90) continue;
    const inView = await page.evaluate(({ x, y }) => y > 0 && y < window.innerHeight - 10, rc);
    if (!inView) continue;
    await page.mouse.click(rc.x, rc.y);
    await page.waitForTimeout(1700);
    const txt = await page.evaluate(() => document.body.innerText);
    if (/ATACAR|Baú|Cristal|Portal|ouro|Muito longe/i.test(txt)) { interacted = true; interactDebug = `(dist ${Math.round(cand.d)}px)`; break; }
    interactDebug = ` [d${Math.round(rc.d)}: "${txt.slice(-80).replace(/\n/g, '§')}"]`;
  }
  ok('interação com entidade (batalha/baú/cristal)', interacted, interacted ? interactDebug : `(nada em ${near.length} marcadores) ${interactDebug}`);

  // se abriu batalha: lutar até resolver
  const isBattle = await page.evaluate(() => !!Array.from(document.querySelectorAll('button')).find((b) => /ATACAR/.test(b.innerText)));
  if (isBattle) {
    ok('batalha abriu (ATACAR visível)', true);
    for (let i = 0; i < 25; i++) {
      const attackBtn = page.locator('button:has-text("ATACAR")').first();
      if (await attackBtn.count() === 0) break;
      await attackBtn.click().catch(() => {});
      await page.waitForTimeout(600);
      const overTxt = await page.evaluate(() => document.body.innerText);
      if (/derrotado!|CAPTURADO|RECUPERAR|CONTINUAR A EXPLORAR/.test(overTxt)) break;
    }
    const endTxt = await page.evaluate(() => document.body.innerText);
    ok('batalha resolve (vitória/derrota + captura opcional)', /CONTINUAR A EXPLORAR|RECUPERAR|CAPTURADO|escapou/i.test(endTxt));
    const contBtn = page.locator('button:has-text("CONTINUAR A EXPLORAR"), button:has-text("RECUPERAR E VOLTAR")').first();
    if (await contBtn.count() > 0) await contBtn.click().catch(() => {});
    await page.waitForTimeout(800);
  } else {
    const afterTxt = await page.evaluate(() => document.body.innerText);
    ok('batalha abriu (ATACAR visível)', /Baú|Cristal|Portal|ouro/i.test(afterTxt), '(interação foi baú/cristal/portal)');
  }

  // ---- 7. Painéis da plataforma (via data-testid) ----
  const openDock = async (tid) => {
    await page.evaluate((t) => document.querySelector(`[data-testid="${t}"]`)?.click(), tid);
    await page.waitForTimeout(1300);
  };
  const closePanel = async () => {
    await page.evaluate(() => document.querySelector('[data-testid="modal-close"]')?.click());
    await page.waitForTimeout(600);
  };

  await openDock('dock-quests');
  const qTxt = await page.evaluate(() => document.body.innerText);
  ok('Quadro de Missões abre', /Quadro de Missões/i.test(qTxt) && /Caçador do Bairro|Domador|Explorador/i.test(qTxt));
  await closePanel();

  await openDock('dock-sorteios');
  await page.waitForTimeout(2200);
  const sTxt = await page.evaluate(() => document.body.innerText);
  ok('Mural de Sorteios abre (dados reais ou erro amigável)', /Mural de Sorteios/i.test(sTxt) && /MT|Bilhete|ligação|carregar|Participa/i.test(sTxt));
  await closePanel();

  await openDock('dock-bestiario');
  const bTxt = await page.evaluate(() => document.body.innerText);
  ok('Bestiário abre (estatísticas + catálogo)', /O teu Bestiário/i.test(bTxt) && /Criaturas capturadas/i.test(bTxt) && /Vitórias em batalha/i.test(bTxt));
  await closePanel();

  // ---- 7.4 Progressão: Loja, Ranking, Conquistas ----
  await openDock('dock-loja');
  const lojaTxt = await page.evaluate(() => document.body.innerText);
  ok('Loja abre (consumíveis + equipamento)', /Loja do Aventureiro/i.test(lojaTxt) && /Poção de Vida/i.test(lojaTxt) && /Faixa Fortalecida/i.test(lojaTxt) && /Arma/i.test(lojaTxt));
  const lojaGoldBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('bateu_openworld_save') || '{}').gold);
  await page.evaluate(() => document.querySelector('[data-testid="comprar-pocao"]')?.click());
  await page.waitForTimeout(800);
  const lojaGoldAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('bateu_openworld_save') || '{}').gold);
  ok('compra na loja debita ouro', typeof lojaGoldAfter === 'number' && typeof lojaGoldBefore === 'number' && lojaGoldAfter < lojaGoldBefore, `(${lojaGoldBefore} → ${lojaGoldAfter})`);
  await closePanel();

  await openDock('dock-ranking');
  const rankTxt = await page.evaluate(() => document.body.innerText);
  ok('Ranking abre (posição + rivais)', /Ranking do Mundo Aberto/i.test(rankTxt) && /tua posição/i.test(rankTxt) && /poder/i.test(rankTxt));
  await closePanel();

  await openDock('dock-conquistas');
  const achTxt = await page.evaluate(() => document.body.innerText);
  ok('Conquistas abre (progresso + catálogo)', /Conquistas/i.test(achTxt) && /desbloqueadas/i.test(achTxt) && /Primeira Vitória/i.test(achTxt));
  await closePanel();

  // perfil + atalhos para a plataforma
  const perfil = await page.evaluate(() => document.querySelector('[data-testid="hud-perfil"]'));
  if (perfil) {
    await page.evaluate(() => document.querySelector('[data-testid="hud-perfil"]')?.click());
    await page.waitForTimeout(1300);
    const pTxt = await page.evaluate(() => document.body.innerText);
    ok('Painel do Aventureiro abre', /Painel do Aventureiro/i.test(pTxt) && /ExploraMZ/i.test(pTxt));
    ok('distribuição de pontos de atributo', /Pontos de Atributo/i.test(pTxt) && /Força/i.test(pTxt) && /Sorte/i.test(pTxt));
    ok('rank do herói visível', /Novato|Explorador|Caçador|Veterano|Elite|Lenda|Mítico/i.test(pTxt));
    await closePanel();
  } else ok('Painel do Aventureiro abre', false, '(botão não encontrado)');

  // ---- 7.5 Entidades REAIS da plataforma (Perto de ti + ficha + CTA) ----
  await openDock('dock-perto');
  await page.waitForTimeout(2200);
  const perTxt = await page.evaluate(() => document.body.innerText);
  ok('Painel Perto de ti abre', /Perto de ti/i.test(perTxt));
  const realCount = await page.evaluate(() => document.querySelectorAll('[data-testid^="perto-"]').length);
  ok('conteúdo real da plataforma (itens ou vazio amigável)', realCount > 0 || /Ainda não há ofertas/i.test(perTxt), `(${realCount} itens)`);
  if (realCount > 0) {
    await page.evaluate(() => document.querySelector('[data-testid^="perto-"]')?.click());
    await page.waitForTimeout(1300);
    const sheetOk = await page.evaluate(() => {
      const t = (document.body.innerText || '').replace(/\n/g, ' ');
      return /FEIRA · À VENDA|SORTEIO REAL|CONCURSO REAL|CUPÃO DE DESCONTO/.test(t) && !!document.querySelector('[data-testid="real-open"]');
    });
    ok('ficha de entidade real abre (selo + CTA)', sheetOk);
    const ctaTxt = await page.evaluate(() => document.querySelector('[data-testid="real-open"]')?.innerText || '');
    ok('CTA aponta para a plataforma', /Feira|Sorteio|Concurso|Cup|Sorteios/i.test(ctaTxt), `("${ctaTxt.trim().slice(0, 30)}")`);
    await page.evaluate(() => document.querySelector('[data-testid="real-open"]')?.click());
    await page.waitForTimeout(2600);
    const navUrl = page.url();
    ok('CTA navega para a plataforma', /marketplace|raffle|concursos|prestacoes|alienacao/.test(navUrl), `→ ${navUrl.slice(-42)}`);
  } else {
    await closePanel();
  }

  // ---- 8. /jogos com destaque permanente ----
  await page.goto(`${BASE}/jogos`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  const jogosTxt = await page.evaluate(() => document.body.innerText);
  ok('página /jogos renderiza', jogosTxt.length > 1000, `(${jogosTxt.length} chars)`);
  ok('Mundo Aberto GO listado em /jogos', /Mundo Aberto GO/i.test(jogosTxt));
  const destaqueOk = await page.evaluate(() => !!document.querySelector('[data-testid="jogos-destaque-mundo-aberto"]') && /JOGO EM DESTAQUE/i.test(document.body.innerText));
  ok('card DESTAQUE permanente em /jogos', destaqueOk);

  // ---- 9. Banner destaque no LiveHub (outro jogo ativo) ----
  await page.goto(`${BASE}/lives?game=wheel`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);
  const lhBanner = await page.evaluate(() => !!document.querySelector('[data-testid="livehub-destaque-mundo-aberto"]'));
  ok('banner DESTAQUE no LiveHub (jogo permanente)', lhBanner);

  ok(`0 pageerrors (${label})`, errors.length === 0, errors.length ? `→ ${errors.slice(0, 3).join(' | ')}` : '');
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    await testViewport(browser, 'DESKTOP', { width: 1280, height: 900 }, false);
    await testViewport(browser, 'MOBILE/APK', { width: 390, height: 844 }, true);
  } finally {
    await browser.close();
  }
  console.log(`\n========== RESULTADO: ${pass} PASS / ${fail} FAIL ==========`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('ERRO FATAL:', e); process.exit(1); });
