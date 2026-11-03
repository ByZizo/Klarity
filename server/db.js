// ============================================================================
// KLARITY DATABASE & STORAGE ADAPTER
//
// Dual-Mode Architecture:
// 1. Hosted Mode (Supabase):
//    - Replaces temporary /tmp storage with persistent Supabase PostgreSQL.
//    - Accessed strictly on the server using SUPABASE_SERVICE_ROLE_KEY (never exposed to client).
//    - Stores and retrieves each user's data in their own rows (users, user_sessions,
//      accounts, bills, subscriptions, transactions, budgets, savings_goals,
//      manual_assets, user_settings, plaid_items).
// 2. Desktop Mode (Electron & Local Encrypted Storage):
//    - Preserves local AES-256-GCM encrypted file storage (klarity_vault_data.enc).
//    - Provides 100% offline self-contained privacy on user's machine.
// ============================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Detect runtime environment
const isDesktop = process.env.KLARITY_DESKTOP_APP === 'true' || Boolean(process.env.KLARITY_USER_DATA_DIR);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isSupabaseEnabled = Boolean(supabaseUrl && supabaseServiceKey) && !isDesktop;

let supabase = null;
if (isSupabaseEnabled) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.log('Klarity Server: Connected to Supabase Cloud Database via Service-Role Key');
  } catch (err) {
    console.error('Klarity Server: Failed to initialize Supabase client:', err.message);
  }
}

// ----------------------------------------------------------------------------
// Local Encrypted File Configuration for Desktop App
// ----------------------------------------------------------------------------
const DATA_FILE = process.env.KLARITY_USER_DATA_DIR
  ? path.join(process.env.KLARITY_USER_DATA_DIR, 'klarity_vault_data.enc')
  : path.join(__dirname, 'data.json');

const ownerEmailsFromEnv = process.env.OWNER_EMAILS
  ? process.env.OWNER_EMAILS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  : [];

const initialSeedData = {
  users: ownerEmailsFromEnv.map((email, idx) => ({
    id: idx === 0 ? 'u-owner' : `u-owner-${idx + 1}`,
    name: email.split('@')[0],
    email,
    role: 'Primary Member',
    avatar: ''
  })),
  sessions: [],
  accounts: [],
  bills: [],
  subscriptions: [],
  transactions: [],
  budgets: [],
  savingsGoals: [],
  manualAssets: [],
  retirementPlans: [],
  userSettings: {},
  plaidItems: []
};

let memoryData = JSON.parse(JSON.stringify(initialSeedData));

function getEncryptionKey() {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const key = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!key) {
    if (isProd) {
      throw new Error('FATAL: SETTINGS_ENCRYPTION_KEY environment variable is required in production.');
    }
    return crypto.createHash('sha256').update('klarity-dev-default-encryption-key-32bytes!').digest();
  }
  return crypto.createHash('sha256').update(key).digest();
}

function encryptDisk(text) {
  const key = getEncryptionKey();
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `GCM:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch {
    return text;
  }
}

function decryptDisk(cipherText) {
  const key = getEncryptionKey();
  try {
    if (cipherText.startsWith('GCM:')) {
      const parts = cipherText.split(':');
      const iv = Buffer.from(parts[1], 'hex');
      const tag = Buffer.from(parts[2], 'hex');
      const cipherData = Buffer.from(parts[3], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return decipher.update(cipherData, null, 'utf8') + decipher.final('utf8');
    }
    // Fallback for legacy CBC
    const parts = cipherText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return decipher.update(parts[1], 'hex', 'utf8') + decipher.final('utf8');
  } catch {
    return null;
  }
}

function readLocalData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
      if (raw.startsWith('DISK_ENC_V1:')) {
        const decryptedStr = decryptDisk(raw.slice('DISK_ENC_V1:'.length));
        if (decryptedStr) return JSON.parse(decryptedStr);
      }
      return JSON.parse(raw);
    }
  } catch (err) {
    if (err && err.message && err.message.startsWith('FATAL:')) throw err;
    console.error('Error reading local file:', err.message);
  }
  return memoryData;
}

function writeLocalData(data) {
  memoryData = data;
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const jsonStr = JSON.stringify(data, null, 2);
    if (process.env.KLARITY_USER_DATA_DIR) {
      fs.writeFileSync(DATA_FILE, 'DISK_ENC_V1:' + encryptDisk(jsonStr), 'utf8');
    } else {
      fs.writeFileSync(DATA_FILE, jsonStr, 'utf8');
    }
    return true;
  } catch (err) {
    if (err && err.message && err.message.startsWith('FATAL:')) throw err;
    console.warn('Local file write notice:', err.message);
    return false;
  }
}

// ----------------------------------------------------------------------------
// Field Mapping Helpers (Snake_case <-> camelCase for Supabase)
// ----------------------------------------------------------------------------
function toCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const camelKey = k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
    out[camelKey] = v;
  }
  return out;
}

function mapAccountFromSql(r) {
  return {
    id: r.id,
    userId: r.user_id,
    ownerId: r.user_id,
    institution: r.institution,
    name: r.name,
    type: r.type,
    mask: r.mask || '0000',
    balance: Number(r.balance || 0),
    limit: Number(r.credit_limit || 0),
    creditLimit: Number(r.credit_limit || 0),
    apr: Number(r.apr || 0),
    minPayment: Number(r.min_payment || 0),
    dueDate: r.due_date || '',
    plAccountId: r.pl_account_id || '',
    isManual: Boolean(r.is_manual)
  };
}

function mapAccountToSql(a, userId) {
  return {
    id: a.id || `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    institution: a.institution || 'Unknown Bank',
    name: a.name || 'Account',
    type: ['credit', 'loan', 'investment'].includes(a.type) ? a.type : 'depository',
    mask: a.mask || '0000',
    balance: Number(a.balance || 0),
    credit_limit: Number(a.limit || a.creditLimit || 0),
    apr: Number(a.apr || 0),
    min_payment: Number(a.minPayment || 0),
    due_date: a.dueDate || '',
    pl_account_id: a.plAccountId || '',
    is_manual: Boolean(a.isManual),
    updated_at: new Date().toISOString()
  };
}

function mapBillFromSql(r) {
  return {
    id: r.id,
    userId: r.user_id,
    ownerId: r.user_id,
    biller: r.biller,
    name: r.name || r.biller,
    category: r.category || 'Utilities',
    expectedAmount: Number(r.expected_amount || 0),
    dueDay: Number(r.due_day || 1),
    dueDate: r.due_date || '',
    nextDueDate: r.next_due_date || r.due_date || '',
    frequency: r.frequency || 'monthly',
    status: r.status || 'upcoming',
    autopay: Boolean(r.autopay),
    notes: r.notes || '',
    lastPaidDate: r.last_paid_date || '',
    lastPaidAmount: Number(r.last_paid_amount || 0)
  };
}

function mapBillToSql(b, userId) {
  return {
    id: b.id || `bill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    biller: b.biller || b.name || 'Biller',
    name: b.name || b.biller || '',
    category: b.category || 'Utilities',
    expected_amount: Number(b.expectedAmount || 0),
    due_day: Number(b.dueDay || 1),
    due_date: b.dueDate || '',
    next_due_date: b.nextDueDate || b.dueDate || '',
    frequency: b.frequency || 'monthly',
    status: b.status || 'upcoming',
    autopay: Boolean(b.autopay),
    notes: b.notes || '',
    last_paid_date: b.lastPaidDate || '',
    last_paid_amount: Number(b.lastPaidAmount || 0),
    updated_at: new Date().toISOString()
  };
}

function mapSubFromSql(r) {
  return {
    id: r.id,
    userId: r.user_id,
    ownerId: r.user_id,
    service: r.service,
    name: r.service,
    category: r.category || 'Subscriptions',
    amount: Number(r.amount || 0),
    billingCycle: r.billing_cycle || 'monthly',
    nextBillingDate: r.next_billing_date || '',
    status: r.status || 'active'
  };
}

function mapSubToSql(s, userId) {
  return {
    id: s.id || `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    service: s.service || s.name || 'Subscription',
    category: s.category || 'Subscriptions',
    amount: Number(s.amount || 0),
    billing_cycle: s.billingCycle || 'monthly',
    next_billing_date: s.nextBillingDate || '',
    status: s.status || 'active',
    updated_at: new Date().toISOString()
  };
}

function mapTxFromSql(r) {
  return {
    id: r.id,
    userId: r.user_id,
    ownerId: r.user_id,
    accountId: r.account_id || '',
    description: r.description,
    name: r.name || r.description,
    amount: Number(r.amount || 0),
    date: r.date || '',
    category: r.category || 'General',
    status: r.status || 'posted',
    isManual: Boolean(r.is_manual),
    isRecurring: Boolean(r.is_recurring)
  };
}

function mapTxToSql(t, userId) {
  return {
    id: t.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    account_id: t.accountId || null,
    description: t.description || t.name || 'Transaction',
    name: t.name || t.description || '',
    amount: Number(t.amount || 0),
    date: t.date || new Date().toISOString().split('T')[0],
    category: t.category || 'General',
    status: t.status || 'posted',
    is_manual: Boolean(t.isManual),
    is_recurring: Boolean(t.isRecurring)
  };
}

function mapRetirementPlanFromSql(r) {
  return {
    id: r.id,
    userId: r.user_id,
    ownerId: r.user_id,
    planType: r.plan_type,
    name: r.name,
    provider: r.provider || '',
    tier: r.tier || '',
    yearsOfService: Number(r.years_of_service || 0),
    benefitFactorPct: Number(r.benefit_factor_pct || 0),
    highestAverageSalary: Number(r.highest_average_salary || 0),
    retirementAge: Number(r.retirement_age || 62),
    employeeContributionPct: Number(r.employee_contribution_pct || 0),
    estimatedMonthlyBenefit: Number(r.estimated_monthly_benefit || 0),
    balance: Number(r.balance || 0),
    employeeContribution: Number(r.employee_contribution || 0),
    employerMatch: Number(r.employer_match || 0),
    targetRetirementAge: Number(r.target_retirement_age || 65),
    notes: r.notes || ''
  };
}

function mapRetirementPlanToSql(p, userId) {
  return {
    id: p.id || `ret-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
    plan_type: p.planType || p.plan_type || '401k',
    name: p.name || 'Retirement Plan',
    provider: p.provider || '',
    tier: p.tier || '',
    years_of_service: Number(p.yearsOfService || 0),
    benefit_factor_pct: Number(p.benefitFactorPct || 0),
    highest_average_salary: Number(p.highestAverageSalary || 0),
    retirement_age: Number(p.retirementAge || 62),
    employee_contribution_pct: Number(p.employeeContributionPct || 0),
    estimated_monthly_benefit: Number(p.estimatedMonthlyBenefit || 0),
    balance: Number(p.balance || 0),
    employee_contribution: Number(p.employeeContribution || 0),
    employer_match: Number(p.employerMatch || 0),
    target_retirement_age: Number(p.targetRetirementAge || 65),
    notes: p.notes || '',
    updated_at: new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// Unified Database Interface
// ----------------------------------------------------------------------------
const db = {
  isSupabase: isSupabaseEnabled,

  /**
   * Look up a user by email address
   */
  async getUserByEmail(email) {
    const clean = String(email || '').trim().toLowerCase();
    if (!clean) return null;

    if (isSupabaseEnabled && supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', clean)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') {
        console.warn('Supabase getUserByEmail note:', error.message);
      }
      if (data) {
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          avatar: data.avatar,
          passwordHash: data.password_hash
        };
      }
      return null;
    }

    const data = readLocalData();
    return (data.users || []).find(u => u.email.toLowerCase() === clean) || null;
  },

  /**
   * Look up a user by user ID
   */
  async getUserById(id) {
    if (!id) return null;

    if (isSupabaseEnabled && supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') console.warn('Supabase getUserById note:', error.message);
      if (data) {
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          avatar: data.avatar,
          passwordHash: data.password_hash
        };
      }
      return null;
    }

    const data = readLocalData();
    return (data.users || []).find(u => u.id === id) || null;
  },

  /**
   * Create a new user record
   */
  async createUser(user) {
    if (isSupabaseEnabled && supabase) {
      const row = {
        id: user.id,
        email: user.email.trim().toLowerCase(),
        name: user.name,
        role: user.role || 'Member',
        avatar: user.avatar || '',
        password_hash: user.passwordHash || user.password_hash || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('users').insert(row);
      if (error) console.error('Supabase createUser error:', error.message);
      return user;
    }

    const data = readLocalData();
    data.users = data.users || [];
    data.users.push(user);
    writeLocalData(data);
    return user;
  },

  /**
   * Update user profile information
   */
  async updateUser(userId, updates) {
    if (isSupabaseEnabled && supabase) {
      const sqlUpdates = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) sqlUpdates.name = updates.name;
      if (updates.avatar !== undefined) sqlUpdates.avatar = updates.avatar;
      if (updates.passwordHash !== undefined) sqlUpdates.password_hash = updates.passwordHash;
      await supabase.from('users').update(sqlUpdates).eq('id', userId);
      return;
    }

    const data = readLocalData();
    const user = (data.users || []).find(u => u.id === userId);
    if (user) {
      Object.assign(user, updates);
      writeLocalData(data);
    }
  },

  /**
   * Create an authenticated session token for a user
   */
  async createSession(userId, tokenHash, expiresAt) {
    const session = {
      id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      tokenHash,
      createdAt: Date.now(),
      expiresAt: Number(expiresAt)
    };

    if (isSupabaseEnabled && supabase) {
      await supabase.from('user_sessions').insert({
        id: session.id,
        user_id: userId,
        token_hash: tokenHash,
        created_at: new Date(session.createdAt).toISOString(),
        expires_at: new Date(session.expiresAt).toISOString()
      });
      return session;
    }

    const data = readLocalData();
    const now = Date.now();
    data.sessions = (data.sessions || []).filter(s => s.expiresAt > now);
    data.sessions.push(session);
    writeLocalData(data);
    return session;
  },

  /**
   * Validate and retrieve session by token hash
   */
  async getSession(tokenHash) {
    if (!tokenHash) return null;

    if (isSupabaseEnabled && supabase) {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*, users(*)')
        .eq('token_hash', tokenHash)
        .gt('expires_at', nowIso)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') console.warn('Supabase getSession note:', error.message);
      if (data && data.users) {
        return {
          id: data.id,
          userId: data.user_id,
          tokenHash: data.token_hash,
          expiresAt: new Date(data.expires_at).getTime(),
          user: {
            id: data.users.id,
            email: data.users.email,
            name: data.users.name,
            role: data.users.role,
            avatar: data.users.avatar
          }
        };
      }
      return null;
    }

    const data = readLocalData();
    const now = Date.now();
    const session = (data.sessions || []).find(s => s.tokenHash === tokenHash && s.expiresAt > now);
    if (!session) return null;
    const user = (data.users || []).find(u => u.id === session.userId);
    return {
      ...session,
      user: user || null
    };
  },

  /**
   * Delete a session by token hash (logout)
   */
  async deleteSession(tokenHash) {
    if (!tokenHash) return;

    if (isSupabaseEnabled && supabase) {
      await supabase.from('user_sessions').delete().eq('token_hash', tokenHash);
      return;
    }

    const data = readLocalData();
    data.sessions = (data.sessions || []).filter(s => s.tokenHash !== tokenHash);
    writeLocalData(data);
  },

  /**
   * Read all data belonging strictly to the requested user
   */
  async readUserData(userId) {
    if (isSupabaseEnabled && supabase) {
      const uid = userId || 'u-default';
      const [
        userRes,
        accRes,
        billRes,
        subRes,
        txRes,
        budgetRes,
        savingsRes,
        assetRes,
        retirementRes,
        settingsRes,
        plaidRes
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', uid).maybeSingle(),
        supabase.from('accounts').select('*').eq('user_id', uid),
        supabase.from('bills').select('*').eq('user_id', uid),
        supabase.from('subscriptions').select('*').eq('user_id', uid),
        supabase.from('transactions').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(100),
        supabase.from('budgets').select('*').eq('user_id', uid),
        supabase.from('savings_goals').select('*').eq('user_id', uid),
        supabase.from('manual_assets').select('*').eq('user_id', uid),
        supabase.from('retirement_plans').select('*').eq('user_id', uid),
        supabase.from('user_settings').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('plaid_items').select('*').eq('user_id', uid)
      ]);

      const currentUser = userRes.data ? {
        id: userRes.data.id,
        email: userRes.data.email,
        name: userRes.data.name,
        role: userRes.data.role,
        avatar: userRes.data.avatar,
        passwordHash: userRes.data.password_hash
      } : null;

      const userSettingsObj = {};
      if (settingsRes.data) {
        userSettingsObj[uid] = {
          ai: {
            provider: settingsRes.data.ai_provider || 'gemini',
            model: settingsRes.data.ai_model || 'gemini-3.8-flash',
            encryptedKey: settingsRes.data.encrypted_ai_key || '',
            permissions: settingsRes.data.data_permissions || { bills: true, subscriptions: true, cards: true, purchases: true, retirement: true }
          },
          plaid: {
            encryptedClientId: settingsRes.data.encrypted_plaid_client_id || '',
            encryptedSecret: settingsRes.data.encrypted_plaid_secret || ''
          },
          featureFlags: settingsRes.data.feature_flags || {
            retirement: true,
            budgets: true,
            savingsGoals: true,
            vault: true
          }
        };
      }

      return {
        users: currentUser ? [currentUser] : [],
        sessions: [],
        accounts: (accRes.data || []).map(mapAccountFromSql),
        bills: (billRes.data || []).map(mapBillFromSql),
        subscriptions: (subRes.data || []).map(mapSubFromSql),
        transactions: (txRes.data || []).map(mapTxFromSql),
        budgets: (budgetRes.data || []).map(b => ({
          id: b.id,
          userId: b.user_id,
          category: b.category,
          monthlyLimit: Number(b.monthly_limit || 0),
          spent: Number(b.spent || 0)
        })),
        savingsGoals: (savingsRes.data || []).map(g => ({
          id: g.id,
          userId: g.user_id,
          name: g.name,
          targetAmount: Number(g.target_amount || 0),
          currentAmount: Number(g.current_amount || 0),
          targetDate: g.target_date || ''
        })),
        manualAssets: (assetRes.data || []).map(a => ({
          id: a.id,
          userId: a.user_id,
          name: a.name,
          type: a.type,
          value: Number(a.value || 0)
        })),
        retirementPlans: (retirementRes?.data || []).map(mapRetirementPlanFromSql),
        userSettings: userSettingsObj,
        plaidItems: (plaidRes.data || []).map(p => ({
          id: p.id,
          userId: p.user_id,
          itemId: p.item_id,
          institution: p.institution,
          accessTokenEnc: p.access_token_enc
        }))
      };
    }

    return readLocalData();
  },

  /**
   * Write and synchronize user data
   */
  async writeUserData(userId, data) {
    if (isSupabaseEnabled && supabase) {
      const uid = userId || 'u-default';
      const promises = [];

      // 1. Sync accounts for this user
      if (Array.isArray(data.accounts)) {
        const userAccs = data.accounts
          .filter(a => a.userId === uid || a.ownerId === uid)
          .map(a => mapAccountToSql(a, uid));
        if (userAccs.length > 0) {
          promises.push(supabase.from('accounts').upsert(userAccs, { onConflict: 'id' }));
        }
      }

      // 2. Sync bills for this user
      if (Array.isArray(data.bills)) {
        const userBills = data.bills
          .filter(b => b.userId === uid || b.ownerId === uid)
          .map(b => mapBillToSql(b, uid));
        if (userBills.length > 0) {
          promises.push(supabase.from('bills').upsert(userBills, { onConflict: 'id' }));
        }
      }

      // 3. Sync subscriptions for this user
      if (Array.isArray(data.subscriptions)) {
        const userSubs = data.subscriptions
          .filter(s => s.userId === uid || s.ownerId === uid)
          .map(s => mapSubToSql(s, uid));
        if (userSubs.length > 0) {
          promises.push(supabase.from('subscriptions').upsert(userSubs, { onConflict: 'id' }));
        }
      }

      // 4. Sync transactions for this user
      if (Array.isArray(data.transactions)) {
        const userTxs = data.transactions
          .filter(t => t.userId === uid || t.ownerId === uid)
          .map(t => mapTxToSql(t, uid));
        if (userTxs.length > 0) {
          promises.push(supabase.from('transactions').upsert(userTxs, { onConflict: 'id' }));
        }
      }

      // 5. Sync budgets
      if (Array.isArray(data.budgets)) {
        const userBudgets = data.budgets
          .filter(b => b.userId === uid)
          .map(b => ({
            id: b.id || `bgt-${b.category}-${uid}`,
            user_id: uid,
            category: b.category,
            monthly_limit: Number(b.monthlyLimit || 0),
            spent: Number(b.spent || 0),
            updated_at: new Date().toISOString()
          }));
        if (userBudgets.length > 0) {
          promises.push(supabase.from('budgets').upsert(userBudgets, { onConflict: 'user_id, category' }));
        }
      }

      // 6. Sync savings goals
      if (Array.isArray(data.savingsGoals)) {
        const userGoals = data.savingsGoals
          .filter(g => g.userId === uid)
          .map(g => ({
            id: g.id || `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            user_id: uid,
            name: g.name,
            target_amount: Number(g.targetAmount || 0),
            current_amount: Number(g.currentAmount || 0),
            target_date: g.targetDate || '',
            updated_at: new Date().toISOString()
          }));
        if (userGoals.length > 0) {
          promises.push(supabase.from('savings_goals').upsert(userGoals, { onConflict: 'id' }));
        }
      }

      // 7. Sync manual assets
      if (Array.isArray(data.manualAssets)) {
        const userAssets = data.manualAssets
          .filter(a => a.userId === uid)
          .map(a => ({
            id: a.id || `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            user_id: uid,
            name: a.name,
            type: a.type || 'Asset',
            value: Number(a.value || 0),
            updated_at: new Date().toISOString()
          }));
        if (userAssets.length > 0) {
          promises.push(supabase.from('manual_assets').upsert(userAssets, { onConflict: 'id' }));
        }
      }

      // 8. Sync retirement plans
      if (Array.isArray(data.retirementPlans)) {
        const userPlans = data.retirementPlans
          .filter(p => p.userId === uid || p.ownerId === uid)
          .map(p => mapRetirementPlanToSql(p, uid));
        if (userPlans.length > 0) {
          promises.push(supabase.from('retirement_plans').upsert(userPlans, { onConflict: 'id' }));
        }
      }

      // 9. Sync user settings
      if (data.userSettings && data.userSettings[uid]) {
        const st = data.userSettings[uid];
        promises.push(supabase.from('user_settings').upsert({
          user_id: uid,
          ai_provider: st.ai?.provider || 'gemini',
          ai_model: st.ai?.model || 'gemini-3.8-flash',
          encrypted_ai_key: st.ai?.encryptedKey || '',
          data_permissions: st.ai?.permissions || { bills: true, subscriptions: true, cards: true, purchases: true, retirement: true },
          encrypted_plaid_client_id: st.plaid?.encryptedClientId || '',
          encrypted_plaid_secret: st.plaid?.encryptedSecret || '',
          feature_flags: st.featureFlags || { retirement: true, budgets: true, savingsGoals: true, vault: true },
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }));
      }

      // 10. Sync plaid items
      if (Array.isArray(data.plaidItems)) {
        const userPlaids = data.plaidItems
          .filter(p => p.userId === uid)
          .map(p => ({
            id: p.id || `pi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            user_id: uid,
            item_id: p.itemId,
            institution: p.institution || 'Bank',
            access_token_enc: p.accessTokenEnc,
            updated_at: new Date().toISOString()
          }));
        if (userPlaids.length > 0) {
          promises.push(supabase.from('plaid_items').upsert(userPlaids, { onConflict: 'user_id, item_id' }));
        }
      }

      await Promise.all(promises);
      return true;
    }

    return writeLocalData(data);
  },

  /**
   * Delete an item by table and ID
   */
  async deleteItem(table, id, userId) {
    if (isSupabaseEnabled && supabase) {
      await supabase.from(table).delete().eq('id', id).eq('user_id', userId);
      return;
    }

    const data = readLocalData();
    if (data[table]) {
      data[table] = data[table].filter(item => !(item.id === id && (!userId || item.ownerId === userId || item.userId === userId)));
      writeLocalData(data);
    }
  }
};

module.exports = db;
