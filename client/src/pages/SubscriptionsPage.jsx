import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Sparkles,
  Zap,
  Search,
  Trash2,
  X,
  ExternalLink,
  Copy,
  Check,
  Mail,
  Phone,
  KeyRound,
  Lock,
  RotateCcw
} from 'lucide-react';
import { Button, Card, Pill, EmptyState, Skeleton, ConfirmDialog } from '../components/ui';
import {
  getSubscriptionCancelPlaybook,
  detectRecurringTransactions,
  findMatchingVaultCredentials
} from '../utils/subscriptionCancelPlaybooks';
import { hasMasterPinSet, verifyMasterPin } from '../utils/securityCrypto';

function isVaultLockedNow() {
  try {
    if (!hasMasterPinSet()) return false;
    const lockType = localStorage.getItem('klarity_vault_lock_type') || 'pin';
    if (lockType === 'none') return false;
    const timeoutMode = localStorage.getItem('klarity_vault_pin_timeout') || '15m';
    if (timeoutMode === 'always') return true;
    const until = Number(sessionStorage.getItem('klarity_vault_unlocked_until') || 0);
    return Date.now() >= until;
  } catch {
    return false;
  }
}

export function SubscriptionsPage({
  isLoading = false,
  filteredSubscriptions = [],
  filteredTotalSubscriptions = 0,
  sourceSubsList = [],
  displayTotalSubs = 0,
  transactions = [],
  vaultItems = [],
  currentUser = null,
  subSearch = '',
  setSubSearch,
  subCategoryFilter = 'all',
  setSubCategoryFilter,
  allFilterableCards = [],
  selectedCardIds = [],
  setSelectedCardIds,
  handleDeleteSubscription,
  onUpdateSubscriptionStatus,
  onQuickAddSubscription,
  onOpenCancelInBrowser,
  handleSendChatMessage,
  setIsAddSubOpen,
  MultiCardFilterDropdown,
  fmtMoney
}) {
  const [subToDelete, setSubToDelete] = useState(null);
  const [showScanResults, setShowScanResults] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelTab, setCancelTab] = useState('online'); // 'online' | 'email' | 'phone'
  const [copiedKey, setCopiedKey] = useState('');
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [vaultUnlockedLocal, setVaultUnlockedLocal] = useState(false);

  const detectedRecurring = useMemo(
    () => detectRecurringTransactions(transactions, sourceSubsList),
    [transactions, sourceSubsList]
  );

  const activeFilteredCount = useMemo(
    () => filteredSubscriptions.filter((s) => s.status !== 'canceled' && s.active !== false).length,
    [filteredSubscriptions]
  );

  const cancelPlaybook = useMemo(() => {
    if (!cancelTarget) return null;
    return getSubscriptionCancelPlaybook(cancelTarget, currentUser);
  }, [cancelTarget, currentUser]);

  const matchedVaultCred = useMemo(() => {
    if (!cancelTarget || !cancelPlaybook) return null;
    return findMatchingVaultCredentials(vaultItems, cancelTarget.name, cancelPlaybook.loginDomain);
  }, [cancelTarget, cancelPlaybook, vaultItems]);

  useEffect(() => {
    if (!cancelTarget) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setCancelTarget(null);
        setPinPromptOpen(false);
        setPinInput('');
        setPinError('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancelTarget]);

  const copyText = async (text, keyLabel) => {
    if (!text) return;
    try {
      await navigator.clipboard?.writeText(String(text));
      setCopiedKey(keyLabel);
      setTimeout(() => setCopiedKey((cur) => (cur === keyLabel ? '' : cur)), 1800);
    } catch {}
  };

  const handleCopyVaultPassword = async () => {
    if (!matchedVaultCred?.password) return;
    if (isVaultLockedNow() && !vaultUnlockedLocal) {
      setPinPromptOpen(true);
      setPinError('');
      return;
    }
    await copyText(matchedVaultCred.password, 'vault_password');
  };

  const handleUnlockAndCopyPassword = async (e) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setPinError('Enter your Vault PIN or master password.');
      return;
    }
    try {
      const res = await verifyMasterPin(pinInput.trim());
      if (!res?.valid) {
        setPinError(res?.error || 'Incorrect Vault PIN.');
        return;
      }
      setVaultUnlockedLocal(true);
      setPinPromptOpen(false);
      setPinInput('');
      setPinError('');
      if (matchedVaultCred?.password) {
        await copyText(matchedVaultCred.password, 'vault_password');
      }
    } catch {
      setPinError('Could not verify Vault PIN.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-52" />
        <Card className="p-4">
          <Skeleton className="h-10 w-full" />
        </Card>
        <Card className="p-5">
          <Skeleton className="h-56 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold text-[var(--ink)] tracking-tight">
            Subscriptions
          </h1>
          <p className="text-[15px] font-medium text-[var(--muted)] mt-0.5">
            Review recurring memberships, streaming services, and annual subscription totals.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setIsAddSubOpen(true)}>
            <Plus className="w-4 h-4" />
            Add subscription
          </Button>
          <Button
            variant={showScanResults ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowScanResults((prev) => !prev)}
          >
            <Search className="w-4 h-4" />
            Scan transactions{detectedRecurring.length > 0 ? ` (${detectedRecurring.length})` : ''}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              handleSendChatMessage(
                `Please perform a full Subscription Audit on my ${sourceSubsList.filter((s) => s.status !== 'canceled' && s.active !== false).length} active subscriptions totaling $${displayTotalSubs.toFixed(2)}/mo (${sourceSubsList
                  .filter((s) => s.status !== 'canceled' && s.active !== false)
                  .map((s) => `${s.name}: $${s.amount}`)
                  .join(', ')}). Flag any price increases, duplicate services, or ways to save.`
              )
            }
          >
            <Sparkles className="w-4 h-4" />
            Subscription audit
          </Button>
        </div>
      </div>

      {/* Scanned Recurring Charges Panel */}
      {showScanResults && (
        <Card className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-[var(--ink)]">
              Recurring charges found in transactions
            </h2>
            <button
              type="button"
              onClick={() => setShowScanResults(false)}
              aria-label="Close transaction scan results"
              className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {detectedRecurring.length === 0 ? (
            <p className="text-[13px] font-medium text-[var(--muted)]">
              No untracked recurring subscription charges were detected in your synced transactions.
            </p>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {detectedRecurring.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--ink)] truncate">{item.name}</p>
                    <p className="text-[12.5px] font-medium text-[var(--muted)]">
                      {item.category} · {item.occurrences > 1 ? `${item.occurrences} recurring charges` : item.renewalDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="privacy-sensitive text-[14px] font-semibold text-[var(--ink)]">
                      {fmtMoney(item.amount)}/mo
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onQuickAddSubscription?.(item)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Recurring Detection Banner */}
      {activeFilteredCount > 0 && (
        <div className="bg-[#B45309]/10 border border-[#B45309]/25 rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px] font-medium text-[#B45309]">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 shrink-0" />
            <span>
              Annual subscription spend is <span className="privacy-sensitive font-semibold">{fmtMoney(filteredTotalSubscriptions * 12)}/yr</span> across {activeFilteredCount} active services.
            </span>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <label htmlFor="sub-search-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
            Search subscriptions
          </label>
          <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2">
            <Search className="w-4 h-4 text-[var(--muted)] shrink-0" />
            <input
              id="sub-search-input"
              type="text"
              placeholder="Search by service or category..."
              value={subSearch}
              onChange={(e) => setSubSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-[15px] font-medium text-[var(--ink)] placeholder-[var(--muted)]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="sub-category-select" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
            Category filter
          </label>
          <select
            id="sub-category-select"
            value={subCategoryFilter}
            onChange={(e) => setSubCategoryFilter(e.target.value)}
            className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2.5 text-[15px] font-medium text-[var(--ink)] cursor-pointer"
          >
            <option value="all">All categories</option>
            <option value="Streaming">Streaming</option>
            <option value="Music">Music</option>
            <option value="Cloud Storage">Cloud Storage</option>
            <option value="AI & Software">AI &amp; Software</option>
            <option value="Entertainment">Entertainment</option>
          </select>
        </div>

        <div>
          <span className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
            Card or account
          </span>
          {MultiCardFilterDropdown && (
            <MultiCardFilterDropdown
              cards={allFilterableCards}
              selectedCardIds={selectedCardIds}
              onChangeSelectedCards={setSelectedCardIds}
            />
          )}
        </div>
      </Card>

      {/* Subscriptions List */}
      <Card className="p-5 overflow-hidden">
        {filteredSubscriptions.length === 0 ? (
          <EmptyState
            title="No subscriptions found"
            message={
              selectedCardIds.length > 0 || subSearch || subCategoryFilter !== 'all'
                ? 'No recurring subscriptions match your active filters.'
                : 'Add your recurring subscriptions to track monthly and annual costs.'
            }
            actionLabel={
              selectedCardIds.length > 0 || subSearch || subCategoryFilter !== 'all'
                ? 'Clear filters'
                : 'Add subscription'
            }
            onAction={() => {
              if (selectedCardIds.length > 0 || subSearch || subCategoryFilter !== 'all') {
                setSelectedCardIds([]);
                setSubSearch('');
                setSubCategoryFilter('all');
              } else {
                setIsAddSubOpen(true);
              }
            }}
          />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {filteredSubscriptions.map((sub) => {
              const subStatus = sub.status || (sub.active === false ? 'canceled' : 'active');
              const isCanceled = subStatus === 'canceled';
              const isCanceling = subStatus === 'canceling';

              return (
                <div key={sub.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-[15px] font-semibold break-words ${isCanceled ? 'text-[var(--muted)] line-through' : 'text-[var(--ink)]'}`}>
                        {sub.name}
                      </p>
                      {isCanceling && <Pill variant="warning">Canceling</Pill>}
                      {isCanceled && <Pill variant="neutral">Canceled</Pill>}
                      {!isCanceled && (sub.priceIncreased || (sub.name || '').toLowerCase().includes('netflix')) && (
                        <Pill variant="warning">Price increase</Pill>
                      )}
                    </div>
                    <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                      {sub.renewalDate ? `Renews ${sub.renewalDate}` : 'Renews monthly'} · {sub.category} · {sub.account || 'Card'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-center">
                    <span className={`privacy-sensitive text-[15px] font-semibold ${isCanceled ? 'text-[var(--muted)] line-through' : 'text-[var(--ink)]'}`}>
                      {fmtMoney(sub.amount)}/mo
                    </span>

                    {isCanceled ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onUpdateSubscriptionStatus?.(sub.id, 'active')}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setCancelTarget(sub);
                          setCancelTab('online');
                          setCopiedKey('');
                          setPinPromptOpen(false);
                          setPinInput('');
                          setPinError('');
                          setVaultUnlockedLocal(false);
                        }}
                      >
                        Cancel
                      </Button>
                    )}

                    <button
                      type="button"
                      aria-label={`Delete subscription ${sub.name}`}
                      onClick={() => setSubToDelete(sub)}
                      className="p-2 text-[var(--muted)] hover:text-[#B91C1C] rounded-[8px] hover:bg-[#B91C1C]/10 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="-mx-5 -mb-5 px-5 py-3.5 bg-[var(--surface-subtle)] border-t border-[var(--line)] flex items-center justify-between text-[13px] mt-4">
          <span className="text-[var(--muted)] font-medium">Total monthly subscriptions ({activeFilteredCount} active)</span>
          <span className="privacy-sensitive font-semibold text-[var(--ink)] text-[15px]">{fmtMoney(filteredTotalSubscriptions)}/mo</span>
        </div>
      </Card>

      {/* Cancel Assistant Modal */}
      {cancelTarget && cancelPlaybook && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-assistant-title"
          onClick={() => setCancelTarget(null)}
        >
          <Card
            className="max-w-lg w-full max-h-[88vh] flex flex-col p-5 sm:p-6 gap-4 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h2 id="cancel-assistant-title" className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                  Cancel {cancelTarget.name}
                </h2>
                <Pill variant="success">Save {fmtMoney(Number(cancelTarget.amount || 0) * 12)}/yr</Pill>
              </div>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                aria-label="Close cancel assistant"
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Method Tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-[var(--surface-subtle)] p-1 rounded-[10px] border border-[var(--line)] shrink-0">
              {[
                { id: 'online', label: 'Online steps' },
                { id: 'email', label: 'Email draft' },
                { id: 'phone', label: 'Phone script' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCancelTab(t.id)}
                  className={`py-1.5 px-2 rounded-[8px] text-[13px] font-semibold transition-colors cursor-pointer ${
                    cancelTab === t.id
                      ? 'bg-[var(--surface)] text-[var(--brand)] border border-[var(--line)] shadow-2xs'
                      : 'text-[var(--muted)] hover:text-[var(--ink)] border border-transparent'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
              {cancelTab === 'online' && (
                <>
                  <ol className="space-y-2.5">
                    {cancelPlaybook.steps.map((stepText, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-[14px] font-medium text-[var(--ink)] leading-snug">
                        <span className="w-5 h-5 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] text-[12px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{stepText}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const targetSub = cancelTarget;
                        const pb = cancelPlaybook;
                        setCancelTarget(null);
                        onOpenCancelInBrowser?.(targetSub, pb);
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open cancellation page in Browser
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const targetName = cancelTarget.name;
                        const targetAmt = fmtMoney(cancelTarget.amount);
                        setCancelTarget(null);
                        handleSendChatMessage?.(
                          `Help me cancel my ${targetName} subscription (${targetAmt}/mo). Give me exact instructions and tell me what to watch out for.`
                        );
                      }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Ask Advisor
                    </Button>
                  </div>

                  {/* Matched Password Vault Entry */}
                  {matchedVaultCred && (
                    <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-subtle)] p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-[var(--ink)] flex items-center gap-1.5">
                          <KeyRound className="w-4 h-4 text-[var(--brand)]" />
                          Saved login in Vault ({matchedVaultCred.service})
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {matchedVaultCred.username && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => copyText(matchedVaultCred.username, 'vault_username')}
                          >
                            {copiedKey === 'vault_username' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedKey === 'vault_username' ? 'Copied username' : `Copy ${matchedVaultCred.username}`}
                          </Button>
                        )}
                        {matchedVaultCred.password && (
                          <Button variant="secondary" size="sm" onClick={handleCopyVaultPassword}>
                            {copiedKey === 'vault_password' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedKey === 'vault_password' ? 'Copied password' : 'Copy password'}
                          </Button>
                        )}
                      </div>
                      {pinPromptOpen && (
                        <form onSubmit={handleUnlockAndCopyPassword} className="flex flex-wrap items-center gap-2 pt-1">
                          <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <input
                            type="password"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            placeholder="Enter Vault PIN"
                            aria-label="Vault PIN"
                            className="flex-1 min-w-[140px] h-8 px-2.5 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[13px] text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                          />
                          <Button type="submit" variant="primary" size="sm">
                            Unlock &amp; copy
                          </Button>
                          {pinError && (
                            <p className="w-full text-[12px] font-medium text-[var(--danger)]">{pinError}</p>
                          )}
                        </form>
                      )}
                    </div>
                  )}
                </>
              )}

              {cancelTab === 'email' && (
                <div className="space-y-3">
                  <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-subtle)] p-3.5 space-y-2">
                    <div className="text-[12.5px] font-semibold text-[var(--muted)]">
                      Subject: <span className="text-[var(--ink)]">{cancelPlaybook.emailDraft.subject}</span>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-[13px] font-medium text-[var(--ink)] leading-relaxed">
                      {cancelPlaybook.emailDraft.body}
                    </pre>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => copyText(cancelPlaybook.emailDraft.body, 'email_body')}
                    >
                      {copiedKey === 'email_body' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'email_body' ? 'Email copied' : 'Copy email'}
                    </Button>
                    <a
                      href={cancelPlaybook.emailDraft.mailtoHref}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[13px] font-semibold text-[var(--ink)] transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-[var(--brand)]" />
                      Open in Mail app
                    </a>
                  </div>
                </div>
              )}

              {cancelTab === 'phone' && (
                <div className="space-y-3">
                  {cancelPlaybook.supportPhone ? (
                    <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-subtle)] p-3.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--ink)]">
                        <Phone className="w-4 h-4 text-[var(--brand)]" />
                        <span>{cancelPlaybook.supportPhone}</span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyText(cancelPlaybook.supportPhone, 'support_phone')}
                      >
                        {copiedKey === 'support_phone' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey === 'support_phone' ? 'Copied' : 'Copy number'}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[13px] font-medium text-[var(--muted)]">
                      Use the support number listed on your billing statement or the service&apos;s contact page.
                    </p>
                  )}

                  <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface-subtle)] p-3.5 text-[14px] font-medium text-[var(--ink)] leading-relaxed">
                    &ldquo;{cancelPlaybook.phoneScript}&rdquo;
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => copyText(cancelPlaybook.phoneScript, 'phone_script')}
                  >
                    {copiedKey === 'phone_script' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'phone_script' ? 'Script copied' : 'Copy script'}
                  </Button>
                </div>
              )}
            </div>

            {/* Footer Status Actions */}
            <div className="pt-3 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onUpdateSubscriptionStatus?.(cancelTarget.id, 'canceling');
                  setCancelTarget(null);
                }}
              >
                Mark as Canceling
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onUpdateSubscriptionStatus?.(cancelTarget.id, 'canceled');
                    setCancelTarget(null);
                  }}
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark as Canceled
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(subToDelete)}
        title="Remove subscription?"
        message={subToDelete ? `Are you sure you want to remove "${subToDelete.name}" from your subscriptions?` : ''}
        confirmLabel="Remove"
        variant="danger"
        onCancel={() => setSubToDelete(null)}
        onConfirm={() => {
          if (subToDelete) {
            handleDeleteSubscription(subToDelete.id, subToDelete.name);
            setSubToDelete(null);
          }
        }}
      />
    </div>
  );
}
