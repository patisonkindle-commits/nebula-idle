import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('pageerror', e => console.log('PAGE EXCEPTION:', e.message));

const BASE = process.argv[2] || 'http://localhost:8777/';
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => (() => { const g = window.__game; return g && g.scene.isActive('HubScene'); })(), { timeout: 15000 });
console.log('1. HUB ACTIVE');

await page.screenshot({ path: '/tmp/e2e-1-hub.png' });

// Buy Attack upgrade: button at logical (~790, 600)
const rect = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height }; });
const click = (lx, ly) => page.mouse.click(rect.left + rect.w * lx / 1080, rect.top + rect.h * ly / 1920);

const goldBefore = await page.evaluate(() => window.__game.registry.get('gold'));
await click(790, 600);
await page.waitForTimeout(500);
const state = await page.evaluate(() => JSON.stringify({
  gold: window.__game.registry.get('gold'),
  atk: window.__game.registry.get('upgrades')?.attack,
  saved: localStorage.getItem('nebulaIdleSave')?.slice(0, 80)
}));
console.log('2. BUY ATTACK:', goldBefore, '→', state);

// Enter dungeon
await click(540, 1900);
await page.waitForFunction(() => window.__game.scene.isActive('GameScene'), { timeout: 10000 });
console.log('3. GAME ACTIVE');

// Run until depth 4 or 45s
const t0 = Date.now();
while (Date.now() - t0 < 45000) {
  await page.waitForTimeout(3000);
  const s = await page.evaluate(() => {
    const gs = window.__game.scene.getScene('GameScene');
    if (!gs || !gs.hero) return 'no-hero';
    return JSON.stringify({ d: gs.depthNum, alive: gs.enemies.filter(e => e.alive).length, hp: Math.max(0, Math.round(gs.hero.currentHp)), dead: !gs.hero.alive });
  });
  console.log(`   T+${Math.round((Date.now()-t0)/1000)}s:`, s);
  if (s.includes('"d":4') || s.includes('"dead":true')) break;
}
await page.screenshot({ path: '/tmp/e2e-2-game.png' });

// Force hero death to test hub return + gold banking
await page.evaluate(() => {
  const gs = window.__game.scene.getScene('GameScene');
  gs.hero.currentHp = -1;
  gs.hero.die();
});
await page.waitForTimeout(2500);
const hubBack = await page.evaluate(() => JSON.stringify({
  hubActive: window.__game.scene.isActive('HubScene'),
  gold: window.__game.registry.get('gold'),
  highestDepth: window.__game.registry.get('highestDepth'),
  lastRunGold: window.__game.registry.get('lastRunGold')
}));
console.log('4. AFTER DEATH:', hubBack);
await page.screenshot({ path: '/tmp/e2e-3-hub-return.png' });

await browser.close();
console.log('E2E DONE');
