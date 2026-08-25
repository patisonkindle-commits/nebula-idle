import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 } });
await p.goto('http://localhost:8778/', { waitUntil: 'load' });
await p.waitForFunction(() => window.__game && window.__game.scene.isActive('HubScene'), null, { timeout: 15000 });
await p.waitForTimeout(600);
const r = await p.evaluate(() => {
    const h = window.__game.scene.getScene('HubScene');
    const t = h.children.getChildren().find(c => c.text === 'ENTER DUNGEON');
    const btn = h.children.getChildren().find(c => c.frame && String(c.frame.name) === 'buttonLong_brown.png' && c.input);
    // crit row center
    const crit = h.children.getChildren().filter(c => c.type === 'NineSlice')[4];
    return { labelY: t.y, btnY: btn.y, critRowBottom: crit.y + 90 };
});
console.log(JSON.stringify(r));
const pass = Math.abs(r.labelY - r.btnY) < 5;
console.log(pass ? 'LABEL FIX PASS' : 'FAIL');
await b.close();
