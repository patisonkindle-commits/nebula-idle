# nebula-idle Handoff Note

**Date:** 2026-08-25 · **Version:** v0.2.0+ (post-v0.2.0 commits) · **Branch:** `master`
**Repo:** https://github.com/patisonkindle-commits/nebula-idle

## What this is
Phaser 3 idle dungeon-crawler (auto-battle). Hero climbs depths automatically, enemies come to him, gold funds upgrades at BASE CAMP hub. Packaged as Android APK via Capacitor 6 (`com.patison.nebulaidle`).

## Current state — working
- 36/36 vitest, tsc strict clean, e2e green, balance sim PASS (death ~depth 18-19)
- Dungeon visuals: Kenney Tiny Dungeon tiles — floor `tile_0048–0052` (tan dirt), walls `0008–0011`, door closed `0034`. All tiles **must** use `setScale(4)` (16px art on 64px grid)
- Hero = `tile_0100` (knight), scale 6. Enemies = `tile_0108/0113/0122/0123/0124`, scale 6 (~1.5 tiles tall)
- Enemy HP bars redrawn in `preUpdate()`, offset from `displayHeight` (already includes scale — do NOT multiply by scaleY again, that was the floating-bar bug)
- UIScene (bottom HERO panel): NineSlice panel + barRed 3-piece sprite HP bar (caps 12px + stretchable mid via `setDisplaySize`)
- UIScene lifecycle: stopped in hero-death handler before HubScene transition + update guard when GameScene inactive (was the stuck-panel bug)
- Boss floors every 5th depth: single enemy scale 10, tint `0xff6b6b`, HP×8, atk×2.5, gold×20, red "☠ BOSS FLOOR" label
- Elite variant: 10% chance normal rooms, gold tint `0xffd700`, HP×3, atk×1.6, drop×5
- SFX/BGM procedural chiptune, mute toggle; autosave 30s + visibility-loss save
- Hub: 5 upgrades (attack/max HP/offline G/s/crit/attack speed) with drag-scroll

## Build & test commands
```bash
# dev server (port 8778)
python3 -m http.server 8778 -d dist   # after npm run build

# tests
npx vitest run
node e2e.mjs http://localhost:8778/
npx tsx balance-sim.mjs               # NOT plain node — ESM import needs tsx

# screenshots (Playwright, /snap/bin/chromium)
node capture-sequence.mjs             # 5 shots: hub→depth progression
node boss-test.mjs                    # jump to depth 5 boss room

# Android APK (WSL: default java is Windows .exe, hangs!)
cd android && JAVA_HOME=$HOME/.local/jdk21 \
  $HOME/.local/jdk21/bin/java -cp gradle/wrapper/gradle-wrapper.jar \
  org.gradle.wrapper.GradleWrapperMain assembleDebug --no-daemon
cp app/build/outputs/apk/debug/app-debug.apk ../nebula-idle-debug.apk
```

## Pending backlog (from GDD audit)
1. **AdMob rewarded ads** — double offline earnings + revive once/run. Blocked on AdMob app/unit IDs for THIS app (existing pub ID is for web games, not reusable). Code has NO revive yet.
2. **Release keystore** — still debug-signed. Copy pattern from nebula-shooter (`android/app/nebula-release.keystore`). Needed before Play Store.
3. Improvement ideas (user-approved list): damage crit visual emphasis, offline cap raise + return badge, daily streak.

## Gotchas
- `write_file` silently fails >3KB or empty files in this env — verify with ls, use Python open().write()
- GitHub token: `~/.github-token`, login patisonkindle-commits. Push with token-inline then scrub remote URL
- Phaser game exposed as `window.__game` (main.ts) — headless tests use `__game.scene.getScene('GameScene')`
- Enemy texture array pattern: pass string, GameEntity picks frame 0
- BGM-after-gameover bug pattern exists in nebula-shooter — not yet audited here

## Session history
Full detail in git log; key commits since v0.2.0 tag:
`08e9c41` visuals fix → `ba9dfc2` tile scale → `be99604` sprites+HP tracking → `a91b6d0` bar snug+UIScene stop → `8edcf9e` entity scale 6 → `b8d5fe3` P7 UIScene nineslice+barRed → `60c400e` boss+elite
