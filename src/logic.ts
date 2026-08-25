/**
 * Pure game formulas per GDD §2 / LDD / System Architecture.
 * No Phaser imports — runs under vitest headless.
 */

export type UpgradeKey = 'attack' | 'health' | 'offlineRate';

export interface Upgrades {
    attack: number;
    health: number;
    offlineRate: number;
    /** ms between attacks; each level −25ms, floor 350ms */
    attackSpeed?: number;
    /** crit chance; each level +0.75%, cap 30% (base 5%) */
    critChance?: number;
}

// --- Upgrade economy (GDD: cost(L) = floor(BASE * MULT^L)) ---
export const BASE_COST = 50;
export const COST_MULTIPLIER = 1.15;

export function upgradeCost(level: number): number {
    return Math.floor(BASE_COST * Math.pow(COST_MULTIPLIER, level));
}

// --- Hero stats (tuned values from playtest session, kept stable) ---
export function heroStats(u: Upgrades) {
    const asLvl = Math.max(1, u.attackSpeed ?? 1);
    const ccLvl = Math.max(1, u.critChance ?? 1);
    return {
        maxHp: 100 + (u.health - 1) * 30,
        attackDamage: 12 + (u.attack - 1) * 6,
        // −25ms/level, floor 350ms
        attackSpeed: Math.max(350, 700 - (asLvl - 1) * 25),
        // base 5% +0.75%/level, cap 30%
        critChance: Math.min(0.30, 0.05 + (ccLvl - 1) * 0.0075),
    };
}

/** Effective hero attacks per second × damage — drives offline earnings */
export function heroDps(u: Upgrades): number {
    const s = heroStats(u);
    return s.attackDamage * (1000 / s.attackSpeed);
}

// --- Enemy scaling (GDD §2: exponential per depth, ±15% HP variance) ---
export function enemyStats(depth: number, roll: number = Math.random()) {
    return {
        maxHp: Math.max(1, Math.floor(10 * Math.pow(1.2, depth) * (0.85 + roll * 0.3))),
        attackDamage: Math.floor(2 * Math.pow(1.1, depth)),
        goldDrop: Math.floor(2 + depth * 0.5),
    };
}

/** Enemies per room (LDD: min(3 + floor(D/5), 8)) */
export function enemyCount(depth: number): number {
    return Math.min(3 + Math.floor(depth / 5), 8);
}

/** Room-clear bonus gold (LDD progression reward) */
export function roomClearReward(depth: number): number {
    return 25 + depth * 10;
}

// --- Critical hits (GDD: base 5%, 2× damage) ---
export const CRIT_CHANCE = 0.05;
export const CRIT_MULTIPLIER = 2;

export function isCritical(rnd: number, chance: number = CRIT_CHANCE): boolean {
    return rnd < chance;
}

// --- Offline progress (PRD: based on DPS, deepest floor, time away) ---
export const OFFLINE_CAP = 99999;
/** Depth scaling: +10% earnings per deepest floor reached (softens early grind) */
export const OFFLINE_DEPTH_MULT = 0.1;

/**
 * PRD §3: "Simulated gains based on DPS, deepest floor reached, and time away."
 * offlineRate upgrade multiplies the result (1 level = ×1.0 baseline, each extra
 * level +25%).
 */
export function offlineGold(secondsOffline: number, dps: number, depth = 1, offlineLevel = 1): number {
    if (!(secondsOffline > 0) || !(dps > 0)) return 0;
    if (!(depth >= 1)) depth = 1;
    if (!(offlineLevel >= 1)) offlineLevel = 1;
    const base = secondsOffline * (dps / 50) * 5;
    const depthMult = 1 + (depth - 1) * OFFLINE_DEPTH_MULT;
    const rateMult = 1 + (offlineLevel - 1) * 0.25;
    return Math.min(Math.floor(base * depthMult * rateMult), OFFLINE_CAP);
}
