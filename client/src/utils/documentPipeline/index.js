// ============================================================================
// KLARITY DOCUMENT VAULT — MULTI-FORMAT IMPORT & EXPORT PIPELINE BARREL
// ============================================================================

export * from './canonicalModel.js';
export * from './importers.js';
export * from './exporters.js';

import {
  createCanonicalDocument,
  detectSourceFormat,
  stripFileExtension
} from './canonicalModel.js';
import {
  importDocx,
  importPptx,
  importSpreadsheet,
  importTextOrMarkdown
} from './importers.js';

/**
 * Ensure any Vault document (including legacy docs uploaded prior to the pipeline)
 * has a usable Canonical IR before previewing or exporting.
 */
export async function ensureDocumentCanonical(doc, options = {}) {
  if (!doc) return null;
  if (doc.canonical && typeof doc.canonical === 'object' && doc.canonical.schemaVersion) {
    return doc.canonical;
  }

  const title = doc.name || stripFileExtension(doc.fileName || 'Document');
  const sourceFormat = doc.sourceFormat || detectSourceFormat(doc.fileName, doc.fileType);

  // Attempt on-the-fly reconstruction if original dataUrl exists
  if (doc.dataUrl && typeof doc.dataUrl === 'string' && doc.dataUrl.includes(',')) {
    try {
      const b64 = doc.dataUrl.slice(doc.dataUrl.indexOf(',') + 1);
      const binary = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
      const uint8 = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) uint8[i] = binary.charCodeAt(i);

      if (sourceFormat === 'docx') {
        return await importDocx(uint8, title, { ...options, limits: { maxBlocks: 2000, maxSpreadsheetSheets: 10 } });
      }
      if (sourceFormat === 'xlsx' || sourceFormat === 'xls' || sourceFormat === 'csv') {
        return await importSpreadsheet(uint8, title, sourceFormat, {
          ...options,
          limits: { maxSpreadsheetSheets: 10, maxSpreadsheetRowsPerSheet: 3000, maxSpreadsheetCols: 100 }
        });
      }
      if (sourceFormat === 'pptx') {
        return await importPptx(uint8, title, { ...options, limits: { maxSlides: 100 } });
      }
      if (sourceFormat === 'md' || sourceFormat === 'txt') {
        const text = new TextDecoder('utf-8').decode(uint8);
        return importTextOrMarkdown(text, title, sourceFormat);
      }
    } catch {
      // Fallback gracefully to metadata-based canonical representation
    }
  }

  const fallbackBlocks = [];
  if (doc.notes) {
    fallbackBlocks.push({ type: 'paragraph', text: doc.notes });
  } else {
    fallbackBlocks.push({
      type: 'paragraph',
      text: `${title} (${doc.fileName || sourceFormat.toUpperCase()})`
    });
  }

  return createCanonicalDocument({
    sourceFormat: sourceFormat === 'unsupported' ? 'txt' : sourceFormat,
    title,
    blocks: fallbackBlocks,
    plainText: [title, doc.notes || ''].filter(Boolean).join('\n\n')
  });
}
