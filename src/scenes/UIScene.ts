import * as Phaser from 'phaser';

/**
 * Bottom 40% UI strip (y: 1152-1920). Runs concurrently above GameScene.
 * Shows hero HP bar, gold, and run stats.
 */
export class UIScene extends Phaser.Scene {
    private hpBar!: Phaser.GameObjects.Graphics;
    private goldText!: Phaser.GameObjects.Text;
    private depthText!: Phaser.GameObjects.Text;
    private lastGold = -1;
    private lastDepth = '';

    constructor() {
        super({ key: 'UIScene', active: false });
    }

    create() {
        const width = this.cameras.main.width;
        const top = 1152; // UI safe area starts here

        // Panel background
        this.add.image(width / 2, (1920 + top) / 2, 'ui-rpg', 'panel_beige.png')
            .setDisplaySize(1080, 768);

        this.add.text(width / 2, top + 60, 'HERO', {
            font: '40px monospace', color: '#5c4033', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.hpBar = this.add.graphics();
        this.goldText = this.add.text(width / 2, top + 260, '', {
            font: '48px monospace', color: '#d4af37'
        }).setOrigin(0.5);
        this.depthText = this.add.text(width / 2, top + 360, '', {
            font: '36px monospace', color: '#8a6d3b'
        }).setOrigin(0.5);
    }

    update() {
        const gs = this.scene.get('GameScene') as any;
        if (!gs || !gs.hero) return;

        const hero = gs.hero;
        const top = 1152;
        const W = 900, H = 40, X = (1080 - W) / 2, Y = top + 120;

        this.hpBar.clear();
        this.hpBar.fillStyle(0x000000, 0.5).fillRect(X - 4, Y - 4, W + 8, H + 8);
        const pct = Phaser.Math.Clamp(hero.currentHp / hero.maxHp, 0, 1);
        this.hpBar.fillStyle(pct > 0.3 ? 0x2ecc71 : 0xe74c3c, 1).fillRect(X, Y, W * pct, H);

        const game = this.scene.get('GameScene') as any;
        const gold = (this.registry.get('gold') as number) + (game.runGold ?? 0);
        if (gold !== this.lastGold) {
            this.goldText.setText(`Gold: ${gold}`);
            this.lastGold = gold;
        }
        const dLabel = `DEPTH ${gs.depthNum ?? 1}`;
        if (dLabel !== this.lastDepth) {
            this.depthText.setText(dLabel);
            this.lastDepth = dLabel;
        }
    }
}
