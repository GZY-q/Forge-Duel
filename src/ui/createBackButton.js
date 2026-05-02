/**
 * VS-style back button fixed at the top-right corner.
 * Red button with gold border — matches Vampire Survivors UI.
 *
 * @param {Phaser.Scene} scene
 * @param {function} onBack - callback when back is pressed
 * @param {number} [x] - optional x position (defaults to top-right)
 * @param {number} [y] - optional y position
 * @returns {{ container, plate, text, setVisible }}
 */
export function createBackButton(scene, onBack, x, y) {
  x = x ?? scene.cameras.main.width - 84;
  y = y ?? 36;

  const C = {
    btnRed: 0xb03020,
    btnRedHover: 0xc04030,
    btnBorder: 0xc4a040,
    textGold: 0xfef08a,
  };
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
    fontStyle: "bold", stroke: "#0a0a0a", strokeThickness: 3
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
      onComplete: () => { if (typeof onBack === "function") onBack(); }
    });
  };

  plate.on("pointerover", onOver);
  plate.on("pointerout", onOut);
  text.on("pointerover", onOver);
  text.on("pointerout", onOut);
  plate.on("pointerdown", trigger);
  text.on("pointerdown", trigger);

  function setVisible(isVisible) {
    container.setVisible(isVisible);
  }

  return { container, plate, text, setVisible };
}
