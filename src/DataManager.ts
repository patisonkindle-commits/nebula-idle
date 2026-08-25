import * as Phaser from 'phaser';
import { heroDps, offlineGold, type Upgrades } from './logic';

/** Fill missing upgrade keys with level-1 defaults; tolerate partial/garbage saves */
export function migrateSave(raw: Partial<SaveData> | null | undefined): SaveData {
    const up: Partial<Upgrades> = (raw && typeof raw === 'object' && raw.upgrades) || {};
    return {
        gold: typeof raw?.gold === 'number' ? raw.gold : 150,
        highestDepth: raw?.highestDepth ?? 1,
        lastLogin: raw?.lastLogin ?? 0,
        muted: !!raw?.muted,
        upgrades: {
            attack: up.attack ?? 1,
            health: up.health ?? 1,
            offlineRate: up.offlineRate ?? 1,
            attackSpeed: up.attackSpeed ?? 1,
            critChance: up.critChance ?? 1,
        },
    };
}

export interface SaveData {
    gold: number;
    highestDepth: number;
    lastLogin: number;
    upgrades: Upgrades;
    muted?: boolean;
}

const KEY = 'nebulaIdleSave';

export class DataManager {
    static save(registry: Phaser.Data.DataManager) {
        const data = registry.getAll() as Partial<SaveData>;
        data.lastLogin = Date.now();
        localStorage.setItem(KEY, JSON.stringify(data));
    }

    static load(): SaveData | null {
        try {
            const raw = localStorage.getItem(KEY);
            return raw ? JSON.parse(raw) as SaveData : null;
        } catch {
            return null;
        }
    }

    /**
     * PRD §3: gains scale on DPS, deepest floor reached, and time away.
     * offlineRate upgrade adds +25%/level above 1. Shared logic.offlineGold
     * keeps formula unit-tested in one place.
     */
    static calculateOfflineProgress(saveTime: number, upgrades: Upgrades, highestDepth = 1): number {
        const secondsOffline = Math.max(0, (Date.now() - saveTime) / 1000);
        return offlineGold(secondsOffline, heroDps(upgrades), highestDepth, upgrades.offlineRate);
    }
}
