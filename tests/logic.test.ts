import { describe, it, expect } from 'vitest';
import {
    upgradeCost, heroStats, heroDps,
    enemyStats, enemyCount, roomClearReward,
    isCritical, offlineGold, BASE_COST,
} from '../src/logic';

describe('upgradeCost (GDD: floor(50 * 1.15^L))', () => {
    it('level 1 costs floor(50*1.15)=57', () => expect(upgradeCost(1)).toBe(57));
    it('scales exponentially', () => {
        const c1 = upgradeCost(1), c2 = upgradeCost(2), c3 = upgradeCost(3);
        expect(c2).toBeGreaterThan(c1);
        expect(c3).toBeGreaterThan(c2);
    });
    it('matches formula', () => {
        for (let l = 1; l <= 20; l++) {
            expect(upgradeCost(l)).toBe(Math.floor(50 * Math.pow(1.15, l)));
        }
    });
});

describe('heroStats', () => {
    it('base level 1', () => {
        const s = heroStats({ attack: 1, health: 1, offlineRate: 1 });
        expect(s.maxHp).toBe(100);
        expect(s.attackDamage).toBe(12);
        expect(s.attackSpeed).toBe(700);
    });
    it('each attack level adds 6 dmg', () =>
        expect(heroStats({ attack: 4, health: 1, offlineRate: 1 }).attackDamage).toBe(30));
    it('each health level adds 30 hp', () =>
        expect(heroStats({ attack: 1, health: 5, offlineRate: 1 }).maxHp).toBe(220));
});

describe('heroDps', () => {
    it('base = dmg * attacks/sec', () =>
        expect(heroDps({ attack: 1, health: 1, offlineRate: 1 })).toBeCloseTo(12 * 1000 / 700));
    it('grows with attack upgrades', () => {
        const lo = heroDps({ attack: 1, health: 1, offlineRate: 1 });
        const hi = heroDps({ attack: 10, health: 1, offlineRate: 1 });
        expect(hi).toBeGreaterThan(lo);
    });
});

describe('enemyStats (GDD exponential scaling)', () => {
    it('depth 1 mid-roll', () =>
        expect(enemyStats(1, 0.5).maxHp).toBe(Math.floor(10 * 1.2 * 1.0)));
    it('hp grows monotonically at fixed roll', () => {
        let prev = 0;
        for (let d = 1; d <= 20; d++) {
            const hp = enemyStats(d, 0.5).maxHp;
            expect(hp).toBeGreaterThanOrEqual(prev);
            prev = hp;
        }
    });
    it('variance bounded ±15%', () => {
        for (const roll of [0, 1]) {
            const ideal = 10 * Math.pow(1.2, 5);
            const hp = enemyStats(5, roll).maxHp;
            expect(hp).toBeLessThanOrEqual(Math.floor(ideal * 1.15) + 1e-9 + 1);
        }
        expect(enemyStats(5, 0).maxHp).toBe(Math.floor(10 * Math.pow(1.2, 5) * 0.85));
    });
    it('gold drop = floor(2 + D/2)', () => {
        expect(enemyStats(1, 0.5).goldDrop).toBe(2);
        expect(enemyStats(7, 0.5).goldDrop).toBe(5);
    });
});

describe('enemyCount (LDD: min(3+floor(D/5), 8))', () => {
    it('depth 1 → 3', () => expect(enemyCount(1)).toBe(3));
    it('depth 10 → 5', () => expect(enemyCount(10)).toBe(5));
    it('caps at 8', () => expect(enemyCount(100)).toBe(8));
});

describe('roomClearReward', () => {
    it('depth 1 → 35', () => expect(roomClearReward(1)).toBe(35));
    it('depth 10 → 125', () => expect(roomClearReward(10)).toBe(125));
});

describe('isCritical (GDD: 5% chance)', () => {
    it('0.04 → crit', () => expect(isCritical(0.04)).toBe(true));
    it('0.06 → no crit', () => expect(isCritical(0.06)).toBe(false));
    it('boundary 0.05 → no crit (strict <)', () => expect(isCritical(0.05)).toBe(false));
});

describe('offlineGold (Architecture: s*(dps/50)*5)', () => {
    it('zero time → zero gold', () => expect(offlineGold(0, 17)).toBe(0));
    it('zero dps → zero gold', () => expect(offlineGold(3600, 0)).toBe(0));
    it('negative input guarded', () => expect(offlineGold(-5, 10)).toBe(0));
    it('one hour at dps 17', () =>
        expect(offlineGold(3600, 17)).toBe(Math.floor(3600 * (17 / 50) * 5)));
    it('caps at OFFLINE_CAP', () =>
        expect(offlineGold(365 * 24 * 3600, 500)).toBeLessThanOrEqual(99999));
});
