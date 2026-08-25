import * as Phaser from 'phaser';
import { heroDps, offlineGold, type Upgrades } from './logic';

/**
 * SaveData shape persisted to localStorage. Registry holds the same live data.
 */
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
