import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  KeyRound,
  Download,
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Edit3,
  ExternalLink,
  X,
  FileSpreadsheet,
  Lock,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import {
  copySensitiveWithAutoClear,
  sanitizeSpreadsheetCell,
  hasMasterPinSet,
  setMasterPin,
  verifyMasterPin,
  removeMasterPin
} from '../utils/securityCrypto';

export const DEFAULT_VAULT_ITEMS = [
  {
    id: 'v-pge',
    service: 'PG&E',
    category: 'Household',
    username: '',
    password: '',
    accountNumber: '',
    website: 'https://www.pge.com',
    notes: 'Electric & Gas'
  },
  {
    id: 'v-water',
    service: 'Water Utility',
    category: 'Household',
    username: '',
    password: '',
    accountNumber: '',
    website: '',
    notes: 'Water & Trash'
  }
];

const CATEGORIES = ['All', 'Household', 'Auto', 'Health', 'Banking', 'Other'];

export default function PasswordVaultPage({
  vaultItems = [],
  onUpdateVaultItems,
  onBack
}) {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      const timeoutMode = localStorage.getItem('klarity_vault_pin_timeout') || '15m';
      if (timeoutMode === 'immediate') return false;
      const until = Number(sessionStorage.getItem('klarity_vault_unlocked_until') || 0);
      return Date.now() < until;
    } catch {
      return false;
    }
  });
  const [hasPin, setHasPin] = useState(() => hasMasterPinSet());
  const [pinInput, setPinInput] = useState('');
  const [pinConfirmInput, setPinConfirmInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  const setUnlockSession = () => {
    try {
      const timeoutMode = localStorage.getItem('klarity_vault_pin_timeout') || '15m';
      let durationMs = 15 * 60 * 1000;
      if (timeoutMode === '5m') durationMs = 5 * 60 * 1000;
      else if (timeoutMode === '30m') durationMs = 30 * 60 * 1000;
      else if (timeoutMode === 'session') durationMs = 24 * 60 * 60 * 1000;
      else if (timeoutMode === 'immediate') durationMs = 0;

      if (durationMs > 0) {
        sessionStorage.setItem('klarity_vault_unlocked_until', String(Date.now() + durationMs));
      } else {
        sessionStorage.removeItem('klarity_vault_unlocked_until');
      }
    } catch {}
  };

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedKey, setCopiedKey] = useState('');
  const [clipboardNotice, setClipboardNotice] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formState, setFormState] = useState({
    service: '',
    category: 'Household',
    username: '',
    password: '',
    accountNumber: '',
    website: '',
    notes: ''
  });

  const filteredItems = useMemo(() => {
    return (vaultItems || []).filter(item => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (item.service || '').toLowerCase().includes(q) ||
        (item.username || '').toLowerCase().includes(q) ||
        (item.accountNumber || '').toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [vaultItems, selectedCategory, searchQuery]);

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = async (text, key, isSensitive = false) => {
    if (!text) return;
    const ok = await copySensitiveWithAutoClear(
      String(text),
      30000,
      () => setClipboardNotice('')
    );
    if (ok) {
      setCopiedKey(key);
      if (isSensitive) {
        setClipboardNotice('Copied (auto-clears in 30s)');
        setTimeout(() => setClipboardNotice(''), 4000);
      }
      setTimeout(() => setCopiedKey(''), 2000);
    }
  };

  const inferCategory = (serviceName = '', rawCat = '') => {
    const c = String(rawCat).trim();
    if (['Household', 'Auto', 'Health', 'Banking', 'Other'].includes(c)) return c;
    const s = `${serviceName} ${rawCat}`.toLowerCase();
    if (s.includes('pge') || s.includes('pg&e') || s.includes('water') || s.includes('gas') || s.includes('electric') || s.includes('smud') || s.includes('comcast') || s.includes('xfinity') || s.includes('att') || s.includes('verizon') || s.includes('internet') || s.includes('rent') || s.includes('mortgage')) {
      return 'Household';
    }
    if (s.includes('kaiser') || s.includes('health') || s.includes('medical') || s.includes('dental') || s.includes('doctor') || s.includes('anthem') || s.includes('blue') || s.includes('medicare') || s.includes('cvs') || s.includes('walgreens')) {
      return 'Health';
    }
    if (s.includes('geico') || s.includes('state farm') || s.includes('progressive') || s.includes('aaa') || s.includes('dmv') || s.includes('fastrak') || s.includes('tesla') || s.includes('chargepoint') || s.includes('auto') || s.includes('car') || s.includes('toyota') || s.includes('honda')) {
      return 'Auto';
    }
    if (s.includes('chase') || s.includes('citi') || s.includes('amex') || s.includes('discover') || s.includes('bank') || s.includes('wells') || s.includes('capital') || s.includes('calpers') || s.includes('ssa') || s.includes('fidelity') || s.includes('vanguard')) {
      return 'Banking';
    }
    return 'Household';
  };

  // Excel (.xlsx, .xls) and CSV Auto-Importer
  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const imported = [];

        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

          if (rows.length > 0) {
            rows.forEach((row, idx) => {
              const keys = Object.keys(row);
              const findVal = (patterns) => {
                const matchedKey = keys.find(k => patterns.some(p => k.toLowerCase().includes(p)));
                return matchedKey ? sanitizeSpreadsheetCell(row[matchedKey]) : '';
              };

              let service = findVal(['service', 'site', 'website', 'company', 'provider', 'bill', 'name', 'account name', 'bank', 'app', 'title']);
              let username = findVal(['user', 'email', 'login', 'id']);
              let password = findVal(['pass', 'pw', 'pwd', 'secret', 'pin']);
              let accountNumber = findVal(['acct', 'account #', 'account num', 'number', 'member', 'policy']);
              let category = findVal(['cat', 'type', 'group']);
              let website = findVal(['url', 'link', 'web']);
              let notes = findVal(['note', 'memo', 'info', 'comment', 'detail']);

              // Fallback if user has plain columns without standard headers
              if (!service && keys.length >= 2) {
                const vals = keys.map(k => sanitizeSpreadsheetCell(row[k])).filter(Boolean);
                if (vals.length >= 2) {
                  service = vals[0] || '';
                  username = vals[1] || '';
                  password = vals[2] || '';
                  accountNumber = vals[3] || '';
                  notes = vals[4] || '';
                }
              }

              if (service || username || accountNumber) {
                imported.push({
                  id: `v-imp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                  service: service || 'Account',
                  category: inferCategory(service, category || sheetName),
                  username,
                  password,
                  accountNumber,
                  website,
                  notes
                });
              }
            });
          } else {
            // Check raw array-of-arrays if sheet had no header row
            const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            rawRows.forEach((arr, idx) => {
              if (Array.isArray(arr) && arr.filter(Boolean).length >= 2) {
                const service = sanitizeSpreadsheetCell(arr[0]);
                if (service.toLowerCase() === 'service' || service.toLowerCase() === 'name') return;
                imported.push({
                  id: `v-raw-${Date.now()}-${idx}`,
                  service: service || 'Account',
                  category: inferCategory(service, sheetName),
                  username: sanitizeSpreadsheetCell(arr[1]),
                  password: sanitizeSpreadsheetCell(arr[2]),
                  accountNumber: sanitizeSpreadsheetCell(arr[3]),
                  website: '',
                  notes: sanitizeSpreadsheetCell(arr[4])
                });
              }
            });
          }
        });

        if (imported.length > 0) {
          onUpdateVaultItems([...imported, ...(vaultItems || [])]);
          setImportStatus(`Added & encrypted ${imported.length} account${imported.length === 1 ? '' : 's'} from "${file.name}"`);
          setTimeout(() => setImportStatus(''), 5000);
        } else {
          setImportStatus('No account rows found in file. Use columns: Service, Username, Password, Account #');
          setTimeout(() => setImportStatus(''), 5000);
        }
      } catch (err) {
        setImportStatus(`Could not read file: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Export back to Excel (.xlsx)
  const handleExportExcel = () => {
    const exportRows = (vaultItems || []).map(item => ({
      Service: item.service || '',
      Category: item.category || 'Household',
      Username: item.username || '',
      Password: item.password || '',
      'Account Number': item.accountNumber || '',
      Website: item.website || '',
      Notes: item.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Accounts & Passwords');
    XLSX.writeFile(wb, 'Klarity_Accounts_Passwords.xlsx');
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formState.service.trim()) return;

    if (editingId) {
      onUpdateVaultItems(
        (vaultItems || []).map(item =>
          item.id === editingId ? { ...item, ...formState, service: formState.service.trim() } : item
        )
      );
      setEditingId(null);
    } else {
      const newItem = {
        id: `v-${Date.now()}`,
        ...formState,
        service: formState.service.trim()
      };
      onUpdateVaultItems([newItem, ...(vaultItems || [])]);
    }

    setFormState({
      service: '',
      category: 'Household',
      username: '',
      password: '',
      accountNumber: '',
      website: '',
      notes: ''
    });
    setShowAddForm(false);
  };

  const handleStartEdit = (item) => {
    setFormState({
      service: item.service || '',
      category: item.category || 'Household',
      username: item.username || '',
      password: item.password || '',
      accountNumber: item.accountNumber || '',
      website: item.website || '',
      notes: item.notes || ''
    });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleDelete = (id) => {
    onUpdateVaultItems((vaultItems || []).filter(item => item.id !== id));
  };

  const handleUnlockWithPin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!pinInput.trim()) {
      setPinError('Please enter your security PIN.');
      return;
    }
    setIsSubmittingPin(true);
    setPinError('');
    try {
      const result = await verifyMasterPin(pinInput);
      if (result.valid) {
        setUnlockSession();
        setIsUnlocked(true);
        setPinInput('');
        setPinError('');
      } else {
        setPinError(result.error || 'Incorrect security PIN. Please try again.');
      }
    } catch (err) {
      setPinError('Failed to verify PIN. Please try again.');
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const handleCreatePin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanPin = pinInput.trim();
    const cleanConfirm = pinConfirmInput.trim();

    if (cleanPin.length < 4) {
      setPinError('PIN must be at least 4 digits.');
      return;
    }
    if (cleanPin !== cleanConfirm) {
      setPinError('PINs do not match. Please re-enter.');
      return;
    }

    setIsSubmittingPin(true);
    setPinError('');
    try {
      await setMasterPin(cleanPin);
      setHasPin(true);
      setUnlockSession();
      setIsUnlocked(true);
      setPinInput('');
      setPinConfirmInput('');
    } catch (err) {
      setPinError(err.message || 'Failed to save PIN.');
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const handleResetPin = () => {
    if (window.confirm('Are you sure you want to reset your Security PIN? You will be prompted to create a new one.')) {
      removeMasterPin();
      setHasPin(false);
      setPinInput('');
      setPinConfirmInput('');
      setPinError('');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col gap-6 py-6 sm:py-10 max-w-md mx-auto w-full">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 font-semibold cursor-pointer w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Overview</span>
          </button>
        )}

        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-5">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-[#18457c] text-white flex items-center justify-center shadow-2xs">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="font-serif-title text-xl font-bold text-slate-900">
              {hasPin ? 'Enter Security PIN' : 'Set Up Security PIN'}
            </h2>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              {hasPin
                ? 'Enter your master security PIN to access your passwords and account credentials.'
                : 'Create a 4-6 digit security PIN to protect your passwords and account logins.'}
            </p>
          </div>

          {pinError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{pinError}</span>
            </div>
          )}

          <form onSubmit={hasPin ? handleUnlockWithPin : handleCreatePin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                {hasPin ? 'Security PIN' : 'New PIN (4-6 digits)'}
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={12}
                  autoFocus
                  placeholder="••••"
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base tracking-widest text-slate-900 outline-none focus:bg-white focus:border-[#18457c] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!hasPin && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Confirm PIN
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="••••"
                    value={pinConfirmInput}
                    onChange={e => setPinConfirmInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base tracking-widest text-slate-900 outline-none focus:bg-white focus:border-[#18457c] transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingPin}
              className="mt-2 w-full py-2.5 px-4 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white font-semibold text-xs transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSubmittingPin ? 'Verifying...' : hasPin ? 'Unlock Passwords' : 'Set PIN & Access Vault'}</span>
            </button>

            {hasPin && (
              <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
                <span>Protected with PBKDF2</span>
                <button
                  type="button"
                  onClick={handleResetPin}
                  className="text-slate-500 hover:text-[#18457c] underline cursor-pointer"
                >
                  Reset PIN
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#18457c] text-white flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif-title text-xl font-bold text-slate-900">Passwords & Accounts</h2>
            </div>
            <p className="text-xs text-slate-500">Logins, passwords & account numbers</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              try { sessionStorage.removeItem('klarity_vault_unlocked_until'); } catch {}
              setIsUnlocked(false);
              setPinInput('');
              setPinConfirmInput('');
              setPinError('');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            title="Lock Passwords Vault"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Vault</span>
          </button>
          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs cursor-pointer transition-colors">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Upload Excel / CSV</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.tsv"
              onChange={handleExcelUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setFormState({
                service: '',
                category: selectedCategory === 'All' ? 'Household' : selectedCategory,
                username: '',
                password: '',
                accountNumber: '',
                website: '',
                notes: ''
              });
              setShowAddForm(!showAddForm);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Upload / Security Status Banner */}
      {(importStatus || clipboardNotice) && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between">
          <span>{importStatus || clipboardNotice}</span>
          <button
            type="button"
            onClick={() => {
              setImportStatus('');
              setClipboardNotice('');
            }}
            className="text-emerald-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Category Filter Pills & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-white text-[#18457c] shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search PG&E, Chase, account #..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#18457c]"
          />
        </div>
      </div>

      {/* Add / Edit Account Form */}
      {showAddForm && (
        <form onSubmit={handleSaveForm} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Account / Service</label>
            <input
              type="text"
              required
              placeholder="e.g. PG&E, Water, Kaiser"
              value={formState.service}
              onChange={e => setFormState({ ...formState, service: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#18457c]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Section</label>
            <select
              value={formState.category}
              onChange={e => setFormState({ ...formState, category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 font-semibold focus:outline-none"
            >
              {CATEGORIES.filter(c => c !== 'All').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Username / Email</label>
            <input
              type="text"
              placeholder="Username or email"
              value={formState.username}
              onChange={e => setFormState({ ...formState, username: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#18457c]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Password</label>
            <input
              type="text"
              placeholder="Password"
              value={formState.password}
              onChange={e => setFormState({ ...formState, password: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#18457c]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Account # / ID</label>
            <input
              type="text"
              placeholder="Account or Member #"
              value={formState.accountNumber}
              onChange={e => setFormState({ ...formState, accountNumber: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#18457c]"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 py-2 px-3 rounded-lg bg-[#18457c] hover:bg-[#123561] text-white font-bold cursor-pointer"
            >
              {editingId ? 'Save' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
              }}
              className="py-2 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Accounts & Passwords List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          No saved accounts in this section yet. Click <strong>Add Account</strong> or <strong>Upload Excel / CSV</strong>.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredItems.map(item => {
            const isPwVisible = Boolean(visiblePasswords[item.id]);
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between gap-3 text-xs"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{item.service}</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[10px]">
                        {item.category || 'Household'}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {item.website && (
                      <a
                        href={item.website.startsWith('http') ? item.website : `https://${item.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-[#18457c] rounded"
                        title="Open website"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Username */}
                  <div className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 block">Username</span>
                      <span className="font-mono font-semibold text-slate-800 truncate block">
                        {item.username || '—'}
                      </span>
                    </div>
                    {item.username && (
                      <button
                        type="button"
                        onClick={() => handleCopy(item.username, `${item.id}-user`, false)}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Copy username"
                      >
                        {copiedKey === `${item.id}-user` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Password */}
                  <div className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 block">Password</span>
                      <span className="font-mono font-semibold text-slate-800 truncate block">
                        {item.password ? (isPwVisible ? item.password : '••••••••••') : '—'}
                      </span>
                    </div>
                    {item.password && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(item.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                          title={isPwVisible ? 'Hide password' : 'Show password'}
                        >
                          {isPwVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.password, `${item.id}-pw`, true)}
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Copy password (auto-clears in 30s)"
                        >
                          {copiedKey === `${item.id}-pw` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Account Number */}
                  <div className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 block">Account #</span>
                      <span className="font-mono font-semibold text-slate-800 truncate block">
                        {item.accountNumber || '—'}
                      </span>
                    </div>
                    {item.accountNumber && (
                      <button
                        type="button"
                        onClick={() => handleCopy(item.accountNumber, `${item.id}-acct`, true)}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Copy account number (auto-clears in 30s)"
                      >
                        {copiedKey === `${item.id}-acct` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
