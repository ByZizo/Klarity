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
  onOpenHardshipPlaybook,
  onSendPlanToAi
}) {
  const [selectedCardId, setSelectedCardId] = useState('all'); // 'all' or card id
  const [customFixedPayment, setCustomFixedPayment] = useState(400);
  const [selectedScenario, setSelectedScenario] = useState('B'); // 'A' | 'B' | 'C' | 'D'

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

  const getPlanDetails = (scen) => {
    switch (scen) {
      case 'A':
        return {
          id: 'A',
          title: 'Minimum Payment Trap',
          monthlyPayment: sim.scenarioA.initialMonthlyPayment,
          monthsToFreedom: sim.scenarioA.yearsToFreedom * 12,
          yearsToFreedom: sim.scenarioA.yearsToFreedom,
          totalInterest: sim.scenarioA.totalInterestPaid,
          interestSaved: 0,
          summary: `Paying ~$${sim.scenarioA.initialMonthlyPayment}/mo minimums. Takes ${sim.scenarioA.yearsToFreedom} years and costs $${sim.scenarioA.totalInterestPaid.toLocaleString()} in interest.`
        };
      case 'B':
        return {
          id: 'B',
          title: 'Fixed Accelerated Payoff',
          monthlyPayment: sim.scenarioB.monthlyPayment,
          monthsToFreedom: sim.scenarioB.monthsToFreedom,
          yearsToFreedom: sim.scenarioB.yearsToFreedom,
          totalInterest: sim.scenarioB.totalInterestPaid,
          interestSaved: sim.scenarioB.interestSavedVsA,
          summary: `Fixed $${sim.scenarioB.monthlyPayment}/mo target. Debt-free in ${sim.scenarioB.monthsToFreedom} months, saving $${sim.scenarioB.interestSavedVsA.toLocaleString()} in interest.`
        };
      case 'C':
        return {
          id: 'C',
          title: '0% Bank Hardship / NFCC',
          monthlyPayment: Math.round(sim.scenarioC.monthlyPayment),
          monthsToFreedom: sim.scenarioC.monthsToFreedom,
          yearsToFreedom: 3,
          totalInterest: 0,
          interestSaved: sim.scenarioC.interestSavedVsA,
          summary: `Concession 0% APR via workout plan. $${Math.round(sim.scenarioC.monthlyPayment)}/mo, debt-free in 36 months, saves $${sim.scenarioC.interestSavedVsA.toLocaleString()} in interest.`
        };
      case 'D':
        return {
          id: 'D',
          title: 'Family 0% Pool / 457 Loan',
          monthlyPayment: Math.round(sim.scenarioD.monthlyPayment),
          monthsToFreedom: sim.scenarioD.monthsToFreedom,
          yearsToFreedom: Math.round((sim.scenarioD.monthsToFreedom / 12) * 10) / 10,
          totalInterest: 0,
          interestSaved: sim.scenarioA.totalInterestPaid,
          summary: `Structured interest-free payoff. $${Math.round(sim.scenarioD.monthlyPayment)}/mo with 100% of dollars staying in the family/pension.`
        };
      default:
        return getPlanDetails('B');
    }
  };

  const activePlan = getPlanDetails(selectedScenario);

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
        <div 
          onClick={() => setSelectedScenario('A')}
          className={`rounded-2xl p-4.5 flex flex-col justify-between relative shadow-2xs cursor-pointer transition-all ${
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
                <span className="font-bold text-slate-900 font-mono text-sm">${sim.scenarioA.initialMonthlyPayment}/mo</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Month 1 Interest:</span>
                <span className="font-semibold text-rose-700 font-mono text-xs">
                  ${sim.scenarioA.monthOneInterest} ({sim.scenarioA.interestSplitPercent}%)
                </span>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Time to Freedom:</span>
                <span className="font-bold text-rose-700">{sim.scenarioA.yearsToFreedom} Years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Interest:</span>
                <span className="font-bold text-rose-700 font-mono">${sim.scenarioA.totalInterestPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-rose-200/60 pt-1 text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono">${sim.scenarioA.totalPaid.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-rose-800 bg-rose-100/60 p-2 rounded-lg leading-relaxed">
            {sim.scenarioA.interestSplitPercent}% of your check disappears into interest. Takes 20+ years.
          </p>
        </div>

        {/* Scenario B: Fixed Accelerated Repayment */}
        <div 
          onClick={() => setSelectedScenario('B')}
          className={`rounded-2xl p-4.5 flex flex-col justify-between shadow-2xs cursor-pointer transition-all ${
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
                <span className="font-bold text-slate-900 font-mono text-sm">${sim.scenarioB.monthlyPayment}/mo</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Interest Saved:</span>
                <span className="font-bold text-emerald-600 font-mono text-xs">+${sim.scenarioB.interestSavedVsA.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Time to Freedom:</span>
                <span className="font-bold text-slate-800">{sim.scenarioB.monthsToFreedom} Mos ({sim.scenarioB.yearsToFreedom} yrs)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Interest:</span>
                <span className="font-bold text-slate-800 font-mono">${sim.scenarioB.totalInterestPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono">${sim.scenarioB.totalPaid.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-slate-600 bg-slate-100 p-2 rounded-lg leading-relaxed">
            Eliminates debt rapidly and saves ${sim.scenarioB.interestSavedVsA.toLocaleString()} vs minimums.
          </p>
        </div>

        {/* Scenario C: Internal Hardship / NFCC DMP */}
        <div 
          onClick={() => setSelectedScenario('C')}
          className={`rounded-2xl p-4.5 flex flex-col justify-between relative shadow-2xs cursor-pointer transition-all ${
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
                <span className="font-bold text-emerald-800 font-mono text-sm">${Math.round(sim.scenarioC.monthlyPayment)}/mo</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Concession Rate:</span>
                <span className="font-bold text-emerald-700 font-mono text-xs">0.0% APR</span>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Time to Freedom:</span>
                <span className="font-bold text-emerald-800">{sim.scenarioC.monthsToFreedom} Mos (3 Yrs)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Interest:</span>
                <span className="font-bold text-emerald-700 font-mono">$0 (Zero Interest)</span>
              </div>
              <div className="flex justify-between font-bold border-t border-emerald-200 pt-1 text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono">${sim.scenarioC.totalPaid.toLocaleString()}</span>
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
          className={`rounded-2xl p-4.5 flex flex-col justify-between shadow-2xs cursor-pointer transition-all ${
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
                <span className="font-bold text-slate-900 font-mono text-sm">${Math.round(sim.scenarioD.monthlyPayment)}/mo</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] text-slate-500">Commercial Bank APR:</span>
                <span className="font-bold text-emerald-600 font-mono text-xs">0.0% APR</span>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Time to Freedom:</span>
                <span className="font-bold text-slate-800">{sim.scenarioD.monthsToFreedom} Months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Interest to Banks:</span>
                <span className="font-bold text-emerald-600 font-mono">$0</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900">
                <span>Total Paid:</span>
                <span className="font-mono">${sim.scenarioD.totalPaid.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-[10px] text-slate-600 bg-slate-100 p-2 rounded-lg leading-relaxed">
            100% of dollars stay within the family/retirement. $0 gifted to commercial banks.
          </p>
        </div>
      </div>

      {/* Selected Strategy AI Action Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/90 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
