import React, { useState } from 'react';
import {
  Plus,
  FileText,
  Search,
  Trash2
} from 'lucide-react';
import { Button, Card, EmptyState, Skeleton, ConfirmDialog } from '../components/ui';

export function BillsPage({
  isLoading = false,
  filteredBills = [],
  filteredTotalMonthlyBills = 0,
  billSearch = '',
  setBillSearch,
  billFilter = 'all',
  setBillFilter,
  allFilterableCards = [],
  selectedCardIds = [],
  setSelectedCardIds,
  handlePayBill,
  handleDeleteBill,
  setIsAddBillOpen,
  setIsScanBillOpen,
  MultiCardFilterDropdown,
  fmtMoney
}) {
  const [billToDelete, setBillToDelete] = useState(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
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
            Upcoming bills
          </h1>
          <p className="text-[15px] font-medium text-[var(--muted)] mt-0.5">
            Track monthly due dates, mark bills as paid, or scan statements.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setIsAddBillOpen(true)}>
            <Plus className="w-4 h-4" />
            Add bill
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsScanBillOpen(true)}>
            <FileText className="w-4 h-4" />
            Scan bill
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <label htmlFor="bill-search-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
            Search bills
          </label>
          <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2">
            <Search className="w-4 h-4 text-[var(--muted)] shrink-0" />
            <input
              id="bill-search-input"
              type="text"
              placeholder="Search bills by name or provider..."
              value={billSearch}
              onChange={(e) => setBillSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-[15px] font-medium text-[var(--ink)] placeholder-[var(--muted)]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="bill-status-select" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
            Status or category
          </label>
          <select
            id="bill-status-select"
            value={billFilter}
            onChange={(e) => setBillFilter(e.target.value)}
            className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2.5 text-[15px] font-medium text-[var(--ink)] cursor-pointer"
          >
            <option value="all">All bills</option>
            <option value="due_soon">Due soon</option>
            <option value="upcoming">Upcoming</option>
            <option value="paid">Paid</option>
            <option value="Utilities">Utilities</option>
            <option value="Housing">Housing</option>
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

      {/* Bills List */}
      <Card className="p-5 overflow-hidden">
        {filteredBills.length === 0 ? (
          <EmptyState
            title="No bills match your view"
            message={
              selectedCardIds.length > 0 || billSearch || billFilter !== 'all'
                ? 'No bills match the selected card or filter criteria.'
                : 'Add your first bill to start receiving due date reminders.'
            }
            actionLabel={
              selectedCardIds.length > 0 || billSearch || billFilter !== 'all'
                ? 'Clear filters'
                : 'Add bill'
            }
            onAction={() => {
              if (selectedCardIds.length > 0 || billSearch || billFilter !== 'all') {
                setSelectedCardIds([]);
                setBillSearch('');
                setBillFilter('all');
              } else {
                setIsAddBillOpen(true);
              }
            }}
          />
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {filteredBills.map((bill) => (
              <div key={bill.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--ink)] break-words">{bill.name}</p>
                  <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                    {bill.nextDueDate ? `Due ${bill.nextDueDate}` : `Due day ${bill.dueDay}`} · {bill.category || 'Utilities'} · {bill.account || 'Checking'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
                  <span className="text-[15px] font-semibold text-[var(--ink)]">{fmtMoney(bill.expectedAmount)}</span>
                  <Button
                    variant={bill.status === 'paid' ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => handlePayBill(bill.id, bill.name, bill.expectedAmount)}
                  >
                    {bill.status === 'paid' ? 'Paid' : 'Mark paid'}
                  </Button>
                  {handleDeleteBill && (
                    <button
                      type="button"
                      aria-label={`Delete bill ${bill.name}`}
                      onClick={() => setBillToDelete(bill)}
                      className="p-2 text-[var(--muted)] hover:text-[#B91C1C] rounded-[8px] hover:bg-[#B91C1C]/10 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="-mx-5 -mb-5 px-5 py-3.5 bg-[var(--surface-subtle)] border-t border-[var(--line)] flex items-center justify-between text-[13px] mt-4">
          <span className="text-[var(--muted)] font-medium">Total monthly bills ({filteredBills.length} active)</span>
          <span className="font-semibold text-[var(--ink)] text-[15px]">{fmtMoney(filteredTotalMonthlyBills)}</span>
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(billToDelete)}
        title="Delete bill?"
        message={billToDelete ? `Are you sure you want to delete "${billToDelete.name}"?` : ''}
        confirmLabel="Delete bill"
        variant="danger"
        onCancel={() => setBillToDelete(null)}
        onConfirm={() => {
          if (billToDelete && handleDeleteBill) {
            handleDeleteBill(billToDelete.id, billToDelete.name);
            setBillToDelete(null);
          }
        }}
      />
    </div>
  );
}
