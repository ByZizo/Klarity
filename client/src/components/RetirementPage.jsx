import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Landmark,
  ShieldCheck,
  TrendingUp,
  Plus,
  Trash2,
  Edit3,
  Sliders,
  DollarSign,
  Calendar,
  ChevronRight,
  Info,
  Percent,
  Briefcase,
  Clock,
  ArrowUpRight,
  PieChart,
  HelpCircle,
  Check,
  X,
  PiggyBank,
  Sparkles,
  ArrowLeft,
  Building,
  CheckCircle2,
  AlertTriangle,
  MoreVertical
} from 'lucide-react';

const PLAN_TYPE_CONFIG = {
  pension: {
    label: 'Defined Benefit Pension',
    shortLabel: 'Pension',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    icon: Landmark,
    description: 'Guaranteed lifetime monthly benefit (CalPERS, CalSTRS, FERS, etc.)'
  },
  '401k': {
    label: '401(k) Retirement Plan',
    shortLabel: '401(k)',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-800',
    icon: Building,
    description: 'Employer-sponsored defined contribution plan'
  },
  '403b': {
    label: '403(b) Tax-Sheltered Annuity',
    shortLabel: '403(b)',
    color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    badgeColor: 'bg-indigo-100 text-indigo-800',
    icon: Building,
    description: 'Public school & non-profit retirement account'
  },
  '457': {
    label: '457(b) Deferred Compensation',
    shortLabel: '457(b)',
    color: 'bg-purple-50 text-purple-800 border-purple-200',
    badgeColor: 'bg-purple-100 text-purple-800',
    icon: Building,
    description: 'State & local government supplemental savings'
  },
  ira: {
    label: 'Traditional IRA',
    shortLabel: 'Traditional IRA',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-800',
    icon: PiggyBank,
    description: 'Individual retirement account with tax-deferred growth'
  },
  roth_ira: {
    label: 'Roth IRA',
    shortLabel: 'Roth IRA',
    color: 'bg-violet-50 text-violet-800 border-violet-200',
    badgeColor: 'bg-violet-100 text-violet-800',
    icon: PiggyBank,
    description: 'After-tax contributions with 100% tax-free withdrawals'
  },
  social_security: {
    label: 'Social Security Retirement',
    shortLabel: 'Social Security',
    color: 'bg-sky-50 text-sky-800 border-sky-200',
    badgeColor: 'bg-sky-100 text-sky-800',
    icon: ShieldCheck,
    description: 'Federal statutory retirement benefit (exempt from private creditors)'
  }
};

const PENSION_PRESETS = [
  {
    provider: 'CalPERS',
    tier: '2% at 62 (PEPRA)',
    benefitFactorPct: 2.0,
    retirementAge: 62,
    employeeContributionPct: 7.0,
    notes: 'California Public Employees Retirement System'
  },
  {
    provider: 'CalPERS',
    tier: '2% at 55 (Classic)',
    benefitFactorPct: 2.0,
    retirementAge: 55,
    employeeContributionPct: 7.0,
    notes: 'Classic member formula'
  },
  {
    provider: 'CalSTRS',
    tier: '2% at 62 (2% at 62)',
    benefitFactorPct: 2.0,
    retirementAge: 62,
    employeeContributionPct: 10.205,
    notes: 'California State Teachers Retirement System'
  },
  {
    provider: 'FERS',
    tier: '1% at 62 (Federal Regular)',
    benefitFactorPct: 1.0,
    retirementAge: 62,
    employeeContributionPct: 4.4,
    notes: 'Federal Employees Retirement System'
  }
];

export default function RetirementPage({
  retirementPlans = [],
  onUpdatePlans,
  onNavigateBack,
  onAskAiAdvisor,
  onHideRetirement
}) {
  const [plans, setPlans] = useState(retirementPlans);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'pension' | 'account' | 'social_security'
  const [simulatedAge, setSimulatedAge] = useState(62);
  const [currentAge, setCurrentAge] = useState(48);
  const [assumedReturnRate, setAssumedReturnRate] = useState(6.0); // % real return for defined contribution growth
  const [safeWithdrawalRate, setSafeWithdrawalRate] = useState(4.0); // Editable safe annual withdrawal rate % (default 4%)
  const [defaultBenefitFactorPct, setDefaultBenefitFactorPct] = useState(2.0); // Editable default pension benefit factor %
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Keep local state in sync when parent props update
  React.useEffect(() => {
    setPlans(retirementPlans);
  }, [retirementPlans]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Form state
  const defaultFormData = {
    planType: 'pension',
    name: '',
    provider: 'CalPERS',
    tier: '2% at 62',
    yearsOfService: 15,
    benefitFactorPct: 2.0,
    highestAverageSalary: 95000,
    retirementAge: 62,
    employeeContributionPct: 7.0,
    estimatedMonthlyBenefit: 2375,
    balance: 0,
    employeeContribution: 500,
    employerMatch: 250,
    targetRetirementAge: 65,
    notes: ''
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [isBenefitManualOverride, setIsBenefitManualOverride] = useState(false);

  // Auto-calculate pension monthly benefit: years x (factor / 100) x salary / 12
  const calculatePensionBenefit = (years, factorPct, salary) => {
    const y = Number(years) || 0;
    const f = (Number(factorPct) || 0) / 100;
    const s = Number(salary) || 0;
    return Math.round((y * f * s) / 12);
  };

  // Update monthly benefit when formula components change unless manually overridden
  const handleFormulaFieldChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    if (updated.planType === 'pension' && !isBenefitManualOverride) {
      const calc = calculatePensionBenefit(
        field === 'yearsOfService' ? value : updated.yearsOfService,
        field === 'benefitFactorPct' ? value : updated.benefitFactorPct,
        field === 'highestAverageSalary' ? value : updated.highestAverageSalary
      );
      updated.estimatedMonthlyBenefit = calc;
    }
    setFormData(updated);
  };

  // Open modal to add plan
  const handleOpenAddModal = (type = 'pension') => {
    setEditingPlanId(null);
    setIsBenefitManualOverride(false);
    if (type === 'pension') {
      const initYears = 15;
      const initSalary = 95000;
      const initFactor = Number(defaultBenefitFactorPct) || 2.0;
      setFormData({
        ...defaultFormData,
        planType: 'pension',
        name: 'California Public Employees Pension',
        provider: 'CalPERS',
        tier: `${initFactor}% at 62`,
        yearsOfService: initYears,
        benefitFactorPct: initFactor,
        highestAverageSalary: initSalary,
        retirementAge: 62,
        employeeContributionPct: 7.0,
        estimatedMonthlyBenefit: calculatePensionBenefit(initYears, initFactor, initSalary),
        notes: 'Vested member'
      });
    } else if (type === 'social_security') {
      setFormData({
        ...defaultFormData,
        planType: 'social_security',
        name: 'Social Security Retirement Benefit',
        provider: 'Social Security Administration',
        tier: 'Full Retirement Age (67)',
        retirementAge: 67,
        estimatedMonthlyBenefit: 2150,
        notes: 'Exempt from private creditors under 42 U.S.C. § 407'
      });
    } else {
      setFormData({
        ...defaultFormData,
        planType: type || '401k',
        name: type === '401k' ? 'Workplace 401(k)' : type === '403b' ? 'Workplace 403(b)' : type === '457' ? 'Public 457(b) Plan' : 'Traditional IRA',
        provider: 'Fidelity',
        tier: '',
        balance: 45000,
        employeeContribution: 500,
        employerMatch: 250,
        targetRetirementAge: 65,
        estimatedMonthlyBenefit: 0,
        notes: 'Pre-tax payroll deduction'
      });
    }
    setIsModalOpen(true);
  };

  // Open modal to edit existing plan
  const handleOpenEditModal = (plan) => {
    setEditingPlanId(plan.id);
    setIsBenefitManualOverride(true);
    setFormData({
      planType: plan.planType || 'pension',
      name: plan.name || '',
      provider: plan.provider || '',
      tier: plan.tier || '',
      yearsOfService: plan.yearsOfService !== undefined ? plan.yearsOfService : 0,
      benefitFactorPct: plan.benefitFactorPct !== undefined ? plan.benefitFactorPct : 0,
      highestAverageSalary: plan.highestAverageSalary !== undefined ? plan.highestAverageSalary : 0,
      retirementAge: plan.retirementAge || 62,
      employeeContributionPct: plan.employeeContributionPct !== undefined ? plan.employeeContributionPct : 0,
      estimatedMonthlyBenefit: plan.estimatedMonthlyBenefit !== undefined ? plan.estimatedMonthlyBenefit : 0,
      balance: plan.balance !== undefined ? plan.balance : 0,
      employeeContribution: plan.employeeContribution !== undefined ? plan.employeeContribution : 0,
      employerMatch: plan.employerMatch !== undefined ? plan.employerMatch : 0,
      targetRetirementAge: plan.targetRetirementAge || 65,
      notes: plan.notes || ''
    });
    setIsModalOpen(true);
  };

  // Save plan (Add or Update)
  const handleSavePlan = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      const planPayload = {
        ...formData,
        id: editingPlanId || `ret-${Date.now()}`,
        name: formData.name.trim(),
        provider: (formData.provider || '').trim(),
        tier: (formData.tier || '').trim(),
        yearsOfService: Number(formData.yearsOfService || 0),
        benefitFactorPct: Number(formData.benefitFactorPct || 0),
        highestAverageSalary: Number(formData.highestAverageSalary || 0),
        retirementAge: Number(formData.retirementAge || 62),
        employeeContributionPct: Number(formData.employeeContributionPct || 0),
        estimatedMonthlyBenefit: Number(formData.estimatedMonthlyBenefit || 0),
        balance: Number(formData.balance || 0),
        employeeContribution: Number(formData.employeeContribution || 0),
        employerMatch: Number(formData.employerMatch || 0),
        targetRetirementAge: Number(formData.targetRetirementAge || 65),
        notes: (formData.notes || '').trim()
      };

      // Call API
      const res = await fetch('/api/retirement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planPayload)
      });

      if (res.ok) {
        const json = await res.json();
        const updatedList = json.retirementPlans || (editingPlanId
          ? plans.map(p => p.id === editingPlanId ? planPayload : p)
          : [...plans, planPayload]);
        setPlans(updatedList);
        if (onUpdatePlans) onUpdatePlans(updatedList);
        showToast(editingPlanId ? `Updated ${planPayload.name}` : `Added ${planPayload.name} to retirement plans.`);
      } else {
        // Local fallback if offline
        const updatedList = editingPlanId
          ? plans.map(p => p.id === editingPlanId ? planPayload : p)
          : [...plans, planPayload];
        setPlans(updatedList);
        if (onUpdatePlans) onUpdatePlans(updatedList);
        showToast(editingPlanId ? `Updated ${planPayload.name}` : `Added ${planPayload.name} to retirement plans.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save retirement plan:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete plan
  const handleDeletePlan = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your retirement tracker?`)) return;

    try {
      const res = await fetch(`/api/retirement/${id}`, { method: 'DELETE' });
      const updatedList = plans.filter(p => p.id !== id);
      setPlans(updatedList);
      if (onUpdatePlans) onUpdatePlans(updatedList);
      showToast(`Removed ${name}.`);
    } catch (err) {
      console.error('Failed to delete retirement plan:', err);
      const updatedList = plans.filter(p => p.id !== id);
      setPlans(updatedList);
      if (onUpdatePlans) onUpdatePlans(updatedList);
    }
  };

  // --------------------------------------------------------------------------
  // Financial & Simulation Calculations
  // --------------------------------------------------------------------------
  const metrics = useMemo(() => {
    // 1. Guaranteed monthly pension income
    const pensionPlans = plans.filter(p => p.planType === 'pension');
    const totalPensionMonthly = pensionPlans.reduce((sum, p) => sum + Number(p.estimatedMonthlyBenefit || 0), 0);

    // 2. Social Security monthly benefit
    const ssPlans = plans.filter(p => p.planType === 'social_security');
    const totalSocialSecurityMonthly = ssPlans.reduce((sum, p) => sum + Number(p.estimatedMonthlyBenefit || 0), 0);

    // 3. Defined contribution accounts (401k, 403b, 457, IRA, Roth IRA)
    const dcPlans = plans.filter(p => p.planType !== 'pension' && p.planType !== 'social_security');
    const totalDcBalances = dcPlans.reduce((sum, p) => sum + Number(p.balance || 0), 0);
    const totalMonthlyEmployeeContributions = dcPlans.reduce((sum, p) => sum + Number(p.employeeContribution || 0), 0);
    const totalMonthlyEmployerMatches = dcPlans.reduce((sum, p) => sum + Number(p.employerMatch || 0), 0);

    // Pension employee monthly payroll contributions
    const pensionMonthlyContributions = pensionPlans.reduce((sum, p) => {
      const sal = Number(p.highestAverageSalary || 0);
      const pct = (Number(p.employeeContributionPct || 0) / 100);
      return sum + (sal > 0 ? (sal * pct) / 12 : 0);
    }, 0);

    const totalPaycheckDeductions = totalMonthlyEmployeeContributions + pensionMonthlyContributions;

    // Projected safe monthly withdrawal from current balances using editable safeWithdrawalRate %
    const swrFraction = (Number(safeWithdrawalRate) || 0) / 100;
    const monthlyDrawFromCurrentBalances = Math.round((totalDcBalances * swrFraction) / 12);

    // Total baseline monthly retirement income
    const totalEstimatedMonthlyIncome = totalPensionMonthly + totalSocialSecurityMonthly + monthlyDrawFromCurrentBalances;

    return {
      totalPensionMonthly,
      totalSocialSecurityMonthly,
      totalDcBalances,
      totalMonthlyEmployeeContributions,
      totalMonthlyEmployerMatches,
      pensionMonthlyContributions,
      totalPaycheckDeductions,
      monthlyDrawFromCurrentBalances,
      totalEstimatedMonthlyIncome
    };
  }, [plans, safeWithdrawalRate]);

  // "What if I retire at ___" dynamic simulation
  const simulation = useMemo(() => {
    const yearsUntilRetirement = Math.max(0, simulatedAge - currentAge);

    // 1. Pensions at simulatedAge
    let simPensionMonthly = 0;
    plans.filter(p => p.planType === 'pension').forEach(p => {
      const normalAge = Number(p.retirementAge || 62);
      const curYears = Number(p.yearsOfService || 0);
      const factorPct = Number(p.benefitFactorPct || defaultBenefitFactorPct || 2.0);
      const salary = Number(p.highestAverageSalary || 0);

      // If simulatedAge differs from normalAge, years of service adjust by the difference
      const additionalYears = Math.max(0, simulatedAge - normalAge);
      const adjustedYears = curYears + additionalYears;
      const simBenefit = calculatePensionBenefit(adjustedYears, factorPct, salary);
      simPensionMonthly += simBenefit;
    });

    // 2. Social Security at simulatedAge (Actuarial reductions for early claiming, delayed retirement credits)
    let simSocialSecurityMonthly = 0;
    plans.filter(p => p.planType === 'social_security').forEach(p => {
      const baseBenefit = Number(p.estimatedMonthlyBenefit || 2000);
      const fra = 67; // Full retirement age standard
      let multiplier = 1.0;
      if (simulatedAge <= 62) multiplier = 0.70; // ~30% reduction at 62
      else if (simulatedAge === 63) multiplier = 0.75;
      else if (simulatedAge === 64) multiplier = 0.80;
      else if (simulatedAge === 65) multiplier = 0.867;
      else if (simulatedAge === 66) multiplier = 0.933;
      else if (simulatedAge === 67) multiplier = 1.0;
      else if (simulatedAge === 68) multiplier = 1.08; // 8% delayed credit
      else if (simulatedAge === 69) multiplier = 1.16;
      else multiplier = 1.24; // max at age 70

      simSocialSecurityMonthly += Math.round(baseBenefit * multiplier);
    });

    // 3. Defined Contribution Balances projected at simulatedAge with compound interest
    let simProjectedBalance = 0;
    const r = (assumedReturnRate / 100) / 12; // monthly interest rate
    const n = yearsUntilRetirement * 12; // months

    plans.filter(p => p.planType !== 'pension' && p.planType !== 'social_security').forEach(p => {
      const principal = Number(p.balance || 0);
      const monthlyPmt = Number(p.employeeContribution || 0) + Number(p.employerMatch || 0);

      let futureVal = principal;
      if (n > 0 && r > 0) {
        // Compound interest on principal: P * (1 + r)^n
        const compoundPrincipal = principal * Math.pow(1 + r, n);
        // Future value of monthly contributions: PMT * [((1 + r)^n - 1) / r]
        const futureContributions = monthlyPmt * ((Math.pow(1 + r, n) - 1) / r);
        futureVal = compoundPrincipal + futureContributions;
      } else {
        futureVal = principal + (monthlyPmt * n);
      }
      simProjectedBalance += futureVal;
    });

    // Safe annual withdrawal rate converted to monthly using editable safeWithdrawalRate %
    const swrFraction = (Number(safeWithdrawalRate) || 0) / 100;
    const simMonthlyPortfolioDraw = Math.round((simProjectedBalance * swrFraction) / 12);
    const simTotalMonthly = simPensionMonthly + simSocialSecurityMonthly + simMonthlyPortfolioDraw;

    const diffFromBaseline = simTotalMonthly - metrics.totalEstimatedMonthlyIncome;

    return {
      simPensionMonthly,
      simSocialSecurityMonthly,
      simProjectedBalance: Math.round(simProjectedBalance),
      simMonthlyPortfolioDraw,
      simTotalMonthly,
      diffFromBaseline,
      yearsUntilRetirement
    };
  }, [plans, simulatedAge, currentAge, assumedReturnRate, safeWithdrawalRate, defaultBenefitFactorPct, metrics.totalEstimatedMonthlyIncome]);

  // Filtered plans list
  const filteredPlans = plans.filter(p => {
    if (activeFilter === 'pension') return p.planType === 'pension';
    if (activeFilter === 'account') return p.planType !== 'pension' && p.planType !== 'social_security';
    if (activeFilter === 'social_security') return p.planType === 'social_security';
    return true;
  });

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header with Centered Title, Leveled Back Button, and 3-Dot Dropdown Menu */}
      <div className="relative flex items-center justify-between gap-3 min-h-[42px]">
        {/* Left: Back button */}
        <div className="flex items-center justify-start flex-1 min-w-[130px] z-10">
          {onNavigateBack && (
            <button
              type="button"
              onClick={onNavigateBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Back to Overview</span>
            </button>
          )}
        </div>

        {/* Center: Title & Subtitle */}
        <div className="flex flex-col items-center justify-center text-center shrink-0 px-2 max-w-xl">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#18457c] text-white flex items-center justify-center shadow-xs shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <h1 className="font-serif-title text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              Retirement & Pension Tracker
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            Public pensions (CalPERS, CalSTRS, FERS), 401(k), IRAs, and Social Security estimates.
          </p>
        </div>

        {/* Right: Three-dot dropdown menu */}
        <div className="flex items-center justify-end flex-1 min-w-[130px] z-10">
          {plans.length > 0 ? (
            <div className="relative" ref={headerMenuRef}>
              <button
                type="button"
                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors cursor-pointer shadow-2xs ${
                  isHeaderMenuOpen
                    ? 'bg-slate-100 border-slate-300 text-slate-900'
                    : 'bg-white border-slate-200/90 hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
                aria-label="Retirement options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isHeaderMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200/90 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        handleOpenAddModal('pension');
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Add Pension</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        handleOpenAddModal('401k');
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4 text-[#18457c] shrink-0" />
                      <span>Add 401(k) / IRA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        handleOpenAddModal('social_security');
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Add Social Security</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-9" />
          )}
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="p-8 sm:p-12 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#18457c] flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <Landmark className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Plan for Your Retirement
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Choose a plan type to get started. Track lifetime pensions, tax-advantaged accounts, and Social Security estimates in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {/* Card 1: Pension */}
            <div
              onClick={() => handleOpenAddModal('pension')}
              className="p-6 rounded-2xl border-2 border-slate-100 hover:border-emerald-500/50 bg-slate-50/50 hover:bg-emerald-50/20 transition-all cursor-pointer flex flex-col justify-between group shadow-2xs"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Landmark className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-900">
                  Pension
                </h3>
                <span className="inline-block mt-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                  Defined Benefit
                </span>
                <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                  CalPERS, CalSTRS, FERS, military, or municipal pensions with guaranteed lifetime monthly benefits.
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOpenAddModal('pension'); }}
                className="mt-6 w-full py-2.5 px-3 rounded-xl bg-white border border-slate-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Pension</span>
              </button>
            </div>

            {/* Card 2: Retirement Account */}
            <div
              onClick={() => handleOpenAddModal('401k')}
              className="p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-500/50 bg-slate-50/50 hover:bg-blue-50/20 transition-all cursor-pointer flex flex-col justify-between group shadow-2xs"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-900">
                  Retirement Account
                </h3>
                <span className="inline-block mt-0.5 text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                  401(k), 403(b), IRAs
                </span>
                <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                  Employer-sponsored 401(k), 403(b), 457(b), or personal Traditional and Roth IRAs with market growth.
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOpenAddModal('401k'); }}
                className="mt-6 w-full py-2.5 px-3 rounded-xl bg-white border border-slate-200 group-hover:bg-[#18457c] group-hover:text-white group-hover:border-[#18457c] text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add 401(k) / IRA</span>
              </button>
            </div>

            {/* Card 3: Social Security */}
            <div
              onClick={() => handleOpenAddModal('social_security')}
              className="p-6 rounded-2xl border-2 border-slate-100 hover:border-sky-500/50 bg-slate-50/50 hover:bg-sky-50/20 transition-all cursor-pointer flex flex-col justify-between group shadow-2xs"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-900">
                  Social Security
                </h3>
                <span className="inline-block mt-0.5 text-[11px] font-semibold text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded-md">
                  Statutory Benefit
                </span>
                <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                  Estimated monthly Social Security retirement benefits protected under federal law from creditors.
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOpenAddModal('social_security'); }}
                className="mt-6 w-full py-2.5 px-3 rounded-xl bg-white border border-slate-200 group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Social Security</span>
              </button>
            </div>
          </div>

          {onHideRetirement && (
            <div className="mt-8 text-center pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={onHideRetirement}
                className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-4 cursor-pointer transition-colors"
              >
                I don't need this. Hide it.
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Top KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Estimated Monthly Income */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#18457c] to-[#123258] text-white shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-200 text-xs font-medium mb-2">
            <span>Total Monthly Inflow</span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight">
              ${metrics.totalEstimatedMonthlyIncome.toLocaleString('en-US')}<span className="text-sm font-normal text-blue-200">/mo</span>
            </div>
            <p className="text-[11px] text-blue-200/90 mt-1">
              ${metrics.totalPensionMonthly.toLocaleString('en-US')} pension + ${metrics.totalSocialSecurityMonthly.toLocaleString('en-US')} Social Security + ${metrics.monthlyDrawFromCurrentBalances.toLocaleString('en-US')} safe draw
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-100">
            <span>Annualized Income:</span>
            <span className="font-semibold">${(metrics.totalEstimatedMonthlyIncome * 12).toLocaleString('en-US')} / yr</span>
          </div>
        </div>

        {/* Card 2: 401k / IRA Net Worth Balances */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Retirement Portfolio Balances</span>
            <Building className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              ${metrics.totalDcBalances.toLocaleString('en-US')}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Included in your <strong className="text-slate-700">Total Net Worth</strong>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Monthly Growth Adds:</span>
            <span className="font-semibold text-emerald-600">+${(metrics.totalMonthlyEmployeeContributions + metrics.totalMonthlyEmployerMatches).toLocaleString('en-US')}/mo</span>
          </div>
        </div>

        {/* Card 3: Guaranteed Monthly Pensions */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Guaranteed Pension & SS</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              ${(metrics.totalPensionMonthly + metrics.totalSocialSecurityMonthly).toLocaleString('en-US')}<span className="text-sm font-normal text-slate-400">/mo</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Exempt from private bank levies & debts
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Protected Income:</span>
            <span className="font-semibold text-emerald-700">100% Statutorily Shielded</span>
          </div>
        </div>

        {/* Card 4: Monthly Paycheck Deductions */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Paycheck Deductions (Saved)</span>
            <PiggyBank className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-indigo-900">
              ${Math.round(metrics.totalPaycheckDeductions).toLocaleString('en-US')}<span className="text-sm font-normal text-slate-400">/mo</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Pre-tax & payroll deductions (not spending)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Free Match Bonus:</span>
            <span className="font-semibold text-blue-700">+${metrics.totalMonthlyEmployerMatches.toLocaleString('en-US')}/mo</span>
          </div>
        </div>
      </div>

      {/* "What If I Retire At ___" Interactive Scenario Simulator */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#132c4e] to-slate-900 text-white shadow-lg border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold mb-2">
              <Sliders className="w-3 h-3" />
              <span>Interactive Retirement Age Simulator</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              What if I retire at <span className="text-amber-400 font-extrabold underline decoration-amber-400/50 underline-offset-4">age {simulatedAge}</span>?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Adjust your target retirement age to simulate pension service years, compounding portfolio growth, and Social Security adjustments.
            </p>
          </div>

          {/* Simulated Monthly Income Stat Box */}
          <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-xs border border-white/10 shrink-0">
            <div>
              <span className="text-[11px] text-slate-300 uppercase tracking-wider block font-semibold">Simulated Monthly Income</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-300">
                ${simulation.simTotalMonthly.toLocaleString('en-US')}<span className="text-xs font-normal text-slate-200">/mo</span>
              </span>
            </div>
            {simulation.diffFromBaseline !== 0 && (
              <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                simulation.diffFromBaseline > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {simulation.diffFromBaseline > 0 ? `+${simulation.diffFromBaseline.toLocaleString('en-US')}/mo` : `${simulation.diffFromBaseline.toLocaleString('en-US')}/mo`}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Sliders & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          {/* Slider: Simulated Retirement Age */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Retirement Age Target</span>
              <span className="text-amber-300 font-bold text-sm">{simulatedAge} years old</span>
            </div>
            <input
              type="range"
              min={50}
              max={75}
              step={1}
              value={simulatedAge}
              onChange={(e) => setSimulatedAge(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Age 50</span>
              <span>55</span>
              <span className="text-white font-semibold">62</span>
              <span className="text-amber-400 font-bold">65</span>
              <span>67 (FRA)</span>
              <span>Age 75</span>
            </div>
          </div>

          {/* Slider: Current Age */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Current Age</span>
              <span className="text-blue-300 font-bold text-sm">{currentAge} years old</span>
            </div>
            <input
              type="range"
              min={25}
              max={70}
              step={1}
              value={currentAge}
              onChange={(e) => setCurrentAge(Number(e.target.value))}
              className="w-full accent-blue-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
            />
            <span className="text-[10px] text-slate-400">
              {simulation.yearsUntilRetirement > 0 ? `${simulation.yearsUntilRetirement} years until retirement` : 'Already at retirement age'}
            </span>
          </div>

          {/* Slider: Assumed Real Annual Return on Accounts */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Assumed Investment Return</span>
              <span className="text-emerald-300 font-bold text-sm">{assumedReturnRate.toFixed(1)}% / yr</span>
            </div>
            <input
              type="range"
              min={2.0}
              max={10.0}
              step={0.5}
              value={assumedReturnRate}
              onChange={(e) => setAssumedReturnRate(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Conservative (4%)</span>
              <span className="text-emerald-300">Moderate (6%)</span>
              <span>Aggressive (8%)</span>
            </div>
          </div>
        </div>

        {/* Editable Modeling Assumptions Bar (Safe Withdrawal Rate & Default Pension Benefit Factor) */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="swr-input" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-amber-400" />
                <span>Annual Safe Withdrawal Rate (%)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="swr-input"
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="10.0"
                  value={safeWithdrawalRate}
                  onChange={(e) => setSafeWithdrawalRate(Math.max(0.5, Math.min(15, parseFloat(e.target.value) || 0)))}
                  className="w-20 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-600 text-amber-300 font-bold text-xs text-right focus:outline-hidden focus:border-amber-400"
                />
                <span className="text-xs text-slate-300 font-semibold">% / yr</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Note: Defaults to the standard 4.0% rule for converting 401(k)/IRA balances into estimated monthly retirement income. Adjust lower (e.g., 3.2%–3.5%) for early retirement or conservative horizons.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="default-factor-input" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                <span>Default Pension Benefit Factor (%)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="default-factor-input"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="5.0"
                  value={defaultBenefitFactorPct}
                  onChange={(e) => setDefaultBenefitFactorPct(Math.max(0.1, Math.min(10, parseFloat(e.target.value) || 0)))}
                  className="w-20 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-600 text-emerald-300 font-bold text-xs text-right focus:outline-hidden focus:border-emerald-400"
                />
                <span className="text-xs text-slate-300 font-semibold">% / yr</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Note: Used as the starting multiplier per year of service when adding a new pension or when a plan has no custom factor set (e.g., 2.0% for CalPERS/CalSTRS PEPRA at 62, 1.0%–1.1% for FERS). Each pension card can also override its own factor.
            </p>
          </div>
        </div>

        {/* Simulation Output Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/10 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-slate-400 block text-[11px]">Simulated Pension Monthly</span>
            <span className="text-base font-bold text-emerald-300">${simulation.simPensionMonthly.toLocaleString('en-US')}/mo</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Adjusted for service years at age {simulatedAge}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-slate-400 block text-[11px]">Social Security at Age {simulatedAge}</span>
            <span className="text-base font-bold text-sky-300">${simulation.simSocialSecurityMonthly.toLocaleString('en-US')}/mo</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {simulatedAge < 67 ? 'Early claiming reduction applied' : simulatedAge > 67 ? 'Delayed retirement credit applied' : '100% Full Retirement Age'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-slate-400 block text-[11px]">401(k) / IRA Portfolio at Age {simulatedAge}</span>
            <span className="text-base font-bold text-amber-300">${simulation.simProjectedBalance.toLocaleString('en-US')}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Provides ~${simulation.simMonthlyPortfolioDraw.toLocaleString('en-US')}/mo via {safeWithdrawalRate}% withdrawal rate</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'all', label: `All Plans (${plans.length})` },
            { id: 'pension', label: `Pensions (${plans.filter(p => p.planType === 'pension').length})` },
            { id: 'account', label: `401(k) / IRAs (${plans.filter(p => p.planType !== 'pension' && p.planType !== 'social_security').length})` },
            { id: 'social_security', label: `Social Security (${plans.filter(p => p.planType === 'social_security').length})` }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                activeFilter === tab.id
                  ? 'bg-[#18457c] text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {onAskAiAdvisor && (
          <button
            type="button"
            onClick={() => onAskAiAdvisor("Can you analyze my retirement plans, calculate my projected replacement ratio, and explain what steps I should take next?")}
            className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Ask Advisor About Retirement Strategy</span>
          </button>
        )}
      </div>

      {/* Plan Cards Grid */}
      {filteredPlans.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-2xl flex flex-col items-center gap-3">
          <Landmark className="w-10 h-10 text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">No retirement plans found</h3>
          <p className="text-xs text-slate-500 max-w-md">
            Track your state pension (CalPERS, CalSTRS), federal benefits, workplace 401(k), or Social Security estimates to see your full financial forecast.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleOpenAddModal('pension')}
              className="px-4 py-2 rounded-xl bg-[#18457c] text-white text-xs font-semibold shadow-2xs cursor-pointer hover:bg-[#123561]"
            >
              Add First Retirement Plan
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map(plan => {
            const config = PLAN_TYPE_CONFIG[plan.planType] || PLAN_TYPE_CONFIG.pension;
            const Icon = config.icon;
            const isPension = plan.planType === 'pension';
            const isSs = plan.planType === 'social_security';

            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Header: Badge & Actions */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${config.color}`}>
                      <Icon className="w-3 h-3 shrink-0" />
                      <span>{config.shortLabel}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(plan)}
                        title="Edit Plan"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan.id, plan.name)}
                        title="Delete Plan"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Plan Name & Provider */}
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{plan.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {plan.provider || 'Retirement Provider'}{plan.tier ? ` • ${plan.tier}` : ''}
                  </p>

                  {/* Primary Highlighted Metric */}
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                    {isPension || isSs ? (
                      <>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Estimated Monthly Benefit
                        </span>
                        <div className="text-2xl font-extrabold text-emerald-800 flex items-baseline gap-1">
                          ${Number(plan.estimatedMonthlyBenefit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-xs font-normal text-slate-500">/mo for life</span>
                        </div>
                        {isPension && (
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Formula: {plan.yearsOfService || 0} yrs × {plan.benefitFactorPct || 0}% × ${(Number(plan.highestAverageSalary || 0)).toLocaleString('en-US')} ÷ 12
                          </span>
                        )}
                        {isSs && (
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Full Retirement Age: {plan.retirementAge || 67}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Current Account Balance
                        </span>
                        <div className="text-2xl font-extrabold text-blue-900 flex items-baseline gap-1">
                          ${Number(plan.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="inline-block mt-1 text-[10px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md w-fit">
                          Included in Net Worth
                        </span>
                      </>
                    )}
                  </div>

                  {/* Secondary Details Grid */}
                  <div className="grid grid-cols-2 gap-2.5 mt-4 text-xs">
                    {isPension ? (
                      <>
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                          <span className="text-slate-400 text-[10px] block">Years of Service</span>
                          <span className="font-semibold text-slate-800">{plan.yearsOfService || 0} years</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                          <span className="text-slate-400 text-[10px] block">Benefit Factor</span>
                          <span className="font-semibold text-slate-800">{plan.benefitFactorPct || 0}%</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                          <span className="text-slate-400 text-[10px] block">Highest Avg Salary</span>
                          <span className="font-semibold text-slate-800">${Number(plan.highestAverageSalary || 0).toLocaleString('en-US')}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                          <span className="text-slate-400 text-[10px] block">Payroll Deduction</span>
                          <span className="font-semibold text-indigo-700">{plan.employeeContributionPct || 0}% of check</span>
                        </div>
                      </>
                    ) : isSs ? (
                      <>
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                          <span className="text-slate-400 text-[10px] block">Normal Claim Age</span>
                          <span className="font-semibold text-slate-800">{plan.retirementAge || 67} (FRA)</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                          <span className="text-slate-400 text-[10px] block">Statutory Protection</span>
                          <span className="font-semibold text-emerald-700">42 U.S.C. § 407</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                          <span className="text-slate-400 text-[10px] block">Employee Monthly</span>
                          <span className="font-semibold text-indigo-700">${Number(plan.employeeContribution || 0).toLocaleString('en-US')}/mo</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                          <span className="text-slate-400 text-[10px] block">Employer Match</span>
                          <span className="font-semibold text-blue-700">${Number(plan.employerMatch || 0).toLocaleString('en-US')}/mo</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                          <span className="text-slate-400 text-[10px] block">Target Age</span>
                          <span className="font-semibold text-slate-800">Age {plan.targetRetirementAge || 65}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                          <span className="text-slate-400 text-[10px] block">Safe Draw ({safeWithdrawalRate}%)</span>
                          <span className="font-semibold text-emerald-700">${Math.round((Number(plan.balance || 0) * ((Number(safeWithdrawalRate) || 0) / 100)) / 12).toLocaleString('en-US')}/mo</span>
                        </div>
                      </>
                    )}
                  </div>

                  {plan.notes && (
                    <p className="text-[11px] text-slate-500 italic mt-3 line-clamp-2">
                      “{plan.notes}”
                    </p>
                  )}
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Retirement Target: Age {plan.retirementAge || plan.targetRetirementAge || 62}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(plan)}
                    className="text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                  >
                    Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Educational Guidance & Assumptions Box */}
      <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-3.5">
        <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1 leading-relaxed">
          <strong className="font-bold text-amber-950">
            Educational Planning & Fiduciary Notice
          </strong>
          <p className="text-amber-900/90">
            Pension monthly benefits are estimated using the formula: <span className="font-semibold">Years of Service × Benefit Factor % × Final Average Salary ÷ 12</span>.
            Actual benefit factors, vesting periods, and IRS limits vary by employer, tier, and hire date. Contributions are treated as <span className="font-semibold">pre-tax paycheck deductions</span> and are excluded from discretionary consumer spending metrics.
            All estimates and projections are for educational guidance and do not constitute official actuarial or retirement system calculations.
          </p>
        </div>
      </div>

        </>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* ADD / EDIT RETIREMENT PLAN MODAL */}
      {/* --------------------------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-[#18457c] text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {editingPlanId ? 'Edit Retirement Plan' : 'Add New Retirement Plan'}
                </h3>
                <p className="text-xs text-blue-200">
                  Configure your defined benefit pension, retirement account, or Social Security.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 flex flex-col gap-5">
              {/* Plan Type Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Plan Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'pension', label: 'Pension', desc: 'CalPERS, CalSTRS' },
                    { id: '401k', label: '401(k)', desc: 'Workplace plan' },
                    { id: '403b', label: '403(b)', desc: 'Educator/Nonprofit' },
                    { id: '457', label: '457(b)', desc: 'Government plan' },
                    { id: 'ira', label: 'Traditional IRA', desc: 'Pre-tax IRA' },
                    { id: 'roth_ira', label: 'Roth IRA', desc: 'Tax-free growth' },
                    { id: 'social_security', label: 'Social Security', desc: 'Federal statutory' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          planType: t.id,
                          name: prev.name || (t.id === 'pension' ? 'State Public Pension' : t.id === 'social_security' ? 'Social Security Retirement' : `${t.label} Account`)
                        }));
                      }}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        formData.planType === t.id
                          ? 'bg-[#18457c] text-white border-[#18457c] shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-bold text-xs block leading-tight">{t.label}</span>
                      <span className={`text-[10px] block mt-0.5 ${formData.planType === t.id ? 'text-blue-200' : 'text-slate-400'}`}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pension Preset Helpers (Only shown if pension is selected) */}
              {formData.planType === 'pension' && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                  <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block mb-1.5">
                    Quick Public Pension Templates
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PENSION_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...formData,
                            provider: preset.provider,
                            tier: preset.tier,
                            benefitFactorPct: preset.benefitFactorPct,
                            retirementAge: preset.retirementAge,
                            employeeContributionPct: preset.employeeContributionPct,
                            notes: preset.notes
                          };
                          updated.estimatedMonthlyBenefit = calculatePensionBenefit(
                            updated.yearsOfService,
                            preset.benefitFactorPct,
                            updated.highestAverageSalary
                          );
                          setFormData(updated);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[11px] font-semibold hover:bg-emerald-100 cursor-pointer shadow-2xs"
                      >
                        {preset.provider} ({preset.tier})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Details: Name & Provider */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Plan Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. California State Public Pension"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Retirement Provider / Employer
                  </label>
                  <input
                    type="text"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    placeholder="e.g. CalPERS, CalSTRS, Fidelity, Vanguard"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Conditional Fields: Pension vs Account vs Social Security */}
              {formData.planType === 'pension' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Formula Tier / Name
                      </label>
                      <input
                        type="text"
                        value={formData.tier}
                        onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                        placeholder="e.g. 2% at 62"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Years of Service
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.yearsOfService}
                        onChange={(e) => handleFormulaFieldChange('yearsOfService', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Benefit Factor %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={formData.benefitFactorPct}
                        onChange={(e) => handleFormulaFieldChange('benefitFactorPct', e.target.value)}
                        placeholder="e.g. 2.0"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Highest Average Salary ($)
                      </label>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        value={formData.highestAverageSalary}
                        onChange={(e) => handleFormulaFieldChange('highestAverageSalary', e.target.value)}
                        placeholder="e.g. 95000"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Normal Retirement Age
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="75"
                        value={formData.retirementAge}
                        onChange={(e) => setFormData({ ...formData, retirementAge: Number(e.target.value) })}
                        placeholder="e.g. 62"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Employee Contribution %
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="30"
                        value={formData.employeeContributionPct}
                        onChange={(e) => setFormData({ ...formData, employeeContributionPct: Number(e.target.value) })}
                        placeholder="e.g. 7.0 (payroll deduction)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Calculated Estimated Monthly Benefit Box (Editable) */}
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                        Estimated Monthly Pension Benefit ($)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const auto = calculatePensionBenefit(formData.yearsOfService, formData.benefitFactorPct, formData.highestAverageSalary);
                          setIsBenefitManualOverride(false);
                          setFormData({ ...formData, estimatedMonthlyBenefit: auto });
                        }}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline"
                      >
                        Recalculate with formula
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm font-bold text-emerald-800">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.estimatedMonthlyBenefit}
                        onChange={(e) => {
                          setIsBenefitManualOverride(true);
                          setFormData({ ...formData, estimatedMonthlyBenefit: parseFloat(e.target.value) || 0 });
                        }}
                        className="w-full pl-7 pr-3 py-2 rounded-xl border border-emerald-300 bg-white text-base font-extrabold text-emerald-900"
                      />
                    </div>
                    <span className="text-[11px] text-emerald-800">
                      Standard Formula: <strong className="font-semibold">{formData.yearsOfService} yrs × {formData.benefitFactorPct}% × ${Number(formData.highestAverageSalary).toLocaleString()} ÷ 12</strong>. You can override this field with your exact CalPERS or pension calculator figure.
                    </span>
                  </div>
                </>
              ) : formData.planType === 'social_security' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Estimated Monthly Benefit at Full Retirement Age ($)
                      </label>
                      <input
                        type="number"
                        step="10"
                        min="0"
                        value={formData.estimatedMonthlyBenefit}
                        onChange={(e) => setFormData({ ...formData, estimatedMonthlyBenefit: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 2150"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Full Retirement Age (FRA)
                      </label>
                      <input
                        type="number"
                        min="62"
                        max="70"
                        value={formData.retirementAge}
                        onChange={(e) => setFormData({ ...formData, retirementAge: Number(e.target.value) })}
                        placeholder="e.g. 67"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Defined Contribution Accounts (401k, 403b, 457, IRA, Roth IRA) */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Current Account Balance ($) *
                      </label>
                      <input
                        type="number"
                        step="10"
                        min="0"
                        required
                        value={formData.balance}
                        onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 48500"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Included in your total Net Worth calculation.
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Target Retirement Age
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="75"
                        value={formData.targetRetirementAge}
                        onChange={(e) => setFormData({ ...formData, targetRetirementAge: Number(e.target.value) })}
                        placeholder="e.g. 65"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Employee Monthly Contribution ($)
                      </label>
                      <input
                        type="number"
                        step="10"
                        min="0"
                        value={formData.employeeContribution}
                        onChange={(e) => setFormData({ ...formData, employeeContribution: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 500"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Treated as paycheck payroll deduction (not spending).
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Employer Monthly Match ($)
                      </label>
                      <input
                        type="number"
                        step="10"
                        min="0"
                        value={formData.employerMatch}
                        onChange={(e) => setFormData({ ...formData, employerMatch: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 250"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Employer matching contribution added to balance.
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Notes & Details (Optional)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Vested after 5 years, 6% company match, Tier 1 Classic"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : editingPlanId ? 'Update Retirement Plan' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
