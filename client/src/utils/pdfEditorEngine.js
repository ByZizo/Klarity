// ============================================================================
// KLARITY OFFLINE PDF EDITOR ENGINE (100% Local, Zero Network Calls)
// Libraries: pdfjs-dist (MIT/Apache-2.0), pdf-lib + @pdf-lib/fontkit (MIT),
// tesseract.js (Apache-2.0) — strictly local bundled workers & OFL/Apache fonts.
// ============================================================================

import {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
  PDFName,
  PDFString,
  PDFArray,
  LineCapStyle
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { computeSha256Hex, buildSignatureReceipt } from './pdfSecurityEngine.js';

let cachedPdfjsLib = null;

export const SCRIPT_FONTS = [
  { id: 'Dancing Script', label: 'Dancing Script', css: '"Dancing Script", cursive', woffUrl: '/pdf-assets/fonts/dancing-script.woff' },
  { id: 'Caveat', label: 'Caveat', css: '"Caveat", cursive', woffUrl: '/pdf-assets/fonts/caveat.woff' },
  { id: 'Allura', label: 'Allura', css: '"Allura", cursive', woffUrl: '/pdf-assets/fonts/allura.woff' },
  { id: 'Sacramento', label: 'Sacramento', css: '"Sacramento", cursive', woffUrl: '/pdf-assets/fonts/sacramento.woff' },
  { id: 'Homemade Apple', label: 'Homemade Apple', css: '"Homemade Apple", cursive', woffUrl: '/pdf-assets/fonts/homemade-apple.woff' },
  { id: 'Great Vibes', label: 'Great Vibes', css: '"Great Vibes", cursive', woffUrl: '/pdf-assets/fonts/great-vibes.woff' }
];

export const EDITOR_FONTS = [
  { id: 'Inter', label: 'Inter (Unicode)', css: '"Inter", sans-serif', woffUrl: '/pdf-assets/fonts/inter-regular.woff', boldWoffUrl: '/pdf-assets/fonts/inter-bold.woff', italicWoffUrl: '/pdf-assets/fonts/inter-italic.woff', boldItalicWoffUrl: '/pdf-assets/fonts/inter-bold-italic.woff' },
  { id: 'Helvetica', label: 'Helvetica', css: 'Helvetica, Arial, sans-serif', stdRegular: StandardFonts.Helvetica, stdBold: StandardFonts.HelveticaBold, stdItalic: StandardFonts.HelveticaOblique, stdBoldItalic: StandardFonts.HelveticaBoldOblique },
  { id: 'Times', label: 'Times Serif', css: '"Times New Roman", Georgia, serif', stdRegular: StandardFonts.TimesRoman, stdBold: StandardFonts.TimesRomanBold, stdItalic: StandardFonts.TimesRomanItalic, stdBoldItalic: StandardFonts.TimesRomanBoldItalic },
  { id: 'Courier', label: 'Courier Mono', css: '"Courier New", monospace', stdRegular: StandardFonts.Courier, stdBold: StandardFonts.CourierBold, stdItalic: StandardFonts.CourierOblique, stdBoldItalic: StandardFonts.CourierBoldOblique },
  ...SCRIPT_FONTS.map((f) => ({ ...f, stdRegular: StandardFonts.Helvetica }))
];

const fontBytesCache = new Map();
const customUploadedFonts = new Map(); // id -> { label, bytes }

export function registerCustomFontBytes(fontName, fontBytes) {
  const id = `custom:${fontName}`;
  customUploadedFonts.set(id, {
    id,
    label: fontName,
    bytes: fontBytes instanceof Uint8Array ? fontBytes : new Uint8Array(fontBytes)
  });
  return id;
}

export function getRegisteredCustomFonts() {
  return Array.from(customUploadedFonts.values()).map((f) => ({ id: f.id, label: f.label }));
}

async function fetchLocalFontBytes(url) {
  if (!url) return null;
  if (fontBytesCache.has(url)) return fontBytesCache.get(url);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    fontBytesCache.set(url, buf);
    return buf;
  } catch {
    return null;
  }
}

export async function getPdfjs() {
  if (cachedPdfjsLib) return cachedPdfjsLib;
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  cachedPdfjsLib = pdfjsLib;
  return pdfjsLib;
}

export function hexToPdfRgb(hex = '#000000') {
  if (!hex || hex === 'transparent') return rgb(0, 0, 0);
  let clean = String(hex).replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return rgb(Number.isFinite(r) ? r : 0, Number.isFinite(g) ? g : 0, Number.isFinite(b) ? b : 0);
}

export function dataUrlToUint8Array(dataUrl) {
  if (dataUrl instanceof Uint8Array) return dataUrl;
  if (dataUrl instanceof ArrayBuffer) return new Uint8Array(dataUrl);
  if (typeof dataUrl !== 'string') return new Uint8Array(0);
  const base64Index = dataUrl.indexOf(';base64,');
  const base64 = base64Index !== -1 ? dataUrl.slice(base64Index + 8) : dataUrl;
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function uint8ArrayToDataUrl(bytes, mimeType = 'application/pdf') {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < arr.byteLength; i += chunkSize) {
    const chunk = arr.subarray(i, Math.min(i + chunkSize, arr.byteLength));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/**
 * Inspect PDF bytes without executing scripts, returning metadata, outline, attachments, JS warning flag.
 */
export async function loadPdfForViewing(source, password = '') {
  const pdfjsLib = await getPdfjs();
  const bytes = dataUrlToUint8Array(source);
  const loadingTask = pdfjsLib.getDocument({
    data: bytes.slice(0),
    password: password || undefined,
    isEvalSupported: false,
    useWorkerFetch: false
  });
  const pdfJsDoc = await loadingTask.promise;

  // Check catalog/streams for /JS or /JavaScript without executing any script
  const sampleStr = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 400000)));
  const hasJavaScript = /\/(?:JS|JavaScript)\s*[(<[/]/.test(sampleStr);

  // Extract outline bookmarks with resolved 1-based page numbers
  let outline = [];
  try {
    const rawOutline = await pdfJsDoc.getOutline();
    const resolveNode = async (node) => {
      let pageNumber = null;
      try {
        let dest = node.dest;
        if (typeof dest === 'string') {
          dest = await pdfJsDoc.getDestination(dest);
        }
        if (Array.isArray(dest) && dest[0]) {
          const idx = await pdfJsDoc.getPageIndex(dest[0]);
          pageNumber = idx + 1;
        }
      } catch {}
      const children = Array.isArray(node.items) && node.items.length > 0
        ? await Promise.all(node.items.map(resolveNode))
        : [];
      return {
        title: node.title || 'Untitled Bookmark',
        pageNumber,
        url: node.url || null,
        items: children
      };
    };
    if (Array.isArray(rawOutline)) {
      outline = await Promise.all(rawOutline.map(resolveNode));
    }
  } catch {}

  // Extract embedded attachments
  let attachments = [];
  try {
    const attMap = await pdfJsDoc.getAttachments();
    if (attMap && typeof attMap === 'object') {
      attachments = Object.entries(attMap).map(([name, info]) => ({
        id: `att_${name}_${info.content?.byteLength || 0}`,
        name,
        filename: info.filename || name,
        description: info.description || '',
        content: info.content instanceof Uint8Array ? info.content : new Uint8Array(info.content || []),
        size: info.content?.byteLength || 0
      }));
    }
  } catch {}

  // Extract Info + XMP metadata
  let metadata = { title: '', author: '', subject: '', keywords: '', creator: '', producer: '' };
  try {
    const meta = await pdfJsDoc.getMetadata();
    const info = meta?.info || {};
    metadata = {
      title: info.Title || '',
      author: info.Author || '',
      subject: info.Subject || '',
      keywords: info.Keywords || '',
      creator: info.Creator || '',
      producer: info.Producer || ''
    };
  } catch {}

  return {
    pdfJsDoc,
    numPages: pdfJsDoc.numPages,
    rawBytes: bytes,
    outline,
    attachments,
    metadata,
    hasJavaScript
  };
}

/**
 * Render a single PDF page onto a high-DPI HTML5 canvas element.
 */
export async function renderPdfPageToCanvas(pdfJsDoc, pageNumber, canvas, scale = 1.5, rotationOffset = 0, cropBox = null) {
  if (!pdfJsDoc || !canvas) return null;
  const page = await pdfJsDoc.getPage(pageNumber);
  const originalRotation = page.rotate || 0;
  const totalRotation = ((originalRotation + rotationOffset) % 360 + 360) % 360;

  const viewport = page.getViewport({ scale, rotation: totalRotation });
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  context.save();
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.scale(dpr, dpr);

  await page.render({ canvasContext: context, viewport }).promise;

  // Visual preview dim outside crop margins if user adjusted cropBox ({ top, right, bottom, left } normalized 0..0.45)
  if (cropBox && (cropBox.top > 0 || cropBox.right > 0 || cropBox.bottom > 0 || cropBox.left > 0)) {
    const w = viewport.width;
    const h = viewport.height;
    context.fillStyle = 'rgba(0, 0, 0, 0.48)';
    if (cropBox.top > 0) context.fillRect(0, 0, w, cropBox.top * h);
    if (cropBox.bottom > 0) context.fillRect(0, (1 - cropBox.bottom) * h, w, cropBox.bottom * h);
    if (cropBox.left > 0) {
      context.fillRect(0, cropBox.top * h, cropBox.left * w, (1 - cropBox.top - cropBox.bottom) * h);
    }
    if (cropBox.right > 0) {
      context.fillRect(
        (1 - cropBox.right) * w,
        cropBox.top * h,
        cropBox.right * w,
        (1 - cropBox.top - cropBox.bottom) * h
      );
    }
  }

  context.restore();
  return {
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    scale,
    totalRotation
  };
}

/**
 * Extract positioned text spans in viewport pixel coordinates for snapping markups and cover-and-replace editing.
 */
export async function getPageTextLayer(pdfJsDoc, pageNumber, scale = 1.5, rotationOffset = 0) {
  if (!pdfJsDoc) return { spans: [], viewportWidth: 0, viewportHeight: 0 };
  const pdfjsLib = await getPdfjs();
  const page = await pdfJsDoc.getPage(pageNumber);
  const totalRotation = (((page.rotate || 0) + rotationOffset) % 360 + 360) % 360;
  const viewport = page.getViewport({ scale, rotation: totalRotation });
  const textContent = await page.getTextContent();
  const styles = textContent.styles || {};

  const spans = [];
  for (let i = 0; i < textContent.items.length; i++) {
    const item = textContent.items[i];
    if (!item.str || !item.str.trim()) continue;
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.max(8, Math.hypot(tx[2], tx[3]) || item.height * scale || 12);
    const width = Math.max(4, (item.width || item.str.length * (fontHeight / scale) * 0.5) * scale);
    const height = fontHeight * 1.15;
    const x = tx[4];
    const y = tx[5] - fontHeight * 0.92;
    const styleInfo = styles[item.fontName] || {};

    spans.push({
      id: `span_${pageNumber}_${i}`,
      str: item.str,
      x,
      y,
      width,
      height,
      fontSize: fontHeight / scale,
      fontFamily: styleInfo.fontFamily || 'Inter',
      xNorm: x / viewport.width,
      yNorm: y / viewport.height,
      wNorm: width / viewport.width,
      hNorm: height / viewport.height
    });
  }

  return {
    spans,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height
  };
}

/**
 * Sample perimeter background color on the rendered page canvas around a text region for clean cover-and-replace.
 */
export function sampleCanvasBackgroundColor(canvas, cssX, cssY, cssW, cssH) {
  if (!canvas) return '#ffffff';
  try {
    const rectW = parseFloat(canvas.style.width) || canvas.width;
    const dpr = rectW > 0 ? canvas.width / rectW : 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return '#ffffff';

    const pxX = Math.max(0, Math.min(canvas.width - 1, Math.round(cssX * dpr)));
    const pxY = Math.max(0, Math.min(canvas.height - 1, Math.round(cssY * dpr)));
    const pxW = Math.max(2, Math.min(canvas.width - pxX, Math.round(cssW * dpr)));
    const pxH = Math.max(2, Math.min(canvas.height - pxY, Math.round(cssH * dpr)));

    const samples = [];
    const points = [
      [Math.max(0, pxX - 2), Math.max(0, pxY - 2)],
      [Math.min(canvas.width - 1, pxX + pxW + 2), Math.max(0, pxY - 2)],
      [Math.max(0, pxX - 2), Math.min(canvas.height - 1, pxY + pxH + 2)],
      [Math.min(canvas.width - 1, pxX + pxW + 2), Math.min(canvas.height - 1, pxY + pxH + 2)],
      [Math.min(canvas.width - 1, pxX + Math.floor(pxW / 2)), Math.max(0, pxY - 2)],
      [Math.min(canvas.width - 1, pxX + Math.floor(pxW / 2)), Math.min(canvas.height - 1, pxY + pxH + 2)]
    ];
    for (const [sx, sy] of points) {
      const data = ctx.getImageData(sx, sy, 1, 1).data;
      samples.push([data[0], data[1], data[2]]);
    }
    if (samples.length === 0) return '#ffffff';
    // Choose median luminance sample to avoid picking stray text pixels
    samples.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
    const picked = samples[Math.floor(samples.length * 0.75)] || samples[0];
    return `#${picked.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return '#ffffff';
  }
}

export async function extractPdfText(pdfJsDoc, maxPages = 30) {
  if (!pdfJsDoc) return '';
  const pagesToRead = Math.min(pdfJsDoc.numPages, maxPages);
  let fullText = '';
  for (let i = 1; i <= pagesToRead; i++) {
    try {
      const page = await pdfJsDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items.map((item) => item.str).join(' ');
      fullText += `--- Page ${i} ---\n${pageStrings}\n\n`;
    } catch {}
  }
  return fullText.trim();
}

export const REDACTION_PATTERN_PRESETS = {
  ssn: { label: 'Social Security Numbers', regex: '\\b\\d{3}[-\\s]?\\d{2}[-\\s]?\\d{4}\\b' },
  email: { label: 'Email Addresses', regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b' },
  phone: { label: 'Phone Numbers', regex: '(?:\\+?1[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b' },
  account: { label: 'Card / Account Numbers', regex: '\\b(?:\\d[ -]*?){12,19}\\b' }
};

/**
 * Full-text & pattern search across all PDF pages returning normalized bounding boxes.
 */
export async function searchPdfDocument(
  pdfJsDoc,
  query,
  { isRegex = false, caseSensitive = false, patternPreset = '' } = {}
) {
  if (!pdfJsDoc) return [];
  const rawPattern = patternPreset
    ? REDACTION_PATTERN_PRESETS[patternPreset]?.regex
    : String(query || '').trim();
  if (!rawPattern) return [];

  let matcher;
  try {
    const flags = caseSensitive ? 'g' : 'gi';
    if (isRegex || patternPreset) {
      matcher = new RegExp(rawPattern, flags);
    } else {
      const escaped = rawPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matcher = new RegExp(escaped, flags);
    }
  } catch {
    throw new Error('Invalid search regular expression.');
  }

  const results = [];
  for (let pageNum = 1; pageNum <= pdfJsDoc.numPages; pageNum++) {
    const { spans, viewportWidth, viewportHeight } = await getPageTextLayer(pdfJsDoc, pageNum, 1.5, 0);
    if (!spans.length) continue;

    // Build concatenated page string mapping char index -> span index
    let full = '';
    const charToSpan = [];
    for (let sIdx = 0; sIdx < spans.length; sIdx++) {
      const span = spans[sIdx];
      for (let c = 0; c < span.str.length; c++) {
        full += span.str[c];
        charToSpan.push(sIdx);
      }
      full += ' ';
      charToSpan.push(-1);
    }

    matcher.lastIndex = 0;
    let m;
    while ((m = matcher.exec(full)) !== null) {
      if (m[0].length === 0) {
        matcher.lastIndex++;
        continue;
      }
      const startIdx = m.index;
      const endIdx = Math.min(full.length - 1, startIdx + m[0].length - 1);
      const matchedSpans = new Set();
      for (let k = startIdx; k <= endIdx; k++) {
        if (charToSpan[k] >= 0) matchedSpans.add(charToSpan[k]);
      }
      if (matchedSpans.size === 0) continue;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const sIdx of matchedSpans) {
        const sp = spans[sIdx];
        minX = Math.min(minX, sp.x);
        minY = Math.min(minY, sp.y);
        maxX = Math.max(maxX, sp.x + sp.width);
        maxY = Math.max(maxY, sp.y + sp.height);
      }

      const snippetStart = Math.max(0, startIdx - 28);
      const snippetEnd = Math.min(full.length, endIdx + 32);
      results.push({
        id: `search_${pageNum}_${startIdx}`,
        pageNumber: pageNum,
        matchText: m[0],
        snippet: full.slice(snippetStart, snippetEnd).trim(),
        xNorm: Math.max(0, minX / viewportWidth),
        yNorm: Math.max(0, minY / viewportHeight),
        wNorm: Math.min(1, Math.max(0.015, (maxX - minX) / viewportWidth)),
        hNorm: Math.min(1, Math.max(0.014, (maxY - minY) / viewportHeight))
      });
      if (results.length >= 250) break;
    }
    if (results.length >= 250) break;
  }

  return results;
}

/**
 * Inspect existing AcroForm fields from pdf-lib + widget rects from pdf.js.
 */
export async function inspectAcroFormFields(rawBytes, pdfJsDoc, rotationOffsets = {}) {
  if (!rawBytes || !pdfJsDoc) return [];
  let fieldMetaMap = new Map();

  try {
    const pdfDoc = await PDFDocument.load(rawBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    for (const f of fields) {
      const name = f.getName();
      const ctorName = f.constructor?.name || '';
      const flags = f.acroField?.getFlags?.() || 0;
      const required = Boolean(flags & (1 << 1)); // Bit 2 in PDF spec (0-indexed bit 1)
      const readOnly = Boolean(flags & (1 << 0));

      let type = 'text';
      let value = '';
      let options = [];
      let maxLength = null;
      let multiline = false;

      if (ctorName.includes('CheckBox')) {
        type = 'checkbox';
        value = Boolean(f.isChecked?.());
      } else if (ctorName.includes('RadioGroup')) {
        type = 'radio';
        value = f.getSelected?.() || '';
        options = f.getOptions?.() || [];
      } else if (ctorName.includes('Dropdown')) {
        type = 'dropdown';
        const sel = f.getSelected?.();
        value = Array.isArray(sel) ? (sel[0] || '') : (sel || '');
        options = f.getOptions?.() || [];
      } else if (ctorName.includes('OptionList')) {
        type = 'listbox';
        const sel = f.getSelected?.();
        value = Array.isArray(sel) ? (sel[0] || '') : (sel || '');
        options = f.getOptions?.() || [];
      } else if (ctorName.includes('Signature')) {
        type = 'signature';
      } else if (ctorName.includes('Button')) {
        type = 'button';
      } else {
        multiline = Boolean(f.isMultiline?.());
        type = multiline ? 'paragraph' : 'text';
        value = f.getText?.() || '';
        maxLength = f.getMaxLength?.() || null;
      }

      fieldMetaMap.set(name, {
        name,
        type,
        value,
        defaultValue: value,
        options,
        required,
        readOnly,
        maxLength,
        multiline
      });
    }
  } catch (err) {
    console.warn('AcroForm inspect warning:', err);
  }

  const widgets = [];
  for (let p = 1; p <= pdfJsDoc.numPages; p++) {
    try {
      const page = await pdfJsDoc.getPage(p);
      const totalRot = (((page.rotate || 0) + (rotationOffsets[p] || 0)) % 360 + 360) % 360;
      const viewport = page.getViewport({ scale: 1.0, rotation: totalRot });
      const annots = await page.getAnnotations({ intent: 'display' });

      for (const a of annots) {
        if (a.subtype !== 'Widget' || !Array.isArray(a.rect) || a.rect.length < 4) continue;
        const rect = viewport.convertToViewportRectangle(a.rect);
        const minX = Math.min(rect[0], rect[2]);
        const maxX = Math.max(rect[0], rect[2]);
        const minY = Math.min(rect[1], rect[3]);
        const maxY = Math.max(rect[1], rect[3]);
        const name = a.fieldName || `field_p${p}_${widgets.length}`;
        const meta = fieldMetaMap.get(name) || {};

        let inferredType = meta.type || 'text';
        if (!meta.type) {
          if (a.fieldType === 'Btn' && a.checkBox) inferredType = 'checkbox';
          else if (a.fieldType === 'Btn' && a.radioButton) inferredType = 'radio';
          else if (a.fieldType === 'Btn') inferredType = 'button';
          else if (a.fieldType === 'Ch') inferredType = a.combo ? 'dropdown' : 'listbox';
          else if (a.fieldType === 'Sig') inferredType = 'signature';
          else if (a.multiLine) inferredType = 'paragraph';
        }

        let currentVal = meta.value;
        if (currentVal === undefined) {
          if (inferredType === 'checkbox') currentVal = Boolean(a.fieldValue && a.fieldValue !== 'Off');
          else currentVal = a.fieldValue || '';
        }

        const optionsList =
          meta.options && meta.options.length > 0
            ? meta.options
            : Array.isArray(a.options)
            ? a.options.map((o) => o.displayValue || o.exportValue || String(o))
            : [];

        widgets.push({
          id: `acro_${a.id || widgets.length}`,
          isExistingAcroForm: true,
          fieldName: name,
          exportValue: a.buttonValue || '',
          label: a.alternativeText || name,
          type: inferredType,
          page: p,
          xNorm: Math.max(0, minX / viewport.width),
          yNorm: Math.max(0, minY / viewport.height),
          wNorm: Math.max(0.02, (maxX - minX) / viewport.width),
          hNorm: Math.max(0.02, (maxY - minY) / viewport.height),
          value: currentVal,
          defaultValue: meta.defaultValue ?? currentVal,
          options: optionsList,
          required: Boolean(meta.required || a.required),
          readOnly: Boolean(meta.readOnly || a.readOnly),
          maxLength: meta.maxLength || a.maxLen || null,
          fontSize: 12,
          fontFamily: 'Inter',
          validationFormat: '',
          signerId: 'signer_1',
          tabOrder: widgets.length + 1
        });
      }
    } catch {}
  }

  return widgets;
}

/**
 * Helper to resolve and embed a pdf-lib Font with fontkit + custom/bundled WOFF caching.
 */
async function resolvePdfFont(pdfDoc, embeddedFontCache, fontId = 'Inter', { isBold = false, isItalic = false } = {}) {
  const key = `${fontId}|${isBold ? 'B' : 'R'}|${isItalic ? 'I' : 'N'}`;
  if (embeddedFontCache.has(key)) return embeddedFontCache.get(key);

  if (customUploadedFonts.has(fontId)) {
    try {
      const cf = customUploadedFonts.get(fontId);
      const font = await pdfDoc.embedFont(cf.bytes, { subset: true });
      embeddedFontCache.set(key, font);
      return font;
    } catch {}
  }

  const def = EDITOR_FONTS.find((f) => f.id === fontId) || EDITOR_FONTS[0];
  let woffUrl = def.woffUrl;
  if (fontId === 'Inter') {
    if (isBold && isItalic) woffUrl = def.boldItalicWoffUrl;
    else if (isBold) woffUrl = def.boldWoffUrl;
    else if (isItalic) woffUrl = def.italicWoffUrl;
  }

  if (woffUrl) {
    const bytes = await fetchLocalFontBytes(woffUrl);
    if (bytes) {
      try {
        const embedded = await pdfDoc.embedFont(bytes, { subset: true });
        embeddedFontCache.set(key, embedded);
        return embedded;
      } catch (err) {
        console.warn('Could not embed bundled WOFF font, falling back:', err);
      }
    }
  }

  let stdName = def.stdRegular || StandardFonts.Helvetica;
  if (isBold && isItalic && def.stdBoldItalic) stdName = def.stdBoldItalic;
  else if (isBold && def.stdBold) stdName = def.stdBold;
  else if (isItalic && def.stdItalic) stdName = def.stdItalic;

  const stdFont = await pdfDoc.embedFont(stdName);
  embeddedFontCache.set(key, stdFont);
  return stdFont;
}

function resolveCanvasFontCss(fontId = 'Inter', isBold = false, isItalic = false, sizePx = 14) {
  const def = EDITOR_FONTS.find((f) => f.id === fontId);
  const family = def ? def.css : `"${fontId}", "Inter", sans-serif`;
  return `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${sizePx}px ${family}`;
}

/**
 * Draw rich multi-line text onto a PDF page, falling back cleanly to a high-DPI canvas image
 * when text contains emoji or scripts outside the selected WOFF font's glyph table.
 */
async function drawRichTextOnPage({
  pdfDoc,
  page,
  embeddedFontCache,
  text = '',
  x,
  topY, // PDF bottom-up top edge of box
  maxWidth = 300,
  fontSize = 12,
  lineSpacing = 1.3,
  fontId = 'Inter',
  isBold = false,
  isItalic = false,
  isUnderline = false,
  isStrikethrough = false,
  align = 'left',
  colorHex = '#000000',
  bgColor = 'transparent',
  borderColor = 'transparent',
  opacity = 1
}) {
  const font = await resolvePdfFont(pdfDoc, embeddedFontCache, fontId, { isBold, isItalic });
  const textColor = hexToPdfRgb(colorHex || '#000000');
  const rawLines = String(text || '').split(/\r?\n/);

  // Word-wrap lines against font or rough measure
  const safeMeasure = (s) => {
    try {
      return font.widthOfTextAtSize(s, fontSize);
    } catch {
      return s.length * fontSize * 0.55;
    }
  };

  const wrappedLines = [];
  const limitW = Math.max(40, maxWidth);
  for (const para of rawLines) {
    if (!para) {
      wrappedLines.push('');
      continue;
    }
    const words = para.split(' ');
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (safeMeasure(test) > limitW && cur) {
        wrappedLines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) wrappedLines.push(cur);
  }
  if (wrappedLines.length === 0) wrappedLines.push('');

  // Test if font can encode all characters (e.g. catches emoji / CJK)
  let canEncodeAll = true;
  try {
    for (const line of wrappedLines) {
      font.encodeText(line);
    }
  } catch {
    canEncodeAll = false;
  }

  const lineStep = fontSize * (Number(lineSpacing) || 1.3);
  const longestLine = Math.max(fontSize * 1.5, ...wrappedLines.map(safeMeasure));
  const boxW = Math.max(longestLine + 10, maxWidth || 0);
  const boxH = Math.max(fontSize * 1.4, wrappedLines.length * lineStep + 6);

  if (bgColor && bgColor !== 'transparent') {
    page.drawRectangle({
      x,
      y: topY - boxH,
      width: boxW,
      height: boxH,
      color: hexToPdfRgb(bgColor),
      opacity
    });
  }
  if (borderColor && borderColor !== 'transparent') {
    page.drawRectangle({
      x,
      y: topY - boxH,
      width: boxW,
      height: boxH,
      borderColor: hexToPdfRgb(borderColor),
      borderWidth: 1,
      opacity
    });
  }

  if (canEncodeAll) {
    wrappedLines.forEach((line, idx) => {
      const lw = safeMeasure(line);
      let lineX = x + 4;
      if (align === 'center') lineX = x + Math.max(4, (boxW - lw) / 2);
      else if (align === 'right') lineX = x + Math.max(4, boxW - lw - 4);
      const baselineY = topY - fontSize - idx * lineStep - 2;

      if (line) {
        page.drawText(line, {
          x: lineX,
          y: baselineY,
          size: fontSize,
          font,
          color: textColor,
          opacity
        });
      }
      if (isUnderline && line) {
        page.drawLine({
          start: { x: lineX, y: baselineY - 1.5 },
          end: { x: lineX + lw, y: baselineY - 1.5 },
          thickness: Math.max(0.75, fontSize * 0.07),
          color: textColor,
          opacity
        });
      }
      if (isStrikethrough && line) {
        page.drawLine({
          start: { x: lineX, y: baselineY + fontSize * 0.34 },
          end: { x: lineX + lw, y: baselineY + fontSize * 0.34 },
          thickness: Math.max(0.75, fontSize * 0.07),
          color: textColor,
          opacity
        });
      }
    });
  } else {
    // High-DPI transparent raster fallback for emoji / mixed non-embedded Unicode scripts
    const scale = 3;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(20, Math.ceil(boxW * scale));
    canvas.height = Math.max(20, Math.ceil(boxH * scale));
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = colorHex || '#000000';
    ctx.font = resolveCanvasFontCss(fontId, isBold, isItalic, fontSize);
    ctx.textBaseline = 'top';
    wrappedLines.forEach((line, idx) => {
      const m = ctx.measureText(line);
      let lineX = 4;
      if (align === 'center') lineX = Math.max(4, (boxW - m.width) / 2);
      else if (align === 'right') lineX = Math.max(4, boxW - m.width - 4);
      const ly = 3 + idx * lineStep;
      ctx.fillText(line, lineX, ly);
      if (isUnderline) {
        ctx.fillRect(lineX, ly + fontSize * 1.04, m.width, Math.max(1, fontSize * 0.07));
      }
      if (isStrikethrough) {
        ctx.fillRect(lineX, ly + fontSize * 0.5, m.width, Math.max(1, fontSize * 0.07));
      }
    });
    const pngBytes = dataUrlToUint8Array(canvas.toDataURL('image/png'));
    const embedded = await pdfDoc.embedPng(pngBytes);
    page.drawImage(embedded, {
      x,
      y: topY - boxH,
      width: boxW,
      height: boxH,
      opacity
    });
  }
}

/**
 * Draw any image data URL (PNG, JPG, WebP, SVG) by converting non-PNG/JPG inputs locally via Canvas.
 */
async function embedAnyImageDataUrl(pdfDoc, embeddedImageCache, dataUrl) {
  if (embeddedImageCache.has(dataUrl)) return embeddedImageCache.get(dataUrl);

  let embeddedImg = null;
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    embeddedImg = await pdfDoc.embedJpg(dataUrlToUint8Array(dataUrl));
  } else if (dataUrl.startsWith('data:image/png')) {
    embeddedImg = await pdfDoc.embedPng(dataUrlToUint8Array(dataUrl));
  } else {
    // WebP, SVG, GIF -> decode & rasterize locally to crisp PNG
    const pngDataUrl = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = Math.max(1, img.naturalWidth || 400);
        c.height = Math.max(1, img.naturalHeight || 400);
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Unable to decode image for PDF embedding.'));
      img.src = dataUrl;
    });
    embeddedImg = await pdfDoc.embedPng(dataUrlToUint8Array(pngDataUrl));
  }

  embeddedImageCache.set(dataUrl, embeddedImg);
  return embeddedImg;
}

function attachMarkupAnnotation(pdfDoc, page, ann, { x, yBottom, width, height }) {
  const subtypeMap = {
    highlight: 'Highlight',
    underline: 'Underline',
    strikethrough: 'StrikeOut',
    squiggly: 'Squiggly'
  };
  const subtype = subtypeMap[ann.type];
  if (!subtype) return;

  const cRgb = hexToPdfRgb(ann.color || '#fef08a');
  const annotDict = pdfDoc.context.obj({
    Type: 'Annot',
    Subtype: subtype,
    Rect: [x, yBottom, x + width, yBottom + height],
    QuadPoints: [x, yBottom + height, x + width, yBottom + height, x, yBottom, x + width, yBottom],
    C: [cRgb.red, cRgb.green, cRgb.blue],
    CA: ann.opacity ?? (ann.type === 'highlight' ? 0.38 : 1),
    F: 4,
    M: PDFString.fromDate(new Date())
  });
  const ref = pdfDoc.context.register(annotDict);
  const existing = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
  if (existing) existing.push(ref);
  else page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([ref]));
}

function attachStickyNoteAnnotation(pdfDoc, page, ann, { x, yTop }) {
  const repliesText = (ann.replies || [])
    .map((r) => `\n- ${r.author || 'User'} (${r.timestampLabel || ''}): ${r.text}`)
    .join('');
  const contents = `${ann.text || ''}${repliesText}`.trim();
  const cRgb = hexToPdfRgb(ann.color || '#f59e0b');
  const dict = pdfDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Text',
    Rect: [x, yTop - 20, x + 20, yTop],
    Contents: PDFString.of(contents),
    T: PDFString.of(ann.author || 'Local User'),
    Name: 'Comment',
    C: [cRgb.red, cRgb.green, cRgb.blue],
    F: 4,
    M: PDFString.fromDate(new Date(ann.createdAtIso || Date.now()))
  });
  const ref = pdfDoc.context.register(dict);
  const existing = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
  if (existing) existing.push(ref);
  else page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([ref]));
}

function attachLinkAnnotation(pdfDoc, page, targetPages, ann, { x, yBottom, width, height }) {
  let actionDict;
  if (ann.linkKind === 'page' && ann.targetPage) {
    const destPage = targetPages[Math.max(0, Math.min(targetPages.length - 1, Number(ann.targetPage) - 1))];
    if (!destPage) return;
    actionDict = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, yBottom, x + width, yBottom + height],
      Border: [0, 0, 0],
      Dest: [destPage.ref, PDFName.of('Fit')]
    });
  } else if (ann.url) {
    actionDict = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, yBottom, x + width, yBottom + height],
      Border: [0, 0, 0],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(String(ann.url))
      }
    });
  } else {
    return;
  }
  const ref = pdfDoc.context.register(actionDict);
  const existing = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
  if (existing) existing.push(ref);
  else page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([ref]));
}

function formatDateByPattern(dateObj, pattern = 'MM/DD/YYYY') {
  const yyyy = String(dateObj.getFullYear());
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  if (pattern === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`;
  if (pattern === 'DD/MM/YYYY') return `${dd}/${mm}/${yyyy}`;
  if (pattern === 'MMM D, YYYY') {
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return `${mm}/${dd}/${yyyy}`;
}

function pageMatchesRange(pageNum, totalPages, rangeStr = '') {
  const clean = String(rangeStr || '').trim();
  if (!clean || clean.toLowerCase() === 'all') return true;
  const parts = clean.split(',').map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes('-')) {
      const [sStr, eStr] = part.split('-');
      const s = Math.max(1, parseInt(sStr, 10) || 1);
      const e = Math.min(totalPages, parseInt(eStr, 10) || totalPages);
      if (pageNum >= s && pageNum <= e) return true;
    } else if (parseInt(part, 10) === pageNum) {
      return true;
    }
  }
  return false;
}

function drawShapeOnPdfPage(page, ann, { x, yBottom, width, height, pageHeight, scaleX, scaleY }) {
  const hasStroke = ann.strokeColor && ann.strokeColor !== 'transparent';
  const hasFill = ann.fillColor && ann.fillColor !== 'transparent';
  const strokeColor = hasStroke ? hexToPdfRgb(ann.strokeColor) : undefined;
  const fillColor = hasFill ? hexToPdfRgb(ann.fillColor) : undefined;
  const borderWidth = Math.max(0.5, (ann.strokeWidth || 2) * scaleX);
  const opacity = ann.opacity ?? 1;
  const dashArray =
    ann.dashStyle === 'dashed' ? [6, 4] : ann.dashStyle === 'dotted' ? [2, 3] : undefined;

  const shapeKind = ann.shapeKind || 'rectangle';

  if (shapeKind === 'rectangle' || shapeKind === 'roundedRect') {
    page.drawRectangle({
      x,
      y: yBottom,
      width,
      height,
      ...(hasStroke ? { borderColor: strokeColor, borderWidth } : {}),
      ...(hasFill ? { color: fillColor } : {}),
      ...(dashArray ? { borderDashArray: dashArray } : {}),
      opacity
    });
  } else if (shapeKind === 'ellipse') {
    page.drawEllipse({
      x: x + width / 2,
      y: yBottom + height / 2,
      xScale: width / 2,
      yScale: height / 2,
      ...(hasStroke ? { borderColor: strokeColor, borderWidth } : {}),
      ...(hasFill ? { color: fillColor } : {}),
      opacity
    });
  } else if (shapeKind === 'line' || shapeKind === 'arrow') {
    const sx = (ann.x1 ?? ann.x) * scaleX;
    const sy = pageHeight - ((ann.y1 ?? ann.y) * scaleY);
    const ex = (ann.x2 ?? (ann.x + ann.width)) * scaleX;
    const ey = pageHeight - ((ann.y2 ?? (ann.y + ann.height)) * scaleY);
    page.drawLine({
      start: { x: sx, y: sy },
      end: { x: ex, y: ey },
      thickness: borderWidth,
      color: strokeColor || rgb(0, 0, 0),
      ...(dashArray ? { dashArray } : {}),
      lineCap: LineCapStyle.Round,
      opacity
    });
    if (shapeKind === 'arrow') {
      const angle = Math.atan2(ey - sy, ex - sx);
      const headLen = Math.max(10, borderWidth * 4.5);
      const p1x = ex - headLen * Math.cos(angle - Math.PI / 6);
      const p1y = ey - headLen * Math.sin(angle - Math.PI / 6);
      const p2x = ex - headLen * Math.cos(angle + Math.PI / 6);
      const p2y = ey - headLen * Math.sin(angle + Math.PI / 6);
      page.drawLine({ start: { x: ex, y: ey }, end: { x: p1x, y: p1y }, thickness: borderWidth, color: strokeColor || rgb(0, 0, 0), lineCap: LineCapStyle.Round, opacity });
      page.drawLine({ start: { x: ex, y: ey }, end: { x: p2x, y: p2y }, thickness: borderWidth, color: strokeColor || rgb(0, 0, 0), lineCap: LineCapStyle.Round, opacity });
    }
  } else if (shapeKind === 'polygon' && Array.isArray(ann.points) && ann.points.length >= 2) {
    for (let i = 0; i < ann.points.length - 1; i++) {
      page.drawLine({
        start: { x: ann.points[i].x * scaleX, y: pageHeight - ann.points[i].y * scaleY },
        end: { x: ann.points[i + 1].x * scaleX, y: pageHeight - ann.points[i + 1].y * scaleY },
        thickness: borderWidth,
        color: strokeColor || rgb(0, 0, 0),
        lineCap: LineCapStyle.Round,
        opacity
      });
    }
  } else if (shapeKind === 'cloud') {
    const svgPath = `M ${width * 0.25} ${height * 0.78} C ${width * 0.08} ${height * 0.78}, ${width * 0.04} ${height * 0.52}, ${width * 0.18} ${height * 0.44} C ${width * 0.16} ${height * 0.22}, ${width * 0.42} ${height * 0.12}, ${width * 0.55} ${height * 0.28} C ${width * 0.68} ${height * 0.14}, ${width * 0.92} ${height * 0.26}, ${width * 0.86} ${height * 0.48} C ${width * 0.96} ${height * 0.58}, ${width * 0.9} ${height * 0.78}, ${width * 0.75} ${height * 0.78} Z`;
    page.drawSvgPath(svgPath, {
      x,
      y: yBottom + height,
      borderColor: strokeColor || rgb(0, 0, 0),
      borderWidth,
      ...(hasFill ? { color: fillColor } : {}),
      opacity
    });
  } else if (shapeKind === 'checkmark') {
    page.drawLine({ start: { x: x + width * 0.18, y: yBottom + height * 0.48 }, end: { x: x + width * 0.42, y: yBottom + height * 0.22 }, thickness: borderWidth, color: strokeColor || rgb(0.08, 0.5, 0.24), lineCap: LineCapStyle.Round, opacity });
    page.drawLine({ start: { x: x + width * 0.42, y: yBottom + height * 0.22 }, end: { x: x + width * 0.84, y: yBottom + height * 0.78 }, thickness: borderWidth, color: strokeColor || rgb(0.08, 0.5, 0.24), lineCap: LineCapStyle.Round, opacity });
  } else if (shapeKind === 'cross') {
    page.drawLine({ start: { x: x + width * 0.2, y: yBottom + height * 0.8 }, end: { x: x + width * 0.8, y: yBottom + height * 0.2 }, thickness: borderWidth, color: strokeColor || rgb(0.86, 0.15, 0.15), lineCap: LineCapStyle.Round, opacity });
    page.drawLine({ start: { x: x + width * 0.8, y: yBottom + height * 0.8 }, end: { x: x + width * 0.2, y: yBottom + height * 0.2 }, thickness: borderWidth, color: strokeColor || rgb(0.86, 0.15, 0.15), lineCap: LineCapStyle.Round, opacity });
  } else if (shapeKind === 'dot') {
    const r = Math.max(3, Math.min(width, height) / 2);
    page.drawCircle({
      x: x + width / 2,
      y: yBottom + height / 2,
      size: r,
      color: fillColor || strokeColor || rgb(0.11, 0.29, 0.57),
      opacity
    });
  }
}

/**
 * Full Document Assembly & Burn-In Export.
 */
export async function burnAndExportPdf({
  docName = 'Document',
  originalBytes,
  pageOrder = null, // array of pageDescriptors: { uid, sourceType: 'original'|'blank'|'external', sourcePageNumber, externalBytes, externalPageNumber, rotationOffset, cropBox }
  deletedPages = [],
  pageRotations = {},
  annotations = {},
  acroFormValues = {},
  customFields = [],
  flattenForm = false,
  pageSetup = {},
  metadata = null,
  stripMetadata = false,
  addedAttachments = [],
  finishAndLock = false,
  appendSignatureRecordPage = false,
  signers = []
}) {
  const sourceDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
  sourceDoc.registerFontkit(fontkit);

  // If no custom pageOrder was built, derive one from original pages minus deletedPages
  const srcCount = sourceDoc.getPageCount();
  const effectivePlan = Array.isArray(pageOrder) && pageOrder.length > 0
    ? pageOrder
    : Array.from({ length: srcCount }, (_, idx) => idx + 1)
        .filter((p) => !deletedPages.includes(p))
        .map((p) => ({
          uid: `orig_${p}`,
          sourceType: 'original',
          sourcePageNumber: p,
          rotationOffset: pageRotations[p] || 0,
          cropBox: null
        }));

  // Copy pages & apply existing AcroForm values if keeping forms intact cleanly when page structure wasn't altered,
  // or build clean assembled document
  let outDoc;
  const isUnreorderedSingleOrigin =
    effectivePlan.length === srcCount &&
    effectivePlan.every((p, idx) => p.sourceType === 'original' && p.sourcePageNumber === idx + 1);

  if (isUnreorderedSingleOrigin) {
    outDoc = sourceDoc;
  } else {
    outDoc = await PDFDocument.create();
    outDoc.registerFontkit(fontkit);
    const extDocCache = new Map();
    for (const item of effectivePlan) {
      if (item.sourceType === 'blank') {
        outDoc.addPage([item.width || 612, item.height || 792]);
      } else if (item.sourceType === 'external' && item.externalBytes) {
        let extDoc = extDocCache.get(item.externalBytes);
        if (!extDoc) {
          extDoc = await PDFDocument.load(item.externalBytes, { ignoreEncryption: true });
          extDocCache.set(item.externalBytes, extDoc);
        }
        const [copied] = await outDoc.copyPages(extDoc, [Math.max(0, (item.externalPageNumber || 1) - 1)]);
        outDoc.addPage(copied);
      } else {
        const [copied] = await outDoc.copyPages(sourceDoc, [Math.max(0, (item.sourcePageNumber || 1) - 1)]);
        outDoc.addPage(copied);
      }
    }
  }

  const embeddedFontCache = new Map();
  const embeddedImageCache = new Map();
  const outPages = outDoc.getPages();

  // Apply rotations & crop margins
  effectivePlan.forEach((planItem, outIdx) => {
    const page = outPages[outIdx];
    if (!page) return;
    const rot = planItem.rotationOffset ?? (planItem.sourcePageNumber ? pageRotations[planItem.sourcePageNumber] || 0 : 0);
    if (rot) {
      const currentRot = page.getRotation().angle;
      page.setRotation(degrees((currentRot + rot) % 360));
    }
    if (planItem.cropBox) {
      const { top = 0, right = 0, bottom = 0, left = 0 } = planItem.cropBox;
      if (top > 0 || right > 0 || bottom > 0 || left > 0) {
        const { width, height } = page.getSize();
        page.setCropBox(
          left * width,
          bottom * height,
          Math.max(36, (1 - left - right) * width),
          Math.max(36, (1 - top - bottom) * height)
        );
      }
    }
  });

  // Update existing AcroForm field values
  try {
    const form = outDoc.getForm();
    for (const field of form.getFields()) {
      const fname = field.getName();
      if (!(fname in acroFormValues)) continue;
      const val = acroFormValues[fname];
      const ctor = field.constructor?.name || '';
      if (ctor.includes('CheckBox')) {
        if (val) field.check();
        else field.uncheck();
      } else if (ctor.includes('RadioGroup')) {
        if (val) field.select(String(val));
      } else if (ctor.includes('Dropdown') || ctor.includes('OptionList')) {
        if (val) field.select(String(val));
      } else if (field.setText) {
        field.setText(val == null ? '' : String(val));
      }
    }
    if (flattenForm || finishAndLock) {
      form.flatten();
    }
  } catch {}

  // Render annotations keyed by page uid (if assembled via pageOrder) or fallback page number
  for (let outIdx = 0; outIdx < outPages.length; outIdx++) {
    const page = outPages[outIdx];
    const planItem = effectivePlan[outIdx];
    const pageAnnotations =
      (planItem?.uid && annotations[planItem.uid]) ||
      annotations[planItem?.sourcePageNumber || outIdx + 1] ||
      [];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    for (const ann of pageAnnotations) {
      const cWidth = ann.canvasWidth || pageWidth;
      const cHeight = ann.canvasHeight || pageHeight;
      const scaleX = pageWidth / cWidth;
      const scaleY = pageHeight / cHeight;
      const x = (ann.xNorm != null ? ann.xNorm * pageWidth : (ann.x || 0) * scaleX);
      const width = (ann.wNorm != null ? ann.wNorm * pageWidth : (ann.width || 0) * scaleX);
      const height = (ann.hNorm != null ? ann.hNorm * pageHeight : (ann.height || 0) * scaleY);
      const yTop = pageHeight - (ann.yNorm != null ? ann.yNorm * pageHeight : (ann.y || 0) * scaleY);
      const yBottom = yTop - height;

      if (ann.type === 'draw' && ann.points && ann.points.length > 1) {
        const strokeColor = hexToPdfRgb(ann.color || '#1B4B91');
        const strokeThickness = (ann.thickness || 2.5) * scaleX;
        const strokeOpacity = ann.isMarker ? 0.35 : (ann.opacity ?? 1);
        for (let i = 0; i < ann.points.length - 1; i++) {
          page.drawLine({
            start: { x: ann.points[i].x * scaleX, y: pageHeight - ann.points[i].y * scaleY },
            end: { x: ann.points[i + 1].x * scaleX, y: pageHeight - ann.points[i + 1].y * scaleY },
            thickness: strokeThickness,
            color: strokeColor,
            lineCap: LineCapStyle.Round,
            opacity: strokeOpacity
          });
        }
      } else if (['highlight', 'underline', 'strikethrough', 'squiggly'].includes(ann.type)) {
        attachMarkupAnnotation(outDoc, page, ann, { x, yBottom, width, height });
        const markupColor = hexToPdfRgb(ann.color || '#fef08a');
        if (ann.type === 'highlight') {
          page.drawRectangle({ x, y: yBottom, width, height, color: markupColor, opacity: ann.opacity ?? 0.38 });
        } else if (ann.type === 'underline') {
          page.drawLine({ start: { x, y: yBottom + 1.5 }, end: { x: x + width, y: yBottom + 1.5 }, thickness: 1.5, color: markupColor, opacity: ann.opacity ?? 1 });
        } else if (ann.type === 'strikethrough') {
          page.drawLine({ start: { x, y: yBottom + height / 2 }, end: { x: x + width, y: yBottom + height / 2 }, thickness: 1.5, color: markupColor, opacity: ann.opacity ?? 1 });
        } else if (ann.type === 'squiggly') {
          const step = 4;
          for (let wx = x; wx < x + width - step; wx += step) {
            const odd = Math.floor((wx - x) / step) % 2 === 0;
            page.drawLine({
              start: { x: wx, y: yBottom + (odd ? 1 : 3.5) },
              end: { x: Math.min(x + width, wx + step), y: yBottom + (odd ? 3.5 : 1) },
              thickness: 1.2,
              color: markupColor,
              opacity: ann.opacity ?? 1
            });
          }
        }
      } else if (ann.type === 'whiteout' || ann.type === 'redact') {
        const boxColor = hexToPdfRgb(ann.type === 'redact' ? '#000000' : (ann.color || '#ffffff'));
        page.drawRectangle({ x, y: yBottom, width, height, color: boxColor, opacity: 1 });
      } else if (ann.type === 'text' || ann.type === 'coverText') {
        if (ann.type === 'coverText') {
          page.drawRectangle({
            x: Math.max(0, x - 2),
            y: yBottom - 2,
            width: Math.max(width + 4, 24),
            height: Math.max(height + 4, (ann.fontSize || 12) * 1.4),
            color: hexToPdfRgb(ann.coverColor || '#ffffff'),
            opacity: 1
          });
        }
        await drawRichTextOnPage({
          pdfDoc: outDoc,
          page,
          embeddedFontCache,
          text: ann.text || '',
          x,
          topY: yTop,
          maxWidth: width > 10 ? width : 260,
          fontSize: (ann.fontSize || 14) * scaleX,
          lineSpacing: ann.lineSpacing || 1.3,
          fontId: ann.fontFamily || 'Inter',
          isBold: Boolean(ann.isBold),
          isItalic: Boolean(ann.isItalic),
          isUnderline: Boolean(ann.isUnderline),
          isStrikethrough: Boolean(ann.isStrikethrough),
          align: ann.align || 'left',
          colorHex: ann.color || '#000000',
          bgColor: ann.bgColor || 'transparent',
          borderColor: ann.borderColor || 'transparent',
          opacity: ann.opacity ?? 1
        });
      } else if (ann.type === 'shape') {
        drawShapeOnPdfPage(page, ann, { x, yBottom, width, height, pageHeight, scaleX, scaleY });
      } else if (ann.type === 'signature' || ann.type === 'image') {
        if (ann.dataUrl) {
          try {
            const embeddedImg = await embedAnyImageDataUrl(outDoc, embeddedImageCache, ann.dataUrl);
            page.drawImage(embeddedImg, {
              x,
              y: yBottom,
              width,
              height,
              ...(ann.rotation ? { rotate: degrees(-ann.rotation) } : {}),
              opacity: ann.opacity ?? 1
            });
            if (ann.captionText) {
              await drawRichTextOnPage({
                pdfDoc: outDoc,
                page,
                embeddedFontCache,
                text: ann.captionText,
                x,
                topY: yBottom - 4,
                maxWidth: width,
                fontSize: 9.5,
                colorHex: '#1f2937'
              });
            }
          } catch (err) {
            console.warn('Image embed error:', err);
          }
        }
      } else if (ann.type === 'comment') {
        attachStickyNoteAnnotation(outDoc, page, ann, { x, yTop });
      } else if (ann.type === 'callout') {
        await drawRichTextOnPage({
          pdfDoc: outDoc,
          page,
          embeddedFontCache,
          text: ann.text || 'Callout note',
          x,
          topY: yTop,
          maxWidth: Math.max(80, width),
          fontSize: (ann.fontSize || 12) * scaleX,
          colorHex: ann.color || '#111827',
          bgColor: ann.bgColor || '#fef3c7',
          borderColor: ann.borderColor || '#d97706',
          opacity: ann.opacity ?? 1
        });
        if (ann.anchorX != null && ann.anchorY != null) {
          page.drawLine({
            start: { x, y: yBottom + height / 2 },
            end: { x: ann.anchorX * scaleX, y: pageHeight - ann.anchorY * scaleY },
            thickness: 1.5,
            color: hexToPdfRgb(ann.borderColor || '#d97706')
          });
        }
      } else if (ann.type === 'link') {
        attachLinkAnnotation(outDoc, page, outPages, ann, { x, yBottom, width, height });
      }
    }
  }

  // Export user-added Fill & Sign fields (as real AcroForm fields or flattened)
  const formForCustom = outDoc.getForm();
  for (let outIdx = 0; outIdx < outPages.length; outIdx++) {
    const page = outPages[outIdx];
    const planItem = effectivePlan[outIdx];
    const targetPageNum = planItem?.sourcePageNumber || outIdx + 1;
    const pageFields = (customFields || []).filter((f) => f.page === targetPageNum);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    for (const f of pageFields) {
      const fx = (f.xNorm ?? 0.1) * pageWidth;
      const fw = (f.wNorm ?? 0.2) * pageWidth;
      const fh = (f.hNorm ?? 0.04) * pageHeight;
      const fyBottom = pageHeight - ((f.yNorm ?? 0.1) * pageHeight + fh);
      const uniqueName = `${(f.name || f.label || f.type).replace(/[^\w-]/g, '_')}_${f.id}`;
      const valStr = f.value == null ? '' : String(f.value);

      if ((f.type === 'signature' || f.type === 'initials' || f.type === 'image') && f.value) {
        try {
          const embeddedImg = await embedAnyImageDataUrl(outDoc, embeddedImageCache, f.value);
          page.drawImage(embeddedImg, { x: fx, y: fyBottom, width: fw, height: fh });
          if (f.captionText) {
            await drawRichTextOnPage({
              pdfDoc: outDoc,
              page,
              embeddedFontCache,
              text: f.captionText,
              x: fx,
              topY: fyBottom - 3,
              maxWidth: fw,
              fontSize: 9,
              colorHex: '#1f2937'
            });
          }
        } catch {}
        continue;
      }

      if (flattenForm || finishAndLock || ['date', 'attachment', 'image', 'signature', 'initials'].includes(f.type)) {
        if (f.type === 'checkbox') {
          page.drawRectangle({ x: fx, y: fyBottom, width: fw, height: fh, borderColor: rgb(0.2, 0.2, 0.2), borderWidth: 1, color: rgb(1, 1, 1) });
          if (f.value) {
            drawShapeOnPdfPage(page, { shapeKind: 'checkmark', strokeColor: '#1B4B91', strokeWidth: 2 }, { x: fx, yBottom: fyBottom, width: fw, height: fh, pageHeight, scaleX: 1, scaleY: 1 });
          }
        } else if (valStr) {
          const displayText = f.type === 'date' && !valStr ? formatDateByPattern(new Date(), f.dateFormat) : valStr;
          await drawRichTextOnPage({
            pdfDoc: outDoc,
            page,
            embeddedFontCache,
            text: displayText,
            x: fx,
            topY: fyBottom + fh,
            maxWidth: fw,
            fontSize: f.fontSize || 11,
            fontId: f.fontFamily || 'Inter',
            colorHex: '#000000'
          });
        }
      } else {
        // Interactive AcroForm export for supported field types
        try {
          if (f.type === 'checkbox') {
            const cb = formForCustom.createCheckBox(uniqueName);
            cb.addToPage(page, { x: fx, y: fyBottom, width: fw, height: fh });
            if (f.value) cb.check();
            if (f.readOnly) cb.enableReadOnly();
          } else if (f.type === 'dropdown') {
            const dd = formForCustom.createDropdown(uniqueName);
            const opts = Array.isArray(f.options) && f.options.length > 0 ? f.options : ['Option 1'];
            dd.addOptions(opts);
            dd.addToPage(page, { x: fx, y: fyBottom, width: fw, height: fh });
            if (valStr && opts.includes(valStr)) dd.select(valStr);
            if (f.readOnly) dd.enableReadOnly();
          } else if (f.type === 'radio') {
            const rg = formForCustom.createRadioGroup(uniqueName);
            const opts = Array.isArray(f.options) && f.options.length > 0 ? f.options : ['Choice 1', 'Choice 2'];
            opts.forEach((opt, idx) => {
              rg.addOptionToPage(opt, page, { x: fx, y: fyBottom - idx * (fh + 4), width: fh, height: fh });
            });
            if (valStr && opts.includes(valStr)) rg.select(valStr);
            if (f.readOnly) rg.enableReadOnly();
          } else {
            const tf = formForCustom.createTextField(uniqueName);
            if (f.type === 'paragraph') tf.enableMultiline();
            if (f.maxLength) tf.setMaxLength(Number(f.maxLength));
            tf.setText(valStr || f.defaultValue || '');
            tf.addToPage(page, { x: fx, y: fyBottom, width: fw, height: fh });
            if (f.readOnly) tf.enableReadOnly();
          }
        } catch (err) {
          console.warn('AcroForm export fallback:', err);
        }
      }
    }
  }

  // Page Setup Overlays (Page numbers, Headers/Footers, Bates numbering, Watermark)
  const totalOutPages = outPages.length;
  const nowStr = new Date().toLocaleDateString();

  if (pageSetup.headerFooter?.enabled) {
    const hf = pageSetup.headerFooter;
    for (let i = 0; i < totalOutPages; i++) {
      const pNum = i + 1;
      if (!pageMatchesRange(pNum, totalOutPages, hf.pageRange)) continue;
      const p = outPages[i];
      const { width, height } = p.getSize();
      const replaceTokens = (txt) =>
        String(txt || '')
          .replace(/\{page\}/gi, String(pNum))
          .replace(/\{total\}/gi, String(totalOutPages))
          .replace(/\{date\}/gi, nowStr)
          .replace(/\{file\}/gi, docName);

      const slots = [
        [hf.headerLeft, 28, height - 22, 'left'],
        [hf.headerCenter, width * 0.25, height - 22, 'center'],
        [hf.headerRight, width * 0.65, height - 22, 'right'],
        [hf.footerLeft, 28, 30, 'left'],
        [hf.footerCenter, width * 0.25, 30, 'center'],
        [hf.footerRight, width * 0.65, 30, 'right']
      ];
      for (const [raw, sx, sy, al] of slots) {
        const rendered = replaceTokens(raw).trim();
        if (!rendered) continue;
        await drawRichTextOnPage({
          pdfDoc: outDoc,
          page: p,
          embeddedFontCache,
          text: rendered,
          x: sx,
          topY: sy,
          maxWidth: width * 0.3,
          fontSize: hf.fontSize || 10,
          align: al,
          colorHex: hf.color || '#334155',
          opacity: hf.opacity ?? 0.9
        });
      }
    }
  }

  if (pageSetup.bates?.enabled) {
    const bt = pageSetup.bates;
    let seq = Number(bt.startNumber || 1);
    const digits = Math.max(2, Math.min(10, Number(bt.digits || 6)));
    for (let i = 0; i < totalOutPages; i++) {
      const pNum = i + 1;
      if (!pageMatchesRange(pNum, totalOutPages, bt.pageRange)) continue;
      const p = outPages[i];
      const { width, height } = p.getSize();
      const batesStr = `${bt.prefix || ''}${String(seq).padStart(digits, '0')}${bt.suffix || ''}`;
      seq++;
      const isTop = (bt.position || 'bottom-right').startsWith('top');
      const isRight = (bt.position || 'bottom-right').endsWith('right');
      await drawRichTextOnPage({
        pdfDoc: outDoc,
        page: p,
        embeddedFontCache,
        text: batesStr,
        x: isRight ? width - 200 : 28,
        topY: isTop ? height - 20 : 28,
        maxWidth: 172,
        fontSize: bt.fontSize || 10,
        align: isRight ? 'right' : 'left',
        colorHex: bt.color || '#1f2937'
      });
    }
  }

  if (pageSetup.watermark?.enabled && (pageSetup.watermark.text || pageSetup.watermark.imageDataUrl)) {
    const wm = pageSetup.watermark;
    for (let i = 0; i < totalOutPages; i++) {
      const pNum = i + 1;
      if (!pageMatchesRange(pNum, totalOutPages, wm.pageRange)) continue;
      const p = outPages[i];
      const { width, height } = p.getSize();
      const wmOpacity = Math.max(0.05, Math.min(1, Number(wm.opacity ?? 0.22)));
      if (wm.imageDataUrl) {
        const img = await embedAnyImageDataUrl(outDoc, embeddedImageCache, wm.imageDataUrl);
        const w = Math.min(width * 0.5, img.width || 240);
        const h = (w / (img.width || 240)) * (img.height || 120);
        p.drawImage(img, {
          x: (width - w) / 2,
          y: (height - h) / 2,
          width: w,
          height: h,
          opacity: wmOpacity
        });
      } else if (wm.text) {
        const wmFont = await resolvePdfFont(outDoc, embeddedFontCache, wm.fontFamily || 'Inter', { isBold: true });
        const fSize = Number(wm.fontSize || 42);
        const tw = wmFont.widthOfTextAtSize(wm.text, fSize);
        p.drawText(wm.text, {
          x: Math.max(20, (width - tw * 0.7) / 2),
          y: height * 0.42,
          size: fSize,
          font: wmFont,
          color: hexToPdfRgb(wm.color || '#64748b'),
          rotate: degrees(Number(wm.rotation ?? 35)),
          opacity: wmOpacity
        });
      }
    }
  }

  // Attachments added during editing session
  for (const att of addedAttachments || []) {
    if (att.bytes && att.name) {
      try {
        await outDoc.attach(att.bytes, att.name, {
          mimeType: att.mimeType || 'application/octet-stream',
          description: att.description || 'Attached in Klarity PDF Editor'
        });
      } catch {}
    }
  }

  // Metadata update or stripping
  if (stripMetadata) {
    outDoc.setTitle('');
    outDoc.setAuthor('');
    outDoc.setSubject('');
    outDoc.setKeywords([]);
    outDoc.setCreator('');
    outDoc.setProducer('');
    try {
      const metaRef = outDoc.catalog.get(PDFName.of('Metadata'));
      if (metaRef) outDoc.catalog.delete(PDFName.of('Metadata'));
    } catch {}
  } else if (metadata) {
    if (metadata.title !== undefined) outDoc.setTitle(String(metadata.title));
    if (metadata.author !== undefined) outDoc.setAuthor(String(metadata.author));
    if (metadata.subject !== undefined) outDoc.setSubject(String(metadata.subject));
    if (metadata.keywords !== undefined) {
      outDoc.setKeywords(String(metadata.keywords).split(',').map((s) => s.trim()).filter(Boolean));
    }
  }

  // Save pre-record content bytes (needed when Finish and Lock appends a Signature Record page)
  let preRecordSha256 = null;
  let receipt = null;
  if (finishAndLock) {
    const preBytes = await outDoc.save();
    preRecordSha256 = await computeSha256Hex(preBytes);

    if (appendSignatureRecordPage) {
      const recPage = outDoc.addPage([612, 792]);
      await drawRichTextOnPage({
        pdfDoc: outDoc,
        page: recPage,
        embeddedFontCache,
        text: `SIGNATURE & COMPLETION RECORD\nDocument: ${docName}`,
        x: 48,
        topY: 744,
        maxWidth: 516,
        fontSize: 16,
        isBold: true,
        colorHex: '#1B4B91'
      });

      const lines = [
        `Pre-Record Document SHA-256 Hash:`,
        preRecordSha256,
        `Generated: ${new Date().toLocaleString()} (device clock time)`,
        '',
        'Participants:'
      ];
      for (const s of signers || []) {
        lines.push(`• ${s.name}`);
      }
      lines.push('', 'Completed Fields (timestamps reflect device clock time):');
      for (const f of customFields || []) {
        if (!f.value && f.type !== 'checkbox') continue;
        const signerObj = (signers || []).find((s) => s.id === f.signerId);
        lines.push(
          `• Page ${f.page} | ${f.label || f.type} | Signer: ${signerObj?.name || 'Primary Signer'} | Completed: ${
            f.completedAtLabel || `${new Date().toLocaleString()} (device clock time)`
          }`
        );
      }
      lines.push(
        '',
        'Note: Electronic signatures are generally accepted for many documents, but rules differ by country and document type. For legal or regulated documents, check what is required.'
      );

      await drawRichTextOnPage({
        pdfDoc: outDoc,
        page: recPage,
        embeddedFontCache,
        text: lines.join('\n'),
        x: 48,
        topY: 676,
        maxWidth: 516,
        fontSize: 10.5,
        lineSpacing: 1.45,
        colorHex: '#1e293b'
      });
    }
  }

  const modifiedBytes = await outDoc.save();
  const finalSha256 = await computeSha256Hex(modifiedBytes);

  if (finishAndLock) {
    const completedFields = (customFields || [])
      .filter((f) => Boolean(f.value))
      .map((f) => {
        const signerObj = (signers || []).find((s) => s.id === f.signerId);
        return {
          id: f.id,
          label: f.label || f.type,
          type: f.type,
          page: f.page,
          signerName: signerObj?.name || 'Primary Signer',
          completedAtIso: f.completedAtIso,
          completedAtLabel: f.completedAtLabel
        };
      });
    receipt = buildSignatureReceipt({
      docName,
      preRecordSha256,
      finalSha256,
      signers,
      completedFields
    });
  }

  return {
    bytes: modifiedBytes,
    dataUrl: uint8ArrayToDataUrl(modifiedBytes),
    pageCount: outDoc.getPageCount(),
    preRecordSha256,
    finalSha256,
    receipt
  };
}

/**
 * TRUE SECURE REDACTION:
 * Rasterizes every affected page at 216 DPI (3x = 216 DPI > 200 DPI) with redaction rectangles permanently
 * painted in pixels, rebuilds those pages as flat image-only pages (destroying all underlying text, vectors,
 * images, annotations, and form widgets in the page), strips metadata if requested, then verifies by
 * re-extracting text via PDF.js inside the redacted regions — failing loudly if any text remains.
 */
export async function applySecureRedactions({
  originalBytes,
  annotations = {},
  pageRotations = {},
  deletedPages = [],
  removeMetadata = true
}) {
  const pdfjsLib = await getPdfjs();
  const srcViewDoc = await pdfjsLib.getDocument({
    data: originalBytes.slice(0),
    isEvalSupported: false,
    useWorkerFetch: false
  }).promise;

  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();
  const REDACT_DPI_SCALE = 3.0; // 72 * 3.0 = 216 DPI (>= 200 DPI requirement)
  const redactedPagesSummary = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (deletedPages.includes(pageNum)) continue;
    const pageAnns = (annotations[pageNum] || []).filter((a) => a.type === 'redact');
    if (pageAnns.length === 0) continue;

    // 1. Render page cleanly at 216 DPI onto an offscreen canvas
    const viewPage = await srcViewDoc.getPage(pageNum);
    const rot = (((viewPage.rotate || 0) + (pageRotations[pageNum] || 0)) % 360 + 360) % 360;
    const viewport = viewPage.getViewport({ scale: REDACT_DPI_SCALE, rotation: rot });

    const offCanvas = document.createElement('canvas');
    offCanvas.width = Math.floor(viewport.width);
    offCanvas.height = Math.floor(viewport.height);
    const ctx = offCanvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);

    await viewPage.render({ canvasContext: ctx, viewport }).promise;

    // 2. Paint opaque redaction rectangles directly onto raster pixels
    const normalizedBoxes = [];
    for (const red of pageAnns) {
      const rx = (red.xNorm != null ? red.xNorm : (red.x || 0) / (red.canvasWidth || viewport.width)) * offCanvas.width;
      const ry = (red.yNorm != null ? red.yNorm : (red.y || 0) / (red.canvasHeight || viewport.height)) * offCanvas.height;
      const rw = (red.wNorm != null ? red.wNorm : (red.width || 0) / (red.canvasWidth || viewport.width)) * offCanvas.width;
      const rh = (red.hNorm != null ? red.hNorm : (red.height || 0) / (red.canvasHeight || viewport.height)) * offCanvas.height;

      ctx.fillStyle = '#000000';
      ctx.fillRect(Math.floor(rx), Math.floor(ry), Math.ceil(rw), Math.ceil(rh));
      if (red.redactionCode) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(18, Math.min(34, Math.floor(rh * 0.45)))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(red.redactionCode, rx + rw / 2, ry + rh / 2, Math.max(20, rw - 8));
      }

      normalizedBoxes.push({
        xNorm: rx / offCanvas.width,
        yNorm: ry / offCanvas.height,
        wNorm: rw / offCanvas.width,
        hNorm: rh / offCanvas.height
      });
    }

    // 3. Replace original page in pdf-lib with flattened raster page (destroys ALL text/vectors/annots on page)
    const oldPage = pdfDoc.getPage(pageNum - 1);
    const { width: ptWidth, height: ptHeight } = oldPage.getSize();
    const targetW = rot % 180 === 90 ? ptHeight : ptWidth;
    const targetH = rot % 180 === 90 ? ptWidth : ptHeight;

    const pngBytes = dataUrlToUint8Array(offCanvas.toDataURL('image/png'));
    const embeddedPng = await pdfDoc.embedPng(pngBytes);

    pdfDoc.removePage(pageNum - 1);
    const rebuiltPage = pdfDoc.insertPage(pageNum - 1, [targetW, targetH]);
    rebuiltPage.drawImage(embeddedPng, {
      x: 0,
      y: 0,
      width: targetW,
      height: targetH
    });

    redactedPagesSummary.push({
      pageNumber: pageNum,
      boxesCount: pageAnns.length,
      boxes: normalizedBoxes
    });
  }

  // Strip document metadata if user checked "Remove metadata"
  if (removeMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setCreator('');
    pdfDoc.setProducer('');
    try {
      const metaRef = pdfDoc.catalog.get(PDFName.of('Metadata'));
      if (metaRef) pdfDoc.catalog.delete(PDFName.of('Metadata'));
    } catch {}
  }

  const savedBytes = await pdfDoc.save();

  // 4. STRICT VERIFICATION: reload in PDF.js and verify zero recoverable text remains in redacted pages/regions
  const verifyDoc = await pdfjsLib.getDocument({
    data: savedBytes.slice(0),
    isEvalSupported: false,
    useWorkerFetch: false
  }).promise;

  for (const item of redactedPagesSummary) {
    const checkPage = await verifyDoc.getPage(item.pageNumber);
    const content = await checkPage.getTextContent();
    const remainingText = content.items.map((it) => it.str || '').join('').trim();
    if (remainingText.length > 0) {
      throw new Error(
        `Redaction verification failed on page ${item.pageNumber}: ${remainingText.length} characters of underlying text still detected.`
      );
    }
  }

  return {
    bytes: savedBytes,
    dataUrl: uint8ArrayToDataUrl(savedBytes),
    redactedPagesSummary,
    verifiedZeroRemainingText: true
  };
}

/**
 * 100% Local Offline OCR via bundled tesseract.js worker & eng.traineddata.gz
 */
export async function runLocalOcrOnPage(canvas) {
  if (!canvas) throw new Error('Rendered page canvas is required for OCR.');
  const { createWorker } = await import('tesseract.js');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const worker = await createWorker('eng', 1, {
    workerPath: `${origin}/pdf-assets/tesseract/worker.min.js`,
    corePath: `${origin}/pdf-assets/tesseract`,
    langPath: `${origin}/pdf-assets/tesseract`,
    gzip: true,
    workerBlobURL: false
  });

  try {
    const { data } = await worker.recognize(canvas);
    const words = (data.words || []).map((w) => ({
      text: w.text,
      confidence: w.confidence,
      xNorm: w.bbox.x0 / canvas.width,
      yNorm: w.bbox.y0 / canvas.height,
      wNorm: (w.bbox.x1 - w.bbox.x0) / canvas.width,
      hNorm: (w.bbox.y1 - w.bbox.y0) / canvas.height
    }));
    return {
      text: (data.text || '').trim(),
      words
    };
  } finally {
    await worker.terminate();
  }
}
