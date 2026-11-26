// Shared cancellation playbooks, transaction recurring scan, and Vault lookup helpers

const MERCHANT_PLAYBOOKS = [
  {
    keys: ['netflix'],
    merchantName: 'Netflix',
    loginDomain: 'netflix.com',
    cancelUrl: 'https://www.netflix.com/cancelplan',
    supportPhone: '1-844-505-2993',
    supportEmail: '',
    steps: [
      'Sign in to your Netflix account.',
      'Open Account settings from your profile menu.',
      'Select Cancel Membership under Membership & Billing.',
      'Click Finish Cancellation to confirm.'
    ]
  },
  {
    keys: ['spotify'],
    merchantName: 'Spotify',
    loginDomain: 'spotify.com',
    cancelUrl: 'https://www.spotify.com/account/subscription/',
    supportPhone: '',
    supportEmail: 'support@spotify.com',
    steps: [
      'Sign in at spotify.com/account.',
      'Go to Your Plan and click Change or Cancel Plan.',
      'Scroll down and choose Cancel Premium.',
      'Confirm on the final screen until you see the cancellation date.'
    ]
  },
  {
    keys: ['hulu'],
    merchantName: 'Hulu',
    loginDomain: 'hulu.com',
    cancelUrl: 'https://secure.hulu.com/account',
    supportPhone: '1-888-265-6650',
    supportEmail: '',
    steps: [
      'Sign in to your Hulu Account page.',
      'Look under Your Subscription and select Cancel.',
      'Skip any pause or discount offers and select Continue to Cancel.',
      'Click Cancel Subscription to finish.'
    ]
  },
  {
    keys: ['disney', 'disney+'],
    merchantName: 'Disney+',
    loginDomain: 'disneyplus.com',
    cancelUrl: 'https://www.disneyplus.com/account',
    supportPhone: '1-888-905-7888',
    supportEmail: '',
    steps: [
      'Sign in to Disney+ and open Account from your profile.',
      'Select your active plan under Subscription.',
      'Click Cancel Subscription.',
      'Follow the final prompt until confirmation appears.'
    ]
  },
  {
    keys: ['amazon prime', 'prime video', 'amazon.com'],
    merchantName: 'Amazon Prime',
    loginDomain: 'amazon.com',
    cancelUrl: 'https://www.amazon.com/mc/pipelines/cancellation',
    supportPhone: '1-888-280-4331',
    supportEmail: '',
    steps: [
      'Sign in to your Amazon account.',
      'Open Manage Membership under Prime settings.',
      'Choose Update, Cancel and More, then End Membership.',
      'Click through the confirmation steps until your end date is shown.'
    ]
  },
  {
    keys: ['apple', 'icloud', 'apple.com/bill'],
    merchantName: 'Apple / iCloud+',
    loginDomain: 'apple.com',
    cancelUrl: 'https://reportaproblem.apple.com/',
    supportPhone: '1-800-275-2273',
    supportEmail: '',
    steps: [
      'Sign in with your Apple ID at reportaproblem.apple.com or Settings on your Apple device.',
      'Open Subscriptions (on Windows, open the Apple Music or Apple TV app account page).',
      'Select the subscription you want to stop.',
      'Click Cancel Subscription and confirm.'
    ]
  },
  {
    keys: ['youtube', 'youtube tv', 'youtube premium'],
    merchantName: 'YouTube',
    loginDomain: 'youtube.com',
    cancelUrl: 'https://www.youtube.com/paid_memberships',
    supportPhone: '',
    supportEmail: '',
    steps: [
      'Sign in to YouTube and open Purchases and Memberships.',
      'Click Manage Membership next to your active plan.',
      'Select Deactivate or Cancel Membership.',
      'Confirm the cancellation reason to complete.'
    ]
  },
  {
    keys: ['max', 'hbo', 'hbomax'],
    merchantName: 'Max',
    loginDomain: 'max.com',
    cancelUrl: 'https://auth.max.com/subscription',
    supportPhone: '1-855-442-6629',
    supportEmail: '',
    steps: [
      'Sign in to Max on your browser.',
      'Open Settings and choose Subscription.',
      'Select Cancel Your Subscription.',
      'Confirm cancellation to stop the next charge.'
    ]
  },
  {
    keys: ['peacock'],
    merchantName: 'Peacock',
    loginDomain: 'peacocktv.com',
    cancelUrl: 'https://www.peacocktv.com/account/plans',
    supportPhone: '',
    supportEmail: '',
    steps: [
      'Sign in at peacocktv.com/account/plans.',
      'Select Change Plan or Cancel Plan.',
      'Follow the prompt to confirm cancellation.',
      'Check for your confirmation email.'
    ]
  },
  {
    keys: ['paramount', 'paramount+'],
    merchantName: 'Paramount+',
    loginDomain: 'paramountplus.com',
    cancelUrl: 'https://www.paramountplus.com/account/',
    supportPhone: '1-888-274-5343',
    supportEmail: '',
    steps: [
      'Sign in to your Paramount+ Account page.',
      'Scroll to Subscription & Billing and click Cancel Subscription.',
      'Continue past any retention offer.',
      'Click Yes, Cancel to complete.'
    ]
  },
  {
    keys: ['adobe', 'creative cloud', 'acrobat'],
    merchantName: 'Adobe',
    loginDomain: 'adobe.com',
    cancelUrl: 'https://account.adobe.com/plans',
    supportPhone: '1-800-833-6687',
    supportEmail: '',
    steps: [
      'Sign in at account.adobe.com/plans.',
      'Click Manage Plan on your active subscription.',
      'Select Cancel Your Plan and review any early-fee note.',
      'Confirm cancellation on the final step.'
    ]
  },
  {
    keys: ['chatgpt', 'openai'],
    merchantName: 'ChatGPT / OpenAI',
    loginDomain: 'chatgpt.com',
    cancelUrl: 'https://chatgpt.com/#settings/Subscription',
    supportPhone: '',
    supportEmail: 'support@openai.com',
    steps: [
      'Sign in at chatgpt.com and click your profile menu.',
      'Open Settings, then select Subscription.',
      'Click Manage My Subscription.',
      'Click Cancel Plan inside the billing page.'
    ]
  },
  {
    keys: ['microsoft', 'xbox', 'game pass', 'office 365', 'microsoft 365'],
    merchantName: 'Microsoft',
    loginDomain: 'microsoft.com',
    cancelUrl: 'https://account.microsoft.com/services',
    supportPhone: '1-800-642-7676',
    supportEmail: '',
    steps: [
      'Sign in at account.microsoft.com/services.',
      'Find your subscription and click Manage.',
      'Select Cancel Subscription.',
      'Follow the steps to turn off recurring billing.'
    ]
  },
  {
    keys: ['nytimes', 'new york times', 'nyt'],
    merchantName: 'The New York Times',
    loginDomain: 'nytimes.com',
    cancelUrl: 'https://myaccount.nytimes.com/seg/cancel',
    supportPhone: '1-800-591-9233',
    supportEmail: 'customercare@nytimes.com',
    steps: [
      'Sign in to your New York Times Account.',
      'Open Subscription Overview and choose Cancel Subscription.',
      'If online cancel is unavailable for your plan, use chat or the phone number below.'
    ]
  },
  {
    keys: ['sirius', 'siriusxm'],
    merchantName: 'SiriusXM',
    loginDomain: 'siriusxm.com',
    cancelUrl: 'https://care.siriusxm.com/',
    supportPhone: '1-866-635-2349',
    supportEmail: '',
    steps: [
      'Sign in to your SiriusXM Online Account.',
      'Open Manage My Subscriptions and select Cancel.',
      'If your state or plan requires agent assistance, use the online chat or phone script below.'
    ]
  },
  {
    keys: ['audible'],
    merchantName: 'Audible',
    loginDomain: 'audible.com',
    cancelUrl: 'https://www.audible.com/account/overview',
    supportPhone: '1-888-283-5051',
    supportEmail: '',
    steps: [
      'Sign in at audible.com and go to Account Details.',
      'Click Cancel Membership near the bottom.',
      'Confirm you want to finish canceling.',
      'Use any remaining credits before your cycle ends if needed.'
    ]
  },
  {
    keys: ['planet fitness', 'la fitness', '24 hour fitness', 'equinox', 'ymca', 'gym', 'fitness'],
    merchantName: 'Gym / Fitness Membership',
    loginDomain: '',
    cancelUrl: '',
    supportPhone: '',
    supportEmail: '',
    steps: [
      'Check if your club portal allows online cancellation under Member Account.',
      'Most gyms accept cancellation by email or certified letter to your home club.',
      'Keep a copy of your sent email or request a written cancellation receipt.'
    ]
  },
  {
    keys: ['dropbox'],
    merchantName: 'Dropbox',
    loginDomain: 'dropbox.com',
    cancelUrl: 'https://www.dropbox.com/account/plan',
    supportPhone: '',
    supportEmail: '',
    steps: [
      'Sign in at dropbox.com and click your avatar.',
      'Go to Settings > Plan.',
      'Click Cancel Plan at the bottom.',
      'Select Downgrade to Basic to finish.'
    ]
  },
  {
    keys: ['google one', 'google storage'],
    merchantName: 'Google One',
    loginDomain: 'one.google.com',
    cancelUrl: 'https://one.google.com/settings',
    supportPhone: '',
    supportEmail: '',
    steps: [
      'Sign in at one.google.com/settings.',
      'Select Cancel Membership.',
      'Click Cancel again to confirm.',
      'You will keep storage benefits until your billing period ends.'
    ]
  }
];

export function normalizeMerchantKey(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[*#@_]/g, ' ')
    .replace(/\b(inc|llc|corp|co|ltd|monthly|annual|plan|subscription|bill|recurring)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getSubscriptionCancelPlaybook(sub, currentUser = null) {
  const subName = String(sub?.name || 'Subscription').trim();
  const normalized = subName.toLowerCase();

  const matched = MERCHANT_PLAYBOOKS.find((entry) =>
    entry.keys.some((k) => normalized.includes(k))
  );

  const loginDomain = matched?.loginDomain || '';
  const cancelUrl =
    matched?.cancelUrl ||
    `https://www.google.com/search?q=${encodeURIComponent(`cancel ${subName} subscription account`)}`;

  const steps = matched?.steps || [
    `Go to ${subName}'s account or billing settings page.`,
    'Sign in with your account email and password.',
    'Open Subscriptions, Membership, or Billing and choose Cancel.',
    'Save or screenshot the cancellation confirmation.'
  ];

  const amountStr = Number(sub?.amount) > 0 ? `$${Number(sub.amount).toFixed(2)}/mo` : 'recurring billing';
  const accountRef = sub?.account ? ` billed to ${sub.account}` : '';
  const userName = currentUser?.name?.trim() || '';
  const userEmail = currentUser?.email?.trim() || '';
  const signature = [userName, userEmail].filter(Boolean).join('\n');

  const emailSubject = `Cancellation Request — ${subName} Account`;
  const emailBody = [
    `Hello ${subName} Support,`,
    '',
    `Please cancel my ${subName} subscription (${amountStr}${accountRef}) effective at the end of my current billing cycle, and turn off auto-renewal immediately.`,
    '',
    userEmail ? `Account email: ${userEmail}` : 'Account email: [Your email on file]',
    '',
    'Please reply with a confirmation number or written confirmation that recurring billing has been stopped.',
    '',
    'Thank you,',
    signature || '[Your Name]'
  ].join('\n');

  const supportEmail = matched?.supportEmail || '';
  const mailtoHref = `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  const phoneScript = `Hi, I would like to cancel my ${subName} account effective at the end of the current billing period. Please confirm that recurring billing is turned off and send a confirmation email.`;

  return {
    merchantName: matched?.merchantName || subName,
    cancelUrl,
    loginDomain,
    isDirectUrl: Boolean(matched?.cancelUrl),
    steps,
    supportPhone: matched?.supportPhone || '',
    supportEmail,
    phoneScript,
    emailDraft: {
      subject: emailSubject,
      body: emailBody,
      mailtoHref
    }
  };
}

const KNOWN_SUB_KEYWORDS = [
  { key: 'netflix', category: 'Streaming' },
  { key: 'spotify', category: 'Music' },
  { key: 'hulu', category: 'Streaming' },
  { key: 'disney', category: 'Streaming' },
  { key: 'apple.com/bill', category: 'Cloud Storage' },
  { key: 'icloud', category: 'Cloud Storage' },
  { key: 'youtube', category: 'Streaming' },
  { key: 'chatgpt', category: 'AI & Software' },
  { key: 'openai', category: 'AI & Software' },
  { key: 'adobe', category: 'AI & Software' },
  { key: 'patreon', category: 'Entertainment' },
  { key: 'substack', category: 'Entertainment' },
  { key: 'audible', category: 'Entertainment' },
  { key: 'prime video', category: 'Streaming' },
  { key: 'amazon prime', category: 'Streaming' },
  { key: 'peacock', category: 'Streaming' },
  { key: 'paramount', category: 'Streaming' },
  { key: 'max.com', category: 'Streaming' },
  { key: 'hbo', category: 'Streaming' },
  { key: 'dropbox', category: 'Cloud Storage' },
  { key: 'google one', category: 'Cloud Storage' },
  { key: 'google *', category: 'Cloud Storage' },
  { key: 'microsoft', category: 'AI & Software' },
  { key: 'xbox', category: 'Entertainment' },
  { key: 'playstation', category: 'Entertainment' },
  { key: 'nintendo', category: 'Entertainment' },
  { key: 'nytimes', category: 'Entertainment' },
  { key: 'siriusxm', category: 'Music' },
  { key: 'planet fitness', category: 'Entertainment' },
  { key: 'la fitness', category: 'Entertainment' },
  { key: 'gym', category: 'Entertainment' },
  { key: 'fitness', category: 'Entertainment' },
  { key: 'membership', category: 'Entertainment' },
  { key: 'subscription', category: 'Entertainment' }
];

const EXCLUDED_NON_SUB_CATEGORIES = new Set([
  'income',
  'groceries',
  'gas',
  'fuel',
  'dining',
  'restaurants',
  'food',
  'housing',
  'rent',
  'mortgage',
  'utilities',
  'transfer',
  'payment'
]);

export function detectRecurringTransactions(transactions = [], existingSubscriptions = []) {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];

  const existingKeys = new Set(
    (Array.isArray(existingSubscriptions) ? existingSubscriptions : [])
      .map((s) => normalizeMerchantKey(s?.name))
      .filter(Boolean)
  );

  const grouped = new Map();

  for (const tx of transactions) {
    if (!tx || !tx.name) continue;
    const rawAmount = Number(tx.amount);
    // In this app, expenses may be stored as negative or positive; ignore income/deposits or large >$500 non-sub entries
    const catLower = String(tx.category || '').toLowerCase().trim();
    const nameLower = String(tx.name || '').toLowerCase();
    if (EXCLUDED_NON_SUB_CATEGORIES.has(catLower)) continue;
    if (/deposit|payroll|direct dep|transfer|venmo|zelle|rent|mortgage|grocery|costco|safeway|trader joe|shell|chevron|arco/i.test(nameLower)) {
      continue;
    }

    const absAmount = Math.abs(rawAmount);
    if (!Number.isFinite(absAmount) || absAmount < 1 || absAmount > 350) continue;

    const normKey = normalizeMerchantKey(tx.name);
    if (!normKey || existingKeys.has(normKey)) continue;

    // Also skip if existing name partially matches normalized transaction merchant
    let alreadyTracked = false;
    for (const exKey of existingKeys) {
      if (exKey && (normKey.includes(exKey) || exKey.includes(normKey))) {
        alreadyTracked = true;
        break;
      }
    }
    if (alreadyTracked) continue;

    if (!grouped.has(normKey)) {
      grouped.set(normKey, []);
    }
    grouped.get(normKey).push({ tx, absAmount });
  }

  const candidates = [];

  for (const [normKey, entries] of grouped.entries()) {
    const first = entries[0].tx;
    const lowerName = String(first.name || '').toLowerCase();
    const matchedKw = KNOWN_SUB_KEYWORDS.find((kw) => lowerName.includes(kw.key));

    // Check if recurring: either known subscription merchant OR 2+ charges at near-identical amounts
    let isRecurringCount = false;
    if (entries.length >= 2) {
      const amounts = entries.map((e) => e.absAmount);
      const minA = Math.min(...amounts);
      const maxA = Math.max(...amounts);
      if (maxA - minA <= Math.max(2, minA * 0.1)) {
        isRecurringCount = true;
      }
    }

    if (!matchedKw && !isRecurringCount) continue;

    const latest = entries[entries.length - 1];
    let inferredCat = matchedKw?.category || 'Entertainment';
    if (!matchedKw) {
      if (/music|radio/.test(lowerName)) inferredCat = 'Music';
      else if (/cloud|storage|backup/.test(lowerName)) inferredCat = 'Cloud Storage';
      else if (/software|ai|app/.test(lowerName)) inferredCat = 'AI & Software';
      else if (/tv|stream|video/.test(lowerName)) inferredCat = 'Streaming';
    }

    candidates.push({
      id: `detect-${normKey.replace(/\s+/g, '-')}`,
      name: String(first.name).trim(),
      amount: Number(latest.absAmount.toFixed(2)),
      category: inferredCat,
      account: first.account || '',
      cardId: first.cardId || '',
      renewalDate: first.date ? `Last charged ${first.date}` : 'Monthly',
      occurrences: entries.length
    });
  }

  return candidates.sort((a, b) => b.occurrences - a.occurrences || b.amount - a.amount);
}

export function findMatchingVaultCredentials(vaultItems = [], subName = '', loginDomain = '') {
  if (!Array.isArray(vaultItems) || vaultItems.length === 0) return null;

  const cleanDomain = String(loginDomain || '')
    .toLowerCase()
    .replace(/^www\./, '')
    .trim();
  const normName = normalizeMerchantKey(subName);
  const firstToken = normName.split(' ')[0] || '';

  return (
    vaultItems.find((item) => {
      if (!item) return false;
      const itemService = String(item.service || '').toLowerCase();
      let itemHost = '';
      try {
        const rawSite = String(item.website || '').trim();
        if (rawSite) {
          const u = /^https?:\/\//i.test(rawSite) ? new URL(rawSite) : new URL(`https://${rawSite}`);
          itemHost = u.hostname.toLowerCase().replace(/^www\./, '');
        }
      } catch {
        itemHost = String(item.website || '').toLowerCase().replace(/^www\./, '');
      }

      if (cleanDomain && itemHost && (itemHost === cleanDomain || itemHost.endsWith(`.${cleanDomain}`) || cleanDomain.endsWith(`.${itemHost}`))) {
        return true;
      }
      if (normName && itemService && (itemService.includes(normName) || normName.includes(itemService))) {
        return true;
      }
      if (firstToken.length >= 4 && (itemService.includes(firstToken) || itemHost.includes(firstToken))) {
        return true;
      }
      return false;
    }) || null
  );
}
