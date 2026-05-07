/**
 * Procedural texture generation utilities.
 * Generates pixel art, circle, polygon, and composite textures at runtime.
 */
export class TextureFactory {
  constructor(scene) {
    this.scene = scene;
  }

  generateCircleTexture(key, radius, fillColor, strokeColor) {
    if (this.scene.textures.exists(key)) return;

    const gfx = this.scene.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(fillColor, 1);
    gfx.fillCircle(radius, radius, radius);
    gfx.generateTexture(key, radius * 2, radius * 2);
    gfx.destroy();
  }

  generatePixelTexture(key, pixelSize, rows, palette, options = {}) {
    if (this.scene.textures.exists(key)) return;

    const safeRows = Array.isArray(rows) ? rows : [];
    const rowCount = safeRows.length;
    const colCount = safeRows.reduce((max, row) => Math.max(max, row.length), 0);
    if (rowCount === 0 || colCount === 0) return;

    const gfx = this.scene.make.graphics({ x: 0, y: 0, add: false });
    const shadowColor = options.shadowColor;
    const shadowOffsetX = Number.isFinite(options.shadowOffsetX) ? options.shadowOffsetX : 0;
    const shadowOffsetY = Number.isFinite(options.shadowOffsetY) ? options.shadowOffsetY : 0;
    if (shadowColor !== undefined && (shadowOffsetX !== 0 || shadowOffsetY !== 0)) {
      safeRows.forEach((row, y) => {
        for (let x = 0; x < row.length; x += 1) {
          const symbol = row[x];
          if (palette[symbol] === undefined) continue;
          gfx.fillStyle(shadowColor, 0.9);
          gfx.fillRect((x + shadowOffsetX) * pixelSize, (y + shadowOffsetY) * pixelSize, pixelSize, pixelSize);
        }
      });
    }
    safeRows.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        const symbol = row[x];
        const color = palette[symbol];
        if (color === undefined) continue;
        gfx.fillStyle(color, 1);
        gfx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    });
    gfx.generateTexture(key, colCount * pixelSize, rowCount * pixelSize);
    gfx.destroy();
  }

  generateCompositeTexture(key, width, height, layers = []) {
    if (this.scene.textures.exists(key)) return;
    if (!Array.isArray(layers) || layers.length === 0) return;

    const allLayersReady = layers.every((layer) => this.scene.textures.exists(layer.sourceKey));
    if (!allLayersReady) return;

    const canvasTexture = this.scene.textures.createCanvas(key, width, height);
    if (!canvasTexture?.context) return;

    const ctx = canvasTexture.context;
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;

    layers.forEach((layer) => {
      const sourceTexture = this.scene.textures.get(layer.sourceKey);
      const sourceImage = sourceTexture?.getSourceImage?.();
      if (!sourceImage) return;
      ctx.drawImage(
        sourceImage, 0, 0, sourceImage.width, sourceImage.height,
        layer.x, layer.y, layer.width, layer.height
      );
    });

    canvasTexture.refresh();
  }

  generatePolygonTexture(key, size, points, fillColor, strokeColor) {
    if (this.scene.textures.exists(key)) return;

    const gfx = this.scene.make.graphics({ x: 0, y: 0, add: false });
    const shapePoints = points.map((point) => new Phaser.Geom.Point(point.x, point.y));
    gfx.fillStyle(fillColor, 1);
    gfx.fillPoints(shapePoints, true);
    gfx.lineStyle(2, strokeColor, 1);
    gfx.strokePoints(shapePoints, true, true);
    gfx.generateTexture(key, size * 2, size * 2);
    gfx.destroy();
  }

  createAllTextures(configs) {
    const { pixelTextures = [], circleTextures = [], polygonTextures = [], compositeTextures = [] } = configs;

    pixelTextures.forEach((cfg) => {
      this.generatePixelTexture(cfg.key, cfg.pixelSize, cfg.rows, cfg.palette, cfg.options);
    });
    circleTextures.forEach((cfg) => {
      this.generateCircleTexture(cfg.key, cfg.radius, cfg.fillColor, cfg.strokeColor);
    });
    polygonTextures.forEach((cfg) => {
      this.generatePolygonTexture(cfg.key, cfg.size, cfg.points, cfg.fillColor, cfg.strokeColor);
    });
    compositeTextures.forEach((cfg) => {
      this.generateCompositeTexture(cfg.key, cfg.width, cfg.height, cfg.layers);
    });
  }
}
