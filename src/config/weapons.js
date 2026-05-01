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
  }
];

export const PROJECTILE_TEXTURE_BY_WEAPON = {
  dagger: "proj_dagger",
  fireball: "proj_fireball",
  meteor: "proj_meteor",
  scatter_shot: "proj_scatter",
  homing_missile: "proj_homing",
  gatling: "proj_scatter",
  mega_missile: "proj_homing"
};

export const PROJECTILE_POOL_SIZE_BY_TEXTURE = {
  proj_dagger: 520,
  proj_fireball: 240,
  proj_meteor: 180,
  proj_scatter: 300,
  proj_homing: 120
};

export const LASER_WEAPON_TYPES = Object.freeze(["laser", "prismatic_laser"]);

export const LEVEL_UP_UPGRADES = [
  {
    id: "weapon_damage",
    label: "武器伤害",
    description: "所有武器伤害 +12%",
    value: 0.12
  },
  {
    id: "attack_speed",
    label: "攻击速度",
    description: "攻击速度 +10%",
    value: 0.1
  },
  {
    id: "projectile_count",
    label: "弹射物数量",
    description: "额外弹射物 +1",
    value: 1
  },
  {
    id: "movement_speed",
    label: "移动速度",
    description: "移动速度 +20",
    value: 20
  },
  {
    id: "pickup_radius",
    label: "拾取范围",
    description: "球体拾取范围 +40",
    value: 40
  },
  {
    id: "passive_ember_core",
    label: "余烬核心",
    description: "火焰伤害 +15%，解锁火球进化",
    value: 0.15,
    passiveKey: "ember_core",
    isPassive: true
  },
  {
    id: "passive_blade_sigil",
    label: "刃之印记",
    description: "匕首伤害 +15%，解锁匕首进化",
    value: 0.15,
    passiveKey: "blade_sigil",
    isPassive: true
  },
  {
    id: "passive_iron_shell",
    label: "铁壳",
    description: "受到伤害 -10%",
    value: 0.1,
    passiveKey: "iron_shell",
    isPassive: true
  },
  {
    id: "passive_swift_feet",
    label: "疾步",
    description: "移动速度 +8%",
    value: 0.08,
    passiveKey: "swift_feet",
    isPassive: true
  },
  {
    id: "passive_wings",
    label: "飞翼",
    description: "武器范围 +15%，解锁追踪弹进化",
    value: 0.15,
    passiveKey: "wings",
    isPassive: true
  },
  {
    id: "passive_armor",
    label: "铠甲",
    description: "受到伤害 -1 点（最低 1）",
    value: 1,
    passiveKey: "armor",
    isPassive: true
  },
  {
    id: "passive_hollow_heart",
    label: "空心之心",
    description: "最大生命 +20%",
    value: 0.2,
    passiveKey: "hollow_heart",
    isPassive: true
  },
  {
    id: "passive_attractorb",
    label: "引力珠",
    description: "拾取范围 +50%",
    value: 0.5,
    passiveKey: "attractorb",
    isPassive: true
  },
  {
    id: "passive_frost_shard",
    label: "冰晶",
    description: "冰系伤害 +15%，解锁冻结效果",
    value: 0.15,
    passiveKey: "frost_shard",
    isPassive: true
  }
];
