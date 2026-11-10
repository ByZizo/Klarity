// ============================================================================
// KLARITY BANK-GRADE CLIENT & VAULT CRYPTOGRAPHY ENGINE
//
// Architecture & Standards:
// 1. Authenticated Encryption: Web Crypto API (AES-256-GCM) with 96-bit random IV
//    and 128-bit authentication tag.
// 2. Key Derivation: PBKDF2 with SHA-256, 600,000 iterations (NIST SP 800-132),
//    and a unique 128-bit cryptographically random salt per payload/user.
// 3. Master PIN & Password Protection: PBKDF2 (SHA-256, 600,000 iterations, random salt)
//    with brute-force lockout (5 attempts -> 60-second cooldown).
// 4. Secure Randomness: Uses crypto.getRandomValues exclusively; zero Math.random fallbacks.
// 5. Backward Compatibility: Fully decrypts legacy 'ENCv2:' values and re-encrypts
//    them into modern 'ENCv3:' AES-256-GCM format on unlock or access.
// 6. Sanitization & Firewalls: Auto-clearing clipboard protection, XSS injection filter,
//    and spreadsheet/CSV formula injection (DDE) prevention.
// ============================================================================

export const ENCRYPTION_PREFIX = 'ENCv3:';
const ENCRYPTION_PREFIX_V2 = 'ENCv2:';
const DEVICE_SALT_KEY_V3 = 'klarity_sec_device_salt_v3';
const DEVICE_SALT_KEY_V2 = 'klarity_sec_device_salt_v2';
const PIN_HASH_KEY = 'klarity_sec_master_pin_hash';
const LOCKOUT_STATE_KEY = 'klarity_sec_lockout_state';
const PBKDF2_ITERATIONS = 600000;

// In-memory key cache to optimize performance while maintaining 600,000 PBKDF2 iterations
const keyCache = new Map();

/**
 * Access the Web Crypto API object or throw an explicit error.
 */
function getCrypto() {
  const cryptoObj =
    (typeof globalThis !== 'undefined' && globalThis.crypto) ||
    (typeof window !== 'undefined' && window.crypto) ||
    null;

  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('Web Crypto API (crypto.getRandomValues) is required but unavailable in this environment.');
  }
  return cryptoObj;
}

/**
 * Generate cryptographically secure random bytes using Web Crypto API.
 * Never falls back to Math.random().
 */
export function getRandomBytes(length) {
  const cryptoObj = getCrypto();
  const bytes = new Uint8Array(length);
  cryptoObj.getRandomValues(bytes);
  return bytes;
}

/**
 * Byte and Hex string conversion utilities
 */
function bytesToHex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(bytes).toString('base64');
}

function base64ToUint8Array(b64) {
  const binary = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks
 */
function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Retrieve or generate a 256-bit random per-device cryptographic salt.
 */
function getDeviceSalt() {
  try {
    let salt = localStorage.getItem(DEVICE_SALT_KEY_V3);
    if (!salt || salt.length < 32) {
      const bytes = getRandomBytes(32);
      salt = bytesToHex(bytes);
      localStorage.setItem(DEVICE_SALT_KEY_V3, salt);
    }
    return salt;
  } catch {
    throw new Error('Unable to access localStorage for cryptographic device salt.');
  }
}

/**
 * Derive an AES-256-GCM CryptoKey using PBKDF2 (SHA-256, 600,000 iterations).
 */
async function deriveAesGcmKey(secret, saltBytes) {
  const cryptoObj = getCrypto();
  if (!cryptoObj.subtle) {
    throw new Error('Web Crypto subtle API is required for key derivation.');
  }

  const saltHex = bytesToHex(saltBytes);
  const cacheKey = `${secret}::${saltHex}`;
  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey);
  }

  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  if (keyCache.size > 200) keyCache.clear();
  keyCache.set(cacheKey, aesKey);
  return aesKey;
}

// ============================================================================
// 1. AUTHENTICATED ENCRYPTION (AES-256-GCM & PBKDF2 600,000 ITERATIONS)
// ============================================================================

/**
 * Encrypt a string or object using Web Crypto AES-256-GCM.
 * Output format: `ENCv3:<saltHex>:<ivHex>:<base64CiphertextAndTag>`
 */
export async function encryptPayload(plainText, customSecret = '') {
  if (plainText == null) return '';
  const rawStr = typeof plainText === 'string' ? plainText : JSON.stringify(plainText);
  if (rawStr.startsWith(ENCRYPTION_PREFIX)) return rawStr;

  const cryptoObj = getCrypto();
  const saltBytes = getRandomBytes(16);
  const ivBytes = getRandomBytes(12); // Standard 96-bit IV for AES-GCM

  const secret = (customSecret && String(customSecret).trim()) || getDeviceSalt();
  const aesKey = await deriveAesGcmKey(secret, saltBytes);

  const plainBytes = new TextEncoder().encode(rawStr);
  const cipherBuffer = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    aesKey,
    plainBytes
  );

  const b64 = uint8ArrayToBase64(new Uint8Array(cipherBuffer));
  return `${ENCRYPTION_PREFIX}${bytesToHex(saltBytes)}:${bytesToHex(ivBytes)}:${b64}`;
}

/**
 * Decrypt a payload. Supports modern 'ENCv3:' (AES-GCM) and legacy 'ENCv2:' (backward compatibility).
 */
export async function decryptPayload(cipherPayload, customSecret = '') {
  if (!cipherPayload || typeof cipherPayload !== 'string') return cipherPayload;

  // Modern Web Crypto AES-256-GCM Format
  if (cipherPayload.startsWith(ENCRYPTION_PREFIX)) {
    try {
      const parts = cipherPayload.slice(ENCRYPTION_PREFIX.length).split(':');
      if (parts.length < 3) return null;
      const saltHex = parts[0];
      const ivHex = parts[1];
      const b64 = parts.slice(2).join(':');

      const saltBytes = hexToBytes(saltHex);
      const ivBytes = hexToBytes(ivHex);
      const cipherBytes = base64ToUint8Array(b64);

      const secret = (customSecret && String(customSecret).trim()) || getDeviceSalt();
      const aesKey = await deriveAesGcmKey(secret, saltBytes);

      const cryptoObj = getCrypto();
      const decryptedBuffer = await cryptoObj.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes },
        aesKey,
        cipherBytes
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (err) {
      console.warn('Klarity Security: Failed to decrypt ENCv3 payload:', err);
      return null;
    }
  }

  // Legacy ENCv2 Format: Decrypt with legacy algorithm
  if (cipherPayload.startsWith(ENCRYPTION_PREFIX_V2)) {
    return decryptV2Payload(cipherPayload, customSecret);
  }

  // Plaintext (unencrypted) fallback
  return cipherPayload;
}

// ============================================================================
// 2. LEGACY ENCv2 DECRYPTION (Backward-Compatibility Engine)
// ============================================================================

function getDeviceSaltLegacy() {
  try {
    let salt = localStorage.getItem(DEVICE_SALT_KEY_V2);
    if (!salt) {
      salt = 'klarity-fallback-salt-9f8e7d6c5b4a392817263544';
    }
    return salt;
  } catch {
    return 'klarity-fallback-salt-9f8e7d6c5b4a392817263544';
  }
}

function deriveKeyBytesLegacy(secret, salt, length = 64) {
  const combined = `${secret}::${salt}::klarity-aes-vault-v2`;
  const out = new Uint8Array(length);
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let round = 0; round < length; round++) {
    let acc = (h1 ^ (round * 0x9e3779b9)) >>> 0;
    for (let i = 0; i < combined.length; i++) {
      acc ^= combined.charCodeAt(i);
      acc = Math.imul(acc, 0x01000193) >>> 0;
      acc = ((acc << 13) | (acc >>> 19)) >>> 0;
    }
    h1 = Math.imul(h1 ^ acc, 0x85ebca6b) >>> 0;
    h2 = Math.imul(h2 ^ h1, 0xc2b2ae35) >>> 0;
    out[round] = (acc ^ (h2 >>> 8)) & 0xff;
  }
  return out;
}

function computeMacHexLegacy(ivHex, cipherBytes, keyBytes) {
  let mac1 = 0x243f6a88;
  let mac2 = 0x85a308d3;
  for (let i = 0; i < ivHex.length; i++) {
    mac1 = Math.imul(mac1 ^ ivHex.charCodeAt(i), 0x1000193) >>> 0;
  }
  for (let i = 0; i < cipherBytes.length; i++) {
    const k = keyBytes[i % keyBytes.length];
    mac1 = Math.imul(mac1 ^ cipherBytes[i] ^ k, 0x85ebca6b) >>> 0;
    mac2 = Math.imul(mac2 ^ ((mac1 >>> 11) | (mac1 << 21)), 0xc2b2ae35) >>> 0;
  }
  return mac1.toString(16).padStart(8, '0') + mac2.toString(16).padStart(8, '0');
}

function decryptV2Payload(cipherPayload, customSecret = '') {
  if (!cipherPayload || typeof cipherPayload !== 'string') return cipherPayload;
  if (!cipherPayload.startsWith(ENCRYPTION_PREFIX_V2)) return cipherPayload;

  try {
    const body = cipherPayload.slice(ENCRYPTION_PREFIX_V2.length);
    const firstColon = body.indexOf(':');
    const secondColon = body.indexOf(':', firstColon + 1);
    if (firstColon === -1 || secondColon === -1) return null;

    const ivHex = body.slice(0, firstColon);
    const macHex = body.slice(firstColon + 1, secondColon);
    const b64 = body.slice(secondColon + 1);

    const salt = getDeviceSaltLegacy();
    const keyBytes = deriveKeyBytesLegacy(customSecret || 'klarity-device-master-key', `${salt}:${ivHex}`, 256);

    const binary = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    const cipherBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      cipherBytes[i] = binary.charCodeAt(i);
    }

    const expectedMac = computeMacHexLegacy(ivHex, cipherBytes, keyBytes);
    if (expectedMac !== macHex) {
      console.warn('Klarity Security: Integrity check mismatch during legacy ENCv2 decryption.');
      return null;
    }

    const plainBytes = new Uint8Array(cipherBytes.length);
    for (let i = 0; i < cipherBytes.length; i++) {
      const streamByte = (keyBytes[i % keyBytes.length] ^ ((i * 31 + keyBytes[(i * 7) % keyBytes.length]) & 0xff)) & 0xff;
      plainBytes[i] = cipherBytes[i] ^ streamByte;
    }

    return new TextDecoder().decode(plainBytes);
  } catch (err) {
    console.warn('Klarity Security: Failed to decrypt legacy ENCv2 payload:', err);
    return null;
  }
}

// ============================================================================
// 3. SECURE ASYNC LOCALSTORAGE WRAPPER
// ============================================================================

export const secureStorage = {
  /**
   * Asynchronously retrieves, decrypts, and parses a value from storage.
   * Transparently migrates any legacy ENCv2 or plaintext items into ENCv3 AES-256-GCM.
   */
  async getItem(key, fallback = null, customSecret = '') {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;

      // If encrypted (either ENCv3 or ENCv2), decrypt
      if (raw.startsWith(ENCRYPTION_PREFIX) || raw.startsWith(ENCRYPTION_PREFIX_V2)) {
        const decrypted = await decryptPayload(raw, customSecret);
        if (decrypted == null) return fallback;

        // If it was legacy ENCv2, transparently upgrade it to ENCv3 in storage
        if (raw.startsWith(ENCRYPTION_PREFIX_V2)) {
          try {
            const reencrypted = await encryptPayload(decrypted, customSecret);
            localStorage.setItem(key, reencrypted);
          } catch {}
        }

        try {
          return JSON.parse(decrypted);
        } catch {
          return decrypted;
        }
      }

      // If it was unencrypted legacy plaintext, encrypt it to ENCv3 immediately
      try {
        const encrypted = await encryptPayload(raw, customSecret);
        localStorage.setItem(key, encrypted);
      } catch {}

      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch {
      return fallback;
    }
  },

  /**
   * Asynchronously encrypts and saves a value into localStorage with AES-256-GCM.
   */
  async setItem(key, value, customSecret = '') {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      const encrypted = await encryptPayload(serialized, customSecret);
      localStorage.setItem(key, encrypted);
      return true;
    } catch (err) {
      console.warn('Klarity Security: Failed to write encrypted storage:', err);
      return false;
    }
  },

  /**
   * Removes an item from localStorage.
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },

  /**
   * Checks whether a key in localStorage is stored encrypted.
   */
  isEncryptedInStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      return Boolean(raw && (raw.startsWith(ENCRYPTION_PREFIX) || raw.startsWith(ENCRYPTION_PREFIX_V2)));
    } catch {
      return false;
    }
  }
};

// ============================================================================
// 4. MASTER PIN / PASSWORD MANAGEMENT & BRUTE-FORCE RATE LIMITER
// ============================================================================

/**
 * Hash a master PIN or password using PBKDF2 (SHA-256, 600,000 iterations, 16-byte random salt).
 * Output format: `PBKDF2:600000:<saltHex>:<hashHex>`
 */
export async function hashSecurityPin(pin, saltBytes = null) {
  const clean = String(pin || '').trim();
  const salt = saltBytes || getRandomBytes(16);
  const cryptoObj = getCrypto();

  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    new TextEncoder().encode(clean),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const saltHex = bytesToHex(salt);
  const hashHex = bytesToHex(new Uint8Array(derivedBits));
  return `PBKDF2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Legacy fast-hash fallback for verifying existing PINs before automatic upgrade.
 */
function hashSecurityPinLegacy(pin) {
  const clean = String(pin || '').trim();
  const salt = getDeviceSaltLegacy();
  const derived = deriveKeyBytesLegacy(clean, `pin-salt:${salt}`, 32);
  return Array.from(derived, b => b.toString(16).padStart(2, '0')).join('');
}

export function hasMasterPinSet() {
  try {
    return Boolean(localStorage.getItem(PIN_HASH_KEY));
  } catch {
    return false;
  }
}

export async function setMasterPin(newPin) {
  const clean = String(newPin || '').trim();
  if (clean.length < 4) {
    throw new Error('PIN must be at least 4 digits.');
  }
  const hashed = await hashSecurityPin(clean);
  localStorage.setItem(PIN_HASH_KEY, hashed);
  clearLockoutState();
  return true;
}

export function removeMasterPin() {
  try {
    localStorage.removeItem(PIN_HASH_KEY);
    clearLockoutState();
  } catch {}
}

export function getLockoutState() {
  try {
    const raw = localStorage.getItem(LOCKOUT_STATE_KEY);
    if (!raw) return { attempts: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw);
    if (parsed.lockedUntil && Date.now() > parsed.lockedUntil) {
      localStorage.removeItem(LOCKOUT_STATE_KEY);
      return { attempts: 0, lockedUntil: 0 };
    }
    return {
      attempts: Number(parsed.attempts || 0),
      lockedUntil: Number(parsed.lockedUntil || 0)
    };
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
}

export function clearLockoutState() {
  try {
    localStorage.removeItem(LOCKOUT_STATE_KEY);
  } catch {}
}

/**
 * Verify a master PIN input with PBKDF2 against stored hash.
 * Enforces 5-attempt rate-limiting lockout (60-second cooldown).
 */
export async function verifyMasterPin(inputPin) {
  const lockout = getLockoutState();
  if (lockout.lockedUntil > Date.now()) {
    const secsLeft = Math.ceil((lockout.lockedUntil - Date.now()) / 1000);
    return {
      valid: false,
      locked: true,
      secondsRemaining: secsLeft,
      error: `Too many failed attempts. Try again in ${secsLeft}s.`
    };
  }

  const storedHash = localStorage.getItem(PIN_HASH_KEY);
  if (!storedHash) return { valid: true, locked: false };

  let isValid = false;

  if (storedHash.startsWith('PBKDF2:')) {
    const parts = storedHash.split(':');
    const iterations = parseInt(parts[1], 10) || PBKDF2_ITERATIONS;
    const saltHex = parts[2];
    const expectedHashHex = parts[3];
    const saltBytes = hexToBytes(saltHex);

    const cryptoObj = getCrypto();
    const keyMaterial = await cryptoObj.subtle.importKey(
      'raw',
      new TextEncoder().encode(String(inputPin || '').trim()),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await cryptoObj.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const candidateHashHex = bytesToHex(new Uint8Array(derivedBits));
    isValid = timingSafeEqualHex(candidateHashHex, expectedHashHex);
  } else {
    // Backward compatibility with older fast-hash format; auto-upgrade on success
    const candidateLegacy = hashSecurityPinLegacy(inputPin);
    if (timingSafeEqualHex(candidateLegacy, storedHash)) {
      isValid = true;
      try {
        const upgraded = await hashSecurityPin(inputPin);
        localStorage.setItem(PIN_HASH_KEY, upgraded);
      } catch {}
    }
  }

  if (isValid) {
    clearLockoutState();
    return { valid: true, locked: false };
  }

  const nextAttempts = lockout.attempts + 1;
  const lockedUntil = nextAttempts >= 5 ? Date.now() + 60 * 1000 : 0; // 60s lockout after 5 bad tries
  try {
    localStorage.setItem(LOCKOUT_STATE_KEY, JSON.stringify({ attempts: nextAttempts, lockedUntil }));
  } catch {}

  if (lockedUntil > 0) {
    return {
      valid: false,
      locked: true,
      secondsRemaining: 60,
      error: '5 failed attempts. Security lockout active for 60 seconds.'
    };
  }

  return {
    valid: false,
    locked: false,
    attemptsRemaining: Math.max(0, 5 - nextAttempts),
    error: `Incorrect PIN (${Math.max(0, 5 - nextAttempts)} attempts remaining).`
  };
}

// ============================================================================
// 5. UNLOCK RE-ENCRYPTION & STORAGE AUDIT
// ============================================================================

export const SENSITIVE_STORAGE_KEYS = [
  'klarity_retirement_plans',
  'klarity_accounts',
  'klarity_manual_assets',
  'klarity_plaid_secret',
  'klarity_ai_api_key'
];

/**
 * Scans all keys in localStorage on user unlock, decrypts any legacy 'ENCv2:' items,
 * and re-encrypts them in the modern 'ENCv3:' Web Crypto AES-256-GCM format.
 */
export async function reencryptLegacyStorage(customSecret = '') {
  let migratedCount = 0;
  try {
    const keysToCheck = new Set([...SENSITIVE_STORAGE_KEYS]);
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) keysToCheck.add(k);
      }
    }

    for (const key of keysToCheck) {
      try {
        const raw = localStorage.getItem(key);
        if (raw && typeof raw === 'string' && raw.startsWith(ENCRYPTION_PREFIX_V2)) {
          const decrypted = decryptV2Payload(raw, customSecret);
          if (decrypted != null) {
            const reencrypted = await encryptPayload(decrypted, customSecret);
            localStorage.setItem(key, reencrypted);
            migratedCount++;
          }
        }
      } catch (e) {
        console.warn(`Klarity Security: Error migrating key ${key}:`, e);
      }
    }
  } catch (err) {
    console.warn('Klarity Security: Failed to re-encrypt legacy storage on unlock:', err);
  }
  return migratedCount;
}

/**
 * Background security auditor: ensures all sensitive storage keys are encrypted
 * with modern Web Crypto AES-256-GCM (ENCv3).
 */
export async function enforceStorageEncryptionAudit(customSecret = '') {
  let newlyEncryptedCount = 0;
  let migratedV2Count = 0;

  for (const key of SENSITIVE_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      if (raw.startsWith(ENCRYPTION_PREFIX_V2)) {
        const decrypted = decryptV2Payload(raw, customSecret);
        if (decrypted != null) {
          const enc = await encryptPayload(decrypted, customSecret);
          localStorage.setItem(key, enc);
          migratedV2Count++;
        }
      } else if (!raw.startsWith(ENCRYPTION_PREFIX)) {
        const enc = await encryptPayload(raw, customSecret);
        localStorage.setItem(key, enc);
        newlyEncryptedCount++;
      }
    } catch (err) {
      console.warn(`Klarity Security: Audit error on ${key}:`, err);
    }
  }

  return {
    protectedKeysCount: SENSITIVE_STORAGE_KEYS.length,
    newlyEncryptedCount,
    migratedV2Count,
    cipherSuite: 'AES-256-GCM / PBKDF2-SHA256 (600,000 iterations, Web Crypto API)'
  };
}

// ============================================================================
// 6. CLIPBOARD SANITIZER (Auto-clears copied passwords after 30 seconds)
// ============================================================================

let clipboardClearTimer = null;

export async function copySensitiveWithAutoClear(text, clearAfterMs = 30000, onCleared) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(String(text));
    if (clipboardClearTimer) clearTimeout(clipboardClearTimer);
    clipboardClearTimer = setTimeout(async () => {
      try {
        if (typeof document !== 'undefined' && document.hasFocus()) {
          await navigator.clipboard.writeText('');
        }
        if (typeof onCleared === 'function') onCleared();
      } catch {}
    }, clearAfterMs);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// 7. ANTI-HACKER / ANTI-CODE-INJECTION FIREWALL (XSS & Spreadsheet Shield)
// ============================================================================

export function sanitizeHtmlAgainstInjection(rawHtml) {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  return rawHtml
    .replace(/<\s*(script|iframe|object|embed|applet|meta|link|style|form|base)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|applet|meta|link|base)\b[^>]*\/?>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|xlink:href|action|formaction)\s*=\s*(?:"\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^"]*"|'\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^']*')/gi, '$1="#"');
}

export function sanitizeSpreadsheetCell(val) {
  if (val == null) return '';
  let str = String(val).trim();
  str = str.replace(/<\s*\/?\s*script\b[^>]*>/gi, '');
  if (/^[=+\-@|]/.test(str) && /(cmd|powershell|msexe|dde|http|javascript|importxml|webservice)/i.test(str)) {
    str = "'" + str;
  }
  return str;
}
