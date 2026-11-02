# Klarity

A clean, private finance tracker with a built-in AI assistant to help you stay on top of your money, cards, and bills.

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
- **100% Private** — Your financial data is AES-256 encrypted on your machine. You own your data.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

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

3. Set up environment variables:
   Copy `.env.example` to `.env` and add your optional API keys (Gemini, Plaid, Google OAuth):
   ```bash
   cp .env.example .env
   ```

4. Run the app:
   ```bash
   npm start
   ```

For the desktop app:
```bash
npx electron .
```

---

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons
- **Desktop:** Electron
- **Backend:** Node.js, Express
- **AI Integration:** Google Gemini, OpenAI, Anthropic Claude
- **Bank Connectivity:** Plaid API
- **Security:** AES-256-GCM client-side encryption

---

## License

MIT License. Free to use and customize.
