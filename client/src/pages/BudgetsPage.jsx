import React, { useState } from 'react';
import {
  Plus,
  Target,
  Trash2
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold text-[var(--ink)] tracking-tight">
            Budgets and savings goals
          </h1>
          <p className="text-[15px] font-medium text-[var(--muted)] mt-0.5">
            Track monthly category limits and progress toward your savings targets.
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
            {computedBudgets.map((b) => (
              <Card key={b.id} className="p-5 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[16px] font-semibold text-[var(--ink)]">{b.category}</h3>
                      <button
                        type="button"
                        aria-label={`Delete ${b.category} budget`}
                        onClick={() => setBudgetToDelete(b)}
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
                    </p>
                  </div>

                  {editingBudgetId === b.id ? (
                    <div className="flex items-center gap-1.5">
                      <label htmlFor={`edit-budget-${b.id}`} className="sr-only">
                        Monthly limit for {b.category}
                      </label>
                      <input
                        id={`edit-budget-${b.id}`}
                        type="number"
                        value={editingBudgetLimit}
                        onChange={(e) => setEditingBudgetLimit(e.target.value)}
                        className="w-24 bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-2.5 py-1.5 text-[15px] font-medium text-[var(--ink)]"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
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
                    <div className="text-right">
                      <span className="text-[15px] font-semibold text-[var(--ink)]">
                        {fmtMoney(b.spent)} <span className="text-[var(--muted)] font-medium">/ {fmtMoney(b.limit, 0)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBudgetId(b.id);
                          setEditingBudgetLimit(String(b.limit));
                        }}
                        className="block ml-auto text-[13px] font-medium text-[#1B4B91] hover:underline cursor-pointer mt-0.5"
                      >
                        Edit limit
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
                  <div className="flex items-center justify-between text-[13px] font-medium text-[var(--muted)] mt-1.5">
                    <span>{b.pct}% used</span>
                    <span>
                      {b.limit - b.spent >= 0
                        ? `${fmtMoney(b.limit - b.spent)} left`
                        : `${fmtMoney(b.spent - b.limit)} over`}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
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
                  <div key={b.id} className="text-[13px]">
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
