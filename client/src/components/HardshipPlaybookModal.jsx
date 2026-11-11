import React, { useState } from 'react';
import { PhoneCall, X, CheckCircle2, Copy, Check, FileText, ShieldCheck } from 'lucide-react';
import { generateHardshipPlaybook, HARDSHIP_CREDITORS } from '../utils/statutoryDebtEngine';
import { Button, Card, Pill } from './ui';

export function HardshipPlaybookModal({ isOpen, onClose, card, cards = [], userName = 'Cardholder', isJudgmentProof = true, onShowToast }) {
  const creditCards = Array.isArray(cards) ? cards.filter(c => c.type !== 'debit') : [];
  const [selectedSlug, setSelectedSlug] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedLetter, setCopiedLetter] = useState(false);

  if (!isOpen) return null;

  const activeCardOrIssuer = card || (
    selectedSlug
      ? HARDSHIP_CREDITORS.find(c => c.slug === selectedSlug) || creditCards[0]
      : creditCards[0] || HARDSHIP_CREDITORS[0]
  );

  const playbook = generateHardshipPlaybook(activeCardOrIssuer, { isJudgmentProof, userName });

  const copyText = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'script') {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedLetter(true);
      setTimeout(() => setCopiedLetter(false), 2000);
    }
    if (onShowToast) {
      onShowToast('Copied to clipboard', 'success');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hardship-guide-title"
    >
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[8px] bg-[#1B4B91]/10 text-[#1B4B91] flex items-center justify-center shrink-0">
              <PhoneCall size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 id="hardship-guide-title" className="text-[18px] font-semibold text-[var(--ink)] font-serif truncate">
                  Payment relief guide: {playbook.creditorName}
                </h3>
                <Pill variant="brand">Relief program</Pill>
              </div>
              <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                {playbook.department} · {playbook.phone}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment relief guide"
            className="p-2 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {!card && (
            <div>
              <label htmlFor="relief-issuer-select" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                Select card issuer
              </label>
              <select
                id="relief-issuer-select"
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full px-3.5 py-2.5 text-[15px] font-medium rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]"
              >
                <option value="">
                  {creditCards[0] ? `Your card: ${creditCards[0].name}` : 'American Express (Default)'}
                </option>
                {HARDSHIP_CREDITORS.map((cred) => (
                  <option key={cred.slug} value={cred.slug}>
                    {cred.institution} — {cred.department} ({cred.phone})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Target Terms Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
              <div className="text-[13px] font-medium text-[var(--muted)] mb-1">Direct phone number</div>
              <div className="text-[20px] font-semibold text-[var(--ink)] font-serif">
                {playbook.phone}
              </div>
              <div className="text-[13px] font-medium text-[var(--muted)] mt-1">
                {playbook.department}
              </div>
            </div>

            <div className="p-4 rounded-[8px] bg-[#15803D]/10 border border-[#15803D]/25">
              <div className="text-[13px] font-medium text-[#15803D] mb-1">Typical relief program terms</div>
              <div className="text-[15px] font-semibold text-[#15803D]">
                {playbook.typicalTerms}
              </div>
              {playbook.currentBalance > 0 && (
                <div className="text-[13px] font-medium text-[#15803D] mt-1">
                  Est. ${playbook.targetTerms.estimatedNewMonthlyPayment}/mo (saves ~${playbook.targetTerms.monthlyInterestSaved}/mo interest)
                </div>
              )}
            </div>
          </div>

          {/* Step-by-Step Phone Script */}
          <div className="rounded-[12px] border border-[var(--line)] overflow-hidden">
            <div className="px-4 py-3 bg-[var(--surface-subtle)] border-b border-[var(--line)] flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-[var(--ink)] flex items-center gap-2">
                <PhoneCall size={15} className="text-[#1B4B91]" />
                Phone script for payment relief specialist
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyText(playbook.phoneScript.join('\n\n'), 'script')}
              >
                {copiedScript ? <Check size={14} className="text-[#15803D]" /> : <Copy size={14} />}
                {copiedScript ? 'Copied' : 'Copy script'}
              </Button>
            </div>
            <div className="p-4 space-y-3 bg-[var(--surface)]">
              {playbook.phoneScript.map((step, idx) => (
                <div key={idx} className="text-[15px] font-medium text-[var(--ink)] leading-relaxed p-3 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Essential Rules Checklist */}
          <div className="p-4 rounded-[12px] bg-[var(--surface-subtle)] border border-[var(--line)]">
            <div className="text-[13px] font-semibold text-[var(--ink)] mb-2.5 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-[#1B4B91]" />
              Important guidelines when calling
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {playbook.keyRules.map((rule, i) => (
                <div key={i} className="flex items-start gap-2 text-[13px] font-medium text-[var(--ink)]">
                  <CheckCircle2 size={15} className="text-[#15803D] shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Written Cease Collection / Protected Income Notice */}
          {isJudgmentProof && (
            <div className="rounded-[12px] border border-[var(--line)] overflow-hidden">
              <div className="px-4 py-3 bg-[var(--surface-subtle)] border-b border-[var(--line)] flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[var(--ink)] flex items-center gap-2">
                  <FileText size={15} className="text-[#1B4B91]" />
                  Written notice of protected income
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyText(playbook.ceaseCollectionLetter, 'letter')}
                >
                  {copiedLetter ? <Check size={14} className="text-[#15803D]" /> : <Copy size={14} />}
                  {copiedLetter ? 'Copied letter' : 'Copy letter'}
                </Button>
              </div>
              <pre className="p-4 text-[13px] font-sans font-medium text-[var(--ink)] bg-[var(--surface)] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {playbook.ceaseCollectionLetter}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--surface-subtle)] border-t border-[var(--line)] flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default HardshipPlaybookModal;
