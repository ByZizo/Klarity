import React from 'react';
import {
  AlertCircle,
  Landmark,
  ChevronRight,
  Plus,
  X
} from 'lucide-react';
import { Button, Card, Pill, Row, Skeleton, EmptyState } from '../components/ui';
import HouseholdLifestyleHub from '../components/HouseholdLifestyleHub';

export function OverviewPage({
  firstName = 'there',
  timeGreeting = 'morning',
  isLoading = false,
  smartAlerts = [],
  displayCash = 0,
  projectedCashAfterBills = 0,
  displayCardBalances = 0,
  displayCards = [],
  displayDue14Sum = 0,
  displayDue14Count = 0,
  featureFlags = {},
  retirementPlans = [],
  retirementPromptDismissed = false,
  setRetirementPromptDismissed,
  handleHideRetirement,
  projectedRetirementMonthlyIncome = 0,
  totalNetWorth = 0,
  netWorthHistory = [],
  manualPositiveAssets = 0,
  manualLoans = 0,
  displayBills = [],
  displayTotalMonthlyBills = 0,
  displaySubs = [],
  displayTotalSubs = 0,
  displayTxs = [],
  sourceTxsList = [],
  householdProfile,
  setHouseholdProfile,
  handleSyncUtilitiesToBills,
  data = {},
  setActiveTab,
  setSelectedCardIds,
  setIsAddManualAssetOpen,
  setIsAddAccountOpen,
  setIsAddBillOpen,
  setIsAddSubOpen,
  setIsAddTxOpen,
  handleSendChatMessage,
  fmtMoney
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Card className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </Card>
        <Card className="p-5">
          <Skeleton className="h-40 w-full" />
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-5">
            <Skeleton className="h-48 w-full" />
          </Card>
          <Card className="p-5">
            <Skeleton className="h-48 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-[26px] sm:text-[30px] font-semibold text-[var(--ink)] tracking-tight leading-tight">
            Good {timeGreeting}, {firstName}
          </h1>
          <p className="text-[15px] font-medium text-[var(--muted)] mt-1">
            Here is where your money stands today.
          </p>
        </div>
      </div>

      {/* Smart Alerts Strip */}
      {smartAlerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {smartAlerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              className={`rounded-[12px] border p-4 flex items-center justify-between gap-3 ${
                alert.type === 'urgent'
                  ? 'bg-[#B91C1C]/10 border-[#B91C1C]/25 text-[#B91C1C]'
                  : 'bg-[#B45309]/10 border-[#B45309]/25 text-[#B45309]'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold truncate">{alert.title}</p>
                  <p className="text-[13px] font-medium opacity-90 truncate">{alert.detail}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab(alert.actionTab)}
                className="shrink-0"
              >
                {alert.actionLabel}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 1. Top 3-Metric Summary Card */}
      <Card className="p-5 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)] gap-4 sm:gap-6">
        <div>
          <div className="text-[13px] text-[var(--muted)] font-medium">Available cash</div>
          <div className="font-serif text-[26px] font-semibold text-[var(--ink)] mt-1 tracking-tight">
            {fmtMoney(displayCash)}
          </div>
          <div className="text-[13px] text-[var(--muted)] font-medium mt-1.5">
            <span className="text-[#15803D] font-semibold">Covers</span> bills due in 14 days ({fmtMoney(projectedCashAfterBills)} left)
          </div>
        </div>

        <div className="pt-4 sm:pt-0 sm:pl-6">
          <div className="text-[13px] text-[var(--muted)] font-medium">Card balances</div>
          <div className="font-serif text-[26px] font-semibold text-[var(--ink)] mt-1 tracking-tight">
            {fmtMoney(displayCardBalances)}
          </div>
          <div className="text-[13px] text-[var(--muted)] font-medium mt-1.5">
            Across {displayCards.length} {displayCards.length === 1 ? 'card' : 'cards'}
          </div>
        </div>

        <div className="pt-4 sm:pt-0 sm:pl-6">
          <div className="text-[13px] text-[var(--muted)] font-medium">Due in 14 days</div>
          <div className="font-serif text-[26px] font-semibold text-[var(--ink)] mt-1 tracking-tight">
            {fmtMoney(displayDue14Sum)}
          </div>
          <div className="text-[13px] text-[var(--muted)] font-medium mt-1.5">
            {displayDue14Count} {displayDue14Count === 1 ? 'bill' : 'bills'} upcoming
          </div>
        </div>
      </Card>

      {/* Retirement Prompt */}
      {featureFlags.retirement !== false && retirementPlans.length === 0 && !retirementPromptDismissed && (
        <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-[8px] bg-[#1B4B91] text-white flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-[var(--ink)] text-[15px]">Planning for retirement?</p>
              <p className="text-[var(--muted)] font-medium text-[13px] mt-0.5">
                Forecast your public pensions (CalPERS, CalSTRS, FERS), 401(k), IRAs, and Social Security estimates.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button variant="primary" size="sm" onClick={() => setActiveTab('retirement')}>
              Set up
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setRetirementPromptDismissed(true);
                try { localStorage.setItem('klarity_retirement_prompt_dismissed', 'true'); } catch {}
                handleHideRetirement();
              }}
            >
              Not for me
            </Button>
            <button
              type="button"
              aria-label="Dismiss retirement prompt"
              onClick={() => {
                setRetirementPromptDismissed(true);
                try { localStorage.setItem('klarity_retirement_prompt_dismissed', 'true'); } catch {}
              }}
              className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] rounded-[8px] cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </Card>
      )}

      {/* Projected Retirement Income Card */}
      {featureFlags.retirement !== false && retirementPlans.length > 0 && (
        <Card
          onClick={() => setActiveTab('retirement')}
          className="p-5 hover:border-[#1B4B91] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-[8px] bg-[#15803D]/10 text-[#15803D] flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[13px] text-[var(--muted)] font-medium flex flex-wrap items-center gap-2">
                <span>Projected retirement income</span>
                <Pill variant="success">
                  {retirementPlans.length} {retirementPlans.length === 1 ? 'plan' : 'plans'} tracked
                </Pill>
              </div>
              <div className="font-serif text-[24px] font-semibold text-[var(--ink)] mt-1 tracking-tight">
                ${Math.round(projectedRetirementMonthlyIncome).toLocaleString('en-US')}
                <span className="text-[13px] font-sans font-medium text-[var(--muted)]">/mo</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1B4B91]">
            <span>View retirement forecast</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Card>
      )}

      {/* Net Worth & Cash Flow Forecast Card */}
      <Card className="p-5 grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        <div className="xl:col-span-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[13px] font-medium text-[var(--muted)]">Total net worth</span>
              <div className="flex flex-wrap items-baseline gap-2.5 mt-0.5">
                <span className="font-serif text-[26px] font-semibold text-[var(--ink)]">
                  {fmtMoney(totalNetWorth)}
                </span>
                <Pill variant="success">+4.2% this month</Pill>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setIsAddManualAssetOpen(true)}>
              <Plus className="w-4 h-4" />
              Manual account
            </Button>
          </div>

          <div className="pt-2">
            <svg viewBox="0 0 420 90" className="w-full h-24 overflow-visible" role="img" aria-label="Six month net worth history chart">
              {(() => {
                const vals = netWorthHistory.map(h => h.value);
                const minV = Math.min(...vals) * 0.95;
                const maxV = Math.max(...vals) * 1.05 || 1;
                const pts = netWorthHistory.map((h, i) => {
                  const x = 24 + (i * 372) / Math.max(1, netWorthHistory.length - 1);
                  const y = 66 - ((h.value - minV) / (maxV - minV || 1)) * 50;
                  return { x, y, ...h };
                });
                const polyPoints = pts.map(p => `${p.x},${p.y}`).join(' ');
                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="#1B4B91"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={polyPoints}
                    />
                    {pts.map((p, idx) => (
                      <g key={p.month}>
                        <circle cx={p.x} cy={p.y} r={idx === pts.length - 1 ? 4 : 3} fill="#1B4B91" />
                        <text x={p.x} y={84} textAnchor="middle" className="fill-[var(--muted)] text-[12px] font-medium">
                          {p.month}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Right Column: Cash Flow Forecast */}
        <div className="xl:col-span-2 bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[12px] p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[15px] font-semibold text-[var(--ink)]">14-day cash flow forecast</span>
              <Pill variant={projectedCashAfterBills >= 0 ? 'success' : 'danger'}>
                {projectedCashAfterBills >= 0 ? 'Covered' : 'Shortfall'}
              </Pill>
            </div>
            <p className="text-[13px] font-medium text-[var(--muted)] leading-relaxed">
              Projected balance of <span className="font-semibold text-[var(--ink)]">{fmtMoney(projectedCashAfterBills)}</span> after upcoming bills ({fmtMoney(displayDue14Sum)} due in 14 days).
            </p>
          </div>
          <div className="pt-2.5 border-t border-[var(--line)] flex flex-col gap-1.5 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)] font-medium">Checking and cash</span>
              <span className="font-semibold text-[var(--ink)]">{fmtMoney(displayCash)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)] font-medium">Savings and investments</span>
              <span className="font-semibold text-[var(--ink)]">{fmtMoney(manualPositiveAssets)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)] font-medium">Credit debt and loans</span>
              <span className="font-semibold text-[#B91C1C]">-{fmtMoney(displayCardBalances + manualLoans)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Cards Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-[18px] font-semibold text-[var(--ink)]">Cards</h2>
          <Button variant="ghost" size="sm" onClick={() => setActiveTab('cards')}>
            Manage cards
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {displayCards.map((card) => {
            const util = card.limit > 0 ? Math.round((card.balance / card.limit) * 100) : 0;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setSelectedCardIds([card.id]);
                  setActiveTab('transactions');
                }}
                className="text-left rounded-[12px] p-4 bg-[#1B4B91] text-white flex flex-col justify-between min-h-[156px] shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
              >
                <div>
                  <div className="text-[15px] font-semibold truncate">{card.name}</div>
                  <div className="text-[13px] text-white/80 font-medium mt-0.5">Ending in {card.mask}</div>
                </div>

                <div className="mt-4">
                  <div className="font-serif text-[22px] font-semibold tracking-tight mb-2">
                    {fmtMoney(card.balance)}
                  </div>
                  <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, util))}%` }}
                    />
                  </div>
                  <div className="text-[13px] text-white/85 font-medium">
                    {util}% of limit · {card.apr}% APR
                  </div>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsAddAccountOpen(true)}
            className="min-h-[156px] rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] flex flex-col items-center justify-center gap-1.5 text-[15px] font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5 text-[#1B4B91]" />
            <span>Add card</span>
          </button>
        </div>
      </div>

      {/* 3. Upcoming Bills Card */}
      <Card className="p-5 overflow-hidden flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-[18px] font-semibold text-[var(--ink)]">Upcoming bills</h2>
            <Button variant="secondary" size="sm" onClick={() => setIsAddBillOpen(true)}>
              Add bill
            </Button>
          </div>

          {displayBills.length === 0 ? (
            <EmptyState
              title="No upcoming bills"
              message="Add your recurring bills to track due dates and 14-day cash flow."
              actionLabel="Add bill"
              onAction={() => setIsAddBillOpen(true)}
            />
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {displayBills.slice(0, 4).map((bill) => {
                const isUrgent = bill.daysUntil != null && bill.daysUntil <= 3;
                return (
                  <div key={bill.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-[var(--ink)] truncate">{bill.name}</p>
                      <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">{bill.dueText}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Pill variant={isUrgent ? 'warning' : 'brand'}>
                        In {bill.daysUntil} days
                      </Pill>
                      <span className="text-[15px] font-semibold text-[var(--ink)] text-right">
                        {fmtMoney(bill.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="-mx-5 -mb-5 px-5 py-3.5 bg-[var(--surface-subtle)] border-t border-[var(--line)] flex items-center justify-between text-[13px] mt-4">
          <span className="text-[var(--muted)] font-medium">Monthly bills total</span>
          <span className="font-semibold text-[var(--ink)] text-[15px]">
            {fmtMoney(displayTotalMonthlyBills)}
          </span>
        </div>
      </Card>

      {/* 4. Bottom 2-Column Row for Subscriptions & Recent purchases */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Subscriptions Card */}
        <Card className="p-5 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-[18px] font-semibold text-[var(--ink)]">Subscriptions</h2>
              <Button variant="secondary" size="sm" onClick={() => setIsAddSubOpen(true)}>
                Add subscription
              </Button>
            </div>

            {displaySubs.length === 0 ? (
              <EmptyState
                title="No subscriptions tracked"
                message="Keep track of streaming, software, and memberships in one place."
                actionLabel="Add subscription"
                onAction={() => setIsAddSubOpen(true)}
              />
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {displaySubs.slice(0, 4).map((sub) => (
                  <Row
                    key={sub.id}
                    label={sub.name}
                    detail={sub.renewText}
                    value={fmtMoney(sub.amount)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="-mx-5 -mb-5 px-5 py-3.5 bg-[var(--surface-subtle)] border-t border-[var(--line)] flex items-center justify-between text-[13px] mt-4">
            <span className="text-[var(--muted)] font-medium">Total per month</span>
            <span className="font-semibold text-[var(--ink)] text-[15px]">
              {fmtMoney(displayTotalSubs)}
            </span>
          </div>
        </Card>

        {/* Recent purchases Card */}
        <Card className="p-5 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-[18px] font-semibold text-[var(--ink)]">Recent purchases</h2>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('transactions')}>
                View all
              </Button>
            </div>

            {displayTxs.length === 0 ? (
              <EmptyState
                title="No recent purchases"
                message="Record a purchase or connect your bank to see transactions here."
                actionLabel="Add purchase"
                onAction={() => setIsAddTxOpen && setIsAddTxOpen(true)}
              />
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {displayTxs.slice(0, 4).map((tx) => {
                  const isDeposit = Number(tx.amount) > 0 && ((tx.category || '').toLowerCase() === 'income' || (tx.name || '').toLowerCase().includes('deposit'));
                  const absAmount = Math.abs(Number(tx.amount));
                  return (
                    <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-[var(--ink)] truncate">{tx.name}</p>
                        <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5 truncate">{tx.subText}</p>
                      </div>
                      <span className={`text-[15px] font-semibold shrink-0 ${isDeposit ? 'text-[#15803D]' : 'text-[var(--ink)]'}`}>
                        {isDeposit ? `+${fmtMoney(absAmount)}` : `-${fmtMoney(absAmount)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="-mx-5 -mb-5 px-5 py-3.5 bg-[var(--surface-subtle)] border-t border-[var(--line)] flex items-center justify-between text-[13px] mt-4">
            <span className="text-[var(--muted)] font-medium">Recorded transactions</span>
            <span className="font-semibold text-[var(--ink)] text-[15px]">
              {sourceTxsList.length} total
            </span>
          </div>
        </Card>
      </div>

      {/* Household Hub Summary */}
      {featureFlags.household !== false && (
        <HouseholdLifestyleHub
          bills={data.bills || []}
          householdProfile={householdProfile}
          onUpdateProfile={setHouseholdProfile}
          onSyncUtilitiesToBills={handleSyncUtilitiesToBills}
          onAskAiAdvisor={(promptText) => {
            handleSendChatMessage(promptText);
          }}
          isOverview={true}
          onNavigateToLifestyle={() => setActiveTab('household')}
        />
      )}
    </div>
  );
}
