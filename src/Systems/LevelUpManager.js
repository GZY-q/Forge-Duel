import { LEVEL_UP_UPGRADES, WEAPON_EVOLUTION_RULES } from "../config/weapons.js";

const MENU_DEPTH = 2000;

const UPGRADE_COLORS = {
  weapon_damage: 0xff6644, attack_speed: 0x44ccff, projectile_count: 0xffcc44,
  movement_speed: 0x44ff88, pickup_radius: 0xcc66ff, lifesteal: 0xff4466,
  max_hp_boost: 0xff8888, xp_boost: 0x88ff88, luck_boost: 0x44ff44,
  crit_chance: 0xff4444, duration_boost: 0x4488ff, cooldown_reduction: 0x88ccff,
  revival: 0xffdd44, passive_ember_core: 0xff4422, passive_blade_sigil: 0x88ccff,
  passive_iron_shell: 0xaaaaaa, passive_swift_feet: 0x66ff66, passive_wings: 0x88eeff,
  passive_armor: 0xcccccc, passive_hollow_heart: 0xff8888, passive_attractorb: 0xaa66ff,
  passive_frost_shard: 0x88ddff, passive_spellbinder: 0x4488ff,
  passive_candelabrador: 0xffaa44, passive_duplicator: 0xffcc88, passive_bracer: 0x66ccff
};

const UPGRADE_ICONS = {
  weapon_damage: "⚔", attack_speed: "⚡", projectile_count: "◎",
  movement_speed: "➣", pickup_radius: "⊕", lifesteal: "🩸",
  max_hp_boost: "❤", xp_boost: "⭐", luck_boost: "🍀",
  crit_chance: "💥", duration_boost: "⏳", cooldown_reduction: "🕐",
  revival: "💀", passive_ember_core: "🔥", passive_blade_sigil: "🗡",
  passive_iron_shell: "🛡", passive_swift_feet: "👟", passive_wings: "🪶",
  passive_armor: "🔰", passive_hollow_heart: "💖", passive_attractorb: "🧲",
  passive_frost_shard: "❄", passive_spellbinder: "📖",
  passive_candelabrador: "🕯", passive_duplicator: "📋", passive_bracer: "🤲"
};

export class LevelUpManager {
  constructor(scene) {
    this.scene = scene;
    this.rerollsRemaining = 2;
  }

  open() {
    const s = this.scene;
    if (s.pendingLevelUps <= 0) return;

    s.pendingLevelUps -= 1;
    s.isLeveling = true;
    s.levelUpOptionActions = [];
    s.physics.pause();
    s.director?.pause?.();
    s.weaponSystem?.pause?.();
    s.player.body?.setVelocity(0, 0);
    s.applyHudModalFocus(true);

    const cam = s.cameras.main;
    const centerX = cam.width * 0.5;
    const centerY = cam.height * 0.5;
    const panelWidth = 300;
    const panelHeight = 400;
    const depth = MENU_DEPTH;
    const ph = panelHeight / 2;
    const pw = panelWidth / 2;

    const overlay = s.add.rectangle(centerX, centerY, cam.width, cam.height, 0x000000, 0.55).setScrollFactor(0).setDepth(depth);
    const panelShadow = s.add.rectangle(centerX + 2, centerY + 4, panelWidth, panelHeight, 0x000000, 0.5).setScrollFactor(0).setDepth(depth + 1);
    const panel = s.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x3a3a5a, 0.98)
      .setStrokeStyle(4, 0xc4a040, 1).setScrollFactor(0).setDepth(depth + 1);
    const panelInner = s.add.rectangle(centerX, centerY, panelWidth - 12, panelHeight - 12, 0x2a2a4a, 0)
      .setStrokeStyle(2, 0x8a7a3a, 0.8).setScrollFactor(0).setDepth(depth + 1);

    const titleY = centerY - ph + 28;
    const title = s.add.text(centerX, titleY, "升 级 !", {
      fontFamily: "ZpixOne", fontSize: "24px", color: "#fef08a", stroke: "#0a0a0a", strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2);

    const subtitle = s.add.text(centerX, titleY + 22, `Lv.${s.level}`, {
      fontFamily: "ZpixOne", fontSize: "12px", color: "#8a8aaa"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2);

    const availableUpgrades = LEVEL_UP_UPGRADES.filter((upgrade) => {
      if (upgrade.isPassive && upgrade.passiveKey) return !s.player.hasPassive(upgrade.passiveKey);
      return true;
    });
    const choices = Phaser.Utils.Array.Shuffle([...availableUpgrades]).slice(0, 3);
    const optionObjects = [];

    const optStartY = centerY - ph + 72;
    const optHeight = 62;
    const optGap = 6;
    const optWidth = panelWidth - 36;
    const optLeft = centerX - optWidth / 2;

    choices.forEach((upgrade, index) => {
      const y = optStartY + index * (optHeight + optGap);
      if (y + optHeight / 2 > centerY + ph - 62) return;
      const color = UPGRADE_COLORS[upgrade.id] || 0xc4a040;
      const icon = UPGRADE_ICONS[upgrade.id] || "?";

      let isEvolution = false;
      let evoName = "";
      if (upgrade.passiveKey) {
        const rule = WEAPON_EVOLUTION_RULES.find(r => r.requiredPassive === upgrade.passiveKey);
        if (rule) {
          const owned = s.player.weapons?.find(w => (w.baseType || w.type) === rule.weapon);
          if (owned && owned.level >= rule.level) { isEvolution = true; evoName = rule.evolution; }
        }
      }

      const bgColor = isEvolution ? 0x2a3a2a : 0x2a2a4a;
      const strokeColor = isEvolution ? 0xfef08a : 0xc4a040;
      const box = s.add.rectangle(centerX, y, optWidth, optHeight, bgColor, 0.96)
        .setStrokeStyle(isEvolution ? 2 : 1, strokeColor, 0.9)
        .setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(depth + 2);

      const accent = s.add.rectangle(optLeft + 3, y, 4, optHeight - 8, color, 1)
        .setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth + 3);

      const iconText = s.add.text(optLeft + 16, y, icon, {
        fontFamily: "ZpixOne", fontSize: "20px"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 3);

      const nameStr = `[${index + 1}] ${upgrade.label}`;
      const nameText = s.add.text(optLeft + 32, y - 12, nameStr, {
        fontFamily: "ZpixOne", fontSize: "14px", color: "#f0f4ff", stroke: "#0a0a0a", strokeThickness: 2
      }).setScrollFactor(0).setDepth(depth + 3);

      let descStr = upgrade.description || "";
      if (isEvolution) descStr = `✦ ${evoName}`;
      const descText = s.add.text(optLeft + 32, y + 8, descStr, {
        fontFamily: "ZpixOne", fontSize: "11px", color: isEvolution ? "#fef08a" : "#a0a0b0"
      }).setScrollFactor(0).setDepth(depth + 3);

      if (isEvolution) {
        const badge = s.add.text(centerX + pw - 14, y - 12, "进化!", {
          fontFamily: "ZpixOne", fontSize: "10px", color: "#fef08a", stroke: "#0a0a0a", strokeThickness: 2
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(depth + 3);
        optionObjects.push(badge);
      }

      const chooseUpgrade = () => { this.apply(upgrade); this.close(); };
      box.on("pointerdown", chooseUpgrade);
      box.on("pointerover", () => box.setFillStyle(isEvolution ? 0x3a5a3a : 0x3a3a5a, 1));
      box.on("pointerout", () => box.setFillStyle(bgColor, 0.96));
      s.levelUpOptionActions.push(chooseUpgrade);

      optionObjects.push(box, accent, iconText, nameText, descText);
    });

    // Weapon bar
    const weapons = s.player.weapons || [];
    const barY = centerY + ph - 44;
    if (weapons.length > 0) {
      const weaponStr = weapons.map(w => {
        const name = (w.baseType || w.type).replace(/_/g, " ");
        return `${name} Lv.${w.level}`;
      }).join(" | ");
      const weaponBar = s.add.text(centerX, barY, weaponStr, {
        fontFamily: "ZpixOne", fontSize: "10px", color: "#8a8aaa"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2);
      optionObjects.push(weaponBar);
    }

    // Reroll & Skip
    const btnRowY = centerY + ph - 22;
    const rerollsLeft = this.rerollsRemaining;

    const rerollBtn = s.add.rectangle(centerX - 46, btnRowY, 80, 28, 0x3b5998, 1)
      .setStrokeStyle(2, rerollsLeft > 0 ? 0xc4a040 : 0x4a4a5a, 0.8)
      .setScrollFactor(0).setDepth(depth + 2).setInteractive({ useHandCursor: rerollsLeft > 0 });
    const rerollText = s.add.text(centerX - 46, btnRowY, `重抽${rerollsLeft}`, {
      fontFamily: "ZpixOne", fontSize: "11px", color: rerollsLeft > 0 ? "#ffffff" : "#6a6a7a"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 3);

    if (rerollsLeft > 0) {
      const doReroll = () => {
        this.rerollsRemaining -= 1;
        this.close();
        s.pendingLevelUps += 1;
        s.time.delayedCall(50, () => this.open());
      };
      rerollBtn.on("pointerdown", doReroll);
      rerollText.setInteractive({ useHandCursor: true });
      rerollText.on("pointerdown", doReroll);
    }

    const skipBtn = s.add.rectangle(centerX + 46, btnRowY, 64, 28, 0xb03020, 1)
      .setStrokeStyle(2, 0xc4a040, 1).setScrollFactor(0).setDepth(depth + 2)
      .setInteractive({ useHandCursor: true });
    const skipText = s.add.text(centerX + 46, btnRowY, "跳过", {
      fontFamily: "ZpixOne", fontSize: "11px", color: "#ffffff"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 3);

    const doSkip = () => this.close();
    skipBtn.on("pointerdown", doSkip);
    skipText.on("pointerdown", doSkip);
    skipText.setInteractive({ useHandCursor: true });

    optionObjects.push(rerollBtn, rerollText, skipBtn, skipText);

    s.levelUpUi = [overlay, panelShadow, panel, panelInner, title, subtitle, ...optionObjects];
  }

  close() {
    const s = this.scene;
    s.levelUpUi.forEach((obj) => obj.destroy());
    s.levelUpUi = [];
    s.levelUpOptionActions = [];
    s.isLeveling = false;
    s.applyHudModalFocus(false);
    s.director?.resume?.();
    s.weaponSystem?.resume?.();
    s.physics.resume();

    if (s.pendingLevelUps > 0) this.open();
  }

  handleInput() {
    const s = this.scene;
    const indexes = [s.keys.meta1, s.keys.meta2, s.keys.meta3];
    for (let i = 0; i < indexes.length; i += 1) {
      if (Phaser.Input.Keyboard.JustDown(indexes[i])) {
        const action = s.levelUpOptionActions[i];
        if (action) action();
      }
    }
  }

  apply(upgrade) {
    if (!upgrade) return;
    const s = this.scene;

    // Passive cards
    if (upgrade.isPassive && upgrade.passiveKey) {
      if (s.player.hasPassive(upgrade.passiveKey)) return;
      s.player.addPassive(upgrade.passiveKey);

      if (upgrade.passiveKey === "ember_core") {
        s.weaponSystem.addGlobalDamagePercent(upgrade.value, "fireball");
      } else if (upgrade.passiveKey === "blade_sigil") {
        s.weaponSystem.addGlobalDamagePercent(upgrade.value, "dagger");
      } else if (upgrade.passiveKey === "iron_shell") {
        s.player.damageReduction = (s.player.damageReduction || 0) + upgrade.value;
      } else if (upgrade.passiveKey === "swift_feet") {
        s.player.speed = Math.round(s.player.speed * (1 + upgrade.value));
      } else if (upgrade.passiveKey === "wings") {
        s.weaponSystem.addGlobalRangePercent(upgrade.value);
      } else if (upgrade.passiveKey === "armor") {
        s.player.armorFlat += upgrade.value;
      } else if (upgrade.passiveKey === "hollow_heart") {
        s.player.maxHp = Math.round(s.player.maxHp * (1 + upgrade.value));
        s.player.hp = s.player.maxHp;
      } else if (upgrade.passiveKey === "attractorb") {
        s.player.pickupRadius = Math.round(s.player.pickupRadius * (1 + upgrade.value));
      } else if (upgrade.passiveKey === "frost_shard") {
        s.weaponSystem.addGlobalDamagePercent(upgrade.value, "frost");
      } else if (upgrade.passiveKey === "spellbinder") {
        s.weaponSystem.addGlobalDurationPercent(upgrade.value);
      } else if (upgrade.passiveKey === "candelabrador") {
        s.weaponSystem.addGlobalRangePercent(upgrade.value);
      } else if (upgrade.passiveKey === "duplicator") {
        s.weaponSystem.addProjectileCount(upgrade.value);
      } else if (upgrade.passiveKey === "bracer") {
        s.weaponSystem.addAttackSpeedPercent(upgrade.value);
      }
      s.showHudAlert(upgrade.passiveKey.toUpperCase(), 1200);
      return;
    }

    // Stat upgrades
    if (upgrade.id === "weapon_damage") { s.weaponSystem.addGlobalDamagePercent(upgrade.value); return; }
    if (upgrade.id === "attack_speed") {
      s.attackIntervalMs = Math.max(180, Math.floor(s.attackIntervalMs * (1 - upgrade.value)));
      s.weaponSystem.addAttackSpeedPercent(upgrade.value);
      return;
    }
    if (upgrade.id === "projectile_count") { s.weaponSystem.addProjectileCount(upgrade.value); return; }
    if (upgrade.id === "movement_speed") { s.player.speed += upgrade.value; return; }
    if (upgrade.id === "pickup_radius") { s.player.pickupRadius += upgrade.value; return; }
    if (upgrade.id === "lifesteal") {
      s.player.lifestealChance = (s.player.lifestealChance || 0) + upgrade.value;
      s.player.lifestealAmount = (s.player.lifestealAmount || 0) + 5;
      return;
    }
    if (upgrade.id === "max_hp_boost") {
      s.player.maxHp = Math.round(s.player.maxHp * (1 + upgrade.value));
      s.player.hp = Math.min(s.player.hp + Math.round(s.player.maxHp * upgrade.value), s.player.maxHp);
      return;
    }
    if (upgrade.id === "xp_boost") { s.metaXpMultiplier += upgrade.value; return; }
    if (upgrade.id === "luck_boost") { s.player.luck = (s.player.luck || 0) + upgrade.value; return; }
    if (upgrade.id === "crit_chance") {
      s.player.critChance = (s.player.critChance || 0) + upgrade.value;
      s.player.critMultiplier = 2;
      return;
    }
    if (upgrade.id === "duration_boost") { s.weaponSystem.addGlobalDurationPercent(upgrade.value); return; }
    if (upgrade.id === "cooldown_reduction") { s.weaponSystem.addAttackSpeedPercent(upgrade.value); return; }
    if (upgrade.id === "revival") {
      s.player.revivals = (s.player.revivals || 0) + 1;
      s.showHudAlert("REVIVAL READY", 1500);
    }
  }
}
