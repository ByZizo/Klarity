// ============================================================================
// KLARITY DOCUMENT VAULT — MULTI-FORMAT EXPORTERS
// Exports Canonical Vault Document IR into:
//   .pdf, .docx, .xlsx, .csv, .pptx, .md, .txt
// Includes scope selection, formula-injection safety, and leak-free downloads.
// ============================================================================

import { zipSync, strToU8 } from 'fflate';
import {
  FORMAT_META_BY_ID,
  buildSafeExportFilename,
  checkAborted,
  escapeXml,
  sanitizeSpreadsheetCell,
  yieldToMainThread
} from './canonicalModel.js';

/**
 * Filter canonical IR by user-chosen export scope.
 * scope: { type: 'full' | 'table' | 'slides', tableIndex?: number, slideStart?: number, slideEnd?: number }
 */
function applyScopeToCanonical(canonical, scope = { type: 'full' }) {
  if (!canonical) return null;
  if (!scope || scope.type === 'full') return canonical;

  if (scope.type === 'table' && Array.isArray(canonical.tables) && canonical.tables.length > 0) {
    const idx = Math.max(0, Math.min(canonical.tables.length - 1, Number(scope.tableIndex) || 0));
    const chosen = canonical.tables[idx];
    return {
      ...canonical,
      title: `${canonical.title} — ${chosen.name || `Table ${idx + 1}`}`,
      blocks: [
        { type: 'heading', level: 1, text: chosen.name || `Table ${idx + 1}` }
      ],
      tables: [chosen],
      slides: []
    };
  }

  if (scope.type === 'slides' && Array.isArray(canonical.slides) && canonical.slides.length > 0) {
    const start = Math.max(1, Number(scope.slideStart) || 1);
    const end = Math.min(canonical.slides.length, Number(scope.slideEnd) || canonical.slides.length);
    const sliced = canonical.slides.filter((s) => s.index >= start && s.index <= end);
    return {
      ...canonical,
      slides: sliced,
      blocks: sliced.flatMap((s) => [
        { type: 'heading', level: 2, text: `Slide ${s.index}: ${s.title}` },
        ...(s.bullets?.length ? [{ type: 'list', ordered: false, items: s.bullets }] : []),
        ...(s.notes ? [{ type: 'quote', text: `Speaker Notes: ${s.notes}` }] : [])
      ])
    };
  }

  return canonical;
}

/**
 * Convert a Data URL to Uint8Array safely.
 */
function dataUrlToUint8Array(dataUrl) {
  const commaIdx = String(dataUrl || '').indexOf(',');
  if (commaIdx < 0) return null;
  const b64 = dataUrl.slice(commaIdx + 1);
  const binary = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ============================================================================
// 1. MARKDOWN EXPORTER (.md)
// ============================================================================
export function exportToMarkdown(canonical) {
  const lines = [`# ${canonical.title || 'Untitled Document'}`, ''];

  if (canonical.slides?.length > 0) {
    for (const slide of canonical.slides) {
      lines.push(`## Slide ${slide.index}: ${slide.title || ''}`, '');
      for (const bullet of slide.bullets || []) {
        lines.push(`- ${bullet}`);
      }
      for (const body of slide.body || []) {
        lines.push('', body);
      }
      if (slide.notes) {
        lines.push('', `> **Speaker Notes:** ${slide.notes}`);
      }
      lines.push('', '---', '');
    }
  } else if (canonical.blocks?.length > 0) {
    for (const block of canonical.blocks) {
      if (block.type === 'heading') {
        const prefix = '#'.repeat(Math.min(3, Math.max(1, block.level || 2)));
        lines.push(`${prefix} ${block.text}`, '');
      } else if (block.type === 'list' && Array.isArray(block.items)) {
        block.items.forEach((item, idx) => {
          lines.push(block.ordered ? `${idx + 1}. ${item}` : `- ${item}`);
        });
        lines.push('');
      } else if (block.type === 'quote') {
        lines.push(`> ${block.text}`, '');
      } else if (block.type === 'code') {
        lines.push(`\`\`\`${block.language || ''}`, block.text || '', '```', '');
      } else if (block.type === 'divider') {
        lines.push('---', '');
      } else if (block.text) {
        lines.push(block.text, '');
      }
    }
  }

  if (canonical.tables?.length > 0) {
    for (const table of canonical.tables) {
      if (table.name) lines.push(`### ${table.name}`, '');
      const headers = (table.headers || []).map((h) => String(h ?? '').replace(/\|/g, '\\|'));
      if (headers.length > 0) {
        lines.push(`| ${headers.join(' | ')} |`);
        lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
        for (const row of table.rows || []) {
          const cells = headers.map((_, ci) =>
            String(row[ci] ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
          );
          lines.push(`| ${cells.join(' | ')} |`);
        }
        lines.push('');
      }
    }
  }

  return strToU8(lines.join('\n').trim() + '\n');
}

// ============================================================================
// 2. PLAIN TEXT EXPORTER (.txt)
// ============================================================================
export function exportToPlainText(canonical) {
  const lines = [canonical.title || 'Untitled Document', '='.repeat(Math.min(60, (canonical.title || 'Document').length)), ''];

  if (canonical.slides?.length > 0) {
    for (const slide of canonical.slides) {
      lines.push(`[Slide ${slide.index}] ${slide.title || ''}`);
      for (const b of slide.bullets || []) lines.push(`  • ${b}`);
      for (const p of slide.body || []) lines.push(`  ${p}`);
      if (slide.notes) lines.push(`  Notes: ${slide.notes}`);
      lines.push('');
    }
  } else if (canonical.blocks?.length > 0) {
    for (const block of canonical.blocks) {
      if (block.type === 'heading') {
        lines.push('', block.text.toUpperCase(), '-'.repeat(Math.min(48, block.text.length)));
      } else if (block.type === 'list' && Array.isArray(block.items)) {
        block.items.forEach((item, idx) => {
          lines.push(block.ordered ? `  ${idx + 1}. ${item}` : `  • ${item}`);
        });
        lines.push('');
      } else if (block.type === 'quote') {
        lines.push(`  "${block.text}"`, '');
      } else if (block.type === 'code') {
        lines.push(block.text || '', '');
      } else if (block.type === 'divider') {
        lines.push('----------------------------------------', '');
      } else if (block.text) {
        lines.push(block.text, '');
      }
    }
  }

  if (canonical.tables?.length > 0) {
    for (const table of canonical.tables) {
      if (table.name) lines.push(`[${table.name}]`);
      if (table.headers?.length) lines.push(table.headers.join('\t'));
      for (const row of table.rows || []) {
        lines.push(row.map((c) => String(c ?? '').replace(/\r?\n/g, ' ')).join('\t'));
      }
      lines.push('');
    }
  }

  return strToU8(lines.join('\n').trim() + '\n');
}

// ============================================================================
// 3. CSV EXPORTER (.csv)
// ============================================================================
function escapeCsvField(val) {
  const safe = sanitizeSpreadsheetCell(val);
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function exportToCsv(canonical) {
  const csvLines = [];

  if (canonical.tables?.length > 0) {
    canonical.tables.forEach((table, tIdx) => {
      if (canonical.tables.length > 1) {
        if (tIdx > 0) csvLines.push('');
        csvLines.push(escapeCsvField(table.name || `Sheet ${tIdx + 1}`));
      }
      if (table.headers?.length) {
        csvLines.push(table.headers.map(escapeCsvField).join(','));
      }
      for (const row of table.rows || []) {
        csvLines.push(row.map(escapeCsvField).join(','));
      }
    });
  } else if (canonical.slides?.length > 0) {
    csvLines.push(['Slide', 'Title', 'Content', 'Speaker Notes'].map(escapeCsvField).join(','));
    for (const s of canonical.slides) {
      csvLines.push(
        [s.index, s.title || '', [...(s.bullets || []), ...(s.body || [])].join(' | '), s.notes || '']
          .map(escapeCsvField)
          .join(',')
      );
    }
  } else {
    csvLines.push(['Section', 'Type', 'Content'].map(escapeCsvField).join(','));
    let currentSection = canonical.title || 'Document';
    for (const b of canonical.blocks || []) {
      if (b.type === 'heading') {
        currentSection = b.text;
        csvLines.push([currentSection, `heading_${b.level || 1}`, b.text].map(escapeCsvField).join(','));
      } else if (b.type === 'list') {
        for (const item of b.items || []) {
          csvLines.push([currentSection, 'list_item', item].map(escapeCsvField).join(','));
        }
      } else if (b.text) {
        csvLines.push([currentSection, b.type || 'paragraph', b.text].map(escapeCsvField).join(','));
      }
    }
  }

  // UTF-8 BOM for seamless Excel compatibility
  return strToU8('\uFEFF' + csvLines.join('\r\n'));
}

// ============================================================================
// 4. EXCEL EXPORTER (.xlsx)
// ============================================================================
export async function exportToXlsx(canonical, { signal } = {}) {
  checkAborted(signal);
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const usedNames = new Set();
  const safeSheetName = (raw, fallback) => {
    let base = String(raw || fallback)
      .replace(/[:\\/?*\[\]]/g, '_')
      .trim()
      .slice(0, 28) || fallback;
    let candidate = base;
    let suffix = 2;
    while (usedNames.has(candidate.toLowerCase())) {
      candidate = `${base.slice(0, 25)}_${suffix++}`;
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
  };

  if (canonical.tables?.length > 0) {
    for (let i = 0; i < canonical.tables.length; i++) {
      checkAborted(signal);
      const t = canonical.tables[i];
      const aoa = [
        (t.headers || []).map(sanitizeSpreadsheetCell),
        ...(t.rows || []).map((row) => row.map(sanitizeSpreadsheetCell))
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName(t.name, `Sheet${i + 1}`));
      if (i % 2 === 1) await yieldToMainThread();
    }
  } else if (canonical.slides?.length > 0) {
    const aoa = [['Slide', 'Title', 'Bullet Points', 'Speaker Notes']];
    for (const s of canonical.slides) {
      aoa.push([
        s.index,
        sanitizeSpreadsheetCell(s.title || ''),
        sanitizeSpreadsheetCell([...(s.bullets || []), ...(s.body || [])].join('\n')),
        sanitizeSpreadsheetCell(s.notes || '')
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName('Slides', 'Slides'));
  } else {
    const aoa = [['Section', 'Type', 'Content']];
    let currentSection = canonical.title || 'Document';
    for (const b of canonical.blocks || []) {
      if (b.type === 'heading') {
        currentSection = b.text;
        aoa.push([sanitizeSpreadsheetCell(currentSection), 'Heading', sanitizeSpreadsheetCell(b.text)]);
      } else if (b.type === 'list') {
        for (const item of b.items || []) {
          aoa.push([sanitizeSpreadsheetCell(currentSection), 'List Item', sanitizeSpreadsheetCell(item)]);
        }
      } else if (b.text) {
        aoa.push([sanitizeSpreadsheetCell(currentSection), b.type || 'Paragraph', sanitizeSpreadsheetCell(b.text)]);
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(canonical.title, 'Document'));
  }

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(out);
}

// ============================================================================
// 5. WORD EXPORTER (.docx — Valid OOXML Archive)
// ============================================================================
export function exportToDocx(canonical) {
  const bodyParts = [];

  // Title paragraph
  bodyParts.push(
    `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(
      canonical.title || 'Untitled Document'
    )}</w:t></w:r></w:p>`
  );

  const addHeading = (level, text) => {
    const style = level === 1 ? 'Heading1' : level === 2 ? 'Heading2' : 'Heading3';
    bodyParts.push(
      `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
    );
  };

  const addParagraph = (text, opts = {}) => {
    const rPr = opts.italic ? '<w:rPr><w:i/></w:rPr>' : opts.bold ? '<w:rPr><w:b/></w:rPr>' : '';
    bodyParts.push(
      `<w:p><w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
    );
  };

  if (canonical.slides?.length > 0) {
    for (const slide of canonical.slides) {
      addHeading(2, `Slide ${slide.index}: ${slide.title || ''}`);
      for (const b of slide.bullets || []) {
        addParagraph(`• ${b}`);
      }
      for (const p of slide.body || []) {
        addParagraph(p);
      }
      if (slide.notes) {
        addParagraph(`Speaker Notes: ${slide.notes}`, { italic: true });
      }
    }
  } else {
    for (const block of canonical.blocks || []) {
      if (block.type === 'heading') {
        addHeading(block.level || 2, block.text);
      } else if (block.type === 'list' && Array.isArray(block.items)) {
        block.items.forEach((item, idx) => {
          addParagraph(block.ordered ? `${idx + 1}. ${item}` : `• ${item}`);
        });
      } else if (block.type === 'quote') {
        addParagraph(`"${block.text}"`, { italic: true });
      } else if (block.type === 'code') {
        addParagraph(block.text || '');
      } else if (block.type === 'divider') {
        addParagraph('────────────────────────────────────────');
      } else if (block.text) {
        addParagraph(block.text);
      }
    }
  }

  // Render tables natively as OOXML <w:tbl>
  for (const table of canonical.tables || []) {
    if (table.name) addHeading(2, table.name);
    const headers = table.headers || [];
    const rows = (table.rows || []).slice(0, 1500);
    if (headers.length === 0) continue;

    const tblRowsXml = [];
    const renderRow = (cells, isHeader = false) => {
      const cellXml = headers
        .map((_, ci) => {
          const val = cells[ci] != null ? String(cells[ci]) : '';
          const shading = isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="E8EEF7"/>' : '';
          const rPr = isHeader ? '<w:rPr><w:b/></w:rPr>' : '';
          return `<w:tc><w:tcPr>${shading}</w:tcPr><w:p><w:r>${rPr}<w:t xml:space="preserve">${escapeXml(
            val
          )}</w:t></w:r></w:p></w:tc>`;
        })
        .join('');
      return `<w:tr>${cellXml}</w:tr>`;
    };

    tblRowsXml.push(renderRow(headers, true));
    for (const r of rows) {
      tblRowsXml.push(renderRow(r, false));
    }

    bodyParts.push(
      `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/></w:tblBorders></w:tblPr>${tblRowsXml.join(
        ''
      )}</w:tbl><w:p/>`
    );
  }

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr><w:spacing w:after="200"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="1B4B91"/><w:sz w:val="40"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="1E293B"/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:spacing w:before="200" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="1B4B91"/><w:sz w:val="26"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr><w:spacing w:before="160" w:after="60"/></w:pPr>
    <w:rPr><w:b/><w:color w:val="334155"/><w:sz w:val="24"/></w:rPr>
  </w:style>
</w:styles>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyParts.join('\n    ')}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;

  return zipSync({
    '[Content_Types].xml': strToU8(contentTypesXml),
    '_rels/.rels': strToU8(rootRelsXml),
    'word/_rels/document.xml.rels': strToU8(docRelsXml),
    'word/styles.xml': strToU8(stylesXml),
    'word/document.xml': strToU8(documentXml)
  });
}

// ============================================================================
// 6. POWERPOINT EXPORTER (.pptx — Valid OOXML Widescreen 16:9 Deck)
// ============================================================================
function buildSlidesFromCanonical(canonical) {
  if (canonical.slides?.length > 0) {
    return canonical.slides;
  }

  const derived = [];
  let current = { index: 1, title: canonical.title || 'Overview', bullets: [], notes: '' };

  for (const block of canonical.blocks || []) {
    if (block.type === 'heading' && (block.level || 2) <= 2) {
      if (current.bullets.length > 0) {
        derived.push(current);
        current = { index: derived.length + 1, title: block.text, bullets: [], notes: '' };
      } else {
        current.title = block.text;
      }
    } else if (block.type === 'list') {
      for (const item of block.items || []) {
        current.bullets.push(item);
        if (current.bullets.length >= 6) {
          derived.push(current);
          current = { index: derived.length + 1, title: `${current.title} (cont.)`, bullets: [], notes: '' };
        }
      }
    } else if (block.text) {
      current.bullets.push(block.text.slice(0, 260));
      if (current.bullets.length >= 5) {
        derived.push(current);
        current = { index: derived.length + 1, title: `${current.title} (cont.)`, bullets: [], notes: '' };
      }
    }
  }
  if (current.bullets.length > 0 || derived.length === 0) {
    derived.push(current);
  }

  for (const table of canonical.tables || []) {
    const previewLines = [
      (table.headers || []).join(' | '),
      ...(table.rows || []).slice(0, 8).map((r) => r.join(' | '))
    ];
    derived.push({
      index: derived.length + 1,
      title: table.name || 'Data Summary',
      bullets: previewLines,
      notes: `${(table.rows || []).length} total rows in ${table.name || 'table'}.`
    });
  }

  return derived.slice(0, 80);
}

export function exportToPptx(canonical) {
  const slides = buildSlidesFromCanonical(canonical);
  const zipEntries = {};

  const slideOverrides = [];
  const presRels = [
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>`
  ];
  const sldIdList = [];

  slides.forEach((slide, idx) => {
    const slideNum = idx + 1;
    const relId = `rId${slideNum + 1}`;
    const sldId = 256 + idx;

    slideOverrides.push(
      `<Override PartName="/ppt/slides/slide${slideNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
    );
    presRels.push(
      `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${slideNum}.xml"/>`
    );
    sldIdList.push(`<p:sldId id="${sldId}" r:id="${relId}"/>`);

    const bulletLines = [...(slide.bullets || []), ...(slide.body || [])];
    const bodyParas = (bulletLines.length > 0 ? bulletLines : [' '])
      .map(
        (line) =>
          `<a:p><a:pPr marL="285750" indent="-285750"><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="en-US" sz="1800"/><a:t>${escapeXml(
            line
          )}</a:t></a:r></a:p>`
      )
      .join('');

    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="365760"/><a:ext cx="11277600" cy="1143000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="3200" b="1"><a:solidFill><a:srgbClr val="1B4B91"/></a:solidFill></a:rPr><a:t>${escapeXml(
          slide.title || `Slide ${slideNum}`
        )}</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Content"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph idx="1"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="1645920"/><a:ext cx="11277600" cy="4663440"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
        <p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>${bodyParas}</p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

    zipEntries[`ppt/slides/slide${slideNum}.xml`] = strToU8(slideXml);

    const slideRels = [
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`
    ];

    if (slide.notes && slide.notes.trim()) {
      slideOverrides.push(
        `<Override PartName="/ppt/notesSlides/notesSlide${slideNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`
      );
      slideRels.push(
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${slideNum}.xml"/>`
      );
      const notesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Notes"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
        <p:spPr/>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1400"/><a:t>${escapeXml(
          slide.notes
        )}</a:t></a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`;
      zipEntries[`ppt/notesSlides/notesSlide${slideNum}.xml`] = strToU8(notesXml);
      zipEntries[`ppt/notesSlides/_rels/notesSlide${slideNum}.xml.rels`] = strToU8(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide${slideNum}.xml"/></Relationships>`
      );
    }

    zipEntries[`ppt/slides/_rels/slide${slideNum}.xml.rels`] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${slideRels.join('')}</Relationships>`
    );
  });

  zipEntries['[Content_Types].xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  ${slideOverrides.join('\n  ')}
</Types>`);

  zipEntries['_rels/.rels'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

  zipEntries['ppt/presentation.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>${sldIdList.join('')}</p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);

  zipEntries['ppt/_rels/presentation.xml.rels'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${presRels.join('')}</Relationships>`);

  zipEntries['ppt/slideMasters/slideMaster1.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`);

  zipEntries['ppt/slideMasters/_rels/slideMaster1.xml.rels'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`);

  zipEntries['ppt/slideLayouts/slideLayout1.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="obj">
  <p:cSld name="Title and Content"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
</p:sldLayout>`);

  zipEntries['ppt/slideLayouts/_rels/slideLayout1.xml.rels'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`);

  return zipSync(zipEntries);
}

// ============================================================================
// 7. PDF EXPORTER (.pdf — via pdf-lib)
// ============================================================================
function toWinAnsiSafe(text) {
  return String(text ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2022/g, '*')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
}

function wrapTextLines(text, font, fontSize, maxWidth) {
  const safe = toWinAnsiSafe(text);
  const words = safe.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function exportToPdf(canonical, doc, { scope, signal } = {}) {
  checkAborted(signal);

  // Fast-path: native PDF full export returns original PDF bytes directly
  if (
    (!scope || scope.type === 'full') &&
    (doc?.sourceFormat === 'pdf' || doc?.fileType?.includes('pdf')) &&
    doc?.dataUrl?.startsWith('data:application/pdf')
  ) {
    const rawBytes = dataUrlToUint8Array(doc.dataUrl);
    if (rawBytes && rawBytes.length > 0) return rawBytes;
  }

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Fast-path: embed native image directly into a PDF page
  if (
    (doc?.sourceFormat === 'image' || doc?.fileType?.startsWith('image/')) &&
    doc?.dataUrl &&
    (doc.dataUrl.startsWith('data:image/png') || doc.dataUrl.startsWith('data:image/jpeg'))
  ) {
    const imgBytes = dataUrlToUint8Array(doc.dataUrl);
    if (imgBytes) {
      const embedded = doc.dataUrl.startsWith('data:image/png')
        ? await pdfDoc.embedPng(imgBytes)
        : await pdfDoc.embedJpg(imgBytes);
      const page = pdfDoc.addPage([612, 792]);
      const scale = Math.min(540 / embedded.width, 700 / embedded.height, 1);
      const w = embedded.width * scale;
      const h = embedded.height * scale;
      page.drawImage(embedded, { x: (612 - w) / 2, y: (792 - h) / 2, width: w, height: h });
      return new Uint8Array(await pdfDoc.save());
    }
  }

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 48;
  const MAX_W = PAGE_W - MARGIN * 2;

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensureSpace = (neededHeight) => {
    if (y - neededHeight < MARGIN) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const drawWrapped = (text, { size = 10.5, bold = false, color = rgb(0.12, 0.16, 0.23), indent = 0, spaceAfter = 6 } = {}) => {
    const font = bold ? fontBold : fontRegular;
    const lines = wrapTextLines(text, font, size, MAX_W - indent);
    const lineHeight = size * 1.42;
    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, { x: MARGIN + indent, y, size, font, color });
      y -= lineHeight;
    }
    y -= spaceAfter;
  };

  // Document Title Banner
  drawWrapped(canonical.title || 'Untitled Document', {
    size: 18,
    bold: true,
    color: rgb(0.11, 0.29, 0.57),
    spaceAfter: 10
  });

  if (canonical.slides?.length > 0) {
    for (let i = 0; i < canonical.slides.length; i++) {
      checkAborted(signal);
      const s = canonical.slides[i];
      drawWrapped(`Slide ${s.index}: ${s.title || ''}`, {
        size: 13.5,
        bold: true,
        color: rgb(0.11, 0.29, 0.57),
        spaceAfter: 6
      });
      for (const b of s.bullets || []) {
        drawWrapped(`* ${b}`, { size: 10.5, indent: 12, spaceAfter: 4 });
      }
      for (const p of s.body || []) {
        drawWrapped(p, { size: 10.5, indent: 8, spaceAfter: 5 });
      }
      if (s.notes) {
        drawWrapped(`Speaker Notes: ${s.notes}`, {
          size: 9.5,
          color: rgb(0.4, 0.45, 0.52),
          indent: 12,
          spaceAfter: 10
        });
      }
      y -= 6;
      if (i % 5 === 4) await yieldToMainThread();
    }
  } else {
    for (let i = 0; i < (canonical.blocks || []).length; i++) {
      checkAborted(signal);
      const b = canonical.blocks[i];
      if (b.type === 'heading') {
        const size = b.level === 1 ? 15 : b.level === 2 ? 13 : 11.5;
        y -= 4;
        drawWrapped(b.text, { size, bold: true, color: rgb(0.11, 0.29, 0.57), spaceAfter: 6 });
      } else if (b.type === 'list' && Array.isArray(b.items)) {
        b.items.forEach((item, idx) => {
          drawWrapped(b.ordered ? `${idx + 1}. ${item}` : `* ${item}`, { size: 10.5, indent: 14, spaceAfter: 3 });
        });
        y -= 4;
      } else if (b.type === 'quote') {
        drawWrapped(`"${b.text}"`, { size: 10, color: rgb(0.35, 0.4, 0.48), indent: 16, spaceAfter: 6 });
      } else if (b.type === 'divider') {
        ensureSpace(12);
        page.drawLine({
          start: { x: MARGIN, y },
          end: { x: PAGE_W - MARGIN, y },
          thickness: 0.75,
          color: rgb(0.8, 0.84, 0.88)
        });
        y -= 12;
      } else if (b.text) {
        drawWrapped(b.text, { size: 10.5, spaceAfter: 6 });
      }
      if (i % 50 === 49) await yieldToMainThread();
    }
  }

  for (const table of canonical.tables || []) {
    checkAborted(signal);
    if (table.name) {
      y -= 4;
      drawWrapped(table.name, { size: 12.5, bold: true, color: rgb(0.11, 0.29, 0.57), spaceAfter: 6 });
    }
    const headers = (table.headers || []).slice(0, 8);
    if (headers.length > 0) {
      drawWrapped(headers.join('  |  '), { size: 9.5, bold: true, spaceAfter: 4 });
      const rows = (table.rows || []).slice(0, 400);
      for (let r = 0; r < rows.length; r++) {
        const rowLine = headers.map((_, ci) => String(rows[r][ci] ?? '')).join('  |  ');
        drawWrapped(rowLine, { size: 9, spaceAfter: 2.5 });
        if (r % 40 === 39) await yieldToMainThread();
      }
      if ((table.rows || []).length > 400) {
        drawWrapped(`... (${(table.rows.length - 400).toLocaleString()} additional rows omitted in PDF view; export XLSX/CSV for full table)`, {
          size: 8.5,
          color: rgb(0.45, 0.5, 0.56),
          spaceAfter: 8
        });
      }
    }
  }

  return new Uint8Array(await pdfDoc.save());
}

// ============================================================================
// MAIN ENTRYPOINT: exportVaultDocument(doc, options) & leak-free download
// ============================================================================
export async function exportVaultDocument(doc, { targetFormat, fileName, scope, onProgress, signal } = {}) {
  checkAborted(signal);
  const meta = FORMAT_META_BY_ID[targetFormat];
  if (!meta) throw new Error(`Unsupported export format: ${targetFormat}`);

  onProgress?.({ percent: 15, stage: `Preparing ${meta.shortLabel} export...` });

  const scopedCanonical = applyScopeToCanonical(doc.canonical, scope);
  if (!scopedCanonical) {
    throw new Error('Document content could not be prepared for export.');
  }

  let bytes;
  onProgress?.({ percent: 45, stage: `Generating ${meta.label}...` });
  if (targetFormat === 'md') {
    bytes = exportToMarkdown(scopedCanonical);
  } else if (targetFormat === 'txt') {
    bytes = exportToPlainText(scopedCanonical);
  } else if (targetFormat === 'csv') {
    bytes = exportToCsv(scopedCanonical);
  } else if (targetFormat === 'xlsx') {
    bytes = await exportToXlsx(scopedCanonical, { signal });
  } else if (targetFormat === 'docx') {
    bytes = exportToDocx(scopedCanonical);
  } else if (targetFormat === 'pptx') {
    bytes = exportToPptx(scopedCanonical);
  } else if (targetFormat === 'pdf') {
    bytes = await exportToPdf(scopedCanonical, doc, { scope, signal });
  }

  checkAborted(signal);
  const safeExportName = buildSafeExportFilename(fileName || doc.name || doc.fileName, targetFormat);
  onProgress?.({ percent: 100, stage: 'Download ready' });

  return {
    bytes,
    mimeType: meta.mime,
    fileName: safeExportName
  };
}

/**
 * Trigger a browser/Electron file download and explicitly revoke the temporary Object URL.
 */
export function triggerSafeBlobDownload(bytes, mimeType, fileName) {
  const blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName || 'document';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    // Explicit revocation after browser hands off download prevents memory leaks
    setTimeout(() => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
    }, 1500);
  }
}
