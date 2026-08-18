const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// ── Register ──────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Semua field harus diisi' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Format email tidak valid' });
    }

    const db = getDb();
    const normalizedEmail = email.toLowerCase();

    const existingRes = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [normalizedEmail],
    });

    if (existingRes.rows.length > 0) {
      return res.status(409).json({ error: 'Email sudah terdaftar' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const modules = [
      { id: 'alfabet', total: 26 },
      { id: 'angka', total: 21 },
      { id: 'kata-dasar', total: 30 },
      { id: 'salam', total: 15 },
      { id: 'frasa', total: 20 },
    ];

    const now = new Date().toISOString();
    const insertUserRes = await db.execute({
      sql: 'INSERT INTO users (full_name, email, password_hash, last_active) VALUES (?, ?, ?, ?)',
      args: [full_name, normalizedEmail, password_hash, now],
    });

    const userId = Number(insertUserRes.lastInsertRowid);

    const progressStatements = modules.map((mod) => ({
      sql: 'INSERT INTO user_progress (user_id, module_id, total_lessons) VALUES (?, ?, ?)',
      args: [userId, mod.id, mod.total],
    }));

    if (progressStatements.length > 0) {
      await db.batch(progressStatements, 'write');
    }

    const token = jwt.sign({ userId }, JWT_SECRET, {
      expiresIn: '7d',
    });

    const userRes = await db.execute({
      sql: 'SELECT id, full_name, email, avatar_url, level, total_xp, streak_days, created_at FROM users WHERE id = ?',
      args: [userId],
    });

    res.status(201).json({ token, user: userRes.rows[0] });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ── Login ─────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password harus diisi' });
    }

    const db = getDb();

    const userRes = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email.toLowerCase()],
    });

    const user = userRes.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    await db.execute({
      sql: 'UPDATE users SET last_active = ? WHERE id = ?',
      args: [new Date().toISOString(), user.id],
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: '7d',
    });

    const { password_hash, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ── Get Current User ──────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const db = getDb();

    const userRes = await db.execute({
      sql: 'SELECT id, full_name, email, avatar_url, level, total_xp, streak_days, last_active, created_at FROM users WHERE id = ?',
      args: [req.userId],
    });

    const user = userRes.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    const progressRes = await db.execute({
      sql: 'SELECT module_id, lessons_completed, total_lessons, xp_earned FROM user_progress WHERE user_id = ?',
      args: [req.userId],
    });

    const achievementsRes = await db.execute({
      sql: 'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?',
      args: [req.userId],
    });

    res.json({
      user,
      progress: progressRes.rows,
      achievements: achievementsRes.rows,
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

module.exports = router;
