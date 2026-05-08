export const SFX_AUDIO_FILES = Object.freeze({
  dash: "assets/audio/sfx/dash.wav",
  enemy_hit: "assets/audio/sfx/enemy_hit.wav",
  enemy_death: "assets/audio/sfx/enemy_die.wav",
  level_up: "assets/audio/sfx/level_up.wav",
  boss_warning: "assets/audio/sfx/boss_warning.wav",
  collected: "assets/audio/sfx/collected.wav",
  weapon_fireball: "assets/audio/sfx/weapon_fireball.wav",
  weapon_dagger: "assets/audio/sfx/weapon_dagger.wav",
  weapon_meteor: "assets/audio/sfx/weapon_meteor.wav",
  weapon_orbit_blades: "assets/audio/sfx/weapon_orbit_blades.wav",
  weapon_homing_missile: "assets/audio/sfx/weapon_homing_missile.wav",
  weapon_gatling: "assets/audio/sfx/weapon_gatling.wav",
  weapon_mega_missile: "assets/audio/sfx/weapon_mega_missile.wav",
  weapon_prismatic_laser: "assets/audio/sfx/weapon_prismatic_laser.wav",
  weapon_death_spiral: "assets/audio/sfx/weapon_death_spiral.wav",
  bgm_game: "assets/audio/bgm/BGM.mp3",
  bgm_gameover: "assets/audio/bgm/gameover.ogg"
});

export const SFX_KEY_BY_TYPE = Object.freeze({
  dash: "dash",
  enemy_hit: "enemy_hit",
  enemy_death: "enemy_death",
  level_up: "level_up",
  boss_warning: "boss_warning",
  collected: "collected",
  weapon_fire: null,
  weapon_fireball: "weapon_fireball",
  weapon_dagger: "weapon_dagger",
  weapon_meteor: "weapon_meteor",
  weapon_orbit_blades: "weapon_orbit_blades",
  weapon_homing_missile: "weapon_homing_missile",
  weapon_gatling: "weapon_gatling",
  weapon_mega_missile: "weapon_mega_missile",
  weapon_prismatic_laser: "weapon_prismatic_laser",
  weapon_death_spiral: "weapon_death_spiral"
});

export const SFX_VOLUME = Object.freeze({
  dash: 0.12,
  enemy_hit: 0.1,
  enemy_death: 0.12,
  level_up: 0.13,
  boss_warning: 0.13,
  collected: 0.08,
  weapon_fire: 0.08,
  weapon_fireball: 0.09,
  weapon_dagger: 0.07,
  weapon_meteor: 0.12,
  weapon_orbit_blades: 0.08,
  weapon_homing_missile: 0.1,
  weapon_gatling: 0.08,
  weapon_mega_missile: 0.12,
  weapon_prismatic_laser: 0.11,
  weapon_death_spiral: 0.1
});

export const SFX_THROTTLE_MS = Object.freeze({
  enemy_hit: 42,
  enemy_death: 55,
  dash: 90,
  level_up: 220,
  boss_warning: 300,
  collected: 15,
  weapon_fire: 48,
  weapon_fireball: 100,
  weapon_dagger: 30,
  weapon_meteor: 200,
  weapon_orbit_blades: 50,
  weapon_homing_missile: 150,
  weapon_gatling: 40,
  weapon_mega_missile: 180,
  weapon_prismatic_laser: 100,
  weapon_death_spiral: 150
});
