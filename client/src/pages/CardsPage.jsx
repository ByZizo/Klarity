import React, { useState } from 'react';
import {
  Plus,
  CreditCard,
  Calculator,
  Sparkles,
  PhoneCall
} from 'lucide-react';
import { Button, Card, Pill, EmptyState, Skeleton, ConfirmDialog } from '../components/ui';
import { InteractivePayoffComparison } from '../components/InteractivePayoffComparison';

export function CardsPage({
  isLoading = false,
  displayCards = [],
  checkingAccounts = [],
  manualAssets = [],
  displayCardBalances = 0,
  displayCash = 0,
  projectedCashAfterBills = 0,
  cardsFilter = 'all',
  setCardsFilter,
  cardsPayoffTab = 'speed',
  setCardsPayoffTab,
  debtStrategy = 'avalanche',
  setDebtStrategy,
  extraDebtPayment = 150,
  setExtraDebtPayment,
  debtPayoffComparison,
  setSelectedCardIds,
  setActiveTab,
  setIsAddAccountOpen,
  setIsAddManualAssetOpen,
  setIsHardshipModalOpen,
  handleDeleteAccount,
  handleDeleteManualAsset,
  handleSendPayoffPlanToAi,
  setChatInput,
  fmtMoney
}) {
  const [cardToRemove, setCardToRemove] = useState(null);
  const [assetToDelete, setAssetToDelete] = useState(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <Card className="p-5">
          <Skeleton className="h-24 w-full" />
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    );
  }

  const rawCheckingList = checkingAccounts.length > 0
    ? checkingAccounts
    : [{ id: 'card-checking-4821', name: 'Checking', institution: 'Chase', mask: '4821', subtype: 'Checking', balance: displayCash }];
  const totalLimitAll = displayCards.reduce((s, c) => s + Number(c.limit || 0), 0);
  const totalAvailHeadroom = displayCards.reduce((s, c) => s + Math.max(0, Number(c.limit || 0) - Number(c.balance || 0)), 0);
  const allCount = displayCards.length + rawCheckingList.length + manualAssets.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold text-[var(--ink)] tracking-tight">
            Cards and accounts
          </h1>
          <p className="text-[15px] font-medium text-[var(--muted)] mt-0.5">
            All your credit cards, checking accounts, and debt help plans in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setIsAddAccountOpen(true)}>
            <Plus className="w-4 h-4" />
            Add card or bank
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsAddManualAssetOpen(true)}>
            <CreditCard className="w-4 h-4" />
            Add loan or asset
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsHardshipModalOpen(true)}>
            <PhoneCall className="w-4 h-4" />
            Debt help
          </Button>
        </div>
      </div>

      {/* 1. Overview & Filter Bar */}
      <Card className="p-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)]">
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-[var(--muted)]">Total card debt</span>
            <span className="font-serif text-[24px] font-semibold text-[var(--ink)] mt-0.5">{fmtMoney(displayCardBalances)}</span>
            <span className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
              {displayCards.length} {displayCards.length === 1 ? 'card' : 'cards'}
            </span>
          </div>
          <div className="flex flex-col pt-3 sm:pt-0 sm:pl-4">
            <span className="text-[13px] font-medium text-[var(--muted)]">Available cash</span>
            <span className="font-serif text-[24px] font-semibold text-[#15803D] mt-0.5">{fmtMoney(displayCash)}</span>
            <span className="text-[13px] font-medium text-[var(--muted)] mt-0.5">{rawCheckingList.length} checking</span>
          </div>
          <div className="flex flex-col pt-3 sm:pt-0 sm:pl-4">
            <span className="text-[13px] font-medium text-[var(--muted)]">Credit headroom</span>
            <span className="font-serif text-[24px] font-semibold text-[var(--ink)] mt-0.5">{fmtMoney(totalAvailHeadroom, 0)}</span>
            <span className="text-[13px] font-medium text-[var(--muted)] mt-0.5">of {fmtMoney(totalLimitAll, 0)} limit</span>
          </div>
          <div className="flex flex-col pt-3 sm:pt-0 sm:pl-4">
            <span className="text-[13px] font-medium text-[var(--muted)]">Cash vs. debt</span>
            <span className={`font-serif text-[24px] font-semibold mt-0.5 ${displayCash >= displayCardBalances ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
              {displayCash >= displayCardBalances ? `+${fmtMoney(displayCash - displayCardBalances)}` : `-${fmtMoney(displayCardBalances - displayCash)}`}
            </span>
            <span className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
              {displayCash >= displayCardBalances ? 'Cash covers debt' : 'Debt exceeds cash'}
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--line)]">
          {[
            { id: 'all', label: `All (${allCount})` },
            { id: 'credit', label: `Credit (${displayCards.length})` },
            { id: 'checking', label: `Debit (${rawCheckingList.length})` },
            ...(manualAssets.length > 0 ? [{ id: 'loans', label: `Loans and assets (${manualAssets.length})` }] : [])
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={cardsFilter === tab.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setCardsFilter(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* 2. Unified Cards & Accounts Grid */}
      {allCount === 0 ? (
        <EmptyState
          title="No cards or accounts added"
          message="Add a credit card, debit account, or loan to track balances and payoff options."
          actionLabel="Add card or bank"
          onAction={() => setIsAddAccountOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {(cardsFilter === 'all' || cardsFilter === 'credit') &&
            displayCards.map((card) => {
              const util = card.limit > 0 ? Math.min(100, (card.balance / card.limit) * 100) : 0;
              const isHighUtil = util >= 30;
              return (
                <Card key={card.id} className="p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-[var(--ink)] truncate">
                          {card.institution ? `${card.institution} ` : ''}{card.name}
                        </p>
                        <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">Ending in {card.mask}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <Pill variant="brand">Credit</Pill>
                        <Pill variant="neutral">{card.apr || 0}% APR</Pill>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="font-serif text-[24px] font-semibold text-[var(--ink)]">{fmtMoney(card.balance)}</span>
                        <span className="text-[13px] text-[var(--muted)] font-medium">{fmtMoney(card.limit, 0)} limit</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--surface-subtle)] rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`h-full rounded-full transition-all ${isHighUtil ? 'bg-[#B45309]' : 'bg-[#1B4B91]'}`}
                          style={{ width: `${Math.max(2, Math.min(100, util))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[13px] font-medium text-[var(--muted)] mt-1.5">
                        <span>{fmtMoney(Math.max(0, card.limit - card.balance), 0)} available</span>
                        <span>{Math.round(util)}% used</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--line)] text-[13px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCardIds([card.id]);
                        setActiveTab('transactions');
                      }}
                      className="text-[#1B4B91] hover:underline font-semibold cursor-pointer"
                    >
                      View payments
                    </button>
                    {!String(card.id).startsWith('mock-') && (
                      <button
                        type="button"
                        onClick={() => setCardToRemove(card)}
                        className="text-[#B91C1C] hover:underline font-semibold cursor-pointer"
                      >
                        Remove card
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}

          {(cardsFilter === 'all' || cardsFilter === 'checking') &&
            rawCheckingList.map((acc) => (
              <Card key={acc.id} className="p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[var(--ink)] truncate">
                        {acc.institution ? `${acc.institution} ` : ''}{acc.name}
                      </p>
                      <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">Ending in {acc.mask || '4821'}</p>
                    </div>
                    <Pill variant="success">Debit</Pill>
                  </div>

                  <div className="mt-4">
                    <span className="font-serif text-[24px] font-semibold text-[var(--ink)]">{fmtMoney(acc.balance)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--line)] text-[13px]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('transactions')}
                    className="text-[#1B4B91] hover:underline font-semibold cursor-pointer"
                  >
                    View payments
                  </button>
                </div>
              </Card>
            ))}

          {(cardsFilter === 'all' || cardsFilter === 'loans') &&
            manualAssets.map((ma) => (
              <Card key={ma.id} className="p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[var(--ink)] truncate">{ma.name}</p>
                      <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5 capitalize">
                        {ma.type === 'loan' ? 'Loan' : 'Asset'}
                      </p>
                    </div>
                    <Pill variant={ma.type === 'loan' ? 'danger' : 'neutral'}>
                      {ma.type === 'loan' ? 'Loan' : 'Asset'}
                    </Pill>
                  </div>

                  <div className="mt-4">
                    <span className={`font-serif text-[24px] font-semibold ${ma.type === 'loan' ? 'text-[#B91C1C]' : 'text-[var(--ink)]'}`}>
                      {ma.type === 'loan' ? `-${fmtMoney(ma.balance)}` : fmtMoney(ma.balance)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3 border-t border-[var(--line)] text-[13px]">
                  <button
                    type="button"
                    onClick={() => setAssetToDelete(ma)}
                    className="text-[#B91C1C] hover:underline font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* 3. Debt Help & Payoff Planner */}
      <Card className="overflow-hidden flex flex-col">
        <div className="p-5 border-b border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#1B4B91]/10 flex items-center justify-center text-[#1B4B91] shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-[18px] font-semibold text-[var(--ink)]">
                Debt help and payoff planner
              </h2>
              <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                Compare payoff speed and explore 0% interest bank relief options.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={cardsPayoffTab === 'speed' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setCardsPayoffTab('speed')}
            >
              Payoff speed and order
            </Button>
            <Button
              variant={cardsPayoffTab === 'options' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setCardsPayoffTab('options')}
            >
              Debt help options (4 plans)
            </Button>
          </div>
        </div>

        {cardsPayoffTab === 'speed' && debtPayoffComparison && (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[var(--surface-subtle)] rounded-[12px] p-4 border border-[var(--line)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold text-[var(--ink)]">Payoff order:</span>
                <Button
                  variant={debtStrategy === 'avalanche' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setDebtStrategy('avalanche')}
                >
                  Highest APR first
                </Button>
                <Button
                  variant={debtStrategy === 'snowball' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setDebtStrategy('snowball')}
                >
                  Smallest balance first
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium text-[var(--ink)]">
                  Extra payment: <span className="font-semibold text-[#1B4B91]">+${extraDebtPayment}/mo</span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[50, 150, 300, 500].map((amt) => (
                    <Button
                      key={amt}
                      variant={extraDebtPayment === amt ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setExtraDebtPayment(amt)}
                    >
                      +${amt}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] flex flex-col justify-between">
                <span className="text-[13px] text-[var(--muted)] font-medium">Projected debt-free date</span>
                <p className="font-serif text-[22px] font-semibold text-[var(--ink)] mt-1">
                  {debtPayoffComparison.activePlan.finishLabel}
                </p>
                <p className="text-[13px] text-[#15803D] font-semibold mt-1">
                  {debtPayoffComparison.activePlan.months} months ({debtPayoffComparison.monthsSavedVsMin} mo faster)
                </p>
              </div>

              <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] flex flex-col justify-between">
                <span className="text-[13px] text-[var(--muted)] font-medium">Interest saved vs. minimums</span>
                <p className="font-serif text-[22px] font-semibold text-[#15803D] mt-1">
                  {fmtMoney(debtPayoffComparison.interestSavedVsMin)}
                </p>
                <p className="text-[13px] text-[var(--muted)] font-medium mt-1">
                  Total interest: {fmtMoney(debtPayoffComparison.activePlan.totalInterest)}
                </p>
              </div>

              <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] flex flex-col justify-between">
                <span className="text-[13px] text-[var(--muted)] font-medium">Priority order</span>
                <ol className="list-decimal list-inside font-medium text-[var(--ink)] mt-1 space-y-0.5 text-[13px]">
                  {debtPayoffComparison.activePlan.order.map((name, i) => (
                    <li key={i} className="truncate">{name}</li>
                  ))}
                </ol>
              </div>
            </div>

            {projectedCashAfterBills > displayCardBalances && displayCardBalances > 0 && (
              <div className="p-4 rounded-[12px] bg-[#1B4B91]/5 border border-[#1B4B91]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-[var(--ink)] min-w-0 text-[15px] font-medium">
                  <Sparkles className="w-4 h-4 text-[#1B4B91] shrink-0" />
                  <span>
                    You have <span className="font-semibold">{fmtMoney(projectedCashAfterBills)}</span> in checking after bills—enough to clear all card debt today.
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setChatInput('Should I pay off all my credit cards today with my checking balance?');
                    setActiveTab('advisor');
                  }}
                >
                  Ask Advisor
                </Button>
              </div>
            )}
          </div>
        )}

        {cardsPayoffTab === 'options' && (
          <div className="p-5">
            <InteractivePayoffComparison
              cards={displayCards}
              availableCash={displayCash}
              onOpenHardshipPlaybook={() => setIsHardshipModalOpen(true)}
              onSendPlanToAi={(plan) => handleSendPayoffPlanToAi(plan)}
            />
          </div>
        )}
      </Card>

      {/* Confirm Remove Card */}
      <ConfirmDialog
        open={Boolean(cardToRemove)}
        title="Remove card?"
        message={cardToRemove ? `Are you sure you want to remove "${cardToRemove.name}" from your accounts?` : ''}
        confirmLabel="Remove card"
        variant="danger"
        onCancel={() => setCardToRemove(null)}
        onConfirm={() => {
          if (cardToRemove) {
            handleDeleteAccount(cardToRemove.id, cardToRemove.name);
            setCardToRemove(null);
          }
        }}
      />

      {/* Confirm Remove Loan / Asset */}
      <ConfirmDialog
        open={Boolean(assetToDelete)}
        title="Remove account?"
        message={assetToDelete ? `Are you sure you want to remove "${assetToDelete.name}"?` : ''}
        confirmLabel="Remove"
        variant="danger"
        onCancel={() => setAssetToDelete(null)}
        onConfirm={() => {
          if (assetToDelete) {
            handleDeleteManualAsset(assetToDelete.id, assetToDelete.name);
            setAssetToDelete(null);
          }
        }}
      />
    </div>
  );
}
