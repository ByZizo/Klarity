import React, { useState, useMemo } from 'react';
import { 
  X, 
  PhoneCall, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Building2, 
  AlertCircle,
  FileText,
  Search,
  CreditCard
} from 'lucide-react';
import { HARDSHIP_CREDITORS } from '../utils/statutoryDebtEngine';

export default function HardshipPlaybookModal({ 
  isOpen, 
  onClose, 
  cards = [], 
  userName = 'Cardholder' 
}) {
  const [selectedSlug, setSelectedSlug] = useState('amex');
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id || 'custom');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [copied, setCopied] = useState(false);

  // Filter creditors by search and category
  const filteredCreditors = useMemo(() => {
    return HARDSHIP_CREDITORS.filter(c => {
      const matchesSearch = c.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.typicalTerms.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === 'All' || c.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, categoryFilter]);

  if (!isOpen) return null;

  const currentCreditor = HARDSHIP_CREDITORS.find(c => c.slug === selectedSlug) || filteredCreditors[0] || HARDSHIP_CREDITORS[0];
  
  // Find card matching selection or creditor
  const matchedCard = cards.find(c => c.id === selectedCardId) || 
    cards.find(c => (c.name || '').toLowerCase().includes(currentCreditor.slug)) || 
    cards[0] || 
    { mask: '4417', balance: 0, name: 'Card' };

  const scriptText = currentCreditor.hardshipPhoneScript(
    userName, 
    matchedCard.mask || '4417', 
    Number(matchedCard.balance || 0)
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-5 text-slate-800 animate-in fade-in zoom-in-95 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-title text-base sm:text-lg font-bold text-slate-900">
                  0% Hardship Negotiation Playbook
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  12 Issuers
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Word-for-word scripts grounded in statutory judgment-proof protections (Social Security & CalPERS).
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {['All', 'Major Issuers', 'Retail & Tech Cards'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  categoryFilter === cat 
                    ? 'bg-white text-[#18457c] shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search bank or card..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#18457c]"
            />
          </div>
        </div>

        {/* Bank Selector Grid (12 Banks) */}
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-2">Select Your Card Issuer ({filteredCreditors.length} available):</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
            {filteredCreditors.map(creditor => {
              const isSelected = selectedSlug === creditor.slug;
              return (
                <button
                  key={creditor.slug}
                  type="button"
                  onClick={() => setSelectedSlug(creditor.slug)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-0.5 ${
                    isSelected
                      ? 'bg-[#18457c] border-[#18457c] text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate w-full">{creditor.institution}</span>
                  <span className={`text-[10px] font-normal truncate w-full ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                    {creditor.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Connected Card Prefill Selector */}
        {cards.length > 0 && (
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
            <CreditCard className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="font-medium text-slate-600 shrink-0">Pre-fill details from:</span>
            <select
              value={selectedCardId}
              onChange={e => setSelectedCardId(e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none"
            >
              {cards.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name || c.institution} (ending in {c.mask || 'XXXX'} • ${Number(c.balance || 0).toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Specific Account Details Banner */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{currentCreditor.institution}</span>
              <span className="text-slate-500 font-medium">({currentCreditor.department})</span>
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              <span className="font-semibold text-emerald-700">Concession terms:</span> {currentCreditor.typicalTerms}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <a
              href={`tel:${currentCreditor.phone.replace(/[^0-9]/g, '')}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{currentCreditor.phone}</span>
            </a>
          </div>
        </div>

        {/* Pre-populated Word-for-Word Script */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#18457c]" />
              <span>Exact Script (Read verbatim to customer representative):</span>
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Script</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono leading-relaxed border border-slate-800 shadow-inner select-all whitespace-pre-wrap">
            {scriptText}
          </div>
        </div>

        {/* NFCC Certified Non-Profit Backup Dispatch */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-[#18457c] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#18457c]" />
              <span>Certified Non-Profit Backup (NFCC / MMI)</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              If the bank front-line representative refuses, call the National Foundation for Credit Counseling (NFCC). Certified agencies legally mandate 0%-8% concessions across all cards and waive setup fees for low-income seniors.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <a
              href="tel:18003882227"
              className="px-3 py-1.5 rounded-lg bg-[#18457c] hover:bg-[#123561] text-white font-semibold text-xs"
            >
              1-800-388-2227
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            Close Playbook
          </button>
        </div>
      </div>
    </div>
  );
}
