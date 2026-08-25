import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 } });
await p.goto('http://localhost:8778/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);
// enter dungeon
await p.mouse.click(270, 940);
await p.waitForTimeout(1500);
// jump straight to boss floor 5 via registry+restart
await p.evaluate(() => {
  const g = window.__game;
  if (g) {
    const gs = g.scene.getScene('GameScene');
    gs.registry.set('gold', 5000);
    gs.scene.restart({ depth: 2 });
  }
});
await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/elite-check.png' });
const state = await p.evaluate(() => {
  const g = window.__game;
  if (!g) return 'no-global';
  const gs = g.scene.getScene('GameScene');
  return JSON.stringify({ d: gs.depthNum, enemies: gs.enemies.length, scales: gs.enemies.map(e=>e.scaleX), tints: gs.enemies.map(e=>e.tintTopLeft) });
});
console.log('state', state);
await b.close();
