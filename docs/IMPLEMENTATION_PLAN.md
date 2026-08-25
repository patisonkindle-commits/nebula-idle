# nebula-idle — Remaining Implementation Plan

Status after P1–P5 (commits ebf5adc..f1c1f94): pure formula module + tests, gold economy,
offline earnings, autosave, tap-to-target all done and verified.

Each phase: unit tests where logic exists → build → browser/E2E verify → commit.

---

## P6 — Combat feel & audio (S)
Source: Architecture §2 (preload audio), GDD §3 asset mapping.
- [ ] Load SFX in PreloadScene (Kenney RPG audio or CC0 pack): hit, crit, coin, door-open, hero-death
- [ ] Wire SFX: enemy hit / crit (higher pitch), kill coin, room-clear door, death sting
- [ ] BGM loop with mute toggle persisted in save (`muted: boolean`)
- [ ] Verify `roomClearReward()` (logic.ts) is actually credited on room clear — wire if missing
- [ ] Verify LDD §3 transition sequence: closed door tile_0034 → open tile_0035 swap, hero walks
      to door, 300ms fade out/in (fix any deviation)

## P7 — Visual fidelity per GDD asset map (M)
Source: GDD §3, Hub guide Integration Notes.
- [ ] Replace stretched panels with Phaser 3.60+ NineSlice: panel_beige (hub bg),
      panelInset_brown (upgrade rows)
- [ ] HP bar → NineSlice barRed_horizontalMid sprite (replace Graphics bar);
      reserve barBlue (mana, unused until skills)
- [ ] Button pressed states everywhere: buttonLong_brown_pressed, buttonSquare_blue_pressed
      (hub enter button + buy buttons currently static)
- [ ] Enemy sprite variety: random frame from character sheet rows 5–8 (slime/skeleton/goblin),
      per GDD mapping — confirm current frame selection, widen range if hardcoded
- [ ] Deliberate deviation stays: hero stats 100hp/12atk (+30/+6 per lvl) are playtest-tuned;
      doc sample values (50/5) intentionally NOT adopted — add comment in logic.ts

## P8 — Scrollable upgrade hub (M)
Source: GDD §4 Controls ("Rex scrollable panel for upgrade list").
- [ ] Add `phaser3-rex-plugins` dep (npm, no CDN)
- [ ] Wrap upgrade rows in Rex scrollable panel (vertical swipe, touch-first, bottom-40% zone)
- [ ] Only worth it with >3 rows: add 2 new upgrade keys behind pure formulas in logic.ts
      (candidates: attackSpeed −25ms/lvl capped, critChance +1%/lvl capped 30%) + unit tests
      BEFORE wiring UI (tests first)
- [ ] Save-schema migration: old saves missing new keys default to level 1 (test this)

## P9 — Android packaging & monetization (L, needs user input)
Source: PRD §1 monetization, §2 UX constraints.
- [ ] Capacitor wrap of Vite dist (android-playstore-build skill)
- [ ] Safe-area insets for notch/punch-hole (CSS env() / Capacitor viewport plugin)
- [ ] Touch target audit: all interactives ≥48dp, actions in bottom 40%
- [ ] AdMob rewarded ads (user must supply AdMob app/unit IDs):
      - "Watch to double offline earnings" on hub banner
      - "Revive once per run" on death screen (once/run flag, reset on hub entry)
- [ ] Optional/post-MVP: IAP gems — needs Play billing account; skip until asked
- [ ] Keystore reuse: nebula-release.keystore pattern (new alias for this app)

## P10 — Final QA & balance pass (S)
- [ ] Full vitest suite green (all new formulas covered)
- [ ] E2E regression: fresh run → depth 4+ → death → hub → banked gold correct
- [ ] Balance smoke: simulate dps curve vs enemy HP to depth 30 (script vs logic.ts),
      confirm death happens (exponential scaling wins) — no infinite-run exploit
- [ ] Offline cap sanity (99999), autosave survives reload
- [ ] Changelog ≤500 chars for release tag v0.2.0

---

Deliberate non-items:
- Skills/mana (UIScene "captures touch for skills") — no GDD formula exists; post-MVP
- Gems IAP economics — blocked on store account decisions
- Save key rename to 'idleRpgSave' — internal detail, churn without value
