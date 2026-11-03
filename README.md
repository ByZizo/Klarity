# Klarity

A clean, private finance tracker with a built-in AI assistant to help you stay on top of your money, cards, and bills.

[![Download for Windows](https://img.shields.io/badge/Download-Windows%20(.exe)-18457c?logo=windows&style=for-the-badge)](https://github.com/ByZizo/Klarity/releases)

---

## 📥 Download & Install (Easiest Way)

No coding or terminal needed. To install Klarity on your computer:

1. Go to the **[Releases Page](https://github.com/ByZizo/Klarity/releases)**.
2. Download **`Klarity-Setup.exe`** (or the portable `.exe`).
3. Double-click the file to install and open Klarity. An icon will automatically be placed on your desktop.

---

## What is Klarity?

Klarity gives you a simple, single dashboard to manage your financial life without ads, data selling, or clutter. Whether you want to connect your bank accounts or enter everything manually, Klarity helps you track balances, plan debt payoffs, and stay ahead of upcoming bills.

It also includes a built-in AI financial advisor that analyzes your real numbers and gives you direct, practical advice—like how to pay down high-interest cards fastest, where you can trim monthly expenses, and how much you can safely save.

---

## Key Features

- **Cards & Balances** — Track all your checking, savings, and credit accounts in one place with live Plaid syncing or manual entries.
- **Bill & Subscription Tracker** — Keep tabs on upcoming due dates, autopay settings, and recurring charges so you never miss a payment.
- **Budgets & Spending** — Set monthly spending targets across categories (groceries, dining, gas, shopping) and monitor your progress.
- **Debt Payoff Engine** — Compare payoff methods like Avalanche vs. Snowball with clear timelines, interest savings, and payoff dates.
- **AI Financial Assistant** — Ask questions about your money, get debt payoff recommendations, or analyze your spending. Works with Google Gemini, OpenAI, or Claude.
- **Password & Account Vault** — A secure, client-side encrypted vault to keep financial logins, account numbers, and notes safe.
- **100% Private & Bank-Grade Security** — Your financial data is encrypted locally using the standard browser **Web Crypto API (AES-256-GCM)**. Encryption keys and master PINs are derived with **PBKDF2 (SHA-256, 600,000 iterations)** with cryptographically random salts (`crypto.getRandomValues`). You own your data.

---

## 💻 For Developers (Run from Source)

If you prefer to run or build from source code:

1. Clone the repository:
   ```bash
   git clone https://github.com/ByZizo/Klarity.git
   cd Klarity
   ```

2. Install dependencies:
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. Run the desktop app:
   ```bash
   npx electron .
   ```

4. Build your own Windows installer (.exe):
   ```bash
   npm run dist
   ```

---

## Tech Stack & Security

- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons
- **Desktop:** Electron, Electron Builder
- **Backend:** Node.js, Express
- **AI Integration:** Google Gemini, OpenAI, Anthropic Claude
- **Bank Connectivity:** Plaid API
- **Cryptography Engine:** Browser Web Crypto API (`window.crypto.subtle`)
  - **Symmetric Cipher:** Authenticated AES-256-GCM (12-byte IV, 128-bit authentication tag)
  - **Key Derivation & Hashing:** PBKDF2 with SHA-256 and 600,000 iterations (NIST SP 800-132)
  - **Randomness:** Hardware-backed `crypto.getRandomValues` exclusively (zero `Math.random` fallbacks)
  - **Master PIN Protection:** PBKDF2 hash verification with brute-force lockout (5 attempts -> 60s cooldown)
  - **Data Migration:** Backward-compatible decryption for legacy `ENCv2:` values with automatic upgrade to `ENCv3:` AES-256-GCM
  - **Data Injection Shield:** Active anti-XSS and CSV/Excel formula injection (DDE) sanitization

---

## License

MIT License. Free to use and customize.
