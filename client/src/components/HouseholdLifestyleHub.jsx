import React, { useState, useMemo } from 'react';
import {
  Home,
  Users,
  Zap,
  Flame,
  Droplets,
  Car,
  BatteryCharging,
  Sparkles,
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
  AlertCircle
} from 'lucide-react';
import {
  DWELLING_TYPES,
  UTILITY_REGIONS,
  calculateHouseholdAndFleetMetrics,
  FREE_EV_CHARGING_GUIDE,
  ZERO_APR_EV_MODELS
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
    } catch (err) {
      console.error('Property fetch error:', err);
      setPropertyLookupError(err.message || 'Could not fetch house details. You can enter details manually.');
    } finally {
      setIsFetchingProperty(false);
    }
  };

  const [newCar, setNewCar] = useState({
    name: '',
    type: 'gas',
    mpgOrEfficiency: 30,
    monthlyMiles: 900,
    insuranceMonthly: 120,
    monthlyPayment: 0,
    freeChargingSharePercent: 30
  });

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
    e.preventDefault();
    if (!newCar.name.trim()) return;
    const item = {
      id: `veh-${Date.now()}`,
      name: newCar.name.trim(),
      type: newCar.type,
      mpgOrEfficiency: Number(newCar.mpgOrEfficiency) || (newCar.type === 'ev' ? 28 : 30),
      monthlyMiles: Number(newCar.monthlyMiles) || 900,
      insuranceMonthly: Number(newCar.insuranceMonthly) || 120,
      monthlyPayment: Number(newCar.monthlyPayment) || 0,
      freeChargingSharePercent: newCar.type === 'ev' ? Number(newCar.freeChargingSharePercent || 30) : 0
    };
    onUpdateProfile({
      ...householdProfile,
      vehicles: [...(householdProfile.vehicles || []), item]
    });
    setNewCar({
      name: '',
      type: 'gas',
      mpgOrEfficiency: 30,
      monthlyMiles: 900,
      insuranceMonthly: 120,
      monthlyPayment: 0,
      freeChargingSharePercent: 30
    });
    setShowAddCar(false);
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
          {onAskAiAdvisor && (
            <button
              type="button"
              onClick={() => {
                if (section === 'household') {
                  onAskAiAdvisor(`Review my Household setup (${metrics.dwelling.label}, ${metrics.people} people, PG&E $${metrics.utilities.totalPgeCombinedBill}/mo, Water $${metrics.utilities.waterTrashTotalCost}/mo, Food $${foodMonthly}/mo).`);
                } else if (section === 'auto') {
                  onAskAiAdvisor(`Review my Auto fleet (${metrics.fleet.vehicles.length} cars, Gas $${metrics.fleet.totalMonthlyGasCost}/mo) and show me free EV chargers nearby and the best 0% APR EV deals.`);
                } else {
                  onAskAiAdvisor(`Review my Health coverage (${health.provider}, copays, and doctors) and suggest ways to optimize medical expenses.`);
                }
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[#18457c] text-xs font-bold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 1: HOUSEHOLD (Electricity, Gas, Water, Food)              */}
      {/* ================================================================= */}
      {section === 'household' && (
        <div className="p-5 flex flex-col gap-4">
          {/* Zillow & Address Property Importer */}
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
                <a
                  href={householdProfile.zillowUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#18457c] hover:underline"
                >
                  <span>View on Zillow</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
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
                    <Sparkles className="w-3.5 h-3.5" />
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

            {propertyLookupSuccess && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{propertyLookupSuccess}</span>
              </div>
            )}
          </div>

          {/* Residence & Location-Aware Intelligence Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verified Residence & Utility Region</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="text-sm font-bold text-slate-900">
                    {householdProfile.address || householdProfile.cityOrZip || 'Bay Area, California'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700">
                  {DWELLING_TYPES.find(d => d.id === householdProfile.dwellingType)?.label || 'Single-Family'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 font-bold text-[#18457c]">
                  {householdProfile.bedrooms || 3} Beds • {householdProfile.bathrooms || 2} Baths • {householdProfile.sqFt || 2100} sq ft
                </span>
                {householdProfile.estimatedValue && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 font-bold text-emerald-800">
                    Est. Value {householdProfile.estimatedValue}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 font-bold text-amber-800">
                  {UTILITY_REGIONS.find(r => r.id === householdProfile.utilityRegionId)?.electricProvider || 'PG&E'}
                </span>
              </div>
            </div>

            {/* Neighborhood & Surrounding Hubs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Neighborhood / Metro Area</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {householdProfile.neighborhood || (householdProfile.cityOrZip ? `${householdProfile.cityOrZip} Area` : 'Silicon Valley / Northern California')}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Nearby Shopping & Energy Hubs</span>
                <p className="text-slate-700 mt-0.5">
                  {householdProfile.localHubs || "Costco Wholesale, Trader Joe's, Safeway, Whole Foods, Arco, Rotten Robbie, Tesla Superchargers & Electrify America"}
                </p>
              </div>
            </div>

            {/* Location-Aware AI Quick Action Pills */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#18457c]" />
                <span>Ask AI About Your Area:</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const loc = householdProfile.address || householdProfile.cityOrZip || 'my area';
                    onAskAiAdvisor(`Where is the cheapest gas near my home at ${loc}, and which of my connected credit cards should I use to get the highest cash back?`);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Fuel className="w-3.5 h-3.5 text-amber-600" />
                  <span>Cheapest Gas & Best Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const city = householdProfile.cityOrZip || 'my city';
                    const util = UTILITY_REGIONS.find(r => r.id === householdProfile.utilityRegionId)?.name || 'local utility';
                    onAskAiAdvisor(`What electric cars have 0% APR deals right now near ${city}, and how much will I save on monthly fuel vs charging at home on ${util}?`);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Car className="w-3.5 h-3.5 text-emerald-600" />
                  <span>0% APR Electric Cars Near Me</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const city = householdProfile.cityOrZip || 'my area';
                    onAskAiAdvisor(`Where are the cheapest groceries near ${city} and which of my cards gets the highest cash back on groceries?`);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#18457c] border border-blue-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#18457c]" />
                  <span>Cheap Groceries & Cash Back</span>
                </button>
              </div>
            </div>
          </div>

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
      {/* SECTION 2: AUTO (Vehicles, Gas, Free Chargers, 0% APR Deals)      */}
      {/* ================================================================= */}
      {section === 'auto' && (
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {[
                { id: 'vehicles', label: `Vehicles (${metrics.fleet.vehicles.length})` },
                { id: 'chargers', label: 'Free Chargers' },
                { id: 'deals', label: '0% APR Deals' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAutoView(tab.id)}
                  className={`px-3 py-1 rounded-lg cursor-pointer ${
                    autoView === tab.id ? 'bg-white text-[#18457c] shadow-2xs font-bold' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {autoView === 'vehicles' && (
              <button
                type="button"
                onClick={() => setShowAddCar(!showAddCar)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#18457c] text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Car</span>
              </button>
            )}
          </div>

          {autoView === 'vehicles' && (
            <>
              {showAddCar && (
                <form onSubmit={handleAddVehicle} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="Car (e.g. Toyota Camry)"
                    value={newCar.name}
                    onChange={e => setNewCar({ ...newCar, name: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white border border-slate-200"
                  />
                  <select
                    value={newCar.type}
                    onChange={e => {
                      const t = e.target.value;
                      setNewCar({ ...newCar, type: t, mpgOrEfficiency: t === 'ev' ? 28 : t === 'hybrid' ? 48 : 28 });
                    }}
                    className="px-3 py-2 rounded-lg bg-white border border-slate-200 font-semibold"
                  >
                    <option value="gas">Gas</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="phev">Plug-In Hybrid</option>
                    <option value="ev">Electric (EV)</option>
                  </select>
                  <input
                    type="number"
                    placeholder={newCar.type === 'ev' ? 'kWh/100mi' : 'MPG'}
                    value={newCar.mpgOrEfficiency}
                    onChange={e => setNewCar({ ...newCar, mpgOrEfficiency: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white border border-slate-200"
                  />
                  <input
                    type="number"
                    placeholder="Miles/mo"
                    value={newCar.monthlyMiles}
                    onChange={e => setNewCar({ ...newCar, monthlyMiles: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white border border-slate-200"
                  />
                  <button type="submit" className="py-2 px-3 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer">
                    Save
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {metrics.fleet.vehicles.map(v => (
                  <div key={v.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{v.name}</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold uppercase text-slate-700">
                          {v.type}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVehicle(v.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-200/70">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{v.type === 'ev' ? 'Charging' : 'Gas'}</span>
                        <span className="font-bold text-slate-900">${v.monthlyFuelOrChargeCost}/mo</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Insurance</span>
                        <span className="font-bold text-slate-900">${v.insuranceMonthly}/mo</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total</span>
                        <span className="font-bold text-[#18457c]">${v.totalMonthlyVehicleCost}/mo</span>
                      </div>
                    </div>

                    {v.type === 'ev' ? (
                      <div className="flex items-center justify-between gap-2 text-[11px] text-emerald-800">
                        <span>Free Charging: <strong>{v.freeChargingSharePercent || 0}%</strong></span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={v.freeChargingSharePercent || 0}
                          onChange={e => handleUpdateVehicle(v.id, { freeChargingSharePercent: Number(e.target.value) })}
                          className="w-36 accent-emerald-600 cursor-pointer"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>EV switch saves <strong>~${v.potentialEvSwitchSavings}/mo</strong></span>
                        <button
                          type="button"
                          onClick={() => setAutoView('deals')}
                          className="text-[#18457c] font-bold hover:underline cursor-pointer"
                        >
                          0% APR Deals →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {autoView === 'chargers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {FREE_EV_CHARGING_GUIDE.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{item.category}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">{item.cost}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{item.locations}</p>
                </div>
              ))}
            </div>
          )}

          {autoView === 'deals' && (
            <div className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block">Price</span>
                  <input
                    type="number"
                    value={simEvMsrp}
                    onChange={e => setSimEvMsrp(Number(e.target.value) || 0)}
                    className="w-full font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 block">IRS Credit</span>
                  <input
                    type="number"
                    value={simFedCredit}
                    onChange={e => setSimFedCredit(Number(e.target.value) || 0)}
                    className="w-full font-bold text-emerald-700 bg-white px-2 py-1 rounded border border-slate-200 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 block">Rebates</span>
                  <input
                    type="number"
                    value={simStateRebate}
                    onChange={e => setSimStateRebate(Number(e.target.value) || 0)}
                    className="w-full font-bold text-emerald-700 bg-white px-2 py-1 rounded border border-slate-200 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Down Payment</span>
                  <input
                    type="number"
                    value={simDownPayment}
                    onChange={e => setSimDownPayment(Number(e.target.value) || 0)}
                    className="w-full font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">0% Payment (After Gas Saved)</span>
                  <div className="font-bold text-sm text-[#18457c] mt-1">
                    ${zeroAprMonthlyPayment}/mo <span className="text-emerald-700">(${trueNetOutOfPocketMonthly} net)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ZERO_APR_EV_MODELS.map((ev, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{ev.model}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{ev.promoApr}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{ev.msrpRange} • {ev.epaRange}</span>
                    <span className="text-[11px] text-slate-700">{ev.federalAndDealerCash}</span>
                  </div>
                ))}
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
          {/* Row 1: Insurance Plan & Copays */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <div className="col-span-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Insurance Provider</span>
              <input
                type="text"
                value={health.provider || ''}
                onChange={e => handleHealthChange({ provider: e.target.value })}
                placeholder="e.g. Kaiser, Medi-Cal, Medicare"
                className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Member ID</span>
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

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Primary Copay</span>
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
              <span className="text-[10px] font-semibold text-slate-400 block">Specialist</span>
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
              <span className="text-[10px] font-semibold text-slate-400 block">Rx Copay</span>
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
