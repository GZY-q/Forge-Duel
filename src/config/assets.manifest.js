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
  deckPlankMain: Object.freeze({
    key: "sprite_deck_plank_main",
    path: "assets/sprites/environment/ship/deck_plank_main.png"
  }),
  deckPlankTrim: Object.freeze({
    key: "sprite_deck_plank_trim",
    path: "assets/sprites/environment/ship/deck_plank_trim.png"
  }),
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
  xpOrb:   Object.freeze({ key: "xp_orb",      path: "assets/sprites/weapons/item_xp_common.png" }),
  health:  Object.freeze({ key: "item_health",  path: "assets/sprites/weapons/Health Pickup.png" }),
  shield:  Object.freeze({ key: "item_shield",  path: "assets/sprites/weapons/Shield Charge.png" })
});

export const WEAPON_VISUAL_SPRITES = Object.freeze({
  lightning: Object.freeze({ key: "weapon_lightning_sprite", path: "assets/sprites/weapons/weapon_lightning.png" }),
  missile:   Object.freeze({ key: "weapon_missile_sprite",   path: "assets/sprites/weapons/weapon_missile.png" }),
  blackhole: Object.freeze({ key: "weapon_blackhole_sprite", path: "assets/sprites/weapons/weapon_blackhole.png" })
});

export const DASH_SPRITE = Object.freeze({ key: "dash_effect", path: "assets/sprites/player/dash/dash.png" });

export const WEAPON_ICON_ASSETS = Object.freeze({
  dagger: Object.freeze({
    key: "weapon_icon_dagger",
    path: "assets/sprites/weapons/weapon_dagger_icon.png"
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
    key: "weapon_icon_dagger",
    path: "assets/sprites/weapons/weapon_dagger_icon.png"
  }),
  homing_missile: Object.freeze({
    key: "weapon_icon_fireball",
    path: "assets/sprites/weapons/weapon_fireball_icon.png"
  }),
  laser: Object.freeze({
    key: "weapon_icon_lightning",
    path: "assets/sprites/weapons/weapon_lightning_icon.png"
  })
});

export const BUTTON_ASSET_PATHS = Object.freeze({
  btn_blue: "assets/sprites/button/btn_blue.png",
  btn_green: "assets/sprites/button/btn_green.png",
  btn_red: "assets/sprites/button/btn_red.png",
  btn_purple: "assets/sprites/button/btn_purple.png",
  btn_start: "assets/sprites/button/btn_start.png"
});
