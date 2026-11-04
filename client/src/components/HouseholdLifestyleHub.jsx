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
  Gauge,
  ChevronDown
} from 'lucide-react';
import {
  DWELLING_TYPES,
  UTILITY_REGIONS,
  calculateHouseholdAndFleetMetrics,
  detectCarSpecs,
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
      try {
        localStorage.setItem('klarity_household_profile_plain', JSON.stringify(updatedProfile));
        localStorage.setItem('klarity_household_profile', JSON.stringify(updatedProfile));
      } catch {}
      // Immediately persist to backend
      fetch('/api/household', {
        method: 'POST',
        headers,
        body: JSON.stringify(updatedProfile)
      }).catch(err => console.warn('Could not persist property to server:', err));

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
    insuranceProvider: 'State Farm', // Each car has its own individual insurance
    insuranceCoverage: 'full_coverage', // 'full_coverage' | 'liability_only' | 'full_coverage_gap'
    insuranceMonthly: 120,
    insurancePolicyNumber: '',
    insuranceCardPhoto: null,
    odometer: '',
    estimatedValue: '',
    threeYearMileLimit: 36000,
    monthlyMiles: 1000,
    monthlyPayment: 399,
    fuelGrade: 'regular',
    mpgOrEfficiency: 32,
    batteryKwh: 0,
    freeChargingSharePercent: 30
  });

  const [selectedEvForChargers, setSelectedEvForChargers] = useState(null);
  const [viewingCardPhoto, setViewingCardPhoto] = useState(null);
  const [carModelSearch, setCarModelSearch] = useState('');
  const [carSearchFocused, setCarSearchFocused] = useState(false);
  const carDropdownRef = useRef(null);

  const handleNewCarCardPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setNewCar(prev => ({
        ...prev,
        insuranceCardPhoto: evt.target.result
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUploadVehicleCardPhoto = (vehicleId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      handleUpdateVehicle(vehicleId, {
        insuranceCardPhoto: evt.target.result
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
    setCarModelSearch('');
    setCarSearchFocused(true);
    setNewCar(prev => {
      const specs = detectCarSpecs(mk, '', prev.insuranceCoverage);
      return {
        ...prev,
        make: mk,
        model: '',
        name: '',
        type: specs.type,
        mpgOrEfficiency: specs.mpgOrEfficiency,
        fuelGrade: specs.fuelGrade,
        batteryKwh: specs.batteryKwh,
        insuranceMonthly: specs.insuranceMonthly
      };
    });
  };

  const handleModelTextChange = (val) => {
    setCarModelSearch(val);
    const specs = detectCarSpecs(newCar.make, val, newCar.insuranceCoverage);
    setNewCar(prev => ({
      ...prev,
      model: val,
      name: `${prev.year || 2025} ${prev.make || ''} ${val}`.replace(/\s+/g, ' ').trim(),
      type: specs.type,
      mpgOrEfficiency: specs.mpgOrEfficiency,
      fuelGrade: specs.fuelGrade,
      batteryKwh: specs.batteryKwh,
      insuranceMonthly: specs.insuranceMonthly
    }));
    setCarSearchFocused(true);
  };

  const handleInsuranceCoverageChange = (cov) => {
    const specs = detectCarSpecs(newCar.make, newCar.model, cov);
    setNewCar(prev => ({
      ...prev,
      insuranceCoverage: cov,
      insuranceMonthly: specs.insuranceMonthly || (cov === 'liability_only' ? 65 : 120)
    }));
  };

  const handleOdometerChange = (val) => {
    const raw = String(val).replace(/[^0-9]/g, '');
    if (!raw) {
      setNewCar(prev => ({ ...prev, odometer: '' }));
      return;
    }
    const formatted = Number(raw).toLocaleString('en-US');
    setNewCar(prev => ({ ...prev, odometer: formatted }));
  };

  const handleEstimatedValueChange = (val) => {
    const raw = String(val).replace(/[^0-9]/g, '');
    if (!raw) {
      setNewCar(prev => ({ ...prev, estimatedValue: '' }));
      return;
    }
    const formatted = Number(raw).toLocaleString('en-US');
    setNewCar(prev => ({ ...prev, estimatedValue: formatted }));
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
    let q = (carModelSearch || '').trim().toLowerCase();
    q = q.replace(/\bchevy\b/g, 'chevrolet').replace(/\bpremiere\b/g, 'premier');

    let make = (newCar.make || '').toLowerCase();
    if (make === 'chevy') make = 'chevrolet';

    // If query starts with the make name (e.g. "chevy traverse", "chevrolet traverse"), strip it
    const cleanQ = q.replace(new RegExp(`^${make}\\s*`, 'i'), '').trim();

    return POPULAR_CAR_DATABASE.filter(c => {
      const cMake = c.make.toLowerCase();
      const matchesMake = !make || make === 'other' || make === 'other / custom' || cMake === make;
      if (!cleanQ && !q) return matchesMake;

      const combined = `${c.fullName} ${c.model} ${c.type}`.toLowerCase();
      return matchesMake && (combined.includes(q) || (cleanQ && combined.includes(cleanQ)));
    });
  }, [newCar.make, carModelSearch]);

  const handleSelectCarSuggestion = (car) => {
    const yr = newCar.year || 2025;
    const cov = newCar.insuranceCoverage || 'full_coverage';
    const specs = detectCarSpecs(car.make, car.model, cov);
    const computedMonthlyMiles = newCar.threeYearMileLimit
      ? Math.round(Number(newCar.threeYearMileLimit) / 36)
      : (specs.type === 'ev' ? 1000 : 900);

    setNewCar(prev => ({
      ...prev,
      make: car.make,
      model: car.model,
      name: `${yr} ${car.fullName || car.model}`,
      type: specs.type,
      mpgOrEfficiency: specs.mpgOrEfficiency,
      batteryKwh: specs.batteryKwh || (specs.type === 'ev' ? 75 : 0),
      fuelGrade: specs.fuelGrade || (specs.type === 'ev' ? 'electric' : 'regular'),
      insuranceMonthly: specs.insuranceMonthly || (cov === 'liability_only' ? 65 : 120),
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
    const isLease = newCar.ownership === 'lease';
    const yr = Number(newCar.year) || 2025;
    const mk = newCar.make || 'Custom';
    
    // Clean model so typing "2013 Toyota Camry SE" or "Camry SE" gives a clean "2013 Toyota Camry SE"
    const cleanModel = finalModel
      .replace(new RegExp(`^${yr}\\s*`, 'i'), '')
      .replace(new RegExp(`^${mk}\\s*`, 'i'), '')
      .trim();
    const computedName = `${yr} ${mk} ${cleanModel || finalModel}`.trim();
    const rawOdo = Number(String(newCar.odometer).replace(/,/g, '')) || 0;
    const rawEstValue = Number(String(newCar.estimatedValue).replace(/,/g, '')) || 0;
    const threeYrLimit = isLease ? (Number(newCar.threeYearMileLimit) || 36000) : null;
    const monthlyAllowance = threeYrLimit ? Math.round(threeYrLimit / 36) : 950;

    const item = {
      id: `veh-${Date.now()}`,
      year: yr,
      make: mk,
      model: cleanModel || finalModel,
      name: computedName,
      type: newCar.type,
      ownership: newCar.ownership || 'lease',
      insuranceCoverage: newCar.insuranceCoverage || 'full_coverage',
      odometer: rawOdo,
      estimatedValue: rawEstValue,
      threeYearMileLimit: threeYrLimit,
      monthlyMiles: Number(newCar.monthlyMiles) || monthlyAllowance || 1000,
      fuelGrade: newCar.fuelGrade || (newCar.type === 'ev' ? 'electric' : 'regular'),
      batteryKwh: newCar.type === 'ev' ? (Number(newCar.batteryKwh) || 75) : null,
      insuranceProvider: newCar.insuranceProvider || 'State Farm',
      insuranceCoverage: newCar.insuranceCoverage || 'full_coverage',
      insurancePolicyNumber: newCar.insurancePolicyNumber || '',
      insuranceCardPhoto: newCar.insuranceCardPhoto || null,
      mpgOrEfficiency: Number(newCar.mpgOrEfficiency) || (newCar.type === 'ev' ? 28 : 30),
      insuranceMonthly: Number(newCar.insuranceMonthly) || (newCar.insuranceCoverage === 'liability_only' ? 65 : 120),
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
      insuranceProvider: 'State Farm',
      insuranceCoverage: 'full_coverage',
      insuranceMonthly: 120,
      insurancePolicyNumber: '',
      insuranceCardPhoto: null,
      odometer: '',
      estimatedValue: '',
      threeYearMileLimit: 36000,
      monthlyMiles: 1000,
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
          {((householdProfile.zillowUrl && householdProfile.zillowUrl.trim()) || (householdProfile.address && householdProfile.address.trim())) && !isEditingPropertyLink ? (
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
                {householdProfile.zillowUrl && householdProfile.zillowUrl.startsWith('http') && (
                  <a
                    href={householdProfile.zillowUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-[#18457c] transition-colors shadow-2xs"
                  >
                    <span>View on Zillow</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
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
                {(householdProfile.zillowUrl || householdProfile.address) && (
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
      {/* SECTION 2: AUTO (Vehicles, Commute & Auto Insurance)              */}
      {/* ================================================================= */}
      {section === 'auto' && (
        <div className="p-5 flex flex-col gap-4">
          {/* Vehicles Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Car className="w-4 h-4 text-[#18457c]" />
                <span>Vehicles ({metrics.fleet.vehicles.length})</span>
              </span>
              <span className="text-[11px] text-slate-500 block">
                Manage your vehicles, commute costs, and auto insurance coverage.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowAddCar(!showAddCar)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#18457c] hover:bg-[#133763] text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Vehicle</span>
            </button>
          </div>

          {/* Add Vehicle Form (Structured with Separate Boxes & Auto-Filling Specs) */}
          {showAddCar && (
            <form
              onSubmit={handleAddVehicle}
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3.5 text-xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-[#18457c]" />
                  <span>Add Vehicle</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddCar(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Row 1: Separate Boxes for Year, Make, Model & Trim */}
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
                    {[
                      2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017,
                      2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007,
                      2006, 2005, 2004, 2003, 2002, 2001, 2000, 1999, 1998, 1995
                    ].map(y => (
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

                {/* Box 3: Model & Trim (with auto-suggest popup & free-form trim input) */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 relative" ref={carDropdownRef}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Model & Trim
                    </label>
                    <span className="text-[9px] text-[#18457c] font-semibold">Select or type</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Traverse Premier, Camry SE, Model Y..."
                      value={carModelSearch || newCar.model || ''}
                      onChange={e => handleModelTextChange(e.target.value)}
                      onFocus={() => setCarSearchFocused(true)}
                      className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setCarSearchFocused(prev => !prev)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer shrink-0"
                      title="Show all models and trims"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Dropdown Suggestions matching Make & Model */}
                  {carSearchFocused && filteredCars.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl z-30 py-1 divide-y divide-slate-100">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between bg-slate-50/90 sticky top-0 z-10 border-b border-slate-100">
                        <span>{newCar.make} Models & Trims ({filteredCars.length})</span>
                        <span className="text-[9px] text-slate-400 font-normal">Click to select</span>
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

              {/* Row 2: Ownership, Odometer, Lease Limit / Est. Market Value, Monthly Payment (only if not owned) */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${newCar.ownership === 'owned' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-2.5`}>
                {/* Box 4: Ownership / Lease */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Financing / Status
                  </label>
                  <select
                    value={newCar.ownership || 'lease'}
                    onChange={e => {
                      const own = e.target.value;
                      setNewCar(prev => ({
                        ...prev,
                        ownership: own,
                        threeYearMileLimit: own === 'lease' ? 36000 : null,
                        monthlyPayment: own === 'owned' ? 0 : (prev.monthlyPayment || (own === 'lease' ? 399 : 450))
                      }));
                    }}
                    className="w-full font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="lease">Lease</option>
                    <option value="financed">Financed (Car Loan)</option>
                    <option value="owned">Owned Outright (Paid Off)</option>
                  </select>
                </div>

                {/* Box 5: Current Odometer (with automatic comma formatting) */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Current Odometer
                  </label>
                  <div className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="e.g. 14,200"
                      value={newCar.odometer || ''}
                      onChange={e => handleOdometerChange(e.target.value)}
                      className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400">mi</span>
                  </div>
                </div>

                {/* Box 6: Conditional — 3-Year Mile Limit ONLY for Lease; Estimated Value for Financed/Owned */}
                {newCar.ownership === 'lease' ? (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                        3-Yr Lease Limit
                      </label>
                      <span className="text-[9px] text-amber-700 font-bold">
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
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Est. Market Value
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-400">$</span>
                      <input
                        type="text"
                        placeholder="e.g. 12,500"
                        value={newCar.estimatedValue || ''}
                        onChange={e => handleEstimatedValueChange(e.target.value)}
                        className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Box 7: Monthly Payment (Hidden completely when car is owned) */}
                {newCar.ownership !== 'owned' && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      {newCar.ownership === 'lease' ? 'Monthly Lease Payment' : 'Monthly Loan Payment'}
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        value={newCar.monthlyPayment}
                        onChange={e => setNewCar({ ...newCar, monthlyPayment: Number(e.target.value) || 0 })}
                        placeholder="e.g. 399"
                        className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400">/mo</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: Dedicated Insurance Policy & Digital Card for THIS Vehicle */}
              <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200 flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#18457c]" />
                    <span>Insurance Policy & Digital Card</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Individual coverage for this car</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Insurance Carrier */}
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Insurance Carrier
                    </label>
                    <select
                      value={newCar.insuranceProvider || 'State Farm'}
                      onChange={e => setNewCar({ ...newCar, insuranceProvider: e.target.value })}
                      className="w-full font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {AUTO_INSURANCE_PROVIDERS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Coverage Tier */}
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Coverage Tier
                    </label>
                    <select
                      value={newCar.insuranceCoverage || 'full_coverage'}
                      onChange={e => handleInsuranceCoverageChange(e.target.value)}
                      className="w-full font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="full_coverage">Full Coverage (Comp + Collision)</option>
                      <option value="liability_only">Liability Only</option>
                      <option value="full_coverage_gap">Full Coverage + GAP</option>
                    </select>
                  </div>

                  {/* Policy Number */}
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Policy Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9482103-PA"
                      value={newCar.insurancePolicyNumber || ''}
                      onChange={e => setNewCar({ ...newCar, insurancePolicyNumber: e.target.value })}
                      className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                    />
                  </div>

                  {/* Monthly Insurance Premium */}
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Monthly Premium
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        value={newCar.insuranceMonthly}
                        onChange={e => setNewCar({ ...newCar, insuranceMonthly: Number(e.target.value) || 0 })}
                        className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400">/mo</span>
                    </div>
                  </div>
                </div>

                {/* Insurance Card Photo Upload Box */}
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Insurance Card Photo
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Snap or upload this car's insurance card photo for proof & quick reference
                    </span>
                  </div>

                  {newCar.insuranceCardPhoto ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={newCar.insuranceCardPhoto}
                        alt="Insurance Card"
                        onClick={() => setViewingCardPhoto(newCar.insuranceCardPhoto)}
                        className="h-9 w-14 object-cover rounded-md border border-slate-300 shadow-2xs cursor-pointer hover:opacity-90"
                        title="Click to view full size"
                      />
                      <button
                        type="button"
                        onClick={() => setViewingCardPhoto(newCar.insuranceCardPhoto)}
                        className="text-xs text-[#18457c] hover:underline font-bold cursor-pointer"
                      >
                        View Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCar(prev => ({ ...prev, insuranceCardPhoto: null }))}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer ml-1"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer shrink-0 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-[#18457c]" />
                      <span>Upload Card Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleNewCarCardPhotoUpload}
                      />
                    </label>
                  )}
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
                  Add Vehicle
                </button>
              </div>
            </form>
          )}

          {/* Vehicles Cards */}
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

                {/* Odometer, Lease Limit (for lease only) & Market Value Line */}
                {(v.odometer || (v.ownership === 'lease' && v.threeYearMileLimit) || v.estimatedValue) && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200/60 flex-wrap">
                    {v.odometer ? (
                      <span>Odometer: <strong className="text-slate-900">{Number(v.odometer).toLocaleString('en-US')} mi</strong></span>
                    ) : null}
                    {v.odometer && v.ownership === 'lease' && v.threeYearMileLimit ? <span>•</span> : null}
                    {v.ownership === 'lease' && v.threeYearMileLimit ? (
                      <span>3-Yr Lease Limit: <strong className="text-slate-900">{Number(v.threeYearMileLimit).toLocaleString('en-US')} mi</strong> (~{Math.round(Number(v.threeYearMileLimit) / 36)} mi/mo)</span>
                    ) : null}
                    {(v.ownership === 'owned' || v.ownership === 'financed') && v.estimatedValue ? (
                      <>
                        {v.odometer ? <span>•</span> : null}
                        <span>Est. Market Value: <strong className="text-slate-900">${Number(v.estimatedValue).toLocaleString('en-US')}</strong></span>
                      </>
                    ) : null}
                  </div>
                )}

                {/* Individual Vehicle Insurance & Card Photo Bar */}
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ShieldCheck className="w-4 h-4 text-[#18457c] shrink-0" />
                    <span className="font-bold text-slate-900 text-xs">
                      {v.insuranceProvider || 'Insurance'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      v.insuranceCoverage === 'liability_only'
                        ? 'bg-slate-100 text-slate-700 border border-slate-300'
                        : v.insuranceCoverage === 'full_coverage_gap'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                      {v.insuranceCoverage === 'liability_only' ? 'Liability Only' : v.insuranceCoverage === 'full_coverage_gap' ? 'Full Coverage + GAP' : 'Full Coverage'}
                    </span>
                    {v.insurancePolicyNumber && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        Pol: {v.insurancePolicyNumber}
                      </span>
                    )}
                  </div>

                  {/* Digital Insurance Card Photo */}
                  <div className="flex items-center gap-2 shrink-0">
                    {v.insuranceCardPhoto ? (
                      <div className="flex items-center gap-1.5">
                        <img
                          src={v.insuranceCardPhoto}
                          alt="Insurance Card"
                          onClick={() => setViewingCardPhoto(v.insuranceCardPhoto)}
                          className="h-7 w-11 object-cover rounded border border-slate-300 shadow-2xs cursor-pointer hover:opacity-90"
                          title="Click to view card full size"
                        />
                        <button
                          type="button"
                          onClick={() => setViewingCardPhoto(v.insuranceCardPhoto)}
                          className="text-[11px] text-[#18457c] hover:underline font-bold cursor-pointer"
                        >
                          View Card
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateVehicle(v.id, { insuranceCardPhoto: null })}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5 ml-0.5"
                          title="Remove card photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-semibold cursor-pointer transition-colors">
                        <Upload className="w-3 h-3 text-[#18457c]" />
                        <span>Upload Card</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadVehicleCardPhoto(v.id, e)}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Costs Breakdown Grid */}
                <div className={`grid ${v.ownership !== 'owned' && Number(v.monthlyPayment) > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-2 bg-white p-2.5 rounded-lg border border-slate-200/70`}>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{v.type === 'ev' ? 'Charging' : 'Fuel'}</span>
                    <span className="font-bold text-slate-900">${v.monthlyFuelOrChargeCost}/mo</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Insurance</span>
                    <span className="font-bold text-slate-900">${v.insuranceMonthly}/mo</span>
                  </div>
                  {v.ownership !== 'owned' && Number(v.monthlyPayment) > 0 && (
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

          {/* Full-Size Auto Insurance Card Photo Lightbox Modal */}
          {viewingCardPhoto && (
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
              onClick={() => setViewingCardPhoto(null)}
            >
              <div
                className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-4 flex flex-col gap-3"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#18457c]" />
                    <span>Auto Insurance Card Photo</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewingCardPhoto(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-50 rounded-xl p-2 border border-slate-200/60">
                  <img
                    src={viewingCardPhoto}
                    alt="Auto Insurance Card Full Size"
                    className="max-h-[70vh] w-auto object-contain rounded-lg shadow-sm"
                  />
                </div>
              </div>
            </div>
          )}

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
