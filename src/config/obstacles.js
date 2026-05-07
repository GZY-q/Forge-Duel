export const SHIP_DECK_OBSTACLE_LAYOUT = Object.freeze([
  Object.freeze({ type: "terrain_rock", role: "crate", x: 1490, y: 520, scale: 1.02 }),
  Object.freeze({ type: "terrain_pillar", role: "crate", x: 1570, y: 565, scale: 0.94 }),
  Object.freeze({ type: "terrain_rock", role: "crate", x: 1410, y: 590, scale: 0.9 }),
  Object.freeze({ type: "terrain_pillar", role: "crate", x: 1620, y: 900, scale: 1.0 }),
  Object.freeze({ type: "terrain_rock", role: "crate", x: 1700, y: 960, scale: 0.9 }),
  Object.freeze({ type: "terrain_rock", role: "crate", x: 1540, y: 980, scale: 0.88 }),
  Object.freeze({ type: "terrain_rock", role: "crate", x: 1320, y: 980, scale: 0.85 }),
  Object.freeze({ type: "terrain_pillar", role: "crate", x: 1390, y: 1040, scale: 0.82 }),
  Object.freeze({ type: "terrain_rock", role: "aerolite", x: 1080, y: 675, scale: 1.6 }),
  Object.freeze({ type: "terrain_rock", role: "hindrance", x: 300, y: 350, scale: 1.4 }),
  Object.freeze({ type: "terrain_rock", role: "hindrance2", x: 2100, y: 350, scale: 1.4 }),
  Object.freeze({ type: "terrain_rock", role: "hindrance", x: 300, y: 1000, scale: 1.4 }),
  Object.freeze({ type: "terrain_rock", role: "hindrance2", x: 2100, y: 1000, scale: 1.4 })
]);

export const RANDOM_DECK_OBSTACLE_SPAWN_TABLE = Object.freeze([
  Object.freeze({
    objectType: "crate",
    type: "terrain_rock",
    textureKey: "terrain_crate",
    weight: 40,
    scaleMin: 0.72,
    scaleMax: 0.96,
    anchorRadius: 32
  }),
  Object.freeze({
    objectType: "aerolite",
    type: "terrain_rock",
    textureKey: "sprite_hindrance_aerolite",
    weight: 24,
    scaleMin: 0.6,
    scaleMax: 0.8,
    anchorRadius: 26
  }),
  Object.freeze({
    objectType: "hindrance",
    type: "terrain_rock",
    textureKey: "sprite_hindrance_1",
    weight: 20,
    scaleMin: 0.6,
    scaleMax: 0.8,
    anchorRadius: 28
  }),
  Object.freeze({
    objectType: "hindrance2",
    type: "terrain_rock",
    textureKey: "sprite_hindrance_2",
    weight: 16,
    scaleMin: 0.6,
    scaleMax: 0.8,
    anchorRadius: 28
  })
]);

export const RANDOM_DECK_OBSTACLE_DENSITY_MIN_TILES = 12;
export const RANDOM_DECK_OBSTACLE_DENSITY_MAX_TILES = 18;
export const RANDOM_DECK_OBSTACLE_TILE_GROUP_SIZE = 96;
export const RANDOM_DECK_OBSTACLE_EDGE_SPAWN_BUFFER = 192;
export const RANDOM_DECK_OBSTACLE_EVENT_CLEAR_RADIUS = 128;
export const RANDOM_DECK_OBSTACLE_MAX_ATTEMPTS_MULTIPLIER = 28;
export const RANDOM_DECK_OBSTACLE_MIN_PADDING = 16;
