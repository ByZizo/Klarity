// ============================================================================
// KLARITY DOCUMENT VAULT STORAGE (IndexedDB with LocalStorage Fallback)
// Stores documents (PDFs, Word, Excel/CSV, PowerPoint, Markdown/Text, images)
// locally with ENCv3 AES-256-GCM encryption for sensitive payloads.
// ============================================================================

import { encryptPayload, decryptPayload, ENCRYPTION_PREFIX } from './securityCrypto.js';

const DB_NAME = 'KlarityVaultDocumentsDB';
const DB_VERSION = 1;
const STORE_NAME = 'documents';
const FOLDERS_KEY = 'klarity_vault_doc_folders';
const META_KEY = 'klarity_vault_doc_metadata';

export const DEFAULT_DOCUMENT_FOLDERS = [];

/**
 * Open or initialize the IndexedDB instance
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('folder', 'folder', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Load list of user-created folders
 */
export function loadDocumentFolders() {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    let folders = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          folders = parsed.filter(Boolean);
        }
      } catch {}
    }

    // Cumulative check: also discover any custom folders present on existing documents in metadata
    try {
      const metaRaw = localStorage.getItem(META_KEY);
      if (metaRaw) {
        const metaDocs = JSON.parse(metaRaw);
        if (Array.isArray(metaDocs)) {
          metaDocs.forEach(d => {
            if (d && typeof d.folder === 'string' && d.folder.trim()) {
              folders.push(d.folder.trim());
            }
          });
        }
      }
    } catch {}

    const unique = Array.from(new Set(folders.filter(Boolean)));
    localStorage.setItem('klarity_vault_doc_folders_v', '2');
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(unique));
    return unique;
  } catch {
    return [];
  }
}

/**
 * Save custom folder list
 */
export function saveDocumentFolders(folders) {
  try {
    if (Array.isArray(folders)) {
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
    }
  } catch (err) {
    console.warn('Failed to save document folders:', err);
  }
}

/**
 * Helper to decrypt sensitive vault document fields transparently.
 * Backward compatible with legacy unencrypted IndexedDB records.
 */
async function decryptDocumentRecord(rawDoc) {
  if (!rawDoc || typeof rawDoc !== 'object') return rawDoc;
  const doc = { ...rawDoc };
  try {
    if (typeof doc.dataUrl === 'string' && (doc.dataUrl.startsWith(ENCRYPTION_PREFIX) || doc.dataUrl.startsWith('ENCv2:'))) {
      const dec = await decryptPayload(doc.dataUrl);
      if (dec !== null) doc.dataUrl = dec;
    }
    if (typeof doc.canonicalEncrypted === 'string' && doc.canonicalEncrypted.startsWith(ENCRYPTION_PREFIX)) {
      const decJson = await decryptPayload(doc.canonicalEncrypted);
      if (decJson) {
        try {
          doc.canonical = JSON.parse(decJson);
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Vault document decrypt notice:', err?.message || err);
  }
  return doc;
}

/**
 * Load all documents from IndexedDB (with localStorage metadata fallback)
 */
export async function getAllDocuments() {
  try {
    const db = await openDB();
    const rawDocs = await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const docs = await Promise.all(rawDocs.map(decryptDocumentRecord));
    // Update metadata mirror in localStorage for instant sync
    syncMetadataMirror(docs);
    return docs;
  } catch {
    // Fallback: Read metadata from localStorage
    try {
      const raw = localStorage.getItem(META_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }
}

/**
 * Save or update a single document in IndexedDB (encrypts dataUrl & canonical IR with ENCv3)
 */
export function sanitizeDocumentFileName(name, fallback = 'document') {
  const raw = String(name || fallback)
    .replace(/\0/g, '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\\/g, '/')
    .split('/')
    .filter((s) => s && s !== '.' && s !== '..')
    .pop() || fallback;
  return raw.replace(/\.\.+/g, '.').replace(/[<>:"/\\|?*]/g, '_').replace(/^\.+/, '').trim() || fallback;
}

export async function saveDocument(document) {
  if (!document || !document.id) {
    throw new Error('Document must have a valid ID.');
  }

  const safeTags = Array.isArray(document.tags)
    ? Array.from(new Set(document.tags.map((t) => String(t || '').trim()).filter(Boolean))).slice(0, 12)
    : [];

  const searchPreview =
    typeof document.searchPreview === 'string' && document.searchPreview.trim()
      ? document.searchPreview.slice(0, 2400)
      : typeof document.canonical?.plainText === 'string'
      ? document.canonical.plainText.slice(0, 2400)
      : '';

  const cleanDoc = {
    ...document,
    fileName: document.fileName ? sanitizeDocumentFileName(document.fileName) : document.fileName,
    folder: document.folder ? String(document.folder).replace(/[\\/]+|\.\.+/g, '').trim() : document.folder,
    sourceFormat: document.sourceFormat || document.canonical?.sourceFormat || '',
    tags: safeTags,
    searchPreview,
    stats: document.stats || document.canonical?.stats || null,
    updatedAt: new Date().toISOString()
  };

  // Build encrypted storage record (keeps plaintext cleanDoc for immediate UI state)
  const recordToStore = { ...cleanDoc };
  try {
    if (typeof recordToStore.dataUrl === 'string' && recordToStore.dataUrl.length > 0 && !recordToStore.dataUrl.startsWith(ENCRYPTION_PREFIX)) {
      recordToStore.dataUrl = await encryptPayload(recordToStore.dataUrl);
      recordToStore.encrypted = true;
    }
    if (recordToStore.canonical && typeof recordToStore.canonical === 'object') {
      recordToStore.canonicalEncrypted = await encryptPayload(JSON.stringify(recordToStore.canonical));
      delete recordToStore.canonical;
      recordToStore.encrypted = true;
    }
  } catch (encErr) {
    console.warn('Vault encryption fallback notice:', encErr?.message || encErr);
  }

  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(recordToStore);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    // IndexedDB failed; fallback to localStorage if payload is reasonable
    try {
      const raw = localStorage.getItem(META_KEY);
      const docs = raw ? JSON.parse(raw) : [];
      const idx = docs.findIndex(d => d.id === cleanDoc.id);
      if (idx >= 0) docs[idx] = buildMirrorEntry(cleanDoc);
      else docs.unshift(buildMirrorEntry(cleanDoc));
      localStorage.setItem(META_KEY, JSON.stringify(docs));
    } catch (e) {
      console.warn('Fallback save failed:', e);
    }
  }

  // Refresh metadata mirror
  updateMetadataMirrorItem(cleanDoc);
  return cleanDoc;
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(documentId) {
  if (!documentId) return;

  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(documentId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Fallback
    try {
      const raw = localStorage.getItem(META_KEY);
      if (raw) {
        const docs = JSON.parse(raw).filter(d => d.id !== documentId);
        localStorage.setItem(META_KEY, JSON.stringify(docs));
      }
    } catch {}
  }

  removeMetadataMirrorItem(documentId);
}

/**
 * Fast synchronous count of documents from metadata mirror
 */
export function getDocumentCountSync() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

// Helpers for localStorage metadata cache
function buildMirrorEntry(doc) {
  return {
    id: doc.id,
    name: doc.name,
    folder: doc.folder,
    fileType: doc.fileType,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    sourceFormat: doc.sourceFormat || doc.canonical?.sourceFormat || '',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    stats: doc.stats || doc.canonical?.stats || null,
    searchPreview: typeof doc.searchPreview === 'string' ? doc.searchPreview.slice(0, 1200) : '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    notes: doc.notes
  };
}

function syncMetadataMirror(docs) {
  try {
    // Store metadata without heavy dataUrl to keep localStorage light & fast
    const lightweight = docs.map(buildMirrorEntry);
    localStorage.setItem(META_KEY, JSON.stringify(lightweight));
  } catch {}
}

function updateMetadataMirrorItem(doc) {
  try {
    const raw = localStorage.getItem(META_KEY);
    const docs = raw ? JSON.parse(raw) : [];
    const item = buildMirrorEntry(doc);
    const idx = docs.findIndex(d => d.id === doc.id);
    if (idx >= 0) docs[idx] = item;
    else docs.unshift(item);
    localStorage.setItem(META_KEY, JSON.stringify(docs));
  } catch {}
}

/**
 * Idempotent cumulative schema reconciliation for Document Vault metadata mirror.
 */
export function reconcileDocumentVaultMetadata() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;
    let changed = false;
    const normalized = parsed.map((d) => {
      if (!d || typeof d !== 'object') return d;
      const safeFile = d.fileName ? sanitizeDocumentFileName(d.fileName) : d.fileName;
      const tags = Array.isArray(d.tags) ? d.tags : [];
      const sourceFormat =
        d.sourceFormat ||
        (safeFile && safeFile.includes('.') ? safeFile.split('.').pop().toLowerCase() : '');
      if (safeFile !== d.fileName || !Array.isArray(d.tags) || sourceFormat !== (d.sourceFormat || '')) {
        changed = true;
      }
      return {
        ...d,
        fileName: safeFile,
        sourceFormat,
        tags
      };
    });
    if (changed) {
      localStorage.setItem(META_KEY, JSON.stringify(normalized));
    }
    loadDocumentFolders();
    return changed;
  } catch {
    return false;
  }
}

function removeMetadataMirrorItem(id) {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const docs = JSON.parse(raw).filter(d => d.id !== id);
      localStorage.setItem(META_KEY, JSON.stringify(docs));
    }
  } catch {}
}
