export const SHIP_PASSIVES = Object.freeze({
  iron_clad: Object.freeze({
    id: "iron_clad",
    name: "铁甲",
    description: "固定15%伤害减免"
  }),
  phase_shift: Object.freeze({
    id: "phase_shift",
    name: "相位偏移",
    description: "10%概率闪避伤害"
  }),
  overcharge: Object.freeze({
    id: "overcharge",
    name: "过载",
    description: "连锁闪电伤害+20%"
  }),
  ammo_belt: Object.freeze({
    id: "ammo_belt",
    name: "弹药带",
    description: "弹丸数量+1"
  }),
  shield_wall: Object.freeze({
    id: "shield_wall",
    name: "护盾墙",
    description: "开局获得护盾，拾取半径+25%"
  }),
  tiny_hitbox: Object.freeze({
    id: "tiny_hitbox",
    name: "微型机身",
    description: "碰撞体积-30%"
  }),
  double_tap: Object.freeze({
    id: "double_tap",
    name: "双击",
    description: "15%概率连射"
  })
});

export const SHIP_CONFIGS = Object.freeze({
  striker: Object.freeze({
    id: "striker",
    name: "突击者",
    tagline: "均衡之选，攻守兼备",
    description: "平衡型战机，速度和火力均衡",
    difficulty: 1,
    initialWeapon: "dagger",
    stats: Object.freeze({ maxHp: 100, speed: 200, dashCooldown: 4000 }),
    unlockCondition: null,
    textureKey: "ship_starter",
    tint: 0x66ccff
  }),
  hammer: Object.freeze({
    id: "hammer",
    name: "重锤",
    tagline: "重甲铁壁，坚不可摧",
    description: "高耐久，火力强大但移动较慢",
    difficulty: 3,
    initialWeapon: "fireball",
    stats: Object.freeze({ maxHp: 150, speed: 140, dashCooldown: 5000 }),
    unlockCondition: Object.freeze({ type: "time", value: 60 }),
    textureKey: "ship_heavy",
    tint: 0xffaa44,
    passive: "iron_clad"
  }),
  phantom: Object.freeze({
    id: "phantom",
    name: "幻影",
    tagline: "灵巧闪避，相位无踪",
    description: "高机动，隐形性能好，但火力较弱",
    difficulty: 4,
    initialWeapon: "dagger",
    stats: Object.freeze({ maxHp: 80, speed: 240, dashCooldown: 3200 }),
    unlockCondition: Object.freeze({ type: "time", value: 120 }),
    textureKey: "ship_stealth",
    tint: 0xaa66ff,
    passive: "phase_shift"
  }),
  lightning: Object.freeze({
    id: "lightning",
    name: "闪电",
    tagline: "高压电涌，连锁击杀",
    description: "能量聚焦型，高爆发但持续输出一般",
    difficulty: 3,
    initialWeapon: "lightning",
    stats: Object.freeze({ maxHp: 90, speed: 210, dashCooldown: 3500 }),
    unlockCondition: Object.freeze({ type: "kills", value: 100 }),
    textureKey: "ship_laser",
    tint: 0xffdd44,
    passive: "overcharge"
  }),
  annihilator: Object.freeze({
    id: "annihilator",
    name: "毁灭者",
    tagline: "弹幕倾泻，火力全开",
    description: "多重武器系统，火力惊人",
    difficulty: 4,
    initialWeapon: "fireball",
    stats: Object.freeze({ maxHp: 120, speed: 170, dashCooldown: 4500 }),
    unlockCondition: Object.freeze({ type: "kills", value: 500 }),
    textureKey: "ship_missile",
    tint: 0xff4422,
    passive: "ammo_belt"
  }),
  guardian: Object.freeze({
    id: "guardian",
    name: "守护者",
    tagline: "护盾庇佑，稳扎稳打",
    description: "能量护盾，可保护自己或队友",
    difficulty: 2,
    initialWeapon: "dagger",
    stats: Object.freeze({ maxHp: 110, speed: 185, dashCooldown: 4000 }),
    unlockCondition: Object.freeze({ type: "survive", value: 180 }),
    textureKey: "ship_shield",
    tint: 0x44ff88,
    passive: "shield_wall"
  }),
  swarm: Object.freeze({
    id: "swarm",
    name: "蜂群",
    tagline: "极速蜂群，一触即离",
    description: "微型无人机，机动性极高",
    difficulty: 5,
    initialWeapon: "dagger",
    stats: Object.freeze({ maxHp: 60, speed: 320, dashCooldown: 2500 }),
    unlockCondition: Object.freeze({ type: "level", value: 10 }),
    textureKey: "ship_swarm",
    tint: 0xff88cc,
    passive: "tiny_hitbox"
  }),
  ultimate: Object.freeze({
    id: "ultimate",
    name: "终极",
    tagline: "终极之力，双武齐发",
    description: "全属性最强，解锁条件高",
    difficulty: 5,
    initialWeapon: "fireball",
    initialWeapons: Object.freeze(["fireball", "lightning"]),
    stats: Object.freeze({ maxHp: 130, speed: 200, dashCooldown: 3500 }),
    unlockCondition: Object.freeze({ type: "kills", value: 1000 }),
    textureKey: "ship_ultimate",
    tint: 0xffffff,
    passive: "double_tap"
  })
});

export const SHIP_KEYS = Object.freeze(Object.keys(SHIP_CONFIGS));
export const SHIP_STORAGE_KEY = "forgeduel_selected_ship";
export const SHIP_STATS_STORAGE_KEY = "forgeduel_ship_stats";

export function loadShipStats() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { totalTimeSec: 0, totalKills: 0, maxLevel: 0, bestTimeSec: 0 };
  }
  try {
    const raw = window.localStorage.getItem(SHIP_STATS_STORAGE_KEY);
    if (!raw) return { totalTimeSec: 0, totalKills: 0, maxLevel: 0, bestTimeSec: 0 };
    const parsed = JSON.parse(raw);
    return {
      totalTimeSec: Math.max(0, Number(parsed.totalTimeSec) || 0),
      totalKills: Math.max(0, Number(parsed.totalKills) || 0),
      maxLevel: Math.max(0, Number(parsed.maxLevel) || 0),
      bestTimeSec: Math.max(0, Number(parsed.bestTimeSec) || 0)
    };
  } catch {
    return { totalTimeSec: 0, totalKills: 0, maxLevel: 0, bestTimeSec: 0 };
  }
}

export function saveShipStats(stats) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(SHIP_STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

export function updateShipStats(runData) {
  const stats = loadShipStats();
  const runSec = Math.max(0, Math.floor((runData.timeSurvivedMs || 0) / 1000));
  stats.totalTimeSec += runSec;
  stats.totalKills += Math.max(0, runData.enemiesKilled || 0);
  stats.maxLevel = Math.max(stats.maxLevel, runData.levelReached || 0);
  stats.bestTimeSec = Math.max(stats.bestTimeSec, runSec);
  saveShipStats(stats);
  return stats;
}

export function isShipUnlocked(shipId, stats) {
  const config = SHIP_CONFIGS[shipId];
  if (!config) return false;
  if (!config.unlockCondition) return true;

  const cond = config.unlockCondition;
  const s = stats || loadShipStats();

  switch (cond.type) {
    case "time":
      return s.totalTimeSec >= cond.value;
    case "kills":
      return s.totalKills >= cond.value;
    case "survive":
      return s.bestTimeSec >= cond.value;
    case "level":
      return s.maxLevel >= cond.value;
    default:
      return true;
  }
}

export function getUnlockConditionText(shipId) {
  const config = SHIP_CONFIGS[shipId];
  if (!config || !config.unlockCondition) return "";

  const cond = config.unlockCondition;
  switch (cond.type) {
    case "time":
      return `累计游戏时间超过${cond.value}秒`;
    case "kills":
      return `累计击杀${cond.value}个敌人`;
    case "survive":
      return `单局存活超过${cond.value}秒`;
    case "level":
      return `达到${cond.value}级`;
    default:
      return "未知条件";
  }
}

export function getUnlockProgress(shipId, stats) {
  const config = SHIP_CONFIGS[shipId];
  if (!config || !config.unlockCondition) return null;
  const cond = config.unlockCondition;
  const s = stats || loadShipStats();

  switch (cond.type) {
    case "time":
      return { current: s.totalTimeSec, target: cond.value };
    case "kills":
      return { current: s.totalKills, target: cond.value };
    case "survive":
      return { current: s.bestTimeSec, target: cond.value };
    case "level":
      return { current: s.maxLevel, target: cond.value };
    default:
      return null;
  }
}
