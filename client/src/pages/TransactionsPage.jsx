import React, { useState } from 'react';
import {
  Plus,
  Upload,
  Download,
  Search,
  CreditCard,
  Trash2
} from 'lucide-react';
import { Button, Card, EmptyState, Skeleton, ConfirmDialog } from '../components/ui';

export function TransactionsPage({
  isLoading = false,
  filteredTransactions = [],
  filteredTxSpent = 0,
  filteredTxIncome = 0,
  txSearch = '',
  setTxSearch,
  categoryFilter = 'all',
  setCategoryFilter,
  allFilterableCards = [],
  selectedCardIds = [],
  setSelectedCardIds,
  editingTxNoteId,
  setEditingTxNoteId,
  editingTxNoteText = '',
  setEditingTxNoteText,
  handleSaveTxNote,
  handleRecategorizeTransaction,
  handleDeleteTransaction,
  handleExportCsv,
  csvInputRef,
  setIsAddTxOpen,
  MultiCardFilterDropdown,
  fmtMoney
}) {
  const [confirmDeleteTx, setConfirmDeleteTx] = useState(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-60" />
        <Card className="p-4">
          <Skeleton className="h-10 w-full" />
        </Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Card className="p-5">
          <Skeleton className="h-64 w-full" />
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
            Transactions
          </h1>
          <p className="text-[15px] font-medium text-[var(--muted)] mt-0.5">
            Search, categorize, and export your recorded purchases and deposits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setIsAddTxOpen(true)}>
            <Plus className="w-4 h-4" />
            Add purchase
          </Button>
          <Button variant="secondary" size="sm" onClick={() => csvInputRef.current?.click()}>
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExportCsv(filteredTransactions)}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <label htmlFor="tx-search-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
            Search purchases
          </label>
          <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2">
            <Search className="w-4 h-4 text-[var(--muted)] shrink-0" />
            <input
              id="tx-search-input"
              type="text"
              placeholder="Merchant, category, note, or amount..."
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-[15px] font-medium text-[var(--ink)] placeholder-[var(--muted)]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="tx-category-select" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
            Category filter
          </label>
          <select
            id="tx-category-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2.5 text-[15px] font-medium text-[var(--ink)] cursor-pointer"
          >
            <option value="all">All categories</option>
            <option value="Groceries">Groceries</option>
            <option value="Dining">Dining</option>
            <option value="Transportation">Transportation</option>
            <option value="Shopping">Shopping</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Travel">Travel</option>
            <option value="Utilities">Utilities</option>
            <option value="Income">Income and deposits</option>
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

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-[13px] font-medium text-[var(--muted)]">Total spending (filtered)</span>
          <p className="font-serif text-[22px] font-semibold text-[var(--ink)] mt-1">{fmtMoney(filteredTxSpent)}</p>
        </Card>
        <Card className="p-4">
          <span className="text-[13px] font-medium text-[var(--muted)]">Deposits and income</span>
          <p className="font-serif text-[22px] font-semibold text-[#15803D] mt-1">+{fmtMoney(filteredTxIncome)}</p>
        </Card>
        <Card className="p-4">
          <span className="text-[13px] font-medium text-[var(--muted)]">Matching items</span>
          <p className="font-serif text-[22px] font-semibold text-[var(--ink)] mt-1">{filteredTransactions.length} items</p>
        </Card>
      </div>

      {/* Transactions List / Table */}
      <Card className="overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No transactions found"
              message={
                selectedCardIds.length > 0 || txSearch || categoryFilter !== 'all'
                  ? 'No purchases or payments match your active filters.'
                  : 'Add your first purchase or import a CSV statement to get started.'
              }
              actionLabel={
                selectedCardIds.length > 0 || txSearch || categoryFilter !== 'all'
                  ? 'Clear filters'
                  : 'Add purchase'
              }
              onAction={() => {
                if (selectedCardIds.length > 0 || txSearch || categoryFilter !== 'all') {
                  setSelectedCardIds([]);
                  setTxSearch('');
                  setCategoryFilter('all');
                } else {
                  setIsAddTxOpen(true);
                }
              }}
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {filteredTransactions.map((tx) => {
              const isDeposit = (tx.category || '').toLowerCase() === 'income' || (tx.name || '').toLowerCase().includes('deposit');
              const displayAmount = Math.abs(Number(tx.amount));
              return (
                <div key={tx.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-[var(--ink)] break-words">{tx.name}</span>
                      <span className="text-[13px] font-medium text-[var(--muted)]">· {tx.date}</span>
                    </div>
                    <div className="text-[13px] font-medium text-[var(--muted)] mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" />
                        {tx.account || 'Checking'}
                      </span>
                    </div>
                    {editingTxNoteId === tx.id ? (
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <label htmlFor={`note-input-${tx.id}`} className="sr-only">
                          Transaction note
                        </label>
                        <input
                          id={`note-input-${tx.id}`}
                          type="text"
                          placeholder="Add a note..."
                          value={editingTxNoteText}
                          onChange={(e) => setEditingTxNoteText(e.target.value)}
                          className="bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-2.5 py-1 text-[13px] font-medium text-[var(--ink)]"
                        />
                        <Button variant="primary" size="sm" onClick={() => handleSaveTxNote(tx.id)}>
                          Save
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTxNoteId(tx.id);
                          setEditingTxNoteText(tx.notes || '');
                        }}
                        className="text-[13px] font-medium text-[#1B4B91] hover:underline mt-1 block cursor-pointer"
                      >
                        {tx.notes ? `Note: ${tx.notes}` : '+ Add note'}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
                    <div>
                      <label htmlFor={`cat-select-${tx.id}`} className="sr-only">
                        Category for {tx.name}
                      </label>
                      <select
                        id={`cat-select-${tx.id}`}
                        value={tx.category || 'Shopping'}
                        onChange={(e) => handleRecategorizeTransaction(tx.id, tx.name, e.target.value)}
                        className="px-2.5 py-1.5 rounded-[8px] text-[13px] font-medium bg-[var(--surface-subtle)] border border-[var(--line)] text-[var(--ink)] cursor-pointer"
                      >
                        <option value="Groceries">Groceries</option>
                        <option value="Dining">Dining</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Shopping">Shopping</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Travel">Travel</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Health">Health</option>
                        <option value="Income">Income</option>
                        <option value="Social Security">Social Security</option>
                        <option value="CalPERS / Pension">CalPERS / Pension</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[15px] font-semibold ${isDeposit ? 'text-[#15803D]' : 'text-[var(--ink)]'}`}>
                        {isDeposit ? `+${fmtMoney(displayAmount)}` : `-${fmtMoney(displayAmount)}`}
                      </span>
                      <button
                        type="button"
                        aria-label={`Delete transaction ${tx.name}`}
                        onClick={() => setConfirmDeleteTx(tx)}
                        className="p-2 text-[var(--muted)] hover:text-[#B91C1C] rounded-[8px] hover:bg-[#B91C1C]/10 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-[var(--surface-subtle)] px-5 py-3.5 border-t border-[var(--line)] flex items-center justify-between text-[13px]">
          <span className="text-[var(--muted)] font-medium">Total purchases ({filteredTransactions.length} shown)</span>
          <span className="font-semibold text-[var(--ink)] text-[15px]">
            {fmtMoney(filteredTxSpent)}
          </span>
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmDeleteTx)}
        title="Delete transaction?"
        message={confirmDeleteTx ? `Are you sure you want to remove "${confirmDeleteTx.name}"?` : ''}
        confirmLabel="Delete"
        variant="danger"
        onCancel={() => setConfirmDeleteTx(null)}
        onConfirm={() => {
          if (confirmDeleteTx) {
            handleDeleteTransaction(confirmDeleteTx.id, confirmDeleteTx.name);
            setConfirmDeleteTx(null);
          }
        }}
      />
    </div>
  );
}
