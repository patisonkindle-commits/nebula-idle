import * as Phaser from 'phaser';
import { DataManager } from '../DataManager';
import { migrateSave } from '../DataManager';
import { upgradeCost } from '../logic';

export class HubScene extends Phaser.Scene {
    private goldText!: Phaser.GameObjects.Text;

    constructor() {
        super('HubScene');
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const centerX = width / 2;

        this.initializeRegistry();

        // BGM loop (persisted mute toggle). Browser autoplay policy: wait for
        // first user gesture before audio can start.
        const startBgm = () => {
            this.sound.stopAll();
            if (!(this.registry.get('muted') as boolean)) {
                this.sound.add('bgm', { loop: true, volume: 0.25 }).play();
            }
            this.sound.setMute(!!(this.registry.get('muted') as boolean));
        };
        if (!this.sound.locked) startBgm();
        else this.sound.once(Phaser.Sound.Events.UNLOCKED, startBgm);

        // Background panel
        // GDD asset map: NineSlice keeps corners undistorted (Phaser 3.60+)
        this.add.nineslice(centerX, height / 2, 'ui-rpg', 'panel_beige.png',
            1000, 1800, 48, 48, 48, 48);

        this.add.text(centerX, 150, 'BASE CAMP', {
            font: '64px monospace',
            color: '#5c4033',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.goldText = this.add.text(centerX, 250, `Gold: ${this.registry.get('gold')}`, {
            font: '48px monospace',
            color: '#d4af37'
        }).setOrigin(0.5);

        // Mute toggle (persisted)
        const muted = !!(this.registry.get('muted') as boolean);
        const muteBtn = this.add.text(width - 60, 60, muted ? '\u266a\u0332' : '\u266a', {
            font: '44px monospace', color: muted ? '#999999' : '#5c4033'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        muteBtn.on('pointerdown', () => {
            const now = !(this.registry.get('muted') as boolean);
            this.registry.set('muted', now);
            this.sound.setMute(now);
            muteBtn.setColor(now ? '#999999' : '#5c4033');
        });

        // Offline earnings banner (if any)
        const offlineGold = this.registry.get('offlineGold') as number;
        if (offlineGold > 0) {
            this.add.text(centerX, 340, `While away you earned ${offlineGold} gold!`, {
                font: '30px monospace',
                color: '#7a5c2e'
            }).setOrigin(0.5);
            this.registry.set('gold', (this.registry.get('gold') as number) + offlineGold);
            this.registry.remove('offlineGold');
            this.goldText.setText(`Gold: ${this.registry.get('gold')}`);
        }

        // Depth display
        this.add.text(centerX, 400, `Deepest depth: ${this.registry.get('highestDepth')}`, {
            font: '32px monospace',
            color: '#8a6d3b'
        }).setOrigin(0.5);

        const lastRun = this.registry.get('lastRunGold') as number;
        if (lastRun !== undefined && this.registry.get('deathDepth') !== undefined) {
            this.add.text(centerX, 455, `Last run: ${lastRun}g @ depth ${this.registry.get('deathDepth')}`, {
                font: '28px monospace',
                color: '#6b5231'
            }).setOrigin(0.5);
        }

        // Upgrade rows
        // 5 rows @250px spacing — fits 960px-tall design only via P8 scrollable panel
        const rows: [string, 'attack' | 'health' | 'offlineRate' | 'attackSpeed' | 'critChance'][] = [
            ['Attack', 'attack'], ['Max HP', 'health'], ['Offline G/s', 'offlineRate'],
            ['Attack Speed', 'attackSpeed'], ['Crit Chance', 'critChance'],
        ];
        rows.forEach(([label, key], i) => this.createUpgradeRow(centerX, 600 + i * 250, label, key));

        // Autosave every 30s and on tab hide/close so lastLogin stays fresh
        this.time.addEvent({ delay: 30000, loop: true, callback: () => DataManager.save(this.registry) });
        this.game.events.on('visibilitychange', () => {
            if (document.hidden) DataManager.save(this.registry);
        });
        this.events.once('shutdown', () => {
            DataManager.save(this.registry);
            this.game.events.off('visibilitychange');
        });

        // Enter dungeon button
        const playBtn = this.add.image(centerX, 1900, 'ui-rpg', 'buttonLong_brown.png')
            .setInteractive()
            .setScale(1.5);
        const playText = this.add.text(centerX, 1595, 'ENTER DUNGEON', {
            font: '36px monospace',
            color: '#ffffff'
        }).setOrigin(0.5);

        playBtn.on('pointerdown', () => {
            playBtn.setFrame('buttonLong_brown_pressed.png');
            playText.setY(1605);
        });
        playBtn.on('pointerup', () => {
            playBtn.setFrame('buttonLong_brown.png');
            playText.setY(1595);
            DataManager.save(this.registry);
            this.scene.start('GameScene');
        });
        playBtn.on('pointerout', () => {
            playBtn.setFrame('buttonLong_brown.png');
            playText.setY(1595);
        });

        // Persist on exit too
        // Drag-to-scroll (native camera bounds — no plugin needed)
        const worldH = 2100;
        this.cameras.main.setBounds(0, 0, width, worldH);
        let dragging = false;
        let dragStartY = 0;
        let camStartY = 0;
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            dragging = true; dragStartY = p.y; camStartY = this.cameras.main.scrollY;
        });
        this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
            if (dragging) {
                const zoom = this.cameras.main.zoom;
                this.cameras.main.setScroll(0,
                    Phaser.Math.Clamp(camStartY - (p.y - dragStartY) / zoom, 0, worldH - height / zoom));
            }
        });
        this.input.on('pointerup', () => { dragging = false; });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => DataManager.save(this.registry));
    }

    private initializeRegistry() {
        if (this.registry.get('initialized')) return;

        const save = DataManager.load();
        if (save && save.upgrades) {
            const m = migrateSave(save);
            this.registry.set('gold', m.gold);
            this.registry.set('upgrades', m.upgrades);
            this.registry.set('highestDepth', m.highestDepth);
            // Offline progress
            if (save.lastLogin) {
                const earned = DataManager.calculateOfflineProgress(
                    save.lastLogin, m.upgrades, m.highestDepth);
                if (earned > 0) this.registry.set('offlineGold', earned);
            }
        } else {
            const m = migrateSave(null);
            this.registry.set('gold', m.gold);
            this.registry.set('upgrades', m.upgrades);
            this.registry.set('highestDepth', m.highestDepth);
        }
        this.registry.set('initialized', true);
    }

    private createUpgradeRow(x: number, y: number, label: string,
        upgradeKey: 'attack' | 'health' | 'offlineRate' | 'attackSpeed' | 'critChance') {
        const upgrades = this.registry.get('upgrades') as Record<string, number>;
        let currentLevel = upgrades[upgradeKey];
        let cost = upgradeCost(currentLevel);

        this.add.nineslice(x, y, 'ui-rpg', 'panelInset_brown.png', 800, 180, 24, 24, 24, 24);

        const titleText = this.add.text(x - 350, y - 40, label, { font: '36px monospace', color: '#ffffff' });
        const levelText = this.add.text(x - 350, y + 10, `Lvl: ${currentLevel}`, { font: '28px monospace', color: '#cccccc' });

        // 45x49 sprite ×1.4 scale → ~63px hit target (Android 48dp guideline)
        const buyBtn = this.add.image(x + 250, y, 'ui-rpg', 'buttonSquare_blue.png')
            .setScale(1.4).setInteractive({ useHandCursor: true });
        const costText = this.add.text(x + 250, y, `${cost}g`, { font: '28px monospace', color: '#ffffff' }).setOrigin(0.5);

        buyBtn.on('pointerdown', () => {
            buyBtn.setFrame('buttonSquare_blue_pressed.png');
            costText.setY(y + 5);
        });
        buyBtn.on('pointerup', () => {
            buyBtn.setFrame('buttonSquare_blue.png');
            costText.setY(y);

            const currentGold = this.registry.get('gold') as number;
            if (currentGold >= cost) {
                this.registry.set('gold', currentGold - cost);
                this.goldText.setText(`Gold: ${this.registry.get('gold')}`);

                currentLevel++;
                upgrades[upgradeKey] = currentLevel;
                this.registry.set('upgrades', upgrades);

                levelText.setText(`Lvl: ${currentLevel}`);
                cost = upgradeCost(currentLevel);
                costText.setText(`${cost}g`);
                DataManager.save(this.registry);
            } else {
                this.tweens.add({
                    targets: costText,
                    scale: 1.2,
                    yoyo: true,
                    duration: 100
                });
            }
        });
        buyBtn.on('pointerout', () => {
            buyBtn.setFrame('buttonSquare_blue.png');
            costText.setY(y);
        });
    }
}
