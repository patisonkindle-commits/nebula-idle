import * as Phaser from 'phaser';
import { DamageTextPool } from '../DamageTextPool';
import {
    heroStats, enemyStats, enemyCount, roomClearReward,
    isCritical, CRIT_MULTIPLIER, type Upgrades,
} from '../logic';

const TILE = 64;          // 16px art scaled to 64
const COLS = 17;          // 1080 / 64 ≈ 16.9 → 17 columns
const ROWS = 18;          // 1152 / 64 = 18 rows (action area only)

interface EntityOpts {
    maxHp: number;
    attackDamage: number;
    attackSpeed: number; // ms between attacks
}

class GameEntity extends Phaser.Physics.Arcade.Sprite {
    public maxHp: number;
    public currentHp: number;
    public attackDamage: number;
    public attackSpeed: number;
    protected lastAttackTime = 0;
    protected hpBar!: Phaser.GameObjects.Graphics;

    critChance = 0.05;
    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame: number, opts: EntityOpts) {
        super(scene, x, y, texture, frame);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.maxHp = opts.maxHp;
        this.currentHp = opts.maxHp;
        this.attackDamage = opts.attackDamage;
        this.attackSpeed = opts.attackSpeed;
        this.hpBar = scene.add.graphics();
        this.drawHpBar();
    }

    get alive(): boolean {
        return this.active && this.currentHp > 0;
    }

    drawHpBar() {
        this.hpBar.clear();
        const w = 56, h = 8;
        const x = this.x - w / 2, y = this.y - 44;
        this.hpBar.fillStyle(0x000000, 0.6).fillRect(x - 1, y - 1, w + 2, h + 2);
        const pct = Phaser.Math.Clamp(this.currentHp / this.maxHp, 0, 1);
        this.hpBar.fillStyle(0xe74c3c, 1).fillRect(x, y, w * pct, h);
    }

    takeDamage(amount: number) {
        this.currentHp -= amount;
        this.scene.events.emit('spawnDamageText', this.x, this.y - 20, amount);
        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(60, () => { if (this.active) this.clearTint(); });
        if (this.currentHp <= 0) this.die();
        else this.drawHpBar();
    }

    die() {
        this.currentHp = 0;
        this.hpBar.destroy();
        this.destroy();
    }
}

class Hero extends GameEntity {
    private target: Enemy | null = null;
    /** Player-tapped priority target (GDD controls spec); null = auto-nearest */
    public priorityTarget: Enemy | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number, stats: Upgrades) {
        const stats2 = heroStats(stats);
        super(scene, x, y, 'characters', 0, stats2);
        this.critChance = stats2.critChance;
        this.setScale(4).setDepth(10).setAlpha(1);
        this.hpBar.setDepth(11);
    }

    update(time: number) {
        if (!this.alive) return;
        const enemies = (this.scene as GameScene).enemies.filter(e => e.alive);

        // GDD: tapped enemy overrides auto-target until it dies
        if (this.priorityTarget && this.priorityTarget.alive) {
            this.target = this.priorityTarget;
        } else if (!this.target || !this.target.alive) {
            this.target = this.findNearestEnemy(enemies);
            return;
        } else if (this.priorityTarget) {
            this.priorityTarget = null; // priority died, back to auto
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        if (dist > 90) {
            this.scene.physics.moveToObject(this, this.target, 220);
        } else {
            (this.body as Phaser.Physics.Arcade.Body).reset(this.x, this.y);
            if (time > this.lastAttackTime + this.attackSpeed) {
                // GDD: 5% chance of 2x critical damage
                const crit = isCritical(Math.random(), this.critChance);
                this.target.takeDamage(crit ? this.attackDamage * CRIT_MULTIPLIER : this.attackDamage);
                this.scene.sound.play(crit ? 'crit' : 'hit', { volume: 0.4 });
                this.lastAttackTime = time;
                // lunge feedback
                this.scene.tweens.add({ targets: this, scaleX: 4.6, scaleY: 4.6, yoyo: true, duration: 70 });
            }
        }
    }

    private findNearestEnemy(enemies: Enemy[]): Enemy | null {
        let best: Enemy | null = null;
        let bestDist = Infinity;
        for (const e of enemies) {
            const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
            if (d < bestDist) { bestDist = d; best = e; }
        }
        return best;
    }
}

class Enemy extends GameEntity {
    public goldDrop: number;

    constructor(scene: Phaser.Scene, x: number, y: number, frame: number, depthScale: number) {
        // GDD exponential scaling via logic.enemyStats (±15% HP variance)
        const st = enemyStats(depthScale);
        super(scene, x, y, 'characters', frame, {
            maxHp: st.maxHp,
            attackDamage: st.attackDamage,
            attackSpeed: 1100
        });
        this.goldDrop = st.goldDrop;
        this.setScale(4).setDepth(10);
        this.hpBar.setDepth(11);
    }

    die() {
        // GDD: enemy death awards its gold drop immediately
        const g = this.scene.registry.get('gold') as number;
        this.scene.registry.set('gold', g + this.goldDrop);
        const rg = (this.scene.registry.get('runGold') as number) || 0;
        this.scene.registry.set('runGold', rg + this.goldDrop);
        super.die();
    }

    update(time: number, hero: Hero) {
        if (!this.alive || !hero.alive) return;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, hero.x, hero.y);
        if (dist > 80) {
            this.scene.physics.moveToObject(this, hero, 110 + this.attackDamage * 2);
        } else {
            (this.body as Phaser.Physics.Arcade.Body).reset(this.x, this.y);
            if (time > this.lastAttackTime + this.attackSpeed) {
                hero.takeDamage(this.attackDamage);
                this.lastAttackTime = time;
            }
        }
    }
}

export class GameScene extends Phaser.Scene {
    public enemies: Enemy[] = [];
    private hero!: Hero;
    private depthNum = 1;
    private transitioning = false;
    private damagePool!: DamageTextPool;
    private tiles: Phaser.GameObjects.Image[] = [];
    private doorTile!: Phaser.GameObjects.Image;
    private depthText!: Phaser.GameObjects.Text;

    constructor() {
        super('GameScene');
    }

    init(data: { depth?: number }) {
        this.depthNum = data.depth ?? 1;
        this.transitioning = false;
        this.enemies = [];
        this.tiles = [];
        if (this.depthNum === 1) this.registry.set('runGold', 0); // fresh run
    }

    create() {
        const upgrades = this.registry.get('upgrades') as Upgrades;
        (this as any).bankedGold = this.registry.get('gold') as number;

        this.damagePool = new DamageTextPool(this);
        this.events.on('spawnDamageText', (x: number, y: number, dmg: number) => {
            this.damagePool.spawn(x, y, dmg);
        });

        // Camera bounds: action area only (1080x1152)
        this.cameras.main.setBounds(0, 0, COLS * TILE, ROWS * TILE);

        // Depth label floats in action area top-left (UIScene shows the rest)
        this.depthText = this.add.text(30, 24, `DEPTH ${this.depthNum}`, {
            font: '40px monospace', color: '#ffffff', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(200);

        this.buildRoom(upgrades);

        // GDD controls: tap an enemy to set priority target; sword cursor above it
        this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
            if (this.transitioning) return;
            const wp = ptr.worldX, wy = ptr.worldY;
            let best: Enemy | null = null;
            let bestDist = Infinity;
            for (const e of this.enemies) {
                if (!e.alive) continue;
                const d = Phaser.Math.Distance.Between(wp, wy, e.x, e.y);
                if (d < 60 && d < bestDist) { best = e; bestDist = d; }
            }
            this.setPriorityTarget(best);
        });

        // UI strip runs concurrently above the action camera
        if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    }

    private targetCursor: Phaser.GameObjects.Image | null = null;

    /** GDD: tapped enemy gets priority + cursorSword_gold marker above it */
    private setPriorityTarget(enemy: Enemy | null) {
        const hero = this.hero;
        if (hero) hero.priorityTarget = enemy;
        if (this.targetCursor) { this.targetCursor.destroy(); this.targetCursor = null; }
        if (!enemy) return;
        this.targetCursor = this.add.image(enemy.x, enemy.y - 70, 'ui-rpg', 'cursorSword_gold.png')
            .setScale(3).setDepth(50);
        this.tweens.add({
            targets: this.targetCursor,
            y: '-=10',
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    /** Single-screen brawler room per LDD */
    private buildRoom(upgrades: Upgrades) {
        // Floors: x 1-15, y 1-16 randomized variants
        for (let gy = 1; gy <= ROWS - 2; gy++) {
            for (let gx = 1; gx <= COLS - 2; gx++) {
                const variant = `tile_000${Phaser.Math.Between(0, 4)}`;
                this.tiles.push(this.add.image(gx * TILE + TILE / 2, gy * TILE + TILE / 2, variant).setDepth(0));
            }
        }
        // Walls: border with corners
        for (let gx = 0; gx < COLS; gx++) {
            for (const gy of [0, ROWS - 1]) {
                this.tiles.push(this.add.image(gx * TILE + TILE / 2, gy * TILE + TILE / 2,
                    (gx === 0 || gx === COLS - 1) ? 'tile_0016' : 'tile_0013').setDepth(1));
            }
        }
        for (let gy = 1; gy < ROWS - 1; gy++) {
            for (const gx of [0, COLS - 1]) {
                this.tiles.push(this.add.image(gx * TILE + TILE / 2, gy * TILE + TILE / 2, 'tile_0016').setDepth(1));
            }
        }

        // Door at top center — closed while enemies live
        this.doorTile = this.add.image(8 * TILE + TILE / 2, TILE / 2, 'tile_0034').setDepth(2);

        // Hero spawns bottom center (x: 8, y: 15)
        this.hero = new Hero(this, 8 * TILE + TILE / 2, 15 * TILE + TILE / 2, upgrades);

        // Enemies: N in top half (y 2-8), count scales with depth
        // GDD asset map: slime/skeleton/goblin variety from character sheet rows 5-8
        const count = enemyCount(this.depthNum);
        for (let i = 0; i < count; i++) {
            const ex = Phaser.Math.Between(2, COLS - 3) * TILE + TILE / 2;
            const ey = Phaser.Math.Between(2, 8) * TILE + TILE / 2;
            const frame = Phaser.Math.RND.pick([68, 69, 70, 74, 75, 82, 96]);
            this.enemies.push(new Enemy(this, ex, ey, frame, this.depthNum));
        }

        // Physics collision keeps everyone inside the room
        const walls = this.physics.add.staticGroup();
        const wallThickness = 8;
        const W = COLS * TILE, H = ROWS * TILE;
        walls.add(this.add.rectangle(W / 2, wallThickness / 2, W, wallThickness * 2, 0x000000, 0));
        walls.add(this.add.rectangle(W / 2, H - wallThickness / 2, W, wallThickness * 2, 0x000000, 0));
        walls.add(this.add.rectangle(wallThickness / 2, H / 2, wallThickness * 2, H, 0x000000, 0));
        walls.add(this.add.rectangle(W - wallThickness / 2, H / 2, wallThickness * 2, H, 0x000000, 0));
        this.physics.add.collider(this.hero, walls);
        this.enemies.forEach(e => this.physics.add.collider(e, walls));

        this.physics.add.overlap(this.hero, this.enemies, () => { /* contact handled in update */ });
    }

    update(time: number) {
        if (!this.hero.alive) {
            if (!this.transitioning) this.onHeroDeath();
            return;
        }

        this.hero.update(time);
        this.enemies.forEach(e => e.update(time, this.hero));
        this.hero.drawHpBar();

        // Sword cursor tracks priority target; drop it when target dies
        if (this.targetCursor) {
            const pt = this.hero.priorityTarget;
            if (!pt || !pt.alive) {
                this.targetCursor.destroy();
                this.targetCursor = null;
                if (pt && !pt.alive) this.hero.priorityTarget = null;
            } else {
                this.targetCursor.setPosition(pt.x, pt.y - 70);
            }
        }

        // Room cleared → open door → walk through → next depth
        const allCleared = this.enemies.every(e => !e.alive);
        if (allCleared && !this.transitioning) {
            this.transitioning = true;
            this.doorTile.setTexture('tile_0035'); // open door
            this.sound.play('door', { volume: 0.5 });
            this.sound.play('coin', { volume: 0.4 });

            // Reward gold per LDD progression
            const reward = roomClearReward(this.depthNum);
            this.registry.set('gold', (this.registry.get('gold') as number) + reward);
            this.registry.set('runGold', ((this.registry.get('runGold') as number) || 0) + reward);

            this.cameras.main.fadeOut(300, 0, 0, 0, () => {
                this.registry.set('highestDepth', Math.max(this.registry.get('highestDepth') as number, this.depthNum + 1));
                this.scene.restart({ depth: this.depthNum + 1 });
            });
        }
    }

    private onHeroDeath() {
        this.transitioning = true;
        this.sound.play('death', { volume: 0.5 });
        // Kill drops + clear bonuses were credited to registry.gold as earned;
        // record the run total for the hub summary
        this.registry.set('lastRunGold', (this.registry.get('runGold') as number) || 0);
        this.registry.remove('runGold');
        this.registry.set('deathDepth', this.depthNum);
        this.cameras.main.fadeOut(500, 0, 0, 0, () => {
            this.scene.start('HubScene');
        });
    }
}
