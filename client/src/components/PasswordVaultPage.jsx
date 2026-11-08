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
  ArrowLeft,
  ChevronDown,
  LayoutGrid,
  List,
  MoreVertical,
  Star
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
  const [vaultLockType, setVaultLockType] = useState(() => {
    try {
      return localStorage.getItem('klarity_vault_lock_type') || (hasMasterPinSet() ? 'pin' : 'pin');
    } catch {
      return 'pin';
    }
  });

  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      const lockType = localStorage.getItem('klarity_vault_lock_type') || (hasMasterPinSet() ? 'pin' : 'pin');
      if (lockType === 'none') return true;
      const timeoutMode = localStorage.getItem('klarity_vault_pin_timeout') || '15m';
      if (timeoutMode === 'immediate') return false;
      const until = Number(sessionStorage.getItem('klarity_vault_unlocked_until') || 0);
      return Date.now() < until;
    } catch {
      return false;
    }
  });
  const [hasPin, setHasPin] = useState(() => hasMasterPinSet() || Boolean(localStorage.getItem('klarity_vault_pin')));
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

  // Custom user-defined sections management
  const [customSections, setCustomSections] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_vault_sections');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return ['General', 'Utilities', 'Finance', 'Personal'];
  });
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionInput, setNewSectionInput] = useState('');
  const [isCreatingNewSection, setIsCreatingNewSection] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [expandedCardIds, setExpandedCardIds] = useState({});

  // View layout and card size preferences (persisted to localStorage)
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('klarity_vault_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const [cardSize, setCardSize] = useState(() => {
    try {
      return localStorage.getItem('klarity_vault_card_size') || 'medium';
    } catch {
      return 'medium';
    }
  });

  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [openCardMenuId, setOpenCardMenuId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const handleToggleFavorite = (itemId) => {
    const updated = (vaultItems || []).map(item =>
      item.id === itemId ? { ...item, isFavorite: !item.isFavorite } : item
    );
    onUpdateVaultItems(updated);
    setOpenCardMenuId(null);
  };

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem('klarity_vault_view_mode', mode); } catch {}
  };

  const handleSetCardSize = (size) => {
    setCardSize(size);
    try { localStorage.setItem('klarity_vault_card_size', size); } catch {}
  };

  const toggleCardExpand = (id) => {
    setExpandedCardIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Compute all available sections from user-created custom sections and active cards
  const allSections = useMemo(() => {
    const set = new Set();
    (customSections || []).forEach(s => {
      if (s && String(s).trim()) set.add(String(s).trim());
    });
    (vaultItems || []).forEach(item => {
      if (item.category && String(item.category).trim()) set.add(String(item.category).trim());
    });
    return Array.from(set);
  }, [customSections, vaultItems]);

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
    category: 'General',
    username: '',
    password: '',
    accountNumber: '',
    website: '',
    notes: ''
  });

  const filteredItems = useMemo(() => {
    return (vaultItems || []).filter(item => {
      const matchesCat = selectedCategory === 'All' || (item.category || '').toLowerCase() === selectedCategory.toLowerCase();
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

  const handleCreateSection = () => {
    const trimmed = newSectionInput.trim();
    if (!trimmed) {
      setIsAddingSection(false);
      return;
    }
    const nextSections = Array.from(new Set([...customSections, trimmed]));
    setCustomSections(nextSections);
    try {
      localStorage.setItem('klarity_vault_sections', JSON.stringify(nextSections));
    } catch {}
    setSelectedCategory(trimmed);
    setIsAddingSection(false);
    setNewSectionInput('');
  };

  const handleDeleteSection = (secName) => {
    const nextSections = customSections.filter(s => s.toLowerCase() !== secName.toLowerCase());
    setCustomSections(nextSections);
    try {
      localStorage.setItem('klarity_vault_sections', JSON.stringify(nextSections));
    } catch {}
    // If any items were tagged with this section, reset their category so the section won't reappear
    if ((vaultItems || []).some(item => (item.category || '').toLowerCase() === secName.toLowerCase())) {
      onUpdateVaultItems(
        (vaultItems || []).map(item =>
          (item.category || '').toLowerCase() === secName.toLowerCase() ? { ...item, category: '' } : item
        )
      );
    }
    if (selectedCategory.toLowerCase() === secName.toLowerCase()) {
      setSelectedCategory('All');
    }
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formState.service.trim()) return;

    const chosenCategory = (formState.category || '').trim() || 'General';
    // Persist any new section entered by user
    if (chosenCategory && !customSections.some(s => s.toLowerCase() === chosenCategory.toLowerCase())) {
      const nextSections = [...customSections, chosenCategory];
      setCustomSections(nextSections);
      try {
        localStorage.setItem('klarity_vault_sections', JSON.stringify(nextSections));
      } catch {}
    }

    if (editingId) {
      onUpdateVaultItems(
        (vaultItems || []).map(item =>
          item.id === editingId ? {
            ...item,
            ...formState,
            service: formState.service.trim(),
            category: chosenCategory,
            website: (formState.website || '').trim()
          } : item
        )
      );
      setEditingId(null);
    } else {
      const newItem = {
        id: `v-${Date.now()}`,
        ...formState,
        service: formState.service.trim(),
        category: chosenCategory,
        website: (formState.website || '').trim()
      };
      onUpdateVaultItems([newItem, ...(vaultItems || [])]);
    }

    setFormState({
      service: '',
      category: chosenCategory,
      username: '',
      password: '',
      accountNumber: '',
      website: '',
      notes: ''
    });
    setIsCreatingNewSection(false);
    setNewSectionInput('');
    setShowAddForm(false);
  };

  const handleStartEdit = (item) => {
    setFormState({
      service: item.service || '',
      category: item.category || allSections[0] || 'General',
      username: item.username || '',
      password: item.password || '',
      accountNumber: item.accountNumber || '',
      website: item.website || '',
      notes: item.notes || ''
    });
    setIsCreatingNewSection(false);
    setNewSectionInput('');
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleDelete = (id) => {
    onUpdateVaultItems((vaultItems || []).filter(item => item.id !== id));
  };

  const handleUnlockWithPin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanSecret = pinInput.trim();
    if (!cleanSecret) {
      setPinError(`Please enter your ${vaultLockType === 'password' ? 'master password' : 'security PIN'}.`);
      return;
    }
    setIsSubmittingPin(true);
    setPinError('');
    try {
      let result = await verifyMasterPin(cleanSecret);
      if (!result.valid) {
        const plainFallback = localStorage.getItem('klarity_vault_pin');
        if (plainFallback && plainFallback.trim() === cleanSecret) {
          result = { valid: true };
          try { await setMasterPin(cleanSecret); } catch {}
        }
      }
      if (result.valid) {
        setUnlockSession();
        setIsUnlocked(true);
        setPinInput('');
        setPinError('');
      } else {
        setPinError(result.error || `Incorrect ${vaultLockType === 'password' ? 'master password' : 'security PIN'}. Please try again.`);
      }
    } catch (err) {
      setPinError(`Failed to verify ${vaultLockType === 'password' ? 'password' : 'PIN'}. Please try again.`);
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const handleCreatePin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanSecret = pinInput.trim();
    const cleanConfirm = pinConfirmInput.trim();

    if (vaultLockType === 'pin') {
      if (cleanSecret.length < 4) {
        setPinError('PIN must be at least 4 digits.');
        return;
      }
    } else {
      if (cleanSecret.length < 4) {
        setPinError('Password must be at least 4 characters.');
        return;
      }
    }

    if (cleanSecret !== cleanConfirm) {
      setPinError(`${vaultLockType === 'password' ? 'Passwords' : 'PINs'} do not match. Please re-enter.`);
      return;
    }

    setIsSubmittingPin(true);
    setPinError('');
    try {
      await setMasterPin(cleanSecret);
      localStorage.setItem('klarity_vault_pin', cleanSecret);
      localStorage.setItem('klarity_vault_lock_type', vaultLockType);
      setHasPin(true);
      setUnlockSession();
      setIsUnlocked(true);
      setPinInput('');
      setPinConfirmInput('');
    } catch (err) {
      setPinError(err.message || 'Failed to save credentials.');
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const handleResetPin = () => {
    if (window.confirm(`Are you sure you want to reset your ${vaultLockType === 'password' ? 'Master Password' : 'Security PIN'}? You will be prompted to create a new one.`)) {
      removeMasterPin();
      localStorage.removeItem('klarity_vault_pin');
      setHasPin(false);
      setPinInput('');
      setPinConfirmInput('');
      setPinError('');
    }
  };

  const handleCancelLock = () => {
    if (window.confirm('Cancel PIN/Password lock? Your Passwords page will be directly accessible without a security prompt.')) {
      removeMasterPin();
      localStorage.removeItem('klarity_vault_pin');
      localStorage.setItem('klarity_vault_lock_type', 'none');
      sessionStorage.removeItem('klarity_vault_unlocked_until');
      setVaultLockType('none');
      setHasPin(false);
      setIsUnlocked(true);
      setPinInput('');
      setPinConfirmInput('');
      setPinError('');
    }
  };

  const handleSwitchMode = (mode) => {
    setVaultLockType(mode);
    localStorage.setItem('klarity_vault_lock_type', mode);
    setPinInput('');
    setPinConfirmInput('');
    setPinError('');
  };

  if (!isUnlocked) {
    const isPasswordMode = vaultLockType === 'password';
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

        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-5">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-[#18457c] text-white flex items-center justify-center shadow-2xs">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="font-serif-title text-xl font-bold text-slate-900 dark:text-slate-100">
              {hasPin
                ? (isPasswordMode ? 'Enter Master Password' : 'Enter Security PIN')
                : (isPasswordMode ? 'Set Up Master Password' : 'Set Up Security PIN')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              {hasPin
                ? `Enter your ${isPasswordMode ? 'master password' : 'security PIN'} to access your passwords and account credentials.`
                : `Create a ${isPasswordMode ? 'master password (min 4 characters)' : '4-6 digit security PIN'} to protect your vault.`}
            </p>
          </div>

          {pinError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{pinError}</span>
            </div>
          )}

          <form onSubmit={hasPin ? handleUnlockWithPin : handleCreatePin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                {hasPin
                  ? (isPasswordMode ? 'Master Password' : 'Security PIN')
                  : (isPasswordMode ? 'New Password' : 'New PIN (4-6 digits)')}
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode={isPasswordMode ? 'text' : 'numeric'}
                  maxLength={isPasswordMode ? 64 : 12}
                  autoFocus
                  placeholder={isPasswordMode ? 'Enter your master password' : '••••'}
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#18457c] dark:focus:border-blue-500 transition-colors"
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
                  {isPasswordMode ? 'Confirm Password' : 'Confirm PIN'}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode={isPasswordMode ? 'text' : 'numeric'}
                    maxLength={isPasswordMode ? 64 : 12}
                    placeholder={isPasswordMode ? 'Re-enter your master password' : '••••'}
                    value={pinConfirmInput}
                    onChange={e => setPinConfirmInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#18457c] dark:focus:border-blue-500 transition-colors"
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
              <span>
                {isSubmittingPin
                  ? 'Verifying...'
                  : hasPin
                  ? (isPasswordMode ? 'Unlock with Password' : 'Unlock with PIN')
                  : (isPasswordMode ? 'Save Password & Access Vault' : 'Set PIN & Access Vault')}
              </span>
            </button>

            {/* Switch Mode & Cancel Lock Actions */}
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 text-center text-xs">
              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500">
                {isPasswordMode ? (
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('pin')}
                    className="hover:text-[#18457c] font-medium underline cursor-pointer"
                  >
                    Use a 4-digit PIN instead
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('password')}
                    className="hover:text-[#18457c] font-medium underline cursor-pointer"
                  >
                    Use a master password instead
                  </button>
                )}
                <span>•</span>
                <button
                  type="button"
                  onClick={handleCancelLock}
                  className="hover:text-rose-600 font-medium underline cursor-pointer"
                >
                  Cancel PIN & don't lock
                </button>
              </div>

              {hasPin && (
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <span>Protected with PBKDF2</span>
                  <button
                    type="button"
                    onClick={handleResetPin}
                    className="text-slate-500 hover:text-[#18457c] underline cursor-pointer"
                  >
                    Reset Credentials
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Top Bar with Main Name in the Middle */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
        {/* Left Side (Back button if available or spacer) */}
        <div className="flex items-center gap-2 min-w-[40px]">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Center: Main Name in the Middle */}
        <div className="flex flex-col items-center text-center justify-center sm:absolute sm:left-1/2 sm:-translate-x-1/2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#18457c] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <KeyRound className="w-4 h-4" />
            </div>
            <h2 className="font-serif-title text-xl font-bold text-slate-900 tracking-tight">
              Passwords & Accounts
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Logins, passwords & account numbers</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
          {/* View Options: Layout (Grid/List) & Card Size (Small/Medium/Large) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors border ${
                isViewMenuOpen
                  ? 'bg-slate-200 text-slate-900 border-slate-300 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent'
              }`}
              title="Change view layout and card size"
            >
              {viewMode === 'list' ? (
                <List className="w-3.5 h-3.5 text-slate-600" />
              ) : (
                <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />
              )}
              <span className="capitalize">{viewMode}</span>
              <span className="text-[10px] text-slate-400 font-normal capitalize">({cardSize})</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isViewMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popover Menu */}
            {isViewMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsViewMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-30 flex flex-col gap-3 text-xs animate-in fade-in zoom-in-95 duration-100 select-none">
                  {/* Layout Option */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-1">
                      View Layout
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleSetViewMode('grid')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                          viewMode === 'grid'
                            ? 'bg-white text-[#18457c] shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Grid</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetViewMode('list')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                          viewMode === 'list'
                            ? 'bg-white text-[#18457c] shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>List</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Size Option */}
                  <div className="border-t border-slate-100 pt-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-1">
                      Card Size
                    </span>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleSetCardSize('small')}
                        className={`py-1.5 px-1 rounded-lg font-bold text-xs text-center cursor-pointer transition-all ${
                          cardSize === 'small'
                            ? 'bg-white text-[#18457c] shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Small
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetCardSize('medium')}
                        className={`py-1.5 px-1 rounded-lg font-bold text-xs text-center cursor-pointer transition-all ${
                          cardSize === 'medium'
                            ? 'bg-white text-[#18457c] shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Medium
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetCardSize('large')}
                        className={`py-1.5 px-1 rounded-lg font-bold text-xs text-center cursor-pointer transition-all ${
                          cardSize === 'large'
                            ? 'bg-white text-[#18457c] shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Large
                      </button>
                    </div>
                  </div>

                  {/* Bulk expand / collapse */}
                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        const allExp = {};
                        (vaultItems || []).forEach(i => { allExp[i.id] = true; });
                        setExpandedCardIds(allExp);
                      }}
                      className="hover:text-[#18457c] font-semibold cursor-pointer underline"
                    >
                      Expand all
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setExpandedCardIds({})}
                      className="hover:text-slate-800 font-semibold cursor-pointer underline"
                    >
                      Collapse all
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {vaultLockType === 'none' ? (
            <button
              type="button"
              onClick={() => {
                setVaultLockType('pin');
                localStorage.setItem('klarity_vault_lock_type', 'pin');
                setHasPin(false);
                setIsUnlocked(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              title="Set PIN or Password for Passwords Vault"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Add PIN / Password Lock</span>
            </button>
          ) : (
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
          )}
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setIsCreatingNewSection(false);
              setNewSectionInput('');
              setFormState({
                service: '',
                category: selectedCategory === 'All' ? (allSections[0] || 'General') : selectedCategory,
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

      {/* User Custom Sections Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 max-w-full">
          {/* All Section Pill */}
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap font-bold ${
              selectedCategory === 'All'
                ? 'bg-[#18457c] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            All ({(vaultItems || []).length})
          </button>

          {/* User's Custom Sections */}
          {allSections.map(sec => {
            const count = (vaultItems || []).filter(i => (i.category || '').toLowerCase() === sec.toLowerCase()).length;
            const isSelected = selectedCategory.toLowerCase() === sec.toLowerCase();
            return (
              <div key={sec} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(sec)}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 font-bold ${
                    isSelected
                      ? 'bg-[#18457c] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <span>{sec}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {count}
                  </span>
                </button>
                {count === 0 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSection(sec)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    title={`Delete empty section "${sec}"`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* + Create New Section Button */}
          {isAddingSection ? (
            <div className="flex items-center gap-1 bg-white border border-[#18457c] rounded-xl px-2 py-1 shadow-2xs shrink-0">
              <input
                type="text"
                placeholder="Section name..."
                value={newSectionInput}
                onChange={e => setNewSectionInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateSection();
                  if (e.key === 'Escape') setIsAddingSection(false);
                }}
                className="text-xs font-bold text-slate-900 outline-none w-28 bg-transparent"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCreateSection}
                className="p-1 bg-[#18457c] text-white rounded-lg hover:bg-[#123561] cursor-pointer"
                title="Save section"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsAddingSection(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Cancel"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setIsAddingSection(true); setNewSectionInput(''); }}
              className="px-2.5 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-[#18457c] text-[#18457c] bg-white hover:bg-blue-50 text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3 h-3" />
              <span>New Section</span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search accounts, logins, notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#18457c]"
          />
        </div>
      </div>

      {/* Add / Edit Account Form (With Website URL and Custom Section) */}
      {showAddForm && (
        <form onSubmit={handleSaveForm} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-[#18457c]" />
              <span>{editingId ? 'Edit Account Credentials' : 'Add New Account Credentials'}</span>
            </span>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setEditingId(null); }}
              className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1. Account / Service Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Account / Service Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PG&E, Chase, Netflix, Kaiser..."
                value={formState.service}
                onChange={e => setFormState({ ...formState, service: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:border-[#18457c] font-semibold text-slate-900"
              />
            </div>

            {/* 2. Section (Custom user-defined section) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">Section</label>
                {allSections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewSection(!isCreatingNewSection)}
                    className="text-[11px] text-[#18457c] hover:underline font-bold cursor-pointer"
                  >
                    {isCreatingNewSection ? 'Pick existing' : '+ New section'}
                  </button>
                )}
              </div>
              {isCreatingNewSection || allSections.length === 0 ? (
                <input
                  type="text"
                  placeholder="Type section name (e.g. Personal, Work, Utilities)..."
                  value={formState.category || ''}
                  onChange={e => {
                    setFormState({ ...formState, category: e.target.value });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-[#18457c] focus:outline-none focus:bg-white text-xs font-semibold text-slate-900"
                  autoFocus={isCreatingNewSection || allSections.length === 0}
                />
              ) : (
                <select
                  value={formState.category || allSections[0] || ''}
                  onChange={e => {
                    if (e.target.value === '__new__') {
                      setIsCreatingNewSection(true);
                      setFormState({ ...formState, category: '' });
                    } else {
                      setFormState({ ...formState, category: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:bg-white cursor-pointer"
                >
                  {allSections.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="__new__">+ Create new section...</option>
                </select>
              )}
            </div>

            {/* 3. Website URL */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Website URL</label>
              <input
                type="text"
                placeholder="e.g. pge.com or https://chase.com"
                value={formState.website}
                onChange={e => setFormState({ ...formState, website: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:border-[#18457c] text-slate-900"
              />
            </div>

            {/* 4. Username / Email */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Username / Email / Login ID</label>
              <input
                type="text"
                placeholder="Username or email"
                value={formState.username}
                onChange={e => setFormState({ ...formState, username: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:border-[#18457c] text-slate-900 font-mono"
              />
            </div>

            {/* 5. Password */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showFormPassword ? 'text' : 'password'}
                  placeholder="Password or Secret PIN"
                  value={formState.password}
                  onChange={e => setFormState({ ...formState, password: e.target.value })}
                  className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:border-[#18457c] text-slate-900 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowFormPassword(!showFormPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* 6. Account # / Member ID */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Account Number / Member ID</label>
              <input
                type="text"
                placeholder="Account #, Member ID, or Policy #"
                value={formState.accountNumber}
                onChange={e => setFormState({ ...formState, accountNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:border-[#18457c] text-slate-900 font-mono"
              />
            </div>

            {/* 7. Notes */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block font-bold text-slate-700 mb-1">Notes / Security Answers (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 2FA recovery code, security questions, renewal date..."
                value={formState.notes}
                onChange={e => setFormState({ ...formState, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:border-[#18457c] text-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setEditingId(null); }}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white font-bold transition-colors cursor-pointer shadow-2xs"
            >
              {editingId ? 'Save Changes' : 'Add Card to Section'}
            </button>
          </div>
        </form>
      )}

      {/* Accounts & Passwords List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          No saved accounts in this section yet. Click <strong>Add Account</strong> to get started.
        </div>
      ) : (
        <div
          className={
            viewMode === 'list'
              ? (cardSize === 'small'
                  ? 'flex flex-col gap-2 w-full max-w-4xl mx-auto'
                  : cardSize === 'large'
                  ? 'flex flex-col gap-4 w-full max-w-5xl mx-auto'
                  : 'flex flex-col gap-3 w-full max-w-4xl mx-auto')
              : (cardSize === 'small'
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5'
                  : cardSize === 'large'
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5')
          }
        >
          {filteredItems.map(item => {
            const isExpanded = Boolean(expandedCardIds[item.id]);
            const isPwVisible = Boolean(visiblePasswords[item.id]);
            const isFav = Boolean(item.isFavorite);

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isFav
                    ? (isExpanded
                        ? 'bg-yellow-50/95 border-amber-300 shadow-md ring-2 ring-amber-300/70'
                        : 'bg-yellow-50/85 border-amber-300/80 shadow-2xs hover:border-amber-400 hover:bg-yellow-50')
                    : (isExpanded
                        ? 'bg-white border-[#18457c]/40 shadow-sm ring-1 ring-[#18457c]/10'
                        : 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs')
                }`}
              >
                {/* Collapsible Card Header - Main Name in the middle; Click to expand/collapse */}
                <button
                  type="button"
                  onClick={() => toggleCardExpand(item.id)}
                  className={`w-full flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition-colors select-none ${
                    cardSize === 'small'
                      ? 'p-2.5'
                      : cardSize === 'large'
                      ? 'p-4 sm:p-5'
                      : 'p-3.5'
                  }`}
                >
                  <div className={`rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    cardSize === 'small'
                      ? 'w-7 h-7'
                      : cardSize === 'large'
                      ? 'w-10 h-10'
                      : 'w-8 h-8'
                  } ${
                    isFav
                      ? 'bg-amber-400 text-amber-950 shadow-2xs'
                      : isExpanded
                      ? 'bg-[#18457c] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    <KeyRound className={
                      cardSize === 'small' ? 'w-3.5 h-3.5' : cardSize === 'large' ? 'w-5 h-5' : 'w-4 h-4'
                    } />
                  </div>

                  {/* Main Name in the Middle */}
                  <div className="flex-1 text-center min-w-0 px-2">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <span className={`font-bold text-slate-900 truncate ${
                        cardSize === 'small' ? 'text-xs' : cardSize === 'large' ? 'text-base' : 'text-sm'
                      }`}>
                        {item.service}
                      </span>
                      {isFav && (
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0 inline-block" />
                      )}
                    </div>
                    {item.category && (
                      <span className={`font-semibold ${isFav ? 'text-amber-800/80' : 'text-slate-400'} block truncate ${
                        cardSize === 'small' ? 'text-[9px]' : cardSize === 'large' ? 'text-xs' : 'text-[10px]'
                      }`}>
                        {item.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`p-1 rounded-lg text-slate-400 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 text-[#18457c] bg-blue-50' : ''
                    }`}>
                      <ChevronDown className={
                        cardSize === 'small' ? 'w-3.5 h-3.5' : cardSize === 'large' ? 'w-5 h-5' : 'w-4 h-4'
                      } />
                    </div>
                  </div>
                </button>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className={`border-t ${isFav ? 'border-amber-200/80 bg-amber-100/30' : 'border-slate-100 bg-slate-50/30'} flex flex-col gap-3 text-xs ${
                    cardSize === 'small'
                      ? 'px-3 pb-3 pt-1'
                      : cardSize === 'large'
                      ? 'px-5 pb-5 pt-2'
                      : 'px-4 pb-4 pt-1'
                  }`}>
                    {/* Website, Notes & Three Dots Action Menu */}
                    <div className="flex items-start justify-between gap-2 pt-2">
                      <div className="space-y-1 min-w-0">
                        {item.website && (
                          <div>
                            <a
                              href={item.website.startsWith('http') ? item.website : `https://${item.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-[#18457c] hover:underline font-semibold"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[200px]">
                                {item.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                              </span>
                            </a>
                          </div>
                        )}
                        {item.notes && (
                          <p className={`text-[11px] ${isFav ? 'text-amber-900/80' : 'text-slate-500'}`}>{item.notes}</p>
                        )}
                      </div>

                      {/* Three Dots Menu Button (Dropdown: Favorite, Edit, Delete) */}
                      <div className="relative flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setOpenCardMenuId(openCardMenuId === item.id ? null : item.id)}
                          className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                            openCardMenuId === item.id
                              ? 'bg-slate-200 text-slate-800'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                          title="Card actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu (Favorite, Edit, Delete) */}
                        {openCardMenuId === item.id && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setOpenCardMenuId(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-40 text-xs flex flex-col animate-in fade-in zoom-in-95 duration-100 select-none">
                              {/* 1. Favorite */}
                              <button
                                type="button"
                                onClick={() => handleToggleFavorite(item.id)}
                                className="w-full px-3 py-2 text-left font-semibold hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors text-slate-700"
                              >
                                <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'text-amber-500 fill-amber-400' : 'text-slate-400'}`} />
                                <span>{item.isFavorite ? 'Unfavorite' : 'Favorite'}</span>
                              </button>

                              {/* 2. Edit */}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  handleStartEdit(item);
                                }}
                                className="w-full px-3 py-2 text-left font-semibold hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors text-slate-700"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Edit</span>
                              </button>

                              {/* 3. Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  setItemToDelete(item);
                                }}
                                className="w-full px-3 py-2 text-left font-semibold hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Credentials Details Grid */}
                    <div className="space-y-2">
                      {/* Username */}
                      <div className={`flex items-center justify-between ${isFav ? 'bg-white/90 border-amber-200/80' : 'bg-white border-slate-200/70'} rounded-xl border shadow-2xs ${
                        cardSize === 'small' ? 'px-2 py-1' : cardSize === 'large' ? 'px-3.5 py-2' : 'px-2.5 py-1.5'
                      }`}>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-slate-400 block font-medium">Username / Login</span>
                          <span className={`font-mono font-semibold text-slate-800 truncate block ${
                            cardSize === 'large' ? 'text-sm' : 'text-xs'
                          }`}>
                            {item.username || '—'}
                          </span>
                        </div>
                        {item.username && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(item.username, `${item.id}-user`, false);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Copy username"
                          >
                            {copiedKey === `${item.id}-user` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>

                      {/* Password */}
                      <div className={`flex items-center justify-between ${isFav ? 'bg-white/90 border-amber-200/80' : 'bg-white border-slate-200/70'} rounded-xl border shadow-2xs ${
                        cardSize === 'small' ? 'px-2 py-1' : cardSize === 'large' ? 'px-3.5 py-2' : 'px-2.5 py-1.5'
                      }`}>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-slate-400 block font-medium">Password</span>
                          <span className={`font-mono font-semibold text-slate-800 truncate block ${
                            cardSize === 'large' ? 'text-sm' : 'text-xs'
                          }`}>
                            {item.password ? (isPwVisible ? item.password : '••••••••••') : '—'}
                          </span>
                        </div>
                        {item.password && (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
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
                      <div className={`flex items-center justify-between ${isFav ? 'bg-white/90 border-amber-200/80' : 'bg-white border-slate-200/70'} rounded-xl border shadow-2xs ${
                        cardSize === 'small' ? 'px-2 py-1' : cardSize === 'large' ? 'px-3.5 py-2' : 'px-2.5 py-1.5'
                      }`}>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-slate-400 block font-medium">Account # / Member ID</span>
                          <span className={`font-mono font-semibold text-slate-800 truncate block ${
                            cardSize === 'large' ? 'text-sm' : 'text-xs'
                          }`}>
                            {item.accountNumber || '—'}
                          </span>
                        </div>
                        {item.accountNumber && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(item.accountNumber, `${item.id}-acct`, true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Copy account number (auto-clears in 30s)"
                          >
                            {copiedKey === `${item.id}-acct` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}


      {/* Delete Confirmation Pop-up Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Delete Account?</h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Are you sure you want to delete <strong className="text-slate-800">{itemToDelete.service}</strong>?
                </p>
              </div>
            </div>

            <p className="text-slate-400 text-[11px]">
              This will remove the credentials from your encrypted vault. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDelete(itemToDelete.id);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
