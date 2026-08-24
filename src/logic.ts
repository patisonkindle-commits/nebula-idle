/**
 * Pure game formulas per GDD §2 / LDD / System Architecture.
 * No Phaser imports — runs under vitest headless.
 */

export type UpgradeKey = 'attack' | 'health' | 'offlineRate';

export interface Upgrades {
    attack: number;
    health: number;
    offlineRate: number;
}

// --- Upgrade economy (GDD: cost(L) = floor(BASE * MULT^L)) ---
export const BASE_COST = 50;
export const COST_MULTIPLIER = 1.15;

export function upgradeCost(level: number): number {
    return Math.floor(BASE_COST * Math.pow(COST_MULTIPLIER, level));
}

// --- Hero stats (tuned values from playtest session, kept stable) ---
export function heroStats(u: Upgrades) {
    return {
        maxHp: 100 + (u.health - 1) * 30,
        attackDamage: 12 + (u.attack - 1) * 6,
        attackSpeed: 700, // ms between attacks
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

export function isCritical(rnd: number): boolean {
    return rnd < CRIT_CHANCE;
}

// --- Offline progress (Architecture doc: seconds * (DPS/50) * 5) ---
export const OFFLINE_CAP = 99999;

export function offlineGold(secondsOffline: number, dps: number): number {
    if (!(secondsOffline > 0) || !(dps > 0)) return 0;
    return Math.min(Math.floor(secondsOffline * (dps / 50) * 5), OFFLINE_CAP);
}
