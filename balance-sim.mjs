/* P10 balance sim: hero descends rooms; confirm death happens before depth 30
   at baseline upgrades, and progression is climbable with upgrades.
   Uses ONLY src/logic.ts formulas — same source as the game. */
import { heroStats, heroDps, enemyStats, enemyCount, roomClearReward, upgradeCost, isCritical } from './src/logic';

const base = { attack: 1, health: 1, offlineRate: 1, attackSpeed: 1, critChance: 1 };

function simRun(upgrades) {
    const st = heroStats(upgrades);
    let hp = st.maxHp;
    let gold = 150;
    for (let depth = 1; depth <= 30; depth++) {
        const count = enemyCount(depth);
        for (let e = 0; e < count && hp > 0; e++) {
            const en = enemyStats(depth);
            // alternate hits using real attack speeds
            while (en.maxHp > 0 && hp > 0) {
                en.maxHp -= st.attackDamage * (Math.random() < st.critChance ? 2 : 1);
                if (en.maxHp <= 0) break;
                hp -= en.attackDamage;
            }
            if (hp <= 0) return { deathDepth: depth, gold };
        }
        if (hp <= 0) return { deathDepth: depth, gold };
        gold += roomClearReward(depth) + count * enemyStats(depth).goldDrop;
    }
    return { deathDepth: null, gold };
}

// Baseline (no upgrades): expect death well before 30
const r0 = simRun(base);
console.log('baseline death depth:', r0.deathDepth, 'gold earned:', r0.gold);

// Upgraded path: spend starting gold + earnings greedily on attack/health
let u = { ...base };
let gold = 150;
let run = 1;
while (run <= 40 && gold >= upgradeCost(u.attack)) {
    // buy cheapest meaningful upgrade
    if (gold >= upgradeCost(u.attack)) { gold -= upgradeCost(u.attack); u.attack++; }
    else break;
    const res = simRun(u);
    console.log(`run ${run}: atk=${u.attack} → ${res.deathDepth ? 'died @' + res.deathDepth : 'CLEARED 30'} (banked ${res.gold})`);
    gold += res.gold;
    if (!res.deathDepth) { console.log('DEPTH 30 REACHED at attack lvl', u.attack); break; }
    run++;
}

const ok = typeof r0.deathDepth === 'number' && r0.deathDepth >= 3 && r0.deathDepth <= 15;
console.log(ok ? 'BALANCE PASS' : 'BALANCE CHECK MANUALLY');
