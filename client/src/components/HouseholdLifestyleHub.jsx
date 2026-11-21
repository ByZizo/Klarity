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
  ChevronRight,
  UploadCloud,
  FileText,
  Copy,
  Pencil,
  Eye,
  EyeOff,
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
  calculateHouseholdAndFleetMetrics,
  calculateHomeCostBreakdown,
  summarizeHomeCosts,
  detectCarSpecs,
  FREE_EV_CHARGING_GUIDE,
  ZERO_APR_EV_MODELS,
  MAJOR_HEALTH_PLANS,
  POPULAR_CAR_DATABASE,
  POPULAR_CAR_MAKES,
  AUTO_INSURANCE_PROVIDERS,
  AUTO_INSURANCE_TYPES
} from '../utils/householdLifestyleEngine';
import {
  migrateHouseholdProfile,
  syncProfileCompatibilityAliases,
  calculateProfileCompleteness,
  formatHouseholdLabel
} from '../utils/householdSchema';
import HouseholdQuestionnaire from './household/HouseholdQuestionnaire.jsx';
import HouseholdSummary from './household/HouseholdSummary.jsx';


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
            className="rounded-[12px] overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 bg-white cursor-zoom-in"
            aria-label="Open front of card"
          >
            <img src={front} alt="Insurance card front" className="w-full h-full object-cover" />
          </button>
          {back && (
            <button
              type="button"
              onClick={() => onOpen(back, 'Insurance card – Back')}
              style={{ ...face, transform: 'rotateY(180deg)' }}
              className="rounded-[12px] overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 bg-white cursor-zoom-in"
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
          className="mt-2.5 w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
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
  onShowToast,
  bills = [],
  isOverview = false,
  onNavigateToLifestyle
}) {
  const normalizedProfile = useMemo(
    () => migrateHouseholdProfile(householdProfile),
    [householdProfile]
  );

  const handleUpdateNormalizedProfile = (nextV2) => {
    const synced = syncProfileCompatibilityAliases(nextV2);
    onUpdateProfile(synced);
  };

  const [householdScreen, setHouseholdScreen] = useState(() =>
    normalizedProfile?.questionnaireMeta?.inProgress ? 'questionnaire' : 'summary'
  );

  const handleStartQuestionnaire = (requestedMode = 'quick', screenIdx = 0) => {
    const updated = {
      ...normalizedProfile,
      questionnaireMeta: {
        ...(normalizedProfile.questionnaireMeta || {}),
        mode: requestedMode,
        inProgress: true,
        lastScreenIndex: screenIdx
      }
    };
    handleUpdateNormalizedProfile(updated);
    setHouseholdScreen('questionnaire');
  };

  const [section, setSection] = useState('household'); // 'household' | 'auto' | 'health'
  const [autoView, setAutoView] = useState((householdProfile.vehicles && householdProfile.vehicles.length > 0) ? 'saved' : 'empty');
  const [showAddCar, setShowAddCar] = useState(false);
  const autoFileInputRef = useRef(null);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [isScanningAutoCard, setIsScanningAutoCard] = useState(false);
  const [autoScanProgress, setAutoScanProgress] = useState('');
  const [autoScanFeedback, setAutoScanFeedback] = useState(null);
  const [pendingAutoCards, setPendingAutoCards] = useState([]);
  const [autoCardFlipped, setAutoCardFlipped] = useState(false);
  const [keepAutoCardImage, setKeepAutoCardImage] = useState(true);
  const [expandedVehicleIds, setExpandedVehicleIds] = useState({ 'veh-1': true });
  const [revealedPolicyIds, setRevealedPolicyIds] = useState({});
  const [copiedVehiclePolicyId, setCopiedVehiclePolicyId] = useState(null);
  const [flippedAutoCards, setFlippedAutoCards] = useState({});

  const [autoReviewForm, setAutoReviewForm] = useState({
    id: '',
    year: 2025,
    make: 'Toyota',
    model: 'Camry Hybrid',
    trim: '',
    name: '2025 Toyota Camry Hybrid',
    vin: '',
    type: 'hybrid',
    ownership: 'owned',
    driverName: '',
    insuranceProvider: 'GEICO',
    insuranceCoverage: 'full_coverage',
    insuranceMonthly: 120,
    insurancePolicyNumber: '',
    insuranceDeductible: 500,
    odometer: '',
    estimatedValue: '',
    threeYearMileLimit: 36000,
    monthlyMiles: 1000,
    monthlyPayment: 0,
    fuelGrade: 'regular',
    mpgOrEfficiency: 51,
    batteryKwh: 0,
    freeChargingSharePercent: 0
  });
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState('');

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

  const isVehicleExpanded = (id, idx) => {
    if (expandedVehicleIds[id] !== undefined) return expandedVehicleIds[id];
    return idx === 0;
  };

  const toggleVehicleExpanded = (id, idx) => {
    setExpandedVehicleIds(prev => ({
      ...prev,
      [id]: !isVehicleExpanded(id, idx)
    }));
  };

  const handleCopyVehiclePolicy = (v) => {
    const pol = v?.insurancePolicyNumber || '';
    if (!pol) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(pol).catch(() => {});
    }
    setCopiedVehiclePolicyId(v.id);
    setTimeout(() => setCopiedVehiclePolicyId(null), 2500);
  };

  const handleAddNewAutoCard = () => {
    if (autoFileInputRef.current) {
      autoFileInputRef.current.click();
    }
  };

  const handleManualAddVehicle = () => {
    setEditingVehicleId(null);
    setPendingAutoCards([]);
    setAutoScanFeedback(null);
    setAutoReviewForm({
      id: `veh-${Date.now()}`,
      year: 2025,
      make: 'Toyota',
      model: '',
      trim: '',
      name: '',
      vin: '',
      type: 'gas',
      ownership: 'owned',
      driverName: '',
      insuranceProvider: 'State Farm',
      insuranceCoverage: 'full_coverage',
      insuranceMonthly: 120,
      insurancePolicyNumber: '',
      insuranceDeductible: 500,
      odometer: '',
      estimatedValue: '',
      threeYearMileLimit: 36000,
      monthlyMiles: 1000,
      monthlyPayment: 0,
      fuelGrade: 'regular',
      mpgOrEfficiency: 32,
      batteryKwh: 0,
      freeChargingSharePercent: 0
    });
    setAutoView('review');
  };

  const handleEditVehicle = (v) => {
    setEditingVehicleId(v.id);
    setAutoScanFeedback(null);
    const existingCards = (v.cards && v.cards.length > 0)
      ? v.cards
      : (v.insuranceCardPhoto ? [{ id: 'ic-0', name: 'Front', side: 'front', dataUrl: v.insuranceCardPhoto }] : []);
    setPendingAutoCards(existingCards);
    setAutoReviewForm({
      id: v.id,
      year: v.year || 2025,
      make: v.make || 'Toyota',
      model: v.model || '',
      trim: v.trim || '',
      name: v.name || `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim(),
      vin: v.vin || '',
      type: v.type || 'gas',
      ownership: v.ownership || 'owned',
      driverName: v.driverName || '',
      insuranceProvider: v.insuranceProvider || 'State Farm',
      insuranceCoverage: v.insuranceCoverage || 'full_coverage',
      insuranceMonthly: v.insuranceMonthly || 120,
      insurancePolicyNumber: v.insurancePolicyNumber || '',
      insuranceDeductible: v.insuranceDeductible || 500,
      odometer: v.odometer ? Number(v.odometer).toLocaleString('en-US') : '',
      estimatedValue: v.estimatedValue ? Number(v.estimatedValue).toLocaleString('en-US') : '',
      threeYearMileLimit: v.threeYearMileLimit || 36000,
      monthlyMiles: v.monthlyMiles || 1000,
      monthlyPayment: v.monthlyPayment || 0,
      fuelGrade: v.fuelGrade || 'regular',
      mpgOrEfficiency: v.mpgOrEfficiency || 32,
      batteryKwh: v.batteryKwh || 0,
      freeChargingSharePercent: v.freeChargingSharePercent || 0
    });
    setAutoView('review');
  };

  const handleProcessAutoInsuranceFile = async (file) => {
    if (!file) return;

    setIsScanningAutoCard(true);
    setAutoScanFeedback(null);
    setAutoScanProgress('Preparing document…');

    let extractedDetails = null;
    let cards = [];

    try {
      const { scanAutoInsuranceFile } = await import('../utils/insuranceScanner.js');
      const result = await scanAutoInsuranceFile(file, (msg) => setAutoScanProgress(msg));
      extractedDetails = result.extracted;
      cards = (result.cardImages || []).map((url, idx) => ({
        id: `ic-auto-${Date.now()}-${idx}`,
        name: idx === 0 ? 'Front' : 'Back',
        side: idx === 0 ? 'front' : 'back',
        dataUrl: url
      }));
    } catch (err) {
      console.warn('Auto card scan failed:', err);
      setAutoScanFeedback({ type: 'error', message: "We couldn't read that file. You can still enter the details by hand." });
    } finally {
      setIsScanningAutoCard(false);
    }

    setPendingAutoCards(cards);

    const yr = extractedDetails?.year || 2025;
    const mk = extractedDetails?.make || 'Toyota';
    const md = extractedDetails?.model || '';
    const specs = detectCarSpecs(mk, md, extractedDetails?.coverage || 'full_coverage');

    setAutoReviewForm({
      id: editingVehicleId || `veh-${Date.now()}`,
      year: yr,
      make: mk,
      model: md,
      trim: '',
      name: `${yr} ${mk} ${md}`.replace(/\s+/g, ' ').trim(),
      vin: extractedDetails?.vin || '',
      type: specs.type || 'gas',
      ownership: 'owned',
      driverName: extractedDetails?.driverName || '',
      insuranceProvider: extractedDetails?.provider || 'GEICO',
      insuranceCoverage: extractedDetails?.coverage || 'full_coverage',
      insuranceMonthly: extractedDetails?.monthlyPremium || specs.insuranceMonthly || 120,
      insurancePolicyNumber: extractedDetails?.policyNumber || '',
      insuranceDeductible: extractedDetails?.deductible || 500,
      odometer: '',
      estimatedValue: '',
      threeYearMileLimit: 36000,
      monthlyMiles: 1000,
      monthlyPayment: 0,
      fuelGrade: specs.fuelGrade || 'regular',
      mpgOrEfficiency: specs.mpgOrEfficiency || 32,
      batteryKwh: specs.batteryKwh || 0,
      freeChargingSharePercent: 0
    });

    setAutoView('review');
  };

  const handleSaveAutoReview = () => {
    const targetVehId = editingVehicleId || autoReviewForm.id || `veh-${Date.now()}`;
    const cleanOdo = Number(String(autoReviewForm.odometer || '').replace(/[^0-9]/g, '')) || 0;
    const cleanVal = Number(String(autoReviewForm.estimatedValue || '').replace(/[^0-9]/g, '')) || 0;
    const cleanMonthly = Number(autoReviewForm.insuranceMonthly) || 0;

    const cardsToKeep = keepAutoCardImage ? pendingAutoCards : [];
    const frontPhoto = cardsToKeep[0]?.dataUrl || (keepAutoCardImage ? autoReviewForm.insuranceCardPhoto : null);

    const updatedVehicle = {
      id: targetVehId,
      year: Number(autoReviewForm.year) || 2025,
      make: (autoReviewForm.make || '').trim(),
      model: (autoReviewForm.model || '').trim(),
      name: autoReviewForm.name || `${autoReviewForm.year} ${autoReviewForm.make} ${autoReviewForm.model}`.trim(),
      type: autoReviewForm.type || 'gas',
      ownership: autoReviewForm.ownership || 'owned',
      driverName: (autoReviewForm.driverName || '').trim(),
      insuranceProvider: (autoReviewForm.insuranceProvider || '').trim(),
      insuranceCoverage: autoReviewForm.insuranceCoverage || 'full_coverage',
      insuranceMonthly: cleanMonthly,
      insurancePolicyNumber: (autoReviewForm.insurancePolicyNumber || '').trim(),
      insuranceDeductible: Number(autoReviewForm.insuranceDeductible) || 500,
      vin: (autoReviewForm.vin || '').trim(),
      odometer: cleanOdo,
      estimatedValue: cleanVal,
      threeYearMileLimit: autoReviewForm.ownership === 'lease' ? (Number(autoReviewForm.threeYearMileLimit) || 36000) : null,
      monthlyMiles: Number(autoReviewForm.monthlyMiles) || 1000,
      monthlyPayment: Number(autoReviewForm.monthlyPayment) || 0,
      fuelGrade: autoReviewForm.fuelGrade || 'regular',
      mpgOrEfficiency: Number(autoReviewForm.mpgOrEfficiency) || 30,
      batteryKwh: Number(autoReviewForm.batteryKwh) || 0,
      freeChargingSharePercent: Number(autoReviewForm.freeChargingSharePercent) || 0,
      cards: cardsToKeep,
      insuranceCardPhoto: frontPhoto
    };

    const existingVehicles = householdProfile.vehicles || [];
    let nextVehicles;
    if (editingVehicleId) {
      nextVehicles = existingVehicles.map(v => v.id === editingVehicleId ? updatedVehicle : v);
    } else {
      nextVehicles = [...existingVehicles, updatedVehicle];
    }

    onUpdateProfile({
      ...householdProfile,
      vehicles: nextVehicles
    });

    setExpandedVehicleIds(prev => ({
      ...prev,
      [targetVehId]: true
    }));
    setEditingVehicleId(null);
    setAutoView('saved');
  };

  const handleCancelAutoReview = () => {
    setEditingVehicleId(null);
    if ((householdProfile.vehicles || []).length > 0) {
      setAutoView('saved');
    } else {
      setAutoView('empty');
    }
  };

  const handleAutoFormMakeChange = (mk) => {
    const specs = detectCarSpecs(mk, autoReviewForm.model, autoReviewForm.insuranceCoverage);
    setAutoReviewForm(prev => ({
      ...prev,
      make: mk,
      name: `${prev.year} ${mk} ${prev.model}`.replace(/\s+/g, ' ').trim(),
      type: specs.type,
      mpgOrEfficiency: specs.mpgOrEfficiency,
      fuelGrade: specs.fuelGrade,
      batteryKwh: specs.batteryKwh,
      insuranceMonthly: specs.insuranceMonthly || prev.insuranceMonthly
    }));
  };

  const handleAutoFormModelChange = (md) => {
    const specs = detectCarSpecs(autoReviewForm.make, md, autoReviewForm.insuranceCoverage);
    setAutoReviewForm(prev => ({
      ...prev,
      model: md,
      name: `${prev.year} ${prev.make} ${md}`.replace(/\s+/g, ' ').trim(),
      type: specs.type,
      mpgOrEfficiency: specs.mpgOrEfficiency,
      fuelGrade: specs.fuelGrade,
      batteryKwh: specs.batteryKwh,
      insuranceMonthly: specs.insuranceMonthly || prev.insuranceMonthly
    }));
  };

  const netFinancedEvAmount = Math.max(0, simEvMsrp - simFedCredit - simStateRebate - simDownPayment);
  const zeroAprMonthlyPayment = Math.round(netFinancedEvAmount / simTermMonths);
  const currentGasSavedPerCar = metrics.fleet.vehicles.find(v => v.type !== 'ev')?.potentialEvSwitchSavings || 195;
  const trueNetOutOfPocketMonthly = Math.max(0, zeroAprMonthlyPayment - currentGasSavedPerCar);
  const foodMonthly = Number(householdProfile.foodMonthly) || (metrics.people * 220);

  return (
    <div className="bg-[var(--surface)] text-[var(--ink)] rounded-[12px] border border-[var(--line)] shadow-2xs overflow-hidden">
      {/* Simple Clean Section Bar: Household | Auto | Health */}
      <div className="px-5 py-3.5 bg-[var(--surface-subtle)] border-b border-[var(--line)] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--line)] p-1 rounded-[8px] text-[13px] font-semibold">
          <button
            type="button"
            onClick={() => setSection('household')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              section === 'household' ? 'bg-[var(--brand)] text-white shadow-2xs font-semibold' : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] font-medium'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Household</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('auto')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              section === 'auto' ? 'bg-[var(--brand)] text-white shadow-2xs font-semibold' : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] font-medium'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Auto</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('health')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              section === 'health' ? 'bg-[var(--brand)] text-white shadow-2xs font-semibold' : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] font-medium'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Health</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {syncSuccess && (
            <span className="text-[13px] font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{syncSuccess}</span>
            </span>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 1: HOUSEHOLD (CLEAN, UNCLUTTERED & QUESTION SELECTOR)    */}
      {/* ================================================================= */}
      {section === 'household' && (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-6">
          {isOverview ? (() => {
            const ovBreakdown = calculateHomeCostBreakdown(normalizedProfile, metrics, bills);
            const ovTotals = summarizeHomeCosts(ovBreakdown);
            const ovCompleteness = calculateProfileCompleteness(normalizedProfile);
            const hasBasics = Boolean(normalizedProfile.address || normalizedProfile.homeType || normalizedProfile.ownership);
            const ovSpecsLine = [
              formatHouseholdLabel('homeType', normalizedProfile.homeType, ''),
              normalizedProfile.bedrooms != null ? `${normalizedProfile.bedrooms} bd` : null,
              normalizedProfile.bathrooms != null ? `${normalizedProfile.bathrooms} ba` : null,
              normalizedProfile.sqFt ? `${Number(normalizedProfile.sqFt).toLocaleString()} sq ft` : null
            ].filter(Boolean).join(' · ');

            return (
              <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[12px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[var(--muted)]">Household &amp; property</div>
                  <h3 className="font-serif text-[20px] font-semibold text-[var(--ink)] tracking-tight truncate">
                    {normalizedProfile.address || (hasBasics ? 'Home profile' : 'Set up your Household profile')}
                  </h3>
                  <p className="text-[14px] font-medium text-[var(--muted)]">
                    {hasBasics
                      ? `${ovSpecsLine || 'Profile active'} · ${ovCompleteness.percent}% complete`
                      : 'Run the 3-minute Quick setup to model utility rates, housing costs, and reminders.'}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {hasBasics && (
                    <div className="text-right">
                      <div className="text-[13px] font-medium text-[var(--muted)]">Est. home cost</div>
                      <div className="text-[18px] font-semibold text-[var(--ink)]">
                        ${Math.round(ovTotals.totalMonthly).toLocaleString()}/mo
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigateToLifestyle && onNavigateToLifestyle()}
                    className="min-h-[44px] px-4 py-2 rounded-[8px] bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--brand-ink)] text-[14px] font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{hasBasics ? 'Manage Household' : 'Start Quick setup'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })() : householdScreen === 'questionnaire' ? (
            <HouseholdQuestionnaire
              profile={normalizedProfile}
              onChangeProfile={handleUpdateNormalizedProfile}
              onExitToSummary={() => setHouseholdScreen('summary')}
            />
          ) : (
            <HouseholdSummary
              profile={normalizedProfile}
              metrics={metrics}
              bills={bills}
              onChangeProfile={handleUpdateNormalizedProfile}
              onStartQuestionnaire={handleStartQuestionnaire}
              onSyncUtilitiesToBills={onSyncUtilitiesToBills}
              onShowToast={onShowToast}
            />
          )}
        </div>
      )}
      {section === 'auto' && (
        <div className="p-5 flex flex-col gap-5 text-sm">
          {/* Hidden file input for auto card/policy upload */}
          <input
            ref={autoFileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            disabled={isScanningAutoCard || isOverview}
            onChange={(e) => {
              if (isOverview) return;
              const file = e.target.files?.[0];
              if (file) handleProcessAutoInsuranceFile(file);
              e.target.value = '';
            }}
            className="hidden"
          />

          {/* Scanning Progress Banner */}
          {isScanningAutoCard && (
            <div className="p-4 bg-[#E8EEF8] dark:bg-slate-800 border border-[#1B4B91]/20 rounded-[8px] flex items-center gap-3 text-[#14233B] dark:text-slate-200 text-sm ">
              <Loader2 className="w-5 h-5 animate-spin text-[#1B4B91] shrink-0" />
              <div>
                <span className="font-semibold block">Reading your auto insurance document...</span>
                <span className="text-[13px] text-slate-500 dark:text-slate-400 block">{autoScanProgress || 'Extracting vehicle, carrier, policy number, driver name, coverage, and deductibles…'}</span>
              </div>
            </div>
          )}

          {/* STATE 1: EMPTY (No vehicles/cards added yet) */}
          {autoView === 'empty' && !isScanningAutoCard && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[8px] shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="font-semibold text-base text-slate-900 dark:text-white">Auto insurance & vehicles</h2>
              </div>
              <div className="p-6 sm:p-8">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!isOverview) {
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleProcessAutoInsuranceFile(file);
                    }
                  }}
                  className="border-1.5 border-dashed border-slate-300 dark:border-slate-700 rounded-[8px] p-8 sm:p-10 text-center flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-[#18457c] mb-1">
                    <Car className="w-6 h-6" />
                  </div>
                  <b className="text-base font-semibold text-slate-900 dark:text-white">
                    {isOverview ? 'No vehicles or auto cards added' : 'Add your auto insurance card'}
                  </b>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                    {isOverview
                      ? 'To add vehicles and auto insurance cards, please go to the Lifestyle section from the sidebar.'
                      : 'Upload a photo of your insurance card or a policy PDF and we’ll fill in the details. You can add cards for all vehicles and drivers in your household.'}
                  </p>
                  {isOverview ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => onNavigateToLifestyle && onNavigateToLifestyle()}
                        className="px-4 py-2.5 rounded-lg bg-[#18457c] hover:bg-[#123561] text-white font-medium text-sm transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <span>Go to Lifestyle</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 mt-2 flex-wrap justify-center">
                      <button
                        type="button"
                        onClick={handleAddNewAutoCard}
                        className="px-4 py-2.5 rounded-lg bg-[#18457c] hover:bg-[#123561] text-white font-medium text-sm transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload card or policy</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleManualAddVehicle}
                        className="px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm transition-colors cursor-pointer"
                      >
                        Enter details manually
                      </button>
                    </div>
                  )}
                  {!isOverview && <small className="text-[13px] text-slate-400 mt-1">PDF, PNG, JPG or WebP</small>}
                </div>
              </div>
            </section>
          )}

          {/* STATE 2: REVIEW / EDIT ("Check what we read") */}
          {autoView === 'review' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[8px] shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                    {editingVehicleId ? 'Edit auto insurance card' : 'Check what we read'}
                  </h2>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">
                    Compare each field with your card before saving.
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="bg-[#E8EEF8] dark:bg-slate-800/80 text-[#14233B] dark:text-slate-200 rounded-lg px-3.5 py-2.5 text-[13.5px] mb-5">
                  Automatic reading can make mistakes. Verify your driver name, vehicle specs, and policy numbers below.
                </div>

                {autoScanFeedback?.type === 'error' && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-[#B3261E] rounded-lg px-3.5 py-2.5 text-[13.5px] mb-5">
                    {autoScanFeedback.message}
                  </div>
                )}

                {(() => {
                  const front = pendingAutoCards[0]?.dataUrl;
                  if (!front || String(front).startsWith('data:application/pdf')) return null;
                  return (
                    <div className="max-w-[360px] mb-5">
                      <InsuranceCardFlip
                        front={front}
                        back={pendingAutoCards[1]?.dataUrl}
                        flipped={autoCardFlipped}
                        onFlip={() => setAutoCardFlipped(!autoCardFlipped)}
                        onOpen={(url, title) => { setViewingCardPhoto(url); setViewingCardTitle(title); }}
                      />
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Driver Name / Named Insured */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      Primary Driver / Named Insured <span className="text-[#18457c]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Morgan"
                      value={autoReviewForm.driverName}
                      onChange={(e) => setAutoReviewForm({ ...autoReviewForm, driverName: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 dark:text-white focus:outline-2 focus:outline-[#18457c]"
                    />
                  </div>

                  {/* Insurance Carrier */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      Insurance Carrier <span className="text-[#18457c]">*</span>
                    </label>
                    <input
                      type="text"
                      list="auto-carriers-list"
                      placeholder="e.g. State Farm, GEICO, Progressive, AAA"
                      value={autoReviewForm.insuranceProvider}
                      onChange={(e) => setAutoReviewForm({ ...autoReviewForm, insuranceProvider: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#18457c]"
                    />
                    <datalist id="auto-carriers-list">
                      {AUTO_INSURANCE_PROVIDERS.map(p => <option key={p} value={p} />)}
                    </datalist>
                  </div>

                  {/* Policy Number */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      Policy Number <span className="text-[#18457c]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. G-8821943"
                      value={autoReviewForm.insurancePolicyNumber}
                      onChange={(e) => setAutoReviewForm({ ...autoReviewForm, insurancePolicyNumber: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm  text-slate-900 dark:text-white focus:outline-2 focus:outline-[#18457c]"
                    />
                  </div>

                  {/* Coverage Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Coverage Type</label>
                    <select
                      value={autoReviewForm.insuranceCoverage}
                      onChange={(e) => {
                        const cov = e.target.value;
                        const specs = detectCarSpecs(autoReviewForm.make, autoReviewForm.model, cov);
                        setAutoReviewForm({
                          ...autoReviewForm,
                          insuranceCoverage: cov,
                          insuranceMonthly: specs.insuranceMonthly || autoReviewForm.insuranceMonthly
                        });
                      }}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#18457c]"
                    >
                      {AUTO_INSURANCE_TYPES.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Monthly Premium */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Monthly Insurance Premium</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-semibold">$</span>
                      <input
                        type="number"
                        placeholder="120"
                        value={autoReviewForm.insuranceMonthly || ''}
                        onChange={(e) => setAutoReviewForm({ ...autoReviewForm, insuranceMonthly: Number(e.target.value) || 0 })}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#18457c]"
                      />
                    </div>
                  </div>

                  {/* Deductible */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Comprehensive & Collision Deductible</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-semibold">$</span>
                      <input
                        type="number"
                        placeholder="500"
                        value={autoReviewForm.insuranceDeductible || ''}
                        onChange={(e) => setAutoReviewForm({ ...autoReviewForm, insuranceDeductible: Number(e.target.value) || 0 })}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#18457c]"
                      />
                    </div>
                  </div>

                  {/* Vehicle Year & Make */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Model Year & Make</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={autoReviewForm.year}
                        onChange={(e) => {
                          const yr = Number(e.target.value) || 2025;
                          setAutoReviewForm(prev => ({
                            ...prev,
                            year: yr,
                            name: `${yr} ${prev.make} ${prev.model}`.replace(/\s+/g, ' ').trim()
                          }));
                        }}
                        className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-900 dark:text-white"
                      >
                        {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2005, 2000].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="e.g. Toyota"
                        value={autoReviewForm.make}
                        onChange={(e) => handleAutoFormMakeChange(e.target.value)}
                        className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-2 focus:outline-[#18457c]"
                      />
                    </div>
                  </div>

                  {/* Model */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Model & Trim</label>
                    <input
                      type="text"
                      placeholder="e.g. Camry Hybrid, Model Y, RAV4 Prime..."
                      value={autoReviewForm.model}
                      onChange={(e) => handleAutoFormModelChange(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-2 focus:outline-[#18457c]"
                    />
                  </div>

                  {/* Ownership & Powertrain */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Ownership & Powertrain</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={autoReviewForm.ownership}
                        onChange={(e) => setAutoReviewForm({ ...autoReviewForm, ownership: e.target.value })}
                        className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2.5 py-2 text-sm text-slate-900 dark:text-white"
                      >
                        <option value="owned">Paid Off (Owned)</option>
                        <option value="financed">Financed (Loan)</option>
                        <option value="lease">Leased</option>
                      </select>
                      <select
                        value={autoReviewForm.type}
                        onChange={(e) => setAutoReviewForm({ ...autoReviewForm, type: e.target.value })}
                        className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2.5 py-2 text-sm text-slate-900 dark:text-white"
                      >
                        <option value="gas">Gasoline (ICE)</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="phev">Plug-In Hybrid (PHEV)</option>
                        <option value="ev">Electric Vehicle (EV)</option>
                      </select>
                    </div>
                  </div>

                  {/* VIN */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Vehicle Identification Number (VIN)</label>
                    <input
                      type="text"
                      placeholder="17-character VIN"
                      value={autoReviewForm.vin}
                      onChange={(e) => setAutoReviewForm({ ...autoReviewForm, vin: e.target.value.toUpperCase() })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm  text-slate-900 dark:text-white focus:outline-2 focus:outline-[#18457c]"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 my-5 p-3.5 border border-slate-200 dark:border-slate-800 rounded-[8px] cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <input
                    type="checkbox"
                    checked={keepAutoCardImage}
                    onChange={(e) => setKeepAutoCardImage(e.target.checked)}
                    className="mt-1 w-4.5 h-4.5 rounded accent-[#18457c]"
                  />
                  <div>
                    <span className="font-medium text-sm text-slate-900 dark:text-white block">Keep a copy of the card image</span>
                    <small className="block text-slate-500 dark:text-slate-400 text-[13px] mt-0.5">
                      Stored encrypted so you can pull up proof of insurance in an emergency. If you turn this off, the image is discarded after reading.
                    </small>
                  </div>
                </label>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelAutoReview}
                    className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAutoReview}
                    className="px-5 py-2.5 rounded-lg bg-[#18457c] hover:bg-[#123561] text-white font-medium text-sm transition-colors cursor-pointer shadow-xs"
                  >
                    {editingVehicleId ? 'Update vehicle' : 'Save vehicle'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* STATE 3: SAVED (Collapsible Multi-Vehicle Insurance List) */}
          {autoView === 'saved' && (
            <div className="flex flex-col gap-4">
              {/* Action Buttons Header Bar */}
              <div className="flex items-center justify-end flex-wrap gap-3 px-1">
                {isOverview ? (
                  <button
                    type="button"
                    onClick={() => onNavigateToLifestyle && onNavigateToLifestyle()}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-[13px] sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>Manage in Lifestyle</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddNewAutoCard}
                      className="px-3.5 py-2 rounded-lg bg-[#18457c] hover:bg-[#123561] text-white font-medium text-[13px] sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload insurance card</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleManualAddVehicle}
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-[13px] sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add manually</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Vehicles Cards List */}
              {metrics.fleet.vehicles.map((v, vIdx) => {
                const isExpanded = isVehicleExpanded(v.id, vIdx);
                const isCopied = copiedVehiclePolicyId === v.id;
                const isPolicyRevealed = revealedPolicyIds[v.id];
                const isCardFlipped = flippedAutoCards[v.id];

                return (
                  <section
                    key={v.id || vIdx}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[8px] shadow-xs overflow-hidden transition-all"
                  >
                    {/* MINIMIZED HEADER: Vehicle Name, Powertrain, Ownership, Carrier, Cost & Arrow */}
                    <div
                      onClick={() => toggleVehicleExpanded(v.id, vIdx)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors select-none"
                    >
                      {/* Left side: Vehicle specs & Insurance summary */}
                      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap min-w-0">
                        {/* 1. Vehicle Name */}
                        <span className="font-semibold text-slate-900 dark:text-white text-base tracking-tight truncate max-w-[240px] sm:max-w-none">
                          {v.name || 'Vehicle'}
                        </span>

                        {/* 2. Powertrain Badge */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[13px] font-semibold  border ${
                          v.type === 'ev'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : v.type === 'hybrid' || v.type === 'phev'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {v.type}
                        </span>

                        {/* 3. Ownership Badge */}
                        {v.ownership && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[13px] font-semibold  border ${
                            v.ownership === 'lease'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : v.ownership === 'financed'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {v.ownership === 'lease' ? 'Lease' : v.ownership === 'financed' ? 'Financed' : 'Owned'}
                          </span>
                        )}

                        {/* 4. Insurance Carrier Badge */}
                        {v.insuranceProvider && (
                          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[13px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#18457c]" />
                            <span>{v.insuranceProvider}</span>
                          </span>
                        )}

                        {/* 5. Policy Number or Premium */}
                        {v.insurancePolicyNumber && (
                          <span className="hidden lg:inline-flex items-center  text-[13px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            Pol: {v.insurancePolicyNumber}
                          </span>
                        )}

                        {/* 6. Total Monthly Cost */}
                        <span className="text-[13px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          ${v.totalMonthlyVehicleCost || 0} /mo
                        </span>
                      </div>

                      {/* Right side: Arrow toggle button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVehicleExpanded(v.id, vIdx);
                        }}
                        aria-label={isExpanded ? 'Minimize vehicle details' : 'Expand vehicle details'}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        )}
                      </button>
                    </div>

                    {/* EXPANDED DETAILS */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 dark:border-slate-800 p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-5">
                        {/* Action buttons on top-right */}
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-[#18457c]" />
                              <span>{v.insuranceProvider || 'Auto Insurance Policy'}</span>
                            </span>
                            <span className="text-[13px] text-slate-400">·</span>
                            <span className="text-[13px] text-slate-500 capitalize">
                              {(v.insuranceCoverage || 'full_coverage').replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {v.insurancePolicyNumber && (
                              <button
                                type="button"
                                onClick={() => handleCopyVehiclePolicy(v)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{isCopied ? 'Copied' : 'Copy policy'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (isOverview && onNavigateToLifestyle) {
                                  onNavigateToLifestyle();
                                } else {
                                  handleEditVehicle(v);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>{isOverview ? 'Manage' : 'Edit'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveVehicle(v.id)}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 bg-white dark:bg-slate-800 text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Main Grid: Card Viewer on Left + Specifications on Right */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                          {/* Left Column: Interactive Digital or Scanned Card Preview */}
                          <div className="lg:col-span-5 flex flex-col items-center">
                            {(() => {
                              const vCards = (v.cards && v.cards.length > 0)
                                ? v.cards
                                : (v.insuranceCardPhoto ? [{ id: 'ic-0', name: 'Front', side: 'front', dataUrl: v.insuranceCardPhoto }] : []);
                              const front = vCards[0]?.dataUrl;
                              const isPdf = String(front).startsWith('data:application/pdf');

                              if (front && !isPdf) {
                                return (
                                  <div className="max-w-[360px] w-full">
                                    <InsuranceCardFlip
                                      front={front}
                                      back={vCards[1]?.dataUrl}
                                      flipped={Boolean(flippedAutoCards[v.id])}
                                      onFlip={() => setFlippedAutoCards(prev => ({ ...prev, [v.id]: !prev[v.id] }))}
                                      onOpen={(url, title) => { setViewingCardPhoto(url); setViewingCardTitle(title); }}
                                    />
                                  </div>
                                );
                              }

                              return (
                                <div className="bg-[#1B4B91] text-white rounded-[12px] p-5 flex flex-col justify-between aspect-[1.6/1] shadow-md min-h-[190px] max-w-[360px] w-full">
                                  <div className="flex items-center justify-between text-[13px] opacity-90">
                                    <span className="font-semibold flex items-center gap-1.5">
                                      <ShieldCheck className="w-4 h-4 text-emerald-300" />
                                      <span>{v.insuranceProvider || 'Auto Insurance'}</span>
                                    </span>
                                    <span className="text-[13px]   px-2 py-0.5 rounded bg-white/15">
                                      AUTO PROOF
                                    </span>
                                  </div>

                                  <div className="my-2">
                                    <span className="text-[13px]  opacity-75 block">Named Insured</span>
                                    <span className="font-semibold text-base tracking-wide block truncate">
                                      {v.driverName || 'Primary Driver'}
                                    </span>
                                    <span className="text-[13px] text-white/90 block mt-0.5 font-medium truncate">
                                      {v.name}
                                    </span>
                                  </div>

                                  <div className="flex items-end justify-between pt-2 border-t border-white/15">
                                    <div>
                                      <span className="text-[13px]  opacity-75 block">Policy Number</span>
                                      <span className=" text-[13px] font-semibold tracking-wider">{v.insurancePolicyNumber || 'Not specified'}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isOverview && onNavigateToLifestyle) {
                                          onNavigateToLifestyle();
                                        } else {
                                          setEditingVehicleId(v.id);
                                          handleAddNewAutoCard();
                                        }
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[13px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                      {isOverview ? <ArrowRight className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                                      <span>{isOverview ? 'Manage card' : 'Upload photo'}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Right Column: Key Details & Costs Breakdown */}
                          <div className="lg:col-span-7 flex flex-col gap-3.5">
                            {/* Policy & Coverage Tiles */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[13px]">
                              <div className="p-3 rounded-[8px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <span className="text-[13px] uppercase font-semibold text-slate-400 block mb-0.5">Policy Number</span>
                                <div className="flex items-center justify-between gap-1">
                                  <span className=" font-semibold text-slate-900 dark:text-white truncate">
                                    {v.insurancePolicyNumber ? (isPolicyRevealed ? v.insurancePolicyNumber : `••• ••• ${v.insurancePolicyNumber.slice(-4)}`) : 'None'}
                                  </span>
                                  {v.insurancePolicyNumber && (
                                    <button
                                      type="button"
                                      onClick={() => setRevealedPolicyIds(p => ({ ...p, [v.id]: !p[v.id] }))}
                                      className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                    >
                                      {isPolicyRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="p-3 rounded-[8px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <span className="text-[13px] uppercase font-semibold text-slate-400 block mb-0.5">Coverage Type</span>
                                <span className="font-semibold text-slate-900 dark:text-white capitalize block truncate">
                                  {(v.insuranceCoverage || 'full_coverage').replace(/_/g, ' ')}
                                </span>
                              </div>

                              <div className="p-3 rounded-[8px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <span className="text-[13px] uppercase font-semibold text-slate-400 block mb-0.5">Insurance Premium</span>
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm block">
                                  ${v.insuranceMonthly || 0} <span className="text-[13px] font-normal text-slate-400">/mo</span>
                                </span>
                              </div>

                              <div className="p-3 rounded-[8px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <span className="text-[13px] uppercase font-semibold text-slate-400 block mb-0.5">Deductible</span>
                                <span className="font-semibold text-slate-900 dark:text-white block">
                                  ${v.insuranceDeductible || 500}
                                </span>
                              </div>

                              <div className="p-3 rounded-[8px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <span className="text-[13px] uppercase font-semibold text-slate-400 block mb-0.5">Odometer</span>
                                <span className="font-semibold text-slate-900 dark:text-white block">
                                  {v.odometer ? `${Number(v.odometer).toLocaleString()} mi` : 'Not set'}
                                </span>
                              </div>

                              <div className="p-3 rounded-[8px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <span className="text-[13px] uppercase font-semibold text-slate-400 block mb-0.5">Monthly Miles</span>
                                <span className="font-semibold text-slate-900 dark:text-white block">
                                  {Number(v.monthlyMiles || 1000).toLocaleString()} mi/mo
                                </span>
                              </div>
                            </div>

                            {/* Monthly Cost Breakdown Bar */}
                            <div className="p-3.5 rounded-[8px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                              <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300  block">
                                Monthly Vehicle Cost Breakdown
                              </span>
                              <div className={`grid ${v.ownership !== 'owned' && Number(v.monthlyPayment) > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-2 text-[13px] pt-1`}>
                                <div>
                                  <span className="text-[13px] text-slate-400 block">{v.type === 'ev' ? 'Charging' : 'Fuel'}</span>
                                  <span className="font-semibold text-slate-900 dark:text-white">${v.monthlyFuelOrChargeCost || 0}/mo</span>
                                </div>
                                <div>
                                  <span className="text-[13px] text-slate-400 block">Insurance</span>
                                  <span className="font-semibold text-slate-900 dark:text-white">${v.insuranceMonthly || 0}/mo</span>
                                </div>
                                {v.ownership !== 'owned' && Number(v.monthlyPayment) > 0 && (
                                  <div>
                                    <span className="text-[13px] text-slate-400 block">{v.ownership === 'lease' ? 'Lease' : 'Payment'}</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">${v.monthlyPayment || 0}/mo</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-[13px] text-slate-400 block">Total</span>
                                  <span className="font-semibold text-[#18457c] text-sm">${v.totalMonthlyVehicleCost || 0}/mo</span>
                                </div>
                              </div>
                            </div>

                            {/* Free EV Chargers Near Me button for Electric Vehicles */}
                            {v.type === 'ev' && (
                              <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setSelectedEvForChargers(v)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[13px] transition-colors cursor-pointer shadow-2xs"
                                >
                                  <Zap className="w-3.5 h-3.5" />
                                  <span>Free EV Chargers Near Me</span>
                                </button>
                                <div className="flex items-center gap-1.5 text-[13px] text-emerald-800 dark:text-emerald-300">
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
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {/* Free EV Chargers Modal */}
          {selectedEvForChargers && (
            <div className="fixed inset-0 bg-slate-900/40  z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[12px] max-w-xl w-full border border-slate-200 shadow-2xl p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">
                        Free EV Chargers for {selectedEvForChargers.name}
                      </h3>
                      <p className="text-[13px] text-slate-500">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                  {FREE_EV_CHARGING_GUIDE.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-[8px] bg-slate-50 border border-slate-200/80 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{item.category}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[13px]">{item.cost}</span>
                      </div>
                      <p className="text-slate-600 text-[13px] mt-0.5">{item.locations}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedEvForChargers(null)}
                    className="px-4 py-1.5 rounded-[8px] bg-[#18457c] text-white text-[13px] font-semibold cursor-pointer"
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
      {section === 'health' && (
        <div className="p-5 flex flex-col gap-5 text-sm">
          {/* Hidden file input for card/policy upload */}
          <input
            ref={healthFileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            disabled={isScanningCard || isOverview}
            onChange={(e) => {
              if (isOverview) return;
              const file = e.target.files?.[0];
              if (file) handleProcessInsuranceFile(file);
              e.target.value = '';
            }}
            className="hidden"
          />

          {/* Scanning Progress Banner */}
          {isScanningCard && (
            <div className="p-4 bg-[#E8EEF8] dark:bg-slate-800 border border-[#1B4B91]/20 rounded-[8px] flex items-center gap-3 text-[#14233B] dark:text-slate-200 text-sm ">
              <Loader2 className="w-5 h-5 animate-spin text-[#1B4B91] shrink-0" />
              <div>
                <span className="font-semibold block">Reading your insurance document...</span>
                <span className="text-[13px] text-slate-500 dark:text-slate-400 block">{scanProgress || 'Extracting carrier, plan name, member ID, group number, copays, and doctor…'}</span>
              </div>
            </div>
          )}

          {/* STATE 1: EMPTY (No cards added yet) */}
          {healthView === 'empty' && !isScanningCard && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[8px] shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="font-semibold text-base text-slate-900 dark:text-white">Health insurance</h2>
              </div>
              <div className="p-6 sm:p-8">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!isOverview) {
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleProcessInsuranceFile(file);
                    }
                  }}
                  className="border-1.5 border-dashed border-slate-300 dark:border-slate-700 rounded-[8px] p-8 sm:p-10 text-center flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-[#18457c] mb-1">
                    <HeartPulse className="w-6 h-6" />
                  </div>
                  <b className="text-base font-semibold text-slate-900 dark:text-white">
                    {isOverview ? 'No health insurance cards added' : 'Add your insurance card'}
                  </b>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                    {isOverview
                      ? 'To add health insurance cards, please go to the Lifestyle section from the sidebar.'
                      : 'Upload a photo of your card or a policy PDF and we’ll fill in the details. You can add multiple cards for medical, dental, vision, or family members.'}
                  </p>
                  {isOverview ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => onNavigateToLifestyle && onNavigateToLifestyle()}
                        className="px-4 py-2.5 rounded-lg bg-[#18457c] hover:bg-[#123561] text-white font-medium text-sm transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <span>Go to Lifestyle</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
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
                  )}
                  {!isOverview && <small className="text-[13px] text-slate-400 mt-1">PDF, PNG, JPG or WebP</small>}
                </div>
              </div>
            </section>
          )}

          {/* STATE 2: REVIEW / EDIT ("Check what we read") */}
          {healthView === 'review' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[8px] shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                    {editingPolicyId ? 'Edit insurance card' : 'Check what we read'}
                  </h2>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">
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
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      Name on insurance card <span className="text-[#1B4B91]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Morgan"
                      value={reviewForm.memberName}
                      onChange={(e) => setReviewForm({ ...reviewForm, memberName: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  {/* Type of insurance */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
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
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Plan name</label>
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
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Carrier</label>
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
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Member ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 8750439-04"
                      value={reviewForm.memberId}
                      onChange={(e) => setReviewForm({ ...reviewForm, memberId: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm  text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  {/* Group number */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Group number</label>
                    <input
                      type="text"
                      placeholder="e.g. 682304"
                      value={reviewForm.groupNumber}
                      onChange={(e) => setReviewForm({ ...reviewForm, groupNumber: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm  text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                    />
                  </div>

                  {/* Primary care copay */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Primary care copay</label>
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
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Specialist copay</label>
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
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Emergency room copay</label>
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
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Generic prescription</label>
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
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Deductible</label>
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
                    <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Out-of-pocket maximum</label>
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
                      <span className="text-[13px] font-semibold  text-slate-700 dark:text-slate-300">
                        Primary Doctor / PCP (Associated with this card)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[13px] text-slate-500 dark:text-slate-400 block mb-1">Doctor or clinic name</label>
                        <input
                          type="text"
                          placeholder="e.g. MONTANA, ANTHONY W"
                          value={reviewForm.doctorName}
                          onChange={(e) => setReviewForm({ ...reviewForm, doctorName: e.target.value })}
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                        />
                      </div>
                      <div>
                        <label className="text-[13px] text-slate-500 dark:text-slate-400 block mb-1">Phone</label>
                        <input
                          type="tel"
                          placeholder="(559) 299-2200"
                          value={reviewForm.doctorPhone}
                          onChange={(e) => setReviewForm({ ...reviewForm, doctorPhone: e.target.value })}
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
                        />
                      </div>
                      <div>
                        <label className="text-[13px] text-slate-500 dark:text-slate-400 block mb-1">Clinic / Office</label>
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

                <label className="flex items-start gap-3 my-5 p-3.5 border border-slate-200 dark:border-slate-800 rounded-[8px] cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
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
              {/* Action Buttons Header Bar */}
              <div className="flex items-center justify-end flex-wrap gap-3 px-1">
                {isOverview ? (
                  <button
                    type="button"
                    onClick={() => onNavigateToLifestyle && onNavigateToLifestyle()}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-[13px] sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>Manage in Lifestyle</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddNewCard}
                      className="px-3.5 py-2 rounded-lg bg-[#1B4B91] hover:bg-[#153c75] text-white font-medium text-[13px] sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add insurance card</span>
                    </button>
                  </div>
                )}
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
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[8px] shadow-xs overflow-hidden transition-all"
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
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] font-semibold bg-blue-100 text-[#1B4B91] dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                          {policy.insuranceType || 'Medical'}
                        </span>

                        {/* Plan & Carrier summary */}
                        {(policy.provider || policy.planName) && (
                          <span className="text-[13px] text-slate-500 dark:text-slate-400 hidden sm:inline-block truncate max-w-[280px]">
                            {[policy.provider, policy.planName].filter(Boolean).join(' · ')}
                          </span>
                        )}

                        {/* Doctor badge in header if assigned */}
                        {policy.doctor?.name && (
                          <span className="text-[13px] text-slate-600 dark:text-slate-400 hidden md:inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
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
                              <div className="bg-[#1B4B91] text-white rounded-[12px] p-5 flex flex-col justify-between aspect-[1.6/1] shadow-md min-h-[190px]">
                                <div className="flex items-center justify-between text-[13px] opacity-90">
                                  <span className="font-medium">{policy.provider || 'Health Insurance'}</span>
                                  {policy.network ? <span className="font-semibold">{policy.network}</span> : null}
                                </div>

                                <div className="font-serif text-xl font-medium tracking-tight leading-tight my-2">
                                  {policy.planName || 'Coverage Plan'}
                                </div>

                                <div>
                                  <div className="text-lg  font-medium tracking-wider tabular-nums">
                                    {policy.memberId || (
                                      <span className="text-[13px] opacity-60 font-sans tracking-normal">No Member ID</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[13px] opacity-90 mt-1">
                                  {policy.groupNumber ? <span>Group {policy.groupNumber}</span> : <span />}
                                  {policy.insuranceType && (
                                    <span className="text-[13px] font-semibold uppercase px-2 py-0.5 rounded bg-white/20">
                                      {policy.insuranceType}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}



                            {/* Pharmacy RX pills if available */}
                            {(policy.rxBin || policy.rxPcn || policy.rxGrp) && (
                              <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-[13px] grid grid-cols-3 gap-1 text-center ">
                                <div>
                                  <span className="text-[13px] text-slate-400 block font-sans">Rx BIN</span>
                                  <b>{policy.rxBin || '—'}</b>
                                </div>
                                <div>
                                  <span className="text-[13px] text-slate-400 block font-sans">Rx PCN</span>
                                  <b>{policy.rxPcn || '—'}</b>
                                </div>
                                <div>
                                  <span className="text-[13px] text-slate-400 block font-sans">Rx GRP</span>
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
                            <div className="mt-1 p-4.5 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <Stethoscope className="w-4 h-4 text-[#1B4B91] dark:text-[#7AA7F0]" />
                                  <span className="text-[13px] font-semibold  text-slate-700 dark:text-slate-300">
                                    Doctor / Care Provider
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  {policy.doctor?.name && !isEditingDoc && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDoctorEdit(policy)}
                                      className="text-[13px] font-medium text-[#1B4B91] dark:text-[#7AA7F0] hover:underline cursor-pointer"
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
                                    className="text-[13px] font-medium text-[#1B4B91] dark:text-[#7AA7F0] hover:underline cursor-pointer"
                                  >
                                    + Add new doctor
                                  </button>
                                </div>
                              </div>

                              {/* Dropdown selector for doctor on this card */}
                              <div className="flex items-center gap-2">
                                <label className="text-[13px] text-slate-600 dark:text-slate-400 shrink-0 font-medium">Assigned doctor:</label>
                                <select
                                  value={policy.doctor?.name || ''}
                                  onChange={(e) => handleAssignDoctorToPolicy(policy.id, e.target.value)}
                                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-1.5 text-[13px] text-slate-900 dark:text-white focus:outline-2 focus:outline-[#1B4B91]"
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
                                    <div className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      {[policy.doctor.specialty || 'Primary care (PCP)', policy.doctor.office].filter(Boolean).join(' · ')}
                                    </div>
                                  </div>
                                  {policy.doctor.phone && (
                                    <a
                                      href={`tel:${policy.doctor.phone}`}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[13px] font-medium text-[#1B4B91] dark:text-[#7AA7F0] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
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
                                      <label className="text-[13px] text-slate-500 dark:text-slate-400 block mb-0.5">Doctor name</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. Dr. Anthony W Montana"
                                        value={inlineDoctorForm.name}
                                        onChange={(e) => setInlineDoctorForm({ ...inlineDoctorForm, name: e.target.value })}
                                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-[13px] text-slate-900 dark:text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[13px] text-slate-500 dark:text-slate-400 block mb-0.5">Specialty</label>
                                      <input
                                        type="text"
                                        placeholder="Primary care (PCP), Dental…"
                                        value={inlineDoctorForm.specialty}
                                        onChange={(e) => setInlineDoctorForm({ ...inlineDoctorForm, specialty: e.target.value })}
                                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-[13px] text-slate-900 dark:text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[13px] text-slate-500 dark:text-slate-400 block mb-0.5">Office / Clinic</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. Sante Community Phys-Fresno"
                                        value={inlineDoctorForm.office}
                                        onChange={(e) => setInlineDoctorForm({ ...inlineDoctorForm, office: e.target.value })}
                                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-[13px] text-slate-900 dark:text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[13px] text-slate-500 dark:text-slate-400 block mb-0.5">Phone</label>
                                      <input
                                        type="tel"
                                        placeholder="(559) 299-2200"
                                        value={inlineDoctorForm.phone}
                                        onChange={(e) => setInlineDoctorForm({ ...inlineDoctorForm, phone: e.target.value })}
                                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-[13px] text-slate-900 dark:text-white"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingDoctorPolicyId(null)}
                                      className="px-2.5 py-1 rounded text-[13px] text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveInlineDoctor(policy.id)}
                                      className="px-3 py-1 rounded bg-[#1B4B91] hover:bg-[#153c75] text-white text-[13px] font-medium cursor-pointer"
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
                              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                            >
                              View card image
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (isOverview && onNavigateToLifestyle) {
                                onNavigateToLifestyle();
                              } else {
                                handleEditPolicy(policy);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            {isOverview ? 'Manage in Lifestyle' : 'Edit'}
                          </button>
                          {!isOverview && (
                            <button
                              type="button"
                              onClick={() => handleReplaceCard(policy)}
                              className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            >
                              Replace card
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemovePolicy(policy.id)}
                            className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#B3261E] hover:text-red-700 transition-colors cursor-pointer"
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
          className="fixed inset-0 bg-[#0A1423]/55  flex items-center justify-center p-4 z-50 cursor-pointer"
          onClick={() => setShowCardDialog(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[12px] p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 cursor-default"
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
              <div className="aspect-[1.6/1] border border-slate-200 dark:border-slate-800 rounded-[8px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                {(() => {
                  const activeCards = (dialogCards && dialogCards.length > 0)
                    ? dialogCards
                    : (pendingCards.length > 0 ? pendingCards : (policies[0]?.cards || health.cards || []));
                  const card0 = activeCards[0];
                  if (!card0?.dataUrl) return <span className="text-[13px] text-slate-400 font-medium">Front</span>;
                  return card0.dataUrl.startsWith('data:application/pdf') || (card0.name || '').toLowerCase().endsWith('.pdf') ? (
                    <div
                      className="flex flex-col items-center gap-1.5 p-3 text-center cursor-pointer"
                      onClick={() => {
                        setViewingCardPhoto(card0.dataUrl);
                        setViewingCardTitle(`${card0.name || 'Policy PDF'}`);
                      }}
                    >
                      <FileText className="w-8 h-8 text-[#1B4B91]" />
                      <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
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

              <div className="aspect-[1.6/1] border border-slate-200 dark:border-slate-800 rounded-[8px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                {(() => {
                  const activeCards = (dialogCards && dialogCards.length > 0)
                    ? dialogCards
                    : (pendingCards.length > 0 ? pendingCards : (policies[0]?.cards || health.cards || []));
                  const card1 = activeCards[1];
                  if (!card1?.dataUrl) return <span className="text-[13px] text-slate-400 font-medium">Back</span>;
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
          className="fixed inset-0 bg-slate-900/60  z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setViewingCardPhoto(null)}
        >
          <div
            className="bg-white rounded-[12px] max-w-3xl w-full border border-slate-200 shadow-2xl p-4 flex flex-col gap-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
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
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-50 rounded-[8px] p-2 border border-slate-200/60">
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
