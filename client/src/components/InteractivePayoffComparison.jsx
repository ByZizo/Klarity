import React, { useState } from 'react';
import { 
  Calculator, 
  TrendingDown, 
  ShieldCheck, 
  HeartHandshake, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  Sliders, 
  HelpCircle,
  PhoneCall,
  Sparkles,
  Bot
} from 'lucide-react';
import { simulatePayoffScenarios } from '../utils/statutoryDebtEngine';

export default function InteractivePayoffComparison({ 
  cards = [], 
  availableCash = 0,
  onOpenHardshipPlaybook,
  onSendPlanToAi
}) {
  const [selectedCardId, setSelectedCardId] = useState('all'); // 'all' or card id
  const [selectedScenario, setSelectedScenario] = useState('B'); // 'A' | 'B' | 'C' | 'D'

  const safeCards = Array.isArray(cards) ? cards : [];

  // Compute selected card or total debt balance & weighted APR from real cards
  const targetCards = selectedCardId === 'all' 
    ? safeCards 
    : safeCards.filter(c => c && c.id === selectedCardId);

  const totalBalance = targetCards.reduce((sum, c) => sum + (Number(c?.balance) || 0), 0);
  
  // Calculate weighted average APR from actual cards
  let weightedApr = 21.0;
  if (totalBalance > 0 && targetCards.length > 0) {
    const totalAprWeight = targetCards.reduce((sum, c) => sum + ((Number(c?.balance) || 0) * (Number(c?.apr) || 21.0)), 0);
    weightedApr = Math.round((totalAprWeight / totalBalance) * 10) / 10;
  }

  const defaultFixedTarget = Math.max(50, Math.round(totalBalance / 18));
  const [userFixedPayment, setUserFixedPayment] = useState(null);
  const customFixedPayment = userFixedPayment !== null ? userFixedPayment : defaultFixedTarget;

  const sim = simulatePayoffScenarios(totalBalance, weightedApr, customFixedPayment);

  const scenA = sim?.scenarioA || {
    initialMonthlyPayment: 0,
    monthOneInterest: 0,
    monthOnePrincipal: 0,
    interestSplitPercent: 0,
    yearsToFreedom: 0,
    totalInterestPaid: 0,
    totalPaid: 0,
    summary: 'No card debt balance carrying.'
  };

  const scenB = sim?.scenarioB || {
    monthlyPayment: 0,
    monthsToFreedom: 0,
    yearsToFreedom: 0,
    totalInterestPaid: 0,
    totalPaid: 0,
    interestSavedVsA: 0,
    summary: 'No card debt balance carrying.'
  };

  const scenC = sim?.scenarioC || {
    monthlyPayment: 0,
    monthsToFreedom: 0,
    totalInterestPaid: 0,
    totalPaid: 0,
    interestSavedVsA: 0,
    summary: 'No card debt balance carrying.'
  };

  const scenD = sim?.scenarioD || {
    monthlyPayment: 0,
    monthsToFreedom: 0,
    totalInterestPaid: 0,
    totalPaid: 0,
    interestSavedVsA: 0,
    summary: 'No card debt balance carrying.'
  };

  const fmt = (v) => Number(v || 0).toLocaleString();

  const getPlanDetails = (scen) => {
    switch (scen) {
      case 'A':
        return {
          id: 'A',
          title: 'Minimum Payment Trap',
          monthlyPayment: scenA.initialMonthlyPayment || 0,
          monthsToFreedom: (scenA.yearsToFreedom || 0) * 12,
          yearsToFreedom: scenA.yearsToFreedom || 0,
          totalInterest: scenA.totalInterestPaid || 0,
          interestSaved: 0,
          summary: `Paying ~$${scenA.initialMonthlyPayment || 0}/mo minimums. Takes ${scenA.yearsToFreedom || 0} years and costs $${fmt(scenA.totalInterestPaid)} in interest.`
        };
      case 'B':
        return {
          id: 'B',
          title: 'Fixed Accelerated Payoff',
          monthlyPayment: scenB.monthlyPayment || 0,
          monthsToFreedom: scenB.monthsToFreedom || 0,
          yearsToFreedom: scenB.yearsToFreedom || 0,
          totalInterest: scenB.totalInterestPaid || 0,
          interestSaved: scenB.interestSavedVsA || 0,
          summary: `Fixed $${scenB.monthlyPayment || 0}/mo target. Debt-free in ${scenB.monthsToFreedom || 0} months, saving $${fmt(scenB.interestSavedVsA)} in interest.`
        };
      case 'C':
        return {
          id: 'C',
          title: '0% Bank Hardship / NFCC',
          monthlyPayment: Math.round(scenC.monthlyPayment || 0),
          monthsToFreedom: scenC.monthsToFreedom || 0,
          yearsToFreedom: 3,
          totalInterest: 0,
          interestSaved: scenC.interestSavedVsA || 0,
          summary: `Concession 0% APR via workout plan. $${Math.round(scenC.monthlyPayment || 0)}/mo, debt-free in 36 months, saves $${fmt(scenC.interestSavedVsA)} in interest.`
        };
      case 'D':
        return {
          id: 'D',
          title: 'Family 0% Pool / 457 Loan',
          monthlyPayment: Math.round(scenD.monthlyPayment || 0),
          monthsToFreedom: scenD.monthsToFreedom || 0,
          yearsToFreedom: Math.round(((scenD.monthsToFreedom || 0) / 12) * 10) / 10,
          totalInterest: 0,
          interestSaved: scenA.totalInterestPaid || 0,
          summary: `Structured interest-free payoff. $${Math.round(scenD.monthlyPayment || 0)}/mo with 100% of dollars staying in the family/pension.`
        };
      default:
        return getPlanDetails('B');
    }
  };

  const activePlan = getPlanDetails(selectedScenario);

  const minSlider = Math.max(25, Math.round((scenA.monthOneInterest || 0) + 25));
  const maxSlider = Math.max(minSlider + 50, Math.min(2500, Math.round(totalBalance || 1000)));
  const safeFixedPayment = Math.min(maxSlider, Math.max(minSlider, customFixedPayment || defaultFixedTarget));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#18457c]">
              <Calculator className="w-4 h-4" />
            </span>
            <h3 className="font-serif-title text-base sm:text-lg font-bold text-slate-900">
              Payoff Options & AI Strategy
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">Select an option below to simulate savings and send your strategy to the AI Advisor.</p>
        </div>

        {/* Card Selector Dropdown */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Simulating on:</label>
          <select
            value={selectedCardId}
            onChange={e => setSelectedCardId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium outline-none cursor-pointer"
          >
            <option value="all">Total Card Debt (${fmt(Math.round(totalBalance))} @ {weightedApr}% avg APR)</option>
            {safeCards.map((c, idx) => (
              <option key={c.id || `card-${c.mask || idx}`} value={c.id}>
                {c.name || 'Card'} •••• {c.mask || '4417'} (${fmt(Math.round(c.balance || 0))} @ {c.apr || 21.0}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scenario B Slider Control */}
      <div className="px-5 sm:px-6 py-3.5 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#18457c]" />
          <span className="font-semibold text-slate-700">Scenario B Fixed Target:</span>
          <span className="font-bold text-[#18457c] font-mono text-sm">${safeFixedPayment}/mo</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-64">
          <input
            type="range"
            min={minSlider}
            max={maxSlider}
            step="25"
            value={safeFixedPayment}
            onChange={e => setUserFixedPayment(Number(e.target.value))}
            className="w-full accent-[#18457c] cursor-pointer"
          />
          <span className="text-[11px] text-slate-400 whitespace-nowrap">Adjust</span>
        </div>
      </div>

      {/* Cash Liquidity Insight Banner */}
      {availableCash > 0 && totalBalance > 0 && availableCash >= totalBalance && (
        <div className="px-5 sm:px-6 py-3 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">
              Available Cash: <strong>${fmt(Math.round(availableCash))}</strong> covers your entire <strong>${fmt(Math.round(totalBalance))}</strong> card debt today with zero interest.
            </span>
          </div>
        </div>
      )}

      {/* 4 Scenarios Grid */}
      <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Scenario A: Minimum Payment Trap */}
        <div 
          onClick={() => setSelectedScenario('A')}
          className={`rounded-2xl p-4 flex flex-col justify-between relative shadow-2xs cursor-pointer transition-all ${
            selectedScenario === 'A'
              ? 'border-2 border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
              : 'border border-rose-200/90 bg-rose-50/20 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between -mt-1 mb-2">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Scenario A</span>
            {selectedScenario === 'A' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">Click to select</span>
            )}
          </div>

          <div>
            <h4 className="font-serif-title font-bold text-slate-900 text-sm">Minimum Payment Trap</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Standard commercial 2.5% minimum rule.</p>

            <div className="mt-3 flex flex-col gap-1.5 bg-white/90 p-3 rounded-xl border border-rose-200/60">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Initial Monthly:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">${scenA.initialMonthlyPayment || 0}/mo</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Month 1 Interest:</span>
                <span className="font-semibold text-rose-700 font-mono text-xs">
                  ${scenA.monthOneInterest || 0} ({scenA.interestSplitPercent || 0}%)
                </span>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Time to Freedom:</span>
                <span className="font-bold text-rose-700">{scenA.yearsToFreedom || 0} Years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Interest:</span>
                <span className="font-bold text-rose-700 font-mono">${fmt(scenA.totalInterestPaid)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-rose-200/60 pt-1 text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono">${fmt(scenA.totalPaid)}</span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-rose-800 bg-rose-100/60 p-2 rounded-lg leading-relaxed">
            {scenA.interestSplitPercent || 0}% of your check disappears into interest. Takes 20+ years.
          </p>
        </div>

        {/* Scenario B: Fixed Accelerated Repayment */}
        <div 
          onClick={() => setSelectedScenario('B')}
          className={`rounded-2xl p-4 flex flex-col justify-between shadow-2xs cursor-pointer transition-all ${
            selectedScenario === 'B'
              ? 'border-2 border-[#18457c] bg-blue-50/40 ring-2 ring-blue-200'
              : 'border border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between -mt-1 mb-2">
            <span className="text-[11px] font-bold text-[#18457c] uppercase tracking-wider">Scenario B</span>
            {selectedScenario === 'B' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#18457c] bg-blue-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">Click to select</span>
            )}
          </div>

          <div>
            <h4 className="font-serif-title font-bold text-slate-900 text-sm">Fixed Accelerated</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Keep monthly payment constant as balance drops.</p>

            <div className="mt-3 flex flex-col gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Fixed Monthly:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">${scenB.monthlyPayment || 0}/mo</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Interest Saved:</span>
                <span className="font-bold text-emerald-600 font-mono text-xs">+${fmt(scenB.interestSavedVsA)}</span>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Time to Freedom:</span>
                <span className="font-bold text-slate-800">{scenB.monthsToFreedom || 0} Mos ({scenB.yearsToFreedom || 0} yrs)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Interest:</span>
                <span className="font-bold text-slate-800 font-mono">${fmt(scenB.totalInterestPaid)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono">${fmt(scenB.totalPaid)}</span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-slate-600 bg-slate-100 p-2 rounded-lg leading-relaxed">
            Eliminates debt rapidly and saves ${fmt(scenB.interestSavedVsA)} vs minimums.
          </p>
        </div>

        {/* Scenario C: Internal Hardship / NFCC DMP */}
        <div 
          onClick={() => setSelectedScenario('C')}
          className={`rounded-2xl p-4 flex flex-col justify-between relative shadow-2xs cursor-pointer transition-all ${
            selectedScenario === 'C'
              ? 'border-2 border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-200'
              : 'border border-emerald-300 bg-emerald-50/20 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between -mt-1 mb-2">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Scenario C</span>
            {selectedScenario === 'C' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">Click to select</span>
            )}
          </div>

          <div>
            <h4 className="font-serif-title font-bold text-slate-900 text-sm">0% Bank Hardship / NFCC</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Internal bank workout or certified non-profit DMP.</p>

            <div className="mt-3 flex flex-col gap-1.5 bg-white/90 p-3 rounded-xl border border-emerald-200">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Target Monthly:</span>
                <span className="font-bold text-emerald-800 font-mono text-sm">${Math.round(scenC.monthlyPayment || 0)}/mo</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Concession Rate:</span>
                <span className="font-bold text-emerald-700 font-mono text-xs">0.0% APR</span>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Time to Freedom:</span>
                <span className="font-bold text-emerald-800">{scenC.monthsToFreedom || 0} Mos (3 Yrs)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Interest:</span>
                <span className="font-bold text-emerald-700 font-mono">$0 (Zero Interest)</span>
              </div>
              <div className="flex justify-between font-bold border-t border-emerald-200 pt-1 text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono">${fmt(scenC.totalPaid)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenHardshipPlaybook();
            }}
            className="mt-3 w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Open Negotiation Script</span>
          </button>
        </div>

        {/* Scenario D: Family Qard Hasan / CalPERS 457 Loan */}
        <div 
          onClick={() => setSelectedScenario('D')}
          className={`rounded-2xl p-4 flex flex-col justify-between shadow-2xs cursor-pointer transition-all ${
            selectedScenario === 'D'
              ? 'border-2 border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-200'
              : 'border border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between -mt-1 mb-2">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">Scenario D</span>
            {selectedScenario === 'D' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">Click to select</span>
            )}
          </div>

          <div>
            <h4 className="font-serif-title font-bold text-slate-900 text-sm">Family 0% / 457 Loan</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Interest-free family pool or vested 457 loan.</p>

            <div className="mt-3 flex flex-col gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Structured Monthly:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">${Math.round(scenD.monthlyPayment || 0)}/mo</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Commercial Bank APR:</span>
                <span className="font-bold text-emerald-600 font-mono text-xs">0.0% APR</span>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Time to Freedom:</span>
                <span className="font-bold text-slate-800">{scenD.monthsToFreedom || 0} Months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Interest to Banks:</span>
                <span className="font-bold text-emerald-600 font-mono">$0</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono">${fmt(scenD.totalPaid)}</span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-slate-600 bg-slate-100 p-2 rounded-lg leading-relaxed">
            100% of dollars stay within the family/retirement. $0 gifted to commercial banks.
          </p>
        </div>
      </div>

      {/* Selected Strategy AI Action Bar */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/90 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-[#18457c] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Active Selection:</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#18457c] text-white">
                {activePlan.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
              {activePlan.summary}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onSendPlanToAi) {
              onSendPlanToAi({
                id: activePlan.id,
                title: activePlan.title,
                monthlyPayment: activePlan.monthlyPayment,
                monthsToFreedom: activePlan.monthsToFreedom,
                interestSaved: activePlan.interestSaved,
                totalBalance,
                weightedApr
              });
            }
          }}
          className="px-4 py-2.5 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold shadow-2xs cursor-pointer flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <Bot className="w-4 h-4 text-amber-300" />
          <span>Send Plan to AI Advisor</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
