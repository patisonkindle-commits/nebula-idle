import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 } });

// 1) HUB — BASE CAMP screen
await p.goto('http://localhost:8778/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/shot-1-hub.png' });

// 2) DUNGEON depth 1 — enter + early combat
await p.mouse.click(270, 940); // ENTER DUNGEON
await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/shot-2-dungeon.png' });

// 3) MID-COMBAT — wait for kills/damage numbers, let hero clear a few enemies
await p.waitForTimeout(8000);
await p.screenshot({ path: '/tmp/shot-3-combat.png' });

// 4) NEXT DEPTH or cleared room state
await p.waitForTimeout(9000);
await p.screenshot({ path: '/tmp/shot-4-later.png' });

// 5) GAME OVER → back to hub (hero dies eventually at low upgrade level; else capture whatever state)
await p.waitForTimeout(20000);
await p.screenshot({ path: '/tmp/shot-5-end.png' });

console.log('done');
await b.close();
