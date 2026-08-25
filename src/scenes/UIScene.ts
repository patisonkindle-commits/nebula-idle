import * as Phaser from 'phaser';

/**
 * Bottom 40% UI strip (y: 1152-1920). Runs concurrently above GameScene.
 * Shows hero HP bar, gold, and run stats.
 */
export class UIScene extends Phaser.Scene {
    private hpBar!: Phaser.GameObjects.Graphics;
    private barLeft!: Phaser.GameObjects.Image;
    private barMid!: Phaser.GameObjects.Image;
    private barRight!: Phaser.GameObjects.Image;
    private BW = 900; private BH = 40;
    private barBX = 0; private barBY = 0;
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

        // Panel background — NineSlice keeps corners undistorted (GDD asset map)
        this.add.nineslice(width / 2, (1920 + top) / 2, 'ui-rpg', 'panel_beige.png',
            1080, 768, 16, 16, 16, 16);

        this.add.text(width / 2, top + 60, 'HERO', {
            font: '40px monospace', color: '#5c4033', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.hpBar = this.add.graphics(); // backdrop only; fill = barRed sprites below
        // P7: sprite-based bar per GDD asset map (left cap + stretchable mid + right cap)
        const BX = (width - this.BW) / 2, BY = top + 120;
        this.barBX = BX; this.barBY = BY;
        this.barLeft = this.add.image(BX, BY + this.BH / 2, 'ui-rpg', 'barRed_horizontalLeft.png')
            .setOrigin(0, 0.5).setDisplaySize(12, this.BH).setDepth(1);
        this.barMid = this.add.image(BX + 12, BY + this.BH / 2, 'ui-rpg', 'barRed_horizontalMid.png')
            .setOrigin(0, 0.5).setDisplaySize(this.BW - 24, this.BH).setDepth(1);
        this.barRight = this.add.image(BX + this.BW - 12, BY + this.BH / 2, 'ui-rpg', 'barRed_horizontalRight.png')
            .setOrigin(0, 0.5).setDisplaySize(12, this.BH).setDepth(1);
        this.goldText = this.add.text(width / 2, top + 260, '', {
            font: '48px monospace', color: '#d4af37'
        }).setOrigin(0.5);
        this.depthText = this.add.text(width / 2, top + 360, '', {
            font: '36px monospace', color: '#8a6d3b'
        }).setOrigin(0.5);
    }

    update() {
        const gs = this.scene.get('GameScene') as any;
        if (!gs || !gs.hero || !this.scene.isActive('GameScene')) return;

        const hero = gs.hero;
        const top = 1152;
        const W = 900, H = 40, X = (1080 - W) / 2, Y = top + 120;

        this.hpBar.clear();
        this.hpBar.fillStyle(0x000000, 0.5).fillRect(X - 4, Y - 4, W + 8, H + 8);
        const pct = Phaser.Math.Clamp(hero.currentHp / hero.maxHp, 0, 1);
        // stretch red mid to current HP fraction
        this.barMid.setVisible(pct > 0.001);
        this.barMid.setX(this.barBX + 12); // left cap + gap
        this.barMid.setDisplaySize(Math.max(0.01, (this.BW - 24) * pct), this.BH);

        const game = this.scene.get('GameScene') as any;
        const gold = (this.registry.get('gold') as number) + ((this.registry.get('runGold') as number) || 0) - (game?.bankedGold ?? 0);
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
