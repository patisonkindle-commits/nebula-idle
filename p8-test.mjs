import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 } });
await p.goto('http://localhost:8778/', { waitUntil: 'load' });
await p.waitForFunction(() => window.__game && window.__game.scene.isActive('HubScene'), null, { timeout: 15000 });
await p.waitForTimeout(600);

// 1. Five upgrade rows exist
const r1 = await p.evaluate(() => {
    const h = window.__game.scene.getScene('HubScene');
    const labels = h.children.getChildren().filter(c => c.text)
        .map(c => c.text).filter(t => ['Attack', 'Max HP', 'Offline G/s', 'Attack Speed', 'Crit Chance'].includes(t));
    return { rows: labels.length, labels };
});
console.log('ROWS:', JSON.stringify(r1));

// 2. Drag-scroll moves camera
const y0 = await p.evaluate(() => window.__game.scene.getScene('HubScene').cameras.main.scrollY);
await p.mouse.move(270, 700);
await p.mouse.down();
await p.mouse.move(270, 400, { steps: 8 }); // drag up → scroll down
await p.mouse.up();
await p.waitForTimeout(200);
const y1 = await p.evaluate(() => window.__game.scene.getScene('HubScene').cameras.main.scrollY);
console.log('SCROLL:', y0, '→', y1);

// 3. Buy attackSpeed upgrade via row button → registry + save migration shape
await p.evaluate(() => {
    const h = window.__game.scene.getScene('HubScene');
    h.registry.set('gold', 5000); // afford
    // find the Attack Speed row's buy btn (5th blue square)
    const btns = h.children.getChildren().filter(c => c.frame && String(c.frame.name).startsWith('buttonSquare'));
    btns[3].emit('pointerup'); // pointerdown already sets frame; emit up = purchase path
});
await p.waitForTimeout(200);
const r2 = await p.evaluate(() => {
    const reg = window.__game.registry;
    const saved = JSON.parse(localStorage.getItem('nebulaIdleSave') || '{}');
    return { asLevel: (reg.get('upgrades').attackSpeed), critLvl: reg.get('upgrades').critChance,
        savedAS: saved.upgrades ? saved.upgrades.attackSpeed : null };
});
console.log('BUY:', JSON.stringify(r2));

const pass = r1.rows === 5 && y1 > y0 && r2.asLevel === 2 && r2.critLvl === 1;
console.log(pass ? 'P8 PASS' : 'P8 FAIL');
await b.close();
