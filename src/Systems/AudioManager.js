/**
 * AudioManager  —  extracted from GameScene.js
 *
 * Centralizes all runtime audio concerns:
 *   • SFX dispatch (cached samples + real-time synthesis fallback)
 *   • Per-type throttling
 *   • BGM ambient drone (Web Audio API synthesis)
 *
 * Usage:
 *   // In scene constructor / create:
 *   this.audioManager = new AudioManager(this, {
 *     audioFiles:  SFX_AUDIO_FILES,
 *     keyByType:   SFX_KEY_BY_TYPE,
 *     volume:      SFX_VOLUME,
 *     throttleMs:  SFX_THROTTLE_MS,
 *   });
 *
 *   // During gameplay:
 *   this.audioManager.playSfx("enemy_hit", { elite: true });
 *   this.audioManager.playSfxTone({ wave: "square", startFreq: 900, endFreq: 520, duration: 0.045, gain: 0.03 });
 *   this.audioManager.startBgm();
 *   this.audioManager.stopBgm();
 */

export class AudioManager {
  /**
   * @param {Phaser.Scene} scene       — the owning Phaser scene
   * @param {Object}       sfxConfig
   * @param {Object}       sfxConfig.audioFiles  — { type: path } map (e.g. { dash: "assets/audio/sfx/dash.wav" })
   * @param {Object}       sfxConfig.keyByType   — { type: cache_key  } map
   * @param {Object}       sfxConfig.volume      — { type: baseVolume } map
   * @param {Object}       sfxConfig.throttleMs  — { type: minIntervalMs } map
   */
  constructor(scene, sfxConfig = {}) {
    this.scene = scene;

    // Per-type configuration (maps from config/audio.js)
    this.sfxAudioFiles = sfxConfig.audioFiles || {};
    this.sfxKeyByType   = sfxConfig.keyByType  || {};
    this.sfxVolume      = sfxConfig.volume     || {};
    this.sfxThrottleMs  = sfxConfig.throttleMs || {};

    // Throttle state – keyed by sfx type
    this.sfxLastPlayedAt = {};

    // BGM state
    this.bgmEnabled = true;
    this.bgmNodes   = null;
  }

  /* ------------------------------------------------------------------ */
  /*  BGM  (ambient drone synthesised via Web Audio API)                 */
  /* ------------------------------------------------------------------ */

  /**
   * Start a low ambient drone using three oscillators, a low-pass
   * BiquadFilter, and a subtle LFO for movement.  The sound fades in
   * gracefully over 2 seconds.  Idempotent – calling again while the
   * drone is already playing is a no-op.
   */
  startBgm() {
    if (!this.bgmEnabled || !this.scene.sound || !this.scene.sound.context) {
      return;
    }
    if (this.bgmNodes) {
      return; // already playing
    }

    try {
      const ctx = this.scene.sound.context;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      // Three layered oscillators
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter   = ctx.createBiquadFilter();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(55, ctx.currentTime);   // Low A
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(82.4, ctx.currentTime); // Low E
      osc3.type = "triangle";
      osc3.frequency.setValueAtTime(110, ctx.currentTime);  // A octave up

      // Subtle LFO for movement
      const lfo     = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(0.15, ctx.currentTime);
      lfoGain.gain.setValueAtTime(3, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(200, ctx.currentTime);
      filter.Q.setValueAtTime(1, ctx.currentTime);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        0.035 * (this.scene.settingsBgmVol ?? 0.6),
        ctx.currentTime + 2
      );

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc3.start();
      lfo.start();

      this.bgmNodes = { osc1, osc2, osc3, lfo, gainNode, filter };
    } catch (_) {
      // Audio not available
    }
  }

  /**
   * Fade out the BGM drone over 0.5 s, then stop all oscillators.
   * Safe to call even when the drone is not playing.
   */
  stopBgm() {
    if (!this.bgmNodes) {
      return;
    }
    try {
      const ctx = this.scene.sound?.context;
      if (ctx) {
        this.bgmNodes.gainNode.gain.linearRampToValueAtTime(
          0.0001,
          ctx.currentTime + 0.5
        );
        const nodes = this.bgmNodes;
        setTimeout(() => {
          try {
            nodes.osc1.stop();
            nodes.osc2.stop();
            nodes.osc3.stop();
            nodes.lfo.stop();
          } catch (_) {}
        }, 600);
      }
    } catch (_) {}
    this.bgmNodes = null;
  }

  /* ------------------------------------------------------------------ */
  /*  SFX  helper  —  play a single synthesised tone (Web Audio API)     */
  /* ------------------------------------------------------------------ */

  /**
   * Play a short frequency-swept tone.
   *
   * @param {Object}  params
   * @param {string}  [params.wave="sine"]       — OscillatorNode type
   * @param {number}  [params.startFreq=440]     — Hz at tone start
   * @param {number}  [params.endFreq=220]       — Hz at tone end
   * @param {number}  [params.duration=0.1]      — seconds
   * @param {number}  [params.gain=0.04]         — peak gain (pre-settings multiplier)
   * @param {string}  [params.curve="exponential"] — "linear" or "exponential"
   */
  playSfxTone({
    wave = "sine",
    startFreq = 440,
    endFreq = 220,
    duration = 0.1,
    gain = 0.04,
    curve = "exponential",
  } = {}) {
    if (!this.scene.sound || !this.scene.sound.context) {
      return;
    }

    const sfxVol = this.scene.settingsSfxVol ?? 1;
    if (sfxVol <= 0.001) return;
    gain = gain * sfxVol;

    const audioContext = this.scene.sound.context;
    if (audioContext.state === "suspended" && audioContext.resume) {
      audioContext.resume().catch(() => {});
      if (audioContext.state === "suspended") {
        return;
      }
    }

    const startAt    = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode   = audioContext.createGain();

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(Math.max(40, startFreq), startAt);
    if (curve === "linear") {
      oscillator.frequency.linearRampToValueAtTime(
        Math.max(40, endFreq),
        startAt + duration
      );
    } else {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(40, endFreq),
        startAt + duration
      );
    }

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, gain),
      startAt + 0.01
    );
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.01);
  }

  /* ------------------------------------------------------------------ */
  /*  SFX  —  main dispatch (throttled, cached-sample-first, synthesis   */
  /*         fallback)                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Play a named SFX.
   *
   * Priority order:
   *   1. Throttle check (skip if too recent).
   *   2. Cached audio sample (keyByType lookup → Phaser sound.play).
   *   3. Real-time synthesis fallback (hard-coded per type).
   *
   * @param {string} type           — sfx identifier (e.g. "enemy_hit", "dash", "level_up", …)
   * @param {Object} [options={}]
   * @param {boolean}[options.elite]      — slightly higher gain for elite enemies
   * @param {string} [options.weaponType] — used by "weapon_fire" to pick a sub-type
   */
  playSfx(type, options = {}) {
    const now = this.scene.time?.now ?? Date.now();
    const throttleMs = this.sfxThrottleMs[type] ?? 0;
    const lastPlayed = this.sfxLastPlayedAt[type] ?? Number.NEGATIVE_INFINITY;
    if (now - lastPlayed < throttleMs) {
      return;
    }
    this.sfxLastPlayedAt[type] = now;

    // 1 — Try a preloaded audio sample
    const key = this.sfxKeyByType[type];
    const baseVolume = this.sfxVolume[type] ?? 0.1;
    const sfxVol = this.scene.settingsSfxVol ?? 1;
    const safeVolume = Phaser.Math.Clamp(
      baseVolume * (options.elite ? 1.08 : 1) * sfxVol,
      0.01,
      0.24
    );
    if (key && this.scene.cache?.audio?.exists(key) && this.scene.sound) {
      this.scene.sound.play(key, { volume: safeVolume });
      return;
    }

    // 2 — Synthesis fallback
    // ── enemy_hit ──
    if (type === "enemy_hit") {
      this.playSfxTone({
        wave: "square",
        startFreq: 900,
        endFreq: 520,
        duration: 0.045,
        gain: options.elite ? 0.045 : 0.03,
      });
      return;
    }

    // ── enemy_death ──
    if (type === "enemy_death") {
      this.playSfxTone({
        wave: options.elite ? "sawtooth" : "triangle",
        startFreq: options.elite ? 280 : 240,
        endFreq: options.elite ? 110 : 90,
        duration: options.elite ? 0.2 : 0.14,
        gain: options.elite ? 0.07 : 0.045,
      });
      return;
    }

    // ── dash ──
    if (type === "dash") {
      this.playSfxTone({
        wave: "sawtooth",
        startFreq: 150,
        endFreq: 380,
        duration: 0.12,
        gain: 0.05,
        curve: "linear",
      });
      return;
    }

    // ── level_up ──
    if (type === "level_up") {
      this.playSfxTone({
        wave: "triangle",
        startFreq: 430,
        endFreq: 620,
        duration: 0.08,
        gain: 0.045,
        curve: "linear",
      });
      this.scene.time.delayedCall(75, () => {
        this.playSfxTone({
          wave: "triangle",
          startFreq: 620,
          endFreq: 900,
          duration: 0.11,
          gain: 0.05,
          curve: "linear",
        });
      });
      return;
    }

    // ── weapon_fire ──
    if (type === "weapon_fire") {
      const weaponType = options.weaponType ?? "dagger";
      if (weaponType === "dagger") {
        this.playSfxTone({
          wave: "square",
          startFreq: 980,
          endFreq: 720,
          duration: 0.032,
          gain: 0.016,
        });
        return;
      }
      if (weaponType === "fireball") {
        this.playSfxTone({
          wave: "sawtooth",
          startFreq: 520,
          endFreq: 280,
          duration: 0.06,
          gain: 0.026,
        });
        return;
      }
      if (weaponType === "meteor") {
        this.playSfxTone({
          wave: "sawtooth",
          startFreq: 420,
          endFreq: 180,
          duration: 0.08,
          gain: 0.03,
        });
        return;
      }
      if (weaponType === "lightning") {
        this.playSfxTone({
          wave: "triangle",
          startFreq: 1120,
          endFreq: 760,
          duration: 0.042,
          gain: 0.02,
        });
        return;
      }
      // generic / unknown weapon type
      this.playSfxTone({
        wave: "square",
        startFreq: 820,
        endFreq: 560,
        duration: 0.045,
        gain: 0.022,
      });
      return;
    }

    // ── chest_open ──
    if (type === "chest_open") {
      this.playSfxTone({
        wave: "triangle", startFreq: 400, endFreq: 700,
        duration: 0.08, gain: 0.05, curve: "linear",
      });
      this.scene.time.delayedCall(80, () => {
        this.playSfxTone({
          wave: "triangle", startFreq: 600, endFreq: 1000,
          duration: 0.12, gain: 0.06, curve: "linear",
        });
      });
      this.scene.time.delayedCall(180, () => {
        this.playSfxTone({
          wave: "sine", startFreq: 900, endFreq: 1200,
          duration: 0.15, gain: 0.04, curve: "linear",
        });
      });
      return;
    }

    // ── item_spawn ──
    if (type === "item_spawn") {
      this.playSfxTone({
        wave: "sine", startFreq: 600, endFreq: 900,
        duration: 0.06, gain: 0.03, curve: "linear",
      });
      return;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  SFX  helper  —  convenience playback of a single cached sample     */
  /* ------------------------------------------------------------------ */

  /**
   * Play a cached audio sample directly by its cache key.
   *
   * @param {string} key       — Phaser audio cache key
   * @param {number} [volume]  — target gain (before the global sfx multiplier)
   */
  playSfxSample(key, volume = 0.1) {
    if (!key) return;
    const sfxVol = this.scene.settingsSfxVol ?? 1;
    const safeVolume = Phaser.Math.Clamp(
      (volume ?? 0.1) * sfxVol,
      0.01,
      0.24
    );
    if (this.scene.cache?.audio?.exists(key) && this.scene.sound) {
      this.scene.sound.play(key, { volume: safeVolume });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Lifecycle                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Reset transient state.  Call this when the scene restarts
   * (e.g. in GameScene.create()) so throttling is fresh.
   */
  reset() {
    this.sfxLastPlayedAt = {};
    // Keep bgmEnabled / bgmNodes as-is (they are managed by
    // startBgm/stopBgm and the pause-menu toggle).
  }
}
