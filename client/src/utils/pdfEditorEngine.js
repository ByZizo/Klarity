// ============================================================================
// KLARITY PDF EDITOR ENGINE
// Pure client-side PDF rendering (pdfjs-dist) and vector manipulation (pdf-lib)
// ============================================================================

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

// Lazy-loaded PDF.js instance cache
let cachedPdfjsLib = null;

export async function getPdfjs() {
  if (cachedPdfjsLib) return cachedPdfjsLib;
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  cachedPdfjsLib = pdfjsLib;
  return pdfjsLib;
}

/**
 * Convert hex color string to PDF rgb(r, g, b) with 0-1 values
 */
export function hexToPdfRgb(hex = '#000000') {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(clean.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(clean.substring(4, 6), 16) / 255 || 0;
  return rgb(r, g, b);
}

/**
 * Convert base64 dataUrl or binary into Uint8Array
 */
export function dataUrlToUint8Array(dataUrl) {
  if (dataUrl instanceof Uint8Array) return dataUrl;
  if (dataUrl instanceof ArrayBuffer) return new Uint8Array(dataUrl);

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

/**
 * Convert Uint8Array to base64 Data URL
 */
export function uint8ArrayToDataUrl(bytes, mimeType = 'application/pdf') {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/**
 * Load PDF with PDF.js for rendering and inspection
 */
export async function loadPdfForViewing(source) {
  const pdfjsLib = await getPdfjs();
  const bytes = dataUrlToUint8Array(source);
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdfJsDoc = await loadingTask.promise;
  return {
    pdfJsDoc,
    numPages: pdfJsDoc.numPages,
    rawBytes: bytes
  };
}

/**
 * Render a single PDF page to an HTML5 canvas element
 */
export async function renderPdfPageToCanvas(pdfJsDoc, pageNumber, canvas, scale = 1.5, rotationOffset = 0) {
  if (!pdfJsDoc || !canvas) return null;
  const page = await pdfJsDoc.getPage(pageNumber);
  
  // Total rotation combining original PDF rotation and user offset
  const originalRotation = page.rotate || 0;
  const totalRotation = (originalRotation + rotationOffset) % 360;

  const viewport = page.getViewport({ scale, rotation: totalRotation });
  const context = canvas.getContext('2d', { alpha: false });

  // High-DPI screen support (Retina / high-res displays)
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  context.save();
  context.scale(dpr, dpr);

  const renderContext = {
    canvasContext: context,
    viewport
  };

  await page.render(renderContext).promise;
  context.restore();

  return {
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    scale,
    totalRotation
  };
}

/**
 * Extract all text content from PDF pages for AI analysis / search
 */
export async function extractPdfText(pdfJsDoc, maxPages = 20) {
  if (!pdfJsDoc) return '';
  const pagesToRead = Math.min(pdfJsDoc.numPages, maxPages);
  let fullText = '';

  for (let i = 1; i <= pagesToRead; i++) {
    try {
      const page = await pdfJsDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items.map(item => item.str).join(' ');
      fullText += `--- Page ${i} ---\n${pageStrings}\n\n`;
    } catch (e) {
      console.warn(`Could not extract text from page ${i}:`, e);
    }
  }

  return fullText.trim();
}

/**
 * Burns all annotations, text, redactions, signatures, and stamps permanently into the PDF.
 * Also handles deleted pages and page rotations.
 */
export async function burnAndExportPdf({
  originalBytes,
  deletedPages = [], // array of 1-based page numbers
  pageRotations = {}, // map of { [pageNumber]: angleOffset }
  annotations = {} // map of { [pageNumber]: Array<Annotation> }
}) {
  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 1. Process Page Rotations
  const pageCountBeforeDeletion = pdfDoc.getPageCount();
  for (let pageNum = 1; pageNum <= pageCountBeforeDeletion; pageNum++) {
    const rotationOffset = pageRotations[pageNum] || 0;
    if (rotationOffset !== 0) {
      const page = pdfDoc.getPage(pageNum - 1);
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + rotationOffset) % 360));
    }
  }

  // 2. Process Annotations per page
  // Cache embedded image objects (signatures/stamps) to avoid duplicate embedding
  const embeddedImageCache = new Map();

  for (let pageNum = 1; pageNum <= pageCountBeforeDeletion; pageNum++) {
    if (deletedPages.includes(pageNum)) continue;

    const pageAnnotations = annotations[pageNum] || [];
    if (pageAnnotations.length === 0) continue;

    const page = pdfDoc.getPage(pageNum - 1);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    for (const ann of pageAnnotations) {
      // Coordinate normalization: annotations store coordinates relative to normalized canvas width & height
      // ann.canvasWidth and ann.canvasHeight record the coordinate space in which the user created the annotation
      const cWidth = ann.canvasWidth || pageWidth;
      const cHeight = ann.canvasHeight || pageHeight;
      const scaleX = pageWidth / cWidth;
      const scaleY = pageHeight / cHeight;

      if (ann.type === 'draw' && ann.points && ann.points.length > 1) {
        // Freehand drawing / pen stroke
        const strokeColor = hexToPdfRgb(ann.color || '#1B4B91');
        const strokeThickness = (ann.thickness || 2.5) * scaleX;

        for (let i = 0; i < ann.points.length - 1; i++) {
          const p1 = ann.points[i];
          const p2 = ann.points[i + 1];

          const x1 = p1.x * scaleX;
          const y1 = pageHeight - (p1.y * scaleY);
          const x2 = p2.x * scaleX;
          const y2 = pageHeight - (p2.y * scaleY);

          page.drawLine({
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 },
            thickness: strokeThickness,
            color: strokeColor,
            opacity: ann.opacity || 1
          });
        }
      } else if (ann.type === 'highlight') {
        // Highlight rectangle
        const x = ann.x * scaleX;
        const width = ann.width * scaleX;
        const height = ann.height * scaleY;
        const y = pageHeight - ((ann.y + ann.height) * scaleY);

        page.drawRectangle({
          x,
          y,
          width,
          height,
          color: hexToPdfRgb(ann.color || '#ffeb3b'),
          opacity: 0.38
        });
      } else if (ann.type === 'redact') {
        // Privacy Redaction Box (Solid blackout or whiteout)
        const x = ann.x * scaleX;
        const width = ann.width * scaleX;
        const height = ann.height * scaleY;
        const y = pageHeight - ((ann.y + ann.height) * scaleY);
        const isWhiteout = ann.color === '#ffffff' || ann.color === 'white';

        page.drawRectangle({
          x,
          y,
          width,
          height,
          color: isWhiteout ? rgb(1, 1, 1) : rgb(0, 0, 0),
          opacity: 1
        });
      } else if (ann.type === 'text') {
        // Text Box
        const x = ann.x * scaleX;
        const fontSize = (ann.fontSize || 14) * scaleX;
        // Text baseline adjustment
        const y = pageHeight - ((ann.y + (ann.fontSize || 14)) * scaleY);
        const font = ann.isBold ? helveticaBold : helveticaFont;
        const textColor = hexToPdfRgb(ann.color || '#000000');

        // Optional background badge for readability
        if (ann.bgColor && ann.bgColor !== 'transparent') {
          const textWidth = font.widthOfTextAtSize(ann.text || '', fontSize);
          page.drawRectangle({
            x: x - 4,
            y: y - 2,
            width: textWidth + 8,
            height: fontSize + 6,
            color: hexToPdfRgb(ann.bgColor),
            opacity: 0.95
          });
        }

        page.drawText(ann.text || '', {
          x,
          y,
          size: fontSize,
          font,
          color: textColor,
          opacity: 1
        });
      } else if (ann.type === 'signature' || ann.type === 'image' || ann.type === 'stamp') {
        // Embedded image (signature canvas PNG, stamp, etc.)
        if (ann.dataUrl) {
          try {
            let embeddedImg = embeddedImageCache.get(ann.dataUrl);
            if (!embeddedImg) {
              const imgBytes = dataUrlToUint8Array(ann.dataUrl);
              embeddedImg = ann.dataUrl.includes('image/jpeg') || ann.dataUrl.includes('image/jpg')
                ? await pdfDoc.embedJpg(imgBytes)
                : await pdfDoc.embedPng(imgBytes);
              embeddedImageCache.set(ann.dataUrl, embeddedImg);
            }

            const x = ann.x * scaleX;
            const width = ann.width * scaleX;
            const height = ann.height * scaleY;
            const y = pageHeight - ((ann.y + ann.height) * scaleY);

            page.drawImage(embeddedImg, {
              x,
              y,
              width,
              height,
              opacity: ann.opacity || 1
            });
          } catch (imgErr) {
            console.warn('Failed to embed image/signature onto PDF:', imgErr);
          }
        }
      }
    }
  }

  // 3. Process Page Deletions (remove in descending index order so subsequent indexes don't shift)
  const sortedDeletions = [...new Set(deletedPages)].sort((a, b) => b - a);
  for (const pageNum of sortedDeletions) {
    if (pageNum >= 1 && pageNum <= pdfDoc.getPageCount()) {
      pdfDoc.removePage(pageNum - 1);
    }
  }

  // 4. Save and return final binary bytes
  const modifiedBytes = await pdfDoc.save();
  const modifiedDataUrl = uint8ArrayToDataUrl(modifiedBytes);

  return {
    bytes: modifiedBytes,
    dataUrl: modifiedDataUrl,
    pageCount: pdfDoc.getPageCount()
  };
}

/**
 * Generate a pre-rendered high-res PNG for common financial stamps
 */
export function generateStampDataUrl({ text, color = '#10b981', subText = '' }) {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Rotate slightly for authentic stamp angle (-5 degrees)
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((-6 * Math.PI) / 180);

  // Outer rounded border
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-180, -50, 360, 100, 14);
  ctx.stroke();

  // Inner dotted or double border
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-172, -42, 344, 84, 8);
  ctx.stroke();

  // Main Stamp Text
  ctx.fillStyle = color;
  ctx.font = 'bold 38px "Impact", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = subText ? 'bottom' : 'middle';
  ctx.fillText(text.toUpperCase(), 0, subText ? 6 : 2);

  // Subtext (e.g. date)
  if (subText) {
    ctx.font = 'bold 16px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(subText, 0, 10);
  }

  ctx.restore();
  return canvas.toDataURL('image/png');
}
