// ============================================================================
// KLARITY DOCUMENT VAULT — CANONICAL INTERMEDIATE REPRESENTATION (IR)
// Central schema, sanitization, device-aware guardrails, and format metadata.
// ============================================================================

export const CANONICAL_SCHEMA_VERSION = 1;

export const SUPPORTED_IMPORT_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.xlsx',
  '.xls',
  '.csv',
  '.pptx',
  '.md',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.svg',
  '.gif'
];

export const IMPORT_ACCEPT_ATTRIBUTE = SUPPORTED_IMPORT_EXTENSIONS.join(',');

export const EXPORT_FORMATS = [
  {
    id: 'pdf',
    ext: '.pdf',
    label: 'PDF Document',
    shortLabel: 'PDF',
    mime: 'application/pdf',
    description: 'Universal read-only layout for sharing, printing, and archiving.'
  },
  {
    id: 'docx',
    ext: '.docx',
    label: 'Word Document',
    shortLabel: 'DOCX',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    description: 'Editable rich text document with headings, lists, and tables.'
  },
  {
    id: 'xlsx',
    ext: '.xlsx',
    label: 'Excel Workbook',
    shortLabel: 'XLSX',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    description: 'Multi-sheet structured spreadsheet for financial and tabular data.'
  },
  {
    id: 'csv',
    ext: '.csv',
    label: 'CSV Spreadsheet',
    shortLabel: 'CSV',
    mime: 'text/csv;charset=utf-8',
    description: 'Lightweight comma-separated values compatible with any spreadsheet tool.'
  },
  {
    id: 'pptx',
    ext: '.pptx',
    label: 'PowerPoint Deck',
    shortLabel: 'PPTX',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    description: 'Structured presentation slides with titles, bullet points, and speaker notes.'
  },
  {
    id: 'md',
    ext: '.md',
    label: 'Markdown',
    shortLabel: 'MD',
    mime: 'text/markdown;charset=utf-8',
    description: 'Clean plain-text markup preserving headings, lists, and tables.'
  },
  {
    id: 'txt',
    ext: '.txt',
    label: 'Plain Text',
    shortLabel: 'TXT',
    mime: 'text/plain;charset=utf-8',
    description: 'Minimal universal text with zero formatting overhead.'
  }
];

export const FORMAT_META_BY_ID = Object.fromEntries(EXPORT_FORMATS.map((f) => [f.id, f]));

/**
 * Device-aware memory and processing limits for older laptops & Chromebooks.
 */
export function getPipelineLimits() {
  let deviceMemory = 8;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.deviceMemory === 'number') {
      deviceMemory = navigator.deviceMemory;
    }
  } catch {}
  const isLowRam = deviceMemory <= 4;

  return {
    isLowRam,
    maxFileSizeBytes: isLowRam ? 20 * 1024 * 1024 : 35 * 1024 * 1024,
    maxOriginalEmbedBytes: isLowRam ? 12 * 1024 * 1024 : 25 * 1024 * 1024,
    maxPdfPagesToExtract: isLowRam ? 45 : 80,
    maxSpreadsheetSheets: isLowRam ? 8 : 12,
    maxSpreadsheetRowsPerSheet: isLowRam ? 2500 : 5000,
    maxSpreadsheetCols: 100,
    maxSlides: isLowRam ? 80 : 120,
    maxBlocks: isLowRam ? 1500 : 3000,
    maxPlainTextChars: 120000,
    maxSearchPreviewChars: 2400
  };
}

/**
 * Yield cooperatively to the main thread so UI remains responsive on low-end hardware.
 */
export function yieldToMainThread() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Throw standard AbortError if caller cancelled an operation.
 */
export function checkAborted(signal) {
  if (signal && signal.aborted) {
    const err = new Error('Operation was cancelled.');
    err.name = 'AbortError';
    throw err;
  }
}

/**
 * Strict path & filename sanitization:
 * Strips directory traversal, path separators, invalid FS chars, and control chars.
 */
export function sanitizeVaultFilename(rawName, fallback = 'document') {
  if (!rawName || typeof rawName !== 'string') return fallback;
  // Remove path prefixes & traversal sequences
  let cleaned = rawName
    .replace(/\0/g, '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\\/g, '/');

  // Take only final path segment after stripping any ../ or /
  const segments = cleaned.split('/').filter((s) => s && s !== '.' && s !== '..');
  cleaned = segments.length > 0 ? segments[segments.length - 1] : fallback;

  // Strip remaining traversal dots & forbidden characters
  cleaned = cleaned
    .replace(/\.\.+/g, '.')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return fallback;
  // Cap length to stay safe across Windows/macOS/Linux/ChromeOS
  if (cleaned.length > 140) {
    const extMatch = cleaned.match(/(\.[a-z0-9]{1,8})$/i);
    const ext = extMatch ? extMatch[1] : '';
    cleaned = cleaned.slice(0, 140 - ext.length).trim() + ext;
  }
  return cleaned || fallback;
}

/**
 * Strip file extension and produce a clean human-readable document title.
 */
export function stripFileExtension(fileName = '') {
  const safe = sanitizeVaultFilename(fileName, 'Document');
  return safe.replace(/\.[^/.]+$/, '').trim() || 'Document';
}

/**
 * Ensure filename ends with the desired extension (sanitized).
 */
export function buildSafeExportFilename(baseName, targetFormatId) {
  const meta = FORMAT_META_BY_ID[targetFormatId] || { ext: '.txt' };
  const stripped = stripFileExtension(baseName || 'document');
  const safeBase = sanitizeVaultFilename(stripped, 'document');
  return `${safeBase}${meta.ext}`;
}

/**
 * Detect canonical source format from file name and MIME type.
 */
export function detectSourceFormat(fileName = '', mimeType = '') {
  const lowerName = String(fileName || '').toLowerCase().trim();
  const lowerMime = String(mimeType || '').toLowerCase().trim();

  if (lowerName.endsWith('.pdf') || lowerMime === 'application/pdf') return 'pdf';
  if (
    lowerName.endsWith('.docx') ||
    lowerMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (
    lowerName.endsWith('.xlsx') ||
    lowerMime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'xlsx';
  }
  if (lowerName.endsWith('.xls') || lowerMime === 'application/vnd.ms-excel') return 'xls';
  if (lowerName.endsWith('.csv') || lowerMime === 'text/csv') return 'csv';
  if (
    lowerName.endsWith('.pptx') ||
    lowerMime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'pptx';
  }
  if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown') || lowerMime === 'text/markdown') {
    return 'md';
  }
  if (lowerName.endsWith('.txt') || lowerMime === 'text/plain') return 'txt';
  if (
    lowerMime.startsWith('image/') ||
    /\.(png|jpe?g|webp|svg|gif)$/i.test(lowerName)
  ) {
    return 'image';
  }
  return 'unsupported';
}

/**
 * Prevent spreadsheet formula injection (CSV/Excel DDE protection).
 */
export function sanitizeSpreadsheetCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Escape XML text entities safely for OOXML (.docx / .pptx) generation.
 */
export function escapeXml(str) {
  return String(str ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build a normalized Canonical Vault Document IR object.
 */
export function createCanonicalDocument({
  sourceFormat = 'txt',
  title = 'Untitled Document',
  blocks = [],
  tables = [],
  slides = [],
  plainText = '',
  stats = {},
  warnings = []
} = {}) {
  const limits = getPipelineLimits();
  const safeBlocks = Array.isArray(blocks) ? blocks.slice(0, limits.maxBlocks) : [];
  const safeTables = Array.isArray(tables) ? tables.slice(0, limits.maxSpreadsheetSheets) : [];
  const safeSlides = Array.isArray(slides) ? slides.slice(0, limits.maxSlides) : [];

  let computedPlain = typeof plainText === 'string' && plainText.trim() ? plainText : '';
  if (!computedPlain) {
    const parts = [];
    for (const b of safeBlocks) {
      if (b.type === 'list' && Array.isArray(b.items)) {
        parts.push(b.items.map((item, i) => (b.ordered ? `${i + 1}. ${item}` : `• ${item}`)).join('\n'));
      } else if (b.text) {
        parts.push(b.text);
      }
    }
    for (const t of safeTables) {
      if (t.name) parts.push(`[${t.name}]`);
      if (Array.isArray(t.headers) && t.headers.length) parts.push(t.headers.join('\t'));
      if (Array.isArray(t.rows)) {
        for (const row of t.rows.slice(0, 200)) {
          parts.push(row.join('\t'));
        }
      }
    }
    for (const s of safeSlides) {
      parts.push(`Slide ${s.index}: ${s.title || ''}`);
      if (Array.isArray(s.bullets)) parts.push(s.bullets.join('\n'));
      if (Array.isArray(s.body)) parts.push(s.body.join('\n'));
      if (s.notes) parts.push(`Notes: ${s.notes}`);
    }
    computedPlain = parts.join('\n\n').trim();
  }

  if (computedPlain.length > limits.maxPlainTextChars) {
    computedPlain = computedPlain.slice(0, limits.maxPlainTextChars);
  }

  const wordCount = computedPlain
    ? computedPlain.split(/\s+/).filter(Boolean).length
    : 0;

  const totalRows = safeTables.reduce((sum, t) => sum + (Array.isArray(t.rows) ? t.rows.length : 0), 0);

  const summaryParts = [];
  if (stats.pageCount) summaryParts.push(`${stats.pageCount} page${stats.pageCount === 1 ? '' : 's'}`);
  if (safeSlides.length) summaryParts.push(`${safeSlides.length} slide${safeSlides.length === 1 ? '' : 's'}`);
  if (safeTables.length) {
    summaryParts.push(
      `${safeTables.length} table${safeTables.length === 1 ? '' : 's'} (${totalRows.toLocaleString()} rows)`
    );
  }
  if (!safeSlides.length && !safeTables.length && wordCount > 0) {
    summaryParts.push(`${wordCount.toLocaleString()} words`);
  }

  return {
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    sourceFormat,
    title: String(title || 'Untitled Document').trim(),
    summary: summaryParts.join(' • ') || 'Structured vault document',
    stats: {
      pageCount: stats.pageCount || null,
      wordCount,
      blockCount: safeBlocks.length,
      tableCount: safeTables.length,
      rowCount: totalRows,
      slideCount: safeSlides.length,
      truncated: Boolean(stats.truncated),
      truncationNotice: stats.truncationNotice || ''
    },
    blocks: safeBlocks,
    tables: safeTables,
    slides: safeSlides,
    plainText: computedPlain,
    warnings: Array.isArray(warnings) ? warnings : []
  };
}

/**
 * Smart export format recommendations & fidelity guardrails based on document content.
 */
export function getExportFormatRecommendations(doc) {
  const canonical = doc?.canonical || null;
  const sourceFormat = (
    doc?.sourceFormat ||
    canonical?.sourceFormat ||
    detectSourceFormat(doc?.fileName, doc?.fileType)
  ).toLowerCase();

  const hasTables = Boolean(canonical?.tables?.length);
  const hasSlides = Boolean(canonical?.slides?.length);
  const isSpreadsheet = sourceFormat === 'xlsx' || sourceFormat === 'xls' || sourceFormat === 'csv';
  const isPresentation = sourceFormat === 'pptx' || hasSlides;
  const isPdf = sourceFormat === 'pdf';
  const isImage = sourceFormat === 'image';

  const recommendedIds = new Set();
  if (isSpreadsheet) {
    recommendedIds.add('xlsx');
    recommendedIds.add('csv');
    recommendedIds.add('pdf');
  } else if (isPresentation) {
    recommendedIds.add('pptx');
    recommendedIds.add('pdf');
    recommendedIds.add('docx');
  } else if (isPdf) {
    recommendedIds.add('pdf');
    recommendedIds.add('docx');
    recommendedIds.add('txt');
  } else if (isImage) {
    recommendedIds.add('pdf');
  } else {
    recommendedIds.add('docx');
    recommendedIds.add('pdf');
    recommendedIds.add('md');
  }

  return EXPORT_FORMATS.map((fmt) => {
    const recommended = recommendedIds.has(fmt.id);
    let fidelityNote = '';

    if (isImage && fmt.id !== 'pdf') {
      fidelityNote = 'Image documents export metadata & notes only; choose PDF to embed the image directly.';
    } else if (isPdf && fmt.id !== 'pdf') {
      fidelityNote = 'Exports extracted text & structure; complex visual layouts, forms, or embedded images will not map 1:1.';
    } else if (isSpreadsheet && (fmt.id === 'pptx' || fmt.id === 'docx')) {
      fidelityNote = 'Large tables are summarized/wrapped to fit document or slide pages.';
    } else if (!hasTables && !isSpreadsheet && (fmt.id === 'xlsx' || fmt.id === 'csv')) {
      fidelityNote = 'No native tables detected — content blocks will be exported as structured rows.';
    } else if (!hasSlides && fmt.id === 'pptx') {
      fidelityNote = 'Document sections will be automatically grouped into clean presentation slides.';
    } else if (isPresentation && (fmt.id === 'xlsx' || fmt.id === 'csv')) {
      fidelityNote = 'Exports slide titles, bullets, and speaker notes as tabular rows; slide visuals are omitted.';
    }

    return {
      ...fmt,
      recommended,
      fidelityNote
    };
  }).sort((a, b) => Number(b.recommended) - Number(a.recommended));
}
