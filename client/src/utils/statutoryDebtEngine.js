/**
 * Statutory Debt & Legal Protection Engine
 * 
 * Implements:
 * 1. Statutory Legal Protection & Judgment-Proof Calculations:
 *    - 42 U.S.C. § 407 (Social Security Act § 207)
 *    - California Code of Civil Procedure § 704.110 (CalPERS / Public Pensions)
 *    - 31 CFR Part 212 (Federal 2-Month Automatic Bank Shield Lookback)
 * 2. Underwriting & Household Income Engine:
 *    - 12 CFR § 1026.51 (CARD Act Shared Household Income Rule)
 * 3. Exact Amortization Payoff Engine (Scenarios A, B, C, D)
 */

/**
 * @typedef {Object} IncomeStream
 * @property {string} id
 * @property {string} label
 * @property {number} amount - Monthly amount in dollars
 * @property {'social_security' | 'calpers' | 'w2' | 'pension' | 'other'} type
 * @property {boolean} isStatutorilyExempt
 * @property {string} statutoryBasis
 */

/**
 * @typedef {Object} DebtAccount
 * @property {string} id
 * @property {string} name
 * @property {string} institution - e.g. 'American Express', 'Citibank', 'Discover', 'Chase'
 * @property {string} mask - e.g. '4417'
 * @property {number} balance
 * @property {number} standardApr
 * @property {number} [promoApr]
 * @property {string} [promoEndDate]
 * @property {number} minimumPayment
 * @property {'active' | 'hardship_enrolled' | 'closed'} hardshipStatus
 */

/**
 * Default sample income streams for California seniors & household members
 * @type {IncomeStream[]}
 */
export const DEFAULT_INCOME_STREAMS = [];

/**
 * Calculate Judgment-Proof Shield and 31 CFR Part 212 Lookback Cushion
 * 
 * @param {IncomeStream[]} incomeStreams
 * @returns {{
 *   totalMonthlyIncome: number,
 *   shieldedMonthlyIncome: number,
 *   garnishableMonthlyIncome: number,
 *   shieldedRatioPercent: number,
 *   lookbackBankCushion: number,
 *   isFullyJudgmentProof: boolean,
 *   exemptStreams: IncomeStream[],
 *   nonExemptStreams: IncomeStream[]
 * }}
 */
export function calculateJudgmentProofRatio(incomeStreams = []) {
  const streams = Array.isArray(incomeStreams) ? incomeStreams : [];
  
  let totalMonthlyIncome = 0;
  let shieldedMonthlyIncome = 0;
  const exemptStreams = [];
  const nonExemptStreams = [];

  for (const stream of streams) {
    const amt = Math.max(0, Number(stream.amount) || 0);
    totalMonthlyIncome += amt;

    const isExempt = stream.isStatutorilyExempt || 
      stream.type === 'social_security' || 
      stream.type === 'calpers' || 
      stream.type === 'pension';

    if (isExempt) {
      shieldedMonthlyIncome += amt;
      exemptStreams.push(stream);
    } else {
      nonExemptStreams.push(stream);
    }
  }

  const garnishableMonthlyIncome = Math.max(0, totalMonthlyIncome - shieldedMonthlyIncome);
  const shieldedRatioPercent = totalMonthlyIncome > 0 
    ? Math.min(100, (shieldedMonthlyIncome / totalMonthlyIncome) * 100) 
    : 0;

  // 31 CFR Part 212 mandates that financial institutions automatically shield the preceding 
  // 2-month lookback period of direct-deposited federal and statutory benefits from private levies
  const lookbackBankCushion = shieldedMonthlyIncome * 2;

  const isFullyJudgmentProof = shieldedRatioPercent >= 99.9 || garnishableMonthlyIncome <= 0;

  return {
    totalMonthlyIncome,
    shieldedMonthlyIncome,
    garnishableMonthlyIncome,
    shieldedRatioPercent,
    lookbackBankCushion,
    isFullyJudgmentProof,
    exemptStreams,
    nonExemptStreams
  };
}

/**
 * Calculate Debt-to-Income (DTI) under Individual vs Household mode (12 CFR § 1026.51)
 * 
 * @param {DebtAccount[]} debtAccounts
 * @param {IncomeStream[]} incomeStreams
 * @param {'individual' | 'household'} mode
 * @returns {{
 *   totalDebtMinPayment: number,
 *   effectiveIncome: number,
 *   dtiPercent: number,
 *   dtiTier: 'prime' | 'moderate' | 'strained',
 *   underwritingNote: string,
 *   realisticCreditIncreaseCap: string
 * }}
 */
export function calculateDTI(debtAccounts = [], incomeStreams = [], mode = 'individual') {
  const debts = Array.isArray(debtAccounts) ? debtAccounts : [];
  const streams = Array.isArray(incomeStreams) ? incomeStreams : [];

  const totalDebtMinPayment = debts.reduce((sum, d) => {
    if (d.minimumPayment && d.minimumPayment > 0) return sum + Number(d.minimumPayment);
    // Standard default credit card minimum payment estimate: max($25, 2.5% of balance)
    const bal = Math.max(0, Number(d.balance) || 0);
    return sum + Math.max(25, bal * 0.025);
  }, 0);

  let effectiveIncome = 0;
  for (const stream of streams) {
    const amt = Math.max(0, Number(stream.amount) || 0);
    if (mode === 'household') {
      effectiveIncome += amt;
    } else {
      // Individual mode excludes shared household-only streams
      if (stream.id !== 'inc-w2-hh' && !stream.label?.toLowerCase().includes('household')) {
        effectiveIncome += amt;
      }
    }
  }

  const dtiPercent = effectiveIncome > 0 ? (totalDebtMinPayment / effectiveIncome) * 100 : 0;

  let dtiTier = 'prime';
  let underwritingNote = 'Strong DTI. Commercial lenders favor approval for standard limits.';
  let realisticCreditIncreaseCap = '$2,500 - $5,000';

  if (dtiPercent >= 45) {
    dtiTier = 'strained';
    underwritingNote = 'DTI exceeds conservative underwriting limits (>45%). Unlikely to receive automated limit bumps. Ideal candidate for 0% Hardship/DMP account closure.';
    realisticCreditIncreaseCap = '$0 - $1,500 (Manual underwriter review required)';
  } else if (dtiPercent >= 32) {
    dtiTier = 'moderate';
    underwritingNote = 'Moderate DTI under 12 CFR § 1026.51. Automated reconsiderations realistically yield conservative bumps of $1,500 - $2,500.';
    realisticCreditIncreaseCap = '$1,500 - $2,500';
  }

  return {
    totalDebtMinPayment,
    effectiveIncome,
    dtiPercent,
    dtiTier,
    underwritingNote,
    realisticCreditIncreaseCap
  };
}

/**
 * 4-Option Payoff Simulator:
 * - Scenario A: Minimum Payment Trap (dynamic min payments, 20+ years, high interest)
 * - Scenario B: Fixed Accelerated Repayment ($400/mo fixed)
 * - Scenario C: Internal Hardship Program / NFCC DMP (0% APR, 36-48 months, account closed)
 * - Scenario D: Family Qard Hasan / CalPERS 457 Loan (0% external interest to banks)
 * 
 * @param {number} totalBalance
 * @param {number} [apr=24.0]
 * @param {number} [customFixedPayment=400]
 * @returns {{
 *   balance: number,
 *   apr: number,
 *   scenarioA: {
 *     title: string,
 *     initialMonthlyPayment: number,
 *     monthOneInterest: number,
 *     monthOnePrincipal: number,
 *     interestSplitPercent: number,
 *     monthsToFreedom: number,
 *     yearsToFreedom: number,
 *     totalInterestPaid: number,
 *     totalPaid: number,
 *     summary: string
 *   },
 *   scenarioB: {
 *     title: string,
 *     monthlyPayment: number,
 *     monthsToFreedom: number,
 *     yearsToFreedom: number,
 *     totalInterestPaid: number,
 *     totalPaid: number,
 *     interestSavedVsA: number,
 *     summary: string
 *   },
 *   scenarioC: {
 *     title: string,
 *     concessionApr: number,
 *     monthlyPayment: number,
 *     monthsToFreedom: number,
 *     totalInterestPaid: number,
 *     totalPaid: number,
 *     interestSavedVsA: number,
 *     summary: string
 *   },
 *   scenarioD: {
 *     title: string,
 *     monthlyPayment: number,
 *     monthsToFreedom: number,
 *     totalInterestPaid: number,
 *     totalPaid: number,
 *     interestSavedVsA: number,
 *     summary: string
 *   }
 * }}
 */
export function simulatePayoffScenarios(totalBalance, apr = 21.0, customFixedPayment = null) {
  const balance = Math.max(0, Number(totalBalance) || 0);
  const nominalApr = Math.max(0.1, Number(apr) || 21.0);
  const monthlyRate = (nominalApr / 100) / 12;

  if (balance <= 0) {
    const zeroScen = {
      title: 'Debt Free',
      initialMonthlyPayment: 0,
      monthlyPayment: 0,
      monthOneInterest: 0,
      monthOnePrincipal: 0,
      interestSplitPercent: 0,
      monthsToFreedom: 0,
      yearsToFreedom: 0,
      totalInterestPaid: 0,
      totalPaid: 0,
      interestSavedVsA: 0,
      summary: 'No debt balance carrying on this selection.'
    };
    return {
      balance: 0,
      apr: nominalApr,
      scenarioA: zeroScen,
      scenarioB: zeroScen,
      scenarioC: zeroScen,
      scenarioD: zeroScen
    };
  }

  // -------------------------------------------------------------
  // Scenario A: Minimum Payment Trap
  // -------------------------------------------------------------
  // Initial minimum payment: usually max($25, 1% balance + monthly interest) or 2.5% of balance
  const monthOneInterest = balance * monthlyRate;
  const initialMinPayment = Math.max(35, Math.round((balance * 0.01 + monthOneInterest) * 100) / 100);
  const monthOnePrincipal = Math.max(0, initialMinPayment - monthOneInterest);
  const interestSplitPercent = initialMinPayment > 0 
    ? Math.round((monthOneInterest / initialMinPayment) * 100) 
    : 0;

  // Run month-by-month simulation for Scenario A
  let curBalA = balance;
  let monthsA = 0;
  let totalInterestA = 0;
  let totalPaidA = 0;
  const maxMonths = 360; // 30-year safety ceiling

  while (curBalA > 1 && monthsA < maxMonths) {
    monthsA++;
    const monthlyInt = curBalA * monthlyRate;
    totalInterestA += monthlyInt;

    // Minimum payment rule: max($25, 1% balance + interest)
    const minPay = Math.max(25, curBalA * 0.01 + monthlyInt);
    const actualPay = Math.min(curBalA + monthlyInt, minPay);
    totalPaidA += actualPay;

    const principalPaid = actualPay - monthlyInt;
    curBalA -= principalPaid;
    if (curBalA <= 0.5) curBalA = 0;
  }

  const scenarioA = {
    title: 'Minimum Payment Trap',
    initialMonthlyPayment: initialMinPayment,
    monthOneInterest: Math.round(monthOneInterest),
    monthOnePrincipal: Math.round(monthOnePrincipal),
    interestSplitPercent,
    monthsToFreedom: monthsA,
    yearsToFreedom: Math.round((monthsA / 12) * 10) / 10,
    totalInterestPaid: Math.round(totalInterestA),
    totalPaid: Math.round(totalPaidA),
    summary: `${interestSplitPercent}% of your first payment goes straight to interest. Takes ${Math.round(monthsA / 12)}+ years and burns $${Math.round(totalInterestA).toLocaleString()} in interest.`
  };

  // -------------------------------------------------------------
  // Scenario B: Fixed Accelerated Repayment
  // -------------------------------------------------------------
  const minRequiredB = Math.max(25, Math.round(monthOneInterest + 25));
  const defaultTargetB = Math.max(minRequiredB, Math.round(balance / 18));
  const fixedPayB = Math.max(minRequiredB, Number(customFixedPayment) || defaultTargetB);

  let curBalB = balance;
  let monthsB = 0;
  let totalInterestB = 0;
  let totalPaidB = 0;

  while (curBalB > 1 && monthsB < maxMonths) {
    monthsB++;
    const monthlyInt = curBalB * monthlyRate;
    totalInterestB += monthlyInt;

    const actualPay = Math.min(curBalB + monthlyInt, fixedPayB);
    totalPaidB += actualPay;

    curBalB -= (actualPay - monthlyInt);
    if (curBalB <= 0.5) curBalB = 0;
  }

  const scenarioB = {
    title: 'Fixed Accelerated Payment',
    monthlyPayment: fixedPayB,
    monthsToFreedom: monthsB,
    yearsToFreedom: Math.round((monthsB / 12) * 10) / 10,
    totalInterestPaid: Math.round(totalInterestB),
    totalPaid: Math.round(totalPaidB),
    interestSavedVsA: Math.max(0, Math.round(totalInterestA - totalInterestB)),
    summary: `Fixed $${fixedPayB}/mo eliminates the debt in ${monthsB} months and saves $${Math.max(0, Math.round(totalInterestA - totalInterestB)).toLocaleString()} in interest vs minimums.`
  };

  // -------------------------------------------------------------
  // Scenario C: Internal Hardship Program / NFCC DMP (0% APR)
  // -------------------------------------------------------------
  // 36-month fixed repayment at 0% APR (or concessionary 0-6%)
  const monthsC = 36;
  const fixedPayC = Math.round((balance / monthsC) * 100) / 100;
  const totalInterestC = 0;
  const totalPaidC = balance;

  const scenarioC = {
    title: '0% Bank Hardship / NFCC DMP',
    concessionApr: 0.0,
    monthlyPayment: fixedPayC,
    monthsToFreedom: monthsC,
    totalInterestPaid: 0,
    totalPaid: totalPaidC,
    interestSavedVsA: Math.round(totalInterestA),
    summary: `Enrolls in internal bank financial relief or NFCC plan. Rate slashed to 0%, card closed, 100% principal payoff in 36 months ($0 interest).`
  };

  // -------------------------------------------------------------
  // Scenario D: Family Qard Hasan / CalPERS 457 Loan
  // -------------------------------------------------------------
  // Zero-interest family pool or structured 457 relief on real balance
  const monthsD = Math.max(6, Math.min(60, Math.round(balance / 150) || 24));
  const fixedPayD = Math.round((balance / monthsD) * 100) / 100;

  const scenarioD = {
    title: 'Family 0% Pool / CalPERS 457 Loan',
    monthlyPayment: fixedPayD,
    monthsToFreedom: monthsD,
    totalInterestPaid: 0,
    totalPaid: balance,
    interestSavedVsA: Math.round(totalInterestA),
    summary: `100% interest-free structured payoff. Zero dollars paid to commercial banks.`
  };

  return {
    balance,
    apr: nominalApr,
    scenarioA,
    scenarioB,
    scenarioC,
    scenarioD
  };
}

/**
 * Hardship Playbook Creditor Directory with Direct Phone Scripts
 */
/**
 * Hardship Playbook Creditor Directory with Direct Phone Scripts (12 Major Issuers)
 */
export const HARDSHIP_CREDITORS = [
  {
    institution: 'American Express',
    slug: 'amex',
    category: 'Major Issuers',
    department: 'Financial Relief Program (FRP)',
    phone: '1-866-703-4169',
    onlineUrl: 'https://www.americanexpress.com/financial-relief',
    typicalTerms: '0% - 9.99% APR, 12 - 48 month fixed amortization, account closed/suspended',
    hardshipPhoneScript: (cardholderName, mask, balance) => 
      `"Hello, my name is ${cardholderName || 'Cardholder'}. I am calling regarding my American Express account ending in ${mask || 'XXXX'} (current balance: $${Number(balance || 0).toLocaleString()}). I am an elderly retiree living on a fixed CalPERS public pension and Social Security. Due to inflation and living expenses, the current APR is making it mathematically impossible to reduce my principal balance. I want to honor my obligations and repay 100% of my debt, but I cannot sustain this interest rate. I am requesting to enroll this card into the American Express Financial Relief Program (FRP) with a 0% to reduced APR and a structured payoff plan in exchange for closing the account."`
  },
  {
    institution: 'Citibank',
    slug: 'citi',
    category: 'Major Issuers',
    department: 'Consumer Hardship & Workout Department',
    phone: '1-800-950-5114',
    onlineUrl: 'https://www.citi.com',
    typicalTerms: '0% - 6% APR, 36 - 60 month fixed monthly payments, account closed',
    hardshipPhoneScript: (cardholderName, mask, balance) => 
      `"Hello, my name is ${cardholderName || 'Cardholder'}. I am calling about my Citi card ending in ${mask || 'XXXX'} with a balance of $${Number(balance || 0).toLocaleString()}. I am on a fixed retirement pension and Social Security. The monthly interest charges consume most of my payment, preventing principal reduction. Under California CCP § 704.110 and federal law, my pension and Social Security are statutorily judgment-proof, but I want to pay Citi back every dollar borrowed. I am formally asking for Citi's internal Hardship Workout Program with a 0% rate and a 48 to 60 month payment schedule."`
  },
  {
    institution: 'Discover',
    slug: 'discover',
    category: 'Major Issuers',
    department: 'Hardship Assistance Team',
    phone: '1-800-347-2683',
    onlineUrl: 'https://www.discover.com',
    typicalTerms: '0.99% - 9.99% APR, 12 - 60 months, account closed to new spending',
    hardshipPhoneScript: (cardholderName, mask, balance) => 
      `"Hello, I am calling about my Discover account ending in ${mask || 'XXXX'} ($${Number(balance || 0).toLocaleString()} balance). I am retired on Social Security and CalPERS. The ongoing interest is causing severe financial distress. I am requesting enrollment in Discover's Hardship Assistance Program for a reduced/0% APR and fixed monthly repayment plan so I can retire this balance in full."`
  },
  {
    institution: 'Chase',
    slug: 'chase',
    category: 'Major Issuers',
    department: 'Special Assistance / Card Workout Department',
    phone: '1-800-436-7941',
    onlineUrl: 'https://www.chase.com',
    typicalTerms: '2% - 6% APR, 36 - 60 month structured payoff, account closed',
    hardshipPhoneScript: (cardholderName, mask, balance) => 
      `"Hello, I am calling regarding my Chase card ending in ${mask || 'XXXX'}. My current balance is $${Number(balance || 0).toLocaleString()}. I am an elderly retiree on a fixed state pension and Social Security. I am requesting enrollment into Chase's Special Assistance Workout Program with a reduced interest rate and fixed payment plan in exchange for closing the card to future charges."`
  },
  {
    institution: 'Capital One',
    slug: 'capitalone',
    category: 'Major Issuers',
    department: 'Payment Assistance & Hardship Department',
    phone: '1-800-227-4825',
    onlineUrl: 'https://www.capitalone.com',
    typicalTerms: '0% - 9.9% APR, 24 - 60 month fixed repayment plan, card restricted/closed',
    hardshipPhoneScript: (cardholderName, mask, balance) => 
      `"Hello, my name is ${cardholderName || 'Cardholder'}. I am calling about my Capital One account ending in ${mask || 'XXXX'} with a balance of $${Number(balance || 0).toLocaleString()}. I am living on fixed statutory retirement benefits (CalPERS pension and Social Security). The high APR is making minimum payments ineffective against principal. I want to pay back 100% of the principal without interest burden. I am formally asking to be transferred to your Hardship & Payment Assistance Department to enter a fixed payoff plan with 0% interest in exchange for closing the card."`
  },
  {
    institution: 'Bank of America',
    slug: 'bofa',
    category: 'Major Issuers',
    department: 'Credit Card Hardship Assistance Program',
    phone: '1-800-732-9194',
    onlineUrl: 'https://www.bankofamerica.com',
    typicalTerms: '0% - 5.9% APR, 36 - 60 month structured repayment, account closed',
    hardshipPhoneScript: (cardholderName, mask, balance) => 
      `"Hello, I am calling regarding my Bank of America credit card ending in ${mask || 'XXXX'} (balance: $${Number(balance || 0).toLocaleString()}). I am an elderly retiree on fixed retirement income. Under California CCP § 704.110 and Social Security § 207, my income is legally exempt from collection. However, I want to honor my obligation. I am requesting Bank of America's internal Hardship Program with a 0% to low fixed interest rate over 48 to 60 months so my full payments go directly to principal."`
  },
  {
    institution: 'Wells Fargo',
    slug: 'wellsfargo',
    category: 'Major Issuers',
    department: 'Credit Card Payment Assistance & Workout Team',
    phone: '1-800-642-4720',
    onlineUrl: 'https://www.wellsfargo.com',
    typicalTerms: '1% - 7.9% APR, 36 - 60 month fixed payoff, card closed',
    hardshipPhoneScript: (cardholderName, mask, balance) => 
      `"Hello, I am calling about my Wells Fargo card ending in ${mask || 'XXXX'} with a balance of $${Number(balance || 0).toLocaleString()}. As a senior living on Social Security and public pension, the compound interest is creating an unsustainable hardship. I am requesting Wells Fargo's Payment Assistance Hardship Program with an interest rate reduction down to 0% and a structured monthly payment plan to clear the balance."`
  },
  {
    institution: 'Barclays',
    slug: 'barclays',
    category: 'Major Issuers',
    department: 'Cardholder Assistance Program (CAP)',
    phone: '1-866-928-8598',
    onlineUrl: 'https://www.barclaysus.com',
    typicalTerms: '0% - 4% APR, 36 - 60 month amortized payoff, account closed',
    hardshipPhoneScript: (cardholderName, mask, balance) => 
      `"Hello, I am calling about my Barclays credit card ending in ${mask || 'XXXX'} ($${Number(balance || 0).toLocaleString()} balance). I am retired on a fixed budget. Due to rising costs of living, I cannot sustain the standard interest rate. I am requesting enrollment in the Barclays Cardholder Assistance Program with a 0% rate and a 36 to 60 month payoff schedule in exchange for closing the card."`
  },
  {
    institution: 'Synchrony Bank',
    slug: 'synchrony',
    category: 'Retail & Store Cards',
    department: 'Retail Card Hardship & Workout Program',
    phone: '1-866-419-4096',
    onlineUrl: 'https://www.synchrony.com',
    typicalTerms: "0% - 9.99% APR, 36 - 60 months (Amazon, Lowes, CareCredit, TJX), card closed",
    hardshipPhoneScript: (cardholderName, mask, balance) => 
      `"Hello, I am calling regarding my Synchrony store credit card ending in ${mask || 'XXXX'} (balance: $${Number(balance || 0).toLocaleString()}). I am a senior living on fixed retirement income. The store card's 29.99%+ APR is excessive and eating up my entire fixed payment. Under federal law, my retirement funds are judgment-proof, but I want to pay back what I borrowed. I am requesting Synchrony's internal Hardship Workout Program with a 0% interest freeze and fixed monthly payment plan."`
  },
  {
    institution: 'U.S. Bank',
    slug: 'usbank',
    category: 'Major Issuers',
    department: 'Cardmember Assistance / Workout Solutions',
    phone: '1-800-285-8585',
    onlineUrl: 'https://www.usbank.com',
    typicalTerms: '0% - 6% APR, 36 - 60 month fixed amortization, card closed',
    hardshipPhoneScript: (cardholderName, mask, balance) => 
      `"Hello, I am calling regarding my U.S. Bank credit card ending in ${mask || 'XXXX'} with a balance of $${Number(balance || 0).toLocaleString()}. I am calling because my fixed pension and Social Security cannot sustain the current monthly interest charges. I want to pay my balance in full and am asking for U.S. Bank's Cardmember Assistance Workout Program with 0% interest and a fixed monthly payoff agreement."`
  },
  {
    institution: 'Goldman Sachs (Apple Card)',
    slug: 'applecard',
    category: 'Retail & Tech Cards',
    department: 'Apple Card Customer Assistance / Financial Relief',
    phone: '1-877-255-5923',
    onlineUrl: 'https://support.apple.com/apple-card',
    typicalTerms: '0% APR for 12 - 36 months, payment pause or fixed workout, card restricted',
    hardshipPhoneScript: (cardholderName, mask, balance) => 
      `"Hello, I am calling regarding my Apple Card account ending in ${mask || 'XXXX'} (balance: $${Number(balance || 0).toLocaleString()}). I am an elderly retiree on fixed retirement income experiencing financial hardship. I am requesting to speak with an Apple Card Customer Assistance Specialist regarding your Financial Assistance / Payment Relief Program to lower my APR to 0% and set up a structured repayment plan."`
  },
  {
    institution: 'TD Bank (Target Circle Card)',
    slug: 'tdbank',
    category: 'Retail & Tech Cards',
    department: 'Retail Card Workout & Hardship Services',
    phone: '1-800-659-6569',
    onlineUrl: 'https://www.td.com',
    typicalTerms: '0% - 5.99% APR, 36 - 60 month workout plan, card closed',
    hardshipPhoneScript: (cardholderName, mask, balance) => 
      `"Hello, I am calling about my Target Circle / TD Bank credit card ending in ${mask || 'XXXX'} with a balance of $${Number(balance || 0).toLocaleString()}. I am retired on Social Security and CalPERS. The high APR makes it impossible to pay down the balance. I am requesting enrollment in your Hardship Workout Program with 0% interest and a fixed monthly payoff schedule."`
  }
];

/**
 * Scan bank transactions for recurring Social Security or Pension direct deposits
 * @param {Array} transactions
 * @returns {Array} detected benefit streams
 */
export function detectRetirementDeposits(transactions = []) {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];
  const results = [];
  const seenTypes = new Set();
  
  for (const tx of transactions) {
    const name = (tx.name || tx.merchantName || '').toUpperCase();
    const amount = Math.abs(Number(tx.amount || 0));
    
    // Look for deposits (in Plaid/banking, deposits often appear as inflow > $200)
    if (amount < 200) continue;
    
    // Social Security patterns
    if ((name.includes('SSA ') || name.includes('SOC SEC') || name.includes('SOCIAL SECURITY') || name.includes('TREAS 303') || name.includes('SSA TREAS')) && !seenTypes.has('social_security')) {
      seenTypes.add('social_security');
      results.push({
        id: 'detected-ssa-' + (tx.id || 'auto'),
        type: 'social_security',
        label: 'Social Security (' + (tx.account || 'Checking') + ')',
        amount: amount,
        isStatutorilyExempt: true,
        statutoryBasis: '42 U.S.C. § 407 (SSA § 207)',
        detectedFrom: tx.name,
        date: tx.date
      });
    }
    // CalPERS / State Pension patterns
    else if ((name.includes('CALPERS') || name.includes('CALSTRS') || name.includes('STRS') || name.includes('STATE RETIREMENT') || name.includes('PUBLIC PENSION')) && !seenTypes.has('calpers')) {
      seenTypes.add('calpers');
      results.push({
        id: 'detected-calpers-' + (tx.id || 'auto'),
        type: 'calpers',
        label: 'CalPERS Pension (' + (tx.account || 'Checking') + ')',
        amount: amount,
        isStatutorilyExempt: true,
        statutoryBasis: 'California CCP § 704.110',
        detectedFrom: tx.name,
        date: tx.date
      });
    }
  }
  return results;
}
