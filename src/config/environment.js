export const DECK_TILE_SIZE = 32;
export const DECK_SURFACE_INSET = 34;
export const DECK_RAIL_INSET = 12;
export const DECK_RAIL_POST_GAP = 120;
export const DECK_RAIL_POST_WIDTH = 8;
export const DECK_RAIL_POST_LENGTH = 24;
export const DECK_BRIGHTNESS_MULTIPLIER = 0.9;
export const DECK_HIGHLIGHT_OPACITY = 0.6;
export const DECK_PASSAGE_SAMPLE_DISTANCES = Object.freeze([220, 340, 460]);
export const DECK_PASSAGE_MIN_OPEN_DIRECTIONS = 2;
export const DECK_PASSAGE_REPAIR_MAX_STEPS = 18;
export const DECK_PASSAGE_REPAIR_NUDGE = 40;

export const SEA_WAVE_MIN = 6;
export const SEA_WAVE_MAX = 10;

export const DECK_TILE_VARIANTS = Object.freeze([
  Object.freeze({
    key: "deck_a",
    path: "assets/sprites/environment/space_tile_a.png",
    weight: 50,
    tintEven: 0xe8d8c6,
    tintOdd: 0xd8c0a7,
    tileOffsetStep: 19,
    fallbackEven: 0x6c4830,
    fallbackOdd: 0x755138
  }),
  Object.freeze({
    key: "deck_b",
    path: "assets/sprites/environment/space_tile_b.png",
    weight: 20,
    tintEven: 0xe2ceb6,
    tintOdd: 0xd4b394,
    tileOffsetStep: 23,
    fallbackEven: 0x67432d,
    fallbackOdd: 0x714d36
  }),
  Object.freeze({
    key: "deck_c",
    path: "assets/sprites/environment/space_tile_c.png",
    weight: 20,
    tintEven: 0xd8c4ac,
    tintOdd: 0xc8ac8c,
    tileOffsetStep: 17,
    fallbackEven: 0x623f2a,
    fallbackOdd: 0x6a4731
  }),
  Object.freeze({
    key: "deck_d",
    path: "assets/sprites/environment/space_tile_d.png",
    weight: 10,
    tintEven: 0xcfb798,
    tintOdd: 0xc29f7e,
    tileOffsetStep: 29,
    fallbackEven: 0x5e3c28,
    fallbackOdd: 0x66442f
  })
]);

export const ENEMY_JAM_STUCK_WINDOW_MS = 900;
export const ENEMY_JAM_MIN_PROGRESS_PX = 4;
export const ENEMY_JAM_PUSH_FORCE = 150;

export const EDGE_FOG_TEXTURE_KEY = "edge_fog_vignette";
export const EDGE_FOG_INNER_RADIUS_TILES = 12;
export const EDGE_FOG_OUTER_RADIUS_TILES = 14;
export const EDGE_FOG_VIGNETTE_OPACITY = 0.35;
