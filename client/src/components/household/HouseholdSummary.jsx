import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Sparkles,
  Plus,
  X,
  SlidersHorizontal,
  Bell,
  Home,
  Cpu,
  Shield,
  ChevronRight,
  Lock
} from 'lucide-react';
import HouseholdQuestionnaire from './HouseholdQuestionnaire.jsx';
import {
  HOUSEHOLD_SECTIONS,
  formatHouseholdLabel,
  calculateProfileCompleteness,
  generateHouseholdReminders,
  buildSyncableBills,
  getLinkedEvVehicles,
  isOwner,
  isRenter,
  hasAnyGasOrPropaneUsage,
  needsHoaSection
} from '../../utils/householdSchema.js';
import {
  calculateHomeCostBreakdown,
  summarizeHomeCosts
} from '../../utils/householdLifestyleEngine.js';

function SourceBadge({ source }) {
  if (source === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[13px] font-semibold bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success-line)]">
        Verified
      </span>
    );
  }
  if (source === 'user_entered') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[13px] font-semibold bg-[var(--brand-soft)] text-[var(--ink)] border border-[var(--line)]">
        You entered
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[13px] font-semibold bg-[var(--surface-subtle)] text-[var(--muted)] border border-[var(--line)]">
      Estimate
    </span>
  );
}

/**
 * Uniform summary row: label on the left, value on the right (consistent weight/size),
 * optional muted detail beneath, and a single "Add" or "Edit" link (>=44px touch target).
 */
function SummaryRow({ label, value, detail = null, isEmpty = false, onAction, actionLabel }) {
  const effectiveLabel = actionLabel || (isEmpty ? 'Add' : 'Edit');
  return (
    <div className="px-4 py-3.5 bg-[var(--surface)] flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium text-[var(--muted)]">{label}</div>
        {detail && (
          <div className="text-[13px] font-medium text-[var(--muted)] mt-0.5">{detail}</div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0 max-w-[60%]">
        <div className="text-right min-w-0">
          <div
            className={`text-[15px] font-semibold truncate ${
              isEmpty ? 'text-[var(--muted)] font-medium' : 'text-[var(--ink)]'
            }`}
          >
            {isEmpty ? 'Not set' : value}
          </div>
        </div>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="min-h-[44px] px-3 py-2 rounded-[8px] text-[14px] font-semibold text-[var(--brand)] dark:text-[#7BB1FF] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2"
          >
            {effectiveLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function HouseholdSummary({
  profile,
  metrics,
  bills = [],
  onChangeProfile,
  onStartQuestionnaire,
  onSyncUtilitiesToBills,
  onShowToast
}) {
  const [activeTab, setActiveTab] = useState('property'); // 'property' | 'systems' | 'providers' | 'bills'
  const [drawerSectionId, setDrawerSectionId] = useState(null);
  const [showMissingPopover, setShowMissingPopover] = useState(false);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Close drawer / popovers on Escape key
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (drawerSectionId) setDrawerSectionId(null);
        else if (showMissingPopover) setShowMissingPopover(false);
        else if (showSectionPicker) setShowSectionPicker(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerSectionId, showMissingPopover, showSectionPicker]);

  const completeness = useMemo(() => calculateProfileCompleteness(profile), [profile]);
  const reminders = useMemo(() => generateHouseholdReminders(profile), [profile]);
  const costBreakdown = useMemo(
    () => calculateHomeCostBreakdown(profile, metrics, bills),
    [profile, metrics, bills]
  );
  const costSummary = useMemo(() => summarizeHomeCosts(costBreakdown), [costBreakdown]);
  const syncCandidates = useMemo(() => buildSyncableBills(profile, bills), [profile, bills]);
  const syncedBillsCount = syncCandidates.filter((c) => c.alreadySynced).length;
  const linkedEvs = useMemo(() => getLinkedEvVehicles(profile), [profile.vehicles]);

  const homeTypeText = formatHouseholdLabel('homeType', profile.homeType, '');
  const summaryLineParts = [
    homeTypeText,
    profile.bedrooms != null ? `${profile.bedrooms} bed` : null,
    profile.bathrooms != null ? `${profile.bathrooms} bath` : null,
    profile.sqFt ? `${Number(profile.sqFt).toLocaleString()} sq ft` : null,
    profile.ownership ? formatHouseholdLabel('ownership', profile.ownership, '') : null
  ].filter(Boolean);
  const summaryLine =
    summaryLineParts.length > 0 ? summaryLineParts.join(' · ') : 'Add your home basics to personalize estimates';

  const openSectionDrawer = (sectionId) => {
    setShowMissingPopover(false);
    setShowSectionPicker(false);
    setDrawerSectionId(sectionId);
  };

  const handleSyncToBills = () => {
    const toSync = syncCandidates.map((c) => ({
      id: c.billId,
      name: c.name,
      biller: c.biller,
      category: c.category,
      expectedAmount: Math.round(c.expectedAmount),
      dueDay: c.dueDay,
      status: 'upcoming',
      source: 'household'
    }));
    if (toSync.length === 0) {
      setSyncMessage('Add at least one monthly provider cost first.');
      setTimeout(() => setSyncMessage(''), 3500);
      return;
    }
    if (typeof onSyncUtilitiesToBills === 'function') {
      onSyncUtilitiesToBills(toSync, metrics);
    }
    const msg = `Synced ${toSync.length} confirmed household bill${toSync.length === 1 ? '' : 's'} to Bills.`;
    setSyncMessage(msg);
    onShowToast && onShowToast(msg);
    setTimeout(() => setSyncMessage(''), 4000);
  };

  const handleToggleAiShare = () => {
    const nextVal = !profile.shareSummaryWithAi;
    onChangeProfile({
      ...profile,
      shareSummaryWithAi: nextVal
    });
  };

  const ownerMode = isOwner(profile);
  const rentMode = isRenter(profile);
  const isInEscrow = profile.ownership === 'own_with_mortgage' && profile.mortgageEscrowTaxesInsurance === 'yes';

  // Grouped Home Systems formatted values
  const hvacParts = [
    profile.heating ? formatHouseholdLabel('heating', profile.heating, '') : null,
    profile.cooling ? formatHouseholdLabel('cooling', profile.cooling, '') : null,
    profile.thermostat ? `${formatHouseholdLabel('thermostat', profile.thermostat, '')}` : null
  ].filter(Boolean);

  const appliancesParts = [
    profile.cookingFuel ? formatHouseholdLabel('cookingFuel', profile.cookingFuel, '') : null,
    profile.dryer ? formatHouseholdLabel('dryer', profile.dryer, '') : null,
    profile.refrigeratorsCount ? formatHouseholdLabel('refrigerators', profile.refrigeratorsCount, '') : null
  ].filter(Boolean);

  const solarKw =
    profile.hasSolar === 'yes' && profile.solarPanelCount && profile.solarWattsPerPanel
      ? Number(((Number(profile.solarPanelCount) * Number(profile.solarWattsPerPanel)) / 1000).toFixed(2))
      : metrics?.solar?.systemSizeKw || null;

  const solarValue =
    profile.hasSolar === 'yes'
      ? [
          solarKw ? `${solarKw} kW` : null,
          profile.solarOwnership ? formatHouseholdLabel('solarOwnership', profile.solarOwnership, '') : null,
          profile.solarBillingPlan ? formatHouseholdLabel('solarBillingPlan', profile.solarBillingPlan, '') : null,
          profile.solarYearInstalled ? `Installed ${profile.solarYearInstalled}` : null
        ]
          .filter(Boolean)
          .join(' · ')
      : profile.hasSolar === 'no'
        ? 'No solar panels'
        : profile.hasSolar === 'not_sure'
          ? 'Not sure'
          : null;

  const batteryValue =
    profile.hasSolar !== 'yes'
      ? 'Not applicable'
      : profile.hasSolarBattery === 'yes'
        ? [
            profile.solarBatteryKwh ? `${profile.solarBatteryKwh} kWh` : 'Battery installed',
            profile.solarBatteryUse ? formatHouseholdLabel('batteryUse', profile.solarBatteryUse, '') : null
          ]
            .filter(Boolean)
            .join(' · ')
        : profile.hasSolarBattery === 'no'
          ? 'No battery'
          : null;

  const evSummaryValue =
    profile.evCount === '0'
      ? 'No EVs or plug-in hybrids'
      : profile.evCount === '1' || profile.evCount === '2_plus' || linkedEvs.length > 0
        ? [
            profile.evCount ? formatHouseholdLabel('evCount', profile.evCount, '') : `${linkedEvs.length} linked EV`,
            profile.evHomeCharger ? formatHouseholdLabel('homeCharger', profile.evHomeCharger, '') : null,
            profile.evChargingHours ? formatHouseholdLabel('chargingHours', profile.evChargingHours, '') : null
          ]
            .filter(Boolean)
            .join(' · ')
        : null;

  const poolValue =
    profile.poolOrSpa === 'none'
      ? 'No pool or spa'
      : profile.poolOrSpa
        ? [
            formatHouseholdLabel('poolOrSpa', profile.poolOrSpa, ''),
            profile.poolHeating && profile.poolHeating !== 'none'
              ? formatHouseholdLabel('poolHeating', profile.poolHeating, '')
              : null,
            profile.poolPumpHoursPerDay ? `${profile.poolPumpHoursPerDay} hrs/day pump` : null
          ]
            .filter(Boolean)
            .join(' · ')
        : null;

  const hasSavedBasics = Boolean(profile.address || profile.homeType || profile.ownership);

  const pickerSections = HOUSEHOLD_SECTIONS.filter((sec) => {
    if (sec.id === 'review') return false;
    if (sec.id === 'maintenance' && !ownerMode && profile.ownership) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Header Card */}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[12px] p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-serif text-[22px] sm:text-[24px] font-semibold text-[var(--ink)] tracking-tight">
                {profile.address || (profile.city && profile.state ? `${profile.city}, ${profile.state} ${profile.zip || ''}`.trim() : 'Your home profile')}
              </h2>
              {!profile.address && (
                <button
                  type="button"
                  onClick={() => openSectionDrawer('home_basics')}
                  className="min-h-[36px] px-2.5 py-1 rounded-[8px] text-[13px] font-semibold text-[var(--brand)] dark:text-[#7BB1FF] bg-[var(--surface-subtle)] border border-[var(--line)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Add address
                </button>
              )}
            </div>
            <p className="text-[15px] font-medium text-[var(--muted)]">{summaryLine}</p>
          </div>

          <div className="flex flex-col items-start lg:items-end shrink-0">
            <span className="text-[13px] font-semibold text-[var(--muted)]">
              Estimated monthly home cost
            </span>
            <span className="font-serif text-[28px] font-semibold text-[var(--ink)] tracking-tight leading-tight">
              ${Math.round(costSummary.totalMonthly).toLocaleString()}
              <span className="text-[15px] font-medium text-[var(--muted)]">/mo</span>
            </span>
          </div>
        </div>

        {/* Status Pills & Primary Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--line)]">
          <div className="flex flex-wrap items-center gap-2.5 relative">
            {/* Completeness indicator -> opens missing items */}
            <button
              type="button"
              onClick={() => {
                setShowSectionPicker(false);
                setShowMissingPopover((v) => !v);
              }}
              aria-expanded={showMissingPopover}
              className="min-h-[44px] px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[14px] font-semibold text-[var(--ink)] cursor-pointer flex items-center gap-2"
            >
              <span>
                Profile {completeness.percent}% complete, {completeness.missingItems.length}{' '}
                {completeness.missingItems.length === 1 ? 'thing' : 'things'} to add
              </span>
              <ChevronRight className={`w-4 h-4 text-[var(--muted)] transition-transform ${showMissingPopover ? 'rotate-90' : ''}`} />
            </button>

            {/* Clear Bill-sync chip ("N bills synced" or "Add your bills") */}
            <button
              type="button"
              onClick={() => setActiveTab('bills')}
              className={`min-h-[44px] px-3.5 py-2 rounded-[8px] border text-[14px] font-semibold cursor-pointer flex items-center gap-2 transition-colors ${
                syncedBillsCount > 0
                  ? 'border-[var(--success-line)] bg-[var(--success-soft)] text-[var(--success)]'
                  : 'border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--brand)] dark:text-[#7BB1FF]'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>
                {syncedBillsCount > 0
                  ? `${syncedBillsCount} ${syncedBillsCount === 1 ? 'bill' : 'bills'} synced`
                  : 'Add your bills'}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 relative">
            {!hasSavedBasics ? (
              <button
                type="button"
                onClick={() => onStartQuestionnaire('quick', 0)}
                className="min-h-[44px] px-4 py-2 rounded-[8px] bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--brand-ink)] text-[14px] font-semibold cursor-pointer flex items-center gap-2"
              >
                <span>Quick setup (~3 min)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                {profile?.questionnaireMeta?.inProgress && (
                  <button
                    type="button"
                    onClick={() =>
                      onStartQuestionnaire(
                        profile?.questionnaireMeta?.mode || 'quick',
                        profile?.questionnaireMeta?.lastScreenIndex || 0
                      )
                    }
                    className="min-h-[44px] px-4 py-2 rounded-[8px] border border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--ink)] text-[14px] font-semibold cursor-pointer"
                  >
                    Resume setup
                  </button>
                )}

                {!profile?.questionnaireMeta?.detailedCompleted && (
                  <button
                    type="button"
                    onClick={() => onStartQuestionnaire('detailed', 0)}
                    className="min-h-[44px] px-4 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--ink)] text-[14px] font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-[var(--brand)] dark:text-[#7BB1FF]" />
                    <span>Add more detail</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowMissingPopover(false);
                    setShowSectionPicker((v) => !v);
                  }}
                  aria-expanded={showSectionPicker}
                  className="min-h-[44px] px-4 py-2 rounded-[8px] bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--brand-ink)] text-[14px] font-semibold cursor-pointer flex items-center gap-2"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Update my answers</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Missing Items Panel */}
        {showMissingPopover && (
          <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold text-[var(--ink)]">
                Items to add ({completeness.missingItems.length})
              </span>
              <button
                type="button"
                onClick={() => setShowMissingPopover(false)}
                aria-label="Close missing items list"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {completeness.missingItems.length === 0 ? (
              <p className="text-[14px] font-medium text-[var(--success)] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>All essential household items are complete.</span>
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {completeness.missingItems.map((item) => (
                  <button
                    key={item.fieldKey}
                    type="button"
                    onClick={() => openSectionDrawer(item.sectionId)}
                    className="min-h-[44px] px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-left flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="text-[14px] font-semibold text-[var(--ink)] truncate">{item.label}</span>
                    <span className="text-[13px] font-semibold text-[var(--brand)] dark:text-[#7BB1FF] shrink-0">
                      Add
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section Picker ("Update my answers") */}
        {showSectionPicker && (
          <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold text-[var(--ink)]">Choose a section to update</p>
                <p className="text-[13px] font-medium text-[var(--muted)]">Opens only that section so you return right to your summary.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSectionPicker(false)}
                aria-label="Close section picker"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {pickerSections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => openSectionDrawer(sec.id)}
                  className="min-h-[44px] px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-left flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="text-[14px] font-semibold text-[var(--ink)]">{sec.title}</span>
                  <ChevronRight className="w-4 h-4 text-[var(--muted)] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary Privacy Permission Toggle (Local-only toggle) */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--line)] flex-wrap">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--muted)]">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>
              All Household data stays encrypted on your device. Share high-level summary with AI Advisor?
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(profile.shareSummaryWithAi)}
            onClick={handleToggleAiShare}
            className={`min-h-[36px] px-3 py-1 rounded-[8px] border text-[13px] font-semibold cursor-pointer transition-colors ${
              profile.shareSummaryWithAi
                ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-ink)]'
                : 'border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--ink)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            {profile.shareSummaryWithAi ? 'AI summary enabled' : 'AI summary off'}
          </button>
        </div>
      </div>

      {/* Reminders Strip */}
      {reminders.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[12px] p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--ink)]">
            <Bell className="w-4 h-4 text-[var(--warning)]" />
            <span>Upcoming reminders & system ages ({reminders.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="px-3.5 py-2.5 rounded-[8px] border border-[var(--warning-line)] bg-[var(--warning-soft)] flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-[var(--ink)] truncate">{rem.title}</div>
                  <div className="text-[13px] font-medium text-[var(--muted)]">{rem.detail}</div>
                </div>
                <button
                  type="button"
                  onClick={() => openSectionDrawer(rem.sectionId)}
                  className="min-h-[36px] px-2.5 py-1 rounded-[8px] bg-[var(--surface)] border border-[var(--line)] text-[13px] font-semibold text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer shrink-0"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs: Property | Home systems | Providers | Bills (No duplicate section heading inside panel) */}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[12px] overflow-hidden">
        <div
          role="tablist"
          aria-label="Household details"
          className="px-4 py-2.5 bg-[var(--surface-subtle)] border-b border-[var(--line)] flex items-center gap-1.5 overflow-x-auto"
        >
          {[
            { id: 'property', label: 'Property', icon: Home },
            { id: 'systems', label: 'Home systems', icon: Cpu },
            { id: 'providers', label: 'Providers', icon: Shield },
            { id: 'bills', label: 'Bills', icon: Receipt }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`hh_tab_${tab.id}`}
                aria-selected={active}
                aria-controls={`hh_panel_${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[44px] px-4 py-2 rounded-[8px] text-[14px] font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                  active
                    ? 'bg-[var(--brand)] text-[var(--brand-ink)]'
                    : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB PANEL: PROPERTY */}
        {activeTab === 'property' && (
          <div
            role="tabpanel"
            id="hh_panel_property"
            aria-labelledby="hh_tab_property"
            className="divide-y divide-[var(--line)]"
          >
            <SummaryRow
              label="Address"
              value={profile.address || [profile.city, profile.state, profile.zip].filter(Boolean).join(', ')}
              isEmpty={!profile.address && !profile.zip}
              onAction={() => openSectionDrawer('home_basics')}
            />
            <SummaryRow
              label="Ownership"
              value={formatHouseholdLabel('ownership', profile.ownership)}
              isEmpty={!profile.ownership}
              onAction={() => openSectionDrawer('home_basics')}
            />
            <SummaryRow
              label="Home type & size"
              value={
                [
                  profile.homeType && formatHouseholdLabel('homeType', profile.homeType),
                  profile.sqFt && `${Number(profile.sqFt).toLocaleString()} sq ft`,
                  profile.bedrooms != null && `${profile.bedrooms} bd`,
                  profile.bathrooms != null && `${profile.bathrooms} ba`,
                  profile.yearBuilt && `Built ${profile.yearBuilt}`
                ]
                  .filter(Boolean)
                  .join(' · ')
              }
              isEmpty={!profile.homeType && !profile.sqFt}
              onAction={() => openSectionDrawer('home_basics')}
            />
            <SummaryRow
              label="Household members"
              value={
                profile.adultsCount != null
                  ? `${profile.adultsCount} adult(s)${profile.childrenCount ? `, ${profile.childrenCount} child(ren)` : ''}`
                  : 'Not set'
              }
              detail={
                profile.workFromHomeDaysPerWeek != null
                  ? `${profile.workFromHomeDaysPerWeek} WFH days/week`
                  : null
              }
              isEmpty={profile.adultsCount == null}
              onAction={() => openSectionDrawer('household')}
            />
            <SummaryRow
              label="Medical power & pets"
              value={
                [
                  profile.medicalEquipmentPower === 'yes' ? 'Medical equipment present' : null,
                  profile.petsCount > 0 ? `${profile.petsCount} pet(s)${profile.petsType ? ` (${profile.petsType})` : ''}` : null
                ]
                  .filter(Boolean)
                  .join(' · ')
              }
              isEmpty={profile.medicalEquipmentPower == null && !profile.petsCount}
              onAction={() => openSectionDrawer('household')}
            />
            <SummaryRow
              label="Building envelope"
              value={
                [
                  profile.insulation && `Insulation: ${formatHouseholdLabel('insulation', profile.insulation)}`,
                  profile.windows && `Windows: ${formatHouseholdLabel('windows', profile.windows)}`,
                  profile.foundation && `Foundation: ${formatHouseholdLabel('foundation', profile.foundation)}`
                ]
                  .filter(Boolean)
                  .join(' · ')
              }
              isEmpty={!profile.insulation && !profile.windows && !profile.foundation}
              onAction={() => openSectionDrawer('building_details')}
            />
            {ownerMode && (
              <SummaryRow
                label="Roof, HVAC & water heater ages"
                value={
                  [
                    profile.roofAgeYears != null ? `Roof ${profile.roofAgeYears} yrs` : null,
                    profile.hvacReplacedYear ? `HVAC ${profile.hvacReplacedYear}` : null,
                    profile.waterHeaterReplacedYear ? `Water heater ${profile.waterHeaterReplacedYear}` : null
                  ]
                    .filter(Boolean)
                    .join(' · ')
                }
                isEmpty={profile.roofAgeYears == null && !profile.hvacReplacedYear && !profile.waterHeaterReplacedYear}
                onAction={() => openSectionDrawer('building_details')}
              />
            )}
            {ownerMode && (
              <SummaryRow
                label="Maintenance & planned projects"
                value={
                  [
                    profile.monthlyMaintenanceReserve != null ? `$${Number(profile.monthlyMaintenanceReserve).toLocaleString()}/mo reserve` : null,
                    profile.plannedProjectsSummary || null
                  ]
                    .filter(Boolean)
                    .join(' · ')
                }
                isEmpty={profile.monthlyMaintenanceReserve == null && !profile.plannedProjectsSummary}
                onAction={() => openSectionDrawer('maintenance')}
              />
            )}
          </div>
        )}

        {/* TAB PANEL: HOME SYSTEMS (Exact 7 Distinct Grouped Rows) */}
        {activeTab === 'systems' && (
          <div
            role="tabpanel"
            id="hh_panel_systems"
            aria-labelledby="hh_tab_systems"
            className="divide-y divide-[var(--line)]"
          >
            <SummaryRow
              label="Heating and cooling"
              value={hvacParts.join(' · ')}
              isEmpty={hvacParts.length === 0}
              onAction={() => openSectionDrawer('heating_cooling')}
            />
            <SummaryRow
              label="Water heater"
              value={formatHouseholdLabel('waterHeater', profile.waterHeater)}
              isEmpty={!profile.waterHeater}
              onAction={() => openSectionDrawer('heating_cooling')}
            />
            <SummaryRow
              label="Cooking and laundry"
              value={appliancesParts.join(' · ')}
              detail={
                Array.isArray(profile.otherLargeLoads) && profile.otherLargeLoads.length > 0 && !profile.otherLargeLoads.includes('none')
                  ? `Extra loads: ${formatHouseholdLabel('otherLargeLoads', profile.otherLargeLoads)}`
                  : null
              }
              isEmpty={appliancesParts.length === 0}
              onAction={() => openSectionDrawer('appliances')}
            />
            <SummaryRow
              label="EV charging"
              value={evSummaryValue}
              detail={
                linkedEvs.length > 0
                  ? `Linked vehicles: ${linkedEvs.map((v) => v.name || `${v.make} ${v.model}`).join(', ')}`
                  : null
              }
              isEmpty={!evSummaryValue}
              onAction={() => openSectionDrawer('ev_charging')}
            />
            <SummaryRow
              label="Solar"
              value={solarValue}
              detail={
                profile.hasSolar === 'yes' && metrics?.solar?.monthlyKwhEstimate > 0
                  ? `Est. ${metrics.solar.monthlyKwhEstimate.toLocaleString()} kWh/mo generation`
                  : null
              }
              isEmpty={!solarValue}
              onAction={() => openSectionDrawer('solar_battery')}
            />
            <SummaryRow
              label="Battery"
              value={batteryValue}
              isEmpty={!batteryValue}
              onAction={() => openSectionDrawer('solar_battery')}
            />
            <SummaryRow
              label="Pool or spa"
              value={poolValue}
              isEmpty={!poolValue}
              onAction={() => openSectionDrawer('pool_spa')}
            />
          </div>
        )}

        {/* TAB PANEL: PROVIDERS */}
        {activeTab === 'providers' && (
          <div
            role="tabpanel"
            id="hh_panel_providers"
            aria-labelledby="hh_tab_providers"
            className="divide-y divide-[var(--line)]"
          >
            <SummaryRow
              label="Electricity"
              value={
                profile.noElectricService
                  ? 'I don’t have electric service'
                  : [profile.electricUtility, profile.electricRatePlan].filter(Boolean).join(' · ')
              }
              detail={
                !profile.noElectricService && profile.electricLowIncomeDiscount === 'yes'
                  ? `Discount enrolled (${metrics?.localUtility?.discountProgram || 'Utility discount'})`
                  : null
              }
              isEmpty={!profile.noElectricService && !profile.electricUtility}
              onAction={() => openSectionDrawer('utilities')}
            />

            {(hasAnyGasOrPropaneUsage(profile) || profile.gasOrPropaneProvider) && (
              <SummaryRow
                label="Gas or propane"
                value={
                  profile.noGasOrPropane
                    ? 'I don’t have gas or propane'
                    : profile.gasOrPropaneProvider
                }
                isEmpty={!profile.noGasOrPropane && !profile.gasOrPropaneProvider}
                onAction={() => openSectionDrawer('utilities')}
              />
            )}

            <SummaryRow
              label="Water & sewer"
              value={profile.noWaterSewer ? 'I don’t have municipal water' : profile.waterProvider}
              isEmpty={!profile.noWaterSewer && !profile.waterProvider}
              onAction={() => openSectionDrawer('utilities')}
            />

            <SummaryRow
              label="Trash & recycling"
              value={
                profile.noTrashRecycling
                  ? 'I don’t have trash service'
                  : [profile.trashProvider, profile.trashCartSize && formatHouseholdLabel('cartSize', profile.trashCartSize)].filter(Boolean).join(' · ')
              }
              isEmpty={!profile.noTrashRecycling && !profile.trashProvider}
              onAction={() => openSectionDrawer('utilities')}
            />

            <SummaryRow
              label="Internet"
              value={
                profile.noInternet
                  ? 'I don’t have home internet'
                  : [
                      profile.internetProvider,
                      profile.internetPlan,
                      profile.internetMonthlyCost != null && `$${profile.internetMonthlyCost}/mo`
                    ]
                      .filter(Boolean)
                      .join(' · ')
              }
              isEmpty={!profile.noInternet && !profile.internetProvider}
              onAction={() => openSectionDrawer('internet_phone')}
            />

            <SummaryRow
              label="Mobile phone"
              value={
                profile.noMobilePhone
                  ? 'I don’t have mobile service'
                  : [
                      profile.mobileCarrier,
                      profile.mobileLines && `${profile.mobileLines} line(s)`,
                      profile.mobileMonthlyCost != null && `$${profile.mobileMonthlyCost}/mo`
                    ]
                      .filter(Boolean)
                      .join(' · ')
              }
              isEmpty={!profile.noMobilePhone && !profile.mobileCarrier}
              onAction={() => openSectionDrawer('internet_phone')}
            />

            <SummaryRow
              label={rentMode ? 'Monthly rent' : 'Mortgage & taxes'}
              value={
                rentMode
                  ? profile.monthlyRent != null
                    ? `$${Number(profile.monthlyRent).toLocaleString()}/mo`
                    : ''
                  : profile.mortgageMonthlyPI != null
                    ? `$${Number(profile.mortgageMonthlyPI).toLocaleString()}/mo${isInEscrow ? ' (escrow includes tax & insurance)' : ''}`
                    : ''
              }
              isEmpty={rentMode ? profile.monthlyRent == null : profile.mortgageMonthlyPI == null}
              onAction={() => openSectionDrawer('housing_costs')}
            />

            {needsHoaSection(profile) && (
              <SummaryRow
                label="HOA dues"
                value={
                  profile.hoaDues != null
                    ? `$${Number(profile.hoaDues).toLocaleString()} (${formatHouseholdLabel('hoaFrequency', profile.hoaFrequency || 'monthly')})`
                    : ''
                }
                isEmpty={profile.hoaDues == null}
                onAction={() => openSectionDrawer('housing_costs')}
              />
            )}

            <SummaryRow
              label={rentMode ? 'Renters insurance' : 'Homeowners insurance'}
              value={[profile.homeInsuranceCarrier, profile.homeInsurancePremium != null && `$${profile.homeInsurancePremium}`].filter(Boolean).join(' · ')}
              isEmpty={!profile.homeInsuranceCarrier && profile.homeInsurancePremium == null}
              onAction={() => openSectionDrawer('insurance')}
            />

            <SummaryRow
              label="Warranty & security"
              value={[profile.homeWarrantyProvider, profile.homeSecurityProvider].filter(Boolean).join(' · ')}
              isEmpty={!profile.homeWarrantyProvider && !profile.homeSecurityProvider}
              onAction={() => openSectionDrawer('insurance')}
            />

            <SummaryRow
              label="Outdoor & home services"
              value={
                (profile.outdoorServices || []).length > 0
                  ? profile.outdoorServices.map((s) => s.provider || s.typeLabel).join(', ')
                  : ''
              }
              isEmpty={(profile.outdoorServices || []).length === 0}
              onAction={() => openSectionDrawer('outdoor_services')}
            />
          </div>
        )}

        {/* TAB PANEL: BILLS */}
        {activeTab === 'bills' && (
          <div
            role="tabpanel"
            id="hh_panel_bills"
            aria-labelledby="hh_tab_bills"
            className="flex flex-col"
          >
            {/* Source summary bar + One-click Sync */}
            <div className="p-4 sm:p-5 bg-[var(--surface-subtle)] border-b border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 text-[13px] font-semibold">
                <span className="text-[var(--ink)]">
                  Verified: ${Math.round(costSummary.verified).toLocaleString()}
                </span>
                <span className="text-[var(--muted)]">·</span>
                <span className="text-[var(--ink)]">
                  You entered: ${Math.round(costSummary.userEntered).toLocaleString()}
                </span>
                <span className="text-[var(--muted)]">·</span>
                <span className="text-[var(--ink)]">
                  Estimate: ${Math.round(costSummary.estimated).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {syncMessage && (
                  <span className="text-[13px] font-semibold text-[var(--success)] flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{syncMessage}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSyncToBills}
                  className="min-h-[44px] px-4 py-2 rounded-[8px] bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--brand-ink)] text-[14px] font-semibold cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Sync {syncCandidates.length > 0 ? `${syncCandidates.length} ` : ''}confirmed to Bills</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-[var(--line)]">
              {costBreakdown.map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-3.5 bg-[var(--surface)] flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-[var(--ink)]">{item.label}</div>
                    <div className="text-[13px] font-medium text-[var(--muted)] truncate">
                      {item.provider}
                      {item.detail ? ` · ${item.detail}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <SourceBadge source={item.source} />
                    <div className="text-[15px] font-semibold text-[var(--ink)] min-w-[78px] text-right">
                      {item.excluded ? 'Included' : `$${Math.round(item.amount).toLocaleString()}/mo`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Responsive Side Drawer (Desktop) / Bottom Sheet (Mobile) for single-section edit */}
      {drawerSectionId && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end bg-black/50"
          onClick={() => setDrawerSectionId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Edit ${HOUSEHOLD_SECTIONS.find((s) => s.id === drawerSectionId)?.title || 'section'}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-2xl max-h-[90vh] md:max-h-full overflow-y-auto bg-[var(--background)] rounded-t-[16px] md:rounded-t-none md:rounded-l-[12px] border-t md:border-t-0 md:border-l border-[var(--line)] shadow-2xl p-4 sm:p-6"
          >
            <HouseholdQuestionnaire
              profile={profile}
              onChangeProfile={onChangeProfile}
              singleSectionId={drawerSectionId}
              onDoneSingleSection={() => setDrawerSectionId(null)}
              onExitToSummary={() => setDrawerSectionId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
