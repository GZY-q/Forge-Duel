import { Player } from "../entities/Player.js";
import { BossEnemy } from "../entities/BossEnemy.js";
import { DirectorSystem, DIRECTOR_STATE } from "../systems/DirectorSystem.js";
import { WeaponSystem } from "../systems/WeaponSystem.js";
import { MetaProgressionSystem } from "../systems/MetaProgressionSystem.js";
import { ObjectPool } from "../systems/ObjectPool.js";
import { SeededRNG } from "../utils/SeededRNG.js";
import { ENEMY_ARCHETYPE_CONFIGS, ENEMY_TYPE_WEIGHTS, HUNTER_UNLOCK_TIME_SEC, RANGER_UNLOCK_TIME_SEC } from "../config/enemies.js";
import { LEVEL_UP_UPGRADES, WEAPON_EVOLUTION_RULES } from "../config/weapons.js";
import { DIRECTOR_BOSS_SPAWN } from "../config/director.js";
import { CHARACTER_ASSET_MANIFEST, CHARACTER_DIRECTIONS } from "../config/assets.manifest.js";
import { FIGHTER_CONFIGS, FIGHTER_STORAGE_KEY } from "../config/fighters.js";
import { SHIP_CONFIGS, SHIP_STORAGE_KEY, updateShipStats } from "../config/ships.js";
import { ItemPool } from "../entities/ItemDrop.js";
import { TreasureChest } from "../entities/TreasureChest.js";
import { StatusEffectSystem } from "../systems/StatusEffectSystem.js";
import { spawnDestructibles } from "../entities/Destructible.js";
import { ITEM_DROP_CONFIGS, ITEM_POOL_SIZE } from "../config/progression.js";
import {
  BASE_SPAWN_CHECK_INTERVAL_MS,
  ENEMY_POOL_SIZE,
  PLAYTEST_SPAWN_PACING_DEFAULT,
  PLAYTEST_SPAWN_PACING_ORDER,
  PLAYTEST_SPAWN_PACING_PRESETS,
  SAFE_RADIUS,
  SPAWN_LANES,
  SPAWN_LANE_KEYS,
  SPAWN_LANE_RULES,
  SPAWN_BURST_CONFIG,
  TARGET_ENEMY_CURVE,
  TARGET_ENEMY_FALLBACK,
  TARGET_ENEMY_WAVE_DURATION_SEC,
  TARGET_ENEMY_WAVE_INCREMENT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  XP_REQUIREMENTS
} from "../config/progression.js";

const SHIP_DECK_OBSTACLE_LAYOUT = [
  // Mast: central large anchor that promotes circular kiting.
  { type: "terrain_pillar", role: "mast", x: 1080, y: 675, scale: 1.7 },

  // Crate cluster A (mid-right).
  { type: "terrain_rock", role: "crate", x: 1490, y: 520, scale: 1.02 },
  { type: "terrain_pillar", role: "crate", x: 1570, y: 565, scale: 0.94 },
  { type: "terrain_rock", role: "crate", x: 1410, y: 590, scale: 0.9 },

  // Crate cluster B (lower-right), leaves center lane open.
  { type: "terrain_pillar", role: "crate", x: 1620, y: 900, scale: 1.0 },
  { type: "terrain_rock", role: "crate", x: 1700, y: 960, scale: 0.9 },
  { type: "terrain_rock", role: "crate", x: 1540, y: 980, scale: 0.88 },
  { type: "terrain_rock", role: "crate", x: 1320, y: 980, scale: 0.85 },
  { type: "terrain_pillar", role: "crate", x: 1390, y: 1040, scale: 0.82 },

  // Cannons (port/left rail).
  { type: "terrain_pillar", role: "cannon", x: 270, y: 290, scale: 0.84 },
  { type: "terrain_pillar", role: "cannon", x: 270, y: 675, scale: 0.84 },
  { type: "terrain_pillar", role: "cannon", x: 270, y: 1060, scale: 0.84 },

  // Cannons (starboard/right rail).
  { type: "terrain_pillar", role: "cannon", x: 2130, y: 290, scale: 0.84 },
  { type: "terrain_pillar", role: "cannon", x: 2130, y: 675, scale: 0.84 },
  { type: "terrain_pillar", role: "cannon", x: 2130, y: 1060, scale: 0.84 }
];
const BOSS_ENTRY_LANES = Object.freeze([SPAWN_LANES.BOW, SPAWN_LANES.STERN]);
const HATCH_BREACH_POINT = Object.freeze({ x: 1200, y: 1090 });
const LADDER_SPAWN_POINTS = Object.freeze({
  [SPAWN_LANES.PORT]: Object.freeze([
    Object.freeze({ x: 76, y: 430 }),
    Object.freeze({ x: 76, y: 910 })
  ]),
  [SPAWN_LANES.STARBOARD]: Object.freeze([
    Object.freeze({ x: 2324, y: 430 }),
    Object.freeze({ x: 2324, y: 910 })
  ])
});
const XP_MAGNET_RADIUS_PER_LEVEL = 6;
const XP_ORB_BASE_SCALE = 1.16;
const XP_ORB_HIGH_VALUE_SCALE = 1.24;
const XP_ORB_SPECIAL_SCALE = 1.32;
const XP_ORB_BASE_ALPHA = 0.9;
const XP_ORB_HIGH_VALUE_ALPHA = 0.97;
const XP_ORB_SPECIAL_ALPHA = 1;
const XP_ORB_MAGNET_DIRECT_PULL_RADIUS = 148;
const XP_ORB_MAGNET_DIRECT_PULL_FACTOR = 0.085;
const XP_ORB_MAGNET_MIN_PULL = 280;
const XP_ORB_MAGNET_MAX_PULL = 640;
const XP_ORB_MAGNET_SCALE_BOOST = 0.14;
const XP_ORB_PULSE_AMPLITUDE = 0.035;
const XP_ORB_PULSE_SPEED_MS = 190;
const DECK_TILE_SIZE = 32;
const DECK_SURFACE_INSET = 34;
const DECK_RAIL_INSET = 12;
const DECK_RAIL_POST_GAP = 120;
const DECK_RAIL_POST_WIDTH = 8;
const DECK_RAIL_POST_LENGTH = 24;
const SEA_WAVE_MIN = 6;
const SEA_WAVE_MAX = 10;
const DECK_PASSAGE_SAMPLE_DISTANCES = Object.freeze([220, 340, 460]);
const DECK_PASSAGE_MIN_OPEN_DIRECTIONS = 2;
const DECK_PASSAGE_REPAIR_MAX_STEPS = 18;
const DECK_PASSAGE_REPAIR_NUDGE = 40;
const ENEMY_JAM_STUCK_WINDOW_MS = 900;
const ENEMY_JAM_MIN_PROGRESS_PX = 4;
const ENEMY_JAM_PUSH_FORCE = 150;
const ELITE_BONUS_XP_ORB_MIN = 2;
const ELITE_BONUS_XP_ORB_MAX = 4;
const ELITE_BONUS_XP_ORB_VALUE_FACTOR = 0.35;
const ELITE_UPGRADE_DROP_CHANCE = 0.28;
const ELITE_BONUS_UPGRADE_IDS = ["weapon_damage", "attack_speed", "movement_speed", "pickup_radius", "projectile_count"];
const MINI_BOSS_GOLD_BUNDLE = 12;
const MINI_BOSS_XP_BURST_COUNT = 8;
const MINI_BOSS_XP_BURST_MIN_FACTOR = 0.3;
const MINI_BOSS_XP_BURST_MAX_FACTOR = 0.45;
const PERFORMANCE_MAX_ACTIVE_ENEMIES = 80;
const EDGE_FOG_TEXTURE_KEY = "edge_fog_vignette";
const EDGE_FOG_INNER_RADIUS_TILES = 12;
const EDGE_FOG_OUTER_RADIUS_TILES = 14;
const PARTICLE_LOAD_SOFT_CAP_ENEMIES = 50;
const PARTICLE_LOAD_HARD_CAP_ENEMIES = PERFORMANCE_MAX_ACTIVE_ENEMIES;
const MIN_PARTICLE_LOAD_SCALE = 0.38;
const TOUCH_JOYSTICK_RADIUS = 34;
const TOUCH_JOYSTICK_TOUCH_RADIUS = 80;
const TOUCH_DASH_BUTTON_RADIUS = 29;
const PARTICLE_TEXTURE_KEY = "hit_particle";
const PARTICLE_FALLBACK_TEXTURE_KEY = "__WHITE";
const PARTICLE_GENERATED_FALLBACK_TEXTURE_KEY = "particle_fallback";
const BOSS_WARNING_LEAD_MS = 5000;
const META_COINS_STORAGE_KEY = "forgeduel_coins";
const META_STORAGE_KEY = "forgeduel_meta_v1";
const BEST_TIME_STORAGE_KEY = "forgeduel_best_time_ms";
const SHOP_UPGRADES_STORAGE_KEY = "forgeduel_shop_upgrades_v1";
const WEAPON_UNLOCK_STORAGE_KEY = "forgeduel_weapon_unlocks_v1";
const PLAYTEST_SPAWN_PACING_STORAGE_KEY = "forgeduel_playtest_spawn_pacing_v1";
const DEBUG_HUD_X = 16;
const DEBUG_HUD_Y = 116;
const RENDER_DEPTH = Object.freeze({
  WORLD: 0,
  ENEMIES: 10,
  PLAYER: 20,
  PROJECTILES: 30,
  DAMAGE_TEXT: 50,
  HUD: 1000,
  MENUS: 2000
});
const OFFSCREEN_INDICATOR_INSET = 18;
const OFFSCREEN_INDICATOR_SIZE = 9;
const OFFSCREEN_INDICATOR_MAX = 12;
const OFFSCREEN_PRIORITY_BONUS_ELITE = 10000;
const OFFSCREEN_PRIORITY_BONUS_BOSS = 20000;
const COMBO_RESET_WINDOW_MS = 2000;
const COMBO_TEXT_SCALE = 1.0;
const COMBO_TEXT_FADE_TIME_MS = 800;
const HUD_PANEL_PADDING = 12;
const HUD_PANEL_X = 16;
const HUD_PANEL_Y = 16;
const HUD_PANEL_WIDTH = 324;
const HUD_PANEL_HEIGHT = 108;
const HUD_EXP_BAR_WIDTH = 200;
const HUD_EXP_BAR_BASE_HEIGHT = 8;
const HUD_EXP_BAR_START_COLOR = 0x3ec5ff;
const HUD_EXP_BAR_END_COLOR = 0x8fffd4;
const HUD_EXP_PULSE_SCALE = 1.3;
const HUD_EXP_PULSE_DURATION_MS = 120;
const HUD_ALERT_POOL_SIZE = 3;
const HUD_ALERT_STYLE = Object.freeze({
  fontFamily: "ZpixOne",
  fontSize: "34px",
  color: "#ffd76c",
  stroke: "#2e1b08",
  strokeThickness: 6
});
const HUD_COMBO_STYLE = Object.freeze({
  fontFamily: "ZpixOne",
  fontSize: "18px",
  color: "#fff0b6",
  stroke: "#2d1f08",
  strokeThickness: 4
});
const WARNING_BANNER_STYLE = Object.freeze({
  fontFamily: "ZpixOne",
  fontSize: "28px",
  color: "#fff0c6",
  stroke: "#281206",
  strokeThickness: 6
});
const DAMAGE_NUMBER_MAX_ACTIVE = 12;
const DAMAGE_NUMBER_MAX_ACTIVE_PRIORITY = 18;
const DAMAGE_NUMBER_NORMAL_LIFETIME_MS = 420;
const DAMAGE_NUMBER_ELITE_LIFETIME_MS = 520;
const DAMAGE_NUMBER_BOSS_LIFETIME_MS = 620;
const DAMAGE_NUMBER_NORMAL_RISE_PX = 16;
const DAMAGE_NUMBER_ELITE_RISE_PX = 20;
const DAMAGE_NUMBER_BOSS_RISE_PX = 24;
const GAMEPLAY_CAMERA_ZOOM = 1.72;
const GAMEPLAY_CAMERA_FOLLOW_LERP_X = 0.1;
const GAMEPLAY_CAMERA_FOLLOW_LERP_Y = 0.1;
const PLAYER_HURT_FEEDBACK_COOLDOWN_MS = 120;
const PLAYER_HURT_SHAKE_DURATION_MS = 55;
const PLAYER_HURT_SHAKE_INTENSITY = 0.0014;
const PLAYER_HURT_PULSE_DURATION_MS = 115;
const PLAYER_HURT_PULSE_RADIUS = 22;
const PLAYER_HURT_PULSE_ALPHA = 0.22;
const DECK_BRIGHTNESS_MULTIPLIER = 0.9;
const DECK_HIGHLIGHT_OPACITY = 0.6;
const EDGE_FOG_VIGNETTE_OPACITY = 0.35;
const DECK_TILE_VARIANTS = Object.freeze([
  Object.freeze({
    key: "deck_a",
    path: "assets/sprites/environment/ship/deck_plank_main.png",
    weight: 50,
    tintEven: 0xe8d8c6,
    tintOdd: 0xd8c0a7,
    tileOffsetStep: 19,
    fallbackEven: 0x6c4830,
    fallbackOdd: 0x755138
  }),
  Object.freeze({
    key: "deck_b",
    path: "assets/sprites/environment/ship/deck_plank_main.png",
    weight: 20,
    tintEven: 0xe2ceb6,
    tintOdd: 0xd4b394,
    tileOffsetStep: 23,
    fallbackEven: 0x67432d,
    fallbackOdd: 0x714d36
  }),
  Object.freeze({
    key: "deck_c",
    path: "assets/sprites/environment/ship/deck_plank_main.png",
    weight: 20,
    tintEven: 0xd8c4ac,
    tintOdd: 0xc8ac8c,
    tileOffsetStep: 17,
    fallbackEven: 0x623f2a,
    fallbackOdd: 0x6a4731
  }),
  Object.freeze({
    key: "deck_d",
    path: "assets/sprites/environment/ship/deck_plank_main.png",
    weight: 10,
    tintEven: 0xcfb798,
    tintOdd: 0xc29f7e,
    tileOffsetStep: 29,
    fallbackEven: 0x5e3c28,
    fallbackOdd: 0x66442f
  })
]);
const RANDOM_DECK_OBSTACLE_SPAWN_TABLE = Object.freeze([
  Object.freeze({
    objectType: "crate",
    type: "terrain_rock",
    textureKey: "terrain_crate",
    weight: 40,
    scaleMin: 0.72,
    scaleMax: 0.96,
    anchorRadius: 32
  }),
  Object.freeze({
    objectType: "barrel",
    type: "terrain_rock",
    textureKey: "terrain_rock",
    weight: 24,
    scaleMin: 0.54,
    scaleMax: 0.72,
    anchorRadius: 24,
    tint: 0x855d3f
  }),
  Object.freeze({
    objectType: "ropeBundle",
    type: "terrain_pillar",
    textureKey: "terrain_pillar",
    weight: 20,
    scaleMin: 0.52,
    scaleMax: 0.68,
    anchorRadius: 22,
    tint: 0xb39163
  }),
  Object.freeze({
    objectType: "deckVent",
    type: "terrain_pillar",
    textureKey: "terrain_pillar",
    weight: 16,
    scaleMin: 0.6,
    scaleMax: 0.78,
    anchorRadius: 24,
    tint: 0x6b7689
  })
]);
const RANDOM_DECK_OBSTACLE_DENSITY_MIN_TILES = 12;
const RANDOM_DECK_OBSTACLE_DENSITY_MAX_TILES = 18;
const RANDOM_DECK_OBSTACLE_TILE_GROUP_SIZE = DECK_TILE_SIZE * 3;
const RANDOM_DECK_OBSTACLE_EDGE_SPAWN_BUFFER = DECK_TILE_SIZE * 6;
const RANDOM_DECK_OBSTACLE_EVENT_CLEAR_RADIUS = DECK_TILE_SIZE * 4;
const RANDOM_DECK_OBSTACLE_MAX_ATTEMPTS_MULTIPLIER = 28;
const RANDOM_DECK_OBSTACLE_MIN_PADDING = 16;
const IMPORTED_PIXEL_ASSETS = Object.freeze({
  deckPlankMain: Object.freeze({
    key: "sprite_deck_plank_main",
    path: "assets/sprites/environment/ship/deck_plank_main.png"
  }),
  deckPlankTrim: Object.freeze({
    key: "sprite_deck_plank_trim",
    path: "assets/sprites/environment/ship/deck_plank_trim.png"
  }),
  player: Object.freeze({
    key: "sprite_player_crew",
    path: "assets/sprites/player/player_crew.png"
  }),
  cannon: Object.freeze({
    key: "sprite_terrain_cannon",
    path: "assets/sprites/environment/ship/terrain_cannon.png"
  }),
  deckHullLarge: Object.freeze({
    key: "sprite_deck_hull_large",
    path: "assets/sprites/environment/ship/deck_hull_large.png"
  }),
  deckCannonLoose: Object.freeze({
    key: "sprite_deck_cannon_loose",
    path: "assets/sprites/environment/ship/deck_cannon_loose.png"
  }),
  deckCannonBall: Object.freeze({
    key: "sprite_deck_cannonball",
    path: "assets/sprites/environment/ship/deck_cannonball.png"
  }),
  uiPanelBrown: Object.freeze({
    key: "sprite_ui_panel_brown",
    path: "assets/sprites/ui/ui_panel_brown.png"
  }),
  uiPanelBrownInlay: Object.freeze({
    key: "sprite_ui_panel_brown_inlay",
    path: "assets/sprites/ui/ui_panel_brown_inlay.png"
  }),
  uiPanelTanInlay: Object.freeze({
    key: "sprite_ui_panel_tan_inlay",
    path: "assets/sprites/ui/ui_panel_tan_inlay.png"
  }),
  enemyChaserBody: Object.freeze({
    key: "sprite_enemy_chaser_body",
    path: "assets/sprites/enemies/chaser/parts/enemy_chaser_body.png"
  }),
  enemyChaserEye: Object.freeze({
    key: "sprite_enemy_chaser_eye",
    path: "assets/sprites/enemies/chaser/parts/enemy_chaser_eye.png"
  }),
  enemyChaserMouth: Object.freeze({
    key: "sprite_enemy_chaser_mouth",
    path: "assets/sprites/enemies/chaser/parts/enemy_chaser_mouth.png"
  })
});
const BOSS_BULLET_MAX = 220;
const BOSS_BULLET_LIFETIME_MS = 2800;
const SFX_AUDIO_FILES = {
  dash: "assets/audio/sfx/dash.wav",
  enemy_hit: "assets/audio/sfx/enemy_hit.wav",
  enemy_death: "assets/audio/sfx/enemy_die.wav",
  level_up: "assets/audio/sfx/level_up.wav",
  boss_warning: "assets/audio/sfx/boss_warning.wav"
};
const SFX_KEY_BY_TYPE = {
  dash: "dash",
  enemy_hit: "enemy_hit",
  enemy_death: "enemy_death",
  level_up: "level_up",
  boss_warning: "boss_warning",
  weapon_fire: null
};
const SFX_VOLUME = {
  dash: 0.12,
  enemy_hit: 0.1,
  enemy_death: 0.12,
  level_up: 0.13,
  boss_warning: 0.13,
  weapon_fire: 0.08
};
const SFX_THROTTLE_MS = {
  enemy_hit: 42,
  enemy_death: 55,
  dash: 90,
  level_up: 220,
  boss_warning: 300,
  weapon_fire: 48
};
const START_WEAPON_OPTIONS = [
  {
    id: "dash_blade",
    label: "冲刺匕首",
    weaponType: "dagger",
    unlockCost: 0,
    defaultUnlocked: true
  },
  {
    id: "pulse_dash",
    label: "火焰弹",
    weaponType: "fireball",
    unlockCost: 90,
    defaultUnlocked: false
  },
  {
    id: "orbit_blade",
    label: "轨道刀刃",
    weaponType: "orbit_blades",
    unlockCost: 180,
    defaultUnlocked: false
  },
  {
    id: "shockwave",
    label: "闪电冲击",
    weaponType: "lightning",
    unlockCost: 140,
    defaultUnlocked: false
  },
  {
    id: "scatter",
    label: "散弹射击",
    weaponType: "scatter_shot",
    unlockCost: 120,
    defaultUnlocked: false
  },
  {
    id: "homing",
    label: "追踪导弹",
    weaponType: "homing_missile",
    unlockCost: 160,
    defaultUnlocked: false
  },
  {
    id: "laser_beam",
    label: "激光束",
    weaponType: "laser",
    unlockCost: 150,
    defaultUnlocked: false
  }
];
const WEAPON_ICON_ASSETS = Object.freeze({
  dagger: Object.freeze({
    key: "weapon_icon_dagger",
    path: "assets/sprites/weapons/weapon_dagger_icon.png"
  }),
  fireball: Object.freeze({
    key: "weapon_icon_fireball",
    path: "assets/sprites/weapons/weapon_fireball_icon.png"
  }),
  lightning: Object.freeze({
    key: "weapon_icon_lightning",
    path: "assets/sprites/weapons/weapon_lightning_icon.png"
  }),
  meteor: Object.freeze({
    key: "weapon_icon_meteor",
    path: "assets/sprites/weapons/weapon_meteor_icon.png"
  }),
  orbit_blades: Object.freeze({
    key: "weapon_icon_orbit_blades",
    path: "assets/sprites/weapons/weapon_orbit_blades_icon.png"
  }),
  scatter_shot: Object.freeze({
    key: "weapon_icon_dagger",
    path: "assets/sprites/weapons/weapon_dagger_icon.png"
  }),
  homing_missile: Object.freeze({
    key: "weapon_icon_fireball",
    path: "assets/sprites/weapons/weapon_fireball_icon.png"
  }),
  laser: Object.freeze({
    key: "weapon_icon_lightning",
    path: "assets/sprites/weapons/weapon_lightning_icon.png"
  })
});

const PIXEL_PLAYER_PATTERN = [
  "................",
  "......1111......",
  ".....122221.....",
  "....12222221....",
  "....12233221....",
  ".....144441.....",
  ".....455554.....",
  "....45666654....",
  "....45666654....",
  "....45666654....",
  ".....477774.....",
  ".....47..74.....",
  "....88....88....",
  "...88......88...",
  "...8........8...",
  "................"
];

const PIXEL_CHASER_PATTERN = [
  "................",
  "......1111......",
  "....11222211....",
  "...1222222221...",
  "...1223322331...",
  "..122222222221..",
  "..123222222321..",
  "..123222222321..",
  "..123222222321..",
  "..122222222221..",
  "...1222222221...",
  "...1122222211...",
  "....11111111....",
  ".....1....1.....",
  "................",
  "................"
];

function pickWeightedDeckVariant(variants, excludedKey = null) {
  const available = variants.filter((variant) => variant.key !== excludedKey);
  if (available.length === 0) {
    return variants[0];
  }

  const totalWeight = available.reduce((sum, variant) => sum + variant.weight, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < available.length; i += 1) {
    roll -= available[i].weight;
    if (roll <= 0) {
      return available[i];
    }
  }
  return available[available.length - 1];
}

function scaleHexColor(hexColor, multiplier = 1) {
  const color = Number.isFinite(hexColor) ? hexColor : 0x000000;
  const factor = Phaser.Math.Clamp(Number(multiplier) || 1, 0, 2);
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  const nr = Phaser.Math.Clamp(r, 0, 255);
  const ng = Phaser.Math.Clamp(g, 0, 255);
  const nb = Phaser.Math.Clamp(b, 0, 255);
  return (nr << 16) | (ng << 8) | nb;
}

function pickWeightedRandomObstacleSpec(specs) {
  const totalWeight = specs.reduce((sum, spec) => sum + spec.weight, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < specs.length; i += 1) {
    roll -= specs[i].weight;
    if (roll <= 0) {
      return specs[i];
    }
  }
  return specs[specs.length - 1];
}

const PIXEL_SWARM_PATTERN = [
  "............",
  "....1111....",
  "...122221...",
  "..12233221..",
  "..12333321..",
  "..12333321..",
  "..12233221..",
  "...122221...",
  "....1111....",
  ".....11.....",
  "............",
  "............"
];

const PIXEL_TANK_PATTERN = [
  "................",
  "...1111111111...",
  "..122222222221..",
  "..123333333321..",
  "..123444444321..",
  "..123455554321..",
  "..123455554321..",
  "..123444444321..",
  "..123333333321..",
  "..123333333321..",
  "..122222222221..",
  "...1155555511...",
  "...15......51...",
  "..55........55..",
  "................",
  "................"
];

const PIXEL_HUNTER_PATTERN = [
  "................",
  ".......11.......",
  "......1221......",
  ".....123321.....",
  "....12333321....",
  "...1233333331...",
  "..123333333321..",
  ".12333333333321.",
  "..123333333321..",
  "...1233333331...",
  "....12333321....",
  ".....123321.....",
  "......1221......",
  ".......11.......",
  "................",
  "................"
];

const PIXEL_BOSS_PATTERN = [
  "........................",
  "........11111111........",
  "......112222222211......",
  "....1122233333222211....",
  "...1222333333333333221...",
  "..122333344444444333322..",
  "..123333455555555433332..",
  ".12333445566666554433321.",
  ".12333455667766554433321.",
  ".12333455667766554433321.",
  ".12333445566666554433321.",
  "..123333455555555433332..",
  "..122333344444444333322..",
  "...1222333333333333221...",
  "....1122233333222211....",
  "......112222222211......",
  "........11111111........",
  ".......11......11.......",
  "......11........11......",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................"
];

const PIXEL_RANGER_PATTERN = [
  "................",
  "......1111......",
  ".....122221.....",
  "....12333321....",
  "...1233333321...",
  "..123333333321..",
  "..123334433332..",
  "..123334433332..",
  "..123333333321..",
  "...1233333321...",
  "....12333321....",
  ".....122221.....",
  "......1111......",
  ".......22.......",
  "......2222......",
  "................"
];

const PIXEL_CRATE_PATTERN = [
  "................",
  ".11111111111111.",
  ".12222223222221.",
  ".12444423244421.",
  ".12444423244421.",
  ".12444423244421.",
  ".12222223222221.",
  ".13333334333331.",
  ".12222223222221.",
  ".12444423244421.",
  ".12444423244421.",
  ".12444423244421.",
  ".12222223222221.",
  ".11111111111111.",
  "................",
  "................"
];

const PIXEL_CANNON_PATTERN = [
  "................",
  "................",
  "......1111......",
  "....11222211....",
  "...1122222211...",
  "..112222222211..",
  "..133333333331..",
  "..133333333331..",
  "...444.. ..444..",
  "..14441..14441..",
  "..144441144441..",
  "...1444444441...",
  "....11111111....",
  "................",
  "................",
  "................"
];

const PIXEL_MAST_PATTERN = [
  "................",
  ".....111111.....",
  "...1122222211...",
  "..122222222221..",
  "..122223322221..",
  "..122223322221..",
  "..122223322221..",
  "..122223322221..",
  "..122223322221..",
  "..122223322221..",
  "..122223322221..",
  "..122223322221..",
  "..122222222221..",
  "...1122222211...",
  ".....111111.....",
  "................"
];

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");

    this.safeRadius = SAFE_RADIUS;
    this.baseSpawnCheckIntervalMs = BASE_SPAWN_CHECK_INTERVAL_MS;
    this.spawnAccumulatorMs = 0;
    this.runTimeMs = 0;
    this.playTime = 0;
    this.runStartTimeMs = 0;
    this.lastStageAnnouncementSec = -1;
    this.hudElapsedSeconds = -1;
    this.targetEnemies = 0;

    this.attackIntervalMs = 800;
    this.attackRange = 120;
    this.attackDamage = 10;
    this.lastAttackAt = 0;
    this.totalXp = 0;
    this.level = 1;
    this.currentXp = 0;
    this.xpToNext = 50;
    this.pendingLevelUps = 0;
    this.isLeveling = false;
    this.levelUpUi = [];
    this.isGameOver = false;
    this.damageEmitter = null;
    this.killEmitter = null;
    this.eliteKillEmitter = null;
    this.evolutionEmitter = null;
    this.dashTrailEmitter = null;
    this.dashParticles = null;
    this.dashTrailTickMs = 0;
    this.evolutionSlowMoRestoreHandle = null;
    this.evolutionSlowMoActive = false;
    this.weaponRecoilTween = null;
    this.metaSystem = new MetaProgressionSystem();
    this.metaData = this.metaSystem.getData();
    this.metaXpMultiplier = 1;
    this.runMetaCurrency = 0;
    this.lastRunMetaCurrency = 0;
    this.metaSettled = false;
    this.enemyPool = null;
    this.obstacles = null;
    this.terrainObstacleAnchors = [];
    this.gameOverRestartButton = null;
    this.gameOverRestartLabel = null;
    this.hudBarsGraphics = null;
    this.enemyHealthBarsGraphics = null;
    this.dashCooldownRingGraphics = null;
    this.playerReadabilityGraphics = null;
    this.lowHealthVignetteGraphics = null;
    this.edgeFogOverlay = null;
    this.edgeFogRebuildState = { width: 0, height: 0, zoom: 0 };
    this.hudLevelText = null;
    this.hudStatsText = null;
    this.hudTimerText = null;
    this.hudGoldText = null;
    this.hudDashStatusText = null;
    this.hudSecondaryText = null;
    this.hudCoreLabelText = null;
    this.hudSecondaryLabelText = null;
    this.hudWeaponSlotFrames = [];
    this.hudWeaponSlotLabels = [];
    this.hudWeaponSlotIcons = [];
    this.hudWeaponLabel = null;
    this.hud = null;
    this.hudObjects = [];
    this.domHudElement = null;
    this.domHudRefs = null;
    this.hpText = null;
    this.expText = null;
    this.timeText = null;
    this.killText = null;
    this.expBarBg = null;
    this.expBarFill = null;
    this.debugDirectorText = null;
    this.debugOverlayPanel = null;
    this.debugOverlayEnabled = false;
    this.cameraFollowEnabled = true;
    this.spawnPacingPresetKey = PLAYTEST_SPAWN_PACING_DEFAULT;
    this.spawnPacingPreset = PLAYTEST_SPAWN_PACING_PRESETS[PLAYTEST_SPAWN_PACING_DEFAULT];
    this.offscreenIndicatorGraphics = null;
    this.damageNumberPool = [];
    this.hudAlertPool = [];
    this.activeWarningBanner = null;
    this.offscreenIndicatorPool = [];
    this.killCombo = 0;
    this.lastKillAtMs = Number.NEGATIVE_INFINITY;
    this.maxKillCombo = 0;
    this.totalKills = 0;
    this.lastPlayerHurtFeedbackAt = Number.NEGATIVE_INFINITY;
    this.killCounterPulseTween = null;
    this.xpDisplayRatio = 0;
    this.expBarScaleY = 1;
    this.expBarPulseTween = null;
    this.weaponRecoilTween = null;
    this.bossApproachWarnedCycleIndex = 0;
    this.levelUpOptionActions = [];
    this.sfxLastPlayedAt = {};
    this.touchControlsEnabled = false;
    this.touchMovePointerId = null;
    this.touchMoveVector = new Phaser.Math.Vector2(0, 0);
    this.touchDashQueued = false;
    this.touchJoystickCenter = new Phaser.Math.Vector2(0, 0);
    this.touchJoystickBase = null;
    this.touchJoystickThumb = null;
    this.touchDashButton = null;
    this.touchDashLabel = null;
    this.onTouchPointerDown = null;
    this.onTouchPointerMove = null;
    this.onTouchPointerUp = null;
    this.helpOverlayCompact = false;
    this.isWeaponSelecting = false;
    this.weaponSelectionUi = [];
    this.weaponSelectionActions = [];
    this.weaponUnlocks = {};
    this.selectedStartWeaponId = null;
    this.bossProjectiles = null;
    this.performanceDamageEvents = [];
    this.performanceKillEvents = [];
    this.performanceDamageTotal = 0;
    this.performanceKillTotal = 0;
    this.seaWaveGraphics = null;
    this.seaWaves = [];
    this.devAntiJamEnabled = false;
    this.selectedFighterKey = null;
    this.fighterConfig = null;
    this.fighterEvolved = false;
    this.isPaused = false;
    this.pauseUi = [];
    this.activeBoss = null;
    this.bossHpBarElement = null;
    this.bgmEnabled = true;
    this.bgmNodes = null;
  }

  init(data) {
    this.selectedFighterKey = data?.selectedFighter || null;
    this.selectedShipKey = data?.selectedShip || null;
    this.gameMode = data?.gameMode || "solo";
    this.networkManager = data?.networkManager || null;
    this.socketClient = data?.socketClient || null;
    this.voiceManager = data?.voiceManager || null;
    this.isHost = data?.isHost ?? true;
    this.coopPlayers = data?.players || [];
    this.coopSeed = data?.seed ?? Date.now();
    this._hasSentPlayerDied = false;
    this._hasSentGameOver = false;
    this.networkSyncAccumulator = 0;
    this.lastEnemySyncTime = 0;
  }

  create() {
    this.isGameOver = false;
    this._loadSettings();
    this.totalXp = 0;
    this.level = 1;
    this.currentXp = 0;
    this.xpToNext = this.getXpRequirement(this.level);
    this.pendingLevelUps = 0;
    this.isLeveling = false;
    this.levelUpUi = [];
    this.spawnAccumulatorMs = 0;
    this.runTimeMs = 0;
    this.playTime = 0;
    this.lastStageAnnouncementSec = -1;
    this.runStartTimeMs = this.time?.now ?? 0;
    this.hudElapsedSeconds = -1;
    this.targetEnemies = 0;
    this.hudAlertPool = [];
    this.killCombo = 0;
    this.lastKillAtMs = Number.NEGATIVE_INFINITY;
    this.maxKillCombo = 0;
    this.totalKills = 0;
    this.killCounterPulseTween = null;
    this.xpDisplayRatio = 0;
    this.expBarScaleY = 1;
    this.expBarPulseTween = null;
    this.bossApproachWarnedCycleIndex = 0;
    this.metaData = this.metaSystem.getData();
    this.syncCoinStorageWithMeta();
    this.metaXpMultiplier = 1;
    this.runMetaCurrency = 0;
    this.lastRunMetaCurrency = 0;
    this.metaSettled = false;
    this.coopRNG = this.gameMode === "coop" ? new SeededRNG(this.coopSeed) : null;
    this.director = new DirectorSystem({ rng: this.coopRNG });
    this.dashTrailTickMs = 0;
    this.sfxLastPlayedAt = {};
    this.clearEvolutionSlowMoTimer();
    this.teardownTouchControls();
    this.touchControlsEnabled = false;
    this.touchMovePointerId = null;
    this.touchMoveVector.set(0, 0);
    this.touchDashQueued = false;
    this.isWeaponSelecting = false;
    this.weaponSelectionUi = [];
    this.weaponSelectionActions = [];
    this.weaponUnlocks = this.loadWeaponUnlocks();
    this.selectedStartWeaponId = null;
    this.debugOverlayEnabled = false;
    this.cameraFollowEnabled = true;
    this.spawnPacingPresetKey = this.loadSpawnPacingPresetKey();
    this.spawnPacingPreset =
      PLAYTEST_SPAWN_PACING_PRESETS[this.spawnPacingPresetKey] ?? PLAYTEST_SPAWN_PACING_PRESETS[PLAYTEST_SPAWN_PACING_DEFAULT];
    this.baseSpawnCheckIntervalMs = Math.max(
      60,
      BASE_SPAWN_CHECK_INTERVAL_MS * (this.spawnPacingPreset?.spawnIntervalScale ?? 1)
    );
    this.performanceDamageEvents = [];
    this.performanceKillEvents = [];
    this.performanceDamageTotal = 0;
    this.performanceKillTotal = 0;
    this.helpOverlayCompact = false;
    this.devAntiJamEnabled = this.resolveDevAntiJamEnabled();

    this.createTextures();
    this._createInfiniteBackground();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.player.level = this.level;

    // Apply ship config (new system) or fighter config (legacy fallback)
    const shipKey = this.selectedShipKey || this.resolveShipKey();
    this.shipConfig = SHIP_CONFIGS[shipKey] || null;
    this.fighterConfig = null;
    if (this.shipConfig) {
      this.player.maxHp = this.shipConfig.stats.maxHp;
      this.player.hp = this.shipConfig.stats.maxHp;
      this.player.speed = this.shipConfig.stats.speed;
      this.player.dashCooldownMs = this.shipConfig.stats.dashCooldown;
      this.player.dashChargeRate = this.player.dashGaugeMax / (this.player.dashCooldownMs / 1000);
      this.player.shipType = shipKey;
      this.player.fighterType = shipKey;
      if (this.shipConfig.tint) {
        this.player.setTint(this.shipConfig.tint);
      }
    } else {
      const fighterKey = this.selectedFighterKey || this.resolveFighterKey();
      this.fighterConfig = FIGHTER_CONFIGS[fighterKey] || null;
      if (this.fighterConfig) {
        this.player.maxHp = this.fighterConfig.hp;
        this.player.hp = this.fighterConfig.hp;
        this.player.speed = this.fighterConfig.speed;
        this.player.fighterType = fighterKey;
        if (this.fighterConfig.tint) {
          this.player.setTint(this.fighterConfig.tint);
        }
        const fx = this.fighterConfig.passiveEffect;
        if (fx.dashCooldownMultiplier) {
          this.player.dashCooldownMs = Math.round(this.player.dashCooldownMs * fx.dashCooldownMultiplier);
          this.player.dashChargeRate = this.player.dashGaugeMax / (this.player.dashCooldownMs / 1000);
        }
        if (fx.damageCooldownBonusMs) {
          this.player.damageCooldownMs += fx.damageCooldownBonusMs;
        }
        if (fx.pickupRadiusMultiplier) {
          this.player.pickupRadius = Math.round(this.player.pickupRadius * fx.pickupRadiusMultiplier);
        }
      }
    }
    this.enemies = this.add.group();
    this.enemyPool = new ObjectPool(this, this.enemies, { initialSize: ENEMY_POOL_SIZE });
    this.itemPool = new ItemPool(this, ITEM_POOL_SIZE);
    this.activeItems = [];
    this.chests = [];
    this.destructibles = spawnDestructibles(this, 12);
    this.xpOrbs = this.physics.add.group();
    this.obstacles = this.physics.add.staticGroup();
    this.createTerrainObstacles();

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      dash: Phaser.Input.Keyboard.KeyCodes.SPACE,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
      debugToggle: Phaser.Input.Keyboard.KeyCodes.F2,
      pacingPreset: Phaser.Input.Keyboard.KeyCodes.F3,
      cameraToggle: Phaser.Input.Keyboard.KeyCodes.F4,
      meta1: Phaser.Input.Keyboard.KeyCodes.ONE,
      meta2: Phaser.Input.Keyboard.KeyCodes.TWO,
      meta3: Phaser.Input.Keyboard.KeyCodes.THREE,
      meta4: Phaser.Input.Keyboard.KeyCodes.FOUR,
      pause: Phaser.Input.Keyboard.KeyCodes.ESC,
      pauseAlt: Phaser.Input.Keyboard.KeyCodes.P
    });
    const desiredPointers = 3;
    const pointerDeficit = desiredPointers - this.input.manager.pointersTotal;
    if (pointerDeficit > 0) {
      this.input.addPointer(pointerDeficit);
    }

    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this);
    this.physics.add.overlap(this.player, this.xpOrbs, this.handleXpOrbPickup, null, this);
    // Item drops are checked manually (not via physics overlap) since they use the pool's active list
    this.bossProjectiles = this.physics.add.group({
      allowGravity: false,
      immovable: true,
      maxSize: BOSS_BULLET_MAX
    });
    this.physics.add.overlap(this.player, this.bossProjectiles, this.handleBossProjectileHit, null, this);
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemies, this.obstacles);
    // Cover mechanic: obstacles block boss projectiles
    this.physics.add.collider(this.bossProjectiles, this.obstacles, (projectile) => {
      this.releaseBossProjectile(projectile);
    });
    this.weaponSystem = new WeaponSystem(this, this.player);
    this.statusEffectSystem = new StatusEffectSystem(this);
    // Cover mechanic: obstacles also block player weapon projectiles
    this.physics.add.collider(this.weaponSystem.projectiles, this.obstacles, (projectile) => {
      this.weaponSystem.releaseProjectile(projectile);
    });
    this.applyMetaBonusesForRun();

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setZoom(GAMEPLAY_CAMERA_ZOOM);
    this.cameras.main.startFollow(
      this.player,
      true,
      GAMEPLAY_CAMERA_FOLLOW_LERP_X,
      GAMEPLAY_CAMERA_FOLLOW_LERP_Y
    );

    this.hudLevelText = this.add
      .text(20, 24, "", {
        fontFamily: "ZpixOne",
        fontSize: "21px",
        color: "#fff0cf",
        stroke: "#28170f",
        strokeThickness: 4
      })
      .setScrollFactor(0)
      .setDepth(10);
    this.hudStatsText = this.add
      .text(20, 58, "", {
        fontFamily: "ZpixOne",
        fontSize: "14px",
        color: "#cdb28a",
        stroke: "#28170f",
        strokeThickness: 2
      })
      .setScrollFactor(0)
      .setDepth(10);
    this.hudTimerText = this.add
      .text(20, 74, "", {
        fontFamily: "ZpixOne",
        fontSize: "14px",
        color: "#f0dfbe",
        stroke: "#28170f",
        strokeThickness: 3
      })
      .setScrollFactor(0)
      .setDepth(10);
    this.hudGoldText = this.add
      .text(20, 90, "", {
        fontFamily: "ZpixOne",
        fontSize: "14px",
        color: "#e6cc86",
        stroke: "#28170f",
        strokeThickness: 3
      })
      .setScrollFactor(0)
      .setDepth(10);
    this.hudXpLabelText = this.add
      .text(20, 44, "EXP", {
        fontFamily: "ZpixOne",
        fontSize: "9px",
        color: "#e7d6b4",
        stroke: "#28170f",
        strokeThickness: 2
      })
      .setScrollFactor(0)
      .setDepth(10);
    this.hudSecondaryText = this.add
      .text(1032, 22, "", {
        fontFamily: "ZpixOne",
        fontSize: "14px",
        color: "#ddc69e",
        stroke: "#28170f",
        strokeThickness: 3,
        align: "left"
      })
      .setLineSpacing(4)
      .setScrollFactor(0)
      .setDepth(10);
    if (this.textures.exists(IMPORTED_PIXEL_ASSETS.uiPanelBrown.key)) {
      this.hudPanelBack = this.add
        .image(HUD_PANEL_X + HUD_PANEL_WIDTH * 0.5, HUD_PANEL_Y + HUD_PANEL_HEIGHT * 0.5, IMPORTED_PIXEL_ASSETS.uiPanelBrown.key)
        .setOrigin(0.5)
        .setDisplaySize(HUD_PANEL_WIDTH, HUD_PANEL_HEIGHT)
        .setScrollFactor(0)
        .setDepth(8)
        .setTint(0x8e5b33)
        .setAlpha(0.92);
      this.hudSecondaryPanel = this.add
        .image(1142, 44, IMPORTED_PIXEL_ASSETS.uiPanelBrown.key)
        .setOrigin(0.5)
        .setDisplaySize(228, 78)
        .setScrollFactor(0)
        .setDepth(8)
        .setTint(0x7e532f);
    }
    if (this.textures.exists(IMPORTED_PIXEL_ASSETS.uiPanelTanInlay.key)) {
      this.hudXpFrame = this.add
        .image(162, 47, IMPORTED_PIXEL_ASSETS.uiPanelTanInlay.key)
        .setOrigin(0.5)
        .setDisplaySize(284, 10)
        .setScrollFactor(0)
        .setDepth(8.8)
        .setTint(0xd2b07e)
        .setAlpha(0.9);
    }
    if (this.textures.exists(IMPORTED_PIXEL_ASSETS.uiPanelBrownInlay.key)) {
      this.hudHeaderChip = this.add
        .image(76, 18, IMPORTED_PIXEL_ASSETS.uiPanelBrownInlay.key)
        .setOrigin(0.5)
        .setDisplaySize(120, 18)
        .setScrollFactor(0)
        .setDepth(8.9)
        .setTint(0xc19a67);
      this.hudSecondaryChip = this.add
        .image(1104, 18, IMPORTED_PIXEL_ASSETS.uiPanelBrownInlay.key)
        .setOrigin(0.5)
        .setDisplaySize(100, 18)
        .setScrollFactor(0)
        .setDepth(8.9)
        .setTint(0xb48855);
    }
    this.hudCoreLabelText = this.add
      .text(76, 18, "SURVIVAL LOG", {
        fontFamily: "ZpixOne",
        fontSize: "11px",
        color: "#2e170d"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.hudSecondaryLabelText = this.add
      .text(1104, 18, "CREW KIT", {
        fontFamily: "ZpixOne",
        fontSize: "11px",
        color: "#2e170d"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.hudBarsGraphics = this.add.graphics().setScrollFactor(0).setDepth(9);
    this.enemyHealthBarsGraphics = this.add.graphics().setDepth(8.6);
    const weaponSlotCount = Math.max(1, this.player?.maxWeaponSlots ?? 3);
    const slotGap = 44;
    const slotStartX = 640 - ((weaponSlotCount - 1) * slotGap) / 2;
    const slotY = 22;
    this.hudWeaponSlotFrames = [];
    this.hudWeaponSlotLabels = [];
    for (let i = 0; i < weaponSlotCount; i += 1) {
      const slotX = Math.round(slotStartX + i * slotGap);
      const frame = this.add
        .rectangle(slotX, slotY, 34, 34, 0x2f1b12, 0.8)
        .setStrokeStyle(2, 0x6d4a31, 0.8)
        .setScrollFactor(0)
        .setDepth(10);
      const label = this.add
        .text(slotX, slotY, "", {
          fontFamily: "ZpixOne",
          fontSize: "15px",
          color: "#f4e5c8",
          stroke: "#2a170f",
          strokeThickness: 3
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(11);
      this.hudWeaponSlotFrames.push(frame);
      this.hudWeaponSlotLabels.push(label);
    }
    this.playerReadabilityGraphics = this.add.graphics().setDepth(5);
    this.lowHealthVignetteGraphics = this.add.graphics().setScrollFactor(0).setDepth(21);
    this.createEdgeFogOverlay();
    this.dashCooldownRingGraphics = this.add.graphics().setDepth(9);
    this.offscreenIndicatorGraphics = this.add.graphics().setScrollFactor(0).setDepth(19);
    this.modalBackdrop = this.add
      .rectangle(640, 360, 1280, 720, 0x05080d, 0.28)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.MENUS - 1)
      .setVisible(false);

    this.damageNumberPool = [];
    this.offscreenIndicatorPool = [];
    this.debugOverlayPanel = this.add
      .rectangle(1260, 98, 252, 116, 0x19110b, 0.56)
      .setOrigin(1, 0)
      .setStrokeStyle(2, 0x6d4a31, 0.56)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.HUD + 2)
      .setVisible(false);
    this.debugDirectorText = this.add
      .text(1024, 108, "", {
        fontFamily: "ZpixOne",
        fontSize: "13px",
        color: "#baa27d",
        stroke: "#22150d",
        strokeThickness: 3
      })
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.HUD + 3);
    this.debugDirectorText.setVisible(this.debugOverlayEnabled);
    this.createGameplayHUD();
    this.createHudAlertPool();
    this.deactivateLegacyHudLayer();
    this.applyHudModalFocus(false);

    this.gameOverText = this.add
      .text(640, 360, "GAME OVER", {
        fontFamily: "ZpixOne",
        fontSize: "28px",
        color: "#ffdad7",
        align: "center",
        stroke: "#1a1010",
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.MENUS + 10)
      .setVisible(false);

    this.gameOverRestartButton = this.add
      .rectangle(640, 540, 240, 58, 0x17304f, 0.95)
      .setStrokeStyle(2, 0x66b9ff, 1)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.MENUS + 11)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.gameOverRestartLabel = this.add
      .text(640, 540, "Restart Run", {
        fontFamily: "ZpixOne",
        fontSize: "26px",
        color: "#eaf6ff",
        stroke: "#0d1628",
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.MENUS + 12)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    const onRestartPointer = () => this.restartRun();
    this.gameOverRestartButton.on("pointerdown", onRestartPointer);
    this.gameOverRestartLabel.on("pointerdown", onRestartPointer);

    this.createTouchControls();
    this.ensureDomHudOverlay();
    this._applyMobileHudAdjustments();
    this.registerSceneShutdownCleanup();
    // Auto-equip starting weapon(s), then immediately show weapon selection
    if (this.shipConfig) {
      const weapons = this.shipConfig.initialWeapons || [this.shipConfig.initialWeapon];
      weapons.forEach((w) => this.weaponSystem.addWeapon(w));
      this.openWeaponSelection();
    } else if (this.fighterConfig) {
      const startWeapon = this.fighterConfig.startingWeapon;
      this.weaponSystem.addWeapon(startWeapon);
      this.openWeaponSelection();
    } else {
      this.openWeaponSelection();
    }
    // Start BGM after a short delay
    this.time.delayedCall(1500, () => this.startBgm());
    this.maintainEnemyDensity();
    this.updateHUD();
  }

  preload() {
    Object.entries(SFX_AUDIO_FILES).forEach(([key, path]) => {
      if (this.cache?.audio?.exists(key)) {
        return;
      }
      this.load.audio(key, path);
    });
    CHARACTER_ASSET_MANIFEST.forEach(({ keyPrefix, basePath }) => {
      CHARACTER_DIRECTIONS.forEach((direction) => {
        const dirKey = direction.replace(/-/g, "_");
        const textureKey = `${keyPrefix}_${dirKey}`;
        if (this.textures?.exists(textureKey)) {
          return;
        }
        this.load.image(textureKey, `${basePath}/rotations/${direction}.png`);
      });
    });
    DECK_TILE_VARIANTS.forEach(({ key, path }) => {
      if (this.textures?.exists(key)) {
        return;
      }
      this.load.image(key, path);
    });
    Object.values(IMPORTED_PIXEL_ASSETS).forEach(({ key, path }) => {
      if (this.textures?.exists(key)) {
        return;
      }
      this.load.image(key, path);
    });
    Object.values(WEAPON_ICON_ASSETS).forEach(({ key, path }) => {
      if (this.textures?.exists(key)) {
        return;
      }
      this.load.image(key, path);
    });

    this.load.image("game_bg", "assets/sprites/ui/bg.png");

    this.setupCoopMode();
  }

  setupCoopMode() {
    if (this.gameMode !== "coop" || !this.networkManager) return;

    import("../networking/PlayerSync.js").then(({ PlayerSync }) => {
      this.playerSync = new PlayerSync(this);

      for (const p of this.coopPlayers) {
        if (p.playerId !== this.networkManager.playerId) {
          this.playerSync.addRemotePlayer(p.playerId, p.fighterType, p.username);
        }
      }
    });

    import("../networking/EnemySync.js").then(({ EnemySync }) => {
      if (!this.isHost) {
        this.enemySync = new EnemySync(this, this.enemyPool);
      }
    });

    this.networkManager.onRemotePlayerUpdate = (data) => {
      if (data.playerId === this.networkManager.playerId) return;
      this.playerSync?.updatePlayerState(data.playerId, data);
    };

    this.networkManager.onEnemyStateUpdate = (data) => {
      if (this.isHost) return;
      this.enemySync?.applyEnemyState(data);
    };

    this.networkManager.onEnemyDamage = (data) => {
      if (!this.isHost) return;
      const enemy = this.enemies.getChildren().find(
        (e) => e.active && e.serverId === data.enemyId && !e.getData("isDying")
      );
      if (enemy) {
        enemy.takeDamage(data.damage);
        if (this.spawnWeaponHitParticles) {
          this.spawnWeaponHitParticles(enemy.x, enemy.y, 3);
        }
        if (enemy.isDead()) {
          this.handleEnemyDefeat(enemy);
        }
      }
    };

    this.networkManager.onEnemyKilled = (data) => {
      if (this.isHost) return;
      const enemy = this.enemySync?.getEnemyByServerId(data.enemyId);
      if (enemy && enemy.active) {
        this.handleEnemyDefeat(enemy);
      }
    };

    this.networkManager.onXpDrop = (data) => {
      if (this.isHost) return;
      this.spawnXpOrb(data.x, data.y, data.value);
    };

    this.networkManager.onItemDrop = (data) => {
      if (this.isHost) return;
      if (this.itemPool && data.type) {
        const item = this.itemPool.acquire(data.x, data.y, data.type);
        if (item) this.activeItems.push(item);
      }
    };

    this.networkManager.onPlayerDied = (data) => {
      this.playerSync?.markPlayerDead(data.playerId);
      this.showHudAlert(`${data.playerId} 已阵亡`, 2000);
    };

    this.networkManager.onGameOver = (data) => {
      if (!this.isGameOver) {
        this.triggerGameOver();
      }
    };

    this.networkManager.onHostMigrated = (data) => {
      if (data.newHostId === this.networkManager.playerId) {
        this.isHost = true;
        this.showHudAlert("你已成为房主", 2000);
      }
    };
  }

  update(time, delta) {
    const isRunSummaryOpen = this.scene.isActive("RunSummaryScene");
    if (isRunSummaryOpen || this.isPaused) {
      this.setDomHudVisible(false);
      this.setDomTouchControlsVisible(false);
      if (this.input?.enabled && !this.isPaused) {
        this.input.enabled = false;
      }
      if (isRunSummaryOpen) return;
    } else {
      this.setDomHudVisible(true);
      if (this.touchControlsEnabled) this.setDomTouchControlsVisible(true);
    }
    if (this.input && !this.input.enabled) {
      this.input.enabled = true;
    }

    this.updateHelpOverlayPresentation();
    this.handlePlaytestHotkeys();

    if (this.isGameOver) {
      this.updateBossProjectiles(time);
      this.updateEnemyHealthBars();
      this.updateLowHealthVignette();
      this.updateDashCooldownRing();
      this.updateOffscreenEnemyIndicators();
      this.updateDebugDirectorOverlay();
      this.handleGameOverInput();
      return;
    }

    if (this.isLeveling) {
      this.handleLevelUpInput();
      this.updateBossProjectiles(time);
      this.player.body?.setVelocity(0, 0);
      this.updateEnemyHealthBars();
      this.updateLowHealthVignette();
      this.updateDashCooldownRing();
      this.updateOffscreenEnemyIndicators();
      this.updateDebugDirectorOverlay();
      this.updateHUD();
      return;
    }

    if (this.isWeaponSelecting) {
      const hasSelectionUi = Array.isArray(this.weaponSelectionUi) && this.weaponSelectionUi.some((obj) => obj?.active !== false);
      if (!hasSelectionUi) {
        this.forceCloseWeaponSelectionWithFallback();
      }
      if (!this.isWeaponSelecting) {
        // Fallback may have resumed gameplay in this frame.
      } else {
      this.handleWeaponSelectionInput();
      this.updateBossProjectiles(time);
      this.player.body?.setVelocity(0, 0);
      this.updateEnemyHealthBars();
      this.updateLowHealthVignette();
      this.updateDashCooldownRing();
      this.updateOffscreenEnemyIndicators();
      this.updateDebugDirectorOverlay();
      this.updateHUD();
      return;
      }
    }

    if (this.isPaused) {
      this.handlePauseInput();
      return;
    }

    // Check for pause input
    if (Phaser.Input.Keyboard.JustDown(this.keys.pause) || Phaser.Input.Keyboard.JustDown(this.keys.pauseAlt)) {
      this.openPauseMenu();
      return;
    }

    const stateChanged = this.director.update(delta);
    if (stateChanged && this.director.getState() === DIRECTOR_STATE.PEAK) {
      this.shakeScreen(180, 0.0028);
    }

    this.runTimeMs += delta;
    this.playTime += delta;
    if ((this.time?.now ?? 0) - this.lastKillAtMs > COMBO_RESET_WINDOW_MS) {
      this.killCombo = 0;
    }
    this.checkStageAnnouncements();
    this.updateBossApproachWarning();

    // Enemy spawning is host-authoritative in coop — only the host creates enemies.
    if (this.gameMode !== "coop" || this.isHost) {
      this.spawnAccumulatorMs += delta;
      this.processDirectorBossSpawns();
      this.processDirectorMiniBossSpawns();
      this.processDirectorSpawnBursts();
      this.processDirectorLadderSpawns();
      this.processDirectorHatchBreaches();

      const spawnRateMultiplier = this.getEffectiveSpawnRateMultiplier();
      const effectiveSpawnIntervalMs = this.baseSpawnCheckIntervalMs / Math.max(0.2, spawnRateMultiplier);
      while (this.spawnAccumulatorMs >= effectiveSpawnIntervalMs) {
        this.spawnAccumulatorMs -= effectiveSpawnIntervalMs;
        this.maintainEnemyDensity();
      }
    } else {
      this.director.consumeBossSpawnRequests();
      this.director.consumeMiniBossSpawnRequests();
      this.director.consumeSpawnBurstRequests();
      this.director.consumeLadderSpawnRequests();
      this.director.consumeHatchBreachSpawnRequests();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.dash) || this.consumeTouchDash()) {
      this.player.tryDash();
    }

    this.player.updateDash(delta);
    this.updateBossProjectiles(time);
    this.emitDashTrail(delta);
    this.player.moveFromInput(this.keys, this.getTouchMoveInput());
    this.updatePlayerReadabilityAura();
    this.pullXpOrbsToPlayer();
    this.updateActiveItems(delta);
    this.updateChests();
    this.updateDestructibles(time);
    this.updateShieldEffect(delta);
    this.weaponSystem.update(time, delta);
    this.statusEffectSystem?.update(time, delta);
    this.performAutoAttack(time);

    const speedMultiplier = this.getEffectiveEnemySpeedMultiplier();
    const damageMultiplier = this.director.getEnemyDamageMultiplier();

    if (this.gameMode !== "coop" || this.isHost) {
      this.enemies.getChildren().forEach((enemy) => {
        if (!enemy.active) {
          return;
        }
        enemy.speed = enemy.baseSpeed * speedMultiplier;
        enemy.damage = Math.max(1, Math.round(enemy.baseDamage * damageMultiplier));
        const target = this._getNearestPlayerForEnemy(enemy);
        enemy.chase(target, delta, time);
        enemy.tryApplyPoisonAura(target, time);
        if (enemy.updateBossPattern) {
          enemy.updateBossPattern(target, time);
        }
        this.applyEnemyAntiJam(enemy, time);
      });
    }

    if (this.gameMode === "coop" && this.networkManager) {
      this.networkSyncAccumulator += delta;

      if (this.networkSyncAccumulator >= 50) {
        this.networkSyncAccumulator = 0;
        this.networkManager.sendPlayerState(this.player);

        if (this.isHost) {
          const activeEnemies = this.enemies.getChildren()
            .filter((e) => e.active)
            .map((e) => ({
              id: e.serverId || `${Math.round(e.x)}_${Math.round(e.y)}`,
              type: e.type,
              x: Math.round(e.x),
              y: Math.round(e.y),
              hp: e.hp,
              maxHp: e.maxHp,
              facing: e.facingDirection,
              isElite: e.isElite || false,
              eliteType: e.eliteType,
              damage: e.damage,
              xpValue: e.xpValue,
              archetype: e.getData("archetype"),
              bossVariant: e.getData("bossVariant")
            }));
          this.networkManager.sendEnemyState(activeEnemies);
        }
      }

      this.playerSync?.update(this.time.now);
    }

    // Infinite background parallax — tiles scroll at 30% of camera speed.
    if (this._bgTile) {
      this._bgTile.tilePositionX = this.cameras.main.scrollX * 0.3;
      this._bgTile.tilePositionY = this.cameras.main.scrollY * 0.3;
    }

    if (this.player.isDead()) {
      this.triggerGameOver();
      return;
    }

    this.updateEnemyHealthBars();
    this.updateBossHpBar();
    this.updateLowHealthVignette();
    this.updateDashCooldownRing();
    this.updateOffscreenEnemyIndicators();
    this.updateDebugDirectorOverlay();
    this.updateHUD();
  }

  createTextures() {
    this.generatePixelTexture("player_triangle", 2, PIXEL_PLAYER_PATTERN, {
      "1": 0xf6f2c8,
      "2": 0x183254,
      "3": 0x7fe8ff,
      "4": 0x2d6f9b,
      "5": 0xe7b96b,
      "6": 0x54dafe,
      "7": 0x1f7fa5,
      "8": 0x98eeff
    }, { shadowColor: 0x071120, shadowOffsetX: 1, shadowOffsetY: 1 });
    this.generatePixelTexture("enemy_swarm", 2, PIXEL_SWARM_PATTERN, {
      "1": 0x7c2748,
      "2": 0xff8a9c,
      "3": 0xffd3de
    }, { shadowColor: 0x1f1020, shadowOffsetX: 1, shadowOffsetY: 1 });
    this.generatePixelTexture("enemy_tank", 2, PIXEL_TANK_PATTERN, {
      "1": 0x24344e,
      "2": 0x3f5f8d,
      "3": 0x5c89ff,
      "4": 0xaac4ff,
      "5": 0xcfdcff
    }, { shadowColor: 0x071120, shadowOffsetX: 1, shadowOffsetY: 1 });
    this.generatePixelTexture("enemy_hunter", 2, PIXEL_HUNTER_PATTERN, {
      "1": 0x14404b,
      "2": 0x1b6d84,
      "3": 0x54e1ff
    }, { shadowColor: 0x071120, shadowOffsetX: 1, shadowOffsetY: 1 });
    this.generatePixelTexture("enemy_ranger", 2, PIXEL_RANGER_PATTERN, {
      "1": 0x3a1e5e,
      "2": 0x7b3fcf,
      "3": 0xdd88ff,
      "4": 0xffcc00
    }, { shadowColor: 0x1a0e2e, shadowOffsetX: 1, shadowOffsetY: 1 });
    this.generatePixelTexture("enemy_chaser", 2, PIXEL_CHASER_PATTERN, {
      "1": 0x74242a,
      "2": 0xff6d6d,
      "3": 0xffd2d2
    }, { shadowColor: 0x2a1010, shadowOffsetX: 1, shadowOffsetY: 1 });
    this.generateCompositeTexture("sprite_enemy_chaser_free", 28, 28, [
      { sourceKey: IMPORTED_PIXEL_ASSETS.enemyChaserBody.key, x: 2, y: 2, width: 24, height: 24 },
      { sourceKey: IMPORTED_PIXEL_ASSETS.enemyChaserEye.key, x: 9, y: 8, width: 10, height: 9 },
      { sourceKey: IMPORTED_PIXEL_ASSETS.enemyChaserMouth.key, x: 8, y: 17, width: 12, height: 5 }
    ]);
    this.generatePixelTexture("enemy_boss", 2, PIXEL_BOSS_PATTERN, {
      "1": 0x24103f,
      "2": 0x4a1e73,
      "3": 0x6d34ff,
      "4": 0xa57cff,
      "5": 0xd3c1ff,
      "6": 0xff8ba7,
      "7": 0xffd4de
    }, { shadowColor: 0x090512, shadowOffsetX: 1, shadowOffsetY: 1 });
    this.generatePixelTexture("terrain_crate", 2, PIXEL_CRATE_PATTERN, {
      "1": 0x3a2417,
      "2": 0x7e5234,
      "3": 0x5f3d28,
      "4": 0xb6804f
    }, { shadowColor: 0x24160f, shadowOffsetX: 1, shadowOffsetY: 1 });
    this.generatePixelTexture("terrain_cannon", 2, PIXEL_CANNON_PATTERN, {
      "1": 0x2b1c14,
      "2": 0x4b5568,
      "3": 0x7d8798,
      "4": 0x8d643f
    }, { shadowColor: 0x071120, shadowOffsetX: 1, shadowOffsetY: 1 });
    this.generatePixelTexture("terrain_mast", 2, PIXEL_MAST_PATTERN, {
      "1": 0x3d2619,
      "2": 0x71472c,
      "3": 0xa97a4d
    }, { shadowColor: 0x24160f, shadowOffsetX: 1, shadowOffsetY: 1 });
    this.generatePolygonTexture("terrain_rock", 28, [
      { x: 10, y: 12 },
      { x: 20, y: 6 },
      { x: 37, y: 8 },
      { x: 46, y: 19 },
      { x: 45, y: 36 },
      { x: 33, y: 47 },
      { x: 17, y: 48 },
      { x: 8, y: 36 },
      { x: 6, y: 23 }
    ], 0x6f7d90, 0x374356);
    this.generatePolygonTexture("terrain_pillar", 28, [
      { x: 14, y: 7 },
      { x: 42, y: 7 },
      { x: 47, y: 16 },
      { x: 47, y: 40 },
      { x: 42, y: 49 },
      { x: 14, y: 49 },
      { x: 9, y: 40 },
      { x: 9, y: 16 }
    ], 0x8a8f9f, 0x4f5568);
    this.generatePolygonTexture("upgrade_orb", 10, [
      { x: 10, y: 2 },
      { x: 18, y: 10 },
      { x: 10, y: 18 },
      { x: 2, y: 10 }
    ], 0xfff2a0, 0xb8831e);
    this.generateCircleTexture("xp_orb", 6, 0x66f5b2, 0x1f8d63);
    this.generateCircleTexture("xp_orb_blue", 6, 0x44aaff, 0x1a5599);
    this.generateCircleTexture("xp_orb_purple", 7, 0xaa66ff, 0x552299);
    this.generateCircleTexture("xp_orb_gold", 8, 0xffdd44, 0x997711);
    this.generateCircleTexture("proj_dagger", 4, 0xeef7ff, 0x7895af);
    this.generateCircleTexture("proj_fireball", 8, 0xff944d, 0xa84d1b);
    this.generateCircleTexture("proj_meteor", 11, 0xff8b44, 0x70220d);
    this.generateCircleTexture("proj_orbit_blade", 7, 0xc6e5ff, 0x5884ad);
    this.generateCircleTexture("boss_bullet", 5, 0xff8b8b, 0x7b1a1a);
    this.generateCircleTexture("hit_particle", 2, 0xffffff, 0xffffff);
  }

  createDamageEmitter() {
    if (this.damageEmitter) {
      this.damageEmitter.destroy();
    }
    if (this.killEmitter) {
      this.killEmitter.destroy();
    }
    if (this.eliteKillEmitter) {
      this.eliteKillEmitter.destroy();
    }
    if (this.evolutionEmitter) {
      this.evolutionEmitter.destroy();
    }
    if (this.dashTrailEmitter) {
      this.dashTrailEmitter.destroy();
    }

    const particleTextureKey = this.getSafeParticleTextureKey();
    this.damageEmitter = this.add.particles(0, 0, particleTextureKey, {
      emitting: false,
      quantity: 0,
      frequency: -1,
      speed: { min: 45, max: 180 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 90, max: 220 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.95, end: 0 },
      tint: [0xffffff, 0xffd6ad, 0xffb87f],
      blendMode: "ADD"
    });
    this.damageEmitter.setDepth(9);

    this.killEmitter = this.add.particles(0, 0, particleTextureKey, {
      emitting: false,
      quantity: 0,
      frequency: -1,
      speed: { min: 80, max: 240 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 140, max: 320 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.95, end: 0 },
      tint: [0xffffff, 0xffd8a8, 0xff9b7a],
      blendMode: "ADD"
    });
    this.killEmitter.setDepth(10);

    this.eliteKillEmitter = this.add.particles(0, 0, particleTextureKey, {
      emitting: false,
      quantity: 0,
      frequency: -1,
      speed: { min: 120, max: 300 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 180, max: 360 },
      scale: { start: 1.35, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xa5f3ff, 0xc8a8ff],
      blendMode: "ADD"
    });
    this.eliteKillEmitter.setDepth(11);

    this.evolutionEmitter = this.add.particles(0, 0, particleTextureKey, {
      emitting: false,
      quantity: 0,
      frequency: -1,
      speed: { min: 140, max: 360 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 160, max: 420 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xfff0a6, 0xa5f1ff, 0xcbb2ff],
      blendMode: "ADD"
    });
    this.evolutionEmitter.setDepth(12);

    this.dashTrailEmitter = this.add.particles(0, 0, particleTextureKey, {
      emitting: false,
      quantity: 0,
      frequency: -1,
      speed: { min: 12, max: 70 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 70, max: 140 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: [0xfff3b3, 0xb8f0ff, 0x79d7ff],
      blendMode: "ADD"
    });
    this.dashTrailEmitter.setDepth(8);
    this.dashParticles = this.dashTrailEmitter;
  }

  getSafeParticleTextureKey() {
    if (this.textures.exists(PARTICLE_TEXTURE_KEY)) {
      return PARTICLE_TEXTURE_KEY;
    }
    if (this.textures.exists(PARTICLE_FALLBACK_TEXTURE_KEY)) {
      return PARTICLE_FALLBACK_TEXTURE_KEY;
    }
    this.generateCircleTexture(PARTICLE_GENERATED_FALLBACK_TEXTURE_KEY, 2, 0xffffff, 0xffffff);
    return PARTICLE_GENERATED_FALLBACK_TEXTURE_KEY;
  }

  isEmitterReady(emitter) {
    if (!emitter || !emitter.active || !emitter.texture) {
      return false;
    }
    const textureKey = emitter.texture.key;
    return typeof textureKey === "string" && this.textures.exists(textureKey);
  }

  ensureParticleEmitters() {
    if (
      this.isEmitterReady(this.damageEmitter) &&
      this.isEmitterReady(this.killEmitter) &&
      this.isEmitterReady(this.eliteKillEmitter) &&
      this.isEmitterReady(this.evolutionEmitter) &&
      this.isEmitterReady(this.dashTrailEmitter)
    ) {
      return true;
    }

    this.createDamageEmitter();
    return (
      this.isEmitterReady(this.damageEmitter) &&
      this.isEmitterReady(this.killEmitter) &&
      this.isEmitterReady(this.eliteKillEmitter) &&
      this.isEmitterReady(this.evolutionEmitter) &&
      this.isEmitterReady(this.dashTrailEmitter)
    );
  }

  spawnDamageParticles(x, y, count = 5) {
    if (!this.ensureParticleEmitters()) {
      return;
    }
    const scaledCount = this.getScaledParticleCount(count, 2);
    this.damageEmitter.explode(Math.max(2, Math.min(12, scaledCount)), x, y);
  }

  spawnHitSparkParticles(x, y, count = 4) {
    if (!this.ensureParticleEmitters()) {
      return;
    }
    if (typeof this.damageEmitter.setLifespan === "function") {
      this.damageEmitter.setLifespan(200);
    }
    if (typeof this.damageEmitter.setTint === "function") {
      this.damageEmitter.setTint(0xffffff);
    }
    const sparkCount = Math.max(1, Math.min(6, Math.round(Number(count) || 4)));
    this.damageEmitter.explode(sparkCount, x, y);
    if (typeof this.damageEmitter.setLifespan === "function") {
      this.damageEmitter.setLifespan({ min: 90, max: 220 });
    }
    if (typeof this.damageEmitter.setTint === "function") {
      this.damageEmitter.setTint([0xffffff, 0xffd6ad, 0xffb87f]);
    }
  }

  spawnWeaponHitParticles(x, y, count = 3) {
    if (!this.ensureParticleEmitters()) {
      return;
    }
    if (typeof this.damageEmitter.setLifespan === "function") {
      this.damageEmitter.setLifespan(200);
    }
    if (typeof this.damageEmitter.setTint === "function") {
      this.damageEmitter.setTint([0xff7a7a, 0xff4a4a, 0xff2d2d]);
    }
    const particleCount = Math.max(1, Math.min(6, Math.round(Number(count) || 3)));
    this.damageEmitter.explode(particleCount, x, y);
    if (typeof this.damageEmitter.setLifespan === "function") {
      this.damageEmitter.setLifespan({ min: 90, max: 220 });
    }
    if (typeof this.damageEmitter.setTint === "function") {
      this.damageEmitter.setTint([0xffffff, 0xffd6ad, 0xffb87f]);
    }
  }

  spawnKillParticles(x, y, count = 10) {
    if (!this.ensureParticleEmitters()) {
      return;
    }
    const scaledCount = this.getScaledParticleCount(count, 4);
    this.killEmitter.explode(Math.max(4, Math.min(20, scaledCount)), x, y);
  }

  spawnEliteKillParticles(x, y, count = 18) {
    if (!this.ensureParticleEmitters()) {
      return;
    }
    const scaledCount = this.getScaledParticleCount(count, 8);
    this.eliteKillEmitter.explode(Math.max(8, Math.min(28, scaledCount)), x, y);
  }

  playWeaponEvolutionFeedback(weapon) {
    this.ensureParticleEmitters();
    const flashDurationMs = 170;
    const slowScale = 0.26;
    const slowDurationMs = 180;

    if (this.cameras?.main) {
      this.cameras.main.flash(flashDurationMs, 255, 246, 197, true);
      this.shakeScreen(110, 0.0019);
    }

    if (this.evolutionEmitter && this.player && this.player.active) {
      this.evolutionEmitter.explode(this.getScaledParticleCount(36, 14), this.player.x, this.player.y);
    }

    if (!this.time || !this.tweens || !this.physics?.world) {
      return;
    }

    this.clearEvolutionSlowMoTimer();

    const previousTimeScale = this.time.timeScale;
    const previousTweenScale = this.tweens.timeScale;
    const previousPhysicsScale = this.physics.world.timeScale;
    this.time.timeScale = slowScale;
    this.tweens.timeScale = slowScale;
    this.physics.world.timeScale = slowScale;
    this.evolutionSlowMoActive = true;

    this.evolutionSlowMoRestoreHandle = setTimeout(() => {
      this.evolutionSlowMoRestoreHandle = null;
      if (!this.sys || !this.sys.isActive()) {
        return;
      }
      this.time.timeScale = previousTimeScale;
      this.tweens.timeScale = previousTweenScale;
      this.physics.world.timeScale = previousPhysicsScale;
      this.evolutionSlowMoActive = false;
    }, slowDurationMs);

    if (this.showHudAlert && weapon?.baseType) {
      this.showHudAlert(`${weapon.baseType.toUpperCase()} POWER SPIKE`, 1000);
    }
  }

  playWeaponFireFeedback(x, y, weaponType = "") {
    if (!this.add || !this.tweens) {
      return;
    }

    const flash = this.add.circle(x, y, 10, 0xffffff, 0.78).setDepth(8.4).setScale(1);
    this.tweens.add({
      targets: flash,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0,
      duration: 80,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy()
    });

    if (this.player?.active) {
      const baseScaleX = this.player.getData("weaponRecoilBaseScaleX") ?? this.player.scaleX;
      const baseScaleY = this.player.getData("weaponRecoilBaseScaleY") ?? this.player.scaleY;
      this.player.setData("weaponRecoilBaseScaleX", baseScaleX);
      this.player.setData("weaponRecoilBaseScaleY", baseScaleY);

      if (this.weaponRecoilTween) {
        this.weaponRecoilTween.stop();
        this.weaponRecoilTween = null;
      }

      this.player.setScale(baseScaleX, baseScaleY);
      this.weaponRecoilTween = this.tweens.add({
        targets: this.player,
        scaleX: baseScaleX * 1.05,
        scaleY: baseScaleY * 1.05,
        duration: 40,
        ease: "Sine.easeOut",
        yoyo: true,
        onComplete: () => {
          if (this.player?.active) {
            this.player.setScale(baseScaleX, baseScaleY);
          }
          this.weaponRecoilTween = null;
        }
      });
    }

    this.cameras?.main?.shake(60, 0.0008, true);
    this.playSfx("weapon_fire", { weaponType });
  }

  emitDashTrail(delta) {
    if (!this.ensureParticleEmitters() || !this.player || !this.player.active || !this.player.isDashing()) {
      this.dashTrailTickMs = 0;
      return;
    }

    const particleScale = this.getParticleLoadScale();
    this.dashTrailTickMs += delta;
    const spacingMs = Phaser.Math.Linear(34, 58, 1 - particleScale);
    const trailCount = this.getScaledParticleCount(2, 1, 2);
    while (this.dashTrailTickMs >= spacingMs) {
      this.dashTrailTickMs -= spacingMs;
      const vx = this.player.body ? this.player.body.velocity.x : 0;
      const vy = this.player.body ? this.player.body.velocity.y : 0;
      const trailX = this.player.x - vx * 0.017;
      const trailY = this.player.y - vy * 0.017;
      this.dashTrailEmitter.explode(trailCount, trailX, trailY);
    }
  }

  _loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem("forgeduel_settings"));
      if (saved) {
        this.settingsBgmVol = (saved.bgmVol ?? 60) / 100;
        this.settingsSfxVol = (saved.sfxVol ?? 80) / 100;
        this.settingsShowDmgNum = saved.showDmgNum !== false;
        this.settingsScreenShake = saved.screenShake !== false;
      } else {
        this.settingsBgmVol = 0.6;
        this.settingsSfxVol = 0.8;
        this.settingsShowDmgNum = true;
        this.settingsScreenShake = true;
      }
    } catch {
      this.settingsBgmVol = 0.6;
      this.settingsSfxVol = 0.8;
      this.settingsShowDmgNum = true;
      this.settingsScreenShake = true;
    }
    if (typeof window !== "undefined") {
      window.__forgeduelGame = this.game;
    }
  }

  shakeScreen(duration, intensity) {
    if (this.settingsScreenShake === false) return;
    this.cameras.main.shake(duration, intensity);
  }

  playSfxTone({ wave = "sine", startFreq = 440, endFreq = 220, duration = 0.1, gain = 0.04, curve = "exponential" }) {
    if (!this.sound || !this.sound.context) {
      return;
    }

    const sfxVol = this.settingsSfxVol ?? 1;
    if (sfxVol <= 0.001) return;
    gain = gain * sfxVol;

    const audioContext = this.sound.context;
    if (audioContext.state === "suspended" && audioContext.resume) {
      audioContext.resume().catch(() => {});
      if (audioContext.state === "suspended") {
        return;
      }
    }

    const startAt = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(Math.max(40, startFreq), startAt);
    if (curve === "linear") {
      oscillator.frequency.linearRampToValueAtTime(Math.max(40, endFreq), startAt + duration);
    } else {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), startAt + duration);
    }

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), startAt + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.01);
  }

  playSfx(type, options = {}) {
    const now = this.time?.now ?? Date.now();
    const throttleMs = SFX_THROTTLE_MS[type] ?? 0;
    const lastPlayed = this.sfxLastPlayedAt[type] ?? Number.NEGATIVE_INFINITY;
    if (now - lastPlayed < throttleMs) {
      return;
    }
    this.sfxLastPlayedAt[type] = now;

    const key = SFX_KEY_BY_TYPE[type];
    const baseVolume = SFX_VOLUME[type] ?? 0.1;
    const sfxVol = this.settingsSfxVol ?? 1;
    const safeVolume = Phaser.Math.Clamp(baseVolume * (options.elite ? 1.08 : 1) * sfxVol, 0.01, 0.24);
    if (key && this.cache?.audio?.exists(key) && this.sound) {
      this.sound.play(key, { volume: safeVolume });
      return;
    }

    if (type === "enemy_hit") {
      this.playSfxTone({
        wave: "square",
        startFreq: 900,
        endFreq: 520,
        duration: 0.045,
        gain: options.elite ? 0.045 : 0.03
      });
      return;
    }

    if (type === "enemy_death") {
      this.playSfxTone({
        wave: options.elite ? "sawtooth" : "triangle",
        startFreq: options.elite ? 280 : 240,
        endFreq: options.elite ? 110 : 90,
        duration: options.elite ? 0.2 : 0.14,
        gain: options.elite ? 0.07 : 0.045
      });
      return;
    }

    if (type === "dash") {
      this.playSfxTone({
        wave: "sawtooth",
        startFreq: 150,
        endFreq: 380,
        duration: 0.12,
        gain: 0.05,
        curve: "linear"
      });
      return;
    }

    if (type === "level_up") {
      this.playSfxTone({
        wave: "triangle",
        startFreq: 430,
        endFreq: 620,
        duration: 0.08,
        gain: 0.045,
        curve: "linear"
      });
      this.time.delayedCall(75, () => {
        this.playSfxTone({
          wave: "triangle",
          startFreq: 620,
          endFreq: 900,
          duration: 0.11,
          gain: 0.05,
          curve: "linear"
        });
      });
      return;
    }

    if (type === "weapon_fire") {
      const weaponType = options.weaponType ?? "dagger";
      if (weaponType === "dagger") {
        this.playSfxTone({
          wave: "square",
          startFreq: 980,
          endFreq: 720,
          duration: 0.032,
          gain: 0.016
        });
        return;
      }
      if (weaponType === "fireball") {
        this.playSfxTone({
          wave: "sawtooth",
          startFreq: 520,
          endFreq: 280,
          duration: 0.06,
          gain: 0.026
        });
        return;
      }
      if (weaponType === "meteor") {
        this.playSfxTone({
          wave: "sawtooth",
          startFreq: 420,
          endFreq: 180,
          duration: 0.08,
          gain: 0.03
        });
        return;
      }
      if (weaponType === "lightning") {
        this.playSfxTone({
          wave: "triangle",
          startFreq: 1120,
          endFreq: 760,
          duration: 0.042,
          gain: 0.02
        });
        return;
      }
      this.playSfxTone({
        wave: "square",
        startFreq: 820,
        endFreq: 560,
        duration: 0.045,
        gain: 0.022
      });
      return;
    }

    if (type === "chest_open") {
      this.playSfxTone({ wave: "triangle", startFreq: 400, endFreq: 700, duration: 0.08, gain: 0.05, curve: "linear" });
      this.time.delayedCall(80, () => {
        this.playSfxTone({ wave: "triangle", startFreq: 600, endFreq: 1000, duration: 0.12, gain: 0.06, curve: "linear" });
      });
      this.time.delayedCall(180, () => {
        this.playSfxTone({ wave: "sine", startFreq: 900, endFreq: 1200, duration: 0.15, gain: 0.04, curve: "linear" });
      });
      return;
    }

    if (type === "item_spawn") {
      this.playSfxTone({ wave: "sine", startFreq: 600, endFreq: 900, duration: 0.06, gain: 0.03, curve: "linear" });
      return;
    }
  }

  generateCircleTexture(key, radius, fillColor, strokeColor) {
    if (this.textures.exists(key)) {
      return;
    }

    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(fillColor, 1);
    gfx.fillCircle(radius, radius, radius);
    gfx.lineStyle(2, strokeColor, 1);
    gfx.strokeCircle(radius, radius, radius);
    gfx.generateTexture(key, radius * 2, radius * 2);
    gfx.destroy();
  }

  generatePixelTexture(key, pixelSize, rows, palette, options = {}) {
    if (this.textures.exists(key)) {
      return;
    }

    const safeRows = Array.isArray(rows) ? rows : [];
    const rowCount = safeRows.length;
    const colCount = safeRows.reduce((max, row) => Math.max(max, row.length), 0);
    if (rowCount === 0 || colCount === 0) {
      return;
    }

    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    const shadowColor = options.shadowColor;
    const shadowOffsetX = Number.isFinite(options.shadowOffsetX) ? options.shadowOffsetX : 0;
    const shadowOffsetY = Number.isFinite(options.shadowOffsetY) ? options.shadowOffsetY : 0;
    if (shadowColor !== undefined && (shadowOffsetX !== 0 || shadowOffsetY !== 0)) {
      safeRows.forEach((row, y) => {
        for (let x = 0; x < row.length; x += 1) {
          const symbol = row[x];
          if (palette[symbol] === undefined) {
            continue;
          }
          gfx.fillStyle(shadowColor, 0.9);
          gfx.fillRect((x + shadowOffsetX) * pixelSize, (y + shadowOffsetY) * pixelSize, pixelSize, pixelSize);
        }
      });
    }
    safeRows.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        const symbol = row[x];
        const color = palette[symbol];
        if (color === undefined) {
          continue;
        }
        gfx.fillStyle(color, 1);
        gfx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    });
    gfx.generateTexture(key, colCount * pixelSize, rowCount * pixelSize);
    gfx.destroy();
  }

  generateCompositeTexture(key, width, height, layers = []) {
    if (this.textures.exists(key)) {
      return;
    }
    if (!Array.isArray(layers) || layers.length === 0) {
      return;
    }

    const allLayersReady = layers.every((layer) => this.textures.exists(layer.sourceKey));
    if (!allLayersReady) {
      return;
    }

    const canvasTexture = this.textures.createCanvas(key, width, height);
    if (!canvasTexture?.context) {
      return;
    }

    const ctx = canvasTexture.context;
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;

    layers.forEach((layer) => {
      const sourceTexture = this.textures.get(layer.sourceKey);
      const sourceImage = sourceTexture?.getSourceImage?.();
      if (!sourceImage) {
        return;
      }
      ctx.drawImage(
        sourceImage,
        0,
        0,
        sourceImage.width,
        sourceImage.height,
        layer.x,
        layer.y,
        layer.width,
        layer.height
      );
    });

    canvasTexture.refresh();
  }

  generatePolygonTexture(key, size, points, fillColor, strokeColor) {
    if (this.textures.exists(key)) {
      return;
    }

    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    const shapePoints = points.map((point) => new Phaser.Geom.Point(point.x, point.y));
    gfx.fillStyle(fillColor, 1);
    gfx.fillPoints(shapePoints, true);
    gfx.lineStyle(2, strokeColor, 1);
    gfx.strokePoints(shapePoints, true, true);
    gfx.generateTexture(key, size * 2, size * 2);
    gfx.destroy();
  }

  generatePlayerTriangleTexture(key, size, fillColor, strokeColor, glowColor) {
    if (this.textures.exists(key)) {
      return;
    }

    const center = size;
    const outerPoints = [
      new Phaser.Geom.Point(center, center - size + 1),
      new Phaser.Geom.Point(center + size - 2, center + size - 4),
      new Phaser.Geom.Point(center - size + 2, center + size - 4)
    ];
    const innerPoints = [
      new Phaser.Geom.Point(center, center - size + 4),
      new Phaser.Geom.Point(center + size - 6, center + size - 8),
      new Phaser.Geom.Point(center - size + 6, center + size - 8)
    ];

    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(glowColor, 0.26);
    gfx.fillPoints(outerPoints, true);
    gfx.fillStyle(fillColor, 1);
    gfx.fillPoints(innerPoints, true);
    gfx.lineStyle(2, strokeColor, 1);
    gfx.strokePoints(innerPoints, true, true);
    gfx.generateTexture(key, size * 2, size * 2);
    gfx.destroy();
  }

  drawArena() {}

  _createInfiniteBackground() {
    this._bgTile = this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "game_bg");
    this._bgTile.setOrigin(0, 0);
    this._bgTile.setDepth(-5);
  }

  drawDeckDecor(deckLeft, deckTop, deckRight, deckBottom) {
    const decorDepth = 1.4;

    if (this.textures.exists(IMPORTED_PIXEL_ASSETS.deckHullLarge.key)) {
      this.add
        .image((deckLeft + deckRight) * 0.5, deckTop + 54, IMPORTED_PIXEL_ASSETS.deckHullLarge.key)
        .setDepth(decorDepth)
        .setScale(1.8);
      this.add
        .image((deckLeft + deckRight) * 0.5, deckBottom - 54, IMPORTED_PIXEL_ASSETS.deckHullLarge.key)
        .setDepth(decorDepth)
        .setScale(1.8)
        .setRotation(Math.PI);
    }

    const looseCannonKey = IMPORTED_PIXEL_ASSETS.deckCannonLoose.key;
    const cannonBallKey = IMPORTED_PIXEL_ASSETS.deckCannonBall.key;
    SHIP_DECK_OBSTACLE_LAYOUT.filter((entry) => entry.role === "cannon").forEach((entry, index) => {
      if (this.textures.exists(looseCannonKey)) {
        const looseX = entry.x < WORLD_WIDTH * 0.5 ? entry.x + 40 : entry.x - 40;
        const looseRotation = entry.x < WORLD_WIDTH * 0.5 ? 0 : Math.PI;
        this.add
          .image(looseX, entry.y + 18, looseCannonKey)
          .setDepth(decorDepth)
          .setScale(1.4)
          .setRotation(looseRotation);
      }
      if (this.textures.exists(cannonBallKey)) {
        const ballX = entry.x < WORLD_WIDTH * 0.5 ? entry.x + 54 : entry.x - 54;
        this.add
          .image(ballX, entry.y + (index % 2 === 0 ? -12 : 12), cannonBallKey)
          .setDepth(decorDepth + 0.05)
          .setScale(1.6);
      }
    });
  }

  initializeSeaWaves() {
    if (this.seaWaveGraphics) {
      this.seaWaveGraphics.destroy();
    }

    this.seaWaveGraphics = this.add.graphics();
    this.seaWaveGraphics.setDepth(-2);
    this.seaWaves = [];

    const waveCount = Phaser.Math.Between(SEA_WAVE_MIN, SEA_WAVE_MAX);
    for (let i = 0; i < waveCount; i += 1) {
      const topBand = i < Math.ceil(waveCount / 2);
      const minY = topBand ? 8 : WORLD_HEIGHT - DECK_SURFACE_INSET + 8;
      const maxY = topBand ? DECK_SURFACE_INSET - 8 : WORLD_HEIGHT - 8;
      this.seaWaves.push({
        baseY: Phaser.Math.Between(minY, maxY),
        length: Phaser.Math.Between(190, 360),
        amplitude: Phaser.Math.FloatBetween(3.5, 9.5),
        speed: Phaser.Math.FloatBetween(0.016, 0.03),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        alpha: Phaser.Math.FloatBetween(0.13, 0.24),
        thickness: Phaser.Math.Between(1, 2),
        color: 0x78b4e3
      });
    }
  }

  updateSeaWaves(timeMs) {
    if (!this.seaWaveGraphics || !Array.isArray(this.seaWaves) || this.seaWaves.length === 0) {
      return;
    }

    this.seaWaveGraphics.clear();
    this.seaWaves.forEach((wave) => {
      const segmentCount = 8;
      const lineStartX = ((timeMs * wave.speed + wave.phase * 80) % (WORLD_WIDTH + wave.length * 2)) - wave.length;
      const baseY = wave.baseY + Math.sin(timeMs * 0.0016 + wave.phase) * wave.amplitude;

      this.seaWaveGraphics.lineStyle(wave.thickness, wave.color, wave.alpha);
      this.seaWaveGraphics.beginPath();
      for (let i = 0; i <= segmentCount; i += 1) {
        const t = i / segmentCount;
        const x = lineStartX + wave.length * t;
        const y = baseY + Math.sin(timeMs * 0.0022 + wave.phase + t * 5.2) * wave.amplitude * 0.42;
        if (i === 0) {
          this.seaWaveGraphics.moveTo(x, y);
        } else {
          this.seaWaveGraphics.lineTo(x, y);
        }
      }
      this.seaWaveGraphics.strokePath();
    });
  }

  drawDeckRails() {
    const rail = this.add.graphics();
    rail.setDepth(1);

    const left = DECK_RAIL_INSET;
    const top = DECK_RAIL_INSET;
    const width = WORLD_WIDTH - DECK_RAIL_INSET * 2;
    const height = WORLD_HEIGHT - DECK_RAIL_INSET * 2;
    const right = left + width;
    const bottom = top + height;

    // Main rail body and highlight.
    rail.lineStyle(12, 0x503724, 0.95);
    rail.strokeRect(left, top, width, height);
    rail.lineStyle(4, 0x8e6340, 0.9);
    rail.strokeRect(left + 4, top + 4, width - 8, height - 8);

    // Post segments along port/starboard.
    rail.fillStyle(0x6d4b30, 1);
    for (let y = top + 30; y <= bottom - 30; y += DECK_RAIL_POST_GAP) {
      rail.fillRect(left - 2, y - DECK_RAIL_POST_LENGTH / 2, DECK_RAIL_POST_WIDTH, DECK_RAIL_POST_LENGTH);
      rail.fillRect(right - DECK_RAIL_POST_WIDTH + 2, y - DECK_RAIL_POST_LENGTH / 2, DECK_RAIL_POST_WIDTH, DECK_RAIL_POST_LENGTH);
    }

    // Post segments along bow/stern.
    for (let x = left + 34; x <= right - 34; x += DECK_RAIL_POST_GAP) {
      rail.fillRect(x - DECK_RAIL_POST_LENGTH / 2, top - 2, DECK_RAIL_POST_LENGTH, DECK_RAIL_POST_WIDTH);
      rail.fillRect(x - DECK_RAIL_POST_LENGTH / 2, bottom - DECK_RAIL_POST_WIDTH + 2, DECK_RAIL_POST_LENGTH, DECK_RAIL_POST_WIDTH);
    }
  }

  createTouchControls() {
    if (typeof document === "undefined") return;
    const hasTouch = Boolean(this.sys.game.device?.input?.touch)
      || ("ontouchstart" in window)
      || (navigator.maxTouchPoints > 0);
    this.touchControlsEnabled = hasTouch;
    this.updateHelpOverlayText();
    if (!hasTouch) return;

    const appRoot = document.getElementById("game-root") ?? document.getElementById("app") ?? document.body;
    const zIdx = "100";

    // --- DOM Joystick ---
    const joystickSize = TOUCH_JOYSTICK_RADIUS * 2;
    const thumbSize = 28;
    this._domJoystickBase = document.createElement("div");
    Object.assign(this._domJoystickBase.style, {
      position: "fixed", bottom: "64px", left: "64px",
      width: joystickSize + "px", height: joystickSize + "px",
      borderRadius: "50%",
      background: "rgba(17,48,83,0.62)",
      border: "2px solid rgba(127,184,255,0.85)",
      zIndex: zIdx,
      touchAction: "none"
    });
    this._domJoystickThumb = document.createElement("div");
    Object.assign(this._domJoystickThumb.style, {
      position: "absolute", top: "50%", left: "50%",
      width: thumbSize + "px", height: thumbSize + "px",
      marginTop: -(thumbSize / 2) + "px", marginLeft: -(thumbSize / 2) + "px",
      borderRadius: "50%",
      background: "rgba(142,216,255,0.6)",
      border: "2px solid rgba(198,236,255,0.9)",
      pointerEvents: "none"
    });
    this._domJoystickBase.appendChild(this._domJoystickThumb);
    appRoot.appendChild(this._domJoystickBase);

    // --- DOM Dash Button ---
    const dashSize = TOUCH_DASH_BUTTON_RADIUS * 2;
    this._domDashBtn = document.createElement("div");
    Object.assign(this._domDashBtn.style, {
      position: "fixed", bottom: "64px", right: "64px",
      width: dashSize + "px", height: dashSize + "px",
      borderRadius: "50%",
      background: "rgba(92,61,14,0.62)",
      border: "2px solid rgba(255,209,102,0.9)",
      zIndex: zIdx,
      display: "flex", alignItems: "center", justifyContent: "center",
      touchAction: "none"
    });
    const dashText = document.createElement("span");
    dashText.textContent = "闪";
    Object.assign(dashText.style, {
      fontFamily: "'ZpixOne', sans-serif",
      fontSize: "14px", color: "#ffe8a8",
      textShadow: "0 0 0 3px #2a1a04"
    });
    this._domDashBtn.appendChild(dashText);
    appRoot.appendChild(this._domDashBtn);
    this._domDashBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.touchDashQueued = true;
    });
    this._domDashBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.touchDashQueued = true;
    });

    // --- DOM Pause Button ---
    this._domPauseBtn = document.createElement("div");
    Object.assign(this._domPauseBtn.style, {
      position: "fixed", top: "98px", right: "8px",
      width: "52px", height: "28px",
      background: "rgba(59,89,152,0.9)",
      border: "2px solid rgba(212,175,55,1)",
      zIndex: zIdx,
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: "4px",
      touchAction: "none"
    });
    const pauseText = document.createElement("span");
    pauseText.textContent = "菜单";
    Object.assign(pauseText.style, {
      fontFamily: "'ZpixOne', sans-serif",
      fontSize: "11px", color: "#ffffff",
      textShadow: "0 0 0 2px #0a0a0a",
      fontWeight: "bold"
    });
    this._domPauseBtn.appendChild(pauseText);
    appRoot.appendChild(this._domPauseBtn);
    this._domPauseBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openPauseMenu();
    });
    this._domPauseBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openPauseMenu();
    });

    // --- Joystick touch handling ---
    const joystickRect = () => this._domJoystickBase.getBoundingClientRect();
    const joystickCenter = () => {
      const r = joystickRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    };
    this._domJoystickTouchId = null;

    const onJoystickStart = (e) => {
      e.preventDefault();
      if (this._domJoystickTouchId !== null) return;
      const touch = e.changedTouches[0];
      this._domJoystickTouchId = touch.identifier;
      const { cx, cy } = joystickCenter();
      this.touchJoystickCenter.set(cx, cy);
      const dx = touch.clientX - cx;
      const dy = touch.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, TOUCH_JOYSTICK_RADIUS);
      const nx = dist > 0.001 ? dx / dist : 0;
      const ny = dist > 0.001 ? dy / dist : 0;
      this.touchMoveVector.set(nx * (clamped / TOUCH_JOYSTICK_RADIUS), ny * (clamped / TOUCH_JOYSTICK_RADIUS));
      this._setJoystickThumbPos(nx * clamped, ny * clamped);
    };

    const onJoystickMove = (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this._domJoystickTouchId) {
          const touch = e.changedTouches[i];
          const { cx, cy } = joystickCenter();
          const dx = touch.clientX - cx;
          const dy = touch.clientY - cy;
          const dist = Math.hypot(dx, dy);
          const clamped = Math.min(dist, TOUCH_JOYSTICK_RADIUS);
          const nx = dist > 0.001 ? dx / dist : 0;
          const ny = dist > 0.001 ? dy / dist : 0;
          this.touchMoveVector.set(nx * (clamped / TOUCH_JOYSTICK_RADIUS), ny * (clamped / TOUCH_JOYSTICK_RADIUS));
          this._setJoystickThumbPos(nx * clamped, ny * clamped);
          break;
        }
      }
    };

    const onJoystickEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this._domJoystickTouchId) {
          this._domJoystickTouchId = null;
          this.touchMoveVector.set(0, 0);
          this._setJoystickThumbPos(0, 0);
          break;
        }
      }
    };

    this._domJoystickBase.addEventListener("touchstart", onJoystickStart, { passive: false });
    this._domJoystickBase.addEventListener("touchmove", onJoystickMove, { passive: false });
    this._domJoystickBase.addEventListener("touchend", onJoystickEnd);
    this._domJoystickBase.addEventListener("touchcancel", onJoystickEnd);

    // Save for teardown
    this._domJoystickHandlers = { onJoystickStart, onJoystickMove, onJoystickEnd };
  }

  _setJoystickThumbPos(offsetX, offsetY) {
    if (!this._domJoystickThumb) return;
    const half = TOUCH_JOYSTICK_RADIUS;
    this._domJoystickThumb.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  }

  registerSceneShutdownCleanup() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupTransientUiPools();
      this.teardownTouchControls();
      this.teardownDomHudOverlay();
      this.clearEvolutionSlowMoTimer();
    });
  }

  cleanupTransientUiPools() {
    if (Array.isArray(this.damageNumberPool)) {
      this.damageNumberPool.forEach((text) => {
        const tween = text?.getData?.("damageTween");
        if (tween) {
          tween.stop();
        }
        text?.setData?.("damageTween", null);
        text?.setVisible?.(false);
        text?.setActive?.(false);
      });
    }

    if (Array.isArray(this.hudAlertPool)) {
      this.hudAlertPool.forEach((text) => this.releaseHudAlertText(text));
    }

    if (Array.isArray(this.offscreenIndicatorPool)) {
      this.offscreenIndicatorPool.forEach((marker) => {
        marker?.setVisible?.(false);
        marker?.setActive?.(false);
      });
    }
  }

  clearEvolutionSlowMoTimer() {
    if (this.evolutionSlowMoRestoreHandle) {
      clearTimeout(this.evolutionSlowMoRestoreHandle);
      this.evolutionSlowMoRestoreHandle = null;
    }

    if (this.evolutionSlowMoActive) {
      if (this.time) {
        this.time.timeScale = 1;
      }
      if (this.tweens) {
        this.tweens.timeScale = 1;
      }
      if (this.physics?.world) {
        this.physics.world.timeScale = 1;
      }
      this.evolutionSlowMoActive = false;
    }
  }

  teardownTouchControls() {
    // Remove DOM joystick
    if (this._domJoystickBase) {
      if (this._domJoystickHandlers) {
        const h = this._domJoystickHandlers;
        this._domJoystickBase.removeEventListener("touchstart", h.onJoystickStart);
        this._domJoystickBase.removeEventListener("touchmove", h.onJoystickMove);
        this._domJoystickBase.removeEventListener("touchend", h.onJoystickEnd);
        this._domJoystickBase.removeEventListener("touchcancel", h.onJoystickEnd);
        this._domJoystickHandlers = null;
      }
      if (this._domJoystickBase.parentNode) this._domJoystickBase.parentNode.removeChild(this._domJoystickBase);
      this._domJoystickBase = null;
      this._domJoystickThumb = null;
    }
    // Remove DOM dash button
    if (this._domDashBtn) {
      if (this._domDashBtn.parentNode) this._domDashBtn.parentNode.removeChild(this._domDashBtn);
      this._domDashBtn = null;
    }
    // Remove DOM pause button
    if (this._domPauseBtn) {
      if (this._domPauseBtn.parentNode) this._domPauseBtn.parentNode.removeChild(this._domPauseBtn);
      this._domPauseBtn = null;
    }

    this._domJoystickTouchId = null;
    this.touchDashQueued = false;
    this.touchMoveVector.set(0, 0);
    this.touchMovePointerId = null;
  }

  updateHelpOverlayText() {
    if (typeof document === "undefined") {
      return;
    }
    const helpElement = document.getElementById("help");
    if (!helpElement) {
      return;
    }

    helpElement.textContent = this.touchControlsEnabled
      ? this.helpOverlayCompact
        ? "MOVE PAD · DASH BTN · R"
        : "Touch Move · Dash Button · R Restart"
      : this.helpOverlayCompact
        ? "WASD · SPACE · R"
        : "WASD Move · SPACE Dash · R";
  }

  updateHelpOverlayPresentation() {
    if (typeof document === "undefined") {
      return;
    }
    const helpElement = document.getElementById("help");
    if (!helpElement) {
      return;
    }

    const shouldCompact = !this.touchControlsEnabled && !this.isGameOver && this.runTimeMs >= 12000;
    if (shouldCompact === this.helpOverlayCompact) {
      return;
    }

    this.helpOverlayCompact = shouldCompact;
    helpElement.classList.toggle("is-compact", shouldCompact);
    helpElement.style.fontSize = shouldCompact ? "11px" : "";
    helpElement.style.letterSpacing = shouldCompact ? "0.04em" : "";
    helpElement.style.opacity = shouldCompact ? "0.18" : "";
    helpElement.style.padding = shouldCompact ? "5px 9px" : "";
    this.updateHelpOverlayText();
  }

  ensureDomHudOverlay() {
    if (typeof document === "undefined") {
      return;
    }
    if (this.domHudElement && document.body.contains(this.domHudElement)) {
      return;
    }
    const appRoot = document.getElementById("game-root") ?? document.getElementById("app") ?? document.body;
    const hud = document.createElement("div");
    hud.id = "hud-core";
    hud.className = "hud-core";
    hud.setAttribute("aria-live", "polite");
    hud.innerHTML = `
      <div class="hud-loadout" data-key="hud-loadout" aria-label="Equipped weapons">
        <div class="hud-loadout-row" data-key="hud-weapon-row"></div>
      </div>
      <div class="hud-boss-bar" data-key="boss-bar" style="display:none;">
        <span class="hud-boss-label">BOSS</span>
        <span class="hud-boss-bar-track"><span class="hud-boss-bar-fill" data-key="boss-hp-bar"></span></span>
        <span class="hud-boss-hp-text" data-key="boss-hp-text"></span>
      </div>
      <div class="hud-top">
        <div class="hud-run-strip" data-key="run-strip-track" aria-hidden="true">
          <span class="hud-run-strip-fill" data-key="run-strip-fill"></span>
          <span class="hud-run-strip-marker">BOSS</span>
        </div>
        <div class="hud-exp-track" data-key="exp-track">
          <div class="hud-exp-fill" data-key="exp-bar"></div>
          <span class="hud-exp-label"><span data-key="exp-level">LVL 1</span></span>
        </div>
        <div class="hud-stats-row">
          <div class="hud-stats-kills"><span>&#x1F480;</span><span data-key="kills">0</span></div>
          <div class="hud-stats-timer" data-key="time">00:00</div>
        </div>
      </div>
      <div class="hud-coins" data-key="coins-container">
        <span>&#x1FA99;</span><span data-key="coins">0</span>
      </div>
      <div class="hud-bottom">
        <div class="hud-hp-header">
          <span class="hud-hp-header-icon">&#x2764;</span>
          <span>VITALITY</span>
        </div>
        <div class="hud-hp-track">
          <div class="hud-hp-fill" data-key="hp-bar"></div>
          <span class="hud-hp-text" data-key="hp">100/100</span>
        </div>
      </div>
    `;
    appRoot.appendChild(hud);
    this.domHudElement = hud;
    this.domHudRefs = {
      hpText: hud.querySelector('[data-key="hp"]'),
      timeText: hud.querySelector('[data-key="time"]'),
      loadout: hud.querySelector('[data-key="hud-loadout"]'),
      weaponRow: hud.querySelector('[data-key="hud-weapon-row"]'),
      runStripTrack: hud.querySelector('[data-key="run-strip-track"]'),
      runStripFill: hud.querySelector('[data-key="run-strip-fill"]'),
      killsText: hud.querySelector('[data-key="kills"]'),
      coinsText: hud.querySelector('[data-key="coins"]'),
      coinsContainer: hud.querySelector('[data-key="coins-container"]'),
      expLevel: hud.querySelector('[data-key="exp-level"]'),
      hpBar: hud.querySelector('[data-key="hp-bar"]'),
      expBar: hud.querySelector('[data-key="exp-bar"]'),
      bossBar: hud.querySelector('[data-key="boss-bar"]'),
      bossHpBar: hud.querySelector('[data-key="boss-hp-bar"]'),
      bossHpText: hud.querySelector('[data-key="boss-hp-text"]'),
      hudTop: hud.querySelector('.hud-top'),
      hudBottom: hud.querySelector('.hud-bottom'),
      hudCoins: hud.querySelector('.hud-coins')
    };
    const loadout = this.domHudRefs.loadout;
    const weaponRow = this.domHudRefs.weaponRow;
    const weaponSlotCount = Math.max(1, this.player?.maxWeaponSlots ?? 3);
    this.domHudWeaponSlots = [];
    if (weaponRow) {
      for (let i = 0; i < weaponSlotCount; i += 1) {
        const slot = document.createElement("div");
        slot.className = "hud-weapon-slot";
        Object.assign(slot.style, {
          width: "48px",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          border: "4px solid #374151"
        });
        const icon = document.createElement("img");
        icon.alt = "";
        icon.decoding = "async";
        icon.src = this.getWeaponIconPath("dagger");
        Object.assign(icon.style, {
          width: "24px",
          height: "24px",
          imageRendering: "pixelated",
          opacity: "0.16",
          filter: "grayscale(0.7)"
        });
        const levelBadge = document.createElement("span");
        levelBadge.textContent = "";
        Object.assign(levelBadge.style, {
          position: "absolute",
          bottom: "-2px",
          right: "-2px",
          background: "#2563eb",
          color: "#ffffff",
          fontSize: "8px",
          fontWeight: "700",
          padding: "0 3px",
          border: "1px solid #ffffff",
          lineHeight: "14px",
          display: "none"
        });
        slot.style.position = "relative";
        slot.appendChild(icon);
        slot.appendChild(levelBadge);
        weaponRow.appendChild(slot);
        this.domHudWeaponSlots.push({ slot, icon, levelBadge });
      }
    }
  }

  _applyMobileHudAdjustments() {
    if (!this.touchControlsEnabled || !this.domHudElement) return;
    const hud = this.domHudElement;
    const bottom = hud.querySelector(".hud-bottom");
    if (bottom) {
      bottom.style.bottom = "8px";
    }
    const hpTrack = hud.querySelector(".hud-hp-track");
    if (hpTrack) {
      hpTrack.style.width = "200px";
      hpTrack.style.height = "14px";
    }
    const loadout = this.domHudRefs?.loadout;
    if (loadout) {
      loadout.style.left = "10px";
      loadout.style.top = "10px";
    }
    this.domHudWeaponSlots?.forEach(({ slot }) => {
      slot.style.width = "38px";
      slot.style.height = "38px";
    });
  }

  setDomHudVisible(isVisible) {
    if (!this.domHudElement) {
      return;
    }
    this.domHudElement.style.display = isVisible ? "block" : "none";
  }

  setDomTouchControlsVisible(isVisible) {
    const v = isVisible ? "" : "none";
    if (this._domJoystickBase) this._domJoystickBase.style.display = v;
    if (this._domDashBtn) this._domDashBtn.style.display = v;
    if (this._domPauseBtn) this._domPauseBtn.style.display = v;
  }

  teardownDomHudOverlay() {
    if (this.domHudElement?.parentNode) {
      this.domHudElement.parentNode.removeChild(this.domHudElement);
    }
    this.domHudElement = null;
    this.domHudRefs = null;
    this.domHudWeaponSlots = [];
  }

  updateDomHudOverlay(levelValue, xpPercent, elapsedMs, xpRatio) {
    if (!this.domHudElement || !this.player || !this.domHudRefs) {
      return;
    }
    const hpText = this.domHudRefs.hpText;
    const timeText = this.domHudRefs.timeText;
    const killsText = this.domHudRefs.killsText;
    const coinsText = this.domHudRefs.coinsText;
    const expLevel = this.domHudRefs.expLevel;
    const hpBar = this.domHudRefs.hpBar;
    const expBar = this.domHudRefs.expBar;
    const loadout = this.domHudRefs.loadout;
    const runStripTrack = this.domHudRefs.runStripTrack;
    const runStripFill = this.domHudRefs.runStripFill;
    const formatInt = (value) => Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("en-US");
    const hpRatio = this.player.maxHp > 0 ? Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1) : 0;
    const bossCycleMs = Math.max(1, DIRECTOR_BOSS_SPAWN.intervalMs || 180000);
    const bossCycleProgress = Phaser.Math.Clamp((elapsedMs % bossCycleMs) / bossCycleMs, 0, 1);
    const directorState = this.director?.getState?.() ?? DIRECTOR_STATE.BUILD;
    if (hpText) {
      hpText.textContent = `${Math.floor(this.player.hp)}/${this.player.maxHp}`;
    }
    if (expLevel) {
      expLevel.textContent = `LVL ${levelValue}`;
    }
    if (timeText) {
      timeText.textContent = this.formatRunTime(elapsedMs);
    }
    if (killsText) {
      killsText.textContent = formatInt(this.totalKills);
    }
    if (coinsText) {
      coinsText.textContent = formatInt(this.runMetaCurrency);
    }
    if (hpBar) {
      hpBar.style.width = `${Math.round(hpRatio * 100)}%`;
    }
    if (expBar) {
      expBar.style.width = `${Math.round(Phaser.Math.Clamp(xpRatio, 0, 1) * 100)}%`;
    }
    if (loadout) {
      loadout.style.opacity = this.isLeveling || this.isWeaponSelecting ? "0.42" : "1";
    }
    if (runStripTrack) {
      runStripTrack.style.opacity = this.isLeveling || this.isWeaponSelecting ? "0.38" : "1";
    }
    if (runStripFill) {
      runStripFill.style.width = `${Math.round(bossCycleProgress * 100)}%`;
      if (directorState === DIRECTOR_STATE.PEAK) {
        runStripFill.style.background = "linear-gradient(90deg, rgba(206, 82, 49, 0.92) 0%, rgba(255, 128, 82, 1) 100%)";
      } else if (directorState === DIRECTOR_STATE.RELIEF) {
        runStripFill.style.background = "linear-gradient(90deg, rgba(148, 124, 92, 0.72) 0%, rgba(198, 171, 132, 0.9) 100%)";
      } else {
        runStripFill.style.background = "linear-gradient(90deg, rgba(210, 141, 73, 0.78) 0%, rgba(234, 181, 89, 0.96) 100%)";
      }
    }
    const equippedWeapons = this.player?.weapons ?? [];
    if (Array.isArray(this.domHudWeaponSlots)) {
      this.domHudWeaponSlots.forEach(({ slot, icon, levelBadge }, index) => {
        const weapon = equippedWeapons[index];
        if (!slot || !icon) return;
        if (!weapon) {
          slot.style.opacity = "0.5";
          slot.style.borderColor = "#1f2937";
          slot.style.background = "#0a0a0a";
          icon.src = this.getWeaponIconPath("dagger");
          icon.style.opacity = "0.16";
          icon.style.filter = "grayscale(0.7)";
          if (levelBadge) levelBadge.style.display = "none";
          return;
        }
        const weaponType = weapon.type ?? weapon.baseType ?? "dagger";
        slot.style.opacity = "1";
        slot.style.borderColor = "#6b7280";
        slot.style.background = "#111111";
        icon.src = this.getWeaponIconPath(weaponType);
        icon.style.opacity = "1";
        icon.style.filter = "none";
        if (levelBadge) {
          const wLevel = weapon.level ?? 1;
          if (wLevel > 1) {
            levelBadge.textContent = `Lv${wLevel}`;
            levelBadge.style.display = "block";
          } else {
            levelBadge.style.display = "none";
          }
        }
      });
    }
    this.domHudElement.classList.toggle("modal-open", this.isLeveling || this.isWeaponSelecting);
  }

  applyHudModalFocus(isModalOpen) {
    const hudAlpha = isModalOpen ? 0.34 : 1;
    const panelAlpha = isModalOpen ? 0.2 : 1;
    [
      this.hudLevelText,
      this.hudStatsText,
      this.hudTimerText,
      this.hudGoldText,
      this.hudXpLabelText,
      this.hudCoreLabelText,
      this.hudXpFrame
    ]
      .filter(Boolean)
      .forEach((obj) => obj.setAlpha(hudAlpha));
    [this.hudPanelBack].filter(Boolean).forEach((obj) => obj.setAlpha(panelAlpha));
    [this.hudBarsGraphics].filter(Boolean).forEach((obj) => obj.setAlpha(hudAlpha));
    [...(this.hudWeaponSlotFrames ?? []), ...(this.hudWeaponSlotLabels ?? [])]
      .filter(Boolean)
      .forEach((obj) => obj.setAlpha(hudAlpha));
    [...(this.hudObjects ?? [])].filter(Boolean).forEach((obj) => obj.setAlpha(hudAlpha));
    this.hud?.setAlpha(hudAlpha);
    this.dashCooldownRingGraphics?.setAlpha(isModalOpen ? 0.2 : 1);
    this.enemyHealthBarsGraphics?.setAlpha(isModalOpen ? 0.25 : 1);
    this.offscreenIndicatorGraphics?.setAlpha(isModalOpen ? 0.08 : 1);
    this.modalBackdrop?.setVisible(isModalOpen);

    if (typeof document !== "undefined") {
      document.getElementById("help")?.classList.toggle("modal-open", isModalOpen);
    }
    this.domHudElement?.classList.toggle("modal-open", isModalOpen);
  }

  updatePlayerReadabilityAura() {
    if (!this.playerReadabilityGraphics) {
      return;
    }

    this.playerReadabilityGraphics.clear();
    if (!this.player?.active) {
      return;
    }

    const x = this.player.x;
    const y = this.player.y + 2;
    this.playerReadabilityGraphics.fillStyle(0x08111d, 0.22);
    this.playerReadabilityGraphics.fillEllipse(x, y + 8, 42, 18);
    this.playerReadabilityGraphics.lineStyle(2, 0xe7e1c4, 0.16);
    this.playerReadabilityGraphics.strokeCircle(x, y, 19);
  }

  getTouchMoveInput() {
    if (!this.touchControlsEnabled) {
      return null;
    }
    return this.touchMoveVector;
  }

  consumeTouchDash() {
    if (!this.touchDashQueued) {
      return false;
    }
    this.touchDashQueued = false;
    return true;
  }

  createTerrainObstacles() {
    if (!this.obstacles) {
      return;
    }

    this.terrainObstacleAnchors = [];
    SHIP_DECK_OBSTACLE_LAYOUT.forEach((entry) => this.spawnTerrainObstacle(entry));
    this.spawnRandomDeckObstacles();
    this.ensureNavigableDeckPassages();
  }

  spawnRandomDeckObstacles() {
    const deckLeft = DECK_SURFACE_INSET;
    const deckTop = DECK_SURFACE_INSET;
    const deckWidth = WORLD_WIDTH - DECK_SURFACE_INSET * 2;
    const deckHeight = WORLD_HEIGHT - DECK_SURFACE_INSET * 2;
    const deckRight = deckLeft + deckWidth;
    const deckBottom = deckTop + deckHeight;

    const logicalCols = Math.max(1, Math.floor(deckWidth / RANDOM_DECK_OBSTACLE_TILE_GROUP_SIZE));
    const logicalRows = Math.max(1, Math.floor(deckHeight / RANDOM_DECK_OBSTACLE_TILE_GROUP_SIZE));
    const logicalTileCount = logicalCols * logicalRows;
    const densityDivisor = Phaser.Math.Between(RANDOM_DECK_OBSTACLE_DENSITY_MIN_TILES, RANDOM_DECK_OBSTACLE_DENSITY_MAX_TILES);
    const targetSpawnCount = Math.max(1, Math.floor(logicalTileCount / densityDivisor));
    const maxAttempts = targetSpawnCount * RANDOM_DECK_OBSTACLE_MAX_ATTEMPTS_MULTIPLIER;

    const playerStartX = WORLD_WIDTH * 0.5;
    const playerStartY = WORLD_HEIGHT * 0.5;
    const hatchClearRadius = RANDOM_DECK_OBSTACLE_EVENT_CLEAR_RADIUS;
    let spawned = 0;

    for (let attempt = 0; attempt < maxAttempts && spawned < targetSpawnCount; attempt += 1) {
      const x = Phaser.Math.Between(deckLeft + RANDOM_DECK_OBSTACLE_MIN_PADDING, deckRight - RANDOM_DECK_OBSTACLE_MIN_PADDING);
      const y = Phaser.Math.Between(deckTop + RANDOM_DECK_OBSTACLE_MIN_PADDING, deckBottom - RANDOM_DECK_OBSTACLE_MIN_PADDING);

      if (Phaser.Math.Distance.Between(playerStartX, playerStartY, x, y) <= this.safeRadius) {
        continue;
      }

      if (Phaser.Math.Distance.Between(HATCH_BREACH_POINT.x, HATCH_BREACH_POINT.y, x, y) <= hatchClearRadius) {
        continue;
      }

      const minEdgeDistance = Math.min(x - deckLeft, deckRight - x, y - deckTop, deckBottom - y);
      if (minEdgeDistance <= RANDOM_DECK_OBSTACLE_EDGE_SPAWN_BUFFER) {
        continue;
      }

      if (this.isObstacleBlockedAt(x, y, RANDOM_DECK_OBSTACLE_MIN_PADDING)) {
        continue;
      }

      const spec = pickWeightedRandomObstacleSpec(RANDOM_DECK_OBSTACLE_SPAWN_TABLE);
      const scale = Phaser.Math.FloatBetween(spec.scaleMin, spec.scaleMax);
      const obstacle = this.spawnTerrainObstacle({
        type: spec.type,
        role: spec.objectType,
        textureKey: spec.textureKey,
        x,
        y,
        scale,
        anchorRadius: spec.anchorRadius,
        tint: spec.tint
      });

      if (!obstacle) {
        continue;
      }

      spawned += 1;
    }
  }

  spawnTerrainObstacle(config = {}) {
    if (!this.obstacles) {
      return null;
    }

    const obstacleType = config.type === "terrain_pillar" ? "terrain_pillar" : "terrain_rock";
    const role = config.role ?? "misc";
    let textureKey = config.textureKey ?? obstacleType;
    if (!config.textureKey) {
      if (role === "mast") {
        textureKey = "terrain_mast";
      } else if (role === "crate") {
        textureKey = "terrain_crate";
      } else if (role === "cannon") {
        textureKey = this.textures.exists(IMPORTED_PIXEL_ASSETS.cannon.key)
          ? IMPORTED_PIXEL_ASSETS.cannon.key
          : "terrain_cannon";
      }
    }
    const x = Phaser.Math.Clamp(Number(config.x) || WORLD_WIDTH * 0.5, 12, WORLD_WIDTH - 12);
    const y = Phaser.Math.Clamp(Number(config.y) || WORLD_HEIGHT * 0.5, 12, WORLD_HEIGHT - 12);
    const scale = Phaser.Math.Clamp(Number(config.scale) || 1, 0.5, 1.9);

    const obstacle = this.obstacles.create(x, y, textureKey);
    if (!obstacle) {
      return null;
    }

    obstacle.setScale(scale);
    obstacle.setDepth(2);
    obstacle.setData("obstacleRole", role);
    if (Number.isFinite(config.tint)) {
      obstacle.setTint(config.tint);
    }
    obstacle.refreshBody();

    let anchorRadius = obstacleType === "terrain_rock" ? 36 : 40;
    if (role === "mast") {
      anchorRadius = 42;
    } else if (role === "crate") {
      anchorRadius = 34;
    } else if (role === "cannon") {
      anchorRadius = 32;
    }
    if (Number.isFinite(config.anchorRadius)) {
      anchorRadius = config.anchorRadius;
    }
    this.terrainObstacleAnchors.push({
      x,
      y,
      radius: anchorRadius * scale,
      obstacle,
      role
    });
    return obstacle;
  }

  resolveDevAntiJamEnabled() {
    if (typeof window === "undefined") {
      return false;
    }
    try {
      const params = new URLSearchParams(window.location?.search ?? "");
      if (params.get("dev_jam") === "1") {
        return true;
      }
    } catch (_error) {
      // Ignore URL parsing failures.
    }
    return Boolean(window.__DEV__);
  }

  getDeckPassageOpenDirectionCount() {
    const centerX = WORLD_WIDTH * 0.5;
    const centerY = WORLD_HEIGHT * 0.5;
    const directions = [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 }
    ];
    let openDirections = 0;

    directions.forEach((dir) => {
      let clearSamples = 0;
      DECK_PASSAGE_SAMPLE_DISTANCES.forEach((distance) => {
        const sampleX = centerX + dir.x * distance;
        const sampleY = centerY + dir.y * distance;
        if (!this.isObstacleBlockedAt(sampleX, sampleY, 24)) {
          clearSamples += 1;
        }
      });
      if (clearSamples >= 2) {
        openDirections += 1;
      }
    });

    return openDirections;
  }

  canRepositionObstacleAnchor(anchor, nextX, nextY) {
    if (!anchor) {
      return false;
    }

    if (nextX < 12 || nextX > WORLD_WIDTH - 12 || nextY < 12 || nextY > WORLD_HEIGHT - 12) {
      return false;
    }
    const distFromCenter = Phaser.Math.Distance.Between(WORLD_WIDTH * 0.5, WORLD_HEIGHT * 0.5, nextX, nextY);
    if (distFromCenter < 120) {
      return false;
    }

    return this.terrainObstacleAnchors.every((other) => {
      if (other === anchor) {
        return true;
      }
      const gap = Phaser.Math.Distance.Between(other.x, other.y, nextX, nextY);
      return gap >= other.radius + anchor.radius + 20;
    });
  }

  ensureNavigableDeckPassages() {
    if (!Array.isArray(this.terrainObstacleAnchors) || this.terrainObstacleAnchors.length === 0) {
      return;
    }

    const movableAnchors = this.terrainObstacleAnchors.filter((anchor) => anchor.role === "crate" && anchor.obstacle?.active);
    if (movableAnchors.length === 0) {
      return;
    }

    let openDirectionCount = this.getDeckPassageOpenDirectionCount();
    if (openDirectionCount >= DECK_PASSAGE_MIN_OPEN_DIRECTIONS) {
      return;
    }

    for (let i = 0; i < DECK_PASSAGE_REPAIR_MAX_STEPS; i += 1) {
      const anchor = Phaser.Utils.Array.GetRandom(movableAnchors);
      const nextX = Phaser.Math.Clamp(anchor.x + Phaser.Math.Between(-DECK_PASSAGE_REPAIR_NUDGE, DECK_PASSAGE_REPAIR_NUDGE), 16, WORLD_WIDTH - 16);
      const nextY = Phaser.Math.Clamp(anchor.y + Phaser.Math.Between(-DECK_PASSAGE_REPAIR_NUDGE, DECK_PASSAGE_REPAIR_NUDGE), 16, WORLD_HEIGHT - 16);
      if (!this.canRepositionObstacleAnchor(anchor, nextX, nextY)) {
        continue;
      }

      anchor.x = nextX;
      anchor.y = nextY;
      if (anchor.obstacle) {
        anchor.obstacle.setPosition(nextX, nextY);
        anchor.obstacle.refreshBody();
      }

      openDirectionCount = this.getDeckPassageOpenDirectionCount();
      if (openDirectionCount >= DECK_PASSAGE_MIN_OPEN_DIRECTIONS) {
        return;
      }
    }
  }

  _getNearestPlayerForEnemy(enemy) {
    let nearest = this.player;
    let nearestDist = Phaser.Math.Distance.Between(enemy.x, enemy.y, nearest.x, nearest.y);
    if (this.playerSync) {
      for (const rp of this.playerSync.getAllRemotePlayers()) {
        if (rp.isDead || rp.disconnected) continue;
        const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, rp.sprite.x, rp.sprite.y);
        if (dist < nearestDist) { nearestDist = dist; nearest = rp.sprite; }
      }
    }
    return nearest;
  }

  applyEnemyAntiJam(enemy, nowMs) {
    if (!this.devAntiJamEnabled || !enemy?.active || !enemy?.body) {
      return;
    }

    if (enemy.getData("isBoss")) {
      return;
    }

    const lastX = enemy.getData("jamLastX");
    const lastY = enemy.getData("jamLastY");
    if (lastX === undefined || lastY === undefined) {
      enemy.setData("jamLastX", enemy.x);
      enemy.setData("jamLastY", enemy.y);
      enemy.setData("jamLastMoveAtMs", nowMs);
      return;
    }

    const distanceMoved = Phaser.Math.Distance.Between(lastX, lastY, enemy.x, enemy.y);
    const desiredSpeed = Math.hypot(enemy.body.velocity.x, enemy.body.velocity.y);
    const lastMoveAtMs = enemy.getData("jamLastMoveAtMs") ?? nowMs;
    if (distanceMoved > ENEMY_JAM_MIN_PROGRESS_PX) {
      enemy.setData("jamLastMoveAtMs", nowMs);
    } else {
      const stuckDuration = nowMs - lastMoveAtMs;
      if (desiredSpeed > Math.max(40, enemy.speed * 0.35) && stuckDuration >= ENEMY_JAM_STUCK_WINDOW_MS) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const sourceX = enemy.x - Math.cos(angle) * 18;
        const sourceY = enemy.y - Math.sin(angle) * 18;
        if (typeof enemy.applyKnockbackFrom === "function") {
          enemy.applyKnockbackFrom(sourceX, sourceY, ENEMY_JAM_PUSH_FORCE);
        }
        enemy.setData("jamLastMoveAtMs", nowMs);
      }
    }

    enemy.setData("jamLastX", enemy.x);
    enemy.setData("jamLastY", enemy.y);
  }

  getTargetEnemyCount(seconds) {
    for (let i = 0; i < TARGET_ENEMY_CURVE.length; i += 1) {
      const segment = TARGET_ENEMY_CURVE[i];
      if (seconds < segment.endSec) {
        const duration = Math.max(1, segment.endSec - segment.startSec);
        const progress = (seconds - segment.startSec) / duration;
        return Phaser.Math.Linear(segment.from, segment.to, progress);
      }
    }

    const lastSegmentEndSec = TARGET_ENEMY_CURVE[TARGET_ENEMY_CURVE.length - 1]?.endSec ?? 0;
    const elapsedPostWaveSec = Math.max(0, seconds - lastSegmentEndSec);
    const postWaveCount = Math.floor(elapsedPostWaveSec / TARGET_ENEMY_WAVE_DURATION_SEC) + 1;
    return TARGET_ENEMY_FALLBACK + postWaveCount * TARGET_ENEMY_WAVE_INCREMENT;
  }

  getSpawnBurst(seconds, deficit) {
    let burst = SPAWN_BURST_CONFIG.defaultBurst;
    for (let i = 0; i < SPAWN_BURST_CONFIG.steps.length; i += 1) {
      if (seconds >= SPAWN_BURST_CONFIG.steps[i].atSec) {
        burst = SPAWN_BURST_CONFIG.steps[i].burst;
      }
    }
    return Math.min(deficit, burst);
  }

  getEffectiveSpawnRateMultiplier() {
    return this.director.getSpawnRateMultiplier();
  }

  getEffectiveEnemySpeedMultiplier() {
    return this.director.getEnemySpeedMultiplier();
  }

  maintainEnemyDensity() {
    if (this.isGameOver || this.isLeveling || this.isWeaponSelecting) {
      return;
    }

    const seconds = this.runTimeMs / 1000;
    const pacingTargetScale = Math.max(0.5, Number(this.spawnPacingPreset?.targetCountScale) || 1);
    const baseTarget = this.getTargetEnemyCount(seconds) * pacingTargetScale;
    const spawnRateMultiplier = this.getEffectiveSpawnRateMultiplier();
    const scaledTarget = baseTarget * spawnRateMultiplier;
    const performance = this.getPerformanceMetrics();
    const adaptiveOffset = this.director.getAdaptiveTargetOffset(scaledTarget, performance.dps, performance.killRate);
    this.targetEnemies = Math.min(PERFORMANCE_MAX_ACTIVE_ENEMIES, Math.round(scaledTarget + adaptiveOffset));

    const aliveEnemies = this.getAliveEnemyCount();
    if (aliveEnemies >= this.targetEnemies) {
      return;
    }

    const deficit = this.targetEnemies - aliveEnemies;
    const spawnCount = this.getSpawnBurst(seconds, deficit);
    for (let i = 0; i < spawnCount; i += 1) {
      this.spawnEnemyFromEdge();
    }
  }

  spawnEnemyFromEdge(preferredLane = null) {
    if (this.isGameOver || this.isLeveling || this.isWeaponSelecting) {
      return;
    }
    if (this.getAliveEnemyCount() >= PERFORMANCE_MAX_ACTIVE_ENEMIES) {
      return;
    }

    const type = this.pickEnemyArchetype();
    const hpMultiplier = this.director.getEnemyHpMultiplier();
    const baseHp = ENEMY_ARCHETYPE_CONFIGS[type]?.hp ?? ENEMY_ARCHETYPE_CONFIGS.chaser.hp;
    const scaledHp = Math.max(1, Math.round(baseHp * hpMultiplier));
    const groupCount = type === "swarm" ? Phaser.Math.Between(3, 5) : 1;
    const lane = this.director?.chooseSpawnLane?.(preferredLane) ?? null;
    const anchor = this.getSpawnPosition(lane);

    for (let i = 0; i < groupCount; i += 1) {
      if (this.getAliveEnemyCount() >= PERFORMANCE_MAX_ACTIVE_ENEMIES) {
        break;
      }
      const jitter = type === "swarm" ? Phaser.Math.Between(12, 48) : 0;
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      let spawnX = Phaser.Math.Clamp(anchor.x + Math.cos(angle) * jitter, 12, WORLD_WIDTH - 12);
      let spawnY = Phaser.Math.Clamp(anchor.y + Math.sin(angle) * jitter, 12, WORLD_HEIGHT - 12);

      if (!this.isValidSpawnPoint(spawnX, spawnY)) {
        const fallback = this.getSpawnPosition(lane);
        spawnX = fallback.x;
        spawnY = fallback.y;
      }
      if (!this.isValidSpawnPoint(spawnX, spawnY)) {
        continue;
      }

      const enemy = this.spawnEnemyAtPosition(type, spawnX, spawnY, lane);
      if (!enemy) {
        continue;
      }
    }
  }

  getParticleLoadScale() {
    const aliveEnemies = this.getAliveEnemyCount();
    if (aliveEnemies <= PARTICLE_LOAD_SOFT_CAP_ENEMIES) {
      return 1;
    }

    const pressure = Phaser.Math.Clamp(
      (aliveEnemies - PARTICLE_LOAD_SOFT_CAP_ENEMIES) / (PARTICLE_LOAD_HARD_CAP_ENEMIES - PARTICLE_LOAD_SOFT_CAP_ENEMIES),
      0,
      1
    );
    return Phaser.Math.Linear(1, MIN_PARTICLE_LOAD_SCALE, pressure);
  }

  getScaledParticleCount(baseCount, minCount = 1, maxCount = baseCount) {
    const scaled = Math.round(baseCount * this.getParticleLoadScale());
    return Phaser.Math.Clamp(scaled, minCount, maxCount);
  }

  processDirectorBossSpawns() {
    const pendingBossSpawns = this.director.consumeBossSpawnRequests();
    for (let i = 0; i < pendingBossSpawns; i += 1) {
      this.spawnBossEnemy();
    }
  }

  processDirectorMiniBossSpawns() {
    if (this.hasActiveMiniBoss()) {
      return;
    }
    const pendingMiniBossSpawns = this.director.consumeMiniBossSpawnRequests();
    for (let i = 0; i < Math.min(1, pendingMiniBossSpawns); i += 1) {
      this.spawnMiniBossEnemy();
    }
  }

  processDirectorSpawnBursts() {
    const pendingBurstSpawns = this.director.consumeSpawnBurstRequests();
    for (let i = 0; i < pendingBurstSpawns; i += 1) {
      this.spawnEnemyFromEdge();
    }
  }

  processDirectorLadderSpawns() {
    const pendingLadderSpawns = this.director.consumeLadderSpawnRequests();
    if (pendingLadderSpawns <= 0) {
      return;
    }
    this.logSpawnEventPressure("LADDER", pendingLadderSpawns);

    for (let i = 0; i < pendingLadderSpawns; i += 1) {
      const lane = this.director.chooseLadderLane();
      this.spawnEnemyFromEventPoint(lane, this.getLadderSpawnPoint(lane), "ladder");
    }
  }

  processDirectorHatchBreaches() {
    const pendingHatchSpawns = this.director.consumeHatchBreachSpawnRequests();
    if (pendingHatchSpawns <= 0) {
      return;
    }
    this.logSpawnEventPressure("HATCH", pendingHatchSpawns);

    this.showHudAlert("HATCH BREACH", 1000);
    for (let i = 0; i < pendingHatchSpawns; i += 1) {
      this.spawnEnemyFromEventPoint(SPAWN_LANES.STERN, HATCH_BREACH_POINT, "hatch");
    }
  }

  logSpawnEventPressure(eventType, requestedCount) {
    if (!this.debugOverlayEnabled) {
      return;
    }
    const alive = this.getAliveEnemyCount();
    const target = this.targetEnemies;
    const runTime = this.formatRunTime(this.runTimeMs);
    console.info(`[SpawnEvent] t=${runTime} type=${eventType} requested=${requestedCount} alive=${alive} target=${target}`);
  }

  getLadderSpawnPoint(lane) {
    const candidates = LADDER_SPAWN_POINTS[lane] ?? LADDER_SPAWN_POINTS[SPAWN_LANES.PORT];
    return Phaser.Utils.Array.GetRandom(candidates);
  }

  isObstacleBlockedAt(x, y, padding = 18) {
    return this.terrainObstacleAnchors.some((anchor) => {
      const distance = Phaser.Math.Distance.Between(anchor.x, anchor.y, x, y);
      return distance < anchor.radius + padding;
    });
  }

  isValidEventSpawnPoint(x, y) {
    const inBounds = x >= 12 && x <= WORLD_WIDTH - 12 && y >= 12 && y <= WORLD_HEIGHT - 12;
    if (!inBounds) {
      return false;
    }
    const isOutsideSafeRadius = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) > this.safeRadius;
    if (!isOutsideSafeRadius) {
      return false;
    }
    return !this.isObstacleBlockedAt(x, y, 20);
  }

  spawnEnemyFromEventPoint(lane, anchor, eventType = "ladder") {
    if (!anchor || this.getAliveEnemyCount() >= PERFORMANCE_MAX_ACTIVE_ENEMIES) {
      return null;
    }

    const type = this.pickEnemyArchetype();
    const spreadMin = eventType === "hatch" ? 28 : 16;
    const spreadMax = eventType === "hatch" ? 86 : 52;
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(spreadMin, spreadMax);
      const x = Phaser.Math.Clamp(anchor.x + Math.cos(angle) * distance, 12, WORLD_WIDTH - 12);
      const y = Phaser.Math.Clamp(anchor.y + Math.sin(angle) * distance, 12, WORLD_HEIGHT - 12);
      if (!this.isValidEventSpawnPoint(x, y)) {
        continue;
      }
      return this.spawnEnemyAtPosition(type, x, y, lane);
    }

    const fallback = this.getSpawnPosition(lane);
    if (!this.isValidSpawnPoint(fallback.x, fallback.y)) {
      return null;
    }
    return this.spawnEnemyAtPosition(type, fallback.x, fallback.y, lane);
  }

  spawnEnemyAtPosition(type, x, y, lane = null) {
    if (this.getAliveEnemyCount() >= PERFORMANCE_MAX_ACTIVE_ENEMIES) {
      return null;
    }
    const hpMultiplier = this.director.getEnemyHpMultiplier();
    const baseHp = ENEMY_ARCHETYPE_CONFIGS[type]?.hp ?? ENEMY_ARCHETYPE_CONFIGS.chaser.hp;
    const scaledHp = Math.max(1, Math.round(baseHp * hpMultiplier));
    const enemy = this.enemyPool.acquire(type, { x, y, hp: scaledHp });
    if (!enemy) {
      return null;
    }

    enemy.setData("lastDashHitId", -1);
    enemy.setData("archetype", type);
    enemy.setData("spawnLane", lane);
    enemy.serverId = `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const eliteChance = this.director.getEliteChance();
    const isElite = type !== "swarm" && Math.random() < eliteChance;
    enemy.setData("isElite", isElite);
    enemy.setData("eliteType", null);
    if (isElite) {
      const eliteType = this.pickEliteType();
      enemy.setData("eliteType", eliteType);
      enemy.setElite(eliteType);
    }

    return enemy;
  }

  getOppositeBossEntryLane(lane) {
    if (lane === SPAWN_LANES.BOW) {
      return SPAWN_LANES.STERN;
    }
    return SPAWN_LANES.BOW;
  }

  getBossEntrySpawn(preferredLane = null) {
    const safePreferredLane = BOSS_ENTRY_LANES.includes(preferredLane) ? preferredLane : Phaser.Utils.Array.GetRandom(BOSS_ENTRY_LANES);
    const fallbackLane = this.getOppositeBossEntryLane(safePreferredLane);
    const primary = this.getSpawnPosition(safePreferredLane);
    if (this.isValidSpawnPoint(primary.x, primary.y)) {
      return { lane: safePreferredLane, position: primary };
    }

    const fallback = this.getSpawnPosition(fallbackLane);
    return {
      lane: fallbackLane,
      position: fallback
    };
  }

  spawnBossEnemy(preferredLane = null) {
    const spawn = this.getBossEntrySpawn(preferredLane);
    const lane = spawn.lane;
    const spawnPosition = spawn.position;
    const boss = new BossEnemy(this, spawnPosition.x, spawnPosition.y);
    const hpMultiplier = this.director.getEnemyHpMultiplier();
    boss.hp = Math.max(1, Math.round(boss.hp * hpMultiplier));
    boss.maxHp = boss.hp;
    boss.setData("lastDashHitId", -1);
    boss.setData("archetype", "boss");
    boss.setData("spawnLane", lane);
    this.enemies.add(boss);

    this.shakeScreen(210, 0.0048);
    this.playSfx("boss_warning");
    this.showWarningBanner("BOSS INCOMING", {
      tone: "boss",
      durationMs: 1500
    });
  }

  spawnMiniBossEnemy(preferredLane = null) {
    const spawn = this.getBossEntrySpawn(preferredLane);
    const lane = spawn.lane;
    const spawnPosition = spawn.position;
    const miniBoss = new BossEnemy(this, spawnPosition.x, spawnPosition.y, { variant: "mini" });
    const hpMultiplier = this.director.getEnemyHpMultiplier();
    miniBoss.hp = Math.max(1, Math.round(miniBoss.hp * hpMultiplier));
    miniBoss.maxHp = miniBoss.hp;
    miniBoss.setData("lastDashHitId", -1);
    miniBoss.setData("archetype", "mini_boss");
    miniBoss.setData("spawnLane", lane);
    this.enemies.add(miniBoss);

    this.shakeScreen(160, 0.0036);
    this.playSfx("boss_warning");
    this.showWarningBanner("MINI BOSS", {
      tone: "mini",
      durationMs: 1180
    });
  }

  clearWarningBanner() {
    const banner = this.activeWarningBanner;
    if (!banner) {
      return;
    }

    const tween = banner.getData?.("bannerTween");
    if (tween) {
      tween.stop();
    }
    const hideEvent = banner.getData?.("bannerHideEvent");
    if (hideEvent) {
      hideEvent.remove(false);
    }

    banner.destroy();
    this.activeWarningBanner = null;
  }

  showWarningBanner(message, options = {}) {
    if (!this.add || !this.tweens) {
      return;
    }

    this.clearWarningBanner();

    const tone = options.tone ?? "boss";
    const durationMs = Math.max(850, Number(options.durationMs) || 1400);
    const centerX = Math.round((this.scale?.width ?? 1280) * 0.5);
    const centerY = Math.round(Math.max(116, (this.scale?.height ?? 720) * 0.16));
    const palette =
      tone === "mini"
        ? {
            border: 0xe7b76a,
            glow: 0xffcf7f,
            fill: 0x3c2415,
            inner: 0x1b120d
          }
        : tone === "approach"
          ? {
              border: 0xffd5a1,
              glow: 0xffe8c4,
              fill: 0x4a1a13,
              inner: 0x23110f
            }
          : {
              border: 0xffb36b,
              glow: 0xffd6a0,
              fill: 0x531510,
              inner: 0x24100d
            };

    const label = this.add
      .text(0, 0, message, WARNING_BANNER_STYLE)
      .setOrigin(0.5)
      .setShadow(0, 2, "#140804", 4, true, true);

    const padX = 28;
    const padY = 12;
    const width = Math.ceil(label.width + padX * 2);
    const height = Math.ceil(label.height + padY * 2);

    const outer = this.add
      .rectangle(0, 0, width, height, palette.fill, 0.9)
      .setStrokeStyle(2, palette.border, 0.98);
    const inner = this.add
      .rectangle(0, 0, width - 10, height - 10, palette.inner, 0.88)
      .setStrokeStyle(1, palette.glow, 0.42);
    const accentTop = this.add.rectangle(0, -height * 0.5 + 4, width - 18, 3, palette.glow, 0.75);
    const accentBottom = this.add.rectangle(0, height * 0.5 - 4, width - 18, 3, palette.border, 0.62);

    const container = this.add
      .container(centerX, centerY, [outer, inner, accentTop, accentBottom, label])
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.HUD + 8)
      .setAlpha(0)
      .setScale(0.92);

    this.activeWarningBanner = container;

    this.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 130,
      ease: "Back.Out"
    });

    const hideEvent = this.time.delayedCall(durationMs, () => {
      const hideTween = this.tweens.add({
        targets: container,
        alpha: 0,
        y: centerY - 12,
        duration: 180,
        ease: "Quad.easeIn",
        onComplete: () => {
          if (this.activeWarningBanner === container) {
            this.activeWarningBanner = null;
          }
          container.destroy();
        }
      });
      container.setData("bannerTween", hideTween);
    });

    container.setData("bannerHideEvent", hideEvent);
  }

  createHudAlertPool() {
    this.hudAlertPool = [];
    for (let i = 0; i < HUD_ALERT_POOL_SIZE; i += 1) {
      const text = this.add
        .text(640, 74, "", HUD_ALERT_STYLE)
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(RENDER_DEPTH.HUD + 4)
        .setVisible(false)
        .setActive(false);
      text.setData("alertKind", null);
      text.setData("alertTween", null);
      text.setData("alertHideEvent", null);
      this.hudAlertPool.push(text);
    }
  }

  releaseHudAlertText(text) {
    if (!text) {
      return;
    }

    const alertTween = text.getData("alertTween");
    if (alertTween) {
      alertTween.stop();
    }
    const hideEvent = text.getData("alertHideEvent");
    if (hideEvent) {
      hideEvent.remove(false);
    }

    text.setData("alertTween", null);
    text.setData("alertHideEvent", null);
    text.setData("alertKind", null);
    text.setAlpha(1);
    text.setScale(1);
    text.setVisible(false);
    text.setActive(false);
  }

  acquireHudAlertText(kind) {
    if (!Array.isArray(this.hudAlertPool) || this.hudAlertPool.length === 0) {
      return null;
    }

    let text = this.hudAlertPool.find((entry) => entry.active && entry.getData("alertKind") === kind);
    if (!text) {
      text = this.hudAlertPool.find((entry) => !entry.active);
    }
    if (!text) {
      text = this.hudAlertPool[0];
    }
    if (!text) {
      return null;
    }

    this.releaseHudAlertText(text);
    text.setData("alertKind", kind);
    text.setVisible(true);
    text.setActive(true);
    return text;
  }

  showHudAlert(message, durationMs = 1600) {
    const text = this.acquireHudAlertText("center_alert");
    if (!text) {
      return;
    }

    text.setStyle(HUD_ALERT_STYLE);
    text.setPosition(640, 74);
    text.setDepth(RENDER_DEPTH.HUD + 4);
    text.setText(message);

    const hideEvent = this.time.delayedCall(durationMs, () => {
      this.releaseHudAlertText(text);
    });
    text.setData("alertHideEvent", hideEvent);
  }

  checkStageAnnouncements() {
    const sec = Math.floor(this.runTimeMs / 1000);
    if (sec === this.lastStageAnnouncementSec) return;

    const STAGE_EVENTS = [
      { time: 30, text: "敌人开始涌入...", color: "#ffcc44" },
      { time: 60, text: "精英敌人出现!", color: "#ff8844" },
      { time: 90, text: "危险等级提升!", color: "#ff4444" },
      { time: 150, text: "更多敌人来袭!", color: "#ff6644" },
      { time: 210, text: "生存考验!", color: "#ff4466" },
    ];

    const event = STAGE_EVENTS.find(e => e.time === sec);
    if (event) {
      this.showStageAnnouncement(event.text, event.color);
      this.lastStageAnnouncementSec = sec;
    }

    // Boss announcements
    const bossInterval = DIRECTOR_BOSS_SPAWN?.intervalMs;
    if (Number.isFinite(bossInterval) && bossInterval > 0) {
      const bossSec = Math.floor(bossInterval / 1000);
      if (sec > 0 && sec % bossSec === 0 && sec !== this.lastStageAnnouncementSec) {
        this.showStageAnnouncement("BOSS 来袭!", "#ff2222");
        this.lastStageAnnouncementSec = sec;
      }
    }
  }

  showStageAnnouncement(text, color = "#ffcc44") {
    const cx = 640;
    const cy = 300;
    const depth = RENDER_DEPTH.HUD + 10;

    const overlay = this.add.rectangle(cx, cy, 500, 60, 0x000000, 0.6)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 0.8)
      .setScrollFactor(0).setDepth(depth).setAlpha(0);

    const label = this.add.text(cx, cy, text, {
      fontFamily: "ZpixOne", fontSize: "28px", color,
      stroke: "#000000", strokeThickness: 5
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1).setAlpha(0);

    // Fade in
    this.tweens.add({ targets: [overlay, label], alpha: 1, duration: 300, ease: "Quad.easeOut" });

    // Fade out after 2s
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [overlay, label], alpha: 0, duration: 500, ease: "Quad.easeIn",
        onComplete: () => { overlay.destroy(); label.destroy(); }
      });
    });
  }

  updateBossApproachWarning() {
    const intervalMs = DIRECTOR_BOSS_SPAWN.intervalMs;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      return;
    }

    const nextBossCycleIndex = Math.floor(this.runTimeMs / intervalMs) + 1;
    const nextBossAtMs = nextBossCycleIndex * intervalMs;
    const remainingMs = nextBossAtMs - this.runTimeMs;
    if (remainingMs > BOSS_WARNING_LEAD_MS || remainingMs <= 0) {
      return;
    }
    if (this.bossApproachWarnedCycleIndex === nextBossCycleIndex) {
      return;
    }

    this.bossApproachWarnedCycleIndex = nextBossCycleIndex;
    this.playSfx("boss_warning");
    this.showWarningBanner("BOSS APPROACHING", {
      tone: "approach",
      durationMs: 1500
    });
  }

  lerpColor(fromHex, toHex, t) {
    const blend = Phaser.Math.Clamp(t, 0, 1);
    const fromR = (fromHex >> 16) & 0xff;
    const fromG = (fromHex >> 8) & 0xff;
    const fromB = fromHex & 0xff;
    const toR = (toHex >> 16) & 0xff;
    const toG = (toHex >> 8) & 0xff;
    const toB = toHex & 0xff;

    const r = Math.round(Phaser.Math.Linear(fromR, toR, blend));
    const g = Math.round(Phaser.Math.Linear(fromG, toG, blend));
    const b = Math.round(Phaser.Math.Linear(fromB, toB, blend));
    return (r << 16) | (g << 8) | b;
  }

  updateDashCooldownRing() {
    if (!this.dashCooldownRingGraphics) {
      return;
    }

    this.dashCooldownRingGraphics.clear();
    if (!this.player?.active) {
      return;
    }

    const x = this.player.x;
    const y = this.player.y;
    const radius = 26;
    const dashRatio = Phaser.Math.Clamp(this.player.getDashRatio(), 0, 1);
    const nowMs = this.time?.now ?? 0;
    const isReady = dashRatio >= 1 && !this.player.isDashing();

    this.dashCooldownRingGraphics.lineStyle(2, 0x14253b, 0.7);
    this.dashCooldownRingGraphics.strokeCircle(x, y, radius);

    if (isReady) {
      const pulse = (Math.sin(nowMs / 130) + 1) / 2;
      const glowColor = this.lerpColor(0xffd166, 0xffffff, pulse * 0.65);
      this.dashCooldownRingGraphics.lineStyle(4, glowColor, 0.24 + pulse * 0.28);
      this.dashCooldownRingGraphics.strokeCircle(x, y, radius + 4 + pulse * 1.2);
    }

    if (dashRatio <= 0) {
      return;
    }

    const ringColor = isReady ? 0xffd166 : 0x7fd8ff;
    const ringAlpha = isReady ? 1 : 0.92;
    this.dashCooldownRingGraphics.lineStyle(3, ringColor, ringAlpha);
    this.dashCooldownRingGraphics.beginPath();
    this.dashCooldownRingGraphics.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * dashRatio, false);
    this.dashCooldownRingGraphics.strokePath();
  }

  spawnDamageNumber(x, y, amount, enemy = null) {
    if (this.settingsShowDmgNum === false) return;
    const safeAmount = Math.max(0, Math.round(amount ?? 0));
    if (safeAmount <= 0) {
      return;
    }

    const isBoss = Boolean(enemy?.getData?.("isBoss")) || enemy?.type === "boss";
    const isElite = Boolean(enemy?.isElite);
    const isPriority = isBoss || isElite || safeAmount >= 40;
    const textColor = isBoss ? "#ff3b3b" : isElite ? "#ffb347" : "#ff4444";
    const lifetimeMs = isBoss
      ? DAMAGE_NUMBER_BOSS_LIFETIME_MS
      : isElite
        ? DAMAGE_NUMBER_ELITE_LIFETIME_MS
        : DAMAGE_NUMBER_NORMAL_LIFETIME_MS;
    const risePx = isBoss
      ? DAMAGE_NUMBER_BOSS_RISE_PX
      : isElite
        ? DAMAGE_NUMBER_ELITE_RISE_PX
        : DAMAGE_NUMBER_NORMAL_RISE_PX;
    const fontSize = isBoss ? 16 : isElite ? 15 : isPriority ? 14 : 13;
    const activeEntries = this.damageNumberPool.filter((entry) => entry.active);
    const activeCap = isPriority ? DAMAGE_NUMBER_MAX_ACTIVE_PRIORITY : DAMAGE_NUMBER_MAX_ACTIVE;

    if (!isPriority && activeEntries.length >= activeCap) {
      return;
    }

    let text = this.damageNumberPool.find((entry) => !entry.active);
    if (!text && isPriority) {
      text = activeEntries.find((entry) => !entry.getData("damagePriority")) ?? activeEntries[0];
    }
    if (!text) {
      text = this.add
        .text(x, y, "", {
          fontFamily: "ZpixOne",
          fontSize: "14px",
          color: "#ff4444",
          stroke: "#000000",
          strokeThickness: 2
        })
        .setOrigin(0.5)
        .setDepth(RENDER_DEPTH.DAMAGE_TEXT)
        .setVisible(false)
        .setActive(false);
      this.damageNumberPool.push(text);
    }

    const prevTween = text.getData("damageTween");
    if (prevTween) {
      prevTween.stop();
    }
    const prevPopTween = text.getData("damagePopTween");
    if (prevPopTween) {
      prevPopTween.stop();
    }

    const baseYOffset = isBoss ? 30 : isElite ? 20 : 12;
    const spawnX = x + Phaser.Math.Between(-8, 8);
    const spawnY = y - baseYOffset + Phaser.Math.Between(-2, 2);

    text.setText(`${safeAmount}`);
    text.setStyle({
      fontSize: `${fontSize}px`,
      color: textColor
    });
    text.setPosition(spawnX, spawnY);
    text.setAlpha(isPriority ? 0.98 : 0.86);
    text.setScale(1);
    text.setVisible(true);
    text.setActive(true);
    text.setData("damagePriority", isPriority);
    text.setData("damageSpawnAt", this.time.now);

    const popTween = this.tweens.add({
      targets: text,
      scaleX: isPriority ? 1.18 : 1.1,
      scaleY: isPriority ? 1.18 : 1.1,
      duration: isPriority ? 70 : 50,
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: () => {
        text.setData("damagePopTween", null);
      }
    });
    text.setData("damagePopTween", popTween);

    const tween = this.tweens.add({
      targets: text,
      y: spawnY - risePx,
      alpha: 0,
      duration: lifetimeMs,
      ease: "Cubic.easeOut",
      onComplete: () => {
        text.setVisible(false);
        text.setActive(false);
        text.setData("damagePriority", false);
        text.setData("damageSpawnAt", 0);
        text.setData("damageTween", null);
        text.setData("damagePopTween", null);
      }
    });
    text.setData("damageTween", tween);
  }

  spawnDamageText(x, y, damage, enemy = null) {
    this.spawnDamageNumber(x, y, damage, enemy);
  }

  formatRunTime(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  getWeaponIconKey(weaponType) {
    const iconAsset = WEAPON_ICON_ASSETS[weaponType];
    if (iconAsset && this.textures.exists(iconAsset.key)) {
      return iconAsset.key;
    }
    return "proj_dagger";
  }

  getWeaponIconPath(weaponType) {
    return WEAPON_ICON_ASSETS[weaponType]?.path ?? WEAPON_ICON_ASSETS.dagger.path;
  }

  updateHudWeaponIcons() {
    if (!Array.isArray(this.hudWeaponSlotIcons) || this.hudWeaponSlotIcons.length === 0) {
      return;
    }

    const equippedWeapons = this.player?.weapons ?? [];
    const now = this.time?.now ?? 0;
    this.hudWeaponSlotIcons.forEach(({ frame, icon, cdBarBg, cdBarFill }, index) => {
      const weapon = equippedWeapons[index];
      if (!frame || !icon) {
        return;
      }
      if (!weapon) {
        frame.setAlpha(0.28);
        icon.setTexture("proj_dagger");
        icon.setAlpha(0.18);
        cdBarBg?.setVisible(false);
        cdBarFill?.setVisible(false);
        return;
      }
      frame.setAlpha(0.9);
      const weaponType = weapon.baseType ?? weapon.type;
      icon.setTexture(this.getWeaponIconKey(weaponType));
      icon.setAlpha(0.95);

      // Update cooldown bar
      if (cdBarBg && cdBarFill) {
        cdBarBg.setVisible(true);
        cdBarFill.setVisible(true);
        const cdMs = this.weaponSystem?.getEffectiveCooldownMs?.(weapon) ?? weapon.cooldownMs;
        const nextFire = weapon.nextFireAt ?? 0;
        const elapsed = Math.max(0, now - (nextFire - cdMs));
        const progress = Phaser.Math.Clamp(elapsed / cdMs, 0, 1);
        cdBarFill.displayWidth = 28 * progress;
        // Color: blue when cooling, white when ready
        if (progress >= 1) {
          cdBarFill.setFillStyle(0xffffff, 0.9);
        } else {
          cdBarFill.setFillStyle(0x4488ff, 0.85);
        }
      }
    });
  }

  loadSpawnPacingPresetKey() {
    if (typeof window === "undefined" || !window.localStorage) {
      return PLAYTEST_SPAWN_PACING_DEFAULT;
    }

    const saved = window.localStorage.getItem(PLAYTEST_SPAWN_PACING_STORAGE_KEY);
    if (saved && PLAYTEST_SPAWN_PACING_PRESETS[saved]) {
      return saved;
    }
    return PLAYTEST_SPAWN_PACING_DEFAULT;
  }

  saveSpawnPacingPresetKey(key) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(PLAYTEST_SPAWN_PACING_STORAGE_KEY, key);
  }

  applySpawnPacingPreset(key) {
    const preset = PLAYTEST_SPAWN_PACING_PRESETS[key];
    if (!preset) {
      return false;
    }

    this.spawnPacingPresetKey = key;
    this.spawnPacingPreset = preset;
    this.baseSpawnCheckIntervalMs = Math.max(60, BASE_SPAWN_CHECK_INTERVAL_MS * (preset.spawnIntervalScale ?? 1));
    this.saveSpawnPacingPresetKey(key);
    return true;
  }

  cycleSpawnPacingPresetAtRunStart() {
    if (this.runTimeMs > 0) {
      this.showHudAlert("PACING LOCKED IN RUN", 900);
      return;
    }

    const currentIdx = Math.max(0, PLAYTEST_SPAWN_PACING_ORDER.indexOf(this.spawnPacingPresetKey));
    const nextKey = PLAYTEST_SPAWN_PACING_ORDER[(currentIdx + 1) % PLAYTEST_SPAWN_PACING_ORDER.length];
    if (!this.applySpawnPacingPreset(nextKey)) {
      return;
    }
    this.showHudAlert(`PACING ${nextKey}`, 1000);
    this.maintainEnemyDensity();
    this.updateDebugDirectorOverlay();
  }

  toggleDebugOverlay() {
    this.debugOverlayEnabled = !this.debugOverlayEnabled;
    this.debugOverlayPanel?.setVisible(this.debugOverlayEnabled);
    this.debugDirectorText?.setVisible(this.debugOverlayEnabled);
    this.showHudAlert(this.debugOverlayEnabled ? "DEBUG HUD ON" : "DEBUG HUD OFF", 850);
  }

  toggleCameraFollow() {
    if (!this.player || !this.cameras?.main) {
      return;
    }
    const camera = this.cameras.main;
    this.cameraFollowEnabled = !this.cameraFollowEnabled;
    if (this.cameraFollowEnabled) {
      camera.startFollow(
        this.player,
        true,
        GAMEPLAY_CAMERA_FOLLOW_LERP_X,
        GAMEPLAY_CAMERA_FOLLOW_LERP_Y
      );
    } else {
      camera.stopFollow();
    }
    this.showHudAlert(this.cameraFollowEnabled ? "CAM FOLLOW ON" : "CAM FOLLOW OFF", 900);
  }

  handlePlaytestHotkeys() {
    if (!this.keys) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.debugToggle)) {
      this.toggleDebugOverlay();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.pacingPreset)) {
      this.cycleSpawnPacingPresetAtRunStart();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.cameraToggle)) {
      this.toggleCameraFollow();
    }
  }

  updateDebugDirectorOverlay() {
    if (!this.debugDirectorText || !this.director || !this.debugOverlayEnabled) {
      return;
    }

    const alive = this.getAliveEnemyCount();
    const spawnRateMultiplier = this.getEffectiveSpawnRateMultiplier();
    const spawnIntervalMs = this.baseSpawnCheckIntervalMs / Math.max(0.2, spawnRateMultiplier);
    const eliteChance = this.director.getEliteChance();
    const weaponCount = this.player?.weapons?.length ?? 0;
    const passiveCount = Object.keys(this.player?.passives ?? {}).length;
    const metaLiveTotal = (this.metaData?.currency ?? 0) + (this.runMetaCurrency ?? 0);
    this.debugDirectorText.setText(
      [
        `Enemies: ${alive}/${this.targetEnemies}`,
        `Pacing: ${this.spawnPacingPresetKey}`,
        `EliteChance: ${(eliteChance * 100).toFixed(1)}%`,
        `SpawnInterval: ${Math.round(spawnIntervalMs)}ms`,
        `Build: WPN ${weaponCount} / PAS ${passiveCount} / META ${metaLiveTotal}`,
        `GameTime: ${this.formatRunTime(this.runTimeMs)}`
      ].join("\n")
    );
  }

  getOffscreenIndicatorColor(enemy) {
    if (enemy?.getData?.("isBoss")) {
      return 0xff3b3b;
    }
    if (enemy?.isElite) {
      return 0xffb347;
    }
    return 0xffffff;
  }

  acquireOffscreenIndicator() {
    let marker = this.offscreenIndicatorPool.find((entry) => !entry.active);
    if (marker) {
      return marker;
    }

    const size = OFFSCREEN_INDICATOR_SIZE;
    marker = this.add
      .triangle(
        0,
        0,
        size,
        0,
        -size * 0.78,
        -size * 0.66,
        -size * 0.78,
        size * 0.66,
        0xffffff,
        0.95
      )
      .setScrollFactor(0)
      .setDepth(19)
      .setVisible(false)
      .setActive(false);
    this.offscreenIndicatorPool.push(marker);
    return marker;
  }

  selectOffscreenIndicatorTargets(view, centerX, centerY) {
    const selected = [];
    const normalCandidates = [];
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy?.active) {
        return;
      }
      if (Phaser.Geom.Rectangle.Contains(view, enemy.x, enemy.y)) {
        return;
      }

      const dx = enemy.x - centerX;
      const dy = enemy.y - centerY;
      const distSq = dx * dx + dy * dy;
      const isBoss = Boolean(enemy.getData?.("isBoss"));
      const isElite = Boolean(enemy.isElite);
      const priorityBonus = isBoss ? OFFSCREEN_PRIORITY_BONUS_BOSS : isElite ? OFFSCREEN_PRIORITY_BONUS_ELITE : 0;
      const score = distSq - priorityBonus;
      const candidate = { enemy, score };

      if (priorityBonus > 0) {
        selected.push(candidate);
      } else {
        normalCandidates.push(candidate);
      }
    });

    selected.sort((a, b) => a.score - b.score);
    if (selected.length >= OFFSCREEN_INDICATOR_MAX) {
      return selected.slice(0, OFFSCREEN_INDICATOR_MAX).map((entry) => entry.enemy);
    }

    normalCandidates.sort((a, b) => a.score - b.score);
    const remaining = OFFSCREEN_INDICATOR_MAX - selected.length;
    return selected
      .concat(normalCandidates.slice(0, remaining))
      .map((entry) => entry.enemy);
  }

  updateOffscreenEnemyIndicators() {
    if (!this.cameras?.main) {
      return;
    }

    if (this.offscreenIndicatorGraphics) {
      this.offscreenIndicatorGraphics.clear();
    }
    this.offscreenIndicatorPool.forEach((marker) => {
      marker.setVisible(false);
      marker.setActive(false);
    });

    const cam = this.cameras.main;
    const view = cam.worldView;
    const sw = cam.width;
    const sh = cam.height;
    const centerX = view.centerX;
    const centerY = view.centerY;
    const edgeMinX = OFFSCREEN_INDICATOR_INSET;
    const edgeMaxX = sw - OFFSCREEN_INDICATOR_INSET;
    const edgeMinY = OFFSCREEN_INDICATOR_INSET;
    const edgeMaxY = sh - OFFSCREEN_INDICATOR_INSET;

    const targetX = this.player?.x ?? centerX;
    const targetY = this.player?.y ?? centerY;
    const offscreenTargets = this.selectOffscreenIndicatorTargets(view, targetX, targetY);

    offscreenTargets.forEach((enemy) => {
      const dx = enemy.x - centerX;
      const dy = enemy.y - centerY;
      const length = Math.hypot(dx, dy);
      if (length < 0.0001) {
        return;
      }
      const nx = dx / length;
      const ny = dy / length;

      const scaleX = nx !== 0 ? (nx > 0 ? edgeMaxX - sw / 2 : edgeMinX - sw / 2) / nx : Number.POSITIVE_INFINITY;
      const scaleY = ny !== 0 ? (ny > 0 ? edgeMaxY - sh / 2 : edgeMinY - sh / 2) / ny : Number.POSITIVE_INFINITY;
      const t = Math.min(Math.abs(scaleX), Math.abs(scaleY));
      const screenX = sw / 2 + nx * t;
      const screenY = sh / 2 + ny * t;
      const marker = this.acquireOffscreenIndicator();
      marker.setPosition(screenX, screenY);
      marker.setRotation(Math.atan2(ny, nx));
      marker.setFillStyle(this.getOffscreenIndicatorColor(enemy), 0.95);
      marker.setVisible(true);
      marker.setActive(true);
    });
  }

  getSpawnCandidateForLane(lane, view) {
    const rule = SPAWN_LANE_RULES[lane];
    if (!rule) {
      return null;
    }

    const width = Math.max(1, view.right - view.left);
    const height = Math.max(1, view.bottom - view.top);
    const rangeStart = Phaser.Math.Clamp(rule.rangeStart ?? 0, 0, 1);
    const rangeEnd = Phaser.Math.Clamp(rule.rangeEnd ?? 1, rangeStart, 1);
    const offset = Math.max(24, Number(rule.offscreenOffset) || 90);

    let x = view.centerX;
    let y = view.centerY;
    if (rule.edge === "top") {
      x = Phaser.Math.Between(view.left + width * rangeStart, view.left + width * rangeEnd);
      y = view.top - offset;
    } else if (rule.edge === "bottom") {
      x = Phaser.Math.Between(view.left + width * rangeStart, view.left + width * rangeEnd);
      y = view.bottom + offset;
    } else if (rule.edge === "left") {
      x = view.left - offset;
      y = Phaser.Math.Between(view.top + height * rangeStart, view.top + height * rangeEnd);
    } else if (rule.edge === "right") {
      x = view.right + offset;
      y = Phaser.Math.Between(view.top + height * rangeStart, view.top + height * rangeEnd);
    }

    return {
      x: Phaser.Math.Clamp(x, 12, WORLD_WIDTH - 12),
      y: Phaser.Math.Clamp(y, 12, WORLD_HEIGHT - 12),
      lane
    };
  }

  getSpawnPosition(lane = null) {
    const view = this.cameras.main.worldView;
    const hasRequestedLane = Boolean(lane && SPAWN_LANE_RULES[lane]);
    const lanes = hasRequestedLane ? [lane] : SPAWN_LANE_KEYS;

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const laneForAttempt = hasRequestedLane ? lane : Phaser.Utils.Array.GetRandom(lanes);
      const candidate = this.getSpawnCandidateForLane(laneForAttempt, view);
      if (!candidate) {
        continue;
      }
      if (this.isValidSpawnPoint(candidate.x, candidate.y)) {
        return candidate;
      }
    }

    const fallbackCandidates = lanes
      .map((laneKey) => this.getSpawnCandidateForLane(laneKey, view))
      .filter(Boolean);

    let best = fallbackCandidates[0] ?? { x: this.player.x, y: this.player.y };
    let bestScore = Number.NEGATIVE_INFINITY;
    fallbackCandidates.forEach((candidate) => {
      const outsideBonus = Phaser.Geom.Rectangle.Contains(view, candidate.x, candidate.y) ? 0 : 100000;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, candidate.x, candidate.y);
      const score = outsideBonus + distance;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    });

    return best;
  }

  isValidSpawnPoint(x, y) {
    const view = this.cameras.main.worldView;
    const isOutsideView = !Phaser.Geom.Rectangle.Contains(view, x, y);
    const isOutsideSafeRadius = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) > this.safeRadius;
    const noObstacleOverlap = !this.isObstacleBlockedAt(x, y, 18);
    return isOutsideView && isOutsideSafeRadius && noObstacleOverlap;
  }

  pickEnemyArchetype() {
    const elapsedSeconds = this.runTimeMs / 1000;
    const availableTypes = ENEMY_TYPE_WEIGHTS.filter((entry) => {
      if (entry.type === "hunter" && elapsedSeconds < HUNTER_UNLOCK_TIME_SEC) {
        return false;
      }
      if (entry.type === "ranger" && elapsedSeconds < RANGER_UNLOCK_TIME_SEC) {
        return false;
      }
      return true;
    });

    const totalWeight = availableTypes.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;

    for (let i = 0; i < availableTypes.length; i += 1) {
      roll -= availableTypes[i].weight;
      if (roll <= 0) {
        return availableTypes[i].type;
      }
    }

    return "chaser";
  }

  pickEliteType() {
    const roll = Math.random();
    if (roll < 0.34) {
      return "speed_boost";
    }
    if (roll < 0.67) {
      return "dash_attack";
    }
    return "poison_aura";
  }

  handlePlayerEnemyCollision(player, enemy) {
    if (!enemy || typeof enemy.takeDamage !== "function" || typeof enemy.applyKnockbackFrom !== "function") {
      return;
    }

    if (this.gameMode === "coop" && !this.isHost) {
      return;
    }

    if (player.isDashing()) {
      const lastDashHitId = enemy.getData("lastDashHitId") ?? -1;
      if (lastDashHitId !== player.currentDashId) {
        enemy.setData("lastDashHitId", player.currentDashId);
        enemy.takeDamage(player.dashDamage);
        enemy.applyKnockbackFrom(player.x, player.y, 360);
        this.shakeScreen(80, 0.003);

        if (enemy.isDead()) {
          this.handleEnemyDefeat(enemy);
        }
      }

      if (player.isDashInvulnerable()) {
        return;
      }
    }

    const damaged = player.takeDamage(enemy.damage, this.time.now);
    if (!damaged) {
      return;
    }
    this.triggerPlayerHurtFeedback(player);

    if (!player.isDead()) {
      return;
    }
    this.triggerGameOver();
  }

  handleBossProjectileHit(player, projectile) {
    if (!projectile?.active || !player?.active) {
      return;
    }

    const damage = Math.max(1, Math.round(projectile.getData("damage") ?? 12));
    this.releaseBossProjectile(projectile);

    if (player.isDashInvulnerable()) {
      return;
    }

    const damaged = player.takeDamage(damage, this.time.now);
    if (!damaged) {
      return;
    }
    this.triggerPlayerHurtFeedback(player);

    if (player.isDead()) {
      this.triggerGameOver();
    }
  }

  triggerPlayerHurtFeedback(player) {
    if (!player?.active || this.isGameOver || this.isLeveling || this.isWeaponSelecting) {
      return;
    }

    const now = this.time?.now ?? 0;
    if (now - this.lastPlayerHurtFeedbackAt < PLAYER_HURT_FEEDBACK_COOLDOWN_MS) {
      return;
    }
    this.lastPlayerHurtFeedbackAt = now;

    this.shakeScreen(PLAYER_HURT_SHAKE_DURATION_MS, PLAYER_HURT_SHAKE_INTENSITY);

    const pulse = this.add
      .circle(player.x, player.y, PLAYER_HURT_PULSE_RADIUS, 0xff7a7a, PLAYER_HURT_PULSE_ALPHA)
      .setDepth(RENDER_DEPTH.PLAYER - 1)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setScale(0.7);

    this.tweens.add({
      targets: pulse,
      scale: 1.95,
      alpha: 0,
      duration: PLAYER_HURT_PULSE_DURATION_MS,
      ease: "Quad.easeOut",
      onComplete: () => pulse.destroy()
    });
  }

  showBossRadialWarning(boss, durationMs = 1000) {
    if (!boss?.active) {
      return;
    }

    const indicatorY = boss.y - Math.max(42, boss.displayHeight * 0.45);
    const warningText = this.add
      .text(boss.x, indicatorY, "环形冲击", {
        fontFamily: "ZpixOne",
        fontSize: "16px",
        color: "#ffd1d1",
        stroke: "#3f0f0f",
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(22);

    this.tweens.add({
      targets: warningText,
      y: indicatorY - 16,
      alpha: 0,
      duration: Math.max(120, durationMs),
      ease: "Cubic.easeOut",
      onComplete: () => warningText.destroy()
    });
  }

  acquireBossProjectile() {
    if (!this.bossProjectiles) {
      return null;
    }

    let projectile = this.bossProjectiles.getFirstDead(false);
    if (!projectile) {
      if (this.bossProjectiles.getLength() >= BOSS_BULLET_MAX) {
        return null;
      }
      projectile = this.bossProjectiles.create(-1000, -1000, "boss_bullet");
      if (!projectile?.body) {
        return null;
      }
      projectile.body.setCircle(Math.max(2, projectile.displayWidth * 0.42), 0, 0);
      projectile.setDepth(8);
    }

    projectile.setActive(true);
    projectile.setVisible(true);
    projectile.body.enable = true;
    return projectile;
  }

  releaseBossProjectile(projectile) {
    if (!projectile) {
      return;
    }
    if (projectile.body) {
      projectile.body.setVelocity(0, 0);
      projectile.body.enable = false;
    }
    projectile.setActive(false);
    projectile.setVisible(false);
    projectile.setPosition(-1000, -1000);
  }

  spawnBossRadialBurst(boss, bulletCount = 12, bulletSpeed = 220) {
    if (!boss?.active || this.isGameOver) {
      return;
    }

    const safeCount = Math.max(3, Math.min(32, Math.floor(bulletCount || 12)));
    const safeSpeed = Math.max(80, Math.min(420, Number(bulletSpeed) || 220));
    const damagePerBullet = Math.max(8, Math.round((boss.damage ?? 24) * 0.45));
    const nowMs = this.time?.now ?? 0;
    for (let i = 0; i < safeCount; i += 1) {
      const projectile = this.acquireBossProjectile();
      if (!projectile || !projectile.body) {
        continue;
      }

      const angle = (Math.PI * 2 * i) / safeCount;
      const vx = Math.cos(angle) * safeSpeed;
      const vy = Math.sin(angle) * safeSpeed;
      projectile.enableBody(true, boss.x, boss.y, true, true);
      projectile.body.setVelocity(vx, vy);
      projectile.setData("damage", damagePerBullet);
      projectile.setData("expireAtMs", nowMs + BOSS_BULLET_LIFETIME_MS);
    }
  }

  updateBossProjectiles(nowMs) {
    if (!this.bossProjectiles) {
      return;
    }

    this.bossProjectiles.getChildren().forEach((projectile) => {
      if (!projectile?.active) {
        return;
      }

      const expireAtMs = projectile.getData("expireAtMs") ?? 0;
      const outOfBounds =
        projectile.x < -30 || projectile.y < -30 || projectile.x > WORLD_WIDTH + 30 || projectile.y > WORLD_HEIGHT + 30;
      if (nowMs >= expireAtMs || outOfBounds) {
        this.releaseBossProjectile(projectile);
      }
    });
  }

  performAutoAttack(now) {
    if (now - this.lastAttackAt < this.attackIntervalMs) {
      return;
    }

    let nearestEnemy = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.active) {
        return;
      }
      if (enemy.getData("isDying") || enemy.isDead?.()) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (distance > this.attackRange || distance >= nearestDistance) {
        return;
      }

      nearestDistance = distance;
      nearestEnemy = enemy;
    });

    if (!nearestEnemy) {
      return;
    }

    this.lastAttackAt = now;

    // Visual flash — shown on all clients.
    const flash = this.add.graphics();
    flash.lineStyle(2, 0x89e8ff, 1);
    flash.lineBetween(this.player.x, this.player.y, nearestEnemy.x, nearestEnemy.y);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 90,
      onComplete: () => flash.destroy()
    });

    // Damage is host-authoritative in coop.
    if (this.gameMode === "coop" && !this.isHost) return;

    if (typeof nearestEnemy.takeDamage !== "function" || typeof nearestEnemy.applyKnockbackFrom !== "function") {
      return;
    }
    nearestEnemy.takeDamage(this.attackDamage);
    nearestEnemy.applyKnockbackFrom(this.player.x, this.player.y, 140);

    if (nearestEnemy.isDead()) {
      this.handleEnemyDefeat(nearestEnemy);
    }
  }

  spawnXpOrb(x, y, value, config = {}) {
    // Select texture based on XP value
    let texture = config.texture;
    if (!texture) {
      if (value >= 50) texture = "xp_orb_gold";
      else if (value >= 25) texture = "xp_orb_purple";
      else if (value >= 10) texture = "xp_orb_blue";
      else texture = "xp_orb";
    }
    const orb = this.xpOrbs.create(x, y, texture);
    if (!orb) {
      return;
    }
    const isSpecialPickup = config.pickupType === "elite_upgrade" || config.pickupType === "mini_boss_gold";
    const isHighValue = value >= 20;
    const isUltraValue = value >= 50;
    const baseScale =
      config.scale ??
      (isSpecialPickup ? XP_ORB_SPECIAL_SCALE : isUltraValue ? 1.4 : isHighValue ? XP_ORB_HIGH_VALUE_SCALE : XP_ORB_BASE_SCALE);
    const baseAlpha = isSpecialPickup ? XP_ORB_SPECIAL_ALPHA : isHighValue ? XP_ORB_HIGH_VALUE_ALPHA : XP_ORB_BASE_ALPHA;
    const radius = config.radius ?? (config.pickupType === "elite_upgrade" ? 8 : 6);
    orb.setCircle?.(radius, 0, 0);
    orb.setDepth(config.pickupType === "elite_upgrade" ? 7 : 5);
    orb.setScale(baseScale);
    orb.setAlpha(baseAlpha);
    orb.xpValue = value;
    orb.setData("baseScale", baseScale);
    orb.setData("baseAlpha", baseAlpha);
    orb.setData("magnetScaleBoost", isSpecialPickup ? XP_ORB_MAGNET_SCALE_BOOST + 0.05 : XP_ORB_MAGNET_SCALE_BOOST);
    if (config.pickupType) {
      orb.setData("pickupType", config.pickupType);
    } else {
      orb.setData("pickupType", null);
    }
    orb.setData("rewardUpgradeId", config.rewardUpgradeId ?? null);
    orb.setData("rewardCoins", Math.max(0, Math.floor(Number(config.rewardCoins) || 0)));
  }

  spawnEliteBonusXpOrbs(enemy) {
    const orbCount = Phaser.Math.Between(ELITE_BONUS_XP_ORB_MIN, ELITE_BONUS_XP_ORB_MAX);
    const perOrbValue = Math.max(3, Math.round((enemy.xpValue ?? 10) * ELITE_BONUS_XP_ORB_VALUE_FACTOR));
    for (let i = 0; i < orbCount; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(10, 26);
      const x = enemy.x + Math.cos(angle) * distance;
      const y = enemy.y + Math.sin(angle) * distance;
      this.spawnXpOrb(x, y, perOrbValue);
    }
  }

  spawnEliteUpgradePickup(x, y) {
    if (Math.random() >= ELITE_UPGRADE_DROP_CHANCE) {
      return false;
    }

    const rewardUpgradeId = Phaser.Utils.Array.GetRandom(ELITE_BONUS_UPGRADE_IDS);
    this.spawnXpOrb(x, y, 0, {
      texture: "upgrade_orb",
      pickupType: "elite_upgrade",
      rewardUpgradeId,
      radius: 8
    });
    return true;
  }

  spawnMiniBossRewardDrops(enemy) {
    const goldBundle = MINI_BOSS_GOLD_BUNDLE;
    const xpBase = Math.max(4, Math.round(enemy.xpValue ?? 20));
    const centerX = enemy.x;
    const centerY = enemy.y;

    this.spawnXpOrb(centerX, centerY, 0, {
      texture: "upgrade_orb",
      pickupType: "mini_boss_gold",
      rewardCoins: goldBundle,
      radius: 8
    });

    for (let i = 0; i < MINI_BOSS_XP_BURST_COUNT; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(14, 42);
      const xpFactor = Phaser.Math.FloatBetween(MINI_BOSS_XP_BURST_MIN_FACTOR, MINI_BOSS_XP_BURST_MAX_FACTOR);
      const xpValue = Math.max(3, Math.round(xpBase * xpFactor));
      this.spawnXpOrb(centerX + Math.cos(angle) * distance, centerY + Math.sin(angle) * distance, xpValue);
    }
  }

  applyEliteUpgradeReward(rewardUpgradeId) {
    const rewardUpgrade = LEVEL_UP_UPGRADES.find((upgrade) => upgrade.id === rewardUpgradeId);
    if (!rewardUpgrade) {
      return false;
    }
    this.applyLevelUpUpgrade(rewardUpgrade);
    this.showHudAlert(`ELITE ${rewardUpgrade.label.toUpperCase()}`, 1200);
    return true;
  }

  updateKillCombo() {
    const nowMs = this.time?.now ?? 0;
    if (nowMs - this.lastKillAtMs > COMBO_RESET_WINDOW_MS) {
      this.killCombo = 0;
    }
    this.killCombo += 1;
    this.maxKillCombo = Math.max(this.maxKillCombo, this.killCombo);
    this.lastKillAtMs = nowMs;

    if (this.killCombo < 3) {
      return;
    }

    let label = `x${this.killCombo} COMBO`;
    if (this.killCombo >= 10) {
      label = `x${this.killCombo} RAMPAGE`;
    }

    const comboText = this.acquireHudAlertText("combo");
    if (!comboText) {
      return;
    }

    comboText.setStyle(HUD_COMBO_STYLE);
    comboText.setPosition(1260, 28);
    comboText.setDepth(25);
    comboText.setText(label);
    comboText.setAlpha(1);
    comboText.setScale(COMBO_TEXT_SCALE);

    const tween = this.tweens.add({
      targets: comboText,
      y: 14,
      scale: COMBO_TEXT_SCALE,
      alpha: 0,
      duration: COMBO_TEXT_FADE_TIME_MS,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.releaseHudAlertText(comboText);
      }
    });
    comboText.setData("alertTween", tween);
  }

  handleEnemyDefeat(enemy) {
    if (!enemy || !enemy.active) {
      return;
    }
    if (enemy.getData("isDying")) {
      return;
    }
    enemy.setData("isDying", true);
    this.statusEffectSystem?.removeAllForEnemy(enemy);
    if (enemy.body) {
      enemy.body.setVelocity(0, 0);
      enemy.body.enable = false;
    }
    this.totalKills += 1;
    this.playKillCounterPulse();
    this.recordKillEvent();

    this.updateKillCombo();

    this.playSfx("enemy_death", { elite: enemy.isElite });
    if (enemy.isElite) {
      this.spawnEliteKillParticles(enemy.x, enemy.y, 20);
    }
    this.spawnKillParticles(enemy.x, enemy.y, enemy.isElite ? 14 : 10);
    const archetype = enemy.getData("archetype");
    if (archetype === "mini_boss" || enemy.getData("bossVariant") === "mini") {
      this.spawnMiniBossRewardDrops(enemy);
      this.showHudAlert("MINI BOSS LOOT", 1200);
    } else {
      this.spawnXpOrb(enemy.x, enemy.y, enemy.xpValue);
    }
    if (enemy.isElite) {
      this.spawnEliteBonusXpOrbs(enemy);
      const droppedUpgrade = this.spawnEliteUpgradePickup(enemy.x, enemy.y);
      if (droppedUpgrade) {
        this.showHudAlert("ELITE LOOT", 1000);
      }
    }

    // Item drops from regular enemies
    this.trySpawnItemDrop(enemy.x, enemy.y);

    // Treasure chest drops
    const isBoss = archetype === "boss" || enemy.getData("bossVariant") === "full";
    if (isBoss) {
      this.spawnChest(enemy.x, enemy.y);
    } else if (enemy.isElite && Math.random() < 0.15) {
      this.spawnChest(enemy.x, enemy.y);
    } else if (!enemy.isElite && Math.random() < 0.015) {
      this.spawnChest(enemy.x, enemy.y);
    }

    if (this.gameMode === "coop" && this.isHost && this.networkManager) {
      this.networkManager.sendEnemyKilled(enemy.serverId || "unknown", {
        x: Math.round(enemy.x),
        y: Math.round(enemy.y),
        xpValue: enemy.xpValue
      });
    }

    this.tweens.add({
      targets: enemy,
      scaleX: enemy.scaleX * 1.3,
      scaleY: enemy.scaleY * 1.3,
      alpha: 0,
      duration: 120,
      ease: "Quad.easeOut",
      onComplete: () => {
        enemy.setData("isDying", false);
        enemy.setAlpha(1);
        if (enemy.getData("pooledEnemy") === true) {
          this.enemyPool.release(enemy);
          return;
        }
        enemy.destroy();
      }
    });
  }

  handleXpOrbPickup(_, orb) {
    if (!orb.active) {
      return;
    }

    const xpValue = orb.xpValue ?? 0;
    if (xpValue > 0) {
      this.gainXp(xpValue);
    }

    const pickupType = orb.getData("pickupType");
    if (pickupType === "elite_upgrade") {
      this.applyEliteUpgradeReward(orb.getData("rewardUpgradeId"));
    } else if (pickupType === "mini_boss_gold") {
      const rewardCoins = Math.max(0, Math.floor(Number(orb.getData("rewardCoins")) || 0));
      this.runMetaCurrency += rewardCoins;
      this.showHudAlert(`+${rewardCoins} GOLD`, 900);
    }
    orb.destroy();
  }

  trySpawnItemDrop(x, y) {
    if (!this.itemPool) {
      return;
    }
    const itemKeys = Object.keys(ITEM_DROP_CONFIGS);
    for (let i = 0; i < itemKeys.length; i++) {
      const config = ITEM_DROP_CONFIGS[itemKeys[i]];
      if (Math.random() < config.dropChance) {
        const offsetX = (Math.random() - 0.5) * 30;
        const offsetY = (Math.random() - 0.5) * 30;
        const item = this.itemPool.acquire(x + offsetX, y + offsetY, config.id);
        if (item) {
          this.activeItems.push(item);
        }
        break; // Only one item drop per enemy
      }
    }
  }

  spawnChest(x, y) {
    const chest = new TreasureChest(this, x, y);
    this.chests.push(chest);
    this.playSfx("item_spawn");
  }

  updateChests() {
    if (!this.chests || this.chests.length === 0) return;
    const nowMs = this.time.now;
    const player = this.player;
    for (let i = this.chests.length - 1; i >= 0; i--) {
      const chest = this.chests[i];
      if (!chest.active || chest.collected) {
        this.chests.splice(i, 1);
        continue;
      }
      if (chest.isExpired(nowMs)) {
        chest.destroy();
        this.chests.splice(i, 1);
        continue;
      }
      if (chest.isNearPlayer(player.x, player.y)) {
        const reward = chest.collect();
        if (reward) {
          this.openTreasureChest(reward);
        }
        this.chests.splice(i, 1);
      }
    }
  }

  openTreasureChest(reward) {
    this.playSfx("chest_open");

    // Gold reward
    if (reward.gold > 0) {
      this.runMetaCurrency += reward.gold;
      this.showHudAlert(`+${reward.gold} GOLD`, 1200);
    }

    // Weapon upgrade
    if (reward.weaponUpgrade && this.weaponSystem) {
      const weapons = this.player.weapons ?? [];
      if (weapons.length > 0) {
        const weapon = weapons[Math.floor(Math.random() * weapons.length)];
        this.weaponSystem.levelUpWeapon(weapon);
        this.weaponSystem.checkEvolution(weapon);
        this.showHudAlert("WEAPON UPGRADE", 1000);
      }
    }

    // New weapon (if slots available)
    if (reward.newWeapon && this.weaponSystem) {
      const weapons = this.player.weapons ?? [];
      if (weapons.length < this.player.maxWeaponSlots) {
        const baseTypes = ["dagger", "fireball", "lightning", "scatter_shot", "homing_missile", "laser"];
        const owned = new Set(weapons.map(w => w.baseType || w.type));
        const available = baseTypes.filter(t => !owned.has(t));
        if (available.length > 0) {
          const type = available[Math.floor(Math.random() * available.length)];
          this.weaponSystem.addWeapon(type);
          this.showHudAlert("NEW WEAPON", 1200);
        }
      }
    }
  }

  updateDestructibles(time) {
    if (!this.destructibles || this.destructibles.length === 0) return;
    const nowMs = this.time.now;
    const player = this.player;

    // Check projectile hits on destructibles
    const projectiles = this.weaponSystem?.projectiles;
    if (projectiles) {
      projectiles.getChildren().forEach(proj => {
        if (!proj?.active) return;
        for (const d of this.destructibles) {
          if (d.destroyed || !d.active) continue;
          if (d.isNearWeapon(proj.x, proj.y, 8)) {
            d.takeDamage(proj.damage || 10);
            proj.setActive(false);
            proj.setVisible(false);
            if (proj.body) proj.body.enable = false;
            break;
          }
        }
      });
    }

    // Check player proximity hit (dash or contact)
    if (player?.active) {
      for (const d of this.destructibles) {
        if (d.destroyed || !d.active) continue;
        if (d.isNearWeapon(player.x, player.y, 20)) {
          if (player.isDashing) {
            d.takeDamage(2);
          }
        }
      }
    }

    // Respawn destroyed destructibles
    for (const d of this.destructibles) {
      if (d.destroyed) {
        d.tryRespawn(nowMs);
      }
    }
  }

  updateActiveItems(deltaMs) {
    if (!this.activeItems || this.activeItems.length === 0) {
      return;
    }
    const nowMs = this.time.now;
    const player = this.player;
    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      const item = this.activeItems[i];
      if (!item.active || item.inPool) {
        this.activeItems.splice(i, 1);
        continue;
      }
      item.updateVisual(nowMs);
      item.pullTowardPlayer(player.x, player.y, deltaMs);
      // Check pickup
      const dx = player.x - item.x;
      const dy = player.y - item.y;
      if (Math.hypot(dx, dy) < 28) {
        item.applyEffect(player, this);
        this.showItemPickupText(item);
        this.itemPool.release(item);
        this.activeItems.splice(i, 1);
        continue;
      }
      // Check expiry
      if (item.isExpired(nowMs)) {
        this.itemPool.release(item);
        this.activeItems.splice(i, 1);
      }
    }
  }

  showItemPickupText(item) {
    if (!item.itemConfig) {
      return;
    }
    const label = item.itemConfig.label;
    const colorMap = {
      health_orb: "#44ff66",
      shield: "#4488ff",
      speed_boost: "#ffdd44",
      magnet: "#cc44ff"
    };
    const color = colorMap[item.itemConfig.id] || "#ffffff";
    const text = this.add
      .text(item.x, item.y - 16, label, {
        fontFamily: "ZpixOne",
        fontSize: "14px",
        color,
        stroke: "#000000",
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(RENDER_DEPTH.DAMAGE_TEXT);
    this.tweens.add({
      targets: text,
      y: text.y - 32,
      alpha: 0,
      duration: 800,
      ease: "Quad.easeOut",
      onComplete: () => text.destroy()
    });
  }

  updateShieldEffect(deltaMs) {
    if (this.player.shieldRemainingMs > 0) {
      this.player.shieldRemainingMs = Math.max(0, this.player.shieldRemainingMs - deltaMs);
      if (this.player.shieldRemainingMs <= 0) {
        this.player.clearTint();
        if (this.fighterConfig && this.fighterConfig.tint) {
          this.player.setTint(this.fighterConfig.tint);
        }
      }
    }
  }

  gainXp(amount) {
    const baseAmount = Math.max(0, Math.round(amount));
    const effectiveAmount = Math.max(0, Math.round(baseAmount * this.metaXpMultiplier));
    if (effectiveAmount > 0) {
      this.playExpGainPulse();
    }

    this.totalXp += effectiveAmount;
    this.currentXp += effectiveAmount;

    let hasLeveledUp = false;
    while (this.currentXp >= this.xpToNext) {
      this.currentXp -= this.xpToNext;
      this.level += 1;
      this.player.level = this.level;
      this.pendingLevelUps += 1;
      this.xpToNext = this.getXpRequirement(this.level);
      hasLeveledUp = true;
    }

    if (hasLeveledUp) {
      this.playSfx("level_up");
      this.checkFighterEvolution();
    }

    if (!this.isLeveling && this.pendingLevelUps > 0) {
      this.openLevelUpChoices();
    }
  }

  getXpRequirement(level) {
    if (XP_REQUIREMENTS.byLevel[level] !== undefined) {
      return XP_REQUIREMENTS.byLevel[level];
    }
    return XP_REQUIREMENTS.postL3Base + (level - 3) * XP_REQUIREMENTS.postL3Step;
  }

  playExpGainPulse() {
    if (!this.tweens) {
      return;
    }

    if (this.expBarPulseTween) {
      this.expBarPulseTween.stop();
      this.expBarPulseTween = null;
    }

    this.expBarScaleY = 1;
    this.expBarPulseTween = this.tweens.add({
      targets: this,
      expBarScaleY: HUD_EXP_PULSE_SCALE,
      duration: Math.floor(HUD_EXP_PULSE_DURATION_MS * 0.5),
      ease: "Sine.easeOut",
      yoyo: true,
      onComplete: () => {
        this.expBarScaleY = 1;
        this.expBarPulseTween = null;
      }
    });
  }

  playKillCounterPulse() {
    if (!this.killText || !this.tweens) {
      return;
    }

    if (this.killCounterPulseTween) {
      this.killCounterPulseTween.stop();
      this.killCounterPulseTween = null;
    }

    this.killText.setScale(1);
    this.killCounterPulseTween = this.tweens.add({
      targets: this.killText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 50,
      ease: "Sine.easeOut",
      yoyo: true,
      onComplete: () => {
        this.killText?.setScale(1);
        this.killCounterPulseTween = null;
      }
    });
  }

  createModalTitle(centerX, centerY, label, config = {}) {
    const snappedX = Math.round(centerX);
    const snappedY = Math.round(centerY);
    const fontSize = Number(config.fontSize ?? 32);
    const badgeHeight = Number(config.badgeHeight ?? 32);
    const paddingX = Number(config.paddingX ?? 26);
    const minWidth = Number(config.minWidth ?? 180);
    const badgeDepth = Number(config.badgeDepth ?? 30.4);
    const textDepth = Number(config.textDepth ?? badgeDepth + 0.6);
    const textStyle = {
      fontFamily: "ZpixOne",
      fontSize: `${fontSize}px`,
      color: config.color ?? "#3a1f11"
    };

    const measureText = this.add
      .text(-1000, -1000, label, textStyle)
      .setVisible(false)
      .setActive(false);
    const badgeWidth = Math.max(minWidth, Math.ceil(measureText.width) + paddingX * 2);
    measureText.destroy();

    const titleChip = this.add
      .rectangle(snappedX, snappedY, badgeWidth, badgeHeight, 0xc19a67, 0.96)
      .setStrokeStyle(2, 0x6d4a31, 0.95)
      .setScrollFactor(0)
      .setDepth(badgeDepth);

    const title = this.add
      .text(snappedX, snappedY, label, textStyle)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(textDepth);

    return { titleChip, title };
  }

  openLevelUpChoices() {
    if (this.pendingLevelUps <= 0) {
      return;
    }

    this.pendingLevelUps -= 1;
    this.isLeveling = true;
    this.levelUpOptionActions = [];
    this.physics.pause();
    this.director?.pause?.();
    this.weaponSystem?.pause?.();
    this.player.body?.setVelocity(0, 0);
    this.applyHudModalFocus(true);

    const cam = this.cameras.main;
    const centerX = cam.width * 0.5;
    const centerY = cam.height * 0.5;
    const panelWidth = 400;
    const panelHeight = 400;
    const depth = RENDER_DEPTH.MENUS;

    const overlay = this.add.rectangle(centerX, centerY, cam.width, cam.height, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(depth);
    const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x0e1a2e, 0.97)
      .setStrokeStyle(3, 0x5ca7ff, 0.95).setScrollFactor(0).setDepth(depth + 1);
    const panelInner = this.add.rectangle(centerX, centerY, panelWidth - 14, panelHeight - 14, 0x132240, 0.95)
      .setStrokeStyle(1, 0x3a7abf, 0.85).setScrollFactor(0).setDepth(depth + 1);

    const title = this.add.text(centerX, centerY - panelHeight / 2 + 30, "升级!", {
      fontFamily: "ZpixOne", fontSize: "32px", color: "#f8fbff",
      stroke: "#0e1a2e", strokeThickness: 5
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2);

    const subtitle = this.add.text(centerX, centerY - panelHeight / 2 + 56, `Lv.${this.level}`, {
      fontFamily: "ZpixOne", fontSize: "14px", color: "#7ab8e0"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2);

    // Filter out passives the player already has
    const availableUpgrades = LEVEL_UP_UPGRADES.filter((upgrade) => {
      if (upgrade.isPassive && upgrade.passiveKey) {
        return !this.player.hasPassive(upgrade.passiveKey);
      }
      return true;
    });
    const choices = Phaser.Utils.Array.Shuffle([...availableUpgrades]).slice(0, 3);
    const optionObjects = [];

    const UPGRADE_COLORS = {
      weapon_damage: 0xff6644,
      attack_speed: 0x44ccff,
      projectile_count: 0xffcc44,
      movement_speed: 0x44ff88,
      pickup_radius: 0xcc66ff,
      passive_ember_core: 0xff4422,
      passive_blade_sigil: 0x88ccff,
      passive_iron_shell: 0xaaaaaa,
      passive_swift_feet: 0x66ff66,
      passive_wings: 0x88eeff,
      passive_armor: 0xcccccc,
      passive_hollow_heart: 0xff8888,
      passive_attractorb: 0xaa66ff,
      passive_frost_shard: 0x88ddff
    };

    const UPGRADE_ICONS = {
      weapon_damage: "⚔",
      attack_speed: "⚡",
      projectile_count: "◎",
      movement_speed: "➣",
      pickup_radius: "⊕",
      passive_ember_core: "🔥",
      passive_blade_sigil: "🗡",
      passive_iron_shell: "🛡",
      passive_swift_feet: "👟",
      passive_wings: "🪶",
      passive_armor: "🔰",
      passive_hollow_heart: "❤",
      passive_attractorb: "🧲",
      passive_frost_shard: "❄"
    };

    const optStartY = centerY - 60;
    const optHeight = 72;
    const optGap = 10;
    const optWidth = panelWidth - 60;

    choices.forEach((upgrade, index) => {
      const y = optStartY + index * (optHeight + optGap);
      const color = UPGRADE_COLORS[upgrade.id] || 0x5ca7ff;
      const icon = UPGRADE_ICONS[upgrade.id] || "?";

      // Check if this is an evolution option
      let isEvolution = false;
      let evoName = "";
      if (upgrade.passiveKey) {
        const matchingRule = WEAPON_EVOLUTION_RULES.find(r => r.requiredPassive === upgrade.passiveKey);
        if (matchingRule) {
          const ownedWeapon = this.player.weapons?.find(w => (w.baseType || w.type) === matchingRule.weapon);
          if (ownedWeapon && ownedWeapon.level >= matchingRule.level) {
            isEvolution = true;
            evoName = matchingRule.evolution;
          }
        }
      }

      // Option background
      const bgColor = isEvolution ? 0x1a3050 : 0x1a2640;
      const strokeColor = isEvolution ? 0xffdd44 : 0x3a6aaf;
      const box = this.add.rectangle(centerX, y, optWidth, optHeight, bgColor, 0.96)
        .setStrokeStyle(isEvolution ? 2 : 1, strokeColor, 0.9)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0).setDepth(depth + 2);

      // Color accent bar (left)
      const accent = this.add.rectangle(centerX - optWidth / 2 + 4, y, 6, optHeight - 8, color, 1)
        .setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth + 3);

      // Icon
      const iconText = this.add.text(centerX - optWidth / 2 + 22, y - 12, icon, {
        fontFamily: "ZpixOne", fontSize: "22px"
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth + 3);

      // Name + key hint
      let nameStr = `[${index + 1}] ${upgrade.label}`;
      if (upgrade.isPassive && this.player.hasPassive(upgrade.passiveKey)) {
        nameStr += " [已拥有]";
      }
      const nameText = this.add.text(centerX - optWidth / 2 + 50, y - 18, nameStr, {
        fontFamily: "ZpixOne", fontSize: "17px", color: "#f0f4ff",
        stroke: "#0e1a2e", strokeThickness: 3
      }).setScrollFactor(0).setDepth(depth + 3);

      // Description
      let descStr = upgrade.description || "";
      if (isEvolution) {
        descStr = `✨ 进化! → ${evoName}`;
      }
      const descText = this.add.text(centerX - optWidth / 2 + 50, y + 4, descStr, {
        fontFamily: "ZpixOne", fontSize: "13px", color: isEvolution ? "#ffdd66" : "#8aa8cc"
      }).setScrollFactor(0).setDepth(depth + 3);

      // Weapon level info for weapon-related upgrades
      let levelStr = "";
      if (upgrade.id === "weapon_damage" || upgrade.id === "attack_speed" || upgrade.id === "projectile_count") {
        const weapons = this.player.weapons || [];
        if (weapons.length > 0) {
          levelStr = weapons.map(w => `${w.type} Lv.${w.level}`).join("  ");
        }
      }
      if (upgrade.passiveKey && !isEvolution) {
        const matchingRule2 = WEAPON_EVOLUTION_RULES.find(r => r.requiredPassive === upgrade.passiveKey);
        if (matchingRule2) {
          const ownedW = this.player.weapons?.find(w => (w.baseType || w.type) === matchingRule2.weapon);
          if (ownedW) {
            levelStr = `${matchingRule2.weapon} Lv.${ownedW.level}/${matchingRule2.level} → ${matchingRule2.evolution}`;
          }
        }
      }
      if (levelStr) {
        const levelText = this.add.text(centerX + optWidth / 2 - 16, y - 8, levelStr, {
          fontFamily: "ZpixOne", fontSize: "11px", color: "#6688aa"
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(depth + 3);
        optionObjects.push(levelText);
      }

      // Evolution badge
      if (isEvolution) {
        const badge = this.add.text(centerX + optWidth / 2 - 16, y + 10, "进化!", {
          fontFamily: "ZpixOne", fontSize: "12px", color: "#ffdd44",
          stroke: "#2a1a10", strokeThickness: 2
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(depth + 3);
        optionObjects.push(badge);
      }

      const chooseUpgrade = () => {
        this.applyLevelUpUpgrade(upgrade);
        this.closeLevelUpChoices();
      };
      box.on("pointerdown", chooseUpgrade);
      box.on("pointerover", () => box.setFillStyle(isEvolution ? 0x224060 : 0x223454, 1));
      box.on("pointerout", () => box.setFillStyle(bgColor, 0.96));
      this.levelUpOptionActions.push(chooseUpgrade);

      optionObjects.push(box, accent, iconText, nameText, descText);
    });

    // Bottom bar: current weapons
    const weapons = this.player.weapons || [];
    if (weapons.length > 0) {
      const barY = centerY + panelHeight / 2 - 30;
      const barBg = this.add.rectangle(centerX, barY, panelWidth - 40, 28, 0x0a1520, 0.8)
        .setStrokeStyle(1, 0x2a4a6f, 0.6).setScrollFactor(0).setDepth(depth + 2);
      const weaponStr = weapons.map(w => {
        const name = (w.baseType || w.type).replace(/_/g, " ");
        return `${name} Lv.${w.level}`;
      }).join("  |  ");
      const weaponBar = this.add.text(centerX, barY, weaponStr, {
        fontFamily: "ZpixOne", fontSize: "12px", color: "#8ab8dd"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 3);
      optionObjects.push(barBg, weaponBar);
    }

    this.levelUpUi = [overlay, panel, panelInner, title, subtitle, ...optionObjects];
  }

  handleLevelUpInput() {
    const indexes = [this.keys.meta1, this.keys.meta2, this.keys.meta3];
    for (let i = 0; i < indexes.length; i += 1) {
      if (Phaser.Input.Keyboard.JustDown(indexes[i])) {
        const action = this.levelUpOptionActions[i];
        if (action) {
          action();
        }
      }
    }
  }

  openPauseMenu() {
    if (this.isPaused || this.isGameOver || this.isLeveling || this.isWeaponSelecting) {
      return;
    }
    this.isPaused = true;
    this.setDomHudVisible(false);
    this.setDomTouchControlsVisible(false);
    this.physics.pause();
    this.weaponSystem?.pause?.();
    this.director?.pause?.();
    this.player.body?.setVelocity(0, 0);

    const cx = 640;
    const cy = 360;
    const pw = 520;
    const ph = 440;
    const d = RENDER_DEPTH.MENUS + 10;
    const uiObjs = [];

    const backdrop = this.add.rectangle(cx, cy, 1280, 720, 0x000000, 0.55).setScrollFactor(0).setDepth(d);
    const panel = this.add.rectangle(cx, cy, pw, ph, 0x10203a, 0.96).setStrokeStyle(3, 0x5ca7ff, 0.96).setScrollFactor(0).setDepth(d + 1);
    const panelInner = this.add.rectangle(cx, cy, pw - 14, ph - 14, 0x0b1830, 0.94).setStrokeStyle(1, 0x3a7abf, 0.88).setScrollFactor(0).setDepth(d + 1);

    const title = this.add.text(cx, cy - ph / 2 + 24, "游戏暂停", {
      fontFamily: "ZpixOne", fontSize: "30px", color: "#f8fbff", stroke: "#102640", strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 2);

    // Stats section (left side)
    const statsX = cx - pw / 2 + 20;
    const statsW = pw / 2 - 30;
    let sy = cy - ph / 2 + 58;

    const addStatLine = (label, value, color = "#c8ddef") => {
      uiObjs.push(
        this.add.text(statsX, sy, label, { fontFamily: "ZpixOne", fontSize: "12px", color: "#7a9abf" }).setScrollFactor(0).setDepth(d + 2),
        this.add.text(statsX + statsW, sy, String(value), { fontFamily: "ZpixOne", fontSize: "12px", color }).setOrigin(1, 0).setScrollFactor(0).setDepth(d + 2)
      );
      sy += 18;
    };

    const addSectionHeader = (text) => {
      uiObjs.push(
        this.add.text(statsX, sy, text, { fontFamily: "ZpixOne", fontSize: "13px", color: "#5ca7ff", fontStyle: "bold" }).setScrollFactor(0).setDepth(d + 2)
      );
      sy += 18;
    };

    // Run stats
    addSectionHeader("— 运行数据 —");
    const totalSec = Math.floor(this.runTimeMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    addStatLine("存活时间", `${min}:${String(sec).padStart(2, "0")}`);
    addStatLine("击杀数", this.totalKills);
    addStatLine("当前等级", this.level);
    addStatLine("最大连击", `x${this.maxKillCombo}`);
    sy += 6;

    // Player stats
    addSectionHeader("— 玩家属性 —");
    addStatLine("生命", `${this.player.hp}/${this.player.maxHp}`, "#ff8866");
    addStatLine("移动速度", this.player.speed, "#66ff88");
    addStatLine("拾取范围", Math.round(this.player.pickupRadius + (this.level - 1) * 2), "#cc88ff");
    if (this.player.damageReduction > 0) addStatLine("伤害减免", `${Math.round(this.player.damageReduction * 100)}%`, "#aaaaff");
    if (this.player.armorFlat > 0) addStatLine("护甲", `-${this.player.armorFlat}`, "#ccccff");
    sy += 6;

    // Passives
    const passives = Object.keys(this.player.passives || {});
    if (passives.length > 0) {
      addSectionHeader("— 被动道具 —");
      passives.forEach(p => {
        const info = LEVEL_UP_UPGRADES.find(u => u.passiveKey === p);
        addStatLine(info?.label || p, "✓", "#88ff88");
      });
    }

    // Weapons section (right side)
    const wx = cx + 10;
    const ww = pw / 2 - 30;
    let wy = cy - ph / 2 + 58;

    const weapons = this.player.weapons || [];
    const addWeaponHeader = (text) => {
      uiObjs.push(
        this.add.text(wx, wy, text, { fontFamily: "ZpixOne", fontSize: "13px", color: "#5ca7ff", fontStyle: "bold" }).setScrollFactor(0).setDepth(d + 2)
      );
      wy += 18;
    };

    addWeaponHeader("— 武器 —");
    weapons.forEach(w => {
      const name = (w.baseType || w.type).replace(/_/g, " ");
      const dmg = this.weaponSystem?.getScaledWeaponDamage?.(w) ?? w.damage;
      const cd = this.weaponSystem?.getEffectiveCooldownMs?.(w) ?? w.cooldownMs;
      const evoTag = w.evolved ? " ✦" : "";
      uiObjs.push(
        this.add.text(wx, wy, `${name}${evoTag}`, { fontFamily: "ZpixOne", fontSize: "12px", color: w.evolved ? "#ffdd66" : "#c8ddef" }).setScrollFactor(0).setDepth(d + 2),
        this.add.text(wx + ww, wy, `Lv.${w.level}  DMG:${dmg}  CD:${cd}ms`, { fontFamily: "ZpixOne", fontSize: "11px", color: "#7a9abf" }).setOrigin(1, 0).setScrollFactor(0).setDepth(d + 2)
      );
      wy += 18;
    });

    // Evolution hints
    const evoRules = WEAPON_EVOLUTION_RULES.filter(r => {
      const owned = weapons.find(w => (w.baseType || w.type) === r.weapon);
      return owned && !owned.evolved;
    });
    if (evoRules.length > 0) {
      wy += 6;
      addWeaponHeader("— 进化 —");
      evoRules.forEach(r => {
        const owned = weapons.find(w => (w.baseType || w.type) === r.weapon);
        const hasPassive = this.player.hasPassive(r.requiredPassive);
        const levelOk = owned.level >= r.level;
        const status = hasPassive && levelOk ? "✓ 就绪" : `Lv.${owned.level}/${r.level} ${hasPassive ? "✓被动" : "✗被动"}`;
        const info = LEVEL_UP_UPGRADES.find(u => u.passiveKey === r.requiredPassive);
        uiObjs.push(
          this.add.text(wx, wy, `${r.weapon} → ${r.evolution}`, { fontFamily: "ZpixOne", fontSize: "11px", color: hasPassive && levelOk ? "#88ff88" : "#8899aa" }).setScrollFactor(0).setDepth(d + 2),
          this.add.text(wx + ww, wy, status, { fontFamily: "ZpixOne", fontSize: "10px", color: hasPassive && levelOk ? "#88ff88" : "#667788" }).setOrigin(1, 0).setScrollFactor(0).setDepth(d + 2)
        );
        wy += 16;
      });
    }

    // Buttons (bottom)
    const btnY = cy + ph / 2 - 70;
    const resumeBtn = this.add.rectangle(cx - 80, btnY, 140, 44, 0x1a324f, 1).setStrokeStyle(2, 0x6ab8ff, 1).setScrollFactor(0).setDepth(d + 2).setInteractive({ useHandCursor: true });
    const resumeLabel = this.add.text(cx - 80, btnY, "继续游戏", {
      fontFamily: "ZpixOne", fontSize: "20px", color: "#ffffff", stroke: "#0f1c2f", strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 3).setInteractive({ useHandCursor: true });

    const quitBtn = this.add.rectangle(cx + 80, btnY, 140, 44, 0x2a1a1a, 1).setStrokeStyle(2, 0xff6666, 1).setScrollFactor(0).setDepth(d + 2).setInteractive({ useHandCursor: true });
    const quitLabel = this.add.text(cx + 80, btnY, "返回主菜单", {
      fontFamily: "ZpixOne", fontSize: "20px", color: "#ffaaaa", stroke: "#0f1c2f", strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 3).setInteractive({ useHandCursor: true });

    const bgmLabel = this.bgmEnabled ? "BGM: ON" : "BGM: OFF";
    const bgmBtn = this.add.rectangle(cx - 80, btnY + 50, 120, 32, 0x1a2a3f, 1).setStrokeStyle(1, 0x5ca7ff, 0.8).setScrollFactor(0).setDepth(d + 2).setInteractive({ useHandCursor: true });
    const bgmText = this.add.text(cx - 80, btnY + 50, bgmLabel, {
      fontFamily: "ZpixOne", fontSize: "14px", color: "#a8c8e8", stroke: "#0d1a2d", strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 3);

    const settingsBtn = this.add.rectangle(cx + 80, btnY + 50, 120, 32, 0x1a2a3f, 1).setStrokeStyle(1, 0xffd866, 0.8).setScrollFactor(0).setDepth(d + 2).setInteractive({ useHandCursor: true });
    const settingsLabel = this.add.text(cx + 80, btnY + 50, "设置", {
      fontFamily: "ZpixOne", fontSize: "14px", color: "#ffd866", stroke: "#0d1a2d", strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 3);

    const escHint = this.add.text(cx, cy + ph / 2 - 12, "按 ESC / P 继续", {
      fontFamily: "ZpixOne", fontSize: "12px", color: "#5a7a9f", stroke: "#0d1a2d", strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 2);

    const onResume = () => this.closePauseMenu();
    resumeBtn.on("pointerdown", onResume);
    resumeLabel.on("pointerdown", onResume);

    const onQuit = () => {
      this.closePauseMenu();
      this.finalizeMetaRun();
      this.scene.stop();
      this.scene.start("MainMenuScene");
    };
    quitBtn.on("pointerdown", onQuit);
    quitLabel.on("pointerdown", onQuit);

    const onBgmToggle = () => {
      this.bgmEnabled = !this.bgmEnabled;
      bgmText.setText(this.bgmEnabled ? "BGM: ON" : "BGM: OFF");
      if (this.bgmEnabled) { this.startBgm(); } else { this.stopBgm(); }
    };
    bgmBtn.on("pointerdown", onBgmToggle);
    bgmText.on("pointerdown", onBgmToggle);

    const onSettings = () => {
      this.closePauseMenu();
      if (typeof window !== "undefined" && window.__forgeduelOpenSettings) {
        window.__forgeduelOpenSettings();
      }
    };
    settingsBtn.on("pointerdown", onSettings);
    settingsLabel.on("pointerdown", onSettings);

    this.pauseUi = [backdrop, panel, panelInner, title, resumeBtn, resumeLabel, quitBtn, quitLabel, bgmBtn, bgmText, settingsBtn, settingsLabel, escHint, ...uiObjs];
  }

  closePauseMenu() {
    if (!this.isPaused) {
      return;
    }
    this.isPaused = false;
    this.pauseUi.forEach((obj) => obj?.destroy?.());
    this.pauseUi = [];
    this.setDomHudVisible(true);
    this.setDomTouchControlsVisible(true);
    if (!this.isGameOver && !this.isLeveling && !this.isWeaponSelecting) {
      this.physics.resume();
      this.weaponSystem?.resume?.();
      this.director?.resume?.();
    }
  }

  handlePauseInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.pause) || Phaser.Input.Keyboard.JustDown(this.keys.pauseAlt)) {
      this.closePauseMenu();
    }
  }

  startBgm() {
    if (!this.bgmEnabled || !this.sound || !this.sound.context) {
      return;
    }
    if (this.bgmNodes) {
      return;
    }

    try {
      const ctx = this.sound.context;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      // Create a low ambient drone with subtle movement
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(55, ctx.currentTime); // Low A
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(82.4, ctx.currentTime); // Low E
      osc3.type = "triangle";
      osc3.frequency.setValueAtTime(110, ctx.currentTime); // A octave up

      // Subtle LFO for movement
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(0.15, ctx.currentTime);
      lfoGain.gain.setValueAtTime(3, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.Q.setValueAtTime(1, ctx.currentTime);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.035 * (this.settingsBgmVol ?? 0.6), ctx.currentTime + 2);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc3.start();
      lfo.start();

      this.bgmNodes = { osc1, osc2, osc3, lfo, gainNode, filter };
    } catch (_) {
      // Audio not available
    }
  }

  stopBgm() {
    if (!this.bgmNodes) {
      return;
    }
    try {
      const ctx = this.sound?.context;
      if (ctx) {
        this.bgmNodes.gainNode.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        const nodes = this.bgmNodes;
        setTimeout(() => {
          try {
            nodes.osc1.stop();
            nodes.osc2.stop();
            nodes.osc3.stop();
            nodes.lfo.stop();
          } catch (_) {}
        }, 600);
      }
    } catch (_) {}
    this.bgmNodes = null;
  }

  openWeaponSelection() {
    if (this.isWeaponSelecting || this.isGameOver) {
      return;
    }

    this.isWeaponSelecting = true;
    this.weaponSelectionActions = [];
    this.physics.pause();
    this.player.body?.setVelocity(0, 0);
    this.applyHudModalFocus(true);
    try {
      const canvasW = 1280;
      const canvasH = 720;
      const centerX = canvasW / 2;
      const panelWidth = 400;
      const panelHeight = 400;
      const panelTop = Math.max(10, (canvasH - panelHeight) / 2);
      const centerY = panelTop + panelHeight / 2;
      const panel = this.add
      .rectangle(centerX, centerY, panelWidth, panelHeight, 0x22150d, 0.96)
      .setStrokeStyle(3, 0xb48855, 0.96)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.MENUS + 1);
      const panelInset = this.add
      .rectangle(centerX, centerY, panelWidth - 28, panelHeight - 30, 0x342214, 0.94)
      .setStrokeStyle(1, 0x6d4a31, 0.88)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.MENUS + 2);
      const headerBottom = panelTop + 100;
      const { titleChip, title } = this.createModalTitle(
      centerX,
      panelTop + 38,
      "选择初始武器",
      {
        fontSize: 22,
        minWidth: 220,
        badgeDepth: RENDER_DEPTH.MENUS + 3,
        textDepth: RENDER_DEPTH.MENUS + 4
      }
    );

      const coinText = this.add
      .text(centerX, panelTop + 66, `金币: ${this.metaData.currency}`, {
        fontFamily: "ZpixOne",
        fontSize: "14px",
        color: "#e2c388",
        stroke: "#2e170d",
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.MENUS + 4);

      const subtitle = this.add
      .text(centerX, headerBottom, "选择一把武器开始游戏", {
        fontFamily: "ZpixOne",
        fontSize: "12px",
        color: "#d8bf95",
        stroke: "#2a1a10",
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.MENUS + 4);

      const statusTextY = centerY + panelHeight / 2 - 18;
      const statusText = this.add
      .text(centerX, statusTextY, "", {
        fontFamily: "ZpixOne",
        fontSize: "13px",
        color: "#ebd7b7",
        stroke: "#2e170d",
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.MENUS + 4);

      const optionRows = [];
      const optAreaTop = headerBottom + 14;
      const optAreaBottom = statusTextY - 14;
      const optAreaHeight = optAreaBottom - optAreaTop;
      const optionCount = START_WEAPON_OPTIONS.length;
      const optionSpacing = Math.min(54, (optAreaHeight - 44) / Math.max(1, optionCount - 1));
      const optionsStartY = optAreaTop + 22;
      const optBoxW = panelWidth - 48;
      const optInlayW = optBoxW - 12;
      const iconOffsetX = centerX - optBoxW / 2 + 22;
      const textOffsetX = iconOffsetX + 34;
      START_WEAPON_OPTIONS.forEach((option, index) => {
      const y = optionsStartY + index * optionSpacing;
      const box = this.add
        .rectangle(centerX, y, optBoxW, 44, 0x4a2f1d, 0.98)
        .setStrokeStyle(2, 0xb48855, 0.92)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(RENDER_DEPTH.MENUS + 4);
      const boxInlay = this.add
        .rectangle(centerX, y, optInlayW, 34, 0xead7b7, 0.88)
        .setStrokeStyle(1, 0x6d4a31, 0.6)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(RENDER_DEPTH.MENUS + 5);
      const weaponIcon = this.add
        .image(iconOffsetX, y, this.getWeaponIconKey(option.weaponType))
        .setDisplaySize(22, 22)
        .setScrollFactor(0)
        .setDepth(RENDER_DEPTH.MENUS + 6);
      const heading = this.add
        .text(textOffsetX, y - 9, `[${index + 1}] ${option.label}`, {
          fontFamily: "ZpixOne",
          fontSize: "14px",
          color: "#2e170d",
          stroke: "#f7e8cc",
          strokeThickness: 1
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(RENDER_DEPTH.MENUS + 6);
      const detail = this.add
        .text(textOffsetX, y + 9, "", {
          fontFamily: "ZpixOne",
          fontSize: "10px",
          color: "#6a4d36",
          stroke: "#f7e8cc",
          strokeThickness: 1
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(RENDER_DEPTH.MENUS + 6);

      const refreshOption = () => {
        const unlocked = Boolean(this.weaponUnlocks[option.id]);
        if (unlocked) {
          detail.setText(`已解锁 · 点击选择`);
          detail.setColor("#56714b");
        } else {
          detail.setText(`锁定 · 解锁需要 ${option.unlockCost} 金币`);
          detail.setColor("#8b5d37");
        }
      };

      const choose = () => {
        const unlocked = Boolean(this.weaponUnlocks[option.id]);
        if (!unlocked) {
          const spent = this.trySpendMetaCoins(option.unlockCost);
          if (!spent) {
            statusText.setText("金币不足，无法解锁此武器。");
            statusText.setColor("#ffb4b4");
            return;
          }
          this.weaponUnlocks[option.id] = true;
          this.saveWeaponUnlocks(this.weaponUnlocks);
          coinText.setText(`金币: ${this.metaData.currency}`);
          refreshOption();
        }
        this.selectStartWeapon(option);
      };

      box.on("pointerdown", choose);
      boxInlay.on("pointerdown", choose);
      weaponIcon.setInteractive({ useHandCursor: true }).on("pointerdown", choose);
      heading.setInteractive({ useHandCursor: true }).on("pointerdown", choose);
      detail.setInteractive({ useHandCursor: true }).on("pointerdown", choose);
      refreshOption();
        optionRows.push(box, boxInlay, weaponIcon, heading, detail);
        this.weaponSelectionActions.push(choose);
      });

      this.weaponSelectionUi = [panel, panelInset, titleChip, title, coinText, subtitle, statusText, ...optionRows];
    } catch (error) {
      console.error("[GameScene] Failed to open weapon selection modal, fallback to default weapon.", error);
      this.forceCloseWeaponSelectionWithFallback();
    }
  }

  handleWeaponSelectionInput() {
    const indexes = [this.keys.meta1, this.keys.meta2, this.keys.meta3, this.keys.meta4];
    for (let i = 0; i < indexes.length; i += 1) {
      if (Phaser.Input.Keyboard.JustDown(indexes[i])) {
        const action = this.weaponSelectionActions[i];
        if (action) {
          action();
        }
      }
    }
  }

  selectStartWeapon(option) {
    if (!option || this.selectedStartWeaponId) {
      return;
    }

    const added = this.weaponSystem.addWeapon(option.weaponType);
    if (!added && this.player.weapons.length === 0) {
      this.weaponSystem.addWeapon("dagger");
    }
    this.selectedStartWeaponId = option.id;
    this.closeWeaponSelection();
    this.showHudAlert(`${option.label.toUpperCase()} READY`, 1000);
  }

  closeWeaponSelection() {
    this.weaponSelectionUi.forEach((obj) => obj.destroy());
    this.weaponSelectionUi = [];
    this.weaponSelectionActions = [];
    this.isWeaponSelecting = false;
    this.applyHudModalFocus(false);

    if (!this.isGameOver && !this.isLeveling) {
      this.physics.resume();
    }
  }

  forceCloseWeaponSelectionWithFallback() {
    this.weaponSelectionUi.forEach((obj) => obj?.destroy?.());
    this.weaponSelectionUi = [];
    this.weaponSelectionActions = [];
    this.isWeaponSelecting = false;
    this.applyHudModalFocus(false);
    if (!this.player?.weapons?.length) {
      this.weaponSystem?.addWeapon?.("dagger");
    }
    if (!this.isGameOver && !this.isLeveling) {
      this.physics.resume();
    }
  }

  applyLevelUpUpgrade(upgrade) {
    if (!upgrade) {
      return;
    }

    // Passive cards
    if (upgrade.isPassive && upgrade.passiveKey) {
      if (this.player.hasPassive(upgrade.passiveKey)) {
        return; // Already have this passive
      }
      this.player.addPassive(upgrade.passiveKey);

      // Apply passive effects
      if (upgrade.passiveKey === "ember_core") {
        this.weaponSystem.addGlobalDamagePercent(upgrade.value, "fireball");
        this.showHudAlert("EMBER CORE", 1200);
      } else if (upgrade.passiveKey === "blade_sigil") {
        this.weaponSystem.addGlobalDamagePercent(upgrade.value, "dagger");
        this.showHudAlert("BLADE SIGIL", 1200);
      } else if (upgrade.passiveKey === "iron_shell") {
        this.player.damageReduction = (this.player.damageReduction || 0) + upgrade.value;
        this.showHudAlert("IRON SHELL", 1200);
      } else if (upgrade.passiveKey === "swift_feet") {
        this.player.speed = Math.round(this.player.speed * (1 + upgrade.value));
        this.showHudAlert("SWIFT FEET", 1200);
      } else if (upgrade.passiveKey === "wings") {
        this.weaponSystem.addGlobalRangePercent(upgrade.value);
        this.showHudAlert("WINGS", 1200);
      } else if (upgrade.passiveKey === "armor") {
        this.player.armorFlat += upgrade.value;
        this.showHudAlert("ARMOR", 1200);
      } else if (upgrade.passiveKey === "hollow_heart") {
        this.player.maxHp = Math.round(this.player.maxHp * (1 + upgrade.value));
        this.player.hp = this.player.maxHp;
        this.showHudAlert("HOLLOW HEART", 1200);
      } else if (upgrade.passiveKey === "attractorb") {
        this.player.pickupRadius = Math.round(this.player.pickupRadius * (1 + upgrade.value));
        this.showHudAlert("ATTRACTORB", 1200);
      } else if (upgrade.passiveKey === "frost_shard") {
        this.weaponSystem.addGlobalDamagePercent(upgrade.value, "frost");
        this.showHudAlert("FROST SHARD", 1200);
      }
      return;
    }

    if (upgrade.id === "weapon_damage") {
      this.weaponSystem.addGlobalDamagePercent(upgrade.value);
      return;
    }
    if (upgrade.id === "attack_speed") {
      this.attackIntervalMs = Math.max(180, Math.floor(this.attackIntervalMs * (1 - upgrade.value)));
      this.weaponSystem.addAttackSpeedPercent(upgrade.value);
      return;
    }
    if (upgrade.id === "projectile_count") {
      this.weaponSystem.addProjectileCount(upgrade.value);
      return;
    }
    if (upgrade.id === "movement_speed") {
      this.player.speed += upgrade.value;
      return;
    }
    if (upgrade.id === "pickup_radius") {
      this.player.pickupRadius += upgrade.value;
    }
  }

  pullXpOrbsToPlayer() {
    const basePickupRadius = Math.max(0, this.player.pickupRadius || 0);
    const levelBonusRadius = Math.max(0, this.level - 1) * XP_MAGNET_RADIUS_PER_LEVEL;
    const pickupRadius = basePickupRadius + levelBonusRadius;
    if (pickupRadius <= 0) {
      return;
    }

    const nowMs = this.time.now;
    this.xpOrbs.getChildren().forEach((orb) => {
      if (!orb.active || !orb.body) {
        return;
      }

      const dx = this.player.x - orb.x;
      const dy = this.player.y - orb.y;
      const distance = Math.hypot(dx, dy);
      const baseScale = Number(orb.getData("baseScale")) || XP_ORB_BASE_SCALE;
      const baseAlpha = Number(orb.getData("baseAlpha")) || XP_ORB_BASE_ALPHA;
      const pulse = 1 + Math.sin((nowMs + orb.x * 0.3 + orb.y * 0.17) / XP_ORB_PULSE_SPEED_MS) * XP_ORB_PULSE_AMPLITUDE;
      if (distance > pickupRadius) {
        orb.body.setVelocity(0, 0);
        orb.setScale(baseScale * pulse);
        orb.setAlpha(baseAlpha);
        return;
      }

      const attractRatio = 1 - Phaser.Math.Clamp(distance / pickupRadius, 0, 1);
      const magnetScaleBoost = Number(orb.getData("magnetScaleBoost")) || XP_ORB_MAGNET_SCALE_BOOST;
      orb.setScale((baseScale + attractRatio * magnetScaleBoost) * pulse);
      orb.setAlpha(Math.min(1, baseAlpha + attractRatio * 0.08));

      if (distance <= XP_ORB_MAGNET_DIRECT_PULL_RADIUS) {
        orb.x += dx * XP_ORB_MAGNET_DIRECT_PULL_FACTOR;
        orb.y += dy * XP_ORB_MAGNET_DIRECT_PULL_FACTOR;
      }

      const nx = distance > 0.0001 ? dx / distance : 0;
      const ny = distance > 0.0001 ? dy / distance : 0;
      const pullStrength = Phaser.Math.Linear(XP_ORB_MAGNET_MIN_PULL, XP_ORB_MAGNET_MAX_PULL, attractRatio);
      orb.body.setVelocity(nx * pullStrength, ny * pullStrength);
    });
  }

  closeLevelUpChoices() {
    this.levelUpUi.forEach((obj) => obj.destroy());
    this.levelUpUi = [];
    this.levelUpOptionActions = [];

    this.isLeveling = false;
    this.applyHudModalFocus(false);
    this.director?.resume?.();
    this.weaponSystem?.resume?.();
    this.physics.resume();

    if (this.pendingLevelUps > 0) {
      this.openLevelUpChoices();
    }
  }

  resolveShipKey() {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem(SHIP_STORAGE_KEY);
      if (stored && SHIP_CONFIGS[stored]) {
        return stored;
      }
    }
    return "striker";
  }

  resolveFighterKey() {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem(FIGHTER_STORAGE_KEY);
      if (stored && FIGHTER_CONFIGS[stored]) {
        return stored;
      }
    }
    return "scout";
  }

  checkFighterEvolution() {
    if (!this.fighterConfig || this.fighterEvolved) {
      return;
    }
    if (this.level < this.fighterConfig.evolutionLevel) {
      return;
    }

    this.fighterEvolved = true;
    const evo = this.fighterConfig.evolution;

    // Apply evolution bonuses
    this.player.maxHp += evo.hpBonus;
    this.player.hp = Math.min(this.player.hp + evo.hpBonus, this.player.maxHp);
    this.player.speed += evo.speedBonus;
    if (evo.tint) {
      this.player.setTint(evo.tint);
    }

    // Apply evolution passive effects
    const fx = evo.passiveEffect;
    if (fx) {
      if (fx.dashCooldownMultiplier) {
        this.player.dashCooldownMs = Math.round(this.player.dashCooldownMs * fx.dashCooldownMultiplier);
        this.player.dashChargeRate = this.player.dashGaugeMax / (this.player.dashCooldownMs / 1000);
      }
      if (fx.damageCooldownBonusMs) {
        this.player.damageCooldownMs += fx.damageCooldownBonusMs;
      }
      if (fx.pickupRadiusMultiplier) {
        this.player.pickupRadius = Math.round(this.player.pickupRadius * fx.pickupRadiusMultiplier);
      }
      if (fx.damageReduction) {
        this.player.damageReduction = (this.player.damageReduction || 0) + fx.damageReduction;
      }
      if (fx.xpMultiplier) {
        this.metaXpMultiplier = (this.metaXpMultiplier || 1) * fx.xpMultiplier;
      }
      if (fx.meleeDamageMultiplier) {
        this.player.meleeDamageMultiplier = (this.player.meleeDamageMultiplier || 1) * fx.meleeDamageMultiplier;
      }
      if (fx.orbitBladeCount) {
        // Add extra orbit blades
        const orbitWeapon = this.player.weapons.find((w) => w.type === "orbit_blades");
        if (orbitWeapon) {
          orbitWeapon.orbitBladeCount = (orbitWeapon.orbitBladeCount || 3) + fx.orbitBladeCount;
          this.weaponSystem?.rebuildOrbitBlades?.(orbitWeapon);
        }
      }
    }

    // Evolution visual feedback (reuse weapon evolution pattern)
    this.triggerEvolutionFeedback(evo.label);
  }

  triggerEvolutionFeedback(label) {
    // Slow-mo flash
    if (this.evolutionSlowMoRestoreHandle) {
      this.time.removeEvent(this.evolutionSlowMoRestoreHandle);
    }
    this.evolutionSlowMoActive = true;
    this.time.timeScale = 0.26;
    this.evolutionSlowMoRestoreHandle = this.time.delayedCall(180, () => {
      this.time.timeScale = 1;
      this.evolutionSlowMoActive = false;
      this.evolutionSlowMoRestoreHandle = null;
    });

    // Camera flash + shake
    this.cameras.main.flash(200, 255, 255, 200);
    this.shakeScreen(200, 0.008);

    // Particle burst
    if (this.evolutionEmitter) {
      this.evolutionEmitter.explode(28, this.player.x, this.player.y);
    }

    // HUD alert
    this.showHudAlert(`${label} EVOLVED!`, 2200);
  }

  applyMetaBonusesForRun() {
    const bonuses = this.metaSystem.getRunBonuses();
    const shopUpgrades = this.loadShopUpgradeLevels();
    this.metaXpMultiplier = bonuses.xpMultiplier;

    this.player.maxHp += bonuses.maxHpFlat;
    this.player.hp = this.player.maxHp;
    this.player.speed += bonuses.speedFlat;

    const moveSpeedMultiplier = 1 + shopUpgrades.movement_speed * 0.05;
    this.player.speed = Math.round(this.player.speed * moveSpeedMultiplier);

    const xpMultiplier = 1 + shopUpgrades.xp_gain * 0.1;
    this.metaXpMultiplier *= xpMultiplier;

    const dashCooldownMultiplier = Math.max(0.35, 1 - shopUpgrades.dash_cooldown * 0.05);
    this.player.dashCooldownMs = Math.max(700, Math.round(this.player.dashCooldownMs * dashCooldownMultiplier));
    this.player.dashChargeRate = this.player.dashGaugeMax / (this.player.dashCooldownMs / 1000);

    if (bonuses.startingWeaponBonus > 0) {
      this.weaponSystem.addWeapon("lightning");
    }
  }

  finalizeMetaRun() {
    if (this.metaSettled) {
      return;
    }

    this.metaSettled = true;
    this.lastRunMetaCurrency = this.calculateRunCoinReward();
    this.metaSystem.addCurrency(this.lastRunMetaCurrency);
    this.metaData = this.metaSystem.getData();
    this.saveCoinBank(this.metaData.currency);
    this.runMetaCurrency = 0;
  }

  triggerGameOver() {
    if (this.isGameOver) {
      return;
    }

    if (this.gameMode === "coop" && this.networkManager) {
      if (!this._hasSentPlayerDied) {
        this._hasSentPlayerDied = true;
        this.networkManager.sendPlayerDied();
      }
      const allDead = this.player.isDead() &&
        (!this.playerSync || this.playerSync.isAllDead());
      if (!allDead) {
        this.player.body?.setVelocity(0, 0);
        this.showHudAlert("等待队友救援...", 3000);
        return;
      }
      if (!this._hasSentGameOver) {
        this._hasSentGameOver = true;
        this.networkManager.sendGameOver({
          timeSurvivedMs: this.runTimeMs,
          enemiesKilled: this.totalKills
        });
      }
    }

    this.isGameOver = true;
    this.stopBgm();
    this.physics.pause();
    this.input.enabled = false;
    this.player.body?.setVelocity(0, 0);
    this.updateBestTimeRecord(this.runTimeMs);
    this.finalizeMetaRun();

    // Update ship unlock stats
    updateShipStats({
      timeSurvivedMs: this.runTimeMs,
      enemiesKilled: this.totalKills,
      levelReached: this.level
    });

    // Dramatic death sequence
    this.playDeathSequence(() => {
      this.refreshGameOverText();
      this.gameOverText.setVisible(false);
      if (this.gameOverRestartButton && this.gameOverRestartLabel) {
        this.gameOverRestartButton.setVisible(false);
        this.gameOverRestartLabel.setVisible(false);
      }

      const summaryPayload = {
        timeSurvivedMs: this.runTimeMs,
        enemiesKilled: this.totalKills,
        maxCombo: this.maxKillCombo,
        levelReached: this.level,
        coinsEarned: this.lastRunMetaCurrency,
        totalCoins: this.metaData.currency
      };
      if (this.scene.isActive("RunSummaryScene")) {
        this.scene.stop("RunSummaryScene");
      }
      this.scene.launch("RunSummaryScene", summaryPayload);
      this.scene.bringToTop("RunSummaryScene");
    });
  }

  playDeathSequence(onComplete) {
    const cx = 640;
    const cy = 360;
    const depth = RENDER_DEPTH.HUD + 20;

    // Red flash overlay
    const redFlash = this.add.rectangle(cx, cy, 1280, 720, 0xff0000, 0)
      .setScrollFactor(0).setDepth(depth);

    // "YOU DIED" text
    const deathText = this.add.text(cx, cy - 30, "YOU DIED", {
      fontFamily: "ZpixOne", fontSize: "64px", color: "#ff2222",
      stroke: "#000000", strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 0, color: "#ff0000", blur: 20, fill: true }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1).setAlpha(0).setScale(0.3);

    // Subtitle
    const subText = this.add.text(cx, cy + 30, `击杀: ${this.totalKills}  等级: ${this.level}  存活: ${this.formatRunTime(this.runTimeMs)}`, {
      fontFamily: "ZpixOne", fontSize: "18px", color: "#cc8888",
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1).setAlpha(0);

    // Kill particles burst
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 100 + Math.random() * 200;
      const particle = this.add.circle(cx, cy, 3 + Math.random() * 4, 0xff2222)
        .setScrollFactor(0).setDepth(depth + 1).setAlpha(0.9);
      this.tweens.add({
        targets: particle,
        x: cx + Math.cos(angle) * speed,
        y: cy + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 800 + Math.random() * 400,
        ease: "Quad.easeOut",
        onComplete: () => particle.destroy()
      });
    }

    // Screen shake
    this.shakeScreen(400, 0.012);

    // Sequence: red flash in → text pop → hold → fade out → callback
    this.tweens.add({
      targets: redFlash,
      alpha: 0.4,
      duration: 200,
      ease: "Quad.easeIn",
      onComplete: () => {
        // Flash white briefly
        this.tweens.add({
          targets: redFlash,
          alpha: 0.15,
          duration: 100,
          yoyo: true,
          onComplete: () => {
            // Settle to dark red
            this.tweens.add({
              targets: redFlash,
              alpha: 0.3,
              duration: 300
            });
          }
        });
      }
    });

    // Text pop in with overshoot
    this.time.delayedCall(200, () => {
      this.tweens.add({
        targets: deathText,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 400,
        ease: "Back.easeOut"
      });
    });

    // Subtitle fade in
    this.time.delayedCall(600, () => {
      this.tweens.add({
        targets: subText,
        alpha: 0.8,
        duration: 400
      });
    });

    // Play death sound
    this.playSfxTone({ wave: "sawtooth", startFreq: 200, endFreq: 80, duration: 0.3, gain: 0.06 });
    this.time.delayedCall(150, () => {
      this.playSfxTone({ wave: "sine", startFreq: 150, endFreq: 60, duration: 0.4, gain: 0.04 });
    });

    // Fade everything out and call callback
    this.time.delayedCall(2200, () => {
      this.tweens.add({
        targets: [redFlash, deathText, subText],
        alpha: 0,
        duration: 600,
        ease: "Quad.easeIn",
        onComplete: () => {
          redFlash.destroy();
          deathText.destroy();
          subText.destroy();
          if (onComplete) onComplete();
        }
      });
    });
  }

  handleGameOverInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.meta1)) {
      this.tryPurchaseMetaUpgrade("max_hp");
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.meta2)) {
      this.tryPurchaseMetaUpgrade("move_speed");
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.meta3)) {
      this.tryPurchaseMetaUpgrade("xp_gain");
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.meta4)) {
      this.tryPurchaseMetaUpgrade("starting_weapon");
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
      this.restartRun();
    }
  }

  restartRun() {
    this.stopBgm();
    if (this.scene.isActive("RunSummaryScene")) {
      this.scene.stop("RunSummaryScene");
    }
    this.scene.restart();
  }

  tryPurchaseMetaUpgrade(upgradeKey) {
    const result = this.metaSystem.purchaseUpgrade(upgradeKey);
    if (!result.success) {
      return;
    }

    this.metaData = this.metaSystem.getData();
    this.saveCoinBank(this.metaData.currency);
    this.refreshGameOverText();
  }

  refreshGameOverText() {
    const options = this.metaSystem.getUpgradeOptions();
    const formatCost = (option) => (option.isMaxed ? "MAX" : `${option.cost}C`);

    this.gameOverText.setText(
      [
        "GAME OVER",
        `COINS +${this.lastRunMetaCurrency}   BANK ${this.metaData.currency}`,
        `[1] Max HP Lv${options.max_hp.level} (${formatCost(options.max_hp)})`,
        `[2] Move Speed Lv${options.move_speed.level} (${formatCost(options.move_speed)})`,
        `[3] XP Gain Lv${options.xp_gain.level} (${formatCost(options.xp_gain)})`,
        `[4] Start Lightning Lv${options.starting_weapon.level} (${formatCost(options.starting_weapon)})`,
        "Press R to restart"
      ].join("\n")
    );
  }

  getAliveEnemyCount() {
    return this.enemies.getChildren().filter((enemy) => enemy.active).length;
  }

  hasActiveMiniBoss() {
    return this.enemies
      .getChildren()
      .some((enemy) => enemy?.active && (enemy.getData("archetype") === "mini_boss" || enemy.getData("bossVariant") === "mini"));
  }

  loadCoinBank() {
    if (typeof window === "undefined" || !window.localStorage) {
      return 0;
    }

    const raw = window.localStorage.getItem(META_COINS_STORAGE_KEY);
    if (raw === null || raw === undefined) {
      return 0;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.floor(parsed);
  }

  updateBestTimeRecord(timeMs) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    const safeTime = Math.max(0, Math.floor(Number(timeMs) || 0));
    try {
      const prev = Number(window.localStorage.getItem(BEST_TIME_STORAGE_KEY));
      const prevBest = Number.isFinite(prev) && prev > 0 ? Math.floor(prev) : 0;
      if (safeTime > prevBest) {
        window.localStorage.setItem(BEST_TIME_STORAGE_KEY, String(safeTime));
      }
    } catch (_error) {
      // Ignore storage failures to keep runtime stable.
    }
  }

  saveCoinBank(amount) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    try {
      window.localStorage.setItem(META_COINS_STORAGE_KEY, String(safeAmount));
      const rawMeta = window.localStorage.getItem(META_STORAGE_KEY);
      const parsedMeta = rawMeta ? JSON.parse(rawMeta) : {};
      const mergedMeta = {
        currency: safeAmount,
        maxHPBonus: Math.max(0, Math.floor(Number(parsedMeta?.maxHPBonus) || 0)),
        xpBonus: Math.max(0, Math.floor(Number(parsedMeta?.xpBonus) || 0)),
        speedBonus: Math.max(0, Math.floor(Number(parsedMeta?.speedBonus) || 0)),
        startingWeaponBonus: Math.max(0, Math.floor(Number(parsedMeta?.startingWeaponBonus) || 0))
      };
      window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(mergedMeta));
    } catch (_error) {
      // Ignore storage failures to keep runtime stable.
    }
  }

  syncCoinStorageWithMeta() {
    const storedCoins = this.loadCoinBank();
    const metaCoins = Math.max(0, Math.floor(this.metaData?.currency ?? 0));

    if (storedCoins > metaCoins) {
      this.metaSystem.addCurrency(storedCoins - metaCoins);
      this.metaData = this.metaSystem.getData();
      this.saveCoinBank(this.metaData.currency);
      return;
    }

    this.saveCoinBank(metaCoins);
  }

  trySpendMetaCoins(amount) {
    const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
    if (safeAmount <= 0) {
      return true;
    }
    const currentCoins = Math.max(0, Math.floor(this.metaData?.currency ?? 0));
    if (currentCoins < safeAmount) {
      return false;
    }

    const nextCoins = currentCoins - safeAmount;
    this.saveCoinBank(nextCoins);
    this.metaSystem = new MetaProgressionSystem();
    this.metaData = this.metaSystem.getData();
    return true;
  }

  calculateRunCoinReward() {
    const timeSurvivedSec = Math.max(0, Math.floor(this.runTimeMs / 1000));
    const timeReward = Math.floor(timeSurvivedSec / 10);
    const killReward = this.totalKills * 0.1;
    const bundleReward = Math.max(0, Math.floor(Number(this.runMetaCurrency) || 0));
    return Math.max(0, Math.round(timeReward + killReward + bundleReward));
  }

  recordPlayerDamage(amount) {
    const safeAmount = Math.max(0, Number(amount) || 0);
    if (safeAmount <= 0) {
      return;
    }
    const nowMs = this.time?.now ?? 0;
    this.performanceDamageEvents.push({ t: nowMs, amount: safeAmount });
    this.performanceDamageTotal += safeAmount;
    this.trimPerformanceMetrics(nowMs);
  }

  recordKillEvent() {
    const nowMs = this.time?.now ?? 0;
    this.performanceKillEvents.push(nowMs);
    this.performanceKillTotal += 1;
    this.trimPerformanceMetrics(nowMs);
  }

  trimPerformanceMetrics(nowMs) {
    const windowMs = this.director?.getAdaptiveWindowMs?.() ?? 10000;
    const threshold = nowMs - windowMs;

    while (this.performanceDamageEvents.length > 0 && this.performanceDamageEvents[0].t < threshold) {
      const expired = this.performanceDamageEvents.shift();
      this.performanceDamageTotal -= expired?.amount ?? 0;
    }
    while (this.performanceKillEvents.length > 0 && this.performanceKillEvents[0] < threshold) {
      this.performanceKillEvents.shift();
      this.performanceKillTotal -= 1;
    }

    this.performanceDamageTotal = Math.max(0, this.performanceDamageTotal);
    this.performanceKillTotal = Math.max(0, this.performanceKillTotal);
  }

  getPerformanceMetrics() {
    const nowMs = this.time?.now ?? 0;
    this.trimPerformanceMetrics(nowMs);
    const windowMs = this.director?.getAdaptiveWindowMs?.() ?? 10000;
    const windowSec = Math.max(1, windowMs / 1000);

    return {
      dps: this.performanceDamageTotal / windowSec,
      killRate: this.performanceKillTotal / windowSec
    };
  }

  loadWeaponUnlocks() {
    const defaults = {};
    START_WEAPON_OPTIONS.forEach((option) => {
      defaults[option.id] = Boolean(option.defaultUnlocked);
    });

    if (typeof window === "undefined" || !window.localStorage) {
      return defaults;
    }

    try {
      const raw = window.localStorage.getItem(WEAPON_UNLOCK_STORAGE_KEY);
      if (!raw) {
        this.saveWeaponUnlocks(defaults);
        return defaults;
      }

      const parsed = JSON.parse(raw);
      START_WEAPON_OPTIONS.forEach((option) => {
        const stored = parsed?.[option.id];
        if (typeof stored === "boolean") {
          defaults[option.id] = stored || option.defaultUnlocked;
        } else if (stored === 0 || stored === 1) {
          defaults[option.id] = Boolean(stored) || option.defaultUnlocked;
        }
      });
      return defaults;
    } catch (_error) {
      return defaults;
    }
  }

  saveWeaponUnlocks(unlocks) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    const sanitized = {};
    START_WEAPON_OPTIONS.forEach((option) => {
      const unlocked = Boolean(unlocks?.[option.id]) || option.defaultUnlocked;
      sanitized[option.id] = unlocked;
    });

    try {
      window.localStorage.setItem(WEAPON_UNLOCK_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (_error) {
      // Ignore storage failures to keep runtime stable.
    }
  }

  loadShopUpgradeLevels() {
    const fallback = {
      dash_cooldown: 0,
      xp_gain: 0,
      movement_speed: 0
    };
    if (typeof window === "undefined" || !window.localStorage) {
      return fallback;
    }

    try {
      const raw = window.localStorage.getItem(SHOP_UPGRADES_STORAGE_KEY);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw);
      return {
        dash_cooldown: Math.max(0, Math.floor(Number(parsed?.dash_cooldown) || 0)),
        xp_gain: Math.max(0, Math.floor(Number(parsed?.xp_gain) || 0)),
        movement_speed: Math.max(0, Math.floor(Number(parsed?.movement_speed) || 0))
      };
    } catch (_error) {
      return fallback;
    }
  }

  createGameplayHUD() {
    this.hudObjects.forEach((obj) => obj?.destroy?.());
    this.hudObjects = [];
    this.hud = null;

    const isMobile = this.sys.game.device.input.touch || window.innerWidth < 768;
    const scale = isMobile ? 0.7 : 1;
    const margin = 12 * scale;
    const lineSpacing = 16 * scale;
    const fontSize = Math.floor(14 * scale);
    const style = {
      fontFamily: "ZpixOne",
      fontSize: `${fontSize}px`,
      color: "#f7f3de",
      stroke: "#1c130e",
      strokeThickness: Math.max(1, Math.floor(2 * scale))
    };
    const labelStyle = {
      fontFamily: "ZpixOne",
      fontSize: `${Math.floor(10 * scale)}px`,
      color: "#d6c6a2",
      stroke: "#1c130e",
      strokeThickness: 1
    };

    this.hpText = this.add
      .text(margin, margin + lineSpacing * 0, "生命: 100/100", style)
      .setOrigin(0, 0)
      .setDepth(RENDER_DEPTH.HUD);
    this.expText = this.add
      .text(margin, margin + lineSpacing * 1, "等级 1 | 经验 0%", style)
      .setOrigin(0, 0)
      .setDepth(RENDER_DEPTH.HUD);
    const barWidth = 100 * scale;
    const barHeight = Math.max(4, 6 * scale);
    this.expBarBg = this.add
      .rectangle(margin, margin + 32 * scale, barWidth, barHeight, 0x2b1f16, 0.9)
      .setOrigin(0, 0)
      .setDepth(RENDER_DEPTH.HUD)
      .setStrokeStyle(1, 0x7b6047, 0.8);
    this.expBarFill = this.add
      .rectangle(margin, margin + 32 * scale, barWidth, barHeight, 0x6fd7ff, 0.95)
      .setOrigin(0, 0)
      .setDepth(RENDER_DEPTH.HUD);
    this.timeText = this.add
      .text(margin, margin + lineSpacing * 2, "时间: 00:00", style)
      .setOrigin(0, 0)
      .setDepth(RENDER_DEPTH.HUD);
    this.killText = this.add
      .text(margin, margin + lineSpacing * 3, "击杀: 0", style)
      .setOrigin(0, 0)
      .setDepth(RENDER_DEPTH.HUD);
    const weaponLabelX = margin + 110 * scale;
    const weaponLabelY = margin + 32 * scale;
    this.hudWeaponLabel = this.add
      .text(weaponLabelX, weaponLabelY, "武器", labelStyle)
      .setOrigin(0, 0)
      .setDepth(RENDER_DEPTH.HUD);
    this.hudWeaponSlotIcons = [];
    const slotCount = Math.max(1, this.player?.maxWeaponSlots ?? 3);
    const slotSize = Math.floor(22 * scale);
    const slotSpacing = Math.floor(30 * scale);
    const weaponAreaX = margin + 145 * scale;
    const weaponAreaY = margin + 32 * scale + slotSize * 0.3;
    for (let i = 0; i < slotCount; i += 1) {
      const slotX = weaponAreaX + i * slotSpacing;
      const slotY = weaponAreaY;
      const frame = this.add.rectangle(slotX, slotY, slotSize, slotSize, 0x1f1510, 0.86).setOrigin(0.5).setDepth(RENDER_DEPTH.HUD);
      frame.setStrokeStyle(1, 0x7b6047, 0.9);
      const iconSize = Math.floor(slotSize * 0.65);
      const icon = this.add
        .image(slotX, slotY, "proj_dagger")
        .setDisplaySize(iconSize, iconSize)
        .setAlpha(0.28)
        .setDepth(RENDER_DEPTH.HUD);
      const cdBarWidth = slotSize * 0.9;
      const cdBarHeight = Math.max(2, 3 * scale);
      const cdBarBg = this.add.rectangle(slotX - slotSize * 0.45, slotY + slotSize * 0.55, cdBarWidth, cdBarHeight, 0x1a1208, 0.85)
        .setOrigin(0, 0.5).setDepth(RENDER_DEPTH.HUD);
      const cdBarFill = this.add.rectangle(slotX - slotSize * 0.45, slotY + slotSize * 0.55, cdBarWidth, cdBarHeight, 0x44aaff, 0.9)
        .setOrigin(0, 0.5).setDepth(RENDER_DEPTH.HUD);
      this.hudWeaponSlotIcons.push({ frame, icon, cdBarBg, cdBarFill });
    }
    this.hudObjects = [this.hpText, this.expText, this.expBarBg, this.expBarFill, this.timeText, this.killText, this.hudWeaponLabel];
    this.hudWeaponSlotIcons.forEach(({ frame, icon, cdBarBg, cdBarFill }) => this.hudObjects.push(frame, icon, cdBarBg, cdBarFill));
    this.layoutHUDToCamera();

    // Hide legacy HUD decorations to keep minimal gameplay panel.
    [
      this.hudPanelBack,
      this.hudSecondaryPanel,
      this.hudXpFrame,
      this.hudHeaderChip,
      this.hudSecondaryChip,
      this.hudCoreLabelText,
      this.hudSecondaryLabelText,
      this.hudXpLabelText,
      this.hudSecondaryText
    ]
      .filter(Boolean)
      .forEach((obj) => obj.setVisible(false));
    this.hudBarsGraphics?.clear();
    this.hudBarsGraphics?.setVisible(false);
    [...(this.hudWeaponSlotFrames ?? []), ...(this.hudWeaponSlotLabels ?? [])]
      .filter(Boolean)
      .forEach((obj) => obj.setVisible(false));
    [
      this.hudLevelText,
      this.hudStatsText,
      this.hudTimerText,
      this.hudGoldText
    ]
      .filter(Boolean)
      .forEach((obj) => obj.setVisible(false));
  }

  deactivateLegacyHudLayer() {
    [
      this.hudLevelText,
      this.hudStatsText,
      this.hudTimerText,
      this.hudGoldText,
      this.hudXpLabelText,
      this.hudSecondaryText,
      this.hudCoreLabelText,
      this.hudSecondaryLabelText,
      this.hudPanelBack,
      this.hudSecondaryPanel,
      this.hudXpFrame,
      this.hudHeaderChip,
      this.hudSecondaryChip
    ]
      .filter(Boolean)
      .forEach((obj) => {
        obj.setVisible(false);
        obj.setActive?.(false);
      });
    this.hudBarsGraphics?.clear();
    this.hudBarsGraphics?.setVisible(false);
    [...(this.hudWeaponSlotFrames ?? []), ...(this.hudWeaponSlotLabels ?? [])]
      .filter(Boolean)
      .forEach((obj) => {
        obj.setVisible(false);
        obj.setActive?.(false);
      });
  }

  layoutHUDToCamera() {
    if (!this.hpText || !this.expText || !this.timeText || !this.killText || !this.expBarBg || !this.expBarFill) {
      return;
    }
    const cam = this.cameras?.main;
    if (!cam) return;
    const isMobile = this.sys.game.device.input.touch || window.innerWidth < 768;
    const scale = isMobile ? 0.7 : 1;
    const margin = 12 * scale;
    const lineSpacing = 16 * scale;
    const anchorX = (cam.scrollX ?? 0) + margin;
    const anchorY = (cam.scrollY ?? 0) + margin;
    this.hpText.setPosition(anchorX, anchorY);
    this.expText.setPosition(anchorX, anchorY + lineSpacing);
    const barY = anchorY + 32 * scale;
    const barWidth = 100 * scale;
    this.expBarBg.setPosition(anchorX, barY);
    this.expBarBg.setSize(barWidth, Math.max(4, 6 * scale));
    this.expBarFill.setPosition(anchorX, barY);
    this.expBarFill.setSize(barWidth, Math.max(4, 6 * scale));
    this.timeText.setPosition(anchorX, anchorY + lineSpacing * 2);
    this.killText.setPosition(anchorX, anchorY + lineSpacing * 3);
    this.hudWeaponLabel?.setPosition(anchorX + 110 * scale, anchorY + 32 * scale);
    const slotSize = Math.floor(22 * scale);
    const slotSpacing = Math.floor(30 * scale);
    const weaponAreaX = anchorX + 145 * scale;
    const weaponAreaY = anchorY + 32 * scale + slotSize * 0.3;
    this.hudWeaponSlotIcons.forEach(({ frame, icon, cdBarBg, cdBarFill }, index) => {
      const slotX = weaponAreaX + index * slotSpacing;
      const slotY = weaponAreaY;
      const iconSize = Math.floor(slotSize * 0.65);
      frame?.setPosition(slotX, slotY);
      frame?.setSize(slotSize, slotSize);
      icon?.setPosition(slotX, slotY);
      icon?.setDisplaySize(iconSize, iconSize);
      cdBarBg?.setPosition(slotX - slotSize * 0.45, slotY + slotSize * 0.55);
      cdBarBg?.setSize(slotSize * 0.9, Math.max(2, 3 * scale));
      cdBarFill?.setPosition(slotX - slotSize * 0.45, slotY + slotSize * 0.55);
      cdBarFill?.setSize(slotSize * 0.9, Math.max(2, 3 * scale));
    });
  }

  updateHUD() {
    if (!this.player) {
      return;
    }

    const levelValue = Number.isFinite(this.player.level) ? this.player.level : this.level;
    const currentExp = Number.isFinite(this.player.exp) ? this.player.exp : this.currentXp;
    const expToNext = Number.isFinite(this.player.expToNext) ? this.player.expToNext : this.xpToNext;
    const xpRatio = expToNext > 0 ? Phaser.Math.Clamp(currentExp / expToNext, 0, 1) : 0;
    const xpPercent = Math.round(xpRatio * 100);
    const elapsedMs = Math.max(0, Number.isFinite(this.playTime) ? this.playTime : this.runTimeMs);
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    if (this.hpText && this.expText && this.timeText && this.killText && this.expBarFill) {
      this.hudObjects.forEach((obj) => {
        obj?.setVisible?.(true);
        obj?.setActive?.(true);
        obj?.setDepth?.(RENDER_DEPTH.HUD);
      });
      this.layoutHUDToCamera();
      this.hpText.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
      this.expText.setText(`LV ${levelValue} | EXP ${xpPercent}%`);
      this.expBarFill.displayWidth = 120 * xpRatio;
      this.timeText.setText(`TIME: ${this.formatRunTime(elapsedMs)}`);
      this.killText.setText(`KILLS: ${this.totalKills}`);
      this.updateHudWeaponIcons();
    }
    this.hudElapsedSeconds = elapsedSeconds;
    this.updateDomHudOverlay(levelValue, xpPercent, elapsedMs, xpRatio);
    this.syncLegacyHudFallback(levelValue, xpPercent, elapsedMs);
  }

  updateHud() {
    this.updateHUD();
  }

  syncLegacyHudFallback(levelValue, xpPercent, elapsedMs) {
    const fallbackAlpha = this.isLeveling || this.isWeaponSelecting ? 0.34 : 1;
    const baseX = 16;
    const baseY = 16;
    if (this.hudLevelText) {
      this.hudLevelText.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
      this.hudLevelText.setPosition(baseX, baseY);
      this.hudLevelText.setDepth(RENDER_DEPTH.HUD + 1);
      this.hudLevelText.setVisible(true);
      this.hudLevelText.setActive(true);
      this.hudLevelText.setAlpha(fallbackAlpha);
    }
    if (this.hudStatsText) {
      this.hudStatsText.setText(`LV ${levelValue} | EXP ${xpPercent}%`);
      this.hudStatsText.setPosition(baseX, baseY + 28);
      this.hudStatsText.setDepth(RENDER_DEPTH.HUD + 1);
      this.hudStatsText.setVisible(true);
      this.hudStatsText.setActive(true);
      this.hudStatsText.setAlpha(fallbackAlpha);
    }
    if (this.hudTimerText) {
      this.hudTimerText.setText(`TIME: ${this.formatRunTime(elapsedMs)}`);
      this.hudTimerText.setPosition(baseX, baseY + 46);
      this.hudTimerText.setDepth(RENDER_DEPTH.HUD + 1);
      this.hudTimerText.setVisible(true);
      this.hudTimerText.setActive(true);
      this.hudTimerText.setAlpha(fallbackAlpha);
    }
    if (this.hudGoldText) {
      this.hudGoldText.setText(`KILLS: ${this.totalKills}`);
      this.hudGoldText.setPosition(baseX, baseY + 64);
      this.hudGoldText.setDepth(RENDER_DEPTH.HUD + 1);
      this.hudGoldText.setVisible(true);
      this.hudGoldText.setActive(true);
      this.hudGoldText.setAlpha(fallbackAlpha);
    }
  }

  updateBossHpBar() {
    if (!this.domHudRefs?.bossBar) {
      return;
    }
    // Find active boss
    let activeBoss = null;
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy?.active && enemy.hp > 0 && enemy.getData?.("archetype") === "boss" && !enemy.getData("isDying")) {
        activeBoss = enemy;
      }
    });

    if (!activeBoss) {
      this.domHudRefs.bossBar.style.display = "none";
      return;
    }

    this.domHudRefs.bossBar.style.display = "flex";
    const hpRatio = Phaser.Math.Clamp(activeBoss.hp / Math.max(1, activeBoss.maxHp || activeBoss.hp), 0, 1);
    if (this.domHudRefs.bossHpBar) {
      this.domHudRefs.bossHpBar.style.width = `${Math.round(hpRatio * 100)}%`;
    }
    if (this.domHudRefs.bossHpText) {
      this.domHudRefs.bossHpText.textContent = `${Math.ceil(activeBoss.hp)}/${activeBoss.maxHp || "?"}`;
    }
  }

  updateEnemyHealthBars() {
    if (!this.enemyHealthBarsGraphics) {
      return;
    }
    this.enemyHealthBarsGraphics.clear();
    const worldView = this.cameras?.main?.worldView;
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy?.active || enemy.hp <= 0) {
        return;
      }
      const maxHp = Math.max(1, Number(enemy.maxHp ?? enemy.hp));
      const hpRatio = Phaser.Math.Clamp(enemy.hp / maxHp, 0, 1);
      const isBoss = Boolean(enemy.getData?.("isBoss"));
      const isElite = Boolean(enemy.isElite);
      if (!isBoss && !isElite && hpRatio >= 0.999) {
        return;
      }
      if (worldView && !Phaser.Geom.Rectangle.Overlaps(worldView, enemy.getBounds())) {
        return;
      }

      const width = isBoss ? 96 : isElite ? 46 : 34;
      const height = isBoss ? 12 : 10;
      const innerHeight = isBoss ? 8 : 6;
      const x = Math.round(enemy.x - width / 2);
      const y = Math.round(enemy.y - Math.max(28, enemy.displayHeight * 0.58));
      const innerWidth = Math.max(2, Math.round((width - 4) * hpRatio));
      const fillColor = isBoss ? 0xff5959 : isElite ? 0xffb347 : 0xff7d7d;

      this.enemyHealthBarsGraphics.fillStyle(0x1b1010, 0.86);
      this.enemyHealthBarsGraphics.fillRect(x, y, width, height);
      this.enemyHealthBarsGraphics.fillStyle(fillColor, 0.96);
      this.enemyHealthBarsGraphics.fillRect(x + 2, y + 2, innerWidth, innerHeight);
      this.enemyHealthBarsGraphics.lineStyle(1, 0xf2d5b5, isBoss ? 0.92 : 0.78);
      this.enemyHealthBarsGraphics.strokeRect(x, y, width, height);
    });
  }

  createEdgeFogOverlay() {
    this.rebuildEdgeFogTexture();
    const width = Math.max(1, this.scale?.width ?? 1280);
    const height = Math.max(1, this.scale?.height ?? 720);
    if (this.edgeFogOverlay) {
      if (!this.edgeFogOverlay.active || !this.edgeFogOverlay.scene) {
        this.edgeFogOverlay = null;
      } else {
        if (this.textures && this.textures.exists(EDGE_FOG_TEXTURE_KEY)) {
          this.edgeFogOverlay.setTexture(EDGE_FOG_TEXTURE_KEY);
        }
        this.edgeFogOverlay.setPosition(width * 0.5, height * 0.5);
        return;
      }
    }

    if (!this.textures || !this.textures.exists(EDGE_FOG_TEXTURE_KEY)) {
      return;
    }

    this.edgeFogOverlay = this.add
      .image(width * 0.5, height * 0.5, EDGE_FOG_TEXTURE_KEY)
      .setScrollFactor(0)
      .setDepth(8.7)
      .setAlpha(EDGE_FOG_VIGNETTE_OPACITY);
  }

  rebuildEdgeFogTexture() {
    const width = Math.max(1, Math.round(this.scale?.width ?? 1280));
    const height = Math.max(1, Math.round(this.scale?.height ?? 720));
    const zoom = Number(this.cameras?.main?.zoom) || GAMEPLAY_CAMERA_ZOOM || 1;

    const prev = this.edgeFogRebuildState;
    if (prev.width === width && prev.height === height && Math.abs(prev.zoom - zoom) < 0.001) {
      return;
    }

    if (this.textures.exists(EDGE_FOG_TEXTURE_KEY)) {
      this.textures.remove(EDGE_FOG_TEXTURE_KEY);
    }

    const texture = this.textures.createCanvas(EDGE_FOG_TEXTURE_KEY, width, height);
    if (!texture) {
      return;
    }

    const ctx = texture.context;
    const cx = width * 0.5;
    const cy = height * 0.5;
    const innerRadius = EDGE_FOG_INNER_RADIUS_TILES * DECK_TILE_SIZE * zoom;
    const outerRadius = Math.max(innerRadius + 1, EDGE_FOG_OUTER_RADIUS_TILES * DECK_TILE_SIZE * zoom);
    const gradient = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius);
    gradient.addColorStop(0, "rgba(4, 10, 18, 0)");
    gradient.addColorStop(0.45, "rgba(4, 10, 18, 0.12)");
    gradient.addColorStop(1, "rgba(4, 10, 18, 0.62)");

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    texture.refresh();

    this.edgeFogRebuildState = { width, height, zoom };
  }

  updateEdgeFogOverlay() {
    if (!this.edgeFogOverlay) {
      return;
    }

    this.rebuildEdgeFogTexture();
    if (this.edgeFogOverlay.texture?.key !== EDGE_FOG_TEXTURE_KEY && this.textures.exists(EDGE_FOG_TEXTURE_KEY)) {
      this.edgeFogOverlay.setTexture(EDGE_FOG_TEXTURE_KEY);
    }

    const width = Math.max(1, this.scale?.width ?? 1280);
    const height = Math.max(1, this.scale?.height ?? 720);
    this.edgeFogOverlay.setPosition(width * 0.5, height * 0.5);
  }

  updateLowHealthVignette() {
    if (!this.lowHealthVignetteGraphics || !this.player?.active) {
      return;
    }
    this.lowHealthVignetteGraphics.clear();
    if (this.isGameOver || this.isLeveling || this.isWeaponSelecting) {
      return;
    }
    const hpRatio = Phaser.Math.Clamp(this.player.getHpRatio(), 0, 1);
    if (hpRatio > 0.5) {
      return;
    }

    const baseIntensity = hpRatio <= 0.2 ? 0.34 : hpRatio <= 0.35 ? 0.22 : 0.12;
    const pulseSpeed = hpRatio <= 0.2 ? 105 : hpRatio <= 0.35 ? 130 : 165;
    const pulse = (Math.sin((this.time?.now ?? 0) / pulseSpeed) + 1) * 0.5;
    const alpha = baseIntensity + pulse * (hpRatio <= 0.2 ? 0.12 : 0.08);
    const width = this.scale?.width ?? 1280;
    const height = this.scale?.height ?? 720;
    const edge = Math.max(34, Math.round(Math.min(width, height) * 0.11));
    const innerEdge = Math.max(18, Math.round(edge * 0.58));
    const borderAlpha = hpRatio <= 0.2 ? alpha * 0.9 : alpha * 0.7;
    const outerFillAlpha = hpRatio <= 0.2 ? alpha * 0.78 : alpha * 0.64;
    const innerFillAlpha = hpRatio <= 0.2 ? alpha * 0.32 : alpha * 0.22;

    this.lowHealthVignetteGraphics.fillStyle(0x6e0c0c, outerFillAlpha);
    this.lowHealthVignetteGraphics.fillRect(0, 0, width, edge);
    this.lowHealthVignetteGraphics.fillRect(0, height - edge, width, edge);
    this.lowHealthVignetteGraphics.fillRect(0, 0, edge, height);
    this.lowHealthVignetteGraphics.fillRect(width - edge, 0, edge, height);
    this.lowHealthVignetteGraphics.fillStyle(0xa31616, innerFillAlpha);
    this.lowHealthVignetteGraphics.fillRect(0, 0, width, innerEdge);
    this.lowHealthVignetteGraphics.fillRect(0, height - innerEdge, width, innerEdge);
    this.lowHealthVignetteGraphics.fillRect(0, 0, innerEdge, height);
    this.lowHealthVignetteGraphics.fillRect(width - innerEdge, 0, innerEdge, height);
    this.lowHealthVignetteGraphics.lineStyle(2, 0xff5a5a, borderAlpha);
    this.lowHealthVignetteGraphics.strokeRect(1, 1, width - 2, height - 2);
    this.lowHealthVignetteGraphics.lineStyle(1, 0xffb0a0, borderAlpha * 0.32);
    this.lowHealthVignetteGraphics.strokeRect(innerEdge * 0.3, innerEdge * 0.3, width - innerEdge * 0.6, height - innerEdge * 0.6);
  }
}
