export const ENEMY_ARCHETYPE_CONFIGS = {
  chaser: {
    speed: 85,
    hp: 14,
    damage: 10,
    xpValue: 9,
    radius: 14,
    scale: 1.44,
    tint: 0xff6d6d
  },
  tank: {
    speed: 45,
    hp: 70,
    damage: 14,
    xpValue: 20,
    radius: 18,
    scale: 1.18,
    tint: 0xffb05b
  },
  swarm: {
    speed: 65,
    hp: 8,
    damage: 5,
    xpValue: 3,
    radius: 10,
    scale: 1.2,
    tint: 0xff8a9c
  },
  hunter: {
    speed: 120,
    hp: 9,
    damage: 6,
    xpValue: 8,
    radius: 11,
    scale: 1.36,
    tint: 0x6db8ff
  },
  ranger: {
    speed: 55,
    hp: 18,
    damage: 12,
    xpValue: 12,
    radius: 13,
    scale: 1.4,
    tint: 0xdd88ff,
    ranged: true,
    preferredRange: 280,
    fireIntervalMs: 2800,
    projectileSpeed: 200,
    projectileDamage: 8
  },
  thrower: {
    speed: 48,
    hp: 22,
    damage: 10,
    xpValue: 14,
    radius: 13,
    scale: 1.32,
    tint: 0xffaa44,
    ranged: true,
    preferredRange: 250,
    fireIntervalMs: 3200,
    projectileSpeed: 170,
    projectileDamage: 12,
    predictPlayer: true
  },
  boomeranger: {
    speed: 60,
    hp: 24,
    damage: 8,
    xpValue: 16,
    radius: 14,
    scale: 1.38,
    tint: 0x44ddaa,
    ranged: true,
    preferredRange: 200,
    fireIntervalMs: 3500,
    projectileSpeed: 220,
    projectileDamage: 10,
    isBoomerang: true,
    meleeDamage: 7
  },
  ghost: {
    speed: 100,
    hp: 16,
    damage: 12,
    xpValue: 14,
    radius: 12,
    scale: 1.2,
    tint: 0xaaccff,
    alpha: 0.7
  },
  mech: {
    speed: 38,
    hp: 110,
    damage: 22,
    xpValue: 30,
    radius: 20,
    scale: 1.4,
    tint: 0x8899aa,
    damageResistance: 0.3
  },
  exploder: {
    speed: 100,
    hp: 25,
    damage: 30,
    xpValue: 12,
    radius: 14,
    scale: 1.3,
    tint: 0xff5522,
    isExploder: true,
    explosionRadius: 60
  },
  freezer: {
    speed: 50,
    hp: 22,
    damage: 10,
    xpValue: 14,
    radius: 13,
    scale: 1.25,
    tint: 0x88ddff,
    ranged: true,
    preferredRange: 240,
    fireIntervalMs: 3000,
    projectileSpeed: 180,
    projectileDamage: 10,
    freezeDurationMs: 1500
  },
  healer: {
    speed: 45,
    hp: 35,
    damage: 0,
    xpValue: 22,
    radius: 14,
    scale: 1.3,
    tint: 0x66ff88,
    isHealer: true,
    healAmount: 8,
    healRadius: 80,
    healIntervalMs: 3000
  },
  splitter: {
    speed: 55,
    hp: 40,
    damage: 8,
    xpValue: 18,
    radius: 14,
    scale: 1.3,
    tint: 0x44cc66,
    isSplitter: true,
    splitCount: 3,
    splitChildHp: 10,
    splitChildDamage: 5,
    splitChildXp: 3
  }
};

export const ENEMY_VISUAL_SCALE = Object.freeze({
  eliteMultiplier: 1.24
});

export const ELITE_TYPE_CONFIGS = {
  speed_boost: {
    tint: 0x76e7ff,
    hpMultiplier: 2.1
  },
  dash_attack: {
    tint: 0xff8f70,
    hpMultiplier: 2.35
  },
  poison_aura: {
    tint: 0x8ef58f,
    hpMultiplier: 2.6
  }
};

export const ENEMY_TYPE_WEIGHTS = [
  { type: "chaser", weight: 22 },
  { type: "tank", weight: 12 },
  { type: "swarm", weight: 14 },
  { type: "hunter", weight: 8 },
  { type: "ranger", weight: 7 },
  { type: "thrower", weight: 5 },
  { type: "boomeranger", weight: 5 },
  { type: "ghost", weight: 7 },
  { type: "mech", weight: 5 },
  { type: "exploder", weight: 7 },
  { type: "freezer", weight: 6 },
  { type: "healer", weight: 5 },
  { type: "splitter", weight: 5 }
];

export const GHOST_UNLOCK_TIME_SEC = 90;
export const MECH_UNLOCK_TIME_SEC = 150;
export const EXPLODER_UNLOCK_TIME_SEC = 60;
export const FREEZER_UNLOCK_TIME_SEC = 75;
export const HEALER_UNLOCK_TIME_SEC = 90;
export const SPLITTER_UNLOCK_TIME_SEC = 120;

export const HUNTER_UNLOCK_TIME_SEC = 45;
export const RANGER_UNLOCK_TIME_SEC = 60;
export const THROWER_UNLOCK_TIME_SEC = 90;
export const BOOMERANGER_UNLOCK_TIME_SEC = 120;

export const ENEMY_TYPE_UNLOCK_TIMES = {
  chaser: 0,
  tank: 0,
  swarm: 0,
  hunter: HUNTER_UNLOCK_TIME_SEC,
  ranger: RANGER_UNLOCK_TIME_SEC,
  thrower: THROWER_UNLOCK_TIME_SEC,
  boomeranger: BOOMERANGER_UNLOCK_TIME_SEC,
  ghost: GHOST_UNLOCK_TIME_SEC,
  mech: MECH_UNLOCK_TIME_SEC,
  exploder: EXPLODER_UNLOCK_TIME_SEC,
  freezer: FREEZER_UNLOCK_TIME_SEC,
  healer: HEALER_UNLOCK_TIME_SEC,
  splitter: SPLITTER_UNLOCK_TIME_SEC
};
