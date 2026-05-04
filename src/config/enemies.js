export const ENEMY_ARCHETYPE_CONFIGS = {
  chaser: {
    speed: 110,
    hp: 14,
    damage: 10,
    xpValue: 12,
    radius: 14,
    scale: 1.44,
    tint: 0xff6d6d
  },
  tank: {
    speed: 52,
    hp: 70,
    damage: 14,
    xpValue: 24,
    radius: 18,
    scale: 1.18,
    tint: 0xffb05b
  },
  swarm: {
    speed: 84,
    hp: 8,
    damage: 5,
    xpValue: 5,
    radius: 10,
    scale: 1.2,
    tint: 0xff8a9c
  },
  hunter: {
    speed: 176,
    hp: 9,
    damage: 6,
    xpValue: 11,
    radius: 11,
    scale: 1.36,
    tint: 0x6db8ff
  },
  ranger: {
    speed: 60,
    hp: 18,
    damage: 12,
    xpValue: 16,
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
    xpValue: 18,
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
    speed: 72,
    hp: 24,
    damage: 8,
    xpValue: 20,
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
  { type: "chaser", weight: 30 },
  { type: "tank", weight: 16 },
  { type: "swarm", weight: 18 },
  { type: "hunter", weight: 12 },
  { type: "ranger", weight: 10 },
  { type: "thrower", weight: 7 },
  { type: "boomeranger", weight: 7 }
];

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
  boomeranger: BOOMERANGER_UNLOCK_TIME_SEC
};
