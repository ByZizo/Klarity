import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { evaluateLegalShield } from '../utils/statutoryDebtEngine';
import { Card, Pill } from './ui';

export function LegalShieldStatusCard({ incomeSources = [], totalUnsecuredDebt = 0, bankBalance = 0, isSsiSeparated = false }) {
  const shield = evaluateLegalShield(incomeSources, bankBalance);

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] flex items-center justify-center bg-[#1B4B91]/10 text-[#1B4B91] shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-[18px] font-semibold text-[var(--ink)] font-serif">
              Income and asset protection
            </h3>
            <p className="text-[13px] font-medium text-[var(--muted)]">
              Federal &amp; state debt protection overview
            </p>
          </div>
        </div>
        <Pill variant={shield.isJudgmentProof ? 'success' : 'brand'}>
          {shield.isJudgmentProof ? 'Protected income' : 'Standard protection'}
        </Pill>
      </div>

      <p className="text-[15px] font-medium text-[var(--ink)] leading-relaxed mb-4">
        {shield.summaryText}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="p-3.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
          <div className="text-[13px] font-medium text-[var(--muted)] mb-1">
            Protected monthly income
          </div>
          <div className="text-[18px] font-semibold text-[var(--ink)] font-serif">
            ${(shield.protectedMonthlyIncome || 0).toLocaleString()}
          </div>
        </div>
        <div className="p-3.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
          <div className="text-[13px] font-medium text-[var(--muted)] mb-1">
            Garnishable income
          </div>
          <div className="text-[18px] font-semibold text-[var(--ink)] font-serif">
            ${(shield.garnishableIncome || 0).toLocaleString()}
          </div>
        </div>
        <div className="p-3.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
          <div className="text-[13px] font-medium text-[var(--muted)] mb-1">
            Unsecured debt covered
          </div>
          <div className="text-[18px] font-semibold text-[var(--ink)] font-serif">
            ${(totalUnsecuredDebt || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)] flex items-start gap-2.5">
        <Info size={16} className="text-[#1B4B91] shrink-0 mt-0.5" />
        <div className="text-[13px] font-medium text-[var(--muted)] leading-relaxed">
          {isSsiSeparated
            ? 'Direct federal benefits (Social Security, SSI, VA) kept in a dedicated account receive automatic 2-month lookback protection from private debt collectors.'
            : 'Keeping Social Security, SSI, or VA benefits in a separate account from other deposits helps ensure automatic federal lookback protection.'}
        </div>
      </div>
    </Card>
  );
}

export default LegalShieldStatusCard;
