const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS Configuration ────────────────────
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl) or matched origins / Vercel preview URLs
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

// ── Rate Limiting ────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan. Coba lagi dalam beberapa menit.' },
});

// ── Routes ───────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BISINDO API is running' });
});

// ── Start Server ─────────────────────────
async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log('');
      console.log('  ╔══════════════════════════════════════╗');
      console.log('  ║        BISINDO.app API Server        ║');
      console.log('  ╠══════════════════════════════════════╣');
      console.log(`  ║  🚀 Running on http://localhost:${PORT}  ║`);
      console.log('  ╚══════════════════════════════════════╝');
      console.log('');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
