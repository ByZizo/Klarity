import React, { useState, useRef } from 'react';
import {
  X,
  Check,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  FileCheck,
  Plus,
  Trash2,
  ExternalLink,
  Upload,
  Zap,
  Users,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../ui';
import {
  generateSelfSignedP12,
  inspectP12Certificate,
  saveCertificateRecord,
  deleteCertificateRecord,
  verifyDocumentAgainstReceipt,
  computeSha256Hex
} from '../../utils/pdfSecurityEngine';

export function PageSetupModal({ isOpen, onClose, pageSetup, onSavePageSetup }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(pageSetup || {})));
  const wmImgInputRef = useRef(null);

  if (!isOpen) return null;

  const hf = draft.headerFooter || {};
  const bt = draft.bates || {};
  const wm = draft.watermark || {};

  const updateSection = (sec, patch) => {
    setDraft((prev) => ({ ...prev, [sec]: { ...(prev[sec] || {}), ...patch } }));
  };

  return (
    <div className="fixed inset-0 z-[135] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4" role="dialog" aria-modal="true" aria-label="Headers, Bates, and Watermark Setup">
      <div className="bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
          <h3 className="text-[16px] font-semibold">Page Numbers, Headers/Footers, Bates &amp; Watermark</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-5 text-[14px]">
          {/* Headers & Footers */}
          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(hf.enabled)}
                  onChange={(e) => updateSection('headerFooter', { enabled: e.target.checked })}
                />
                <span>Headers, Footers &amp; Page Numbers</span>
              </label>
              <span className="text-[12px] text-[var(--muted)]">
                Tokens: {'{page}'}, {'{total}'}, {'{date}'}, {'{file}'}
              </span>
            </div>
            {hf.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="text" placeholder="Header Left" value={hf.headerLeft || ''} onChange={(e) => updateSection('headerFooter', { headerLeft: e.target.value })} className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]" />
                <input type="text" placeholder="Header Center" value={hf.headerCenter || ''} onChange={(e) => updateSection('headerFooter', { headerCenter: e.target.value })} className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]" />
                <input type="text" placeholder="Header Right" value={hf.headerRight || ''} onChange={(e) => updateSection('headerFooter', { headerRight: e.target.value })} className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]" />
                <input type="text" placeholder="Footer Left" value={hf.footerLeft || ''} onChange={(e) => updateSection('headerFooter', { footerLeft: e.target.value })} className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]" />
                <input type="text" placeholder="Footer Center (e.g. Page {page} of {total})" value={hf.footerCenter ?? 'Page {page} of {total}'} onChange={(e) => updateSection('headerFooter', { footerCenter: e.target.value })} className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]" />
                <input type="text" placeholder="Footer Right" value={hf.footerRight || ''} onChange={(e) => updateSection('headerFooter', { footerRight: e.target.value })} className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]" />
                <input type="text" placeholder="Page range (all or 1-3,5)" value={hf.pageRange || ''} onChange={(e) => updateSection('headerFooter', { pageRange: e.target.value })} className="sm:col-span-2 px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]" />
                <input type="color" value={hf.color || '#334155'} onChange={(e) => updateSection('headerFooter', { color: e.target.value })} className="w-full h-9 rounded-lg border border-[var(--line)]" />
              </div>
            )}
          </div>

          {/* Bates Numbering */}
          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-3">
            <label className="flex items-center gap-2 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(bt.enabled)}
                onChange={(e) => updateSection('bates', { enabled: e.target.checked })}
              />
              <span>Bates Numbering</span>
            </label>
            {bt.enabled && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input type="text" placeholder="Prefix (e.g. EX-)" value={bt.prefix || ''} onChange={(e) => updateSection('bates', { prefix: e.target.value })} className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]" />
                <input type="number" placeholder="Start #" min={1} value={bt.startNumber || 1} onChange={(e) => updateSection('bates', { startNumber: Number(e.target.value) || 1 })} className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]" />
                <input type="number" placeholder="Digits" min={2} max={10} value={bt.digits || 6} onChange={(e) => updateSection('bates', { digits: Number(e.target.value) || 6 })} className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]" />
                <select value={bt.position || 'bottom-right'} onChange={(e) => updateSection('bates', { position: e.target.value })} className="px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]">
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>
            )}
          </div>

          {/* Watermark */}
          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-3">
            <label className="flex items-center gap-2 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(wm.enabled)}
                onChange={(e) => updateSection('watermark', { enabled: e.target.checked })}
              />
              <span>Watermark (Text or Image)</span>
            </label>
            {wm.enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input type="text" placeholder="Watermark text (e.g. CONFIDENTIAL)" value={wm.text || ''} onChange={(e) => updateSection('watermark', { text: e.target.value })} className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]" />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => wmImgInputRef.current?.click()} className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px] cursor-pointer">
                    {wm.imageDataUrl ? 'Change Image' : 'Or Pick Image'}
                  </button>
                  {wm.imageDataUrl && (
                    <button type="button" onClick={() => updateSection('watermark', { imageDataUrl: '' })} className="text-[12px] text-rose-500 cursor-pointer">
                      Clear
                    </button>
                  )}
                  <input
                    ref={wmImgInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const r = new FileReader();
                      r.onload = (ev) => updateSection('watermark', { imageDataUrl: ev.target.result });
                      r.readAsDataURL(f);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </div>
                <label className="text-[12px] text-[var(--muted)] flex items-center gap-2">
                  <span>Opacity ({Math.round((wm.opacity ?? 0.22) * 100)}%)</span>
                  <input type="range" min={0.05} max={0.8} step={0.05} value={wm.opacity ?? 0.22} onChange={(e) => updateSection('watermark', { opacity: Number(e.target.value) })} className="flex-1" />
                </label>
                <input type="text" placeholder="Page range (all or 1-2)" value={wm.pageRange || ''} onChange={(e) => updateSection('watermark', { pageRange: e.target.value })} className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]" />
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-[var(--line)] bg-[var(--surface-subtle)] flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={() => { onSavePageSetup(draft); onClose(); }}>
            <Check className="w-4 h-4 mr-1" /> Apply Non-Destructively
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ApplyRedactionsModal({ isOpen, onClose, redactionsSummary = [], isApplying, onConfirmApply }) {
  const [removeMetadata, setRemoveMetadata] = useState(true);
  if (!isOpen) return null;

  const totalCount = redactionsSummary.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="fixed inset-0 z-[135] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4" role="dialog" aria-modal="true" aria-label="Apply Permanent Redactions">
      <div className="bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <h3 className="text-[16px] font-semibold">Apply Secure Redactions</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 text-[14px]">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[var(--ink)] text-[13px] leading-relaxed">
            <strong>Permanent Removal:</strong> Applying redactions rasterizes each affected page at 216 DPI with redaction boxes burned in, destroying all underlying text, vector paths, images, and overlapping annotations. After saving, this cannot be undone.
          </div>

          <div className="border border-[var(--line)] rounded-xl p-3 bg-[var(--surface-subtle)] max-h-40 overflow-y-auto">
            <div className="text-[12px] font-semibold text-[var(--muted)] mb-1.5">
              Items queued for permanent removal ({totalCount} total):
            </div>
            {redactionsSummary.map((item) => (
              <div key={item.pageNumber} className="flex items-center justify-between text-[13px] py-1 border-b border-[var(--line)] last:border-b-0">
                <span>Page {item.pageNumber}</span>
                <span className="font-semibold text-rose-500">{item.count} redaction box{item.count > 1 ? 'es' : ''}</span>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-[13px] font-medium cursor-pointer">
            <input type="checkbox" checked={removeMetadata} onChange={(e) => setRemoveMetadata(e.target.checked)} />
            <span>Remove document metadata (Title, Author, Subject, XMP)</span>
          </label>
        </div>

        <div className="px-5 py-3.5 border-t border-[var(--line)] bg-[var(--surface-subtle)] flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isApplying}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={() => onConfirmApply(removeMetadata)} disabled={isApplying || totalCount === 0}>
            {isApplying ? 'Applying & Verifying...' : 'Apply & Verify Redactions'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SecurityEncryptionModal({
  isOpen,
  onClose,
  isEncryptedDocument,
  onEncryptPdf,
  onDecryptPdf,
  onOptimizePdf,
  isBusy
}) {
  const [userPassword, setUserPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [allowPrint, setAllowPrint] = useState(true);
  const [allowModify, setAllowModify] = useState(false);
  const [allowExtract, setAllowExtract] = useState(false);
  const [decryptPassword, setDecryptPassword] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[135] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4" role="dialog" aria-modal="true" aria-label="PDF Encryption and Optimization">
      <div className="bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-[var(--brand)]" />
            <h3 className="text-[16px] font-semibold">Encryption &amp; Optimization (QPDF WASM)</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 text-[14px] overflow-y-auto max-h-[75vh]">
          {isEncryptedDocument && (
            <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-300">
                <Unlock className="w-4 h-4" />
                <span>Decrypt / Remove Password</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={decryptPassword}
                  onChange={(e) => setDecryptPassword(e.target.value)}
                  placeholder="Current document password"
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]"
                />
                <Button variant="secondary" size="sm" disabled={isBusy} onClick={() => onDecryptPdf(decryptPassword)}>
                  Decrypt
                </Button>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-3">
            <h4 className="font-semibold text-[14px]">Apply 256-bit AES Password Encryption</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[12px] text-[var(--muted)] block mb-1">Open Password</label>
                <input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="Required to open PDF" className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] text-[var(--muted)] block mb-1">Permissions Password</label>
                <input type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="Optional owner password" className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[13px]" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-[13px]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={allowPrint} onChange={(e) => setAllowPrint(e.target.checked)} />
                <span>Allow printing</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={allowModify} onChange={(e) => setAllowModify(e.target.checked)} />
                <span>Allow editing</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={allowExtract} onChange={(e) => setAllowExtract(e.target.checked)} />
                <span>Allow text copy</span>
              </label>
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={isBusy || (!userPassword && !ownerPassword)}
              onClick={() =>
                onEncryptPdf({
                  userPassword,
                  ownerPassword: ownerPassword || userPassword,
                  allowPrint,
                  allowModify,
                  allowExtract
                })
              }
            >
              Encrypt &amp; Download Protected PDF
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] flex items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-[14px]">Optimize &amp; Linearize</h4>
              <p className="text-[12px] text-[var(--muted)]">
                Compress with object streams &amp; linearize for fast page streaming via QPDF.
              </p>
            </div>
            <Button variant="secondary" size="sm" disabled={isBusy} onClick={onOptimizePdf}>
              <Zap className="w-4 h-4 mr-1" /> Optimize
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DigitalSignaturesModal({
  isOpen,
  onClose,
  certificates = [],
  onRefreshCertificates,
  embeddedSignatures = [],
  rawPdfBytes,
  onSignWithCertificate,
  isBusy
}) {
  const [commonName, setCommonName] = useState('');
  const [org, setOrg] = useState('');
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [selectedCertId, setSelectedCertId] = useState(certificates[0]?.id || '');
  const [signPassphrase, setSignPassphrase] = useState('');
  const [signReason, setSignReason] = useState('Approved and signed locally in Klarity');
  const [verifyResult, setVerifyResult] = useState(null);
  const [pendingP12Import, setPendingP12Import] = useState(null);
  const [p12ImportPassphrase, setP12ImportPassphrase] = useState('');
  const [p12ImportError, setP12ImportError] = useState('');
  const p12ImportRef = useRef(null);
  const receiptVerifyRef = useRef(null);

  if (!isOpen) return null;

  const handleCreateCert = async (e) => {
    e.preventDefault();
    if (!commonName.trim()) return;
    const record = generateSelfSignedP12({
      commonName: commonName.trim(),
      organization: org.trim(),
      email: email.trim(),
      passphrase
    });
    const next = await saveCertificateRecord(record);
    onRefreshCertificates(next);
    setSelectedCertId(record.id);
    setCommonName('');
    setOrg('');
    setEmail('');
    setPassphrase('');
  };

  const finalizeP12Import = async (p12Base64, pass) => {
    try {
      const info = inspectP12Certificate(p12Base64, pass);
      const next = await saveCertificateRecord({
        id: `cert_${Date.now()}`,
        commonName: info.commonName,
        organization: info.organization,
        email: info.email,
        isSelfSigned: info.isSelfSigned,
        hasPassphrase: Boolean(pass),
        validFrom: info.validFrom,
        validTo: info.validTo,
        fingerprintSha256: info.fingerprintSha256,
        p12Base64
      });
      onRefreshCertificates(next);
      setPendingP12Import(null);
      setP12ImportPassphrase('');
      setP12ImportError('');
    } catch (err) {
      setP12ImportError(err.message || 'Unable to parse PKCS#12 file with that passphrase.');
    }
  };

  const handleImportP12 = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const bytes = new Uint8Array(ev.target.result);
      let b64 = '';
      for (let i = 0; i < bytes.length; i++) b64 += String.fromCharCode(bytes[i]);
      const p12Base64 = btoa(b64);
      setP12ImportError('');
      setP12ImportPassphrase('');
      setPendingP12Import({ fileName: file.name, p12Base64 });
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleVerifyReceiptFile = (e) => {
    const file = e.target.files?.[0];
    if (!file || !rawPdfBytes) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const receipt = JSON.parse(ev.target.result);
        const res = await verifyDocumentAgainstReceipt(rawPdfBytes, receipt);
        setVerifyResult(res);
      } catch {
        setVerifyResult({ verified: false, message: 'Invalid .json signature receipt file.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleComputeCurrentHash = async () => {
    if (!rawPdfBytes) return;
    const sha = await computeSha256Hex(rawPdfBytes);
    setVerifyResult({
      verified: true,
      message: `Current document SHA-256 hash: ${sha}`
    });
  };

  return (
    <div className="fixed inset-0 z-[135] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4" role="dialog" aria-modal="true" aria-label="Digital Signatures and Verification">
      <div className="bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-[var(--brand)]" />
            <h3 className="text-[16px] font-semibold">Digital Signatures (PKCS#7/CMS) &amp; Verification</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-5 text-[13px]">
          {/* Embedded Signatures Inspection Panel */}
          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-2">
            <h4 className="font-semibold text-[14px]">Signatures Embedded in This Document ({embeddedSignatures.length})</h4>
            {embeddedSignatures.length === 0 ? (
              <p className="text-[var(--muted)]">No cryptographic PKCS#7 digital signatures found in this PDF.</p>
            ) : (
              embeddedSignatures.map((sig) => (
                <div key={sig.id} className="p-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex flex-col gap-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span>{sig.signerName}</span>
                    <span className={sig.hashIntact ? 'text-emerald-500' : 'text-amber-500'}>
                      {sig.hashIntact ? 'ByteRange Digest Intact' : 'Unverified Digest'}
                    </span>
                  </div>
                  {sig.reason && <div className="text-[12px] text-[var(--muted)]">Reason: {sig.reason}</div>}
                  {sig.trustWarning && (
                    <div className="mt-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[12px] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{sig.trustWarning}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Sign PDF with Certificate */}
          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-[14px]">Sign Document with Certificate (.p12 / .pfx)</h4>
              <Button variant="secondary" size="sm" onClick={() => p12ImportRef.current?.click()}>
                <Upload className="w-3.5 h-3.5 mr-1" /> Import .p12/.pfx
              </Button>
              <input ref={p12ImportRef} type="file" accept=".p12,.pfx" onChange={handleImportP12} className="hidden" />
            </div>

            {pendingP12Import && (
              <div className="p-3 rounded-xl border border-[var(--brand)]/40 bg-[var(--surface)] flex flex-col gap-2">
                <div className="text-[12px] font-semibold">
                  Import Certificate: <span className="text-[var(--brand)]">{pendingP12Import.fileName}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={p12ImportPassphrase}
                    onChange={(e) => setP12ImportPassphrase(e.target.value)}
                    placeholder="Certificate passphrase (leave blank if none)"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)]"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => finalizeP12Import(pendingP12Import.p12Base64, p12ImportPassphrase)}
                  >
                    Import
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPendingP12Import(null);
                      setP12ImportError('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {p12ImportError && <p className="text-[12px] text-rose-500">{p12ImportError}</p>}
              </div>
            )}

            {certificates.length > 0 && (
              <div className="flex flex-col gap-2">
                <select
                  value={selectedCertId || certificates[0]?.id}
                  onChange={(e) => setSelectedCertId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface)]"
                >
                  {certificates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.commonName} {c.isSelfSigned ? '(Self-signed — not CA trusted)' : ''}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input type="password" value={signPassphrase} onChange={(e) => setSignPassphrase(e.target.value)} placeholder="Certificate passphrase (if any)" className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface)]" />
                  <input type="text" value={signReason} onChange={(e) => setSignReason(e.target.value)} placeholder="Reason for signing" className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface)]" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const targetId = selectedCertId || certificates[0]?.id;
                      const next = await deleteCertificateRecord(targetId);
                      onRefreshCertificates(next);
                    }}
                    className="text-rose-500 text-[12px] hover:underline cursor-pointer"
                  >
                    Delete selected certificate
                  </button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => {
                      const cert = certificates.find((c) => c.id === (selectedCertId || certificates[0]?.id));
                      if (cert) onSignWithCertificate(cert, signPassphrase, signReason);
                    }}
                  >
                    Sign PDF Now
                  </Button>
                </div>
              </div>
            )}

            {/* Create New Self-Signed Certificate */}
            <form onSubmit={handleCreateCert} className="pt-3 border-t border-[var(--line)] flex flex-col gap-2">
              <div className="font-semibold text-[13px]">Create Self-Signed Certificate</div>
              <p className="text-[12px] text-[var(--muted)]">
                Self-signed certificates are generated 100% locally and are not issued by a trusted authority; other PDF viewers may show a warning.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="text" required value={commonName} onChange={(e) => setCommonName(e.target.value)} placeholder="Full Name (CN)" className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)]" />
                <input type="text" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Organization (optional)" className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)]" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)]" />
                <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="Protect key with passphrase" className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)]" />
              </div>
              <Button type="submit" variant="secondary" size="sm">Create Self-Signed Certificate</Button>
            </form>
          </div>

          {/* SHA-256 Receipt Verification */}
          <div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-semibold text-[14px]">Verify Signature Receipt &amp; File Hash</h4>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleComputeCurrentHash}>Check SHA-256</Button>
                <Button variant="primary" size="sm" onClick={() => receiptVerifyRef.current?.click()}>
                  Verify .json Receipt
                </Button>
                <input ref={receiptVerifyRef} type="file" accept=".json,application/json" onChange={handleVerifyReceiptFile} className="hidden" />
              </div>
            </div>
            {verifyResult && (
              <div className={`p-3 rounded-lg border text-[12px] break-all ${verifyResult.verified ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                {verifyResult.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SignersSetupModal({ isOpen, onClose, signers, onUpdateSigners, onStartGuidedSigning }) {
  const [nameInput, setNameInput] = useState('');
  const palette = ['#1B4B91', '#059669', '#D97706', '#7C3AED', '#DB2777'];
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[135] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4" role="dialog" aria-modal="true" aria-label="In-Person Signers Setup">
      <div className="bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--brand)]" />
            <h3 className="text-[16px] font-semibold">In-Person Signers</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3 text-[13px]">
          <p className="text-[var(--muted)]">
            Define participants who will complete fields in person on this device. No emails, accounts, or links leave Klarity.
          </p>
          <div className="flex flex-col gap-2">
            {signers.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)]">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span style={{ backgroundColor: s.color }} className="w-3.5 h-3.5 rounded-full shrink-0" />
                  <input
                    type="text"
                    value={s.name}
                    onChange={(e) =>
                      onUpdateSigners(signers.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))
                    }
                    className="bg-transparent font-medium outline-none flex-1 min-w-0"
                  />
                </div>
                {signers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onUpdateSigners(signers.filter((x) => x.id !== s.id))}
                    className="p-1 text-[var(--muted)] hover:text-rose-500 cursor-pointer"
                    aria-label={`Remove ${s.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!nameInput.trim()) return;
              onUpdateSigners([
                ...signers,
                {
                  id: `signer_${Date.now()}`,
                  name: nameInput.trim(),
                  color: palette[signers.length % palette.length]
                }
              ]);
              setNameInput('');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Add another signer name..."
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] outline-none focus:border-[var(--brand)]"
            />
            <Button type="submit" variant="secondary" size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </form>
        </div>

        <div className="px-5 py-3.5 border-t border-[var(--line)] bg-[var(--surface-subtle)] flex justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>Done</Button>
          <Button variant="primary" size="sm" onClick={() => { onStartGuidedSigning(); onClose(); }}>
            <FileCheck className="w-4 h-4 mr-1" /> Start Guided Signing
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FinishAndLockModal({ isOpen, onClose, onConfirmFinish, isBusy }) {
  const [appendRecord, setAppendRecord] = useState(true);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[135] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4" role="dialog" aria-modal="true" aria-label="Finish and Lock Document">
      <div className="bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
          <h3 className="text-[16px] font-semibold">Finish &amp; Lock Signed Document</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-3 text-[13px]">
          <p className="text-[var(--ink)] leading-relaxed">
            This flattens all signatures and form fields permanently into the PDF, locks the document read-only inside Klarity, computes a SHA-256 content hash, and saves a verifiable <strong>.json signature receipt</strong>.
          </p>
          <label className="flex items-start gap-2 font-medium cursor-pointer">
            <input type="checkbox" checked={appendRecord} onChange={(e) => setAppendRecord(e.target.checked)} className="mt-0.5" />
            <span>Append Signature Record page (lists signers, device clock timestamps, and pre-record SHA-256 hash)</span>
          </label>
          <p className="text-[12px] text-[var(--muted)] bg-[var(--surface-subtle)] p-2.5 rounded-lg border border-[var(--line)]">
            Electronic signatures are generally accepted for many documents, but rules differ by country and document type. For legal or regulated documents, check what is required.
          </p>
        </div>
        <div className="px-5 py-3.5 border-t border-[var(--line)] bg-[var(--surface-subtle)] flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isBusy}>Cancel</Button>
          <Button variant="primary" size="sm" disabled={isBusy} onClick={() => onConfirmFinish(appendRecord)}>
            {isBusy ? 'Finalizing...' : 'Finish, Lock & Save Receipt'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LinkConfirmModal({ url, onClose }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4" role="dialog" aria-modal="true" aria-label="Open External Link Confirmation">
      <div className="bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-[var(--brand)]" />
            <h3 className="text-[16px] font-semibold">Open External Link?</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-2 text-[14px]">
          <p className="text-[var(--muted)]">This PDF link points to an external website. It will open in your system browser:</p>
          <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] font-mono text-[12px] break-all">
            {url}
          </div>
        </div>
        <div className="px-5 py-3.5 border-t border-[var(--line)] bg-[var(--surface-subtle)] flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              try {
                window.open(url, '_blank', 'noopener,noreferrer');
              } catch {}
              onClose();
            }}
          >
            Open in System Browser
          </Button>
        </div>
      </div>
    </div>
  );
}
