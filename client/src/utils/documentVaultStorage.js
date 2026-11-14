// ============================================================================
// KLARITY DOCUMENT VAULT STORAGE (IndexedDB with LocalStorage Fallback)
// Stores documents (PDFs, images, scans, statements) locally and securely.
// ============================================================================

const DB_NAME = 'KlarityVaultDocumentsDB';
const DB_VERSION = 1;
const STORE_NAME = 'documents';
const FOLDERS_KEY = 'klarity_vault_doc_folders';
const META_KEY = 'klarity_vault_doc_metadata';

export const DEFAULT_DOCUMENT_FOLDERS = [
  'Taxes',
  'Insurance',
  'Identity & Legal',
  'Banking & Receipts',
  'Medical',
  'Property & Auto',
  'Other'
];

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
 * Load list of custom & default folders
 */
export function loadDocumentFolders() {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) return [...DEFAULT_DOCUMENT_FOLDERS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge with default folders while preserving unique values
      return Array.from(new Set([...DEFAULT_DOCUMENT_FOLDERS, ...parsed]));
    }
    return [...DEFAULT_DOCUMENT_FOLDERS];
  } catch {
    return [...DEFAULT_DOCUMENT_FOLDERS];
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
 * Load all documents from IndexedDB (with localStorage metadata fallback)
 */
export async function getAllDocuments() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const docs = request.result || [];
        // Update metadata mirror in localStorage for instant sync
        syncMetadataMirror(docs);
        resolve(docs);
      };
      request.onerror = () => reject(request.error);
    });
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
 * Save or update a single document in IndexedDB
 */
export async function saveDocument(document) {
  if (!document || !document.id) {
    throw new Error('Document must have a valid ID.');
  }

  const cleanDoc = {
    ...document,
    updatedAt: new Date().toISOString()
  };

  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(cleanDoc);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    // IndexedDB failed; fallback to localStorage if payload is reasonable
    try {
      const raw = localStorage.getItem(META_KEY);
      const docs = raw ? JSON.parse(raw) : [];
      const idx = docs.findIndex(d => d.id === cleanDoc.id);
      if (idx >= 0) docs[idx] = cleanDoc;
      else docs.unshift(cleanDoc);
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
function syncMetadataMirror(docs) {
  try {
    // Store metadata without heavy dataUrl to keep localStorage light & fast
    const lightweight = docs.map(({ id, name, folder, fileType, fileName, fileSize, createdAt, updatedAt, notes }) => ({
      id, name, folder, fileType, fileName, fileSize, createdAt, updatedAt, notes
    }));
    localStorage.setItem(META_KEY, JSON.stringify(lightweight));
  } catch {}
}

function updateMetadataMirrorItem(doc) {
  try {
    const raw = localStorage.getItem(META_KEY);
    const docs = raw ? JSON.parse(raw) : [];
    const item = {
      id: doc.id,
      name: doc.name,
      folder: doc.folder,
      fileType: doc.fileType,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      notes: doc.notes
    };
    const idx = docs.findIndex(d => d.id === doc.id);
    if (idx >= 0) docs[idx] = item;
    else docs.unshift(item);
    localStorage.setItem(META_KEY, JSON.stringify(docs));
  } catch {}
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
