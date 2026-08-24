import * as Phaser from 'phaser';

/**
 * SaveData shape persisted to localStorage. Registry holds the same live data.
 */
export interface SaveData {
    gold: number;
    highestDepth: number;
    lastLogin: number;
    upgrades: {
        attack: number;
        health: number;
        offlineRate: number;
    };
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

    /** Formula per architecture doc: seconds * (DPS / 50) * 5 */
    static calculateOfflineProgress(saveTime: number, dps: number): number {
        const secondsOffline = (Date.now() - saveTime) / 1000;
        return Math.floor(secondsOffline * (dps / 50) * 5);
    }
}
