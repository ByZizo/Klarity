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
  PhoneCall
} from 'lucide-react';
import { simulatePayoffScenarios } from '../utils/statutoryDebtEngine';

export default function InteractivePayoffComparison({ 
  cards = [], 
  onOpenHardshipPlaybook 
}) {
  const [selectedCardId, setSelectedCardId] = useState('all'); // 'all' or card id
  const [customFixedPayment, setCustomFixedPayment] = useState(400);

  // Compute selected card or total debt balance & weighted APR
  const targetCards = selectedCardId === 'all' 
    ? cards 
    : cards.filter(c => c.id === selectedCardId);

  const totalBalance = targetCards.reduce((sum, c) => sum + (Number(c.balance) || 0), 0) || 8000;
  
  // Calculate weighted average APR
  let weightedApr = 24.0;
  if (totalBalance > 0 && targetCards.length > 0) {
    const totalAprWeight = targetCards.reduce((sum, c) => sum + ((Number(c.balance) || 0) * (Number(c.apr) || 24.0)), 0);
    weightedApr = Math.round((totalAprWeight / totalBalance) * 10) / 10;
  }

  const sim = simulatePayoffScenarios(totalBalance, weightedApr, customFixedPayment);

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
              Payoff Options
            </h3>
          </div>
        </div>

        {/* Card Selector Dropdown */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Simulating on:</label>
          <select
            value={selectedCardId}
            onChange={e => setSelectedCardId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium outline-none cursor-pointer"
          >
            <option value="all">Total Card Debt (${Math.round(totalBalance).toLocaleString()} @ {weightedApr}% avg APR)</option>
            {cards.map(c => (
              <option key={c.id} value={c.id}>
                {c.name || 'Card'} •••• {c.mask || '4417'} (${Math.round(c.balance || 0).toLocaleString()} @ {c.apr || 24.99}%)
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
          <span className="font-bold text-[#18457c] font-mono text-sm">${customFixedPayment}/mo</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-64">
          <input
            type="range"
            min={Math.max(100, Math.round(sim.scenarioA.monthOneInterest + 30))}
            max={Math.min(1500, Math.round(totalBalance * 0.4))}
            step="25"
            value={customFixedPayment}
            onChange={e => setCustomFixedPayment(Number(e.target.value))}
            className="w-full accent-[#18457c] cursor-pointer"
          />
          <span className="text-[11px] text-slate-400 whitespace-nowrap">Adjust</span>
        </div>
      </div>

      {/* 4 Scenarios Grid */}
      <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scenario A: Minimum Payment Trap */}
        <div className="rounded-2xl border-2 border-rose-200/90 bg-rose-50/30 p-4.5 flex flex-col justify-between relative shadow-2xs">
          <div className="absolute -top-2.5 right-3 bg-rose-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            High Cost Warning
          </div>

          <div>
            <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Scenario A</div>
            <h4 className="font-serif-title font-bold text-slate-900 text-sm mt-0.5">Minimum Payment Trap</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Standard commercial 2.5% or 1% + interest rule.
            </p>

            <div className="mt-4 flex flex-col gap-2 bg-white/80 p-3 rounded-xl border border-rose-200/60">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Initial Monthly:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">${sim.scenarioA.initialMonthlyPayment}/mo</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Month 1 Interest:</span>
                <span className="font-semibold text-rose-700 font-mono text-xs">
                  ${sim.scenarioA.monthOneInterest} ({sim.scenarioA.interestSplitPercent}%)
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Month 1 Principal:</span>
                <span className="font-semibold text-slate-700 font-mono text-xs">
                  ${sim.scenarioA.monthOnePrincipal} ({100 - sim.scenarioA.interestSplitPercent}%)
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Time to Freedom:</span>
                <span className="font-bold text-rose-700">{sim.scenarioA.yearsToFreedom} Years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Interest:</span>
                <span className="font-bold text-rose-700 font-mono">${sim.scenarioA.totalInterestPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-rose-200/60 pt-1.5 text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono">${sim.scenarioA.totalPaid.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[10px] text-rose-800 bg-rose-100/60 p-2 rounded-lg border border-rose-200/50 leading-relaxed">
            {sim.scenarioA.interestSplitPercent}% of your initial check disappears into interest. Takes 20+ years on $8k.
          </p>
        </div>

        {/* Scenario B: Fixed Accelerated Repayment */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="text-[11px] font-bold text-[#18457c] uppercase tracking-wider">Scenario B</div>
            <h4 className="font-serif-title font-bold text-slate-900 text-sm mt-0.5">Fixed Accelerated</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Keep monthly payment constant even as balance drops.
            </p>

            <div className="mt-4 flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Fixed Monthly:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">${sim.scenarioB.monthlyPayment}/mo</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Effective Rate:</span>
                <span className="font-semibold text-slate-700 font-mono text-xs">{weightedApr}% APR</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Interest Saved:</span>
                <span className="font-bold text-emerald-600 font-mono text-xs">+${sim.scenarioB.interestSavedVsA.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Time to Freedom:</span>
                <span className="font-bold text-slate-800">{sim.scenarioB.monthsToFreedom} Months ({sim.scenarioB.yearsToFreedom} yrs)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Interest:</span>
                <span className="font-bold text-slate-800 font-mono">${sim.scenarioB.totalInterestPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 pt-1.5 text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono">${sim.scenarioB.totalPaid.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[10px] text-slate-600 bg-slate-100 p-2 rounded-lg leading-relaxed">
            Eliminates the debt rapidly and saves ${sim.scenarioB.interestSavedVsA.toLocaleString()} in interest vs. minimums.
          </p>
        </div>

        {/* Scenario C: Internal Hardship / NFCC DMP */}
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/30 p-4.5 flex flex-col justify-between relative shadow-2xs">
          <div className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Senior Recommended
          </div>

          <div>
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Scenario C</div>
            <h4 className="font-serif-title font-bold text-slate-900 text-sm mt-0.5">0% Bank Hardship / NFCC</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Internal bank workout or certified non-profit DMP.
            </p>

            <div className="mt-4 flex flex-col gap-2 bg-white/90 p-3 rounded-xl border border-emerald-200">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Target Monthly:</span>
                <span className="font-bold text-emerald-800 font-mono text-sm">${Math.round(sim.scenarioC.monthlyPayment)}/mo</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Concession Rate:</span>
                <span className="font-bold text-emerald-700 font-mono text-xs">0.0% APR</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Interest Saved:</span>
                <span className="font-bold text-emerald-700 font-mono text-xs">+${sim.scenarioC.interestSavedVsA.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Time to Freedom:</span>
                <span className="font-bold text-emerald-800">{sim.scenarioC.monthsToFreedom} Months (3 Yrs)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Interest:</span>
                <span className="font-bold text-emerald-700 font-mono">$0 (Zero Interest)</span>
              </div>
              <div className="flex justify-between font-bold border-t border-emerald-200 pt-1.5 text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono">${sim.scenarioC.totalPaid.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenHardshipPlaybook}
            className="mt-4 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Open Negotiation Script</span>
          </button>
        </div>

        {/* Scenario D: Family Qard Hasan / CalPERS 457 Loan */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Scenario D</div>
            <h4 className="font-serif-title font-bold text-slate-900 text-sm mt-0.5">Family 0% / 457 Loan</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Interest-free family pool or vested CalPERS 457 loan.
            </p>

            <div className="mt-4 flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Structured Monthly:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">${Math.round(sim.scenarioD.monthlyPayment)}/mo</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Commercial Bank APR:</span>
                <span className="font-bold text-emerald-600 font-mono text-xs">0.0% APR</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Bank Interest Paid:</span>
                <span className="font-bold text-emerald-600 font-mono text-xs">$0.00</span>
              </div>
            </div>

            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Time to Freedom:</span>
                <span className="font-bold text-slate-800">{sim.scenarioD.monthsToFreedom} Months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Interest to Banks:</span>
                <span className="font-bold text-emerald-600 font-mono">$0</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 pt-1.5 text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono">${sim.scenarioD.totalPaid.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[10px] text-slate-600 bg-slate-100 p-2 rounded-lg leading-relaxed">
            100% of dollars stay within the family or retirement account. Zero dollars gifted to commercial card banks.
          </p>
        </div>
      </div>
    </div>
  );
}
