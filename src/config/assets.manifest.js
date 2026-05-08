export const UPGRADE_PANEL_ICONS = Object.freeze({
  power: Object.freeze({ key: "upgrade_panel_power", path: "assets/sprites/ui/upgrade_panel_icons/power.png" }),
  max_hp: Object.freeze({ key: "upgrade_panel_max_hp", path: "assets/sprites/ui/upgrade_panel_icons/max_hp.png" }),
  armor: Object.freeze({ key: "upgrade_panel_armor", path: "assets/sprites/ui/upgrade_panel_icons/armor.png" }),
  amount: Object.freeze({ key: "upgrade_panel_amount", path: "assets/sprites/ui/upgrade_panel_icons/amount.png" }),
  cooldown: Object.freeze({ key: "upgrade_panel_cooldown", path: "assets/sprites/ui/upgrade_panel_icons/cooldown.png" }),
  area: Object.freeze({ key: "upgrade_panel_area", path: "assets/sprites/ui/upgrade_panel_icons/area.png" }),
  speed: Object.freeze({ key: "upgrade_panel_speed", path: "assets/sprites/ui/upgrade_panel_icons/speed.png" }),
  duration: Object.freeze({ key: "upgrade_panel_duration", path: "assets/sprites/ui/upgrade_panel_icons/duration.png" }),
  move_speed: Object.freeze({ key: "upgrade_panel_move_speed", path: "assets/sprites/ui/upgrade_panel_icons/move_speed.png" }),
  magnet: Object.freeze({ key: "upgrade_panel_magnet", path: "assets/sprites/ui/upgrade_panel_icons/magnet.png" }),
  luck: Object.freeze({ key: "upgrade_panel_luck", path: "assets/sprites/ui/upgrade_panel_icons/luck.png" }),
  growth: Object.freeze({ key: "upgrade_panel_growth", path: "assets/sprites/ui/upgrade_panel_icons/growth.png" })
});

export const CHARACTER_DIRECTIONS = Object.freeze([
  "south",
  "south-east",
  "east",
  "north-east",
  "north",
  "north-west",
  "west",
  "south-west"
]);

export const CHARACTER_ASSET_MANIFEST = Object.freeze([
  Object.freeze({
    keyPrefix: "char_enemy_chaser",
    basePath: "assets/sprites/enemies/chaser"
  }),
  Object.freeze({
    keyPrefix: "char_enemy_swarm",
    basePath: "assets/sprites/enemies/swarm"
  }),
  Object.freeze({
    keyPrefix: "char_enemy_tank",
    basePath: "assets/sprites/enemies/tank"
  }),
  Object.freeze({
    keyPrefix: "char_enemy_hunter",
    basePath: "assets/sprites/enemies/hunter"
  }),
  Object.freeze({
    keyPrefix: "char_enemy_miniboss_davy",
    basePath: "assets/sprites/enemies/miniboss_davy"
  })
]);

export const LOGO_TEXTURE_KEY = "main_menu_logo";
export const LOGO_ASSET_PATH = "assets/sprites/ui/Logo.png";

export const BG_ASSET_PATH = "assets/sprites/ui/bg.png";
export const MENU_BG_ASSET_PATH = "assets/sprites/ui/Home Page Background.png";
export const BG_TEXTURE_KEY = "game_bg";
export const MENU_BG_TEXTURE_KEY = "main_menu_bg";

export const IMPORTED_PIXEL_ASSETS = Object.freeze({
  player: Object.freeze({
    key: "sprite_player_crew",
    path: "assets/sprites/player/player_crew.png"
  }),
  cannon: Object.freeze({
    key: "sprite_terrain_cannon",
    path: "assets/sprites/environment/ship/terrain_cannon.png"
  }),
  hindranceAerolite: Object.freeze({
    key: "sprite_hindrance_aerolite",
    path: "assets/sprites/environment/hindrance/aerolite.png"
  }),
  hindrance1: Object.freeze({
    key: "sprite_hindrance_1",
    path: "assets/sprites/environment/hindrance/hindrance.png"
  }),
  hindrance2: Object.freeze({
    key: "sprite_hindrance_2",
    path: "assets/sprites/environment/hindrance/hindrance2.png"
  }),
  enemyChaserBody: Object.freeze({
    key: "sprite_enemy_chaser_body",
    path: "assets/sprites/enemies/chaser/parts/enemy_chaser_body.png"
  }),
  enemyChaserEye: Object.freeze({
    key: "sprite_enemy_chaser_eye",
    path: "assets/sprites/enemies/chaser/parts/enemy_chaser_eye.png"
  }),
  enemyChaserMouth: Object.freeze({
    key: "sprite_enemy_chaser_mouth",
    path: "assets/sprites/enemies/chaser/parts/enemy_chaser_mouth.png"
  })
});

export const ENEMY_SPRITES = Object.freeze({
  chaser:  Object.freeze({ key: "enemy_chaser",  path: "assets/sprites/enemies/enemy_5.png" }),
  tank:    Object.freeze({ key: "enemy_tank",    path: "assets/sprites/enemies/enemy_5.png" }),
  swarm:   Object.freeze({ key: "enemy_swarm",   path: "assets/sprites/enemies/enemy_sea urchin.png" }),
  hunter:  Object.freeze({ key: "enemy_hunter",  path: "assets/sprites/enemies/enemy_demon2.png" }),
  ghost:   Object.freeze({ key: "enemy_ghost",   path: "assets/sprites/enemies/enemy_ghost.png" }),
  mech:    Object.freeze({ key: "enemy_mech",    path: "assets/sprites/enemies/enemy_mech.png" }),
  eliteChaser: Object.freeze({ key: "enemy_elite_chaser", path: "assets/sprites/enemies/enemy_elite_demon.png" }),
  eliteHunter: Object.freeze({ key: "enemy_elite_hunter", path: "assets/sprites/enemies/enemy_elite_Spider.png" }),
  bossPirate:  Object.freeze({ key: "enemy_boss",         path: "assets/sprites/enemies/enemy_boss_pirate_captain.png" }),
  bossMother:  Object.freeze({ key: "enemy_boss_mother",  path: "assets/sprites/enemies/enemy_boss_mother_ship.png" }),
  thousandEyed: Object.freeze({ key: "enemy_thousandeyed", path: "assets/sprites/enemies/enemy_thousand-eyed.png" })
});

export const BULLET_SPRITES = Object.freeze({
  proj_dagger:   Object.freeze({ key: "proj_dagger",   path: "assets/sprites/bullets/bullets-white.png" }),
  proj_fireball: Object.freeze({ key: "proj_fireball", path: "assets/sprites/bullets/bullets-red.png" }),
  proj_scatter:  Object.freeze({ key: "proj_scatter",  path: "assets/sprites/bullets/bullet-green.png" }),
  proj_homing:   Object.freeze({ key: "proj_homing",   path: "assets/sprites/bullets/thermos flask.png" }),
  proj_meteor:   Object.freeze({ key: "proj_meteor",   path: "assets/sprites/bullets/bullets-red.png" }),
  boss_bullet:   Object.freeze({ key: "boss_bullet",   path: "assets/sprites/bullets/bullets-red.png" })
});

export const ITEM_SPRITES = Object.freeze({
  xpOrb:         Object.freeze({ key: "xp_orb",            path: "assets/sprites/drops/xp_orb.png" }),
  xpOrbBlue:     Object.freeze({ key: "xp_orb_blue",       path: "assets/sprites/drops/xp_orb_blue.png" }),
  xpOrbPurple:   Object.freeze({ key: "xp_orb_purple",     path: "assets/sprites/drops/xp_orb_purple.png" }),
  xpOrbGold:     Object.freeze({ key: "xp_orb_gold",       path: "assets/sprites/drops/xp_orb_gold.png" }),
  health:        Object.freeze({ key: "item_health",       path: "assets/sprites/drops/Health Pickup.png" }),
  shield:        Object.freeze({ key: "item_shield",        path: "assets/sprites/drops/Shield Charge.png" }),
  upgradeOrb:    Object.freeze({ key: "upgrade_orb",        path: "assets/sprites/drops/upgrade_orb.png" }),
  speedBoost:    Object.freeze({ key: "item_speed_boost",  path: "assets/sprites/drops/item_speed_boost.png" }),
  magnet:        Object.freeze({ key: "item_magnet",        path: "assets/sprites/drops/item_magnet.png" }),
  weaponUpgrade: Object.freeze({ key: "item_weapon_upgrade", path: "assets/sprites/drops/item_weapon_upgrade.png" }),
  bomb:          Object.freeze({ key: "item_bomb",         path: "assets/sprites/drops/item_bomb.png" }),
  redPotion:     Object.freeze({ key: "item_red_potion",   path: "assets/sprites/drops/item_red_potion.png" }),
  chest:         Object.freeze({ key: "treasure_chest",    path: "assets/sprites/treasure_chest.png" }),
  goldSpark:     Object.freeze({ key: "gold_spark",       path: "assets/sprites/gold_spark.png" }),
  bombExplosion: Object.freeze({ key: "bomb_explosion",   path: "assets/sprites/bomb_explosion.png" })
});

export const TERRAIN_SPRITES = Object.freeze({
  crate:        Object.freeze({ key: "terrain_crate",         path: "assets/sprites/environment/terrain_crate.png" }),
  rock:         Object.freeze({ key: "terrain_rock",          path: "assets/sprites/environment/terrain_rock.png" }),
  pillar:       Object.freeze({ key: "terrain_pillar",        path: "assets/sprites/environment/terrain_pillar.png" }),
  aerolite:     Object.freeze({ key: "sprite_hindrance_aerolite", path: "assets/sprites/environment/hindrance/aerolite.png" }),
  hindrance1:   Object.freeze({ key: "sprite_hindrance_1",    path: "assets/sprites/environment/hindrance/hindrance.png" }),
  hindrance2:   Object.freeze({ key: "sprite_hindrance_2",    path: "assets/sprites/environment/hindrance/hindrance2.png" })
});

export const WEAPON_VISUAL_SPRITES = Object.freeze({
  lightning: Object.freeze({ key: "weapon_lightning_sprite", path: "assets/sprites/weapons/weapon_lightning_icon.png" }),
  missile:   Object.freeze({ key: "weapon_missile_sprite",   path: "assets/sprites/weapons/weapon_missile.png" }),
  blackhole: Object.freeze({ key: "weapon_blackhole_sprite", path: "assets/sprites/weapons/weapon_blackhole.png" })
});

export const DASH_SPRITE = Object.freeze({ key: "dash_effect", path: "assets/sprites/player/dash/dash.png" });

export const WEAPON_ICON_ASSETS = Object.freeze({
  dagger: Object.freeze({
    key: "weapon_icon_dagger",
    path: "assets/sprites/weapons/weapon_railgun.png"
  }),
  fireball: Object.freeze({
    key: "weapon_icon_fireball",
    path: "assets/sprites/weapons/weapon_fireball_icon.png"
  }),
  lightning: Object.freeze({
    key: "weapon_icon_lightning",
    path: "assets/sprites/weapons/weapon_lightning_icon.png"
  }),
  meteor: Object.freeze({
    key: "weapon_icon_meteor",
    path: "assets/sprites/weapons/weapon_meteor_icon.png"
  }),
  orbit_blades: Object.freeze({
    key: "weapon_icon_orbit_blades",
    path: "assets/sprites/weapons/weapon_orbit_blades_icon.png"
  }),
  scatter_shot: Object.freeze({
    key: "weapon_icon_scatter_shot",
    path: "assets/sprites/weapons/weapon_spread_shot.png"
  }),
  homing_missile: Object.freeze({
    key: "weapon_icon_missile_homing",
    path: "assets/sprites/weapons/weapon_missile.png"
  }),
  laser: Object.freeze({
    key: "weapon_icon_laser",
    path: "assets/sprites/weapons/weapon_laser.png"
  })
});

export const BUTTON_ASSET_PATHS = Object.freeze({
  btn_blue: "assets/sprites/button/btn_blue.png",
  btn_blue_option: "assets/sprites/button/btn_blue_option.png",
  btn_green: "assets/sprites/button/btn_green.png",
  btn_red: "assets/sprites/button/btn_red.png",
  btn_purple: "assets/sprites/button/btn_purple.png",
  btn_start: "assets/sprites/button/btn_start.png"
});
