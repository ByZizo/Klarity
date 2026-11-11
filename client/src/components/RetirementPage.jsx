import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Landmark,
  ShieldCheck,
  Plus,
  Trash2,
  Edit3,
  Sliders,
  Info,
  Percent,
  Clock,
  X,
  PiggyBank,
  Sparkles,
  Building,
  MoreVertical
} from 'lucide-react';
import { Button, Card, Pill, EmptyState, ConfirmDialog } from './ui';

const PLAN_TYPE_CONFIG = {
  pension: {
    label: 'Defined Benefit Pension',
    shortLabel: 'Pension',
    pillVariant: 'success',
    icon: Landmark,
    description: 'Guaranteed lifetime monthly benefit (CalPERS, CalSTRS, FERS, etc.)'
  },
  '401k': {
    label: '401(k) Retirement Plan',
    shortLabel: '401(k)',
    pillVariant: 'brand',
    icon: Building,
    description: 'Employer-sponsored defined contribution plan'
  },
  '403b': {
    label: '403(b) Tax-Sheltered Annuity',
    shortLabel: '403(b)',
    pillVariant: 'brand',
    icon: Building,
    description: 'Public school & non-profit retirement account'
  },
  '457': {
    label: '457(b) Deferred Compensation',
    shortLabel: '457(b)',
    pillVariant: 'brand',
    icon: Building,
    description: 'State & local government supplemental savings'
  },
  ira: {
    label: 'Traditional IRA',
    shortLabel: 'Traditional IRA',
    pillVariant: 'warning',
    icon: PiggyBank,
    description: 'Individual retirement account with tax-deferred growth'
  },
  roth_ira: {
    label: 'Roth IRA',
    shortLabel: 'Roth IRA',
    pillVariant: 'brand',
    icon: PiggyBank,
    description: 'After-tax contributions with 100% tax-free withdrawals'
  },
  social_security: {
    label: 'Social Security Retirement',
    shortLabel: 'Social Security',
    pillVariant: 'success',
    icon: ShieldCheck,
    description: 'Federal retirement benefit protected from private creditors'
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
    tier: '2% at 62',
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
  onAskAiAdvisor,
  onHideRetirement,
  onShowToast
}) {
  const [plans, setPlans] = useState(retirementPlans);
  const [activeFilter, setActiveFilter] = useState('all');
  const [simulatedAge, setSimulatedAge] = useState(62);
  const [currentAge, setCurrentAge] = useState(48);
  const [assumedReturnRate, setAssumedReturnRate] = useState(6.0);
  const [safeWithdrawalRate, setSafeWithdrawalRate] = useState(4.0);
  const [defaultBenefitFactorPct, setDefaultBenefitFactorPct] = useState(2.0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const headerMenuRef = useRef(null);

  useEffect(() => {
    setPlans(retirementPlans);
  }, [retirementPlans]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target)) {
        setIsHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg, type = 'success') => {
    if (onShowToast) onShowToast(msg, type);
  };

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

  const calculatePensionBenefit = (years, factorPct, salary) => {
    const y = Number(years) || 0;
    const f = (Number(factorPct) || 0) / 100;
    const s = Number(salary) || 0;
    return Math.round((y * f * s) / 12);
  };

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
        showToast(editingPlanId ? `Updated ${planPayload.name}` : `Added ${planPayload.name}`);
      } else {
        const updatedList = editingPlanId
          ? plans.map(p => p.id === editingPlanId ? planPayload : p)
          : [...plans, planPayload];
        setPlans(updatedList);
        if (onUpdatePlans) onUpdatePlans(updatedList);
        showToast(editingPlanId ? `Updated ${planPayload.name}` : `Added ${planPayload.name}`);
      }
      setIsModalOpen(false);
    } catch {
      showToast('Failed to save retirement plan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete) return;
    const { id, name } = planToDelete;
    setPlanToDelete(null);

    try {
      await fetch(`/api/retirement/${id}`, { method: 'DELETE' });
      const updatedList = plans.filter(p => p.id !== id);
      setPlans(updatedList);
      if (onUpdatePlans) onUpdatePlans(updatedList);
      showToast(`Removed ${name}`);
    } catch {
      const updatedList = plans.filter(p => p.id !== id);
      setPlans(updatedList);
      if (onUpdatePlans) onUpdatePlans(updatedList);
      showToast(`Removed ${name}`);
    }
  };

  const metrics = useMemo(() => {
    const pensionPlans = plans.filter(p => p.planType === 'pension');
    const totalPensionMonthly = pensionPlans.reduce((sum, p) => sum + Number(p.estimatedMonthlyBenefit || 0), 0);

    const ssPlans = plans.filter(p => p.planType === 'social_security');
    const totalSocialSecurityMonthly = ssPlans.reduce((sum, p) => sum + Number(p.estimatedMonthlyBenefit || 0), 0);

    const dcPlans = plans.filter(p => p.planType !== 'pension' && p.planType !== 'social_security');
    const totalDcBalances = dcPlans.reduce((sum, p) => sum + Number(p.balance || 0), 0);
    const totalMonthlyEmployeeContributions = dcPlans.reduce((sum, p) => sum + Number(p.employeeContribution || 0), 0);
    const totalMonthlyEmployerMatches = dcPlans.reduce((sum, p) => sum + Number(p.employerMatch || 0), 0);

    const pensionMonthlyContributions = pensionPlans.reduce((sum, p) => {
      const sal = Number(p.highestAverageSalary || 0);
      const pct = (Number(p.employeeContributionPct || 0) / 100);
      return sum + (sal > 0 ? (sal * pct) / 12 : 0);
    }, 0);

    const totalPaycheckDeductions = totalMonthlyEmployeeContributions + pensionMonthlyContributions;
    const swrFraction = (Number(safeWithdrawalRate) || 0) / 100;
    const monthlyDrawFromCurrentBalances = Math.round((totalDcBalances * swrFraction) / 12);
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

  const simulation = useMemo(() => {
    const yearsUntilRetirement = Math.max(0, simulatedAge - currentAge);

    let simPensionMonthly = 0;
    plans.filter(p => p.planType === 'pension').forEach(p => {
      const normalAge = Number(p.retirementAge || 62);
      const curYears = Number(p.yearsOfService || 0);
      const factorPct = Number(p.benefitFactorPct || defaultBenefitFactorPct || 2.0);
      const salary = Number(p.highestAverageSalary || 0);
      const additionalYears = Math.max(0, simulatedAge - normalAge);
      const adjustedYears = curYears + additionalYears;
      simPensionMonthly += calculatePensionBenefit(adjustedYears, factorPct, salary);
    });

    let simSocialSecurityMonthly = 0;
    plans.filter(p => p.planType === 'social_security').forEach(p => {
      const baseBenefit = Number(p.estimatedMonthlyBenefit || 2000);
      let multiplier = 1.0;
      if (simulatedAge <= 62) multiplier = 0.70;
      else if (simulatedAge === 63) multiplier = 0.75;
      else if (simulatedAge === 64) multiplier = 0.80;
      else if (simulatedAge === 65) multiplier = 0.867;
      else if (simulatedAge === 66) multiplier = 0.933;
      else if (simulatedAge === 67) multiplier = 1.0;
      else if (simulatedAge === 68) multiplier = 1.08;
      else if (simulatedAge === 69) multiplier = 1.16;
      else multiplier = 1.24;

      simSocialSecurityMonthly += Math.round(baseBenefit * multiplier);
    });

    let simProjectedBalance = 0;
    const r = (assumedReturnRate / 100) / 12;
    const n = yearsUntilRetirement * 12;

    plans.filter(p => p.planType !== 'pension' && p.planType !== 'social_security').forEach(p => {
      const principal = Number(p.balance || 0);
      const monthlyPmt = Number(p.employeeContribution || 0) + Number(p.employerMatch || 0);

      let futureVal = principal;
      if (n > 0 && r > 0) {
        const compoundPrincipal = principal * Math.pow(1 + r, n);
        const futureContributions = monthlyPmt * ((Math.pow(1 + r, n) - 1) / r);
        futureVal = compoundPrincipal + futureContributions;
      } else {
        futureVal = principal + (monthlyPmt * n);
      }
      simProjectedBalance += futureVal;
    });

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

  const filteredPlans = plans.filter(p => {
    if (activeFilter === 'pension') return p.planType === 'pension';
    if (activeFilter === 'account') return p.planType !== 'pension' && p.planType !== 'social_security';
    if (activeFilter === 'social_security') return p.planType === 'social_security';
    return true;
  });

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-semibold text-[var(--ink)] tracking-tight">
            Retirement &amp; pension plans
          </h1>
          <p className="text-[15px] font-medium text-[var(--muted)]">
            Public pensions (CalPERS, CalSTRS, FERS), 401(k), IRAs, and Social Security estimates
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="primary" size="sm" onClick={() => handleOpenAddModal('pension')}>
            <Plus className="w-4 h-4" />
            <span>Add plan</span>
          </Button>
          {plans.length > 0 && (
            <div className="relative" ref={headerMenuRef}>
              <button
                type="button"
                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                className="w-9 h-9 flex items-center justify-center rounded-[8px] border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--ink)] cursor-pointer"
                aria-label="More retirement actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isHeaderMenuOpen && (
                <Card className="absolute right-0 top-full mt-1.5 w-52 py-1.5 z-50 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      handleOpenAddModal('pension');
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] text-left cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#15803D]" />
                    <span>Add pension</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      handleOpenAddModal('401k');
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] text-left cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#1B4B91]" />
                    <span>Add 401(k) or IRA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      handleOpenAddModal('social_security');
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] text-left cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#15803D]" />
                    <span>Add Social Security</span>
                  </button>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            title="No retirement plans added yet"
            message="Track lifetime pensions, 401(k) or IRA accounts, and Social Security estimates in one place."
            actionLabel="Add first retirement plan"
            onAction={() => handleOpenAddModal('pension')}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-[8px] bg-[#15803D]/10 text-[#15803D] flex items-center justify-center mb-3">
                  <Landmark className="w-5 h-5" />
                </div>
                <h3 className="text-[16px] font-semibold text-[var(--ink)]">Pension</h3>
                <p className="text-[13px] font-medium text-[var(--muted)] mt-1 leading-relaxed">
                  CalPERS, CalSTRS, FERS, military, or municipal pensions with guaranteed lifetime monthly benefits.
                </p>
              </div>
              <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => handleOpenAddModal('pension')}>
                <Plus className="w-4 h-4" />
                <span>Add pension</span>
              </Button>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-[8px] bg-[#1B4B91]/10 text-[#1B4B91] flex items-center justify-center mb-3">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="text-[16px] font-semibold text-[var(--ink)]">Retirement account</h3>
                <p className="text-[13px] font-medium text-[var(--muted)] mt-1 leading-relaxed">
                  Employer-sponsored 401(k), 403(b), 457(b), or personal Traditional and Roth IRAs.
                </p>
              </div>
              <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => handleOpenAddModal('401k')}>
                <Plus className="w-4 h-4" />
                <span>Add 401(k) or IRA</span>
              </Button>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-[8px] bg-[#15803D]/10 text-[#15803D] flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-[16px] font-semibold text-[var(--ink)]">Social Security</h3>
                <p className="text-[13px] font-medium text-[var(--muted)] mt-1 leading-relaxed">
                  Estimated monthly Social Security retirement benefits protected under federal law.
                </p>
              </div>
              <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => handleOpenAddModal('social_security')}>
                <Plus className="w-4 h-4" />
                <span>Add Social Security</span>
              </Button>
            </Card>
          </div>

          {onHideRetirement && (
            <div className="text-center">
              <button
                type="button"
                onClick={onHideRetirement}
                className="text-[13px] font-medium text-[var(--muted)] hover:text-[var(--ink)] underline cursor-pointer"
              >
                Hide retirement section
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Top KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 flex flex-col justify-between">
              <div className="text-[13px] font-medium text-[var(--muted)] mb-1">
                Estimated monthly retirement income
              </div>
              <div>
                <div className="text-[26px] font-semibold font-serif text-[var(--ink)]">
                  ${metrics.totalEstimatedMonthlyIncome.toLocaleString('en-US')}<span className="text-[14px] font-sans font-medium text-[var(--muted)]">/mo</span>
                </div>
                <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
                  ${metrics.totalPensionMonthly.toLocaleString('en-US')} pension + ${metrics.totalSocialSecurityMonthly.toLocaleString('en-US')} SS + ${metrics.monthlyDrawFromCurrentBalances.toLocaleString('en-US')} draw
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[13px]">
                <span className="text-[var(--muted)] font-medium">Annualized</span>
                <span className="font-semibold text-[var(--ink)]">${(metrics.totalEstimatedMonthlyIncome * 12).toLocaleString('en-US')}/yr</span>
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div className="text-[13px] font-medium text-[var(--muted)] mb-1">
                Retirement account balances
              </div>
              <div>
                <div className="text-[26px] font-semibold font-serif text-[var(--ink)]">
                  ${metrics.totalDcBalances.toLocaleString('en-US')}
                </div>
                <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
                  Included in total net worth
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[13px]">
                <span className="text-[var(--muted)] font-medium">Monthly contributions</span>
                <span className="font-semibold text-[#15803D]">+${(metrics.totalMonthlyEmployeeContributions + metrics.totalMonthlyEmployerMatches).toLocaleString('en-US')}/mo</span>
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div className="text-[13px] font-medium text-[var(--muted)] mb-1">
                Guaranteed pension &amp; Social Security
              </div>
              <div>
                <div className="text-[26px] font-semibold font-serif text-[var(--ink)]">
                  ${(metrics.totalPensionMonthly + metrics.totalSocialSecurityMonthly).toLocaleString('en-US')}<span className="text-[14px] font-sans font-medium text-[var(--muted)]">/mo</span>
                </div>
                <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
                  Protected from private creditor levies
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[13px]">
                <span className="text-[var(--muted)] font-medium">Protection status</span>
                <span className="font-semibold text-[#15803D]">Protected income</span>
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div className="text-[13px] font-medium text-[var(--muted)] mb-1">
                Paycheck deductions saved
              </div>
              <div>
                <div className="text-[26px] font-semibold font-serif text-[var(--ink)]">
                  ${Math.round(metrics.totalPaycheckDeductions).toLocaleString('en-US')}<span className="text-[14px] font-sans font-medium text-[var(--muted)]">/mo</span>
                </div>
                <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
                  Pre-tax &amp; payroll deductions
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[13px]">
                <span className="text-[var(--muted)] font-medium">Employer match</span>
                <span className="font-semibold text-[#1B4B91]">+${metrics.totalMonthlyEmployerMatches.toLocaleString('en-US')}/mo</span>
              </div>
            </Card>
          </div>

          {/* Interactive Retirement Age Simulator */}
          <Card className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[var(--line)]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Pill variant="brand">Retirement age simulator</Pill>
                </div>
                <h2 className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                  What if I retire at age {simulatedAge}?
                </h2>
                <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                  Adjust target retirement age to simulate pension service years, portfolio compounding, and Social Security adjustments.
                </p>
              </div>

              <div className="flex items-center gap-4 bg-[var(--surface-subtle)] p-4 rounded-[8px] border border-[var(--line)] shrink-0">
                <div>
                  <span className="text-[13px] text-[var(--muted)] block font-medium">Simulated monthly income</span>
                  <span className="text-[24px] font-semibold font-serif text-[#1B4B91]">
                    ${simulation.simTotalMonthly.toLocaleString('en-US')}<span className="text-[13px] font-sans font-medium text-[var(--muted)]">/mo</span>
                  </span>
                </div>
                {simulation.diffFromBaseline !== 0 && (
                  <Pill variant={simulation.diffFromBaseline > 0 ? 'success' : 'danger'}>
                    {simulation.diffFromBaseline > 0 ? `+${simulation.diffFromBaseline.toLocaleString('en-US')}/mo` : `${simulation.diffFromBaseline.toLocaleString('en-US')}/mo`}
                  </Pill>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[13px]">
                  <label htmlFor="sim-retire-age" className="text-[var(--ink)] font-medium">Retirement age target</label>
                  <span className="text-[#1B4B91] font-semibold">{simulatedAge} years old</span>
                </div>
                <input
                  id="sim-retire-age"
                  type="range"
                  min={50}
                  max={75}
                  step={1}
                  value={simulatedAge}
                  onChange={(e) => setSimulatedAge(Number(e.target.value))}
                  className="w-full accent-[#1B4B91] cursor-pointer"
                />
                <div className="flex items-center justify-between text-[13px] text-[var(--muted)]">
                  <span>Age 50</span>
                  <span>62</span>
                  <span>67 (FRA)</span>
                  <span>Age 75</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[13px]">
                  <label htmlFor="sim-current-age" className="text-[var(--ink)] font-medium">Current age</label>
                  <span className="text-[#1B4B91] font-semibold">{currentAge} years old</span>
                </div>
                <input
                  id="sim-current-age"
                  type="range"
                  min={25}
                  max={70}
                  step={1}
                  value={currentAge}
                  onChange={(e) => setCurrentAge(Number(e.target.value))}
                  className="w-full accent-[#1B4B91] cursor-pointer"
                />
                <span className="text-[13px] text-[var(--muted)]">
                  {simulation.yearsUntilRetirement > 0 ? `${simulation.yearsUntilRetirement} years until retirement` : 'At retirement age'}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[13px]">
                  <label htmlFor="sim-return-rate" className="text-[var(--ink)] font-medium">Assumed investment return</label>
                  <span className="text-[#15803D] font-semibold">{assumedReturnRate.toFixed(1)}% / yr</span>
                </div>
                <input
                  id="sim-return-rate"
                  type="range"
                  min={2.0}
                  max={10.0}
                  step={0.5}
                  value={assumedReturnRate}
                  onChange={(e) => setAssumedReturnRate(Number(e.target.value))}
                  className="w-full accent-[#1B4B91] cursor-pointer"
                />
                <div className="flex items-center justify-between text-[13px] text-[var(--muted)]">
                  <span>4%</span>
                  <span>6%</span>
                  <span>8%</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[var(--line)] grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)] flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="swr-input" className="text-[13px] font-medium text-[var(--ink)]">
                    Annual safe withdrawal rate (%)
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
                      className="w-20 px-2.5 py-1 rounded-[8px] bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] font-semibold text-[13px] text-right"
                    />
                    <span className="text-[13px] text-[var(--muted)]">% / yr</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)] flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="default-factor-input" className="text-[13px] font-medium text-[var(--ink)]">
                    Default pension benefit factor (%)
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
                      className="w-20 px-2.5 py-1 rounded-[8px] bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] font-semibold text-[13px] text-right"
                    />
                    <span className="text-[13px] text-[var(--muted)]">% / yr</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[var(--line)]">
              <div className="p-3.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
                <span className="text-[var(--muted)] block text-[13px] font-medium">Simulated pension monthly</span>
                <span className="text-[18px] font-semibold font-serif text-[var(--ink)]">${simulation.simPensionMonthly.toLocaleString('en-US')}/mo</span>
              </div>
              <div className="p-3.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
                <span className="text-[var(--muted)] block text-[13px] font-medium">Social Security at age {simulatedAge}</span>
                <span className="text-[18px] font-semibold font-serif text-[var(--ink)]">${simulation.simSocialSecurityMonthly.toLocaleString('en-US')}/mo</span>
              </div>
              <div className="p-3.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
                <span className="text-[var(--muted)] block text-[13px] font-medium">Portfolio at age {simulatedAge}</span>
                <span className="text-[18px] font-semibold font-serif text-[var(--ink)]">${simulation.simProjectedBalance.toLocaleString('en-US')}</span>
              </div>
            </div>
          </Card>

          {/* Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { id: 'all', label: `All plans (${plans.length})` },
                { id: 'pension', label: `Pensions (${plans.filter(p => p.planType === 'pension').length})` },
                { id: 'account', label: `401(k) & IRAs (${plans.filter(p => p.planType !== 'pension' && p.planType !== 'social_security').length})` },
                { id: 'social_security', label: `Social Security (${plans.filter(p => p.planType === 'social_security').length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3.5 py-2 rounded-[8px] text-[13px] font-medium cursor-pointer transition-all ${
                    activeFilter === tab.id
                      ? 'bg-[#1B4B91] text-white font-semibold'
                      : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {onAskAiAdvisor && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAskAiAdvisor("Can you review my retirement plans, calculate my projected replacement ratio, and suggest next steps?")}
              >
                <Sparkles className="w-4 h-4 text-[#1B4B91]" />
                <span>Ask Advisor about retirement</span>
              </Button>
            )}
          </div>

          {/* Plan Cards Grid */}
          {filteredPlans.length === 0 ? (
            <EmptyState
              title="No matching retirement plans"
              message="No plans match this filter. Add a plan or switch filters above."
              actionLabel="Add retirement plan"
              onAction={() => handleOpenAddModal('pension')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans.map(plan => {
                const config = PLAN_TYPE_CONFIG[plan.planType] || PLAN_TYPE_CONFIG.pension;
                const isPension = plan.planType === 'pension';
                const isSs = plan.planType === 'social_security';

                return (
                  <Card key={plan.id} className="p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <Pill variant={config.pillVariant}>{config.shortLabel}</Pill>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Edit ${plan.name}`}
                            onClick={() => handleOpenEditModal(plan)}
                            className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] rounded-[8px] cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${plan.name}`}
                            onClick={() => setPlanToDelete({ id: plan.id, name: plan.name })}
                            className="p-1.5 text-[var(--muted)] hover:text-[#B91C1C] hover:bg-[#B91C1C]/10 rounded-[8px] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-[16px] font-semibold text-[var(--ink)]">{plan.name}</h3>
                      <p className="text-[13px] text-[var(--muted)] font-medium">
                        {plan.provider || 'Retirement provider'}{plan.tier ? ` • ${plan.tier}` : ''}
                      </p>

                      <div className="mt-4 p-4 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
                        {isPension || isSs ? (
                          <>
                            <span className="text-[13px] font-medium text-[var(--muted)] block">
                              Estimated monthly benefit
                            </span>
                            <div className="text-[22px] font-semibold font-serif text-[#15803D] mt-0.5">
                              ${Number(plan.estimatedMonthlyBenefit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              <span className="text-[13px] font-sans font-medium text-[var(--muted)]"> /mo</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-[13px] font-medium text-[var(--muted)] block">
                              Current account balance
                            </span>
                            <div className="text-[22px] font-semibold font-serif text-[var(--ink)] mt-0.5">
                              ${Number(plan.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 mt-4">
                        {isPension ? (
                          <>
                            <div className="p-2.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
                              <span className="text-[var(--muted)] text-[13px] block">Service years</span>
                              <span className="font-semibold text-[15px] text-[var(--ink)]">{plan.yearsOfService || 0} yrs</span>
                            </div>
                            <div className="p-2.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
                              <span className="text-[var(--muted)] text-[13px] block">Benefit factor</span>
                              <span className="font-semibold text-[15px] text-[var(--ink)]">{plan.benefitFactorPct || 0}%</span>
                            </div>
                          </>
                        ) : isSs ? (
                          <>
                            <div className="p-2.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
                              <span className="text-[var(--muted)] text-[13px] block">Claim age</span>
                              <span className="font-semibold text-[15px] text-[var(--ink)]">{plan.retirementAge || 67}</span>
                            </div>
                            <div className="p-2.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
                              <span className="text-[var(--muted)] text-[13px] block">Protection</span>
                              <span className="font-semibold text-[15px] text-[#15803D]">Federal exempt</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="p-2.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
                              <span className="text-[var(--muted)] text-[13px] block">Employee monthly</span>
                              <span className="font-semibold text-[15px] text-[var(--ink)]">${Number(plan.employeeContribution || 0).toLocaleString('en-US')}/mo</span>
                            </div>
                            <div className="p-2.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
                              <span className="text-[var(--muted)] text-[13px] block">Employer match</span>
                              <span className="font-semibold text-[15px] text-[#1B4B91]">${Number(plan.employerMatch || 0).toLocaleString('en-US')}/mo</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[13px] text-[var(--muted)]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Target age {plan.retirementAge || plan.targetRetirementAge || 62}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(plan)}
                        className="text-[#1B4B91] hover:underline font-medium cursor-pointer"
                      >
                        Edit details
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Educational Note */}
          <Card className="p-4 flex items-start gap-3 bg-[var(--surface-subtle)]">
            <Info className="w-5 h-5 text-[#1B4B91] shrink-0 mt-0.5" />
            <p className="text-[13px] font-medium text-[var(--muted)] leading-relaxed">
              Pension benefits are estimated using Years of Service × Benefit Factor % × Highest Average Salary ÷ 12. Actual formulas vary by employer and retirement tier.
            </p>
          </Card>
        </>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="retirement-modal-title"
        >
          <Card className="w-full max-w-2xl my-8 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between">
              <div>
                <h3 id="retirement-modal-title" className="text-[18px] font-semibold font-serif text-[var(--ink)]">
                  {editingPlanId ? 'Edit retirement plan' : 'Add retirement plan'}
                </h3>
                <p className="text-[13px] font-medium text-[var(--muted)]">
                  Configure your pension, retirement account, or Social Security estimate
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--ink)] p-1.5 rounded-[8px] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
              <div>
                <span className="text-[13px] font-medium text-[var(--ink)] block mb-2">
                  Plan category
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'pension', label: 'Pension', desc: 'CalPERS, CalSTRS' },
                    { id: '401k', label: '401(k)', desc: 'Workplace plan' },
                    { id: '403b', label: '403(b)', desc: 'Educator/Nonprofit' },
                    { id: '457', label: '457(b)', desc: 'Government plan' },
                    { id: 'ira', label: 'Traditional IRA', desc: 'Pre-tax IRA' },
                    { id: 'roth_ira', label: 'Roth IRA', desc: 'Tax-free growth' },
                    { id: 'social_security', label: 'Social Security', desc: 'Federal benefit' }
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
                      className={`p-2.5 rounded-[8px] border text-left cursor-pointer transition-all ${
                        formData.planType === t.id
                          ? 'bg-[#1B4B91] text-white border-[#1B4B91]'
                          : 'bg-[var(--surface)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                      }`}
                    >
                      <span className="font-semibold text-[13px] block">{t.label}</span>
                      <span className={`text-[13px] block mt-0.5 ${formData.planType === t.id ? 'text-white/80' : 'text-[var(--muted)]'}`}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {formData.planType === 'pension' && (
                <div className="p-3.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]">
                  <span className="text-[13px] font-medium text-[var(--ink)] block mb-2">
                    Public pension templates
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PENSION_PRESETS.map((preset, idx) => (
                      <Button
                        key={idx}
                        variant="secondary"
                        size="sm"
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
                      >
                        {preset.provider} ({preset.tier})
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ret-plan-name" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                    Plan name *
                  </label>
                  <input
                    id="ret-plan-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. California State Public Pension"
                    className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label htmlFor="ret-plan-provider" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                    Provider or employer
                  </label>
                  <input
                    id="ret-plan-provider"
                    type="text"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    placeholder="e.g. CalPERS, Fidelity, Vanguard"
                    className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                  />
                </div>
              </div>

              {formData.planType === 'pension' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="ret-tier" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Formula tier
                      </label>
                      <input
                        id="ret-tier"
                        type="text"
                        value={formData.tier}
                        onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="ret-years" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Years of service
                      </label>
                      <input
                        id="ret-years"
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.yearsOfService}
                        onChange={(e) => handleFormulaFieldChange('yearsOfService', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="ret-factor" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Benefit factor %
                      </label>
                      <input
                        id="ret-factor"
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={formData.benefitFactorPct}
                        onChange={(e) => handleFormulaFieldChange('benefitFactorPct', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="ret-salary" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Highest average salary ($)
                      </label>
                      <input
                        id="ret-salary"
                        type="number"
                        step="100"
                        min="0"
                        value={formData.highestAverageSalary}
                        onChange={(e) => handleFormulaFieldChange('highestAverageSalary', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="ret-age" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Normal retirement age
                      </label>
                      <input
                        id="ret-age"
                        type="number"
                        min="50"
                        max="75"
                        value={formData.retirementAge}
                        onChange={(e) => setFormData({ ...formData, retirementAge: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="ret-contrib-pct" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Employee contribution %
                      </label>
                      <input
                        id="ret-contrib-pct"
                        type="number"
                        step="0.1"
                        min="0"
                        max="30"
                        value={formData.employeeContributionPct}
                        onChange={(e) => setFormData({ ...formData, employeeContributionPct: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-[8px] bg-[#15803D]/10 border border-[#15803D]/25 flex flex-col gap-2">
                    <label htmlFor="ret-est-benefit" className="text-[13px] font-semibold text-[#15803D]">
                      Estimated monthly pension benefit ($)
                    </label>
                    <input
                      id="ret-est-benefit"
                      type="number"
                      step="0.01"
                      value={formData.estimatedMonthlyBenefit}
                      onChange={(e) => {
                        setIsBenefitManualOverride(true);
                        setFormData({ ...formData, estimatedMonthlyBenefit: parseFloat(e.target.value) || 0 });
                      }}
                      className="w-full px-3.5 py-2 rounded-[8px] border border-[#15803D]/40 bg-[var(--surface)] text-[16px] font-semibold text-[var(--ink)]"
                    />
                  </div>
                </>
              ) : formData.planType === 'social_security' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ret-ss-benefit" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                      Estimated monthly benefit at FRA ($)
                    </label>
                    <input
                      id="ret-ss-benefit"
                      type="number"
                      step="10"
                      min="0"
                      value={formData.estimatedMonthlyBenefit}
                      onChange={(e) => setFormData({ ...formData, estimatedMonthlyBenefit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="ret-ss-age" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                      Full retirement age (FRA)
                    </label>
                    <input
                      id="ret-ss-age"
                      type="number"
                      min="62"
                      max="70"
                      value={formData.retirementAge}
                      onChange={(e) => setFormData({ ...formData, retirementAge: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ret-dc-balance" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Current account balance ($) *
                      </label>
                      <input
                        id="ret-dc-balance"
                        type="number"
                        step="10"
                        min="0"
                        required
                        value={formData.balance}
                        onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="ret-dc-target-age" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Target retirement age
                      </label>
                      <input
                        id="ret-dc-target-age"
                        type="number"
                        min="50"
                        max="75"
                        value={formData.targetRetirementAge}
                        onChange={(e) => setFormData({ ...formData, targetRetirementAge: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ret-dc-emp" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Employee monthly contribution ($)
                      </label>
                      <input
                        id="ret-dc-emp"
                        type="number"
                        step="10"
                        min="0"
                        value={formData.employeeContribution}
                        onChange={(e) => setFormData({ ...formData, employeeContribution: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="ret-dc-match" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Employer monthly match ($)
                      </label>
                      <input
                        id="ret-dc-match"
                        type="number"
                        step="10"
                        min="0"
                        value={formData.employerMatch}
                        onChange={(e) => setFormData({ ...formData, employerMatch: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="ret-notes" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                  Notes (optional)
                </label>
                <input
                  id="ret-notes"
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Vested after 5 years"
                  className="w-full px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[15px] text-[var(--ink)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--line)]">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingPlanId ? 'Update plan' : 'Save plan'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Plan ConfirmDialog */}
      <ConfirmDialog
        open={Boolean(planToDelete)}
        title="Remove retirement plan?"
        message={planToDelete ? `Are you sure you want to remove "${planToDelete.name}" from your retirement plans?` : ''}
        confirmLabel="Remove plan"
        variant="danger"
        onCancel={() => setPlanToDelete(null)}
        onConfirm={confirmDeletePlan}
      />
    </div>
  );
}
