import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../db/models/User.js";
import { PlayerData } from "../db/models/PlayerData.js";
import { SESSION_SECRET, JWT_EXPIRES_IN } from "../config.js";
import { authMiddleware } from "./middleware.js";

function setAuthCookie(res, token) {
  res.cookie("forgeduel_token", token, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/"
  });
}

export const authRoutes = Router();

authRoutes.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: "Username must be 3-20 characters" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, passwordHash });

    await PlayerData.create({ userId: user._id });

    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username },
      SESSION_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    setAuthCookie(res, token);
    res.status(201).json({
      token,
      user: { id: user._id, username: user.username }
    });
  } catch (err) {
    console.error("[Auth] Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

authRoutes.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password || typeof password !== 'string' || password.trim() === '') {
      return res.status(400).json({ error: "用户名和密码不能为空" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username },
      SESSION_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    setAuthCookie(res, token);
    res.json({
      token,
      user: { id: user._id, username: user.username }
    });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    res.status(500).json({ error: "服务器错误" });
  }
});

authRoutes.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("username createdAt");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user: { id: user._id, username: user.username, createdAt: user.createdAt } });
  } catch (err) {
    console.error("[Auth] Me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

authRoutes.post("/logout", (req, res) => {
  res.clearCookie("forgeduel_token", { path: "/" });
  res.json({ ok: true });
});
