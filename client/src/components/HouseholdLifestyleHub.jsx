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
  ChevronDown,
  FileText,
  Copy,
  Check
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
  const [viewingCardTitle, setViewingCardTitle] = useState('Insurance Card');
  const [isScanningCard, setIsScanningCard] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);
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

  const hasSavedInsurance = Boolean(
    health.saved ||
    (health.cards && health.cards.length > 0) ||
    (health.memberId && health.memberId.trim().length > 0)
  );
  const [healthView, setHealthView] = useState(hasSavedInsurance ? 'saved' : 'empty');
  const [showMemberId, setShowMemberId] = useState(false);
  const [copiedMemberId, setCopiedMemberId] = useState(false);
  const [keepCardImage, setKeepCardImage] = useState(health.keepCardImage !== false);
  const [pendingCard, setPendingCard] = useState(null);
  const [showCardDialog, setShowCardDialog] = useState(false);
  const healthFileInputRef = useRef(null);

  const [reviewForm, setReviewForm] = useState({
    planName: health.planName || 'PPO Silver 70',
    provider: health.provider || 'Blue Shield of California',
    memberId: health.memberId || 'XEH482910377',
    groupNumber: health.groupNumber || '0049221',
    network: health.network || (health.planName?.includes('HMO') ? 'HMO' : 'PPO'),
    primaryCare: health.copays?.primaryCare != null ? `$${health.copays.primaryCare}` : '$30',
    specialist: health.copays?.specialist != null ? `$${health.copays.specialist}` : '$60',
    urgentCare: health.copays?.urgentCare != null ? `$${health.copays.urgentCare}` : '$30',
    er: health.copays?.er != null ? `$${health.copays.er}` : '$350',
    rxGeneric: health.copays?.rxGeneric != null ? `$${health.copays.rxGeneric}` : '$15',
    deductible: health.deductible != null ? (String(health.deductible).startsWith('$') ? health.deductible : `$${Number(health.deductible).toLocaleString()}`) : '$1,500',
    outOfPocketMax: health.outOfPocketMax != null ? (String(health.outOfPocketMax).startsWith('$') ? health.outOfPocketMax : `$${Number(health.outOfPocketMax).toLocaleString()}`) : '$6,500'
  });

  useEffect(() => {
    function handleClickOutside(event) {
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

  const handleCopyMemberId = () => {
    const mid = health.memberId || reviewForm.memberId || 'XEH482910377';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(mid).catch(() => {});
    }
    setCopiedMemberId(true);
    setTimeout(() => setCopiedMemberId(false), 2000);
  };

  const parseCurrencyInput = (val, defaultVal = 0) => {
    if (typeof val === 'number') return val;
    if (!val) return defaultVal;
    const num = Number(String(val).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? defaultVal : num;
  };

  const handleProcessInsuranceFile = (file) => {
    if (!file) return;

    setIsScanningCard(true);
    setScanFeedback(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUrl = evt.target.result;
      const cardId = `ic-${Date.now()}`;
      const newCard = { id: cardId, name: file.name, dataUrl };
      setPendingCard(newCard);

      let extractedDetails = null;

      try {
        const token = localStorage.getItem('klarity_token') || sessionStorage.getItem('klarity_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/household/scan-insurance-card', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: dataUrl,
            fileName: file.name
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.extracted) {
            extractedDetails = json.extracted;
          }
        }
      } catch (err) {
        console.warn('Card scan network notice:', err);
      }

      const pName = extractedDetails?.planName || health.planName || 'PPO Silver 70';
      const prov = extractedDetails?.provider || health.provider || 'Blue Shield of California';
      const mId = extractedDetails?.memberId || health.memberId || 'XEH482910377';
      const grp = extractedDetails?.groupNumber || health.groupNumber || '0049221';
      const net = extractedDetails?.network || (pName.includes('HMO') ? 'HMO' : (pName.includes('EPO') ? 'EPO' : 'PPO'));

      const pc = extractedDetails?.copays?.primaryCare != null ? `$${extractedDetails.copays.primaryCare}` : (health.copays?.primaryCare != null ? `$${health.copays.primaryCare}` : '$30');
      const sp = extractedDetails?.copays?.specialist != null ? `$${extractedDetails.copays.specialist}` : (health.copays?.specialist != null ? `$${health.copays.specialist}` : '$60');
      const uc = extractedDetails?.copays?.urgentCare != null ? `$${extractedDetails.copays.urgentCare}` : (health.copays?.urgentCare != null ? `$${health.copays.urgentCare}` : '$30');
      const er = extractedDetails?.copays?.er != null ? `$${extractedDetails.copays.er}` : (health.copays?.er != null ? `$${health.copays.er}` : '$350');
      const rx = extractedDetails?.copays?.rxGeneric != null ? `$${extractedDetails.copays.rxGeneric}` : (health.copays?.rxGeneric != null ? `$${health.copays.rxGeneric}` : '$15');

      const ded = extractedDetails?.deductible != null ? `$${Number(extractedDetails.deductible).toLocaleString()}` : (health.deductible != null ? (String(health.deductible).startsWith('$') ? health.deductible : `$${Number(health.deductible).toLocaleString()}`) : '$1,500');
      const oop = extractedDetails?.outOfPocketMax != null ? `$${Number(extractedDetails.outOfPocketMax).toLocaleString()}` : (health.outOfPocketMax != null ? (String(health.outOfPocketMax).startsWith('$') ? health.outOfPocketMax : `$${Number(health.outOfPocketMax).toLocaleString()}`) : '$6,500');

      setReviewForm({
        planName: pName,
        provider: prov,
        memberId: mId,
        groupNumber: grp,
        network: net,
        primaryCare: pc,
        specialist: sp,
        urgentCare: uc,
        er: er,
        rxGeneric: rx,
        deductible: ded,
        outOfPocketMax: oop
      });

      setIsScanningCard(false);
      setHealthView('review');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveReview = () => {
    const savedCards = keepCardImage
      ? (pendingCard ? [pendingCard] : (health.cards || []))
      : [];

    const nextHealth = {
      ...health,
      saved: true,
      provider: (reviewForm.provider || '').trim(),
      planName: (reviewForm.planName || '').trim(),
      memberId: (reviewForm.memberId || '').trim(),
      groupNumber: (reviewForm.groupNumber || '').trim(),
      network: (reviewForm.network || '').trim() || (reviewForm.planName?.includes('HMO') ? 'HMO' : 'PPO'),
      deductible: parseCurrencyInput(reviewForm.deductible, 1500),
      outOfPocketMax: parseCurrencyInput(reviewForm.outOfPocketMax, 6500),
      copays: {
        ...(health.copays || {}),
        primaryCare: parseCurrencyInput(reviewForm.primaryCare, 30),
        specialist: parseCurrencyInput(reviewForm.specialist, 60),
        urgentCare: parseCurrencyInput(reviewForm.urgentCare, 30),
        er: parseCurrencyInput(reviewForm.er, 350),
        rxGeneric: parseCurrencyInput(reviewForm.rxGeneric, 15)
      },
      keepCardImage,
      cards: savedCards
    };

    const nextProfile = {
      ...householdProfile,
      health: nextHealth
    };

    onUpdateProfile(nextProfile);

    try {
      localStorage.setItem('klarity_household_profile_plain', JSON.stringify(nextProfile));
      localStorage.setItem('klarity_household_profile', JSON.stringify(nextProfile));
      const token = localStorage.getItem('klarity_token') || sessionStorage.getItem('klarity_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      fetch('/api/household', {
        method: 'POST',
        headers,
        body: JSON.stringify(nextProfile)
      }).catch(err => console.warn('Sync notice:', err));
    } catch (e) {
      console.warn('Card profile sync notice:', e);
    }

    setHealthView('saved');
  };

  const handleCancelReview = () => {
    if (hasSavedInsurance || health.saved || health.memberId) {
      setHealthView('saved');
    } else {
      setHealthView('empty');
    }
  };

  const handleEditInsurance = () => {
    setReviewForm({
      planName: health.planName || 'PPO Silver 70',
      provider: health.provider || 'Blue Shield of California',
      memberId: health.memberId || 'XEH482910377',
      groupNumber: health.groupNumber || '0049221',
      network: health.network || (health.planName?.includes('HMO') ? 'HMO' : 'PPO'),
      primaryCare: health.copays?.primaryCare != null ? `$${health.copays.primaryCare}` : '$30',
      specialist: health.copays?.specialist != null ? `$${health.copays.specialist}` : '$60',
      urgentCare: health.copays?.urgentCare != null ? `$${health.copays.urgentCare}` : '$30',
      er: health.copays?.er != null ? `$${health.copays.er}` : '$350',
      rxGeneric: health.copays?.rxGeneric != null ? `$${health.copays.rxGeneric}` : '$15',
      deductible: health.deductible != null ? (String(health.deductible).startsWith('$') ? health.deductible : `$${Number(health.deductible).toLocaleString()}`) : '$1,500',
      outOfPocketMax: health.outOfPocketMax != null ? (String(health.outOfPocketMax).startsWith('$') ? health.outOfPocketMax : `$${Number(health.outOfPocketMax).toLocaleString()}`) : '$6,500'
    });
    setKeepCardImage(health.keepCardImage !== false);
    setHealthView('review');
  };

  const handleRemoveInsurance = () => {
    const nextHealth = {
      ...health,
      saved: false,
      provider: '',
      planName: '',
      memberId: '',
      groupNumber: '',
      network: '',
      deductible: 0,
      outOfPocketMax: 0,
      copays: {
        primaryCare: 0,
        specialist: 0,
        urgentCare: 0,
        er: 0,
        rxGeneric: 0
      },
      cards: []
    };
    const nextProfile = {
      ...householdProfile,
      health: nextHealth
    };
    onUpdateProfile(nextProfile);
    try {
      localStorage.setItem('klarity_household_profile_plain', JSON.stringify(nextProfile));
      localStorage.setItem('klarity_household_profile', JSON.stringify(nextProfile));
      const token = localStorage.getItem('klarity_token') || sessionStorage.getItem('klarity_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      fetch('/api/household', {
        method: 'POST',
        headers,
        body: JSON.stringify(nextProfile)
      }).catch(err => console.warn('Sync notice:', err));
    } catch (e) {}
    setPendingCard(null);
    setHealthView('empty');
  };

  const handleRemoveInsuranceCard = (id) => {
    const remainingCards = (health.cards || []).filter(c => c.id !== id);
    const patch = { cards: remainingCards };
    if (remainingCards.length === 0) {
      patch.provider = '';
      patch.planName = '';
      patch.memberId = '';
      patch.groupNumber = '';
      patch.rxBin = '';
      patch.rxPcn = '';
      patch.rxGrp = '';
    }
    handleHealthChange(patch);
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
      {/* SECTION 3: HEALTH (Redesigned with card mockup & 3-state flow)     */}
      {/* ================================================================= */}
      {section === 'health' && (
        <div className="p-5 flex flex-col gap-5 text-sm">
          {/* Hidden file input for card/policy upload */}
          <input
            ref={healthFileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            disabled={isScanningCard}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleProcessInsuranceFile(file);
              e.target.value = '';
            }}
            className="hidden"
          />

          {/* Scanning Progress Banner */}
          {isScanningCard && (
            <div className="p-4 bg-[#E8EEF8] dark:bg-slate-800 border border-[#1B4B91]/20 rounded-xl flex items-center gap-3 text-[#14233B] dark:text-slate-200 text-sm animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-[#1B4B91] shrink-0" />
              <div>
                <span className="font-semibold block">Reading your insurance document...</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Extracting carrier, plan name, member ID, group number, and copays...</span>
              </div>
            </div>
          )}

          {/* STATE 1: EMPTY */}
          {healthView === 'empty' && !isScanningCard && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="font-semibold text-base text-slate-900 dark:text-white">Health insurance</h2>
              </div>
              <div className="p-6 sm:p-8">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleProcessInsuranceFile(file);
                  }}
                  className="border-1.5 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 sm:p-10 text-center flex flex-col items-center justify-center gap-2"
                >
                  <b className="text-base font-semibold text-slate-900 dark:text-white">Add your insurance card</b>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                    Upload a photo of your card or a policy PDF and we’ll fill in the details. You review everything before it’s saved.
                  </p>
                  <button
                    type="button"
                    onClick={() => healthFileInputRef.current?.click()}
                    className="mt-2 px-4 py-2.5 rounded-lg bg-[#1B4B91] hover:bg-[#153c75] text-white font-medium text-sm transition-colors cursor-pointer shadow-xs"
                  >
                    Upload card or policy
                  </button>
                  <small className="text-xs text-slate-400 mt-1">PDF, PNG, JPG or WebP</small>
                </div>
              </div>
            </section>
          )}

          {/* STATE 2: REVIEW ("Check what we read") */}
          {healthView === 'review' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="font-semibold text-base text-slate-900 dark:text-white">Check what we read</h2>
              </div>
              <div className="p-6">
                <div className="bg-[#E8EEF8] dark:bg-slate-800/80 text-[#14233B] dark:text-slate-200 rounded-lg px-3.5 py-2.5 text-[13.5px] mb-5">
                  Automatic reading can make mistakes. Compare each field with your card before saving.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Plan name</label>
                    <input
                      type="text"
                      value={reviewForm.planName}
                      onChange={(e) => setReviewForm({ ...reviewForm, planName: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Carrier</label>
                    <input
                      type="text"
                      value={reviewForm.provider}
                      onChange={(e) => setReviewForm({ ...reviewForm, provider: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Member ID</label>
                    <input
                      type="text"
                      value={reviewForm.memberId}
                      onChange={(e) => setReviewForm({ ...reviewForm, memberId: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Group number</label>
                    <input
                      type="text"
                      value={reviewForm.groupNumber}
                      onChange={(e) => setReviewForm({ ...reviewForm, groupNumber: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Primary care copay</label>
                    <input
                      type="text"
                      value={reviewForm.primaryCare}
                      onChange={(e) => setReviewForm({ ...reviewForm, primaryCare: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Specialist copay</label>
                    <input
                      type="text"
                      value={reviewForm.specialist}
                      onChange={(e) => setReviewForm({ ...reviewForm, specialist: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Emergency room copay</label>
                    <input
                      type="text"
                      value={reviewForm.er}
                      onChange={(e) => setReviewForm({ ...reviewForm, er: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Generic prescription</label>
                    <input
                      type="text"
                      value={reviewForm.rxGeneric}
                      onChange={(e) => setReviewForm({ ...reviewForm, rxGeneric: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Deductible</label>
                    <input
                      type="text"
                      value={reviewForm.deductible}
                      onChange={(e) => setReviewForm({ ...reviewForm, deductible: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Out-of-pocket maximum</label>
                    <input
                      type="text"
                      value={reviewForm.outOfPocketMax}
                      onChange={(e) => setReviewForm({ ...reviewForm, outOfPocketMax: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 my-5 p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <input
                    type="checkbox"
                    checked={keepCardImage}
                    onChange={(e) => setKeepCardImage(e.target.checked)}
                    className="mt-1 w-4.5 h-4.5 rounded accent-[#1B4B91]"
                  />
                  <div>
                    <span className="font-medium text-sm text-slate-900 dark:text-white block">Keep a copy of the card image</span>
                    <small className="block text-slate-500 dark:text-slate-400 text-[13px] mt-0.5">
                      Stored encrypted so you can pull it up at the doctor’s office. If you leave this off, the image is discarded after reading.
                    </small>
                  </div>
                </label>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelReview}
                    className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveReview}
                    className="px-5 py-2.5 rounded-lg bg-[#1B4B91] hover:bg-[#153c75] text-white font-medium text-sm transition-colors cursor-pointer shadow-xs"
                  >
                    Save insurance
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* STATE 3: SAVED (Physical Card + Coverage Rows + Footer Actions) */}
          {healthView === 'saved' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="font-semibold text-base text-slate-900 dark:text-white">Health insurance</h2>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6 items-start">
                {/* Physical Card Mockup on Left */}
                <div>
                  <div className="bg-[#1B4B91] text-white rounded-2xl p-5 flex flex-col justify-between aspect-[1.6/1] shadow-md min-h-[190px]">
                    <div className="flex items-center justify-between text-[13px] opacity-90">
                      <span>{health.provider || 'Blue Shield of California'}</span>
                      <span className="font-semibold">{health.network || 'PPO'}</span>
                    </div>

                    <div className="font-serif text-xl font-medium tracking-tight leading-tight my-2">
                      {health.planName || 'PPO Silver 70'}
                    </div>

                    <div>
                      <div className="text-lg font-mono font-medium tracking-wider tabular-nums">
                        {showMemberId
                          ? (health.memberId || 'XEH482910377')
                          : ((health.memberId || 'XEH482910377').length > 4
                              ? `•••• •••• ${(health.memberId || 'XEH482910377').slice(-4)}`
                              : `•••• •••• 0377`)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[13px] opacity-90 mt-1">
                      <span>Group {health.groupNumber || '0049221'}</span>
                    </div>
                  </div>

                  {/* Member ID mini controls */}
                  <div className="flex items-center gap-2 mt-2.5">
                    <button
                      type="button"
                      onClick={() => setShowMemberId(!showMemberId)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                    >
                      {showMemberId ? 'Hide' : 'Show'} member ID
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyMemberId}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedMemberId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Coverage List on Right */}
                <div className="flex flex-col text-sm divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-500 dark:text-slate-400">Primary care copay</span>
                    <b className="font-semibold text-slate-900 dark:text-white tabular-nums">${health.copays?.primaryCare ?? 30}</b>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-500 dark:text-slate-400">Specialist copay</span>
                    <b className="font-semibold text-slate-900 dark:text-white tabular-nums">${health.copays?.specialist ?? 60}</b>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-500 dark:text-slate-400">Emergency room copay</span>
                    <b className="font-semibold text-slate-900 dark:text-white tabular-nums">${health.copays?.er ?? 350}</b>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-500 dark:text-slate-400">Generic prescription</span>
                    <b className="font-semibold text-slate-900 dark:text-white tabular-nums">${health.copays?.rxGeneric ?? 15}</b>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-500 dark:text-slate-400">Deductible</span>
                    <b className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      ${Number(health.deductible ?? 1500).toLocaleString()}
                    </b>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-500 dark:text-slate-400">Out-of-pocket maximum</span>
                    <b className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      ${Number(health.outOfPocketMax ?? 6500).toLocaleString()}
                    </b>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                {keepCardImage && (health.cards?.length > 0 || pendingCard) && (
                  <button
                    type="button"
                    onClick={() => setShowCardDialog(true)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    View card image
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleEditInsurance}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => healthFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemoveInsurance}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#B3261E] hover:text-red-700 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </section>
          )}

          {/* DOCTORS PANEL */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden" aria-labelledby="dh">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 id="dh" className="font-semibold text-base text-slate-900 dark:text-white">Doctors</h2>
              <button
                type="button"
                onClick={() => setShowAddDoctor(!showAddDoctor)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                Add doctor
              </button>
            </div>

            {showAddDoctor && (
              <form onSubmit={handleAddDoctor} className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Doctor or clinic</label>
                    <input
                      type="text"
                      required
                      value={newDoc.name}
                      onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                      placeholder="Doctor or clinic name"
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Specialty</label>
                    <input
                      type="text"
                      value={newDoc.specialty}
                      onChange={(e) => setNewDoc({ ...newDoc, specialty: e.target.value })}
                      placeholder="Primary care, Dental…"
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Address</label>
                    <input
                      type="text"
                      value={newDoc.office}
                      onChange={(e) => setNewDoc({ ...newDoc, office: e.target.value })}
                      placeholder="Street, City, State"
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Phone</label>
                    <input
                      type="tel"
                      value={newDoc.phone}
                      onChange={(e) => setNewDoc({ ...newDoc, phone: e.target.value })}
                      placeholder="(555) 000-0000"
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddDoctor(false)}
                    className="px-3.5 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#1B4B91] hover:bg-[#153c75] text-white font-medium text-sm transition-colors cursor-pointer shadow-xs"
                  >
                    Save doctor
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(health.doctors || []).length > 0 ? (
                (health.doctors || []).map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-3.5 px-6">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">{d.name}</div>
                      <small className="block text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                        {[d.specialty, d.office].filter(Boolean).join(' · ')}
                      </small>
                    </div>
                    <div className="flex items-center gap-4">
                      {d.phone && (
                        <a href={`tel:${d.phone}`} className="text-sm font-medium text-[#1B4B91] dark:text-[#7AA7F0] hover:underline">
                          {d.phone}
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveDoctor(d.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                        title="Remove doctor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No doctors added yet.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Insurance Card Image Modal Dialog */}
      {showCardDialog && (
        <div
          className="fixed inset-0 bg-[#0A1423]/55 backdrop-blur-xs flex items-center justify-center p-4 z-50 cursor-pointer"
          onClick={() => setShowCardDialog(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Insurance card</h2>
              <button
                type="button"
                onClick={() => setShowCardDialog(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 my-2">
              <div className="aspect-[1.6/1] border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                {health.cards?.[0]?.dataUrl ? (
                  health.cards[0].dataUrl.startsWith('data:application/pdf') || (health.cards[0].name || '').toLowerCase().endsWith('.pdf') ? (
                    <div
                      className="flex flex-col items-center gap-1.5 p-3 text-center cursor-pointer"
                      onClick={() => {
                        setViewingCardPhoto(health.cards[0].dataUrl);
                        setViewingCardTitle(`${health.cards[0].name || 'Policy PDF'}`);
                      }}
                    >
                      <FileText className="w-8 h-8 text-[#1B4B91]" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                        {health.cards[0].name || 'Policy PDF'}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={health.cards[0].dataUrl}
                      alt="Front card"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => {
                        setViewingCardPhoto(health.cards[0].dataUrl);
                        setViewingCardTitle(`${health.cards[0].name || 'Insurance Card'} - Front`);
                      }}
                    />
                  )
                ) : pendingCard?.dataUrl ? (
                  <img
                    src={pendingCard.dataUrl}
                    alt="Front card"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-slate-400 font-medium">Front</span>
                )}
              </div>

              <div className="aspect-[1.6/1] border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                {health.cards?.[1]?.dataUrl ? (
                  <img
                    src={health.cards[1].dataUrl}
                    alt="Back card"
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => {
                      setViewingCardPhoto(health.cards[1].dataUrl);
                      setViewingCardTitle(`${health.cards[1].name || 'Insurance Card'} - Back`);
                    }}
                  />
                ) : (
                  <span className="text-xs text-slate-400 font-medium">Back</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCardDialog(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Size Insurance Card / PDF Lightbox Modal (Auto & Health) */}
      {viewingCardPhoto && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setViewingCardPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl p-4 flex flex-col gap-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#18457c]" />
                <span>{viewingCardTitle || 'Insurance Document'}</span>
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
              {viewingCardPhoto.startsWith('data:application/pdf') || (viewingCardTitle && viewingCardTitle.toLowerCase().includes('.pdf')) ? (
                <iframe
                  src={viewingCardPhoto}
                  title="Policy Document PDF"
                  className="w-full h-[70vh] rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={viewingCardPhoto}
                  alt={viewingCardTitle || 'Insurance Card Full Size'}
                  className="max-h-[70vh] w-auto object-contain rounded-lg shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
