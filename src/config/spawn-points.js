import { SPAWN_LANES } from "./progression.js";

export const BOSS_ENTRY_LANES = Object.freeze([SPAWN_LANES.BOW, SPAWN_LANES.STERN]);

export const HATCH_BREACH_POINT = Object.freeze({ x: 1200, y: 1090 });

export const LADDER_SPAWN_POINTS = Object.freeze({
  [SPAWN_LANES.PORT]: Object.freeze([
    Object.freeze({ x: 76, y: 430 }),
    Object.freeze({ x: 76, y: 910 })
  ]),
  [SPAWN_LANES.STARBOARD]: Object.freeze([
    Object.freeze({ x: 2324, y: 430 }),
    Object.freeze({ x: 2324, y: 910 })
  ])
});
