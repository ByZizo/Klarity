// Client-side insurance card scanner.
// Runs entirely in the browser: renders PDF pages / loads images, runs OCR
// (tesseract.js), and parses the recognized text into insurance fields.
// Nothing is invented — any field not found on the card is left empty.

const STORE_MAX_WIDTH = 1100; // width of the card images we keep for display
const OCR_MAX_WIDTH = 2000; // width used for OCR (higher = more accurate)

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function canvasFromSource(source, srcW, srcH, maxWidth) {
  const scale = Math.min(1, maxWidth / srcW);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(srcW * scale);
  canvas.height = Math.round(srcH * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Returns [{ ocrCanvas, displayUrl, embeddedText }]
async function pagesFromPdf(file) {
  // Legacy build for wide browser support (older iOS Safari / Android WebViews)
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];
  const pageCount = Math.min(pdf.numPages, 4);

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(4, OCR_MAX_WIDTH / base.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;

    let embeddedText = '';
    try {
      const tc = await page.getTextContent();
      embeddedText = tc.items.map((it) => it.str + (it.hasEOL ? '\n' : ' ')).join('');
    } catch {
      embeddedText = '';
    }

    const display = canvasFromSource(canvas, canvas.width, canvas.height, STORE_MAX_WIDTH);
    pages.push({
      ocrCanvas: canvas,
      displayUrl: display.toDataURL('image/jpeg', 0.85),
      embeddedText
    });
  }
  return pages;
}

async function pagesFromImage(file) {
  const src = await readAsDataUrl(file);
  const img = await loadImage(src);
  const ocrCanvas = canvasFromSource(img, img.naturalWidth, img.naturalHeight, OCR_MAX_WIDTH);
  const display = canvasFromSource(img, img.naturalWidth, img.naturalHeight, STORE_MAX_WIDTH);
  return [{ ocrCanvas, displayUrl: display.toDataURL('image/jpeg', 0.85), embeddedText: '' }];
}

// ---------------------------------------------------------------------------
// Text parsing
// ---------------------------------------------------------------------------

const CARRIERS = [
  { re: /unitedhealthcare|united\s*healthcare|optum/i, name: 'UnitedHealthcare' },
  { re: /kaiser|permanente/i, name: 'Kaiser Permanente' },
  { re: /blue\s*shield/i, name: 'Blue Shield of California' },
  { re: /anthem|blue\s*cross|bcbs/i, name: 'Anthem Blue Cross' },
  { re: /aetna/i, name: 'Aetna' },
  { re: /cigna|evernorth/i, name: 'Cigna' },
  { re: /humana/i, name: 'Humana' },
  { re: /health\s*net/i, name: 'Health Net' },
  { re: /molina/i, name: 'Molina Healthcare' },
  { re: /oscar/i, name: 'Oscar Health' },
  { re: /sutter/i, name: 'Sutter Health Plus' },
  { re: /ambetter/i, name: 'Ambetter' },
  { re: /medi-?cal/i, name: 'Medi-Cal' },
  { re: /medicaid/i, name: 'Medicaid' },
  { re: /medicare/i, name: 'Medicare' },
  { re: /tricare/i, name: 'TRICARE' }
];

const money = (s) => {
  if (s == null) return null;
  const n = Number(String(s).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export function parseInsuranceText(rawText = '') {
  // Normalize common OCR slips: "%0" for "$0", stray pipes
  const text = rawText.replace(/%(\d)/g, '$$$1').replace(/[|]/g, ' ');
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s{2,}/g, ' ').trim()).filter(Boolean);

  const out = {
    insuranceType: 'Medical',
    provider: '',
    planName: '',
    network: '',
    memberId: '',
    groupNumber: '',
    memberName: '',
    rxBin: '',
    rxPcn: '',
    rxGrp: '',
    deductible: null,
    outOfPocketMax: null,
    copays: { primaryCare: null, specialist: null, urgentCare: null, er: null, rxGeneric: null },
    doctor: null
  };

  const carrier = CARRIERS.find((c) => c.re.test(text));
  if (carrier) out.provider = carrier.name;

  const net = text.match(/\b(HMO|PPO|EPO|POS|HDHP)\b/);
  if (net) out.network = net[1].toUpperCase();

  // Plan name: a line mentioning a network type / plan keyword that isn't a label line
  for (const line of lines) {
    if (!/\b(HMO|PPO|EPO|POS|HDHP|Choice Plus|Select Plus|Advantage|Bronze|Silver|Gold|Platinum)\b/i.test(line)) continue;
    if (/member|group|ded|oop|copay|rx\s|bin|pcn|call|visit|www\.|\.com/i.test(line)) continue;
    const cleaned = line
      .replace(/^.*?state regulated\s*/i, '')
      .replace(/^plan(?:\s*name)?\s*[:\-]?\s*/i, '')
      .replace(/offered by.*$/i, '')
      .trim();
    if (cleaned.length >= 3 && cleaned.length <= 50) {
      out.planName = cleaned;
      break;
    }
  }

  const memberId = text.match(/\b(?:member\s*id|subscriber\s*id|member\s*#|id\s*(?:no|number|#))\s*[:#.]?\s*([A-Z0-9][A-Z0-9-]{3,20})/i);
  if (memberId) out.memberId = memberId[1].toUpperCase();

  const group = text.match(/\b(?:group\s*(?:number|no\.?|#)?|grp\s*#?)\s*[:#.]?\s*([A-Z0-9][A-Z0-9-]{2,15})\b/i);
  if (group && !/^(number|no|rx)$/i.test(group[1])) out.groupNumber = group[1].toUpperCase();

  const name = text.match(/\bmember(?:\s*name)?\s*:\s*([A-Z][A-Z .'-]{2,40})(?=\r?\n|$)/i);
  if (name && !/\bid\b/i.test(name[1])) out.memberName = name[1].trim();

  const bin = text.match(/\b(?:rx\s*)?bin\s*[:#.,]?\s*(\d{6})\b/i);
  if (bin) out.rxBin = bin[1];
  const pcn = text.match(/\b(?:rx\s*)?pcn\s*[:#.]?\s*([A-Z0-9]{2,10})\b/i);
  if (pcn) out.rxPcn = pcn[1].toUpperCase();
  const rxGrp = text.match(/\brx\s*gr(?:ou)?p\s*[:#.]?\s*([A-Z0-9]{3,12})\b/i);
  if (rxGrp) out.rxGrp = rxGrp[1].toUpperCase();

  const amt = '\\$\\s?([0-9][0-9,]*)';
  const find = (labels) => {
    const m = text.match(new RegExp(`\\b(?:${labels})\\b\\s*(?:copay|visit)?\\s*[:\\-]?\\s*${amt}`, 'i'));
    return m ? money(m[1]) : null;
  };
  out.copays.primaryCare = find('office|pcp|primary\\s*care|office\\s*visit|ov');
  out.copays.specialist = find('spec|specialist|sp');
  out.copays.urgentCare = find('urgent\\s*care|urgent|uc');
  out.copays.er = find('er|emergency\\s*room|emerg');
  out.copays.rxGeneric = find('generic|tier\\s*1|rx\\s*generic');

  out.deductible = find('deductible|ded');
  out.outOfPocketMax = find('out[\\s-]*of[\\s-]*pocket(?:\\s*max(?:imum)?)?|oop\\s*max|oopm|moop');

  // Grid layout: "Ded IND/FAM   OOPM IND/FAM" on one line, "INN: $0/$0   $1500/$3000" on the next
  if (out.deductible == null || out.outOfPocketMax == null) {
    const idx = lines.findIndex((l) => /\bded\b/i.test(l) && /\boop/i.test(l));
    if (idx !== -1) {
      for (let j = idx + 1; j <= Math.min(idx + 2, lines.length - 1); j++) {
        const amounts = [...lines[j].matchAll(/\$\s?([0-9][0-9,]*)(?:\s*\/\s*\$?\s?[0-9][0-9,]*)?/g)].map((m) => money(m[1]));
        if (amounts.length >= 2) {
          const dedFirst = lines[idx].search(/\bded\b/i) < lines[idx].search(/\boop/i);
          if (out.deductible == null) out.deductible = dedFirst ? amounts[0] : amounts[1];
          if (out.outOfPocketMax == null) out.outOfPocketMax = dedFirst ? amounts[1] : amounts[0];
          break;
        }
      }
    }
  }

  // Insurance type detection
  if (/\b(?:dental|dentist|orthodontic|dmd|dds)\b/i.test(text)) {
    out.insuranceType = 'Dental';
  } else if (/\b(?:vision|optical|optometry|eyecare|optometrist)\b/i.test(text)) {
    out.insuranceType = 'Vision';
  } else if (/\b(?:prescription only|rx only|pharmacy benefits)\b/i.test(text)) {
    out.insuranceType = 'Prescription';
  } else {
    out.insuranceType = 'Medical';
  }

  // Primary care doctor: "LASTNAME, FIRSTNAME M (555) 555-5555"
  const doc = text.match(/([A-Z][A-Z'-]+,\s*[A-Z][A-Z .'-]*?)\s+(\(\d{3}\)\s?\d{3}[-.\s]\d{4})/);
  if (doc) {
    let office = '';
    const docName = doc[1].trim();
    const docIdx = lines.findIndex((l) => l.includes(docName.split(',')[0]));
    if (docIdx > 0) {
      for (let k = docIdx - 1; k >= Math.max(0, docIdx - 3); k--) {
        const line = lines[k];
        if (/pcp effective/i.test(line)) continue;
        if (/phys|clinic|center|group|medical|health|sante|associates|hospital/i.test(line)) {
          office = line.trim();
          break;
        }
      }
    }
    out.doctor = { name: docName, phone: doc[2].trim(), office, specialty: 'Primary care (PCP)' };
  }

  return out;
}

const looksLikeFront = (t) => /member\s*id|group|copay|subscriber/i.test(t);

// Main entry: returns { extracted, cardImages: [frontUrl, backUrl?], text }
export async function scanInsuranceFile(file, onProgress = () => {}) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  onProgress('Preparing document…');
  const pages = isPdf ? await pagesFromPdf(file) : await pagesFromImage(file);

  const { createWorker } = await import('tesseract.js');
  onProgress('Loading text reader…');
  const worker = await createWorker('eng');
  const texts = [];
  try {
    for (let i = 0; i < pages.length; i++) {
      onProgress(pages.length > 1 ? `Reading page ${i + 1} of ${pages.length}…` : 'Reading card…');
      const p = pages[i];
      let t = p.embeddedText && p.embeddedText.trim().length > 40 ? p.embeddedText : '';
      if (!t) {
        const { data } = await worker.recognize(p.ocrCanvas);
        t = data?.text || '';
      }
      texts.push(t);
    }
  } finally {
    await worker.terminate();
  }

  // Order pages so the side with member ID / group info is the front
  let order = pages.map((_, i) => i);
  const frontIdx = texts.findIndex(looksLikeFront);
  if (frontIdx > 0) order = [frontIdx, ...order.filter((i) => i !== frontIdx)];

  const orderedText = order.map((i) => texts[i]).join('\n');
  const extracted = parseInsuranceText(orderedText);
  const cardImages = order.slice(0, 2).map((i) => pages[i].displayUrl);

  return { extracted, cardImages, text: orderedText };
}


// ---------------------------------------------------------------------------
// Auto Insurance Parsing & Scanning
// ---------------------------------------------------------------------------

const AUTO_CARRIERS = [
  { re: /geico/i, name: 'GEICO' },
  { re: /state\s*farm/i, name: 'State Farm' },
  { re: /progressive/i, name: 'Progressive' },
  { re: /allstate/i, name: 'Allstate' },
  { re: /aaa|auto\s*club/i, name: 'AAA (Auto Club)' },
  { re: /farmers\s*insurance|farmers/i, name: 'Farmers Insurance' },
  { re: /liberty\s*mutual/i, name: 'Liberty Mutual' },
  { re: /usaa/i, name: 'USAA' },
  { re: /travelers/i, name: 'Travelers' },
  { re: /nationwide/i, name: 'Nationwide' },
  { re: /american\s*family|amfam/i, name: 'American Family' },
  { re: /mercury\s*insurance|mercury/i, name: 'Mercury Insurance' }
];

export function parseAutoInsuranceText(rawText = '') {
  const text = rawText.replace(/%(\d)/g, '$$$$1').replace(/[|]/g, ' ');
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s{2,}/g, ' ').trim()).filter(Boolean);

  const out = {
    provider: '',
    policyNumber: '',
    driverName: '',
    year: null,
    make: '',
    model: '',
    vin: '',
    coverage: 'full_coverage',
    deductible: null,
    monthlyPremium: null,
    effectiveDate: '',
    expirationDate: ''
  };

  const carrier = AUTO_CARRIERS.find((c) => c.re.test(text));
  if (carrier) out.provider = carrier.name;

  // Policy number match
  const pol = text.match(/\b(?:policy\s*(?:number|no\.?|#)?|pol\s*#?)\s*[:#.]?\s*([A-Z0-9-]{5,25})\b/i);
  if (pol) out.policyNumber = pol[1].toUpperCase();

  // Insured name match
  const name = text.match(/\b(?:named\s*insured|insured|driver|policyholder|name)\s*[:#.]?\s*([A-Z][A-Z .'-]{2,35})(?=\r?\n|$)/i);
  if (name && !/\b(?:company|insurance|auto|policy|vehicle)\b/i.test(name[1])) {
    out.driverName = name[1].trim();
  }

  // VIN match (17 alphanumeric)
  const vinMatch = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
  if (vinMatch) out.vin = vinMatch[1].toUpperCase();

  // Year match
  const yrMatch = text.match(/\b(19\d{2}|20[0-3]\d)\b/);
  if (yrMatch) out.year = Number(yrMatch[1]);

  // Car make & model detection
  const carMakes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Chevy', 'Tesla', 'Nissan', 'BMW', 'Mercedes', 'Mercedes-Benz', 'Audi', 'Hyundai', 'Kia', 'Subaru', 'Lexus', 'Mazda', 'Volkswagen', 'VW', 'Jeep', 'Dodge', 'Ram', 'GMC', 'Acura', 'Infiniti', 'Volvo', 'Rivian', 'Lucid', 'Porsche'];
  for (const make of carMakes) {
    const re = new RegExp(`\\b${make}\\b`, 'i');
    if (re.test(text)) {
      out.make = make === 'Chevy' ? 'Chevrolet' : (make === 'VW' ? 'Volkswagen' : make);
      const lineWithMake = lines.find((l) => re.test(l));
      if (lineWithMake) {
        const cleaned = lineWithMake
          .replace(/\b(19\d{2}|20[0-3]\d)\b/g, '')
          .replace(re, '')
          .replace(/\b(?:vin|policy|expires|effective|coverage|driver|insured)\b.*$/i, '')
          .trim();
        if (cleaned.length >= 2 && cleaned.length <= 35) {
          out.model = cleaned;
        }
      }
      break;
    }
  }

  // Coverage type detection
  if (/gap/i.test(text)) {
    out.coverage = 'full_coverage_gap';
  } else if (/liability\s*only|minimum\s*liability/i.test(text)) {
    out.coverage = 'liability_only';
  } else if (/collision|comprehensive|full\s*coverage/i.test(text)) {
    out.coverage = 'full_coverage';
  }

  // Deductible
  const ded = text.match(/\b(?:comp(?:rehensive)?|coll(?:ision)?|deductible|ded)\b\s*[:\-]?\s*\$?\s?([0-9][0-9,]*)/i);
  if (ded) out.deductible = money(ded[1]);

  // Monthly Premium
  const prem = text.match(/\b(?:premium|monthly|amount\s*due)\b\s*[:\-]?\s*\$?\s?([0-9][0-9,]*)/i);
  if (prem) out.monthlyPremium = money(prem[1]);

  return out;
}

const looksLikeAutoFront = (t) => /policy\s*#|policy\s*number|insured|vin|effective|vehicle/i.test(t);

export async function scanAutoInsuranceFile(file, onProgress = () => {}) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  onProgress('Preparing document…');
  const pages = isPdf ? await pagesFromPdf(file) : await pagesFromImage(file);

  const { createWorker } = await import('tesseract.js');
  onProgress('Loading text reader…');
  const worker = await createWorker('eng');
  const texts = [];
  try {
    for (let i = 0; i < pages.length; i++) {
      onProgress(pages.length > 1 ? `Reading page ${i + 1} of ${pages.length}…` : 'Reading auto insurance document…');
      const p = pages[i];
      let t = p.embeddedText && p.embeddedText.trim().length > 40 ? p.embeddedText : '';
      if (!t) {
        const { data } = await worker.recognize(p.ocrCanvas);
        t = data?.text || '';
      }
      texts.push(t);
    }
  } finally {
    await worker.terminate();
  }

  let order = pages.map((_, i) => i);
  const frontIdx = texts.findIndex(looksLikeAutoFront);
  if (frontIdx > 0) order = [frontIdx, ...order.filter((i) => i !== frontIdx)];

  const orderedText = order.map((i) => texts[i]).join('\n');
  const extracted = parseAutoInsuranceText(orderedText);
  const cardImages = order.slice(0, 2).map((i) => pages[i].displayUrl);

  return { extracted, cardImages, text: orderedText };
}
