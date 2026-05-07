import { Player } from "./Player.js";
import { SHIP_CONFIGS, SHIP_PASSIVES, SHIP_STORAGE_KEY } from "../config/ships.js";
import { FIGHTER_CONFIGS, FIGHTER_STORAGE_KEY } from "../config/fighters.js";
import { WORLD_WIDTH, WORLD_HEIGHT } from "../config/progression.js";

export class PlayerSetup {
  constructor(scene) {
    this.scene = scene;
  }

  createPlayer(shipKey) {
    const scene = this.scene;
    const resolvedShipKey = shipKey || scene.selectedShipKey || this.resolveShipKey();
    const shipConfig = SHIP_CONFIGS[resolvedShipKey] || null;
    scene.shipConfig = shipConfig;
    scene.fighterConfig = null;

    const shipTextureKey = shipConfig?.textureKey || null;
    const player = new Player(scene, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, { shipTextureKey });
    player.level = scene.level;

    if (shipConfig) {
      player.maxHp = shipConfig.stats.maxHp;
      player.hp = shipConfig.stats.maxHp;
      player.speed = shipConfig.stats.speed;
      player.dashCooldownMs = shipConfig.stats.dashCooldown;
      player.dashChargeRate = player.dashGaugeMax / (player.dashCooldownMs / 1000);
      player.shipType = resolvedShipKey;
      player.fighterType = resolvedShipKey;
      if (shipConfig.tint) {
        player.setTint(shipConfig.tint);
      }
    } else {
      const fighterKey = scene.selectedFighterKey || this.resolveFighterKey();
      const fighterConfig = FIGHTER_CONFIGS[fighterKey] || null;
      scene.fighterConfig = fighterConfig;
      if (fighterConfig) {
        player.maxHp = fighterConfig.hp;
        player.hp = fighterConfig.hp;
        player.speed = fighterConfig.speed;
        player.fighterType = fighterKey;
        if (fighterConfig.tint) {
          player.setTint(fighterConfig.tint);
        }
        const fx = fighterConfig.passiveEffect;
        if (fx.dashCooldownMultiplier) {
          player.dashCooldownMs = Math.round(player.dashCooldownMs * fx.dashCooldownMultiplier);
          player.dashChargeRate = player.dashGaugeMax / (player.dashCooldownMs / 1000);
        }
        if (fx.damageCooldownBonusMs) {
          player.damageCooldownMs += fx.damageCooldownBonusMs;
        }
        if (fx.pickupRadiusMultiplier) {
          player.pickupRadius = Math.round(player.pickupRadius * fx.pickupRadiusMultiplier);
        }
      }
    }

    // Apply ship passive
    if (shipConfig && shipConfig.passive) {
      const passive = SHIP_PASSIVES[shipConfig.passive];
      if (passive) {
        player.shipPassive = passive.id;
        switch (passive.id) {
          case "iron_clad":
            player.damageReduction = 0.15;
            break;
          case "phase_shift":
            player.dodgeChance = 0.1;
            break;
          case "shield_wall":
            player.shieldRemainingMs = 3000;
            player.pickupRadius = Math.round(player.pickupRadius * 1.25);
            break;
          case "tiny_hitbox":
            player.setCircle(11, 0, 0);
            break;
          case "double_tap":
            player.fireTwiceChance = 0.15;
            break;
        }
      }
    }

    return player;
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

  applyInitialWeapons(player, shipConfig, weaponSystem) {
    const cfg = shipConfig || this.scene.shipConfig;
    if (cfg) {
      const weapons = cfg.initialWeapons || [cfg.initialWeapon];
      weapons.forEach((w) => weaponSystem.addWeapon(w));
    } else if (this.scene.fighterConfig) {
      const startWeapon = this.scene.fighterConfig.startingWeapon;
      weaponSystem.addWeapon(startWeapon);
    }
  }
}
