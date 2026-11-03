import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Home,
  Users,
  Zap,
  Flame,
  Droplets,
  Car,
  BatteryCharging,
  Plus,
  Trash2,
  CheckCircle2,
  MapPin,
  HeartPulse,
  Stethoscope,
  CreditCard,
  Upload,
  Phone,
  ShoppingBag,
  X,
  Search,
  ExternalLink,
  Fuel,
  Building,
  Navigation,
  Loader2,
  AlertCircle,
  Shield,
  ShieldCheck,
  Gauge
} from 'lucide-react';
import {
  DWELLING_TYPES,
  UTILITY_REGIONS,
  calculateHouseholdAndFleetMetrics,
  FREE_EV_CHARGING_GUIDE,
  ZERO_APR_EV_MODELS,
  MAJOR_HEALTH_PLANS,
  POPULAR_CAR_DATABASE,
  POPULAR_CAR_MAKES,
  AUTO_INSURANCE_PROVIDERS,
  AUTO_INSURANCE_TYPES
} from '../utils/householdLifestyleEngine';

export default function HouseholdLifestyleHub({
  householdProfile,
  onUpdateProfile,
  onSyncUtilitiesToBills,
  onAskAiAdvisor
}) {
  const [section, setSection] = useState('household'); // 'household' | 'auto' | 'health'
  const [autoView, setAutoView] = useState('vehicles'); // 'vehicles' | 'chargers' | 'deals'
  const [showAddCar, setShowAddCar] = useState(false);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState('');

  // Zillow & Address Property Lookup State
  const [propertyUrlInput, setPropertyUrlInput] = useState('');
  const [isFetchingProperty, setIsFetchingProperty] = useState(false);
  const [propertyLookupError, setPropertyLookupError] = useState('');
  const [propertyLookupSuccess, setPropertyLookupSuccess] = useState('');
  const [isEditingPropertyLink, setIsEditingPropertyLink] = useState(false);

  const handleFetchProperty = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = propertyUrlInput.trim();
    if (!query) {
      setPropertyLookupError('Please enter a Zillow link or property address.');
      return;
    }
    setIsFetchingProperty(true);
    setPropertyLookupError('');
    setPropertyLookupSuccess('');

    try {
      const token = localStorage.getItem('klarity_token') || sessionStorage.getItem('klarity_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/household/zillow-lookup', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: query })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch house details.');
      }

      // Auto-populate householdProfile
      const updatedProfile = {
        ...householdProfile,
        address: data.address || householdProfile.address || '',
        street: data.street || householdProfile.street || '',
        city: data.city || householdProfile.city || '',
        state: data.state || householdProfile.state || '',
        zip: data.zip || householdProfile.zip || '',
        cityOrZip: data.cityOrZip || householdProfile.cityOrZip || '',
        sqFt: data.sqFt || householdProfile.sqFt || 2100,
        bedrooms: data.bedrooms || householdProfile.bedrooms || 3,
        bathrooms: data.bathrooms || householdProfile.bathrooms || 2,
        dwellingType: data.dwellingType || householdProfile.dwellingType || 'single_family',
        estimatedValue: data.estimatedValue || householdProfile.estimatedValue || '',
        utilityRegionId: data.utilityRegionId || householdProfile.utilityRegionId || 'pge_norcal',
        neighborhood: data.neighborhood || householdProfile.neighborhood || '',
        localHubs: data.localHubs || householdProfile.localHubs || '',
        zillowUrl: data.zillowUrl || query
      };

      onUpdateProfile(updatedProfile);
      setPropertyLookupSuccess(`Imported specs for ${data.address || 'Property'} (${data.bedrooms || 3} bd, ${data.bathrooms || 2} ba, ${data.sqFt || 2100} sq ft)!`);
      setPropertyUrlInput('');
      setIsEditingPropertyLink(false);
    } catch (err) {
      console.error('Property fetch error:', err);
      setPropertyLookupError(err.message || 'Could not fetch house details. You can enter details manually.');
    } finally {
      setIsFetchingProperty(false);
    }
  };

  const [newCar, setNewCar] = useState({
    year: 2025,
    make: 'Toyota',
    model: '',
    name: '',
    type: 'gas',
    ownership: 'lease', // 'lease' | 'financed' | 'owned'
    odometer: '',
    threeYearMileLimit: 36000,
    monthlyMiles: 1000,
    insuranceMonthly: 120,
    monthlyPayment: 399,
    fuelGrade: 'regular',
    mpgOrEfficiency: 32,
    batteryKwh: 0,
    freeChargingSharePercent: 30
  });

  const [selectedEvForChargers, setSelectedEvForChargers] = useState(null);
  const [carModelSearch, setCarModelSearch] = useState('');
  const [carSearchFocused, setCarSearchFocused] = useState(false);
  const carDropdownRef = useRef(null);

  const autoInsurance = householdProfile.autoInsurance || {
    provider: 'State Farm',
    policyType: 'full_coverage',
    deductible: 500,
    hasRoadside: true,
    hasGapCoverage: true,
    monthlyPremium: 140,
    policyNumber: ''
  };

  const handleAutoInsuranceChange = (patch) => {
    onUpdateProfile({
      ...householdProfile,
      autoInsurance: {
        ...autoInsurance,
        ...patch
      }
    });
  };

  const handleYearChange = (yr) => {
    setNewCar(prev => {
      const modelPart = prev.model || '';
      return {
        ...prev,
        year: Number(yr) || yr,
        name: modelPart ? `${yr} ${prev.make || ''} ${modelPart}`.replace(/\s+/g, ' ').trim() : ''
      };
    });
  };

  const handleMakeChange = (mk) => {
    setNewCar(prev => ({
      ...prev,
      make: mk,
      model: '',
      name: ''
    }));
    setCarModelSearch('');
    setCarSearchFocused(true);
  };

  const handleMileLimitChange = (val) => {
    const limitNum = Number(val) || 0;
    const derivedMonthly = limitNum > 0 ? Math.round(limitNum / 36) : newCar.monthlyMiles;
    setNewCar(prev => ({
      ...prev,
      threeYearMileLimit: val,
      monthlyMiles: derivedMonthly
    }));
  };

  const [newDoc, setNewDoc] = useState({
    name: '',
    specialty: '',
    office: '',
    phone: ''
  });

  // 0% APR EV Simulator state
  const [simEvMsrp, setSimEvMsrp] = useState(38500);
  const [simFedCredit, setSimFedCredit] = useState(7500);
  const [simStateRebate, setSimStateRebate] = useState(2500);
  const [simDownPayment, setSimDownPayment] = useState(2000);
  const [simTermMonths, setSimTermMonths] = useState(72);

  const metrics = useMemo(
    () => calculateHouseholdAndFleetMetrics(householdProfile),
    [householdProfile]
  );

  const health = householdProfile.health || {
    provider: 'Kaiser Permanente',
    planName: 'HMO',
    memberId: '',
    groupNumber: '',
    copays: { primaryCare: 15, specialist: 30, urgentCare: 20, er: 100, rxGeneric: 10 },
    doctors: [],
    cards: []
  };

  const [planSearchQuery, setPlanSearchQuery] = useState('');
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const planDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (planDropdownRef.current && !planDropdownRef.current.contains(event.target)) {
        setShowPlanDropdown(false);
      }
      if (carDropdownRef.current && !carDropdownRef.current.contains(event.target)) {
        setCarSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCars = useMemo(() => {
    const q = (carModelSearch || newCar.model || '').trim().toLowerCase();
    const make = (newCar.make || '').toLowerCase();
    return POPULAR_CAR_DATABASE.filter(c => {
      const matchesMake = !make || make === 'other' || c.make.toLowerCase() === make;
      if (!q) return matchesMake;
      const combined = `${c.fullName} ${c.model} ${c.type}`.toLowerCase();
      return matchesMake && combined.includes(q);
    }).slice(0, 16);
  }, [newCar.make, carModelSearch, newCar.model]);

  const handleSelectCarSuggestion = (car) => {
    const yr = newCar.year || 2025;
    const computedMonthlyMiles = newCar.threeYearMileLimit
      ? Math.round(Number(newCar.threeYearMileLimit) / 36)
      : (car.type === 'ev' ? 1000 : 900);

    setNewCar(prev => ({
      ...prev,
      make: car.make,
      model: car.model,
      name: `${yr} ${car.fullName}`,
      type: car.type,
      mpgOrEfficiency: car.mpgOrEfficiency,
      batteryKwh: car.batteryKwh || (car.type === 'ev' ? 75 : 0),
      fuelGrade: car.fuelGrade || (car.type === 'ev' ? 'electric' : 'regular'),
      insuranceMonthly: car.defaultInsurance || 120,
      monthlyMiles: computedMonthlyMiles,
      monthlyPayment: prev.ownership === 'owned' ? 0 : (prev.monthlyPayment || (prev.ownership === 'lease' ? 399 : 450))
    }));
    setCarModelSearch(car.model);
    setCarSearchFocused(false);
  };

  const filteredPlans = useMemo(() => {
    const q = planSearchQuery.trim().toLowerCase();
    if (!q) return MAJOR_HEALTH_PLANS;
    const terms = q.split(/\s+/).filter(Boolean);
    return MAJOR_HEALTH_PLANS.filter(p => {
      const combined = `${p.provider} ${p.planName} ${p.network || ''}`.toLowerCase();
      return terms.every(term => combined.includes(term));
    });
  }, [planSearchQuery]);

  const handleSelectPlan = (plan) => {
    handleHealthChange({
      provider: plan.provider,
      planName: plan.planName,
      copays: {
        ...(health.copays || {}),
        ...(plan.copays || {})
      }
    });
    setPlanSearchQuery('');
    setShowPlanDropdown(false);
  };

  const handleFieldChange = (field, value) => {
    const next = { ...householdProfile, [field]: value };
    if (field === 'dwellingType') {
      const found = DWELLING_TYPES.find(d => d.id === value);
      if (found) next.sqFt = found.defaultSqFt;
    }
    if (field === 'householdSize') {
      next.foodMonthly = Number(value) * 220;
    }
    onUpdateProfile(next);
  };

  const handleHealthChange = (patch) => {
    onUpdateProfile({
      ...householdProfile,
      health: {
        ...health,
        ...patch
      }
    });
  };

  const handleCopayChange = (key, val) => {
    handleHealthChange({
      copays: {
        ...(health.copays || {}),
        [key]: Number(val) || 0
      }
    });
  };

  const handleAddDoctor = (e) => {
    e.preventDefault();
    if (!newDoc.name.trim()) return;
    handleHealthChange({
      doctors: [
        ...(health.doctors || []),
        { id: `doc-${Date.now()}`, ...newDoc }
      ]
    });
    setNewDoc({ name: '', specialty: '', office: '', phone: '' });
    setShowAddDoctor(false);
  };

  const handleRemoveDoctor = (id) => {
    handleHealthChange({
      doctors: (health.doctors || []).filter(d => d.id !== id)
    });
  };

  const handleUploadInsuranceCard = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      handleHealthChange({
        cards: [
          ...(health.cards || []),
          { id: `ic-${Date.now()}`, name: file.name, dataUrl }
        ]
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveInsuranceCard = (id) => {
    handleHealthChange({
      cards: (health.cards || []).filter(c => c.id !== id)
    });
  };

  const handleAddVehicle = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const finalModel = (newCar.model || newCar.name || '').trim();
    if (!finalModel) return;
    const isOwned = newCar.ownership === 'owned';
    const computedName = `${newCar.year || ''} ${newCar.make || ''} ${finalModel}`.replace(/\s+/g, ' ').trim();
    const threeYrLimit = Number(newCar.threeYearMileLimit) || 36000;
    const monthlyAllowance = Math.round(threeYrLimit / 36);

    const item = {
      id: `veh-${Date.now()}`,
      year: Number(newCar.year) || new Date().getFullYear(),
      make: newCar.make || 'Custom',
      model: finalModel,
      name: computedName,
      type: newCar.type,
      ownership: newCar.ownership || 'lease',
      odometer: Number(newCar.odometer) || 0,
      threeYearMileLimit: threeYrLimit,
      monthlyMiles: Number(newCar.monthlyMiles) || monthlyAllowance || 1000,
      fuelGrade: newCar.fuelGrade || (newCar.type === 'ev' ? 'electric' : 'regular'),
      batteryKwh: newCar.type === 'ev' ? (Number(newCar.batteryKwh) || 75) : null,
      mpgOrEfficiency: Number(newCar.mpgOrEfficiency) || (newCar.type === 'ev' ? 28 : 30),
      insuranceMonthly: Number(newCar.insuranceMonthly) || 120,
      monthlyPayment: isOwned ? 0 : (Number(newCar.monthlyPayment) || 0),
      freeChargingSharePercent: newCar.type === 'ev' ? Number(newCar.freeChargingSharePercent || 30) : 0
    };
    onUpdateProfile({
      ...householdProfile,
      vehicles: [...(householdProfile.vehicles || []), item]
    });
    setNewCar({
      year: 2025,
      make: 'Toyota',
      model: '',
      name: '',
      type: 'gas',
      ownership: 'lease',
      odometer: '',
      threeYearMileLimit: 36000,
      monthlyMiles: 1000,
      insuranceMonthly: 120,
      monthlyPayment: 399,
      fuelGrade: 'regular',
      mpgOrEfficiency: 32,
      batteryKwh: 0,
      freeChargingSharePercent: 30
    });
    setCarModelSearch('');
    setShowAddCar(false);
    setCarSearchFocused(false);
  };

  const handleRemoveVehicle = (id) => {
    onUpdateProfile({
      ...householdProfile,
      vehicles: (householdProfile.vehicles || []).filter(v => v.id !== id)
    });
  };

  const handleUpdateVehicle = (id, patch) => {
    onUpdateProfile({
      ...householdProfile,
      vehicles: (householdProfile.vehicles || []).map(v => v.id === id ? { ...v, ...patch } : v)
    });
  };

  const handleSyncToBills = () => {
    if (onSyncUtilitiesToBills) {
      onSyncUtilitiesToBills(metrics);
      setSyncSuccess('Saved to Bills & Budgets');
      setTimeout(() => setSyncSuccess(''), 3500);
    }
  };

  const netFinancedEvAmount = Math.max(0, simEvMsrp - simFedCredit - simStateRebate - simDownPayment);
  const zeroAprMonthlyPayment = Math.round(netFinancedEvAmount / simTermMonths);
  const currentGasSavedPerCar = metrics.fleet.vehicles.find(v => v.type !== 'ev')?.potentialEvSwitchSavings || 195;
  const trueNetOutOfPocketMonthly = Math.max(0, zeroAprMonthlyPayment - currentGasSavedPerCar);
  const foodMonthly = Number(householdProfile.foodMonthly) || (metrics.people * 220);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Simple Clean Section Bar: Household | Auto | Health */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setSection('household')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              section === 'household' ? 'bg-[#18457c] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Household</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('auto')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              section === 'auto' ? 'bg-[#18457c] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Auto</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('health')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              section === 'health' ? 'bg-[#18457c] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Health</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {syncSuccess && (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{syncSuccess}</span>
            </span>
          )}
          {section === 'household' && (
            <button
              type="button"
              onClick={handleSyncToBills}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              Save to Bills
            </button>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 1: HOUSEHOLD (Electricity, Gas, Water, Food)              */}
      {/* ================================================================= */}
      {section === 'household' && (
        <div className="p-5 flex flex-col gap-4">
          {/* Zillow & Address Property Connection Status / Importer */}
          {householdProfile.zillowUrl && !isEditingPropertyLink ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-slate-50 border border-emerald-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">
                      {householdProfile.address || 'Property Connected'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      Zillow Link Connected
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap font-medium">
                    <span>{householdProfile.dwellingType ? DWELLING_TYPES.find(d => d.id === householdProfile.dwellingType)?.label || 'Single-Family' : 'Home'}</span>
                    <span>•</span>
                    <span>{householdProfile.bedrooms || 3} Beds, {householdProfile.bathrooms || 2} Baths</span>
                    <span>•</span>
                    <span>{Number(householdProfile.sqFt || 2100).toLocaleString()} sq ft</span>
                    {householdProfile.estimatedValue && (
                      <>
                        <span>•</span>
                        <span className="text-slate-700 font-semibold">Est. Value: {householdProfile.estimatedValue}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                <a
                  href={householdProfile.zillowUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-[#18457c] transition-colors shadow-2xs"
                >
                  <span>View on Zillow</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingPropertyLink(true);
                    setPropertyLookupSuccess('');
                    setPropertyLookupError('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-600 transition-colors shadow-2xs cursor-pointer"
                >
                  Change Link
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-200/80 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[#18457c]" />
                    <span>Import Property from Zillow or Street Address</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Auto-fetches square footage, bedrooms, bathrooms, estimated home value, local utility rate region, and surrounding shopping intelligence.
                  </p>
                </div>
                {householdProfile.zillowUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPropertyLink(false);
                      setPropertyLookupError('');
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleFetchProperty} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={propertyUrlInput}
                    onChange={e => setPropertyUrlInput(e.target.value)}
                    placeholder="Paste Zillow URL (zillow.com/homedetails/...) or street address (e.g. 485 N 1st St, San Jose, CA)..."
                    className="w-full text-xs font-medium pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#18457c]/20 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isFetchingProperty || !propertyUrlInput.trim()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#18457c] hover:bg-[#12345e] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                >
                  {isFetchingProperty ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Fetching Specs...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Fetch House Specs</span>
                    </>
                  )}
                </button>
              </form>

              {propertyLookupError && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{propertyLookupError}</span>
                </div>
              )}
            </div>
          )}

          {/* Quick Inputs Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Home Type</span>
              <select
                value={householdProfile.dwellingType}
                onChange={e => handleFieldChange('dwellingType', e.target.value)}
                className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none cursor-pointer"
              >
                {DWELLING_TYPES.map(d => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Household Size</span>
              <div className="flex items-center justify-between mt-0.5">
                <button
                  type="button"
                  onClick={() => handleFieldChange('householdSize', Math.max(1, (Number(householdProfile.householdSize) || 1) - 1))}
                  className="w-6 h-6 rounded bg-white border border-slate-200 font-bold text-slate-700 cursor-pointer"
                >
                  -
                </button>
                <span className="font-bold text-slate-900">{householdProfile.householdSize}</span>
                <button
                  type="button"
                  onClick={() => handleFieldChange('householdSize', Math.min(12, (Number(householdProfile.householdSize) || 1) + 1))}
                  className="w-6 h-6 rounded bg-white border border-slate-200 font-bold text-slate-700 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Utility</span>
              <select
                value={householdProfile.utilityRegionId}
                onChange={e => handleFieldChange('utilityRegionId', e.target.value)}
                className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none cursor-pointer truncate"
              >
                {UTILITY_REGIONS.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">City / ZIP</span>
              <input
                type="text"
                value={householdProfile.cityOrZip || ''}
                onChange={e => handleFieldChange('cityOrZip', e.target.value)}
                placeholder="City or ZIP"
                className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Home Sq Ft</span>
              <input
                type="number"
                value={householdProfile.sqFt || 2100}
                onChange={e => handleFieldChange('sqFt', Number(e.target.value) || 2000)}
                className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <span className="font-bold text-emerald-800">PG&E CARE</span>
              <input
                type="checkbox"
                checked={Boolean(householdProfile.hasCareDiscount)}
                onChange={e => handleFieldChange('hasCareDiscount', e.target.checked)}
                className="rounded text-emerald-600 cursor-pointer"
              />
            </div>
          </div>

          {/* 4 Simple Household Expense Cards: Electricity, Gas, Water, Food */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Electricity</span>
                </span>
                <span className="text-[10px] font-bold text-amber-700">{metrics.utilities.totalKwh} kWh</span>
              </div>
              <div className="text-xl font-bold text-slate-900 mt-2">
                ${metrics.utilities.homeElectricCost + metrics.utilities.evHomeChargingCost}/mo
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>Gas</span>
                </span>
                <span className="text-[10px] font-bold text-orange-700">{metrics.utilities.monthlyTherms} Therms</span>
              </div>
              <div className="text-xl font-bold text-slate-900 mt-2">
                ${metrics.utilities.naturalGasCost}/mo
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-blue-500" />
                  <span>Water & Trash</span>
                </span>
                <span className="text-[10px] font-bold text-blue-700">{metrics.utilities.monthlyWaterGallons.toLocaleString()} Gal</span>
              </div>
              <div className="text-xl font-bold text-slate-900 mt-2">
                ${metrics.utilities.waterTrashTotalCost}/mo
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Food</span>
                </span>
                <span className="text-[10px] text-slate-400">Groceries</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xl font-bold text-slate-900">$</span>
                <input
                  type="number"
                  value={foodMonthly}
                  onChange={e => handleFieldChange('foodMonthly', Number(e.target.value) || 0)}
                  className="w-24 text-xl font-bold text-slate-900 bg-transparent border-b border-slate-200 focus:border-[#18457c] focus:outline-none"
                />
                <span className="text-xs text-slate-500">/mo</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SECTION 2: AUTO (Vehicle Fleet, Lease Tracking, Auto Insurance)   */}
      {/* ================================================================= */}
      {section === 'auto' && (
        <div className="p-5 flex flex-col gap-4">
          {/* Fleet Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Car className="w-4 h-4 text-[#18457c]" />
                <span>Vehicle Fleet ({metrics.fleet.vehicles.length})</span>
              </span>
              <span className="text-[11px] text-slate-500 block">
                Manage cars, lease mileage limits, and auto insurance coverage.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowAddCar(!showAddCar)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#18457c] hover:bg-[#133763] text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Car</span>
            </button>
          </div>

          {/* Add Car Form (Structured with Separate Boxes & Auto-Filling Specs) */}
          {showAddCar && (
            <form
              onSubmit={handleAddVehicle}
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3.5 text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-[#18457c]" />
                  <span>Add Vehicle to Fleet</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddCar(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Row 1: Separate Boxes for Year, Make, Model */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Box 1: Year */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Model Year
                  </label>
                  <select
                    value={newCar.year || 2025}
                    onChange={e => handleYearChange(e.target.value)}
                    className="w-full font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                  >
                    {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Box 2: Make */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Vehicle Make
                  </label>
                  <select
                    value={newCar.make || 'Toyota'}
                    onChange={e => handleMakeChange(e.target.value)}
                    className="w-full font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                  >
                    {POPULAR_CAR_MAKES.map(mk => (
                      <option key={mk} value={mk}>{mk}</option>
                    ))}
                  </select>
                </div>

                {/* Box 3: Model (with auto-suggest popup) */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 relative" ref={carDropdownRef}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Vehicle Model
                    </label>
                    <span className="text-[9px] text-[#18457c] font-semibold">Auto-fills specs</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Type or select model..."
                    value={carModelSearch || newCar.model || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setCarModelSearch(val);
                      setNewCar(prev => ({
                        ...prev,
                        model: val,
                        name: `${prev.year || 2025} ${prev.make || ''} ${val}`.replace(/\s+/g, ' ').trim()
                      }));
                      setCarSearchFocused(true);
                    }}
                    onFocus={() => setCarSearchFocused(true)}
                    className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                  />

                  {/* Dropdown Suggestions matching Make & Model */}
                  {carSearchFocused && filteredCars.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl z-30 py-1 divide-y divide-slate-100">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between bg-slate-50/80">
                        <span>{newCar.make} Models ({filteredCars.length})</span>
                        <span className="text-[9px] text-slate-400 font-normal">Click to auto-fill specs</span>
                      </div>
                      {filteredCars.map((car, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectCarSuggestion(car)}
                          className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <div>
                            <span className="font-bold text-slate-900 text-xs">{car.model}</span>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                              {car.type === 'ev' ? (
                                <span className="text-emerald-700 font-semibold">⚡ {car.mpgOrEfficiency} kWh/100mi • {car.batteryKwh} kWh</span>
                              ) : (
                                <span className="text-blue-700 font-semibold">⛽ {car.mpgOrEfficiency} MPG • {car.fuelGrade === 'premium' ? 'Premium 91+' : 'Regular 87'}</span>
                              )}
                              <span>•</span>
                              <span className="uppercase text-[9px] font-bold">{car.type}</span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                            car.type === 'ev'
                              ? 'bg-emerald-100 text-emerald-800'
                              : car.type === 'hybrid'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}>
                            {car.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Separate Boxes for Lease/Ownership, Odometer, 3-Year Mile Limit, Monthly Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Box 4: Ownership / Lease */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Financing / Lease Status
                  </label>
                  <select
                    value={newCar.ownership || 'lease'}
                    onChange={e => {
                      const own = e.target.value;
                      setNewCar(prev => ({
                        ...prev,
                        ownership: own,
                        monthlyPayment: own === 'owned' ? 0 : (prev.monthlyPayment || 399)
                      }));
                    }}
                    className="w-full font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="lease">Lease</option>
                    <option value="financed">Financed (Car Loan)</option>
                    <option value="owned">Owned Outright (Paid Off)</option>
                  </select>
                </div>

                {/* Box 5: Current Odometer */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Current Odometer
                  </label>
                  <div className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="number"
                      placeholder="e.g. 14,200"
                      value={newCar.odometer || ''}
                      onChange={e => setNewCar({ ...newCar, odometer: e.target.value })}
                      className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">mi</span>
                  </div>
                </div>

                {/* Box 6: 3-Year Mile Limit */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      3-Year Mile Limit
                    </label>
                    <span className="text-[9px] text-emerald-700 font-bold">
                      ~{Math.round((Number(newCar.threeYearMileLimit) || 36000) / 36)} mi/mo
                    </span>
                  </div>
                  <select
                    value={newCar.threeYearMileLimit || 36000}
                    onChange={e => handleMileLimitChange(e.target.value)}
                    className="w-full font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="30000">30,000 miles (10,000 mi/yr)</option>
                    <option value="36000">36,000 miles (12,000 mi/yr - Standard)</option>
                    <option value="45000">45,000 miles (15,000 mi/yr - High)</option>
                    <option value="60000">60,000 miles (20,000 mi/yr)</option>
                  </select>
                </div>

                {/* Box 7: Monthly Payment */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    {newCar.ownership === 'lease' ? 'Monthly Lease Payment' : newCar.ownership === 'financed' ? 'Monthly Loan Payment' : 'Payment Status'}
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      disabled={newCar.ownership === 'owned'}
                      value={newCar.ownership === 'owned' ? 0 : newCar.monthlyPayment}
                      onChange={e => setNewCar({ ...newCar, monthlyPayment: Number(e.target.value) || 0 })}
                      placeholder={newCar.ownership === 'owned' ? 'Paid Off ($0)' : 'e.g. 399'}
                      className="w-full font-bold text-slate-900 bg-transparent focus:outline-none disabled:text-slate-400"
                    />
                    <span className="text-[10px] text-slate-400">/mo</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Auto-filled Specs Row (App automatically puts everything else) */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Powertrain (Auto)</span>
                  <span className="font-bold text-slate-900 uppercase text-xs mt-0.5 block">{newCar.type}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Fuel / Energy (Auto)</span>
                  <span className="font-bold text-slate-900 text-xs mt-0.5 block capitalize">
                    {newCar.type === 'ev' ? `⚡ Electric (${newCar.batteryKwh || 75} kWh)` : newCar.fuelGrade === 'premium' ? 'Premium 91+' : 'Regular 87'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Rated Efficiency (Auto)</span>
                  <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                    {newCar.type === 'ev' ? `${newCar.mpgOrEfficiency} kWh/100mi` : `${newCar.mpgOrEfficiency} MPG`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Est. Insurance (Auto)</span>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <span className="font-bold text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      value={newCar.insuranceMonthly}
                      onChange={e => setNewCar({ ...newCar, insuranceMonthly: Number(e.target.value) || 0 })}
                      className="w-full font-bold text-slate-900 bg-transparent text-xs focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">/mo</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCar(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-2xs"
                >
                  Add Vehicle to Fleet
                </button>
              </div>
            </form>
          )}

          {/* Vehicle Fleet Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {metrics.fleet.vehicles.map(v => (
              <div key={v.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">
                      {v.name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold uppercase text-slate-700">
                      {v.type}
                    </span>
                    {v.ownership && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        v.ownership === 'lease'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : v.ownership === 'financed'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {v.ownership === 'lease' ? 'Lease' : v.ownership === 'financed' ? 'Financed' : 'Owned'}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {v.type === 'ev' ? `${v.mpgOrEfficiency} kWh/100mi` : `${v.mpgOrEfficiency} MPG (${v.fuelGrade === 'premium' ? 'Premium 91+' : v.fuelGrade === 'diesel' ? 'Diesel' : 'Regular 87'})`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveVehicle(v.id)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Odometer & 3-Year Mileage Tracking Line */}
                {(v.odometer || v.threeYearMileLimit) && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200/60 flex-wrap">
                    {v.odometer ? (
                      <span>Odometer: <strong className="text-slate-900">{Number(v.odometer).toLocaleString()} mi</strong></span>
                    ) : null}
                    {v.odometer && v.threeYearMileLimit ? <span>•</span> : null}
                    {v.threeYearMileLimit ? (
                      <span>3-Yr Lease Limit: <strong className="text-slate-900">{Number(v.threeYearMileLimit).toLocaleString()} mi</strong> (~{Math.round(Number(v.threeYearMileLimit) / 36)} mi/mo)</span>
                    ) : null}
                  </div>
                )}

                {/* Costs Breakdown Grid */}
                <div className={`grid ${v.monthlyPayment > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-2 bg-white p-2.5 rounded-lg border border-slate-200/70`}>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{v.type === 'ev' ? 'Charging' : 'Fuel'}</span>
                    <span className="font-bold text-slate-900">${v.monthlyFuelOrChargeCost}/mo</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Insurance</span>
                    <span className="font-bold text-slate-900">${v.insuranceMonthly}/mo</span>
                  </div>
                  {v.monthlyPayment > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-400 block">{v.ownership === 'lease' ? 'Lease' : 'Payment'}</span>
                      <span className="font-bold text-slate-900">${v.monthlyPayment}/mo</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total</span>
                    <span className="font-bold text-[#18457c]">${v.totalMonthlyVehicleCost}/mo</span>
                  </div>
                </div>

                {/* ONLY FOR ELECTRIC VEHICLES: Free EV Chargers Near Me button */}
                {v.type === 'ev' && (
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedEvForChargers(v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Free EV Chargers Near Me</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-800">
                      <span>Free Charging: <strong>{v.freeChargingSharePercent || 0}%</strong></span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={v.freeChargingSharePercent || 0}
                        onChange={e => handleUpdateVehicle(v.id, { freeChargingSharePercent: Number(e.target.value) })}
                        className="w-24 accent-emerald-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ================================================================= */}
          {/* AUTO INSURANCE POLICY & COVERAGE SECTION                          */}
          {/* ================================================================= */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#18457c] text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Auto Insurance & Coverage Policy</h4>
                  <p className="text-[10px] text-slate-500">
                    Select your active auto insurance carrier, policy coverage type, and deductibles across your vehicles.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[10px] text-slate-400 font-semibold">Total Premium:</span>
                <span className="font-bold text-[#18457c] text-sm">
                  ${autoInsurance.monthlyPremium || 140}/mo
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {/* Provider Selection */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-400 block mb-1">Insurance Provider</span>
                <select
                  value={autoInsurance.provider || 'State Farm'}
                  onChange={e => handleAutoInsuranceChange({ provider: e.target.value })}
                  className="w-full font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                >
                  {AUTO_INSURANCE_PROVIDERS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Policy Type Selection */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-400 block mb-1">Policy Coverage Type</span>
                <select
                  value={autoInsurance.policyType || 'full_coverage'}
                  onChange={e => handleAutoInsuranceChange({ policyType: e.target.value })}
                  className="w-full font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                >
                  {AUTO_INSURANCE_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Deductible */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-400 block mb-1">Comprehensive & Collision Deductible</span>
                <select
                  value={autoInsurance.deductible || 500}
                  onChange={e => handleAutoInsuranceChange({ deductible: Number(e.target.value) || 500 })}
                  className="w-full font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="250">$250 Deductible (Low Out-Of-Pocket)</option>
                  <option value="500">$500 Deductible (Standard)</option>
                  <option value="1000">$1,000 Deductible (Lower Premium)</option>
                  <option value="2000">$2,000 Deductible (High Deductible)</option>
                </select>
              </div>

              {/* Monthly Premium Input */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-semibold text-slate-400 block mb-1">Monthly Insurance Premium</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    value={autoInsurance.monthlyPremium || ''}
                    onChange={e => handleAutoInsuranceChange({ monthlyPremium: Number(e.target.value) || 0 })}
                    placeholder="140"
                    className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">/mo</span>
                </div>
              </div>
            </div>

            {/* Endorsement Pills */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={Boolean(autoInsurance.hasRoadside)}
                  onChange={e => handleAutoInsuranceChange({ hasRoadside: e.target.checked })}
                  className="rounded text-[#18457c] accent-[#18457c]"
                />
                <span>Roadside Assistance Included</span>
              </label>

              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={Boolean(autoInsurance.hasGapCoverage)}
                  onChange={e => handleAutoInsuranceChange({ hasGapCoverage: e.target.checked })}
                  className="rounded text-[#18457c] accent-[#18457c]"
                />
                <span>GAP Insurance Protection (Lease / Loan)</span>
              </label>

              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={Boolean(autoInsurance.hasRentalReimbursement)}
                  onChange={e => handleAutoInsuranceChange({ hasRentalReimbursement: e.target.checked })}
                  className="rounded text-[#18457c] accent-[#18457c]"
                />
                <span>Rental Car Reimbursement</span>
              </label>
            </div>
          </div>

          {/* Free EV Chargers Modal (Triggered exclusively from EV car cards) */}
          {selectedEvForChargers && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Free EV Chargers for {selectedEvForChargers.name}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Complimentary Level 2 and DC fast charging locations near you.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEvForChargers(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {FREE_EV_CHARGING_GUIDE.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{item.category}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">{item.cost}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{item.locations}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedEvForChargers(null)}
                    className="px-4 py-1.5 rounded-xl bg-[#18457c] text-white text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* SECTION 3: HEALTH (Insurance, Copays, Doctor Offices, Cards)      */}
      {/* ================================================================= */}
      {section === 'health' && (
        <div className="p-5 flex flex-col gap-5 text-xs">
          {/* Search Major Health Insurances & Select Exact Plan */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-[#18457c]" />
                  <span>Search & Select Major Insurance Plan</span>
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Search UnitedHealthcare, Kaiser, Blue Cross Blue Shield, Aetna, Cigna, Humana, Medi-Cal, or Medicare to auto-fill your exact plan and copays.
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                {health.provider && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60 text-[10px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{health.provider}{health.planName ? ` • ${health.planName}` : ''}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="relative" ref={planDropdownRef}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 focus-within:border-[#18457c] focus-within:ring-1 focus-within:ring-[#18457c] transition-all">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={planSearchQuery}
                  onChange={e => {
                    setPlanSearchQuery(e.target.value);
                    setShowPlanDropdown(true);
                  }}
                  onFocus={() => setShowPlanDropdown(true)}
                  placeholder="Type insurance name or plan (e.g. UnitedHealthcare Choice Plus, Kaiser HMO, Anthem PPO, Aetna, Medi-Cal)..."
                  className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                {planSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPlanSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Menu */}
              {showPlanDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1.5 max-h-72 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl z-30 py-1 divide-y divide-slate-100">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Major Health Insurance Plans ({filteredPlans.length})</span>
                    <button
                      type="button"
                      onClick={() => setShowPlanDropdown(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {filteredPlans.length > 0 ? (
                    filteredPlans.map(plan => {
                      const isSelected = health.provider === plan.provider && health.planName === plan.planName;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => handleSelectPlan(plan)}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-sky-50/70 font-semibold text-[#18457c]' : 'text-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">{plan.provider}</span>
                              <span className="text-[11px] text-slate-600 font-medium">{plan.planName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold">{plan.network}</span>
                              <span>PCP: ${plan.copays.primaryCare}</span>
                              <span>•</span>
                              <span>Spec: ${plan.copays.specialist}</span>
                              <span>•</span>
                              <span>Urgent: ${plan.copays.urgentCare}</span>
                              <span>•</span>
                              <span>ER: ${plan.copays.er}</span>
                              <span>•</span>
                              <span>Rx: ${plan.copays.rxGeneric}</span>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-slate-500">
                      <p className="text-xs">No exact matches found for "{planSearchQuery}"</p>
                      <p className="text-[10px] text-slate-400 mt-1">Don't have one of these major plans? You can write your insurance details manually below.</p>
                    </div>
                  )}

                  {/* Manual Write Option */}
                  <div className="p-2 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setShowPlanDropdown(false)}
                      className="w-full text-center py-1.5 px-2 rounded-lg text-xs font-semibold text-[#18457c] hover:bg-white border border-slate-200 transition-colors cursor-pointer"
                    >
                      ✏️ Don't have one of these major insurances? Write your provider & plan manually below
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Plan Details & Member Info (Fully editable manually or via search selection) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Insurance Provider</span>
              <input
                type="text"
                value={health.provider || ''}
                onChange={e => handleHealthChange({ provider: e.target.value })}
                placeholder="e.g. UnitedHealthcare, Kaiser, or write your own"
                className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Exact Plan Name</span>
              <input
                type="text"
                value={health.planName || ''}
                onChange={e => handleHealthChange({ planName: e.target.value })}
                placeholder="e.g. Choice Plus (PPO), HMO, or custom"
                className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Member ID / MRN</span>
              <input
                type="text"
                value={health.memberId || ''}
                onChange={e => handleHealthChange({ memberId: e.target.value })}
                placeholder="ID / MRN #"
                className="w-full font-mono font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Group #</span>
              <input
                type="text"
                value={health.groupNumber || ''}
                onChange={e => handleHealthChange({ groupNumber: e.target.value })}
                placeholder="Group #"
                className="w-full font-mono font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
              />
            </div>
          </div>

          {/* Copays Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Primary Care Copay</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className="font-bold text-slate-500">$</span>
                <input
                  type="number"
                  value={health.copays?.primaryCare ?? 15}
                  onChange={e => handleCopayChange('primaryCare', e.target.value)}
                  className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Specialist Copay</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className="font-bold text-slate-500">$</span>
                <input
                  type="number"
                  value={health.copays?.specialist ?? 30}
                  onChange={e => handleCopayChange('specialist', e.target.value)}
                  className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Urgent Care Copay</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className="font-bold text-slate-500">$</span>
                <input
                  type="number"
                  value={health.copays?.urgentCare ?? 20}
                  onChange={e => handleCopayChange('urgentCare', e.target.value)}
                  className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">ER Copay</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className="font-bold text-slate-500">$</span>
                <input
                  type="number"
                  value={health.copays?.er ?? 100}
                  onChange={e => handleCopayChange('er', e.target.value)}
                  className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Generic Rx Copay</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className="font-bold text-slate-500">$</span>
                <input
                  type="number"
                  value={health.copays?.rxGeneric ?? 10}
                  onChange={e => handleCopayChange('rxGeneric', e.target.value)}
                  className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Doctor Offices & Insurance Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Doctor Offices */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-[#18457c]" />
                  <span>Doctor Offices</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddDoctor(!showAddDoctor)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#18457c] text-white font-semibold text-[11px] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Doctor</span>
                </button>
              </div>

              {showAddDoctor && (
                <form onSubmit={handleAddDoctor} className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    required
                    placeholder="Doctor / Clinic Name"
                    value={newDoc.name}
                    onChange={e => setNewDoc({ ...newDoc, name: e.target.value })}
                    className="px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="Specialty (e.g. Primary, Dental)"
                    value={newDoc.specialty}
                    onChange={e => setNewDoc({ ...newDoc, specialty: e.target.value })}
                    className="px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="Office Location / Address"
                    value={newDoc.office}
                    onChange={e => setNewDoc({ ...newDoc, office: e.target.value })}
                    className="px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Phone #"
                      value={newDoc.phone}
                      onChange={e => setNewDoc({ ...newDoc, phone: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200"
                    />
                    <button type="submit" className="px-3 py-1.5 rounded bg-emerald-600 text-white font-bold cursor-pointer">
                      Add
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {(health.doctors || []).map(doc => (
                  <div key={doc.id} className="p-2.5 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900">{doc.name} {doc.specialty ? <span className="font-normal text-slate-500">• {doc.specialty}</span> : null}</div>
                      <div className="text-[11px] text-slate-500">{doc.office} {doc.phone ? `• ${doc.phone}` : ''}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDoctor(doc.id)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Insurance Cards */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Insurance Cards</span>
                </span>
                <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>Upload Card</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadInsuranceCard}
                    className="hidden"
                  />
                </label>
              </div>

              {(health.cards || []).length === 0 ? (
                <div className="p-6 bg-white rounded-lg border border-dashed border-slate-200 text-center text-slate-400 text-[11px]">
                  Upload front/back photos of your Health, Medicare, Medi-Cal, or Dental cards.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {(health.cards || []).map(c => (
                    <div key={c.id} className="relative bg-white p-2 rounded-lg border border-slate-200">
                      <img src={c.dataUrl} alt={c.name} className="w-full h-24 object-cover rounded" />
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] font-semibold text-slate-700 truncate">{c.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInsuranceCard(c.id)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
