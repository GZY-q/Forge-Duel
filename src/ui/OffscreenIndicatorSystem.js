import {
  OFFSCREEN_INDICATOR_INSET,
  OFFSCREEN_INDICATOR_SIZE,
  OFFSCREEN_INDICATOR_MAX,
  OFFSCREEN_PRIORITY_BONUS_ELITE,
  OFFSCREEN_PRIORITY_BONUS_BOSS
} from "../config/offscreen.js";
import { RENDER_DEPTH } from "../config/render-layers.js";

const OFFSCREEN_MARKER_DEPTH = 19;

export class OffscreenIndicatorSystem {
  constructor(scene) {
    this.scene = scene;
    this.graphics = null;
    this.pool = [];
  }

  init() {
    this.graphics = this.scene.add.graphics().setScrollFactor(0).setDepth(OFFSCREEN_MARKER_DEPTH);
    this.pool = [];
  }

  shutdown() {
    if (Array.isArray(this.pool)) {
      this.pool.forEach((marker) => {
        marker?.setVisible?.(false);
        marker?.setActive?.(false);
      });
    }
  }

  setAlpha(alpha) {
    this.graphics?.setAlpha(alpha);
  }

  getOffscreenIndicatorColor(enemy) {
    if (enemy?.getData?.("isBoss")) {
      return 0xff3b3b;
    }
    if (enemy?.isElite) {
      return 0xffb347;
    }
    return 0xffffff;
  }

  acquireOffscreenIndicator() {
    let marker = this.pool.find((entry) => !entry.active);
    if (marker) {
      return marker;
    }

    const size = OFFSCREEN_INDICATOR_SIZE;
    marker = this.scene.add
      .triangle(
        0,
        0,
        size,
        0,
        -size * 0.78,
        -size * 0.66,
        -size * 0.78,
        size * 0.66,
        0xffffff,
        0.95
      )
      .setScrollFactor(0)
      .setDepth(OFFSCREEN_MARKER_DEPTH)
      .setVisible(false)
      .setActive(false);
    this.pool.push(marker);
    return marker;
  }

  selectOffscreenIndicatorTargets(view, centerX, centerY) {
    const selected = [];
    const normalCandidates = [];
    this.scene.enemies.getChildren().forEach((enemy) => {
      if (!enemy?.active) {
        return;
      }
      if (Phaser.Geom.Rectangle.Contains(view, enemy.x, enemy.y)) {
        return;
      }

      const dx = enemy.x - centerX;
      const dy = enemy.y - centerY;
      const distSq = dx * dx + dy * dy;
      const isBoss = Boolean(enemy.getData?.("isBoss"));
      const isElite = Boolean(enemy.isElite);
      const priorityBonus = isBoss ? OFFSCREEN_PRIORITY_BONUS_BOSS : isElite ? OFFSCREEN_PRIORITY_BONUS_ELITE : 0;
      const score = distSq - priorityBonus;
      const candidate = { enemy, score };

      if (priorityBonus > 0) {
        selected.push(candidate);
      } else {
        normalCandidates.push(candidate);
      }
    });

    selected.sort((a, b) => a.score - b.score);
    if (selected.length >= OFFSCREEN_INDICATOR_MAX) {
      return selected.slice(0, OFFSCREEN_INDICATOR_MAX).map((entry) => entry.enemy);
    }

    normalCandidates.sort((a, b) => a.score - b.score);
    const remaining = OFFSCREEN_INDICATOR_MAX - selected.length;
    return selected
      .concat(normalCandidates.slice(0, remaining))
      .map((entry) => entry.enemy);
  }

  update() {
    if (!this.scene.cameras?.main) {
      return;
    }

    if (this.graphics) {
      this.graphics.clear();
    }
    this.pool.forEach((marker) => {
      marker.setVisible(false);
      marker.setActive(false);
    });

    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    const sw = cam.width;
    const sh = cam.height;
    const centerX = view.centerX;
    const centerY = view.centerY;
    const edgeMinX = OFFSCREEN_INDICATOR_INSET;
    const edgeMaxX = sw - OFFSCREEN_INDICATOR_INSET;
    const edgeMinY = OFFSCREEN_INDICATOR_INSET;
    const edgeMaxY = sh - OFFSCREEN_INDICATOR_INSET;

    const targetX = this.scene.player?.x ?? centerX;
    const targetY = this.scene.player?.y ?? centerY;
    const offscreenTargets = this.selectOffscreenIndicatorTargets(view, targetX, targetY);

    offscreenTargets.forEach((enemy) => {
      const dx = enemy.x - centerX;
      const dy = enemy.y - centerY;
      const length = Math.hypot(dx, dy);
      if (length < 0.0001) {
        return;
      }
      const nx = dx / length;
      const ny = dy / length;

      const scaleX = nx !== 0 ? (nx > 0 ? edgeMaxX - sw / 2 : edgeMinX - sw / 2) / nx : Number.POSITIVE_INFINITY;
      const scaleY = ny !== 0 ? (ny > 0 ? edgeMaxY - sh / 2 : edgeMinY - sh / 2) / ny : Number.POSITIVE_INFINITY;
      const t = Math.min(Math.abs(scaleX), Math.abs(scaleY));
      const screenX = sw / 2 + nx * t;
      const screenY = sh / 2 + ny * t;
      const marker = this.acquireOffscreenIndicator();
      marker.setPosition(screenX, screenY);
      marker.setRotation(Math.atan2(ny, nx));
      marker.setFillStyle(this.getOffscreenIndicatorColor(enemy), 0.95);
      marker.setVisible(true);
      marker.setActive(true);
    });
  }
}
