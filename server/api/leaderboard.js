import { Router } from "express";
import { PlayerData } from "../db/models/PlayerData.js";

export const leaderboardRoutes = Router();

const SORT_FIELDS = {
  bestTime: "bestTimeMs",
  totalKills: "totalKills",
  highestLevel: "highestLevel",
  coopBestTime: "coopBestTimeMs"
};

leaderboardRoutes.get("/", async (req, res) => {
  try {
    const sortKey = SORT_FIELDS[req.query.sort] || "bestTimeMs";
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

    const results = await PlayerData.aggregate([
      { $sort: { [sortKey]: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          username: "$user.username",
          value: `$${sortKey}`,
          bestTimeMs: 1,
          totalKills: 1,
          highestLevel: 1
        }
      }
    ]);

    const entries = results.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      value: r.value
    }));

    res.json({ entries, sort: req.query.sort || "bestTime", limit });
  } catch (err) {
    console.error("[Leaderboard] GET error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
