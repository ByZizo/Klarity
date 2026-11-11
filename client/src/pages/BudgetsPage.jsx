import React, { useState } from 'react';
import {
  Plus,
  Target,
  Trash2,
  Edit3,
  ArrowLeft,
  Sparkles,
  Check,
  Receipt,
  ChevronRight
} from 'lucide-react';
import { Button, Card, Pill, EmptyState, Skeleton, ConfirmDialog } from '../components/ui';

export function BudgetsPage({
  isLoading = false,
  computedBudgets = [],
  totalBudgetLimit = 0,
  totalBudgetSpent = 0,
  hasAnyBudgetPaymentsOnSelectedCard = true,
  allFilterableCards = [],
  selectedCardIds = [],
  setSelectedCardIds,
  editingBudgetId,
  setEditingBudgetId,
  editingBudgetLimit = '',
  setEditingBudgetLimit,
  setBudgets,
  sourceBillsList = [],
  sourceTxsList = [],
  handleSendChatMessage,
  featureFlags = {},
  savingsGoals = [],
  setSavingsGoals,
  handleContributeGoal,
  setIsAddBudgetOpen,
  setIsAddGoalOpen,
  MultiCardFilterDropdown,
  onShowToast,
  fmtMoney
}) {
  const [budgetToDelete, setBudgetToDelete] = useState(null);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [isAiSelectingBills, setIsAiSelectingBills] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-56" />
        <Card className="p-5">
          <Skeleton className="h-24 w-full" />
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      </div>
    );
  }

  const activeBudget = selectedBudgetId
    ? computedBudgets.find((b) => b.id === selectedBudgetId)
    : null;

  const getEffectiveBillIdsForBudget = (b) => {
    if (!b) return [];
    if (Array.isArray(b.assignedBillIds)) return b.assignedBillIds;
    if (Array.isArray(b.defaultMatchedBillIds)) return b.defaultMatchedBillIds;
    return [];
  };

  const handleToggleBillForBudget = (budget, billId) => {
    const currentIds = getEffectiveBillIdsForBudget(budget);
    const exists = currentIds.includes(billId);
    const nextIds = exists
      ? currentIds.filter((id) => id !== billId)
      : [...currentIds, billId];

    setBudgets((prev) =>
      prev.map((item) =>
        item.id === budget.id ? { ...item, assignedBillIds: nextIds } : item
      )
    );
  };

  const handleAskAiToSelectBills = async (budget) => {
    if (!budget) return;
    setIsAiSelectingBills(true);
    try {
      const catLower = (budget.category || '').toLowerCase();
      const matched = (sourceBillsList || []).filter((bill) => {
        const text = `${bill.name || ''} ${bill.category || ''} ${bill.biller || ''}`.toLowerCase();
        if (catLower.includes('utilit') || catLower.includes('bill')) {
          return /electric|pg&e|pge|coned|con ed|water|gas|trash|sewer|internet|wifi|fios|xfinity|comcast|at&t|verizon|t-mobile|phone|utility|utilities/i.test(text);
        }
        if (catLower.includes('hous') || catLower.includes('home') || catLower.includes('rent') || catLower.includes('mortgage')) {
          return /rent|mortgage|hoa|property|home|housing|warranty|homeshield|electric|pg&e|pge|water|gas|internet/i.test(text);
        }
        if (catLower.includes('auto') || catLower.includes('transp') || catLower.includes('car') || catLower.includes('gas')) {
          return /geico|state farm|progressive|allstate|aaa|auto|car|vehicle|insurance|dmv|fastrak/i.test(text);
        }
        if (catLower.includes('insur')) {
          return /insurance|geico|state farm|progressive|allstate|kaiser|health|policy/i.test(text);
        }
        if (catLower.includes('health') || catLower.includes('med')) {
          return /kaiser|health|medical|dental|doctor|vision|anthem|blue|cvs|walgreens/i.test(text);
        }
        if (catLower.includes('phone') || catLower.includes('internet') || catLower.includes('tech')) {
          return /verizon|fios|at&t|t-mobile|xfinity|comcast|spectrum|internet|wifi|phone|mobile/i.test(text);
        }
        return (bill.category || '').toLowerCase() === catLower || text.includes(catLower);
      });

      const matchedIds = matched.map((b) => b.id);
      setBudgets((prev) =>
        prev.map((item) =>
          item.id === budget.id ? { ...item, assignedBillIds: matchedIds } : item
        )
      );

      if (onShowToast) {
        onShowToast(
          matchedIds.length > 0
            ? `AI selected ${matchedIds.length} bill${matchedIds.length === 1 ? '' : 's'} for ${budget.category}`
            : `No matching recurring bills found for ${budget.category}`,
          'success'
        );
      }

      if (handleSendChatMessage) {
        handleSendChatMessage(
          `Please select and review the bills that should count toward my ${budget.category} budget.`
        );
      }
    } finally {
      setIsAiSelectingBills(false);
    }
  };

  // =========================================================================
  // DEDICATED INDIVIDUAL BUDGET PAGE VIEW
  // =========================================================================
  if (activeBudget) {
    const selectedBillIds = getEffectiveBillIdsForBudget(activeBudget);
    const assignedBillsSum = (sourceBillsList || [])
      .filter((bill) => selectedBillIds.includes(bill.id))
      .reduce((s, bill) => s + Number(bill.expectedAmount || 0), 0);
    const txSpent = Number(activeBudget.txSpent ?? Math.max(0, activeBudget.spent - assignedBillsSum));
    const catLower = (activeBudget.category || '').toLowerCase();
    const matchingTxs = (sourceTxsList || []).filter((t) => {
      const tc = (t.category || '').toLowerCase();
      if (tc === 'income') return false;
      if (catLower === 'gas' || catLower === 'transportation') {
        return tc === 'gas' || tc === 'transportation';
      }
      return tc === catLower;
    });

    return (
      <div className="flex flex-col gap-6">
        {/* Top Back & Budget Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setSelectedBudgetId(null)}
              aria-label="Back to all budgets"
              className="mt-1 p-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--ink)] transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-[26px] font-semibold text-[var(--ink)] tracking-tight">
                  {activeBudget.category} budget
                </h1>
                {activeBudget.isOver && <Pill variant="danger">Over budget</Pill>}
                {activeBudget.isWarning && <Pill variant="warning">Near limit ({activeBudget.pct}%)</Pill>}
                {!activeBudget.isOver && !activeBudget.isWarning && <Pill variant="success">On track</Pill>}
              </div>
              <p className="text-[15px] font-medium text-[var(--muted)] mt-0.5">
                Select which recurring bills count toward this budget or ask your AI Advisor to match them automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAskAiToSelectBills(activeBudget)}
              disabled={isAiSelectingBills}
            >
              <Sparkles className="w-4 h-4 text-[#1B4B91]" />
              <span>{isAiSelectingBills ? 'Matching bills...' : 'Ask AI to select bills'}</span>
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setBudgetToDelete(activeBudget)}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete budget</span>
            </Button>
          </div>
        </div>

        {/* Budget Summary Metrics Card */}
        <Card className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)]">
          <div>
            <span className="text-[13px] text-[var(--muted)] font-medium">Spent in {activeBudget.category}</span>
            <p className="font-serif text-[24px] font-semibold text-[var(--ink)] mt-1">
              {fmtMoney(activeBudget.spent)}
            </p>
            <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
              Bills: {fmtMoney(assignedBillsSum)} · Purchases: {fmtMoney(txSpent)}
            </p>
          </div>

          <div className="pt-3 sm:pt-0 sm:pl-6">
            <span className="text-[13px] text-[var(--muted)] font-medium">Monthly limit</span>
            {editingBudgetId === activeBudget.id ? (
              <div className="flex items-center gap-1.5 mt-1.5">
                <label htmlFor={`detail-edit-budget-${activeBudget.id}`} className="sr-only">
                  Monthly limit for {activeBudget.category}
                </label>
                <input
                  id={`detail-edit-budget-${activeBudget.id}`}
                  type="number"
                  value={editingBudgetLimit}
                  onChange={(e) => setEditingBudgetLimit(e.target.value)}
                  className="w-28 bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-2.5 py-1.5 text-[15px] font-medium text-[var(--ink)]"
                  autoFocus
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const val = parseFloat(editingBudgetLimit);
                    if (!isNaN(val) && val > 0) {
                      setBudgets((prev) =>
                        prev.map((item) => (item.id === activeBudget.id ? { ...item, limit: val } : item))
                      );
                      if (onShowToast) onShowToast(`Updated ${activeBudget.category} budget`, 'success');
                    }
                    setEditingBudgetId(null);
                  }}
                >
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="font-serif text-[24px] font-semibold text-[var(--ink)]">
                  {fmtMoney(activeBudget.limit, 0)}
                </p>
                <button
                  type="button"
                  aria-label={`Edit ${activeBudget.category} monthly limit`}
                  title="Edit limit"
                  onClick={() => {
                    setEditingBudgetId(activeBudget.id);
                    setEditingBudgetLimit(String(activeBudget.limit));
                  }}
                  className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[#1B4B91] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
              Last month: {fmtMoney(activeBudget.lastMonth, 0)}
            </p>
          </div>

          <div className="pt-3 sm:pt-0 sm:pl-6">
            <span className="text-[13px] text-[var(--muted)] font-medium">Remaining budget</span>
            <p
              className={`font-serif text-[24px] font-semibold mt-1 ${
                activeBudget.limit - activeBudget.spent < 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'
              }`}
            >
              {activeBudget.limit - activeBudget.spent >= 0
                ? fmtMoney(activeBudget.limit - activeBudget.spent)
                : `${fmtMoney(activeBudget.spent - activeBudget.limit)} over`}
            </p>
            <div className="w-full h-2 bg-[var(--surface-subtle)] rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all ${
                  activeBudget.isOver
                    ? 'bg-[#B91C1C]'
                    : activeBudget.isWarning
                    ? 'bg-[#B45309]'
                    : 'bg-[#15803D]'
                }`}
                style={{ width: `${Math.min(100, Math.max(2, activeBudget.pct))}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Bills Selector Section */}
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
            <div>
              <h2 className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                Bills that count toward {activeBudget.category}
              </h2>
              <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                Check the recurring bills you want included in this monthly budget ({selectedBillIds.length} selected · {fmtMoney(assignedBillsSum)}/mo).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAskAiToSelectBills(activeBudget)}
                disabled={isAiSelectingBills}
              >
                <Sparkles className="w-4 h-4 text-[#1B4B91]" />
                <span>{isAiSelectingBills ? 'Selecting...' : 'Ask AI to select bills'}</span>
              </Button>
              {selectedBillIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBudgets((prev) =>
                      prev.map((item) =>
                        item.id === activeBudget.id ? { ...item, assignedBillIds: [] } : item
                      )
                    );
                    if (onShowToast) onShowToast(`Cleared bills from ${activeBudget.category}`, 'success');
                  }}
                >
                  Clear selection
                </Button>
              )}
            </div>
          </div>

          {(!sourceBillsList || sourceBillsList.length === 0) ? (
            <EmptyState
              title="No recurring bills found"
              message="Add recurring bills on the Bills page to include them in your category budgets."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sourceBillsList.map((bill) => {
                const isChecked = selectedBillIds.includes(bill.id);
                return (
                  <div
                    key={bill.id}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    onClick={() => handleToggleBillForBudget(activeBudget, bill.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggleBillForBudget(activeBudget, bill.id);
                      }
                    }}
                    className={`p-3.5 rounded-[12px] border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isChecked
                        ? 'border-[#1B4B91] bg-[#1B4B91]/5'
                        : 'border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-[6px] border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-[#1B4B91] border-[#1B4B91] text-white'
                            : 'border-[var(--line)] bg-[var(--surface)]'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] font-semibold text-[var(--ink)] truncate">
                            {bill.name}
                          </span>
                          <Pill variant="neutral">{bill.category || 'Utilities'}</Pill>
                        </div>
                        <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                          {bill.dueText || (bill.dueDay ? `Due day ${bill.dueDay}` : 'Monthly')}
                          {bill.account ? ` · ${bill.account}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[15px] font-semibold text-[var(--ink)]">
                        {fmtMoney(Number(bill.expectedAmount || 0))}
                      </span>
                      <span className="block text-[13px] font-medium text-[var(--muted)]">/mo</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Category Purchases Section */}
        <Card className="p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-[18px] font-semibold text-[var(--ink)]">
                Purchases in {activeBudget.category}
              </h2>
              <p className="text-[13px] font-medium text-[var(--muted)]">
                Transactions automatically counted toward this category ({matchingTxs.length} purchases · {fmtMoney(txSpent)})
              </p>
            </div>
          </div>

          {matchingTxs.length === 0 ? (
            <p className="text-[13px] font-medium text-[var(--muted)] py-2">
              No card or checking purchases recorded in {activeBudget.category} this month.
            </p>
          ) : (
            <div className="divide-y divide-[var(--line)] border border-[var(--line)] rounded-[8px]">
              {matchingTxs.slice(0, 15).map((tx) => (
                <div key={tx.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[var(--ink)] truncate">{tx.name}</p>
                    <p className="text-[13px] font-medium text-[var(--muted)]">
                      {tx.date || 'Recent'} {tx.account ? `· ${tx.account}` : ''}
                    </p>
                  </div>
                  <span className="text-[15px] font-semibold text-[var(--ink)] shrink-0">
                    {fmtMoney(Math.abs(Number(tx.amount || 0)))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Confirm Delete Budget */}
        <ConfirmDialog
          open={Boolean(budgetToDelete)}
          title="Delete category budget?"
          message={budgetToDelete ? `Are you sure you want to remove the "${budgetToDelete.category}" budget?` : ''}
          confirmLabel="Delete budget"
          variant="danger"
          onCancel={() => setBudgetToDelete(null)}
          onConfirm={() => {
            if (budgetToDelete) {
              setBudgets((prev) => prev.filter((item) => item.id !== budgetToDelete.id));
              if (onShowToast) onShowToast(`Removed ${budgetToDelete.category} budget`, 'success');
              setBudgetToDelete(null);
              setSelectedBudgetId(null);
            }
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // ALL BUDGETS OVERVIEW LIST
  // =========================================================================
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold text-[var(--ink)] tracking-tight">
            Budgets and savings goals
          </h1>
          <p className="text-[15px] font-medium text-[var(--muted)] mt-0.5">
            Click any budget to open its page, choose which bills count toward it, or ask AI to match your bills.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setIsAddBudgetOpen(true)}>
            <Plus className="w-4 h-4" />
            Set category budget
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsAddGoalOpen(true)}>
            <Target className="w-4 h-4" />
            Add savings goal
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-[var(--ink)]">Monthly spending vs. limits</p>
          <p className="text-[13px] font-medium text-[var(--muted)]">
            {selectedCardIds.length === 0
              ? 'Showing spending across all connected cards and accounts'
              : `Filtered to ${selectedCardIds.length} selected ${selectedCardIds.length === 1 ? 'card' : 'cards'}`}
          </p>
        </div>
        {MultiCardFilterDropdown && (
          <MultiCardFilterDropdown
            cards={allFilterableCards}
            selectedCardIds={selectedCardIds}
            onChangeSelectedCards={setSelectedCardIds}
          />
        )}
      </Card>

      {/* Summary Totals Bar */}
      <Card className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)]">
        <div>
          <span className="text-[13px] text-[var(--muted)] font-medium">Total monthly budget</span>
          <p className="font-serif text-[24px] font-semibold text-[var(--ink)] mt-1">{fmtMoney(totalBudgetLimit, 0)}</p>
          <p className="text-[13px] font-medium text-[var(--muted)] mt-1">{computedBudgets.length} active categories</p>
        </div>
        <div className="pt-3 sm:pt-0 sm:pl-6">
          <span className="text-[13px] text-[var(--muted)] font-medium">Spent this month</span>
          <p className="font-serif text-[24px] font-semibold text-[var(--ink)] mt-1">{fmtMoney(totalBudgetSpent)}</p>
          <div className="w-full h-2 bg-[var(--surface-subtle)] rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all ${
                totalBudgetSpent > totalBudgetLimit
                  ? 'bg-[#B91C1C]'
                  : totalBudgetSpent > totalBudgetLimit * 0.8
                  ? 'bg-[#B45309]'
                  : 'bg-[#1B4B91]'
              }`}
              style={{ width: `${Math.min(100, Math.round((totalBudgetSpent / (totalBudgetLimit || 1)) * 100))}%` }}
            />
          </div>
        </div>
        <div className="pt-3 sm:pt-0 sm:pl-6">
          <span className="text-[13px] text-[var(--muted)] font-medium">Remaining budget</span>
          <p className={`font-serif text-[24px] font-semibold mt-1 ${totalBudgetLimit - totalBudgetSpent < 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
            {fmtMoney(Math.max(0, totalBudgetLimit - totalBudgetSpent))}
          </p>
          <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
            {Math.round((totalBudgetSpent / (totalBudgetLimit || 1)) * 100)}% of total limit used
          </p>
        </div>
      </Card>

      {!hasAnyBudgetPaymentsOnSelectedCard && selectedCardIds.length > 0 ? (
        <EmptyState
          title="No payments on selected card"
          message="There are no recorded purchases, bills, or subscriptions tied to the selected card filter."
          actionLabel="Clear filter"
          onAction={() => setSelectedCardIds([])}
        />
      ) : computedBudgets.length === 0 ? (
        <EmptyState
          title="No category budgets set"
          message="Create a monthly spending limit for groceries, dining, utilities, or shopping."
          actionLabel="Set category budget"
          onAction={() => setIsAddBudgetOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {computedBudgets.map((b) => {
              const billCount = getEffectiveBillIdsForBudget(b).length;
              return (
                <Card
                  key={b.id}
                  onClick={() => setSelectedBudgetId(b.id)}
                  className="p-5 flex flex-col justify-between gap-3 cursor-pointer hover:border-[#1B4B91] transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[16px] font-semibold text-[var(--ink)] group-hover:text-[#1B4B91] transition-colors">
                          {b.category}
                        </h3>
                        <button
                          type="button"
                          aria-label={`Delete ${b.category} budget`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setBudgetToDelete(b);
                          }}
                          className="p-1.5 text-[var(--muted)] hover:text-[#B91C1C] rounded-[8px] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {b.isOver && <Pill variant="danger">Over budget</Pill>}
                        {b.isWarning && <Pill variant="warning">Near limit ({b.pct}%)</Pill>}
                      </div>
                      <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                        {b.diffFromLastMonth > 0
                          ? `+$${Math.abs(b.diffFromLastMonth).toFixed(0)} vs. last month ($${b.lastMonth})`
                          : `-$${Math.abs(b.diffFromLastMonth).toFixed(0)} vs. last month ($${b.lastMonth})`}
                        {billCount > 0 ? ` · ${billCount} bill${billCount === 1 ? '' : 's'} linked` : ''}
                      </p>
                    </div>

                    {editingBudgetId === b.id ? (
                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label htmlFor={`edit-budget-${b.id}`} className="sr-only">
                          Monthly limit for {b.category}
                        </label>
                        <input
                          id={`edit-budget-${b.id}`}
                          type="number"
                          value={editingBudgetLimit}
                          onChange={(e) => setEditingBudgetLimit(e.target.value)}
                          className="w-24 bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-2.5 py-1.5 text-[15px] font-medium text-[var(--ink)]"
                          autoFocus
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const val = parseFloat(editingBudgetLimit);
                            if (!isNaN(val) && val > 0) {
                              setBudgets((prev) => prev.map((item) => (item.id === b.id ? { ...item, limit: val } : item)));
                              if (onShowToast) onShowToast(`Updated ${b.category} budget`, 'success');
                            }
                            setEditingBudgetId(null);
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[15px] font-semibold text-[var(--ink)]">
                          {fmtMoney(b.spent)}{' '}
                          <span className="text-[var(--muted)] font-medium">/ {fmtMoney(b.limit, 0)}</span>
                        </span>
                        <button
                          type="button"
                          aria-label={`Edit ${b.category} budget limit`}
                          title="Edit limit"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBudgetId(b.id);
                            setEditingBudgetLimit(String(b.limit));
                          }}
                          className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[#1B4B91] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="w-full h-2 bg-[var(--surface-subtle)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          b.isOver ? 'bg-[#B91C1C]' : b.isWarning ? 'bg-[#B45309]' : 'bg-[#15803D]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(2, b.pct))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[13px] font-medium text-[var(--muted)] mt-2">
                      <span>
                        {b.pct}% used ·{' '}
                        {b.limit - b.spent >= 0
                          ? `${fmtMoney(b.limit - b.spent)} left`
                          : `${fmtMoney(b.spent - b.limit)} over`}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#1B4B91] font-semibold group-hover:underline">
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Select bills</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Spending Breakdown by Category */}
          <Card className="p-5">
            <div className="mb-4">
              <h2 className="font-serif text-[18px] font-semibold text-[var(--ink)]">Spending breakdown by category</h2>
              <p className="text-[13px] font-medium text-[var(--muted)]">Current month category share compared to last month</p>
            </div>
            <div className="space-y-3">
              {computedBudgets.map((b) => {
                const sharePct = totalBudgetSpent > 0 ? Math.round((b.spent / totalBudgetSpent) * 100) : 0;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBudgetId(b.id)}
                    className="text-[13px] cursor-pointer hover:opacity-90"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[var(--ink)]">{b.category} ({sharePct}%)</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[var(--muted)] font-medium">Last mo: {fmtMoney(b.lastMonth, 0)}</span>
                        <span className="font-semibold text-[var(--ink)]">{fmtMoney(b.spent)}</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-[var(--surface-subtle)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1B4B91]"
                        style={{ width: `${Math.max(3, sharePct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* Savings Goals Section */}
      {featureFlags.savingsGoals !== false && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-serif text-[18px] font-semibold text-[var(--ink)]">Savings goals</h2>
              <p className="text-[13px] font-medium text-[var(--muted)]">Track progress and projected completion dates</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setIsAddGoalOpen(true)}>
              <Plus className="w-4 h-4" />
              Add goal
            </Button>
          </div>

          {savingsGoals.length === 0 ? (
            <EmptyState
              title="No active savings goals"
              message="Create a personal savings target to track your monthly contributions and finish date."
              actionLabel="Add goal"
              onAction={() => setIsAddGoalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savingsGoals.map((goal) => {
                const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
                const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
                const monthsLeft = goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : 0;
                const finishDate = new Date();
                finishDate.setMonth(finishDate.getMonth() + monthsLeft);
                const projectedDateStr = remaining <= 0
                  ? 'Goal reached!'
                  : `Projected finish: ${finishDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} (${monthsLeft} mo)`;

                return (
                  <div key={goal.id} className="border border-[var(--line)] rounded-[12px] p-4 flex flex-col justify-between gap-3 bg-[var(--surface-subtle)]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[15px] font-semibold text-[var(--ink)]">{goal.name}</p>
                        <p className="text-[13px] text-[#15803D] font-medium mt-0.5">{projectedDateStr}</p>
                      </div>
                      <span className="text-[15px] font-semibold text-[var(--ink)]">
                        {fmtMoney(goal.currentAmount, 0)} / {fmtMoney(goal.targetAmount, 0)}
                      </span>
                    </div>

                    <div>
                      <div className="w-full h-2 bg-[var(--line)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#15803D] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[13px] font-medium text-[var(--muted)] mt-2.5">
                        <span>{pct}% saved · +{fmtMoney(goal.monthlyContribution, 0)}/mo</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleContributeGoal(goal.id, 100)}
                          >
                            +$100
                          </Button>
                          <button
                            type="button"
                            aria-label={`Delete savings goal ${goal.name}`}
                            onClick={() => setGoalToDelete(goal)}
                            className="p-1.5 text-[var(--muted)] hover:text-[#B91C1C] rounded-[8px] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Confirm Delete Budget */}
      <ConfirmDialog
        open={Boolean(budgetToDelete)}
        title="Delete category budget?"
        message={budgetToDelete ? `Are you sure you want to remove the "${budgetToDelete.category}" budget?` : ''}
        confirmLabel="Delete budget"
        variant="danger"
        onCancel={() => setBudgetToDelete(null)}
        onConfirm={() => {
          if (budgetToDelete) {
            setBudgets((prev) => prev.filter((item) => item.id !== budgetToDelete.id));
            if (onShowToast) onShowToast(`Removed ${budgetToDelete.category} budget`, 'success');
            setBudgetToDelete(null);
          }
        }}
      />

      {/* Confirm Delete Goal */}
      <ConfirmDialog
        open={Boolean(goalToDelete)}
        title="Delete savings goal?"
        message={goalToDelete ? `Are you sure you want to remove the "${goalToDelete.name}" savings goal?` : ''}
        confirmLabel="Delete goal"
        variant="danger"
        onCancel={() => setGoalToDelete(null)}
        onConfirm={() => {
          if (goalToDelete) {
            setSavingsGoals((prev) => prev.filter((g) => g.id !== goalToDelete.id));
            if (onShowToast) onShowToast(`Removed ${goalToDelete.name}`, 'success');
            setGoalToDelete(null);
          }
        }}
      />
    </div>
  );
}
