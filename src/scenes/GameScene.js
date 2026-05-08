import { Player } from "../entities/Player.js";
import { BossEnemy } from "../entities/BossEnemy.js";
import { DirectorSystem, DIRECTOR_STATE } from "../systems/DirectorSystem.js";
import { WeaponSystem } from "../systems/WeaponSystem.js";
import { MetaProgressionSystem } from "../systems/MetaProgressionSystem.js";
import { ObjectPool } from "../systems/ObjectPool.js";
import { SeededRNG } from "../utils/SeededRNG.js";
import { PlayerSync } from "../networking/PlayerSync.js";
import { EnemySync } from "../networking/EnemySync.js";
import { LevelUpManager } from "../Systems/LevelUpManager.js";
import { PauseManager } from "../Systems/PauseManager.js";
import { DropManager } from "../Systems/DropManager.js";
import { CombatManager } from "../Systems/CombatManager.js";
import { SpawnManager } from "../Systems/SpawnManager.js";
import { CoopSyncManager } from "../Systems/CoopSyncManager.js";
import { GameContext } from "../interfaces/GameContext.js";
import { TextureFactory } from "../systems/TextureFactory.js";
import { AudioManager } from "../systems/AudioManager.js";
import { CameraController } from "../systems/CameraController.js";
import { VignetteSystem } from "../systems/VignetteSystem.js";
import { ComboSystem } from "../systems/ComboSystem.js";
import { ParticleFactory } from "../systems/ParticleFactory.js";
import { GameplayHUD } from "../ui/GameplayHUD.js";
import { WarningBanner } from "../ui/WarningBanner.js";
import { DamageNumberSystem } from "../ui/DamageNumberSystem.js";
import { OffscreenIndicatorSystem } from "../ui/OffscreenIndicatorSystem.js";
import { InputController } from "../systems/InputController.js";
import { PlayerSetup } from "../entities/PlayerSetup.js";
import { ENEMY_ARCHETYPE_CONFIGS, ENEMY_TYPE_WEIGHTS, HUNTER_UNLOCK_TIME_SEC, RANGER_UNLOCK_TIME_SEC, THROWER_UNLOCK_TIME_SEC, BOOMERANGER_UNLOCK_TIME_SEC, GHOST_UNLOCK_TIME_SEC, MECH_UNLOCK_TIME_SEC, EXPLODER_UNLOCK_TIME_SEC, FREEZER_UNLOCK_TIME_SEC, HEALER_UNLOCK_TIME_SEC, SPLITTER_UNLOCK_TIME_SEC } from "../config/enemies.js";
import { LEVEL_UP_UPGRADES, WEAPON_EVOLUTION_RULES } from "../config/weapons.js";
import { DIRECTOR_BOSS_SPAWN } from "../config/director.js";
import {
  CHARACTER_ASSET_MANIFEST, CHARACTER_DIRECTIONS,
  IMPORTED_PIXEL_ASSETS, ENEMY_SPRITES, BULLET_SPRITES,
  ITEM_SPRITES, WEAPON_VISUAL_SPRITES, DASH_SPRITE, WEAPON_ICON_ASSETS,
  BG_ASSET_PATH, BG_TEXTURE_KEY, TERRAIN_SPRITES, UPGRADE_PANEL_ICONS
} from "../config/assets.manifest.js";
import { FIGHTER_CONFIGS, FIGHTER_STORAGE_KEY } from "../config/fighters.js";
import { SHIP_CONFIGS, SHIP_STORAGE_KEY, updateShipStats } from "../config/ships.js";
import { ItemPool } from "../entities/ItemDrop.js";
import { TreasureChest } from "../entities/TreasureChest.js";
import { StatusEffectSystem } from "../systems/StatusEffectSystem.js";
import { ITEM_DROP_CONFIGS, ITEM_POOL_SIZE } from "../config/progression.js";
import {
  BASE_SPAWN_CHECK_INTERVAL_MS,
  ENEMY_POOL_SIZE,
  PLAYTEST_SPAWN_PACING_DEFAULT,
  PLAYTEST_SPAWN_PACING_ORDER,
  PLAYTEST_SPAWN_PACING_PRESETS,
  SAFE_RADIUS,
  SPAWN_LANES,
  SPAWN_LANE_KEYS,
  SPAWN_LANE_RULES,
  SPAWN_BURST_CONFIG,
  TARGET_ENEMY_CURVE,
  TARGET_ENEMY_FALLBACK,
  TARGET_ENEMY_WAVE_DURATION_SEC,
  TARGET_ENEMY_WAVE_INCREMENT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  XP_REQUIREMENTS
} from "../config/progression.js";
import { COLORS } from "../config/theme.js";
import { RENDER_DEPTH } from "../config/render-layers.js";
import { SFX_AUDIO_FILES, SFX_KEY_BY_TYPE, SFX_VOLUME, SFX_THROTTLE_MS } from "../config/audio.js";

const UI_SFX_KEYS = {
  select: "sfx_sounds_pause7_in",
  confirm: "sfx_sounds_pause7_in",
  back: "sfx_sounds_pause7_out"
};

import {
  DAMAGE_NUMBER_MAX_ACTIVE, DAMAGE_NUMBER_MAX_ACTIVE_PRIORITY,
  DAMAGE_NUMBER_NORMAL_LIFETIME_MS, DAMAGE_NUMBER_ELITE_LIFETIME_MS,
  DAMAGE_NUMBER_BOSS_LIFETIME_MS, DAMAGE_NUMBER_NORMAL_RISE_PX,
  DAMAGE_NUMBER_ELITE_RISE_PX, DAMAGE_NUMBER_BOSS_RISE_PX
} from "../config/damage-text.js";
import {
  PLAYER_HURT_FEEDBACK_COOLDOWN_MS, PLAYER_HURT_SHAKE_DURATION_MS,
  PLAYER_HURT_SHAKE_INTENSITY, PLAYER_HURT_PULSE_DURATION_MS,
  PLAYER_HURT_PULSE_RADIUS, PLAYER_HURT_PULSE_ALPHA
} from "../config/player-feedback.js";
import { COMBO_RESET_WINDOW_MS } from "../config/combo.js";
import {
  OFFSCREEN_INDICATOR_INSET, OFFSCREEN_INDICATOR_SIZE, OFFSCREEN_INDICATOR_MAX,
  OFFSCREEN_PRIORITY_BONUS_ELITE, OFFSCREEN_PRIORITY_BONUS_BOSS
} from "../config/offscreen.js";
import {
  SHIP_DECK_OBSTACLE_LAYOUT,
  RANDOM_DECK_OBSTACLE_SPAWN_TABLE,
  RANDOM_DECK_OBSTACLE_DENSITY_MIN_TILES, RANDOM_DECK_OBSTACLE_DENSITY_MAX_TILES,
  RANDOM_DECK_OBSTACLE_TILE_GROUP_SIZE, RANDOM_DECK_OBSTACLE_EDGE_SPAWN_BUFFER,
  RANDOM_DECK_OBSTACLE_EVENT_CLEAR_RADIUS, RANDOM_DECK_OBSTACLE_MAX_ATTEMPTS_MULTIPLIER,
  RANDOM_DECK_OBSTACLE_MIN_PADDING
} from "../config/obstacles.js";
import {
  DECK_TILE_SIZE, DECK_SURFACE_INSET, DECK_RAIL_INSET,
  DECK_RAIL_POST_GAP, DECK_RAIL_POST_WIDTH, DECK_RAIL_POST_LENGTH,
  DECK_BRIGHTNESS_MULTIPLIER, DECK_HIGHLIGHT_OPACITY,
  DECK_PASSAGE_SAMPLE_DISTANCES, DECK_PASSAGE_MIN_OPEN_DIRECTIONS,
  DECK_PASSAGE_REPAIR_MAX_STEPS, DECK_PASSAGE_REPAIR_NUDGE,
  SEA_WAVE_MIN, SEA_WAVE_MAX,
  ENEMY_JAM_STUCK_WINDOW_MS, ENEMY_JAM_MIN_PROGRESS_PX, ENEMY_JAM_PUSH_FORCE,
  EDGE_FOG_TEXTURE_KEY, EDGE_FOG_INNER_RADIUS_TILES, EDGE_FOG_OUTER_RADIUS_TILES,
  EDGE_FOG_VIGNETTE_OPACITY
} from "../config/environment.js";
import {
  XP_MAGNET_RADIUS_PER_LEVEL,
  XP_ORB_BASE_SCALE, XP_ORB_HIGH_VALUE_SCALE, XP_ORB_SPECIAL_SCALE,
  XP_ORB_BASE_ALPHA, XP_ORB_HIGH_VALUE_ALPHA, XP_ORB_SPECIAL_ALPHA,
  XP_ORB_MAGNET_DIRECT_PULL_RADIUS, XP_ORB_MAGNET_DIRECT_PULL_FACTOR,
  XP_ORB_MAGNET_MIN_PULL, XP_ORB_MAGNET_MAX_PULL,
  XP_ORB_MAGNET_SCALE_BOOST, XP_ORB_PULSE_AMPLITUDE, XP_ORB_PULSE_SPEED_MS,
  PERFORMANCE_MAX_ACTIVE_ENEMIES,
  PARTICLE_LOAD_SOFT_CAP_ENEMIES, PARTICLE_LOAD_HARD_CAP_ENEMIES,
  MIN_PARTICLE_LOAD_SCALE,
  ELITE_BONUS_XP_ORB_MIN, ELITE_BONUS_XP_ORB_MAX,
  ELITE_BONUS_XP_ORB_VALUE_FACTOR, ELITE_UPGRADE_DROP_CHANCE,
  ELITE_BONUS_UPGRADE_IDS,
  MINI_BOSS_GOLD_BUNDLE, MINI_BOSS_XP_BURST_COUNT,
  MINI_BOSS_XP_BURST_MIN_FACTOR, MINI_BOSS_XP_BURST_MAX_FACTOR,
  PARTICLE_TEXTURE_KEY, PARTICLE_FALLBACK_TEXTURE_KEY,
  PARTICLE_GENERATED_FALLBACK_TEXTURE_KEY
} from "../config/drops.js";
import { TOUCH_JOYSTICK_RADIUS, TOUCH_JOYSTICK_TOUCH_RADIUS, TOUCH_DASH_BUTTON_RADIUS } from "../config/touch.js";
import {
  META_COINS_STORAGE_KEY, META_STORAGE_KEY, BEST_TIME_STORAGE_KEY,
  SHOP_UPGRADES_STORAGE_KEY, WEAPON_UNLOCK_STORAGE_KEY,
  PLAYTEST_SPAWN_PACING_STORAGE_KEY, BOSS_BULLET_MAX,
  BOSS_BULLET_LIFETIME_MS, BOSS_WARNING_LEAD_MS
} from "../config/storage-keys.js";
import {
  HUD_PANEL_PADDING, HUD_PANEL_X, HUD_PANEL_Y,
  HUD_PANEL_WIDTH, HUD_PANEL_HEIGHT,
  HUD_EXP_BAR_WIDTH, HUD_EXP_BAR_BASE_HEIGHT,
  HUD_EXP_BAR_START_COLOR, HUD_EXP_BAR_END_COLOR,
  HUD_EXP_PULSE_SCALE, HUD_EXP_PULSE_DURATION_MS,
  HUD_ALERT_POOL_SIZE, HUD_ALERT_STYLE,
  WARNING_BANNER_STYLE, DEBUG_HUD_X, DEBUG_HUD_Y
} from "../config/hud.js";
import { BOSS_ENTRY_LANES, HATCH_BREACH_POINT, LADDER_SPAWN_POINTS } from "../config/spawn-points.js";

const START_WEAPON_OPTIONS = [
  { id: "dash_blade", label: "音速弹", weaponType: "dagger", unlockCost: 0, defaultUnlocked: true },
  { id: "pulse_dash", label: "火焰弹", weaponType: "fireball", unlockCost: 90, defaultUnlocked: false },
  { id: "orbit_blade", label: "轨道刀刃", weaponType: "orbit_blades", unlockCost: 180, defaultUnlocked: false },
  { id: "shockwave", label: "闪电冲击", weaponType: "lightning", unlockCost: 140, defaultUnlocked: false },
  { id: "scatter", label: "散弹射击", weaponType: "scatter_shot", unlockCost: 120, defaultUnlocked: false },
  { id: "homing", label: "追踪导弹", weaponType: "homing_missile", unlockCost: 160, defaultUnlocked: false },
  { id: "laser_beam", label: "激光束", weaponType: "laser", unlockCost: 150, defaultUnlocked: false }
];

function pickWeightedRandomObstacleSpec(specs) {
  const totalWeight = specs.reduce((sum, spec) => sum + spec.weight, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < specs.length; i += 1) {
    roll -= specs[i].weight;
    if (roll <= 0) return specs[i];
  }
  return specs[specs.length - 1];
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");

    this.safeRadius = SAFE_RADIUS;
    this.baseSpawnCheckIntervalMs = BASE_SPAWN_CHECK_INTERVAL_MS;
    this.spawnAccumulatorMs = 0;
    this.runTimeMs = 0;
    this.playTime = 0;
    this.runStartTimeMs = 0;
    this.lastStageAnnouncementSec = -1;
    this.targetEnemies = 0;

    this.attackIntervalMs = 800;
    this.attackRange = 120;
    this.attackDamage = 5;
    this.lastAttackAt = 0;
    this.totalXp = 0;
    this.level = 1;
    this.currentXp = 0;
    this.xpToNext = 50;
    this.pendingLevelUps = 0;
    this.isLeveling = false;
    this.levelUpUi = [];
    this.isGameOver = false;
    this.dashTrailTickMs = 0;
    this.evolutionSlowMoRestoreHandle = null;
    this.evolutionSlowMoActive = false;
    this.weaponRecoilTween = null;
    this.metaSystem = new MetaProgressionSystem();
    this.metaData = this.metaSystem.getData();
    this.metaXpMultiplier = 1;
    this.runMetaCurrency = 0;
    this.lastRunMetaCurrency = 0;
    this.metaSettled = false;
    this.enemyPool = null;
    this.obstacles = null;
    this.terrainObstacleAnchors = [];
    this.gameOverRestartButton = null;
    this.gameOverRestartLabel = null;
    this.dashCooldownRingGraphics = null;
    this.playerReadabilityGraphics = null;
    this.debugDirectorText = null;
    this.debugOverlayPanel = null;
    this.debugOverlayEnabled = false;
    this.spawnPacingPresetKey = PLAYTEST_SPAWN_PACING_DEFAULT;
    this.spawnPacingPreset = PLAYTEST_SPAWN_PACING_PRESETS[PLAYTEST_SPAWN_PACING_DEFAULT];
    this.totalKills = 0;
    this.lastPlayerHurtFeedbackAt = Number.NEGATIVE_INFINITY;
    this.xpDisplayRatio = 0;
    this.expBarScaleY = 1;
    this.expBarPulseTween = null;
    this.weaponRecoilTween = null;
    this.bossApproachWarnedCycleIndex = 0;
    this.levelUpOptionActions = [];
    this.helpOverlayCompact = false;
    this.isWeaponSelecting = false;
    this.weaponSelectionUi = [];
    this.weaponSelectionActions = [];
    this.weaponUnlocks = {};
    this.selectedStartWeaponId = null;
    this.bossProjectiles = null;
    this.performanceDamageEvents = [];
    this.performanceKillEvents = [];
    this.performanceDamageTotal = 0;
    this.performanceKillTotal = 0;
    this.seaWaveGraphics = null;
    this.seaWaves = [];
    this.devAntiJamEnabled = false;
    this.selectedFighterKey = null;
    this.fighterConfig = null;
    this.fighterEvolved = false;
    this.isPaused = false;
    this.pauseUi = [];
    this.activeBoss = null;
    this.bossHpBarElement = null;
  }

  init(data) {
    this.selectedFighterKey = data?.selectedFighter || null;
    this.selectedShipKey = data?.selectedShip || null;
    this.gameMode = data?.gameMode || "solo";
    this.networkManager = data?.networkManager || null;
    this.socketClient = data?.socketClient || null;
    this.voiceManager = data?.voiceManager || null;
    this.isHost = data?.isHost ?? true;
    this.coopPlayers = data?.players || [];
    this.coopSeed = data?.seed ?? Date.now();
    this._hasSentPlayerDied = false;
    this._hasSentGameOver = false;
    this.lastEnemySyncTime = 0;
  }

  create() {
    this.isGameOver = false;
    this._loadSettings();
    this.totalXp = 0;
    this.level = 1;
    this.currentXp = 0;
    this.xpToNext = this.getXpRequirement(this.level);
    this.pendingLevelUps = 0;
    this.isLeveling = false;
    this.gameContext = new GameContext(this);
    this.levelUpManager = new LevelUpManager(this);
    this.pauseManager = new PauseManager(this);
    this.dropManager = new DropManager(this.gameContext);
    this.combatManager = new CombatManager(this);
    this.spawnManager = new SpawnManager(this.gameContext);
    this.coopSync = new CoopSyncManager(this);
    this.setupCoopMode();
    this._revivalUsed = false;
    this.levelUpUi = [];
    this.spawnAccumulatorMs = 0;
    this.runTimeMs = 0;
    this.playTime = 0;
    this.lastStageAnnouncementSec = -1;
    this.runStartTimeMs = this.time?.now ?? 0;
    this.targetEnemies = 0;
    this.totalKills = 0;
    this.xpDisplayRatio = 0;
    this.expBarScaleY = 1;
    this.expBarPulseTween = null;
    this.bossApproachWarnedCycleIndex = 0;
    this.metaData = this.metaSystem.getData();
    this.syncCoinStorageWithMeta();
    this.metaXpMultiplier = 1;
    this.runMetaCurrency = 0;
    this.lastRunMetaCurrency = 0;
    this.metaSettled = false;
    this.coopRNG = this.gameMode === "coop" ? new SeededRNG(this.coopSeed) : null;
    this.director = new DirectorSystem({ rng: this.coopRNG });
    this.inputController = new InputController(this);
    this.dashTrailTickMs = 0;
    this.clearEvolutionSlowMoTimer();
    this.teardownTouchControls();
    this.isWeaponSelecting = false;
    this.weaponSelectionUi = [];
    this.weaponSelectionActions = [];
    this.weaponUnlocks = this.loadWeaponUnlocks();
    this.selectedStartWeaponId = null;
    this.debugOverlayEnabled = false;
    this.spawnPacingPresetKey = this.loadSpawnPacingPresetKey();
    this.spawnPacingPreset =
      PLAYTEST_SPAWN_PACING_PRESETS[this.spawnPacingPresetKey] ?? PLAYTEST_SPAWN_PACING_PRESETS[PLAYTEST_SPAWN_PACING_DEFAULT];
    this.baseSpawnCheckIntervalMs = Math.max(
      60,
      BASE_SPAWN_CHECK_INTERVAL_MS * (this.spawnPacingPreset?.spawnIntervalScale ?? 1)
    );
    this.performanceDamageEvents = [];
    this.performanceKillEvents = [];
    this.performanceDamageTotal = 0;
    this.performanceKillTotal = 0;
    this.helpOverlayCompact = false;
    this.devAntiJamEnabled = this.resolveDevAntiJamEnabled();

    this.textureFactory = new TextureFactory(this);
    this.vignetteSystem = new VignetteSystem(this);
    this.comboSystem = new ComboSystem(this);
    this.audioManager = new AudioManager(this, {
      audioFiles: SFX_AUDIO_FILES,
      keyByType: SFX_KEY_BY_TYPE,
      volume: SFX_VOLUME,
      throttleMs: SFX_THROTTLE_MS
    });

    this.playUiSfx = (key, rate = 1) => {
      if (!this.sound || !this.cache.audio.exists(key)) return;
      const sfxVol = this.settingsSfxVol ?? 1;
      if (sfxVol <= 0.001) return;
      this.sound.play(key, { volume: Phaser.Math.Clamp(sfxVol * 0.6, 0.01, 1), rate });
    };

    this.cameraController = new CameraController(this);
    this.particleFactory = new ParticleFactory(this);
    this.warningBanner = new WarningBanner(this);
    this.damageNumbers = new DamageNumberSystem(this);
    this.offscreenIndicators = new OffscreenIndicatorSystem(this);
    this.gameplayHUD = new GameplayHUD(this);
    this.playerSetup = new PlayerSetup(this);
    this.particleFactory.createAll();
    this.createTextures();
    this._createInfiniteBackground();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.player = this.playerSetup.createPlayer(this.selectedShipKey);
    this.player.level = this.level;

    this.enemies = this.add.group();
    this.enemyPool = new ObjectPool(this, this.enemies, { initialSize: ENEMY_POOL_SIZE });
    this.itemPool = new ItemPool(this, ITEM_POOL_SIZE);
    this.activeItems = [];
    this.chests = [];
    this.xpOrbs = this.physics.add.group();
    this.obstacles = this.physics.add.staticGroup();
    this.createTerrainObstacles();

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      dash: Phaser.Input.Keyboard.KeyCodes.SPACE,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
      debugToggle: Phaser.Input.Keyboard.KeyCodes.F2,
      pacingPreset: Phaser.Input.Keyboard.KeyCodes.F3,
      cameraToggle: Phaser.Input.Keyboard.KeyCodes.F4,
      meta1: Phaser.Input.Keyboard.KeyCodes.ONE,
      meta2: Phaser.Input.Keyboard.KeyCodes.TWO,
      meta3: Phaser.Input.Keyboard.KeyCodes.THREE,
      meta4: Phaser.Input.Keyboard.KeyCodes.FOUR,
      pause: Phaser.Input.Keyboard.KeyCodes.ESC,
      pauseAlt: Phaser.Input.Keyboard.KeyCodes.P
    });
    const desiredPointers = 3;
    const pointerDeficit = desiredPointers - this.input.manager.pointersTotal;
    if (pointerDeficit > 0) {
      this.input.addPointer(pointerDeficit);
    }

    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this);
    this.physics.add.overlap(this.player, this.xpOrbs, this.handleXpOrbPickup, null, this);
    // Item drops are checked manually (not via physics overlap) since they use the pool's active list
    this.bossProjectiles = this.physics.add.group({
      allowGravity: false,
      immovable: true,
      maxSize: BOSS_BULLET_MAX
    });
    this.physics.add.overlap(this.player, this.bossProjectiles, this.handleBossProjectileHit, null, this);
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.enemies, this.obstacles);
    // Cover mechanic: obstacles block boss projectiles
    this.physics.add.collider(this.bossProjectiles, this.obstacles, (projectile) => {
      this.releaseBossProjectile(projectile);
    });
    this.weaponSystem = new WeaponSystem(this.gameContext, this.player);
    this.statusEffectSystem = new StatusEffectSystem(this);
    // Cover mechanic: obstacles also block player weapon projectiles
    this.physics.add.collider(this.weaponSystem.projectiles, this.obstacles, (projectile) => {
      this.weaponSystem.releaseProjectile(projectile);
    });
    this.applyMetaBonusesForRun();

    this.cameraController.setup();

    this.gameplayHUD = new GameplayHUD(this);
    this.gameplayHUD.createLegacyLayer();

    this.playerReadabilityGraphics = this.add.graphics().setDepth(5);
    this.playerHpBarGraphics = this.add.graphics().setDepth(15);
    this.lowHealthVignetteGraphics = this.add.graphics().setScrollFactor(0).setDepth(21);
    this.createEdgeFogOverlay();
    this.dashCooldownRingGraphics = this.add.graphics().setDepth(9);
    this.offscreenIndicators.init();
    this.modalBackdrop = this.add
      .rectangle(640, 360, 1280, 720, 0x05080d, 0.28)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.MENUS - 1)
      .setVisible(false);

    this.debugOverlayPanel = this.add
      .rectangle(1260, 98, 252, 116, 0x19110b, 0.56)
      .setOrigin(1, 0)
      .setStrokeStyle(2, 0x6d4a31, 0.56)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.HUD + 2)
      .setVisible(false);
    this.debugDirectorText = this.add
      .text(1024, 108, "", {
        fontFamily: "ZpixOne",
        fontSize: "13px",
        color: "#baa27d",
        stroke: "#22150d",
        strokeThickness: 3
      })
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.HUD + 3);
    this.debugDirectorText.setVisible(this.debugOverlayEnabled);
    this.gameplayHUD.create();
    this.gameplayHUD.deactivateLegacyHudLayer();
    this.applyHudModalFocus(false);

    this.gameOverText = this.add
      .text(640, 360, "GAME OVER", {
        fontFamily: "ZpixOne",
        fontSize: "28px",
        color: "#ffdad7",
        align: "center",
        stroke: "#1a1010",
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.MENUS + 10)
      .setVisible(false);

    this.gameOverRestartButton = this.add
      .rectangle(640, 540, 240, 58, 0x17304f, 0.95)
      .setStrokeStyle(2, 0x66b9ff, 1)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.MENUS + 11)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.gameOverRestartLabel = this.add
      .text(640, 540, "Restart Run", {
        fontFamily: "ZpixOne",
        fontSize: "26px",
        color: "#eaf6ff",
        stroke: "#0d1628",
        strokeThickness: 5
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(RENDER_DEPTH.MENUS + 12)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    const onRestartPointer = () => this.restartRun();
    this.gameOverRestartButton.on("pointerdown", onRestartPointer);
    this.gameOverRestartLabel.on("pointerdown", onRestartPointer);

    this.createTouchControls();
    this.gameplayHUD.ensureDomHudOverlay();
    this.gameplayHUD._applyMobileHudAdjustments();
    this.registerSceneShutdownCleanup();
    // Auto-equip starting weapon(s), then immediately show weapon selection
    if (this.shipConfig) {
      const weapons = this.shipConfig.initialWeapons || [this.shipConfig.initialWeapon];
      weapons.forEach((w) => this.weaponSystem.addWeapon(w));
      this.openWeaponSelection();
    } else if (this.fighterConfig) {
      const startWeapon = this.fighterConfig.startingWeapon;
      this.weaponSystem.addWeapon(startWeapon);
      this.openWeaponSelection();
    } else {
      this.openWeaponSelection();
    }
    // Start BGM after a short delay
    this.time.delayedCall(1500, () => this.audioManager.startBgm());
    this.maintainEnemyDensity();
    this.gameplayHUD.update();
  }

  preload() {
    Object.entries(SFX_AUDIO_FILES).forEach(([key, path]) => {
      if (this.cache?.audio?.exists(key)) {
        return;
      }
      this.load.audio(key, path);
    });

    if (!this.cache.audio.exists(UI_SFX_KEYS.select)) {
      this.load.audio(UI_SFX_KEYS.select, "assets/audio/sfx/sfx_sounds_pause7_in.wav");
    }
    if (!this.cache.audio.exists(UI_SFX_KEYS.back)) {
      this.load.audio(UI_SFX_KEYS.back, "assets/audio/sfx/sfx_sounds_pause7_out.wav");
    }

    CHARACTER_ASSET_MANIFEST.forEach(({ keyPrefix, basePath }) => {
      CHARACTER_DIRECTIONS.forEach((direction) => {
        const dirKey = direction.replace(/-/g, "_");
        const textureKey = `${keyPrefix}_${dirKey}`;
        if (this.textures?.exists(textureKey)) {
          return;
        }
        this.load.image(textureKey, `${basePath}/rotations/${direction}.png`);
      });
    });
    Object.values(IMPORTED_PIXEL_ASSETS).forEach(({ key, path }) => {
      if (this.textures?.exists(key)) {
        return;
      }
      this.load.image(key, path);
    });
    Object.values(WEAPON_ICON_ASSETS).forEach(({ key, path }) => {
      if (this.textures?.exists(key)) {
        return;
      }
      this.load.image(key, path);
    });
    Object.values(ENEMY_SPRITES).forEach(({ key, path }) => {
      if (this.textures?.exists(key)) {
        return;
      }
      this.load.image(key, path);
    });
    Object.values(BULLET_SPRITES).forEach(({ key, path }) => {
      if (this.textures?.exists(key)) {
        return;
      }
      this.load.image(key, path);
    });
    Object.values(ITEM_SPRITES).forEach(({ key, path }) => {
      if (this.textures?.exists(key)) {
        return;
      }
      this.load.image(key, path);
    });
    Object.values(TERRAIN_SPRITES).forEach(({ key, path }) => {
      if (this.textures?.exists(key)) {
        return;
      }
      this.load.image(key, path);
    });
    Object.values(WEAPON_VISUAL_SPRITES).forEach(({ key, path }) => {
      if (this.textures?.exists(key)) {
        return;
      }
      this.load.image(key, path);
    });
    if (!this.textures?.exists(DASH_SPRITE.key)) {
      this.load.image(DASH_SPRITE.key, DASH_SPRITE.path);
    }

    Object.values(SHIP_CONFIGS).forEach((cfg) => {
      if (cfg.textureKey && !this.textures?.exists(cfg.textureKey)) {
        this.load.image(cfg.textureKey, `assets/sprites/player/${cfg.textureKey}.png`);
      }
    });

    Object.values(UPGRADE_PANEL_ICONS).forEach(({ key, path }) => {
      if (!this.textures?.exists(key)) {
        this.load.image(key, path);
      }
    });

    this.load.image("game_bg", "assets/sprites/ui/bg.png");
  }

  setupCoopMode() { this.coopSync.setup(); }

  update(time, delta) {
    const isRunSummaryOpen = this.scene.isActive("RunSummaryScene");
    if (isRunSummaryOpen || this.isPaused) {
      this.gameplayHUD.setDomHudVisible(false);
      this.gameplayHUD.setDomTouchControlsVisible(false);
      if (this.input?.enabled && !this.isPaused) {
        this.input.enabled = false;
      }
      if (isRunSummaryOpen) return;
    } else {
      this.gameplayHUD.setDomHudVisible(true);
      if (this.inputController.touchControlsEnabled) this.gameplayHUD.setDomTouchControlsVisible(true);
    }
    if (this.input && !this.input.enabled) {
      this.input.enabled = true;
    }

    this.updateHelpOverlayPresentation();
    this.handlePlaytestHotkeys();

    if (this.isGameOver) {
      this.updateBossProjectiles(time);
      this.gameplayHUD.updateEnemyHealthBars();
      this.vignetteSystem.updateLowHealthVignette();
      this.updateDashCooldownRing();
      this.updateOffscreenEnemyIndicators();
      this.updateDebugDirectorOverlay();
      this.handleGameOverInput();
      return;
    }

    if (this.isLeveling) {
      this.levelUpManager.handleInput();
      this.updateBossProjectiles(time);
      this.player.body?.setVelocity(0, 0);
      this.gameplayHUD.updateEnemyHealthBars();
      this.vignetteSystem.updateLowHealthVignette();
      this.updateDashCooldownRing();
      this.updateOffscreenEnemyIndicators();
      this.updateDebugDirectorOverlay();
      this.gameplayHUD.update();
      return;
    }

    if (this.isWeaponSelecting) {
      const hasSelectionUi = Array.isArray(this.weaponSelectionUi) && this.weaponSelectionUi.some((obj) => obj?.active !== false);
      if (!hasSelectionUi) {
        this.forceCloseWeaponSelectionWithFallback();
      }
      if (!this.isWeaponSelecting) {
        // Fallback may have resumed gameplay in this frame.
      } else {
      this.handleWeaponSelectionInput();
      this.updateBossProjectiles(time);
      this.player.body?.setVelocity(0, 0);
      this.gameplayHUD.updateEnemyHealthBars();
      this.vignetteSystem.updateLowHealthVignette();
      this.updateDashCooldownRing();
      this.updateOffscreenEnemyIndicators();
      this.updateDebugDirectorOverlay();
      this.gameplayHUD.update();
      return;
      }
    }

    if (this.isPaused) {
      this.handlePauseInput();
      return;
    }

    // Check for pause input
    if (Phaser.Input.Keyboard.JustDown(this.keys.pause) || Phaser.Input.Keyboard.JustDown(this.keys.pauseAlt)) {
      this.openPauseMenu();
      return;
    }

    const stateChanged = this.director.update(delta);
    if (stateChanged && this.director.getState() === DIRECTOR_STATE.PEAK) {
      this.shakeScreen(180, 0.0028);
    }

    this.runTimeMs += delta;
    this.playTime += delta;
    if ((this.time?.now ?? 0) - this.comboSystem.lastKillAtMs > COMBO_RESET_WINDOW_MS) {
      this.comboSystem.killCombo = 0;
    }
    this.checkStageAnnouncements();
    this.updateBossApproachWarning();
    this.spawnManager.updateReaperSpawning();

    if (this.gameMode !== "coop" || this.isHost) {
      this.spawnManager.updateSpawnTick(delta);
    } else {
      this.spawnManager.consumeDirectorRequests();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.dash) || this.consumeTouchDash()) {
      this.player.tryDash();
    }

    this.player.updateDash(delta);
    this.updateBossProjectiles(time);
    this.emitDashTrail(delta);
    this.player.moveFromInput(this.keys, this.getTouchMoveInput());
    this.updatePlayerReadabilityAura();
    this.updatePlayerHpBar();
    this.pullXpOrbsToPlayer();
    this.updateActiveItems(delta);
    this.updateChests();
    this.updateShieldEffect(delta);
    this.weaponSystem.update(time, delta);
    this.statusEffectSystem?.update(time, delta);
    this.performAutoAttack(time);

    if (this.gameMode !== "coop" || this.isHost) {
      this.spawnManager.updateEnemyAI(delta, time);
    }

    this.coopSync.update(delta);

    // Infinite background parallax — tiles scroll at 30% of camera speed.
    if (this._bgTile) {
      this._bgTile.tilePositionX = this.cameras.main.scrollX * 0.3;
      this._bgTile.tilePositionY = this.cameras.main.scrollY * 0.3;
    }

    if (this.player.isDead()) {
      if ((this.player.revivals || 0) > 0 && !this._revivalUsed) {
        this.player.revivals -= 1;
        this._revivalUsed = true;
        this.player.hp = Math.round(this.player.maxHp * 0.5);
        this.player.setAlpha(1);
        this.player.setTint(0xffffff);
        this.player.body?.setVelocity(0, 0);
        if (this.player.body) { this.player.body.enable = true; }
        this.warningBanner.showHudAlert("复活!", 2000);
        this.shakeScreen(200, 0.006);
        return;
      }
      this.triggerGameOver();
      return;
    }

    this.gameplayHUD.updateEnemyHealthBars();
    this.gameplayHUD.updateBossHpBar();
    this.vignetteSystem.updateLowHealthVignette();
    this.updateDashCooldownRing();
    this.updateOffscreenEnemyIndicators();
    this.updateDebugDirectorOverlay();
    this.gameplayHUD.update();
  }

  createTextures() {
    const tf = this.textureFactory;
    tf.generateCircleTexture("hit_particle", 2, 0xffffff, 0xffffff);
    tf.generateCircleTexture("proj_orbit_blade", 8, 0x66ccff, 0x44aaff);
    tf.generateCompositeTexture("sprite_enemy_chaser_free", 28, 28, [
      { sourceKey: IMPORTED_PIXEL_ASSETS.enemyChaserBody.key, x: 2, y: 2, width: 24, height: 24 },
      { sourceKey: IMPORTED_PIXEL_ASSETS.enemyChaserEye.key, x: 9, y: 8, width: 10, height: 9 },
      { sourceKey: IMPORTED_PIXEL_ASSETS.enemyChaserMouth.key, x: 8, y: 17, width: 12, height: 5 }
    ]);
  }

  spawnDamageParticles(x, y, count = 5) {
    if (!this.particleFactory.ensureReady()) {
      return;
    }
    const scaledCount = this.getScaledParticleCount(count, 2);
    this.particleFactory.damageEmitter.explode(Math.max(2, Math.min(12, scaledCount)), x, y);
  }

  spawnHitSparkParticles(x, y, count = 4) {
    if (!this.particleFactory.ensureReady()) {
      return;
    }
    if (typeof this.particleFactory.damageEmitter.setLifespan === "function") {
      this.particleFactory.damageEmitter.setLifespan(200);
    }
    if (typeof this.particleFactory.damageEmitter.setTint === "function") {
      this.particleFactory.damageEmitter.setTint(0xffffff);
    }
    const sparkCount = Math.max(1, Math.min(6, Math.round(Number(count) || 4)));
    this.particleFactory.damageEmitter.explode(sparkCount, x, y);
    if (typeof this.particleFactory.damageEmitter.setLifespan === "function") {
      this.particleFactory.damageEmitter.setLifespan({ min: 90, max: 220 });
    }
    if (typeof this.particleFactory.damageEmitter.setTint === "function") {
      this.particleFactory.damageEmitter.setTint([0xffffff, 0xffd6ad, 0xffb87f]);
    }
  }

  spawnWeaponHitParticles(x, y, count = 3) {
    if (!this.particleFactory.ensureReady()) {
      return;
    }
    if (typeof this.particleFactory.damageEmitter.setLifespan === "function") {
      this.particleFactory.damageEmitter.setLifespan(200);
    }
    if (typeof this.particleFactory.damageEmitter.setTint === "function") {
      this.particleFactory.damageEmitter.setTint([0xff7a7a, 0xff4a4a, 0xff2d2d]);
    }
    const particleCount = Math.max(1, Math.min(6, Math.round(Number(count) || 3)));
    this.particleFactory.damageEmitter.explode(particleCount, x, y);
    if (typeof this.particleFactory.damageEmitter.setLifespan === "function") {
      this.particleFactory.damageEmitter.setLifespan({ min: 90, max: 220 });
    }
    if (typeof this.particleFactory.damageEmitter.setTint === "function") {
      this.particleFactory.damageEmitter.setTint([0xffffff, 0xffd6ad, 0xffb87f]);
    }
  }

  spawnKillParticles(x, y, count = 10) {
    if (!this.particleFactory.ensureReady()) {
      return;
    }
    const scaledCount = this.getScaledParticleCount(count, 4);
    this.particleFactory.killEmitter.explode(Math.max(4, Math.min(20, scaledCount)), x, y);
  }

  spawnEliteKillParticles(x, y, count = 18) {
    if (!this.particleFactory.ensureReady()) {
      return;
    }
    const scaledCount = this.getScaledParticleCount(count, 8);
    this.particleFactory.eliteKillEmitter.explode(Math.max(8, Math.min(28, scaledCount)), x, y);
  }

  playWeaponEvolutionFeedback(weapon) {
    this.particleFactory.ensureReady();
    const flashDurationMs = 200;
    const slowScale = 0.22;
    const slowDurationMs = 220;

    if (this.cameras?.main) {
      this.cameras.main.flash(flashDurationMs, 255, 230, 140, true);
      this.shakeScreen(140, 0.0024);
    }

    if (this.particleFactory.evolutionEmitter && this.player && this.player.active) {
      this.particleFactory.evolutionEmitter.explode(this.getScaledParticleCount(48, 20), this.player.x, this.player.y);
    }

    // Expanding gold ring
    if (this.add && this.tweens && this.player?.active) {
      const ring = this.add.circle(this.player.x, this.player.y, 20, 0, 0).setStrokeStyle(4, 0xfef08a, 1).setDepth(999);
      this.tweens.add({
        targets: ring, radius: 200, alpha: 0,
        duration: 500, ease: "Quad.easeOut",
        onComplete: () => ring.destroy()
      });
    }

    if (!this.time || !this.tweens || !this.physics?.world) return;

    this.clearEvolutionSlowMoTimer();
    const previousTimeScale = this.time.timeScale;
    const previousTweenScale = this.tweens.timeScale;
    const previousPhysicsScale = this.physics.world.timeScale;
    this.time.timeScale = slowScale;
    this.tweens.timeScale = slowScale;
    this.physics.world.timeScale = slowScale;
    this.evolutionSlowMoActive = true;

    this.evolutionSlowMoRestoreHandle = setTimeout(() => {
      this.evolutionSlowMoRestoreHandle = null;
      if (!this.sys || !this.sys.isActive()) return;
      this.time.timeScale = previousTimeScale;
      this.tweens.timeScale = previousTweenScale;
      this.physics.world.timeScale = previousPhysicsScale;
      this.evolutionSlowMoActive = false;
    }, slowDurationMs);

    if (this.showHudAlert && weapon?.baseType) {
      const evoName = weapon.evolved ? (weapon.type || weapon.baseType) : weapon.baseType;
      this.warningBanner.showHudAlert(`${evoName.toUpperCase()} EVOLVED!`, 1500);
    }
  }

  playWeaponFireFeedback(x, y, weaponType = "") {
    if (!this.add || !this.tweens) {
      return;
    }

    const flash = this.add.circle(x, y, 10, 0xffffff, 0.78).setDepth(8.4).setScale(1);
    this.tweens.add({
      targets: flash,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0,
      duration: 80,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy()
    });

    if (this.player?.active) {
      const baseScaleX = this.player.getData("weaponRecoilBaseScaleX") ?? this.player.scaleX;
      const baseScaleY = this.player.getData("weaponRecoilBaseScaleY") ?? this.player.scaleY;
      this.player.setData("weaponRecoilBaseScaleX", baseScaleX);
      this.player.setData("weaponRecoilBaseScaleY", baseScaleY);

      if (this.weaponRecoilTween) {
        this.weaponRecoilTween.stop();
        this.weaponRecoilTween = null;
      }

      this.player.setScale(baseScaleX, baseScaleY);
      this.weaponRecoilTween = this.tweens.add({
        targets: this.player,
        scaleX: baseScaleX * 1.05,
        scaleY: baseScaleY * 1.05,
        duration: 40,
        ease: "Sine.easeOut",
        yoyo: true,
        onComplete: () => {
          if (this.player?.active) {
            this.player.setScale(baseScaleX, baseScaleY);
          }
          this.weaponRecoilTween = null;
        }
      });
    }

    this.cameras?.main?.shake(60, 0.0008, true);
    this.audioManager.playSfx("weapon_fire", { weaponType });
  }

  emitDashTrail(delta) {
    if (!this.particleFactory.ensureReady() || !this.player || !this.player.active || !this.player.isDashing()) {
      this.dashTrailTickMs = 0;
      return;
    }

    const particleScale = this.getParticleLoadScale();
    this.dashTrailTickMs += delta;
    const spacingMs = Phaser.Math.Linear(34, 58, 1 - particleScale);
    const trailCount = this.getScaledParticleCount(2, 1, 2);
    while (this.dashTrailTickMs >= spacingMs) {
      this.dashTrailTickMs -= spacingMs;
      const vx = this.player.body ? this.player.body.velocity.x : 0;
      const vy = this.player.body ? this.player.body.velocity.y : 0;
      const trailX = this.player.x - vx * 0.017;
      const trailY = this.player.y - vy * 0.017;
      this.particleFactory.dashTrailEmitter.explode(trailCount, trailX, trailY);
    }
  }

  _loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem("forgeduel_settings"));
      if (saved) {
        this.settingsBgmVol = (saved.bgmVol ?? 60) / 100;
        this.settingsSfxVol = (saved.sfxVol ?? 80) / 100;
        this.settingsShowDmgNum = saved.showDmgNum !== false;
        this.settingsScreenShake = saved.screenShake !== false;
      } else {
        this.settingsBgmVol = 0.6;
        this.settingsSfxVol = 0.8;
        this.settingsShowDmgNum = true;
        this.settingsScreenShake = true;
      }
    } catch {
      this.settingsBgmVol = 0.6;
      this.settingsSfxVol = 0.8;
      this.settingsShowDmgNum = true;
      this.settingsScreenShake = true;
    }
    if (typeof window !== "undefined") {
      window.__forgeduelGame = this.game;
    }
  }

  shakeScreen(duration, intensity) {
    this.cameraController.shake(duration, intensity);
  }

  drawArena() {}

  _createInfiniteBackground() {
    this._bgTile = this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "game_bg");
    this._bgTile.setOrigin(0, 0);
    this._bgTile.setDepth(-5);
  }

  drawDeckDecor(deckLeft, deckTop, deckRight, deckBottom) {
  }

  initializeSeaWaves() {
    if (this.seaWaveGraphics) {
      this.seaWaveGraphics.destroy();
    }

    this.seaWaveGraphics = this.add.graphics();
    this.seaWaveGraphics.setDepth(-2);
    this.seaWaves = [];

    const waveCount = Phaser.Math.Between(SEA_WAVE_MIN, SEA_WAVE_MAX);
    for (let i = 0; i < waveCount; i += 1) {
      const topBand = i < Math.ceil(waveCount / 2);
      const minY = topBand ? 8 : WORLD_HEIGHT - DECK_SURFACE_INSET + 8;
      const maxY = topBand ? DECK_SURFACE_INSET - 8 : WORLD_HEIGHT - 8;
      this.seaWaves.push({
        baseY: Phaser.Math.Between(minY, maxY),
        length: Phaser.Math.Between(190, 360),
        amplitude: Phaser.Math.FloatBetween(3.5, 9.5),
        speed: Phaser.Math.FloatBetween(0.016, 0.03),
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
        alpha: Phaser.Math.FloatBetween(0.13, 0.24),
        thickness: Phaser.Math.Between(1, 2),
        color: 0x78b4e3
      });
    }
  }

  updateSeaWaves(timeMs) {
    if (!this.seaWaveGraphics || !Array.isArray(this.seaWaves) || this.seaWaves.length === 0) {
      return;
    }

    this.seaWaveGraphics.clear();
    this.seaWaves.forEach((wave) => {
      const segmentCount = 8;
      const lineStartX = ((timeMs * wave.speed + wave.phase * 80) % (WORLD_WIDTH + wave.length * 2)) - wave.length;
      const baseY = wave.baseY + Math.sin(timeMs * 0.0016 + wave.phase) * wave.amplitude;

      this.seaWaveGraphics.lineStyle(wave.thickness, wave.color, wave.alpha);
      this.seaWaveGraphics.beginPath();
      for (let i = 0; i <= segmentCount; i += 1) {
        const t = i / segmentCount;
        const x = lineStartX + wave.length * t;
        const y = baseY + Math.sin(timeMs * 0.0022 + wave.phase + t * 5.2) * wave.amplitude * 0.42;
        if (i === 0) {
          this.seaWaveGraphics.moveTo(x, y);
        } else {
          this.seaWaveGraphics.lineTo(x, y);
        }
      }
      this.seaWaveGraphics.strokePath();
    });
  }

  drawDeckRails() {
    const rail = this.add.graphics();
    rail.setDepth(1);

    const left = DECK_RAIL_INSET;
    const top = DECK_RAIL_INSET;
    const width = WORLD_WIDTH - DECK_RAIL_INSET * 2;
    const height = WORLD_HEIGHT - DECK_RAIL_INSET * 2;
    const right = left + width;
    const bottom = top + height;

    // Main rail body and highlight.
    rail.lineStyle(12, 0x503724, 0.95);
    rail.strokeRect(left, top, width, height);
    rail.lineStyle(4, 0x8e6340, 0.9);
    rail.strokeRect(left + 4, top + 4, width - 8, height - 8);

    // Post segments along port/starboard.
    rail.fillStyle(0x6d4b30, 1);
    for (let y = top + 30; y <= bottom - 30; y += DECK_RAIL_POST_GAP) {
      rail.fillRect(left - 2, y - DECK_RAIL_POST_LENGTH / 2, DECK_RAIL_POST_WIDTH, DECK_RAIL_POST_LENGTH);
      rail.fillRect(right - DECK_RAIL_POST_WIDTH + 2, y - DECK_RAIL_POST_LENGTH / 2, DECK_RAIL_POST_WIDTH, DECK_RAIL_POST_LENGTH);
    }

    // Post segments along bow/stern.
    for (let x = left + 34; x <= right - 34; x += DECK_RAIL_POST_GAP) {
      rail.fillRect(x - DECK_RAIL_POST_LENGTH / 2, top - 2, DECK_RAIL_POST_LENGTH, DECK_RAIL_POST_WIDTH);
      rail.fillRect(x - DECK_RAIL_POST_LENGTH / 2, bottom - DECK_RAIL_POST_WIDTH + 2, DECK_RAIL_POST_LENGTH, DECK_RAIL_POST_WIDTH);
    }
  }

  createTouchControls() { this.inputController.setupTouch(64); }

  _setJoystickThumbPos(x, y) { this.inputController._setJoystickThumbPos(x, y); }

  registerSceneShutdownCleanup() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupTransientUiPools();
      this.teardownTouchControls();
      this.gameplayHUD.teardownDomHudOverlay();
      if (this.playerHpBarGraphics) { this.playerHpBarGraphics.destroy(); this.playerHpBarGraphics = null; }
      this.clearEvolutionSlowMoTimer();
    });
  }

  cleanupTransientUiPools() {
    if (Array.isArray(this.damageNumbers.damageNumberPool)) {
      this.damageNumbers.damageNumberPool.forEach((text) => {
        const tween = text?.getData?.("damageTween");
        if (tween) {
          tween.stop();
        }
        text?.setData?.("damageTween", null);
        text?.setVisible?.(false);
        text?.setActive?.(false);
      });
    }

    if (Array.isArray(this.warningBanner.hudAlertPool)) {
      this.warningBanner.hudAlertPool.forEach((text) => this.warningBanner.releaseHudAlertText(text));
    }

    if (Array.isArray(this.offscreenIndicators.pool)) {
      this.offscreenIndicators.pool.forEach((marker) => {
        marker?.setVisible?.(false);
        marker?.setActive?.(false);
      });
    }
  }

  clearEvolutionSlowMoTimer() {
    if (this.evolutionSlowMoRestoreHandle) {
      clearTimeout(this.evolutionSlowMoRestoreHandle);
      this.evolutionSlowMoRestoreHandle = null;
    }

    if (this.evolutionSlowMoActive) {
      if (this.time) {
        this.time.timeScale = 1;
      }
      if (this.tweens) {
        this.tweens.timeScale = 1;
      }
      if (this.physics?.world) {
        this.physics.world.timeScale = 1;
      }
      this.evolutionSlowMoActive = false;
    }
  }

  teardownTouchControls() { this.inputController.teardownTouch(); }

  updateHelpOverlayText() {}

  updateHelpOverlayPresentation() {}

  ensureDomHudOverlay() { this.gameplayHUD.ensureDomHudOverlay(); }
  _applyMobileHudAdjustments() { this.gameplayHUD._applyMobileHudAdjustments(); }
  setDomHudVisible(isVisible) { this.gameplayHUD.setDomHudVisible(isVisible); }
  setDomTouchControlsVisible(isVisible) { this.gameplayHUD.setDomTouchControlsVisible(isVisible); }
  teardownDomHudOverlay() { this.gameplayHUD.teardownDomHudOverlay(); }
  updateDomHudOverlay(levelValue, _xpPercent, elapsedMs, _xpRatio) { this.gameplayHUD.updateDomHudOverlay(levelValue, _xpPercent, elapsedMs, _xpRatio); }

  applyHudModalFocus(isModalOpen) {
    const hudAlpha = isModalOpen ? 0.34 : 1;
    const panelAlpha = isModalOpen ? 0.2 : 1;
    [
      this.gameplayHUD.hudLevelText,
      this.gameplayHUD.hudStatsText,
      this.gameplayHUD.hudTimerText,
      this.gameplayHUD.hudGoldText,
      this.gameplayHUD.hudXpLabelText,
      this.gameplayHUD.hudCoreLabelText,
      this.gameplayHUD.hudXpFrame
    ]
      .filter(Boolean)
      .forEach((obj) => obj.setAlpha(hudAlpha));
    [this.gameplayHUD.hudPanelBack].filter(Boolean).forEach((obj) => obj.setAlpha(panelAlpha));
    [this.gameplayHUD.hudBarsGraphics].filter(Boolean).forEach((obj) => obj.setAlpha(hudAlpha));
    [...(this.gameplayHUD.hudWeaponSlotFrames ?? []), ...(this.gameplayHUD.hudWeaponSlotLabels ?? [])]
      .filter(Boolean)
      .forEach((obj) => obj.setAlpha(hudAlpha));
    [...(this.gameplayHUD.hudObjects ?? [])].filter(Boolean).forEach((obj) => obj.setAlpha(hudAlpha));
    this.gameplayHUD.hud?.setAlpha(hudAlpha);
    this.dashCooldownRingGraphics?.setAlpha(isModalOpen ? 0.2 : 1);
    this.gameplayHUD.enemyHealthBarsGraphics?.setAlpha(isModalOpen ? 0.25 : 1);
    this.offscreenIndicators.graphics?.setAlpha(isModalOpen ? 0.08 : 1);
    this.modalBackdrop?.setVisible(isModalOpen);

    if (typeof document !== "undefined") {
      document.getElementById("help")?.classList.toggle("modal-open", isModalOpen);
    }
    this.gameplayHUD.domHudElement?.classList.toggle("modal-open", isModalOpen);
  }

  updatePlayerReadabilityAura() {
    if (!this.playerReadabilityGraphics) {
      return;
    }

    this.playerReadabilityGraphics.clear();
    if (!this.player?.active) {
      return;
    }

    const x = this.player.x;
    const y = this.player.y + 2;
    this.playerReadabilityGraphics.fillStyle(0x08111d, 0.22);
    this.playerReadabilityGraphics.fillEllipse(x, y + 8, 42, 18);
    this.playerReadabilityGraphics.lineStyle(2, 0xe7e1c4, 0.16);
    this.playerReadabilityGraphics.strokeCircle(x, y, 19);
  }

  updatePlayerHpBar() {
    if (!this.playerHpBarGraphics || !this.player?.active) return;
    const g = this.playerHpBarGraphics;
    g.clear();

    const px = this.player.x;
    const py = this.player.y + 24;
    const barW = 40;
    const barH = 5;
    const hpRatio = this.player.maxHp > 0 ? Math.max(0, Math.min(1, this.player.hp / this.player.maxHp)) : 1;

    // Background
    g.fillStyle(0x000000, 0.55);
    g.fillRect(px - barW / 2, py, barW, barH);
    // HP fill — color based on ratio
    const fillColor = hpRatio > 0.5 ? 0x44ff44 : hpRatio > 0.25 ? 0xffcc44 : 0xff4444;
    g.fillStyle(fillColor, 0.9);
    g.fillRect(px - barW / 2, py, Math.round(barW * hpRatio), barH);
    // Border
    g.lineStyle(1, 0xffffff, 0.3);
    g.strokeRect(px - barW / 2, py, barW, barH);

  }

  getTouchMoveInput() {
    if (!this.inputController.touchControlsEnabled) {
      return null;
    }
    return this.inputController.touchMoveVector;
  }

  consumeTouchDash() { return this.inputController.consumeDash(); }

  createTerrainObstacles() {
    if (!this.obstacles) {
      return;
    }

    this.terrainObstacleAnchors = [];
    SHIP_DECK_OBSTACLE_LAYOUT.forEach((entry) => this.spawnTerrainObstacle(entry));
    this.spawnRandomDeckObstacles();
    this.ensureNavigableDeckPassages();
  }

  spawnRandomDeckObstacles() {
    const deckLeft = DECK_SURFACE_INSET;
    const deckTop = DECK_SURFACE_INSET;
    const deckWidth = WORLD_WIDTH - DECK_SURFACE_INSET * 2;
    const deckHeight = WORLD_HEIGHT - DECK_SURFACE_INSET * 2;
    const deckRight = deckLeft + deckWidth;
    const deckBottom = deckTop + deckHeight;

    const logicalCols = Math.max(1, Math.floor(deckWidth / RANDOM_DECK_OBSTACLE_TILE_GROUP_SIZE));
    const logicalRows = Math.max(1, Math.floor(deckHeight / RANDOM_DECK_OBSTACLE_TILE_GROUP_SIZE));
    const logicalTileCount = logicalCols * logicalRows;
    const densityDivisor = Phaser.Math.Between(RANDOM_DECK_OBSTACLE_DENSITY_MIN_TILES, RANDOM_DECK_OBSTACLE_DENSITY_MAX_TILES);
    const targetSpawnCount = Math.max(1, Math.floor(logicalTileCount / densityDivisor));
    const maxAttempts = targetSpawnCount * RANDOM_DECK_OBSTACLE_MAX_ATTEMPTS_MULTIPLIER;

    const playerStartX = WORLD_WIDTH * 0.5;
    const playerStartY = WORLD_HEIGHT * 0.5;
    const hatchClearRadius = RANDOM_DECK_OBSTACLE_EVENT_CLEAR_RADIUS;
    let spawned = 0;

    for (let attempt = 0; attempt < maxAttempts && spawned < targetSpawnCount; attempt += 1) {
      const x = Phaser.Math.Between(deckLeft + RANDOM_DECK_OBSTACLE_MIN_PADDING, deckRight - RANDOM_DECK_OBSTACLE_MIN_PADDING);
      const y = Phaser.Math.Between(deckTop + RANDOM_DECK_OBSTACLE_MIN_PADDING, deckBottom - RANDOM_DECK_OBSTACLE_MIN_PADDING);

      if (Phaser.Math.Distance.Between(playerStartX, playerStartY, x, y) <= this.safeRadius) {
        continue;
      }

      if (Phaser.Math.Distance.Between(HATCH_BREACH_POINT.x, HATCH_BREACH_POINT.y, x, y) <= hatchClearRadius) {
        continue;
      }

      const minEdgeDistance = Math.min(x - deckLeft, deckRight - x, y - deckTop, deckBottom - y);
      if (minEdgeDistance <= RANDOM_DECK_OBSTACLE_EDGE_SPAWN_BUFFER) {
        continue;
      }

      if (this.isObstacleBlockedAt(x, y, RANDOM_DECK_OBSTACLE_MIN_PADDING)) {
        continue;
      }

      const spec = pickWeightedRandomObstacleSpec(RANDOM_DECK_OBSTACLE_SPAWN_TABLE);
      const scale = Phaser.Math.FloatBetween(spec.scaleMin, spec.scaleMax);
      const obstacle = this.spawnTerrainObstacle({
        type: spec.type,
        role: spec.objectType,
        textureKey: spec.textureKey,
        x,
        y,
        scale,
        anchorRadius: spec.anchorRadius,
        tint: spec.tint
      });

      if (!obstacle) {
        continue;
      }

      spawned += 1;
    }
  }

  spawnTerrainObstacle(config = {}) {
    if (!this.obstacles) {
      return null;
    }

    const obstacleType = config.type === "terrain_pillar" ? "terrain_pillar" : "terrain_rock";
    const role = config.role ?? "misc";
    let textureKey = config.textureKey ?? obstacleType;
    if (!config.textureKey) {
      if (role === "crate") {
        textureKey = "terrain_crate";
      }
    }
    const x = Phaser.Math.Clamp(Number(config.x) || WORLD_WIDTH * 0.5, 12, WORLD_WIDTH - 12);
    const y = Phaser.Math.Clamp(Number(config.y) || WORLD_HEIGHT * 0.5, 12, WORLD_HEIGHT - 12);
    const scale = Phaser.Math.Clamp(Number(config.scale) || 1, 0.5, 1.9);

    const obstacle = this.obstacles.create(x, y, textureKey);
    if (!obstacle) {
      return null;
    }

    obstacle.setScale(scale);
    obstacle.setDepth(2);
    obstacle.setData("obstacleRole", role);
    if (Number.isFinite(config.tint)) {
      obstacle.setTint(config.tint);
    }
    obstacle.refreshBody();

    let anchorRadius = obstacleType === "terrain_rock" ? 36 : 40;
    if (role === "crate") {
      anchorRadius = 34;
    } else if (role === "cannon") {
      anchorRadius = 32;
    }
    if (Number.isFinite(config.anchorRadius)) {
      anchorRadius = config.anchorRadius;
    }
    this.terrainObstacleAnchors.push({
      x,
      y,
      radius: anchorRadius * scale,
      obstacle,
      role
    });
    return obstacle;
  }

  resolveDevAntiJamEnabled() {
    if (typeof window === "undefined") {
      return false;
    }
    try {
      const params = new URLSearchParams(window.location?.search ?? "");
      if (params.get("dev_jam") === "1") {
        return true;
      }
    } catch (_error) {
      // Ignore URL parsing failures.
    }
    return Boolean(window.__DEV__);
  }

  getDeckPassageOpenDirectionCount() {
    const centerX = WORLD_WIDTH * 0.5;
    const centerY = WORLD_HEIGHT * 0.5;
    const directions = [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 }
    ];
    let openDirections = 0;

    directions.forEach((dir) => {
      let clearSamples = 0;
      DECK_PASSAGE_SAMPLE_DISTANCES.forEach((distance) => {
        const sampleX = centerX + dir.x * distance;
        const sampleY = centerY + dir.y * distance;
        if (!this.isObstacleBlockedAt(sampleX, sampleY, 24)) {
          clearSamples += 1;
        }
      });
      if (clearSamples >= 2) {
        openDirections += 1;
      }
    });

    return openDirections;
  }

  canRepositionObstacleAnchor(anchor, nextX, nextY) {
    if (!anchor) {
      return false;
    }

    if (nextX < 12 || nextX > WORLD_WIDTH - 12 || nextY < 12 || nextY > WORLD_HEIGHT - 12) {
      return false;
    }
    const distFromCenter = Phaser.Math.Distance.Between(WORLD_WIDTH * 0.5, WORLD_HEIGHT * 0.5, nextX, nextY);
    if (distFromCenter < 120) {
      return false;
    }

    return this.terrainObstacleAnchors.every((other) => {
      if (other === anchor) {
        return true;
      }
      const gap = Phaser.Math.Distance.Between(other.x, other.y, nextX, nextY);
      return gap >= other.radius + anchor.radius + 20;
    });
  }

  ensureNavigableDeckPassages() {
    if (!Array.isArray(this.terrainObstacleAnchors) || this.terrainObstacleAnchors.length === 0) {
      return;
    }

    const movableAnchors = this.terrainObstacleAnchors.filter((anchor) => anchor.role === "crate" && anchor.obstacle?.active);
    if (movableAnchors.length === 0) {
      return;
    }

    let openDirectionCount = this.getDeckPassageOpenDirectionCount();
    if (openDirectionCount >= DECK_PASSAGE_MIN_OPEN_DIRECTIONS) {
      return;
    }

    for (let i = 0; i < DECK_PASSAGE_REPAIR_MAX_STEPS; i += 1) {
      const anchor = Phaser.Utils.Array.GetRandom(movableAnchors);
      const nextX = Phaser.Math.Clamp(anchor.x + Phaser.Math.Between(-DECK_PASSAGE_REPAIR_NUDGE, DECK_PASSAGE_REPAIR_NUDGE), 16, WORLD_WIDTH - 16);
      const nextY = Phaser.Math.Clamp(anchor.y + Phaser.Math.Between(-DECK_PASSAGE_REPAIR_NUDGE, DECK_PASSAGE_REPAIR_NUDGE), 16, WORLD_HEIGHT - 16);
      if (!this.canRepositionObstacleAnchor(anchor, nextX, nextY)) {
        continue;
      }

      anchor.x = nextX;
      anchor.y = nextY;
      if (anchor.obstacle) {
        anchor.obstacle.setPosition(nextX, nextY);
        anchor.obstacle.refreshBody();
      }

      openDirectionCount = this.getDeckPassageOpenDirectionCount();
      if (openDirectionCount >= DECK_PASSAGE_MIN_OPEN_DIRECTIONS) {
        return;
      }
    }
  }

  _getNearestPlayerForEnemy(enemy) {
    let nearest = this.player;
    let nearestDist = Phaser.Math.Distance.Between(enemy.x, enemy.y, nearest.x, nearest.y);
    if (this.coopSync.playerSync) {
      for (const rp of this.coopSync.playerSync.getAllRemotePlayers()) {
        if (rp.isDead || rp.disconnected) continue;
        const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, rp.sprite.x, rp.sprite.y);
        if (dist < nearestDist) { nearestDist = dist; nearest = rp.sprite; }
      }
    }
    return nearest;
  }

  applyEnemyAntiJam(enemy, nowMs) {
    if (!this.devAntiJamEnabled || !enemy?.active || !enemy?.body) {
      return;
    }

    if (enemy.getData("isBoss")) {
      return;
    }

    const lastX = enemy.getData("jamLastX");
    const lastY = enemy.getData("jamLastY");
    if (lastX === undefined || lastY === undefined) {
      enemy.setData("jamLastX", enemy.x);
      enemy.setData("jamLastY", enemy.y);
      enemy.setData("jamLastMoveAtMs", nowMs);
      return;
    }

    const distanceMoved = Phaser.Math.Distance.Between(lastX, lastY, enemy.x, enemy.y);
    const desiredSpeed = Math.hypot(enemy.body.velocity.x, enemy.body.velocity.y);
    const lastMoveAtMs = enemy.getData("jamLastMoveAtMs") ?? nowMs;
    if (distanceMoved > ENEMY_JAM_MIN_PROGRESS_PX) {
      enemy.setData("jamLastMoveAtMs", nowMs);
    } else {
      const stuckDuration = nowMs - lastMoveAtMs;
      if (desiredSpeed > Math.max(40, enemy.speed * 0.35) && stuckDuration >= ENEMY_JAM_STUCK_WINDOW_MS) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const sourceX = enemy.x - Math.cos(angle) * 18;
        const sourceY = enemy.y - Math.sin(angle) * 18;
        if (typeof enemy.applyKnockbackFrom === "function") {
          enemy.applyKnockbackFrom(sourceX, sourceY, ENEMY_JAM_PUSH_FORCE);
        }
        enemy.setData("jamLastMoveAtMs", nowMs);
      }
    }

    enemy.setData("jamLastX", enemy.x);
    enemy.setData("jamLastY", enemy.y);
  }

  getTargetEnemyCount(seconds) {
    for (let i = 0; i < TARGET_ENEMY_CURVE.length; i += 1) {
      const segment = TARGET_ENEMY_CURVE[i];
      if (seconds < segment.endSec) {
        const duration = Math.max(1, segment.endSec - segment.startSec);
        const progress = (seconds - segment.startSec) / duration;
        return Phaser.Math.Linear(segment.from, segment.to, progress);
      }
    }

    const lastSegmentEndSec = TARGET_ENEMY_CURVE[TARGET_ENEMY_CURVE.length - 1]?.endSec ?? 0;
    const elapsedPostWaveSec = Math.max(0, seconds - lastSegmentEndSec);
    const postWaveCount = Math.floor(elapsedPostWaveSec / TARGET_ENEMY_WAVE_DURATION_SEC) + 1;
    return TARGET_ENEMY_FALLBACK + postWaveCount * TARGET_ENEMY_WAVE_INCREMENT;
  }

  getSpawnBurst(seconds, deficit) { return this.spawnManager.getSpawnBurst(seconds, deficit); }

  getEffectiveSpawnRateMultiplier() {
    return this.director.getSpawnRateMultiplier();
  }

  getEffectiveEnemySpeedMultiplier() {
    return this.director.getEnemySpeedMultiplier();
  }

  maintainEnemyDensity() { this.spawnManager.maintainEnemyDensity(); }
  spawnEnemyFromEdge(lane) { this.spawnManager.spawnEnemyFromEdge(lane); }

  getParticleLoadScale() {
    const aliveEnemies = this.getAliveEnemyCount();
    if (aliveEnemies <= PARTICLE_LOAD_SOFT_CAP_ENEMIES) {
      return 1;
    }

    const pressure = Phaser.Math.Clamp(
      (aliveEnemies - PARTICLE_LOAD_SOFT_CAP_ENEMIES) / (PARTICLE_LOAD_HARD_CAP_ENEMIES - PARTICLE_LOAD_SOFT_CAP_ENEMIES),
      0,
      1
    );
    return Phaser.Math.Linear(1, MIN_PARTICLE_LOAD_SCALE, pressure);
  }

  getScaledParticleCount(baseCount, minCount = 1, maxCount = baseCount) {
    const scaled = Math.round(baseCount * this.getParticleLoadScale());
    return Phaser.Math.Clamp(scaled, minCount, maxCount);
  }

  processDirectorBossSpawns() { this.spawnManager.processDirectorBossSpawns(); }
  processDirectorMiniBossSpawns() { this.spawnManager.processDirectorMiniBossSpawns(); }
  processDirectorSpawnBursts() { this.spawnManager.processDirectorSpawnBursts(); }
  processDirectorLadderSpawns() { this.spawnManager.processDirectorLadderSpawns(); }
  processDirectorHatchBreaches() { this.spawnManager.processDirectorHatchBreaches(); }

  logSpawnEventPressure(eventType, requestedCount) {
    if (!this.debugOverlayEnabled) {
      return;
    }
    const alive = this.getAliveEnemyCount();
    const target = this.targetEnemies;
    const runTime = this.gameplayHUD.formatRunTime(this.runTimeMs);
    console.info(`[SpawnEvent] t=${runTime} type=${eventType} requested=${requestedCount} alive=${alive} target=${target}`);
  }

  getLadderSpawnPoint(lane) {
    const candidates = LADDER_SPAWN_POINTS[lane] ?? LADDER_SPAWN_POINTS[SPAWN_LANES.PORT];
    return Phaser.Utils.Array.GetRandom(candidates);
  }

  isObstacleBlockedAt(x, y, padding = 18) {
    return this.terrainObstacleAnchors.some((anchor) => {
      const distance = Phaser.Math.Distance.Between(anchor.x, anchor.y, x, y);
      return distance < anchor.radius + padding;
    });
  }

  isValidEventSpawnPoint(x, y) {
    const inBounds = x >= 12 && x <= WORLD_WIDTH - 12 && y >= 12 && y <= WORLD_HEIGHT - 12;
    if (!inBounds) {
      return false;
    }
    const isOutsideSafeRadius = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) > this.safeRadius;
    if (!isOutsideSafeRadius) {
      return false;
    }
    return !this.isObstacleBlockedAt(x, y, 20);
  }

  spawnEnemyFromEventPoint(lane, anchor, eventType = "ladder") {
    if (!anchor || this.getAliveEnemyCount() >= PERFORMANCE_MAX_ACTIVE_ENEMIES) {
      return null;
    }

    const type = this.pickEnemyArchetype();
    const spreadMin = eventType === "hatch" ? 28 : 16;
    const spreadMax = eventType === "hatch" ? 86 : 52;
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(spreadMin, spreadMax);
      const x = Phaser.Math.Clamp(anchor.x + Math.cos(angle) * distance, 12, WORLD_WIDTH - 12);
      const y = Phaser.Math.Clamp(anchor.y + Math.sin(angle) * distance, 12, WORLD_HEIGHT - 12);
      if (!this.isValidEventSpawnPoint(x, y)) {
        continue;
      }
      return this.spawnEnemyAtPosition(type, x, y, lane);
    }

    const fallback = this.getSpawnPosition(lane);
    if (!this.isValidSpawnPoint(fallback.x, fallback.y)) {
      return null;
    }
    return this.spawnEnemyAtPosition(type, fallback.x, fallback.y, lane);
  }

  spawnEnemyAtPosition(type, x, y, lane = null) {
    if (this.getAliveEnemyCount() >= PERFORMANCE_MAX_ACTIVE_ENEMIES) {
      return null;
    }
    const hpMultiplier = this.director.getEnemyHpMultiplier();
    const baseHp = ENEMY_ARCHETYPE_CONFIGS[type]?.hp ?? ENEMY_ARCHETYPE_CONFIGS.chaser.hp;
    const scaledHp = Math.max(1, Math.round(baseHp * hpMultiplier));
    const enemy = this.enemyPool.acquire(type, { x, y, hp: scaledHp });
    if (!enemy) {
      return null;
    }

    enemy.setData("lastDashHitId", -1);
    enemy.setData("archetype", type);
    enemy.setData("spawnLane", lane);
    enemy.serverId = `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const eliteChance = this.director.getEliteChance();
    const isElite = type !== "swarm" && Math.random() < eliteChance;
    enemy.setData("isElite", isElite);
    enemy.setData("eliteType", null);
    if (isElite) {
      const eliteType = this.pickEliteType();
      enemy.setData("eliteType", eliteType);
      enemy.setElite(eliteType);
    }

    return enemy;
  }

  getOppositeBossEntryLane(lane) {
    if (lane === SPAWN_LANES.BOW) {
      return SPAWN_LANES.STERN;
    }
    return SPAWN_LANES.BOW;
  }

  getBossEntrySpawn(lane) { return this.spawnManager.getBossEntrySpawn(lane); }
  spawnBossEnemy(lane) { this.spawnManager.spawnBossEnemy(lane); }
  spawnMiniBossEnemy(lane) { this.spawnManager.spawnMiniBossEnemy(lane); }

  clearWarningBanner() { this.warningBanner.clearWarningBanner(); }

  showWarningBanner(message, opts) { this.warningBanner.showWarningBanner(message, opts); }

  createHudAlertPool() {
    this.warningBanner.hudAlertPool = [];
    for (let i = 0; i < HUD_ALERT_POOL_SIZE; i += 1) {
      const text = this.add
        .text(640, 74, "", HUD_ALERT_STYLE)
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(RENDER_DEPTH.HUD + 4)
        .setVisible(false)
        .setActive(false);
      text.setData("alertKind", null);
      text.setData("alertTween", null);
      text.setData("alertHideEvent", null);
      this.warningBanner.hudAlertPool.push(text);
    }
  }

  releaseHudAlertText(text) {
    if (!text) {
      return;
    }

    const alertTween = text.getData("alertTween");
    if (alertTween) {
      alertTween.stop();
    }
    const hideEvent = text.getData("alertHideEvent");
    if (hideEvent) {
      hideEvent.remove(false);
    }

    text.setData("alertTween", null);
    text.setData("alertHideEvent", null);
    text.setData("alertKind", null);
    text.setAlpha(1);
    text.setScale(1);
    text.setVisible(false);
    text.setActive(false);
  }

  acquireHudAlertText(kind) {
    if (!Array.isArray(this.warningBanner.hudAlertPool) || this.warningBanner.hudAlertPool.length === 0) {
      return null;
    }

    let text = this.warningBanner.hudAlertPool.find((entry) => entry.active && entry.getData("alertKind") === kind);
    if (!text) {
      text = this.warningBanner.hudAlertPool.find((entry) => !entry.active);
    }
    if (!text) {
      text = this.warningBanner.hudAlertPool[0];
    }
    if (!text) {
      return null;
    }

    this.warningBanner.releaseHudAlertText(text);
    text.setData("alertKind", kind);
    text.setVisible(true);
    text.setActive(true);
    return text;
  }

  showHudAlert(message, durationMs) { this.warningBanner.showHudAlert(message, durationMs); }

  checkStageAnnouncements() {
    const sec = Math.floor(this.runTimeMs / 1000);
    if (sec === this.lastStageAnnouncementSec) return;

    const STAGE_EVENTS = [
      { time: 30, text: "敌人开始涌入...", color: "#ffcc44" },
      { time: 60, text: "精英敌人出现!", color: "#ff8844" },
      { time: 90, text: "危险等级提升!", color: "#ff4444" },
      { time: 150, text: "更多敌人来袭!", color: "#ff6644" },
      { time: 210, text: "生存考验!", color: "#ff4466" },
    ];

    const event = STAGE_EVENTS.find(e => e.time === sec);
    if (event) {
      this.warningBanner.showStageAnnouncement(event.text, event.color);
      this.lastStageAnnouncementSec = sec;
    }

    // Boss announcements
    const bossInterval = DIRECTOR_BOSS_SPAWN?.intervalMs;
    if (Number.isFinite(bossInterval) && bossInterval > 0) {
      const bossSec = Math.floor(bossInterval / 1000);
      if (sec > 0 && sec % bossSec === 0 && sec !== this.lastStageAnnouncementSec) {
        this.warningBanner.showStageAnnouncement("BOSS 来袭!", "#ff2222");
        this.lastStageAnnouncementSec = sec;
      }
    }
  }

  showStageAnnouncement(lines) { this.warningBanner.showStageAnnouncement(lines); }

  updateBossApproachWarning() { this.spawnManager.updateBossApproachWarning(); }
  updateReaperSpawning() { this.spawnManager.updateReaperSpawning(); }
  spawnReaper() { this.spawnManager.spawnReaper(); }

  lerpColor(fromHex, toHex, t) {
    const blend = Phaser.Math.Clamp(t, 0, 1);
    const fromR = (fromHex >> 16) & 0xff;
    const fromG = (fromHex >> 8) & 0xff;
    const fromB = fromHex & 0xff;
    const toR = (toHex >> 16) & 0xff;
    const toG = (toHex >> 8) & 0xff;
    const toB = toHex & 0xff;

    const r = Math.round(Phaser.Math.Linear(fromR, toR, blend));
    const g = Math.round(Phaser.Math.Linear(fromG, toG, blend));
    const b = Math.round(Phaser.Math.Linear(fromB, toB, blend));
    return (r << 16) | (g << 8) | b;
  }

  updateDashCooldownRing() {
    if (!this.dashCooldownRingGraphics) {
      return;
    }

    this.dashCooldownRingGraphics.clear();
    if (!this.player?.active) {
      return;
    }

    const x = this.player.x;
    const y = this.player.y;
    const radius = 26;
    const dashRatio = Phaser.Math.Clamp(this.player.getDashRatio(), 0, 1);
    const nowMs = this.time?.now ?? 0;
    const isReady = dashRatio >= 1 && !this.player.isDashing();

    this.dashCooldownRingGraphics.lineStyle(2, 0x14253b, 0.7);
    this.dashCooldownRingGraphics.strokeCircle(x, y, radius);

    if (isReady) {
      const pulse = (Math.sin(nowMs / 130) + 1) / 2;
      const glowColor = this.lerpColor(0xffd166, 0xffffff, pulse * 0.65);
      this.dashCooldownRingGraphics.lineStyle(4, glowColor, 0.24 + pulse * 0.28);
      this.dashCooldownRingGraphics.strokeCircle(x, y, radius + 4 + pulse * 1.2);
    }

    if (dashRatio <= 0) {
      return;
    }

    const ringColor = isReady ? 0xffd166 : 0x7fd8ff;
    const ringAlpha = isReady ? 1 : 0.92;
    this.dashCooldownRingGraphics.lineStyle(3, ringColor, ringAlpha);
    this.dashCooldownRingGraphics.beginPath();
    this.dashCooldownRingGraphics.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * dashRatio, false);
    this.dashCooldownRingGraphics.strokePath();
  }

  spawnDamageNumber(x, y, value, priority, options) { this.damageNumbers.spawn(x, y, value, priority, options); }

  spawnDamageText(x, y, value, enemy) { this.damageNumbers.spawn(x, y, value, enemy?.isElite ? 1 : 0, { isElite: enemy?.isElite, isBoss: enemy?.getData?.("bossVariant") === "full" }); }

  formatRunTime(ms) { return this.gameplayHUD.formatRunTime(ms); }

  getWeaponIconKey(weaponType) { return this.gameplayHUD.getWeaponIconKey(weaponType); }

  getWeaponIconPath(weaponType) { return this.gameplayHUD.getWeaponIconPath(weaponType); }

  updateHudWeaponIcons() { this.gameplayHUD.updateWeaponIcons(); }

  loadSpawnPacingPresetKey() {
    if (typeof window === "undefined" || !window.localStorage) {
      return PLAYTEST_SPAWN_PACING_DEFAULT;
    }

    const saved = window.localStorage.getItem(PLAYTEST_SPAWN_PACING_STORAGE_KEY);
    if (saved && PLAYTEST_SPAWN_PACING_PRESETS[saved]) {
      return saved;
    }
    return PLAYTEST_SPAWN_PACING_DEFAULT;
  }

  saveSpawnPacingPresetKey(key) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(PLAYTEST_SPAWN_PACING_STORAGE_KEY, key);
  }

  applySpawnPacingPreset(key) {
    const preset = PLAYTEST_SPAWN_PACING_PRESETS[key];
    if (!preset) {
      return false;
    }

    this.spawnPacingPresetKey = key;
    this.spawnPacingPreset = preset;
    this.baseSpawnCheckIntervalMs = Math.max(60, BASE_SPAWN_CHECK_INTERVAL_MS * (preset.spawnIntervalScale ?? 1));
    this.saveSpawnPacingPresetKey(key);
    return true;
  }

  cycleSpawnPacingPresetAtRunStart() {
    if (this.runTimeMs > 0) {
      this.warningBanner.showHudAlert("PACING LOCKED IN RUN", 900);
      return;
    }

    const currentIdx = Math.max(0, PLAYTEST_SPAWN_PACING_ORDER.indexOf(this.spawnPacingPresetKey));
    const nextKey = PLAYTEST_SPAWN_PACING_ORDER[(currentIdx + 1) % PLAYTEST_SPAWN_PACING_ORDER.length];
    if (!this.applySpawnPacingPreset(nextKey)) {
      return;
    }
    this.warningBanner.showHudAlert(`PACING ${nextKey}`, 1000);
    this.maintainEnemyDensity();
    this.updateDebugDirectorOverlay();
  }

  toggleDebugOverlay() {
    this.debugOverlayEnabled = !this.debugOverlayEnabled;
    this.debugOverlayPanel?.setVisible(this.debugOverlayEnabled);
    this.debugDirectorText?.setVisible(this.debugOverlayEnabled);
    this.warningBanner.showHudAlert(this.debugOverlayEnabled ? "DEBUG HUD ON" : "DEBUG HUD OFF", 850);
  }

  toggleCameraFollow() {
    const enabled = this.cameraController.toggleFollow();
    this.warningBanner.showHudAlert(enabled ? "CAM FOLLOW ON" : "CAM FOLLOW OFF", 900);
  }

  handlePlaytestHotkeys() {
    if (!this.keys) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.debugToggle)) {
      this.toggleDebugOverlay();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.pacingPreset)) {
      this.cycleSpawnPacingPresetAtRunStart();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.cameraToggle)) {
      this.toggleCameraFollow();
    }
  }

  updateDebugDirectorOverlay() {
    if (!this.debugDirectorText || !this.director || !this.debugOverlayEnabled) {
      return;
    }

    const alive = this.getAliveEnemyCount();
    const spawnRateMultiplier = this.getEffectiveSpawnRateMultiplier();
    const spawnIntervalMs = this.baseSpawnCheckIntervalMs / Math.max(0.2, spawnRateMultiplier);
    const eliteChance = this.director.getEliteChance();
    const weaponCount = this.player?.weapons?.length ?? 0;
    const passiveCount = Object.keys(this.player?.passives ?? {}).length;
    const metaLiveTotal = (this.metaData?.currency ?? 0) + (this.runMetaCurrency ?? 0);
    this.debugDirectorText.setText(
      [
        `Enemies: ${alive}/${this.targetEnemies}`,
        `Pacing: ${this.spawnPacingPresetKey}`,
        `EliteChance: ${(eliteChance * 100).toFixed(1)}%`,
        `SpawnInterval: ${Math.round(spawnIntervalMs)}ms`,
        `Build: WPN ${weaponCount} / PAS ${passiveCount} / META ${metaLiveTotal}`,
        `GameTime: ${this.gameplayHUD.formatRunTime(this.runTimeMs)}`
      ].join("\n")
    );
  }

  getOffscreenIndicatorColor(enemy) { return this.offscreenIndicators.getOffscreenIndicatorColor(enemy); }

  updateOffscreenEnemyIndicators() { this.offscreenIndicators.update(); }

  getSpawnCandidateForLane(lane, view) {
    const rule = SPAWN_LANE_RULES[lane];
    if (!rule) {
      return null;
    }

    const width = Math.max(1, view.right - view.left);
    const height = Math.max(1, view.bottom - view.top);
    const rangeStart = Phaser.Math.Clamp(rule.rangeStart ?? 0, 0, 1);
    const rangeEnd = Phaser.Math.Clamp(rule.rangeEnd ?? 1, rangeStart, 1);
    const offset = Math.max(24, Number(rule.offscreenOffset) || 90);

    let x = view.centerX;
    let y = view.centerY;
    if (rule.edge === "top") {
      x = Phaser.Math.Between(view.left + width * rangeStart, view.left + width * rangeEnd);
      y = view.top - offset;
    } else if (rule.edge === "bottom") {
      x = Phaser.Math.Between(view.left + width * rangeStart, view.left + width * rangeEnd);
      y = view.bottom + offset;
    } else if (rule.edge === "left") {
      x = view.left - offset;
      y = Phaser.Math.Between(view.top + height * rangeStart, view.top + height * rangeEnd);
    } else if (rule.edge === "right") {
      x = view.right + offset;
      y = Phaser.Math.Between(view.top + height * rangeStart, view.top + height * rangeEnd);
    }

    return {
      x: Phaser.Math.Clamp(x, 12, WORLD_WIDTH - 12),
      y: Phaser.Math.Clamp(y, 12, WORLD_HEIGHT - 12),
      lane
    };
  }

  getSpawnPosition(lane = null) {
    const view = this.cameras.main.worldView;
    const hasRequestedLane = Boolean(lane && SPAWN_LANE_RULES[lane]);
    const lanes = hasRequestedLane ? [lane] : SPAWN_LANE_KEYS;

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const laneForAttempt = hasRequestedLane ? lane : Phaser.Utils.Array.GetRandom(lanes);
      const candidate = this.getSpawnCandidateForLane(laneForAttempt, view);
      if (!candidate) {
        continue;
      }
      if (this.isValidSpawnPoint(candidate.x, candidate.y)) {
        return candidate;
      }
    }

    const fallbackCandidates = lanes
      .map((laneKey) => this.getSpawnCandidateForLane(laneKey, view))
      .filter(Boolean);

    let best = fallbackCandidates[0] ?? { x: this.player.x, y: this.player.y };
    let bestScore = Number.NEGATIVE_INFINITY;
    fallbackCandidates.forEach((candidate) => {
      const outsideBonus = Phaser.Geom.Rectangle.Contains(view, candidate.x, candidate.y) ? 0 : 100000;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, candidate.x, candidate.y);
      const score = outsideBonus + distance;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    });

    return best;
  }

  isValidSpawnPoint(x, y) {
    const view = this.cameras.main.worldView;
    const isOutsideView = !Phaser.Geom.Rectangle.Contains(view, x, y);
    const isOutsideSafeRadius = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) > this.safeRadius;
    const noObstacleOverlap = !this.isObstacleBlockedAt(x, y, 18);
    return isOutsideView && isOutsideSafeRadius && noObstacleOverlap;
  }

  pickEnemyArchetype() {
    const elapsedSeconds = this.runTimeMs / 1000;
    const availableTypes = ENEMY_TYPE_WEIGHTS.filter((entry) => {
      if (entry.type === "hunter" && elapsedSeconds < HUNTER_UNLOCK_TIME_SEC) return false;
      if (entry.type === "ranger" && elapsedSeconds < RANGER_UNLOCK_TIME_SEC) return false;
      if (entry.type === "thrower" && elapsedSeconds < THROWER_UNLOCK_TIME_SEC) return false;
      if (entry.type === "boomeranger" && elapsedSeconds < BOOMERANGER_UNLOCK_TIME_SEC) return false;
      if (entry.type === "ghost" && elapsedSeconds < GHOST_UNLOCK_TIME_SEC) return false;
      if (entry.type === "mech" && elapsedSeconds < MECH_UNLOCK_TIME_SEC) return false;
      if (entry.type === "exploder" && elapsedSeconds < EXPLODER_UNLOCK_TIME_SEC) return false;
      if (entry.type === "freezer" && elapsedSeconds < FREEZER_UNLOCK_TIME_SEC) return false;
      if (entry.type === "healer" && elapsedSeconds < HEALER_UNLOCK_TIME_SEC) return false;
      if (entry.type === "splitter" && elapsedSeconds < SPLITTER_UNLOCK_TIME_SEC) return false;
      return true;
    });

    const totalWeight = availableTypes.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;

    for (let i = 0; i < availableTypes.length; i += 1) {
      roll -= availableTypes[i].weight;
      if (roll <= 0) {
        return availableTypes[i].type;
      }
    }

    return "chaser";
  }

  pickEliteType() {
    const roll = Math.random();
    if (roll < 0.34) {
      return "speed_boost";
    }
    if (roll < 0.67) {
      return "dash_attack";
    }
    return "poison_aura";
  }

  handlePlayerEnemyCollision(p, e) { this.combatManager.handlePlayerEnemyCollision(p, e); }
  handleBossProjectileHit(p, proj) { this.combatManager.handleBossProjectileHit(p, proj); }

  triggerPlayerHurtFeedback(player) {
    if (!player?.active || this.isGameOver || this.isLeveling || this.isWeaponSelecting) {
      return;
    }

    const now = this.time?.now ?? 0;
    if (now - this.lastPlayerHurtFeedbackAt < PLAYER_HURT_FEEDBACK_COOLDOWN_MS) {
      return;
    }
    this.lastPlayerHurtFeedbackAt = now;

    this.shakeScreen(PLAYER_HURT_SHAKE_DURATION_MS, PLAYER_HURT_SHAKE_INTENSITY);

    const pulse = this.add
      .circle(player.x, player.y, PLAYER_HURT_PULSE_RADIUS, 0xff7a7a, PLAYER_HURT_PULSE_ALPHA)
      .setDepth(RENDER_DEPTH.PLAYER - 1)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setScale(0.7);

    this.tweens.add({
      targets: pulse,
      scale: 1.95,
      alpha: 0,
      duration: PLAYER_HURT_PULSE_DURATION_MS,
      ease: "Quad.easeOut",
      onComplete: () => pulse.destroy()
    });
  }

  showBossRadialWarning(boss, durationMs = 1000) {
    if (!boss?.active) {
      return;
    }

    const indicatorY = boss.y - Math.max(42, boss.displayHeight * 0.45);
    const warningText = this.add
      .text(boss.x, indicatorY, "环形冲击", {
        fontFamily: "ZpixOne",
        fontSize: "16px",
        color: "#ffd1d1",
        stroke: "#3f0f0f",
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(22);

    this.tweens.add({
      targets: warningText,
      y: indicatorY - 16,
      alpha: 0,
      duration: Math.max(120, durationMs),
      ease: "Cubic.easeOut",
      onComplete: () => warningText.destroy()
    });
  }

  acquireBossProjectile() {
    if (!this.bossProjectiles) {
      return null;
    }

    let projectile = this.bossProjectiles.getFirstDead(false);
    if (!projectile) {
      if (this.bossProjectiles.getLength() >= BOSS_BULLET_MAX) {
        return null;
      }
      projectile = this.bossProjectiles.create(-1000, -1000, "boss_bullet");
      if (!projectile?.body) {
        return null;
      }
      projectile.body.setCircle(Math.max(2, projectile.displayWidth * 0.42), 0, 0);
      projectile.setDepth(8);
    }

    projectile.setActive(true);
    projectile.setVisible(true);
    projectile.body.enable = true;
    return projectile;
  }

  releaseBossProjectile(projectile) {
    if (!projectile) {
      return;
    }
    if (projectile.body) {
      projectile.body.setVelocity(0, 0);
      projectile.body.enable = false;
    }
    projectile.setActive(false);
    projectile.setVisible(false);
    projectile.setPosition(-1000, -1000);
  }

  spawnBossRadialBurst(boss, bulletCount = 12, bulletSpeed = 220) {
    if (!boss?.active || this.isGameOver) {
      return;
    }

    const safeCount = Math.max(3, Math.min(32, Math.floor(bulletCount || 12)));
    const safeSpeed = Math.max(80, Math.min(420, Number(bulletSpeed) || 220));
    const damagePerBullet = Math.max(8, Math.round((boss.damage ?? 24) * 0.45));
    const nowMs = this.time?.now ?? 0;
    for (let i = 0; i < safeCount; i += 1) {
      const projectile = this.acquireBossProjectile();
      if (!projectile || !projectile.body) {
        continue;
      }

      const angle = (Math.PI * 2 * i) / safeCount;
      const vx = Math.cos(angle) * safeSpeed;
      const vy = Math.sin(angle) * safeSpeed;
      projectile.enableBody(true, boss.x, boss.y, true, true);
      projectile.body.setVelocity(vx, vy);
      projectile.setData("damage", damagePerBullet);
      projectile.setData("expireAtMs", nowMs + BOSS_BULLET_LIFETIME_MS);
    }
  }

  updateBossProjectiles(nowMs) {
    if (!this.bossProjectiles) {
      return;
    }

    this.bossProjectiles.getChildren().forEach((projectile) => {
      if (!projectile?.active) {
        return;
      }

      const expireAtMs = projectile.getData("expireAtMs") ?? 0;
      const outOfBounds =
        projectile.x < -30 || projectile.y < -30 || projectile.x > WORLD_WIDTH + 30 || projectile.y > WORLD_HEIGHT + 30;
      if (nowMs >= expireAtMs || outOfBounds) {
        this.releaseBossProjectile(projectile);
      }
    });
  }

  performAutoAttack(now) { this.combatManager.performAutoAttack(now); }

  spawnXpOrb(x, y, value, config = {}) { this.dropManager.spawnXpOrb(x, y, value, config); }

  spawnEliteBonusXpOrbs(enemy) { this.dropManager.spawnEliteBonusXpOrbs(enemy); }
  spawnEliteUpgradePickup(x, y) { return this.dropManager.spawnEliteUpgradePickup(x, y); }
  spawnMiniBossRewardDrops(enemy) { this.dropManager.spawnMiniBossRewardDrops(enemy); }
  applyEliteUpgradeReward(id) { return this.dropManager.applyEliteUpgradeReward(id); }

  updateKillCombo() { this.comboSystem.updateKillCombo(); }

  handleEnemyDefeat(enemy) { this.dropManager.handleEnemyDefeat(enemy); }
  handleXpOrbPickup(p, orb) { this.dropManager.handleXpOrbPickup(p, orb); }
  trySpawnItemDrop(x, y) { this.dropManager.trySpawnItemDrop(x, y); }
  spawnChest(x, y) { this.dropManager.spawnChest(x, y); }

  updateChests() {
    if (!this.chests || this.chests.length === 0) return;
    const nowMs = this.time.now;
    const player = this.player;
    for (let i = this.chests.length - 1; i >= 0; i--) {
      const chest = this.chests[i];
      if (!chest.active || chest.collected) {
        this.chests.splice(i, 1);
        continue;
      }
      if (chest.isExpired(nowMs)) {
        chest.destroy();
        this.chests.splice(i, 1);
        continue;
      }
      if (chest.isNearPlayer(player.x, player.y)) {
        const reward = chest.collect();
        if (reward) {
          this.openTreasureChest(reward);
        }
        this.chests.splice(i, 1);
      }
    }
  }

  openTreasureChest(reward) {
    this.audioManager.playSfx("chest_open");

    // Gold reward
    if (reward.gold > 0) {
      this.runMetaCurrency += reward.gold;
      this.warningBanner.showHudAlert(`+${reward.gold} GOLD`, 1200);
    }

    // Weapon upgrade
    if (reward.weaponUpgrade && this.weaponSystem) {
      const weapons = this.player.weapons ?? [];
      if (weapons.length > 0) {
        const weapon = weapons[Math.floor(Math.random() * weapons.length)];
        this.weaponSystem.levelUpWeapon(weapon);
        this.weaponSystem.checkEvolution(weapon);
        this.warningBanner.showHudAlert("WEAPON UPGRADE", 1000);
      }
    }

    // New weapon (if slots available)
    if (reward.newWeapon && this.weaponSystem) {
      const weapons = this.player.weapons ?? [];
      if (weapons.length < this.player.maxWeaponSlots) {
        const baseTypes = ["dagger", "fireball", "lightning", "scatter_shot", "homing_missile", "laser"];
        const owned = new Set(weapons.map(w => w.baseType || w.type));
        const available = baseTypes.filter(t => !owned.has(t));
        if (available.length > 0) {
          const type = available[Math.floor(Math.random() * available.length)];
          this.weaponSystem.addWeapon(type);
          this.warningBanner.showHudAlert("NEW WEAPON", 1200);
        }
      }
    }
  }


  updateActiveItems(deltaMs) {
    if (!this.activeItems || this.activeItems.length === 0) {
      return;
    }
    const nowMs = this.time.now;
    const player = this.player;
    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      const item = this.activeItems[i];
      if (!item.active || item.inPool) {
        this.activeItems.splice(i, 1);
        continue;
      }
      item.updateVisual(nowMs);
      item.pullTowardPlayer(player.x, player.y, deltaMs);
      // Check pickup
      const dx = player.x - item.x;
      const dy = player.y - item.y;
      if (Math.hypot(dx, dy) < 36) {
        item.applyEffect(player, this);
        this.showItemPickupText(item);
        this.itemPool.release(item);
        this.activeItems.splice(i, 1);
        continue;
      }
      // Check expiry
      if (item.isExpired(nowMs)) {
        this.itemPool.release(item);
        this.activeItems.splice(i, 1);
      }
    }
  }

  showItemPickupText(item) {
    if (!item.itemConfig) {
      return;
    }
    const label = item.itemConfig.label;
    const colorMap = {
      health_orb: "#44ff66",
      shield: "#4488ff",
      speed_boost: "#ffdd44",
      magnet: "#cc44ff"
    };
    const color = colorMap[item.itemConfig.id] || "#ffffff";
    const text = this.add
      .text(item.x, item.y - 16, label, {
        fontFamily: "ZpixOne",
        fontSize: "14px",
        color,
        stroke: "#000000",
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(RENDER_DEPTH.DAMAGE_TEXT);
    this.tweens.add({
      targets: text,
      y: text.y - 32,
      alpha: 0,
      duration: 800,
      ease: "Quad.easeOut",
      onComplete: () => text.destroy()
    });
  }

  updateShieldEffect(deltaMs) {
    if (this.player.shieldRemainingMs > 0) {
      this.player.shieldRemainingMs = Math.max(0, this.player.shieldRemainingMs - deltaMs);
      if (this.player.shieldRemainingMs <= 0) {
        this.player.clearTint();
        if (this.fighterConfig && this.fighterConfig.tint) {
          this.player.setTint(this.fighterConfig.tint);
        }
      }
    }
  }

  gainXp(amount) {
    const baseAmount = Math.max(0, Math.round(amount));
    const effectiveAmount = Math.max(0, Math.round(baseAmount * this.metaXpMultiplier));
    if (effectiveAmount > 0) {
      this.playExpGainPulse();
    }

    this.totalXp += effectiveAmount;
    this.currentXp += effectiveAmount;

    let hasLeveledUp = false;
    while (this.currentXp >= this.xpToNext) {
      this.currentXp -= this.xpToNext;
      this.level += 1;
      this.player.level = this.level;
      this.pendingLevelUps += 1;
      this.xpToNext = this.getXpRequirement(this.level);
      hasLeveledUp = true;
    }

    if (hasLeveledUp) {
      this.audioManager.playSfx("level_up");
      this.checkFighterEvolution();
    }

    if (!this.isLeveling && this.pendingLevelUps > 0) {
      this.levelUpManager.open();
    }
  }

  getXpRequirement(level) {
    if (XP_REQUIREMENTS.byLevel[level] !== undefined) {
      return XP_REQUIREMENTS.byLevel[level];
    }
    return XP_REQUIREMENTS.postL3Base + (level - 3) * XP_REQUIREMENTS.postL3Step;
  }

  playExpGainPulse() {
    if (!this.tweens) {
      return;
    }

    if (this.expBarPulseTween) {
      this.expBarPulseTween.stop();
      this.expBarPulseTween = null;
    }

    this.expBarScaleY = 1;
    this.expBarPulseTween = this.tweens.add({
      targets: this,
      expBarScaleY: HUD_EXP_PULSE_SCALE,
      duration: Math.floor(HUD_EXP_PULSE_DURATION_MS * 0.5),
      ease: "Sine.easeOut",
      yoyo: true,
      onComplete: () => {
        this.expBarScaleY = 1;
        this.expBarPulseTween = null;
      }
    });
  }

  playKillCounterPulse() { this.comboSystem.playKillCounterPulse(); }

  createModalTitle(centerX, centerY, label, config = {}) {
    const snappedX = Math.round(centerX);
    const snappedY = Math.round(centerY);
    const fontSize = Number(config.fontSize ?? 32);
    const badgeHeight = Number(config.badgeHeight ?? 32);
    const paddingX = Number(config.paddingX ?? 26);
    const minWidth = Number(config.minWidth ?? 180);
    const badgeDepth = Number(config.badgeDepth ?? 30.4);
    const textDepth = Number(config.textDepth ?? badgeDepth + 0.6);
    const textStyle = {
      fontFamily: "ZpixOne",
      fontSize: `${fontSize}px`,
      color: config.color ?? "#3a1f11"
    };

    const measureText = this.add
      .text(-1000, -1000, label, textStyle)
      .setVisible(false)
      .setActive(false);
    const badgeWidth = Math.max(minWidth, Math.ceil(measureText.width) + paddingX * 2);
    measureText.destroy();

    const titleChip = this.add
      .rectangle(snappedX, snappedY, badgeWidth, badgeHeight, 0xc19a67, 0.96)
      .setStrokeStyle(2, 0x6d4a31, 0.95)
      .setScrollFactor(0)
      .setDepth(badgeDepth);

    const title = this.add
      .text(snappedX, snappedY, label, textStyle)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(textDepth);

    return { titleChip, title };
  }

  openLevelUpChoices() { this.levelUpManager.open(); }
  handleLevelUpInput() { this.levelUpManager.handleInput(); }

  openPauseMenu() { this.pauseManager.open(); }
  closePauseMenu() { this.pauseManager.close(); }
  handlePauseInput() { this.pauseManager.handleInput(); }

  openWeaponSelection() {
    if (this.isWeaponSelecting || this.isGameOver) {
      return;
    }

    this.isWeaponSelecting = true;
    this.weaponSelectionActions = [];
    this.physics.pause();
    this.player.body?.setVelocity(0, 0);
    this.applyHudModalFocus(true);
    try {
      const canvasW = 1280;
      const canvasH = 720;
      const centerX = canvasW / 2;
      const panelWidth = 440;
      const panelHeight = 380;
      const panelTop = Math.max(10, (canvasH - panelHeight) / 2);
      const centerY = panelTop + panelHeight / 2;
      const d = RENDER_DEPTH.MENUS;

      const overlay = this.add.rectangle(centerX, canvasH / 2, canvasW, canvasH, 0x000000, 0.55).setScrollFactor(0).setDepth(d);
      const panelShadow = this.add.rectangle(centerX + 2, centerY + 4, panelWidth, panelHeight, 0x000000, 0.5).setScrollFactor(0).setDepth(d + 1);
      const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x3a3a5a, 0.98)
        .setStrokeStyle(4, 0xc4a040, 1).setScrollFactor(0).setDepth(d + 1);
      const panelInset = this.add.rectangle(centerX, centerY, panelWidth - 12, panelHeight - 12, 0x2a2a4a, 0)
        .setStrokeStyle(2, 0x8a7a3a, 0.8).setScrollFactor(0).setDepth(d + 1);
      //初始武器面板
      const title = this.add.text(centerX, panelTop + 24, "选择初始武器", {
        fontFamily: "ZpixOne", fontSize: "22px", color: "#fef08a",
        stroke: "#0a0a0a", strokeThickness: 5
      }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 2);

      const coinText = this.add.text(centerX, panelTop + 48, `金币: ${this.metaData.currency}`, {
        fontFamily: "ZpixOne", fontSize: "12px", color: "#a0a0b0",
        stroke: "#0a0a0a", strokeThickness: 2
      }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 2);

      const headerBottom = panelTop + 66;
      const subtitle = this.add.text(centerX, headerBottom, "选择一把武器开始游戏", {
        fontFamily: "ZpixOne", fontSize: "11px", color: "#8a8aaa",
        stroke: "#0a0a0a", strokeThickness: 2
      }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 2);

      const statusTextY = centerY + panelHeight / 2 - 20;
      const statusText = this.add
      .text(centerX, statusTextY, "", {
        fontFamily: "ZpixOne",
        fontSize: "12px",
        color: "#ffb4b4",
        stroke: "#0a0a0a",
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(d + 2);

      const optionRows = [];
      const optAreaTop = headerBottom + 10;
      const optAreaBottom = statusTextY - 12;
      const optAreaHeight = optAreaBottom - optAreaTop;
      const optionCount = START_WEAPON_OPTIONS.length;
      const optionSpacing = Math.min(50, (optAreaHeight - 36) / Math.max(1, optionCount - 1));
      const optionsStartY = optAreaTop + 20;
      const optBoxW = panelWidth - 48;
      const optInlayW = optBoxW - 10;
      const iconOffsetX = centerX - optBoxW / 2 + 20;
      const textOffsetX = iconOffsetX + 32;
      START_WEAPON_OPTIONS.forEach((option, index) => {
      const y = optionsStartY + index * optionSpacing;
      const box = this.add.rectangle(centerX, y, optBoxW, 42, 0x2a2a4a, 0.98)
        .setStrokeStyle(2, 0xc4a040, 0.9)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(d + 3);
      const boxInlay = this.add.rectangle(centerX, y, optInlayW, 32, 0x1a1a2a, 0.88)
        .setStrokeStyle(1, 0x8a7a3a, 0.6)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(d + 4);
      const weaponIcon = this.add
        .image(iconOffsetX, y, this.gameplayHUD.getWeaponIconKey(option.weaponType))
        .setDisplaySize(20, 20)
        .setScrollFactor(0)
        .setDepth(d + 5);
      const heading = this.add
        .text(textOffsetX, y - 8, `[${index + 1}] ${option.label}`, {
          fontFamily: "ZpixOne",
          fontSize: "13px",
          color: "#ffffff",
          stroke: "#0a0a0a",
          strokeThickness: 3
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(d + 5);
      const detail = this.add
        .text(textOffsetX, y + 8, "", {
          fontFamily: "ZpixOne",
          fontSize: "10px",
          color: "#a0a0b0",
          stroke: "#0a0a0a",
          strokeThickness: 1
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(d + 5);

      const refreshOption = () => {
        const unlocked = Boolean(this.weaponUnlocks[option.id]);
        if (unlocked) {
          detail.setText(`已解锁 · 点击选择`);
          detail.setColor("#88ff88");
        } else {
          detail.setText(`锁定 · 解锁需要 ${option.unlockCost} 金币`);
          detail.setColor("#ff8888");
        }
      };

      const choose = () => {
        this.playUiSfx(UI_SFX_KEYS.select, 1.3);
        const unlocked = Boolean(this.weaponUnlocks[option.id]);
        if (!unlocked) {
          const spent = this.trySpendMetaCoins(option.unlockCost);
          if (!spent) {
            statusText.setText("金币不足，无法解锁此武器。");
            statusText.setColor("#ffb4b4");
            return;
          }
          this.weaponUnlocks[option.id] = true;
          this.saveWeaponUnlocks(this.weaponUnlocks);
          coinText.setText(`金币: ${this.metaData.currency}`);
          refreshOption();
        }
        this.selectStartWeapon(option);
      };

      box.on("pointerdown", choose);
      boxInlay.on("pointerdown", choose);
      weaponIcon.setInteractive({ useHandCursor: true }).on("pointerdown", choose);
      heading.setInteractive({ useHandCursor: true }).on("pointerdown", choose);
      detail.setInteractive({ useHandCursor: true }).on("pointerdown", choose);
      refreshOption();
        optionRows.push(box, boxInlay, weaponIcon, heading, detail);
        this.weaponSelectionActions.push(choose);
      });

      this.weaponSelectionUi = [overlay, panelShadow, panel, panelInset, title, coinText, subtitle, statusText, ...optionRows];
    } catch (error) {
      console.error("[GameScene] Failed to open weapon selection modal, fallback to default weapon.", error);
      this.forceCloseWeaponSelectionWithFallback();
    }
  }

  handleWeaponSelectionInput() {
    const indexes = [this.keys.meta1, this.keys.meta2, this.keys.meta3, this.keys.meta4];
    for (let i = 0; i < indexes.length; i += 1) {
      if (Phaser.Input.Keyboard.JustDown(indexes[i])) {
        const action = this.weaponSelectionActions[i];
        if (action) {
          action();
        }
      }
    }
  }

  selectStartWeapon(option) {
    if (!option || this.selectedStartWeaponId) {
      return;
    }

    const added = this.weaponSystem.addWeapon(option.weaponType);
    if (!added && this.player.weapons.length === 0) {
      this.weaponSystem.addWeapon("dagger");
    }
    this.selectedStartWeaponId = option.id;
    this.closeWeaponSelection();
    this.warningBanner.showHudAlert(`${option.label.toUpperCase()} READY`, 1000);
  }

  closeWeaponSelection() {
    this.weaponSelectionUi.forEach((obj) => obj.destroy());
    this.weaponSelectionUi = [];
    this.weaponSelectionActions = [];
    this.isWeaponSelecting = false;
    this.applyHudModalFocus(false);

    if (!this.isGameOver && !this.isLeveling) {
      this.physics.resume();
    }
  }

  forceCloseWeaponSelectionWithFallback() {
    this.weaponSelectionUi.forEach((obj) => obj?.destroy?.());
    this.weaponSelectionUi = [];
    this.weaponSelectionActions = [];
    this.isWeaponSelecting = false;
    this.applyHudModalFocus(false);
    if (!this.player?.weapons?.length) {
      this.weaponSystem?.addWeapon?.("dagger");
    }
    if (!this.isGameOver && !this.isLeveling) {
      this.physics.resume();
    }
  }

  applyLevelUpUpgrade(upgrade) { this.levelUpManager.apply(upgrade); }

  pullXpOrbsToPlayer() {
    const basePickupRadius = Math.max(0, this.player.pickupRadius || 0);
    const levelBonusRadius = Math.max(0, this.level - 1) * XP_MAGNET_RADIUS_PER_LEVEL;
    const pickupRadius = basePickupRadius + levelBonusRadius;
    if (pickupRadius <= 0) {
      return;
    }

    const nowMs = this.time.now;
    this.xpOrbs.getChildren().forEach((orb) => {
      if (!orb.active || !orb.body) {
        return;
      }

      const dx = this.player.x - orb.x;
      const dy = this.player.y - orb.y;
      const distance = Math.hypot(dx, dy);
      const baseScale = Number(orb.getData("baseScale")) || XP_ORB_BASE_SCALE;
      const baseAlpha = Number(orb.getData("baseAlpha")) || XP_ORB_BASE_ALPHA;
      const pulse = 1 + Math.sin((nowMs + orb.x * 0.3 + orb.y * 0.17) / XP_ORB_PULSE_SPEED_MS) * XP_ORB_PULSE_AMPLITUDE;
      if (distance > pickupRadius) {
        orb.body.setVelocity(0, 0);
        orb.setScale(baseScale * pulse);
        orb.setAlpha(baseAlpha);
        return;
      }

      // 近距离强制拾取：防止高速移动导致 overlap 漏检（tunneling）
      if (distance < 24) {
        this.handleXpOrbPickup(this.player, orb);
        return;
      }

      const attractRatio = 1 - Phaser.Math.Clamp(distance / pickupRadius, 0, 1);
      const magnetScaleBoost = Number(orb.getData("magnetScaleBoost")) || XP_ORB_MAGNET_SCALE_BOOST;
      orb.setScale((baseScale + attractRatio * magnetScaleBoost) * pulse);
      orb.setAlpha(Math.min(1, baseAlpha + attractRatio * 0.08));

      if (distance <= XP_ORB_MAGNET_DIRECT_PULL_RADIUS) {
        orb.x += dx * XP_ORB_MAGNET_DIRECT_PULL_FACTOR;
        orb.y += dy * XP_ORB_MAGNET_DIRECT_PULL_FACTOR;
      }

      const nx = distance > 0.0001 ? dx / distance : 0;
      const ny = distance > 0.0001 ? dy / distance : 0;
      const pullStrength = Phaser.Math.Linear(XP_ORB_MAGNET_MIN_PULL, XP_ORB_MAGNET_MAX_PULL, attractRatio);
      orb.body.setVelocity(nx * pullStrength, ny * pullStrength);
    });
  }

  closeLevelUpChoices() { this.levelUpManager.close(); }

  resolveShipKey() { return this.playerSetup.resolveShipKey(); }

  resolveFighterKey() { return this.playerSetup.resolveFighterKey(); }

  checkFighterEvolution() {
    if (!this.fighterConfig || this.fighterEvolved) {
      return;
    }
    if (this.level < this.fighterConfig.evolutionLevel) {
      return;
    }

    this.fighterEvolved = true;
    const evo = this.fighterConfig.evolution;

    // Apply evolution bonuses
    this.player.maxHp += evo.hpBonus;
    this.player.hp = Math.min(this.player.hp + evo.hpBonus, this.player.maxHp);
    this.player.speed += evo.speedBonus;
    if (evo.tint) {
      this.player.setTint(evo.tint);
    }

    // Apply evolution passive effects
    const fx = evo.passiveEffect;
    if (fx) {
      if (fx.dashCooldownMultiplier) {
        this.player.dashCooldownMs = Math.round(this.player.dashCooldownMs * fx.dashCooldownMultiplier);
        this.player.dashChargeRate = this.player.dashGaugeMax / (this.player.dashCooldownMs / 1000);
      }
      if (fx.damageCooldownBonusMs) {
        this.player.damageCooldownMs += fx.damageCooldownBonusMs;
      }
      if (fx.pickupRadiusMultiplier) {
        this.player.pickupRadius = Math.round(this.player.pickupRadius * fx.pickupRadiusMultiplier);
      }
      if (fx.damageReduction) {
        this.player.damageReduction = (this.player.damageReduction || 0) + fx.damageReduction;
      }
      if (fx.xpMultiplier) {
        this.metaXpMultiplier = (this.metaXpMultiplier || 1) * fx.xpMultiplier;
      }
      if (fx.meleeDamageMultiplier) {
        this.player.meleeDamageMultiplier = (this.player.meleeDamageMultiplier || 1) * fx.meleeDamageMultiplier;
      }
      if (fx.orbitBladeCount) {
        // Add extra orbit blades
        const orbitWeapon = this.player.weapons.find((w) => w.type === "orbit_blades");
        if (orbitWeapon) {
          orbitWeapon.orbitBladeCount = (orbitWeapon.orbitBladeCount || 3) + fx.orbitBladeCount;
          this.weaponSystem?.rebuildOrbitBlades?.(orbitWeapon);
        }
      }
    }

    // Evolution visual feedback (reuse weapon evolution pattern)
    this.triggerEvolutionFeedback(evo.label);
  }

  triggerEvolutionFeedback(label) {
    // Slow-mo flash
    if (this.evolutionSlowMoRestoreHandle) {
      this.time.removeEvent(this.evolutionSlowMoRestoreHandle);
    }
    this.evolutionSlowMoActive = true;
    this.time.timeScale = 0.26;
    this.evolutionSlowMoRestoreHandle = this.time.delayedCall(180, () => {
      this.time.timeScale = 1;
      this.evolutionSlowMoActive = false;
      this.evolutionSlowMoRestoreHandle = null;
    });

    // Camera flash + shake
    this.cameras.main.flash(200, 255, 255, 200);
    this.shakeScreen(200, 0.008);

    // Particle burst
    if (this.particleFactory.evolutionEmitter) {
      this.particleFactory.evolutionEmitter.explode(28, this.player.x, this.player.y);
    }

    // HUD alert
    this.warningBanner.showHudAlert(`${label} EVOLVED!`, 2200);
  }

  applyMetaBonusesForRun() {
    const bonuses = this.metaSystem.getRunBonuses();
    const shopUpgrades = this.loadShopUpgradeLevels();
    this.metaXpMultiplier = bonuses.xpMultiplier;

    this.player.maxHp += bonuses.maxHpFlat;
    this.player.hp = this.player.maxHp;
    this.player.speed += bonuses.speedFlat;

    const moveSpeedMultiplier = 1 + shopUpgrades.movement_speed * 0.05;
    this.player.speed = Math.round(this.player.speed * moveSpeedMultiplier);

    const xpMultiplier = 1 + shopUpgrades.xp_gain * 0.1;
    this.metaXpMultiplier *= xpMultiplier;

    const dashCooldownMultiplier = Math.max(0.35, 1 - shopUpgrades.dash_cooldown * 0.05);
    this.player.dashCooldownMs = Math.max(700, Math.round(this.player.dashCooldownMs * dashCooldownMultiplier));
    this.player.dashChargeRate = this.player.dashGaugeMax / (this.player.dashCooldownMs / 1000);

    if (bonuses.startingWeaponBonus > 0) {
      this.weaponSystem.addWeapon("lightning");
    }
  }

  finalizeMetaRun() {
    if (this.metaSettled) {
      return;
    }

    this.metaSettled = true;
    this.lastRunMetaCurrency = this.calculateRunCoinReward();
    this.metaSystem.addCurrency(this.lastRunMetaCurrency);
    this.metaData = this.metaSystem.getData();
    this.saveCoinBank(this.metaData.currency);
    this.runMetaCurrency = 0;
  }

  triggerGameOver(force = false) {
    if (this.isGameOver) {
      return;
    }

    if (this.gameMode === "coop" && this.networkManager) {
      if (!this._hasSentPlayerDied) {
        this._hasSentPlayerDied = true;
        this.networkManager.sendPlayerDied();
      }
      if (!force) {
        const allDead = this.player.isDead() &&
          (!this.coopSync.playerSync || this.coopSync.playerSync.isAllDead());
        if (!allDead) {
          this.player.body?.setVelocity(0, 0);
          this.warningBanner.showHudAlert("等待队友救援...", 3000);
          return;
        }
      }
      if (!this._hasSentGameOver) {
        this._hasSentGameOver = true;
        this.networkManager.sendGameOver({
          timeSurvivedMs: this.runTimeMs,
          enemiesKilled: this.totalKills
        });
      }
    }

    this.isGameOver = true;
    this.audioManager.playGameOverMusic();
    this.physics.pause();
    this.input.enabled = false;
    this.player.body?.setVelocity(0, 0);
    this.updateBestTimeRecord(this.runTimeMs);
    this.finalizeMetaRun();
    this.submitRunStats();

    // Update ship unlock stats
    updateShipStats({
      timeSurvivedMs: this.runTimeMs,
      enemiesKilled: this.totalKills,
      levelReached: this.level
    });

    // Dramatic death sequence
    this.playDeathSequence(() => {
      this.refreshGameOverText();
      this.gameOverText.setVisible(false);
      if (this.gameOverRestartButton && this.gameOverRestartLabel) {
        this.gameOverRestartButton.setVisible(false);
        this.gameOverRestartLabel.setVisible(false);
      }

      const summaryPayload = {
        timeSurvivedMs: this.runTimeMs,
        enemiesKilled: this.totalKills,
        maxCombo: this.comboSystem.maxKillCombo,
        levelReached: this.level,
        coinsEarned: this.lastRunMetaCurrency,
        totalCoins: this.metaData.currency
      };
      if (this.scene.isActive("RunSummaryScene")) {
        this.scene.stop("RunSummaryScene");
      }
      this.scene.launch("RunSummaryScene", summaryPayload);
      this.scene.bringToTop("RunSummaryScene");
    });
  }

  playDeathSequence(onComplete) {
    const cx = 640;
    const cy = 360;
    const depth = RENDER_DEPTH.HUD + 20;

    // Red flash overlay
    const redFlash = this.add.rectangle(cx, cy, 1280, 720, 0xff0000, 0)
      .setScrollFactor(0).setDepth(depth);

    // "YOU DIED" text
    const deathText = this.add.text(cx, cy - 30, "YOU DIED", {
      fontFamily: "ZpixOne", fontSize: "64px", color: "#ff2222",
      stroke: "#000000", strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 0, color: "#ff0000", blur: 20, fill: true }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1).setAlpha(0).setScale(0.3);

    // Subtitle
    const subText = this.add.text(cx, cy + 30, `击杀: ${this.totalKills}  等级: ${this.level}  存活: ${this.gameplayHUD.formatRunTime(this.runTimeMs)}`, {
      fontFamily: "ZpixOne", fontSize: "18px", color: "#cc8888",
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1).setAlpha(0);

    // Kill particles burst
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 100 + Math.random() * 200;
      const particle = this.add.circle(cx, cy, 3 + Math.random() * 4, 0xff2222)
        .setScrollFactor(0).setDepth(depth + 1).setAlpha(0.9);
      this.tweens.add({
        targets: particle,
        x: cx + Math.cos(angle) * speed,
        y: cy + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 800 + Math.random() * 400,
        ease: "Quad.easeOut",
        onComplete: () => particle.destroy()
      });
    }

    // Screen shake
    this.shakeScreen(400, 0.012);

    // Sequence: red flash in → text pop → hold → fade out → callback
    this.tweens.add({
      targets: redFlash,
      alpha: 0.4,
      duration: 200,
      ease: "Quad.easeIn",
      onComplete: () => {
        // Flash white briefly
        this.tweens.add({
          targets: redFlash,
          alpha: 0.15,
          duration: 100,
          yoyo: true,
          onComplete: () => {
            // Settle to dark red
            this.tweens.add({
              targets: redFlash,
              alpha: 0.3,
              duration: 300
            });
          }
        });
      }
    });

    // Text pop in with overshoot
    this.time.delayedCall(200, () => {
      this.tweens.add({
        targets: deathText,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 400,
        ease: "Back.easeOut"
      });
    });

    // Subtitle fade in
    this.time.delayedCall(600, () => {
      this.tweens.add({
        targets: subText,
        alpha: 0.8,
        duration: 400
      });
    });

    // Play death sound
    this.audioManager.playSfxTone({ wave: "sawtooth", startFreq: 200, endFreq: 80, duration: 0.3, gain: 0.06 });
    this.time.delayedCall(150, () => {
      this.audioManager.playSfxTone({ wave: "sine", startFreq: 150, endFreq: 60, duration: 0.4, gain: 0.04 });
    });

    // Fade everything out and call callback
    this.time.delayedCall(2200, () => {
      this.tweens.add({
        targets: [redFlash, deathText, subText],
        alpha: 0,
        duration: 600,
        ease: "Quad.easeIn",
        onComplete: () => {
          redFlash.destroy();
          deathText.destroy();
          subText.destroy();
          if (onComplete) onComplete();
        }
      });
    });
  }

  handleGameOverInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.meta1)) {
      this.tryPurchaseMetaUpgrade("max_hp");
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.meta2)) {
      this.tryPurchaseMetaUpgrade("move_speed");
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.meta3)) {
      this.tryPurchaseMetaUpgrade("xp_gain");
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.meta4)) {
      this.tryPurchaseMetaUpgrade("starting_weapon");
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
      this.restartRun();
    }
  }

  restartRun() {
    this.audioManager.stopBgm();
    if (this.scene.isActive("RunSummaryScene")) {
      this.scene.stop("RunSummaryScene");
    }
    this.scene.restart();
  }

  tryPurchaseMetaUpgrade(upgradeKey) {
    const result = this.metaSystem.purchaseUpgrade(upgradeKey);
    if (!result.success) {
      return;
    }

    this.metaData = this.metaSystem.getData();
    this.saveCoinBank(this.metaData.currency);
    this.refreshGameOverText();
  }

  refreshGameOverText() {
    const options = this.metaSystem.getUpgradeOptions();
    const formatCost = (option) => (option.isMaxed ? "MAX" : `${option.cost}C`);

    this.gameOverText.setText(
      [
        "GAME OVER",
        `COINS +${this.lastRunMetaCurrency}   BANK ${this.metaData.currency}`,
        `[1] Max HP Lv${options.max_hp.level} (${formatCost(options.max_hp)})`,
        `[2] Move Speed Lv${options.move_speed.level} (${formatCost(options.move_speed)})`,
        `[3] XP Gain Lv${options.xp_gain.level} (${formatCost(options.xp_gain)})`,
        `[4] Start Lightning Lv${options.starting_weapon.level} (${formatCost(options.starting_weapon)})`,
        "Press R to restart"
      ].join("\n")
    );
  }

  getAliveEnemyCount() {
    return this.enemies.getChildren().filter((enemy) => enemy.active).length;
  }

  hasActiveMiniBoss() {
    return this.enemies
      .getChildren()
      .some((enemy) => enemy?.active && (enemy.getData("archetype") === "mini_boss" || enemy.getData("bossVariant") === "mini"));
  }

  loadCoinBank() {
    if (typeof window === "undefined" || !window.localStorage) {
      return 0;
    }

    const raw = window.localStorage.getItem(META_COINS_STORAGE_KEY);
    if (raw === null || raw === undefined) {
      return 0;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.floor(parsed);
  }

  updateBestTimeRecord(timeMs) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    const safeTime = Math.max(0, Math.floor(Number(timeMs) || 0));
    try {
      const prev = Number(window.localStorage.getItem(BEST_TIME_STORAGE_KEY));
      const prevBest = Number.isFinite(prev) && prev > 0 ? Math.floor(prev) : 0;
      if (safeTime > prevBest) {
        window.localStorage.setItem(BEST_TIME_STORAGE_KEY, String(safeTime));
      }
    } catch (_error) {
      // Ignore storage failures to keep runtime stable.
    }
  }

  saveCoinBank(amount) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    try {
      window.localStorage.setItem(META_COINS_STORAGE_KEY, String(safeAmount));
      const rawMeta = window.localStorage.getItem(META_STORAGE_KEY);
      const parsedMeta = rawMeta ? JSON.parse(rawMeta) : {};
      const mergedMeta = {
        currency: safeAmount,
        maxHPBonus: Math.max(0, Math.floor(Number(parsedMeta?.maxHPBonus) || 0)),
        xpBonus: Math.max(0, Math.floor(Number(parsedMeta?.xpBonus) || 0)),
        speedBonus: Math.max(0, Math.floor(Number(parsedMeta?.speedBonus) || 0)),
        startingWeaponBonus: Math.max(0, Math.floor(Number(parsedMeta?.startingWeaponBonus) || 0))
      };
      window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(mergedMeta));
    } catch (_error) {
      // Ignore storage failures to keep runtime stable.
    }
  }

  async submitRunStats() {
    const token = window.localStorage.getItem("forgeduel_token");
    if (!token) return;
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 3000);
      await fetch(`${window.location.origin}/api/player-data`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          bestTimeMs: this.runTimeMs,
          totalKills: this.totalKills,
          highestLevel: this.level,
          maxCombo: this.comboSystem.maxKillCombo,
          coins: this.metaData.currency
        }),
        signal: controller.signal
      });
    } catch (_) {}
  }

  syncCoinStorageWithMeta() {
    const storedCoins = this.loadCoinBank();
    const metaCoins = Math.max(0, Math.floor(this.metaData?.currency ?? 0));

    if (storedCoins > metaCoins) {
      this.metaSystem.addCurrency(storedCoins - metaCoins);
      this.metaData = this.metaSystem.getData();
      this.saveCoinBank(this.metaData.currency);
      return;
    }

    this.saveCoinBank(metaCoins);
  }

  trySpendMetaCoins(amount) {
    const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
    if (safeAmount <= 0) {
      return true;
    }
    const currentCoins = Math.max(0, Math.floor(this.metaData?.currency ?? 0));
    if (currentCoins < safeAmount) {
      return false;
    }

    const nextCoins = currentCoins - safeAmount;
    this.saveCoinBank(nextCoins);
    this.metaSystem = new MetaProgressionSystem();
    this.metaData = this.metaSystem.getData();
    return true;
  }

  calculateRunCoinReward() {
    const timeSurvivedSec = Math.max(0, Math.floor(this.runTimeMs / 1000));
    const timeReward = Math.floor(timeSurvivedSec / 10);
    const killReward = this.totalKills * 0.1;
    const bundleReward = Math.max(0, Math.floor(Number(this.runMetaCurrency) || 0));
    return Math.max(0, Math.round(timeReward + killReward + bundleReward));
  }

  recordPlayerDamage(amount) {
    const safeAmount = Math.max(0, Number(amount) || 0);
    if (safeAmount <= 0) {
      return;
    }
    const nowMs = this.time?.now ?? 0;
    this.performanceDamageEvents.push({ t: nowMs, amount: safeAmount });
    this.performanceDamageTotal += safeAmount;
    this.trimPerformanceMetrics(nowMs);
  }

  recordKillEvent() {
    const nowMs = this.time?.now ?? 0;
    this.performanceKillEvents.push(nowMs);
    this.performanceKillTotal += 1;
    this.trimPerformanceMetrics(nowMs);
  }

  trimPerformanceMetrics(nowMs) {
    const windowMs = this.director?.getAdaptiveWindowMs?.() ?? 10000;
    const threshold = nowMs - windowMs;

    while (this.performanceDamageEvents.length > 0 && this.performanceDamageEvents[0].t < threshold) {
      const expired = this.performanceDamageEvents.shift();
      this.performanceDamageTotal -= expired?.amount ?? 0;
    }
    while (this.performanceKillEvents.length > 0 && this.performanceKillEvents[0] < threshold) {
      this.performanceKillEvents.shift();
      this.performanceKillTotal -= 1;
    }

    this.performanceDamageTotal = Math.max(0, this.performanceDamageTotal);
    this.performanceKillTotal = Math.max(0, this.performanceKillTotal);
  }

  getPerformanceMetrics() {
    const nowMs = this.time?.now ?? 0;
    this.trimPerformanceMetrics(nowMs);
    const windowMs = this.director?.getAdaptiveWindowMs?.() ?? 10000;
    const windowSec = Math.max(1, windowMs / 1000);

    return {
      dps: this.performanceDamageTotal / windowSec,
      killRate: this.performanceKillTotal / windowSec
    };
  }

  loadWeaponUnlocks() {
    const defaults = {};
    START_WEAPON_OPTIONS.forEach((option) => {
      defaults[option.id] = Boolean(option.defaultUnlocked);
    });

    if (typeof window === "undefined" || !window.localStorage) {
      return defaults;
    }

    try {
      const raw = window.localStorage.getItem(WEAPON_UNLOCK_STORAGE_KEY);
      if (!raw) {
        this.saveWeaponUnlocks(defaults);
        return defaults;
      }

      const parsed = JSON.parse(raw);
      START_WEAPON_OPTIONS.forEach((option) => {
        const stored = parsed?.[option.id];
        if (typeof stored === "boolean") {
          defaults[option.id] = stored || option.defaultUnlocked;
        } else if (stored === 0 || stored === 1) {
          defaults[option.id] = Boolean(stored) || option.defaultUnlocked;
        }
      });
      return defaults;
    } catch (_error) {
      return defaults;
    }
  }

  saveWeaponUnlocks(unlocks) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    const sanitized = {};
    START_WEAPON_OPTIONS.forEach((option) => {
      const unlocked = Boolean(unlocks?.[option.id]) || option.defaultUnlocked;
      sanitized[option.id] = unlocked;
    });

    try {
      window.localStorage.setItem(WEAPON_UNLOCK_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (_error) {
      // Ignore storage failures to keep runtime stable.
    }
  }

  loadShopUpgradeLevels() {
    const fallback = {
      dash_cooldown: 0,
      xp_gain: 0,
      movement_speed: 0
    };
    if (typeof window === "undefined" || !window.localStorage) {
      return fallback;
    }

    try {
      const raw = window.localStorage.getItem(SHOP_UPGRADES_STORAGE_KEY);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw);
      return {
        dash_cooldown: Math.max(0, Math.floor(Number(parsed?.dash_cooldown) || 0)),
        xp_gain: Math.max(0, Math.floor(Number(parsed?.xp_gain) || 0)),
        movement_speed: Math.max(0, Math.floor(Number(parsed?.movement_speed) || 0))
      };
    } catch (_error) {
      return fallback;
    }
  }

  createGameplayHUD() { this.gameplayHUD.create(); }
  deactivateLegacyHudLayer() { this.gameplayHUD.deactivateLegacyHudLayer(); }
  layoutHUDToCamera() { this.gameplayHUD.layoutHUDToCamera(); }
  updateHUD() { this.gameplayHUD.update(); }
  updateHud() { this.gameplayHUD.update(); }
  syncLegacyHudFallback(l, x, e) { this.gameplayHUD.syncLegacyHudFallback(l, x, e); }
  updateBossHpBar() { this.gameplayHUD.updateBossHpBar(); }
  updateEnemyHealthBars() { this.gameplayHUD.updateEnemyHealthBars(); }

  createEdgeFogOverlay() {
    this.vignetteSystem.rebuildEdgeFogTexture();
    const width = Math.max(1, this.scale?.width ?? 1280);
    const height = Math.max(1, this.scale?.height ?? 720);
    if (this.edgeFogOverlay) {
      if (!this.edgeFogOverlay.active || !this.edgeFogOverlay.scene) {
        this.edgeFogOverlay = null;
      } else {
        if (this.textures && this.textures.exists(EDGE_FOG_TEXTURE_KEY)) {
          this.edgeFogOverlay.setTexture(EDGE_FOG_TEXTURE_KEY);
        }
        this.edgeFogOverlay.setPosition(width * 0.5, height * 0.5);
        return;
      }
    }

    if (!this.textures || !this.textures.exists(EDGE_FOG_TEXTURE_KEY)) {
      return;
    }

    this.edgeFogOverlay = this.add
      .image(width * 0.5, height * 0.5, EDGE_FOG_TEXTURE_KEY)
      .setScrollFactor(0)
      .setDepth(8.7)
      .setAlpha(EDGE_FOG_VIGNETTE_OPACITY);
  }

  rebuildEdgeFogTexture() { this.vignetteSystem.rebuildEdgeFogTexture(); }

  updateEdgeFogOverlay() { this.vignetteSystem.updateEdgeFogOverlay(); }

  updateLowHealthVignette() { this.vignetteSystem.updateLowHealthVignette(); }
}
