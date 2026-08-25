import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 } });
await p.goto('http://localhost:8778/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
// enter dungeon
await p.mouse.click(270, 940);
await p.waitForTimeout(2000);
const res = await p.evaluate(() => {
  const c = document.querySelector('canvas');
  return { w: c?.width, h: c?.height };
});
console.log('canvas', JSON.stringify(res));
await p.screenshot({ path: '/tmp/dungeon-after.png' });
await b.close();
