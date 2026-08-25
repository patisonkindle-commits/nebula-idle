import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 } });
await p.goto('http://localhost:8778/', { waitUntil: 'load' });
await p.waitForFunction(() => { const g = window.__game; return g && g.scene.isActive('HubScene'); }, null, { timeout: 15000 });
await p.evaluate(() => {
    const hub = window.__game.scene.getScene('HubScene');
    hub.scene.start('GameScene', { depth: 1 });
});
await p.waitForFunction(() => { const g = window.__game; return g && g.scene.isActive('GameScene'); }, null, { timeout: 15000 });
await p.waitForTimeout(1500);
const res = await p.evaluate(() => {
    const gs = window.__game.scene.getScene('GameScene');
    const e = gs.enemies.find(x => x.alive);
    if (!e) return { err: 'no enemy' };
    gs.input.emit('pointerdown', { worldX: e.x, worldY: e.y });
    const after = gs.hero.priorityTarget;
    return {
        tappedEnemyX: e.x,
        afterX: after ? after.x : null,
        cursorAlive: !!gs.targetCursor,
        heroTargetMatches: after ? gs.hero.target === after : false,
    };
});
console.log('TAP RESULT:', JSON.stringify(res));
await p.waitForTimeout(600);
const res2 = await p.evaluate(() => {
    const gs = window.__game.scene.getScene('GameScene');
    const pt = gs.hero.priorityTarget;
    return {
        priorityStillSet: !!pt && pt.alive,
        cursorFollows: gs.targetCursor && pt ? Math.abs(gs.targetCursor.x - pt.x) < 1 : false,
        heroMovingToward: gs.hero.body && gs.hero.body.velocity.length() > 0,
    };
});
console.log('CURSOR:', JSON.stringify(res2));
// Tap empty ground → clears priority
const res3 = await p.evaluate(() => {
    const gs = window.__game.scene.getScene('GameScene');
    gs.input.emit('pointerdown', { worldX: 100, worldY: 100 });
    return { clearedAfterEmptyTap: gs.hero.priorityTarget === null, cursorGone: !gs.targetCursor };
});
console.log('CLEAR:', JSON.stringify(res3));
await b.close();
