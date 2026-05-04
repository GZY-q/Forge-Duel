import { Router } from "express";
import { PlayerData } from "../db/models/PlayerData.js";

export const leaderboardRoutes = Router();

const SORT_FIELDS = {
  bestTime: "bestTimeMs",
  totalKills: "totalKills",
  highestLevel: "highestLevel",
  coopBestTime: "coopBestTimeMs"
};

const SORT_DIRECTIONS = {
  bestTimeMs: -1,
  totalKills: -1,
  highestLevel: -1,
  coopBestTimeMs: -1
};

leaderboardRoutes.get("/", async (req, res) => {
  try {
    const sortKey = SORT_FIELDS[req.query.sort] || "bestTimeMs";
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const sortDir = SORT_DIRECTIONS[sortKey] || -1;

    const results = await PlayerData.aggregate([
      { $match: { [sortKey]: { $gt: 0 } } },
      { $sort: { [sortKey]: sortDir } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          username: { $ifNull: ["$user.username", "Unknown"] },
          value: `$${sortKey}`,
          bestTimeMs: 1,
          totalKills: 1,
          highestLevel: 1
        }
      }
    ]);

    const entries = results.map((r, i) => ({
      rank: i + 1,
      username: r.username || "Unknown",
      value: r.value
    }));

    res.json({ entries, sort: req.query.sort || "bestTime", limit });
  } catch (err) {
    console.error("[Leaderboard] GET error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});