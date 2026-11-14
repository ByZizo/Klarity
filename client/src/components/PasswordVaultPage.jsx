import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  KeyRound,
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
  Lock,
  AlertCircle,
  ChevronDown,
  LayoutGrid,
  List,
  MoreVertical,
  Star,
  FileText
} from 'lucide-react';
import {
  copySensitiveWithAutoClear,
  sanitizeSpreadsheetCell,
  hasMasterPinSet,
  setMasterPin,
  verifyMasterPin,
  removeMasterPin
} from '../utils/securityCrypto';
import { Button, Card, EmptyState, ConfirmDialog, Pill } from './ui';
import DocumentVaultPage from './DocumentVaultPage';
import { getDocumentCountSync } from '../utils/documentVaultStorage';

export const DEFAULT_VAULT_ITEMS = [];

export default function PasswordVaultPage({
  vaultItems = [],
  onUpdateVaultItems,
  onShowToast
}) {
  const [activeVaultSection, setActiveVaultSection] = useState(() => {
    try {
      return localStorage.getItem('klarity_vault_active_section') || 'passwords';
    } catch {
      return 'passwords';
    }
  });

  const [documentCount, setDocumentCount] = useState(() => getDocumentCountSync());

  const handleSelectVaultSection = (sec) => {
    setActiveVaultSection(sec);
    try {
      localStorage.setItem('klarity_vault_active_section', sec);
    } catch {}
  };
  const [vaultLockType, setVaultLockType] = useState(() => {
    try {
      return localStorage.getItem('klarity_vault_lock_type') || 'pin';
    } catch {
      return 'pin';
    }
  });

  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      const lockType = localStorage.getItem('klarity_vault_lock_type') || 'pin';
      if (lockType === 'none') return true;
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

  // Change / remove PIN modal state (requires current PIN)
  const [pinActionMode, setPinActionMode] = useState(null); // 'change' | 'disable' | null
  const [currentPinVerifyInput, setCurrentPinVerifyInput] = useState('');
  const [newPinForChange, setNewPinForChange] = useState('');
  const [confirmPinForChange, setConfirmPinForChange] = useState('');

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
        if (Array.isArray(parsed)) {
          return parsed.some(s => String(s).toLowerCase() === 'favorites')
            ? parsed
            : ['Favorites', ...parsed];
        }
      }
    } catch {}
    return ['Favorites', 'General', 'Utilities', 'Finance', 'Personal'];
  });
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionInput, setNewSectionInput] = useState('');
  const [isCreatingNewSection, setIsCreatingNewSection] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [expandedCardIds, setExpandedCardIds] = useState({});

  // View layout and card size preferences
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
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [openCardMenuId, setOpenCardMenuId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const notify = (msg, type = 'success') => {
    if (onShowToast) onShowToast(msg, type);
  };

  const handleToggleFavorite = (itemId) => {
    const updated = (vaultItems || []).map(item =>
      item.id === itemId ? { ...item, isFavorite: !item.isFavorite } : item
    );
    onUpdateVaultItems(updated);
    setOpenCardMenuId(null);
    notify('Vault updated');
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

  const allSections = useMemo(() => {
    const set = new Set(['Favorites']);
    (customSections || []).forEach(s => {
      if (s && String(s).trim()) {
        const trimmed = String(s).trim();
        if (trimmed.toLowerCase() !== 'favorites') set.add(trimmed);
      }
    });
    (vaultItems || []).forEach(item => {
      if (item.category && String(item.category).trim()) {
        const trimmed = String(item.category).trim();
        if (trimmed.toLowerCase() !== 'favorites') set.add(trimmed);
      }
    });
    return Array.from(set);
  }, [customSections, vaultItems]);

  const getSectionItemCount = (secName) => {
    const list = vaultItems || [];
    if ((secName || '').toLowerCase() === 'favorites') {
      return list.filter(i => Boolean(i.isFavorite) || (i.category || '').toLowerCase() === 'favorites').length;
    }
    return list.filter(i => (i.category || '').toLowerCase() === (secName || '').toLowerCase()).length;
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
    category: 'General',
    username: '',
    password: '',
    accountNumber: '',
    website: '',
    notes: ''
  });

  const filteredItems = useMemo(() => {
    return (vaultItems || []).filter(item => {
      if ((item.id === 'v-pge' || item.id === 'v-water') && !item.password && !item.username && !item.accountNumber) {
        return false;
      }
      const matchesCat =
        selectedCategory === 'All' ||
        (selectedCategory.toLowerCase() === 'favorites'
          ? Boolean(item.isFavorite) || (item.category || '').toLowerCase() === 'favorites'
          : (item.category || '').toLowerCase() === selectedCategory.toLowerCase());
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
      notify('Copied to clipboard');
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
          }
        });

        if (imported.length > 0) {
          onUpdateVaultItems([...imported, ...(vaultItems || [])]);
          const msg = `Imported ${imported.length} account${imported.length === 1 ? '' : 's'} from "${file.name}"`;
          setImportStatus(msg);
          notify(msg);
          setTimeout(() => setImportStatus(''), 5000);
        } else {
          setImportStatus('No account rows found in file.');
          notify('No account rows found in file.', 'error');
          setTimeout(() => setImportStatus(''), 5000);
        }
      } catch (err) {
        setImportStatus(`Could not read file: ${err.message}`);
        notify(`Could not read file: ${err.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
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
    notify(`Created section "${trimmed}"`);
  };

  const handleDeleteSection = (secName) => {
    const nextSections = customSections.filter(s => s.toLowerCase() !== secName.toLowerCase());
    setCustomSections(nextSections);
    try {
      localStorage.setItem('klarity_vault_sections', JSON.stringify(nextSections));
    } catch {}
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
    notify(`Removed section "${secName}"`);
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formState.service.trim()) return;

    const chosenCategory = (formState.category || '').trim() || 'General';
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
            isFavorite: chosenCategory.toLowerCase() === 'favorites' ? true : item.isFavorite,
            website: (formState.website || '').trim()
          } : item
        )
      );
      setEditingId(null);
      notify('Account credentials updated');
    } else {
      const newItem = {
        id: `v-${Date.now()}`,
        ...formState,
        service: formState.service.trim(),
        category: chosenCategory,
        isFavorite: chosenCategory.toLowerCase() === 'favorites' ? true : Boolean(formState.isFavorite),
        website: (formState.website || '').trim()
      };
      onUpdateVaultItems([newItem, ...(vaultItems || [])]);
      notify('Account credentials saved');
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
    notify('Account removed from vault');
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
      const result = await verifyMasterPin(cleanSecret);
      if (result.valid) {
        setUnlockSession();
        setIsUnlocked(true);
        setPinInput('');
        setPinError('');
      } else {
        setPinError(result.error || `Incorrect ${vaultLockType === 'password' ? 'master password' : 'security PIN'}. Please try again.`);
      }
    } catch {
      setPinError(`Failed to verify ${vaultLockType === 'password' ? 'password' : 'PIN'}. Please try again.`);
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const handleCreatePin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanSecret = pinInput.trim();
    const cleanConfirm = pinConfirmInput.trim();

    if (cleanSecret.length < 4) {
      setPinError(vaultLockType === 'password' ? 'Password must be at least 4 characters.' : 'PIN must be at least 4 digits.');
      return;
    }

    if (cleanSecret !== cleanConfirm) {
      setPinError(`${vaultLockType === 'password' ? 'Passwords' : 'PINs'} do not match. Please re-enter.`);
      return;
    }

    setIsSubmittingPin(true);
    setPinError('');
    try {
      await setMasterPin(cleanSecret);
      try { localStorage.removeItem('klarity_vault_pin'); } catch {}
      localStorage.setItem('klarity_vault_lock_type', vaultLockType);
      setHasPin(true);
      setUnlockSession();
      setIsUnlocked(true);
      setPinInput('');
      setPinConfirmInput('');
      notify('Vault lock configured');
    } catch (err) {
      setPinError(err.message || 'Failed to save credentials.');
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const handleVerifyAndExecutePinChange = async (e) => {
    e.preventDefault();
    setPinError('');
    if (hasPin) {
      const check = await verifyMasterPin(currentPinVerifyInput.trim());
      if (!check.valid) {
        setPinError(check.error || 'Current PIN or password is incorrect.');
        return;
      }
    }

    if (pinActionMode === 'disable') {
      removeMasterPin();
      try { localStorage.removeItem('klarity_vault_pin'); } catch {}
      localStorage.setItem('klarity_vault_lock_type', 'none');
      sessionStorage.removeItem('klarity_vault_unlocked_until');
      setVaultLockType('none');
      setHasPin(false);
      setIsUnlocked(true);
      setPinActionMode(null);
      setCurrentPinVerifyInput('');
      notify('Vault lock removed');
      return;
    }

    if (pinActionMode === 'change') {
      if (newPinForChange.trim().length < 4) {
        setPinError('New PIN or password must be at least 4 characters.');
        return;
      }
      if (newPinForChange.trim() !== confirmPinForChange.trim()) {
        setPinError('New entries do not match.');
        return;
      }
      await setMasterPin(newPinForChange.trim());
      try { localStorage.removeItem('klarity_vault_pin'); } catch {}
      setHasPin(true);
      setUnlockSession();
      setIsUnlocked(true);
      setPinActionMode(null);
      setCurrentPinVerifyInput('');
      setNewPinForChange('');
      setConfirmPinForChange('');
      notify('Vault PIN updated');
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
        <Card className="p-6 sm:p-8 flex flex-col gap-5">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-[12px] bg-[#1B4B91] text-white flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-[22px] font-semibold text-[var(--ink)]">
              {hasPin
                ? (isPasswordMode ? 'Enter master password' : 'Enter security PIN')
                : (isPasswordMode ? 'Set up master password' : 'Set up security PIN')}
            </h2>
            <p className="text-[13px] font-medium text-[var(--muted)] max-w-xs leading-relaxed">
              {hasPin
                ? `Enter your ${isPasswordMode ? 'master password' : 'security PIN'} to access your passwords and account credentials.`
                : `Create a ${isPasswordMode ? 'master password (at least 4 characters)' : '4 to 6 digit security PIN'} to protect your vault.`}
            </p>
          </div>

          {pinError && (
            <div className="p-3 rounded-[8px] bg-[#B91C1C]/10 border border-[#B91C1C]/25 text-[#B91C1C] text-[13px] font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{pinError}</span>
            </div>
          )}

          {pinActionMode ? (
            <form onSubmit={handleVerifyAndExecutePinChange} className="flex flex-col gap-4">
              {hasPin && (
                <div>
                  <label htmlFor="vault-current-pin-input" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                    Current {isPasswordMode ? 'password' : 'PIN'}
                  </label>
                  <input
                    id="vault-current-pin-input"
                    type="password"
                    required
                    value={currentPinVerifyInput}
                    onChange={e => setCurrentPinVerifyInput(e.target.value)}
                    placeholder="Enter current PIN to verify"
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] text-[var(--ink)]"
                  />
                </div>
              )}

              {pinActionMode === 'change' && (
                <>
                  <div>
                    <label htmlFor="vault-new-pin-input" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                      New {isPasswordMode ? 'password' : 'PIN'}
                    </label>
                    <input
                      id="vault-new-pin-input"
                      type="password"
                      required
                      value={newPinForChange}
                      onChange={e => setNewPinForChange(e.target.value)}
                      placeholder="At least 4 digits"
                      className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] text-[var(--ink)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="vault-confirm-new-pin-input" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                      Confirm new {isPasswordMode ? 'password' : 'PIN'}
                    </label>
                    <input
                      id="vault-confirm-new-pin-input"
                      type="password"
                      required
                      value={confirmPinForChange}
                      onChange={e => setConfirmPinForChange(e.target.value)}
                      placeholder="Re-enter new PIN"
                      className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] text-[var(--ink)]"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPinActionMode(null);
                    setPinError('');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant={pinActionMode === 'disable' ? 'danger' : 'primary'}>
                  {pinActionMode === 'disable' ? 'Confirm remove lock' : 'Update PIN'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={hasPin ? handleUnlockWithPin : handleCreatePin} className="flex flex-col gap-4">
              <div>
                <label htmlFor="vault-pin-entry" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                  {hasPin
                    ? (isPasswordMode ? 'Master password' : 'Security PIN')
                    : (isPasswordMode ? 'New password' : 'New PIN (4–6 digits)')}
                </label>
                <div className="relative">
                  <input
                    id="vault-pin-entry"
                    type={showPin ? 'text' : 'password'}
                    inputMode={isPasswordMode ? 'text' : 'numeric'}
                    maxLength={isPasswordMode ? 64 : 12}
                    autoFocus
                    placeholder={isPasswordMode ? 'Enter your master password' : '••••'}
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] text-[var(--ink)]"
                  />
                  <button
                    type="button"
                    aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                    onClick={() => setShowPin(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer p-1 rounded-[8px]"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!hasPin && (
                <div>
                  <label htmlFor="vault-pin-confirm" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                    {isPasswordMode ? 'Confirm password' : 'Confirm PIN'}
                  </label>
                  <input
                    id="vault-pin-confirm"
                    type={showPin ? 'text' : 'password'}
                    inputMode={isPasswordMode ? 'text' : 'numeric'}
                    maxLength={isPasswordMode ? 64 : 12}
                    placeholder={isPasswordMode ? 'Re-enter your master password' : '••••'}
                    value={pinConfirmInput}
                    onChange={e => setPinConfirmInput(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] text-[var(--ink)]"
                  />
                </div>
              )}

              <Button type="submit" variant="primary" disabled={isSubmittingPin} className="w-full mt-1">
                <Lock className="w-4 h-4" />
                <span>
                  {isSubmittingPin
                    ? 'Verifying...'
                    : hasPin
                    ? (isPasswordMode ? 'Unlock with password' : 'Unlock with PIN')
                    : (isPasswordMode ? 'Save password & open vault' : 'Set PIN & open vault')}
                </span>
              </Button>

              <div className="flex flex-col gap-2 pt-3 border-t border-[var(--line)] text-center">
                <div className="flex flex-wrap items-center justify-center gap-3 text-[13px] text-[var(--muted)]">
                  {isPasswordMode ? (
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('pin')}
                      className="hover:text-[#1B4B91] font-medium underline cursor-pointer"
                    >
                      Use a PIN instead
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('password')}
                      className="hover:text-[#1B4B91] font-medium underline cursor-pointer"
                    >
                      Use a master password instead
                    </button>
                  )}
                  {hasPin && (
                    <>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPinActionMode('change');
                          setPinError('');
                        }}
                        className="hover:text-[#1B4B91] font-medium underline cursor-pointer"
                      >
                        Change {isPasswordMode ? 'password' : 'PIN'}
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPinActionMode('disable');
                          setPinError('');
                        }}
                        className="hover:text-[#B91C1C] font-medium underline cursor-pointer"
                      >
                        Remove lock
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-semibold text-[var(--ink)] tracking-tight">
            Vault
          </h1>
          <p className="text-[15px] font-medium text-[var(--muted)]">
            {activeVaultSection === 'passwords'
              ? 'Saved logins, passwords, and account numbers'
              : 'Secure document holder, policies, and records'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {vaultLockType === 'none' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setVaultLockType('pin');
                localStorage.setItem('klarity_vault_lock_type', 'pin');
                setHasPin(hasMasterPinSet());
                setIsUnlocked(false);
              }}
            >
              <Lock className="w-4 h-4" />
              <span>Set PIN lock</span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                try { sessionStorage.removeItem('klarity_vault_unlocked_until'); } catch {}
                setIsUnlocked(false);
                setPinInput('');
                setPinConfirmInput('');
                setPinError('');
              }}
            >
              <Lock className="w-4 h-4" />
              <span>Lock vault</span>
            </Button>
          )}
        </div>
      </div>

      {/* Vault Section Body */}
      {activeVaultSection === 'documents' ? (
        <DocumentVaultPage
          onShowToast={onShowToast}
          onDocumentsCountChange={setDocumentCount}
          activeVaultSection={activeVaultSection}
          onSelectVaultSection={handleSelectVaultSection}
          passwordsCount={(vaultItems || []).length}
        />
      ) : (
        <>

      {/* Status Notice */}
      {(importStatus || clipboardNotice) && (
        <div className="px-4 py-3 rounded-[8px] bg-[#15803D]/10 border border-[#15803D]/25 text-[13px] text-[#15803D] font-medium flex items-center justify-between">
          <span>{importStatus || clipboardNotice}</span>
          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={() => {
              setImportStatus('');
              setClipboardNotice('');
            }}
            className="text-[#15803D] cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Section Selector & Search Bar */}
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          <div className="flex items-center bg-[var(--surface-subtle)] p-1 rounded-[10px] border border-[var(--line)] shrink-0">
            <button
              type="button"
              onClick={() => handleSelectVaultSection('passwords')}
              className={`flex items-center gap-1.5 py-1 px-2.5 rounded-[8px] font-medium text-[13px] transition-all cursor-pointer ${
                activeVaultSection === 'passwords'
                  ? 'bg-[var(--surface)] text-[#1B4B91] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Passwords</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium ${
                activeVaultSection === 'passwords'
                  ? 'bg-[#1B4B91]/15 text-[#1B4B91]'
                  : 'bg-[var(--line)] text-[var(--ink)]'
              }`}>
                {(vaultItems || []).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectVaultSection('documents')}
              className={`flex items-center gap-1.5 py-1 px-2.5 rounded-[8px] font-medium text-[13px] transition-all cursor-pointer ${
                activeVaultSection === 'documents'
                  ? 'bg-[var(--surface)] text-[#1B4B91] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documents</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium ${
                activeVaultSection === 'documents'
                  ? 'bg-[#1B4B91]/15 text-[#1B4B91]'
                  : 'bg-[var(--line)] text-[var(--ink)]'
              }`}>
                {documentCount}
              </span>
            </button>
          </div>

          {/* Search Bar Right After Selector */}
          <div className="relative flex-1 min-w-[180px]">
            <label htmlFor="vault-search-input" className="sr-only">Search accounts</label>
            <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="vault-search-input"
              type="text"
              placeholder="Search accounts, logins, notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] pl-9 pr-8 py-1.5 text-[14px] text-[var(--ink)] placeholder-[var(--muted)] outline-none focus:border-[#1B4B91]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Controls: Sections Dropdown, View Mode Toggle, New Section Button, Add Account Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Section / Category Dropdown */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            >
              <span>
                {selectedCategory === 'All'
                  ? `All sections (${(vaultItems || []).length})`
                  : `${selectedCategory} (${getSectionItemCount(selectedCategory)})`}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isCategoryDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => {
                    setIsCategoryDropdownOpen(false);
                    setIsAddingSection(false);
                  }}
                />
                <Card className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-64 py-2 z-40 flex flex-col shadow-lg">
                  <div className="px-2.5 pb-2 border-b border-[var(--line)]">
                    {isAddingSection ? (
                      <div className="flex items-center gap-1 bg-[var(--surface)] border border-[#1B4B91] rounded-[8px] px-2 py-1.5">
                        <label htmlFor="new-vault-section-input" className="sr-only">New section name</label>
                        <input
                          id="new-vault-section-input"
                          type="text"
                          placeholder="Section name..."
                          value={newSectionInput}
                          onChange={e => setNewSectionInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleCreateSection();
                              setIsCategoryDropdownOpen(false);
                            }
                            if (e.key === 'Escape') setIsAddingSection(false);
                          }}
                          className="text-[13px] font-medium text-[var(--ink)] outline-none w-full bg-transparent"
                          autoFocus
                        />
                        <button
                          type="button"
                          aria-label="Save section"
                          onClick={() => {
                            handleCreateSection();
                            setIsCategoryDropdownOpen(false);
                          }}
                          className="p-1 bg-[#1B4B91] text-white rounded-[8px] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Cancel new section"
                          onClick={() => setIsAddingSection(false)}
                          className="p-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setIsAddingSection(true);
                          setNewSectionInput('');
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        <span>New section</span>
                      </Button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto pt-1 flex flex-col gap-0.5 px-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('All');
                        setIsCategoryDropdownOpen(false);
                        setIsAddingSection(false);
                      }}
                      className={`w-full px-3 py-2 rounded-[8px] text-[13px] font-medium flex items-center justify-between text-left cursor-pointer transition-colors ${
                        selectedCategory === 'All'
                          ? 'bg-[#1B4B91]/10 text-[#1B4B91]'
                          : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {selectedCategory === 'All' ? <Check className="w-3.5 h-3.5 text-[#1B4B91]" /> : <span className="w-3.5" />}
                        <span>All</span>
                      </div>
                      <span className="text-[13px] px-2 py-0.5 rounded-[8px] font-medium bg-[var(--surface-subtle)] text-[var(--muted)]">
                        {(vaultItems || []).length}
                      </span>
                    </button>

                    {allSections.map(sec => {
                      const count = getSectionItemCount(sec);
                      const isSelected = selectedCategory.toLowerCase() === sec.toLowerCase();
                      const isBuiltInFavorites = sec.toLowerCase() === 'favorites';
                      return (
                        <div
                          key={sec}
                          className={`w-full px-3 py-2 rounded-[8px] text-[13px] font-medium flex items-center justify-between text-left cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#1B4B91]/10 text-[#1B4B91]'
                              : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                          }`}
                          onClick={() => {
                            setSelectedCategory(sec);
                            setIsCategoryDropdownOpen(false);
                            setIsAddingSection(false);
                          }}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 text-[#1B4B91] shrink-0" />
                            ) : isBuiltInFavorites ? (
                              <Star className="w-3.5 h-3.5 text-[#B45309] fill-[#B45309] shrink-0" />
                            ) : (
                              <span className="w-3.5 shrink-0" />
                            )}
                            <span className="truncate">{sec}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[13px] px-2 py-0.5 rounded-[8px] font-medium bg-[var(--surface-subtle)] text-[var(--muted)]">
                              {count}
                            </span>
                            {count === 0 && !isBuiltInFavorites && (
                              <button
                                type="button"
                                aria-label={`Delete empty section ${sec}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSection(sec);
                                }}
                                className="p-1 text-[var(--muted)] hover:text-[#B91C1C] rounded-[8px] transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* View Mode Toggle: Grid / List */}
          <div className="flex items-center bg-[var(--surface-subtle)] p-0.5 rounded-[8px] border border-[var(--line)]">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              title="Grid view"
              className={`p-1.5 rounded-[6px] transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[var(--surface)] text-[#1B4B91] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('list')}
              title="List view"
              className={`p-1.5 rounded-[6px] transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[var(--surface)] text-[#1B4B91] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* New Section Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsAddingSection(true);
              setIsCategoryDropdownOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>New section</span>
          </Button>

          {/* Add Account Primary Button */}
          <Button
            variant="primary"
            size="sm"
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
              setShowAddForm(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Add account</span>
          </Button>
        </div>
      </Card>

      {/* Add / Edit Form */}
      {showAddForm && (
        <Card className="p-5">
          <form onSubmit={handleSaveForm} className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <span className="font-semibold text-[var(--ink)] text-[16px] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#1B4B91]" />
                <span>{editingId ? 'Edit account credentials' : 'Add account credentials'}</span>
              </span>
              <button
                type="button"
                aria-label="Close form"
                onClick={() => { setShowAddForm(false); setEditingId(null); }}
                className="text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer p-1 rounded-[8px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="vault-service-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                  Account or service name *
                </label>
                <input
                  id="vault-service-input"
                  type="text"
                  required
                  placeholder="e.g. PG&E, Chase, Netflix, Kaiser"
                  value={formState.service}
                  onChange={e => setFormState({ ...formState, service: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--line)] text-[15px] font-medium text-[var(--ink)]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="vault-category-input" className="block text-[13px] font-medium text-[var(--ink)]">
                    Section
                  </label>
                  {allSections.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewSection(!isCreatingNewSection)}
                      className="text-[13px] text-[#1B4B91] hover:underline font-medium cursor-pointer"
                    >
                      {isCreatingNewSection ? 'Pick existing' : '+ New section'}
                    </button>
                  )}
                </div>
                {isCreatingNewSection || allSections.length === 0 ? (
                  <input
                    id="vault-category-input"
                    type="text"
                    placeholder="Type section name..."
                    value={formState.category || ''}
                    onChange={e => setFormState({ ...formState, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-[8px] bg-[var(--surface)] border border-[#1B4B91] text-[15px] font-medium text-[var(--ink)]"
                  />
                ) : (
                  <select
                    id="vault-category-input"
                    value={formState.category || allSections[0] || ''}
                    onChange={e => {
                      if (e.target.value === '__new__') {
                        setIsCreatingNewSection(true);
                        setFormState({ ...formState, category: '' });
                      } else {
                        setFormState({ ...formState, category: e.target.value });
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--line)] text-[15px] font-medium text-[var(--ink)] cursor-pointer"
                  >
                    {allSections.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="__new__">+ Create new section...</option>
                  </select>
                )}
              </div>

              <div>
                <label htmlFor="vault-website-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                  Website URL
                </label>
                <input
                  id="vault-website-input"
                  type="text"
                  placeholder="e.g. pge.com or https://chase.com"
                  value={formState.website}
                  onChange={e => setFormState({ ...formState, website: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--line)] text-[15px] text-[var(--ink)]"
                />
              </div>

              <div>
                <label htmlFor="vault-username-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                  Username or email
                </label>
                <input
                  id="vault-username-input"
                  type="text"
                  placeholder="Username or email"
                  value={formState.username}
                  onChange={e => setFormState({ ...formState, username: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--line)] text-[15px] text-[var(--ink)]"
                />
              </div>

              <div>
                <label htmlFor="vault-password-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="vault-password-input"
                    type={showFormPassword ? 'text' : 'password'}
                    placeholder="Password or PIN"
                    value={formState.password}
                    onChange={e => setFormState({ ...formState, password: e.target.value })}
                    className="w-full pl-3.5 pr-9 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--line)] text-[15px] text-[var(--ink)]"
                  />
                  <button
                    type="button"
                    aria-label={showFormPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] p-1 cursor-pointer"
                  >
                    {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="vault-acctnum-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                  Account number or member ID
                </label>
                <input
                  id="vault-acctnum-input"
                  type="text"
                  placeholder="Account #, Member ID, or Policy #"
                  value={formState.accountNumber}
                  onChange={e => setFormState({ ...formState, accountNumber: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--line)] text-[15px] text-[var(--ink)]"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label htmlFor="vault-notes-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                  Notes or security questions (optional)
                </label>
                <input
                  id="vault-notes-input"
                  type="text"
                  placeholder="e.g. 2FA recovery code, security questions, renewal date..."
                  value={formState.notes}
                  onChange={e => setFormState({ ...formState, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--line)] text-[15px] text-[var(--ink)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--line)]">
              <Button
                variant="secondary"
                onClick={() => { setShowAddForm(false); setEditingId(null); }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {editingId ? 'Save changes' : 'Save account'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Accounts List */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="No saved accounts in this section"
          message="Store your household, utility, banking, and healthcare logins securely in one place."
          actionLabel="Add account"
          onAction={() => setShowAddForm(true)}
        />
      ) : (
        <div
          className={
            viewMode === 'list'
              ? 'flex flex-col gap-3 w-full max-w-4xl mx-auto'
              : cardSize === 'small'
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'
              : cardSize === 'large'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5'
          }
        >
          {filteredItems.map(item => {
            const isExpanded = Boolean(expandedCardIds[item.id]);
            const isPwVisible = Boolean(visiblePasswords[item.id]);
            const isFav = Boolean(item.isFavorite);

            return (
              <Card
                key={item.id}
                className={`overflow-hidden transition-all ${
                  isExpanded ? 'border-[#1B4B91]' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleCardExpand(item.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-[var(--surface-subtle)] transition-colors text-left"
                >
                  <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 ${
                    isExpanded ? 'bg-[#1B4B91] text-white' : 'bg-[var(--surface-subtle)] text-[var(--ink)]'
                  }`}>
                    <KeyRound className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[15px] text-[var(--ink)] truncate">
                        {item.service}
                      </span>
                      {isFav && (
                        <Star className="w-3.5 h-3.5 text-[#B45309] fill-[#B45309] shrink-0" />
                      )}
                    </div>
                    {item.category && (
                      <span className="text-[13px] font-medium text-[var(--muted)] block truncate">
                        {item.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronDown className={`w-4 h-4 text-[var(--muted)] transition-transform ${isExpanded ? 'rotate-180 text-[#1B4B91]' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--line)] bg-[var(--surface-subtle)]/50 px-4 pb-4 pt-3 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        {item.website && (
                          <a
                            href={item.website.startsWith('http') ? item.website : `https://${item.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[13px] text-[#1B4B91] hover:underline font-medium"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[200px]">
                              {item.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                            </span>
                          </a>
                        )}
                        {item.notes && (
                          <p className="text-[13px] font-medium text-[var(--muted)]">{item.notes}</p>
                        )}
                      </div>

                      <div className="relative flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          aria-label="Account actions"
                          onClick={() => setOpenCardMenuId(openCardMenuId === item.id ? null : item.id)}
                          className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] cursor-pointer transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openCardMenuId === item.id && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setOpenCardMenuId(null)} />
                            <Card className="absolute right-0 top-full mt-1 w-40 py-1 z-40 flex flex-col shadow-lg">
                              <button
                                type="button"
                                onClick={() => handleToggleFavorite(item.id)}
                                className="w-full px-3 py-2 text-left text-[13px] font-medium hover:bg-[var(--surface-subtle)] flex items-center gap-2 cursor-pointer text-[var(--ink)]"
                              >
                                <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'text-[#B45309] fill-[#B45309]' : 'text-[var(--muted)]'}`} />
                                <span>{item.isFavorite ? 'Unfavorite' : 'Favorite'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  handleStartEdit(item);
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-medium hover:bg-[var(--surface-subtle)] flex items-center gap-2 cursor-pointer text-[var(--ink)]"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[var(--muted)]" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenCardMenuId(null);
                                  setItemToDelete(item);
                                }}
                                className="w-full px-3 py-2 text-left text-[13px] font-medium hover:bg-[#B91C1C]/10 text-[#B91C1C] flex items-center gap-2 cursor-pointer border-t border-[var(--line)]"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </Card>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {/* Username */}
                      <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[13px] text-[var(--muted)] block font-medium">Username / login</span>
                          <span className="text-[15px] font-medium text-[var(--ink)] truncate block">
                            {item.username || '—'}
                          </span>
                        </div>
                        {item.username && (
                          <button
                            type="button"
                            aria-label="Copy username"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(item.username, `${item.id}-user`, false);
                            }}
                            className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer rounded-[8px]"
                          >
                            {copiedKey === `${item.id}-user` ? <Check className="w-4 h-4 text-[#15803D]" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                      </div>

                      {/* Password */}
                      <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[13px] text-[var(--muted)] block font-medium">Password</span>
                          <span className="text-[15px] font-medium text-[var(--ink)] truncate block">
                            {item.password ? (isPwVisible ? item.password : '••••••••••') : '—'}
                          </span>
                        </div>
                        {item.password && (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              aria-label={isPwVisible ? 'Hide password' : 'Show password'}
                              onClick={() => togglePasswordVisibility(item.id)}
                              className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer rounded-[8px]"
                            >
                              {isPwVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              aria-label="Copy password"
                              onClick={() => handleCopy(item.password, `${item.id}-pw`, true)}
                              className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer rounded-[8px]"
                            >
                              {copiedKey === `${item.id}-pw` ? <Check className="w-4 h-4 text-[#15803D]" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Account Number */}
                      <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[13px] text-[var(--muted)] block font-medium">Account # / member ID</span>
                          <span className="text-[15px] font-medium text-[var(--ink)] truncate block">
                            {item.accountNumber || '—'}
                          </span>
                        </div>
                        {item.accountNumber && (
                          <button
                            type="button"
                            aria-label="Copy account number"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(item.accountNumber, `${item.id}-acct`, true);
                            }}
                            className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer rounded-[8px]"
                          >
                            {copiedKey === `${item.id}-acct` ? <Check className="w-4 h-4 text-[#15803D]" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(itemToDelete)}
        title="Delete account credentials?"
        message={itemToDelete ? `Are you sure you want to remove "${itemToDelete.service}" from your vault? This action cannot be undone.` : ''}
        confirmLabel="Delete account"
        variant="danger"
        onCancel={() => setItemToDelete(null)}
        onConfirm={() => {
          if (itemToDelete) {
            handleDelete(itemToDelete.id);
            setItemToDelete(null);
          }
        }}
      />
    </div>
  );
}
