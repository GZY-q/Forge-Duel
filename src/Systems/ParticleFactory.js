import { PARTICLE_TEXTURE_KEY, PARTICLE_FALLBACK_TEXTURE_KEY, PARTICLE_GENERATED_FALLBACK_TEXTURE_KEY } from "../config/drops.js";
import { DASH_SPRITE } from "../config/assets.manifest.js";

export class ParticleFactory {
  constructor(scene) {
    this.scene = scene;
    this.damageEmitter = null;
    this.killEmitter = null;
    this.eliteKillEmitter = null;
    this.evolutionEmitter = null;
    this.dashTrailEmitter = null;
    this.dashParticles = null;
  }

  getSafeParticleTextureKey() {
    if (this.scene.textures.exists(DASH_SPRITE.key)) {
      return DASH_SPRITE.key;
    }
    if (this.scene.textures.exists(PARTICLE_TEXTURE_KEY)) {
      return PARTICLE_TEXTURE_KEY;
    }
    if (this.scene.textures.exists(PARTICLE_FALLBACK_TEXTURE_KEY)) {
      return PARTICLE_FALLBACK_TEXTURE_KEY;
    }
    this.scene.textureFactory.generateCircleTexture(PARTICLE_GENERATED_FALLBACK_TEXTURE_KEY, 2, 0xffffff, 0xffffff);
    return PARTICLE_GENERATED_FALLBACK_TEXTURE_KEY;
  }

  isEmitterReady(emitter) {
    if (!emitter || !emitter.active || !emitter.texture) {
      return false;
    }
    const textureKey = emitter.texture.key;
    return typeof textureKey === "string" && this.scene.textures.exists(textureKey);
  }

  createAll() {
    if (this.damageEmitter) {
      this.damageEmitter.destroy();
    }
    if (this.killEmitter) {
      this.killEmitter.destroy();
    }
    if (this.eliteKillEmitter) {
      this.eliteKillEmitter.destroy();
    }
    if (this.evolutionEmitter) {
      this.evolutionEmitter.destroy();
    }
    if (this.dashTrailEmitter) {
      this.dashTrailEmitter.destroy();
    }

    const particleTextureKey = this.getSafeParticleTextureKey();
    this.damageEmitter = this.scene.add.particles(0, 0, particleTextureKey, {
      emitting: false,
      quantity: 0,
      frequency: -1,
      speed: { min: 45, max: 180 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 90, max: 220 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.95, end: 0 },
      tint: [0xffffff, 0xffd6ad, 0xffb87f],
      blendMode: "ADD"
    });
    this.damageEmitter.setDepth(9);

    this.killEmitter = this.scene.add.particles(0, 0, particleTextureKey, {
      emitting: false,
      quantity: 0,
      frequency: -1,
      speed: { min: 80, max: 240 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 140, max: 320 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.95, end: 0 },
      tint: [0xffffff, 0xffd8a8, 0xff9b7a],
      blendMode: "ADD"
    });
    this.killEmitter.setDepth(10);

    this.eliteKillEmitter = this.scene.add.particles(0, 0, particleTextureKey, {
      emitting: false,
      quantity: 0,
      frequency: -1,
      speed: { min: 120, max: 300 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 180, max: 360 },
      scale: { start: 1.35, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xa5f3ff, 0xc8a8ff],
      blendMode: "ADD"
    });
    this.eliteKillEmitter.setDepth(11);

    this.evolutionEmitter = this.scene.add.particles(0, 0, particleTextureKey, {
      emitting: false,
      quantity: 0,
      frequency: -1,
      speed: { min: 140, max: 360 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 160, max: 420 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xfff0a6, 0xa5f1ff, 0xcbb2ff],
      blendMode: "ADD"
    });
    this.evolutionEmitter.setDepth(12);

    this.dashTrailEmitter = this.scene.add.particles(0, 0, particleTextureKey, {
      emitting: false,
      quantity: 0,
      frequency: -1,
      speed: { min: 12, max: 70 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 70, max: 140 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: [0xfff3b3, 0xb8f0ff, 0x79d7ff],
      blendMode: "ADD"
    });
    this.dashTrailEmitter.setDepth(8);
    this.dashParticles = this.dashTrailEmitter;
  }

  ensureReady() {
    if (
      this.isEmitterReady(this.damageEmitter) &&
      this.isEmitterReady(this.killEmitter) &&
      this.isEmitterReady(this.eliteKillEmitter) &&
      this.isEmitterReady(this.evolutionEmitter) &&
      this.isEmitterReady(this.dashTrailEmitter)
    ) {
      return true;
    }

    this.createAll();
    return (
      this.isEmitterReady(this.damageEmitter) &&
      this.isEmitterReady(this.killEmitter) &&
      this.isEmitterReady(this.eliteKillEmitter) &&
      this.isEmitterReady(this.evolutionEmitter) &&
      this.isEmitterReady(this.dashTrailEmitter)
    );
  }

  destroyAll() {
    this.damageEmitter?.destroy();
    this.killEmitter?.destroy();
    this.eliteKillEmitter?.destroy();
    this.evolutionEmitter?.destroy();
    this.dashTrailEmitter?.destroy();
    this.damageEmitter = null;
    this.killEmitter = null;
    this.eliteKillEmitter = null;
    this.evolutionEmitter = null;
    this.dashTrailEmitter = null;
    this.dashParticles = null;
  }
}
