import {
  DECK_TILE_SIZE,
  EDGE_FOG_TEXTURE_KEY,
  EDGE_FOG_INNER_RADIUS_TILES,
  EDGE_FOG_OUTER_RADIUS_TILES,
  EDGE_FOG_VIGNETTE_OPACITY
} from "../config/environment.js";

export class VignetteSystem {
  constructor(scene) {
    this.scene = scene;
    this.edgeFogRebuildState = { width: 0, height: 0, zoom: 0 };
  }

  rebuildEdgeFogTexture() {
    const width = Math.max(1, Math.round(this.scene.scale?.width ?? 1280));
    const height = Math.max(1, Math.round(this.scene.scale?.height ?? 720));
    const zoom = this.scene.cameraController.getZoom();

    const prev = this.edgeFogRebuildState;
    if (prev.width === width && prev.height === height && Math.abs(prev.zoom - zoom) < 0.001) {
      return;
    }

    if (this.scene.textures.exists(EDGE_FOG_TEXTURE_KEY)) {
      this.scene.textures.remove(EDGE_FOG_TEXTURE_KEY);
    }

    const texture = this.scene.textures.createCanvas(EDGE_FOG_TEXTURE_KEY, width, height);
    if (!texture) {
      return;
    }

    const ctx = texture.context;
    const cx = width * 0.5;
    const cy = height * 0.5;
    const innerRadius = EDGE_FOG_INNER_RADIUS_TILES * DECK_TILE_SIZE * zoom;
    const outerRadius = Math.max(innerRadius + 1, EDGE_FOG_OUTER_RADIUS_TILES * DECK_TILE_SIZE * zoom);
    const gradient = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius);
    gradient.addColorStop(0, "rgba(4, 10, 18, 0)");
    gradient.addColorStop(0.45, "rgba(4, 10, 18, 0.12)");
    gradient.addColorStop(1, "rgba(4, 10, 18, 0.62)");

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    texture.refresh();

    this.edgeFogRebuildState = { width, height, zoom };
  }

  updateEdgeFogOverlay() {
    if (!this.scene.edgeFogOverlay) {
      return;
    }

    this.rebuildEdgeFogTexture();
    if (this.scene.edgeFogOverlay.texture?.key !== EDGE_FOG_TEXTURE_KEY && this.scene.textures.exists(EDGE_FOG_TEXTURE_KEY)) {
      this.scene.edgeFogOverlay.setTexture(EDGE_FOG_TEXTURE_KEY);
    }

    const width = Math.max(1, this.scene.scale?.width ?? 1280);
    const height = Math.max(1, this.scene.scale?.height ?? 720);
    this.scene.edgeFogOverlay.setPosition(width * 0.5, height * 0.5);
  }

  updateLowHealthVignette() {
    if (!this.scene.lowHealthVignetteGraphics || !this.scene.player?.active) {
      return;
    }
    this.scene.lowHealthVignetteGraphics.clear();
    if (this.scene.isGameOver || this.scene.isLeveling || this.scene.isWeaponSelecting) {
      return;
    }
    const hpRatio = Phaser.Math.Clamp(this.scene.player.getHpRatio(), 0, 1);
    if (hpRatio > 0.5) {
      return;
    }

    const baseIntensity = hpRatio <= 0.2 ? 0.34 : hpRatio <= 0.35 ? 0.22 : 0.12;
    const pulseSpeed = hpRatio <= 0.2 ? 105 : hpRatio <= 0.35 ? 130 : 165;
    const pulse = (Math.sin((this.scene.time?.now ?? 0) / pulseSpeed) + 1) * 0.5;
    const alpha = baseIntensity + pulse * (hpRatio <= 0.2 ? 0.12 : 0.08);
    const width = this.scene.scale?.width ?? 1280;
    const height = this.scene.scale?.height ?? 720;
    const edge = Math.max(34, Math.round(Math.min(width, height) * 0.11));
    const innerEdge = Math.max(18, Math.round(edge * 0.58));
    const borderAlpha = hpRatio <= 0.2 ? alpha * 0.9 : alpha * 0.7;
    const outerFillAlpha = hpRatio <= 0.2 ? alpha * 0.78 : alpha * 0.64;
    const innerFillAlpha = hpRatio <= 0.2 ? alpha * 0.32 : alpha * 0.22;

    this.scene.lowHealthVignetteGraphics.fillStyle(0x6e0c0c, outerFillAlpha);
    this.scene.lowHealthVignetteGraphics.fillRect(0, 0, width, edge);
    this.scene.lowHealthVignetteGraphics.fillRect(0, height - edge, width, edge);
    this.scene.lowHealthVignetteGraphics.fillRect(0, 0, edge, height);
    this.scene.lowHealthVignetteGraphics.fillRect(width - edge, 0, edge, height);
    this.scene.lowHealthVignetteGraphics.fillStyle(0xa31616, innerFillAlpha);
    this.scene.lowHealthVignetteGraphics.fillRect(0, 0, width, innerEdge);
    this.scene.lowHealthVignetteGraphics.fillRect(0, height - innerEdge, width, innerEdge);
    this.scene.lowHealthVignetteGraphics.fillRect(0, 0, innerEdge, height);
    this.scene.lowHealthVignetteGraphics.fillRect(width - innerEdge, 0, innerEdge, height);
    this.scene.lowHealthVignetteGraphics.lineStyle(2, 0xff5a5a, borderAlpha);
    this.scene.lowHealthVignetteGraphics.strokeRect(1, 1, width - 2, height - 2);
    this.scene.lowHealthVignetteGraphics.lineStyle(1, 0xffb0a0, borderAlpha * 0.32);
    this.scene.lowHealthVignetteGraphics.strokeRect(innerEdge * 0.3, innerEdge * 0.3, width - innerEdge * 0.6, height - innerEdge * 0.6);
  }
}
