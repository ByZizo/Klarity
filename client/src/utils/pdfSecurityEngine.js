// ============================================================================
// KLARITY OFFLINE PDF SECURITY & SIGNING ENGINE (100% Local, Zero Network Calls)
// - SHA-256 Integrity Hashing & JSON Signature Receipts
// - QPDF WASM (Apache-2.0): AES-256 Encryption, Decryption, Linearization
// - PKCS#12 / X.509 & PDF PKCS#7/CMS Detached Digital Signatures (node-forge, BSD)
// - AES-256-GCM Encrypted Local Storage for Saved Certificates & Signing Receipts
// ============================================================================

import { PDFDocument, PDFName, PDFNumber, PDFString, PDFHexString, PDFArray } from 'pdf-lib';
import forge from 'node-forge';
import { secureStorage } from './securityCrypto.js';

const SAVED_CERTS_STORAGE_KEY = 'klarity_pdf_certs_v1';
const SAVED_RECEIPTS_STORAGE_KEY = 'klarity_pdf_receipts_v1';
const QPDF_WASM_URL = '/pdf-assets/qpdf/qpdf.wasm';

let qpdfModuleFactoryPromise = null;

async function getQpdfFactory() {
  if (!qpdfModuleFactoryPromise) {
    qpdfModuleFactoryPromise = import('@neslinesli93/qpdf-wasm').then(
      (mod) => mod.default || mod
    );
  }
  return qpdfModuleFactoryPromise;
}

/**
 * Compute lowercase hexadecimal SHA-256 hash using Web Crypto API.
 */
export async function computeSha256Hex(inputBytes) {
  const bytes = inputBytes instanceof Uint8Array ? inputBytes : new Uint8Array(inputBytes);
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    // Fallback to node-forge SHA-256 if subtle crypto is unavailable in a non-secure context
    const md = forge.md.sha256.create();
    md.update(forge.util.binary.raw.encode(bytes));
    return md.digest().toHex();
  }
  const digest = await cryptoObj.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a structured JSON signature receipt containing SHA-256 hashes and local device clock timestamps.
 */
export function buildSignatureReceipt({
  docName = 'Document.pdf',
  preRecordSha256,
  finalSha256,
  signers = [],
  completedFields = []
}) {
  const now = new Date();
  return {
    schema: 'klarity-signature-receipt-v1',
    documentName: docName,
    createdAtIso: now.toISOString(),
    createdAtLabel: `${now.toLocaleString()} (device clock time)`,
    timestampNote: 'All timestamps reflect local device clock time at signing.',
    preRecordSha256: preRecordSha256 || '',
    finalSha256: finalSha256 || '',
    signers: (signers || []).map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color || '#1B4B91'
    })),
    completedFields: (completedFields || []).map((f) => ({
      id: f.id,
      label: f.label || f.name || f.type,
      type: f.type,
      page: f.page || 1,
      signerName: f.signerName || 'Primary Signer',
      completedAtIso: f.completedAtIso || now.toISOString(),
      completedAtLabel: f.completedAtLabel || `${now.toLocaleString()} (device clock time)`
    }))
  };
}

/**
 * Verify a PDF's SHA-256 integrity against a Klarity JSON signature receipt.
 */
export async function verifyDocumentAgainstReceipt(pdfBytes, receipt) {
  if (!pdfBytes || !receipt) {
    return {
      verified: false,
      status: 'error',
      message: 'Both a PDF file and a signature receipt are required.'
    };
  }
  const currentSha256 = await computeSha256Hex(pdfBytes);
  const expectedFinal = (receipt.finalSha256 || '').trim().toLowerCase();
  const expectedPreRecord = (receipt.preRecordSha256 || '').trim().toLowerCase();

  if (expectedFinal && currentSha256 === expectedFinal) {
    return {
      verified: true,
      status: 'verified_final',
      currentSha256,
      expectedFinalSha256: expectedFinal,
      expectedPreRecordSha256: expectedPreRecord,
      message: 'Verified: SHA-256 matches the locked signature receipt byte-for-byte.'
    };
  }

  if (expectedPreRecord && currentSha256 === expectedPreRecord) {
    return {
      verified: true,
      status: 'verified_content',
      currentSha256,
      expectedFinalSha256: expectedFinal,
      expectedPreRecordSha256: expectedPreRecord,
      message: 'Verified: SHA-256 matches the pre-record signed document hash byte-for-byte.'
    };
  }

  return {
    verified: false,
    status: 'mismatch',
    currentSha256,
    expectedFinalSha256: expectedFinal,
    expectedPreRecordSha256: expectedPreRecord,
    message:
      'Warning: Document SHA-256 does not match the receipt. This file was modified or comes from a different export.'
  };
}

export async function saveSignatureReceiptRecord(receipt) {
  const existing = await secureStorage.getItem(SAVED_RECEIPTS_STORAGE_KEY, []);
  const list = Array.isArray(existing) ? existing : [];
  const next = [receipt, ...list].slice(0, 50);
  await secureStorage.setItem(SAVED_RECEIPTS_STORAGE_KEY, next);
  return next;
}

export async function loadSavedSignatureReceipts() {
  const list = await secureStorage.getItem(SAVED_RECEIPTS_STORAGE_KEY, []);
  return Array.isArray(list) ? list : [];
}

// ============================================================================
// QPDF WASM (AES-256 Encryption, Decryption, Linearization & Object Streams)
// ============================================================================

export async function runQpdfCommand(inputBytes, argsBuilder, options = {}) {
  const locatePath = options.wasmLocatePath || QPDF_WASM_URL;
  const createQpdf = await getQpdfFactory();
  const logs = [];
  const errors = [];

  const qpdf = await createQpdf({
    locateFile: () => locatePath,
    noInitialRun: true,
    print: (txt) => logs.push(txt),
    printErr: (txt) => errors.push(txt)
  });

  const inputPath = '/input.pdf';
  const outputPath = '/output.pdf';
  qpdf.FS.writeFile(inputPath, inputBytes instanceof Uint8Array ? inputBytes : new Uint8Array(inputBytes));

  const args = typeof argsBuilder === 'function' ? argsBuilder(inputPath, outputPath) : argsBuilder;
  const exitCode = qpdf.callMain(args);

  if (exitCode !== 0 && exitCode !== 3) {
    // QPDF returns exit code 3 for warnings when output was still written
    const errDetail = errors.filter(Boolean).join(' ') || `QPDF exited with code ${exitCode}`;
    throw new Error(errDetail);
  }

  try {
    const outBytes = qpdf.FS.readFile(outputPath);
    if (!outBytes || outBytes.length === 0) {
      throw new Error(errors.filter(Boolean).join(' ') || 'QPDF produced an empty PDF.');
    }
    return new Uint8Array(outBytes);
  } catch (readErr) {
    const errDetail = errors.filter(Boolean).join(' ') || readErr.message || 'QPDF failed to produce output.';
    throw new Error(errDetail);
  }
}

export async function encryptPdfWithQpdf(
  pdfBytes,
  {
    userPassword = '',
    ownerPassword = '',
    allowPrint = true,
    allowModify = false,
    allowExtract = false,
    wasmLocatePath
  } = {}
) {
  const effectiveUser = String(userPassword || '');
  const effectiveOwner = String(ownerPassword || effectiveUser || '');
  if (!effectiveUser && !effectiveOwner) {
    throw new Error('Provide at least an open password or an owner permissions password.');
  }
  return runQpdfCommand(
    pdfBytes,
    (inputPath, outputPath) => [
      inputPath,
      '--encrypt',
      effectiveUser,
      effectiveOwner,
      '256',
      `--print=${allowPrint ? 'full' : 'none'}`,
      `--modify=${allowModify ? 'all' : 'none'}`,
      `--extract=${allowExtract ? 'y' : 'n'}`,
      '--',
      outputPath
    ],
    { wasmLocatePath }
  );
}

export async function decryptPdfWithQpdf(pdfBytes, password = '', options = {}) {
  return runQpdfCommand(
    pdfBytes,
    (inputPath, outputPath) => [
      `--password=${String(password || '')}`,
      '--decrypt',
      inputPath,
      outputPath
    ],
    options
  );
}

export async function optimizeAndLinearizePdfWithQpdf(pdfBytes, options = {}) {
  return runQpdfCommand(
    pdfBytes,
    (inputPath, outputPath) => [
      inputPath,
      '--linearize',
      '--object-streams=generate',
      outputPath
    ],
    options
  );
}

export function inspectPdfEncryptionInfo(rawBytes) {
  if (!rawBytes || rawBytes.length === 0) return { isEncrypted: false };
  const sampleLen = Math.min(rawBytes.length, 65536);
  const headStr = new TextDecoder('latin1').decode(rawBytes.subarray(0, sampleLen));
  const tailStr =
    rawBytes.length > sampleLen
      ? new TextDecoder('latin1').decode(rawBytes.subarray(rawBytes.length - sampleLen))
      : '';
  const combined = headStr + '\n' + tailStr;
  const isEncrypted = /\/Encrypt\s+\d+\s+\d+\s+R\b|\/Filter\s*\/Standard\b/.test(combined);
  return { isEncrypted };
}

// ============================================================================
// CRYPTOGRAPHIC DIGITAL SIGNATURES (PKCS#12 + CMS / PKCS#7 Detached)
// ============================================================================

function certAttributesToObj(attrs) {
  const out = {};
  for (const attr of attrs || []) {
    const key = attr.shortName || attr.name;
    if (key) out[key] = attr.value;
  }
  return out;
}

export function generateSelfSignedP12({
  commonName = 'Klarity User',
  organization = 'Klarity Local Identity',
  email = '',
  passphrase = '',
  validityYears = 5
} = {}) {
  const cleanCn = String(commonName || '').trim() || 'Klarity User';
  const keys = forge.pki.rsa.generateKeyPair({ bits: 2048 });
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = Array.from(forge.random.getBytesSync(12), (c) =>
    c.charCodeAt(0).toString(16).padStart(2, '0')
  ).join('');

  const now = new Date();
  const validTo = new Date(now.getTime());
  validTo.setFullYear(now.getFullYear() + validityYears);
  cert.validity.notBefore = now;
  cert.validity.notAfter = validTo;

  const attrs = [{ name: 'commonName', value: cleanCn }];
  if (organization) attrs.push({ name: 'organizationName', value: String(organization).trim() });
  if (email) attrs.push({ name: 'emailAddress', value: String(email).trim() });

  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    {
      name: 'keyUsage',
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true
    },
    { name: 'subjectKeyIdentifier' }
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], String(passphrase || ''), {
    algorithm: '3des',
    friendlyName: cleanCn
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  const p12Base64 = forge.util.encode64(p12Der);

  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const md = forge.md.sha256.create();
  md.update(certDer);

  return {
    id: `cert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    commonName: cleanCn,
    organization: String(organization || '').trim(),
    email: String(email || '').trim(),
    isSelfSigned: true,
    hasPassphrase: Boolean(passphrase),
    validFrom: now.toISOString(),
    validTo: validTo.toISOString(),
    fingerprintSha256: md.digest().toHex(),
    p12Base64
  };
}

export function inspectP12Certificate(p12Base64, passphrase = '') {
  const derBytes = forge.util.decode64(p12Base64);
  const p12Asn1 = forge.asn1.fromDer(derBytes);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, String(passphrase || ''));

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
    forge.pki.oids.pkcs8ShroudedKeyBag
  ] || p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || [];

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  if (keyBags.length === 0 || certBags.length === 0) {
    throw new Error('Certificate archive does not contain both a private key and X.509 certificate.');
  }

  const privateKey = keyBags[0].key;
  const certs = certBags.map((b) => b.cert).filter(Boolean);
  const leafCert = certs[0];

  const subject = certAttributesToObj(leafCert.subject.attributes);
  const issuer = certAttributesToObj(leafCert.issuer.attributes);
  const isSelfSigned =
    JSON.stringify(leafCert.subject.attributes) === JSON.stringify(leafCert.issuer.attributes);

  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(leafCert)).getBytes();
  const md = forge.md.sha256.create();
  md.update(certDer);

  return {
    privateKey,
    leafCert,
    certs,
    commonName: subject.CN || subject.O || 'Certificate Holder',
    organization: subject.O || '',
    email: subject.E || subject.emailAddress || '',
    issuerName: issuer.CN || issuer.O || 'Unknown Issuer',
    isSelfSigned,
    validFrom: leafCert.validity.notBefore.toISOString(),
    validTo: leafCert.validity.notAfter.toISOString(),
    fingerprintSha256: md.digest().toHex()
  };
}

export async function loadSavedCertificates() {
  const saved = await secureStorage.getItem(SAVED_CERTS_STORAGE_KEY, []);
  return Array.isArray(saved) ? saved : [];
}

export async function saveCertificateRecord(certRecord) {
  const existing = await loadSavedCertificates();
  const next = [certRecord, ...existing.filter((c) => c.id !== certRecord.id)];
  await secureStorage.setItem(SAVED_CERTS_STORAGE_KEY, next);
  return next;
}

export async function deleteCertificateRecord(certId) {
  const existing = await loadSavedCertificates();
  const next = existing.filter((c) => c.id !== certId);
  await secureStorage.setItem(SAVED_CERTS_STORAGE_KEY, next);
  return next;
}

function uint8IndexOfAscii(haystack, needle, fromIndex = 0) {
  const target = new TextEncoder().encode(needle);
  outer: for (let i = fromIndex; i <= haystack.length - target.length; i++) {
    for (let j = 0; j < target.length; j++) {
      if (haystack[i + j] !== target[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/**
 * Cryptographically sign a PDF using a PKCS#12 certificate with a detached PKCS#7 / CMS signature.
 * Follows standard PDF ByteRange + Adobe.PPKLite / adbe.pkcs7.detached structure.
 */
export async function signPdfWithCertificate(
  pdfBytes,
  {
    p12Base64,
    passphrase = '',
    reason = 'Approved and digitally signed in Klarity',
    location = 'Local Device',
    contactInfo = ''
  } = {}
) {
  if (!p12Base64) throw new Error('A PKCS#12 (.p12/.pfx) certificate is required.');
  const { privateKey, leafCert, certs, commonName, isSelfSigned } = inspectP12Certificate(
    p12Base64,
    passphrase
  );

  const SIGNATURE_HEX_RESERVE = 16384; // 8192 bytes reserved for DER CMS + cert chain
  const BYTERANGE_PLACEHOLDER = '**********';

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  if (pages.length === 0) throw new Error('PDF has no pages to sign.');
  const firstPage = pages[0];

  // Build ByteRange array placeholder: [0, **********, **********, **********]
  const byteRangeArr = PDFArray.withContext(pdfDoc.context);
  byteRangeArr.push(PDFNumber.of(0));
  const phName = PDFName.of(BYTERANGE_PLACEHOLDER);
  byteRangeArr.push(phName);
  byteRangeArr.push(phName);
  byteRangeArr.push(phName);

  const zeroHexContents = '0'.repeat(SIGNATURE_HEX_RESERVE);
  const sigDict = pdfDoc.context.obj({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: 'adbe.pkcs7.detached',
    ByteRange: byteRangeArr,
    Contents: PDFHexString.of(zeroHexContents),
    Reason: PDFString.of(String(reason || 'Digitally Signed')),
    Location: PDFString.of(String(location || 'Local Device')),
    Name: PDFString.of(commonName),
    M: PDFString.fromDate(new Date()),
    ...(contactInfo ? { ContactInfo: PDFString.of(String(contactInfo)) } : {})
  });
  const sigRef = pdfDoc.context.register(sigDict);

  // Invisible / metadata signature annotation widget on page 1 referencing /V sigRef
  const widgetDict = pdfDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Widget',
    FT: 'Sig',
    Rect: [0, 0, 0, 0],
    V: sigRef,
    T: PDFString.of(`KlarityDigitalSignature_${Date.now()}`),
    F: 4,
    P: firstPage.ref
  });
  const widgetRef = pdfDoc.context.register(widgetDict);

  const annots = firstPage.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
  if (annots) {
    annots.push(widgetRef);
  } else {
    firstPage.node.set(PDFName.of('Annots'), pdfDoc.context.obj([widgetRef]));
  }

  const catalog = pdfDoc.catalog;
  let acroForm = catalog.lookupMaybe(PDFName.of('AcroForm'));
  if (!acroForm) {
    acroForm = pdfDoc.context.obj({ Fields: [widgetRef], SigFlags: 3 });
    catalog.set(PDFName.of('AcroForm'), pdfDoc.context.register(acroForm));
  } else {
    const fields = acroForm.lookupMaybe(PDFName.of('Fields'), PDFArray);
    if (fields) fields.push(widgetRef);
    else acroForm.set(PDFName.of('Fields'), pdfDoc.context.obj([widgetRef]));
    acroForm.set(PDFName.of('SigFlags'), PDFNumber.of(3));
  }

  // Must disable object streams so /ByteRange and /Contents sit in plain PDF syntax
  const pdfWithPlaceholders = await pdfDoc.save({ useObjectStreams: false });

  // Locate the placeholder /ByteRange and /Contents <0000...>
  const placeholderNeedle = `/ByteRange[0/${BYTERANGE_PLACEHOLDER}/${BYTERANGE_PLACEHOLDER}/${BYTERANGE_PLACEHOLDER}]`;
  let byteRangePos = uint8IndexOfAscii(pdfWithPlaceholders, placeholderNeedle);
  let actualNeedle = placeholderNeedle;
  if (byteRangePos === -1) {
    // Try spaced variant
    const spaced = `/ByteRange [ 0 /${BYTERANGE_PLACEHOLDER} /${BYTERANGE_PLACEHOLDER} /${BYTERANGE_PLACEHOLDER} ]`;
    byteRangePos = uint8IndexOfAscii(pdfWithPlaceholders, spaced);
    actualNeedle = spaced;
  }
  if (byteRangePos === -1) {
    throw new Error('Could not locate signature ByteRange placeholder in serialized PDF.');
  }

  const contentsKeyPos = uint8IndexOfAscii(pdfWithPlaceholders, '/Contents', byteRangePos);
  const ltPos = pdfWithPlaceholders.indexOf(0x3c, contentsKeyPos); // '<'
  const gtPos = pdfWithPlaceholders.indexOf(0x3e, ltPos); // '>'
  if (contentsKeyPos === -1 || ltPos === -1 || gtPos === -1) {
    throw new Error('Could not locate signature Contents hex block.');
  }

  const byteRange = [0, ltPos, gtPos + 1, pdfWithPlaceholders.length - (gtPos + 1)];
  const replacementByteRange = `[${byteRange.join(' ')}]`.padEnd(actualNeedle.length - 10, ' ');
  const finalByteRangeStr = `/ByteRange ${`[${byteRange.join(' ')}]`.padEnd(actualNeedle.length - 11, ' ')}`;

  const patched = new Uint8Array(pdfWithPlaceholders);
  const patchBytes = new TextEncoder().encode(
    finalByteRangeStr.length === actualNeedle.length
      ? finalByteRangeStr
      : `/ByteRange${replacementByteRange}`.padEnd(actualNeedle.length, ' ')
  );
  patched.set(patchBytes, byteRangePos);

  // Extract signed byte slices
  const slice1 = patched.subarray(byteRange[0], byteRange[0] + byteRange[1]);
  const slice2 = patched.subarray(byteRange[2], byteRange[2] + byteRange[3]);
  const signedCombined = new Uint8Array(slice1.length + slice2.length);
  signedCombined.set(slice1, 0);
  signedCombined.set(slice2, slice1.length);

  // Build PKCS#7 / CMS SignedData
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(signedCombined);
  for (const c of certs) {
    p7.addCertificate(c);
  }
  p7.addSigner({
    key: privateKey,
    certificate: leafCert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() }
    ]
  });
  p7.sign({ detached: true });

  const derBytes = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const hexSig = forge.util.bytesToHex(derBytes).toUpperCase();
  const availableHexLen = gtPos - ltPos - 1;
  if (hexSig.length > availableHexLen) {
    throw new Error('Signature certificate chain exceeds reserved ByteRange buffer size.');
  }

  const paddedHex = hexSig.padEnd(availableHexLen, '0');
  patched.set(new TextEncoder().encode(paddedHex), ltPos + 1);

  return {
    bytes: patched,
    signerName: commonName,
    isSelfSigned
  };
}

function sliceFirstAsn1Der(rawDerBytes) {
  if (!rawDerBytes || rawDerBytes.length < 4 || rawDerBytes.charCodeAt(0) !== 0x30) {
    return rawDerBytes.replace(/\x00+$/, '');
  }
  const lenByte = rawDerBytes.charCodeAt(1);
  if ((lenByte & 0x80) === 0) {
    return rawDerBytes.slice(0, 2 + lenByte);
  }
  const numBytes = lenByte & 0x7f;
  if (numBytes === 0 || numBytes > 4 || 2 + numBytes > rawDerBytes.length) {
    return rawDerBytes.replace(/\x00+$/, '');
  }
  let contentLen = 0;
  for (let i = 0; i < numBytes; i++) {
    contentLen = (contentLen << 8) | rawDerBytes.charCodeAt(2 + i);
  }
  const totalLen = 2 + numBytes + contentLen;
  return totalLen <= rawDerBytes.length ? rawDerBytes.slice(0, totalLen) : rawDerBytes;
}

/**
 * Parse and inspect PDF digital signatures embedded in raw PDF bytes.
 */
export async function inspectPdfDigitalSignatures(pdfBytes) {
  if (!pdfBytes || pdfBytes.length === 0) return [];
  const rawStr = new TextDecoder('latin1').decode(pdfBytes);
  const sigMatches = [];
  const sigRegex = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\][\s\S]{0,600}?\/Contents\s*<([0-9a-fA-F]+)>/g;
  let m;

  while ((m = sigRegex.exec(rawStr)) !== null) {
    const byteRange = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), parseInt(m[4], 10)];
    const hexContents = m[5];
    const blockStart = Math.max(0, m.index - 350);
    const blockEnd = Math.min(rawStr.length, m.index + 800);
    const nearby = rawStr.slice(blockStart, blockEnd);

    const reasonMatch = nearby.match(/\/Reason\s*\(([^)]*)\)/);
    const nameMatch = nearby.match(/\/Name\s*\(([^)]*)\)/);
    const locationMatch = nearby.match(/\/Location\s*\(([^)]*)\)/);

    try {
      const byteLen = Math.floor(hexContents.length / 2);
      const paddedDer = forge.util.hexToBytes(hexContents.slice(0, byteLen * 2));
      const trimmedDer = sliceFirstAsn1Der(paddedDer);
      const asn1 = forge.asn1.fromDer(trimmedDer);
      const p7 = forge.pkcs7.messageFromAsn1(asn1);

      const signerCert = p7.certificates?.[0] || null;
      const subject = signerCert ? certAttributesToObj(signerCert.subject.attributes) : {};
      const issuer = signerCert ? certAttributesToObj(signerCert.issuer.attributes) : {};
      const isSelfSigned = signerCert
        ? JSON.stringify(signerCert.subject.attributes) === JSON.stringify(signerCert.issuer.attributes)
        : true;

      // Verify byteRange digest against signedAttributes messageDigest if present
      let hashIntact = false;
      try {
        const s1 = pdfBytes.subarray(byteRange[0], byteRange[0] + byteRange[1]);
        const s2 = pdfBytes.subarray(byteRange[2], byteRange[2] + byteRange[3]);
        const combined = new Uint8Array(s1.length + s2.length);
        combined.set(s1, 0);
        combined.set(s2, s1.length);

        const actualSha256 = await computeSha256Hex(combined);
        const signerInfo = p7.rawCapture?.authenticatedAttributes || [];
        let embeddedDigestHex = '';
        for (const attr of signerInfo) {
          // OID 1.2.840.113549.1.9.4 is messageDigest
          const oid = attr.value?.[0]?.value ? forge.asn1.derToOid(attr.value[0].value) : '';
          if (oid === '1.2.840.113549.1.9.4') {
            const setNode = attr.value?.[1];
            const octet = setNode?.value?.[0]?.value;
            if (typeof octet === 'string') {
              embeddedDigestHex = forge.util.bytesToHex(octet).toLowerCase();
            }
          }
        }
        if (embeddedDigestHex) {
          hashIntact = embeddedDigestHex === actualSha256;
        }
      } catch {}

      sigMatches.push({
        id: `sig_inspect_${sigMatches.length}`,
        signerName: subject.CN || nameMatch?.[1] || 'Unknown Signer',
        organization: subject.O || '',
        email: subject.E || subject.emailAddress || '',
        issuerName: issuer.CN || issuer.O || 'Unknown Authority',
        isSelfSigned,
        trustWarning: isSelfSigned
          ? 'Self-signed certificate — not issued by a trusted authority; other PDF viewers may show a warning.'
          : '',
        reason: reasonMatch?.[1] || '',
        location: locationMatch?.[1] || '',
        validFrom: signerCert?.validity?.notBefore?.toISOString?.() || '',
        validTo: signerCert?.validity?.notAfter?.toISOString?.() || '',
        byteRange,
        hashIntact
      });
    } catch {
      sigMatches.push({
        id: `sig_inspect_${sigMatches.length}`,
        signerName: nameMatch?.[1] || 'Signed Certificate',
        isSelfSigned: true,
        trustWarning:
          'Unable to verify certificate chain locally — other PDF viewers may show a warning.',
        reason: reasonMatch?.[1] || '',
        location: locationMatch?.[1] || '',
        byteRange,
        hashIntact: false
      });
    }
  }

  return sigMatches;
}
