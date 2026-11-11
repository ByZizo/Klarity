import React, { useState } from 'react';
import {
  Plus,
  Sparkles,
  Zap,
  Search,
  Trash2
} from 'lucide-react';
import { Button, Card, Pill, EmptyState, Skeleton, ConfirmDialog } from '../components/ui';

export function SubscriptionsPage({
  isLoading = false,
  filteredSubscriptions = [],
  filteredTotalSubscriptions = 0,
  sourceSubsList = [],
  displayTotalSubs = 0,
  subSearch = '',
  setSubSearch,
  subCategoryFilter = 'all',
  setSubCategoryFilter,
  allFilterableCards = [],
  selectedCardIds = [],
  setSelectedCardIds,
  handleDeleteSubscription,
  handleSendChatMessage,
  setIsAddSubOpen,
  MultiCardFilterDropdown,
  fmtMoney
}) {
  const [subToDelete, setSubToDelete] = useState(null);

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
            variant="secondary"
            size="sm"
            onClick={() =>
              handleSendChatMessage(
                `Please perform a full Subscription Audit on my ${sourceSubsList.length} subscriptions totaling $${displayTotalSubs.toFixed(2)}/mo (${sourceSubsList.map(s => `${s.name}: $${s.amount}`).join(', ')}). Flag any price increases, duplicate services, or ways to save.`
              )
            }
          >
            <Sparkles className="w-4 h-4" />
            Subscription audit
          </Button>
        </div>
      </div>

      {/* Recurring Detection Banner */}
      {filteredSubscriptions.length > 0 && (
        <div className="bg-[#B45309]/10 border border-[#B45309]/25 rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px] font-medium text-[#B45309]">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 shrink-0" />
            <span>
              Annual subscription spend is <span className="font-semibold">{fmtMoney(filteredTotalSubscriptions * 12)}/yr</span> across {filteredSubscriptions.length} active services.
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
            {filteredSubscriptions.map((sub) => (
              <div key={sub.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold text-[var(--ink)] break-words">{sub.name}</p>
                    {(sub.priceIncreased || (sub.name || '').toLowerCase().includes('netflix')) && (
                      <Pill variant="warning">Price increase</Pill>
                    )}
                  </div>
                  <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                    {sub.renewalDate ? `Renews ${sub.renewalDate}` : 'Renews monthly'} · {sub.category} · {sub.account || 'Card'}
                  </p>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-[15px] font-semibold text-[var(--ink)]">{fmtMoney(sub.amount)}/mo</span>
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
            ))}
          </div>
        )}

        <div className="-mx-5 -mb-5 px-5 py-3.5 bg-[var(--surface-subtle)] border-t border-[var(--line)] flex items-center justify-between text-[13px] mt-4">
          <span className="text-[var(--muted)] font-medium">Total monthly subscriptions ({filteredSubscriptions.length} active)</span>
          <span className="font-semibold text-[var(--ink)] text-[15px]">{fmtMoney(filteredTotalSubscriptions)}/mo</span>
        </div>
      </Card>

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
