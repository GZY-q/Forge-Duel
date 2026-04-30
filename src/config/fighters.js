export const FIGHTER_CONFIGS = Object.freeze({
  scout: Object.freeze({
    id: "scout",
    label: "侦察型",
    description: "高速低血，冲刺冷却-20%",
    hp: 80,
    speed: 240,
    startingWeapon: "dagger",
    tint: 0x66ccff,
    passiveId: "scout_agility",
    passiveEffect: { dashCooldownMultiplier: 0.8 },
    evolutionLevel: 10,
    evolution: Object.freeze({
      label: "侦察型·改",
      hpBonus: 20,
      speedBonus: 30,
      tint: 0x99ddff,
      passiveEffect: { dashCooldownMultiplier: 0.65 }
    })
  }),
  tank: Object.freeze({
    id: "tank",
    label: "坦克型",
    description: "高血低速，受击冷却+100ms",
    hp: 150,
    speed: 160,
    startingWeapon: "fireball",
    tint: 0xffaa44,
    passiveId: "tank_armor",
    passiveEffect: { damageCooldownBonusMs: 100 },
    evolutionLevel: 10,
    evolution: Object.freeze({
      label: "坦克型·改",
      hpBonus: 40,
      speedBonus: 10,
      tint: 0xffcc66,
      passiveEffect: { damageCooldownBonusMs: 200, damageReduction: 0.1 }
    })
  }),
  hunter: Object.freeze({
    id: "hunter",
    label: "猎手型",
    description: "均衡属性，拾取范围+30%",
    hp: 100,
    speed: 200,
    startingWeapon: "lightning",
    tint: 0x44ff88,
    passiveId: "hunter_senses",
    passiveEffect: { pickupRadiusMultiplier: 1.3 },
    evolutionLevel: 10,
    evolution: Object.freeze({
      label: "猎手型·改",
      hpBonus: 25,
      speedBonus: 20,
      tint: 0x88ffaa,
      passiveEffect: { pickupRadiusMultiplier: 1.6, xpMultiplier: 1.15 }
    })
  }),
  blade: Object.freeze({
    id: "blade",
    label: "刀锋型",
    description: "近战强化，近战伤害+25%",
    hp: 110,
    speed: 210,
    startingWeapon: "orbit_blades",
    tint: 0xff6666,
    passiveId: "blade_mastery",
    passiveEffect: { meleeDamageMultiplier: 1.25 },
    evolutionLevel: 10,
    evolution: Object.freeze({
      label: "刀锋型·改",
      hpBonus: 30,
      speedBonus: 15,
      tint: 0xff9999,
      passiveEffect: { meleeDamageMultiplier: 1.5, orbitBladeCount: 1 }
    })
  })
});

export const FIGHTER_KEYS = Object.freeze(Object.keys(FIGHTER_CONFIGS));
export const FIGHTER_STORAGE_KEY = "forgeduel_selected_fighter";
