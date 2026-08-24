import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 } });
// Seed save: 10 min ago, attack=3 health=1 offlineRate=1, depth=4, gold=100
// dps = 12+2*6=24 → expect floor(600*(24/50)*5 * depthMult(1+0.3) * rate(1)) = 1440*1.3=1872
await p.addInitScript(() => {
    localStorage.setItem('nebulaIdleSave', JSON.stringify({
        gold: 100, highestDepth: 4,
        lastLogin: Date.now() - 600000,
        upgrades: { attack: 3, health: 1, offlineRate: 1 },
    }));
});
await p.goto('http://localhost:8778/', { waitUntil: 'load' });
await p.waitForFunction(() => { const g = window.__game; return g && g.scene.isActive('HubScene'); }, null, { timeout: 15000 });
const r = await p.evaluate(() => ({ gold: window.__game.registry.get('gold') }));
console.log('GOLD:', r.gold, '(seed 100 + expect +1872 = 1972)');
await p.screenshot({ path: '/tmp/e2e-offline.png' });
await b.close();
