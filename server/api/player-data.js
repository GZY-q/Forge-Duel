import { Router } from "express";
import { PlayerData } from "../db/models/PlayerData.js";
import { authMiddleware } from "../auth/middleware.js";

export const playerDataRoutes = Router();

playerDataRoutes.use(authMiddleware);

playerDataRoutes.get("/", async (req, res) => {
  try {
    let data = await PlayerData.findOne({ userId: req.userId });
    if (!data) {
      data = await PlayerData.create({ userId: req.userId });
    }
    res.json({ data });
  } catch (err) {
    console.error("[PlayerData] GET error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

playerDataRoutes.put("/", async (req, res) => {
  try {
    const allowed = [
      "coins", "bestTimeMs", "totalKills", "highestLevel",
      "shopUpgrades", "metaUpgrades", "selectedFighter",
      "weaponUnlocks", "coopGamesPlayed", "coopBestTimeMs"
    ];

    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        update[key] = req.body[key];
      }
    }

    if (update.coins !== undefined && (typeof update.coins !== "number" || update.coins < 0)) {
      return res.status(400).json({ error: "Invalid coins value" });
    }
    if (update.bestTimeMs !== undefined && (typeof update.bestTimeMs !== "number" || update.bestTimeMs < 0)) {
      return res.status(400).json({ error: "Invalid bestTimeMs value" });
    }

    const data = await PlayerData.findOneAndUpdate(
      { userId: req.userId },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json({ data });
  } catch (err) {
    console.error("[PlayerData] PUT error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

playerDataRoutes.post("/migrate", async (req, res) => {
  try {
    const { localData } = req.body;
    if (!localData || typeof localData !== "object") {
      return res.status(400).json({ error: "Invalid migration data" });
    }

    const existing = await PlayerData.findOne({ userId: req.userId });
    if (existing && existing.coins > 0) {
      return res.json({ data: existing, migrated: false, message: "Server data already exists" });
    }

    const update = {};
    if (Number.isFinite(localData.coins) && localData.coins >= 0) update.coins = Math.floor(localData.coins);
    if (Number.isFinite(localData.bestTimeMs) && localData.bestTimeMs >= 0) update.bestTimeMs = Math.floor(localData.bestTimeMs);
    if (Number.isFinite(localData.totalKills) && localData.totalKills >= 0) update.totalKills = Math.floor(localData.totalKills);
    if (Number.isFinite(localData.highestLevel) && localData.highestLevel >= 1) update.highestLevel = Math.floor(localData.highestLevel);

    const data = await PlayerData.findOneAndUpdate(
      { userId: req.userId },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json({ data, migrated: true });
  } catch (err) {
    console.error("[PlayerData] Migrate error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
