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
  Smartphone,
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
  ChevronUp,
  FileText,
  Copy,
  Check,
  RotateCw,
  Sun,
  Battery,
  Wifi,
  DollarSign,
  Sliders,
  Receipt,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Info
} from 'lucide-react';
import {
  DWELLING_TYPES,
  UTILITY_REGIONS,
  HOME_QUESTIONNAIRE_OPTIONS,
  HOUSEHOLD_PLAN_OPTIONS,
  getSuggestedProviders,
  calculateHomeCostBreakdown,
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


// Shows the user's own insurance card photo; flips to the back side if one was provided.
function InsuranceCardFlip({ front, back, flipped, onFlip, onOpen }) {
  const showBack = Boolean(back) && flipped;
  const face = {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden'
  };
  return (
    <div>
      <div className="relative w-full aspect-[1.6/1]" style={{ perspective: '1200px' }}>
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.6s ease',
            transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          <button
            type="button"
            onClick={() => onOpen(front, 'Insurance card – Front')}
            style={face}
            className="rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 bg-white cursor-zoom-in"
            aria-label="Open front of card"
          >
            <img src={front} alt="Insurance card front" className="w-full h-full object-cover" />
          </button>
          {back && (
            <button
              type="button"
              onClick={() => onOpen(back, 'Insurance card – Back')}
              style={{ ...face, transform: 'rotateY(180deg)' }}
              className="rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 bg-white cursor-zoom-in"
              aria-label="Open back of card"
            >
              <img src={back} alt="Insurance card back" className="w-full h-full object-cover" />
            </button>
          )}
        </div>
      </div>
      {back && (
        <button
          type="button"
          onClick={onFlip}
          className="mt-2.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
        >
          <RotateCw className="w-3.5 h-3.5" />
          {showBack ? 'Show front' : 'Show back'}
        </button>
      )}
    </div>
  );
}

export default function HouseholdLifestyleHub({
  householdProfile,
  onUpdateProfile,
  onSyncUtilitiesToBills,
  onAskAiAdvisor,
  bills = []
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
        yearBuilt: data.yearBuilt || householdProfile.yearBuilt || 2004,
        lotSize: data.lotSize || householdProfile.lotSize || '6,500 sq ft',
        county: data.county || householdProfile.county || 'Fresno County',
        garage: data.garage || householdProfile.garage || 'Attached 2-Car Garage',
        zillowImportedAt: data.zillowImportedAt || new Date().toISOString(),
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
    provider: '',
    planName: '',
    memberId: '',
    groupNumber: '',
    network: '',
    insuranceType: 'Medical',
    memberName: '',
    copays: { primaryCare: null, specialist: null, urgentCare: null, er: null, rxGeneric: null },
    doctors: [],
    cards: [],
    policies: []
  };

  // Multiple insurance policies support with backward-compatibility for existing single policy
  const policies = useMemo(() => {
    let rawPolicies = [];
    if (Array.isArray(health.policies) && health.policies.length > 0) {
      rawPolicies = health.policies;
    } else {
      const hasSingle = Boolean(
        health.saved ||
        (health.cards && health.cards.length > 0) ||
        (health.memberId && health.memberId.trim().length > 0) ||
        health.planName
      );
      if (hasSingle) {
        const pDoc = (health.doctors && health.doctors[0]) || health.doctor || null;
        rawPolicies = [{
          id: 'pol-primary',
          memberName: health.memberName || '',
          insuranceType: health.insuranceType || 'Medical',
          provider: health.provider || '',
          planName: health.planName || '',
          memberId: health.memberId || '',
          groupNumber: health.groupNumber || '',
          network: health.network || '',
          copays: health.copays || {},
          deductible: health.deductible,
          outOfPocketMax: health.outOfPocketMax,
          rxBin: health.rxBin || '',
          rxPcn: health.rxPcn || '',
          rxGrp: health.rxGrp || '',
          cards: health.cards || [],
          doctor: pDoc
        }];
      }
    }

    // Ensure each policy has its doctor populated if health.doctors has one
    return rawPolicies.map((p, idx) => {
      let pDoc = p.doctor;
      if (!pDoc && health.doctors && health.doctors.length > 0) {
        pDoc = health.doctors[idx] || health.doctors[0];
      }
      return {
        ...p,
        doctor: pDoc
      };
    });
  }, [health]);

  const allAvailableDoctors = useMemo(() => {
    const map = new Map();
    (health.doctors || []).forEach(d => {
      if (d && d.name) map.set(d.name.toLowerCase().trim(), d);
    });
    (health.policies || []).forEach(p => {
      if (p.doctor && p.doctor.name) {
        map.set(p.doctor.name.toLowerCase().trim(), p.doctor);
      }
    });
    return Array.from(map.values());
  }, [health]);

  const hasSavedInsurance = policies.length > 0;
  const [healthView, setHealthView] = useState(hasSavedInsurance ? 'saved' : 'empty');
  const [expandedPolicyIds, setExpandedPolicyIds] = useState({ 'pol-primary': true });
  const [revealedMemberIds, setRevealedMemberIds] = useState({});
  const [copiedPolicyId, setCopiedPolicyId] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});
  const [editingPolicyId, setEditingPolicyId] = useState(null);
  const [editingDoctorPolicyId, setEditingDoctorPolicyId] = useState(null);
  const [inlineDoctorForm, setInlineDoctorForm] = useState({ name: '', specialty: 'Primary care (PCP)', office: '', phone: '' });

  const [keepCardImage, setKeepCardImage] = useState(health.keepCardImage !== false);
  const [pendingCard, setPendingCard] = useState(null);
  const [pendingCards, setPendingCards] = useState([]);
  const [pendingDoctor, setPendingDoctor] = useState(null);
  const [scanProgress, setScanProgress] = useState('');
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [dialogCards, setDialogCards] = useState([]);
  const healthFileInputRef = useRef(null);

  const [reviewForm, setReviewForm] = useState({
    memberName: health.memberName || '',
    insuranceType: health.insuranceType || 'Medical',
    planName: health.planName || '',
    provider: health.provider || '',
    memberId: health.memberId || '',
    groupNumber: health.groupNumber || '',
    network: health.network || '',
    primaryCare: health.copays?.primaryCare != null ? `$${health.copays.primaryCare}` : '',
    specialist: health.copays?.specialist != null ? `$${health.copays.specialist}` : '',
    urgentCare: health.copays?.urgentCare != null ? `$${health.copays.urgentCare}` : '',
    er: health.copays?.er != null ? `$${health.copays.er}` : '',
    rxGeneric: health.copays?.rxGeneric != null ? `$${health.copays.rxGeneric}` : '',
    deductible: health.deductible != null && health.deductible !== '' ? (String(health.deductible).startsWith('$') ? health.deductible : `$${Number(health.deductible).toLocaleString()}`) : '',
    outOfPocketMax: health.outOfPocketMax != null && health.outOfPocketMax !== '' ? (String(health.outOfPocketMax).startsWith('$') ? health.outOfPocketMax : `$${Number(health.outOfPocketMax).toLocaleString()}`) : '',
    rxBin: health.rxBin || '',
    rxPcn: health.rxPcn || '',
    rxGrp: health.rxGrp || '',
    doctorName: (health.doctors && health.doctors[0]?.name) || '',
    doctorPhone: (health.doctors && health.doctors[0]?.phone) || '',
    doctorOffice: (health.doctors && health.doctors[0]?.office) || '',
    doctorSpecialty: (health.doctors && health.doctors[0]?.specialty) || 'Primary care (PCP)'
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

  // Multi-step question wizard state
  const hasHouseholdSpecs = Boolean(householdProfile.address || householdProfile.dwellingType);
  const [householdView, setHouseholdView] = useState(hasHouseholdSpecs ? 'saved' : 'wizard');
  const [isHouseholdExpanded, setIsHouseholdExpanded] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const totalWizardSteps = 7;

  const handleFinishWizard = () => {
    setHouseholdView('saved');
    setIsHouseholdExpanded(false); // Minimized in the end, similar to health section!
    try {
      localStorage.setItem('klarity_household_profile_plain', JSON.stringify(householdProfile));
      localStorage.setItem('klarity_household_profile', JSON.stringify(householdProfile));
      const token = localStorage.getItem('klarity_token') || sessionStorage.getItem('klarity_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      fetch('/api/household', {
        method: 'POST',
        headers,
        body: JSON.stringify(householdProfile)
      }).catch(err => console.warn('Sync notice:', err));
    } catch (e) {}
  };

  // Format Zillow imported timestamp notice
  const formattedImportTime = useMemo(() => {
    if (!householdProfile.zillowImportedAt) return 'Imported via Zillow Link';
    try {
      const d = new Date(householdProfile.zillowImportedAt);
      if (isNaN(d.getTime())) return 'Imported via Zillow Link';
      return `Imported on ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } catch {
      return 'Imported via Zillow Link';
    }
  }, [householdProfile.zillowImportedAt]);

  // Compute breakdown of the 8 monthly home cost rows
  const homeCostItems = useMemo(
    () => calculateHomeCostBreakdown(householdProfile, metrics, bills),
    [householdProfile, metrics, bills]
  );

  const totalMonthlyHomeCost = useMemo(
    () => homeCostItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0),
    [homeCostItems]
  );

  // Extract only verified bills pulled from actual payments & connected accounts
  const actualHouseholdBills = useMemo(() => {
    if (!Array.isArray(bills) || bills.length === 0) return [];
    const householdKeywords = [
      'electric', 'pg&e', 'pge', 'smud', 'edison', 'sdge', 'ladwp',
      'gas', 'socalgas', 'natural gas',
      'water', 'trash', 'sewer', 'waste', 'city utilities', 'republic services', 'waste management',
      'internet', 'wifi', 'xfinity', 'comcast', 'at&t', 'spectrum', 'verizon', 'frontier', 'starlink',
      'phone', 'cell', 'mobile', 'wireless', 't-mobile', 'tmobile', 'mint mobile', 'google fi',
      'mortgage', 'rent', 'housing', 'lease',
      'property tax', 'county tax', 'tax collector',
      'hoa', 'homeowners',
      'home insurance', 'hazard insurance', 'renters insurance', 'security', 'ring', 'adt'
    ];
    return bills.filter(b => {
      const name = (b.name || '').toLowerCase();
      const cat = (b.category || '').toLowerCase();
      const isHouseholdCat = ['utilities', 'housing', 'insurance', 'internet & tech', 'home'].includes(cat);
      const matches = householdKeywords.some(kw => name.includes(kw));
      return (isHouseholdCat || matches) && Number(b.expectedAmount || b.amount || 0) > 0;
    });
  }, [bills]);

  const totalActualBills = useMemo(
    () => actualHouseholdBills.reduce((sum, b) => sum + Number(b.expectedAmount || b.amount || 0), 0),
    [actualHouseholdBills]
  );

  const handleCostItemChange = (catId, field, value) => {
    const currentCosts = { ...(householdProfile.monthlyCosts || {}) };
    const existing = currentCosts[catId] || homeCostItems.find(i => i.id === catId) || {};
    currentCosts[catId] = {
      ...existing,
      [field]: field === 'amount' ? (Number(value) || 0) : value,
      source: 'user' // Any user typing immediately flips source tag to 'You entered'
    };
    handleFieldChange('monthlyCosts', currentCosts);
  };

  const handleResetCostItem = (catId) => {
    const currentCosts = { ...(householdProfile.monthlyCosts || {}) };
    delete currentCosts[catId];
    handleFieldChange('monthlyCosts', currentCosts);
  };

  const handleRefreshProperty = () => {
    const targetQuery = householdProfile.zillowUrl || householdProfile.address;
    if (!targetQuery) return;
    setPropertyUrlInput(targetQuery);
    handleFetchProperty({ preventDefault: () => {} });
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

  const isPolicyExpanded = (id, idx) => {
    if (expandedPolicyIds[id] !== undefined) return expandedPolicyIds[id];
    return idx === 0;
  };

  const togglePolicyExpanded = (id, idx) => {
    setExpandedPolicyIds(prev => ({
      ...prev,
      [id]: !isPolicyExpanded(id, idx)
    }));
  };

  const handleCopyMemberId = (policy) => {
    const mid = policy?.memberId || '';
    if (!mid) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(mid).catch(() => {});
    }
    setCopiedPolicyId(policy.id);
    setTimeout(() => setCopiedPolicyId(null), 2000);
  };

  const parseCurrencyInput = (val, defaultVal = null) => {
    if (typeof val === 'number') return val;
    if (!val || String(val).trim() === '') return defaultVal;
    const num = Number(String(val).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? defaultVal : num;
  };

  const handleProcessInsuranceFile = async (file) => {
    if (!file) return;

    setIsScanningCard(true);
    setScanFeedback(null);
    setScanProgress('Preparing document…');
    setPendingDoctor(null);

    let extractedDetails = null;
    let cards = [];

    try {
      const { scanInsuranceFile } = await import('../utils/insuranceScanner.js');
      const result = await scanInsuranceFile(file, (msg) => setScanProgress(msg));
      extractedDetails = result.extracted;
      cards = (result.cardImages || []).map((url, idx) => ({
        id: `ic-${Date.now()}-${idx}`,
        name: idx === 0 ? 'Front' : 'Back',
        side: idx === 0 ? 'front' : 'back',
        dataUrl: url
      }));
    } catch (err) {
      console.warn('Card scan failed:', err);
      setScanFeedback({ type: 'error', message: 'We couldn’t read that file. You can still enter the details by hand.' });
    }

    setPendingCards(cards);
    setPendingCard(cards[0] || null);
    if (extractedDetails?.doctor) setPendingDoctor(extractedDetails.doctor);

    const fmt = (v) => (v != null && v !== '' ? `$${Number(v).toLocaleString()}` : '');
    const pName = extractedDetails?.planName || '';
    setReviewForm({
      memberName: extractedDetails?.memberName || '',
      insuranceType: extractedDetails?.insuranceType || 'Medical',
      planName: pName,
      provider: extractedDetails?.provider || '',
      memberId: extractedDetails?.memberId || '',
      groupNumber: extractedDetails?.groupNumber || '',
      network: extractedDetails?.network || (/hmo/i.test(pName) ? 'HMO' : (/ppo/i.test(pName) ? 'PPO' : '')),
      primaryCare: fmt(extractedDetails?.copays?.primaryCare),
      specialist: fmt(extractedDetails?.copays?.specialist),
      urgentCare: fmt(extractedDetails?.copays?.urgentCare),
      er: fmt(extractedDetails?.copays?.er),
      rxGeneric: fmt(extractedDetails?.copays?.rxGeneric),
      deductible: fmt(extractedDetails?.deductible),
      outOfPocketMax: fmt(extractedDetails?.outOfPocketMax),
      rxBin: extractedDetails?.rxBin || '',
      rxPcn: extractedDetails?.rxPcn || '',
      rxGrp: extractedDetails?.rxGrp || '',
      doctorName: extractedDetails?.doctor?.name || '',
      doctorPhone: extractedDetails?.doctor?.phone || '',
      doctorOffice: extractedDetails?.doctor?.office || '',
      doctorSpecialty: extractedDetails?.doctor?.specialty || 'Primary care (PCP)'
    });

    setScanProgress('');
    setIsScanningCard(false);
    setHealthView('review');
  };

  const handleAddNewCard = () => {
    setEditingPolicyId(null);
    setPendingCards([]);
    setPendingCard(null);
    setPendingDoctor(null);
    setKeepCardImage(true);
    setReviewForm({
      memberName: '',
      insuranceType: 'Medical',
      planName: '',
      provider: '',
      memberId: '',
      groupNumber: '',
      network: '',
      primaryCare: '',
      specialist: '',
      urgentCare: '',
      er: '',
      rxGeneric: '',
      deductible: '',
      outOfPocketMax: '',
      rxBin: '',
      rxPcn: '',
      rxGrp: '',
      doctorName: '',
      doctorPhone: '',
      doctorOffice: '',
      doctorSpecialty: 'Primary care (PCP)'
    });
    healthFileInputRef.current?.click();
  };

  const handleManualAddCard = () => {
    setEditingPolicyId(null);
    setPendingCards([]);
    setPendingCard(null);
    setPendingDoctor(null);
    setKeepCardImage(true);
    setReviewForm({
      memberName: '',
      insuranceType: 'Medical',
      planName: '',
      provider: '',
      memberId: '',
      groupNumber: '',
      network: '',
      primaryCare: '',
      specialist: '',
      urgentCare: '',
      er: '',
      rxGeneric: '',
      deductible: '',
      outOfPocketMax: '',
      rxBin: '',
      rxPcn: '',
      rxGrp: '',
      doctorName: '',
      doctorPhone: '',
      doctorOffice: '',
      doctorSpecialty: 'Primary care (PCP)'
    });
    setHealthView('review');
  };

  const handleEditPolicy = (policy) => {
    setEditingPolicyId(policy.id);
    const fmt = (v) => (v != null && v !== '' ? (String(v).startsWith('$') ? v : `$${Number(v).toLocaleString()}`) : '');
    setReviewForm({
      memberName: policy.memberName || '',
      insuranceType: policy.insuranceType || 'Medical',
      planName: policy.planName || '',
      provider: policy.provider || '',
      memberId: policy.memberId || '',
      groupNumber: policy.groupNumber || '',
      network: policy.network || '',
      primaryCare: policy.copays?.primaryCare != null ? `$${policy.copays.primaryCare}` : '',
      specialist: policy.copays?.specialist != null ? `$${policy.copays.specialist}` : '',
      urgentCare: policy.copays?.urgentCare != null ? `$${policy.copays.urgentCare}` : '',
      er: policy.copays?.er != null ? `$${policy.copays.er}` : '',
      rxGeneric: policy.copays?.rxGeneric != null ? `$${policy.copays.rxGeneric}` : '',
      deductible: fmt(policy.deductible),
      outOfPocketMax: fmt(policy.outOfPocketMax),
      rxBin: policy.rxBin || '',
      rxPcn: policy.rxPcn || '',
      rxGrp: policy.rxGrp || '',
      doctorName: policy.doctor?.name || '',
      doctorPhone: policy.doctor?.phone || '',
      doctorOffice: policy.doctor?.office || '',
      doctorSpecialty: policy.doctor?.specialty || 'Primary care (PCP)'
    });
    setPendingCards(policy.cards || []);
    setPendingCard((policy.cards && policy.cards[0]) || null);
    setPendingDoctor(policy.doctor || null);
    setKeepCardImage(policy.cards && policy.cards.length > 0);
    setHealthView('review');
  };

  const handleReplaceCard = (policy) => {
    setEditingPolicyId(policy.id);
    healthFileInputRef.current?.click();
  };

  const handleSaveReview = () => {
    const existingCards = editingPolicyId
      ? (policies.find(p => p.id === editingPolicyId)?.cards || [])
      : [];

    const savedCards = keepCardImage
      ? (pendingCards.length > 0 ? pendingCards : (pendingCard ? [pendingCard] : existingCards))
      : [];

    const policyDoctor = (reviewForm.doctorName && reviewForm.doctorName.trim()) ? {
      name: reviewForm.doctorName.trim(),
      phone: (reviewForm.doctorPhone || '').trim(),
      office: (reviewForm.doctorOffice || '').trim(),
      specialty: (reviewForm.doctorSpecialty || 'Primary care (PCP)').trim()
    } : (pendingDoctor ? {
      name: pendingDoctor.name,
      phone: pendingDoctor.phone || '',
      office: pendingDoctor.office || '',
      specialty: pendingDoctor.specialty || 'Primary care (PCP)'
    } : null);

    const targetPolicyId = editingPolicyId || `pol-${Date.now()}`;

    const policyData = {
      id: targetPolicyId,
      memberName: (reviewForm.memberName || '').trim(),
      insuranceType: (reviewForm.insuranceType || 'Medical').trim(),
      provider: (reviewForm.provider || '').trim(),
      planName: (reviewForm.planName || '').trim(),
      memberId: (reviewForm.memberId || '').trim(),
      groupNumber: (reviewForm.groupNumber || '').trim(),
      network: (reviewForm.network || '').trim() || (reviewForm.planName?.toLowerCase().includes('hmo') ? 'HMO' : (reviewForm.planName?.toLowerCase().includes('ppo') ? 'PPO' : '')),
      deductible: parseCurrencyInput(reviewForm.deductible, null),
      outOfPocketMax: parseCurrencyInput(reviewForm.outOfPocketMax, null),
      copays: {
        primaryCare: parseCurrencyInput(reviewForm.primaryCare, null),
        specialist: parseCurrencyInput(reviewForm.specialist, null),
        urgentCare: parseCurrencyInput(reviewForm.urgentCare, null),
        er: parseCurrencyInput(reviewForm.er, null),
        rxGeneric: parseCurrencyInput(reviewForm.rxGeneric, null)
      },
      rxBin: (reviewForm.rxBin || '').trim(),
      rxPcn: (reviewForm.rxPcn || '').trim(),
      rxGrp: (reviewForm.rxGrp || '').trim(),
      cards: savedCards,
      doctor: policyDoctor
    };

    let nextPolicies = [...policies];
    if (editingPolicyId) {
      const idx = nextPolicies.findIndex(p => p.id === editingPolicyId);
      if (idx !== -1) {
        nextPolicies[idx] = policyData;
      } else {
        nextPolicies.push(policyData);
      }
    } else {
      nextPolicies.push(policyData);
    }

    const primary = nextPolicies[0] || policyData;

    let allDoctors = [...(health.doctors || [])];
    if (policyDoctor && policyDoctor.name) {
      const docExists = allDoctors.some(d => d.name?.toLowerCase() === policyDoctor.name.toLowerCase());
      if (!docExists) {
        allDoctors.push({
          id: `doc-${Date.now()}`,
          name: policyDoctor.name,
          specialty: policyDoctor.specialty || 'Primary care (PCP)',
          office: policyDoctor.office || '',
          phone: policyDoctor.phone || ''
        });
      }
    }

    const nextHealth = {
      ...health,
      saved: true,
      policies: nextPolicies,
      insuranceType: primary.insuranceType,
      memberName: primary.memberName,
      provider: primary.provider,
      planName: primary.planName,
      memberId: primary.memberId,
      groupNumber: primary.groupNumber,
      network: primary.network,
      deductible: primary.deductible,
      outOfPocketMax: primary.outOfPocketMax,
      copays: primary.copays,
      rxBin: primary.rxBin,
      rxPcn: primary.rxPcn,
      rxGrp: primary.rxGrp,
      doctors: allDoctors,
      keepCardImage,
      cards: primary.cards
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

    setExpandedPolicyIds(prev => ({
      ...prev,
      [targetPolicyId]: true
    }));
    setEditingPolicyId(null);
    setHealthView('saved');
  };

  const handleCancelReview = () => {
    setEditingPolicyId(null);
    if (policies.length > 0) {
      setHealthView('saved');
    } else {
      setHealthView('empty');
    }
  };

  const handleRemovePolicy = (policyId) => {
    const updatedPolicies = policies.filter(p => p.id !== policyId);
    const primary = updatedPolicies[0] || null;
    const nextHealth = {
      ...health,
      saved: updatedPolicies.length > 0,
      policies: updatedPolicies,
      provider: primary ? primary.provider : '',
      planName: primary ? primary.planName : '',
      memberId: primary ? primary.memberId : '',
      groupNumber: primary ? primary.groupNumber : '',
      network: primary ? primary.network : '',
      memberName: primary ? primary.memberName : '',
      insuranceType: primary ? primary.insuranceType : 'Medical',
      rxBin: primary ? primary.rxBin : '',
      rxPcn: primary ? primary.rxPcn : '',
      rxGrp: primary ? primary.rxGrp : '',
      deductible: primary ? primary.deductible : null,
      outOfPocketMax: primary ? primary.outOfPocketMax : null,
      copays: primary ? primary.copays : { primaryCare: null, specialist: null, urgentCare: null, er: null, rxGeneric: null },
      cards: primary ? (primary.cards || []) : [],
      doctors: updatedPolicies.filter(p => p.doctor && p.doctor.name).map(p => ({
        id: `doc-${p.id}`,
        name: p.doctor.name,
        specialty: p.doctor.specialty || 'Primary care (PCP)',
        phone: p.doctor.phone || '',
        office: p.doctor.office || ''
      }))
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

    if (updatedPolicies.length === 0) {
      setHealthView('empty');
    }
  };

  const handleOpenDoctorEdit = (policy) => {
    setEditingDoctorPolicyId(policy.id);
    setInlineDoctorForm({
      name: policy.doctor?.name || '',
      specialty: policy.doctor?.specialty || 'Primary care (PCP)',
      office: policy.doctor?.office || '',
      phone: policy.doctor?.phone || ''
    });
  };

  const handleAssignDoctorToPolicy = (policyId, doctorName) => {
    if (doctorName === '__NEW__') {
      const pol = policies.find(p => p.id === policyId) || { id: policyId };
      handleOpenDoctorEdit(pol);
      return;
    }
    const found = allAvailableDoctors.find(d => d.name === doctorName) || null;
    const updatedPolicies = policies.map(p => {
      if (p.id !== policyId) return p;
      return {
        ...p,
        doctor: found ? { ...found } : null
      };
    });

    const nextHealth = {
      ...health,
      policies: updatedPolicies
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
  };

  const handleSaveInlineDoctor = (policyId) => {
    const updatedPolicies = policies.map(p => {
      if (p.id !== policyId) return p;
      return {
        ...p,
        doctor: inlineDoctorForm.name.trim() ? {
          name: inlineDoctorForm.name.trim(),
          specialty: inlineDoctorForm.specialty.trim() || 'Primary care (PCP)',
          office: inlineDoctorForm.office.trim(),
          phone: inlineDoctorForm.phone.trim()
        } : null
      };
    });

    const nextHealth = {
      ...health,
      policies: updatedPolicies
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

    setEditingDoctorPolicyId(null);
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
      onSyncUtilitiesToBills({
        ...metrics,
        homeCostItems
      });
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
      {/* SECTION 1: HOUSEHOLD                                              */}
      {/* ================================================================= */}
      {section === 'household' && (
        <div className="p-4 sm:p-5 flex flex-col gap-5">
          {/* ============================================================= */}
          {/* VIEW A: STEP-BY-STEP QUESTION FLOW                            */}
          {/* ============================================================= */}
          {householdView === 'wizard' && (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {/* Wizard Top Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#18457c] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      Question {wizardStep} of {totalWizardSteps}
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">
                      {wizardStep === 1 && 'Where is your home & what type is it?'}
                      {wizardStep === 2 && 'Who lives in your home?'}
                      {wizardStep === 3 && 'What heating & cooling systems do you use?'}
                      {wizardStep === 4 && 'Electric vehicle charging at home'}
                      {wizardStep === 5 && 'Do you have a swimming pool or spa?'}
                      {wizardStep === 6 && 'Rooftop solar panels & battery storage'}
                      {wizardStep === 7 && 'Household Providers & Plan Types'}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {wizardStep === 1 && 'Search your address or paste a Zillow URL to auto-fill specs, or choose manually.'}
                    {wizardStep === 2 && 'Sets baseline water, electricity, and groceries.'}
                    {wizardStep === 3 && 'Determines seasonal gas furnace and electric cooling loads.'}
                    {wizardStep === 4 && 'Details about your home charger, schedule, and daily charging needs.'}
                    {wizardStep === 5 && 'Pool filtration pumps and water heaters impact monthly energy bills.'}
                    {wizardStep === 6 && 'Calculates monthly solar generation, offset rates, and battery backup.'}
                    {wizardStep === 7 && 'Select your internet, phone, utility, and home service providers and plan types. Bills are only shown once pulled from actual payments.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHouseholdView('saved');
                      setIsHouseholdExpanded(true);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Skip to overview
                  </button>
                </div>
              </div>

              {/* Progress Indicator Bar */}
              <div className="w-full bg-slate-100 h-1.5">
                <div
                  className="bg-[#18457c] h-1.5 transition-all duration-300"
                  style={{ width: `${(wizardStep / totalWizardSteps) * 100}%` }}
                />
              </div>

              {/* Question Step Content */}
              <div className="p-5 sm:p-6 flex flex-col gap-5">
                {/* ------------------------------------------------------- */}
                {/* STEP 1: PROPERTY & DWELLING                             */}
                {/* ------------------------------------------------------- */}
                {wizardStep === 1 && (
                  <div className="flex flex-col gap-4">
                    <form onSubmit={handleFetchProperty} className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={propertyUrlInput}
                          onChange={e => setPropertyUrlInput(e.target.value)}
                          placeholder="Type street address or paste Zillow URL (e.g. 8657 N Ann Ave, Fresno, CA 93720)..."
                          className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18457c]/20 text-slate-900"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isFetchingProperty || !propertyUrlInput.trim()}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#18457c] hover:bg-[#12345e] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                      >
                        {isFetchingProperty ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Fetching...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-3.5 h-3.5" />
                            <span>Fetch Specs</span>
                          </>
                        )}
                      </button>
                    </form>

                    {propertyLookupError && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{propertyLookupError}</span>
                      </div>
                    )}
                    {propertyLookupSuccess && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{propertyLookupSuccess}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs pt-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">Home Type</span>
                        <select
                          value={householdProfile.dwellingType || 'single_family'}
                          onChange={e => handleFieldChange('dwellingType', e.target.value)}
                          className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none cursor-pointer"
                        >
                          {DWELLING_TYPES.map(d => (
                            <option key={d.id} value={d.id}>{d.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">Bedrooms</span>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={householdProfile.bedrooms || 3}
                          onChange={e => handleFieldChange('bedrooms', Number(e.target.value) || 1)}
                          className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                        />
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">Bathrooms</span>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="20"
                          value={householdProfile.bathrooms || 2}
                          onChange={e => handleFieldChange('bathrooms', Number(e.target.value) || 1)}
                          className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                        />
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">Home Sq Ft</span>
                        <input
                          type="number"
                          value={householdProfile.sqFt || 2100}
                          onChange={e => handleFieldChange('sqFt', Number(e.target.value) || 1000)}
                          className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                        />
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">Year Built</span>
                        <input
                          type="number"
                          value={householdProfile.yearBuilt || 2004}
                          onChange={e => handleFieldChange('yearBuilt', Number(e.target.value) || 2000)}
                          className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                        />
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">Lot Size</span>
                        <input
                          type="text"
                          value={householdProfile.lotSize || '6,500 sq ft'}
                          onChange={e => handleFieldChange('lotSize', e.target.value)}
                          className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                        />
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">Est. Value (not an appraisal)</span>
                        <input
                          type="text"
                          value={householdProfile.estimatedValue || '$425,000'}
                          onChange={e => handleFieldChange('estimatedValue', e.target.value)}
                          className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                        />
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">County</span>
                        <input
                          type="text"
                          value={householdProfile.county || 'Fresno County'}
                          onChange={e => handleFieldChange('county', e.target.value)}
                          className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                        />
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">Garage</span>
                        <input
                          type="text"
                          value={householdProfile.garage || 'Attached 2-Car Garage'}
                          onChange={e => handleFieldChange('garage', e.target.value)}
                          className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                        />
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">Utility Region</span>
                        <select
                          value={householdProfile.utilityRegionId || 'pge_norcal'}
                          onChange={e => handleFieldChange('utilityRegionId', e.target.value)}
                          className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none cursor-pointer truncate"
                        >
                          {UTILITY_REGIONS.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* STEP 2: HOUSEHOLD SIZE & OWNERSHIP                      */}
                {/* ------------------------------------------------------- */}
                {wizardStep === 2 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    {/* Stepper */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#18457c]" />
                        <span>How many people live here?</span>
                      </span>
                      <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('householdSize', Math.max(1, (Number(householdProfile.householdSize) || 1) - 1))}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 transition-colors cursor-pointer flex items-center justify-center text-base"
                        >
                          -
                        </button>
                        <span className="font-black text-base text-slate-900">{householdProfile.householdSize || 4} People</span>
                        <button
                          type="button"
                          onClick={() => handleFieldChange('householdSize', Math.min(12, (Number(householdProfile.householdSize) || 1) + 1))}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 transition-colors cursor-pointer flex items-center justify-center text-base"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Own or Rent */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-700 block">Do you own or rent this property?</span>
                      <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('ownership', 'own')}
                          className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${(householdProfile.ownership || 'own') === 'own' ? 'bg-white text-[#18457c] shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Homeowner (Own)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFieldChange('ownership', 'rent')}
                          className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${householdProfile.ownership === 'rent' ? 'bg-white text-[#18457c] shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Renter (Lease)
                        </button>
                      </div>
                    </div>

                    {/* CARE discount */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-700 block">Income Discount Program</span>
                      <label className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 cursor-pointer hover:border-emerald-300 transition-colors">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-emerald-800">PG&E CARE / FERA</span>
                          <span className="text-[10px] text-slate-400">~30-35% electric & 20% gas discount</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(householdProfile.hasCareDiscount)}
                          onChange={e => handleFieldChange('hasCareDiscount', e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* STEP 3: HEATING, COOLING & WATER                        */}
                {/* ------------------------------------------------------- */}
                {wizardStep === 3 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span>Home Heating System</span>
                      </span>
                      <select
                        value={householdProfile.heatingType || 'natural_gas_furnace'}
                        onChange={e => handleFieldChange('heatingType', e.target.value)}
                        className="w-full p-2.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
                      >
                        {HOME_QUESTIONNAIRE_OPTIONS.heating.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-sky-500" />
                        <span>Air Conditioning / Cooling</span>
                      </span>
                      <select
                        value={householdProfile.coolingType || 'central_ac'}
                        onChange={e => handleFieldChange('coolingType', e.target.value)}
                        className="w-full p-2.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
                      >
                        {HOME_QUESTIONNAIRE_OPTIONS.cooling.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        <span>Water Heater Type</span>
                      </span>
                      <select
                        value={householdProfile.waterHeaterType || 'natural_gas_tank'}
                        onChange={e => handleFieldChange('waterHeaterType', e.target.value)}
                        className="w-full p-2.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
                      >
                        {HOME_QUESTIONNAIRE_OPTIONS.waterHeater.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* STEP 4: ELECTRIC VEHICLE AT HOME                        */}
                {/* ------------------------------------------------------- */}
                {wizardStep === 4 && (
                  <div className="flex flex-col gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 to-blue-50/50 border border-indigo-200/80 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <BatteryCharging className="w-4 h-4 text-indigo-600" />
                          <span>Do you have an electric vehicle (EV or PHEV) at home?</span>
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          If yes, we can map your home charging schedule and compute your off-peak electric rates.
                        </p>
                      </div>

                      <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('hasEvAtHome', true)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${householdProfile.hasEvAtHome !== false ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFieldChange('hasEvAtHome', false)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${householdProfile.hasEvAtHome === false ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {householdProfile.hasEvAtHome !== false && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-1.5">
                          <span className="text-[11px] font-bold text-slate-700 block">
                            Do you have a charger at home?
                          </span>
                          <select
                            value={householdProfile.evChargerType || 'level2_240v'}
                            onChange={e => handleFieldChange('evChargerType', e.target.value)}
                            className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
                          >
                            {HOME_QUESTIONNAIRE_OPTIONS.evCharger.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-1.5">
                          <span className="text-[11px] font-bold text-slate-700 block">
                            How often do you plug in at home?
                          </span>
                          <select
                            value={householdProfile.evHomeChargingFrequency || 'daily'}
                            onChange={e => handleFieldChange('evHomeChargingFrequency', e.target.value)}
                            className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
                          >
                            {HOME_QUESTIONNAIRE_OPTIONS.evChargingFrequency.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* If user selects "never" for charging at home, remove the other questions related to miles and charging */}
                        {householdProfile.evHomeChargingFrequency === 'never' ? (
                          <div className="sm:col-span-2 lg:col-span-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-2">
                            <Info className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>You selected <strong>Never charge at home</strong>. Home charging mileage and schedule questions are excluded, and $0 home charging load is added to your electric bill.</span>
                          </div>
                        ) : (
                          <>
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-1.5">
                              <span className="text-[11px] font-bold text-slate-700 block">
                                What time of day do you typically charge?
                              </span>
                              <select
                                value={householdProfile.evChargingSchedule || 'overnight_offpeak'}
                                onChange={e => handleFieldChange('evChargingSchedule', e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
                              >
                                {HOME_QUESTIONNAIRE_OPTIONS.evChargingSchedule.map(opt => (
                                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                              </select>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-700">Daily miles charged at home:</span>
                                <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                                  ~{((Number(householdProfile.evDailyHomeMiles) || 35) * 30).toLocaleString()} mi/mo
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <input
                                  type="range"
                                  min="5"
                                  max="120"
                                  step="5"
                                  value={householdProfile.evDailyHomeMiles || 35}
                                  onChange={e => handleFieldChange('evDailyHomeMiles', Number(e.target.value))}
                                  className="flex-1 accent-indigo-600 cursor-pointer"
                                />
                                <span className="font-extrabold text-slate-900 w-12 text-right">
                                  {householdProfile.evDailyHomeMiles || 35} mi
                                </span>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-1.5 sm:col-span-2">
                              <span className="text-[11px] font-bold text-slate-700 block">
                                Do you use free public or workplace chargers?
                              </span>
                              <select
                                value={householdProfile.evFreeWorkplaceCharging || 'no'}
                                onChange={e => handleFieldChange('evFreeWorkplaceCharging', e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
                              >
                                {HOME_QUESTIONNAIRE_OPTIONS.evFreeWorkplaceCharging.map(opt => (
                                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* STEP 5: SWIMMING POOL OR SPA                            */}
                {/* ------------------------------------------------------- */}
                {wizardStep === 5 && (
                  <div className="flex flex-col gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <Droplets className="w-4 h-4 text-blue-500" />
                          <span>Do you have a swimming pool or hot tub / spa?</span>
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Filtration pump schedules and gas/heat-pump heaters contribute significantly to energy bills.
                        </p>
                      </div>

                      <select
                        value={householdProfile.poolOrSpa || 'none'}
                        onChange={e => handleFieldChange('poolOrSpa', e.target.value)}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
                      >
                        {HOME_QUESTIONNAIRE_OPTIONS.poolOrSpa.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {householdProfile.poolOrSpa && householdProfile.poolOrSpa !== 'none' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-700 block mb-1.5">Pool Pump Type</span>
                          <select
                            value={householdProfile.poolPumpType || 'variable_speed'}
                            onChange={e => handleFieldChange('poolPumpType', e.target.value)}
                            className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
                          >
                            {HOME_QUESTIONNAIRE_OPTIONS.poolPump.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-700 block mb-1.5">Pool / Spa Heating</span>
                          <select
                            value={householdProfile.poolHeating || 'none'}
                            onChange={e => handleFieldChange('poolHeating', e.target.value)}
                            className="w-full p-2 bg-white rounded-lg border border-slate-200 font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
                          >
                            {HOME_QUESTIONNAIRE_OPTIONS.poolHeating.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* STEP 6: SOLAR & BATTERY                                 */}
                {/* ------------------------------------------------------- */}
                {wizardStep === 6 && (
                  <div className="flex flex-col gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <Sun className="w-4 h-4 text-amber-500" />
                          <span>Do you have rooftop solar panels?</span>
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Solar reduces daytime grid electricity demand and provides net metering credits.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('hasSolar', !householdProfile.hasSolar)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${householdProfile.hasSolar ? 'bg-[#18457c]' : 'bg-slate-300'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${householdProfile.hasSolar ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>
                    </div>

                    {Boolean(householdProfile.hasSolar) && (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] font-semibold text-slate-400 block">Panel Count</span>
                            <input
                              type="number"
                              min="1"
                              max="120"
                              value={householdProfile.solarPanelCount || 20}
                              onChange={e => handleFieldChange('solarPanelCount', Number(e.target.value) || 1)}
                              className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                            />
                          </div>

                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] font-semibold text-slate-400 block">Watts Per Panel</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <input
                                type="number"
                                min="150"
                                max="600"
                                step="5"
                                value={householdProfile.solarWattsPerPanel || 400}
                                onChange={e => handleFieldChange('solarWattsPerPanel', Number(e.target.value) || 350)}
                                className="w-20 font-bold text-slate-900 bg-transparent focus:outline-none"
                              />
                              <span className="text-slate-500 font-semibold">W</span>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-amber-700 block">Computed System Size</span>
                            <div className="text-base font-black text-amber-900 mt-0.5">
                              {(((Number(householdProfile.solarPanelCount) || 20) * (Number(householdProfile.solarWattsPerPanel) || 400)) / 1000).toFixed(2)} kW
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] font-semibold text-slate-400 block">System Ownership</span>
                            <select
                              value={householdProfile.solarOwnership || 'owned'}
                              onChange={e => handleFieldChange('solarOwnership', e.target.value)}
                              className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none cursor-pointer"
                            >
                              {HOME_QUESTIONNAIRE_OPTIONS.solarOwnership.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] font-semibold text-slate-400 block">Utility Billing Plan</span>
                            <select
                              value={householdProfile.solarBillingPlan || 'nem_2'}
                              onChange={e => handleFieldChange('solarBillingPlan', e.target.value)}
                              className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none cursor-pointer truncate"
                            >
                              {HOME_QUESTIONNAIRE_OPTIONS.solarBillingPlans.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] font-semibold text-slate-400 block">Peak Sun Hours (Assumption)</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <input
                                type="number"
                                step="0.1"
                                min="2.0"
                                max="9.0"
                                value={householdProfile.solarPeakSunHours || 5.5}
                                onChange={e => handleFieldChange('solarPeakSunHours', Number(e.target.value) || 5.5)}
                                className="w-16 font-bold text-slate-900 bg-transparent focus:outline-none"
                              />
                              <span className="text-slate-400">hrs/day</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* STEP 7: PROVIDERS & PLAN TYPES                          */}
                {/* ------------------------------------------------------- */}
                {wizardStep === 7 && (
                  <div className="flex flex-col gap-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. Home Internet & Plan */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Wifi className="w-4 h-4 text-indigo-600" />
                          <span>1. Home Internet & WiFi</span>
                        </span>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 block mb-1">What provider do you use?</span>
                          <input
                            type="text"
                            value={householdProfile.internetProvider || ''}
                            onChange={e => handleFieldChange('internetProvider', e.target.value)}
                            placeholder="e.g. Xfinity, AT&T Fiber, Spectrum, Starlink..."
                            className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            {['Xfinity', 'AT&T Fiber', 'Spectrum', 'Verizon Fios', 'Frontier', 'Starlink'].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => handleFieldChange('internetProvider', p)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${householdProfile.internetProvider === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 block mb-1">What type of plan are you on?</span>
                          <select
                            value={householdProfile.internetPlanType || 'gigabit_fiber'}
                            onChange={e => handleFieldChange('internetPlanType', e.target.value)}
                            className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none cursor-pointer"
                          >
                            {(HOUSEHOLD_PLAN_OPTIONS.internet || []).map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 2. Mobile & Cell Phone Plan */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-purple-600" />
                            <span>2. Mobile & Cell Phone</span>
                          </span>
                          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] font-semibold text-slate-500">Lines:</span>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={householdProfile.phoneLines || 3}
                              onChange={e => handleFieldChange('phoneLines', Number(e.target.value) || 1)}
                              className="w-7 text-center font-bold text-slate-900 bg-transparent focus:outline-none text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 block mb-1">What carrier / provider do you use?</span>
                          <input
                            type="text"
                            value={householdProfile.phoneProvider || ''}
                            onChange={e => handleFieldChange('phoneProvider', e.target.value)}
                            placeholder="e.g. T-Mobile, AT&T, Verizon, Mint Mobile..."
                            className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            {['T-Mobile', 'AT&T', 'Verizon', 'Mint Mobile', 'Google Fi', 'Visible'].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => handleFieldChange('phoneProvider', p)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${householdProfile.phoneProvider === p ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 block mb-1">What type of phone plan are you on?</span>
                          <select
                            value={householdProfile.phonePlanType || 'unlimited_premium'}
                            onChange={e => handleFieldChange('phonePlanType', e.target.value)}
                            className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none cursor-pointer"
                          >
                            {(HOUSEHOLD_PLAN_OPTIONS.phone || []).map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 3. Electric & Gas Utility Rate Plan */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span>3. Electric & Gas Utility Plan</span>
                        </span>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 block mb-1">Electric & Gas Utility Provider</span>
                          <input
                            type="text"
                            value={householdProfile.electricGasProvider || (UTILITY_REGIONS.find(r => r.id === householdProfile.utilityRegionId)?.name || 'Pacific Gas & Electric (PG&E)')}
                            onChange={e => handleFieldChange('electricGasProvider', e.target.value)}
                            className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 block mb-1">What utility rate plan are you on?</span>
                          <select
                            value={householdProfile.electricGasPlanType || 'tou_ev'}
                            onChange={e => handleFieldChange('electricGasPlanType', e.target.value)}
                            className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none cursor-pointer"
                          >
                            {(HOUSEHOLD_PLAN_OPTIONS.electricGas || []).map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 4. Municipal Trash & Recycling */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Droplets className="w-4 h-4 text-blue-500" />
                          <span>4. Municipal Trash & Recycling</span>
                        </span>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 block mb-1">Trash & Recycling Provider</span>
                          <input
                            type="text"
                            value={householdProfile.trashProvider || ''}
                            onChange={e => handleFieldChange('trashProvider', e.target.value)}
                            placeholder="e.g. City Municipal Utilities, Waste Management..."
                            className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 block mb-1">What cart size or service plan?</span>
                          <select
                            value={householdProfile.trashPlanType || 'standard_64'}
                            onChange={e => handleFieldChange('trashPlanType', e.target.value)}
                            className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none cursor-pointer"
                          >
                            {(HOUSEHOLD_PLAN_OPTIONS.trash || []).map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 5. Home Security System */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3 md:col-span-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>5. Home Security & Smart Home</span>
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 block mb-1">Security Equipment / Brand</span>
                            <input
                              type="text"
                              value={householdProfile.securityProvider || ''}
                              onChange={e => handleFieldChange('securityProvider', e.target.value)}
                              placeholder="e.g. Ring, ADT, SimpliSafe, Nest, None..."
                              className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                            />
                            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                              {['Ring', 'ADT', 'SimpliSafe', 'Vivint', 'Nest', 'Self-Monitored'].map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => handleFieldChange('securityProvider', p)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${householdProfile.securityProvider === p ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 block mb-1">What security plan are you on?</span>
                            <select
                              value={householdProfile.securityPlanType || 'cloud_video'}
                              onChange={e => handleFieldChange('securityPlanType', e.target.value)}
                              className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none cursor-pointer"
                            >
                              {(HOUSEHOLD_PLAN_OPTIONS.security || []).map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Wizard Bottom Controls */}
              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <button
                  type="button"
                  disabled={wizardStep === 1}
                  onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-2">
                  {wizardStep < totalWizardSteps ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep(Math.min(totalWizardSteps, wizardStep + 1))}
                      className="px-4 py-2 rounded-xl bg-[#18457c] hover:bg-[#12345e] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Next question</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFinishWizard}
                      className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Finish & Save Household</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* VIEW B: MINIMIZED & EXPANDABLE CARD (Similar to Health section)*/}
          {/* ============================================================= */}
          {householdView === 'saved' && (
            <div className="flex flex-col gap-4">
              {/* Header Bar: Title, Property count, and Re-answer questions button */}
              <div className="flex items-center justify-between flex-wrap gap-3 px-1">
                <div>
                  <h2 className="font-semibold text-lg text-slate-900 dark:text-white">Household</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    1 active property · Click to expand or minimize
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWizardStep(1);
                      setHouseholdView('wizard');
                    }}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Sliders className="w-4 h-4 text-slate-500" />
                    <span>Answer questions again</span>
                  </button>
                </div>
              </div>

              {/* Minimized Card Container */}
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden transition-all">
                {/* MINIMIZED HEADER: Name/Address, Type badge, Specs summary, Monthly cost, and Arrow that expands */}
                <div
                  onClick={() => setIsHouseholdExpanded(!isHouseholdExpanded)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors select-none"
                >
                  {/* Starting from the left side: Address / Home Name, Dwelling Type, Specs */}
                  <div className="flex items-center gap-3 flex-wrap min-w-0">
                    {/* 1. Address / Name */}
                    <span className="font-semibold text-slate-900 dark:text-white text-base tracking-tight truncate max-w-[280px] sm:max-w-none">
                      {householdProfile.address || 'Household Property'}
                    </span>

                    {/* 2. Type badge */}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-[#1B4B91] dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                      {DWELLING_TYPES.find(d => d.id === householdProfile.dwellingType)?.label || 'Single-Family House'}
                    </span>

                    {/* Specs summary */}
                    <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline-block truncate">
                      {householdProfile.bedrooms || 3} Beds · {householdProfile.bathrooms || 2} Baths · {Number(householdProfile.sqFt || 2100).toLocaleString()} sq ft
                    </span>

                    {/* Total Monthly Cost summary */}
                    {actualHouseholdBills.length > 0 ? (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-md hidden md:inline-flex items-center gap-1">
                        <span>${totalActualBills.toLocaleString()} /mo from bills</span>
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md hidden md:inline-flex items-center gap-1">
                        <span>No bills synced yet</span>
                      </span>
                    )}

                    {Boolean(householdProfile.hasSolar) && (
                      <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md hidden lg:inline-flex items-center gap-1">
                        <Sun className="w-3.5 h-3.5 text-amber-600" />
                        <span>Solar</span>
                      </span>
                    )}
                  </div>

                  {/* 3. Arrow that when pressed expands the details below it */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHouseholdExpanded(!isHouseholdExpanded);
                    }}
                    aria-label={isHouseholdExpanded ? 'Minimize household details' : 'Expand household details'}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  >
                    {isHouseholdExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    )}
                  </button>
                </div>

                {/* EXPANDED DETAILS BELOW HEADER */}
                {isHouseholdExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-5 bg-slate-50/30">
                    {/* PANEL 1: PROPERTY PANEL */}
                    <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-4">
                      {/* Notice with Refresh & Change Link */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-slate-800">{householdProfile.address || 'Property specs'}</span>
                          <span className="text-[11px] text-slate-400">· {formattedImportTime}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleRefreshProperty}
                            disabled={isFetchingProperty}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isFetchingProperty ? 'animate-spin text-[#18457c]' : ''}`} />
                            <span>{isFetchingProperty ? 'Refreshing...' : 'Refresh'}</span>
                          </button>

                          {householdProfile.zillowUrl && householdProfile.zillowUrl.startsWith('http') && (
                            <a
                              href={householdProfile.zillowUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-[#18457c] transition-colors shadow-2xs"
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
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-600 transition-colors shadow-2xs cursor-pointer"
                          >
                            Change Link
                          </button>
                        </div>
                      </div>

                      {/* Change Link Form if toggled */}
                      {isEditingPropertyLink && (
                        <form onSubmit={handleFetchProperty} className="flex flex-col sm:flex-row gap-2 p-3 bg-blue-50/60 rounded-xl border border-blue-200/70">
                          <input
                            type="text"
                            value={propertyUrlInput}
                            onChange={e => setPropertyUrlInput(e.target.value)}
                            placeholder="Paste Zillow URL or street address..."
                            className="flex-1 text-xs px-3 py-2 bg-white rounded-lg border border-slate-200 focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={isFetchingProperty || !propertyUrlInput.trim()}
                            className="px-3.5 py-2 bg-[#18457c] text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingPropertyLink(false)}
                            className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </form>
                      )}

                      {/* Editable Fields Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block">Home Type</span>
                          <select
                            value={householdProfile.dwellingType || 'single_family'}
                            onChange={e => handleFieldChange('dwellingType', e.target.value)}
                            className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none cursor-pointer"
                          >
                            {DWELLING_TYPES.map(d => (
                              <option key={d.id} value={d.id}>{d.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block">Bedrooms</span>
                          <input
                            type="number"
                            value={householdProfile.bedrooms || 3}
                            onChange={e => handleFieldChange('bedrooms', Number(e.target.value) || 1)}
                            className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block">Bathrooms</span>
                          <input
                            type="number"
                            step="0.5"
                            value={householdProfile.bathrooms || 2}
                            onChange={e => handleFieldChange('bathrooms', Number(e.target.value) || 1)}
                            className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block">Square Footage</span>
                          <input
                            type="number"
                            value={householdProfile.sqFt || 2100}
                            onChange={e => handleFieldChange('sqFt', Number(e.target.value) || 1000)}
                            className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block">Year Built</span>
                          <input
                            type="number"
                            value={householdProfile.yearBuilt || 2004}
                            onChange={e => handleFieldChange('yearBuilt', Number(e.target.value) || 2000)}
                            className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block">Lot Size</span>
                          <input
                            type="text"
                            value={householdProfile.lotSize || '6,500 sq ft'}
                            onChange={e => handleFieldChange('lotSize', e.target.value)}
                            className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block">Est. Value (not an appraisal)</span>
                          <input
                            type="text"
                            value={householdProfile.estimatedValue || '$425,000'}
                            onChange={e => handleFieldChange('estimatedValue', e.target.value)}
                            className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block">County</span>
                          <input
                            type="text"
                            value={householdProfile.county || 'Fresno County'}
                            onChange={e => handleFieldChange('county', e.target.value)}
                            className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block">Garage</span>
                          <input
                            type="text"
                            value={householdProfile.garage || 'Attached 2-Car Garage'}
                            onChange={e => handleFieldChange('garage', e.target.value)}
                            className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block">Utility Region</span>
                          <select
                            value={householdProfile.utilityRegionId || 'pge_norcal'}
                            onChange={e => handleFieldChange('utilityRegionId', e.target.value)}
                            className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none cursor-pointer truncate"
                          >
                            {UTILITY_REGIONS.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* PANEL 2: HOME SYSTEMS & EV CHARGING */}
                    <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-4 text-xs">
                      <div className="font-bold text-slate-900 flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="flex items-center gap-1.5">
                          <Home className="w-4 h-4 text-[#18457c]" />
                          <span>Home Systems & EV Charging</span>
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {householdProfile.householdSize || 4} Residents · {householdProfile.ownership === 'rent' ? 'Renter' : 'Owner'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block">Heating</span>
                          <span className="font-bold text-slate-800 capitalize">
                            {(householdProfile.heatingType || 'natural_gas_furnace').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block">Cooling</span>
                          <span className="font-bold text-slate-800 capitalize">
                            {(householdProfile.coolingType || 'central_ac').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 block">Water Heater</span>
                          <span className="font-bold text-slate-800 capitalize">
                            {(householdProfile.waterHeaterType || 'natural_gas_tank').replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      {householdProfile.hasEvAtHome !== false && (
                        <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 flex flex-col gap-2">
                          <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                            <BatteryCharging className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Home EV Charging Setup</span>
                          </span>
                          {householdProfile.evHomeChargingFrequency === 'never' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-slate-500 block">Charger:</span>
                                <span className="font-bold text-slate-800">
                                  {householdProfile.evChargerType === 'level2_240v' ? 'Level 2 (240V Dedicated)' : householdProfile.evChargerType === 'level1_120v' ? 'Level 1 (120V Outlet)' : 'No Home Charger'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Home Charging:</span>
                                <span className="font-bold text-slate-800">
                                  Never charge at home (100% public / away) · $0 home utility load
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                              <div>
                                <span className="text-slate-500 block">Charger:</span>
                                <span className="font-bold text-slate-800">
                                  {householdProfile.evChargerType === 'level2_240v' ? 'Level 2 (240V Dedicated)' : householdProfile.evChargerType === 'level1_120v' ? 'Level 1 (120V Outlet)' : 'No Home Charger'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Frequency & Timing:</span>
                                <span className="font-bold text-slate-800 capitalize">
                                  {(householdProfile.evHomeChargingFrequency || 'daily')} · {(householdProfile.evChargingSchedule || 'overnight_offpeak').replace(/_/g, ' ')}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Daily Home Miles:</span>
                                <span className="font-bold text-slate-800">
                                  {householdProfile.evDailyHomeMiles || 35} mi/day (~{((Number(householdProfile.evDailyHomeMiles) || 35) * 30).toLocaleString()} mi/mo)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* HOUSEHOLD PROVIDERS SUMMARY (Internet, Phones, Trash, Security) */}
                    <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-3 text-xs">
                      <div className="font-bold text-slate-900 flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="flex items-center gap-1.5">
                          <Wifi className="w-4 h-4 text-[#18457c]" />
                          <span>Household Service Providers</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col">
                          <span className="text-slate-400 block flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-indigo-500" />
                            <span>Internet / WiFi</span>
                          </span>
                          <span className="font-bold text-slate-800 mt-0.5 truncate">
                            {householdProfile.internetProvider || 'Xfinity / Fiber'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col">
                          <span className="text-slate-400 block flex items-center gap-1">
                            <Smartphone className="w-3 h-3 text-purple-500" />
                            <span>Mobile Wireless</span>
                          </span>
                          <span className="font-bold text-slate-800 mt-0.5 truncate">
                            {householdProfile.phoneProvider || 'T-Mobile'} ({householdProfile.phoneLines || 3} lines)
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col">
                          <span className="text-slate-400 block flex items-center gap-1">
                            <Droplets className="w-3 h-3 text-blue-500" />
                            <span>Municipal Trash</span>
                          </span>
                          <span className="font-bold text-slate-800 mt-0.5 truncate">
                            {householdProfile.trashProvider || 'City Waste Services'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col">
                          <span className="text-slate-400 block flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span>Security</span>
                          </span>
                          <span className="font-bold text-slate-800 mt-0.5 truncate">
                            {householdProfile.securityProvider || 'Ring / Smart Home'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* PANEL 3: SOLAR & BATTERY */}
                    {Boolean(householdProfile.hasSolar) && (
                      <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-3 text-xs">
                        <div className="font-bold text-slate-900 flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="flex items-center gap-1.5">
                            <Sun className="w-4 h-4 text-amber-500" />
                            <span>Rooftop Solar & Battery</span>
                          </span>
                          <span className="text-xs font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {(((Number(householdProfile.solarPanelCount) || 20) * (Number(householdProfile.solarWattsPerPanel) || 400)) / 1000).toFixed(2)} kW System
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-400 block">Panels</span>
                            <span className="font-bold text-slate-800">{householdProfile.solarPanelCount || 20} Panels ({householdProfile.solarWattsPerPanel || 400}W)</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-400 block">Ownership</span>
                            <span className="font-bold text-slate-800 capitalize">{householdProfile.solarOwnership || 'owned'}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-400 block">Billing Plan</span>
                            <span className="font-bold text-slate-800 uppercase">{householdProfile.solarBillingPlan || 'nem_2'}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-400 block">Monthly Generation</span>
                            <span className="font-bold text-slate-800">~{metrics.solar?.monthlyKwhEstimate || 1056} kWh/mo</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PANEL 4: HOUSEHOLD BILLS FROM PAYMENTS ONLY */}
                    <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col gap-3">
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-[#18457c]" />
                            <span>Household Bills from Actual Payments</span>
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Only verified bills pulled directly from your payment statements and accounts appear here.
                          </p>
                        </div>

                        {actualHouseholdBills.length > 0 && (
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-500 block">Total from actual bills</span>
                            <span className="text-base font-black text-[#18457c]">
                              ${totalActualBills.toLocaleString()} /mo
                            </span>
                          </div>
                        )}
                      </div>

                      {actualHouseholdBills.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-xs min-w-[550px]">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-2.5 px-3.5">Bill / Provider</th>
                                <th className="py-2.5 px-3.5">Category</th>
                                <th className="py-2.5 px-3.5">Due Date & Status</th>
                                <th className="py-2.5 px-3.5">Source</th>
                                <th className="py-2.5 px-3.5 text-right">Amount Paid</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {actualHouseholdBills.map((b) => (
                                <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-3 px-3.5 font-bold text-slate-900">
                                    <span>{b.name}</span>
                                  </td>
                                  <td className="py-2.5 px-3.5">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                      {b.category || 'Utilities'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3.5 text-slate-600 font-medium">
                                    <span>{b.nextDueDate || `Monthly on Day ${b.dueDay || 15}`}</span>
                                  </td>
                                  <td className="py-2.5 px-3.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>Pulled from payments</span>
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right font-black text-slate-900 text-sm">
                                    ${Number(b.expectedAmount || b.amount || 0).toLocaleString()} <span className="text-slate-400 text-[11px] font-normal">/mo</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                                <td colSpan="4" className="py-3 px-3.5 text-sm text-slate-900">
                                  Total Verified Monthly Household Bills
                                </td>
                                <td className="py-3 px-3.5 text-right text-base font-black text-[#18457c]">
                                  ${totalActualBills.toLocaleString()} <span className="text-xs font-normal text-slate-500">/mo</span>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-center gap-2">
                          <Receipt className="w-8 h-8 text-slate-300" />
                          <b className="text-xs font-bold text-slate-800">No household bills pulled from payments yet</b>
                          <p className="text-[11px] text-slate-500 max-w-sm">
                            Once your payment statements or bank transactions sync in Klarity, your verified utility and household provider bills will automatically appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}
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
                <span className="text-xs text-slate-500 dark:text-slate-400 block">{scanProgress || 'Extracting carrier, plan name, member ID, group number, copays, and doctor…'}</span>
              </div>
            </div>
          )}

          {/* STATE 1: EMPTY (No cards added yet) */}
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
                    Upload a photo of your card or a policy PDF and we’ll fill in the details. You can add multiple cards for medical, dental, vision, or family members.
                  </p>
                  <div className="flex items-center gap-2.5 mt-2 flex-wrap justify-center">
                    <button
                      type="button"
                      onClick={() => handleAddNewCard()}
                      className="px-4 py-2.5 rounded-lg bg-[#1B4B91] hover:bg-[#153c75] text-white font-medium text-sm transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload card or policy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleManualAddCard()}
                      className="px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm transition-colors cursor-pointer"
                    >
                      Enter details manually
                    </button>
                  </div>
                  <small className="text-xs text-slate-400 mt-1">PDF, PNG, JPG or WebP</small>
                </div>
              </div>
            </section>
          )}

          {/* STATE 2: REVIEW / EDIT ("Check what we read") */}
          {healthView === 'review' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                    {editingPolicyId ? 'Edit insurance card' : 'Check what we read'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Compare each field with your card before saving.
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="bg-[#E8EEF8] dark:bg-slate-800/80 text-[#14233B] dark:text-slate-200 rounded-lg px-3.5 py-2.5 text-[13.5px] mb-5">
                  Automatic reading can make mistakes. Verify your name, card type, and coverage numbers below.
                </div>

                {scanFeedback?.type === 'error' && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-[#B3261E] rounded-lg px-3.5 py-2.5 text-[13.5px] mb-5">
                    {scanFeedback.message}
                  </div>
                )}

                {(() => {
                  const previewCards = pendingCards.length > 0
                    ? pendingCards
                    : (editingPolicyId ? (policies.find(p => p.id === editingPolicyId)?.cards || []) : (health.cards || []));
                  const front = previewCards[0]?.dataUrl;
                  if (!front || String(front).startsWith('data:application/pdf')) return null;
                  return (
                    <div className="max-w-[360px] mb-5">
                      <InsuranceCardFlip
                        front={front}
                        back={previewCards[1]?.dataUrl}
                        flipped={cardFlipped}
                        onFlip={() => setCardFlipped(!cardFlipped)}
                        onOpen={(url, title) => { setViewingCardPhoto(url); setViewingCardTitle(title); }}
                      />
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Name on insurance card */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Name on insurance card <span className="text-[#1B4B91]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ZIYAD O ELMAHI"
                      value={reviewForm.memberName}
                      onChange={(e) => setReviewForm({ ...reviewForm, memberName: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  {/* Type of insurance */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Type of insurance <span className="text-[#1B4B91]">*</span>
                    </label>
                    <select
                      value={reviewForm.insuranceType}
                      onChange={(e) => setReviewForm({ ...reviewForm, insuranceType: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    >
                      <option value="Medical">Medical</option>
                      <option value="Dental">Dental</option>
                      <option value="Vision">Vision</option>
                      <option value="Prescription">Prescription (Rx)</option>
                      <option value="Supplemental">Supplemental</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Plan name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Plan name</label>
                    <input
                      type="text"
                      placeholder="e.g. SignatureValue Alliance HMO"
                      value={reviewForm.planName}
                      onChange={(e) => setReviewForm({ ...reviewForm, planName: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  {/* Carrier */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Carrier</label>
                    <input
                      type="text"
                      placeholder="e.g. UnitedHealthcare, Blue Shield, Kaiser"
                      value={reviewForm.provider}
                      onChange={(e) => setReviewForm({ ...reviewForm, provider: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  {/* Member ID */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Member ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 8750439-04"
                      value={reviewForm.memberId}
                      onChange={(e) => setReviewForm({ ...reviewForm, memberId: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  {/* Group number */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Group number</label>
                    <input
                      type="text"
                      placeholder="e.g. 682304"
                      value={reviewForm.groupNumber}
                      onChange={(e) => setReviewForm({ ...reviewForm, groupNumber: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  {/* Primary care copay */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Primary care copay</label>
                    <input
                      type="text"
                      placeholder="e.g. $15"
                      value={reviewForm.primaryCare}
                      onChange={(e) => setReviewForm({ ...reviewForm, primaryCare: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  {/* Specialist copay */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Specialist copay</label>
                    <input
                      type="text"
                      placeholder="e.g. $15"
                      value={reviewForm.specialist}
                      onChange={(e) => setReviewForm({ ...reviewForm, specialist: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  {/* Emergency room copay */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Emergency room copay</label>
                    <input
                      type="text"
                      placeholder="e.g. $50"
                      value={reviewForm.er}
                      onChange={(e) => setReviewForm({ ...reviewForm, er: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  {/* Generic prescription */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Generic prescription</label>
                    <input
                      type="text"
                      placeholder="e.g. $10"
                      value={reviewForm.rxGeneric}
                      onChange={(e) => setReviewForm({ ...reviewForm, rxGeneric: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  {/* Deductible */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Deductible</label>
                    <input
                      type="text"
                      placeholder="e.g. $0"
                      value={reviewForm.deductible}
                      onChange={(e) => setReviewForm({ ...reviewForm, deductible: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  {/* Out of pocket max */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Out-of-pocket maximum</label>
                    <input
                      type="text"
                      placeholder="e.g. $1,500"
                      value={reviewForm.outOfPocketMax}
                      onChange={(e) => setReviewForm({ ...reviewForm, outOfPocketMax: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  {/* Primary Doctor Section in Form */}
                  <div className="md:col-span-2 pt-3 border-t border-slate-200 dark:border-slate-700/80">
                    <div className="flex items-center gap-2 mb-2">
                      <Stethoscope className="w-4 h-4 text-[#1B4B91] dark:text-[#7AA7F0]" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Primary Doctor / PCP (Associated with this card)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Doctor or clinic name</label>
                        <input
                          type="text"
                          placeholder="e.g. MONTANA, ANTHONY W"
                          value={reviewForm.doctorName}
                          onChange={(e) => setReviewForm({ ...reviewForm, doctorName: e.target.value })}
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Phone</label>
                        <input
                          type="tel"
                          placeholder="(559) 299-2200"
                          value={reviewForm.doctorPhone}
                          onChange={(e) => setReviewForm({ ...reviewForm, doctorPhone: e.target.value })}
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Clinic / Office</label>
                        <input
                          type="text"
                          placeholder="e.g. SANTE COMMUNITY PHYS-FRESNO"
                          value={reviewForm.doctorOffice}
                          onChange={(e) => setReviewForm({ ...reviewForm, doctorOffice: e.target.value })}
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                        />
                      </div>
                    </div>
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
                    {editingPolicyId ? 'Update insurance' : 'Save insurance'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* STATE 3: SAVED (Collapsible Multi-Card Insurance List) */}
          {healthView === 'saved' && (
            <div className="flex flex-col gap-4">
              {/* Header Bar with Count and Add Card button */}
              <div className="flex items-center justify-between flex-wrap gap-3 px-1">
                <div>
                  <h2 className="font-semibold text-lg text-slate-900 dark:text-white">Health insurance</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {policies.length === 1 ? '1 active card' : `${policies.length} active cards`} · Click any card to expand or minimize
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddNewCard}
                    className="px-3.5 py-2 rounded-lg bg-[#1B4B91] hover:bg-[#153c75] text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add insurance card</span>
                  </button>
                </div>
              </div>

              {/* Cards List */}
              {policies.map((policy, pIdx) => {
                const isExpanded = isPolicyExpanded(policy.id, pIdx);
                const isMemberIdShown = revealedMemberIds[policy.id];
                const isCardFlipped = flippedCards[policy.id];
                const isCopied = copiedPolicyId === policy.id;
                const isEditingDoc = editingDoctorPolicyId === policy.id;

                return (
                  <section
                    key={policy.id || pIdx}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden transition-all"
                  >
                    {/* MINIMIZED HEADER: Name on insurance card, What type of insurance, and an arrow that when pressed expands the details below it */}
                    <div
                      onClick={() => togglePolicyExpanded(policy.id, pIdx)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors select-none"
                    >
                      {/* Starting from the left side: Name on insurance card, What type of insurance */}
                      <div className="flex items-center gap-3 flex-wrap min-w-0">
                        {/* 1. Name on insurance card */}
                        <span className="font-semibold text-slate-900 dark:text-white text-base tracking-tight truncate max-w-[240px] sm:max-w-none">
                          {policy.memberName || 'Name on insurance card'}
                        </span>

                        {/* 2. What type of insurance badge */}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-[#1B4B91] dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                          {policy.insuranceType || 'Medical'}
                        </span>

                        {/* Plan & Carrier summary */}
                        {(policy.provider || policy.planName) && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline-block truncate max-w-[280px]">
                            {[policy.provider, policy.planName].filter(Boolean).join(' · ')}
                          </span>
                        )}

                        {/* Doctor badge in header if assigned */}
                        {policy.doctor?.name && (
                          <span className="text-xs text-slate-600 dark:text-slate-400 hidden md:inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            <Stethoscope className="w-3 h-3 text-[#1B4B91] dark:text-[#7AA7F0]" />
                            <span className="font-medium text-slate-800 dark:text-slate-200">{policy.doctor.name}</span>
                          </span>
                        )}
                      </div>

                      {/* 3. Arrow that when pressed expands the details below it */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePolicyExpanded(policy.id, pIdx);
                        }}
                        aria-label={isExpanded ? 'Minimize insurance card details' : 'Expand insurance card details'}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        )}
                      </button>
                    </div>

                    {/* EXPANDED DETAILS BELOW HEADER */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 dark:border-slate-800">
                        <div className="p-6 grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6 items-start">
                          {/* Left Column: Physical or Styled Card */}
                          <div>
                            {policy.cards?.[0]?.dataUrl && !String(policy.cards[0].dataUrl).startsWith('data:application/pdf') ? (
                              <InsuranceCardFlip
                                front={policy.cards[0].dataUrl}
                                back={policy.cards[1]?.dataUrl}
                                flipped={isCardFlipped}
                                onFlip={() => setFlippedCards(p => ({ ...p, [policy.id]: !p[policy.id] }))}
                                onOpen={(url, title) => { setViewingCardPhoto(url); setViewingCardTitle(title); }}
                              />
                            ) : (
                              <div className="bg-[#1B4B91] text-white rounded-2xl p-5 flex flex-col justify-between aspect-[1.6/1] shadow-md min-h-[190px]">
                                <div className="flex items-center justify-between text-[13px] opacity-90">
                                  <span className="font-medium">{policy.provider || 'Health Insurance'}</span>
                                  {policy.network ? <span className="font-semibold">{policy.network}</span> : null}
                                </div>

                                <div className="font-serif text-xl font-medium tracking-tight leading-tight my-2">
                                  {policy.planName || 'Coverage Plan'}
                                </div>

                                <div>
                                  <div className="text-lg font-mono font-medium tracking-wider tabular-nums">
                                    {policy.memberId ? (
                                      isMemberIdShown
                                        ? policy.memberId
                                        : (policy.memberId.length > 4
                                            ? `•••• •••• ${policy.memberId.slice(-4)}`
                                            : policy.memberId)
                                    ) : (
                                      <span className="text-xs opacity-60 font-sans tracking-normal">No Member ID</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[13px] opacity-90 mt-1">
                                  {policy.groupNumber ? <span>Group {policy.groupNumber}</span> : <span />}
                                  {policy.insuranceType && (
                                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-white/20">
                                      {policy.insuranceType}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Member ID mini controls */}
                            <div className="flex items-center gap-2 mt-2.5">
                              <button
                                type="button"
                                onClick={() => setRevealedMemberIds(p => ({ ...p, [policy.id]: !p[policy.id] }))}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                              >
                                {isMemberIdShown ? 'Hide' : 'Show'} member ID
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyMemberId(policy)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                              >
                                {isCopied ? (
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

                            {/* Pharmacy RX pills if available */}
                            {(policy.rxBin || policy.rxPcn || policy.rxGrp) && (
                              <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs grid grid-cols-3 gap-1 text-center font-mono">
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">Rx BIN</span>
                                  <b>{policy.rxBin || '—'}</b>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">Rx PCN</span>
                                  <b>{policy.rxPcn || '—'}</b>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">Rx GRP</span>
                                  <b>{policy.rxGrp || '—'}</b>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Column: Coverage Table + Doctor Details */}
                          <div className="flex flex-col gap-4">
                            {/* Coverage Rows */}
                            <div className="flex flex-col text-sm divide-y divide-slate-100 dark:divide-slate-800">
                              <div className="flex items-center justify-between py-2.5">
                                <span className="text-slate-500 dark:text-slate-400">Primary care copay</span>
                                <b className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                  {policy.copays?.primaryCare != null ? `$${policy.copays.primaryCare}` : '—'}
                                </b>
                              </div>
                              <div className="flex items-center justify-between py-2.5">
                                <span className="text-slate-500 dark:text-slate-400">Specialist copay</span>
                                <b className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                  {policy.copays?.specialist != null ? `$${policy.copays.specialist}` : '—'}
                                </b>
                              </div>
                              <div className="flex items-center justify-between py-2.5">
                                <span className="text-slate-500 dark:text-slate-400">Emergency room copay</span>
                                <b className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                  {policy.copays?.er != null ? `$${policy.copays.er}` : '—'}
                                </b>
                              </div>
                              <div className="flex items-center justify-between py-2.5">
                                <span className="text-slate-500 dark:text-slate-400">Generic prescription</span>
                                <b className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                  {policy.copays?.rxGeneric != null ? `$${policy.copays.rxGeneric}` : '—'}
                                </b>
                              </div>
                              <div className="flex items-center justify-between py-2.5">
                                <span className="text-slate-500 dark:text-slate-400">Deductible</span>
                                <b className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                  {policy.deductible != null && policy.deductible !== '' ? `$${Number(policy.deductible).toLocaleString()}` : '—'}
                                </b>
                              </div>
                              <div className="flex items-center justify-between py-2.5">
                                <span className="text-slate-500 dark:text-slate-400">Out-of-pocket maximum</span>
                                <b className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                  {policy.outOfPocketMax != null && policy.outOfPocketMax !== '' ? `$${Number(policy.outOfPocketMax).toLocaleString()}` : '—'}
                                </b>
                              </div>
                            </div>

                            {/* DOCTOR SECTION DIRECTLY IN THIS CARD DROP DOWN */}
                            <div className="mt-1 p-4.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <Stethoscope className="w-4 h-4 text-[#1B4B91] dark:text-[#7AA7F0]" />
                                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Doctor / Care Provider
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  {policy.doctor?.name && !isEditingDoc && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDoctorEdit(policy)}
                                      className="text-xs font-medium text-[#1B4B91] dark:text-[#7AA7F0] hover:underline cursor-pointer"
                                    >
                                      Edit details
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDoctorPolicyId(policy.id);
                                      setInlineDoctorForm({ name: '', specialty: 'Primary care (PCP)', office: '', phone: '' });
                                    }}
                                    className="text-xs font-medium text-[#1B4B91] dark:text-[#7AA7F0] hover:underline cursor-pointer"
                                  >
                                    + Add new doctor
                                  </button>
                                </div>
                              </div>

                              {/* Dropdown selector for doctor on this card */}
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-slate-600 dark:text-slate-400 shrink-0 font-medium">Assigned doctor:</label>
                                <select
                                  value={policy.doctor?.name || ''}
                                  onChange={(e) => handleAssignDoctorToPolicy(policy.id, e.target.value)}
                                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                                >
                                  <option value="">— No doctor assigned —</option>
                                  {allAvailableDoctors.map((doc) => (
                                    <option key={doc.name} value={doc.name}>
                                      {doc.name} {doc.specialty ? `· ${doc.specialty}` : ''}
                                    </option>
                                  ))}
                                  <option value="__NEW__">+ Add new doctor…</option>
                                </select>
                              </div>

                              {/* Active Doctor Details */}
                              {policy.doctor?.name && !isEditingDoc && (
                                <div className="flex items-start justify-between gap-4 flex-wrap pt-2.5 border-t border-slate-200 dark:border-slate-700/80">
                                  <div>
                                    <div className="font-semibold text-slate-900 dark:text-white text-sm">
                                      {policy.doctor.name}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {[policy.doctor.specialty || 'Primary care (PCP)', policy.doctor.office].filter(Boolean).join(' · ')}
                                    </div>
                                  </div>
                                  {policy.doctor.phone && (
                                    <a
                                      href={`tel:${policy.doctor.phone}`}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-[#1B4B91] dark:text-[#7AA7F0] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                      <span>{policy.doctor.phone}</span>
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Inline Doctor Editor */}
                              {isEditingDoc && (
                                <div className="mt-1 flex flex-col gap-3 pt-2.5 border-t border-slate-200 dark:border-slate-700">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                      <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Doctor name</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. Dr. Anthony W Montana"
                                        value={inlineDoctorForm.name}
                                        onChange={(e) => setInlineDoctorForm({ ...inlineDoctorForm, name: e.target.value })}
                                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Specialty</label>
                                      <input
                                        type="text"
                                        placeholder="Primary care (PCP), Dental…"
                                        value={inlineDoctorForm.specialty}
                                        onChange={(e) => setInlineDoctorForm({ ...inlineDoctorForm, specialty: e.target.value })}
                                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Office / Clinic</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. Sante Community Phys-Fresno"
                                        value={inlineDoctorForm.office}
                                        onChange={(e) => setInlineDoctorForm({ ...inlineDoctorForm, office: e.target.value })}
                                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Phone</label>
                                      <input
                                        type="tel"
                                        placeholder="(559) 299-2200"
                                        value={inlineDoctorForm.phone}
                                        onChange={(e) => setInlineDoctorForm({ ...inlineDoctorForm, phone: e.target.value })}
                                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingDoctorPolicyId(null)}
                                      className="px-2.5 py-1 rounded text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveInlineDoctor(policy.id)}
                                      className="px-3 py-1 rounded bg-[#1B4B91] hover:bg-[#153c75] text-white text-xs font-medium cursor-pointer"
                                    >
                                      Save doctor
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Footer Actions per Card */}
                        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap bg-slate-50/50 dark:bg-slate-800/30">
                          {policy.cards && policy.cards.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setDialogCards(policy.cards);
                                setShowCardDialog(true);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                            >
                              View card image
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditPolicy(policy)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReplaceCard(policy)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            Replace card
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePolicy(policy.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#B3261E] hover:text-red-700 transition-colors cursor-pointer"
                          >
                            Remove card
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}

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
                {(() => {
                  const activeCards = (dialogCards && dialogCards.length > 0)
                    ? dialogCards
                    : (pendingCards.length > 0 ? pendingCards : (policies[0]?.cards || health.cards || []));
                  const card0 = activeCards[0];
                  if (!card0?.dataUrl) return <span className="text-xs text-slate-400 font-medium">Front</span>;
                  return card0.dataUrl.startsWith('data:application/pdf') || (card0.name || '').toLowerCase().endsWith('.pdf') ? (
                    <div
                      className="flex flex-col items-center gap-1.5 p-3 text-center cursor-pointer"
                      onClick={() => {
                        setViewingCardPhoto(card0.dataUrl);
                        setViewingCardTitle(`${card0.name || 'Policy PDF'}`);
                      }}
                    >
                      <FileText className="w-8 h-8 text-[#1B4B91]" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                        {card0.name || 'Policy PDF'}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={card0.dataUrl}
                      alt="Front card"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => {
                        setViewingCardPhoto(card0.dataUrl);
                        setViewingCardTitle(`${card0.name || 'Insurance Card'} - Front`);
                      }}
                    />
                  );
                })()}
              </div>

              <div className="aspect-[1.6/1] border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                {(() => {
                  const activeCards = (dialogCards && dialogCards.length > 0)
                    ? dialogCards
                    : (pendingCards.length > 0 ? pendingCards : (policies[0]?.cards || health.cards || []));
                  const card1 = activeCards[1];
                  if (!card1?.dataUrl) return <span className="text-xs text-slate-400 font-medium">Back</span>;
                  return (
                    <img
                      src={card1.dataUrl}
                      alt="Back card"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => {
                        setViewingCardPhoto(card1.dataUrl);
                        setViewingCardTitle(`${card1.name || 'Insurance Card'} - Back`);
                      }}
                    />
                  );
                })()}
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
