/**
 * Vampire Survivors style UI helpers for ForgeDuel
 * Consistent top bar, panels, buttons, backgrounds across all menu scenes
 */

/* ── Colors (VS palette) ── */
const C = {
  bgRedDark: 0x1a0508,
  bgRedGlow: 0x4a0a12,
  panelBg: 0x3a3a5a,
  panelInner: 0x2a2a4a,
  panelBorder: 0xc4a040,
  panelBorderInner: 0x8a7a3a,
  btnBlue: 0x3b5998,
  btnBlueHover: 0x4a6aaa,
  btnGreen: 0x2d8a3d,
  btnGreenHover: 0x3aaa3a,
  btnRed: 0xb03020,
  btnRedHover: 0xc04030,
  btnBorder: 0xc4a040,
  textGold: 0xfef08a,
  textWhite: 0xffffff,
  textGray: 0xa0a0b0,
  textDark: 0x0a0a0a,
  coinBg: 0x0a0a0a,
  squareFilled: 0xc4a040,
  squareEmpty: 0x1a1a2a,
  squareBorder: 0x4a4a5a,
};

/* ── Background ── */
export function createVSBackground(scene) {
  const cam = scene.cameras.main;
  const cx = cam.width * 0.5;
  const cy = cam.height * 0.5;

  // Dark base
  const bg = scene.add.rectangle(cx, cy, cam.width, cam.height, C.bgRedDark, 1);

  // Red radial glow (centered upper)
  const glow = scene.add.graphics();
  for (let i = 8; i >= 0; i--) {
    const radius = 180 + i * 70;
    const alpha = 0.035 * (9 - i);
    glow.fillStyle(C.bgRedGlow, alpha);
    glow.fillEllipse(cx, cy - 20, radius * 2.2, radius * 1.8);
  }

  // Side vignette (darken edges)
  const vignette = scene.add.graphics();
  vignette.fillStyle(0x000000, 0.4);
  vignette.fillRect(0, 0, cam.width * 0.15, cam.height);
  vignette.fillRect(cam.width * 0.85, 0, cam.width * 0.15, cam.height);

  return { bg, glow, vignette };
}

/* ── Top Bar ── */
export function createVSTopBar(scene, options = {}) {
  const cam = scene.cameras.main;
  const cx = cam.width * 0.5;
  const barY = 36;
  const coinAmount = options.coins ?? 0;

  const container = scene.add.container(0, 0).setDepth(9998);

  // Coin pill (left side, centered-ish)
  const pillW = 180;
  const pillH = 44;
  const pillX = cx;
  const pillY = barY;

  const pillBg = scene.add.rectangle(pillX, pillY, pillW, pillH, C.coinBg, 0.95)
    .setStrokeStyle(3, C.panelBorder, 1)
    .setOrigin(0.5);
  const pillInner = scene.add.rectangle(pillX, pillY, pillW - 8, pillH - 8, 0, 0)
    .setStrokeStyle(1, C.textGold, 0.2)
    .setOrigin(0.5);

  const coinIcon = scene.add.text(pillX - 36, pillY, "💰", {
    fontFamily: "Zpix", fontSize: "22px"
  }).setOrigin(0.5);

  const coinText = scene.add.text(pillX + 24, pillY, `${coinAmount}`, {
    fontFamily: "Zpix", fontSize: "24px", color: "#fef08a",
    stroke: "#3a2a06", strokeThickness: 3
  }).setOrigin(0.5);

  container.add([pillBg, pillInner, coinIcon, coinText]);

  // Right button (back or options)
  let rightBtn = null;
  if (options.showBack) {
    rightBtn = createVSBackButton(scene, cam.width - 84, barY, options.onBack);
  } else if (options.showOptions) {
    rightBtn = createVSOptionsButton(scene, cam.width - 84, barY, options.onOptions);
  }

  return {
    container,
    coinText,
    setCoins(amount) {
      coinText.setText(`${amount}`);
    },
    rightBtn
  };
}

/* ── Back Button (red, top-right) ── */
export function createVSBackButton(scene, x, y, onClick) {
  const w = 100;
  const h = 42;
  const container = scene.add.container(x, y).setDepth(9999);

  const shadow = scene.add.rectangle(0, 3, w, h, 0x000000, 0.5).setOrigin(0.5);
  const plate = scene.add.rectangle(0, 0, w, h, C.btnRed, 1)
    .setStrokeStyle(3, C.btnBorder, 1)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  const bevel = scene.add.rectangle(0, 0, w - 8, h - 8, 0, 0)
    .setStrokeStyle(1, 0xffffff, 0.1)
    .setOrigin(0.5);

  const text = scene.add.text(0, 0, "返回", {
    fontFamily: "Zpix", fontSize: "18px", color: "#ffffff",
    stroke: "#0a0a0a", strokeThickness: 4
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  container.add([shadow, plate, bevel, text]);

  const onOver = () => {
    plate.setFillStyle(C.btnRedHover, 1);
    plate.setStrokeStyle(3, C.textGold, 1);
    text.setColor("#fef08a");
  };
  const onOut = () => {
    plate.setFillStyle(C.btnRed, 1);
    plate.setStrokeStyle(3, C.btnBorder, 1);
    text.setColor("#ffffff");
  };
  const trigger = () => {
    scene.tweens.add({
      targets: container, scaleX: 0.92, scaleY: 0.92,
      duration: 60, yoyo: true,
      onComplete: () => { if (typeof onClick === "function") onClick(); }
    });
  };

  plate.on("pointerover", onOver);
  plate.on("pointerout", onOut);
  text.on("pointerover", onOver);
  text.on("pointerout", onOut);
  plate.on("pointerdown", trigger);
  text.on("pointerdown", trigger);

  return { container, plate, text };
}

/* ── Options Button (blue, top-right) ── */
export function createVSOptionsButton(scene, x, y, onClick) {
  const w = 100;
  const h = 42;
  const container = scene.add.container(x, y).setDepth(9999);

  const shadow = scene.add.rectangle(0, 3, w, h, 0x000000, 0.5).setOrigin(0.5);
  const plate = scene.add.rectangle(0, 0, w, h, C.btnBlue, 1)
    .setStrokeStyle(3, C.btnBorder, 1)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  const bevel = scene.add.rectangle(0, 0, w - 8, h - 8, 0, 0)
    .setStrokeStyle(1, 0xffffff, 0.1)
    .setOrigin(0.5);

  const leftArrow = scene.add.text(-38, 0, "→", {
    fontFamily: "Zpix", fontSize: "12px", color: "#c4a040"
  }).setOrigin(0.5);
  const rightArrow = scene.add.text(38, 0, "←", {
    fontFamily: "Zpix", fontSize: "12px", color: "#c4a040"
  }).setOrigin(0.5);

  const text = scene.add.text(0, 0, "选项", {
    fontFamily: "Zpix", fontSize: "16px", color: "#ffffff",
    stroke: "#0a0a0a", strokeThickness: 4
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  container.add([shadow, plate, bevel, leftArrow, rightArrow, text]);

  const onOver = () => {
    plate.setFillStyle(C.btnBlueHover, 1);
    plate.setStrokeStyle(3, C.textGold, 1);
    text.setColor("#fef08a");
    leftArrow.setColor("#fef08a");
    rightArrow.setColor("#fef08a");
  };
  const onOut = () => {
    plate.setFillStyle(C.btnBlue, 1);
    plate.setStrokeStyle(3, C.btnBorder, 1);
    text.setColor("#ffffff");
    leftArrow.setColor("#c4a040");
    rightArrow.setColor("#c4a040");
  };
  const trigger = () => {
    scene.tweens.add({
      targets: container, scaleX: 0.92, scaleY: 0.92,
      duration: 60, yoyo: true,
      onComplete: () => { if (typeof onClick === "function") onClick(); }
    });
  };

  plate.on("pointerover", onOver);
  plate.on("pointerout", onOut);
  text.on("pointerover", onOver);
  text.on("pointerout", onOut);
  plate.on("pointerdown", trigger);
  text.on("pointerdown", trigger);

  return { container, plate, text };
}

/* ── Central Panel ── */
export function createVSPanel(scene, x, y, w, h) {
  const container = scene.add.container(x, y);

  // Outer shadow
  const shadow = scene.add.rectangle(2, 4, w, h, 0x000000, 0.5).setOrigin(0.5);

  // Main panel bg
  const bg = scene.add.rectangle(0, 0, w, h, C.panelBg, 0.98)
    .setStrokeStyle(4, C.panelBorder, 1)
    .setOrigin(0.5);

  // Inner border
  const inner = scene.add.rectangle(0, 0, w - 12, h - 12, C.panelInner, 0)
    .setStrokeStyle(2, C.panelBorderInner, 0.8)
    .setOrigin(0.5);

  container.add([shadow, bg, inner]);

  return { container, bg, inner, shadow };
}

/* ── Standard Button (blue with gold border) ── */
export function createVSButton(scene, x, y, label, options = {}) {
  const w = options.width ?? 180;
  const h = options.height ?? 46;
  const fontSize = options.fontSize ?? "18px";
  const color = options.color ?? C.btnBlue;
  const hoverColor = options.hoverColor ?? C.btnBlueHover;

  const container = scene.add.container(x, y);

  const shadow = scene.add.rectangle(0, 3, w, h, 0x000000, 0.5).setOrigin(0.5);
  const plate = scene.add.rectangle(0, 0, w, h, color, 1)
    .setStrokeStyle(3, C.btnBorder, 1)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  const bevel = scene.add.rectangle(0, 0, w - 8, h - 8, 0, 0)
    .setStrokeStyle(1, 0xffffff, 0.1)
    .setOrigin(0.5);

  const text = scene.add.text(0, 0, label, {
    fontFamily: "Zpix", fontSize, color: "#ffffff",
    stroke: "#0a0a0a", strokeThickness: 4
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  container.add([shadow, plate, bevel, text]);

  const onOver = () => {
    plate.setFillStyle(hoverColor, 1);
    plate.setStrokeStyle(3, C.textGold, 1);
    text.setColor("#fef08a");
  };
  const onOut = () => {
    plate.setFillStyle(color, 1);
    plate.setStrokeStyle(3, C.btnBorder, 1);
    text.setColor("#ffffff");
  };
  const trigger = () => {
    scene.tweens.add({
      targets: container, scaleX: 0.92, scaleY: 0.92,
      duration: 60, yoyo: true,
      onComplete: () => { if (typeof options.onClick === "function") options.onClick(); }
    });
  };

  plate.on("pointerover", onOver);
  plate.on("pointerout", onOut);
  text.on("pointerover", onOver);
  text.on("pointerout", onOut);
  plate.on("pointerdown", trigger);
  text.on("pointerdown", trigger);

  return { container, plate, text };
}

/* ── Large Start Button ── */
export function createVSStartButton(scene, x, y, label, onClick) {
  return createVSButton(scene, x, y, label, {
    width: 320, height: 64, fontSize: "28px", onClick
  });
}

/* ── Green Confirm Button ── */
export function createVSConfirmButton(scene, x, y, label, onClick) {
  return createVSButton(scene, x, y, label, {
    width: 140, height: 48, fontSize: "20px",
    color: C.btnGreen, hoverColor: C.btnGreenHover, onClick
  });
}

/* ── Card (for character/upgrade grid) ── */
export function createVSCard(scene, x, y, w, h, options = {}) {
  const container = scene.add.container(x, y);

  const bg = scene.add.rectangle(0, 0, w, h, C.panelInner, 0.95)
    .setStrokeStyle(2, C.panelBorder, 0.9)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: !!options.onClick });

  const inner = scene.add.rectangle(0, 0, w - 8, h - 8, 0, 0)
    .setStrokeStyle(1, C.panelBorderInner, 0.5)
    .setOrigin(0.5);

  container.add([bg, inner]);

  if (options.onClick) {
    const onOver = () => {
      if (!options.isSelected) bg.setStrokeStyle(3, C.textGold, 1);
    };
    const onOut = () => {
      bg.setStrokeStyle(options.isSelected ? 3 : 2, options.isSelected ? C.textWhite : C.panelBorder, options.isSelected ? 1 : 0.9);
    };
    bg.on("pointerover", onOver);
    bg.on("pointerout", onOut);
    bg.on("pointerdown", () => {
      scene.tweens.add({
        targets: container, scaleX: 0.95, scaleY: 0.95,
        duration: 60, yoyo: true,
        onComplete: () => { if (typeof options.onClick === "function") options.onClick(); }
      });
    });
  }

  return { container, bg, inner };
}

/* ── Level Squares (for upgrade cards) ── */
export function createVSLevelSquares(scene, container, maxLevel, level = 0, yOffset = 0) {
  const sqSize = 12;
  const sqGap = 4;
  const totalW = maxLevel * sqSize + (maxLevel - 1) * sqGap;
  const startX = -totalW / 2 + sqSize / 2;
  const squares = [];

  for (let l = 0; l < maxLevel; l++) {
    const sq = scene.add.rectangle(startX + l * (sqSize + sqGap), yOffset, sqSize, sqSize,
      l < level ? C.squareFilled : C.squareEmpty, 1)
      .setStrokeStyle(1, l < level ? C.textGold : C.squareBorder, 1);
    container.add(sq);
    squares.push(sq);
  }

  return squares;
}

/* ── Detail Panel (bottom info bar) ── */
export function createVSDetailPanel(scene, x, y, w, h) {
  const container = scene.add.container(x, y);

  const bg = scene.add.rectangle(0, 0, w, h, 0x4a4a5a, 1)
    .setStrokeStyle(2, C.panelBorder, 1)
    .setOrigin(0.5);

  const inner = scene.add.rectangle(0, 0, w - 8, h - 8, 0, 0)
    .setStrokeStyle(1, C.panelBorderInner, 0.6)
    .setOrigin(0.5);

  container.add([bg, inner]);

  return { container, bg, inner };
}

/* ── Title Text ── */
export function createVSTitle(scene, x, y, text, options = {}) {
  const fontSize = options.fontSize ?? "48px";
  const color = options.color ?? "#f8fbff";
  return scene.add.text(x, y, text, {
    fontFamily: "Zpix", fontSize, color,
    stroke: "#000000", strokeThickness: 8,
    shadow: { offsetX: 3, offsetY: 3, color: "#000", blur: 0, fill: true }
  }).setOrigin(0.5).setDepth(100);
}

/* ── Section Title (inside panel) ── */
export function createVSSectionTitle(scene, x, y, text) {
  return scene.add.text(x, y, text, {
    fontFamily: "Zpix", fontSize: "32px", color: "#ffffff",
    stroke: "#000000", strokeThickness: 6
  }).setOrigin(0.5).setDepth(100);
}

/* ── Footer text ── */
export function createVSFooter(scene) {
  const cam = scene.cameras.main;
  return scene.add.text(cam.width * 0.5, cam.height - 24, "ForgeDuel © 2025", {
    fontFamily: "Zpix", fontSize: "12px", color: "#ffffff"
  }).setOrigin(0.5).setAlpha(0.35);
}
