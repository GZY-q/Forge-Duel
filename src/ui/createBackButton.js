/**
 * Creates a unified back button fixed at the top-left corner.
 * Style matches Blood Survivors: gold border, blue fill, pixel-bevel.
 *
 * @param {Phaser.Scene} scene
 * @param {function} onBack - callback when back is pressed
 */
export function createBackButton(scene, onBack) {
  const x = 60;
  const y = 36;
  const w = 100;
  const h = 36;

  const plate = scene.add.rectangle(x, y, w, h, 0x3b5998, 1)
    .setStrokeStyle(3, 0xd4af37, 1)
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(9999)
    .setInteractive({ useHandCursor: true });

  const bevel = scene.add.rectangle(x, y, w - 6, h - 6, 0, 0)
    .setStrokeStyle(1, 0xffffff, 0.12)
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(9999);

  const text = scene.add.text(x, y, "← 返回", {
    fontFamily: "Zpix", fontSize: "15px", color: "#ffffff",
    fontStyle: "bold", stroke: "#0a0a0a", strokeThickness: 2
  }).setOrigin(0.5).setScrollFactor(0).setDepth(9999)
    .setInteractive({ useHandCursor: true });

  plate.on("pointerover", () => {
    plate.setStrokeStyle(3, 0xfef08a, 1);
    text.setColor("#fef08a");
  });
  plate.on("pointerout", () => {
    plate.setStrokeStyle(3, 0xd4af37, 1);
    text.setColor("#ffffff");
  });
  text.on("pointerover", () => {
    plate.setStrokeStyle(3, 0xfef08a, 1);
    text.setColor("#fef08a");
  });
  text.on("pointerout", () => {
    plate.setStrokeStyle(3, 0xd4af37, 1);
    text.setColor("#ffffff");
  });

  const trigger = () => {
    scene.tweens.add({
      targets: [plate, text, bevel],
      scaleX: 0.92, scaleY: 0.92,
      duration: 60, yoyo: true,
      onComplete: () => onBack()
    });
  };
  plate.on("pointerdown", trigger);
  text.on("pointerdown", trigger);

  return { plate, text, bevel };
}
