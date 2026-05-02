# ForgeDuel

Pirate-themed Vampire Survivors-like roguelike built with Phaser 3.90 + vanilla JS (ES modules). Full-stack: Vite frontend, Express/MongoDB/Socket.IO backend.

## Commands

```bash
npm run dev          # Vite dev server on :3000 (proxies /api and /socket.io to :8080)
npm run server       # Express backend on :8080 (requires MongoDB)
npm run dev:full     # Both frontend + backend concurrently
npm run build        # vite build → dist/
npm run preview       # Preview built dist/ on :4173
npm run pw:test      # Playwright tests (requires npm run build first)
npm run pw:test:headed   # Headed Chromium
npm run pw:test:smoke    # Single smoke test only
```

Playwright tests run against `npm run preview`, not the dev server. Build before testing.

## Architecture

- **Game entrance**: `src/main.js` — Phaser config, scene registration, Zpix font load gate
- **Scenes** registered in `src/main.js` scene array. New scenes must be added there.
- **GameScene.js** is ~7400 lines and acts as the god class. It handles spawning, combat, XP, HUD, touch controls, bosses, meta progression, and game-over. Edit carefully — methods are tightly coupled through shared state.
- **Config layer** (`src/config/`) is the single source of truth for game balance. Tweaking difficulty? Edit `director.js`, `progression.js`, `enemies.js`. Not GameScene.
- **Systems** (`src/Systems/`) are standalone classes (DirectorSystem, WeaponSystem, etc.) instantiated by GameScene.
- **Entities** (`src/entities/`) are Phaser-aware game object classes (Player, Enemy, BossEnemy, ItemDrop, TreasureChest, Destructible).
- **Networking** (`src/networking/`) — Socket.IO client + WebRTC voice. Only active in multiplayer (LobbyScene → co-op GameScene).
- **Server** (`server/`) — Express + Socket.IO + MongoDB. Auth, leaderboard, player-data, room management, voice signaling. Not needed for single-player dev.

## Key Conventions

- **ES modules everywhere** (`"type": "module"` in package.json). All imports/exports use `.js` extensions.
- **Path alias**: `@` maps to `./src` via Vite config. Import as `@/config/weapons.js` etc.
- **No TypeScript, no linter, no formatter** configured. Follow existing vanilla JS style.
- **Game canvas**: 1280×720, pixel art mode (`pixelArt: true`, `antialias: false`).
- **Persistence**: localStorage with `forgeduel_` prefixed keys. See README for the full list.
- **Zpix font**: Self-hosted subset in `assets/fonts/`. Loaded via `document.fonts.load('16px Zpix')` before Phaser init.
- **DOM HUD overlay**: The HUD is HTML/CSS overlaid on the canvas, not rendered inside Phaser. See `styles.css` and `ensureDomHudOverlay()` in GameScene.
- **Mobile touch controls**: DOM-based overlay (z-index 100), not Phaser game objects.

## Testing

- Only one test file: `tests/smoke.spec.js` — checks that the game loads without page/console errors.
- Playwright config: `fullyParallel: false`, `workers: 1`, baseURL `http://127.0.0.1:4173`.
- Must `npm run build` before running tests (they use `npm run preview`).

## Gotchas

- **Vite dev proxy**: Frontend :3000 proxies `/api` and `/socket.io` to :8080. If backend isn't running, API calls silently fail (not crashing).
- **Package name** is `dashsurvivor` (not `forgeduel`). Don't be confused by `package.json`.
- **Vite build output** goes to `dist/`, which the Express server serves as static files at production time.
- **GameScene is monolithic**: When adding features, prefer creating a new System class in `src/Systems/` over growing GameScene further.
- **Assets manifest** (`src/config/assets.manifest.js`) must be updated when adding new sprite types or the sprite loader won't find them.
- **No CI config exists** — no `.github/workflows/`, no pre-commit hooks.