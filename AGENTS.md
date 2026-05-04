# AGENTS.md — Forge-Duel

## Project Overview
Pirate-themed Vampire Survivors roguelike built with **Phaser 3 + Vite** (frontend) and **Express + Socket.IO + MongoDB** (backend). Vanilla JS, ES modules.

## Commands

| What | Command |
|------|---------|
| Frontend dev server (port 3000) | `npm run dev` |
| Backend server (port 8080) | `npm run server` |
| Full-stack dev (both) | `npm run dev:full` |
| Production build | `npm run build` |
| Preview production build | `npm run preview` |
| Run all Playwright tests | `npm run pw:test` |
| Run single smoke test (headed) | `npm run pw:test:smoke` |

**No linter, formatter, or typecheck is configured.** There is nothing to run before committing beyond manual testing.

## Dev Server Architecture
- Vite dev server (port 3000) proxies `/api` and `/socket.io` to the Express backend (port 8080).
- `npm run dev` alone does **not** start the backend — use `npm run dev:full` or run `npm run server` separately.
- Backend requires a running MongoDB instance (default: `mongodb://localhost:27017/forge-duel`). Configure via `.env` (see `server/config.js`).

## Testing
- Playwright E2E only — no unit tests exist.
- Tests run against `vite preview` (port 4173), not the dev server. Playwright config auto-starts a preview server.
- Smoke test checks that the game canvas renders without JS errors. It is a single test in `tests/smoke.spec.js`.
- `fullyParallel: false, workers: 1` — tests run sequentially.

## Path Alias
`@` → `./src` (configured in `vite.config.js`). Use `import ... from '@/scenes/GameScene.js'` etc.

## Architecture Tips
- **GameScene.js is ~7400 lines** — the core gameplay monolith. Most game logic lives here.
- Game initialization waits for the Zpix font to load before creating the Phaser.Game instance (`src/main.js`).
- Scene registration order in `src/main.js` matters for Phaser's scene key mapping.
- Config files in `src/config/` are plain JS objects (enemy types, weapons, progression curves, etc.) — no JSON, no schema validation.
- Persistence is **localStorage** with keys prefixed `forgeduel_` (see README for the full list).
- The `dist/` directory is served as static files by the Express server in production.

## Adding Content
- **New enemy**: Add to `ENEMY_ARCHETYPE_CONFIGS` and `ENEMY_TYPE_WEIGHTS` in `src/config/enemies.js`.
- **New weapon**: Add definition to `src/config/weapons.js`, evolution rules to `WEAPON_EVOLUTION_RULES`, icon sprite, and asset reference in `src/config/assets.manifest.js`.
- **New scene**: Create in `src/scenes/`, register in the `scene` array in `src/main.js`.

## Key Conventions
- No TypeScript, no bundler aliases beyond `@`.
- Comments in code and `.gitignore` are in Chinese (中文).
- `scripts/` directory is empty — build uses Vite directly.