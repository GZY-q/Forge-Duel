import mongoose from "mongoose";

const playerDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
    required: true
  },
  coins: { type: Number, default: 0, min: 0 },
  bestTimeMs: { type: Number, default: 0, min: 0 },
  totalKills: { type: Number, default: 0, min: 0 },
  highestLevel: { type: Number, default: 1, min: 1 },
  shopUpgrades: {
    dash_cooldown: { type: Number, default: 0, min: 0, max: 10 },
    xp_gain: { type: Number, default: 0, min: 0, max: 10 },
    movement_speed: { type: Number, default: 0, min: 0, max: 10 }
  },
  metaUpgrades: {
    maxHPBonus: { type: Number, default: 0, min: 0 },
    xpBonus: { type: Number, default: 0, min: 0 },
    speedBonus: { type: Number, default: 0, min: 0 },
    startingWeaponBonus: { type: Number, default: 0, min: 0 }
  },
  selectedFighter: { type: String, default: "scout" },
  weaponUnlocks: { type: Map, of: Boolean, default: {} },
  coopGamesPlayed: { type: Number, default: 0, min: 0 },
  coopBestTimeMs: { type: Number, default: 0, min: 0 },
  updatedAt: { type: Date, default: Date.now }
});

playerDataSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const PlayerData = mongoose.model("PlayerData", playerDataSchema);
