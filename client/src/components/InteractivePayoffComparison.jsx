import React, { useState } from 'react';
import { compareDebtOptions } from '../utils/statutoryDebtEngine';
import { Scale, CheckCircle2, PhoneCall, MessageSquare } from 'lucide-react';
import { Button, Card, Pill } from './ui';

export function InteractivePayoffComparison({
  cards = [],
  isJudgmentProof = false,
  onOpenHardshipPlaybook,
  onSendPlanToAi
}) {
  const [extraPayment, setExtraPayment] = useState(50);
  const paths = compareDebtOptions(cards, extraPayment, { isJudgmentProof });

  if (!cards || cards.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[#1B4B91]/10 text-[#1B4B91] flex items-center justify-center shrink-0">
            <Scale size={20} />
          </div>
          <div>
            <h3 className="text-[18px] font-semibold text-[var(--ink)] font-serif">
              Debt payoff and relief comparison
            </h3>
            <p className="text-[13px] font-medium text-[var(--muted)]">
              Compare standard payoff timelines with 0% bank relief options
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Extra Monthly Payment Slider */}
          <div className="flex items-center gap-3 bg-[var(--surface-subtle)] px-4 py-2 rounded-[8px] border border-[var(--line)]">
            <label htmlFor="extra-monthly-payment-range" className="text-[13px] font-medium text-[var(--ink)]">
              Extra monthly payment:
            </label>
            <input
              id="extra-monthly-payment-range"
              type="range"
              min="0"
              max="500"
              step="25"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Number(e.target.value))}
              className="w-24 accent-[#1B4B91] cursor-pointer"
            />
            <span className="text-[15px] font-semibold text-[#1B4B91] min-w-[52px] text-right">
              +${extraPayment}
            </span>
          </div>

          {onOpenHardshipPlaybook && (
            <Button variant="secondary" size="sm" onClick={onOpenHardshipPlaybook}>
              <PhoneCall size={15} />
              Payment relief guide
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {paths.map((path) => {
          const isRecommended = path.recommended;
          return (
            <div
              key={path.id}
              className={`rounded-[12px] p-4 border transition-all flex flex-col justify-between ${
                isRecommended
                  ? 'bg-[#1B4B91]/5 border-[#1B4B91]'
                  : 'bg-[var(--surface-subtle)] border-[var(--line)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Pill variant={isRecommended ? 'brand' : 'neutral'}>
                    {path.badge === 'Minimum Payment Trap' ? 'Minimum payments only' : path.badge}
                  </Pill>
                  {isRecommended && <CheckCircle2 size={16} className="text-[#1B4B91] shrink-0" />}
                </div>

                <h4 className="text-[16px] font-semibold text-[var(--ink)] mb-1">
                  {path.title === 'Statutory Protected Pause' ? 'Protected income pause' : path.title}
                </h4>
                <p className="text-[13px] font-medium text-[var(--muted)] leading-relaxed mb-4">
                  {path.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--line)] space-y-2">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[var(--muted)] font-medium">Monthly cost</span>
                  <span className="font-semibold text-[var(--ink)]">
                    ${(path.monthlyPayment || 0).toLocaleString()}/mo
                  </span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[var(--muted)] font-medium">Timeline</span>
                  <span className="font-semibold text-[var(--ink)]">
                    {path.monthsToPayoff === 0
                      ? 'Immediate relief'
                      : `${path.monthsToPayoff} mos (${(path.monthsToPayoff / 12).toFixed(1)} yrs)`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[var(--muted)] font-medium">Total interest</span>
                  <span className={`font-semibold ${path.totalInterest > 1000 ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
                    ${(path.totalInterest || 0).toLocaleString()}
                  </span>
                </div>

                {onSendPlanToAi && (
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => onSendPlanToAi(path)}
                    >
                      <MessageSquare size={14} />
                      Ask Advisor about this plan
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default InteractivePayoffComparison;
