export const SHIP_CONFIGS = Object.freeze({
  striker: Object.freeze({
    id: "striker",
    name: "突击者",
    description: "平衡型战机，速度和火力均衡",
    difficulty: 1,
    initialWeapon: "dagger",
    stats: Object.freeze({ maxHp: 100, speed: 200, dashCooldown: 4000 }),
    unlockCondition: null,
    tint: 0x66ccff
  }),
  hammer: Object.freeze({
    id: "hammer",
    name: "重锤",
    description: "高耐久，火力强大但移动较慢",
    difficulty: 3,
    initialWeapon: "fireball",
    stats: Object.freeze({ maxHp: 150, speed: 150, dashCooldown: 5000 }),
    unlockCondition: Object.freeze({ type: "time", value: 60 }),
    tint: 0xffaa44
  }),
  phantom: Object.freeze({
    id: "phantom",
    name: "幻影",
    description: "高机动，隐形性能好，但火力较弱",
    difficulty: 4,
    initialWeapon: "orbit_blades",
    stats: Object.freeze({ maxHp: 80, speed: 280, dashCooldown: 3000 }),
    unlockCondition: Object.freeze({ type: "time", value: 120 }),
    tint: 0xaa66ff
  }),
  lightning: Object.freeze({
    id: "lightning",
    name: "闪电",
    description: "能量聚焦型，高爆发但持续输出一般",
    difficulty: 3,
    initialWeapon: "lightning",
    stats: Object.freeze({ maxHp: 90, speed: 220, dashCooldown: 3500 }),
    unlockCondition: Object.freeze({ type: "kills", value: 100 }),
    tint: 0xffdd44
  }),
  annihilator: Object.freeze({
    id: "annihilator",
    name: "毁灭者",
    description: "多重武器系统，火力惊人",
    difficulty: 4,
    initialWeapon: "fireball",
    stats: Object.freeze({ maxHp: 120, speed: 180, dashCooldown: 4500 }),
    unlockCondition: Object.freeze({ type: "kills", value: 500 }),
    tint: 0xff4422
  }),
  guardian: Object.freeze({
    id: "guardian",
    name: "守护者",
    description: "能量护盾，可保护自己或队友",
    difficulty: 2,
    initialWeapon: "dagger",
    stats: Object.freeze({ maxHp: 110, speed: 190, dashCooldown: 4000 }),
    unlockCondition: Object.freeze({ type: "survive", value: 180 }),
    tint: 0x44ff88
  }),
  swarm: Object.freeze({
    id: "swarm",
    name: "蜂群",
    description: "微型无人机，机动性极高",
    difficulty: 5,
    initialWeapon: "dagger",
    stats: Object.freeze({ maxHp: 60, speed: 350, dashCooldown: 2500 }),
    unlockCondition: Object.freeze({ type: "level", value: 10 }),
    tint: 0xff88cc
  }),
  ultimate: Object.freeze({
    id: "ultimate",
    name: "终极",
    description: "全属性最强，解锁条件高",
    difficulty: 5,
    initialWeapon: "fireball",
    initialWeapons: Object.freeze(["fireball", "lightning"]),
    stats: Object.freeze({ maxHp: 130, speed: 200, dashCooldown: 3500 }),
    unlockCondition: Object.freeze({ type: "kills", value: 1000 }),
    tint: 0xffffff
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
