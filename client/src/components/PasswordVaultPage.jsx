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
  Unlock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import {
  hasMasterPinSet,
  setMasterPin,
  removeMasterPin,
  verifyMasterPin,
  copySensitiveWithAutoClear
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
  onUpdateVaultItems
}) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedKey, setCopiedKey] = useState('');
  const [clipboardNotice, setClipboardNotice] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Vault Master PIN Security State
  const [pinConfigured, setPinConfigured] = useState(() => hasMasterPinSet());
  const [isVaultLocked, setIsVaultLocked] = useState(() => hasMasterPinSet());
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinSetupError, setPinSetupError] = useState('');

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

  const handleUnlockVault = (e) => {
    e.preventDefault();
    const res = verifyMasterPin(unlockPinInput);
    if (res.valid) {
      setIsVaultLocked(false);
      setUnlockPinInput('');
      setUnlockError('');
    } else {
      setUnlockError(res.error || 'Incorrect PIN.');
    }
  };

  const handleSaveMasterPin = (e) => {
    e.preventDefault();
    const p1 = newPinInput.trim();
    const p2 = confirmPinInput.trim();
    if (p1.length < 4) {
      setPinSetupError('PIN must be at least 4 characters.');
      return;
    }
    if (p1 !== p2) {
      setPinSetupError('PINs do not match.');
      return;
    }
    try {
      setMasterPin(p1);
      setPinConfigured(true);
      setIsVaultLocked(false);
      setNewPinInput('');
      setConfirmPinInput('');
      setPinSetupError('');
      setShowPinSetupModal(false);
      setImportStatus('Vault PIN protection enabled (AES-256 encrypted)');
      setTimeout(() => setImportStatus(''), 4000);
    } catch (err) {
      setPinSetupError(err.message || 'Could not set PIN.');
    }
  };

  const handleRemovePin = () => {
    removeMasterPin();
    setPinConfigured(false);
    setIsVaultLocked(false);
    setShowPinSetupModal(false);
    setImportStatus('Vault PIN removed');
    setTimeout(() => setImportStatus(''), 3000);
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
                return matchedKey ? String(row[matchedKey] ?? '').trim() : '';
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
                const vals = keys.map(k => String(row[k] ?? '').trim()).filter(Boolean);
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
                const service = String(arr[0] ?? '').trim();
                if (service.toLowerCase() === 'service' || service.toLowerCase() === 'name') return;
                imported.push({
                  id: `v-raw-${Date.now()}-${idx}`,
                  service: service || 'Account',
                  category: inferCategory(service, sheetName),
                  username: String(arr[1] ?? '').trim(),
                  password: String(arr[2] ?? '').trim(),
                  accountNumber: String(arr[3] ?? '').trim(),
                  website: '',
                  notes: String(arr[4] ?? '').trim()
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

  // Render Vault Lock Gate if PIN is set and Vault is currently locked
  if (isVaultLocked) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200/90 shadow-lg p-6 text-center flex flex-col gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#18457c]/10 text-[#18457c] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif-title text-xl font-bold text-slate-900">Vault Locked</h2>
            <p className="text-xs text-slate-500 mt-1">Enter your Master PIN to decrypt and view passwords</p>
          </div>

          {unlockError && (
            <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 justify-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{unlockError}</span>
            </div>
          )}

          <form onSubmit={handleUnlockVault} className="flex flex-col gap-3">
            <input
              type="password"
              autoFocus
              placeholder="Enter PIN"
              value={unlockPinInput}
              onChange={e => setUnlockPinInput(e.target.value)}
              className="w-full text-center tracking-widest text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:bg-white focus:outline-none focus:border-[#18457c]"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Unlock Vault
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AES-256 Encrypted Storage Active</span>
          </div>
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3" />
                <span>AES-256 Encrypted</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">Logins, passwords & account numbers</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pinConfigured ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setVisiblePasswords({});
                  setIsVaultLocked(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                title="Lock Vault with PIN"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPinSetupModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>PIN Settings</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowPinSetupModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-bold cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Set Vault PIN</span>
            </button>
          )}

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

      {/* PIN Setup / Change Modal */}
      {showPinSetupModal && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Lock className="w-4 h-4 text-[#18457c]" />
              <span>{pinConfigured ? 'Update Vault Master PIN' : 'Set Vault Master PIN'}</span>
            </div>
            <button type="button" onClick={() => setShowPinSetupModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          {pinSetupError && (
            <div className="text-rose-600 font-semibold">{pinSetupError}</div>
          )}
          <form onSubmit={handleSaveMasterPin} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">New PIN (4+ digits)</label>
              <input
                type="password"
                required
                placeholder="••••"
                value={newPinInput}
                onChange={e => setNewPinInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Confirm PIN</label>
              <input
                type="password"
                required
                placeholder="••••"
                value={confirmPinInput}
                onChange={e => setConfirmPinInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-3 rounded-lg bg-[#18457c] hover:bg-[#123561] text-white font-bold cursor-pointer"
              >
                Save PIN
              </button>
              {pinConfigured && (
                <button
                  type="button"
                  onClick={handleRemovePin}
                  className="py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold cursor-pointer"
                >
                  Remove PIN
                </button>
              )}
            </div>
          </form>
        </div>
      )}

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
