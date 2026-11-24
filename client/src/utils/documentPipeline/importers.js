// ============================================================================
// KLARITY DOCUMENT VAULT — MULTI-FORMAT IMPORTERS
// Parses PDF, Word (.docx), Excel/CSV (.xlsx/.xls/.csv), PowerPoint (.pptx),
// Markdown (.md), Plain Text (.txt), and Images into Canonical Vault IR.
// ============================================================================

import { unzipSync, strFromU8 } from 'fflate';
import {
  createCanonicalDocument,
  detectSourceFormat,
  getPipelineLimits,
  sanitizeVaultFilename,
  stripFileExtension,
  yieldToMainThread,
  checkAborted
} from './canonicalModel.js';

/**
 * Parse XML string safely in Browser (DOMParser) with a lightweight fallback.
 */
function parseXmlDocument(xmlText) {
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const parseErr = doc.querySelector('parsererror');
    if (parseErr) {
      throw new Error('Malformed XML content inside archive.');
    }
    return doc;
  }
  return null;
}

/**
 * Convert ArrayBuffer / Uint8Array to Data URL cleanly in chunks (avoids call stack overflow).
 */
function bytesToDataUrl(uint8, mimeType = 'application/octet-stream') {
  const chunkSize = 0x8000;
  const parts = [];
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const slice = uint8.subarray(i, i + chunkSize);
    parts.push(String.fromCharCode.apply(null, slice));
  }
  const b64 = typeof btoa !== 'undefined' ? btoa(parts.join('')) : Buffer.from(uint8).toString('base64');
  return `data:${mimeType};base64,${b64}`;
}

/**
 * Helper to read File as ArrayBuffer.
 */
async function readFileAsUint8Array(file) {
  if (typeof file.arrayBuffer === 'function') {
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(new Error('Could not read file bytes.'));
    reader.readAsArrayBuffer(file);
  });
}

// ============================================================================
// 1. PDF IMPORTER (.pdf)
// ============================================================================
async function importPdf(uint8, title, { onProgress, signal, limits }) {
  onProgress?.({ percent: 15, stage: 'Loading PDF engine...' });
  checkAborted(signal);

  const { getPdfjs } = await import('../pdfEditorEngine.js');
  const pdfjsLib = await getPdfjs();

  let pdfDoc;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: uint8.slice() });
    pdfDoc = await loadingTask.promise;
  } catch (err) {
    if (err?.name === 'PasswordException' || /password/i.test(err?.message || '')) {
      throw new Error('This PDF is password-protected. Please unlock it first before importing.');
    }
    throw new Error(`Could not read PDF file: ${err?.message || 'File may be corrupted.'}`);
  }

  const totalPages = pdfDoc.numPages || 0;
  const pagesToExtract = Math.min(totalPages, limits.maxPdfPagesToExtract);
  const blocks = [];
  const warnings = [];
  const plainParts = [];

  if (totalPages > limits.maxPdfPagesToExtract) {
    warnings.push(
      `Extracted searchable text for the first ${limits.maxPdfPagesToExtract} of ${totalPages} pages to protect memory. The full native PDF is preserved.`
    );
  }

  for (let p = 1; p <= pagesToExtract; p++) {
    checkAborted(signal);
    const pct = 20 + Math.round((p / Math.max(1, pagesToExtract)) * 65);
    onProgress?.({ percent: pct, stage: `Extracting PDF page ${p} of ${pagesToExtract}...` });

    try {
      const page = await pdfDoc.getPage(p);
      const textContent = await page.getTextContent();
      const pageLines = [];
      let currentLine = '';
      let lastY = null;

      for (const item of textContent.items || []) {
        const str = typeof item.str === 'string' ? item.str : '';
        const y = Array.isArray(item.transform) ? Math.round(item.transform[5]) : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
          if (currentLine.trim()) pageLines.push(currentLine.trim());
          currentLine = str;
        } else {
          currentLine += (currentLine && str && !currentLine.endsWith(' ') && !str.startsWith(' ') ? ' ' : '') + str;
        }
        if (y !== null) lastY = y;
      }
      if (currentLine.trim()) pageLines.push(currentLine.trim());

      const pageText = pageLines.join('\n').trim();
      if (pageText) {
        if (pagesToExtract > 1) {
          blocks.push({ type: 'heading', level: 2, text: `Page ${p}` });
        }
        // Group consecutive lines into clean paragraphs
        for (const para of pageText.split(/\n{2,}/)) {
          const cleanPara = para.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleanPara) blocks.push({ type: 'paragraph', text: cleanPara });
        }
        plainParts.push(pageText);
      }
      page.cleanup?.();
    } catch {
      // Skip unreadable page without aborting whole import
    }

    if (p % 3 === 0) await yieldToMainThread();
  }

  try {
    await pdfDoc.destroy?.();
  } catch {}

  if (plainParts.length === 0) {
    warnings.push('No selectable text layer detected (this may be a scanned PDF). Stored natively as PDF.');
  }

  return createCanonicalDocument({
    sourceFormat: 'pdf',
    title,
    blocks,
    plainText: plainParts.join('\n\n'),
    stats: {
      pageCount: totalPages,
      truncated: totalPages > limits.maxPdfPagesToExtract,
      truncationNotice: warnings[0] || ''
    },
    warnings
  });
}

// ============================================================================
// 2. WORD IMPORTER (.docx)
// ============================================================================
function extractTextFromXmlNode(node) {
  if (!node) return '';
  let out = '';
  const walk = (el) => {
    if (!el) return;
    const localName = el.localName || el.nodeName?.split(':').pop();
    if (el.nodeType === 3) {
      out += el.nodeValue || '';
      return;
    }
    if (localName === 'tab') {
      out += '\t';
      return;
    }
    if (localName === 'br' || localName === 'cr') {
      out += '\n';
      return;
    }
    for (let i = 0; i < (el.childNodes?.length || 0); i++) {
      walk(el.childNodes[i]);
    }
  };
  walk(node);
  return out.replace(/\s+\n/g, '\n').trim();
}

function parseDocxXmlFallback(xmlText) {
  // Regex fallback for non-DOM environments (e.g., Node unit tests)
  const blocks = [];
  const tables = [];
  const pMatches = xmlText.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
  for (const pXml of pMatches) {
    const tMatches = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
    const text = tMatches
      .map((t) =>
        t
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
      )
      .join('')
      .trim();
    if (!text) continue;
    const styleMatch = pXml.match(/<w:pStyle\s+w:val="([^"]+)"/i);
    const styleVal = (styleMatch?.[1] || '').toLowerCase();
    if (styleVal.includes('heading1') || styleVal === 'title') {
      blocks.push({ type: 'heading', level: 1, text });
    } else if (styleVal.includes('heading2') || styleVal === 'subtitle') {
      blocks.push({ type: 'heading', level: 2, text });
    } else if (styleVal.includes('heading3')) {
      blocks.push({ type: 'heading', level: 3, text });
    } else if (pXml.includes('<w:numPr')) {
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === 'list') prev.items.push(text);
      else blocks.push({ type: 'list', ordered: false, items: [text] });
    } else {
      blocks.push({ type: 'paragraph', text });
    }
  }
  return { blocks, tables };
}

export async function importDocx(uint8, title, { onProgress, signal, limits }) {
  onProgress?.({ percent: 20, stage: 'Unpacking Word document...' });
  checkAborted(signal);

  let files;
  try {
    files = unzipSync(uint8);
  } catch {
    throw new Error('Could not open .docx file. It may be corrupted or encrypted/password-protected.');
  }

  const docXmlBytes = files['word/document.xml'];
  if (!docXmlBytes) {
    if (files['EncryptedPackage']) {
      throw new Error('This Word document is password-protected. Please remove encryption before importing.');
    }
    throw new Error('Invalid .docx archive: missing word/document.xml.');
  }

  onProgress?.({ percent: 45, stage: 'Parsing Word paragraphs, headings, and tables...' });
  const xmlText = strFromU8(docXmlBytes);
  const xmlDoc = parseXmlDocument(xmlText);

  const blocks = [];
  const tables = [];

  if (!xmlDoc) {
    const fallback = parseDocxXmlFallback(xmlText);
    blocks.push(...fallback.blocks);
    tables.push(...fallback.tables);
  } else {
    const body = xmlDoc.getElementsByTagNameNS('*', 'body')[0] || xmlDoc.documentElement;
    const children = Array.from(body?.childNodes || []);

    for (let i = 0; i < children.length; i++) {
      checkAborted(signal);
      if (i > 0 && i % 150 === 0) await yieldToMainThread();

      const node = children[i];
      const localName = node.localName || node.nodeName?.split(':').pop();

      if (localName === 'p') {
        const text = extractTextFromXmlNode(node);
        if (!text) continue;

        const pPr = node.getElementsByTagNameNS('*', 'pPr')[0];
        const pStyle = pPr?.getElementsByTagNameNS('*', 'pStyle')[0];
        const styleVal = (
          pStyle?.getAttribute('w:val') ||
          pStyle?.getAttribute('val') ||
          ''
        ).toLowerCase();
        const hasNumPr = Boolean(pPr?.getElementsByTagNameNS('*', 'numPr')[0]);

        if (styleVal === 'title' || styleVal === 'heading1' || styleVal === 'heading 1') {
          blocks.push({ type: 'heading', level: 1, text });
        } else if (styleVal === 'subtitle' || styleVal === 'heading2' || styleVal === 'heading 2') {
          blocks.push({ type: 'heading', level: 2, text });
        } else if (styleVal.startsWith('heading') || styleVal === 'tocheading') {
          blocks.push({ type: 'heading', level: 3, text });
        } else if (hasNumPr || styleVal.includes('list')) {
          const prev = blocks[blocks.length - 1];
          if (prev && prev.type === 'list') {
            prev.items.push(text);
          } else {
            blocks.push({ type: 'list', ordered: styleVal.includes('number'), items: [text] });
          }
        } else if (styleVal.includes('quote')) {
          blocks.push({ type: 'quote', text });
        } else {
          blocks.push({ type: 'paragraph', text });
        }
      } else if (localName === 'tbl') {
        const rows = [];
        const trNodes = Array.from(node.childNodes || []).filter(
          (n) => (n.localName || n.nodeName?.split(':').pop()) === 'tr'
        );
        for (const tr of trNodes) {
          const cells = [];
          const tcNodes = Array.from(tr.childNodes || []).filter(
            (n) => (n.localName || n.nodeName?.split(':').pop()) === 'tc'
          );
          for (const tc of tcNodes) {
            const cellParas = Array.from(tc.getElementsByTagNameNS('*', 'p'))
              .map((p) => extractTextFromXmlNode(p))
              .filter(Boolean);
            cells.push(cellParas.join(' '));
          }
          if (cells.length > 0) rows.push(cells);
        }
        if (rows.length > 0) {
          const headers = rows[0];
          const dataRows = rows.slice(1);
          tables.push({
            name: `Table ${tables.length + 1}`,
            headers,
            rows: dataRows
          });
        }
      }
    }
  }

  onProgress?.({ percent: 85, stage: 'Building canonical document...' });
  return createCanonicalDocument({
    sourceFormat: 'docx',
    title,
    blocks: blocks.slice(0, limits.maxBlocks),
    tables: tables.slice(0, limits.maxSpreadsheetSheets)
  });
}

// ============================================================================
// 3. SPREADSHEET IMPORTER (.xlsx, .xls, .csv)
// ============================================================================
export async function importSpreadsheet(uint8, title, sourceFormat, { onProgress, signal, limits }) {
  onProgress?.({ percent: 20, stage: 'Loading spreadsheet parser...' });
  checkAborted(signal);

  const XLSX = await import('xlsx');
  let workbook;
  try {
    if (sourceFormat === 'csv') {
      const text = new TextDecoder('utf-8').decode(uint8);
      workbook = XLSX.read(text, { type: 'string', raw: false });
    } else {
      workbook = XLSX.read(uint8, { type: 'array', raw: false });
    }
  } catch (err) {
    if (/password|encrypt/i.test(err?.message || '')) {
      throw new Error('This spreadsheet is password-protected. Please unlock it before importing.');
    }
    throw new Error(`Could not parse spreadsheet: ${err?.message || 'Invalid or corrupted file.'}`);
  }

  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error('Spreadsheet contains no readable sheets.');
  }

  const warnings = [];
  let truncated = false;
  const sheetsToRead = sheetNames.slice(0, limits.maxSpreadsheetSheets);
  if (sheetNames.length > limits.maxSpreadsheetSheets) {
    truncated = true;
    warnings.push(
      `Imported the first ${limits.maxSpreadsheetSheets} of ${sheetNames.length} sheets to stay memory-safe.`
    );
  }

  const tables = [];
  const blocks = [];

  for (let sIdx = 0; sIdx < sheetsToRead.length; sIdx++) {
    checkAborted(signal);
    const sheetName = sheetsToRead[sIdx];
    const pct = 30 + Math.round(((sIdx + 1) / sheetsToRead.length) * 55);
    onProgress?.({ percent: pct, stage: `Parsing sheet "${sheetName}"...` });

    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
    if (!Array.isArray(aoa) || aoa.length === 0) continue;

    const maxCols = Math.min(
      limits.maxSpreadsheetCols,
      aoa.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 0)
    );

    const rawHeaders = Array.isArray(aoa[0]) ? aoa[0] : [];
    const headers = [];
    for (let c = 0; c < maxCols; c++) {
      const val = rawHeaders[c] != null ? String(rawHeaders[c]).trim() : '';
      headers.push(val || `Column ${c + 1}`);
    }

    const totalDataRows = Math.max(0, aoa.length - 1);
    const rowsToKeep = Math.min(totalDataRows, limits.maxSpreadsheetRowsPerSheet);
    if (totalDataRows > limits.maxSpreadsheetRowsPerSheet) {
      truncated = true;
      warnings.push(
        `Sheet "${sheetName}" capped at ${limits.maxSpreadsheetRowsPerSheet.toLocaleString()} of ${totalDataRows.toLocaleString()} rows for fast performance.`
      );
    }

    const rows = [];
    for (let r = 1; r <= rowsToKeep; r++) {
      const srcRow = Array.isArray(aoa[r]) ? aoa[r] : [];
      const cleanRow = [];
      for (let c = 0; c < maxCols; c++) {
        cleanRow.push(srcRow[c] != null ? String(srcRow[c]) : '');
      }
      rows.push(cleanRow);
      if (r % 500 === 0) {
        checkAborted(signal);
        await yieldToMainThread();
      }
    }

    tables.push({
      name: sheetName,
      headers,
      rows
    });

    blocks.push({
      type: 'heading',
      level: 2,
      text: sheetName
    });
    blocks.push({
      type: 'paragraph',
      text: `${rows.length.toLocaleString()} rows × ${headers.length} columns (${headers.slice(0, 6).join(', ')}${headers.length > 6 ? '…' : ''})`
    });

    await yieldToMainThread();
  }

  return createCanonicalDocument({
    sourceFormat,
    title,
    blocks,
    tables,
    stats: {
      truncated,
      truncationNotice: warnings.join(' ')
    },
    warnings
  });
}

// ============================================================================
// 4. POWERPOINT IMPORTER (.pptx)
// ============================================================================
function extractPptxParagraphsFromXml(xmlText) {
  const xmlDoc = parseXmlDocument(xmlText);
  if (!xmlDoc) {
    // Regex fallback for non-DOM environments
    const pMatches = xmlText.match(/<a:p[\s\S]*?<\/a:p>/g) || [];
    return pMatches
      .map((p) =>
        (p.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [])
          .map((t) =>
            t
              .replace(/<[^>]+>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'")
          )
          .join('')
          .trim()
      )
      .filter(Boolean);
  }

  const pNodes = Array.from(xmlDoc.getElementsByTagNameNS('*', 'p'));
  const lines = [];
  for (const p of pNodes) {
    const tNodes = Array.from(p.getElementsByTagNameNS('*', 't'));
    const text = tNodes.map((t) => t.textContent || '').join('').trim();
    if (text) lines.push(text);
  }
  return lines;
}

export async function importPptx(uint8, title, { onProgress, signal, limits }) {
  onProgress?.({ percent: 20, stage: 'Unpacking PowerPoint presentation...' });
  checkAborted(signal);

  let files;
  try {
    files = unzipSync(uint8);
  } catch {
    throw new Error('Could not open .pptx file. It may be corrupted or password-protected.');
  }

  if (files['EncryptedPackage']) {
    throw new Error('This PowerPoint presentation is password-protected. Please unlock it first.');
  }

  // Resolve slide order via ppt/presentation.xml + ppt/_rels/presentation.xml.rels
  let orderedSlidePaths = [];
  try {
    const presXml = files['ppt/presentation.xml'] ? strFromU8(files['ppt/presentation.xml']) : '';
    const relsXml = files['ppt/_rels/presentation.xml.rels']
      ? strFromU8(files['ppt/_rels/presentation.xml.rels'])
      : '';

    if (presXml && relsXml) {
      const relMap = new Map();
      const relRegex = /Id="(rId\d+)"[^>]*Target="([^"]+)"/g;
      let m;
      while ((m = relRegex.exec(relsXml)) !== null) {
        relMap.set(m[1], m[2]);
      }

      const sldIdRegex = /r:id="(rId\d+)"/g;
      while ((m = sldIdRegex.exec(presXml)) !== null) {
        const target = relMap.get(m[1]);
        if (target && /slides\/slide\d+\.xml$/i.test(target)) {
          const fullPath = target.startsWith('ppt/') ? target : `ppt/${target.replace(/^\/+/, '')}`;
          if (files[fullPath]) orderedSlidePaths.push(fullPath);
        }
      }
    }
  } catch {}

  // Fallback: numeric sort of ppt/slides/slideN.xml
  if (orderedSlidePaths.length === 0) {
    orderedSlidePaths = Object.keys(files)
      .filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
        const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
        return numA - numB;
      });
  }

  if (orderedSlidePaths.length === 0) {
    throw new Error('Invalid .pptx archive: no slides found.');
  }

  const warnings = [];
  let truncated = false;
  if (orderedSlidePaths.length > limits.maxSlides) {
    truncated = true;
    warnings.push(`Imported the first ${limits.maxSlides} of ${orderedSlidePaths.length} slides.`);
    orderedSlidePaths = orderedSlidePaths.slice(0, limits.maxSlides);
  }

  const slides = [];
  const blocks = [];

  for (let i = 0; i < orderedSlidePaths.length; i++) {
    checkAborted(signal);
    const slidePath = orderedSlidePaths[i];
    const slideNum = i + 1;
    const pct = 30 + Math.round((slideNum / orderedSlidePaths.length) * 55);
    onProgress?.({ percent: pct, stage: `Reading slide ${slideNum} of ${orderedSlidePaths.length}...` });

    const slideXml = strFromU8(files[slidePath]);
    let slideTitle = '';
    const bullets = [];
    const body = [];

    const xmlDoc = parseXmlDocument(slideXml);
    if (xmlDoc) {
      const spNodes = Array.from(xmlDoc.getElementsByTagNameNS('*', 'sp'));
      for (const sp of spNodes) {
        const ph = sp.getElementsByTagNameNS('*', 'ph')[0];
        const phType = (ph?.getAttribute('type') || '').toLowerCase();
        const isTitlePh = phType === 'title' || phType === 'ctrtitle';
        const isFooterPh = phType === 'sldnum' || phType === 'dt' || phType === 'ftr';
        if (isFooterPh) continue;

        const pNodes = Array.from(sp.getElementsByTagNameNS('*', 'p'));
        for (const p of pNodes) {
          const text = Array.from(p.getElementsByTagNameNS('*', 't'))
            .map((t) => t.textContent || '')
            .join('')
            .trim();
          if (!text) continue;
          if (isTitlePh && !slideTitle) {
            slideTitle = text;
          } else {
            bullets.push(text);
          }
        }
      }
    } else {
      const allLines = extractPptxParagraphsFromXml(slideXml);
      if (allLines.length > 0) {
        slideTitle = allLines[0];
        bullets.push(...allLines.slice(1));
      }
    }

    if (!slideTitle && bullets.length > 0) {
      slideTitle = bullets.shift();
    }
    if (!slideTitle) {
      slideTitle = `Slide ${slideNum}`;
    }

    // Extract speaker notes if linked via slide rels or matching notesSlideN.xml
    let notes = '';
    const slideFileName = slidePath.split('/').pop();
    const slideRelsPath = `ppt/slides/_rels/${slideFileName}.rels`;
    let notesPath = null;
    if (files[slideRelsPath]) {
      const relText = strFromU8(files[slideRelsPath]);
      const notesMatch = relText.match(/Target="([^"]*notesSlide\d+\.xml)"/i);
      if (notesMatch?.[1]) {
        const cleanedTarget = notesMatch[1].replace(/^\.\.\//, '');
        notesPath = cleanedTarget.startsWith('ppt/') ? cleanedTarget : `ppt/${cleanedTarget}`;
      }
    }
    if (!notesPath) {
      const candidate = `ppt/notesSlides/notesSlide${slideNum}.xml`;
      if (files[candidate]) notesPath = candidate;
    }
    if (notesPath && files[notesPath]) {
      const notesLines = extractPptxParagraphsFromXml(strFromU8(files[notesPath])).filter(
        (line) => line !== String(slideNum)
      );
      notes = notesLines.join('\n').trim();
    }

    slides.push({
      index: slideNum,
      title: slideTitle,
      bullets,
      body,
      notes
    });

    blocks.push({ type: 'heading', level: 2, text: `Slide ${slideNum}: ${slideTitle}` });
    if (bullets.length > 0) {
      blocks.push({ type: 'list', ordered: false, items: bullets });
    }
    if (notes) {
      blocks.push({ type: 'quote', text: `Speaker Notes: ${notes}` });
    }

    if (slideNum % 5 === 0) await yieldToMainThread();
  }

  return createCanonicalDocument({
    sourceFormat: 'pptx',
    title,
    blocks,
    slides,
    stats: {
      truncated,
      truncationNotice: warnings.join(' ')
    },
    warnings
  });
}

// ============================================================================
// 5. MARKDOWN & PLAIN TEXT IMPORTER (.md, .txt)
// ============================================================================
export function importTextOrMarkdown(text, title, sourceFormat, limits = getPipelineLimits()) {
  const normalized = String(text || '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const blocks = [];
  const tables = [];

  let i = 0;
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines = [];

  while (i < lines.length && blocks.length < limits.maxBlocks) {
    const line = lines[i];
    const trimmed = line.trim();

    // Fenced code blocks
    if (sourceFormat === 'md' && trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
        codeLines = [];
      } else {
        blocks.push({ type: 'code', language: codeLang, text: codeLines.join('\n') });
        inCodeBlock = false;
        codeLang = '';
        codeLines = [];
      }
      i++;
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      i++;
      continue;
    }

    if (!trimmed) {
      i++;
      continue;
    }

    // Markdown headings
    if (sourceFormat === 'md') {
      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        blocks.push({
          type: 'heading',
          level: headingMatch[1].length,
          text: headingMatch[2].trim()
        });
        i++;
        continue;
      }

      if (/^([-*_]){3,}$/.test(trimmed)) {
        blocks.push({ type: 'divider' });
        i++;
        continue;
      }

      if (trimmed.startsWith('> ')) {
        blocks.push({ type: 'quote', text: trimmed.slice(2).trim() });
        i++;
        continue;
      }

      // Markdown pipe table detection
      if (
        trimmed.includes('|') &&
        i + 1 < lines.length &&
        /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[i + 1].trim())
      ) {
        const parseRow = (rowLine) =>
          rowLine
            .trim()
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((c) => c.trim());

        const headers = parseRow(trimmed);
        const rows = [];
        i += 2;
        while (i < lines.length && lines[i].trim().includes('|')) {
          rows.push(parseRow(lines[i]));
          i++;
        }
        tables.push({
          name: `Table ${tables.length + 1}`,
          headers,
          rows
        });
        continue;
      }
    }

    // Bullet or numbered list
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (bulletMatch || orderedMatch) {
      const ordered = Boolean(orderedMatch);
      const items = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        const bm = t.match(/^[-*•]\s+(.+)$/);
        const om = t.match(/^\d+[.)]\s+(.+)$/);
        if (ordered && om) {
          items.push(om[1].trim());
          i++;
        } else if (!ordered && bm) {
          items.push(bm[1].trim());
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Paragraph (coalesce consecutive plain lines)
    const paraLines = [trimmed];
    i++;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (
        !next ||
        (sourceFormat === 'md' &&
          (/^(#{1,3})\s+/.test(next) || next.startsWith('```') || next.startsWith('> '))) ||
        /^[-*•]\s+/.test(next) ||
        /^\d+[.)]\s+/.test(next)
      ) {
        break;
      }
      paraLines.push(next);
      i++;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
  }

  return createCanonicalDocument({
    sourceFormat,
    title,
    blocks,
    tables,
    plainText: normalized
  });
}

// ============================================================================
// MAIN ENTRYPOINT: importExternalFile(file, options)
// ============================================================================
export async function importExternalFile(file, { onProgress, signal } = {}) {
  if (!file) throw new Error('No file selected.');
  checkAborted(signal);

  const limits = getPipelineLimits();
  const safeFileName = sanitizeVaultFilename(file.name, 'document');
  const sourceFormat = detectSourceFormat(safeFileName, file.type);

  if (sourceFormat === 'unsupported') {
    throw new Error(
      `Unsupported file format "${safeFileName}". Supported formats: PDF, DOCX, XLSX, XLS, CSV, PPTX, MD, TXT, and images.`
    );
  }

  if (file.size === 0) {
    throw new Error('The selected file is empty (0 bytes).');
  }

  if (file.size > limits.maxFileSizeBytes) {
    const limitMB = Math.round(limits.maxFileSizeBytes / (1024 * 1024));
    throw new Error(
      `File exceeds the ${limitMB} MB safety limit for this device (${(file.size / (1024 * 1024)).toFixed(1)} MB).`
    );
  }

  onProgress?.({ percent: 8, stage: 'Reading file...' });
  const uint8 = await readFileAsUint8Array(file);
  checkAborted(signal);

  const defaultTitle = stripFileExtension(safeFileName).replace(/[-_]+/g, ' ');
  const prettyTitle = defaultTitle.charAt(0).toUpperCase() + defaultTitle.slice(1);

  let canonical;
  if (sourceFormat === 'pdf') {
    canonical = await importPdf(uint8, prettyTitle, { onProgress, signal, limits });
  } else if (sourceFormat === 'docx') {
    canonical = await importDocx(uint8, prettyTitle, { onProgress, signal, limits });
  } else if (sourceFormat === 'xlsx' || sourceFormat === 'xls' || sourceFormat === 'csv') {
    canonical = await importSpreadsheet(uint8, prettyTitle, sourceFormat, { onProgress, signal, limits });
  } else if (sourceFormat === 'pptx') {
    canonical = await importPptx(uint8, prettyTitle, { onProgress, signal, limits });
  } else if (sourceFormat === 'md' || sourceFormat === 'txt') {
    onProgress?.({ percent: 45, stage: 'Parsing text structure...' });
    const text = new TextDecoder('utf-8').decode(uint8);
    canonical = importTextOrMarkdown(text, prettyTitle, sourceFormat, limits);
  } else if (sourceFormat === 'image') {
    onProgress?.({ percent: 50, stage: 'Preparing image...' });
    canonical = createCanonicalDocument({
      sourceFormat: 'image',
      title: prettyTitle,
      blocks: [{ type: 'paragraph', text: `Image document: ${safeFileName}` }],
      plainText: prettyTitle
    });
  }

  checkAborted(signal);
  onProgress?.({ percent: 92, stage: 'Preparing vault payload...' });

  const mimeMap = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    md: 'text/markdown',
    txt: 'text/plain'
  };
  const resolvedMime = file.type || mimeMap[sourceFormat] || 'application/octet-stream';

  const canEmbedOriginal =
    sourceFormat === 'pdf' ||
    sourceFormat === 'image' ||
    file.size <= limits.maxOriginalEmbedBytes;

  const originalDataUrl = canEmbedOriginal ? bytesToDataUrl(uint8, resolvedMime) : '';

  onProgress?.({ percent: 100, stage: 'Ready to import' });

  return {
    title: prettyTitle,
    fileName: safeFileName,
    fileType: resolvedMime,
    fileSize: file.size,
    sourceFormat,
    canonical,
    originalDataUrl,
    canEmbedOriginal,
    warnings: canonical.warnings || []
  };
}
