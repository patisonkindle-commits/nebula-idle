import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/snap/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
page.on('console', m => { if (m.type() === 'error') console.log('PAGE ERR:', m.text()); });
page.on('pageerror', e => console.log('PAGE EXCEPTION:', e.message));

await page.goto('http://localhost:8777/', { waitUntil: 'load' });
await page.waitForTimeout(5000);

// Scene state after load
let state = await page.evaluate(() => {
  const g = window.__game;
  if (!g) return { err: 'no game' };
  const s = g.scene;
  return {
    hubActive: s.getScene('HubScene')?.isActive ?? false,
    gameActive: s.getScene('GameScene')?.isActive ?? false,
    uiActive: s.getScene('UIScene')?.isActive ?? false,
    canvas: !!document.querySelector('canvas')
  };
});
console.log('AFTER LOAD:', JSON.stringify(state));

// Click ENTER DUNGEON (canvas coords: center-x, y=1600 of 1080x1920 logical; canvas is FIT-scaled)
const rect = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  return { left: r.left, top: r.top, w: r.width, h: r.height };
});
// logical (540,1600) → screen
const sx = rect.left + rect.w * (540 / 1080);
const sy = rect.top + rect.h * (1600 / 1920);
await page.mouse.click(sx, sy);
await page.waitForTimeout(2000);

state = await page.evaluate(() => {
  const g = window.__game;
  const gs = g.scene.getScene('GameScene');
  return {
    gameActive: g.scene.getScene('GameScene')?.isActive ?? false,
    enemiesTotal: gs ? gs.enemies.length : -1,
    heroAlive: gs && gs.hero ? gs.hero.alive : false,
    heroXY: gs && gs.hero ? [Math.round(gs.hero.x), Math.round(gs.hero.y)] : null
  };
});
console.log('IN GAME:', JSON.stringify(state));

// Let auto-battle run ~15s, sample progression
for (let i = 0; i < 3; i++) {
  await page.waitForTimeout(5000);
  state = await page.evaluate(() => {
    const g = window.__game;
    const gs = g.scene.getScene('GameScene');
    return {
      depth: gs?.depthNum,
      enemiesAlive: gs ? gs.enemies.filter(e => e.alive).length : -1,
      heroHp: gs && gs.hero ? Math.round(gs.hero.currentHp) : -1,
      heroMaxHp: gs && gs.hero ? gs.hero.maxHp : -1,
      transitioning: gs?.transitioning,
      gold: window.__game.registry ? undefined : undefined,
      regGold: g.registry.get('gold'),
      highestDepth: g.registry.get('highestDepth')
    };
  });
  console.log(`T+${(i+1)*5}s:`, JSON.stringify(state));
}

await page.screenshot({ path: '/tmp/nebula-idle-shot.png' });
await browser.close();
console.log('PLAYTEST DONE');
