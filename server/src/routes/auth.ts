import express, { type Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { rateLimiter } from '../rateLimiter.js';

const router: Router = express.Router();

const authLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per window
  message: "Too many login/register attempts, please try again later"
});

router.post("/register", authLimiter, async (req, res) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "Server configuration error" });
  }
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = db.prepare(
      "INSERT INTO users (username, password) VALUES (?, ?)"
    ).run(username, hashedPassword);

    const token = jwt.sign(
      { id: result.lastInsertRowid, username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: { id: result.lastInsertRowid, username }
    });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: "Username or email already exists" });
    }
    res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "Server configuration error" });
  }
  const { identity, password } = req.body;
  if (!identity || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  try {
    const user: any = db.prepare(
      "SELECT * FROM users WHERE username = ?"
    ).get(identity);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

export default router;
