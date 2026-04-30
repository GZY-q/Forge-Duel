export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1350;
export const ENEMY_POOL_SIZE = 420;
export const SAFE_RADIUS = 300;
export const BASE_SPAWN_CHECK_INTERVAL_MS = 250;
export const PLAYTEST_SPAWN_PACING_PRESETS = Object.freeze({
  EASY: Object.freeze({
    spawnIntervalScale: 1.15,
    targetCountScale: 0.85
  }),
  NORMAL: Object.freeze({
    spawnIntervalScale: 1,
    targetCountScale: 1
  }),
  HARD: Object.freeze({
    spawnIntervalScale: 0.85,
    targetCountScale: 1.2
  })
});
export const PLAYTEST_SPAWN_PACING_ORDER = Object.freeze(["EASY", "NORMAL", "HARD"]);
export const PLAYTEST_SPAWN_PACING_DEFAULT = "NORMAL";

export const SPAWN_LANES = Object.freeze({
  BOW: "BOW",
  STERN: "STERN",
  PORT: "PORT",
  STARBOARD: "STARBOARD"
});

export const SPAWN_LANE_KEYS = Object.freeze([
  SPAWN_LANES.BOW,
  SPAWN_LANES.STERN,
  SPAWN_LANES.PORT,
  SPAWN_LANES.STARBOARD
]);

// Lane rules: spawn off-screen around view bounds and sample within themed edge ranges.
export const SPAWN_LANE_RULES = Object.freeze({
  [SPAWN_LANES.BOW]: {
    edge: "top",
    rangeStart: 0.15,
    rangeEnd: 0.85,
    offscreenOffset: 90
  },
  [SPAWN_LANES.STERN]: {
    edge: "bottom",
    rangeStart: 0.15,
    rangeEnd: 0.85,
    offscreenOffset: 90
  },
  [SPAWN_LANES.PORT]: {
    edge: "left",
    rangeStart: 0.12,
    rangeEnd: 0.88,
    offscreenOffset: 90
  },
  [SPAWN_LANES.STARBOARD]: {
    edge: "right",
    rangeStart: 0.12,
    rangeEnd: 0.88,
    offscreenOffset: 90
  }
});

export const TARGET_ENEMY_CURVE = [
  { startSec: 0, endSec: 30, from: 10, to: 10 },
  { startSec: 30, endSec: 60, from: 14, to: 14 },
  { startSec: 60, endSec: 90, from: 18, to: 18 },
  { startSec: 90, endSec: 120, from: 22, to: 22 },
  { startSec: 120, endSec: 150, from: 26, to: 26 }
];

export const TARGET_ENEMY_FALLBACK = 26;
export const TARGET_ENEMY_WAVE_DURATION_SEC = 30;
export const TARGET_ENEMY_WAVE_INCREMENT = 4;

export const SPAWN_BURST_CONFIG = {
  defaultBurst: 1,
  steps: [
    { atSec: 35, burst: 2 },
    { atSec: 70, burst: 3 },
    { atSec: 120, burst: 2 }
  ]
};

export const XP_REQUIREMENTS = {
  byLevel: {
    1: 50,
    2: 80,
    3: 120
  },
  postL3Base: 120,
  postL3Step: 50
};

export const ITEM_DROP_CONFIGS = Object.freeze({
  health_orb: Object.freeze({
    id: "health_orb",
    label: "生命恢复",
    color: 0x44ff66,
    healAmount: 20,
    dropChance: 0.10,
    scale: 1.2,
    duration: 0
  }),
  shield: Object.freeze({
    id: "shield",
    label: "护盾充能",
    color: 0x4488ff,
    shieldDurationMs: 3000,
    dropChance: 0.03,
    scale: 1.3,
    duration: 0
  }),
  speed_boost: Object.freeze({
    id: "speed_boost",
    label: "速度提升",
    color: 0xffdd44,
    speedMultiplier: 1.3,
    speedDurationMs: 5000,
    dropChance: 0.05,
    scale: 1.15,
    duration: 0
  }),
  magnet: Object.freeze({
    id: "magnet",
    label: "磁铁",
    color: 0xcc44ff,
    dropChance: 0.02,
    scale: 1.25,
    duration: 0
  }),
  weapon_upgrade: Object.freeze({
    id: "weapon_upgrade",
    label: "武器升级",
    color: 0xff8800,
    dropChance: 0.04,
    scale: 1.3,
    duration: 0
  })
});

export const ITEM_DROP_KEYS = Object.freeze(Object.keys(ITEM_DROP_CONFIGS));
export const ITEM_POOL_SIZE = 60;
