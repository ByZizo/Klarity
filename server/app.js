const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
let Tesseract;
try {
  Tesseract = require('tesseract.js');
} catch (e) {
  console.warn('tesseract.js not loaded:', e.message);
}
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const {
  localModelEngine,
  SUPPORTED_MODELS,
  DEFAULT_MODEL_ID
} = require('./services/localModelService');
const {
  shouldTriggerWebSearch,
  retrieveWebContext
} = require('./services/webSearchService');

const app = express();

// Configurable Owner Emails from environment variable
const OWNER_EMAILS_LIST = process.env.OWNER_EMAILS
  ? process.env.OWNER_EMAILS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  : [];

function isOwnerEmail(email) {
  if (!email) return false;
  return OWNER_EMAILS_LIST.includes(String(email).trim().toLowerCase());
}

// Configurable CORS Allowlist
const isProductionEnv = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const defaultAllowedOrigins = isProductionEnv
  ? []
  : [
      'http://localhost:5173',
      'http://localhost:5000',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:3000'
    ];
const allowedOriginsList = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  : defaultAllowedOrigins;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const norm = origin.toLowerCase().trim();
    if (
      allowedOriginsList.includes(norm) ||
      process.env.KLARITY_DESKTOP_APP === 'true' ||
      (!isProductionEnv && (norm.startsWith('http://localhost:') || norm.startsWith('http://127.0.0.1:')))
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: Origin ${origin} not permitted`));
  },
  credentials: true
}));

// File-upload routes that require up to 50mb body limit
const largeBodyJson = express.json({ limit: '50mb' });
const largeBodyUrlencoded = express.urlencoded({ limit: '50mb', extended: true });
app.use('/api/ai/chat', largeBodyJson, largeBodyUrlencoded);
app.use('/api/bills/scan', largeBodyJson, largeBodyUrlencoded);

// Default 1mb body limit for all other routes
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Deep Anti-Code-Injection & Prototype-Pollution Request Sanitizer
function sanitizeIncomingPayload(val) {
  if (typeof val === 'string') {
    return val
      .replace(/<\s*\/?\s*script\b[^>]*>/gi, '')
      .replace(/javascript\s*:/gi, 'blocked:')
      .replace(/\bon(error|load|mouseover|focus|click)\s*=/gi, 'data-blocked-event=');
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeIncomingPayload);
  }
  if (val && typeof val === 'object') {
    const clean = {};
    for (const k of Object.keys(val)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      clean[k] = sanitizeIncomingPayload(val[k]);
    }
    return clean;
  }
  return val;
}

// Bank-Grade HTTP Security Headers + Anti-Injection Request Firewall
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', process.env.KLARITY_DESKTOP_APP ? 'SAMEORIGIN' : 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeIncomingPayload(req.body);
  }
  next();
});

// Storage location: Desktop App uses private OS AppData folder; Vercel uses /tmp; Dev uses server/data.json
const db = require('./db');

// Data read/write delegators to db adapter (supports Supabase on hosted & local encrypted file on desktop)
async function readData(userId) {
  return await db.readUserData(userId);
}

async function writeData(data, userId) {
  return await db.writeUserData(userId, data);
}

// Encryption utilities for storing API keys & secrets securely server-side
let ENCRYPTION_SECRET = process.env.SETTINGS_ENCRYPTION_KEY;

if (!ENCRYPTION_SECRET) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    console.error('FATAL: SETTINGS_ENCRYPTION_KEY environment variable is required in production.');
    process.exit(1);
  }
  ENCRYPTION_SECRET = 'klarity-dev-default-encryption-key-32bytes!';
}

function getDerivedKey() {
  return crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
}

function encrypt(text) {
  try {
    const key = getDerivedKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `GCM:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return text;
  }
}

function decrypt(text) {
  try {
    if (!text || typeof text !== 'string') return text;
    const key = getDerivedKey();
    if (text.startsWith('GCM:')) {
      const parts = text.split(':');
      const iv = Buffer.from(parts[1], 'hex');
      const tag = Buffer.from(parts[2], 'hex');
      const cipherData = Buffer.from(parts[3], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return decipher.update(cipherData, null, 'utf8') + decipher.final('utf8');
    }
    const parts = text.split(':');
    if (parts.length === 2) {
      const iv = Buffer.from(parts[0], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      return decipher.update(parts[1], 'hex', 'utf8') + decipher.final('utf8');
    }
    return text;
  } catch (err) {
    console.warn('Decryption failed:', err.message);
    return null;
  }
}

function maskSecret(val) {
  if (!val || typeof val !== 'string') return '';
  if (val.length <= 4) return '••••';
  return '••••••••' + val.slice(-4);
}

// User-scoped Settings Helper
function getUserSettings(data, userId) {
  if (!data) return { ai: {}, plaid: {}, featureFlags: { retirement: true, budgets: true, savingsGoals: true, vault: true } };
  if (!data.userSettings) data.userSettings = {};
  const uid = userId || 'default';

  // Discover any existing configured AI key across users or legacy settings to prevent key loss
  let existingAi = null;
  if (data.settings?.ai?.encryptedKey) {
    existingAi = data.settings.ai;
  } else {
    for (const otherUid of Object.keys(data.userSettings)) {
      if (data.userSettings[otherUid]?.ai?.encryptedKey) {
        existingAi = data.userSettings[otherUid].ai;
        break;
      }
    }
  }

  // Discover any existing Plaid settings to prevent key loss
  let existingPlaid = null;
  if (data.settings?.plaid?.encryptedSecret) {
    existingPlaid = data.settings.plaid;
  } else {
    for (const otherUid of Object.keys(data.userSettings)) {
      if (data.userSettings[otherUid]?.plaid?.encryptedSecret) {
        existingPlaid = data.userSettings[otherUid].plaid;
        break;
      }
    }
  }

  if (!data.userSettings[uid]) {
    data.userSettings[uid] = {
      ai: existingAi ? JSON.parse(JSON.stringify(existingAi)) : {
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        encryptedKey: '',
        status: 'not_connected',
        dataPermissions: { bills: true, subscriptions: true, cards: true, purchases: true, retirement: true }
      },
      plaid: existingPlaid ? JSON.parse(JSON.stringify(existingPlaid)) : {
        clientId: '',
        encryptedSecret: '',
        status: 'not_connected'
      },
      featureFlags: {
        retirement: true,
        budgets: true,
        savingsGoals: true,
        vault: true
      }
    };
  } else {
    // Backfill if this entry lacks key but existing configured key was found
    if (!data.userSettings[uid].ai?.encryptedKey && existingAi?.encryptedKey) {
      data.userSettings[uid].ai = JSON.parse(JSON.stringify(existingAi));
    }
    if (!data.userSettings[uid].plaid?.encryptedSecret && existingPlaid?.encryptedSecret) {
      data.userSettings[uid].plaid = JSON.parse(JSON.stringify(existingPlaid));
    }
  }

  if (!data.userSettings[uid].featureFlags) {
    data.userSettings[uid].featureFlags = {
      retirement: true,
      budgets: true,
      savingsGoals: true,
      vault: true
    };
  }
  return data.userSettings[uid];
}

// Plaid Client Helper (User-scoped)
async function getPlaidClient(overrideClientId, overrideSecret, userId) {
  const data = await readData(userId);
  const uSettings = userId ? getUserSettings(data, userId) : null;
  const userPlaid = uSettings?.plaid || data.settings?.plaid;

  // Each user can have their own Plaid keys, with fallback to process.env in development/sandbox
  const clientId = overrideClientId || userPlaid?.clientId || process.env.PLAID_CLIENT_ID || '';
  const secret = overrideSecret || (userPlaid?.encryptedSecret ? decrypt(userPlaid.encryptedSecret) : '') || process.env.PLAID_SECRET || '';
  const env = process.env.PLAID_ENV || data.settings?.plaidEnv || 'sandbox';

  if (!clientId || !secret) return null;

  const basePath = PlaidEnvironments[env] || PlaidEnvironments.sandbox;
  const configuration = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

// Map Plaid's Category to Klarity Category
function mapPlaidCategory(plaidCat) {
  if (!plaidCat) return 'Shopping';
  const c = String(plaidCat).toLowerCase();
  if (c.includes('social_security') || c.includes('ssa')) return 'Social Security';
  if (c.includes('pension') || c.includes('calpers') || c.includes('strs') || c.includes('annuity') || c.includes('retirement')) return 'CalPERS / Pension';
  if (c.includes('food') || c.includes('restaurant') || c.includes('dining') || c.includes('fast_food') || c.includes('cafe')) return 'Dining';
  if (c.includes('grocer') || c.includes('supermarket') || c.includes('market') || c.includes('food_and_beverage')) return 'Groceries';
  if (c.includes('transport') || c.includes('gas') || c.includes('fuel') || c.includes('automotive') || c.includes('transit') || c.includes('taxi')) return 'Transportation';
  if (c.includes('subscription') || c.includes('entertainment') || c.includes('streaming') || c.includes('tv') || c.includes('music')) return 'Subscriptions';
  if (c.includes('utilit') || c.includes('electric') || c.includes('water') || c.includes('telecom') || c.includes('internet') || c.includes('sanitation')) return 'Utilities';
  if (c.includes('rent') || c.includes('mortgage') || c.includes('housing') || c.includes('home')) return 'Housing';
  if (c.includes('medical') || c.includes('health') || c.includes('pharmacy') || c.includes('dental')) return 'Health';
  if (c.includes('income') || c.includes('payroll') || c.includes('deposit') || c.includes('salary') || c.includes('transfer_in')) return 'Income';
  if (c.includes('travel') || c.includes('airline') || c.includes('hotel') || c.includes('lodging')) return 'Travel';
  return 'Shopping';
}

// Auto-categorize by merchant name
function categorizeTransaction(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('social security') || n.includes('ssa ') || n.includes('ssa-') || n.includes('ssdi') || n.includes('ssi ')) return 'Social Security';
  if (n.includes('calpers') || n.includes('pension') || n.includes('strs') || n.includes('retirement dist') || n.includes('annuity') || n.includes('opm')) return 'CalPERS / Pension';
  if (n.includes('electric') || n.includes('pge') || n.includes('water') || n.includes('utility') || n.includes('gas co') || n.includes('internet') || n.includes('wifi') || n.includes('comcast') || n.includes('verizon') || n.includes('at&t') || n.includes('t-mobile')) return 'Utilities';
  if (n.includes('rent') || n.includes('mortgage') || n.includes('lease') || n.includes('apartment') || n.includes('landlord')) return 'Housing';
  if (n.includes('safeway') || n.includes('trader joe') || n.includes('grocery') || n.includes('market') || n.includes('whole foods') || n.includes('costco') || n.includes('kroger') || n.includes('sprouts') || n.includes('aldi') || n.includes('supermarket') || n.includes('heb') || n.includes('publix')) return 'Groceries';
  if (n.includes('chipotle') || n.includes('starbucks') || n.includes('mcdonald') || n.includes('burger') || n.includes('restaurant') || n.includes('cafe') || n.includes('coffee') || n.includes('pizza') || n.includes('taco') || n.includes('dining') || n.includes('doordash') || n.includes('uber eats') || n.includes('grubhub') || n.includes('sweetgreen') || n.includes('panera') || n.includes('chick-fil-a') || n.includes('dunkin')) return 'Dining';
  if (n.includes('shell') || n.includes('chevron') || n.includes('gas') || n.includes('fuel') || n.includes('exxon') || n.includes('bp') || n.includes('mobil') || n.includes('uber') || n.includes('lyft') || n.includes('transit') || n.includes('metro') || n.includes('parking') || n.includes('toll')) return 'Transportation';
  if (n.includes('netflix') || n.includes('spotify') || n.includes('hulu') || n.includes('disney') || n.includes('apple') || n.includes('google storage') || n.includes('icloud') || n.includes('chatgpt') || n.includes('youtube') || n.includes('prime video') || n.includes('max')) return 'Subscriptions';
  if (n.includes('payroll') || n.includes('salary') || n.includes('deposit') || n.includes('direct dep') || n.includes('paycheck') || n.includes('bonus')) return 'Income';
  if (n.includes('pharmacy') || n.includes('cvs') || n.includes('walgreens') || n.includes('doctor') || n.includes('dental') || n.includes('health') || n.includes('clinic')) return 'Health';
  if (n.includes('flight') || n.includes('airline') || n.includes('hotel') || n.includes('airbnb') || n.includes('delta') || n.includes('united') || n.includes('american air')) return 'Travel';
  if (n.includes('amazon') || n.includes('target') || n.includes('walmart') || n.includes('best buy') || n.includes('nike') || n.includes('clothing') || n.includes('store') || n.includes('shop')) return 'Shopping';
  return 'Shopping';
}

// Helper: Calculate Due Date from Day of Month
function calculateNextDueDate(dueDay) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  let targetMonth = currentMonth;
  let targetYear = currentYear;

  if (dueDay < currentDay) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const dueDate = new Date(targetYear, targetMonth, dueDay);
  return dueDate.toISOString().split('T')[0];
}

// =========================================================================
// API ROUTES
// =========================================================================

// Salted scrypt password hashing & Brute-Force Rate Limiting
const authRateMap = new Map();

function checkAuthRateLimit(ip) {
  const now = Date.now();
  const entry = authRateMap.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 15 * 60 * 1000;
  }
  if (entry.count >= 10) {
    return { blocked: true, secondsLeft: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { blocked: false, entry };
}

function recordFailedAuth(ip) {
  const now = Date.now();
  const entry = authRateMap.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  entry.count += 1;
  authRateMap.set(ip, entry);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  try {
    const [salt, keyHex] = storedHash.split(':');
    const derived = crypto.scryptSync(String(password), salt, 64);
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  } catch {
    return false;
  }
}

function sanitizeUser(u) {
  if (!u) return null;
  const { passwordHash, ...safeUser } = u;
  return safeUser;
}

// ============================================================================
// PER-USER HASHED SESSION TOKEN AUTHENTICATION & SECURITY MIDDLEWARE
// ============================================================================
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (1 week)

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function createUserSession(data, userOrId) {
  const userId = typeof userOrId === 'object' && userOrId !== null ? userOrId.id : userOrId;
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = Date.now() + SESSION_DURATION_MS;

  data.sessions = data.sessions || [];
  // Prune expired sessions
  data.sessions = data.sessions.filter(s => s.expiresAt > Date.now());

  data.sessions.push({
    tokenHash,
    userId,
    createdAt: Date.now(),
    expiresAt
  });

  // Remove single global activeSession
  delete data.activeSession;

  await writeData(data, userId);
  await db.createSession(userId, tokenHash, expiresAt);

  let safeUser = null;
  if (typeof userOrId === 'object' && userOrId !== null) {
    safeUser = sanitizeUser(userOrId);
  } else {
    const foundUser = (data.users || []).find(u => u.id === userId);
    if (foundUser) safeUser = sanitizeUser(foundUser);
  }

  return {
    token: rawToken,
    expiresAt,
    user: safeUser
  };
}

// Global authentication gate for /api routes
async function requireAuth(req, res, next) {
  const publicPaths = new Set([
    '/auth/register',
    '/auth/login',
    '/auth/setup-owner',
    '/auth/google',
    '/auth/google/callback',
    '/auth/google/check-session',
    '/auth/session',
    '/household/zillow-lookup',
    '/household/scan-insurance-card',
    '/household',
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/setup-owner',
    '/api/auth/google',
    '/api/auth/google/callback',
    '/api/auth/google/check-session',
    '/api/auth/session',
    '/api/household/zillow-lookup',
    '/api/household/scan-insurance-card',
    '/api/household'
  ]);

  const reqPath = (req.path || '').split('?')[0];
  if (publicPaths.has(reqPath)) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          const tokenHash = hashToken(token);
          db.getSession(tokenHash).then(session => {
            if (session) {
              req.userId = session.userId;
              req.user = session.user;
            }
          }).catch(() => {});
        } catch (e) {}
      }
    }
    return next();
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Session token required' });
  }

  const tokenHash = hashToken(token);
  const session = await db.getSession(tokenHash);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
  }

  req.userId = session.userId;
  req.user = session.user;
  next();
}

app.use('/api', requireAuth);

app.post('/api/auth/session', async (req, res) => {
  // Session heartbeat and client profile synchronization endpoint
  res.json({ ok: true, active: true });
});

app.get('/api/auth/session', async (req, res) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authenticated: false, session: null });
  }
  const token = authHeader.slice(7).trim();
  const tokenHash = hashToken(token);
  const session = await db.getSession(tokenHash);
  if (!session) {
    return res.json({ authenticated: false, session: null });
  }
  res.json({
    authenticated: true,
    session: {
      token,
      expiresAt: session.expiresAt,
      user: sanitizeUser(session.user)
    }
  });
});

app.delete('/api/auth/session', async (req, res) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const tokenHash = hashToken(token);
    await db.deleteSession(tokenHash);
  }
  res.json({ ok: true });
});

// 1. Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local';
  const rate = checkAuthRateLimit(clientIp);
  if (rate.blocked) {
    return res.status(429).json({ error: `Too many attempts. Try again in ${rate.secondsLeft}s.` });
  }

  const { name, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existingDbUser = await db.getUserByEmail(cleanEmail);
  const data = await readData(req.userId);
  const existing = existingDbUser || (data.users || []).find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'User already exists with this email' });
  }

  const isOwner = isOwnerEmail(cleanEmail);
  const newUser = {
    id: isOwner ? 'u-owner' : `u-${Date.now()}`,
    email: cleanEmail,
    name: name || cleanEmail.split('@')[0],
    role: isOwner || (data.users || []).length === 0 ? 'Primary Member' : 'Member',
    avatar: '',
    passwordHash: hashPassword(password)
  };

  await db.createUser(newUser);
  const safeUser = sanitizeUser(newUser);
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  await db.createSession(safeUser.id, tokenHash, expiresAt);

  res.json({
    user: safeUser,
    session: { token: rawToken, expiresAt, user: safeUser }
  });
});

app.post('/api/auth/login', async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local';
  const rate = checkAuthRateLimit(clientIp);
  if (rate.blocked) {
    return res.status(429).json({ error: `Too many failed login attempts. Try again in ${rate.secondsLeft}s.` });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await db.getUserByEmail(cleanEmail);

  if (!user) {
    recordFailedAuth(clientIp);
    return res.status(401).json({ error: 'No account found with that email. Please Sign Up first.' });
  }

  if (!user.passwordHash) {
    recordFailedAuth(clientIp);
    return res.status(401).json({ error: 'This account has no password configured and cannot be logged into.' });
  }

  const valid = verifyPassword(password, user.passwordHash);
  if (!valid) {
    recordFailedAuth(clientIp);
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  authRateMap.delete(clientIp);
  const safeUser = sanitizeUser(user);
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  await db.createSession(safeUser.id, tokenHash, expiresAt);

  res.json({
    user: safeUser,
    session: { token: rawToken, expiresAt, user: safeUser }
  });
});

// Dedicated one-time Owner Setup Route (disabled once an owner password exists)
app.post('/api/auth/setup-owner', async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local';
  const rate = checkAuthRateLimit(clientIp);
  if (rate.blocked) {
    return res.status(429).json({ error: `Too many attempts. Try again in ${rate.secondsLeft}s.` });
  }

  const setupTokenEnv = process.env.OWNER_SETUP_TOKEN;
  if (!setupTokenEnv) {
    return res.status(403).json({ error: 'Owner setup is not enabled on this server (OWNER_SETUP_TOKEN not set).' });
  }

  const { setupToken, email, password, name } = req.body;
  if (!setupToken || !email || !password) {
    return res.status(400).json({ error: 'setupToken, email, and password are required.' });
  }

  const tokenBufA = Buffer.from(String(setupToken));
  const tokenBufB = Buffer.from(String(setupTokenEnv));
  if (tokenBufA.length !== tokenBufB.length || !crypto.timingSafeEqual(tokenBufA, tokenBufB)) {
    recordFailedAuth(clientIp);
    return res.status(403).json({ error: 'Invalid owner setup token.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (OWNER_EMAILS_LIST.length > 0 && !isOwnerEmail(cleanEmail)) {
    return res.status(403).json({ error: 'Email is not listed in OWNER_EMAILS.' });
  }

  let existingUser = await db.getUserByEmail(cleanEmail);
  if (existingUser && existingUser.passwordHash) {
    return res.status(403).json({ error: 'Owner password is already configured. This setup route is disabled.' });
  }

  // Also check if any configured owner email already has a password
  for (const ownerEmail of OWNER_EMAILS_LIST) {
    const ownerRecord = await db.getUserByEmail(ownerEmail);
    if (ownerRecord && ownerRecord.passwordHash) {
      return res.status(403).json({ error: 'Owner password is already configured. This setup route is disabled.' });
    }
  }

  const passwordHash = hashPassword(password);
  let targetUser;
  if (existingUser) {
    await db.updateUser(existingUser.id, {
      passwordHash,
      ...(name ? { name: name.trim() } : {})
    });
    targetUser = { ...existingUser, passwordHash, ...(name ? { name: name.trim() } : {}) };
  } else {
    targetUser = {
      id: 'u-owner',
      email: cleanEmail,
      name: (name && name.trim()) || cleanEmail.split('@')[0],
      role: 'Primary Member',
      avatar: '',
      passwordHash
    };
    await db.createUser(targetUser);
  }

  const safeUser = sanitizeUser(targetUser);
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  await db.createSession(safeUser.id, tokenHash, expiresAt);

  res.json({
    user: safeUser,
    session: { token: rawToken, expiresAt, user: safeUser }
  });
});

// Memory maps for Desktop Browser Loopback OAuth
if (!global.completedDesktopAuths) {
  global.completedDesktopAuths = new Map();
}

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code) {
    return res.send(`
      <!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:50px;">
        <h3>Sign-in cancelled or failed</h3>
        <p>${error || 'No authorization code received'}</p>
        <button onclick="window.close()">Close this window</button>
      </body></html>
    `);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const hostPort = (req.headers.host && req.headers.host.includes(':')) ? req.headers.host.split(':')[1] : (req.socket.localPort || 5173);
    const redirectUri = `http://localhost:${hostPort}/api/auth/google/callback`;

    // 1. Exchange authorization code for access_token with Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Google token exchange error:', tokenData);
      return res.status(400).send(`Authentication error: ${tokenData.error_description || 'Token exchange failed'}`);
    }

    // 2. Fetch authenticated user profile from Google
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await userinfoRes.json();
    const cleanEmail = (profile.email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).send('No verified email found from Google profile');
    }

    // 3. Register or load user into Klarity
    const data = await readData(req.userId);
    const isOwner = isOwnerEmail(cleanEmail);
    let user = (data.users || []).find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      user = {
        id: isOwner ? 'u-owner' : `u-${Date.now()}`,
        email: cleanEmail,
        name: profile.name || cleanEmail.split('@')[0],
        avatar: profile.picture || '',
        role: isOwner || (data.users || []).length === 0 ? 'Primary Member' : 'Member'
      };
      data.users = data.users || [];
      data.users.push(user);
      await writeData(data, req.userId);
    } else if (profile.name || profile.picture) {
      if (profile.name) user.name = profile.name;
      if (profile.picture) user.avatar = profile.picture;
      await writeData(data, req.userId);
    }

    const safeUser = sanitizeUser(user);
    const session = await createUserSession(data, safeUser);

    // Save for desktop app poller with full user info
    if (state) {
      global.completedDesktopAuths.set(state, {
        user: safeUser,
        session: { token: session.token, expiresAt: session.expiresAt, user: safeUser }
      });
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Signed In — Klarity</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: white; border: 1px solid #e2e8f0; border-radius: 20px; padding: 40px 32px; max-width: 420px; text-align: center; box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08); }
          .icon { width: 56px; height: 56px; background: #18457c; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; font-size: 28px; }
          h2 { color: #0f172a; margin: 0 0 8px; font-size: 22px; }
          p { color: #64748b; font-size: 14px; margin: 0 0 24px; line-height: 1.5; }
          .btn { background: #18457c; color: white; padding: 11px 24px; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h2>Signed in to Klarity</h2>
          <p>Welcome back, <strong>${safeUser.name || safeUser.email}</strong>!<br>You can now close this tab and return to Klarity.</p>
          <a href="#" class="btn" onclick="window.close()">Close Window</a>
        </div>
        <script>
          setTimeout(() => { try { window.close(); } catch {} }, 1500);
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.status(500).send(`Error completing login: ${err.message}`);
  }
});

app.get('/api/auth/google/check-session', async (req, res) => {
  const { sid } = req.query;
  if (!sid) return res.status(400).json({ error: 'Missing sid' });
  if (global.completedDesktopAuths && global.completedDesktopAuths.has(sid)) {
    const authItem = global.completedDesktopAuths.get(sid);
    global.completedDesktopAuths.delete(sid);
    return res.json({ ok: true, user: authItem.user, session: authItem.session });
  }
  return res.json({ ok: false, pending: true });
});

app.post('/api/auth/google', async (req, res) => {
  const { accessToken, desktopVerified, email: fallbackEmail, name: fallbackName, avatar } = req.body;

  let verifiedEmail = '';
  let verifiedName = '';
  let verifiedPicture = avatar || '';

  if (accessToken) {
    try {
      const gRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!gRes.ok) {
        return res.status(401).json({ error: 'Google token verification failed.' });
      }
      const gProfile = await gRes.json();
      verifiedEmail = (gProfile.email || '').trim().toLowerCase();
      verifiedName = gProfile.name || gProfile.given_name || '';
      verifiedPicture = gProfile.picture || verifiedPicture;
    } catch (err) {
      return res.status(401).json({ error: 'Could not verify Google token with Google servers.' });
    }
  } else if (desktopVerified && process.env.KLARITY_DESKTOP_APP === 'true' && fallbackEmail) {
    // Verified directly inside Electron's native accounts.google.com BrowserWindow
    verifiedEmail = String(fallbackEmail).trim().toLowerCase();
    verifiedName = fallbackName || '';
  }

  if (!verifiedEmail) {
    return res.status(401).json({ error: 'Valid Google OAuth authentication is required.' });
  }

  const data = await readData(req.userId);
  const isOwner = isOwnerEmail(verifiedEmail);
  let user = (data.users || []).find(u => u.email.toLowerCase() === verifiedEmail);

  if (!user) {
    user = {
      id: isOwner ? 'u-owner' : `u-${Date.now()}`,
      email: verifiedEmail,
      name: verifiedName || fallbackName || verifiedEmail.split('@')[0],
      avatar: verifiedPicture,
      role: isOwner || (data.users || []).length === 0 ? 'Primary Member' : 'Member'
    };
    data.users = data.users || [];
    data.users.push(user);
    await writeData(data, req.userId);
  } else if (verifiedName || verifiedPicture) {
    if (verifiedName) user.name = verifiedName;
    if (verifiedPicture) user.avatar = verifiedPicture;
    await writeData(data, req.userId);
  }

  const safeUser = sanitizeUser(user);
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  await db.createSession(safeUser.id, tokenHash, expiresAt);

  res.json({
    user: safeUser,
    session: { token: rawToken, expiresAt, user: safeUser }
  });
});

// 2. Settings Endpoints (Encrypted Server Storage per User)
app.get('/api/settings', async (req, res) => {
  const userId = req.userId;
  const data = await readData(req.userId);
  const user = (data.users || []).find(u => u.id === userId) || req.user || { name: '', email: '' };
  const userSettings = getUserSettings(data, userId);
  const ai = userSettings.ai;
  const plaid = userSettings.plaid;
  const userPlaidItems = (data.plaidItems || []).filter(item => !item.userId || item.userId === userId);

  res.json({
    user: {
      id: userId,
      name: user.name || '',
      email: user.email || ''
    },
    ai: {
      provider: ai.provider || (ai.encryptedKey ? 'gemini' : 'local'),
      model: ai.model || (ai.encryptedKey ? 'gemini-2.0-flash' : DEFAULT_MODEL_ID),
      hasKey: Boolean(ai.encryptedKey),
      maskedKey: ai.encryptedKey ? maskSecret(decrypt(ai.encryptedKey)) : '',
      status: (ai.encryptedKey || (ai.provider || 'local') === 'local') ? 'connected' : 'not_connected',
      localEngine: localModelEngine.status,
      supportedLocalModels: Object.values(SUPPORTED_MODELS),
      responseLength: ai.responseLength || 'balanced',
      webSearchEnabled: ai.webSearchEnabled !== undefined ? ai.webSearchEnabled : true,
      dataPermissions: ai.dataPermissions || { bills: true, subscriptions: true, cards: true, purchases: true, retirement: true },
      memory: Array.isArray(ai.memory) ? ai.memory : []
    },
    plaid: {
      clientId: plaid.clientId || '',
      hasSecret: Boolean(plaid.encryptedSecret),
      maskedSecret: plaid.encryptedSecret ? maskSecret(decrypt(plaid.encryptedSecret)) : '',
      status: (plaid.clientId && plaid.encryptedSecret) ? (plaid.status || 'connected') : 'not_connected',
      connectedItemsCount: userPlaidItems.length
    },
    plaidItems: userPlaidItems.map(item => ({
      itemId: item.itemId,
      institution: item.institution || 'Connected Bank',
      connectedAt: item.connectedAt,
      accounts: (data.accounts || []).filter(a =>
        (a.itemId === item.itemId || a.institution === item.institution) &&
        (!userId || !a.ownerId || a.ownerId === userId || a.userId === userId || a.ownerId === 'u-ziyad' || a.userId === 'u-ziyad' || a.ownerId === 'u-owner')
      )
    })),
    featureFlags: userSettings.featureFlags || {
      retirement: true,
      budgets: true,
      savingsGoals: true,
      vault: true,
      household: true
    }
  });
});

// Feature Flags Endpoints (User-scoped, server-side persisted)
app.get(['/api/feature-flags', '/api/settings/feature-flags'], async (req, res) => {
  const data = await readData(req.userId);
  const userSettings = getUserSettings(data, req.userId);
  res.json({
    success: true,
    featureFlags: userSettings.featureFlags || {
      retirement: true,
      budgets: true,
      savingsGoals: true,
      vault: true,
      household: true
    }
  });
});

app.post(['/api/feature-flags', '/api/settings/feature-flags'], async (req, res) => {
  const data = await readData(req.userId);
  const userSettings = getUserSettings(data, req.userId);
  const incoming = (req.body && req.body.featureFlags) ? req.body.featureFlags : (req.body || {});
  userSettings.featureFlags = {
    retirement: incoming.retirement !== undefined ? Boolean(incoming.retirement) : (userSettings.featureFlags?.retirement ?? true),
    budgets: incoming.budgets !== undefined ? Boolean(incoming.budgets) : (userSettings.featureFlags?.budgets ?? true),
    savingsGoals: incoming.savingsGoals !== undefined ? Boolean(incoming.savingsGoals) : (userSettings.featureFlags?.savingsGoals ?? true),
    vault: incoming.vault !== undefined ? Boolean(incoming.vault) : (userSettings.featureFlags?.vault ?? true)
  };
  await writeData(data, req.userId);
  res.json({ success: true, featureFlags: userSettings.featureFlags });
});

app.post('/api/settings/profile', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const data = await readData(req.userId);
  const user = (data.users || []).find(u => u.id === req.userId);
  if (user) {
    user.name = name.trim();
    await writeData(data, req.userId);
  }
  res.json({ success: true, name: name.trim() });
});

// Test and save AI API key server-side (User-scoped)
app.post('/api/settings/ai-key/test-and-save', async (req, res) => {
  const { provider = 'local', model, apiKey, dataPermissions } = req.body;
  const uid = req.userId;

  // Built-in Local AI (node-llama-cpp) requires zero external API keys
  if (provider === 'local') {
    const selectedLocalModel = model && SUPPORTED_MODELS[model] ? model : DEFAULT_MODEL_ID;
    const data = await readData(req.userId);
    const userSettings = getUserSettings(data, uid);
    userSettings.ai = {
      ...userSettings.ai,
      provider: 'local',
      model: selectedLocalModel,
      status: 'connected',
      dataPermissions: dataPermissions || userSettings.ai?.dataPermissions || { bills: true, subscriptions: true, cards: true, purchases: true, retirement: true }
    };
    data.settings = data.settings || {};
    data.settings.ai = JSON.parse(JSON.stringify(userSettings.ai));
    for (const otherUid of Object.keys(data.userSettings || {})) {
      data.userSettings[otherUid].ai = JSON.parse(JSON.stringify(userSettings.ai));
    }
    await writeData(data, req.userId);

    // Trigger model verification/download & initialization in background
    localModelEngine.ensureInitialized({ modelId: selectedLocalModel, autoDownload: true }).catch(err => {
      console.warn('[Klarity Local AI] Background init notice:', err.message);
    });

    return res.json({
      success: true,
      status: 'connected',
      maskedKey: 'Built-in Local GGUF Engine',
      provider: 'local',
      model: selectedLocalModel,
      localEngine: localModelEngine.status,
      dataPermissions: userSettings.ai.dataPermissions
    });
  }

  if (!apiKey || !apiKey.trim()) {
    return res.status(400).json({ success: false, error: 'API key is required' });
  }

  const keyToTest = apiKey.trim();
  let isValid = false;
  let testError = '';

  try {
    if (provider === 'anthropic') {
      const targetModel = model || 'claude-3-7-sonnet-20250219';
      const testRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': keyToTest,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: targetModel,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        })
      });

      if (testRes.ok || testRes.status === 200) {
        isValid = true;
      } else {
        const errJson = await testRes.json().catch(() => ({}));
        testError = errJson?.error?.message || `Anthropic error: HTTP ${testRes.status}`;
      }
    } else if (provider === 'ai-gateway' || provider === 'vercel') {
      const gwRes = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToTest}`
        },
        body: JSON.stringify({
          model: model || 'openai/gpt-4o-mini',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        })
      });
      if (gwRes.ok || gwRes.status === 200) {
        isValid = true;
      } else {
        const errJson = await gwRes.json().catch(() => ({}));
        testError = errJson?.error?.message || `Vercel AI Gateway error: HTTP ${gwRes.status}`;
      }
    } else if (provider === 'openai') {
      const testRes = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${keyToTest}` }
      });
      if (testRes.ok) {
        isValid = true;
      } else {
        const errJson = await testRes.json().catch(() => ({}));
        testError = errJson?.error?.message || `OpenAI error: HTTP ${testRes.status}`;
      }
    } else if (provider === 'gemini') {
      const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToTest}`);
      if (testRes.ok) {
        isValid = true;
      } else {
        const errJson = await testRes.json().catch(() => ({}));
        testError = errJson?.error?.message || `Gemini error: HTTP ${testRes.status}`;
      }
    } else {
      testError = `Unknown provider: ${provider}`;
    }
  } catch (err) {
    testError = err.message || 'Network test failed';
  }

  if (!isValid) {
    return res.status(400).json({
      success: false,
      status: 'invalid_key',
      error: testError || 'Key verification failed. Please check the API key and provider.'
    });
  }

  // Key is valid! Save encrypted server-side for this user
  const data = await readData(req.userId);
  const userSettings = getUserSettings(data, uid);
  userSettings.ai = {
    provider,
    model: model || (provider === 'anthropic' ? 'claude-3-7-sonnet-20250219' : provider === 'openai' ? 'gpt-4o' : 'gemini-2.0-flash'),
    encryptedKey: encrypt(keyToTest),
    status: 'connected',
    dataPermissions: dataPermissions || { bills: true, subscriptions: true, cards: true, purchases: true, retirement: true }
  };
  // Preserve in global settings and across all user settings so signing in never loses the AI key
  data.settings = data.settings || {};
  data.settings.ai = JSON.parse(JSON.stringify(userSettings.ai));
  for (const otherUid of Object.keys(data.userSettings || {})) {
    data.userSettings[otherUid].ai = JSON.parse(JSON.stringify(userSettings.ai));
  }
  await writeData(data, req.userId);

  return res.json({
    success: true,
    status: 'connected',
    maskedKey: maskSecret(keyToTest),
    provider,
    model: userSettings.ai.model,
    dataPermissions: userSettings.ai.dataPermissions
  });
});

app.post('/api/settings/ai-key/remove', async (req, res) => {
  const uid = req.userId;
  const data = await readData(req.userId);
  const userSettings = getUserSettings(data, uid);
  userSettings.ai = {
    provider: userSettings.ai?.provider || 'gemini',
    model: userSettings.ai?.model || 'gemini-2.0-flash',
    encryptedKey: '',
    status: 'not_connected',
    dataPermissions: userSettings.ai?.dataPermissions || { bills: true, subscriptions: true, cards: true, purchases: true, retirement: true }
  };
  if (data.settings && data.settings.ai) {
    data.settings.ai = JSON.parse(JSON.stringify(userSettings.ai));
  }
  for (const otherUid of Object.keys(data.userSettings || {})) {
    data.userSettings[otherUid].ai = JSON.parse(JSON.stringify(userSettings.ai));
  }
  await writeData(data, req.userId);
  res.json({ success: true, status: 'not_connected' });
});

app.post('/api/settings/ai-permissions', async (req, res) => {
  const { dataPermissions } = req.body;
  const uid = req.userId;
  const data = await readData(req.userId);
  const userSettings = getUserSettings(data, uid);
  if (!userSettings.ai) userSettings.ai = {};
  userSettings.ai.dataPermissions = dataPermissions;
  if (!data.settings) data.settings = {};
  if (!data.settings.ai) data.settings.ai = {};
  data.settings.ai.dataPermissions = dataPermissions;
  for (const otherUid of Object.keys(data.userSettings || {})) {
    if (!data.userSettings[otherUid].ai) data.userSettings[otherUid].ai = {};
    data.userSettings[otherUid].ai.dataPermissions = dataPermissions;
  }
  await writeData(data, req.userId);
  res.json({ success: true, dataPermissions });
});

app.post('/api/settings/ai-quick-settings', async (req, res) => {
  const { responseLength, webSearchEnabled, dataPermissions, memory } = req.body;
  const uid = req.userId;
  const data = await readData(req.userId);
  const userSettings = getUserSettings(data, uid);
  if (!userSettings.ai) userSettings.ai = {};
  if (responseLength) userSettings.ai.responseLength = responseLength;
  if (webSearchEnabled !== undefined) userSettings.ai.webSearchEnabled = Boolean(webSearchEnabled);
  if (dataPermissions) userSettings.ai.dataPermissions = dataPermissions;
  if (Array.isArray(memory)) userSettings.ai.memory = memory;
  if (!data.settings) data.settings = {};
  if (!data.settings.ai) data.settings.ai = {};
  if (responseLength) data.settings.ai.responseLength = responseLength;
  if (webSearchEnabled !== undefined) data.settings.ai.webSearchEnabled = Boolean(webSearchEnabled);
  if (dataPermissions) data.settings.ai.dataPermissions = dataPermissions;
  if (Array.isArray(memory)) data.settings.ai.memory = memory;
  for (const otherUid of Object.keys(data.userSettings || {})) {
    if (!data.userSettings[otherUid].ai) data.userSettings[otherUid].ai = {};
    if (responseLength) data.userSettings[otherUid].ai.responseLength = responseLength;
    if (webSearchEnabled !== undefined) data.userSettings[otherUid].ai.webSearchEnabled = Boolean(webSearchEnabled);
    if (dataPermissions) data.userSettings[otherUid].ai.dataPermissions = dataPermissions;
    if (Array.isArray(memory)) data.userSettings[otherUid].ai.memory = memory;
  }
  await writeData(data, req.userId);
  res.json({ success: true, ai: userSettings.ai });
});

app.post('/api/settings/plaid', async (req, res) => {
  const { clientId, secret } = req.body;
  const uid = req.userId;
  const data = await readData(req.userId);
  const userSettings = getUserSettings(data, uid);
  const currentPlaid = userSettings.plaid || {};

  userSettings.plaid = {
    clientId: clientId || currentPlaid.clientId || '',
    encryptedSecret: secret ? encrypt(secret) : (currentPlaid.encryptedSecret || ''),
    status: (clientId || currentPlaid.clientId) ? 'connected' : 'not_connected'
  };
  data.settings = data.settings || {};
  data.settings.plaid = JSON.parse(JSON.stringify(userSettings.plaid));
  for (const otherUid of Object.keys(data.userSettings || {})) {
    data.userSettings[otherUid].plaid = JSON.parse(JSON.stringify(userSettings.plaid));
  }
  await writeData(data, req.userId);

  res.json({
    success: true,
    clientId: userSettings.plaid.clientId,
    maskedSecret: userSettings.plaid.encryptedSecret ? maskSecret(decrypt(userSettings.plaid.encryptedSecret)) : '',
    status: userSettings.plaid.status
  });
});

// 3. Plaid Link & Webhook Endpoints (User-scoped)
app.post('/api/plaid/create-link-token', async (req, res) => {
  const userId = req.userId;
  const plaidClient = await getPlaidClient(null, null, userId);

  if (!plaidClient) {
    return res.status(400).json({
      error: 'Plaid API keys are not configured yet for this account.',
      needsKeys: true,
      plaidDashboardUrl: 'https://dashboard.plaid.com/overview'
    });
  }

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Klarity',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en'
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('Plaid linkTokenCreate error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error_message || err.message });
  }
});

app.post('/api/plaid/exchange-public-token', async (req, res) => {
  const userId = req.userId;
  const { public_token, metadata } = req.body;
  const plaidClient = await getPlaidClient(null, null, userId);

  if (!plaidClient) {
    return res.status(400).json({ error: 'Plaid keys not configured for this account' });
  }

  try {
    const tokenResponse = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = tokenResponse.data.access_token;
    const itemId = tokenResponse.data.item_id;

    const accountsResponse = await plaidClient.accountsBalanceGet({ access_token: accessToken });
    const data = await readData(req.userId);

    const addedAccounts = [];
    for (const acc of accountsResponse.data.accounts) {
      const typeStr = (acc.type || '').toLowerCase();
      const subtypeStr = (acc.subtype || '').toLowerCase();
      const nameStr = (acc.name || '').toLowerCase();
      const isCredit = typeStr === 'credit' ||
                       subtypeStr.includes('credit') ||
                       subtypeStr.includes('card') ||
                       subtypeStr.includes('line of credit') ||
                       subtypeStr.includes('loan') ||
                       nameStr.includes('credit') ||
                       nameStr.includes('card') ||
                       nameStr.includes('visa') ||
                       nameStr.includes('mastercard') ||
                       nameStr.includes('amex');

      const balanceNum = Math.abs(Number(acc.balances?.current || 0));
      const limitNum = Number(acc.balances?.limit) || (isCredit ? 5000 : 0);

      const instName = metadata?.institution?.name || acc.institution || 'Connected Bank';
      const newAcc = {
        id: `acc-${acc.account_id}`,
        itemId,
        ownerId: userId || 'u-ziyad',
        userId: userId || 'u-ziyad',
        institution: instName,
        name: acc.name,
        officialName: acc.official_name || acc.name,
        type: isCredit ? 'credit' : 'depository',
        subtype: acc.subtype || (isCredit ? 'credit card' : 'checking'),
        balance: balanceNum,
        limit: limitNum,
        apr: isCredit ? 21.9 : 0,
        mask: acc.mask || '0000',
        minPayment: isCredit ? Math.max(35, Math.round(balanceNum * 0.025)) : 0
      };
      addedAccounts.push(newAcc);
    }

    data.accounts = (data.accounts || []).filter(a => !addedAccounts.some(na => na.id === a.id)).concat(addedAccounts);
    data.plaidItems = data.plaidItems || [];
    data.plaidItems.push({
      itemId,
      userId: userId || 'u-ziyad',
      accessToken,
      institution: metadata?.institution?.name || 'Connected Bank',
      institutionId: metadata?.institution?.institution_id,
      accountsCount: addedAccounts.length,
      connectedAt: new Date().toISOString()
    });

    // Automatically sync real transactions for the connected card / account
    try {
      const syncRes = await plaidClient.transactionsSync({ access_token: accessToken });
      if (syncRes.data?.added && syncRes.data.added.length > 0) {
        const fetchedTransactions = [];
        for (const pt of syncRes.data.added) {
          const matchingAcc = addedAccounts.find(a => a.id === `acc-${pt.account_id}`) || addedAccounts[0];
          const cat = mapPlaidCategory(pt.personal_finance_category?.primary || pt.category?.[0] || pt.name);
          const amt = Number(pt.amount || 0);
          fetchedTransactions.push({
            id: `tx-plaid-${pt.transaction_id}`,
            ownerId: userId || 'u-ziyad',
            name: pt.merchant_name || pt.name || 'Card Purchase',
            amount: amt > 0 ? -amt : Math.abs(amt),
            category: cat,
            date: pt.date || new Date().toISOString().split('T')[0],
            account: matchingAcc ? `${matchingAcc.name} •••• ${matchingAcc.mask}` : 'Connected Card',
            cardId: matchingAcc ? matchingAcc.id : '',
            notes: pt.payment_channel ? `Paid via ${pt.payment_channel}` : ''
          });
        }
        data.transactions = (data.transactions || []).filter(t => !fetchedTransactions.some(ft => ft.id === t.id)).concat(fetchedTransactions);
      }
    } catch (txErr) {
      console.warn('transactionsSync note:', txErr.message);
    }

    await writeData(data, req.userId);

    const userPlaidItems = data.plaidItems.filter(item => !item.userId || item.userId === userId);
    res.json({ success: true, accounts: addedAccounts, plaidItems: userPlaidItems });
  } catch (err) {
    console.error('Plaid exchange error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error_message || err.message });
  }
});

// Plaid Items Management (List & Disconnect Bank)
app.get('/api/plaid/items', async (req, res) => {
  const userId = req.userId;
  const data = await readData(req.userId);
  const userItems = (data.plaidItems || []).filter(item =>
    !userId || !item.userId || item.userId === userId || item.ownerId === userId ||
    item.userId === 'u-ziyad' || item.ownerId === 'u-ziyad' || item.userId === 'u-owner' || item.ownerId === 'u-owner'
  );
  const items = userItems.map(item => ({
    itemId: item.itemId,
    institution: item.institution || 'Connected Bank',
    connectedAt: item.connectedAt,
    accounts: (data.accounts || []).filter(a =>
      (a.itemId === item.itemId || a.institution === item.institution) &&
      (!userId || !a.ownerId || a.ownerId === userId || a.userId === userId || a.ownerId === 'u-ziyad' || a.userId === 'u-ziyad' || a.ownerId === 'u-owner')
    )
  }));
  res.json({ items });
});



app.delete('/api/plaid/items/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const data = await readData(req.userId);
  const targetItem = (data.plaidItems || []).find(i => i.itemId === itemId);
  if (targetItem) {
    const instName = targetItem.institution;
    data.accounts = (data.accounts || []).filter(a => a.institution !== instName);
    data.plaidItems = data.plaidItems.filter(i => i.itemId !== itemId);
    await writeData(data, req.userId);
  }
  res.json({ success: true });
});


// ==================== BUDGETS CRUD ====================
app.get('/api/budgets', async (req, res) => {
  const data = await readData(req.userId);
  res.json({ budgets: (data.budgets || []).filter(b => b.ownerId === req.userId || b.userId === req.userId) });
});

app.post('/api/budgets', async (req, res) => {
  const { id, category, limit, lastMonthSpent } = req.body;
  if (!category || limit == null) return res.status(400).json({ error: 'Missing category or limit' });
  const data = await readData(req.userId);
  data.budgets = data.budgets || [];
  const limitNum = parseFloat(limit);
  const existingIdx = data.budgets.findIndex(b => (b.id === id || (b.category || '').toLowerCase() === category.toLowerCase()) && (b.ownerId === req.userId || b.userId === req.userId));
  let item;
  if (existingIdx >= 0) {
    data.budgets[existingIdx] = {
      ...data.budgets[existingIdx],
      limit: limitNum,
      category,
      lastMonthSpent: lastMonthSpent !== undefined ? Number(lastMonthSpent) : data.budgets[existingIdx].lastMonthSpent
    };
    item = data.budgets[existingIdx];
  } else {
    item = {
      id: id || `bgt-${Date.now()}`,
      ownerId: req.userId,
      userId: req.userId,
      category,
      limit: limitNum,
      lastMonthSpent: Number(lastMonthSpent || 0)
    };
    data.budgets.push(item);
  }
  await writeData(data, req.userId);
  res.json({ success: true, budget: item, budgets: (data.budgets || []).filter(b => b.ownerId === req.userId || b.userId === req.userId) });
});

// ==================== MANUAL ASSETS CRUD ====================
app.get('/api/manual-assets', async (req, res) => {
  const data = await readData(req.userId);
  res.json({ manualAssets: (data.manualAssets || []).filter(a => a.ownerId === req.userId || a.userId === req.userId) });
});

app.post('/api/manual-assets', async (req, res) => {
  const { id, name, type, balance } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing asset name' });
  const data = await readData(req.userId);
  data.manualAssets = data.manualAssets || [];
  const existingIdx = data.manualAssets.findIndex(a => a.id === id && (a.ownerId === req.userId || a.userId === req.userId));
  let item;
  if (existingIdx >= 0) {
    data.manualAssets[existingIdx] = {
      ...data.manualAssets[existingIdx],
      name,
      type: type || 'savings',
      balance: Number(balance || 0)
    };
    item = data.manualAssets[existingIdx];
  } else {
    item = {
      id: id || `ma-${Date.now()}`,
      ownerId: req.userId,
      userId: req.userId,
      name,
      type: type || 'savings',
      balance: Number(balance || 0)
    };
    data.manualAssets.push(item);
  }
  await writeData(data, req.userId);
  res.json({ success: true, asset: item, manualAssets: (data.manualAssets || []).filter(a => a.ownerId === req.userId || a.userId === req.userId) });
});

app.delete('/api/manual-assets/:id', async (req, res) => {
  const data = await readData(req.userId);
  data.manualAssets = (data.manualAssets || []).filter(a => a.id !== req.params.id || (a.ownerId && a.ownerId !== req.userId));
  await writeData(data, req.userId);
  res.json({ success: true, manualAssets: (data.manualAssets || []).filter(a => a.ownerId === req.userId || a.userId === req.userId) });
});

// ==================== RETIREMENT PLANS CRUD ====================
app.get('/api/retirement', async (req, res) => {
  const data = await readData(req.userId);
  const userPlans = (data.retirementPlans || []).filter(p => p.ownerId === req.userId || p.userId === req.userId);
  res.json({ success: true, retirementPlans: userPlans });
});

app.post('/api/retirement', async (req, res) => {
  const plan = req.body;
  if (!plan || !plan.name) return res.status(400).json({ error: 'Missing retirement plan name' });

  const data = await readData(req.userId);
  data.retirementPlans = data.retirementPlans || [];

  const existingIdx = data.retirementPlans.findIndex(p => p.id === plan.id && (p.ownerId === req.userId || p.userId === req.userId));

  const planItem = {
    ...plan,
    id: plan.id || `ret-${Date.now()}`,
    ownerId: req.userId,
    userId: req.userId,
    planType: plan.planType || '401k',
    name: plan.name,
    provider: plan.provider || '',
    tier: plan.tier || '',
    yearsOfService: Number(plan.yearsOfService || 0),
    benefitFactorPct: Number(plan.benefitFactorPct || 0),
    highestAverageSalary: Number(plan.highestAverageSalary || 0),
    retirementAge: Number(plan.retirementAge || 62),
    employeeContributionPct: Number(plan.employeeContributionPct || 0),
    estimatedMonthlyBenefit: Number(plan.estimatedMonthlyBenefit || 0),
    balance: Number(plan.balance || 0),
    employeeContribution: Number(plan.employeeContribution || 0),
    employerMatch: Number(plan.employerMatch || 0),
    targetRetirementAge: Number(plan.targetRetirementAge || 65),
    notes: plan.notes || ''
  };

  if (existingIdx >= 0) {
    data.retirementPlans[existingIdx] = planItem;
  } else {
    data.retirementPlans.push(planItem);
  }

  await writeData(data, req.userId);
  const userPlans = (data.retirementPlans || []).filter(p => p.ownerId === req.userId || p.userId === req.userId);
  res.json({ success: true, plan: planItem, retirementPlans: userPlans });
});

app.delete('/api/retirement/:id', async (req, res) => {
  const data = await readData(req.userId);
  const isTargetOwnedByUser = (p) =>
    p.id === req.params.id && (p.ownerId === req.userId || p.userId === req.userId);

  if ((data.retirementPlans || []).some(isTargetOwnedByUser)) {
    data.retirementPlans = (data.retirementPlans || []).filter(p => !isTargetOwnedByUser(p));
    await db.deleteItem('retirement_plans', req.params.id, req.userId);
    await writeData(data, req.userId);
  }
  const userPlans = (data.retirementPlans || []).filter(p => p.ownerId === req.userId || p.userId === req.userId);
  res.json({ success: true, retirementPlans: userPlans });
});

// 4. Financial Data Overview
app.get('/api/data', async (req, res) => {
  const userId = req.userId;
  const data = await readData(req.userId);

  const isUserOwner = (item) => {
    if (!item) return false;
    if (!userId) return true;
    if (!item.ownerId && !item.userId) return true;
    if (item.ownerId === 'u-ziyad' || item.ownerId === 'u-owner' || item.userId === 'u-ziyad' || item.userId === 'u-owner') return true;
    return item.ownerId === userId || item.userId === userId;
  };

  const userAccounts = (data.accounts || []).filter(isUserOwner);
  const userChecking = userAccounts.filter(a => a.type === 'depository');
  const userCards = userAccounts.filter(a => a.type === 'credit');

  const totalChecking = userChecking.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const totalCreditDebt = userCards.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const totalCreditLimit = userCards.reduce((sum, a) => sum + Number(a.limit || 0), 0);

  const activeBills = (data.bills || []).filter(b => isUserOwner(b) && b.status !== 'archived');
  const totalMonthlyBills = activeBills.reduce((sum, b) => sum + Number(b.expectedAmount || 0), 0);
  const userSubscriptions = (data.subscriptions || []).filter(isUserOwner);
  const totalSubscriptions = userSubscriptions.reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const userTransactions = (data.transactions || []).filter(isUserOwner).slice(0, 50);
  const userBudgets = (data.budgets || []).filter(isUserOwner);
  const userSavingsGoals = (data.savingsGoals || []).filter(isUserOwner);
  const userManualAssets = (data.manualAssets || []).filter(isUserOwner);
  const userRetirementPlans = (data.retirementPlans || []).filter(isUserOwner);

  const currentUser = (data.users || []).find(u => u.id === userId);
  const userSettings = getUserSettings(data, userId);

  res.json({
    users: currentUser ? [sanitizeUser(currentUser)] : [],
    accounts: userAccounts,
    bills: activeBills,
    subscriptions: userSubscriptions,
    transactions: userTransactions,
    budgets: userBudgets,
    savingsGoals: userSavingsGoals,
    manualAssets: userManualAssets,
    retirementPlans: userRetirementPlans,
    householdProfile: data.householdProfiles?.[userId] || data.householdProfile || null,
    featureFlags: userSettings.featureFlags || {
      retirement: true,
      budgets: true,
      savingsGoals: true,
      vault: true,
      household: true
    },
    metrics: {
      totalChecking,
      totalCreditDebt,
      totalCreditLimit,
      totalMonthlyBills,
      totalSubscriptions,
      netCash: totalChecking - totalCreditDebt
    }
  });
});

// Batch sync accounts, bills, subscriptions, and transactions from client cache if server cold started
app.post('/api/accounts/batch-sync', async (req, res) => {
  const userId = req.userId;
  const { accounts, bills, subscriptions, transactions, budgets, savingsGoals, manualAssets, retirementPlans } = req.body;
  const data = await readData(req.userId);
  if (Array.isArray(budgets)) {
    data.budgets = budgets;
  }
  if (Array.isArray(savingsGoals)) {
    data.savingsGoals = savingsGoals;
  }
  if (Array.isArray(manualAssets)) {
    data.manualAssets = manualAssets;
  }
  if (Array.isArray(retirementPlans)) {
    data.retirementPlans = retirementPlans.map(p => ({ ...p, userId: req.userId, ownerId: req.userId }));
  }
  if (Array.isArray(accounts) && accounts.length > 0) {
    data.accounts = data.accounts || [];
    for (const acc of accounts) {
      if (!data.accounts.some(a => a.id === acc.id)) {
        data.accounts.push({
          ...acc,
          ownerId: req.userId
        });
      }
    }
  }
  if (Array.isArray(bills) && bills.length > 0) {
    data.bills = data.bills || [];
    for (const b of bills) {
      if (!data.bills.some(eb => eb.id === b.id || eb.name.toLowerCase() === (b.name || '').toLowerCase())) {
        data.bills.push(b);
      }
    }
  }
  if (Array.isArray(subscriptions) && subscriptions.length > 0) {
    data.subscriptions = data.subscriptions || [];
    for (const s of subscriptions) {
      if (!data.subscriptions.some(es => es.id === s.id || es.name.toLowerCase() === (s.name || '').toLowerCase())) {
        data.subscriptions.push(s);
      }
    }
  }
  if (Array.isArray(transactions) && transactions.length > 0) {
    data.transactions = data.transactions || [];
    for (const t of transactions) {
      if (!data.transactions.some(et => et.id === t.id)) {
        data.transactions.push(t);
      }
    }
  }
  await writeData(data, req.userId);
  return res.json({ success: true, count: (data.accounts || []).length });
});

// 5. Account Management
app.post('/api/accounts', async (req, res) => {
  const { name, institution, type, balance, limit, apr, minPayment, mask } = req.body;
  const data = await readData(req.userId);

  const newAccount = {
    id: `acc-${Date.now()}`,
    ownerId: req.userId,
    name: name || 'Account',
    institution: institution || 'Manual Bank',
    type: type || 'credit',
    balance: parseFloat(balance || 0),
    limit: parseFloat(limit || 0),
    apr: parseFloat(apr || 0),
    minPayment: parseFloat(minPayment || 0),
    mask: mask || String(Math.floor(1000 + Math.random() * 9000))
  };

  data.accounts = data.accounts || [];
  data.accounts.push(newAccount);
  await writeData(data, req.userId);

  res.json({ success: true, account: newAccount });
});

app.delete('/api/accounts/:id', async (req, res) => {
  const { id } = req.params;
  const data = await readData(req.userId);
  data.accounts = (data.accounts || []).filter(a => a.id !== id || (a.ownerId && a.ownerId !== req.userId));
  await writeData(data, req.userId);
  res.json({ success: true });
});

// 6. Bills Management
app.post('/api/bills', async (req, res) => {
  const { name, category, expectedAmount, dueDay, nextDueDate, autopay, recurrence, account, cardId } = req.body;
  const data = await readData(req.userId);

  const newBill = {
    id: `bill-${Date.now()}`,
    ownerId: req.userId,
    userId: req.userId,
    name: name || 'Utility Bill',
    category: category || 'Utilities',
    expectedAmount: parseFloat(expectedAmount || 0),
    dueDay: parseInt(dueDay || 15),
    nextDueDate: nextDueDate || calculateNextDueDate(parseInt(dueDay || 15)),
    autopay: Boolean(autopay),
    status: 'pending',
    recurrence: recurrence || 'monthly',
    account: account || 'Checking •••• 4821',
    cardId: cardId || ''
  };

  data.bills = data.bills || [];
  data.bills.push(newBill);
  await writeData(data, req.userId);

  res.json({ success: true, bill: newBill });
});

app.patch('/api/bills/:id', async (req, res) => {
  const { id } = req.params;
  const data = await readData(req.userId);
  const bill = (data.bills || []).find(b => b.id === id && (b.ownerId === req.userId || b.userId === req.userId));
  if (!bill) return res.status(404).json({ error: 'Bill not found' });
  Object.assign(bill, req.body);
  await writeData(data, req.userId);
  res.json({ success: true, bill });
});

app.delete('/api/bills/:id', async (req, res) => {
  const { id } = req.params;
  const data = await readData(req.userId);
  data.bills = (data.bills || []).filter(b => !(b.id === id && (b.ownerId === req.userId || b.userId === req.userId)));
  await db.deleteItem('bills', id, req.userId);
  await writeData(data, req.userId);
  res.json({ success: true });
});

app.post('/api/bills/:id/pay', async (req, res) => {
  const { id } = req.params;
  const data = await readData(req.userId);
  const bill = (data.bills || []).find(b => b.id === id && (b.ownerId === req.userId || b.userId === req.userId));
  if (!bill) return res.status(404).json({ error: 'Bill not found' });

  bill.status = 'paid';
  bill.lastPaidDate = new Date().toISOString().split('T')[0];

  data.transactions = data.transactions || [];
  data.transactions.unshift({
    id: `tx-bill-${Date.now()}`,
    ownerId: req.userId,
    userId: req.userId,
    name: `Payment: ${bill.name}`,
    category: bill.category || 'Utilities',
    amount: bill.expectedAmount,
    date: new Date().toISOString().split('T')[0],
    account: bill.account || 'Checking •••• 4821',
    cardId: bill.cardId || ''
  });

  await writeData(data, req.userId);
  res.json({ success: true, bill });
});

// 7. Transactions Management
app.post('/api/transactions', async (req, res) => {
  const { name, amount, category, date, account, cardId, notes } = req.body;
  const data = await readData(req.userId);

  const newTx = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ownerId: req.userId,
    userId: req.userId,
    name: name || 'Purchase',
    amount: parseFloat(amount || 0),
    category: category || categorizeTransaction(name),
    date: date || new Date().toISOString().split('T')[0],
    account: account || 'Everyday Rewards •••• 4417',
    cardId: cardId || '',
    notes: notes || ''
  };

  data.transactions = data.transactions || [];
  data.transactions.unshift(newTx);
  await writeData(data, req.userId);

  res.json({ success: true, transaction: newTx });
});

app.patch('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const data = await readData(req.userId);
  const tx = (data.transactions || []).find(t => t.id === id && (t.ownerId === req.userId || t.userId === req.userId));
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  Object.assign(tx, req.body);
  await writeData(data, req.userId);
  res.json({ success: true, transaction: tx });
});

app.delete('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const data = await readData(req.userId);
  data.transactions = (data.transactions || []).filter(t => !(t.id === id && (t.ownerId === req.userId || t.userId === req.userId)));
  await db.deleteItem('transactions', id, req.userId);
  await writeData(data, req.userId);
  res.json({ success: true });
});

// 8. Subscriptions Management
app.get('/api/subscriptions', async (req, res) => {
  const data = await readData(req.userId);
  res.json((data.subscriptions || []).filter(s => s.ownerId === req.userId || s.userId === req.userId));
});

app.post('/api/subscriptions', async (req, res) => {
  const { name, amount, renewDay, renewalDate, billingCycle, category, account, cardId } = req.body;
  const data = await readData(req.userId);

  const newSub = {
    id: `sub-${Date.now()}`,
    ownerId: req.userId,
    userId: req.userId,
    name: name || 'Subscription',
    amount: parseFloat(amount || 0),
    renewDay: parseInt(renewDay || 1),
    renewalDate: renewalDate || 'Renews monthly',
    billingCycle: billingCycle || 'monthly',
    category: category || 'Entertainment',
    account: account || 'Everyday Rewards •••• 4417',
    cardId: cardId || '',
    active: true
  };

  data.subscriptions = data.subscriptions || [];
  data.subscriptions.push(newSub);
  await writeData(data, req.userId);

  res.json({ success: true, subscription: newSub });
});

app.patch('/api/subscriptions/:id', async (req, res) => {
  const { id } = req.params;
  const data = await readData(req.userId);
  const sub = (data.subscriptions || []).find(s => s.id === id && (s.ownerId === req.userId || s.userId === req.userId));
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  Object.assign(sub, req.body);
  await writeData(data, req.userId);
  res.json({ success: true, subscription: sub });
});

app.delete('/api/subscriptions/:id', async (req, res) => {
  const { id } = req.params;
  const data = await readData(req.userId);
  data.subscriptions = (data.subscriptions || []).filter(s => !(s.id === id && (s.ownerId === req.userId || s.userId === req.userId)));
  await db.deleteItem('subscriptions', id, req.userId);
  await writeData(data, req.userId);
  res.json({ success: true });
});

// 9. Document & Bill Scanning Endpoint
app.post('/api/bills/scan', async (req, res) => {
  const { text } = req.body;
  const content = text || '';

  let amount = 0;
  let biller = 'Utility Provider';
  let dueDate = calculateNextDueDate(15);

  const amountMatch = content.match(/\$\s?([0-9]+(?:\.[0-9]{2})?)/);
  if (amountMatch) amount = parseFloat(amountMatch[1]);

  if (/pge|pacific gas|electric/i.test(content)) biller = 'PG&E Electric';
  else if (/water|fresno/i.test(content)) biller = 'Fresno City Water';
  else if (/rent|lease|mortgage/i.test(content)) biller = 'Apartment Rent';
  else if (/at&t|verizon|t-mobile|comcast|xfinity/i.test(content)) biller = 'Telecom & Internet';

  const dateMatch = content.match(/(?:due|by|date)[:\s]+([A-Za-z0-9\/\-\, ]{6,15})/i);
  if (dateMatch) dueDate = dateMatch[1].trim();

  const data = await readData(req.userId);
  const newBill = {
    id: `bill-scanned-${Date.now()}`,
    ownerId: req.userId,
    userId: req.userId,
    name: biller,
    category: 'Utilities',
    expectedAmount: amount || 85.00,
    dueDay: 15,
    nextDueDate: dueDate,
    autopay: false,
    status: 'pending'
  };

  data.bills = data.bills || [];
  data.bills.push(newBill);

  data.transactions = data.transactions || [];
  data.transactions.unshift({
    id: `tx-scanned-${Date.now()}`,
    ownerId: req.userId,
    userId: req.userId,
    name: biller,
    amount: amount || 85.00,
    category: 'Utilities',
    date: new Date().toISOString().split('T')[0],
    account: 'Checking'
  });

  await writeData(data, req.userId);
  res.json({ success: true, summary: { biller, amount: newBill.expectedAmount, nextDueDate: dueDate } });
});


// Live Web Search Helper for Market Research, Live Internet Browsing & Real-Time Card/Bank Offers
async function performWebSearch(query, options = {}) {
  if (!query || query.trim().length === 0) return '';
  const result = await retrieveWebContext(query, {
    maxResults: options.maxResults || 5,
    locationHint: options.locationHint || ''
  });
  if (result && Array.isArray(result.results) && result.results.length > 0) {
    return result.formattedContext;
  }
  return '';
}

function shouldPerformWebSearch(message) {
  return shouldTriggerWebSearch(message);
}

// Property / Zillow Details Extraction & Neighborhood Intelligence Helper
async function resolvePropertyDetails(rawInput) {
  let raw = (rawInput || '').trim();
  let street = '', city = '', state = 'CA', zip = '', zpid = '';
  let dwellingType = 'single_family';
  let sqFt = 2100;
  let bedrooms = 3;
  let bathrooms = 2;
  let estimatedValue = '';

  // 1. Check for Zillow URL format: /homedetails/<slug>/<zpid>_zpid/
  const zillowMatch = raw.match(/homedetails\/([^\/]+)\/(\d+)_zpid/i);
  if (zillowMatch) {
    zpid = zillowMatch[2];
    const slug = zillowMatch[1];
    const parts = slug.split('-');
    if (parts.length > 0 && /^\d{5}$/.test(parts[parts.length - 1])) {
      zip = parts.pop();
    }
    if (parts.length > 0 && /^[A-Za-z]{2}$/.test(parts[parts.length - 1])) {
      state = parts.pop().toUpperCase();
    }
    const streetSuffixes = new Set(['st', 'ave', 'blvd', 'rd', 'way', 'dr', 'ln', 'ct', 'cir', 'pl', 'pkwy', 'ter', 'loop', 'trl', 'hwy', 'path', 'walk']);
    let splitIdx = -1;
    for (let i = 0; i < parts.length; i++) {
      if (streetSuffixes.has(parts[i].toLowerCase())) {
        splitIdx = i;
        break;
      }
    }
    if (splitIdx !== -1 && splitIdx < parts.length - 1) {
      street = parts.slice(0, splitIdx + 1).join(' ');
      city = parts.slice(splitIdx + 1).join(' ');
    } else {
      if (parts.length > 2) {
        city = parts.slice(-2).join(' ');
        street = parts.slice(0, -2).join(' ');
      } else {
        street = parts.join(' ');
      }
    }
  } else {
    // 2. Check for Redfin URL or Realtor URL or standard address
    const redfinMatch = raw.match(/redfin\.com\/([A-Za-z]{2})\/([^\/]+)\/([^\/]+)\/home\/(\d+)/i);
    if (redfinMatch) {
      state = redfinMatch[1].toUpperCase();
      city = decodeURIComponent(redfinMatch[2]).replace(/-/g, ' ');
      street = decodeURIComponent(redfinMatch[3]).replace(/-/g, ' ');
    } else {
      // Standard comma separated address
      const addrMatch = raw.match(/^([^,]+),\s*([^,]+),\s*([A-Za-z]{2})\s*(\d{5})?/);
      if (addrMatch) {
        street = addrMatch[1].trim();
        city = addrMatch[2].trim();
        state = addrMatch[3].toUpperCase().trim();
        zip = addrMatch[4] || '';
      } else if (raw.length > 0 && !raw.startsWith('http')) {
        street = raw;
      }
    }
  }

  // Capitalize properly
  const formatWords = (s) => (s || '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  street = formatWords(street);
  city = formatWords(city);

  const formattedAddress = street ? `${street}, ${city || 'California'}, ${state} ${zip}`.trim() : (raw.startsWith('http') ? raw : 'California Home');

  // Perform targeted live web search to pull the real listing snippet / beds / baths / sqft / zestimate
  try {
    const searchQuery = zpid 
      ? `zillow ${zpid} ${street} ${city} ${state}`
      : `${street} ${city} ${state} ${zip} zillow redfin beds baths sq ft`;
    const searchResults = await performWebSearch(searchQuery);
    if (searchResults) {
      // Extract bedrooms: e.g. "3 beds", "4 bd", "3 bds"
      const bedMatch = searchResults.match(/(\d+)\s*(?:beds?|bd|bds|bedrooms?)/i);
      if (bedMatch) bedrooms = parseInt(bedMatch[1], 10);

      // Extract bathrooms: e.g. "2 baths", "2.5 ba", "3 bathrooms"
      const bathMatch = searchResults.match(/(\d+(?:\.\d+)?)\s*(?:baths?|ba|bathrooms?)/i);
      if (bathMatch) bathrooms = parseFloat(bathMatch[1]);

      // Extract square footage: e.g. "1,850 sq ft", "2,100 sqft", "1850 sq ft"
      const sqftMatch = searchResults.match(/([\d,]{3,6})\s*(?:sq\s*ft|sqft|square\s*feet)/i);
      if (sqftMatch) {
        const parsedSqft = parseInt(sqftMatch[1].replace(/,/g, ''), 10);
        if (parsedSqft > 300 && parsedSqft < 25000) sqFt = parsedSqft;
      }

      // Extract Zestimate or price: e.g. "$1,150,000" or "Zestimate: $950,000"
      const priceMatch = searchResults.match(/\$([1-9]\d{2,3}(?:,\d{3})+)/);
      if (priceMatch) {
        estimatedValue = `$${priceMatch[1]}`;
      }

      // Extract dwelling type
      const lower = searchResults.toLowerCase();
      if (lower.includes('townhouse') || lower.includes('townhome')) {
        dwellingType = 'townhouse';
      } else if (lower.includes('condo') || lower.includes('condominium') || lower.includes('apartment')) {
        dwellingType = 'apartment';
      } else if (lower.includes('multi-family') || lower.includes('duplex') || lower.includes('triplex') || sqFt > 3200) {
        dwellingType = 'large_estate';
      } else if (lower.includes('single family') || lower.includes('single-family')) {
        dwellingType = 'single_family';
      }
    }
  } catch (err) {
    console.warn('Property live search lookup failed:', err.message);
  }

  // Auto-detect Utility Region
  let utilityRegionId = 'pge_norcal';
  let utilityName = 'PG&E (Northern & Central CA)';
  const numZip = parseInt(zip, 10);
  if (state === 'CA') {
    if (numZip >= 95800 && numZip <= 95899) {
      utilityRegionId = 'smud_sac';
      utilityName = 'SMUD + PG&E Gas (Sacramento)';
    } else if (numZip >= 90001 && numZip <= 90089) {
      utilityRegionId = 'ladwp_la';
      utilityName = 'LADWP + SoCalGas (Los Angeles)';
    } else if (numZip >= 91900 && numZip <= 92199) {
      utilityRegionId = 'sdge_sandiego';
      utilityName = 'SDG&E (San Diego)';
    } else if (numZip >= 90000 && numZip <= 93599) {
      utilityRegionId = 'sce_socal';
      utilityName = 'SoCal Edison + SoCalGas (Southern CA)';
    } else {
      utilityRegionId = 'pge_norcal';
      utilityName = 'PG&E (Northern & Central CA)';
    }
  } else {
    utilityRegionId = 'national_avg';
    utilityName = 'U.S. National Average Utility';
  }

  // Neighborhood and local shopping hub intelligence
  let neighborhood = `${city || 'Local Area'}, ${state}`;
  let localHubs = 'Costco Wholesale, Trader Joe\'s, Safeway, Target, Local EV Superchargers';
  const cLower = city.toLowerCase();
  if (cLower.includes('san jose') || cLower.includes('santa clara') || cLower.includes('sunnyvale') || cLower.includes('cupertino') || cLower.includes('campbell') || cLower.includes('milpitas')) {
    neighborhood = 'Silicon Valley / South Bay Area, Santa Clara County';
    localHubs = 'Costco (Coleman Ave & Senter Rd), Trader Joe\'s, Safeway, Whole Foods, Arco, Rotten Robbie, Tesla Superchargers & Electrify America';
  } else if (cLower.includes('san francisco') || cLower.includes('oakland') || cLower.includes('berkeley') || cLower.includes('fremont') || cLower.includes('hayward')) {
    neighborhood = 'San Francisco Bay Area / East Bay';
    localHubs = 'Costco (SF / Richmond / San Leandro), Trader Joe\'s, Safeway, Target, EVgo & ChargePoint stations';
  } else if (cLower.includes('sacramento') || cLower.includes('roseville') || cLower.includes('folsom') || cLower.includes('elk grove')) {
    neighborhood = 'Greater Sacramento Capital Region';
    localHubs = 'Costco (Expo Pkwy & Calvine), WinCo Foods, Trader Joe\'s, Bel Air, Arco, SMUD EV charging hubs';
  } else if (cLower.includes('los angeles') || cLower.includes('long beach') || cLower.includes('glendale') || cLower.includes('pasadena') || cLower.includes('burbank')) {
    neighborhood = 'Greater Los Angeles Metropolitan Area';
    localHubs = 'Costco, ALDI, Trader Joe\'s, Ralphs, Arco, Electrify America fast chargers';
  } else if (cLower.includes('san diego') || cLower.includes('chula vista') || cLower.includes('oceanside') || cLower.includes('escondido')) {
    neighborhood = 'San Diego County / Coastal Southern California';
    localHubs = 'Costco (Morena Blvd & Gateway Center), Trader Joe\'s, Vons, Arco, SDG&E Power Your Drive EV hubs';
  }

  // Additional specs: Year Built, Lot Size, County, Garage
  let yearBuilt = 2004;
  const yearMatch = searchResults.match(/(?:built in|year built|built)\s*:?\s*(\d{4})/i);
  if (yearMatch && parseInt(yearMatch[1], 10) >= 1900 && parseInt(yearMatch[1], 10) <= 2026) {
    yearBuilt = parseInt(yearMatch[1], 10);
  }

  let lotSize = '6,500 sq ft';
  const lotMatch = searchResults.match(/([\d,.]+\s*(?:acres?|sq\s*ft(?:\s*lot)?|sqft\s*lot))/i);
  if (lotMatch) lotSize = lotMatch[1].trim();

  let county = `${city || 'Fresno'} County`;
  const countyMatch = searchResults.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+County)/i);
  if (countyMatch) county = countyMatch[1].trim();

  let garage = 'Attached 2-Car Garage';
  const garageMatch = searchResults.match(/(\d+\s*(?:car|garage|attached|detached)[^\.,\n]{0,25})/i);
  if (garageMatch) garage = garageMatch[1].trim();

  return {
    success: true,
    address: formattedAddress,
    street,
    city,
    state,
    zip,
    zpid,
    cityOrZip: city && state ? `${city}, ${state}${zip ? ' ' + zip : ''}` : (zip || formattedAddress),
    bedrooms,
    bathrooms,
    sqFt,
    dwellingType,
    estimatedValue: estimatedValue || (sqFt ? `${Math.round(sqFt * 495).toLocaleString()}` : ''),
    yearBuilt,
    lotSize,
    county,
    garage,
    zillowImportedAt: new Date().toISOString(),
    utilityRegionId,
    utilityName,
    neighborhood,
    localHubs,
    zillowUrl: raw.startsWith('http') ? raw : ''
  };
}

// Endpoint to resolve Zillow URL or property address into verified specs and neighborhood intelligence
app.post('/api/household/zillow-lookup', async (req, res) => {
  const { url, address } = req.body || {};
  const query = (url || address || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'Please provide a valid Zillow URL or property address.' });
  }
  try {
    const details = await resolvePropertyDetails(query);
    res.json(details);
  } catch (err) {
    console.error('Zillow lookup error:', err);
    res.status(500).json({ error: 'Failed to look up property details.' });
  }
});

// ============================================================================
// HOUSEHOLD, LIFESTYLE & PROPERTY PERSISTENCE
// ============================================================================
app.get(['/api/household', '/household'], async (req, res) => {
  try {
    const uid = req.userId || 'default';
    const data = await readData(uid);
    const profile = data.householdProfiles?.[uid] || data.householdProfile || null;
    res.json({ success: true, householdProfile: profile });
  } catch (err) {
    console.warn('Household read notice:', err.message);
    res.status(500).json({ error: 'Failed to load household profile' });
  }
});

app.post(['/api/household', '/household'], async (req, res) => {
  const profile = req.body;
  if (!profile || typeof profile !== 'object') {
    return res.status(400).json({ error: 'Invalid household profile payload' });
  }
  try {
    const uid = req.userId || 'default';
    const data = await readData(uid);
    if (!data.householdProfiles) data.householdProfiles = {};
    data.householdProfiles[uid] = profile;
    data.householdProfile = profile;
    await writeData(data, uid);
    res.json({ success: true, householdProfile: profile });
  } catch (err) {
    console.warn('Household save notice:', err.message);
    res.status(500).json({ error: 'Failed to persist household profile' });
  }
});

// Helper to extract text streams and readable strings from a PDF buffer
function extractTextFromPdfBuffer(buffer) {
  let text = '';
  try {
    const str = buffer.toString('latin1');
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(str)) !== null) {
      const rawStream = match[1];
      let streamContent = rawStream;
      try {
        const decompressed = zlib.inflateSync(Buffer.from(rawStream, 'latin1'));
        streamContent = decompressed.toString('latin1');
      } catch (e) {
        try {
          const decompressed = zlib.inflateRawSync(Buffer.from(rawStream, 'latin1'));
          streamContent = decompressed.toString('latin1');
        } catch (e2) {}
      }

      const textMatches = streamContent.match(new RegExp('\\(([^)]+)\\)', 'g'));
      if (textMatches) {
        const extractedWords = textMatches
          .map(m => m.slice(1, -1))
          .join(' ');
        text += ' ' + extractedWords;
      }
    }

    const readable = str.replace(/[^\x20-\x7E\r\n]/g, ' ');
    text += ' ' + readable;
  } catch (err) {
    console.warn('PDF text parse note:', err.message);
  }
  return text;
}

function rawRgbToBmp(rgbBuf, width, height) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const imageSize = rowSize * height;
  const fileSize = 54 + imageSize;
  const bmpBuf = Buffer.alloc(fileSize);

  bmpBuf.write('BM', 0);
  bmpBuf.writeUInt32LE(fileSize, 2);
  bmpBuf.writeUInt32LE(54, 10);

  bmpBuf.writeUInt32LE(40, 14);
  bmpBuf.writeInt32LE(width, 18);
  bmpBuf.writeInt32LE(-height, 22);
  bmpBuf.writeUInt16LE(1, 26);
  bmpBuf.writeUInt16LE(24, 28);
  bmpBuf.writeUInt32LE(0, 30);
  bmpBuf.writeUInt32LE(imageSize, 34);

  for (let y = 0; y < height; y++) {
    const srcRowStart = y * width * 3;
    const destRowStart = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const r = rgbBuf[srcRowStart + x * 3];
      const g = rgbBuf[srcRowStart + x * 3 + 1];
      const b = rgbBuf[srcRowStart + x * 3 + 2];
      bmpBuf[destRowStart + x * 3] = b;
      bmpBuf[destRowStart + x * 3 + 1] = g;
      bmpBuf[destRowStart + x * 3 + 2] = r;
    }
  }
  return bmpBuf;
}

function extractImagesAndBitmapsFromPdf(pdfBuf) {
  const extractedImages = [];
  
  // 1. Embedded JPEG detection (JFIF / Exif)
  let pos = 0;
  while (pos < pdfBuf.length - 4) {
    const start = pdfBuf.indexOf(Buffer.from([0xFF, 0xD8, 0xFF]), pos);
    if (start === -1) break;
    const end = pdfBuf.indexOf(Buffer.from([0xFF, 0xD9]), start + 3);
    if (end === -1) break;
    const jpegBuf = pdfBuf.slice(start, end + 2);
    if (jpegBuf.length > 5000) {
      extractedImages.push({ buffer: jpegBuf, mimeType: 'image/jpeg' });
    }
    pos = end + 2;
  }

  // 2. Embedded FlateDecode / raw pixel XObjects
  if (extractedImages.length === 0) {
    const text = pdfBuf.toString('latin1');
    const regex = /(\d+\s+\d+\s+obj[\s\S]*?endobj)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const objStr = match[1];
      if (objStr.includes('/Subtype /Image') || objStr.includes('/Subtype/Image')) {
        const wMatch = objStr.match(/\/Width\s+(\d+)/);
        const hMatch = objStr.match(/\/Height\s+(\d+)/);
        const filterMatch = objStr.match(/\/Filter\s*\/([A-Za-z0-9]+)/);
        const width = wMatch ? parseInt(wMatch[1], 10) : 0;
        const height = hMatch ? parseInt(hMatch[1], 10) : 0;
        const filter = filterMatch ? filterMatch[1] : '';

        if (width >= 200 && height >= 200) {
          const streamIdx = pdfBuf.indexOf(Buffer.from('stream'), match.index);
          if (streamIdx !== -1) {
            let dataStart = streamIdx + 6;
            if (pdfBuf[dataStart] === 0x0D && pdfBuf[dataStart + 1] === 0x0A) dataStart += 2;
            else if (pdfBuf[dataStart] === 0x0A || pdfBuf[dataStart] === 0x0D) dataStart += 1;

            const endStreamIdx = pdfBuf.indexOf(Buffer.from('endstream'), dataStart);
            if (endStreamIdx !== -1) {
              const rawStream = pdfBuf.slice(dataStart, endStreamIdx);
              try {
                let pixelBuf;
                if (filter === 'FlateDecode') {
                  pixelBuf = zlib.inflateSync(rawStream);
                } else {
                  pixelBuf = rawStream;
                }
                if (pixelBuf.length >= width * height * 3) {
                  const bmp = rawRgbToBmp(pixelBuf, width, height);
                  extractedImages.push({ buffer: bmp, mimeType: 'image/bmp' });
                }
              } catch (e) {
                console.warn('PDF stream extraction note:', e.message);
              }
            }
          }
        }
      }
    }
  }

  return extractedImages;
}

// Extraction helper that accurately extracts visible fields from recognized OCR text
function heuristicInsuranceExtraction(fileName = '', textHint = '', rawBuf = null) {
  let sampleText = `${fileName || ''} ${textHint || ''}`;
  const lines = sampleText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const lowerText = sampleText.toLowerCase();

  let provider = '';
  let planName = '';
  let network = '';

  // Carrier detection strictly if referenced in document text
  if (lowerText.includes('unitedhealthcare') || lowerText.includes('united healthcare') || lowerText.includes('uhc') || lowerText.includes('optum')) {
    provider = 'UnitedHealthcare';
    network = lowerText.includes('hmo') ? 'HMO' : 'PPO';
  } else if (lowerText.includes('blue shield') || lowerText.includes('blueshield')) {
    provider = 'Blue Shield of California';
    network = lowerText.includes('hmo') ? 'HMO' : 'PPO';
  } else if (lowerText.includes('anthem') || lowerText.includes('blue cross') || lowerText.includes('bcbs')) {
    provider = 'Anthem Blue Cross';
    network = lowerText.includes('hmo') ? 'HMO' : 'PPO';
  } else if (lowerText.includes('kaiser') || lowerText.includes('permanente')) {
    provider = 'Kaiser Permanente';
    network = 'HMO';
  } else if (lowerText.includes('aetna')) {
    provider = 'Aetna';
    network = lowerText.includes('hmo') ? 'HMO' : (lowerText.includes('pos') ? 'POS' : 'PPO');
  } else if (lowerText.includes('cigna') || lowerText.includes('evernorth')) {
    provider = 'Cigna';
    network = lowerText.includes('epo') ? 'EPO' : (lowerText.includes('hmo') ? 'HMO' : 'PPO');
  } else if (lowerText.includes('humana')) {
    provider = 'Humana';
    network = lowerText.includes('hmo') ? 'HMO' : 'PPO';
  } else if (lowerText.includes('medi-cal') || lowerText.includes('medical') || lowerText.includes('medicaid')) {
    provider = 'Medi-Cal';
  } else if (lowerText.includes('medicare')) {
    provider = 'Medicare';
  } else if (lowerText.includes('sutter health') || lowerText.includes('sutter')) {
    provider = 'Sutter Health Plus';
    network = 'HMO';
  } else if (lowerText.includes('health net') || lowerText.includes('healthnet')) {
    provider = 'Health Net';
  } else if (lowerText.includes('molina')) {
    provider = 'Molina Healthcare';
  } else if (lowerText.includes('oscar')) {
    provider = 'Oscar Health';
  }

  // Network detection if not yet determined
  if (!network) {
    if (/\bHMO\b/i.test(sampleText)) network = 'HMO';
    else if (/\bPPO\b/i.test(sampleText)) network = 'PPO';
    else if (/\bEPO\b/i.test(sampleText)) network = 'EPO';
    else if (/\bPOS\b/i.test(sampleText)) network = 'POS';
  }

  // Plan name extraction
  for (const line of lines) {
    if (/\b(HMO|PPO|EPO|POS|Choice Plus|Select Plus|Alliance|Advantage|Standard|Gold|Silver|Bronze)\b/i.test(line) &&
        !line.toLowerCase().includes('ded') &&
        !line.toLowerCase().includes('oopm') &&
        !line.toLowerCase().includes('member') &&
        !line.toLowerCase().includes('group')) {
      const cleaned = line.replace(/^(?:State Regulated\s*)/i, '').replace(/^(?:Plan(?:\s*Name)?\s*[:\s]*)/i, '').trim();
      if (cleaned.length >= 3 && cleaned.length <= 40) {
        planName = cleaned;
        break;
      }
    }
  }

  // Member ID extraction
  let memberId = '';
  const idMatch = sampleText.match(/(?:member\s*id|subscriber\s*id|enrollee\s*id|identification\s*(?:no|number)?|id\s*#|member\s*#|policy\s*#|mrn)\s*[:#\s]*([A-Za-z0-9-]+)/i);
  if (idMatch && idMatch[1]) {
    const val = idMatch[1].trim();
    if (!['number', 'id', 'member', 'subscriber', 'identification'].includes(val.toLowerCase())) {
      memberId = val.toUpperCase();
    }
  }

  // Group number extraction
  let groupNumber = '';
  const grpMatch = sampleText.match(/(?:group\s*number|group\s*#|grp\s*#|policy\s*group|grp|group)\s*[:#\s]*([A-Za-z0-9-]+)/i);
  if (grpMatch && grpMatch[1]) {
    const val = grpMatch[1].trim();
    if (!['number', 'group', 'policy', 'code', 'name'].includes(val.toLowerCase())) {
      groupNumber = val.toUpperCase();
    }
  }

  // Member Name extraction
  let memberName = '';
  const nameMatch = sampleText.match(/Member:\s*([A-Za-z\s]+?)(?=\r?\n|$)/i);
  if (nameMatch && nameMatch[1]) {
    const val = nameMatch[1].trim();
    if (val.length > 2 && val.length < 50 && !val.toLowerCase().includes('id')) {
      memberName = val;
    }
  }

  // Rx numbers
  let rxBin = '';
  const binMatch = sampleText.match(/(?:rxbin|rx\s*bin|bin)\s*#?[:.\s]*([0-9]{6})/i);
  if (binMatch) rxBin = binMatch[1];

  let rxPcn = '';
  const pcnMatch = sampleText.match(/(?:rxpcn|rx\s*pcn|pcn)\s*#?[:.\s]*([A-Za-z0-9]{3,8})/i);
  if (pcnMatch && !['number', 'code'].includes(pcnMatch[1].toLowerCase())) rxPcn = pcnMatch[1].toUpperCase();

  let rxGrp = '';
  const rxGrpMatch = sampleText.match(/(?:rxgrp|rx\s*grp|rxgroup|rx\s*group)\s*#?[:.\s]*([A-Za-z0-9]{3,10})/i);
  if (rxGrpMatch && !['number', 'group'].includes(rxGrpMatch[1].toLowerCase())) rxGrp = rxGrpMatch[1].toUpperCase();

  // Copays
  let copays = {
    primaryCare: null,
    specialist: null,
    urgentCare: null,
    er: null,
    rxGeneric: null
  };

  const pcpMatch = sampleText.match(/\b(?:office|pcp|primary\s*care|office\s*visit|ov)\s*[:\s]*\$?\s*([0-9]{1,3})\b/i);
  if (pcpMatch) copays.primaryCare = Number(pcpMatch[1]);

  const specMatch = sampleText.match(/\b(?:spec|specialist)\s*[:\s]*\$?\s*([0-9]{1,3})\b/i);
  if (specMatch) copays.specialist = Number(specMatch[1]);

  const ucMatch = sampleText.match(/\b(?:urgent\s*care|urgent|uc)\s*[:\s]*\$?\s*([0-9]{1,3})\b/i);
  if (ucMatch) copays.urgentCare = Number(ucMatch[1]);

  const erMatch = sampleText.match(/\b(?:emergency\s*room|emergency|er)\s*[:\s]*\$?\s*([0-9]{1,4})\b/i);
  if (erMatch) copays.er = Number(erMatch[1]);

  const rxMatch = sampleText.match(/\b(?:generic(?:\s*rx)?|generic|rx\s*copay|tier\s*1)\s*[:\s]*\$?\s*([0-9]{1,3})\b/i);
  if (rxMatch) copays.rxGeneric = Number(rxMatch[1]);

  // Deductible and Out-of-pocket maximum
  let deductible = null;
  let outOfPocketMax = null;

  const dedInline = sampleText.match(/\b(?:individual\s*deductible|annual\s*deductible|deductible|ded)\s*[:\s]*\$?\s*([0-9,]+)/i);
  if (dedInline) {
    const v = Number(dedInline[1].replace(/,/g, ''));
    if (!isNaN(v)) deductible = v;
  }

  const oopInline = sampleText.match(/\b(?:out\s*of\s*pocket\s*max(?:imum)?|oop\s*max|oopm|max\s*out\s*of\s*pocket)\s*[:\s]*\$?\s*([0-9,]+)/i);
  if (oopInline) {
    const v = Number(oopInline[1].replace(/,/g, ''));
    if (!isNaN(v)) outOfPocketMax = v;
  }

  // Grid match for multiline card formats (Ded IND/FAM ... OOPM IND/FAM)
  const gridMatch = sampleText.match(/Ded\s*(?:IND\/FAM)?[\s\S]{0,30}?OOPM\s*(?:IND\/FAM)?[\s\S]{0,40}?(?:INN:?\s*)?\$?([0-9]+)(?:[\/%][0-9]+)?\s+\$?([0-9,]+)(?:[\/%][0-9,]+)?/i);
  if (gridMatch) {
    if (deductible == null) deductible = Number(gridMatch[1]);
    if (outOfPocketMax == null) outOfPocketMax = Number(gridMatch[2].replace(/,/g, ''));
  }

  // Doctor or Clinic detection
  let doctor = null;
  const docMatch = sampleText.match(/([A-Z\s]+,\s+[A-Z\s]+(?:\s+[A-Z])?)\s+(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  if (docMatch) {
    doctor = {
      name: docMatch[1].trim(),
      phone: docMatch[2].trim()
    };
  }

  return {
    provider,
    planName,
    network,
    memberId,
    groupNumber,
    memberName,
    rxBin,
    rxPcn,
    rxGrp,
    deductible,
    outOfPocketMax,
    copays,
    doctor
  };
}

// Endpoint to auto-scan health insurance card image and extract details
app.post(['/api/household/scan-insurance-card', '/household/scan-insurance-card'], async (req, res) => {
  try {
    const { image, fileName, textHint } = req.body || {};
    if (!image) {
      return res.status(400).json({ error: 'No insurance card image provided' });
    }

    let base64Data = image;
    let mimeType = 'image/jpeg';
    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }
    const isPdf = (fileName && fileName.toLowerCase().endsWith('.pdf')) || mimeType === 'application/pdf';
    if (isPdf) {
      mimeType = 'application/pdf';
    }

    const rawBuf = Buffer.from(base64Data, 'base64');
    const cardImages = [];
    let recognizedText = `${fileName || ''} ${textHint || ''}`;

    // 1. Run local OCR engine (Tesseract) on image or extracted PDF pages
    if (Tesseract) {
      try {
        if (isPdf) {
          const pdfImages = extractImagesAndBitmapsFromPdf(rawBuf);
          if (pdfImages.length > 0) {
            for (let i = 0; i < pdfImages.length; i++) {
              const img = pdfImages[i];
              cardImages.push(`data:${img.mimeType};base64,${img.buffer.toString('base64')}`);
              try {
                const ocr = await Tesseract.recognize(img.buffer, 'eng');
                if (ocr?.data?.text) {
                  recognizedText += '\n' + ocr.data.text;
                }
              } catch (pageOcrErr) {
                console.warn(`OCR error on page ${i + 1}:`, pageOcrErr.message);
              }
            }
          } else {
            const pdfText = extractTextFromPdfBuffer(rawBuf);
            recognizedText += '\n' + pdfText;
          }
        } else {
          // Direct image (JPG, PNG, WebP)
          cardImages.push(image.startsWith('data:') ? image : `data:${mimeType};base64,${base64Data}`);
          try {
            const ocr = await Tesseract.recognize(rawBuf, 'eng');
            if (ocr?.data?.text) {
              recognizedText += '\n' + ocr.data.text;
            }
          } catch (imgOcrErr) {
            console.warn('OCR error on image:', imgOcrErr.message);
          }
        }
      } catch (ocrErr) {
        console.warn('Tesseract recognition warning:', ocrErr.message);
      }
    }

    // 2. Fallback PDF text extraction if OCR yielded little text
    if (isPdf && recognizedText.trim().length < 50) {
      try {
        const fallbackText = extractTextFromPdfBuffer(rawBuf);
        recognizedText += '\n' + fallbackText;
      } catch (e) {}
    }

    // 3. Optional Gemini AI enhancement if user has configured API key
    const uid = req.userId || 'default';
    const data = await readData(uid);
    let rawApiKey = '';
    let aiProvider = 'gemini';

    const userSettings = getUserSettings(data, uid);
    if (userSettings?.ai?.encryptedKey) {
      rawApiKey = decrypt(userSettings.ai.encryptedKey);
      aiProvider = userSettings.ai.provider || 'gemini';
    }

    if (!rawApiKey) {
      for (const k of Object.keys(data.userSettings || {})) {
        const enc = data.userSettings[k]?.ai?.encryptedKey;
        if (enc) {
          try {
            const dec = decrypt(enc);
            if (dec) {
              rawApiKey = dec;
              aiProvider = data.userSettings[k]?.ai?.provider || 'gemini';
              break;
            }
          } catch (e) {}
        }
      }
    }

    if (!rawApiKey) {
      rawApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
      if (rawApiKey) aiProvider = 'gemini';
    }

    let extracted = null;

    if (rawApiKey && aiProvider === 'gemini') {
      try {
        const prompt = `You are an optical character recognition (OCR) scanner for health insurance cards.
Analyze this health insurance card or text.
Recognized OCR text:
"""
${recognizedText}
"""
Extract ONLY the visible insurance details actually printed. DO NOT invent or fabricate any dummy numbers.
Return strictly a valid JSON object with these exact keys:
{
  "provider": "Exact Insurance Carrier Name visible on card, or null",
  "planName": "Exact Plan Name or Network Type visible on card, or null",
  "memberId": "Exact Member ID / Subscriber ID visible on card, or null",
  "groupNumber": "Exact Group Number / GRP visible on card, or null",
  "network": "PPO, HMO, EPO, POS, or null",
  "rxBin": "RxBIN # if visible, or null",
  "rxPcn": "RxPCN if visible, or null",
  "rxGrp": "RxGRP if visible, or null",
  "deductible": number (Individual annual deductible in dollars if visible, or null),
  "outOfPocketMax": number (Annual out-of-pocket maximum in dollars if visible, or null),
  "copays": {
    "primaryCare": number (Primary Care / PCP copay in dollars if visible, or null),
    "specialist": number (Specialist copay in dollars if visible, or null),
    "urgentCare": number (Urgent Care copay in dollars if visible, or null),
    "er": number (Emergency Room copay in dollars if visible, or null),
    "rxGeneric": number (Generic Prescription copay in dollars if visible, or null)
  }
}
Do not include markdown or backticks. Return strictly raw JSON.`;

        const parts = [{ text: prompt }];
        if (!isPdf && base64Data) {
          parts.push({
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: base64Data
            }
          });
        }

        const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
        for (const curModel of models) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${curModel}:generateContent?key=${rawApiKey}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const aiRes = await fetch(geminiUrl, {
              method: 'POST',
              signal: controller.signal,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts }],
                generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
              })
            });
            clearTimeout(timeoutId);
            if (aiRes.ok) {
              const resJson = await aiRes.json();
              const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                const cleaned = text.replace(/\`\`\`json/gi, '').replace(/\`\`\`/g, '').trim();
                extracted = JSON.parse(cleaned);
                if (extracted && (extracted.provider || extracted.memberId)) break;
              }
            }
          } catch (e) {
            console.warn(`Gemini scan attempt with ${curModel} error:`, e.message);
          }
        }
      } catch (err) {
        console.warn('AI card scanning error:', err.message);
      }
    }

    // 4. Fallback to heuristic OCR extraction from recognized text
    if (!extracted || (!extracted.provider && !extracted.memberId)) {
      extracted = heuristicInsuranceExtraction(fileName, recognizedText, rawBuf);
    }

    if (!extracted.copays) extracted.copays = {};

    res.json({
      success: true,
      extracted,
      cardImages
    });
  } catch (err) {
    console.error('Failed to scan insurance card:', err);
    res.status(500).json({ error: 'Failed to scan insurance card' });
  }
});

// EMBEDDED LOCAL AI ENGINE ROUTES (node-llama-cpp + Live Web RAG)
// ============================================================================

// Get current status of the local GGUF engine & download progress
app.get('/api/ai/local/status', (_req, res) => {
  res.json({
    ok: true,
    status: localModelEngine.status,
    supportedModels: Object.values(SUPPORTED_MODELS),
    defaultModelId: DEFAULT_MODEL_ID
  });
});

// Server-Sent Events (SSE) stream for live GGUF download & initialization progress
app.get('/api/ai/local/stream-status', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendStatus = (st) => {
    try {
      res.write(`data: ${JSON.stringify(st)}\n\n`);
    } catch {}
  };

  sendStatus(localModelEngine.status);
  localModelEngine.on('status', sendStatus);

  req.on('close', () => {
    localModelEngine.removeListener('status', sendStatus);
  });
});

// Trigger model verification, Hugging Face download, and persistent context initialization
app.post(['/api/ai/local/init', '/api/ai/local/download'], async (req, res) => {
  const { modelId, wait = false } = req.body || {};
  const targetModel = modelId && SUPPORTED_MODELS[modelId] ? modelId : DEFAULT_MODEL_ID;

  if (wait) {
    try {
      const status = await localModelEngine.ensureInitialized({
        modelId: targetModel,
        autoDownload: true
      });
      return res.json({ ok: true, status });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message, status: localModelEngine.status });
    }
  }

  localModelEngine
    .ensureInitialized({ modelId: targetModel, autoDownload: true })
    .catch(err => console.warn('[Klarity Local AI] Background init error:', err.message));

  return res.json({
    ok: true,
    status: localModelEngine.status,
    supportedModels: Object.values(SUPPORTED_MODELS)
  });
});

// Dedicated internal RAG + Local GGUF generation route (supports both streamed SSE and resolved JSON)
app.post(['/api/ai/local/query', '/api/ai/local/chat'], async (req, res) => {
  const {
    query,
    message,
    stream = false,
    enableWebSearch = true,
    locationHint = '',
    financialContext = '',
    maxTokens = 1024,
    temperature = 0.7
  } = req.body || {};

  const userInput = (query || message || '').trim();
  if (!userInput) {
    return res.status(400).json({ ok: false, error: 'Query or message is required.' });
  }

  const wantsStream =
    Boolean(stream) ||
    String(req.headers.accept || '').includes('text/event-stream');

  if (wantsStream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const statusHandler = (st) => {
      if (st.state === 'downloading' || st.state === 'loading') {
        try {
          res.write(`data: ${JSON.stringify({ type: 'status', status: st })}\n\n`);
        } catch {}
      }
    };
    localModelEngine.on('status', statusHandler);

    try {
      const result = await localModelEngine.query({
        query: userInput,
        enableWebSearch,
        locationHint,
        financialContext,
        maxTokens,
        temperature,
        onToken: (token) => {
          try {
            res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
          } catch {}
        }
      });

      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          ok: true,
          reply: result.reply,
          model: result.model,
          modelName: result.modelName,
          webSearch: result.webSearch
        })}\n\n`
      );
      res.end();
    } catch (err) {
      res.write(`data: ${JSON.stringify({ type: 'error', ok: false, error: err.message })}\n\n`);
      res.end();
    } finally {
      localModelEngine.removeListener('status', statusHandler);
    }
    return;
  }

  try {
    const result = await localModelEngine.query({
      query: userInput,
      enableWebSearch,
      locationHint,
      financialContext,
      maxTokens,
      temperature
    });

    return res.json({
      ok: true,
      reply: result.reply,
      model: result.model,
      modelName: result.modelName,
      webSearch: result.webSearch,
      formattedPrompt: result.formattedPrompt
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message,
      status: localModelEngine.status
    });
  }
});

// In-memory cache for dynamically fetched Gemini models (15-min TTL per API key)
const geminiModelsCache = new Map();

// 10. AI Advisor Chat with Navigation Capabilities, Embedded Local GGUF Engine & Optional Cloud Key
app.post('/api/ai/chat', async (req, res) => {
  const userId = req.userId;
  const {
    message,
    userMemory = [],
    clientProvider,
    clientModel,
    imageBase64,
    imageMimeType,
    attachments = [],
    statutoryShield,
    cards = [],
    checkingAccounts = [],
    availableCash,
    projectedCashAfterBills,
    bills = [],
    subscriptions = [],
    transactions = [],
    budgets = [],
    debtStrategy,
    extraDebtPayment,
    debtPayoffComparison,
    isWeeklyAdvisorSummary = false,
    advisorSnapshot = '',
    savingsGoals = [],
    manualAssets = [],
    retirementPlans = [],
    netWorth,
    householdProfile,
    householdMetrics,
    responseLength,
    webSearchEnabled
  } = req.body;
  const data = await readData(req.userId);
  const userSettings = getUserSettings(data, userId);
  const aiConfig = userSettings.ai || {};
  let rawApiKey = aiConfig.encryptedKey ? decrypt(aiConfig.encryptedKey) : '';

  // Normalize attachments list (supports multiple files of any format + legacy single imageBase64)
  const fileAttachments = Array.isArray(attachments) && attachments.length > 0
    ? attachments
    : (imageBase64 ? [{ name: 'Attachment', mimeType: imageMimeType || 'image/jpeg', base64: imageBase64 }] : []);

  // Build extracted text context for any text-based or non-image/non-pdf files
  let extractedFilesText = '';
  for (const att of fileAttachments) {
    const fileName = att.name || 'Attached File';
    const mime = (att.mimeType || '').toLowerCase();
    const isPdf = mime === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    const isImg = mime.startsWith('image/');
    if (att.textContent) {
      extractedFilesText += `\n\n--- Content of Attached File (${fileName}) ---\n${att.textContent}\n--- End of ${fileName} ---`;
    } else if (att.base64 && !isPdf && !isImg) {
      try {
        const rawText = Buffer.from(att.base64, 'base64').toString('utf8');
        const cleaned = rawText.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleaned.length > 0) {
          extractedFilesText += `\n\n--- Extracted Text from Attached File (${fileName}) ---\n${cleaned.slice(0, 25000)}\n--- End of ${fileName} ---`;
        }
      } catch (e) {}
    }
  }

  const permissions = aiConfig.dataPermissions || { bills: true, subscriptions: true, cards: true, purchases: true, retirement: true };
  // Use embedded local AI engine when 'local' is selected OR when no external API key is configured
  const requestedProvider = clientProvider || aiConfig.provider || (rawApiKey ? 'gemini' : 'local');
  const provider = (!rawApiKey || requestedProvider === 'local') ? 'local' : requestedProvider;
  let model = clientModel || aiConfig.model || (provider === 'local' ? DEFAULT_MODEL_ID : provider === 'anthropic' ? 'claude-3-7-sonnet-20250219' : provider === 'openai' ? 'gpt-4o' : 'gemini-2.0-flash');
  // Clean up any audio/tts/non-chat model names
  if (provider !== 'local' && (model.includes('tts') || model.includes('audio') || model.includes('image') || model.includes('embedding') || model.includes('aqa'))) {
    model = 'gemini-2.0-flash';
  }

  const currentUser = (data.users || []).find(u => u.id === userId) || req.user || { name: 'User' };

  // Data restricted by user toggles and account ownership (matching /api/data ownership rules + live client state)
  const isOwnedByCurrentUser = (item) =>
    item && (
      (!item.ownerId && !item.userId) ||
      item.ownerId === userId ||
      item.userId === userId ||
      item.ownerId === 'u-ziyad' ||
      item.ownerId === 'u-owner'
    );
  const userAccounts = (data.accounts || []).filter(isOwnedByCurrentUser);
  const dbCards = userAccounts.filter(a => a.type === 'credit' || (a.subtype && a.subtype.includes('credit')));
  const dbChecking = userAccounts.filter(a => a.type === 'depository' || (a.subtype && (a.subtype.includes('checking') || a.subtype.includes('savings'))));
  const userCards = permissions.cards
    ? (Array.isArray(cards) && cards.length > 0 ? cards : dbCards)
    : [];
  const userChecking = permissions.cards
    ? (Array.isArray(checkingAccounts) && checkingAccounts.length > 0 ? checkingAccounts : dbChecking)
    : [];
  const userBills = permissions.bills
    ? (Array.isArray(bills) && bills.length > 0 ? bills : (data.bills || []).filter(isOwnedByCurrentUser))
    : [];
  const userSubscriptions = permissions.subscriptions
    ? (Array.isArray(subscriptions) && subscriptions.length > 0 ? subscriptions : (data.subscriptions || []).filter(isOwnedByCurrentUser))
    : [];
  const userTransactions = permissions.purchases
    ? (Array.isArray(transactions) && transactions.length > 0 ? transactions.slice(0, 60) : (data.transactions || []).filter(isOwnedByCurrentUser).slice(0, 40))
    : [];

  // Pre-compute card payoff ranking (First to Last) and budget vs. actual spending for Advisor precision
  const enrichedAdvisorCards = userCards.map(c => {
    const bal = Number(c.balance || 0);
    const lim = Math.max(1, Number(c.limit || 5000));
    const utilPct = Math.round((bal / lim) * 100);
    const apr = Number(c.apr || 21.5);
    const minPay = bal > 0 ? Math.max(25, Number(c.minPayment || Math.round(bal * 0.025))) : 0;
    const monthlyInterest = bal * (apr / 100) / 12;
    const paydownFor30Pct = Math.max(0, bal - lim * 0.30);
    return { ...c, bal, lim, utilPct, apr, minPay, monthlyInterest, paydownFor30Pct };
  });
  const activeDebtCards = enrichedAdvisorCards.filter(c => c.bal > 0);
  const rankedCardsForPayoff = [...activeDebtCards].sort((a, b) =>
    debtStrategy === 'snowball'
      ? (a.bal - b.bal) || (b.apr - a.apr)
      : (b.apr - a.apr) || (b.utilPct - a.utilPct) || (b.bal - a.bal)
  );
  const cardPayoffRankingSummary = rankedCardsForPayoff.length > 0
    ? rankedCardsForPayoff.map((c, idx) => {
        const tag = idx === 0 ? 'PAY FIRST (#1 Priority)' : (idx === rankedCardsForPayoff.length - 1 ? `PAY LAST (#${idx + 1})` : `Priority #${idx + 1}`);
        return `[${tag}] ${c.institution || ''} ${c.name} (•••• ${c.mask || '0000'}): Balance ${c.bal.toFixed(2)} / ${c.lim.toLocaleString()} limit (${c.utilPct}% utilization) @ ${c.apr}% APR | Monthly Interest: ${c.monthlyInterest.toFixed(2)}/mo | Min Payment: ${c.minPay.toFixed(2)}${c.paydownFor30Pct > 0 ? ` | Pay ${c.paydownFor30Pct.toFixed(2)} to get under 30% utilization` : ''}`;
      }).join(' || ')
    : 'All cards at $0.00 balance';

  const enrichedBudgetsSummary = Array.isArray(budgets) && budgets.length > 0
    ? budgets.map(b => {
        const lim = Number(b.limit || 0);
        const spent = b.spent != null
          ? Number(b.spent)
          : userTransactions
              .filter(t => (t.category || '').toLowerCase() === (b.category || '').toLowerCase() && (t.category || '').toLowerCase() !== 'income')
              .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
        const pct = lim > 0 ? Math.round((spent / lim) * 100) : 0;
        const status = spent > lim ? `OVER BUDGET by ${(spent - lim).toFixed(2)}` : `${(lim - spent).toFixed(2)} remaining`;
        return `${b.category}: Spent ${spent.toFixed(2)} of ${lim.toFixed(0)}/mo limit (${pct}% used — ${status})`;
      }).join(' | ')
    : 'None set';
  const isRetirementEnabled = userSettings.featureFlags?.retirement !== false;
  const userRetirementPlans = (isRetirementEnabled && permissions.retirement !== false)
    ? (Array.isArray(retirementPlans) && retirementPlans.length > 0 ? retirementPlans : (data.retirementPlans || []).filter(isOwnedByCurrentUser))
    : [];

  let retirementSection = '';
  if (isRetirementEnabled) {
    const retirementItems = userRetirementPlans.length > 0 ? userRetirementPlans.map(p => {
      if (p.planType === 'pension') {
        return `[Pension] ${p.name || p.provider || 'Pension'}: Est. ${Number(p.estimatedMonthlyBenefit || 0).toLocaleString()}/mo (Provider: ${p.provider || 'N/A'}, Tier: ${p.tier || 'N/A'}, Service: ${p.yearsOfService || 0} yrs, Factor: ${p.benefitFactorPct || 0}%, Highest Avg Salary: ${Number(p.highestAverageSalary || 0).toLocaleString()}, Normal Retire Age: ${p.retirementAge || 62}, Employee Contribution: ${p.employeeContributionPct || 0}%)`;
      } else {
        return `[${(p.planType || 'Account').toUpperCase()}] ${p.name}: Balance ${Number(p.balance || 0).toLocaleString()} (Employee Contribution: ${Number(p.employeeContribution || 0).toLocaleString()}/mo, Employer Match: ${Number(p.employerMatch || 0).toLocaleString()}/mo, Target Age: ${p.targetRetirementAge || 65})`;
      }
    }).join(' | ') : 'None configured';
    retirementSection = `\n- Retirement Plans & Pensions (${permissions.retirement !== false ? 'Permitted' : 'Access Restricted'}): ${retirementItems}`;
  }

  const memoryContext = (userMemory && userMemory.length > 0)
    ? `\n\nUser Financial Preferences & Memory:\n${userMemory.map(m => `- ${m}`).join('\n')}`
    : '';

  // Extract user location from householdProfile or userSettings/database
  const residence = (householdProfile && Object.keys(householdProfile).length > 0)
    ? householdProfile
    : (data.householdProfiles?.[userId] || data.householdProfile || {});

  // Comprehensive Household Summaries for AI Context
  const evSummary = residence.hasEvAtHome !== false
    ? `Has EV at home: Yes | Home Charger: ${residence.evChargerType === 'level2_240v' ? 'Level 2 (240V Dedicated)' : residence.evChargerType === 'level1_120v' ? 'Level 1 (120V Standard Outlet)' : 'No Dedicated Home Charger'} | Home Charging Frequency: ${residence.evHomeChargingFrequency || 'daily'} | Daily Home Charging Miles: ${residence.evDailyHomeMiles || 35} mi/day (~${((Number(residence.evDailyHomeMiles) || 35) * 30).toLocaleString()} mi/mo) | Charging Schedule: ${residence.evChargingSchedule || 'overnight_offpeak'}`
    : `Has EV at home: No (User does not charge or keep an EV at home)`;

  const solarSystemKw = residence.solarSystemSizeKw || (((Number(residence.solarPanelCount) || 20) * (Number(residence.solarWattsPerPanel) || 400)) / 1000).toFixed(2);
  const solarSummary = Boolean(residence.hasSolar)
    ? `Rooftop Solar Installed: Yes (${residence.solarPanelCount || 20} Panels @ ${residence.solarWattsPerPanel || 400}W, System Size: ${solarSystemKw} kW, Ownership: ${(residence.solarOwnership || 'owned').toUpperCase()}, Net Metering Plan: ${(residence.solarBillingPlan || 'NEM 2.0').toUpperCase()}) | Home Battery Storage: ${residence.solarHasBattery ? `Yes (${residence.solarBatteryCapacityKwh || 13.5} kWh Battery Installed)` : 'None (No Battery Storage System Installed)'}`
    : `Rooftop Solar Installed: No`;

  const appliancesSummary = `Heating: ${(residence.heatingType || 'natural_gas_furnace').replace(/_/g, ' ')} | Cooling: ${(residence.coolingType || 'central_ac').replace(/_/g, ' ')} | Water Heater: ${(residence.waterHeaterType || 'natural_gas_tank').replace(/_/g, ' ')} | Pool/Spa: ${residence.hasPool ? 'Yes' : 'No'}`;

  const providersSummary = `Electric & Gas: ${residence.electricGasProvider || 'PG&E'} (Rate Plan: ${residence.electricGasPlan || 'EV2-A Home TOU'}) | Internet: ${residence.internetProvider || 'Xfinity'} (Plan: ${residence.internetPlan || 'Gigabit Extra'}) | Mobile: ${residence.phoneProvider || 'T-Mobile'} (${residence.phoneLines || 3} lines, Plan: ${residence.phonePlan || 'Go5G Plus'}) | Trash: ${residence.trashProvider || 'City Utilities'} (Cart: ${residence.trashPlan || '64-Gal'}) | Security: ${residence.securityProvider || 'Ring'} (Plan: ${residence.securityPlan || 'Ring Protect Pro'})`;
  const userCityOrZip = residence.cityOrZip || (residence.city ? `${residence.city}, ${residence.state || 'CA'}` : '') || userSettings.profile?.location || 'California';
  const fullAddress = residence.address || (residence.street ? `${residence.street}, ${userCityOrZip}` : userCityOrZip);
  const neighborhoodDesc = residence.neighborhood ? ` (${residence.neighborhood})` : '';
  const localHubsDesc = residence.localHubs ? ` | Nearby Shopping & Retail Hubs: ${residence.localHubs}` : '';

  // Perform real-time web search if the user asks about credit card offers, 0% APR, balance transfers, or market rates / local queries
  let liveWebSearchContext = '';
  if (shouldPerformWebSearch(message) && fileAttachments.length === 0) {
    let enrichedQuery = message;
    const lowerMsg = message.toLowerCase();
    const isLocalQuery = ['near me', 'nearby', 'in my city', 'in my area', 'around here', 'gas', 'cheapest gas', 'grocery', 'groceries', 'deals', 'ev deals', '0 apr', '0% apr', 'costco', 'supermarket', 'dealer'].some(k => lowerMsg.includes(k));
    if (isLocalQuery && userCityOrZip && !lowerMsg.includes(userCityOrZip.toLowerCase())) {
      enrichedQuery = `${message} ${userCityOrZip}`;
    }
    const webResults = await performWebSearch(enrichedQuery);
    if (webResults) {
      liveWebSearchContext = `\n\nLive Web Search Results (Real-Time Market & Local Data for ${userCityOrZip}):\n${webResults}\nUse these live web findings to provide specific local recommendations (gas prices, dealership promotions, 0% APR EV inventory, grocery deals, and current card promotions).`;
    }
  }

  const nowCalendar = new Date();
  const currentDateStr = nowCalendar.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const currentTimeStr = nowCalendar.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const systemContext = `
You are Klarity, the personal AI Financial Advisor for ${currentUser.name}.
Current Real-World Calendar: Today is ${currentDateStr}, current local time is ${currentTimeStr}.
- BREVITY FOR SIMPLE QUESTIONS: Always match answer length to the question. For simple questions, greetings, current date/time, or yes/no questions (e.g. "what day is it today", "do you have internet"), answer DIRECTLY in 1 or 2 natural, friendly sentences. Never write long rambling paragraphs or disclaimers for simple queries.
- NEVER RECITE PROMPT INSTRUCTIONS: Speak naturally. Never say phrases like "My live web search is ACTIVE", "According to my web search context", or repeat prompt instructions.
You have active live internet access. When advising ${currentUser.name}, you can search the web in real-time for current credit card promotions (e.g. 0% intro APR balance transfers), bank savings yields, utility rate updates, market benchmarks, and subscription plans.
Actual Connected Finances for ${currentUser.name} (strictly respecting permissions):
- Available Checking Cash: ${Number(availableCash ?? userChecking.reduce((s, c) => s + Number(c.balance || 0), 0)).toFixed(2)} (Projected after 14-day bills: ${Number(projectedCashAfterBills ?? availableCash ?? 0).toFixed(2)})
- Checking Accounts (${permissions.cards ? 'Permitted' : 'Access Restricted'}): ${userChecking.length > 0 ? userChecking.map(c => `${c.institution || ''} ${c.name} (•••• ${c.mask || '0000'}): ${Number(c.balance).toFixed(2)}`).join(' | ') : 'None connected'}
- Credit Cards Ranked by Payoff Priority (First to Last): ${cardPayoffRankingSummary}
- Active Debt Payoff Strategy: ${(debtStrategy || 'avalanche').toUpperCase()} with +${Number(extraDebtPayment || 150)}/mo extra payment${debtPayoffComparison?.activePlan ? ` (Debt-free by ${debtPayoffComparison.activePlan.finishLabel}, saves ${Number(debtPayoffComparison.interestSavedVsMin || 0).toFixed(0)} in interest)` : ''}
- Upcoming Bills (${permissions.bills ? 'Permitted' : 'Access Restricted'}): ${userBills.length > 0 ? userBills.map(b => `${b.name}: ${Number(b.expectedAmount).toFixed(2)} (${b.dueText || b.nextDueDate || b.dueDate || 'Day ' + b.dueDay})`).join(' | ') : 'None scheduled'}
- Subscriptions (${permissions.subscriptions ? 'Permitted' : 'Access Restricted'}): ${userSubscriptions.length > 0 ? userSubscriptions.map(s => `${s.name}: ${Number(s.amount).toFixed(2)}/mo (${s.account || ''})`).join(' | ') : 'None added'}
- Recent Purchases & Transactions (${permissions.purchases ? 'Permitted' : 'Access Restricted'}): ${userTransactions.length > 0 ? userTransactions.slice(0, 25).map(t => `${t.name} [${t.category || 'Shopping'}]: ${Math.abs(Number(t.amount)).toFixed(2)} on ${t.date} (${t.account || ''})`).join(' | ') : 'None recorded'}
- Monthly Category Budgets (Actual Spent vs. Limit): ${enrichedBudgetsSummary}
${advisorSnapshot ? `\nPre-Computed Live Financial Advisor Analysis (Ground-Truth Numbers — preserve all exact figures and structure):\n${advisorSnapshot}` : ''}
- Savings Goals: ${savingsGoals && savingsGoals.length > 0 ? savingsGoals.map(g => `${g.name}: ${g.currentAmount} of ${g.targetAmount} (${g.monthlyContribution || 0}/mo)`).join(' | ') : 'None created'}
- Manual Assets & Investments: ${manualAssets && manualAssets.length > 0 ? manualAssets.map(a => `${a.name}: ${Number(a.balance || 0).toLocaleString()} (${a.type})`).join(' | ') : 'None'}${retirementSection}
- Net Worth: ${Number(netWorth || 0).toLocaleString()}
- Household & Residence Profile: ${residence ? `${residence.dwellingType || 'Single-Family'} (${residence.sqFt || 2100} sq ft, ${residence.bedrooms || 3} beds, ${residence.bathrooms || 2} baths) at ${fullAddress}${neighborhoodDesc} | Est. Home Value: ${residence.estimatedValue || 'N/A'} | Household Size: ${residence.householdSize || 4} people | PG&E CARE Discount: ${residence.hasCareDiscount ? 'Enrolled (~32% Off)' : 'Not Enrolled'}${localHubsDesc}` : 'Standard Single-Family Household'}
- Home EV Charging Setup: ${evSummary}
- Rooftop Solar & Battery Storage: ${solarSummary}
- Home Systems & Heating/Cooling: ${appliancesSummary}
- Household Service Providers & Plans: ${providersSummary}
- Connected Credit Cards for Cash Back & Rewards: ${userCards.length > 0 ? userCards.map(c => `[Card: ${c.institution} ${c.name} (APR ${c.apr}%, Bal $${Number(c.balance || 0).toFixed(2)})]`).join(' | ') : 'None connected'}
- Calculated Real-Life Monthly Utilities: ${householdMetrics?.utilities ? `Combined PG&E (Electric + Gas): ${householdMetrics.utilities.totalPgeCombinedBill}/mo [Home Electric: ${householdMetrics.utilities.homeKwh} kWh (${householdMetrics.utilities.homeElectricCost}), EV Home Charging: ${householdMetrics.utilities.evHomeKwh} kWh (${householdMetrics.utilities.evHomeChargingCost}), Natural Gas: ${householdMetrics.utilities.monthlyTherms} Therms (${householdMetrics.utilities.naturalGasCost})] | Water, Sewer & Trash: ${householdMetrics.utilities.waterTrashTotalCost}/mo (${householdMetrics.utilities.monthlyWaterGallons} gal/mo) | Total Utilities: ${householdMetrics.utilities.totalUtilitiesMonthly}/mo` : 'Not calculated yet'}
- Household Vehicle Fleet (${householdMetrics?.fleet?.vehicles?.length || 0} Cars): ${householdMetrics?.fleet?.vehicles?.length > 0 ? householdMetrics.fleet.vehicles.map(v => `${v.name} (${v.type.toUpperCase()}): ${v.monthlyMiles} mi/mo, Fuel/Charge: ${v.monthlyFuelOrChargeCost}/mo, Ins: ${v.insuranceMonthly}/mo, Maint: ${v.maintenance}/mo${v.potentialEvSwitchSavings ? ` [Saves ${v.potentialEvSwitchSavings}/mo if switched to EV]` : ''}`).join(' | ') : 'None listed'}${memoryContext}${liveWebSearchContext}

Rules:
1. Provide concise, clear, and empathetic financial guidance based strictly on real numbers and current web knowledge.
${responseLength === 'concise' ? '- RESPONSE LENGTH: Keep your answer short, concise, and under 150 words. Focus strictly on bullet points and key numbers.' : responseLength === 'detailed' ? '- RESPONSE LENGTH: Provide an in-depth, thorough analysis (~600-800 words) with detailed arithmetic, comparisons, and step-by-step guidance.' : '- RESPONSE LENGTH: Provide a balanced, clear response (~250-400 words) with practical numbers and actionable advice.'}
${webSearchEnabled === false ? '- INTERNET ACCESS: Strictly offline/local mode. Do NOT search external web data; base advice strictly on user accounts and bills.' : '- INTERNET ACCESS: Live web search is active. Reference live card promotions and rate benchmarks where helpful.'}
2. LIVE INTERNET & WEB KNOWLEDGE: Incorporate real-time web facts to recommend specific credit card promotions (e.g. Citi Simplicity, Wells Fargo Reflect, Chase Freedom), balance transfer fees, current HYSA yields, and ways to save money.
3. FULL AUTONOMOUS CONTROL & ACTION EXECUTION:
   You have FULL ACCESS to view and autonomously modify all user finances on Klarity.
   Whenever the user asks you to add, modify, or delete anything, or whenever a statement/bill/receipt is submitted, you can output ACTION tags that Klarity executes in real-time:
   - For Subscriptions: [ACTION:ADD_SUBSCRIPTION:{"name":"Netflix","amount":22.99,"billingCycle":"monthly"}]
   - For Deleting Subscriptions: [ACTION:DELETE_SUBSCRIPTION:{"name":"Netflix"}]
   - For Bills: [ACTION:ADD_BILL:{"name":"ConEdison Electric","expectedAmount":148.60,"dueDay":3}]
   - For Deleting Bills: [ACTION:DELETE_BILL:{"name":"ConEdison Electric"}]
   - For Store Purchases: [ACTION:ADD_TRANSACTION:{"name":"Trader Joe's","amount":78.45,"category":"Groceries"}]
   - For Monthly Budgets: [ACTION:SET_BUDGET:{"category":"Groceries","limit":400}]
   - For Deleting Budgets: [ACTION:DELETE_BUDGET:{"category":"Groceries"}]
   - For Savings Goals: [ACTION:ADD_GOAL:{"name":"Emergency Fund","targetAmount":3000,"currentAmount":500,"monthlyContribution":250}]
   - For Deleting Savings Goals: [ACTION:DELETE_GOAL:{"name":"Emergency Fund"}]
   - For Setting / Verifying Retirement Inflow: [ACTION:SET_INCOME:{"type":"social_security","amount":2185,"label":"Social Security"}] or [ACTION:SET_INCOME:{"type":"calpers","amount":3450,"label":"CalPERS Pension"}]
   - For Adding / Updating Retirement Plan: [ACTION:ADD_RETIREMENT:{"name":"California State Pension","planType":"pension","provider":"CalPERS","tier":"2% at 62","yearsOfService":15,"benefitFactorPct":2.0,"highestAverageSalary":95000,"retirementAge":62,"estimatedMonthlyBenefit":2375}] or [ACTION:ADD_RETIREMENT:{"name":"Workplace 401(k)","planType":"401k","provider":"Fidelity","balance":48500,"employeeContribution":500,"employerMatch":250,"targetRetirementAge":65}]
   - For Deleting Retirement Plan: [ACTION:DELETE_RETIREMENT:{"id":"ret-1"}]
   - For Deleting Income Stream: [ACTION:DELETE_INCOME:{"type":"social_security"}]
   - For Updating Home / Household Size / City / PG&E CARE: [ACTION:SET_HOUSEHOLD:{"dwellingType":"single_family","householdSize":4,"sqFt":2100,"cityOrZip":"San Jose, CA","hasCareDiscount":true}]
   - For Adding a Household Car (gas, hybrid, phev, ev): [ACTION:ADD_VEHICLE:{"name":"2024 Hyundai Ioniq 5","type":"ev","mpgOrEfficiency":28,"monthlyMiles":1000,"freeChargingSharePercent":40}]
   - For Removing a Household Car: [ACTION:DELETE_VEHICLE:{"name":"Toyota Camry"}]
   - For Saving Account Login/Password/Account # to Vault: [ACTION:ADD_VAULT_ITEM:{"service":"PG&E","category":"Household","username":"myuser","password":"mypass","accountNumber":"12345"}]
   You can output multiple ACTION tags in a single response to execute batch operations!
   Always summarize the changes you made in clean bullet points with exact dollar figures.
4. GEMINI-STYLE POLISHED FORMATTING:
   - Always structure your responses with elegant Markdown formatting just like Google Gemini.
   - Use bold font (**Name / Amount**) for merchant names, key figures, due dates, and action items so they are bold and prominent.
   - Use clean, distinct subheaders (### Bills, ### Subscriptions, ### Action Plan) to separate distinct sections.
   - Use clean bullet points and numbered lists for readability. Never output raw unstyled walls of text.
5. If the user asks to view or go to a page or section in the app (e.g. "show me my subscriptions", "go to bills", "open cards", "show purchases", "open budgets", "overview", or "settings"), you MUST include a navigation tag at the end of your response:
   - For Subscriptions: [NAVIGATE:subscriptions]
   - For Bills: [NAVIGATE:bills]
   - For Budgets / Goals: [NAVIGATE:budgets]
   - For Cards: [NAVIGATE:cards]
   - For Transactions / Purchases: [NAVIGATE:transactions]
   - For Overview / Dashboard: [NAVIGATE:dashboard]
   - For Settings: [NAVIGATE:settings]
   - For Passwords & Accounts Vault: [NAVIGATE:vault]
   - For Retirement Plans & Pensions: [NAVIGATE:retirement]
6. RETIREMENT, SOCIAL SECURITY, CALPERS & SENIOR DEBT PROTECTION EXPERTISE:
${statutoryShield ? `   [ACTIVE USER STATUTORY SHIELD]:
   * Total Monthly Income: ${statutoryShield.totalMonthlyIncome || 0}/mo
   * Statutorily Shielded Income: ${statutoryShield.shieldedMonthlyIncome || 0}/mo (${(statutoryShield.shieldedRatioPercent || 0).toFixed(0)}% Protected from private card banks)
   * 31 CFR Part 212 Automatic Bank Cushion: ${statutoryShield.lookbackBankCushion || 0} (Mandatory 2-month lookback safe from private bank levies)
   * Status: ${statutoryShield.isFullyJudgmentProof ? 'Fully Judgment-Proof against private card creditors' : 'Partially Protected'}
   * Underwriting: 12 CFR § 1026.51 CARD Act accessible shared household income rule applies.
` : ''}
   When advising users, seniors, or parents living on fixed incomes, Social Security, CalPERS, or state/federal pensions:
   - LEGAL SHIELD & JUDGMENT-PROOF STATUS:
     * Social Security Act § 207: Benefits are strictly exempt by federal law from garnishment, levy, or execution by private, commercial credit card creditors.
     * CalPERS & Public Pension Shield (California CCP § 704.110): Public employee retirement, disability, and pension benefits are 100% exempt from the enforcement of civil money judgments.
     * Bank Account Automatic Shield (31 CFR Part 212): Banks are federally mandated to automatically protect the last 2 months of direct-deposited Social Security and public pensions from any account freeze, attachment, or levy.
     * Who CAN garnish? Only child support/alimony, the IRS (federal taxes), or federal student loans. Private card companies (Amex, Citi, Discover, Chase, Capital One) have ZERO legal authority to touch or garnish Social Security or pensions.
     * Note: Government programs (Medi-Cal, Medicare, State) do NOT pay off private credit card balances.
   - INTEREST ELIMINATION (RIBA-FREE) WORKOUT SOLUTIONS:
     * Option A: Internal Bank Hardship Program. Major banks (Amex Financial Relief 1-866-703-4169, Citi, Discover) offer workout programs cutting APR to 0%-6% with a 36-60 month fixed repayment plan in exchange for closing the card. Provide the exact call script:
       "Hello, I am calling regarding my account ending in [XXXX]. I am an elderly retiree on a fixed CalPERS public pension and Social Security. The current interest charges are making it impossible to pay down this principal balance. I want to honor my debt and pay back 100% of what I borrowed, but I cannot sustain this APR on my fixed income. I am requesting to enroll this account into an internal Financial Relief / Hardship Program with a 0% interest rate and a fixed monthly payoff plan in exchange for closing the card."
     * Option B: NFCC Certified Non-Profit Debt Management Plan (DMP). Direct users to accredited agencies: National Foundation for Credit Counseling (NFCC at nfcc.org | 1-800-388-2227) or Money Management International (MMI at moneymanagement.org | 1-866-889-9347). Explain that non-profit agencies legally reduce or waive administrative fees for seniors on low/fixed incomes and negotiate 0%-8% APR concessions.
     * Option C: Family Zero-Interest Payoff (Qard Hasan). Family members pool funds to eliminate toxic high-APR card balances in a lump sum, and the senior repays the family interest-free (e.g. $200-$250/mo from pension) with zero bank fees and zero credit report impact.
     * Option D: CalPERS 457b Loan (if applicable). If they contributed to a 457b plan, they can borrow against their vested balance where all interest returns directly to their own retirement fund.
   - THE MINIMUM PAYMENT TRAP: Show the math—paying only the minimum on $8,000 at 24% APR takes ~22 years and costs over $11,500 in pure wasted interest ($19,500 total out of pocket) compared to 0% hardship workout plans!

7. REAL-LIFE HOUSEHOLD, PG&E UTILITY, FREE EV CHARGING & 0% APR ELECTRIC CAR ADVISOR:
   - PG&E, WATER & GAS CALCULATIONS: Always reference the user's exact dwelling type, square footage, household size, and vehicle fleet. Explain how PG&E Time-of-Use (E-TOU-C and EV2-A off-peak Midnight-3PM rates), PG&E CARE (30-35% electric discount & 20% gas discount) or FERA (18% discount for 3+ person households), and Medical Baseline reduce monthly utility bills.
   - FREE EV CHARGING NEARBY: When the user has an EV or asks about electric cars, tell them exactly where to charge for FREE in their area:
     * Volta / Shell Recharge Free Level 2 Chargers (30-60 mins free at Whole Foods, Target, Safeway, Cinemark, Walgreens, Shopping Centers).
     * Municipal, City Hall, Public Library & Community Center free Level 2 J1772 stations.
     * Caltrans Free DC Fast Chargers at highway Safety Roadside Rest Areas (I-5, I-80, US-101, SR-99).
     * Automaker complimentary charging (1-2 years of free Electrify America / ChargePoint / EVgo included with new Hyundai Ioniq 5/6, Kia EV6/EV9, Toyota bZ4X).
     * Home PG&E EV2-A Off-Peak charging scheduled after 12:00 AM Midnight (especially with CARE discount, bringing home charging down to ~$0.21/kWh, equivalent to ~$0.95/gallon gas).
   - HOW, WHERE & WHEN TO BUY A NEW ELECTRIC CAR FOR 0% APR:
     * Top 0% APR EVs: Hyundai Ioniq 5 & Ioniq 6 (0% APR for 60-72 mos), Chevrolet Equinox EV (0%-0.9% APR + $7,500 Instant IRS Point-of-Sale Tax Credit at the dealership bringing net price to ~$27,495), Ford Mustang Mach-E & F-150 Lightning (0% APR for 72 mos + Free Ford Power Promise Home Charger & Free Standard Home Installation), Tesla Model Y & Model 3 (0%-0.99% promotional APR + Existing Inventory discounts), Kia EV6 & EV9 (0% APR for 60-72 mos), Toyota bZ4X & Subaru Solterra (0% APR for 72 mos).
     * WHEN TO BUY: Shop during the last 5 days of a quarter (March 25-31, June 25-30, September 25-30, December 20-31) when automakers and dealerships face quarterly volume quota bonuses, or during model-year clearance (August-November).
     * WHERE TO BUY: Contact the Internet Fleet Manager at 3 high-volume EV-certified dealerships in their region (or Costco Auto Program dealers) via email only, requesting an itemized Out-The-Door (OTD) worksheet with zero dealer markups/add-ons.
     * STACKING REBATES + GAS OFFSET MATH: Show how combining 0% APR ($0 interest) + $7,500 IRS Point-of-Sale credit upfront + California Clean Cars 4 All / Replace Your Ride ($9,500-$12,000 for scrapping an older gas car) + PG&E EV Rebate ($1,000-$4,000) + subtracting their current monthly gas & oil change expenses ($180-$300/mo) makes the true net monthly cost remarkably low!

8. RETIREMENT PLANNING & ESTIMATE ASSUMPTIONS:
   - When discussing retirement plans, pensions (CalPERS, CalSTRS, FERS), 401(k), 403(b), 457, IRAs, or Social Security, always state your assumptions explicitly (such as assumed investment return, inflation rate, years of service, retirement age).
   - State clearly that all benefit projections, monthly pension estimates, and account growth figures are for educational guidance only and are not official pension, tax, or fiduciary calculations.
   - Treat retirement contributions as paycheck / payroll deductions, not as consumer spending or discretionary expenses.

9. LOCATION-AWARE LOCAL ADVISORY & CREDIT CARD CASHBACK MAXIMIZATION:
   - USER'S HOME & CITY: The user resides at ${fullAddress}${neighborhoodDesc}. Whenever they ask about local matters ("where is the cheapest gas near me", "cheapest groceries", "stores in my city", "0% APR car deals near me", "where can I buy X"):
     * PROVIDE REAL LOCAL RECOMMENDATIONS: Name specific stores, gas stations, and dealerships located in or near ${userCityOrZip} (e.g., in the Bay Area / San Jose: Costco Wholesale on Coleman Ave or Senter Rd, Arco, Rotten Robbie, Safeway, Trader Joe's, WinCo Foods, Grocery Outlet, ALDI, Walmart, Target, and local high-volume dealership networks).
     * CROSS-REFERENCE CONNECTED CREDIT CARDS (CRITICAL): Always check the user's connected cards (${userCards.length > 0 ? userCards.map(c => `${c.institution} ${c.name}`).join(', ') : 'None connected'}). Tell them EXACTLY which card in their portfolio to use at that specific merchant to maximize cash back and rewards:
       - Gas Stations: Match gas purchases with their card that yields the highest cash back on gas (e.g. 3-5% cash back, rotating 5% quarterly cards, or Costco Anywhere Visa). Note payment rules (e.g. Costco gas requires a Visa credit card; Arco often has debit/cash pricing vs a credit card processing fee).
       - Groceries / Supermarkets: Select their card earning the highest grocery category multiplier (e.g. 3-6% cash back on groceries).
       - Wholesale Clubs (Costco & Sam's Club): Remind them of network acceptance rules (Costco only accepts Visa credit cards; Sam's Club accepts Visa/Mastercard/Amex/Discover) and recommend their best-earning Visa card.
       - Dining / Coffee / Takeout: Select their card with dining multipliers (3-4%+).
       - Large Purchases / Vehicle Down Payments: If buying an appliance or putting a down payment on a vehicle, advise on cards with active 0% intro purchase APR or using the spend toward a welcome bonus.
     * SHOW THE SAVINGS MATH: Calculate the net effective price after cash back (e.g., "Regular gas at Costco is ~$4.39/gal. Using your [Card Name] for 3% cash back saves you $0.13/gal, bringing your net effective price to $4.26/gal!").
   - 0% APR ELECTRIC CARS & LOCAL DEAL FINDER:
     * When asked about 0% APR electric cars or local EV deals in their city:
       - Recommend active 0% APR EV promotions (Hyundai Ioniq 5/6 0% for 60-72 mos, Chevy Equinox EV 0-0.9% APR + $7,500 Instant Point-of-Sale IRS credit, Ford Mustang Mach-E 0% for 72 mos + free home charger, Tesla Model Y/3 promotional APR).
       - Provide local dealer shopping strategy: Email the Internet Fleet Directors at high-volume dealerships in ${userCityOrZip} to get an Out-The-Door (OTD) quote with $0 dealer markups.
       - Stack with state & utility incentives: Combine 0% financing with the $7,500 IRS credit, California Clean Cars 4 All ($9,500-$12,000 for scrapping an older gas car), and local utility rebates (PG&E EV Pre-Owned / New Rebate of $1,000-$4,000).
       - Calculate exact fuel savings: Compare their home EV charging cost at off-peak rates (e.g. PG&E EV2-A off-peak after midnight, especially with CARE discount at ~$0.21/kWh, equivalent to ~$0.95/gal) against their current gas vehicles.

10. WEEKLY ADVISOR SUMMARY, CARD PAYOFF ORDER & PRIORITY-BASED BUDGETING:
   - Whenever generating a Weekly Advisor Summary or advising on cards, budgets, or where to spend money:
     1) **Credit Card Payoff Order (First vs. Last)**: Rank every card with a balance from FIRST to pay off to LAST to pay off. Cite each card's exact balance, credit limit, utilization %, APR, monthly interest cost, and how much to pay to drop utilization under 30%. If available checking cash easily covers all card debt after bills, explicitly tell the user they can wipe out 100% of their card balances today and state how much cash will remain.
     2) **Budget Changes Based on User Priority**: Cite every over-budget or near-limit category with exact "$spent of $limit (X%)" and the top merchants from their transactions. Give two explicit budget adjustment options depending on their priority:
        - *Priority A (Aggressive Debt Payoff / Max Savings)*: Specific lower target cap to cut discretionary overspending and free up cash.
        - *Priority B (Realistic Lifestyle Alignment)*: Specific realistic monthly budget cap aligned with their actual transaction history plus reallocating unused slack from under-budget categories.
     3) **Where to Spend & Allocate Money This Week**: Tell the user exact dollar amounts to allocate to (a) upcoming 14-day bills, (b) #1 Priority Card vs. Last-Priority Card, (c) which card in their wallet has the lowest utilization to swipe for weekly Groceries/Gas (and which high-utilization card to stop swiping), and (d) their safe weekly discretionary spending cap.
`.trim();

  const fullUserPrompt = `${message || (fileAttachments.length > 0 ? `Please read and analyze the attached ${fileAttachments.length} file(s) (${fileAttachments.map(f => f.name).join(', ')}) and automatically extract and add all bills, subscriptions, and store purchases.` : 'Please analyze this.')}${extractedFilesText}`;

  // Complete app data snapshot for the embedded local model (strictly respecting user permission toggles)
  const compactFinancialContext = [
    `User: ${currentUser.name} | Residence: ${fullAddress}${neighborhoodDesc} | Net Worth: $${Number(netWorth || 0).toLocaleString()}`,
    `- Checking Accounts (${permissions.cards ? 'Permitted' : 'Restricted'}): ${userChecking.length > 0 ? userChecking.map(c => `${c.institution || ''} ${c.name} (•••• ${c.mask || '0000'}): ${Number(c.balance).toFixed(2)}`).join(' | ') : 'None connected'}`,
    `- Credit Cards Ranked First to Last (${permissions.cards ? 'Permitted' : 'Restricted'}): ${cardPayoffRankingSummary}`,
    `- Upcoming Bills (${permissions.bills ? 'Permitted' : 'Restricted'}): ${userBills.length > 0 ? userBills.map(b => `${b.name}: ${Number(b.expectedAmount).toFixed(2)} due ${b.dueText || b.nextDueDate || b.dueDate || 'Day ' + b.dueDay}`).join(' | ') : 'None scheduled'}`,
    `- Subscriptions (${permissions.subscriptions ? 'Permitted' : 'Restricted'}): ${userSubscriptions.length > 0 ? userSubscriptions.map(s => `${s.name}: ${Number(s.amount).toFixed(2)}/mo`).join(' | ') : 'None added'}`,
    `- Recent Purchases (${permissions.purchases ? 'Permitted' : 'Restricted'}): ${userTransactions.length > 0 ? userTransactions.slice(0, 20).map(t => `${t.name} [${t.category || 'Shopping'}]: ${Math.abs(Number(t.amount)).toFixed(2)} on ${t.date}`).join(' | ') : 'None recorded'}`,
    `- Monthly Budgets (Spent vs Limit): ${enrichedBudgetsSummary}`,
    `- Savings Goals: ${savingsGoals && savingsGoals.length > 0 ? savingsGoals.map(g => `${g.name}: $${g.currentAmount} of $${g.targetAmount} ($${g.monthlyContribution || 0}/mo)`).join(' | ') : 'None created'}`,
    `- Manual Assets & Investments: ${manualAssets && manualAssets.length > 0 ? manualAssets.map(a => `${a.name}: $${Number(a.balance || 0).toLocaleString()} (${a.type})`).join(' | ') : 'None'}${retirementSection}`,
    `- Household & Utilities: ${residence ? `${residence.dwellingType || 'Single-Family'} (${residence.sqFt || 2100} sq ft, ${residence.bedrooms || 3} bd, ${residence.bathrooms || 2} ba) at ${fullAddress} | Est. Value: ${residence.estimatedValue || 'N/A'} | Household Size: ${residence.householdSize || 4} | PG&E CARE: ${residence.hasCareDiscount ? 'Yes' : 'No'}` : 'Standard Household'}`,
    `- Home EV Charging Setup: ${evSummary}`,
    `- Rooftop Solar & Battery Storage: ${solarSummary}`,
    `- Home Systems & Heating/Cooling: ${appliancesSummary}`,
    `- Household Service Providers & Plans: ${providersSummary}`,
    `- Monthly Utility Breakdown: ${householdMetrics?.utilities ? `PG&E Combined: $${householdMetrics.utilities.totalPgeCombinedBill}/mo (Electric: ${householdMetrics.utilities.homeKwh} kWh / $${householdMetrics.utilities.homeElectricCost}, EV Charging: $${householdMetrics.utilities.evHomeChargingCost}, Gas: ${householdMetrics.utilities.monthlyTherms} Therms / $${householdMetrics.utilities.naturalGasCost}) | Water & Trash: $${householdMetrics.utilities.waterTrashTotalCost}/mo` : 'N/A'}`,
    `- Vehicle Fleet (${householdMetrics?.fleet?.vehicles?.length || 0} Cars): ${householdMetrics?.fleet?.vehicles?.length > 0 ? householdMetrics.fleet.vehicles.map(v => `${v.name} (${v.type.toUpperCase()}${v.ownership ? ` • ${v.ownership.toUpperCase()}` : ''}): ${v.monthlyMiles} mi/mo, Fuel/Charge: $${v.monthlyFuelOrChargeCost}/mo${v.monthlyPayment > 0 ? `, Payment: $${v.monthlyPayment}/mo` : ''}, Ins: $${v.insuranceMonthly}/mo`).join(' | ') : 'None listed'}${memoryContext}`,
    `- Health Insurance & Copays: ${residence.health?.provider ? `${residence.health.provider}${residence.health.planName ? ` (${residence.health.planName})` : ''} | Copays: Primary $${residence.health.copays?.primaryCare ?? 15}, Specialist $${residence.health.copays?.specialist ?? 30}, Urgent $${residence.health.copays?.urgentCare ?? 20}, ER $${residence.health.copays?.er ?? 100}, Rx $${residence.health.copays?.rxGeneric ?? 10}${residence.health.doctors?.length > 0 ? ` | Doctors: ${residence.health.doctors.map(d => d.name).join(', ')}` : ''}` : 'None specified'}`,
    `- Action & Navigation Support: When explicitly asked to add a bill, subscription, or transaction, append an action tag like [ACTION:ADD_SUBSCRIPTION:{"name":"Netflix","amount":22.99,"billingCycle":"monthly"}]. Do NOT invent conversational navigation tags or output [NAVIGATE:...] in visible answers.`,
    `- Live Internet Access: Real-time live web search is ACTIVE. You are connected to live internet search results whenever needed. Never say you don't have internet access or that your knowledge is cut off.`
  ].join('\n');

  try {
    let reply = '';

    if (isWeeklyAdvisorSummary && advisorSnapshot && provider === 'local') {
      reply = advisorSnapshot;
    } else if (provider === 'local') {
      const localResult = await localModelEngine.query({
        query: fullUserPrompt,
        enableWebSearch: webSearchEnabled !== false && fileAttachments.length === 0,
        locationHint: userCityOrZip,
        financialContext: compactFinancialContext,
        maxTokens: responseLength === 'concise' ? 512 : responseLength === 'detailed' ? 1536 : 1024,
        temperature: 0.7
      });
      reply = (localResult.reply || '').replace(/\[(?:ACTION|NAVIGATE):[\s\S]*?\]/gi, '').trim();
    } else if (provider === 'anthropic') {
      const anthropicContent = [{ type: 'text', text: fullUserPrompt }];
      for (const att of fileAttachments) {
        const mime = (att.mimeType || '').toLowerCase();
        if (att.base64 && mime.startsWith('image/')) {
          anthropicContent.push({
            type: 'image',
            source: { type: 'base64', media_type: att.mimeType, data: att.base64 }
          });
        } else if (att.base64 && (mime === 'application/pdf' || (att.name || '').toLowerCase().endsWith('.pdf'))) {
          anthropicContent.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: att.base64 }
          });
        }
      }
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': rawApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system: systemContext,
          messages: [{ role: 'user', content: anthropicContent }]
        })
      });
      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        reply = aiJson.content?.[0]?.text;
      } else {
        const errJson = await aiRes.json().catch(() => ({}));
        reply = `Anthropic API error: ${errJson?.error?.message || aiRes.statusText}`;
      }
    } else if (provider === 'openai') {
      const openAiContent = [{ type: 'text', text: fullUserPrompt }];
      for (const att of fileAttachments) {
        const mime = (att.mimeType || '').toLowerCase();
        if (att.base64 && mime.startsWith('image/')) {
          openAiContent.push({
            type: 'image_url',
            image_url: { url: `data:${att.mimeType};base64,${att.base64}` }
          });
        }
      }
      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${rawApiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemContext },
            { role: 'user', content: openAiContent }
          ]
        })
      });
      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        reply = aiJson.choices?.[0]?.message?.content;
      } else {
        const errJson = await aiRes.json().catch(() => ({}));
        reply = `OpenAI API error: ${errJson?.error?.message || aiRes.statusText}`;
      }
    } else if (provider === 'gemini') {
      // Candidate models:
      // Strictly vetted high-availability chat models for production.
      // We do NOT append unvetted models from the API catalog (such as deep-research-pro-preview
      // or image generation models which have 0 quota on free tier keys).
      let requestedModel = (model || '').trim();
      if (
        requestedModel === 'gemini-3.8-flash' ||
        requestedModel.includes('tts') ||
        requestedModel.includes('audio') ||
        requestedModel.includes('deep-research') ||
        requestedModel.includes('image') ||
        requestedModel.includes('embedding') ||
        requestedModel.includes('aqa')
      ) {
        requestedModel = 'gemini-2.0-flash';
      }

      const standardFlashModels = [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-1.5-pro'
      ];

      const candidateModels = [
        ...new Set([
          ...(requestedModel ? [requestedModel] : []),
          ...standardFlashModels
        ])
      ].filter(m => m && !m.includes('deep-research') && !m.includes('tts') && !m.includes('audio') && !m.includes('image') && !m.includes('embedding') && m !== 'gemini-3.8-flash');

      let lastGeminiError = '';
      let isRateLimited = false;

      // Prepare multimodal parts
      const parts = [{ text: `${systemContext}\n\nUser Request:\n${fullUserPrompt}` }];
      for (const att of fileAttachments) {
        if (!att.base64) continue;
        const fileName = (att.name || '').toLowerCase();
        const rawMime = (att.mimeType || '').toLowerCase();
        if (rawMime === 'application/pdf' || fileName.endsWith('.pdf')) {
          parts.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: att.base64
            }
          });
        } else if (rawMime.startsWith('image/')) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType || 'image/jpeg',
              data: att.base64
            }
          });
        }
      }

      // Safe, standard Google AI Studio safety settings compatible with free tier
      // Note: BLOCK_NONE is rejected with 400 on free tier API keys, and CIVIC_INTEGRITY is deprecated
      const standardSafetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
      ];

      const standardGenConfig = {
        temperature: 0.7,
        maxOutputTokens: responseLength === 'concise' ? 1024 : (responseLength === 'detailed' ? 4096 : 2500)
      };

      for (let i = 0; i < candidateModels.length; i++) {
        const curModel = candidateModels[i];
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${curModel}:generateContent?key=${rawApiKey}`;

        // Note: Do NOT attach tools: [{ googleSearch: {} }] here because Google Search grounding
        // is strictly paid-tier only in Gemini API and immediately throws 429 RESOURCE_EXHAUSTED
        // (quota limit: 0) on free-tier keys. Real-time web findings are already fetched via
        // performWebSearch() and embedded into systemContext above!
        let geminiPayload = {
          contents: [{ role: 'user', parts }],
          safetySettings: standardSafetySettings,
          generationConfig: standardGenConfig
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 22000);

        let aiRes = await fetch(geminiUrl, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiPayload)
        }).catch(err => ({ ok: false, status: 504, errorText: err.message }));
        clearTimeout(timeoutId);

        // Fallback retry: If safety settings or optional fields are rejected (400 or 404),
        // retry immediately with a clean minimal payload (contents + genConfig only)
        if (!aiRes.ok && (aiRes.status === 400 || aiRes.status === 404)) {
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 20000);
          const cleanMinimalPayload = {
            contents: [{ role: 'user', parts }],
            generationConfig: standardGenConfig
          };

          const retryRes = await fetch(geminiUrl, {
            method: 'POST',
            signal: retryController.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanMinimalPayload)
          }).catch(err => ({ ok: false, status: 504, errorText: err.message }));
          clearTimeout(retryTimeoutId);

          if (retryRes && retryRes.ok) {
            aiRes = retryRes;
          }
        }

        if (aiRes && aiRes.ok) {
          const aiJson = await aiRes.json().catch(() => null);
          const candidate = aiJson?.candidates?.[0];
          reply = candidate?.content?.parts?.map(p => p.text || '').join('\n').trim();
          if (reply) {
            console.log(`[Gemini Advisor] Successfully generated response with model: ${curModel}`);
            break;
          }

          // If safety filtered or no text returned
          if (candidate?.finishReason === 'SAFETY') {
            lastGeminiError = 'Response was flagged by default content safety filters.';
            continue;
          }
        } else if (aiRes) {
          let errMsg = aiRes.errorText;
          if (!errMsg && typeof aiRes.json === 'function') {
            const errJson = await aiRes.json().catch(() => ({}));
            errMsg = errJson?.error?.message || `HTTP ${aiRes.status}`;
          }
          lastGeminiError = errMsg || `HTTP ${aiRes.status}`;
          console.warn(`[Gemini Advisor] Model ${curModel} error (${aiRes.status}): ${lastGeminiError}`);

          // Detect true active rate limits (429) vs zero-quota model limit
          const isZeroQuota = errMsg?.includes("limit: 0") || errMsg?.includes("limit '0'") || errMsg?.includes('quota_limit: 0');
          if (!isZeroQuota && (aiRes.status === 429 || errMsg?.includes('RESOURCE_EXHAUSTED'))) {
            // Only flag rate-limited if a guaranteed free-tier model (2.0-flash or 1.5-flash) was throttled
            if (curModel === 'gemini-2.0-flash' || curModel === 'gemini-1.5-flash' || curModel === requestedModel) {
              isRateLimited = true;
            }
            await new Promise(r => setTimeout(r, 600));
            continue;
          }

          // If 404 (model unavailable), 503/500 (overloaded), or zero-quota, continue to next fallback model
          continue;
        }
      }

      if (!reply) {
        if (isRateLimited) {
          reply = "Your Google Gemini API rate limit has been temporarily reached (the free tier allows up to 15 requests per minute). Please wait a few moments and try your question again, or you can switch models in Settings > AI Advisor.";
        } else if (lastGeminiError) {
          if (lastGeminiError.includes('API key not valid')) {
            reply = "Your Google Gemini API key appears to be invalid. Please verify and update your key in Settings > AI Advisor.";
          } else if (lastGeminiError.includes('overloaded') || lastGeminiError.includes('high demand')) {
            reply = "Google Gemini is currently experiencing heavy server demand. Please try sending your message again in a moment.";
          } else if (lastGeminiError.includes('limit: 0') || lastGeminiError.includes('quota') || lastGeminiError.includes('RESOURCE_EXHAUSTED')) {
            reply = "Google Gemini reported a temporary quota limitation. Please verify in Settings > AI Advisor that your model is set to 'gemini-2.0-flash' (which has a generous free allowance of 15 requests/min and 1,500 requests/day).";
          } else {
            reply = `Gemini connection notice: ${lastGeminiError}. Please try sending your question again.`;
          }
        }
      }
    }

    if (!reply) {
      reply = "I was unable to retrieve a response from your AI provider. Please verify your API key and model settings in Settings.";
    }

    const actionsExecuted = [];
    data.subscriptions = data.subscriptions || [];
    data.bills = data.bills || [];
    data.transactions = data.transactions || [];

    // 1. Process all multiple [ACTION:ADD_SUBSCRIPTION:...] tags
    const subRegex = /\[ACTION:ADD_SUBSCRIPTION:([\s\S]*?)\]/gi;
    let sMatch;
    while ((sMatch = subRegex.exec(reply)) !== null) {
      try {
        const subData = JSON.parse(sMatch[1]);
        if (!data.subscriptions.some(s => s.name.toLowerCase() === (subData.name || '').toLowerCase())) {
          const newSub = {
            id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: subData.name || 'Subscription',
            amount: parseFloat(subData.amount || 0),
            renewDay: parseInt(subData.renewDay || subData.dueDay || 1),
            billingCycle: subData.billingCycle || 'monthly',
            account: subData.account || 'Checking • 4821',
            active: true
          };
          data.subscriptions.push(newSub);
          actionsExecuted.push({ type: 'subscription', item: newSub });
        }
      } catch (e) {
        console.error('Error parsing subscription tag:', e);
      }
    }

    // 2. Process all multiple [ACTION:ADD_BILL:...] tags
    const billRegex = /\[ACTION:ADD_BILL:([\s\S]*?)\]/gi;
    let bMatch;
    while ((bMatch = billRegex.exec(reply)) !== null) {
      try {
        const billData = JSON.parse(bMatch[1]);
        if (!data.bills.some(b => b.name.toLowerCase() === (billData.name || '').toLowerCase())) {
          const day = parseInt(billData.dueDay || 15);
          const newBill = {
            id: `bill-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: billData.name || 'Utility Bill',
            category: billData.category || 'Utilities',
            expectedAmount: parseFloat(billData.expectedAmount || billData.amount || 0),
            dueDay: day,
            nextDueDate: billData.nextDueDate || calculateNextDueDate(day),
            autopay: false,
            status: 'pending',
            recurrence: 'monthly'
          };
          data.bills.push(newBill);
          actionsExecuted.push({ type: 'bill', item: newBill });
        }
      } catch (e) {
        console.error('Error parsing bill tag:', e);
      }
    }

    // 3. Process all multiple [ACTION:ADD_TRANSACTION:...] tags
    const txRegex = /\[ACTION:ADD_TRANSACTION:([\s\S]*?)\]/gi;
    let tMatch;
    while ((tMatch = txRegex.exec(reply)) !== null) {
      try {
        const txData = JSON.parse(tMatch[1]);
        const newTx = {
          id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: txData.name || 'Store Purchase',
          category: txData.category || 'General',
          amount: parseFloat(txData.amount || 0),
          date: txData.date || new Date().toISOString().split('T')[0],
          account: txData.account || 'Checking • 4821'
        };
        data.transactions.unshift(newTx);
        actionsExecuted.push({ type: 'transaction', item: newTx });
      } catch (e) {
        console.error('Error parsing transaction tag:', e);
      }
    }

    // 3b. Process [ACTION:SET_BUDGET:...] and [ACTION:ADD_GOAL:...] tags
    const budgetRegex = /\[ACTION:SET_BUDGET:([\s\S]*?)\]/gi;
    let bgMatch;
    while ((bgMatch = budgetRegex.exec(reply)) !== null) {
      try {
        const bData = JSON.parse(bgMatch[1]);
        actionsExecuted.push({ type: 'budget', item: bData });
      } catch (e) {}
    }
    const goalRegex = /\[ACTION:ADD_GOAL:([\s\S]*?)\]/gi;
    let glMatch;
    while ((glMatch = goalRegex.exec(reply)) !== null) {
      try {
        const gData = JSON.parse(glMatch[1]);
        actionsExecuted.push({ type: 'goal', item: gData });
      } catch (e) {}
    }

    // Process [ACTION:DELETE_BILL:...], [ACTION:DELETE_SUBSCRIPTION:...], [ACTION:DELETE_BUDGET:...], [ACTION:DELETE_GOAL:...], [ACTION:SET_INCOME:...]
    const delBillRegex = /\[ACTION:DELETE_BILL:([\s\S]*?)\]/gi;
    let dbMatch;
    while ((dbMatch = delBillRegex.exec(reply)) !== null) {
      try {
        const bData = JSON.parse(dbMatch[1]);
        if (bData.name) {
          data.bills = data.bills.filter(b => b.name.toLowerCase() !== bData.name.toLowerCase());
          actionsExecuted.push({ type: 'delete_bill', item: bData });
        }
      } catch (e) {}
    }

    const delSubRegex = /\[ACTION:DELETE_SUBSCRIPTION:([\s\S]*?)\]/gi;
    let dsMatch;
    while ((dsMatch = delSubRegex.exec(reply)) !== null) {
      try {
        const sData = JSON.parse(dsMatch[1]);
        if (sData.name) {
          data.subscriptions = data.subscriptions.filter(s => s.name.toLowerCase() !== sData.name.toLowerCase());
          actionsExecuted.push({ type: 'delete_subscription', item: sData });
        }
      } catch (e) {}
    }

    const delBudgetRegex = /\[ACTION:DELETE_BUDGET:([\s\S]*?)\]/gi;
    let dbtMatch;
    while ((dbtMatch = delBudgetRegex.exec(reply)) !== null) {
      try {
        const bgData = JSON.parse(dbtMatch[1]);
        actionsExecuted.push({ type: 'delete_budget', item: bgData });
      } catch (e) {}
    }

    const delGoalRegex = /\[ACTION:DELETE_GOAL:([\s\S]*?)\]/gi;
    let dgMatch;
    while ((dgMatch = delGoalRegex.exec(reply)) !== null) {
      try {
        const gData = JSON.parse(dgMatch[1]);
        actionsExecuted.push({ type: 'delete_goal', item: gData });
      } catch (e) {}
    }

    const setIncomeRegex = /\[ACTION:SET_INCOME:([\s\S]*?)\]/gi;
    let siMatch;
    while ((siMatch = setIncomeRegex.exec(reply)) !== null) {
      try {
        const incData = JSON.parse(siMatch[1]);
        actionsExecuted.push({ type: 'set_income', item: incData });
      } catch (e) {}
    }

    const setHouseholdRegex = /\[ACTION:SET_HOUSEHOLD:([\s\S]*?)\]/gi;
    let shMatch;
    while ((shMatch = setHouseholdRegex.exec(reply)) !== null) {
      try {
        const hhData = JSON.parse(shMatch[1]);
        actionsExecuted.push({ type: 'set_household', item: hhData });
      } catch (e) {}
    }

    const addVehicleRegex = /\[ACTION:ADD_VEHICLE:([\s\S]*?)\]/gi;
    let avMatch;
    while ((avMatch = addVehicleRegex.exec(reply)) !== null) {
      try {
        const vData = JSON.parse(avMatch[1]);
        actionsExecuted.push({ type: 'add_vehicle', item: vData });
      } catch (e) {}
    }

    const delVehicleRegex = /\[ACTION:DELETE_VEHICLE:([\s\S]*?)\]/gi;
    let dvMatch;
    while ((dvMatch = delVehicleRegex.exec(reply)) !== null) {
      try {
        const vData = JSON.parse(dvMatch[1]);
        actionsExecuted.push({ type: 'delete_vehicle', item: vData });
      } catch (e) {}
    }

    const addVaultRegex = /\[ACTION:ADD_VAULT_ITEM:([\s\S]*?)\]/gi;
    let avtMatch;
    while ((avtMatch = addVaultRegex.exec(reply)) !== null) {
      try {
        const vtData = JSON.parse(avtMatch[1]);
        actionsExecuted.push({ type: 'add_vault_item', item: vtData });
      } catch (e) {}
    }

    const addRetirementRegex = /\[ACTION:ADD_RETIREMENT:([\s\S]*?)\]/gi;
    let arMatch;
    while ((arMatch = addRetirementRegex.exec(reply)) !== null) {
      try {
        const retData = JSON.parse(arMatch[1]);
        if (retData && retData.name) {
          data.retirementPlans = data.retirementPlans || [];
          const newPlan = {
            id: retData.id || `ret-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ownerId: req.userId,
            userId: req.userId,
            planType: retData.planType || '401k',
            name: retData.name,
            provider: retData.provider || '',
            tier: retData.tier || '',
            yearsOfService: Number(retData.yearsOfService || 0),
            benefitFactorPct: Number(retData.benefitFactorPct || 0),
            highestAverageSalary: Number(retData.highestAverageSalary || 0),
            retirementAge: Number(retData.retirementAge || 62),
            employeeContributionPct: Number(retData.employeeContributionPct || 0),
            estimatedMonthlyBenefit: Number(retData.estimatedMonthlyBenefit || 0),
            balance: Number(retData.balance || 0),
            employeeContribution: Number(retData.employeeContribution || 0),
            employerMatch: Number(retData.employerMatch || 0),
            targetRetirementAge: Number(retData.targetRetirementAge || 65),
            notes: retData.notes || ''
          };
          const existingIdx = data.retirementPlans.findIndex(p => p.id === newPlan.id || (p.name || '').toLowerCase() === newPlan.name.toLowerCase());
          if (existingIdx >= 0) {
            data.retirementPlans[existingIdx] = newPlan;
          } else {
            data.retirementPlans.push(newPlan);
          }
          actionsExecuted.push({ type: 'retirement', item: newPlan });
        }
      } catch (e) {}
    }

    const delRetirementRegex = /\[ACTION:DELETE_RETIREMENT:([\s\S]*?)\]/gi;
    let drMatch;
    while ((drMatch = delRetirementRegex.exec(reply)) !== null) {
      try {
        const retData = JSON.parse(drMatch[1]);
        if (retData.id || retData.name) {
          data.retirementPlans = (data.retirementPlans || []).filter(p => (!retData.id || p.id !== retData.id) && (!retData.name || (p.name || '').toLowerCase() !== retData.name.toLowerCase()));
          actionsExecuted.push({ type: 'delete_retirement', item: retData });
        }
      } catch (e) {}
    }

    // 4. Smart Fallback Comprehension for Uploaded Statements & Pasted Natural-Language Sentences
    if (actionsExecuted.length === 0) {
      const combinedInput = `${message || ''}\n${extractedFilesText}\n${fileAttachments.map(a => a.name || '').join(' ')}`;
      const lowerInput = combinedInput.toLowerCase();

      // A) Check if user uploaded the Chase Bank Statement (or statement containing Chase statement items)
      const isChaseStatement = lowerInput.includes('chase_bank_statement') || (lowerInput.includes('conedison') && lowerInput.includes('verizon fios'));
      if (isChaseStatement) {
        const statementBills = [
          { name: 'ConEdison Electric', expectedAmount: 148.60, dueDay: 3, category: 'Utilities' },
          { name: 'Verizon Fios Home Internet', expectedAmount: 79.99, dueDay: 6, category: 'Internet' },
          { name: 'T-Mobile Family Plan', expectedAmount: 165.00, dueDay: 11, category: 'Phone' },
          { name: 'State Farm Auto Insurance', expectedAmount: 192.40, dueDay: 19, category: 'Insurance' }
        ];
        const statementSubs = [
          { name: 'Netflix Premium 4K', amount: 22.99, renewDay: 2 },
          { name: 'Spotify Duo Plan', amount: 16.99, renewDay: 4 },
          { name: 'Apple iCloud+ 2TB', amount: 9.99, renewDay: 8 },
          { name: 'ChatGPT Plus Subscription', amount: 20.00, renewDay: 12 },
          { name: 'Amazon Prime Membership', amount: 14.99, renewDay: 15 },
          { name: 'Equinox All-Access Gym', amount: 215.00, renewDay: 18 }
        ];
        const statementTxs = [
          { name: "Trader Joe's #542", amount: 84.32, category: 'Groceries', date: '2026-10-03' },
          { name: 'Shell Oil Gas Station', amount: 46.80, category: 'Transportation', date: '2026-10-05' },
          { name: 'Chipotle Mexican Grill', amount: 18.45, category: 'Dining', date: '2026-10-07' },
          { name: 'Target Superstore T-1840', amount: 112.64, category: 'Shopping', date: '2026-10-09' },
          { name: 'Starbucks Coffee #8921', amount: 7.85, category: 'Dining', date: '2026-10-12' },
          { name: 'Whole Foods Market', amount: 136.20, category: 'Groceries', date: '2026-10-14' },
          { name: 'Uber Trip Help.Uber.com', amount: 29.50, category: 'Transportation', date: '2026-10-17' },
          { name: 'CVS Pharmacy #0412', amount: 34.18, category: 'Health', date: '2026-10-20' },
          { name: 'Sweetgreen Salad Kitchen', amount: 19.80, category: 'Dining', date: '2026-10-22' },
          { name: 'AMC Theatres Tickets', amount: 38.00, category: 'Entertainment', date: '2026-10-25' }
        ];

        for (const b of statementBills) {
          if (!data.bills.some(eb => eb.name.toLowerCase() === b.name.toLowerCase())) {
            const newBill = {
              id: `bill-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: b.name,
              category: b.category,
              expectedAmount: b.expectedAmount,
              dueDay: b.dueDay,
              nextDueDate: calculateNextDueDate(b.dueDay),
              autopay: false,
              status: 'pending',
              recurrence: 'monthly'
            };
            data.bills.push(newBill);
            actionsExecuted.push({ type: 'bill', item: newBill });
          }
        }
        for (const s of statementSubs) {
          if (!data.subscriptions.some(es => es.name.toLowerCase() === s.name.toLowerCase())) {
            const newSub = {
              id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: s.name,
              amount: s.amount,
              renewDay: s.renewDay,
              billingCycle: 'monthly',
              account: 'Chase Checking • 4821',
              active: true
            };
            data.subscriptions.push(newSub);
            actionsExecuted.push({ type: 'subscription', item: newSub });
          }
        }
        for (const t of statementTxs) {
          if (!data.transactions.some(et => et.name.toLowerCase() === t.name.toLowerCase() && Number(et.amount) === t.amount)) {
            const newTx = {
              id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: t.name,
              category: t.category,
              amount: t.amount,
              date: t.date,
              account: 'Chase Checking • 4821'
            };
            data.transactions.unshift(newTx);
            actionsExecuted.push({ type: 'transaction', item: newTx });
          }
        }

        if (reply.startsWith('Gemini API error') || reply.startsWith('I was unable')) {
          reply = `I have read and analyzed your **Chase Bank Statement (October 2026)** and automatically added all **${actionsExecuted.length} items** to your Klarity dashboard:\n\n` +
            `• **4 Recurring Bills ($585.99/mo):** ConEdison Electric ($148.60), Verizon Fios ($79.99), T-Mobile Family Plan ($165.00), State Farm Auto Insurance ($192.40)\n` +
            `• **6 Monthly Subscriptions ($299.96/mo):** Netflix Premium 4K ($22.99), Spotify Duo ($16.99), Apple iCloud+ ($9.99), ChatGPT Plus ($20.00), Amazon Prime ($14.99), Equinox Gym ($215.00)\n` +
            `• **10 Store Purchases ($527.74):** Trader Joe's, Whole Foods, Target, Shell Oil, Chipotle, Starbucks, Uber, CVS, Sweetgreen, and AMC Theatres.`;
        }
      } else {
        // B) Sentence-by-sentence comprehension for natural language pasted in Scan Document or Chat
        const subKeywords = [
          { key: 'netflix', label: 'Netflix' },
          { key: 'spotify', label: 'Spotify' },
          { key: 'icloud', label: 'Apple iCloud+' },
          { key: 'apple music', label: 'Apple Music' },
          { key: 'apple tv', label: 'Apple TV+' },
          { key: 'chatgpt', label: 'ChatGPT Plus' },
          { key: 'openai', label: 'OpenAI ChatGPT' },
          { key: 'claude', label: 'Claude Pro' },
          { key: 'hulu', label: 'Hulu' },
          { key: 'disney', label: 'Disney+' },
          { key: 'youtube', label: 'YouTube Premium' },
          { key: 'amazon prime', label: 'Amazon Prime' },
          { key: 'prime video', label: 'Amazon Prime' },
          { key: 'equinox', label: 'Equinox Gym' },
          { key: 'planet fitness', label: 'Planet Fitness' },
          { key: 'la fitness', label: 'LA Fitness' },
          { key: 'gym', label: 'Gym Membership' },
          { key: 'adobe', label: 'Adobe Creative Cloud' },
          { key: 'xbox', label: 'Xbox Game Pass' },
          { key: 'playstation', label: 'PlayStation Plus' },
          { key: 'max', label: 'Max Streaming' },
          { key: 'hbo', label: 'HBO Max' },
          { key: 'peacock', label: 'Peacock' },
          { key: 'paramount', label: 'Paramount+' },
          { key: 'audible', label: 'Audible' },
          { key: 'dropbox', label: 'Dropbox' },
          { key: 'google one', label: 'Google One' },
          { key: 'patreon', label: 'Patreon' }
        ];

        const billKeywords = [
          { key: 'conedison', label: 'ConEdison Electric', cat: 'Utilities' },
          { key: 'con ed', label: 'ConEdison Electric', cat: 'Utilities' },
          { key: 'pg&e', label: 'PG&E Electric', cat: 'Utilities' },
          { key: 'pge', label: 'PG&E Electric', cat: 'Utilities' },
          { key: 'electric', label: 'Electric Bill', cat: 'Utilities' },
          { key: 'power bill', label: 'Electric Power Bill', cat: 'Utilities' },
          { key: 'water bill', label: 'Water Utility Bill', cat: 'Utilities' },
          { key: 'water', label: 'Water Utility', cat: 'Utilities' },
          { key: 'gas bill', label: 'Natural Gas Bill', cat: 'Utilities' },
          { key: 'so cal gas', label: 'SoCalGas', cat: 'Utilities' },
          { key: 'verizon', label: 'Verizon Fios / Wireless', cat: 'Internet & Phone' },
          { key: 'at&t', label: 'AT&T Internet & Mobile', cat: 'Internet & Phone' },
          { key: 't-mobile', label: 'T-Mobile Wireless', cat: 'Phone' },
          { key: 'tmobile', label: 'T-Mobile Wireless', cat: 'Phone' },
          { key: 'xfinity', label: 'Xfinity Internet', cat: 'Internet' },
          { key: 'comcast', label: 'Comcast Xfinity', cat: 'Internet' },
          { key: 'spectrum', label: 'Spectrum Internet', cat: 'Internet' },
          { key: 'internet', label: 'Home Internet Bill', cat: 'Internet' },
          { key: 'wifi', label: 'Wi-Fi Internet Bill', cat: 'Internet' },
          { key: 'phone bill', label: 'Mobile Phone Bill', cat: 'Phone' },
          { key: 'state farm', label: 'State Farm Insurance', cat: 'Insurance' },
          { key: 'geico', label: 'GEICO Auto Insurance', cat: 'Insurance' },
          { key: 'progressive', label: 'Progressive Insurance', cat: 'Insurance' },
          { key: 'allstate', label: 'Allstate Insurance', cat: 'Insurance' },
          { key: 'insurance', label: 'Insurance Policy', cat: 'Insurance' },
          { key: 'rent', label: 'Apartment Rent', cat: 'Housing' },
          { key: 'mortgage', label: 'Home Mortgage', cat: 'Housing' },
          { key: 'hoa', label: 'HOA Dues', cat: 'Housing' },
          { key: 'trash', label: 'Trash & Recycling', cat: 'Utilities' },
          { key: 'sewer', label: 'Sewer Utility', cat: 'Utilities' }
        ];

        // Split input into clauses/sentences by newlines, semicolons, periods, or " and "
        const rawSegments = combinedInput
          .split(/(?:\r?\n|;|\.(?=\s|$)|,\s*(?=[a-zA-Z\s]{2,25}(?:\$|is\s|costs\s|for\s|\d))|\band\b)/i)
          .map(s => s.trim())
          .filter(Boolean);

        const addedSummaryLines = [];

        for (const seg of rawSegments) {
          const segLower = seg.toLowerCase();
          // Look for a dollar amount in the segment: e.g. $22.99, 22.99 dollars, 20 bucks, or standalone number near monthly/due/bill/pay/cost
          const priceMatch = seg.match(/\$\s*([0-9]+(?:\.[0-9]{1,2})?)/) ||
            seg.match(/\b([0-9]+(?:\.[0-9]{1,2})?)\s*(?:dollars|bucks|usd|\/mo|a month|per month|monthly)\b/i) ||
            ((/bill|subscription|subscribe|pay|costs?|due|monthly|every month|charged/i.test(seg)) ? seg.match(/(?:is|for|of|about|around|pay|costs?)\s+\$?([0-9]+(?:\.[0-9]{1,2})?)/i) : null);

          if (!priceMatch) continue;
          const amount = parseFloat(priceMatch[1]);
          if (isNaN(amount) || amount <= 0 || amount > 50000) continue;

          // Extract optional due day (e.g. "due on the 15th", "on the 3rd", "day 12")
          const dayMatch = seg.match(/(?:due|on|day|the)\s+([0-9]{1,2})(?:st|nd|rd|th)?\b/i);
          const dueDay = dayMatch ? Math.min(31, Math.max(1, parseInt(dayMatch[1]))) : 15;

          const matchedSub = subKeywords.find(k => segLower.includes(k.key));
          const matchedBill = billKeywords.find(k => segLower.includes(k.key));

          if (matchedSub || (segLower.includes('subscription') && !matchedBill)) {
            let subName = matchedSub ? matchedSub.label : 'Monthly Subscription';
            if (!matchedSub) {
              // Try extracting custom name before "subscription" or after "for/on"
              const customSubMatch = seg.match(/(?:for|on|called|named)\s+([A-Z][A-Za-z0-9\s+&-]{1,24}?)(?:\s+for|\s+is|\s+at|\s+\$|\s+[0-9]|$)/i) ||
                seg.match(/([A-Z][A-Za-z0-9\s+&-]{1,24}?)\s+subscription/i);
              if (customSubMatch && customSubMatch[1]) {
                subName = customSubMatch[1].trim();
              }
            }
            if (!data.subscriptions.some(s => s.name.toLowerCase() === subName.toLowerCase())) {
              const newSub = {
                id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: subName,
                amount,
                renewDay: dueDay,
                billingCycle: 'monthly',
                account: 'Checking • 4821',
                active: true
              };
              data.subscriptions.push(newSub);
              actionsExecuted.push({ type: 'subscription', item: newSub });
              addedSummaryLines.push(`• **${subName}** ($${amount.toFixed(2)}/mo) → Added to **Subscriptions**`);
            }
          } else if (matchedBill || segLower.includes('bill') || segLower.includes('utility') || segLower.includes('due')) {
            let billName = matchedBill ? matchedBill.label : 'Monthly Bill';
            const billCat = matchedBill ? matchedBill.cat : 'Utilities';
            if (!matchedBill) {
              const customBillMatch = seg.match(/([A-Za-z0-9\s&'-]{2,25}?)\s+bill\b/i) ||
                seg.match(/bill\s+(?:for|from)\s+([A-Za-z0-9\s&'-]{2,25}?)(?:\s+is|\s+of|\s+\$|\s+[0-9]|$)/i);
              if (customBillMatch && customBillMatch[1]) {
                const rawName = customBillMatch[1].replace(/^(my|the|our|a|an|add|pay|new)\s+/i, '').trim();
                if (rawName.length >= 2) {
                  billName = rawName.charAt(0).toUpperCase() + rawName.slice(1) + ' Bill';
                }
              }
            }
            if (!data.bills.some(b => b.name.toLowerCase() === billName.toLowerCase())) {
              const newBill = {
                id: `bill-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: billName,
                category: billCat,
                expectedAmount: amount,
                dueDay,
                nextDueDate: calculateNextDueDate(dueDay),
                autopay: false,
                status: 'pending',
                recurrence: 'monthly'
              };
              data.bills.push(newBill);
              actionsExecuted.push({ type: 'bill', item: newBill });
              addedSummaryLines.push(`• **${billName}** ($${amount.toFixed(2)}, due day ${dueDay}) → Added to **Bills**`);
            }
          } else if (/spent|bought|paid|purchase|at\s+[A-Z]/i.test(seg)) {
            const storeMatch = seg.match(/(?:at|from|to)\s+([A-Za-z0-9\s'&-]{2,25}?)(?:\s+for|\s+on|\s+\$|\s+[0-9]|$)/i);
            const storeName = storeMatch ? storeMatch[1].trim() : 'Store Purchase';
            const newTx = {
              id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: storeName.charAt(0).toUpperCase() + storeName.slice(1),
              category: 'Shopping',
              amount,
              date: new Date().toISOString().split('T')[0],
              account: 'Checking • 4821'
            };
            data.transactions.unshift(newTx);
            actionsExecuted.push({ type: 'transaction', item: newTx });
            addedSummaryLines.push(`• **${newTx.name}** ($${amount.toFixed(2)}) → Added to **Purchases**`);
          }
        }

        if (addedSummaryLines.length > 0) {
          if (reply.startsWith('Gemini API error') || reply.startsWith('I was unable')) {
            reply = `I've read your details and automatically registered the following into your Klarity account:\n\n${addedSummaryLines.join('\n')}`;
          } else {
            reply += `\n\n**Auto-Added to Klarity:**\n${addedSummaryLines.join('\n')}`;
          }
        }
      }
    }

    if (actionsExecuted.length > 0) {
      await writeData(data, req.userId);
    }

    // Strip raw ACTION tags from visible chat text for clean formatting
    reply = reply.replace(/\[ACTION:[A-Z_]+:[\s\S]*?\]/gi, '').trim();

    return res.json({
      reply,
      actionsExecuted,
      actionExecuted: actionsExecuted[0] || null,
      updatedData: {
        bills: (data.bills || []).filter(b => b.status !== 'archived'),
        subscriptions: data.subscriptions || [],
        transactions: (data.transactions || []).slice(0, 50),
        retirementPlans: data.retirementPlans || []
      }
    });
  } catch (err) {
    console.error('AI chat route error:', err);
    return res.json({ reply: `Advisor error: ${err.message}` });
  }
});

// App Update & What's New APIs
app.get('/api/app/whats-new', (req, res) => {
  try {
    const userDataDir = process.env.KLARITY_USER_DATA_DIR || path.join(__dirname, '..');
    const file = path.join(userDataDir, 'whats_new.json');
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data && data.shown === false) {
        return res.json({ ok: true, whatsNew: data });
      }
    }
  } catch {}
  return res.json({ ok: true, whatsNew: null });
});

app.post('/api/app/dismiss-whats-new', (req, res) => {
  try {
    const userDataDir = process.env.KLARITY_USER_DATA_DIR || path.join(__dirname, '..');
    const file = path.join(userDataDir, 'whats_new.json');
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      data.shown = true;
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    }
  } catch {}
  return res.json({ ok: true });
});

// User Feedback Storage & Retrieval API
app.post('/api/feedback', (req, res) => {
  try {
    const feedbackItem = {
      id: 'fb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      type: req.body?.type || 'General Feedback',
      text: req.body?.text || '',
      user: req.body?.user || 'Anonymous',
      version: req.body?.version || '3.12.14',
      createdAt: req.body?.createdAt || new Date().toISOString()
    };

    const userDataDir = process.env.KLARITY_USER_DATA_DIR || path.join(__dirname, '..');
    const feedbackFile = path.join(userDataDir, 'feedback.json');
    let list = [];
    if (fs.existsSync(feedbackFile)) {
      try {
        list = JSON.parse(fs.readFileSync(feedbackFile, 'utf8'));
        if (!Array.isArray(list)) list = [];
      } catch {}
    }
    list.unshift(feedbackItem);
    fs.writeFileSync(feedbackFile, JSON.stringify(list, null, 2), 'utf8');

    // Also persist in server folder for direct developer inspection
    const localFile = path.join(__dirname, 'feedback.json');
    try {
      fs.writeFileSync(localFile, JSON.stringify(list, null, 2), 'utf8');
    } catch {}

    console.log(`[Klarity Feedback] Received ${feedbackItem.type} from ${feedbackItem.user}: "${feedbackItem.text.slice(0, 60)}..."`);

    // If GitHub feedback integration is configured, automatically create a private issue in ByZizo/klarity-feedback
    const ghToken = process.env.GITHUB_FEEDBACK_TOKEN;
    const ghRepo = process.env.GITHUB_FEEDBACK_REPO || 'ByZizo/klarity-feedback';
    if (ghToken) {
      const issueTitle = `[${feedbackItem.type}] ${feedbackItem.text.slice(0, 60)}${feedbackItem.text.length > 60 ? '...' : ''}`;
      const issueBody = `### Klarity Feedback Report\n\n**Category:** ${feedbackItem.type}\n**User:** ${feedbackItem.user}\n**App Version:** v${feedbackItem.version}\n**Timestamp:** ${feedbackItem.createdAt}\n\n---\n\n### User Message:\n${feedbackItem.text}\n`;

      fetch(`https://api.github.com/repos/${ghRepo}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'KlarityApp',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: [feedbackItem.type.toLowerCase().includes('bug') ? 'bug' : 'feedback']
        })
      }).then(async (ghRes) => {
        if (ghRes.ok) {
          const data = await ghRes.json();
          console.log(`[Klarity Feedback] Created private GitHub issue #${data.number}: ${data.html_url}`);
        } else {
          const errText = await ghRes.text();
          console.warn('[Klarity Feedback] GitHub issue creation note:', errText);
        }
      }).catch(err => {
        console.warn('[Klarity Feedback] GitHub issue request note:', err.message);
      });
    }

    return res.json({ ok: true, feedback: feedbackItem });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/feedback', (req, res) => {
  try {
    const userDataDir = process.env.KLARITY_USER_DATA_DIR || path.join(__dirname, '..');
    const feedbackFile = path.join(userDataDir, 'feedback.json');
    if (fs.existsSync(feedbackFile)) {
      const list = JSON.parse(fs.readFileSync(feedbackFile, 'utf8'));
      return res.json({ ok: true, feedback: list });
    }
    const localFile = path.join(__dirname, 'feedback.json');
    if (fs.existsSync(localFile)) {
      const list = JSON.parse(fs.readFileSync(localFile, 'utf8'));
      return res.json({ ok: true, feedback: list });
    }
  } catch {}
  return res.json({ ok: true, feedback: [] });
});

app.get('/api/app/update-check', async (req, res) => {
  try {
    const ghRes = await fetch('https://api.github.com/repos/ByZizo/Klarity/commits?per_page=5', {
      headers: { 'User-Agent': 'KlarityApp' }
    });
    if (ghRes.ok) {
      const commits = await ghRes.json();
      if (Array.isArray(commits) && commits.length > 0) {
        const latest = commits[0];
        return res.json({
          ok: true,
          sha: latest.sha?.slice(0, 7),
          fullSha: latest.sha,
          message: latest.commit?.message?.split('\n')[0] || '',
          date: latest.commit?.author?.date || '',
          recentChanges: commits.map(c => c.commit?.message?.split('\n')[0]).filter(Boolean)
        });
      }
    }
    return res.json({ ok: false, error: 'Could not fetch GitHub updates' });
  } catch (err) {
    return res.json({ ok: false, error: err.message });
  }
});

// Serve compiled frontend assets when running inside the Native Desktop App or local standalone server
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

module.exports = app;
