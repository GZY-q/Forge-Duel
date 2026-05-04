/**
 * VS-style back button fixed at the top-right corner.
 * Red button with gold border — matches Vampire Survivors UI.
 *
 * @param {Phaser.Scene} scene
 * @param {function} onBack - callback when back is pressed
 * @param {number} [x] - optional x position (defaults to top-right)
 * @param {number} [y] - optional y position
 * @returns {{ container, img, text, setVisible }}
 */
import { BUTTON_TEXTURES, getButtonSize } from "./vsUI.js";

export function createBackButton(scene, onBack, x, y) {
  x = x ?? scene.cameras.main.width - 84;
  y = y ?? 36;

  const w = 100;
  const { h } = getButtonSize(BUTTON_TEXTURES.red, w);
  const container = scene.add.container(x, y).setDepth(9999);

  const img = scene.add.image(0, 0, BUTTON_TEXTURES.red)
    .setDisplaySize(w, h)
    .setInteractive({ useHandCursor: true });

  const text = scene.add.text(0, 1, "返回", {
    fontFamily: "ZpixOne", fontSize: "14px", color: "#ffffff",
    stroke: "#000000", strokeThickness: 3
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  container.add([img, text]);

  const trigger = () => {
    scene.tweens.add({
      targets: container, scaleX: 0.92, scaleY: 0.92,
      duration: 60, yoyo: true,
      onComplete: () => { if (typeof onBack === "function") onBack(); }
    });
  };

  img.on("pointerdown", trigger);
  text.on("pointerdown", trigger);

  function setVisible(isVisible) {
    container.setVisible(isVisible);
  }

  return { container, img, text, setVisible };
}
