import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 } });
await p.goto('http://localhost:8778/', { waitUntil: 'load' });
await p.waitForFunction(() => window.__game && window.__game.scene.isActive('HubScene'), null, { timeout: 15000 });
await p.waitForTimeout(600);

const hub = await p.evaluate(() => {
    const h = window.__game.scene.getScene('HubScene');
    const ns = h.children.getChildren().filter(c => c.type === 'NineSlice');
    const btns = h.children.getChildren().filter(c => c.frame && String(c.frame.name).includes('buttonLong'));
    return {
        nineSliceCount: ns.length,
        playBtnFrame: btns[0] ? String(btns[0].frame.name) : null,
    };
});
console.log('HUB:', JSON.stringify(hub));

// Press-and-hold enter button → pressed frame swap
await p.evaluate(() => {
    const h = window.__game.scene.getScene('HubScene');
    const btn = h.children.getChildren().find(c => c.frame && String(c.frame.name) === 'buttonLong_brown.png');
    btn.emit('pointerdown');
});
await p.waitForTimeout(150);
const pressed = await p.evaluate(() => {
    const h = window.__game.scene.getScene('HubScene');
    const btn = h.children.getChildren().find(c => c.frame && String(c.frame.name).startsWith('buttonLong'));
    return String(btn.frame.name);
});
// release → GameScene starts
await p.evaluate(() => {
    const h = window.__game.scene.getScene('HubScene');
    const btn = h.children.getChildren().find(c => c.frame && String(c.frame.name).startsWith('buttonLong'));
    btn.emit('pointerup');
});
await p.waitForFunction(() => window.__game.scene.isActive('GameScene'), null, { timeout: 10000 });
await p.waitForTimeout(800);
const gs = await p.evaluate(() => {
    const g = window.__game.scene.getScene('GameScene');
    const frames = (g.enemies || []).map(e => e.frame.name);
    return { uniqueEnemyFrames: [...new Set(frames)], count: frames.length };
});
console.log('PRESSED FRAME:', pressed);
console.log('ENEMIES:', JSON.stringify(gs));
const pass = hub.nineSliceCount >= 4 && pressed.includes('_pressed') && gs.count > 0;
console.log(pass ? 'P7 VISUAL PASS' : 'P7 VISUAL FAIL');
await b.close();
