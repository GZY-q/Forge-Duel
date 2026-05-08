import { GAMEPLAY_CAMERA_ZOOM, GAMEPLAY_CAMERA_FOLLOW_LERP_X, GAMEPLAY_CAMERA_FOLLOW_LERP_Y } from "../config/camera.js";
import { WORLD_WIDTH, WORLD_HEIGHT } from "../config/progression.js";

export class CameraController {
  constructor(scene) {
    this.scene = scene;
    this.followEnabled = true;
  }

  setup(
    zoom = GAMEPLAY_CAMERA_ZOOM,
    followLerpX = GAMEPLAY_CAMERA_FOLLOW_LERP_X,
    followLerpY = GAMEPLAY_CAMERA_FOLLOW_LERP_Y,
    target = null
  ) {
    const t = target || this.scene.player;
    this.scene.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.scene.cameras.main.setZoom(zoom);
    this.scene.cameras.main.startFollow(t, true, followLerpX, followLerpY);
  }

  toggleFollow() {
    if (!this.scene.player || !this.scene.cameras?.main) {
      return this.followEnabled;
    }
    this.followEnabled = !this.followEnabled;
    if (this.followEnabled) {
      this.scene.cameras.main.startFollow(
        this.scene.player, true, GAMEPLAY_CAMERA_FOLLOW_LERP_X, GAMEPLAY_CAMERA_FOLLOW_LERP_Y
      );
    } else {
      this.scene.cameras.main.stopFollow();
    }
    return this.followEnabled;
  }

  shake(durationMs, intensity) {
    if (this.scene.settingsScreenShake === false) return;
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  getZoom() {
    return Number(this.scene.cameras?.main?.zoom) || GAMEPLAY_CAMERA_ZOOM || 1;
  }
}
