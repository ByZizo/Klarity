-- ============================================================================
-- KLARITY PRODUCTION DATABASE SCHEMA
--
-- Security Model:
-- 1. Row Level Security (RLS) is ENABLED on every table.
-- 2. No open policies (no USING (true)). Direct public/anonymous reads and writes are DENIED.
-- 3. The backend server connects via SUPABASE_SERVICE_ROLE_KEY, which inherently
--    bypasses RLS to perform authorized, user-scoped operations safely from the server.
-- 4. All data tables are strictly keyed by user_id with cascading foreign keys to users.
-- ============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Member',
  avatar TEXT DEFAULT '',
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Sessions Table (Per-user session tokens with 7-day expiry)
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 3. Connected Bank & Credit Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'depository', 'loan', 'investment')),
  mask TEXT NOT NULL DEFAULT '0000',
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  credit_limit NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  apr NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  min_payment NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  due_date TEXT DEFAULT '',
  pl_account_id TEXT DEFAULT '',
  is_manual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- 4. Recurring Bills & Utilities Table
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  biller TEXT NOT NULL,
  name TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Utilities',
  expected_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  due_day INT DEFAULT 1,
  due_date TEXT DEFAULT '',
  next_due_date TEXT DEFAULT '',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due_soon', 'paid', 'archived', 'pending')),
  autopay BOOLEAN DEFAULT FALSE,
  notes TEXT DEFAULT '',
  last_paid_date TEXT DEFAULT '',
  last_paid_amount NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);

-- 5. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Subscriptions',
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  next_billing_date TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- 6. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  name TEXT DEFAULT '',
  amount NUMERIC(12, 2) NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'posted',
  is_manual BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- 7. Monthly Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  spent NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);

-- 8. Savings Goals Table
CREATE TABLE IF NOT EXISTS savings_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  target_date TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);

-- 9. Manual Assets Table (Vehicles, Real Estate, Investments)
CREATE TABLE IF NOT EXISTS manual_assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Asset',
  value NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_assets_user_id ON manual_assets(user_id);

-- 10. User Settings Table (Encrypted API keys, permissions, and feature flags per user)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ai_provider TEXT DEFAULT 'gemini',
  ai_model TEXT DEFAULT 'gemini-3.8-flash',
  encrypted_ai_key TEXT DEFAULT '',
  data_permissions JSONB DEFAULT '{"bills": true, "subscriptions": true, "cards": true, "purchases": true, "retirement": true}'::jsonb,
  encrypted_plaid_client_id TEXT DEFAULT '',
  encrypted_plaid_secret TEXT DEFAULT '',
  feature_flags JSONB DEFAULT '{"retirement": true, "budgets": true, "savingsGoals": true, "vault": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Plaid Link Items Table (Encrypted bank access tokens per user)
CREATE TABLE IF NOT EXISTS plaid_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  institution TEXT NOT NULL,
  access_token_enc TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON plaid_items(user_id);

-- 12. Retirement Plans Table (Pensions, 401k, 403b, 457, IRA, Roth IRA, Social Security)
CREATE TABLE IF NOT EXISTS retirement_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL, -- 'pension', '401k', '403b', '457', 'ira', 'roth_ira', 'social_security'
  name TEXT NOT NULL,
  provider TEXT DEFAULT '',
  tier TEXT DEFAULT '',
  years_of_service NUMERIC(6, 2) DEFAULT 0,
  benefit_factor_pct NUMERIC(6, 3) DEFAULT 0,
  highest_average_salary NUMERIC(14, 2) DEFAULT 0,
  retirement_age INT DEFAULT 62,
  employee_contribution_pct NUMERIC(6, 3) DEFAULT 0,
  estimated_monthly_benefit NUMERIC(14, 2) DEFAULT 0,
  balance NUMERIC(14, 2) DEFAULT 0,
  employee_contribution NUMERIC(14, 2) DEFAULT 0,
  employer_match NUMERIC(14, 2) DEFAULT 0,
  target_retirement_age INT DEFAULT 65,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retirement_plans_user_id ON retirement_plans(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) ENFORCEMENT
-- All public/anonymous access is DENIED. Only service-role backend access is authorized.
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE retirement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;
