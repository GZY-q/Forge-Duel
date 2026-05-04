/**
 * Mulberry32 seeded PRNG — deterministic random number generator.
 * Given the same seed, produces the identical sequence of values.
 * Used in coop mode so all clients share the same DirectorSystem randomness.
 */
export class SeededRNG {
  constructor(seed) {
    this._state = (seed | 0) || 1;
  }

  /** Returns a float in [0, 1). */
  next() {
    let t = (this._state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive. */
  intBetween(min, max) {
    const safeMin = Math.ceil(min);
    const safeMax = Math.floor(max);
    return Math.floor(this.next() * (safeMax - safeMin + 1)) + safeMin;
  }

  /** Returns a random element from an array. */
  pick(items) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return items[Math.floor(this.next() * items.length)] ?? null;
  }
}
