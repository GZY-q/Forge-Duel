import { RENDER_DEPTH } from "../config/render-layers.js";
import { HUD_EXP_BAR_WIDTH, HUD_EXP_PULSE_SCALE, HUD_EXP_PULSE_DURATION_MS } from "../config/hud.js";
import { WEAPON_ICON_ASSETS } from "../config/assets.manifest.js";
import { WORLD_WIDTH, WORLD_HEIGHT } from "../config/progression.js";

export class GameplayHUD {
  constructor(scene) {
    this.scene = scene;

    this.hudElapsedSeconds = -1;
    this.hudObjects = [];
    this.hudWeaponSlotIcons = [];
    this.hudWeaponSlotFrames = [];
    this.hudWeaponSlotLabels = [];
    this.hudWeaponLabel = null;
    this.hud = null;

    this.hudLevelText = null;
    this.hudStatsText = null;
    this.hudTimerText = null;
    this.hudGoldText = null;
    this.hudDashStatusText = null;
    this.hudSecondaryText = null;
    this.hudCoreLabelText = null;
    this.hudSecondaryLabelText = null;
    this.hudXpLabelText = null;

    this.hudBarsGraphics = null;
    this.enemyHealthBarsGraphics = null;

    this.hudPanelBack = null;
    this.hudSecondaryPanel = null;
    this.hudXpFrame = null;
    this.hudHeaderChip = null;
    this.hudSecondaryChip = null;

    this.hpText = null;
    this.expText = null;
    this.expBarBg = null;
    this.expBarFill = null;
    this.timeText = null;
    this.killText = null;

    this.domHudElement = null;
    this.domHudRefs = null;
    this.domHudWeaponSlots = [];
  }

  createLegacyLayer() {
    this.hudLevelText = this.scene.add
      .text(20, 24, "", {
        fontFamily: "ZpixOne",
        fontSize: "21px",
        color: "#fff0cf",
        stroke: "#28170f",
        strokeThickness: 4
      })
      .setScrollFactor(0)
      .setDepth(10);
    this.hudStatsText = this.scene.add
      .text(20, 58, "", {
        fontFamily: "ZpixOne",
        fontSize: "14px",
        color: "#cdb28a",
        stroke: "#28170f",
        strokeThickness: 2
      })
      .setScrollFactor(0)
      .setDepth(10);
    this.hudTimerText = this.scene.add
      .text(20, 74, "", {
        fontFamily: "ZpixOne",
        fontSize: "14px",
        color: "#f0dfbe",
        stroke: "#28170f",
        strokeThickness: 3
      })
      .setScrollFactor(0)
      .setDepth(10);
    this.hudGoldText = this.scene.add
      .text(20, 90, "", {
        fontFamily: "ZpixOne",
        fontSize: "14px",
        color: "#e6cc86",
        stroke: "#28170f",
        strokeThickness: 3
      })
      .setScrollFactor(0)
      .setDepth(10);
    this.hudXpLabelText = this.scene.add
      .text(20, 44, "EXP", {
        fontFamily: "ZpixOne",
        fontSize: "9px",
        color: "#e7d6b4",
        stroke: "#28170f",
        strokeThickness: 2
      })
      .setScrollFactor(0)
      .setDepth(10);
    this.hudSecondaryText = this.scene.add
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
    this.hudCoreLabelText = this.scene.add
      .text(76, 18, "SURVIVAL LOG", {
        fontFamily: "ZpixOne",
        fontSize: "11px",
        color: "#2e170d"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.hudSecondaryLabelText = this.scene.add
      .text(1104, 18, "CREW KIT", {
        fontFamily: "ZpixOne",
        fontSize: "11px",
        color: "#2e170d"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    this.hudBarsGraphics = this.scene.add.graphics().setScrollFactor(0).setDepth(9);
    this.enemyHealthBarsGraphics = this.scene.add.graphics().setDepth(8.6);
    const weaponSlotCount = Math.max(1, this.scene.player?.maxWeaponSlots ?? 3);
    const slotGap = 44;
    const slotStartX = 640 - ((weaponSlotCount - 1) * slotGap) / 2;
    const slotY = 22;
    this.hudWeaponSlotFrames = [];
    this.hudWeaponSlotLabels = [];
    for (let i = 0; i < weaponSlotCount; i += 1) {
      const slotX = Math.round(slotStartX + i * slotGap);
      const frame = this.scene.add
        .rectangle(slotX, slotY, 34, 34, 0x2f1b12, 0.8)
        .setStrokeStyle(2, 0x6d4a31, 0.8)
        .setScrollFactor(0)
        .setDepth(10);
      const label = this.scene.add
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
  }

  create() {
    this.hudObjects.forEach((obj) => obj?.destroy?.());
    this.hudObjects = [];
    this.hud = null;

    // ── VS-style top XP bar ──
    this.topXpBarHeight = 4;
    this.topXpBarBg = this.scene.add
      .rectangle(0, 0, 100, this.topXpBarHeight, 0x1a1008, 0.92)
      .setOrigin(0, 0)
      .setDepth(RENDER_DEPTH.HUD + 2);
    this.topXpBarFill = this.scene.add
      .rectangle(0, 0, 0, this.topXpBarHeight, 0x6fd7ff, 0.95)
      .setOrigin(0, 0)
      .setDepth(RENDER_DEPTH.HUD + 3);
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

  layoutHUDToCamera() {}

  update() {
    if (!this.scene.player) return;

    const currentExp = Number.isFinite(this.scene.player.exp) ? this.scene.player.exp : this.scene.currentXp;
    const expToNext = Number.isFinite(this.scene.player.expToNext) ? this.scene.player.expToNext : this.scene.xpToNext;
    const xpRatio = expToNext > 0 ? Phaser.Math.Clamp(currentExp / expToNext, 0, 1) : 0;
    const levelValue = Number.isFinite(this.scene.player.level) ? this.scene.player.level : this.scene.level;
    const elapsedMs = Math.max(0, Number.isFinite(this.scene.playTime) ? this.scene.playTime : this.scene.runTimeMs);
    const xpPercent = Math.round(xpRatio * 100);
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    // Update VS-style top XP bar
    const cam = this.scene.cameras?.main;
    if (cam && this.topXpBarBg) {
      const view = cam.worldView;
      const cx = view.x;
      const cy = view.y;
      const screenW = view.width;
      this.topXpBarBg.setPosition(cx, cy);
      this.topXpBarBg.setSize(screenW, this.topXpBarHeight);
      this.topXpBarFill.setPosition(cx, cy);
      this.topXpBarFill.setSize(screenW * xpRatio, this.topXpBarHeight);
    }

    this.hudElapsedSeconds = elapsedSeconds;
    this.updateDomHudOverlay(levelValue, xpPercent, elapsedMs, xpRatio);
    this.syncLegacyHudFallback(levelValue, xpPercent, elapsedMs);
  }

  syncLegacyHudFallback(levelValue, xpPercent, elapsedMs) {
    const fallbackAlpha = this.scene.isLeveling || this.scene.isWeaponSelecting ? 0.34 : 1;
    const baseX = 16;
    const baseY = 16;
    if (this.hudLevelText) {
      this.hudLevelText.setText(`HP: ${this.scene.player.hp}/${this.scene.player.maxHp}`);
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
      this.hudGoldText.setText(`KILLS: ${this.scene.totalKills}`);
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
    let activeBoss = null;
    this.scene.enemies.getChildren().forEach((enemy) => {
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
    const worldView = this.scene.cameras?.main?.worldView;
    this.scene.enemies.getChildren().forEach((enemy) => {
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

  updateWeaponIcons() {}

  getWeaponIconKey(weaponType) {
    const iconAsset = WEAPON_ICON_ASSETS[weaponType];
    if (iconAsset && this.scene.textures.exists(iconAsset.key)) {
      return iconAsset.key;
    }
    return "proj_dagger";
  }

  getWeaponIconPath(weaponType) {
    return WEAPON_ICON_ASSETS[weaponType]?.path ?? WEAPON_ICON_ASSETS.dagger.path;
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
      <div class="hud-info-bar">
        <span data-key="exp-level">Lv.1</span>
        <span class="hud-info-sep">|</span>
        <span data-key="time">00:00</span>
        <span class="hud-info-sep">|</span>
        <span>&#x1F480;</span><span data-key="kills">0</span>
        <span class="hud-info-sep">|</span>
        <span>&#x1FA99;</span><span data-key="coins">0</span>
      </div>
    `;
    appRoot.appendChild(hud);
    this.domHudElement = hud;
    this.domHudRefs = {
      timeText: hud.querySelector('[data-key="time"]'),
      loadout: hud.querySelector('[data-key="hud-loadout"]'),
      weaponRow: hud.querySelector('[data-key="hud-weapon-row"]'),
      killsText: hud.querySelector('[data-key="kills"]'),
      coinsText: hud.querySelector('[data-key="coins"]'),
      expLevel: hud.querySelector('[data-key="exp-level"]'),
      bossBar: hud.querySelector('[data-key="boss-bar"]'),
      bossHpBar: hud.querySelector('[data-key="boss-hp-bar"]'),
      bossHpText: hud.querySelector('[data-key="boss-hp-text"]')
    };
    const loadout = this.domHudRefs.loadout;
    const weaponRow = this.domHudRefs.weaponRow;
    const weaponSlotCount = Math.max(1, this.scene.player?.maxWeaponSlots ?? 3);
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
    if (!this.scene.inputController.touchControlsEnabled || !this.domHudElement) return;
    const loadout = this.domHudRefs?.loadout;
    if (loadout) { loadout.style.left = "10px"; loadout.style.top = "10px"; }
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
    if (this.scene._domJoystickBase) this.scene._domJoystickBase.style.display = v;
    if (this.scene._domDashBtn) this.scene._domDashBtn.style.display = v;
    if (this.scene._domPauseBtn) this.scene._domPauseBtn.style.display = v;
  }

  teardownDomHudOverlay() {
    if (this.domHudElement?.parentNode) {
      this.domHudElement.parentNode.removeChild(this.domHudElement);
    }
    this.domHudElement = null;
    this.domHudRefs = null;
    this.domHudWeaponSlots = [];
  }

  updateDomHudOverlay(levelValue, _xpPercent, elapsedMs, _xpRatio) {
    if (!this.domHudElement || !this.scene.player || !this.domHudRefs) return;
    const { timeText, killsText, coinsText, expLevel, loadout } = this.domHudRefs;
    const formatInt = (v) => Math.max(0, Math.floor(Number(v) || 0)).toLocaleString("en-US");

    if (expLevel) expLevel.textContent = `Lv.${levelValue}`;
    if (timeText) timeText.textContent = this.formatRunTime(elapsedMs);
    if (killsText) killsText.textContent = formatInt(this.scene.totalKills);
    if (coinsText) coinsText.textContent = formatInt(this.scene.runMetaCurrency);
    if (loadout) loadout.style.opacity = this.scene.isLeveling || this.scene.isWeaponSelecting ? "0.42" : "1";
    const equippedWeapons = this.scene.player?.weapons ?? [];
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
    this.domHudElement.classList.toggle("modal-open", this.scene.isLeveling || this.scene.isWeaponSelecting);
  }

  formatRunTime(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
}
