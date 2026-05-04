export const WEAPON_DEFINITIONS = {
  fireball: {
    type: "fireball",
    damage: 22,
    cooldownMs: 1400,
    range: 380,
    knockbackForce: 150,
    projectileBehavior: "explosion",
    projectileSpeed: 245,
    explosionRadius: 64,
    explosionDamageMultiplier: 0.72
  },
  dagger: {
    type: "dagger",
    damage: 10,
    cooldownMs: 420,
    range: 220,
    knockbackForce: 110,
    projectileBehavior: "fast",
    projectileSpeed: 560
  },
  lightning: {
    type: "lightning",
    damage: 20,
    cooldownMs: 1500,
    range: 320,
    knockbackForce: 80,
    projectileBehavior: "chain"
  },
  meteor: {
    type: "meteor",
    damage: 52,
    cooldownMs: 1850,
    range: 430,
    knockbackForce: 200,
    projectileBehavior: "meteor_explosion",
    projectileSpeed: 215,
    explosionRadius: 118,
    explosionDamageMultiplier: 1.0,
    evolved: true
  },
  orbit_blades: {
    type: "orbit_blades",
    damage: 16,
    cooldownMs: 230,
    range: 120,
    knockbackForce: 95,
    projectileBehavior: "orbit",
    orbitBladeCount: 3,
    orbitRadius: 84,
    orbitSpeed: 0.0053,
    evolved: true
  },
  scatter_shot: {
    type: "scatter_shot",
    damage: 8,
    cooldownMs: 900,
    range: 200,
    knockbackForce: 90,
    projectileBehavior: "scatter",
    projectileSpeed: 420,
    scatterCount: 5,
    scatterSpreadDeg: 45
  },
  homing_missile: {
    type: "homing_missile",
    damage: 15,
    cooldownMs: 2000,
    range: 400,
    knockbackForce: 120,
    projectileBehavior: "homing",
    projectileSpeed: 280,
    homingTurnRate: 0.06
  },
  laser: {
    type: "laser",
    damage: 18,
    cooldownMs: 1100,
    range: 350,
    knockbackForce: 60,
    projectileBehavior: "laser",
    laserWidth: 4,
    laserDurationMs: 180,
    pierceCount: 1
  },
  thunderstorm: {
    type: "thunderstorm",
    damage: 35,
    cooldownMs: 1200,
    range: 380,
    knockbackForce: 100,
    projectileBehavior: "chain",
    chainCount: 5,
    chainRange: 200,
    chainFalloff: 1.0,
    evolved: true
  },
  gatling: {
    type: "gatling",
    damage: 6,
    cooldownMs: 400,
    range: 220,
    knockbackForce: 70,
    projectileBehavior: "scatter",
    projectileSpeed: 500,
    scatterCount: 8,
    scatterSpreadDeg: 60,
    evolved: true
  },
  mega_missile: {
    type: "mega_missile",
    damage: 40,
    cooldownMs: 1600,
    range: 450,
    knockbackForce: 180,
    projectileBehavior: "homing",
    projectileSpeed: 300,
    homingTurnRate: 0.09,
    explosionRadius: 80,
    explosionDamageMultiplier: 0.85,
    evolved: true
  },
  prismatic_laser: {
    type: "prismatic_laser",
    damage: 28,
    cooldownMs: 900,
    range: 400,
    knockbackForce: 80,
    projectileBehavior: "laser",
    laserWidth: 8,
    laserDurationMs: 220,
    pierceCount: 3,
    evolved: true
  },
  boomerang: {
    type: "boomerang",
    damage: 18,
    cooldownMs: 1600,
    range: 320,
    knockbackForce: 130,
    projectileBehavior: "boomerang",
    projectileSpeed: 280,
    boomerangCount: 2,
    boomerangReturnSpeed: 320,
    boomerangArcHeight: 120,
    boomerangHitCooldownMs: 300
  },
  slash: {
    type: "slash",
    damage: 14,
    cooldownMs: 600,
    range: 80,
    knockbackForce: 160,
    projectileBehavior: "slash",
    slashAngleDeg: 140,
    slashDurationMs: 280,
    slashWidth: 12
  },
  garlic_aura: {
    type: "garlic_aura",
    damage: 6,
    cooldownMs: 800,
    range: 90,
    knockbackForce: 80,
    projectileBehavior: "aura",
    auraRadius: 90,
    auraDamageIntervalMs: 800,
    auraKnockback: 60
  },
  molotov: {
    type: "molotov",
    damage: 15,
    cooldownMs: 2200,
    range: 280,
    knockbackForce: 50,
    projectileBehavior: "molotov",
    projectileSpeed: 200,
    fireRadius: 64,
    fireDamagePerTick: 5,
    fireTickIntervalMs: 500,
    fireDurationMs: 3000
  },
  gravity_well: {
    type: "gravity_well",
    damage: 8,
    cooldownMs: 3500,
    range: 200,
    knockbackForce: 30,
    projectileBehavior: "gravity_well",
    projectileSpeed: 180,
    gravityRadius: 120,
    gravityForce: 80,
    gravityDurationMs: 2500
  },
  death_spiral: {
    type: "death_spiral",
    damage: 25,
    cooldownMs: 1400,
    range: 300,
    knockbackForce: 140,
    projectileBehavior: "boomerang",
    projectileSpeed: 340,
    boomerangCount: 4,
    boomerangReturnSpeed: 380,
    boomerangArcHeight: 160,
    boomerangHitCooldownMs: 200,
    evolved: true
  },
  cyclone_slash: {
    type: "cyclone_slash",
    damage: 22,
    cooldownMs: 400,
    range: 120,
    knockbackForce: 200,
    projectileBehavior: "slash",
    slashAngleDeg: 360,
    slashDurationMs: 350,
    slashWidth: 16,
    evolved: true
  },
  holy_aura: {
    type: "holy_aura",
    damage: 10,
    cooldownMs: 500,
    range: 130,
    knockbackForce: 100,
    projectileBehavior: "aura",
    auraRadius: 130,
    auraDamageIntervalMs: 500,
    auraKnockback: 80,
    evolved: true
  },
  inferno: {
    type: "inferno",
    damage: 20,
    cooldownMs: 1800,
    range: 320,
    knockbackForce: 60,
    projectileBehavior: "molotov",
    projectileSpeed: 240,
    fireRadius: 100,
    fireDamagePerTick: 8,
    fireTickIntervalMs: 400,
    fireDurationMs: 4000,
    evolved: true
  },
  singularity: {
    type: "singularity",
    damage: 12,
    cooldownMs: 2800,
    range: 240,
    knockbackForce: 40,
    projectileBehavior: "gravity_well",
    projectileSpeed: 200,
    gravityRadius: 160,
    gravityForce: 140,
    gravityDurationMs: 3000,
    evolved: true
  }
};

export const WEAPON_EVOLUTION_RULES = [
  {
    weapon: "fireball",
    level: 5,
    requiredPassive: "ember_core",
    evolution: "meteor"
  },
  {
    weapon: "dagger",
    level: 5,
    requiredPassive: "blade_sigil",
    evolution: "orbit_blades"
  },
  {
    weapon: "lightning",
    level: 5,
    requiredPassive: "iron_shell",
    evolution: "thunderstorm"
  },
  {
    weapon: "scatter_shot",
    level: 5,
    requiredPassive: "swift_feet",
    evolution: "gatling"
  },
  {
    weapon: "homing_missile",
    level: 5,
    requiredPassive: "wings",
    evolution: "mega_missile"
  },
  {
    weapon: "laser",
    level: 5,
    requiredPassive: "blade_sigil",
    evolution: "prismatic_laser"
  },
  {
    weapon: "boomerang",
    level: 5,
    requiredPassive: "swift_feet",
    evolution: "death_spiral"
  },
  {
    weapon: "slash",
    level: 5,
    requiredPassive: "blade_sigil",
    evolution: "cyclone_slash"
  },
  {
    weapon: "garlic_aura",
    level: 5,
    requiredPassive: "hollow_heart",
    evolution: "holy_aura"
  },
  {
    weapon: "molotov",
    level: 5,
    requiredPassive: "ember_core",
    evolution: "inferno"
  },
  {
    weapon: "gravity_well",
    level: 5,
    requiredPassive: "attractorb",
    evolution: "singularity"
  }
];

export const PROJECTILE_TEXTURE_BY_WEAPON = {
  dagger: "proj_dagger",
  fireball: "proj_fireball",
  meteor: "proj_meteor",
  scatter_shot: "proj_scatter",
  homing_missile: "proj_homing",
  gatling: "proj_scatter",
  mega_missile: "proj_homing",
  boomerang: "proj_dagger",
  death_spiral: "proj_dagger",
  slash: "proj_dagger",
  cyclone_slash: "proj_dagger",
  molotov: "proj_fireball",
  inferno: "proj_fireball",
  gravity_well: "proj_homing",
  singularity: "proj_homing"
};

export const PROJECTILE_POOL_SIZE_BY_TEXTURE = {
  proj_dagger: 520,
  proj_fireball: 300,
  proj_meteor: 180,
  proj_scatter: 300,
  proj_homing: 160
};

export const LASER_WEAPON_TYPES = Object.freeze(["laser", "prismatic_laser"]);
export const AURA_WEAPON_TYPES = Object.freeze(["garlic_aura", "holy_aura"]);
export const SLASH_WEAPON_TYPES = Object.freeze(["slash", "cyclone_slash"]);
export const BOOMERANG_WEAPON_TYPES = Object.freeze(["boomerang", "death_spiral"]);
export const MOLOTOV_WEAPON_TYPES = Object.freeze(["molotov", "inferno"]);
export const GRAVITY_WEAPON_TYPES = Object.freeze(["gravity_well", "singularity"]);
export const SPECIAL_BEHAVIOR_WEAPON_TYPES = Object.freeze([
  ...AURA_WEAPON_TYPES,
  ...SLASH_WEAPON_TYPES,
  ...BOOMERANG_WEAPON_TYPES,
  ...MOLOTOV_WEAPON_TYPES,
  ...GRAVITY_WEAPON_TYPES
]);

export const UPGRADE_RARITY = Object.freeze({
  COMMON: { id: "common", weight: 50, color: "#c8ddef" },
  UNCOMMON: { id: "uncommon", weight: 25, color: "#44cc66" },
  RARE: { id: "rare", weight: 15, color: "#4488ff" },
  LEGENDARY: { id: "legendary", weight: 9, color: "#ffaa22" },
  EXOTIC: { id: "exotic", weight: 1, color: "#ff44ff" }
});

export const LEVEL_UP_UPGRADES = [
  {
    id: "weapon_damage",
    label: "武器伤害",
    description: "所有武器伤害 +12%",
    value: 0.12,
    rarity: "common"
  },
  {
    id: "attack_speed",
    label: "攻击速度",
    description: "攻击速度 +10%",
    value: 0.1,
    rarity: "common"
  },
  {
    id: "projectile_count",
    label: "弹射物数量",
    description: "额外弹射物 +1",
    value: 1,
    rarity: "uncommon"
  },
  {
    id: "movement_speed",
    label: "移动速度",
    description: "移动速度 +20",
    value: 20,
    rarity: "common"
  },
  {
    id: "pickup_radius",
    label: "拾取范围",
    description: "球体拾取范围 +40",
    value: 40,
    rarity: "common"
  },
  {
    id: "lifesteal",
    label: "生命汲取",
    description: "8% 几率击杀时回复 5 HP",
    value: 0.08,
    rarity: "rare"
  },
  {
    id: "passive_ember_core",
    label: "余烬核心",
    description: "火焰伤害 +15%，解锁火球进化",
    value: 0.15,
    passiveKey: "ember_core",
    isPassive: true,
    rarity: "uncommon"
  },
  {
    id: "passive_blade_sigil",
    label: "刃之印记",
    description: "匕首伤害 +15%，解锁匕首进化",
    value: 0.15,
    passiveKey: "blade_sigil",
    isPassive: true,
    rarity: "uncommon"
  },
  {
    id: "passive_iron_shell",
    label: "铁壳",
    description: "受到伤害 -10%",
    value: 0.1,
    passiveKey: "iron_shell",
    isPassive: true,
    rarity: "common"
  },
  {
    id: "passive_swift_feet",
    label: "疾步",
    description: "移动速度 +8%",
    value: 0.08,
    passiveKey: "swift_feet",
    isPassive: true,
    rarity: "common"
  },
  {
    id: "passive_wings",
    label: "飞翼",
    description: "武器范围 +15%，解锁追踪弹进化",
    value: 0.15,
    passiveKey: "wings",
    isPassive: true,
    rarity: "uncommon"
  },
  {
    id: "passive_armor",
    label: "铠甲",
    description: "受到伤害 -1 点（最低 1）",
    value: 1,
    passiveKey: "armor",
    isPassive: true,
    rarity: "common"
  },
  {
    id: "passive_hollow_heart",
    label: "空心之心",
    description: "最大生命 +20%",
    value: 0.2,
    passiveKey: "hollow_heart",
    isPassive: true,
    rarity: "common"
  },
  {
    id: "passive_attractorb",
    label: "引力珠",
    description: "拾取范围 +50%",
    value: 0.5,
    passiveKey: "attractorb",
    isPassive: true,
    rarity: "common"
  },
  {
    id: "passive_frost_shard",
    label: "冰晶",
    description: "冰系伤害 +15%，解锁冻结效果",
    value: 0.15,
    passiveKey: "frost_shard",
    isPassive: true,
    rarity: "uncommon"
  }
];
