const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { validateEmail } = require('./validator');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || null; // optional — set in env to enforce auth

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 600 * 1000,
  max: parseInt(process.env.RATE_LIMIT || '600'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});
app.use(limiter);

// ── Auth middleware (skipped if API_KEY env var not set) ────────────────────
function auth(req, res, next) {
  if (!API_KEY) return next();
  const provided =
    req.headers['x-api-key'] || req.query.api_key;
  if (provided !== API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key.' });
  }
  next();
}

// ── Routes ──────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Single email validation  GET /validate?email=...
app.get('/validate', auth, async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Missing `email` query parameter.' });
  }
  try {
    const result = await validateEmail(email.trim());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.', detail: err.message });
  }
});

// Single email validation  POST /validate  { "email": "..." }
app.post('/validate', auth, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Missing `email` in request body.' });
  }
  try {
    const result = await validateEmail(String(email).trim());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.', detail: err.message });
  }
});

// Bulk validation  POST /validate/bulk  { "emails": ["a@b.com", ...] }
app.post('/validate/bulk', auth, async (req, res) => {
  const { emails } = req.body;
  const MAX_BULK = parseInt(process.env.MAX_BULK || '50');
  if (!Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: '`emails` must be a non-empty array.' });
  }
  if (emails.length > MAX_BULK) {
    return res.status(400).json({ error: `Maximum ${MAX_BULK} emails per bulk request.` });
  }
  try {
    const results = await Promise.all(
      emails.map((e) => validateEmail(String(e).trim()))
    );
    res.json({ count: results.length, results });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.', detail: err.message });
  }
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found.',
    endpoints: [
      'GET  /health',
      'GET  /validate?email=<email>',
      'POST /validate         { "email": "..." }',
      'POST /validate/bulk    { "emails": ["..."] }',
    ],
  });
});

app.listen(PORT, () => {
  console.log(`✉️  Email Validation API running on port ${PORT}`);
  if (!API_KEY) console.warn('⚠️  No API_KEY set — running without authentication.');
});
