const FRAME_COUNT = 18;
const FRAME_KEY = "logo_frame";

export class IntroScene extends Phaser.Scene {
  constructor() {
    super("IntroScene");
  }

  preload() {
    this.load.image("main_menu_bg", "assets/sprites/ui/Home Page Background.png");
    for (let i = 0; i < FRAME_COUNT; i++) {
      const key = `${FRAME_KEY}${i}`;
      this.load.image(key, `assets/sprites/ui/logo_frames/frame_${String(i).padStart(3, "0")}.png`);
    }
  }

  create() {
    const cam = this.cameras.main;
    const cx = cam.width * 0.5;
    const cy = cam.height * 0.5;

    this.add.image(cx, cy, "main_menu_bg").setDisplaySize(cam.width, cam.height);

    const titleY = cy - 140;
    const desiredHeight = 200;
    const scale = desiredHeight / 570;

    const firstFrame = `${FRAME_KEY}0`;
    const logoSprite = this.add.sprite(cx, titleY, firstFrame);
    logoSprite.setScale(scale);

    const frames = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      frames.push({ key: `${FRAME_KEY}${i}` });
    }

    this.anims.create({
      key: "logo_anim",
      frames: frames,
      frameRate: 10,
      repeat: 0
    });

    logoSprite.play("logo_anim");

    this.time.delayedCall(2000, () => {
      this.scene.start("ShipSelectionScene", { mode: "solo" });
    });

    this.input.keyboard?.once("keydown-SPACE", () => {
      this.scene.start("ShipSelectionScene", { mode: "solo" });
    });
    this.input.once("pointerdown", () => {
      this.scene.start("ShipSelectionScene", { mode: "solo" });
    }, this);
  }
}
