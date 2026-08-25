
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 } });
await p.goto('http://localhost:8778/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);
await p.mouse.click(270, 940);
await p.waitForTimeout(1200);
let elites = 0, total = 0;
for (let i = 0; i < 10; i++) {
  await p.evaluate(() => { window.__game.scene.getScene('GameScene').scene.restart({ depth: 6 }); });
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const gs = window.__game.scene.getScene('GameScene');
    return JSON.stringify(gs.enemies.map(e => e.tintTopLeft));
  });
  const tints = JSON.parse(r);
  total += tints.length;
  elites += tints.filter(t => t === 0xffd700).length;
}
console.log(JSON.stringify({ total, elites, pct: (elites/total*100).toFixed(1) }));
await b.close();
