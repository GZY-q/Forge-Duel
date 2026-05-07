const MENU_DEPTH = 2000;
import { BUTTON_TEXTURES, getButtonSize } from "../ui/vsUI.js";

export class PauseManager {
  constructor(scene) {
    this.scene = scene;
  }

  open() {
    const s = this.scene;
    if (s.isPaused || s.isGameOver || s.isLeveling || s.isWeaponSelecting) return;

    s.isPaused = true;
    s.setDomHudVisible(false);
    s.setDomTouchControlsVisible(false);
    s.physics.pause();
    s.weaponSystem?.pause?.();
    s.director?.pause?.();
    s.player.body?.setVelocity(0, 0);

    const cx = 640;
    const cy = 360;
    const pw = 440;
    const ph = 340;
    const d = MENU_DEPTH + 10;
    const uiObjs = [];

    const backdrop = s.add.rectangle(cx, cy, 1280, 720, 0x000000, 0.55).setScrollFactor(0).setDepth(d);
    const panelShadow = s.add.rectangle(cx + 2, cy + 4, pw, ph, 0x000000, 0.5).setScrollFactor(0).setDepth(d + 1);
    const panel = s.add.rectangle(cx, cy, pw, ph, 0x3a3a5a, 0.98).setStrokeStyle(4, 0xc4a040, 1).setScrollFactor(0).setDepth(d + 1);
    const panelInner = s.add.rectangle(cx, cy, pw - 12, ph - 12, 0x2a2a4a, 0).setStrokeStyle(2, 0x8a7a3a, 0.8).setScrollFactor(0).setDepth(d + 1);

    const title = s.add.text(cx, cy - ph / 2 + 24, "游戏暂停", {
      fontFamily: "ZpixOne", fontSize: "24px", color: "#f8fbff", stroke: "#0a0a0a", strokeThickness: 5
    }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 2);

    // Compact stats
    const leftX = cx - pw / 2 + 24;
    const rightX = cx + pw / 2 - 24;
    let sy = cy - ph / 2 + 56;
    const lineH = 17;

    const addRow = (label, value, color = "#ffffff") => {
      uiObjs.push(
        s.add.text(leftX, sy, label, { fontFamily: "ZpixOne", fontSize: "12px", color: "#a0a0b0" }).setScrollFactor(0).setDepth(d + 2),
        s.add.text(rightX, sy, String(value), { fontFamily: "ZpixOne", fontSize: "12px", color }).setOrigin(1, 0).setScrollFactor(0).setDepth(d + 2)
      );
      sy += lineH;
    };

    const totalSec = Math.floor(s.runTimeMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    addRow("存活时间", `${min}:${String(sec).padStart(2, "0")}`);
    addRow("击杀数", s.totalKills);
    addRow("等级", s.level);
    addRow("生命", `${s.player.hp}/${s.player.maxHp}`, "#ff8866");
    sy += 4;

    const weapons = s.player.weapons || [];
    if (weapons.length > 0) {
      uiObjs.push(
        s.add.text(leftX, sy, "— 武器 —", { fontFamily: "ZpixOne", fontSize: "13px", color: "#fef08a" }).setScrollFactor(0).setDepth(d + 2)
      );
      sy += lineH;
      weapons.forEach(w => {
        const name = (w.baseType || w.type).replace(/_/g, " ");
        const dmg = s.weaponSystem?.getScaledWeaponDamage?.(w) ?? w.damage;
        const evoTag = w.evolved ? "✦" : "";
        uiObjs.push(
          s.add.text(leftX + 8, sy, `${evoTag} ${name}`, { fontFamily: "ZpixOne", fontSize: "11px", color: w.evolved ? "#fef08a" : "#c8ddef" }).setScrollFactor(0).setDepth(d + 2),
          s.add.text(rightX, sy, `Lv.${w.level}  DMG:${dmg}`, { fontFamily: "ZpixOne", fontSize: "11px", color: "#a0a0b0" }).setOrigin(1, 0).setScrollFactor(0).setDepth(d + 2)
        );
        sy += lineH;
      });
    }

    const onResume = () => this.close();

    // Buttons
    const btnY = cy + ph / 2 - 52;
    const btnsX = [cx - 150, cx - 50, cx + 50, cx + 150];

    const makeBtn = (xIdx, texture, label, fontSize, onDown) => {
      const btnW = 64;
      const { h: btnH } = getButtonSize(texture, btnW);
      const x = btnsX[xIdx];
      const btn = s.add.image(x, btnY, texture)
        .setDisplaySize(btnW, btnH)
        .setScrollFactor(0).setDepth(d + 2).setInteractive({ useHandCursor: true });
      const lbl = s.add.text(x, btnY + 1, label, {
        fontFamily: "ZpixOne", fontSize: fontSize ?? "12px",
        color: "#ffffff", stroke: "#000000", strokeThickness: 3
      }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 3).setInteractive({ useHandCursor: true });
      btn.on("pointerdown", onDown);
      lbl.on("pointerdown", onDown);
      return { btn, lbl };
    };

    const { lbl: resumeLabel, btn: resumeBtn } = makeBtn(0, BUTTON_TEXTURES.green, "继续游戏", "12px", () => this.close());

    const bgmLabel = s.audioManager.bgmEnabled ? "BGM: ON" : "BGM: OFF";
    const { lbl: bgmText, btn: bgmBtn } = makeBtn(1, BUTTON_TEXTURES.blue, bgmLabel, "10px", () => {
      s.audioManager.bgmEnabled = !s.audioManager.bgmEnabled;
      bgmText.setText(s.audioManager.bgmEnabled ? "BGM: ON" : "BGM: OFF");
      if (s.audioManager.bgmEnabled) { s.audioManager.startBgm(); } else { s.audioManager.stopBgm(); }
    });

    const joystickLabel = s.inputController.joystickMode === "fixed" ? "摇杆: 固定" : "摇杆: 动态";
    const { lbl: joystickText, btn: joystickBtn } = makeBtn(2, BUTTON_TEXTURES.blue, joystickLabel, "10px", () => {
      const newMode = s.inputController.joystickMode === "fixed" ? "dynamic" : "fixed";
      s.inputController.setJoystickMode(newMode);
      joystickText.setText(newMode === "fixed" ? "摇杆: 固定" : "摇杆: 动态");
    });

    const { lbl: quitLabel, btn: quitBtn } = makeBtn(3, BUTTON_TEXTURES.red, "返回菜单", "12px", () => {
      this.close();
      s.finalizeMetaRun();
      s.scene.stop();
      s.scene.start("MainMenuScene");
    });

    s.pauseUi = [backdrop, panelShadow, panel, panelInner, title, resumeBtn, resumeLabel, quitBtn, quitLabel, bgmBtn, bgmText, joystickBtn, joystickText, ...uiObjs];
  }

  close() {
    const s = this.scene;
    if (!s.isPaused) return;

    s.isPaused = false;
    s.pauseUi.forEach((obj) => obj?.destroy?.());
    s.pauseUi = [];
    s.setDomHudVisible(true);
    s.setDomTouchControlsVisible(true);
    if (!s.isGameOver && !s.isLeveling && !s.isWeaponSelecting) {
      s.physics.resume();
      s.weaponSystem?.resume?.();
      s.director?.resume?.();
    }
  }

  handleInput() {
    const s = this.scene;
    if (Phaser.Input.Keyboard.JustDown(s.keys.pause) || Phaser.Input.Keyboard.JustDown(s.keys.pauseAlt)) {
      this.close();
    }
  }
}
