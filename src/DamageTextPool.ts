import * as Phaser from 'phaser';

/**
 * Pooled floating damage text. Max 30 concurrent — prevents Android GC frame drops.
 */
export class DamageTextPool extends Phaser.GameObjects.Group {
    constructor(scene: Phaser.Scene) {
        super(scene, {
            classType: Phaser.GameObjects.Text,
            maxSize: 30,
            runChildUpdate: true
        });
    }

    spawn(x: number, y: number, damage: number, color = '#ff5555') {
        const text = this.get(x, y) as Phaser.GameObjects.Text | null;
        if (!text) return; // pool full

        text.setActive(true).setVisible(true).setAlpha(1).setScale(1)
            .setText(`-${damage}`).setColor(color).setDepth(100);

        this.scene.tweens.add({
            targets: text,
            y: y - 50,
            alpha: 0,
            duration: 800,
            onComplete: () => {
                this.killAndHide(text);
                text.setAlpha(1);
            }
        });
    }
}
