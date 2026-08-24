import * as Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        this.createLoadingBar();

        // 1. Kenney UI Pack RPG Expansion — atlas XML
        this.load.atlasXML(
            'ui-rpg',
            'assets/ui/uipack_rpg_sheet.png',
            'assets/ui/uipack_rpg_sheet.xml'
        );

        // 2. Kenney Roguelike Characters — 16x16 grid, 1px spacing (918x203 → 54 cols x 12 rows)
        this.load.spritesheet('characters', 'assets/characters/roguelikeChar_transparent.png', {
            frameWidth: 16,
            frameHeight: 16,
            margin: 0,
            spacing: 1
        });

        // 3. Kenney Tiny Dungeon tiles (individual 16x16 files)
        const requiredTiles = [
            'tile_0000', 'tile_0001', 'tile_0002', 'tile_0003', 'tile_0004',
            'tile_0013', 'tile_0016',
            'tile_0034', 'tile_0035'
        ];
        requiredTiles.forEach(tile => this.load.image(tile, `assets/tiles/${tile}.png`));
    }

    create() {
        // Build hero animation frames? Idle RPG needs none — static sprites scaled up.
        // Hero = index 0, enemies = a few distinct indices for variety.
        this.scene.start('HubScene');
    }

    private createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 240, height / 2 - 25, 480, 50);

        const loadingText = this.add.text(width / 2, height / 2 - 75, 'Loading...', {
            font: '32px monospace',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xd2b48c, 1);
            progressBar.fillRect(width / 2 - 230, height / 2 - 15, 460 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });
    }
}
