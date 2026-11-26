import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  Plus,
  Car,
  Sparkles,
  Sun,
  Info,
  Link2,
  Loader2
} from 'lucide-react';
import {
  HOUSEHOLD_LABELS,
  HOUSEHOLD_SECTIONS,
  getVisibleSections,
  getVisibleScreens,
  validateScreen,
  calculateProfileCompleteness,
  getLinkedEvVehicles,
  getLocalUtilitySuggestions,
  isOwner,
  isRenter,
  isHouseOrTownhome,
  isHouseOnly,
  hasAnyGasOrPropaneUsage,
  needsHoaSection,
  parseAddressComponents,
  formatHouseholdLabel
} from '../../utils/householdSchema.js';

// ---------- REUSABLE ACCESSIBLE INPUT PRIMITIVES ----------

function ConfirmBadge({ show, onConfirm }) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onConfirm}
      title="Pre-filled from your address or saved profile. Click to confirm this value."
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] text-[11.5px] leading-tight font-semibold whitespace-nowrap shrink-0 bg-[var(--warning-soft)] text-[var(--warning)] border border-[var(--warning-line)] hover:opacity-90 cursor-pointer"
    >
      <span>Please confirm</span>
    </button>
  );
}

function FieldLabel({ htmlFor, label, essential, helpText, isPrefilled, onConfirmPrefill, isRadiogroupLabel = false, id }) {
  const Tag = isRadiogroupLabel ? 'div' : 'label';
  return (
    <div className="mb-2 flex flex-col gap-0.5">
      <div className="min-h-[24px] flex items-center justify-between gap-1.5 flex-wrap">
        <Tag
          id={id}
          {...(!isRadiogroupLabel && htmlFor ? { htmlFor } : {})}
          className="text-[14px] sm:text-[15px] font-semibold text-[var(--ink)] flex items-center gap-1.5 flex-wrap"
        >
          <span>{label}</span>
          {essential && (
            <span className="text-[12px] font-semibold text-[var(--muted)] whitespace-nowrap">(Essential)</span>
          )}
        </Tag>
        <ConfirmBadge show={isPrefilled} onConfirm={onConfirmPrefill} />
      </div>
      {helpText && (
        <p className="text-[13px] font-medium text-[var(--muted)] leading-snug">{helpText}</p>
      )}
    </div>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className="mt-1.5 text-[13px] font-semibold text-[var(--danger)] flex items-center gap-1.5"
    >
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/**
 * Accessible Option Card RadioGroup with arrow-key navigation,
 * 2px brand border + 12% brand tint + checkmark when selected,
 * visible focus rings, >=44px touch targets, and visually secondary "Not sure".
 */
function OptionRadioGroup({
  fieldId,
  label,
  helpText,
  value,
  options = [],
  onChange,
  essential = false,
  columns = 2,
  includeNotSure = true,
  isPrefilled = false,
  onConfirmPrefill,
  error = null
}) {
  const labelId = `${fieldId}_rg_label`;
  const btnRefs = useRef([]);

  const normalizedOptions = useMemo(() => {
    const base = [...options];
    if (includeNotSure && !base.some((o) => o.value === 'not_sure')) {
      base.push({ value: 'not_sure', label: 'Not sure', secondary: true });
    }
    return base;
  }, [options, includeNotSure]);

  const activeIdx = normalizedOptions.findIndex((o) => o.value === value);

  const handleKeyDown = (e, idx) => {
    let nextIdx = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = (idx + 1) % normalizedOptions.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = (idx - 1 + normalizedOptions.length) % normalizedOptions.length;
    }
    if (nextIdx >= 0) {
      const targetOpt = normalizedOptions[nextIdx];
      onChange(targetOpt.value);
      btnRefs.current[nextIdx]?.focus();
    }
  };

  const gridClass =
    columns === 1
      ? 'grid grid-cols-1 gap-2.5'
      : columns === 3
        ? 'grid grid-cols-1 sm:grid-cols-3 gap-2.5'
        : 'grid grid-cols-1 sm:grid-cols-2 gap-2.5';

  return (
    <div className="flex flex-col">
      <FieldLabel
        id={labelId}
        label={label}
        essential={essential}
        helpText={helpText}
        isPrefilled={isPrefilled}
        onConfirmPrefill={onConfirmPrefill}
        isRadiogroupLabel={true}
      />
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className={gridClass}
      >
        {normalizedOptions.map((opt, idx) => {
          const isSelected = value === opt.value;
          const isSecondary = opt.secondary || opt.value === 'not_sure';
          const focusable = activeIdx === -1 ? idx === 0 : isSelected;

          return (
            <button
              key={opt.value}
              ref={(el) => {
                btnRefs.current[idx] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={focusable ? 0 : -1}
              onClick={() => onChange(isSelected ? null : opt.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`min-h-[44px] px-3.5 py-2.5 rounded-[8px] text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 ${
                isSecondary ? 'bg-[var(--surface-subtle)]' : 'bg-[var(--surface)]'
              } ${
                isSelected
                  ? 'border-2 border-[var(--brand)] dark:border-[#60A5FA] shadow-[0_0_0_1px_rgba(59,118,204,0.35)] dark:shadow-[0_0_0_1px_rgba(96,165,250,0.45)] text-[var(--ink)] font-semibold'
                  : isSecondary
                    ? 'border border-dashed border-[var(--line)] hover:bg-[var(--surface-hover)] text-[var(--ink)] font-medium'
                    : 'border border-[var(--line)] hover:bg-[var(--surface-hover)] text-[var(--ink)] font-medium'
              }`}
            >
              <div className="flex flex-col min-w-0">
                <span className="text-[15px] leading-snug text-[var(--ink)]">{opt.label}</span>
                {opt.hint && (
                  <span className="text-[13px] text-[var(--muted)] font-medium leading-snug mt-0.5">
                    {opt.hint}
                  </span>
                )}
              </div>
              <span
                className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center bg-transparent ${
                  isSelected
                    ? 'border-2 border-[var(--brand)] dark:border-[#60A5FA] text-[var(--brand)] dark:text-[#60A5FA]'
                    : 'border border-[var(--line)]'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
              </span>
            </button>
          );
        })}
      </div>
      <FieldError id={`${fieldId}_err`} message={error} />
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder = '',
  helpText = '',
  essential = false,
  isPrefilled = false,
  onConfirmPrefill,
  error = null,
  type = 'text',
  inputMode,
  prefix = null,
  suffix = null,
  min,
  max,
  step,
  suggestions = []
}) {
  const errId = `${id}_err`;
  const datalistId = suggestions.length > 0 ? `${id}_suggestions` : undefined;
  return (
    <div className="flex flex-col">
      <FieldLabel
        htmlFor={id}
        label={label}
        essential={essential}
        helpText={helpText}
        isPrefilled={isPrefilled}
        onConfirmPrefill={onConfirmPrefill}
      />
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3.5 text-[15px] font-semibold text-[var(--muted)] pointer-events-none select-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          list={datalistId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errId : undefined}
          className={`w-full min-h-[44px] rounded-[8px] border bg-[var(--surface)] text-[15px] font-medium text-[var(--ink)] placeholder:text-[var(--muted)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 ${
            error ? 'border-[var(--danger)]' : 'border-[var(--line)]'
          } ${prefix ? 'pl-8' : 'px-3.5'} ${suffix ? 'pr-16' : 'pr-3.5'} py-2.5`}
        />
        {suffix && (
          <span className="absolute right-3.5 text-[13px] font-semibold text-[var(--muted)] pointer-events-none select-none">
            {suffix}
          </span>
        )}
      </div>
      {datalistId && (
        <datalist id={datalistId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      <FieldError id={errId} message={error} />
    </div>
  );
}

function NumberField({ value, onChange, allowDecimal = false, ...rest }) {
  return (
    <TextField
      type="number"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={value === null || value === undefined ? '' : String(value)}
      onChange={(raw) => {
        if (raw === '' || raw === null || raw === undefined) {
          onChange(null);
          return;
        }
        const n = Number(raw);
        onChange(Number.isNaN(n) ? raw : n);
      }}
      step={allowDecimal ? 'any' : '1'}
      {...rest}
    />
  );
}

function SelectField({ id, label, value, options = [], onChange, essential = false, helpText = '', includeNotSure = true, error = null }) {
  const errId = `${id}_err`;
  return (
    <div className="flex flex-col">
      <FieldLabel htmlFor={id} label={label} essential={essential} helpText={helpText} />
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errId : undefined}
        className={`w-full min-h-[44px] rounded-[8px] border bg-[var(--surface)] text-[15px] font-medium text-[var(--ink)] px-3.5 py-2.5 focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 ${
          error ? 'border-[var(--danger)]' : 'border-[var(--line)]'
        }`}
      >
        <option value="">Leave blank / choose…</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {includeNotSure && !options.some((o) => o.value === 'not_sure') && (
          <option value="not_sure">Not sure</option>
        )}
      </select>
      <FieldError id={errId} message={error} />
    </div>
  );
}

function MultiSelectChips({ fieldId, label, helpText, values = [], options = [], onChange }) {
  const current = Array.isArray(values) ? values : [];
  const toggle = (val) => {
    if (val === 'none') {
      onChange(current.includes('none') ? null : ['none']);
      return;
    }
    const withoutNone = current.filter((v) => v !== 'none');
    if (withoutNone.includes(val)) {
      const next = withoutNone.filter((v) => v !== val);
      onChange(next.length > 0 ? next : null);
    } else {
      onChange([...withoutNone, val]);
    }
  };

  return (
    <div className="flex flex-col">
      <FieldLabel id={`${fieldId}_lbl`} label={label} helpText={helpText} isRadiogroupLabel={true} />
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = current.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(opt.value)}
              className={`min-h-[44px] px-3.5 py-2 rounded-[8px] text-[15px] bg-[var(--surface)] flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 ${
                active
                  ? 'border-2 border-[var(--brand)] dark:border-[#60A5FA] shadow-[0_0_0_1px_rgba(59,118,204,0.35)] dark:shadow-[0_0_0_1px_rgba(96,165,250,0.45)] text-[var(--ink)] font-semibold'
                  : 'border border-[var(--line)] hover:bg-[var(--surface-hover)] text-[var(--ink)] font-medium'
              }`}
            >
              {active && <Check className="w-4 h-4 text-[var(--brand)] dark:text-[#60A5FA] shrink-0" />}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NoServiceToggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`min-h-[44px] px-3.5 py-2 rounded-[8px] text-[14px] font-semibold bg-[var(--surface-subtle)] flex items-center gap-2 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 ${
        checked
          ? 'border-2 border-[var(--brand)] dark:border-[#60A5FA] shadow-[0_0_0_1px_rgba(59,118,204,0.35)] dark:shadow-[0_0_0_1px_rgba(96,165,250,0.45)] text-[var(--ink)]'
          : 'border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--surface-hover)]'
      }`}
    >
      <span
        className={`w-4 h-4 rounded-[4px] flex items-center justify-center bg-transparent ${
          checked
            ? 'border-2 border-[var(--brand)] dark:border-[#60A5FA] text-[var(--brand)] dark:text-[#60A5FA]'
            : 'border border-[var(--line)] bg-[var(--surface)]'
        }`}
      >
        {checked && <Check className="w-3 h-3 stroke-[3]" />}
      </span>
      <span>{label}</span>
    </button>
  );
}

const mapOpts = (group) =>
  Object.entries(HOUSEHOLD_LABELS[group] || {})
    .filter(([k]) => k !== 'not_sure')
    .map(([value, label]) => ({ value, label }));

const YES_NO_OPTS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' }
];

// ---------- OUTDOOR SERVICE CHIPS EDITOR ----------

const OUTDOOR_CHIP_TYPES = [
  'Lawn care',
  'Pest control',
  'Cleaning',
  'Pool service',
  'Water softener',
  'Bottled water'
];

function OutdoorServicesEditor({ services = [], onChange }) {
  const [customType, setCustomType] = useState('');
  const list = Array.isArray(services) ? services : [];

  const hasType = (t) => list.some((s) => s.typeLabel?.toLowerCase() === t.toLowerCase());

  const toggleChip = (typeLabel) => {
    if (hasType(typeLabel)) {
      onChange(list.filter((s) => s.typeLabel?.toLowerCase() !== typeLabel.toLowerCase()));
    } else {
      onChange([
        ...list,
        {
          id: `svc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          typeLabel,
          provider: '',
          cost: null,
          frequency: 'monthly'
        }
      ]);
    }
  };

  const addCustom = () => {
    const clean = customType.trim();
    if (!clean || hasType(clean)) return;
    onChange([
      ...list,
      {
        id: `svc_${Date.now()}`,
        typeLabel: clean,
        provider: '',
        cost: null,
        frequency: 'monthly'
      }
    ]);
    setCustomType('');
  };

  const updateService = (id, patch) => {
    onChange(list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <FieldLabel
          label="Recurring home and outdoor services (optional)"
          helpText="Tap any services you pay for regularly to enter provider and cost."
          isRadiogroupLabel={true}
        />
        <div className="flex flex-wrap gap-2">
          {OUTDOOR_CHIP_TYPES.map((chip) => {
            const active = hasType(chip);
            return (
              <button
                key={chip}
                type="button"
                aria-pressed={active}
                onClick={() => toggleChip(chip)}
                className={`min-h-[44px] px-3.5 py-2 rounded-[8px] text-[15px] bg-[var(--surface)] flex items-center gap-2 cursor-pointer transition-colors ${
                  active
                    ? 'border-2 border-[var(--brand)] dark:border-[#60A5FA] shadow-[0_0_0_1px_rgba(59,118,204,0.35)] dark:shadow-[0_0_0_1px_rgba(96,165,250,0.45)] font-semibold text-[var(--ink)]'
                    : 'border border-[var(--line)] hover:bg-[var(--surface-hover)] text-[var(--ink)] font-medium'
                }`}
              >
                {active ? <Check className="w-4 h-4 text-[var(--brand)] dark:text-[#60A5FA]" /> : <Plus className="w-4 h-4 text-[var(--muted)]" />}
                <span>{chip}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom service input */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={customType}
          onChange={(e) => setCustomType(e.target.value)}
          placeholder="Add another service (e.g., Tree trimming, Snow removal)"
          aria-label="Custom service name"
          className="flex-1 min-h-[44px] rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-[15px] text-[var(--ink)] placeholder:text-[var(--muted)]"
        />
        <button
          type="button"
          onClick={addCustom}
          className="min-h-[44px] px-4 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)] font-semibold text-[15px] cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add service</span>
        </button>
      </div>

      {list.length > 0 && (
        <div className="flex flex-col gap-3">
          {list.map((svc) => (
            <div
              key={svc.id}
              className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-semibold text-[var(--ink)]">{svc.typeLabel}</span>
                <button
                  type="button"
                  onClick={() => onChange(list.filter((s) => s.id !== svc.id))}
                  aria-label={`Remove ${svc.typeLabel}`}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[8px] text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--surface)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TextField
                  id={`svc_prov_${svc.id}`}
                  label="Provider name"
                  value={svc.provider}
                  onChange={(v) => updateService(svc.id, { provider: v })}
                  placeholder="Company or person"
                />
                <NumberField
                  id={`svc_cost_${svc.id}`}
                  label="Cost"
                  prefix="$"
                  allowDecimal={true}
                  value={svc.cost}
                  onChange={(v) => updateService(svc.id, { cost: v })}
                  placeholder="0"
                />
                <SelectField
                  id={`svc_freq_${svc.id}`}
                  label="Billing frequency"
                  value={svc.frequency || 'monthly'}
                  onChange={(v) => updateService(svc.id, { frequency: v || 'monthly' })}
                  includeNotSure={false}
                  options={[
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'every_2_months', label: 'Every 2 months' },
                    { value: 'quarterly', label: 'Quarterly' },
                    { value: 'annual', label: 'Yearly' }
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- MAIN QUESTIONNAIRE COMPONENT ----------

export default function HouseholdQuestionnaire({
  profile,
  onChangeProfile,
  onExitToSummary,
  singleSectionId = null,
  onDoneSingleSection = null
}) {
  const initialMode = singleSectionId
    ? 'detailed'
    : profile?.questionnaireMeta?.mode || 'quick';
  const [mode, setMode] = useState(initialMode);
  const [errors, setErrors] = useState({});
  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false);
  const [zillowLinkInput, setZillowLinkInput] = useState(profile?.zillowUrl || '');
  const [zillowLoading, setZillowLoading] = useState(false);
  const [zillowFeedback, setZillowFeedback] = useState(null); // { type: 'success' | 'error', text: string }

  useEffect(() => {
    if (profile?.zillowUrl && !zillowLinkInput) {
      setZillowLinkInput(profile.zillowUrl);
    }
  }, [profile?.zillowUrl]);

  const visibleSections = useMemo(
    () => (singleSectionId ? [] : getVisibleSections(profile, mode)),
    [profile, mode, singleSectionId]
  );

  const visibleScreens = useMemo(
    () => getVisibleScreens(profile, mode, singleSectionId),
    [profile, mode, singleSectionId]
  );

  const [screenIndex, setScreenIndex] = useState(() => {
    if (singleSectionId) return 0;
    const savedIdx = Number(profile?.questionnaireMeta?.lastScreenIndex) || 0;
    const screens = getVisibleScreens(profile, initialMode, null);
    return Math.min(Math.max(0, savedIdx), Math.max(0, screens.length - 1));
  });

  const safeIndex = Math.min(screenIndex, Math.max(0, visibleScreens.length - 1));
  const currentScreen = visibleScreens[safeIndex] || visibleScreens[0];

  const titleRef = useRef(null);
  const savedTimerRef = useRef(null);

  // Move keyboard & screen-reader focus to the screen title on step change
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, [currentScreen?.id]);

  // Helper to commit field updates + autosave indicator + clear prefilled badge for edited fields
  const commitProfileUpdate = (patch, metaPatch = {}) => {
    const existingPrefilled = { ...(profile?.questionnaireMeta?.prefilledFields || {}) };
    Object.keys(patch).forEach((k) => {
      delete existingPrefilled[k];
    });

    const next = {
      ...profile,
      ...patch,
      questionnaireMeta: {
        ...(profile?.questionnaireMeta || {}),
        mode: singleSectionId ? (profile?.questionnaireMeta?.mode || 'quick') : mode,
        inProgress: !singleSectionId,
        lastSectionId: currentScreen?.sectionId || 'home_basics',
        lastScreenIndex: safeIndex,
        lastSavedAt: Date.now(),
        prefilledFields: existingPrefilled,
        ...metaPatch
      }
    };

    onChangeProfile(next);

    // Clear inline error for edited fields
    if (Object.keys(errors).length > 0) {
      const nextErr = { ...errors };
      Object.keys(patch).forEach((k) => delete nextErr[k]);
      setErrors(nextErr);
    }

    setSavedNoticeVisible(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedNoticeVisible(false), 2000);
  };

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const updateField = (key, value) => {
    const patch = { [key]: value };
    // Auto-extract city/state/zip when typing full address if those fields are blank
    if (key === 'address' && value) {
      const parsed = parseAddressComponents(value);
      if (parsed.city && !profile.city) patch.city = parsed.city;
      if (parsed.state && !profile.state) patch.state = parsed.state;
      if (parsed.zip && !profile.zip) patch.zip = parsed.zip;
    }
    commitProfileUpdate(patch);
  };

  const confirmPrefill = (key) => {
    const existingPrefilled = { ...(profile?.questionnaireMeta?.prefilledFields || {}) };
    delete existingPrefilled[key];
    onChangeProfile({
      ...profile,
      questionnaireMeta: {
        ...(profile?.questionnaireMeta || {}),
        prefilledFields: existingPrefilled
      }
    });
  };

  const isPrefilled = (key) => Boolean(profile?.questionnaireMeta?.prefilledFields?.[key]);

  const handlePullFromZillow = async () => {
    const rawUrl = (zillowLinkInput || '').trim();
    if (!rawUrl) {
      setZillowFeedback({ type: 'error', text: 'Paste a Zillow listing link first.' });
      return;
    }
    if (!/zillow\.com/i.test(rawUrl) && !/^https?:\/\//i.test(rawUrl)) {
      setZillowFeedback({
        type: 'error',
        text: 'Please enter a valid Zillow URL (e.g. https://www.zillow.com/homedetails/...).'
      });
      return;
    }

    setZillowLoading(true);
    setZillowFeedback(null);
    try {
      const res = await fetch('/api/household/zillow-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Could not pull home details from that Zillow link.');
      }

      const patch = {
        zillowUrl: rawUrl,
        zillowImportedAt: data.zillowImportedAt || new Date().toISOString()
      };
      const pulledPrefillMap = { ...(profile?.questionnaireMeta?.prefilledFields || {}) };
      const pulledSummary = [];

      const applyPulled = (key, val, label) => {
        if (val !== null && val !== undefined && val !== '') {
          patch[key] = val;
          pulledPrefillMap[key] = true;
          if (label) pulledSummary.push(label);
        }
      };

      applyPulled('address', data.address, data.address ? 'address' : null);
      if (data.street) patch.street = data.street;
      applyPulled('city', data.city, null);
      applyPulled('state', data.state, null);
      applyPulled('zip', data.zip, data.zip ? `ZIP ${data.zip}` : null);
      applyPulled('homeType', data.homeType, data.homeType ? formatHouseholdLabel('homeType', data.homeType) : null);
      applyPulled('bedrooms', data.bedrooms, data.bedrooms != null ? `${data.bedrooms} bed` : null);
      applyPulled('bathrooms', data.bathrooms, data.bathrooms != null ? `${data.bathrooms} bath` : null);
      applyPulled('sqFt', data.sqFt, data.sqFt ? `${Number(data.sqFt).toLocaleString()} sq ft` : null);
      applyPulled('yearBuilt', data.yearBuilt, data.yearBuilt ? `built ${data.yearBuilt}` : null);
      applyPulled('stories', data.stories, null);
      applyPulled('lotSize', data.lotSize, data.lotSize ? `lot ${data.lotSize}` : null);
      applyPulled('garage', data.garage, null);
      applyPulled('garageAttached', data.garageAttached, null);
      if (data.estimatedValue) patch.estimatedValue = data.estimatedValue;

      commitProfileUpdate(patch, { prefilledFields: pulledPrefillMap });

      if (pulledSummary.length > 0) {
        setZillowFeedback({
          type: 'success',
          text: `Pulled ${pulledSummary.join(', ')} from Zillow. Review and confirm the pre-filled fields below.`
        });
      } else {
        setZillowFeedback({
          type: 'error',
          text: 'Saved the Zillow link, but could not automatically extract specs from this listing. You can enter them below.'
        });
      }
    } catch (err) {
      setZillowFeedback({
        type: 'error',
        text: err?.message || 'Failed to pull home information from Zillow.'
      });
    } finally {
      setZillowLoading(false);
    }
  };

  const localUtilities = useMemo(
    () => getLocalUtilitySuggestions(profile),
    [profile.zip, profile.state, profile.electricUtility]
  );

  // Live validation of current screen (never blocks Continue for blank optional fields)
  const liveScreenErrors = useMemo(
    () => (currentScreen ? validateScreen(currentScreen.id, profile) : {}),
    [currentScreen, profile]
  );
  const mergedErrors = { ...liveScreenErrors, ...errors };
  const hasValidationErrors = Object.keys(mergedErrors).length > 0;

  const isLastScreen = safeIndex >= visibleScreens.length - 1;
  const activeSectionIdx = visibleSections.findIndex((s) => s.id === currentScreen?.sectionId);
  const completedSections = new Set(profile?.questionnaireMeta?.completedSections || []);

  const handleNext = () => {
    const validationErrs = validateScreen(currentScreen.id, profile);
    if (Object.keys(validationErrs).length > 0) {
      setErrors(validationErrs);
      return;
    }

    const nextCompleted = Array.from(
      new Set([...(profile?.questionnaireMeta?.completedSections || []), currentScreen.sectionId])
    );

    if (singleSectionId) {
      commitProfileUpdate({}, { completedSections: nextCompleted, inProgress: false });
      onDoneSingleSection && onDoneSingleSection();
      return;
    }

    if (isLastScreen) {
      commitProfileUpdate(
        {},
        {
          completedSections: nextCompleted,
          inProgress: false,
          quickCompleted: true,
          detailedCompleted: mode === 'detailed' ? true : Boolean(profile?.questionnaireMeta?.detailedCompleted)
        }
      );
      onExitToSummary && onExitToSummary();
      return;
    }

    const nextIdx = safeIndex + 1;
    const nextScreen = visibleScreens[nextIdx];
    commitProfileUpdate(
      {},
      {
        completedSections: nextCompleted,
        lastScreenIndex: nextIdx,
        lastSectionId: nextScreen?.sectionId || currentScreen.sectionId,
        inProgress: true
      }
    );
    setScreenIndex(nextIdx);
    setErrors({});
  };

  const handlePrevious = () => {
    if (safeIndex <= 0) return;
    const prevIdx = safeIndex - 1;
    const prevScreen = visibleScreens[prevIdx];
    commitProfileUpdate(
      {},
      {
        lastScreenIndex: prevIdx,
        lastSectionId: prevScreen?.sectionId || currentScreen.sectionId,
        inProgress: true
      }
    );
    setScreenIndex(prevIdx);
    setErrors({});
  };

  const handleJumpToSection = (sectionId) => {
    const targetIdx = visibleScreens.findIndex((s) => s.sectionId === sectionId);
    if (targetIdx < 0) return;
    commitProfileUpdate({}, { lastScreenIndex: targetIdx, lastSectionId: sectionId, inProgress: true });
    setScreenIndex(targetIdx);
    setErrors({});
  };

  const handleSaveAndExit = () => {
    if (singleSectionId) {
      onDoneSingleSection && onDoneSingleSection();
      return;
    }
    commitProfileUpdate({}, { inProgress: false, lastScreenIndex: safeIndex, lastSectionId: currentScreen?.sectionId });
    onExitToSummary && onExitToSummary();
  };

  const handleSwitchMode = (nextMode) => {
    setMode(nextMode);
    const nextScreens = getVisibleScreens(profile, nextMode, null);
    const matchingIdx = nextScreens.findIndex((s) => s.id === currentScreen?.id);
    const targetIdx = matchingIdx >= 0 ? matchingIdx : Math.min(safeIndex, Math.max(0, nextScreens.length - 1));
    setScreenIndex(targetIdx);
    commitProfileUpdate(
      {},
      {
        mode: nextMode,
        lastScreenIndex: targetIdx,
        lastSectionId: nextScreens[targetIdx]?.sectionId || 'home_basics',
        inProgress: true
      }
    );
  };

  // Screen-specific calculations
  const linkedEvs = useMemo(() => getLinkedEvVehicles(profile), [profile.vehicles]);
  const solarKwLive =
    profile.solarPanelCount && profile.solarWattsPerPanel
      ? Number(((Number(profile.solarPanelCount) * Number(profile.solarWattsPerPanel)) / 1000).toFixed(2))
      : null;

  const completeness = useMemo(() => calculateProfileCompleteness(profile), [profile]);

  if (!currentScreen) return null;

  return (
    <div className="flex flex-col bg-[var(--surface)] text-[var(--ink)] rounded-[12px] border border-[var(--line)] overflow-hidden">
      {/* Top Bar: Mode switcher (full mode only), Saved status, Save and exit */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--surface-subtle)] flex items-center justify-between gap-3 flex-wrap">
        {!singleSectionId ? (
          <div className="flex items-center gap-1.5 bg-[var(--surface)] p-1 rounded-[8px] border border-[var(--line)]" role="group" aria-label="Setup depth">
            <button
              type="button"
              onClick={() => handleSwitchMode('quick')}
              className={`min-h-[36px] px-3 py-1 rounded-[6px] text-[13px] font-semibold cursor-pointer transition-colors ${
                mode === 'quick'
                  ? 'bg-[var(--brand)] text-[var(--brand-ink)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Quick setup (~3 min)
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('detailed')}
              className={`min-h-[36px] px-3 py-1 rounded-[6px] text-[13px] font-semibold cursor-pointer transition-colors ${
                mode === 'detailed'
                  ? 'bg-[var(--brand)] text-[var(--brand-ink)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Full details
            </button>
          </div>
        ) : (
          <div className="text-[14px] font-semibold text-[var(--muted)]">
            Editing section: <span className="text-[var(--ink)]">{HOUSEHOLD_SECTIONS.find((s) => s.id === singleSectionId)?.title}</span>
          </div>
        )}

        <div className="flex items-center gap-3 ml-auto">
          <span
            aria-live="polite"
            className={`text-[13px] font-semibold transition-opacity flex items-center gap-1 ${
              savedNoticeVisible ? 'opacity-100 text-[var(--success)]' : 'opacity-80 text-[var(--muted)]'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{savedNoticeVisible ? 'Saved' : 'Autosaved locally'}</span>
          </span>
          <button
            type="button"
            onClick={handleSaveAndExit}
            className="min-h-[44px] px-3.5 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[14px] font-semibold text-[var(--ink)] cursor-pointer transition-colors"
          >
            {singleSectionId ? 'Close' : 'Save and exit'}
          </button>
        </div>
      </div>

      {/* Single Progress Indicator (Full mode only): Desktop Section Stepper OR Mobile Step X of Y + thin bar */}
      {!singleSectionId && (
        <div className="px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--surface)]">
          {/* Desktop horizontal section stepper */}
          <nav aria-label="Questionnaire sections" className="hidden md:flex items-center gap-1.5 overflow-x-auto pb-1">
            {visibleSections.map((sec, idx) => {
              const isCurrent = sec.id === currentScreen.sectionId;
              const isDone = completedSections.has(sec.id) && !isCurrent;
              const canJump = isDone || idx < activeSectionIdx;

              return (
                <React.Fragment key={sec.id}>
                  <button
                    type="button"
                    disabled={!canJump && !isCurrent}
                    onClick={() => canJump && handleJumpToSection(sec.id)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`min-h-[36px] px-2.5 py-1 rounded-[8px] text-[13px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                      isCurrent
                        ? 'bg-[var(--brand)] text-[var(--brand-ink)]'
                        : isDone
                          ? 'bg-[var(--surface-subtle)] text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer border border-[var(--line)]'
                          : 'text-[var(--muted)] cursor-default'
                    }`}
                  >
                    {isDone && <Check className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />}
                    <span>{sec.title}</span>
                  </button>
                  {idx < visibleSections.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" aria-hidden="true" />
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* Mobile compact Step X of Y + thin bar */}
          <div className="flex md:hidden flex-col gap-2">
            <div className="flex items-center justify-between text-[13px] font-semibold text-[var(--ink)]">
              <span>
                Step {safeIndex + 1} of {visibleScreens.length},{' '}
                {visibleSections.find((s) => s.id === currentScreen.sectionId)?.title || currentScreen.title}
              </span>
              <span className="text-[var(--muted)]">
                {Math.round(((safeIndex + 1) / Math.max(1, visibleScreens.length)) * 100)}%
              </span>
            </div>
            <div className="w-full h-1 rounded-full bg-[var(--line)] overflow-hidden" role="progressbar" aria-valuenow={safeIndex + 1} aria-valuemin={1} aria-valuemax={visibleScreens.length}>
              <div
                className="h-full bg-[var(--brand)] transition-all"
                style={{ width: `${Math.round(((safeIndex + 1) / Math.max(1, visibleScreens.length)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Screen Content: One Title + One "Why we ask" line + Grouped Fields */}
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-3xl w-full mx-auto">
        <div className="flex flex-col gap-1">
          <h2
            ref={titleRef}
            tabIndex={-1}
            className="font-serif text-[22px] sm:text-[24px] font-semibold text-[var(--ink)] tracking-tight outline-none"
          >
            {currentScreen.title}
          </h2>
          <p className="text-[15px] font-medium text-[var(--muted)]">
            <span className="font-semibold text-[var(--ink)]">Why we ask: </span>
            {currentScreen.whyWeAsk}
          </p>
        </div>

        {/* ---- SCREEN 0: HOME BASICS — ZILLOW AUTO-FILL (FIRST QUESTION) ---- */}
        {currentScreen.id === 'home_basics_zillow' && (
          <div className="flex flex-col gap-5">
            <div className="rounded-[12px] border border-[var(--line)] bg-[var(--surface-2)] p-5 flex flex-col gap-3.5">
              <label
                htmlFor="hh_zillow_url"
                className="text-[15px] font-semibold text-[var(--ink)] flex items-center gap-2"
              >
                <Link2 className="w-4 h-4 text-[var(--brand)] shrink-0" />
                <span>Zillow property link</span>
                <span className="text-[12px] font-medium text-[var(--muted)]">(Optional)</span>
              </label>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  id="hh_zillow_url"
                  type="url"
                  value={zillowLinkInput}
                  onChange={(e) => {
                    setZillowLinkInput(e.target.value);
                    if (zillowFeedback) setZillowFeedback(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handlePullFromZillow();
                    }
                  }}
                  placeholder="https://www.zillow.com/homedetails/..."
                  disabled={zillowLoading}
                  className="flex-1 min-h-[46px] px-3.5 py-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] text-[14px] font-medium text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:border-[var(--brand)] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={handlePullFromZillow}
                  disabled={zillowLoading || !zillowLinkInput.trim()}
                  className="min-h-[46px] px-5 py-2.5 rounded-[10px] bg-[var(--brand)] text-white text-[14px] font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-2 shrink-0"
                >
                  {zillowLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Pulling info...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Pull home info</span>
                    </>
                  )}
                </button>
              </div>

              {zillowFeedback ? (
                <p
                  role="status"
                  aria-live="polite"
                  className={`text-[13px] font-semibold flex items-start gap-1.5 ${
                    zillowFeedback.type === 'success' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                  }`}
                >
                  {zillowFeedback.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{zillowFeedback.text}</span>
                </p>
              ) : (
                <p className="text-[13px] font-medium text-[var(--muted)] leading-snug">
                  We&apos;ll pre-fill your address, home type, bedrooms, bathrooms, square footage, year built, and lot size on the next screens for you to confirm.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 text-[13px] text-[var(--muted)]">
              <span>Don&apos;t have a Zillow link handy?</span>
              <button
                type="button"
                onClick={handleNext}
                className="font-semibold text-[var(--brand)] hover:underline cursor-pointer"
              >
                Skip and enter manually →
              </button>
            </div>
          </div>
        )}

        {/* ---- SCREEN 1: HOME BASICS — LOCATION & OWNERSHIP ---- */}
        {currentScreen.id === 'home_basics_location' && (
          <div className="flex flex-col gap-6">
            <TextField
              id="hh_address"
              label="Home street address"
              essential={true}
              value={profile.address}
              onChange={(v) => updateField('address', v)}
              placeholder="e.g. 742 Evergreen Terrace, Austin, TX 78701"
              helpText="Stays stored locally in Klarity to match local utility rates."
              isPrefilled={isPrefilled('address')}
              onConfirmPrefill={() => confirmPrefill('address')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_88px_minmax(0,1.6fr)] gap-3 items-start">
              <TextField
                id="hh_city"
                label="City"
                value={profile.city}
                onChange={(v) => updateField('city', v)}
                placeholder="City"
                isPrefilled={isPrefilled('city')}
                onConfirmPrefill={() => confirmPrefill('city')}
              />
              <TextField
                id="hh_state"
                label="State"
                value={profile.state}
                onChange={(v) => updateField('state', v.toUpperCase().slice(0, 2))}
                placeholder="TX"
              />
              <TextField
                id="hh_zip"
                label="ZIP code"
                essential={true}
                value={profile.zip}
                onChange={(v) => updateField('zip', v.replace(/[^0-9]/g, '').slice(0, 5))}
                placeholder="5-digit ZIP"
                inputMode="numeric"
                error={mergedErrors.zip}
                isPrefilled={isPrefilled('zip')}
                onConfirmPrefill={() => confirmPrefill('zip')}
              />
            </div>

            <OptionRadioGroup
              fieldId="hh_ownership"
              label="Do you own or rent this home?"
              essential={true}
              value={profile.ownership}
              onChange={(v) => updateField('ownership', v)}
              options={mapOpts('ownership')}
              isPrefilled={isPrefilled('ownership')}
              onConfirmPrefill={() => confirmPrefill('ownership')}
            />

            <OptionRadioGroup
              fieldId="hh_home_type"
              label="What type of home is it?"
              essential={true}
              value={profile.homeType}
              onChange={(v) => updateField('homeType', v)}
              options={mapOpts('homeType')}
              isPrefilled={isPrefilled('homeType')}
              onConfirmPrefill={() => confirmPrefill('homeType')}
            />
          </div>
        )}

        {/* ---- SCREEN 2: HOME BASICS — SPECS & CONDITIONALS ---- */}
        {currentScreen.id === 'home_basics_specs' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField
                id="hh_bedrooms"
                label="Bedrooms"
                essential={true}
                value={profile.bedrooms}
                onChange={(v) => updateField('bedrooms', v)}
                min={0}
                max={20}
                placeholder="e.g. 3"
                error={mergedErrors.bedrooms}
                isPrefilled={isPrefilled('bedrooms')}
                onConfirmPrefill={() => confirmPrefill('bedrooms')}
              />
              <NumberField
                id="hh_bathrooms"
                label="Bathrooms"
                essential={true}
                allowDecimal={true}
                value={profile.bathrooms}
                onChange={(v) => updateField('bathrooms', v)}
                min={0}
                max={20}
                placeholder="e.g. 2.5"
                error={mergedErrors.bathrooms}
                isPrefilled={isPrefilled('bathrooms')}
                onConfirmPrefill={() => confirmPrefill('bathrooms')}
              />
              <NumberField
                id="hh_sqft"
                label="Living area (square feet)"
                essential={true}
                value={profile.sqFt}
                onChange={(v) => updateField('sqFt', v)}
                min={200}
                max={20000}
                suffix="sq ft"
                placeholder="e.g. 1950"
                error={mergedErrors.sqFt}
                isPrefilled={isPrefilled('sqFt')}
                onConfirmPrefill={() => confirmPrefill('sqFt')}
              />
              <NumberField
                id="hh_year_built"
                label="Year built"
                essential={true}
                value={profile.yearBuilt}
                onChange={(v) => updateField('yearBuilt', v)}
                min={1800}
                max={new Date().getFullYear()}
                placeholder="e.g. 1998"
                error={mergedErrors.yearBuilt}
                isPrefilled={isPrefilled('yearBuilt')}
                onConfirmPrefill={() => confirmPrefill('yearBuilt')}
              />
            </div>

            {isHouseOrTownhome(profile) && (
              <OptionRadioGroup
                fieldId="hh_stories"
                label="How many stories?"
                columns={3}
                value={profile.stories}
                onChange={(v) => updateField('stories', v)}
                options={mapOpts('stories')}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isHouseOnly(profile) && (
                <TextField
                  id="hh_lot_size"
                  label="Lot size (optional)"
                  value={profile.lotSize}
                  onChange={(v) => updateField('lotSize', v || null)}
                  placeholder="e.g. 6,500 sq ft or 0.25 acres"
                />
              )}
              <NumberField
                id="hh_years_lived"
                label="Years lived here (optional)"
                allowDecimal={true}
                value={profile.yearsLivedHere}
                onChange={(v) => updateField('yearsLivedHere', v)}
                min={0}
                max={100}
                placeholder="e.g. 4"
              />
            </div>

            {isHouseOrTownhome(profile) && (
              <>
                <OptionRadioGroup
                  fieldId="hh_garage"
                  label="Garage capacity"
                  value={profile.garage}
                  onChange={(v) => updateField('garage', v)}
                  options={mapOpts('garage')}
                />
                {profile.garage && profile.garage !== 'none' && profile.garage !== 'not_sure' && (
                  <OptionRadioGroup
                    fieldId="hh_garage_attached"
                    label="Is the garage attached to the home?"
                    value={profile.garageAttached}
                    onChange={(v) => updateField('garageAttached', v)}
                    options={YES_NO_OPTS}
                  />
                )}
              </>
            )}

            {isOwner(profile) && (
              <OptionRadioGroup
                fieldId="hh_rent_out"
                label="Do you rent out any part of the home?"
                value={profile.rentOutPart}
                onChange={(v) => updateField('rentOutPart', v)}
                options={mapOpts('rentOutPart')}
              />
            )}
          </div>
        )}

        {/* ---- SCREEN 3: HOUSEHOLD ---- */}
        {currentScreen.id === 'household_people' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField
                id="hh_adults"
                label="Adults living here"
                essential={true}
                value={profile.adultsCount}
                onChange={(v) => updateField('adultsCount', v)}
                min={1}
                max={20}
                placeholder="e.g. 2"
                isPrefilled={isPrefilled('adultsCount')}
                onConfirmPrefill={() => confirmPrefill('adultsCount')}
              />
              <NumberField
                id="hh_children"
                label="Children living here"
                essential={true}
                value={profile.childrenCount}
                onChange={(v) => updateField('childrenCount', v)}
                min={0}
                max={20}
                placeholder="0 if none"
              />
              <NumberField
                id="hh_wfh_days"
                label="Work-from-home days per week (optional)"
                value={profile.workFromHomeDaysPerWeek}
                onChange={(v) => updateField('workFromHomeDaysPerWeek', v)}
                min={0}
                max={7}
                placeholder="0 to 7"
              />
              <NumberField
                id="hh_hours_empty"
                label="Hours the home is empty on weekdays (optional)"
                value={profile.weekdayHoursEmpty}
                onChange={(v) => updateField('weekdayHoursEmpty', v)}
                min={0}
                max={24}
                placeholder="e.g. 6"
              />
            </div>

            <OptionRadioGroup
              fieldId="hh_medical_power"
              label="Does anyone in the home rely on medical equipment that needs power?"
              value={profile.medicalEquipmentPower}
              onChange={(v) => updateField('medicalEquipmentPower', v)}
              options={YES_NO_OPTS}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField
                id="hh_pets_count"
                label="Number of pets (optional)"
                value={profile.petsCount}
                onChange={(v) => updateField('petsCount', v)}
                min={0}
                max={30}
                placeholder="0 if none"
              />
              <TextField
                id="hh_pets_type"
                label="Pet types (optional)"
                value={profile.petsType}
                onChange={(v) => updateField('petsType', v || null)}
                placeholder="e.g. 1 dog, 2 cats"
              />
            </div>

            <OptionRadioGroup
              fieldId="hh_move_3yr"
              label="Do you plan to move or sell within the next 3 years?"
              value={profile.planToMove3Years}
              onChange={(v) => updateField('planToMove3Years', v)}
              options={YES_NO_OPTS}
            />
          </div>
        )}

        {/* ---- SCREEN 4: BUILDING DETAILS (DETAILED ONLY) ---- */}
        {currentScreen.id === 'building_envelope' && (
          <div className="flex flex-col gap-6">
            <OptionRadioGroup
              fieldId="hh_insulation"
              label="How well insulated is the home?"
              value={profile.insulation}
              onChange={(v) => updateField('insulation', v)}
              options={mapOpts('insulation')}
            />
            <OptionRadioGroup
              fieldId="hh_windows"
              label="Window type"
              value={profile.windows}
              onChange={(v) => updateField('windows', v)}
              options={mapOpts('windows')}
            />
            <OptionRadioGroup
              fieldId="hh_foundation"
              label="Foundation type"
              value={profile.foundation}
              onChange={(v) => updateField('foundation', v)}
              options={mapOpts('foundation')}
            />

            {isOwner(profile) && (
              <div className="pt-4 border-t border-[var(--line)] flex flex-col gap-5">
                <OptionRadioGroup
                  fieldId="hh_roof_type"
                  label="Roof material"
                  value={profile.roofType}
                  onChange={(v) => updateField('roofType', v)}
                  options={mapOpts('roofType')}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <NumberField
                    id="hh_roof_age"
                    label="Roof age (years)"
                    value={profile.roofAgeYears}
                    onChange={(v) => updateField('roofAgeYears', v)}
                    min={0}
                    max={120}
                    placeholder="e.g. 12"
                    error={mergedErrors.roofAgeYears}
                  />
                  <NumberField
                    id="hh_hvac_year"
                    label="Year HVAC last replaced"
                    value={profile.hvacReplacedYear}
                    onChange={(v) => updateField('hvacReplacedYear', v)}
                    min={1950}
                    max={new Date().getFullYear()}
                    placeholder="e.g. 2018"
                    error={mergedErrors.hvacReplacedYear}
                  />
                  <NumberField
                    id="hh_wh_year"
                    label="Year water heater replaced"
                    value={profile.waterHeaterReplacedYear}
                    onChange={(v) => updateField('waterHeaterReplacedYear', v)}
                    min={1950}
                    max={new Date().getFullYear()}
                    placeholder="e.g. 2019"
                    error={mergedErrors.waterHeaterReplacedYear}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- SCREEN 5: HEATING, COOLING, HOT WATER ---- */}
        {currentScreen.id === 'heating_cooling_water' && (
          <div className="flex flex-col gap-6">
            <OptionRadioGroup
              fieldId="hh_heating"
              label="Primary heating system"
              essential={true}
              value={profile.heating}
              onChange={(v) => updateField('heating', v)}
              options={mapOpts('heating')}
              isPrefilled={isPrefilled('heating')}
              onConfirmPrefill={() => confirmPrefill('heating')}
            />
            <OptionRadioGroup
              fieldId="hh_cooling"
              label="Primary cooling system"
              essential={true}
              value={profile.cooling}
              onChange={(v) => updateField('cooling', v)}
              options={mapOpts('cooling')}
              isPrefilled={isPrefilled('cooling')}
              onConfirmPrefill={() => confirmPrefill('cooling')}
            />
            <OptionRadioGroup
              fieldId="hh_thermostat"
              label="Thermostat type"
              value={profile.thermostat}
              onChange={(v) => updateField('thermostat', v)}
              options={mapOpts('thermostat')}
            />
            <OptionRadioGroup
              fieldId="hh_water_heater"
              label="Water heater type"
              essential={true}
              value={profile.waterHeater}
              onChange={(v) => updateField('waterHeater', v)}
              options={mapOpts('waterHeater')}
              isPrefilled={isPrefilled('waterHeater')}
              onConfirmPrefill={() => confirmPrefill('waterHeater')}
            />
            <OptionRadioGroup
              fieldId="hh_space_heaters"
              label="Are space heaters or a fireplace used regularly?"
              value={profile.spaceHeatersOrFireplace}
              onChange={(v) => updateField('spaceHeatersOrFireplace', v)}
              options={YES_NO_OPTS}
            />
          </div>
        )}

        {/* ---- SCREEN 6: APPLIANCES ---- */}
        {currentScreen.id === 'appliances_loads' && (
          <div className="flex flex-col gap-6">
            <OptionRadioGroup
              fieldId="hh_cooking"
              label="Cooking fuel"
              essential={true}
              value={profile.cookingFuel}
              onChange={(v) => updateField('cookingFuel', v)}
              options={mapOpts('cookingFuel')}
            />
            <OptionRadioGroup
              fieldId="hh_dryer"
              label="Clothes dryer type"
              essential={true}
              value={profile.dryer}
              onChange={(v) => updateField('dryer', v)}
              options={mapOpts('dryer')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField
                id="hh_washer_loads"
                label="Washer loads per week (optional)"
                value={profile.washerLoadsPerWeek}
                onChange={(v) => updateField('washerLoadsPerWeek', v)}
                min={0}
                max={50}
                placeholder="e.g. 5"
              />
              <OptionRadioGroup
                fieldId="hh_dishwasher"
                label="Dishwasher used regularly?"
                value={profile.hasDishwasher}
                onChange={(v) => updateField('hasDishwasher', v)}
                options={YES_NO_OPTS}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <OptionRadioGroup
                fieldId="hh_fridges"
                label="Number of refrigerators"
                columns={1}
                value={profile.refrigeratorsCount}
                onChange={(v) => updateField('refrigeratorsCount', v)}
                options={mapOpts('refrigerators')}
              />
              <OptionRadioGroup
                fieldId="hh_freezer"
                label="Separate standalone freezer?"
                columns={1}
                value={profile.hasSeparateFreezer}
                onChange={(v) => updateField('hasSeparateFreezer', v)}
                options={YES_NO_OPTS}
              />
            </div>
            <MultiSelectChips
              fieldId="hh_other_loads"
              label="Other large continuous electrical loads"
              helpText="Select all that run regularly at your home."
              values={profile.otherLargeLoads}
              onChange={(v) => updateField('otherLargeLoads', v)}
              options={mapOpts('otherLargeLoads')}
            />
          </div>
        )}

        {/* ---- SCREEN 7: POOL OR SPA ---- */}
        {currentScreen.id === 'pool_spa_screen' && (
          <div className="flex flex-col gap-6">
            <OptionRadioGroup
              fieldId="hh_pool_spa"
              label="Do you have a swimming pool or spa?"
              essential={true}
              value={profile.poolOrSpa}
              onChange={(v) => updateField('poolOrSpa', v)}
              options={mapOpts('poolOrSpa')}
              isPrefilled={isPrefilled('poolOrSpa')}
              onConfirmPrefill={() => confirmPrefill('poolOrSpa')}
            />

            {profile.poolOrSpa && profile.poolOrSpa !== 'none' && profile.poolOrSpa !== 'not_sure' && (
              <div className="pt-4 border-t border-[var(--line)] flex flex-col gap-5">
                <OptionRadioGroup
                  fieldId="hh_pool_heating"
                  label="How is the pool or spa heated?"
                  value={profile.poolHeating}
                  onChange={(v) => updateField('poolHeating', v)}
                  options={mapOpts('poolHeating')}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberField
                    id="hh_pool_pump_hrs"
                    label="Filter pump hours per day"
                    allowDecimal={true}
                    value={profile.poolPumpHoursPerDay}
                    onChange={(v) => updateField('poolPumpHoursPerDay', v)}
                    min={0}
                    max={24}
                    placeholder="e.g. 6"
                    error={mergedErrors.poolPumpHoursPerDay}
                  />
                  <OptionRadioGroup
                    fieldId="hh_pool_cover"
                    label="Do you use a pool cover?"
                    columns={1}
                    value={profile.hasPoolCover}
                    onChange={(v) => updateField('hasPoolCover', v)}
                    options={YES_NO_OPTS}
                  />
                </div>
                <OptionRadioGroup
                  fieldId="hh_pool_service"
                  label="Pool maintenance service"
                  value={profile.poolService}
                  onChange={(v) => updateField('poolService', v)}
                  options={mapOpts('poolService')}
                />
                {profile.poolService === 'paid' && (
                  <NumberField
                    id="hh_pool_cost"
                    label="Monthly pool service cost"
                    prefix="$"
                    allowDecimal={true}
                    value={profile.poolServiceMonthlyCost}
                    onChange={(v) => updateField('poolServiceMonthlyCost', v)}
                    placeholder="e.g. 140"
                    error={mergedErrors.poolServiceMonthlyCost}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ---- SCREEN 8: SOLAR AND BATTERY ---- */}
        {currentScreen.id === 'solar_panels_screen' && (
          <div className="flex flex-col gap-6">
            <OptionRadioGroup
              fieldId="hh_has_solar"
              label="Do you have rooftop solar panels?"
              essential={true}
              value={profile.hasSolar}
              onChange={(v) => updateField('hasSolar', v)}
              options={YES_NO_OPTS}
              isPrefilled={isPrefilled('hasSolar')}
              onConfirmPrefill={() => confirmPrefill('hasSolar')}
            />

            {profile.hasSolar === 'no' && (
              <OptionRadioGroup
                fieldId="hh_plan_solar"
                label="Do you plan to add solar in the next few years?"
                value={profile.planToAddSolar}
                onChange={(v) => updateField('planToAddSolar', v)}
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'maybe', label: 'Maybe' },
                  { value: 'no', label: 'No' }
                ]}
              />
            )}

            {profile.hasSolar === 'yes' && (
              <div className="pt-4 border-t border-[var(--line)] flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberField
                    id="hh_solar_panels"
                    label="Number of panels"
                    essential={true}
                    value={profile.solarPanelCount}
                    onChange={(v) => updateField('solarPanelCount', v)}
                    min={1}
                    max={200}
                    placeholder="e.g. 20"
                    error={mergedErrors.solarPanelCount}
                  />
                  <NumberField
                    id="hh_solar_watts"
                    label="Watts per panel"
                    essential={true}
                    helpText="Check the panel label or install paperwork; most are 300 to 450 W."
                    value={profile.solarWattsPerPanel}
                    onChange={(v) => updateField('solarWattsPerPanel', v)}
                    min={100}
                    max={700}
                    suffix="W"
                    placeholder="e.g. 400"
                    error={mergedErrors.solarWattsPerPanel}
                  />
                </div>

                {solarKwLive != null && (
                  <div className="p-3.5 rounded-[8px] border border-[var(--line)] bg-[var(--surface-subtle)] flex items-center justify-between">
                    <span className="text-[14px] font-medium text-[var(--muted)] flex items-center gap-2">
                      <Sun className="w-4 h-4 text-[var(--brand)] dark:text-[#7BB1FF]" />
                      Calculated system size
                    </span>
                    <span className="text-[16px] font-semibold text-[var(--ink)]">{solarKwLive} kW DC</span>
                  </div>
                )}

                <OptionRadioGroup
                  fieldId="hh_solar_ownership"
                  label="Solar ownership"
                  essential={true}
                  value={profile.solarOwnership}
                  onChange={(v) => updateField('solarOwnership', v)}
                  options={mapOpts('solarOwnership')}
                />

                {(profile.solarOwnership === 'leased' || profile.solarOwnership === 'ppa') && (
                  <NumberField
                    id="hh_solar_payment"
                    label="Monthly solar lease or PPA payment"
                    prefix="$"
                    allowDecimal={true}
                    value={profile.solarMonthlyPayment}
                    onChange={(v) => updateField('solarMonthlyPayment', v)}
                    placeholder="e.g. 165"
                    error={mergedErrors.solarMonthlyPayment}
                  />
                )}

                {profile.solarOwnership === 'loan' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <NumberField
                      id="hh_solar_loan_payment"
                      label="Monthly solar loan payment"
                      prefix="$"
                      allowDecimal={true}
                      value={profile.solarMonthlyPayment}
                      onChange={(v) => updateField('solarMonthlyPayment', v)}
                      placeholder="e.g. 180"
                      error={mergedErrors.solarMonthlyPayment}
                    />
                    <NumberField
                      id="hh_solar_loan_months"
                      label="Months remaining on solar loan"
                      value={profile.solarLoanMonthsRemaining}
                      onChange={(v) => updateField('solarLoanMonthsRemaining', v)}
                      min={0}
                      max={360}
                      placeholder="e.g. 120"
                    />
                  </div>
                )}

                <OptionRadioGroup
                  fieldId="hh_solar_billing"
                  label="Utility solar billing plan"
                  essential={true}
                  value={profile.solarBillingPlan}
                  onChange={(v) => updateField('solarBillingPlan', v)}
                  options={mapOpts('solarBillingPlan')}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberField
                    id="hh_solar_year"
                    label="Year installed"
                    value={profile.solarYearInstalled}
                    onChange={(v) => updateField('solarYearInstalled', v)}
                    min={1990}
                    max={new Date().getFullYear()}
                    placeholder="e.g. 2022"
                  />
                  <NumberField
                    id="hh_solar_yearly_kwh"
                    label="Known yearly production (optional)"
                    helpText="If entered from your inverter app, replaces the estimate."
                    value={profile.solarKnownYearlyKwh}
                    onChange={(v) => updateField('solarKnownYearlyKwh', v)}
                    min={0}
                    max={100000}
                    suffix="kWh/yr"
                    placeholder="Optional"
                  />
                </div>

                <NumberField
                  id="hh_peak_sun"
                  label="Estimated peak sun hours per day"
                  helpText={`Regional estimate for your ZIP: ${localUtilities.defaultPeakSunHours} hrs/day (editable).`}
                  allowDecimal={true}
                  value={profile.solarPeakSunHours ?? localUtilities.defaultPeakSunHours}
                  onChange={(v) => updateField('solarPeakSunHours', v)}
                  min={1}
                  max={10}
                  suffix="hrs/day"
                />

                <OptionRadioGroup
                  fieldId="hh_solar_direction"
                  label="Main roof direction of panels"
                  value={profile.solarRoofDirection}
                  onChange={(v) => updateField('solarRoofDirection', v)}
                  options={mapOpts('roofDirection')}
                />
                <OptionRadioGroup
                  fieldId="hh_solar_shade"
                  label="Tree or building shade"
                  value={profile.solarShade}
                  onChange={(v) => updateField('solarShade', v)}
                  options={mapOpts('solarShade')}
                />

                <OptionRadioGroup
                  fieldId="hh_has_battery"
                  label="Do you have a home solar battery?"
                  value={profile.hasSolarBattery}
                  onChange={(v) => updateField('hasSolarBattery', v)}
                  options={YES_NO_OPTS}
                />

                {profile.hasSolarBattery === 'yes' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <NumberField
                      id="hh_battery_kwh"
                      label="Battery capacity (kWh)"
                      allowDecimal={true}
                      value={profile.solarBatteryKwh}
                      onChange={(v) => updateField('solarBatteryKwh', v)}
                      min={1}
                      max={100}
                      suffix="kWh"
                      placeholder="e.g. 13.5"
                      error={mergedErrors.solarBatteryKwh}
                    />
                    <OptionRadioGroup
                      fieldId="hh_battery_use"
                      label="How is the battery used?"
                      columns={1}
                      value={profile.solarBatteryUse}
                      onChange={(v) => updateField('solarBatteryUse', v)}
                      options={mapOpts('batteryUse')}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---- SCREEN 9: EV AND CHARGING ---- */}
        {currentScreen.id === 'ev_charging_screen' && (
          <div className="flex flex-col gap-6">
            {linkedEvs.length > 0 && (
              <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-1.5">
                <div className="text-[14px] font-semibold text-[var(--ink)] flex items-center gap-2">
                  <Car className="w-4 h-4 text-[var(--brand)] dark:text-[#7BB1FF]" />
                  <span>Linked electric / plug-in vehicles from Auto ({linkedEvs.length})</span>
                </div>
                <p className="text-[13px] font-medium text-[var(--muted)]">
                  {linkedEvs.map((v) => v.name || `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim()).join(' · ')} — We use their mileage and efficiency directly so you are not asked twice.
                </p>
              </div>
            )}

            <OptionRadioGroup
              fieldId="hh_ev_count"
              label="Electric or plug-in hybrid vehicles at home"
              essential={true}
              value={profile.evCount}
              onChange={(v) => updateField('evCount', v)}
              options={mapOpts('evCount')}
              isPrefilled={isPrefilled('evCount')}
              onConfirmPrefill={() => confirmPrefill('evCount')}
            />

            {(profile.evCount === '1' || profile.evCount === '2_plus') && (
              <div className="pt-4 border-t border-[var(--line)] flex flex-col gap-5">
                <OptionRadioGroup
                  fieldId="hh_ev_charger"
                  label="Home charger setup"
                  essential={true}
                  value={profile.evHomeCharger}
                  onChange={(v) => updateField('evHomeCharger', v)}
                  options={mapOpts('homeCharger')}
                />
                <OptionRadioGroup
                  fieldId="hh_ev_location"
                  label="Where they charge most"
                  essential={true}
                  value={profile.evChargingLocation}
                  onChange={(v) => updateField('evChargingLocation', v)}
                  options={mapOpts('chargingLocation')}
                />
                <OptionRadioGroup
                  fieldId="hh_ev_hours"
                  label="Typical charging hours"
                  essential={true}
                  value={profile.evChargingHours}
                  onChange={(v) => updateField('evChargingHours', v)}
                  options={mapOpts('chargingHours')}
                />
                {(profile.evHomeCharger === 'level_1' ||
                  profile.evHomeCharger === 'none_at_home' ||
                  profile.evHomeCharger === 'public_only') && (
                  <OptionRadioGroup
                    fieldId="hh_ev_panel"
                    label="Does your electrical panel have spare capacity for a Level 2 charger?"
                    value={profile.evReadyPanel}
                    onChange={(v) => updateField('evReadyPanel', v)}
                    options={YES_NO_OPTS}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ---- SCREEN 10: ELECTRICITY & GAS ---- */}
        {currentScreen.id === 'utilities_electric_gas' && (
          <div className="flex flex-col gap-6">
            {/* Electric provider block */}
            <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-[16px] font-semibold text-[var(--ink)]">Electricity</h3>
                <NoServiceToggle
                  label="I don’t have this"
                  checked={Boolean(profile.noElectricService)}
                  onChange={(checked) => updateField('noElectricService', checked)}
                />
              </div>

              {!profile.noElectricService && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField
                      id="hh_electric_utility"
                      label="Electric utility"
                      essential={true}
                      value={profile.electricUtility}
                      onChange={(v) => updateField('electricUtility', v)}
                      placeholder={localUtilities.primaryElectricUtility}
                      helpText={`Suggested for your area: ${localUtilities.regionName}`}
                      suggestions={localUtilities.electricUtilities}
                      isPrefilled={isPrefilled('electricUtility')}
                      onConfirmPrefill={() => confirmPrefill('electricUtility')}
                    />
                    <TextField
                      id="hh_electric_rate"
                      label="Rate plan"
                      essential={true}
                      value={profile.electricRatePlan}
                      onChange={(v) => updateField('electricRatePlan', v)}
                      placeholder="Select or type plan (or Not sure)"
                      suggestions={[...localUtilities.ratePlans, 'Not sure']}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <NumberField
                      id="hh_elec_summer"
                      label="Typical summer bill"
                      essential={true}
                      prefix="$"
                      allowDecimal={true}
                      value={profile.electricMonthlyBillSummer}
                      onChange={(v) => updateField('electricMonthlyBillSummer', v)}
                      placeholder="e.g. 210"
                      error={mergedErrors.electricMonthlyBillSummer}
                    />
                    <NumberField
                      id="hh_elec_winter"
                      label="Typical winter bill"
                      essential={true}
                      prefix="$"
                      allowDecimal={true}
                      value={profile.electricMonthlyBillWinter}
                      onChange={(v) => updateField('electricMonthlyBillWinter', v)}
                      placeholder="e.g. 140"
                      error={mergedErrors.electricMonthlyBillWinter}
                    />
                    <NumberField
                      id="hh_elec_kwh"
                      label="Typical monthly kWh (optional)"
                      value={profile.electricMonthlyKwh}
                      onChange={(v) => updateField('electricMonthlyKwh', v)}
                      min={0}
                      max={10000}
                      suffix="kWh"
                      placeholder="Optional"
                    />
                  </div>

                  <OptionRadioGroup
                    fieldId="hh_low_income_disc"
                    label={`Enrolled in a utility discount program (${localUtilities.discountProgram})?`}
                    essential={true}
                    helpText="Only tracks whether a bill discount applies to your rate."
                    value={profile.electricLowIncomeDiscount}
                    onChange={(v) => updateField('electricLowIncomeDiscount', v)}
                    options={YES_NO_OPTS}
                  />

                  {profile.medicalEquipmentPower === 'yes' && (
                    <OptionRadioGroup
                      fieldId="hh_med_baseline"
                      label="Enrolled in a medical baseline electricity allowance?"
                      value={profile.electricMedicalBaseline}
                      onChange={(v) => updateField('electricMedicalBaseline', v)}
                      options={YES_NO_OPTS}
                    />
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <SelectField
                      id="hh_elec_freq"
                      label="Billing frequency"
                      value={profile.electricBillingFrequency}
                      onChange={(v) => updateField('electricBillingFrequency', v || 'monthly')}
                      includeNotSure={false}
                      options={[
                        { value: 'monthly', label: 'Monthly' },
                        { value: 'every_2_months', label: 'Every 2 months' },
                        { value: 'quarterly', label: 'Quarterly' }
                      ]}
                    />
                    <NumberField
                      id="hh_elec_day"
                      label="Billing / autopay day (1–31)"
                      value={profile.electricBillingDay}
                      onChange={(v) => updateField('electricBillingDay', v)}
                      min={1}
                      max={31}
                      placeholder="e.g. 15"
                      error={mergedErrors.electricBillingDay}
                    />
                    <SelectField
                      id="hh_smart_meter"
                      label="Smart meter?"
                      value={profile.electricSmartMeter}
                      onChange={(v) => updateField('electricSmartMeter', v)}
                      options={YES_NO_OPTS}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <OptionRadioGroup
                      fieldId="hh_elec_autopay"
                      label="Electric autopay enabled?"
                      columns={1}
                      value={profile.electricAutopay}
                      onChange={(v) => updateField('electricAutopay', v)}
                      options={YES_NO_OPTS}
                    />
                    <OptionRadioGroup
                      fieldId="hh_elec_levelpay"
                      label="Enrolled in budget / level pay?"
                      columns={1}
                      value={profile.electricLevelPay}
                      onChange={(v) => updateField('electricLevelPay', v)}
                      options={YES_NO_OPTS}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Gas or Propane block */}
            {hasAnyGasOrPropaneUsage(profile) && (
              <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-[16px] font-semibold text-[var(--ink)]">
                    {profile.heating === 'propane' ? 'Propane / Gas' : 'Natural gas or propane'}
                  </h3>
                  <NoServiceToggle
                    label="I don’t have this"
                    checked={Boolean(profile.noGasOrPropane)}
                    onChange={(checked) => updateField('noGasOrPropane', checked)}
                  />
                </div>

                {!profile.noGasOrPropane && (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <TextField
                        id="hh_gas_provider"
                        label="Gas or propane provider"
                        essential={true}
                        value={profile.gasOrPropaneProvider}
                        onChange={(v) => updateField('gasOrPropaneProvider', v)}
                        placeholder={localUtilities.gasUtilities?.[0] || 'Gas provider'}
                        suggestions={localUtilities.gasUtilities}
                      />
                      <NumberField
                        id="hh_gas_bill"
                        label="Typical bill"
                        prefix="$"
                        allowDecimal={true}
                        value={profile.gasMonthlyBill}
                        onChange={(v) => updateField('gasMonthlyBill', v)}
                        placeholder="e.g. 65"
                        error={mergedErrors.gasMonthlyBill}
                      />
                      <SelectField
                        id="hh_gas_freq"
                        label="Billing frequency"
                        value={profile.gasBillingFrequency}
                        onChange={(v) => updateField('gasBillingFrequency', v || 'monthly')}
                        includeNotSure={false}
                        options={[
                          { value: 'monthly', label: 'Monthly' },
                          { value: 'every_2_months', label: 'Every 2 months' },
                          { value: 'quarterly', label: 'Quarterly' }
                        ]}
                      />
                    </div>

                    {(profile.heating === 'propane' ||
                      String(profile.gasOrPropaneProvider || '').toLowerCase().includes('propane')) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <OptionRadioGroup
                          fieldId="hh_propane_tank"
                          label="Propane tank ownership"
                          value={profile.propaneTankOwnership}
                          onChange={(v) => updateField('propaneTankOwnership', v)}
                          options={mapOpts('propaneTankOwnership')}
                        />
                        <TextField
                          id="hh_propane_fill"
                          label="Typical fill frequency"
                          value={profile.propaneFillFrequency}
                          onChange={(v) => updateField('propaneFillFrequency', v)}
                          placeholder="e.g. Twice a year"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---- SCREEN 11: WATER, IRRIGATION & TRASH ---- */}
        {currentScreen.id === 'utilities_water_trash' && (
          <div className="flex flex-col gap-6">
            {/* Water & Sewer */}
            <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-[16px] font-semibold text-[var(--ink)]">Water and sewer</h3>
                <NoServiceToggle
                  label="I don’t have this"
                  checked={Boolean(profile.noWaterSewer)}
                  onChange={(checked) => updateField('noWaterSewer', checked)}
                />
              </div>

              {!profile.noWaterSewer && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <TextField
                      id="hh_water_provider"
                      label="Water & sewer provider"
                      essential={true}
                      value={profile.waterProvider}
                      onChange={(v) => updateField('waterProvider', v)}
                      placeholder="City / Municipal Water"
                    />
                    <NumberField
                      id="hh_water_bill"
                      label="Typical bill"
                      prefix="$"
                      allowDecimal={true}
                      value={profile.waterMonthlyBill}
                      onChange={(v) => updateField('waterMonthlyBill', v)}
                      placeholder="e.g. 95"
                      error={mergedErrors.waterMonthlyBill}
                    />
                    <SelectField
                      id="hh_water_freq"
                      label="Billing frequency"
                      value={profile.waterBillingFrequency}
                      onChange={(v) => updateField('waterBillingFrequency', v || 'monthly')}
                      includeNotSure={false}
                      options={[
                        { value: 'monthly', label: 'Monthly' },
                        { value: 'every_2_months', label: 'Every 2 months' },
                        { value: 'quarterly', label: 'Quarterly' },
                        { value: 'on_property_tax', label: 'On property tax' }
                      ]}
                    />
                  </div>

                  <OptionRadioGroup
                    fieldId="hh_water_type"
                    label="Water billing method"
                    value={profile.waterBillingType}
                    onChange={(v) => updateField('waterBillingType', v)}
                    options={mapOpts('waterBillingType')}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <OptionRadioGroup
                      fieldId="hh_has_well"
                      label="Do you use a private well?"
                      columns={1}
                      value={profile.hasWell}
                      onChange={(v) => updateField('hasWell', v)}
                      options={YES_NO_OPTS}
                    />
                    <OptionRadioGroup
                      fieldId="hh_has_septic"
                      label="Do you have a septic system?"
                      columns={1}
                      value={profile.hasSeptic}
                      onChange={(v) => updateField('hasSeptic', v)}
                      options={YES_NO_OPTS}
                    />
                  </div>

                  {profile.hasSeptic === 'yes' && (
                    <NumberField
                      id="hh_septic_pumped"
                      label="Year septic was last pumped"
                      value={profile.septicLastPumpedYear}
                      onChange={(v) => updateField('septicLastPumpedYear', v)}
                      min={1980}
                      max={new Date().getFullYear()}
                      placeholder="e.g. 2022"
                    />
                  )}

                  <OptionRadioGroup
                    fieldId="hh_irrigation"
                    label="Landscape irrigation"
                    value={profile.irrigationType}
                    onChange={(v) => updateField('irrigationType', v)}
                    options={mapOpts('irrigationType')}
                  />
                  {(profile.irrigationType === 'sprinklers' || profile.irrigationType === 'drip') && (
                    <NumberField
                      id="hh_watering_days"
                      label="Watering days per week"
                      value={profile.wateringDaysPerWeek}
                      onChange={(v) => updateField('wateringDaysPerWeek', v)}
                      min={0}
                      max={7}
                      placeholder="e.g. 3"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Trash & Recycling */}
            <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-[16px] font-semibold text-[var(--ink)]">Trash and recycling</h3>
                <NoServiceToggle
                  label="I don’t have this"
                  checked={Boolean(profile.noTrashRecycling)}
                  onChange={(checked) => updateField('noTrashRecycling', checked)}
                />
              </div>

              {!profile.noTrashRecycling && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <TextField
                      id="hh_trash_provider"
                      label="Trash & recycling provider"
                      essential={true}
                      value={profile.trashProvider}
                      onChange={(v) => updateField('trashProvider', v)}
                      placeholder="Waste Management / City"
                    />
                    <NumberField
                      id="hh_trash_bill"
                      label="Typical bill"
                      prefix="$"
                      allowDecimal={true}
                      value={profile.trashMonthlyBill}
                      onChange={(v) => updateField('trashMonthlyBill', v)}
                      placeholder="e.g. 42"
                      error={mergedErrors.trashMonthlyBill}
                    />
                    <SelectField
                      id="hh_trash_freq"
                      label="Billing frequency"
                      value={profile.trashBillingFrequency}
                      onChange={(v) => updateField('trashBillingFrequency', v || 'monthly')}
                      includeNotSure={false}
                      options={[
                        { value: 'monthly', label: 'Monthly' },
                        { value: 'every_2_months', label: 'Every 2 months' },
                        { value: 'quarterly', label: 'Quarterly' },
                        { value: 'on_property_tax', label: 'On property tax' }
                      ]}
                    />
                  </div>
                  <OptionRadioGroup
                    fieldId="hh_trash_cart"
                    label="Cart size"
                    essential={true}
                    value={profile.trashCartSize}
                    onChange={(v) => updateField('trashCartSize', v)}
                    options={mapOpts('cartSize')}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- SCREEN 12: INTERNET, TV, PHONE ---- */}
        {currentScreen.id === 'internet_tv_phone' && (
          <div className="flex flex-col gap-6">
            {/* Internet */}
            <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-[16px] font-semibold text-[var(--ink)]">Home internet</h3>
                <NoServiceToggle
                  label="I don’t have this"
                  checked={Boolean(profile.noInternet)}
                  onChange={(checked) => updateField('noInternet', checked)}
                />
              </div>
              {!profile.noInternet && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <TextField
                      id="hh_net_prov"
                      label="Internet provider"
                      essential={true}
                      value={profile.internetProvider}
                      onChange={(v) => updateField('internetProvider', v)}
                      placeholder="e.g. Xfinity, AT&T Fiber, Starlink"
                    />
                    <TextField
                      id="hh_net_plan"
                      label="Plan name"
                      essential={true}
                      value={profile.internetPlan}
                      onChange={(v) => updateField('internetPlan', v)}
                      placeholder="e.g. Fiber 1 Gig"
                    />
                    <NumberField
                      id="hh_net_speed"
                      label="Speed (Mbps)"
                      essential={true}
                      value={profile.internetSpeedMbps}
                      onChange={(v) => updateField('internetSpeedMbps', v)}
                      suffix="Mbps"
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <NumberField
                      id="hh_net_cost"
                      label="Monthly cost"
                      essential={true}
                      prefix="$"
                      allowDecimal={true}
                      value={profile.internetMonthlyCost}
                      onChange={(v) => updateField('internetMonthlyCost', v)}
                      placeholder="e.g. 75"
                      error={mergedErrors.internetMonthlyCost}
                    />
                    <NumberField
                      id="hh_net_promo"
                      label="Promo price (optional)"
                      prefix="$"
                      allowDecimal={true}
                      value={profile.internetPromoPrice}
                      onChange={(v) => updateField('internetPromoPrice', v)}
                      placeholder="Optional"
                      error={mergedErrors.internetPromoPrice}
                    />
                    <TextField
                      id="hh_net_promo_end"
                      label="Promo end date"
                      type="date"
                      value={profile.internetPromoEndDate}
                      onChange={(v) => updateField('internetPromoEndDate', v)}
                      error={mergedErrors.internetPromoEndDate}
                    />
                    <NumberField
                      id="hh_net_rental"
                      label="Equipment rental fee"
                      prefix="$"
                      allowDecimal={true}
                      value={profile.internetEquipmentRentalFee}
                      onChange={(v) => updateField('internetEquipmentRentalFee', v)}
                      placeholder="0"
                      error={mergedErrors.internetEquipmentRentalFee}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cable or Streaming Bundle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="hh_cable_prov"
                label="Cable or live TV bundle provider (optional)"
                value={profile.cableOrStreamingProvider}
                onChange={(v) => updateField('cableOrStreamingProvider', v)}
                placeholder="e.g. YouTube TV, Spectrum TV"
              />
              <NumberField
                id="hh_cable_cost"
                label="Cable / streaming monthly cost"
                prefix="$"
                allowDecimal={true}
                value={profile.cableOrStreamingMonthlyCost}
                onChange={(v) => updateField('cableOrStreamingMonthlyCost', v)}
                placeholder="Optional"
                error={mergedErrors.cableOrStreamingMonthlyCost}
              />
            </div>

            {/* Mobile Phone */}
            <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-[16px] font-semibold text-[var(--ink)]">Mobile phone service</h3>
                <NoServiceToggle
                  label="I don’t have this"
                  checked={Boolean(profile.noMobilePhone)}
                  onChange={(checked) => updateField('noMobilePhone', checked)}
                />
              </div>
              {!profile.noMobilePhone && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <TextField
                    id="hh_mob_carrier"
                    label="Mobile carrier"
                    essential={true}
                    value={profile.mobileCarrier}
                    onChange={(v) => updateField('mobileCarrier', v)}
                    placeholder="e.g. T-Mobile, Verizon, Mint"
                  />
                  <NumberField
                    id="hh_mob_lines"
                    label="Number of lines"
                    essential={true}
                    value={profile.mobileLines}
                    onChange={(v) => updateField('mobileLines', v)}
                    min={1}
                    max={20}
                    placeholder="e.g. 2"
                  />
                  <TextField
                    id="hh_mob_plan"
                    label="Plan name"
                    essential={true}
                    value={profile.mobilePlanName}
                    onChange={(v) => updateField('mobilePlanName', v)}
                    placeholder="e.g. Go5G Plus"
                  />
                  <NumberField
                    id="hh_mob_cost"
                    label="Monthly cost"
                    essential={true}
                    prefix="$"
                    allowDecimal={true}
                    value={profile.mobileMonthlyCost}
                    onChange={(v) => updateField('mobileMonthlyCost', v)}
                    placeholder="e.g. 120"
                    error={mergedErrors.mobileMonthlyCost}
                  />
                  <NumberField
                    id="hh_mob_dev_months"
                    label="Phone payment months left"
                    value={profile.mobilePaymentRemainingMonths}
                    onChange={(v) => updateField('mobilePaymentRemainingMonths', v)}
                    min={0}
                    max={48}
                    placeholder="Optional"
                  />
                  <NumberField
                    id="hh_mob_dev_bal"
                    label="Device payment balance"
                    prefix="$"
                    allowDecimal={true}
                    value={profile.mobilePaymentBalance}
                    onChange={(v) => updateField('mobilePaymentBalance', v)}
                    placeholder="Optional"
                    error={mergedErrors.mobilePaymentBalance}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <OptionRadioGroup
                fieldId="hh_landline"
                label="Do you have a home landline?"
                columns={1}
                value={profile.hasLandline}
                onChange={(v) => updateField('hasLandline', v)}
                options={YES_NO_OPTS}
              />
              {profile.hasLandline === 'yes' && (
                <NumberField
                  id="hh_landline_cost"
                  label="Monthly landline cost"
                  prefix="$"
                  allowDecimal={true}
                  value={profile.landlineMonthlyCost}
                  onChange={(v) => updateField('landlineMonthlyCost', v)}
                  placeholder="e.g. 25"
                  error={mergedErrors.landlineMonthlyCost}
                />
              )}
            </div>
          </div>
        )}

        {/* ---- SCREEN 13: HOUSING COSTS (STRICT OWNER / RENTER BRANCHING) ---- */}
        {currentScreen.id === 'housing_costs_screen' && (
          <div className="flex flex-col gap-6">
            {isRenter(profile) && (
              <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-4">
                <h3 className="text-[16px] font-semibold text-[var(--ink)]">Rent and lease</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <NumberField
                    id="hh_rent"
                    label="Monthly rent"
                    essential={true}
                    prefix="$"
                    allowDecimal={true}
                    value={profile.monthlyRent}
                    onChange={(v) => updateField('monthlyRent', v)}
                    placeholder="e.g. 2200"
                    error={mergedErrors.monthlyRent}
                  />
                  <NumberField
                    id="hh_rent_day"
                    label="Rent due day (1–31)"
                    value={profile.rentDueDay}
                    onChange={(v) => updateField('rentDueDay', v)}
                    min={1}
                    max={31}
                    placeholder="1"
                    error={mergedErrors.rentDueDay}
                  />
                  <TextField
                    id="hh_lease_end"
                    label="Lease end date (reminder)"
                    type="date"
                    value={profile.leaseEndDate}
                    onChange={(v) => updateField('leaseEndDate', v)}
                    error={mergedErrors.leaseEndDate}
                  />
                </div>
              </div>
            )}

            {profile.ownership === 'own_with_mortgage' && (
              <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-4">
                <h3 className="text-[16px] font-semibold text-[var(--ink)]">Mortgage details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberField
                    id="hh_mort_pi"
                    label="Monthly mortgage payment"
                    essential={true}
                    prefix="$"
                    allowDecimal={true}
                    value={profile.mortgageMonthlyPI}
                    onChange={(v) => updateField('mortgageMonthlyPI', v)}
                    placeholder="e.g. 2450"
                    error={mergedErrors.mortgageMonthlyPI}
                  />
                  <NumberField
                    id="hh_mort_rate"
                    label="Interest rate (%)"
                    allowDecimal={true}
                    value={profile.mortgageInterestRate}
                    onChange={(v) => updateField('mortgageInterestRate', v)}
                    suffix="%"
                    placeholder="e.g. 6.25"
                  />
                  <NumberField
                    id="hh_mort_bal"
                    label="Remaining principal balance (optional)"
                    prefix="$"
                    allowDecimal={true}
                    value={profile.mortgageRemainingBalance}
                    onChange={(v) => updateField('mortgageRemainingBalance', v)}
                    placeholder="Optional"
                    error={mergedErrors.mortgageRemainingBalance}
                  />
                  <TextField
                    id="hh_mort_end"
                    label="Loan payoff / term end date"
                    type="date"
                    value={profile.mortgageTermEndDate}
                    onChange={(v) => updateField('mortgageTermEndDate', v)}
                    error={mergedErrors.mortgageTermEndDate}
                  />
                </div>
                <SelectField
                  id="hh_mort_type"
                  label="Loan type"
                  value={profile.mortgageLoanType}
                  onChange={(v) => updateField('mortgageLoanType', v)}
                  options={mapOpts('loanType')}
                />
                <OptionRadioGroup
                  fieldId="hh_escrow"
                  label="Does your mortgage payment include property taxes and homeowners insurance (escrow)?"
                  helpText="Prevents property tax and home insurance from being counted twice in monthly totals."
                  value={profile.mortgageEscrowTaxesInsurance}
                  onChange={(v) => updateField('mortgageEscrowTaxesInsurance', v)}
                  options={YES_NO_OPTS}
                />
              </div>
            )}

            {isOwner(profile) && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberField
                    id="hh_prop_tax"
                    label="Property tax amount"
                    essential={true}
                    prefix="$"
                    allowDecimal={true}
                    value={profile.propertyTaxAmount}
                    onChange={(v) => updateField('propertyTaxAmount', v)}
                    placeholder="e.g. 4800"
                    error={mergedErrors.propertyTaxAmount}
                  />
                  <SelectField
                    id="hh_prop_tax_freq"
                    label="Property tax schedule"
                    value={profile.propertyTaxFrequency}
                    onChange={(v) => updateField('propertyTaxFrequency', v || 'per_year')}
                    includeNotSure={false}
                    options={mapOpts('propertyTaxFrequency')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <OptionRadioGroup
                    fieldId="hh_2nd_mort"
                    label="Second mortgage or HELOC?"
                    columns={1}
                    value={profile.hasSecondMortgageHeloc}
                    onChange={(v) => updateField('hasSecondMortgageHeloc', v)}
                    options={YES_NO_OPTS}
                  />
                  {profile.hasSecondMortgageHeloc === 'yes' && (
                    <div className="flex flex-col gap-3">
                      <NumberField
                        id="hh_2nd_pay"
                        label="Monthly HELOC / 2nd mortgage payment"
                        prefix="$"
                        allowDecimal={true}
                        value={profile.secondMortgagePayment}
                        onChange={(v) => updateField('secondMortgagePayment', v)}
                        error={mergedErrors.secondMortgagePayment}
                      />
                      <NumberField
                        id="hh_2nd_bal"
                        label="Remaining balance"
                        prefix="$"
                        allowDecimal={true}
                        value={profile.secondMortgageBalance}
                        onChange={(v) => updateField('secondMortgageBalance', v)}
                        error={mergedErrors.secondMortgageBalance}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <OptionRadioGroup
                    fieldId="hh_spec_dist"
                    label="Special district or parcel taxes?"
                    columns={1}
                    value={profile.hasSpecialDistrictTax}
                    onChange={(v) => updateField('hasSpecialDistrictTax', v)}
                    options={YES_NO_OPTS}
                  />
                  {profile.hasSpecialDistrictTax === 'yes' && (
                    <NumberField
                      id="hh_spec_dist_amt"
                      label="Annual special district tax"
                      prefix="$"
                      allowDecimal={true}
                      value={profile.specialDistrictTaxAmount}
                      onChange={(v) => updateField('specialDistrictTaxAmount', v)}
                      error={mergedErrors.specialDistrictTaxAmount}
                    />
                  )}
                </div>
              </>
            )}

            {/* HOA dues (shown if condo/townhome or if user has HOA) */}
            {!needsHoaSection(profile) && (
              <OptionRadioGroup
                fieldId="hh_has_hoa"
                label="Do you pay HOA or community association dues?"
                value={profile.hasHoa}
                onChange={(v) => updateField('hasHoa', v)}
                options={YES_NO_OPTS}
              />
            )}

            {needsHoaSection(profile) && (
              <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] grid grid-cols-1 sm:grid-cols-3 gap-4">
                <NumberField
                  id="hh_hoa_dues"
                  label="HOA dues"
                  essential={true}
                  prefix="$"
                  allowDecimal={true}
                  value={profile.hoaDues}
                  onChange={(v) => updateField('hoaDues', v)}
                  placeholder="e.g. 250"
                  error={mergedErrors.hoaDues}
                />
                <SelectField
                  id="hh_hoa_freq"
                  label="HOA billing frequency"
                  value={profile.hoaFrequency}
                  onChange={(v) => updateField('hoaFrequency', v || 'monthly')}
                  includeNotSure={false}
                  options={mapOpts('hoaFrequency')}
                />
                <NumberField
                  id="hh_hoa_spec"
                  label="Special assessments (optional)"
                  prefix="$"
                  allowDecimal={true}
                  value={profile.hoaSpecialAssessments}
                  onChange={(v) => updateField('hoaSpecialAssessments', v)}
                  placeholder="0"
                />
              </div>
            )}
          </div>
        )}

        {/* ---- SCREEN 14: INSURANCE AND PROTECTION ---- */}
        {currentScreen.id === 'insurance_protection' && (
          <div className="flex flex-col gap-6">
            <div className="p-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col gap-4">
              <h3 className="text-[16px] font-semibold text-[var(--ink)]">
                {isRenter(profile) ? 'Renters insurance' : 'Homeowners insurance'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <TextField
                  id="hh_ins_carrier"
                  label="Insurance carrier"
                  essential={true}
                  value={profile.homeInsuranceCarrier}
                  onChange={(v) => updateField('homeInsuranceCarrier', v)}
                  placeholder="e.g. State Farm, Travelers, Lemonade"
                />
                <NumberField
                  id="hh_ins_prem"
                  label="Premium amount"
                  essential={true}
                  prefix="$"
                  allowDecimal={true}
                  value={profile.homeInsurancePremium}
                  onChange={(v) => updateField('homeInsurancePremium', v)}
                  placeholder={isRenter(profile) ? 'e.g. 18' : 'e.g. 1650'}
                  error={mergedErrors.homeInsurancePremium}
                />
                <SelectField
                  id="hh_ins_freq"
                  label="Payment frequency"
                  value={profile.homeInsuranceFrequency}
                  onChange={(v) => updateField('homeInsuranceFrequency', v || 'annual')}
                  includeNotSure={false}
                  options={[
                    { value: 'annual', label: 'Yearly' },
                    { value: 'semi_annual', label: 'Twice a year' },
                    { value: 'monthly', label: 'Monthly' }
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <TextField
                  id="hh_ins_end"
                  label="Policy renewal date"
                  type="date"
                  value={profile.homeInsuranceEndDate}
                  onChange={(v) => updateField('homeInsuranceEndDate', v)}
                  error={mergedErrors.homeInsuranceEndDate}
                />
                <NumberField
                  id="hh_ins_ded"
                  label="Deductible (optional)"
                  prefix="$"
                  allowDecimal={true}
                  value={profile.homeInsuranceDeductible}
                  onChange={(v) => updateField('homeInsuranceDeductible', v)}
                  placeholder="e.g. 1000"
                  error={mergedErrors.homeInsuranceDeductible}
                />
                <NumberField
                  id="hh_ins_limit"
                  label="Coverage limit (optional)"
                  prefix="$"
                  allowDecimal={true}
                  value={profile.homeInsuranceCoverageLimit}
                  onChange={(v) => updateField('homeInsuranceCoverageLimit', v)}
                  placeholder="Optional"
                  error={mergedErrors.homeInsuranceCoverageLimit}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <OptionRadioGroup
                fieldId="hh_quake"
                label="Earthquake coverage?"
                columns={1}
                value={profile.hasEarthquakeCoverage}
                onChange={(v) => updateField('hasEarthquakeCoverage', v)}
                options={YES_NO_OPTS}
              />
              <OptionRadioGroup
                fieldId="hh_flood"
                label="Flood coverage?"
                columns={1}
                value={profile.hasFloodCoverage}
                onChange={(v) => updateField('hasFloodCoverage', v)}
                options={YES_NO_OPTS}
              />
              <OptionRadioGroup
                fieldId="hh_umbrella"
                label="Personal umbrella policy?"
                columns={1}
                value={profile.hasUmbrellaPolicy}
                onChange={(v) => updateField('hasUmbrellaPolicy', v)}
                options={YES_NO_OPTS}
              />
              <OptionRadioGroup
                fieldId="hh_auto_bundle"
                label="Auto insurance bundled with home?"
                columns={1}
                value={profile.autoInsBundledWithHome}
                onChange={(v) => updateField('autoInsBundledWithHome', v)}
                options={YES_NO_OPTS}
              />
            </div>

            {/* Home Warranty & Security */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="hh_hw_prov"
                label="Home warranty provider (optional)"
                value={profile.homeWarrantyProvider}
                onChange={(v) => updateField('homeWarrantyProvider', v)}
                placeholder="e.g. American Home Shield"
              />
              <TextField
                id="hh_hw_plan"
                label="Home warranty plan"
                value={profile.homeWarrantyPlan}
                onChange={(v) => updateField('homeWarrantyPlan', v)}
                placeholder="e.g. ShieldGold"
              />
              <NumberField
                id="hh_hw_cost"
                label="Home warranty monthly cost"
                prefix="$"
                allowDecimal={true}
                value={profile.homeWarrantyCost}
                onChange={(v) => updateField('homeWarrantyCost', v)}
                placeholder="e.g. 65"
                error={mergedErrors.homeWarrantyCost}
              />
              <TextField
                id="hh_hw_ren"
                label="Warranty renewal date"
                type="date"
                value={profile.homeWarrantyRenewalDate}
                onChange={(v) => updateField('homeWarrantyRenewalDate', v)}
                error={mergedErrors.homeWarrantyRenewalDate}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <TextField
                id="hh_sec_prov"
                label="Home security provider"
                value={profile.homeSecurityProvider}
                onChange={(v) => updateField('homeSecurityProvider', v)}
                placeholder="e.g. Ring, SimpliSafe, ADT"
              />
              <SelectField
                id="hh_sec_mon"
                label="Professionally monitored?"
                value={profile.homeSecurityMonitored}
                onChange={(v) => updateField('homeSecurityMonitored', v)}
                options={YES_NO_OPTS}
              />
              <NumberField
                id="hh_sec_fee"
                label="Monthly monitoring fee"
                prefix="$"
                allowDecimal={true}
                value={profile.homeSecurityMonthlyFee}
                onChange={(v) => updateField('homeSecurityMonthlyFee', v)}
                placeholder="e.g. 20"
                error={mergedErrors.homeSecurityMonthlyFee}
              />
            </div>
          </div>
        )}

        {/* ---- SCREEN 15: OUTDOOR & SERVICES (DETAILED) ---- */}
        {currentScreen.id === 'outdoor_services_screen' && (
          <div className="flex flex-col gap-6">
            <OutdoorServicesEditor
              services={profile.outdoorServices}
              onChange={(list) => updateField('outdoorServices', list)}
            />

            <OptionRadioGroup
              fieldId="hh_gen"
              label="Do you have a backup generator?"
              value={profile.hasBackupGenerator}
              onChange={(v) => updateField('hasBackupGenerator', v)}
              options={YES_NO_OPTS}
            />
            {profile.hasBackupGenerator === 'yes' && (
              <OptionRadioGroup
                fieldId="hh_gen_fuel"
                label="Generator fuel type"
                value={profile.backupGeneratorFuel}
                onChange={(v) => updateField('backupGeneratorFuel', v)}
                options={mapOpts('generatorFuel')}
              />
            )}

            <OptionRadioGroup
              fieldId="hh_hazard"
              label="Wildfire or flood hazard exposure for your property"
              value={profile.wildfireOrFloodRisk}
              onChange={(v) => updateField('wildfireOrFloodRisk', v)}
              options={mapOpts('riskLevel')}
            />
          </div>
        )}

        {/* ---- SCREEN 16: MAINTENANCE & BIG COSTS (OWNERS, DETAILED) ---- */}
        {currentScreen.id === 'maintenance_costs_screen' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField
                id="hh_maint_res"
                label="Monthly home maintenance budget / reserve"
                prefix="$"
                allowDecimal={true}
                value={profile.monthlyMaintenanceReserve}
                onChange={(v) => updateField('monthlyMaintenanceReserve', v)}
                placeholder="e.g. 250"
                helpText="Many homeowners set aside ~1% of home value per year divided by 12."
                error={mergedErrors.monthlyMaintenanceReserve}
              />
              <NumberField
                id="hh_repair_target"
                label="Emergency home repair fund target"
                prefix="$"
                allowDecimal={true}
                value={profile.emergencyRepairFundTarget}
                onChange={(v) => updateField('emergencyRepairFundTarget', v)}
                placeholder="e.g. 10000"
                error={mergedErrors.emergencyRepairFundTarget}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="hh_proj_summary"
                label="Planned major projects (next 1–3 years)"
                value={profile.plannedProjectsSummary}
                onChange={(v) => updateField('plannedProjectsSummary', v)}
                placeholder="e.g. Exterior paint, HVAC replacement"
              />
              <NumberField
                id="hh_proj_cost"
                label="Estimated total project cost"
                prefix="$"
                allowDecimal={true}
                value={profile.plannedProjectsEstimatedCost}
                onChange={(v) => updateField('plannedProjectsEstimatedCost', v)}
                placeholder="e.g. 8500"
                error={mergedErrors.plannedProjectsEstimatedCost}
              />
            </div>
          </div>
        )}

        {/* ---- SCREEN 17: REVIEW ---- */}
        {currentScreen.id === 'review_screen' && (
          <div className="flex flex-col gap-6">
            {mode === 'quick' && (
              <div className="p-4 rounded-[12px] border border-[var(--brand)] bg-[var(--surface-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-[var(--brand)] dark:text-[#7BB1FF] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[15px] font-semibold text-[var(--ink)]">
                      Want even better estimates?
                    </p>
                    <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                      Add insulation, roof/HVAC ages, outdoor services, and maintenance reserves in detailed mode.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('detailed')}
                  className="min-h-[44px] px-4 py-2 rounded-[8px] bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--brand-ink)] text-[14px] font-semibold cursor-pointer shrink-0"
                >
                  Add more detail for better estimates
                </button>
              </div>
            )}

            {/* Skipped High-Impact Items */}
            {completeness.missingItems.filter((m) => m.highImpact).length > 0 && (
              <div className="p-4 rounded-[12px] border border-[var(--warning-line)] bg-[var(--warning-soft)] flex flex-col gap-2">
                <p className="text-[14px] font-semibold text-[var(--warning)] flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>High-impact items left unanswered ({completeness.missingItems.filter((m) => m.highImpact).length})</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {completeness.missingItems
                    .filter((m) => m.highImpact)
                    .map((item) => (
                      <button
                        key={item.fieldKey}
                        type="button"
                        onClick={() => handleJumpToSection(item.sectionId)}
                        className="min-h-[36px] px-3 py-1 rounded-[8px] bg-[var(--surface)] border border-[var(--line)] text-[13px] font-semibold text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer"
                      >
                        Add {item.label}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Per-Section Edit Links */}
            <div className="divide-y divide-[var(--line)] border border-[var(--line)] rounded-[12px] overflow-hidden">
              {visibleSections
                .filter((s) => s.id !== 'review')
                .map((sec) => {
                  let summaryValue = 'Ready';
                  if (sec.id === 'home_basics') {
                    summaryValue = profile.address || formatHouseholdLabel('homeType', profile.homeType);
                  } else if (sec.id === 'household') {
                    summaryValue =
                      profile.adultsCount != null
                        ? `${profile.adultsCount} adult(s)${profile.childrenCount ? `, ${profile.childrenCount} child(ren)` : ''}`
                        : 'Not set';
                  } else if (sec.id === 'heating_cooling') {
                    summaryValue = [
                      profile.heating && formatHouseholdLabel('heating', profile.heating),
                      profile.cooling && formatHouseholdLabel('cooling', profile.cooling)
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Not set';
                  } else if (sec.id === 'appliances') {
                    summaryValue = profile.cookingFuel
                      ? `${formatHouseholdLabel('cookingFuel', profile.cookingFuel)} · ${formatHouseholdLabel('dryer', profile.dryer)}`
                      : 'Not set';
                  } else if (sec.id === 'pool_spa') {
                    summaryValue = formatHouseholdLabel('poolOrSpa', profile.poolOrSpa);
                  } else if (sec.id === 'solar_battery') {
                    summaryValue =
                      profile.hasSolar === 'yes' && solarKwLive
                        ? `${solarKwLive} kW (${formatHouseholdLabel('solarOwnership', profile.solarOwnership)})`
                        : formatHouseholdLabel('yesNoNotSure', profile.hasSolar);
                  } else if (sec.id === 'ev_charging') {
                    summaryValue = formatHouseholdLabel('evCount', profile.evCount);
                  } else if (sec.id === 'utilities') {
                    summaryValue = profile.noElectricService
                      ? 'Marked no electric'
                      : profile.electricUtility || 'Not set';
                  } else if (sec.id === 'internet_phone') {
                    summaryValue = profile.internetProvider || profile.mobileCarrier || 'Not set';
                  } else if (sec.id === 'housing_costs') {
                    if (isRenter(profile) && profile.monthlyRent != null) {
                      summaryValue = `$${Number(profile.monthlyRent).toLocaleString()}/mo rent`;
                    } else if (profile.mortgageMonthlyPI != null) {
                      summaryValue = `$${Number(profile.mortgageMonthlyPI).toLocaleString()}/mo mortgage`;
                    } else {
                      summaryValue = 'Not set';
                    }
                  } else if (sec.id === 'insurance') {
                    summaryValue = profile.homeInsuranceCarrier || 'Not set';
                  }

                  return (
                    <div
                      key={sec.id}
                      className="px-4 py-3 bg-[var(--surface)] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-[var(--ink)]">{sec.title}</div>
                        <div className="text-[13px] font-medium text-[var(--muted)] truncate">{summaryValue}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleJumpToSection(sec.id)}
                        className="min-h-[44px] px-3 py-2 rounded-[8px] text-[14px] font-semibold text-[var(--brand)] dark:text-[#7BB1FF] hover:bg-[var(--surface-hover)] cursor-pointer shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}
            </div>

            <OptionRadioGroup
              fieldId="hh_review_confirm"
              label="Looks right?"
              includeNotSure={false}
              value={profile?.questionnaireMeta?.reviewConfirmed || null}
              onChange={(v) => commitProfileUpdate({}, { reviewConfirmed: v })}
              options={[
                { value: 'yes', label: 'Yes, looks right — save my Household summary' }
              ]}
            />
          </div>
        )}
      </div>

      {/* Footer: Previous & One Primary Action "Continue" / "Finish" (Sticky on mobile) */}
      <div className="sticky bottom-0 z-10 px-4 sm:px-6 py-3.5 border-t border-[var(--line)] bg-[var(--surface)] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={safeIndex === 0}
          className="min-h-[44px] px-4 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-[15px] font-semibold text-[var(--ink)] cursor-pointer flex items-center gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={hasValidationErrors}
          className="min-h-[44px] px-5 py-2.5 rounded-[8px] bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--brand-ink)] text-[15px] font-semibold cursor-pointer flex items-center gap-1.5"
        >
          <span>{singleSectionId ? 'Save changes' : isLastScreen ? 'Finish' : 'Continue'}</span>
          {!isLastScreen && !singleSectionId && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
