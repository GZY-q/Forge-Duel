const FRAME_COUNT = 18;
const FRAME_KEY = "logo_frame";
const INTRO_SOUND_KEY = "intro_sound";
const INTRO_SOUND_PATH = "assets/audio/bgm/VS_TitleIntro_v01-03.mp3";

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
    if (!this.cache.audio.exists(INTRO_SOUND_KEY)) {
      this.load.audio(INTRO_SOUND_KEY, INTRO_SOUND_PATH);
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

    if (!this.anims.exists("logo_anim")) {
      this.anims.create({
        key: "logo_anim",
        frames: frames,
        frameRate: 10,
        repeat: 0
      });
    }

    logoSprite.play("logo_anim");
    
    if (this.sound && this.cache.audio.exists(INTRO_SOUND_KEY)) {
      const bgmVol = this.settingsBgmVol ?? 0.6;
      this.sound.play(INTRO_SOUND_KEY, { volume: bgmVol * 0.8, loop: false });
    }

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
