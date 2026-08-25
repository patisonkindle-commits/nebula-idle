import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 540, height: 960 } });
// Autoplay policy off so WebAudio starts without gesture
const ctx = b.contexts()[0];
await p.goto('http://localhost:8778/', { waitUntil: 'load' });
await p.waitForFunction(() => { const g = window.__game; return g && g.scene.isActive('HubScene'); }, null, { timeout: 15000 });
await p.waitForTimeout(800);

// Simulate user gesture to unlock WebAudio
await p.mouse.click(270, 480);
await p.waitForTimeout(500);
const r1 = await p.evaluate(() => {
    const hub = window.__game.scene.getScene('HubScene');
    return {
        locked: hub.sound.locked,
        audioLoaded: window.__game.cache.audio.exists('bgm') && window.__game.cache.audio.exists('hit'),
        bgmPlaying: hub.sound.getAllPlaying().length > 0 || !hub.sound.locked,
        muteBtnText: hub.children.getChildren().filter(c => c.text === '\u266a' || (c.text && c.text.startsWith('\u266a'))).length,
        muted: !!window.__game.registry.get('muted'),
    };
});
console.log('AUDIO STATE:', JSON.stringify(r1));

// Toggle mute → registry + sound.mute flip
await p.evaluate(() => {
    const hub = window.__game.scene.getScene('HubScene');
    const btn = hub.children.getChildren().find(c => c.text && c.text.startsWith('\u266a'));
    btn.emit('pointerdown');
});
await p.waitForTimeout(200);
const r2 = await p.evaluate(() => {
    const hub = window.__game.scene.getScene('HubScene');
    return { mutedNow: !!window.__game.registry.get('muted'), soundMuted: hub.sound.mute };
});
console.log('AFTER TOGGLE:', JSON.stringify(r2));
console.log(r1.audioLoaded && r2.mutedNow && r2.soundMuted ? 'AUDIO PASS' : 'AUDIO FAIL');
await b.close();
