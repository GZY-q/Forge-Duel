# ForgeDuel

A Vampire Survivors-like pirate-themed roguelike web game built with Phaser 3.

## Quick Start

```bash
npm install
npm run dev          # dev server with live reload
npm run server       # backend server
npm run build        # build dist/
```

## Project Structure

```
├── index.html           # Entry point, loading UI, auth helpers
├── styles.css           # Global styles, @font-face for Zpix, HUD layout
├── package.json
├── server/              # Node.js backend (Express + MongoDB)
│   ├── index.js         # Server entry
│   ├── config.js        # Env config
│   ├── auth/            # JWT auth routes & middleware
│   ├── db/              # MongoDB connection & models (User, PlayerData)
│   ├── api/             # Leaderboard & player-data API
│   ├── rooms/           # Multiplayer room management
│   └── signaling/       # WebRTC voice signaling
├── scripts/             # Build & serve scripts
│   ├── build.mjs        # esbuild bundler
│   └── serve-dist.mjs   # Static file server
├── tests/               # Playwright smoke tests
├── assets/
│   ├── fonts/           # Zpix pixel font (woff2 + ttf subset)
│   ├── audio/sfx/       # Sound effects (wav)
│   ├── atlas/           # UI texture atlas
│   └── sprites/         # Player, enemy, weapon, environment sprites
└── src/
    ├── main.js          # Phaser game config & entry point
    ├── scenes/          # 8 Phaser scenes
    │   ├── MainMenuScene.js
    │   ├── ShipSelectionScene.js
    │   ├── GameScene.js        # Core gameplay (7600+ lines)
    │   ├── RunSummaryScene.js  # End-of-run stats
    │   ├── UpgradeScene.js     # Meta upgrade shop
    │   ├── AuthScene.js        # Login/register
    │   ├── LobbyScene.js       # Multiplayer lobby
    │   └── LeaderboardScene.js
    ├── config/          # Game balance & data configs
    │   ├── director.js        # Spawn director difficulty scaling
    │   ├── enemies.js         # Enemy archetypes, elite types
    │   ├── progression.js     # XP curve, spawn lanes, item drops
    │   ├── weapons.js         # Weapon definitions & evolution rules
    │   ├── ships.js           # Ship/character configs
    │   ├── fighters.js        # Fighter archetypes
    │   └── assets.manifest.js # Asset loading manifest
    ├── entities/        # Game object classes
    │   ├── Player.js
    │   ├── Enemy.js
    │   ├── BossEnemy.js
    │   ├── ItemDrop.js
    │   ├── TreasureChest.js
    │   └── Destructible.js
    ├── Systems/         # Game systems
    │   ├── DirectorSystem.js    # Spawn director (Build/Peak/Relief phases)
    │   ├── WeaponSystem.js      # Weapon management & evolution
    │   ├── MetaProgressionSystem.js
    │   ├── ObjectPool.js        # Enemy & item pooling
    │   └── StatusEffectSystem.js
    ├── networking/      # Multiplayer (WebSocket + WebRTC)
    │   ├── SocketClient.js
    │   ├── NetworkManager.js
    │   ├── PlayerSync.js
    │   ├── EnemySync.js
    │   └── VoiceManager.js
    └── ui/
        └── createBackButton.js # Reusable back button component
```

## Game Architecture

### Tech Stack
- **Frontend**: Phaser 3.90 (canvas 2D), vanilla JS (ES modules), DOM HUD overlay
- **Backend**: Express + Socket.IO + MongoDB (Mongoose)
- **Font**: Zpix pixel font (self-hosted, subset to game characters ~18KB woff2)
- **Build**: esbuild for bundling/minification

### Scene Flow
```
MainMenuScene → ShipSelectionScene → GameScene → RunSummaryScene
                     ↑                                    │
                     └────────────────────────────────────┘
MainMenuScene → AuthScene → LobbyScene → ShipSelectionScene → GameScene (coop)
MainMenuScene → UpgradeScene
MainMenuScene → LeaderboardScene
```

### Game Loop (GameScene)
1. **Spawn Director** cycles through BUILD (30s) → PEAK (15s) → RELIEF (8s) phases
2. Enemy HP/damage scale exponentially per minute (`base * (1 + rate)^minutes`)
3. XP from kills → level up → choose weapon/passive upgrades
4. Boss every 180s, mini-boss every 60s
5. Death → save coins → RunSummaryScene

### Key Config Values
- **XP curve**: Level requirements in `config/progression.js`
- **Difficulty scaling**: HP +10%/min, Damage +8%/min, Spawn rate +12%/min (exponential)
- **Enemy count**: 10 at 0s → 26+ at 120s+, capped at 80 active
- **Elite chance**: 4% base, +2.2%/min, max 72%

### Persistence (localStorage)
| Key | Purpose |
|-----|---------|
| `forgeduel_coins` | Coin balance |
| `forgeduel_meta_v1` | Meta upgrades (HP, speed, XP, weapons) |
| `forgeduel_best_time_ms` | Best survival time |
| `forgeduel_shop_upgrades_v1` | Upgrade shop purchases |
| `forgeduel_weapon_unlocks_v1` | Unlocked starting weapons |
| `forgeduel_ship_stats` | Ship unlock progress |
| `forgeduel_token` / `forgeduel_user` | Auth session |

### Mobile Controls
Touch controls are DOM-based (z-index: 100) overlaying the canvas:
- **Virtual joystick**: bottom-left, 68×68px — left thumb movement
- **Dash button**: bottom-right, 58×58px — right thumb dash action
- **Pause button**: top-right stack (below fullscreen & coins)
- Joystick & dash position: `bottom: 64px, left/right: 64px`

## Adding Features

### Adding a new enemy type
1. Add entry to `ENEMY_ARCHETYPE_CONFIGS` in `config/enemies.js`
2. Add weight to `ENEMY_TYPE_WEIGHTS`
3. Optionally add unlock time gating
4. Add sprites to `assets/sprites/enemies/<name>/`

### Adding a new weapon
1. Add weapon definition to `config/weapons.js`
2. Add evolution rules if applicable (`WEAPON_EVOLUTION_RULES`)
3. Add weapon icon to `assets/sprites/weapons/`
4. Add asset reference to `config/assets.manifest.js`

### Adjusting difficulty
- `config/director.js` — HP/damage/spawn rate scaling rates
- `config/progression.js` — Target enemy count curve, XP requirements
- `Systems/DirectorSystem.js` — Linear vs exponential formula choice

### Adding a new scene
1. Create scene class in `src/scenes/`
2. Register in `src/main.js` scene array
3. Transition via `this.scene.start("SceneName", data)`
