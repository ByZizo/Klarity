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
  DWELLING_TYPES,
  UTILITY_REGIONS,
  HOME_QUESTIONNAIRE_OPTIONS,
  HOUSEHOLD_PLAN_OPTIONS,
  PROVIDER_SPECIFIC_PLANS,
  getPlansForProvider,
  getSuggestedProviders,
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
import { ConfirmDialog } from './ui';


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


export const HOUSEHOLD_PROVIDER_CONFIGS = {
  internet: {
    key: 'internet',
    label: 'Internet',
    title: 'Home Internet & WiFi',
    category: 'Connectivity & WiFi',
    icon: 'Wifi',
    colorClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    providerField: 'internetProvider',
    planField: 'internetPlan',
    accountField: 'internetAccount',
    costField: 'internetMonthlyCost',
    notesField: 'internetNotes',
    defaultProvider: 'Xfinity',
    defaultPlan: 'Gigabit Extra',
    placeholderProvider: 'e.g. Xfinity, AT&T Fiber, Spectrum, Verizon Fios...',
    placeholderPlan: 'e.g. Gigabit Extra, Fast 300, 1000 Mbps Fiber...',
    quickProviders: ['Xfinity', 'AT&T Fiber', 'Spectrum', 'Verizon Fios', 'Frontier', 'Starlink', 'Cox'],
    quickPlans: ['Gigabit Extra (1200 Mbps)', 'Fast 300 (300 Mbps)', 'Performance Pro (500 Mbps)', 'Fiber 500', 'Fiber 1000']
  },
  phone: {
    key: 'phone',
    label: 'Mobile wireless',
    title: 'Mobile Wireless & Cellular',
    category: 'Cellular & Mobile',
    icon: 'Smartphone',
    colorClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    providerField: 'phoneProvider',
    planField: 'phonePlan',
    accountField: 'phoneAccount',
    costField: 'phoneMonthlyCost',
    notesField: 'phoneNotes',
    extraField: 'phoneLines',
    defaultProvider: 'T-Mobile',
    defaultPlan: 'Go5G Plus',
    placeholderProvider: 'e.g. T-Mobile, AT&T, Verizon, Mint Mobile...',
    placeholderPlan: 'e.g. Go5G Plus, Magenta MAX, Unlimited Plus...',
    quickProviders: ['T-Mobile', 'AT&T', 'Verizon', 'Mint Mobile', 'Google Fi', 'Visible'],
    quickPlans: ['Go5G Plus', 'Experience Beyond', 'Magenta MAX', 'Unlimited Plus', 'Unlimited Starter']
  },
  electric: {
    key: 'electric',
    label: 'Utility rate',
    title: 'Electric & Gas Utility',
    category: 'Power & Natural Gas',
    icon: 'Zap',
    colorClass: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    providerField: 'electricGasProvider',
    planField: 'electricGasPlan',
    accountField: 'electricGasAccount',
    costField: 'electricGasMonthlyCost',
    notesField: 'electricGasNotes',
    defaultProvider: 'PG&E',
    defaultPlan: 'EV2-A Home TOU',
    placeholderProvider: 'e.g. PG&E, SCE, SDG&E, SoCalGas, SMUD...',
    placeholderPlan: 'e.g. EV2-A, E-TOU-C, Tiered E-1, E-ELEC...',
    quickProviders: ['PG&E', 'SCE', 'SDG&E', 'SoCalGas', 'SMUD'],
    quickPlans: ['EV2-A (Home EV TOU)', 'E-TOU-C (Peak 4-9 PM)', 'E-ELEC (Heat Pump/EV)', 'Tiered E-1 Standard', 'CARE Discount']
  },
  trash: {
    key: 'trash',
    label: 'Trash & recycling',
    title: 'Municipal Trash & Recycling',
    category: 'Sanitation & Recycling',
    icon: 'Droplets',
    colorClass: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    providerField: 'trashProvider',
    planField: 'trashPlan',
    accountField: 'trashAccount',
    costField: 'trashMonthlyCost',
    notesField: 'trashNotes',
    defaultProvider: 'City Utilities',
    defaultPlan: '64-Gal Cart',
    placeholderProvider: 'e.g. City Utilities, Waste Management, Republic Services...',
    placeholderPlan: 'e.g. 64-Gal Standard Cart, 96-Gal Large, 32-Gal Eco...',
    quickProviders: ['City Utilities', 'Waste Management', 'Republic Services', 'Recology'],
    quickPlans: ['64-Gallon Standard Cart', '96-Gallon Large Cart', '32-Gallon Eco Cart']
  },
  security: {
    key: 'security',
    label: 'Home security',
    title: 'Home Security & Smart Home',
    category: 'Protection & Monitoring',
    icon: 'ShieldCheck',
    colorClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    providerField: 'securityProvider',
    planField: 'securityPlan',
    accountField: 'securityAccount',
    costField: 'securityMonthlyCost',
    notesField: 'securityNotes',
    defaultProvider: 'Ring',
    defaultPlan: 'Ring Protect Pro',
    placeholderProvider: 'e.g. Ring, ADT, SimpliSafe, Nest, Vivint...',
    placeholderPlan: 'e.g. Ring Protect Pro, Ring Protect Basic, Command & Control...',
    quickProviders: ['Ring', 'ADT', 'SimpliSafe', 'Vivint', 'Nest / Google Home'],
    quickPlans: ['Ring Protect Pro ($20/mo)', 'Ring Protect Basic ($4/mo)', 'ADT Command & Control', 'SimpliSafe Fast Protect']
  },
  water: {
    key: 'water',
    label: 'Water service',
    title: 'Municipal Water & Sewer',
    category: 'Water & Utilities',
    icon: 'Droplets',
    colorClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    providerField: 'waterProvider',
    planField: 'waterPlan',
    accountField: 'waterAccount',
    costField: 'waterMonthlyCost',
    notesField: 'waterNotes',
    defaultProvider: 'City Water Works',
    defaultPlan: 'Standard Residential Meter',
    placeholderProvider: 'e.g. City Water Works, California Water Service...',
    placeholderPlan: 'e.g. Standard Residential Meter, Tiered Conservation...',
    quickProviders: ['City Water Works', 'County Water District', 'California Water Service', 'American Water'],
    quickPlans: ['Standard Residential Meter', 'Tiered Conservation Rate', 'Flat Residential Rate']
  },
  homeWarranty: {
    key: 'homeWarranty',
    label: 'Home warranty',
    title: 'Home Warranty & Appliance Protection',
    category: 'Home Warranty & Protection',
    icon: 'Shield',
    colorClass: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    providerField: 'homeWarrantyProvider',
    planField: 'homeWarrantyPlan',
    accountField: 'homeWarrantyAccount',
    costField: 'homeWarrantyMonthlyCost',
    notesField: 'homeWarrantyNotes',
    defaultProvider: 'American Home Shield',
    defaultPlan: 'ShieldGold',
    placeholderProvider: 'e.g. American Home Shield, Choice Home Warranty, First American, Cinch...',
    placeholderPlan: 'e.g. ShieldGold, ShieldPlatinum, Total Plan, Basic Plan...',
    quickProviders: ['American Home Shield', 'Choice Home Warranty', 'First American', 'Cinch Home Services', 'Liberty Home Guard', 'Select Home Warranty'],
    quickPlans: ['ShieldGold ($65/mo)', 'ShieldPlatinum ($85/mo)', 'ShieldSilver ($45/mo)', 'Total Plan ($55/mo)', 'Basic Plan ($40/mo)', 'Complete Home Coverage']
  }
};

export function isNonHouseholdBill(b) {
  if (!b) return true;
  const name = String(b.name || '').toLowerCase();
  const cat = String(b.category || '').toLowerCase();
  const desc = String(b.notes || b.description || b.merchant || b.account || '').toLowerCase();

  // Explicit non-household categories (food, transportation, dining, uber, shopping, etc.)
  const excludedCategories = [
    'food', 'dining', 'restaurant', 'restaurants', 'groceries', 'grocery', 'supermarket',
    'transportation', 'transit', 'travel', 'entertainment',
    'shopping', 'retail', 'clothing', 'personal', 'auto', 'car', 'vehicle'
  ];
  if (excludedCategories.some(c => cat === c || cat.startsWith(c + ' ') || cat.endsWith(' ' + c) || cat.includes(c))) {
    return true;
  }

  // Strict non-household keywords
  const excludedKeywords = [
    'uber', 'lyft', 'doordash', 'grubhub', 'instacart', 'postmates', 'seamless',
    'mcdonald', 'starbucks', 'chipotle', 'burger', 'pizza', 'taco', 'restaurant', 'cafe',
    'trader joe', 'whole foods', 'safeway', 'kroger', 'costco', 'walmart', 'target',
    'gas station', 'chevron', 'shell', 'exxon', 'mobil', '76 gas', 'arco', 'bp gas',
    'netflix', 'spotify', 'hulu', 'disney+', 'disney plus', 'apple tv', 'gym', 'planet fitness',
    'amazon prime', 'amazon.com', 'amzn', 'amzn mktp'
  ];
  if (excludedKeywords.some(kw => name.includes(kw) || desc.includes(kw))) {
    return true;
  }

  return false;
}

export function getBillProviderCategory(b, profile = {}) {
  if (!b) return null;
  const name = String(b.name || '').toLowerCase();
  const cat = String(b.category || '').toLowerCase();
  const desc = String(b.notes || b.description || b.merchant || '').toLowerCase();

  // 1. Check exact configured provider names
  const pgeProv = String(profile.electricGasProvider || '').toLowerCase().trim();
  if (pgeProv && pgeProv.length > 2 && (name.includes(pgeProv) || desc.includes(pgeProv))) return 'electric';

  const intProv = String(profile.internetProvider || '').toLowerCase().trim();
  if (intProv && intProv.length > 2 && (name.includes(intProv) || desc.includes(intProv))) return 'internet';

  const phoneProv = String(profile.phoneProvider || '').toLowerCase().trim();
  if (phoneProv && phoneProv.length > 2 && (name.includes(phoneProv) || desc.includes(phoneProv))) return 'phone';

  const waterProv = String(profile.waterProvider || '').toLowerCase().trim();
  if (waterProv && waterProv.length > 2 && (name.includes(waterProv) || desc.includes(waterProv))) return 'water';

  const trashProv = String(profile.trashProvider || '').toLowerCase().trim();
  if (trashProv && trashProv.length > 2 && (name.includes(trashProv) || desc.includes(trashProv))) return 'trash';

  const secProv = String(profile.securityProvider || '').toLowerCase().trim();
  if (secProv && secProv.length > 2 && (name.includes(secProv) || desc.includes(secProv))) return 'security';

  const warProv = String(profile.homeWarrantyProvider || '').toLowerCase().trim();
  if (warProv && warProv.length > 2 && (name.includes(warProv) || desc.includes(warProv))) return 'homeWarranty';

  // Check extra providers
  if (Array.isArray(profile.extraProviders)) {
    for (const ep of profile.extraProviders) {
      const epName = String(ep.name || '').toLowerCase().trim();
      if (epName && epName.length > 2 && (name.includes(epName) || desc.includes(epName))) {
        return `extra-${ep.id}`;
      }
    }
  }

  // 2. Keyword fallback for electric/gas
  if (/electric|pg&e|pge|smud|edison|sdge|ladwp|natural\s+gas|socalgas|conedison|national\s+grid|duke\s+energy/i.test(name)) {
    return 'electric';
  }

  // 3. Keyword fallback for water & sewer
  if (/water|sewer|waterworks|water\s+district|aquarion|american\s+water/i.test(name)) {
    return 'water';
  }

  // 4. Keyword fallback for trash & waste
  if (/trash|recycling|garbage|waste\s+mgmt|waste\s+management|republic\s+services|recology|wm\s+trash/i.test(name)) {
    return 'trash';
  }

  // 5. Keyword fallback for internet
  if (/internet|wifi|xfinity|comcast|spectrum|fios|frontier|starlink|cox\s+comm|centurylink|optimum/i.test(name)) {
    return 'internet';
  }

  // 6. Keyword fallback for phone / mobile
  if (/t-mobile|tmobile|verizon\s+wireless|at&t\s+wireless|mint\s+mobile|google\s+fi|visible|cricket|boost\s+mobile|cellular/i.test(name)) {
    return 'phone';
  }

  // 7. Keyword fallback for security
  if (/security|ring\s+protect|adt|simplisafe|vivint|cove\s+security|brinks/i.test(name)) {
    return 'security';
  }

  // 8. Keyword fallback for home warranty
  if (/home\s+warranty|home\s+shield|choice\s+home|first\s+american|cinch|liberty\s+home/i.test(name)) {
    return 'homeWarranty';
  }

  // 9. Keyword fallback for housing / rent / mortgage
  if (/mortgage|rent|housing|lease|hoa\b|homeowner\s+assoc|property\s+tax|county\s+tax/i.test(name) || cat === 'housing') {
    return 'housing';
  }

  // General utilities category fallback
  if (cat === 'utilities') {
    return 'electric';
  }

  return null;
}

export default function HouseholdLifestyleHub({
  householdProfile,
  onUpdateProfile,
  onSyncUtilitiesToBills,
  onAskAiAdvisor,
  bills = [],
  isOverview = false,
  onNavigateToLifestyle
}) {
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
  const [selectedProviderKey, setSelectedProviderKey] = useState(null);
  const [isScanningProviderDoc, setIsScanningProviderDoc] = useState(false);
  const [providerScanProgress, setProviderScanProgress] = useState('');
  const [providerScanSuccess, setProviderScanSuccess] = useState('');
  const [providerEditForm, setProviderEditForm] = useState(null);
  const [isEditingProviderDetail, setIsEditingProviderDetail] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const providerDocInputRef = useRef(null);

  const handleCopyAccount = (acct) => {
    if (!acct) return;
    try {
      navigator.clipboard.writeText(acct);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } catch {}
  };

  const handleOpenProvider = (pKey) => {
    setSelectedProviderKey(pKey);
    const cfg = HOUSEHOLD_PROVIDER_CONFIGS[pKey];
    if (cfg) {
      setProviderEditForm({
        provider: householdProfile[cfg.providerField] || cfg.defaultProvider,
        plan: householdProfile[cfg.planField] || cfg.defaultPlan,
        accountNumber: householdProfile[cfg.accountField] || '',
        monthlyCost: householdProfile[cfg.costField] || '',
        notes: householdProfile[cfg.notesField] || ''
      });
    } else {
      const extraProv = (householdProfile.extraProviders || []).find(p => p.id === pKey);
      if (extraProv) {
        setProviderEditForm({
          provider: extraProv.name || '',
          plan: extraProv.plan || '',
          accountNumber: extraProv.accountNumber || '',
          monthlyCost: extraProv.monthlyCost || '',
          notes: extraProv.notes || '',
          type: extraProv.type || 'Custom Service'
        });
      }
    }
    setProviderScanSuccess('');
    setIsEditingProviderDetail(false);
    setHouseholdView('providerDetail');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
  };

  const [isExtraProviderModalOpen, setIsExtraProviderModalOpen] = useState(false);
  const [extraProviderForm, setExtraProviderForm] = useState(null);
  const [pendingDeleteProviderId, setPendingDeleteProviderId] = useState(null);
  const [pendingDeleteSource, setPendingDeleteSource] = useState(null);

  const handleOpenAddExtraProvider = (prefillType = 'Home Warranty & Protection') => {
    setExtraProviderForm({
      id: 'extra_' + Date.now(),
      type: prefillType,
      name: '',
      plan: '',
      monthlyCost: '',
      accountNumber: '',
      notes: '',
      isNew: true
    });
    setIsExtraProviderModalOpen(true);
  };

  const handleOpenEditExtraProvider = (prov) => {
    setExtraProviderForm({
      ...prov,
      isNew: false
    });
    setIsExtraProviderModalOpen(true);
  };

  const handleSaveExtraProvider = () => {
    if (!extraProviderForm || !extraProviderForm.name?.trim()) return;
    const existingList = Array.isArray(householdProfile.extraProviders) ? householdProfile.extraProviders : [];
    const idx = existingList.findIndex(p => p.id === extraProviderForm.id);
    let updatedList;
    if (idx >= 0) {
      updatedList = [...existingList];
      updatedList[idx] = { ...extraProviderForm };
    } else {
      updatedList = [...existingList, { ...extraProviderForm }];
    }
    const nextProfile = {
      ...householdProfile,
      extraProviders: updatedList
    };
    onUpdateProfile(nextProfile);
    try {
      localStorage.setItem('klarity_household_profile_plain', JSON.stringify(nextProfile));
      localStorage.setItem('klarity_household_profile', JSON.stringify(nextProfile));
    } catch {}
    setIsExtraProviderModalOpen(false);
    setExtraProviderForm(null);
  };

  const handleDeleteExtraProvider = (id) => {
    setPendingDeleteProviderId(id);
    setPendingDeleteSource('modal');
  };

  const executeDeleteExtraProvider = () => {
    const id = pendingDeleteProviderId;
    if (!id) return;
    const existingList = Array.isArray(householdProfile.extraProviders) ? householdProfile.extraProviders : [];
    const updatedList = existingList.filter(p => p.id !== id);
    const nextProfile = {
      ...householdProfile,
      extraProviders: updatedList
    };
    onUpdateProfile(nextProfile);
    try {
      localStorage.setItem('klarity_household_profile_plain', JSON.stringify(nextProfile));
      localStorage.setItem('klarity_household_profile', JSON.stringify(nextProfile));
    } catch {}
    if (pendingDeleteSource === 'detail') {
      setSelectedProviderKey(null);
      setIsEditingProviderDetail(false);
      setHouseholdView('saved');
    } else {
      setIsExtraProviderModalOpen(false);
      setExtraProviderForm(null);
    }
    setPendingDeleteProviderId(null);
    setPendingDeleteSource(null);
  };

  const suggestedQuickCompanies = useMemo(() => {
    if (!extraProviderForm?.type) return [];
    const t = extraProviderForm.type.toLowerCase();
    if (t.includes('warranty')) {
      return ['American Home Shield', 'Choice Home Warranty', 'First American', 'Cinch Home Services', 'Liberty Home Guard', 'Select Home Warranty'];
    }
    if (t.includes('pest')) {
      return ['Orkin', 'Terminix', 'Aptive Environmental', 'Rentokil', 'Truly Nolen', 'Mosquito Authority'];
    }
    if (t.includes('lawn')) {
      return ['TruGreen', 'Sunday', 'Lawn Doctor', 'Davey Tree', 'Local Lawn Care'];
    }
    if (t.includes('pool')) {
      return ['Leslie\'s Pool', 'Premier Pools & Spas', 'Pinch A Penny', 'Local Pool Service'];
    }
    if (t.includes('gas') || t.includes('propane')) {
      return ['Suburban Propane', 'AmeriGas', 'Ferrellgas', 'Superior Plus', 'Local Gas Utility'];
    }
    if (t.includes('clean') || t.includes('maid')) {
      return ['Merry Maids', 'The Cleaning Authority', 'Molly Maid', 'MaidPro'];
    }
    if (t.includes('security')) {
      return ['Ring', 'ADT', 'SimpliSafe', 'Vivint', 'Nest / Google Home', 'Arlo'];
    }
    if (t.includes('insurance')) {
      return ['State Farm', 'Travelers', 'Allstate', 'Lemonade', 'Liberty Mutual', 'USAA'];
    }
    return ['Local Service Provider', 'Independent Contractor'];
  }, [extraProviderForm?.type]);

  const handleSaveProviderDetails = () => {
    if (!selectedProviderKey || !providerEditForm) return;
    const cfg = HOUSEHOLD_PROVIDER_CONFIGS[selectedProviderKey];
    let nextProfile;

    if (cfg) {
      nextProfile = {
        ...householdProfile,
        [cfg.providerField]: providerEditForm.provider,
        [cfg.planField]: providerEditForm.plan,
        [cfg.accountField]: providerEditForm.accountNumber,
        [cfg.costField]: providerEditForm.monthlyCost,
        [cfg.notesField]: providerEditForm.notes
      };
    } else {
      const existingList = Array.isArray(householdProfile.extraProviders) ? householdProfile.extraProviders : [];
      const updatedList = existingList.map(p => {
        if (p.id === selectedProviderKey) {
          return {
            ...p,
            name: providerEditForm.provider,
            plan: providerEditForm.plan,
            accountNumber: providerEditForm.accountNumber,
            monthlyCost: providerEditForm.monthlyCost,
            notes: providerEditForm.notes,
            type: providerEditForm.type || p.type
          };
        }
        return p;
      });
      nextProfile = {
        ...householdProfile,
        extraProviders: updatedList
      };
    }

    onUpdateProfile(nextProfile);
    try {
      localStorage.setItem('klarity_household_profile_plain', JSON.stringify(nextProfile));
      localStorage.setItem('klarity_household_profile', JSON.stringify(nextProfile));
    } catch {}
    setIsEditingProviderDetail(false);
    setProviderScanSuccess('Provider details saved successfully!');
    setTimeout(() => setProviderScanSuccess(''), 3000);
  };

  const handleDeleteProviderFromDetail = () => {
    if (!selectedProviderKey) return;
    setPendingDeleteProviderId(selectedProviderKey);
    setPendingDeleteSource('detail');
  };

  const handleUploadProviderDocument = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProviderKey) return;

    setIsScanningProviderDoc(true);
    setProviderScanProgress('Reading document and extracting statement details...');
    setProviderScanSuccess('');

    try {
      let displayUrl = '';
      let extractedText = '';

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
          const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

          const data = new Uint8Array(await file.arrayBuffer());
          const pdf = await pdfjsLib.getDocument({ data }).promise;
          const numPages = Math.min(pdf.numPages, 4);

          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const tc = await page.getTextContent();
            extractedText += tc.items.map(it => it.str).join(' ') + '\n';
          }

          const p1 = await pdf.getPage(1);
          const viewport = p1.getViewport({ scale: 1 });
          const canvas = document.createElement('canvas');
          const maxW = 600;
          canvas.width = Math.min(viewport.width, maxW);
          canvas.height = Math.round(canvas.width * (viewport.height / viewport.width));
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await p1.render({ canvasContext: ctx, viewport: p1.getViewport({ scale: canvas.width / viewport.width }) }).promise;
          displayUrl = canvas.toDataURL('image/jpeg', 0.85);
        } catch (pdfErr) {
          console.warn('PDF extract note:', pdfErr);
        }
      }

      if (!displayUrl) {
        displayUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      }

      const cfg = HOUSEHOLD_PROVIDER_CONFIGS[selectedProviderKey];
      const extracted = {};

      const acctMatch = extractedText.match(/(?:account|acct|billing\s*account|customer\s*id)[\s:#]+([A-Z0-9\-]{5,20})/i);
      if (acctMatch) extracted.accountNumber = acctMatch[1].trim();

      const amountMatch = extractedText.match(/(?:total\s*due|amount\s*due|total\s*amount|current\s*charges|new\s*charges|monthly\s*total)[\s:$]+([0-9,]+\.[0-9]{2})/i);
      if (amountMatch) extracted.amount = parseFloat(amountMatch[1].replace(/,/g, ''));

      const dueMatch = extractedText.match(/(?:due\s*date|payment\s*due|due\s*by|pay\s*by)[\s:]+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
      if (dueMatch) extracted.dueDate = dueMatch[1].trim();

      if (cfg) {
        for (const p of cfg.quickProviders) {
          if (extractedText.toLowerCase().includes(p.toLowerCase()) || file.name.toLowerCase().includes(p.toLowerCase())) {
            extracted.provider = p;
            break;
          }
        }
        for (const pl of cfg.quickPlans) {
          const baseName = pl.split('(')[0].trim();
          if (extractedText.toLowerCase().includes(baseName.toLowerCase())) {
            extracted.plan = pl;
            break;
          }
        }
      }

      const newDoc = {
        id: 'pdoc-' + Date.now(),
        name: file.name,
        type: file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
        dataUrl: displayUrl,
        size: (file.size / 1024).toFixed(0) + ' KB',
        uploadedAt: new Date().toISOString(),
        extracted
      };

      const existingDocs = householdProfile.providerDocuments?.[selectedProviderKey] || [];
      const updatedDocs = [newDoc, ...existingDocs];

      const nextProfile = {
        ...householdProfile,
        providerDocuments: {
          ...(householdProfile.providerDocuments || {}),
          [selectedProviderKey]: updatedDocs
        }
      };

      if (cfg) {
        if (extracted.accountNumber) nextProfile[cfg.accountField] = extracted.accountNumber;
        if (extracted.provider) nextProfile[cfg.providerField] = extracted.provider;
        if (extracted.plan) nextProfile[cfg.planField] = extracted.plan;
        if (extracted.amount != null) nextProfile[cfg.costField] = extracted.amount;
      } else {
        const existingList = Array.isArray(householdProfile.extraProviders) ? householdProfile.extraProviders : [];
        nextProfile.extraProviders = existingList.map(p => {
          if (p.id === selectedProviderKey) {
            return {
              ...p,
              name: extracted.provider || p.name,
              plan: extracted.plan || p.plan,
              accountNumber: extracted.accountNumber || p.accountNumber,
              monthlyCost: extracted.amount != null ? extracted.amount : p.monthlyCost
            };
          }
          return p;
        });
      }

      onUpdateProfile(nextProfile);
      try {
        localStorage.setItem('klarity_household_profile_plain', JSON.stringify(nextProfile));
        localStorage.setItem('klarity_household_profile', JSON.stringify(nextProfile));
      } catch {}

      setProviderEditForm(prev => ({
        ...prev,
        provider: cfg ? (nextProfile[cfg.providerField] || prev?.provider) : (extracted.provider || prev?.provider),
        plan: cfg ? (nextProfile[cfg.planField] || prev?.plan) : (extracted.plan || prev?.plan),
        accountNumber: cfg ? (nextProfile[cfg.accountField] || prev?.accountNumber) : (extracted.accountNumber || prev?.accountNumber),
        monthlyCost: cfg ? (nextProfile[cfg.costField] || prev?.monthlyCost) : (extracted.amount != null ? extracted.amount : prev?.monthlyCost)
      }));

      setProviderScanSuccess(
        extracted.accountNumber || extracted.amount
          ? `Statement verified! Extracted ${extracted.accountNumber ? `Account #${extracted.accountNumber}` : ''}${extracted.amount ? ` ($${extracted.amount.toFixed(2)})` : ''}.`
          : 'Statement document uploaded successfully!'
      );
    } catch (err) {
      console.error('Provider document upload error:', err);
    } finally {
      setIsScanningProviderDoc(false);
      setProviderScanProgress('');
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteProviderDocument = (docId) => {
    if (!selectedProviderKey) return;
    const existingDocs = householdProfile.providerDocuments?.[selectedProviderKey] || [];
    const updatedDocs = existingDocs.filter(d => d.id !== docId);
    const nextProfile = {
      ...householdProfile,
      providerDocuments: {
        ...(householdProfile.providerDocuments || {}),
        [selectedProviderKey]: updatedDocs
      }
    };
    onUpdateProfile(nextProfile);
    try {
      localStorage.setItem('klarity_household_profile_plain', JSON.stringify(nextProfile));
      localStorage.setItem('klarity_household_profile', JSON.stringify(nextProfile));
    } catch {}
  };
  const [isHouseholdExpanded, setIsHouseholdExpanded] = useState(true);
  const [householdSubTab, setHouseholdSubTab] = useState('property');
  const [wizardStep, setWizardStep] = useState(1);
  const totalWizardSteps = 7;

  const handleFinishWizard = () => {
    setHouseholdView('saved');
    setIsHouseholdExpanded(true);
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

  // Extract only verified bills pulled from actual payments & connected accounts (strictly excluding non-household expenses like food, uber, dining, etc.)
  const actualHouseholdBills = useMemo(() => {
    if (!Array.isArray(bills) || bills.length === 0) return [];
    return bills.filter(b => {
      if (!b || !b.name) return false;
      const id = String(b.id || '').toLowerCase();
      // Strictly exclude any synthetic, placeholder, estimated, or fake mock/sample bills
      if (
        b.isSimulated ||
        b.isEstimate ||
        b.isPlaceholder ||
        b.isMock ||
        id.startsWith('mock-') ||
        id.startsWith('demo-') ||
        id.startsWith('sample-') ||
        id.startsWith('seed-') ||
        id === 'bill-pge' ||
        id === 'bill-rent' ||
        id === 'bill-water' ||
        id.startsWith('bill-sync-')
      ) {
        return false;
      }

      // Strictly exclude fake demo accounts like Checking 4821
      const acct = String(b.account || b.dueText || '').toLowerCase();
      if (acct.includes('4821') || acct.includes('mock')) {
        return false;
      }

      // Strictly exclude non-household expenses (food, uber, dining, groceries, shopping, entertainment, etc.)
      if (isNonHouseholdBill(b)) {
        return false;
      }

      const provCategory = getBillProviderCategory(b, householdProfile);
      const isHouseholdCat = ['utilities', 'housing', 'internet & tech', 'home'].includes(String(b.category || '').toLowerCase());
      return (Boolean(provCategory) || isHouseholdCat) && Number(b.expectedAmount || b.amount || 0) > 0;
    });
  }, [bills, householdProfile]);

  const totalActualBills = useMemo(
    () => actualHouseholdBills.reduce((sum, b) => sum + Number(b.expectedAmount || b.amount || 0), 0),
    [actualHouseholdBills]
  );

  const [selectedBillProvider, setSelectedBillProvider] = useState('all');

  const providerFilterOptions = useMemo(() => {
    const list = [
      { id: 'all', label: 'All provider bills', shortLabel: 'All provider bills', icon: Receipt },
      { id: 'electric', label: householdProfile.electricGasProvider ? `${householdProfile.electricGasProvider} (Electric & Gas)` : 'Electric & Gas', shortLabel: householdProfile.electricGasProvider || 'Electric & Gas', icon: Zap },
      { id: 'water', label: householdProfile.waterProvider ? `${householdProfile.waterProvider} (Water & Sewer)` : 'Water & Sewer', shortLabel: householdProfile.waterProvider || 'Water & Sewer', icon: Droplets },
      { id: 'trash', label: householdProfile.trashProvider ? `${householdProfile.trashProvider} (Trash & Recycling)` : 'Trash & Recycling', shortLabel: householdProfile.trashProvider || 'Trash & Recycling', icon: Droplets },
      { id: 'internet', label: householdProfile.internetProvider ? `${householdProfile.internetProvider} (Internet & WiFi)` : 'Internet & WiFi', shortLabel: householdProfile.internetProvider || 'Internet & WiFi', icon: Wifi },
      { id: 'phone', label: householdProfile.phoneProvider ? `${householdProfile.phoneProvider} (Mobile Wireless)` : 'Mobile Wireless', shortLabel: householdProfile.phoneProvider || 'Mobile Wireless', icon: Smartphone },
      { id: 'security', label: householdProfile.securityProvider ? `${householdProfile.securityProvider} (Home Security)` : 'Home Security', shortLabel: householdProfile.securityProvider || 'Home Security', icon: ShieldCheck },
      { id: 'homeWarranty', label: householdProfile.homeWarrantyProvider ? `${householdProfile.homeWarrantyProvider} (Home Warranty)` : 'Home Warranty', shortLabel: householdProfile.homeWarrantyProvider || 'Home Warranty', icon: Shield },
      { id: 'housing', label: 'Housing (Rent / Mortgage)', shortLabel: 'Rent / Mortgage', icon: Building }
    ];

    if (Array.isArray(householdProfile.extraProviders)) {
      householdProfile.extraProviders.forEach(ep => {
        list.push({
          id: `extra-${ep.id}`,
          label: ep.name ? `${ep.name} (${ep.type || 'Custom'})` : (ep.type || 'Custom Provider'),
          shortLabel: ep.name || ep.type || 'Extra Provider',
          icon: Sparkles
        });
      });
    }

    return list.map(opt => {
      if (opt.id === 'all') {
        return {
          ...opt,
          count: actualHouseholdBills.length,
          total: totalActualBills
        };
      }
      const matchingBills = actualHouseholdBills.filter(b => getBillProviderCategory(b, householdProfile) === opt.id);
      const total = matchingBills.reduce((sum, b) => sum + Number(b.expectedAmount || b.amount || 0), 0);
      return {
        ...opt,
        count: matchingBills.length,
        total
      };
    }).filter(opt => opt.id === 'all' || opt.count > 0 || ['electric', 'internet', 'phone', 'water'].includes(opt.id));
  }, [householdProfile, actualHouseholdBills, totalActualBills]);

  const displayedHouseholdBills = useMemo(() => {
    if (selectedBillProvider === 'all') return actualHouseholdBills;
    return actualHouseholdBills.filter(b => getBillProviderCategory(b, householdProfile) === selectedBillProvider);
  }, [actualHouseholdBills, selectedBillProvider, householdProfile]);

  const displayedBillsTotal = useMemo(() => {
    return displayedHouseholdBills.reduce((sum, b) => sum + Number(b.expectedAmount || b.amount || 0), 0);
  }, [displayedHouseholdBills]);

  const suggestedInternetPlans = useMemo(
    () => getPlansForProvider('internet', householdProfile.internetProvider),
    [householdProfile.internetProvider]
  );
  const suggestedPhonePlans = useMemo(
    () => getPlansForProvider('phone', householdProfile.phoneProvider),
    [householdProfile.phoneProvider]
  );
  const suggestedUtilityPlans = useMemo(
    () => getPlansForProvider('electricGas', householdProfile.electricGasProvider),
    [householdProfile.electricGasProvider]
  );
  const suggestedTrashPlans = useMemo(
    () => getPlansForProvider('trash', householdProfile.trashProvider),
    [householdProfile.trashProvider]
  );
  const suggestedSecurityPlans = useMemo(
    () => getPlansForProvider('security', householdProfile.securityProvider),
    [householdProfile.securityProvider]
  );
  const suggestedHomeWarrantyPlans = useMemo(
    () => getPlansForProvider('homeWarranty', householdProfile.homeWarrantyProvider),
    [householdProfile.homeWarrantyProvider]
  );
  const suggestedWaterPlans = useMemo(
    () => getPlansForProvider('water', householdProfile.waterProvider),
    [householdProfile.waterProvider]
  );

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
          {/* ============================================================= */}
          {/* STATE: EMPTY HOUSEHOLD IN OVERVIEW (Redirect to Lifestyle)    */}
          {/* ============================================================= */}
          {isOverview && !hasHouseholdSpecs && (
            <div className="bg-white border border-slate-200/90 rounded-[12px] shadow-2xs p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#18457c] mb-1">
                <Home className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">Household Property & Utilities</h3>
              <p className="text-sm text-slate-500 max-w-md">
                To set up your home specs, solar panels, and utility providers, please go to the Lifestyle section from the sidebar.
              </p>
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
            </div>
          )}

          {/* ============================================================= */}
          {/* VIEW A: STEP-BY-STEP QUESTIONNAIRE WIZARD                     */}
          {/* ============================================================= */}
          {(!isOverview || hasHouseholdSpecs) && householdView === 'wizard' && (
            <div className="bg-white border border-slate-200/90 rounded-[12px] shadow-sm overflow-hidden flex flex-col transition-all">
              {/* Wizard Top Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <span className="text-[13px] font-semibold text-[#18457c] bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full tracking-wide">
                      Question {wizardStep} of {totalWizardSteps}
                    </span>
                    <h3 className="font-semibold text-base sm:text-lg text-slate-900 tracking-tight">
                      {wizardStep === 1 && 'Where is your home located?'}
                      {wizardStep === 2 && 'Who lives in your home?'}
                      {wizardStep === 3 && 'What heating & cooling systems do you use?'}
                      {wizardStep === 4 && 'Electric vehicle charging at home'}
                      {wizardStep === 5 && 'Do you have a swimming pool or spa?'}
                      {wizardStep === 6 && 'Rooftop solar panels & battery storage'}
                      {wizardStep === 7 && 'Household service providers & plan names'}
                    </h3>
                  </div>
                  <p className="text-[13px] text-slate-500">
                    {wizardStep === 1 && 'Enter your address or paste a Zillow link to auto-fill specs, or adjust manually.'}
                    {wizardStep === 2 && 'Helps calculate baseline water, electricity, gas, and food usage.'}
                    {wizardStep === 3 && 'Determines seasonal electric cooling and heating energy loads.'}
                    {wizardStep === 4 && 'Details about your home charger, schedule, and daily charging needs.'}
                    {wizardStep === 5 && 'Pool filtration pumps and water heaters impact monthly energy bills.'}
                    {wizardStep === 6 && 'Calculates monthly solar generation, offset rates, and battery backup.'}
                    {wizardStep === 7 && 'Enter your exact plan names (including older or grandfathered plans).'}
                  </p>
                </div>

                {/* Quick Question Selector Dropdown & Skip to Overview */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-[8px] shadow-2xs">
                    <span className="text-[13px] font-semibold text-slate-400 ">Go to:</span>
                    <select
                      value={wizardStep}
                      onChange={e => setWizardStep(Number(e.target.value))}
                      className="text-[13px] font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value={1}>1. Home Specs</option>
                      <option value={2}>2. Residents</option>
                      <option value={3}>3. Heating & AC</option>
                      <option value={4}>4. EV Charging</option>
                      <option value={5}>5. Pool / Spa</option>
                      <option value={6}>6. Solar & Battery</option>
                      <option value={7}>7. Providers & Plans</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setHouseholdView('saved');
                      setIsHouseholdExpanded(true);
                    }}
                    className="text-[13px] font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-[8px] hover:bg-slate-200/60 transition-colors cursor-pointer"
                  >
                    Skip to overview
                  </button>
                </div>
              </div>

              {/* Interactive Clickable Question Stepper Bar */}
              <div className="px-6 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
                {[
                  { step: 1, label: '1. Specs', icon: Home },
                  { step: 2, label: '2. Residents', icon: Users },
                  { step: 3, label: '3. Climate', icon: Flame },
                  { step: 4, label: '4. EV Charging', icon: Zap },
                  { step: 5, label: '5. Pool', icon: Droplets },
                  { step: 6, label: '6. Solar', icon: Sun },
                  { step: 7, label: '7. Plans', icon: Wifi }
                ].map(item => {
                  const isCurrent = wizardStep === item.step;
                  const isCompleted = wizardStep > item.step;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => setWizardStep(item.step)}
                      className={`px-3 py-1.5 rounded-[8px] text-[13px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                        isCurrent
                          ? 'bg-[#18457c] text-white shadow-2xs'
                          : isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/70 hover:bg-emerald-100'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-white' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                      {isCompleted && <Check className="w-3 h-3 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>

              {/* Wizard Content Body */}
              <div className="p-6 sm:p-8">
                {/* ------------------------------------------------------- */}
                {/* STEP 1: PROPERTY SPECS & ADDRESS                        */}
                {/* ------------------------------------------------------- */}
                {wizardStep === 1 && (
                  <div className="flex flex-col gap-6 text-[13px]">
                    {/* Safe Property Lookup Bar */}
                    <div className="p-4 sm:p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-3">
                      <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#18457c]" />
                        <span>Home Address or Zillow Link</span>
                      </span>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={propertyUrlInput}
                          onChange={e => setPropertyUrlInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleFetchProperty(); }}
                          placeholder="Search address (e.g. 742 Evergreen Terr, Springfield) or paste Zillow URL..."
                          className="flex-1 text-[13px] font-medium text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#18457c]/20"
                        />
                        <button
                          type="button"
                          disabled={isFetchingProperty}
                          onClick={handleFetchProperty}
                          className="px-4 py-2.5 rounded-[8px] bg-[#18457c] hover:bg-[#123561] text-white text-[13px] font-semibold transition-all shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          {isFetchingProperty ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                          <span>Auto-fill Specs</span>
                        </button>
                      </div>
                      {propertyLookupError && (
                        <p className="text-[13px] font-medium text-amber-700">
                          {propertyLookupError}
                        </p>
                      )}
                      {propertyLookupSuccess && (
                        <p className="text-[13px] font-medium text-emerald-700">
                          {propertyLookupSuccess}
                        </p>
                      )}
                    </div>

                    {/* Dwelling Type Selection Cards */}
                    <div>
                      <span className="text-[13px] font-semibold text-slate-800 block mb-2.5">
                        What type of dwelling is your home?
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {DWELLING_TYPES.map(d => {
                          const isSelected = (householdProfile.dwellingType || 'single_family') === d.id;
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => handleFieldChange('dwellingType', d.id)}
                              className={`p-3.5 rounded-[8px] border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                                isSelected
                                  ? 'bg-blue-50/80 border-[#18457c] ring-2 ring-[#18457c]/20 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                              }`}
                            >
                              <Home className={`w-4 h-4 ${isSelected ? 'text-[#18457c]' : 'text-slate-400'}`} />
                              <div>
                                <span className="font-semibold text-slate-900 block text-[13px]">{d.label}</span>
                                <span className="text-[13px] text-slate-500 block mt-0.5">~{d.defaultSqFt.toLocaleString()} sq ft</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Roomy Property Specs Grid */}
                    <div>
                      <span className="text-[13px] font-semibold text-slate-800 block mb-2.5">
                        Property Specifications
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                        <div className="p-3.5 rounded-[8px] bg-slate-50 border border-slate-200">
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">Bedrooms</span>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={householdProfile.bedrooms || 3}
                            onChange={e => handleFieldChange('bedrooms', Number(e.target.value) || 1)}
                            className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-3.5 rounded-[8px] bg-slate-50 border border-slate-200">
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">Bathrooms</span>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            max="10"
                            value={householdProfile.bathrooms || 2}
                            onChange={e => handleFieldChange('bathrooms', Number(e.target.value) || 1)}
                            className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-3.5 rounded-[8px] bg-slate-50 border border-slate-200">
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">Interior Size (sq ft)</span>
                          <input
                            type="number"
                            min="200"
                            step="50"
                            value={householdProfile.sqFt || 2100}
                            onChange={e => handleFieldChange('sqFt', Number(e.target.value) || 2100)}
                            className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-3.5 rounded-[8px] bg-slate-50 border border-slate-200">
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">Year Built</span>
                          <input
                            type="number"
                            min="1850"
                            max="2030"
                            value={householdProfile.yearBuilt || 2004}
                            onChange={e => handleFieldChange('yearBuilt', Number(e.target.value) || 2004)}
                            className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-3.5 rounded-[8px] bg-slate-50 border border-slate-200">
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">Estimated Value</span>
                          <input
                            type="text"
                            value={householdProfile.estimatedValue || '$425,000'}
                            onChange={e => handleFieldChange('estimatedValue', e.target.value)}
                            placeholder="e.g. $425,000"
                            className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-3.5 rounded-[8px] bg-slate-50 border border-slate-200">
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">Lot Size</span>
                          <input
                            type="text"
                            value={householdProfile.lotSize || '6,500 sq ft'}
                            onChange={e => handleFieldChange('lotSize', e.target.value)}
                            placeholder="e.g. 6,500 sq ft"
                            className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-3.5 rounded-[8px] bg-slate-50 border border-slate-200">
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">County</span>
                          <input
                            type="text"
                            value={householdProfile.county || 'Fresno County'}
                            onChange={e => handleFieldChange('county', e.target.value)}
                            className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                          />
                        </div>

                        <div className="p-3.5 rounded-[8px] bg-slate-50 border border-slate-200">
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">Garage</span>
                          <input
                            type="text"
                            value={householdProfile.garage || 'Attached 2-Car Garage'}
                            onChange={e => handleFieldChange('garage', e.target.value)}
                            className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* STEP 2: WHO LIVES HERE & OWNERSHIP                      */}
                {/* ------------------------------------------------------- */}
                {wizardStep === 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[13px]">
                    {/* Household Size Stepper */}
                    <div className="p-6 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col justify-between gap-4">
                      <div>
                        <span className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span>How many people live in your home?</span>
                        </span>
                        <p className="text-[13px] text-slate-500 mt-1">
                          Calculates baseline electricity, natural gas, hot water, and groceries.
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-6 py-4 bg-white rounded-[8px] border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('householdSize', Math.max(1, (householdProfile.householdSize || 4) - 1))}
                          className="w-10 h-10 rounded-full border border-slate-300 bg-slate-50 hover:bg-slate-100 font-black text-slate-700 text-lg flex items-center justify-center cursor-pointer transition-colors"
                        >
                          -
                        </button>
                        <div className="text-center">
                          <span className="text-3xl font-black text-slate-900 block tracking-tight">
                            {householdProfile.householdSize || 4}
                          </span>
                          <span className="text-[13px] font-semibold text-slate-400 ">
                            {(householdProfile.householdSize || 4) === 1 ? 'Person' : 'People'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFieldChange('householdSize', Math.min(12, (householdProfile.householdSize || 4) + 1))}
                          className="w-10 h-10 rounded-full border border-slate-300 bg-slate-50 hover:bg-slate-100 font-black text-slate-700 text-lg flex items-center justify-center cursor-pointer transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Own or Rent Card */}
                    <div className="p-6 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col justify-between gap-4">
                      <div>
                        <span className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <Home className="w-4 h-4 text-emerald-600" />
                          <span>Do you own or rent?</span>
                        </span>
                        <p className="text-[13px] text-slate-500 mt-1">
                          Determines property tax and insurance tracking.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('ownership', 'own')}
                          className={`p-4 rounded-[8px] border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                            (householdProfile.ownership || 'own') === 'own'
                              ? 'bg-blue-50/80 border-[#18457c] ring-2 ring-[#18457c]/20 shadow-2xs font-semibold text-[#18457c]'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Home className="w-5 h-5" />
                          <span>I Own My Home</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFieldChange('ownership', 'rent')}
                          className={`p-4 rounded-[8px] border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                            householdProfile.ownership === 'rent'
                              ? 'bg-blue-50/80 border-[#18457c] ring-2 ring-[#18457c]/20 shadow-2xs font-semibold text-[#18457c]'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Building className="w-5 h-5" />
                          <span>I Rent / Lease</span>
                        </button>
                      </div>

                      {/* PG&E CARE Discount Toggle */}
                      <label className="flex items-center gap-3 p-3.5 bg-white rounded-[8px] border border-slate-200/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(householdProfile.hasCareDiscount)}
                          onChange={e => handleFieldChange('hasCareDiscount', e.target.checked)}
                          className="w-4 h-4 rounded text-[#18457c] accent-[#18457c] cursor-pointer"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-slate-900 block text-[13px]">
                            Enrolled in PG&E CARE or FERA Discount?
                          </span>
                          <span className="text-[13px] text-slate-500 block">
                            Applies a 30–35% discount on electric and 20% on natural gas.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* STEP 3: HEATING & COOLING                               */}
                {/* ------------------------------------------------------- */}
                {wizardStep === 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-[13px]">
                    {/* Heating */}
                    <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-3">
                      <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span>Home Heating System</span>
                      </span>
                      <select
                        value={householdProfile.heatingType || 'natural_gas_furnace'}
                        onChange={e => handleFieldChange('heatingType', e.target.value)}
                        className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2.5 focus:outline-none cursor-pointer"
                      >
                        {HOME_QUESTIONNAIRE_OPTIONS.heating.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                      <p className="text-[13px] text-slate-500">
                        Natural gas furnaces rely on therms; heat pumps utilize off-peak electricity.
                      </p>
                    </div>

                    {/* Cooling */}
                    <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-3">
                      <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-500" />
                        <span>Air Conditioning / Cooling</span>
                      </span>
                      <select
                        value={householdProfile.coolingType || 'central_ac'}
                        onChange={e => handleFieldChange('coolingType', e.target.value)}
                        className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2.5 focus:outline-none cursor-pointer"
                      >
                        {HOME_QUESTIONNAIRE_OPTIONS.cooling.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                      <p className="text-[13px] text-slate-500">
                        Central A/C creates higher summertime peak loads between 4–9 PM.
                      </p>
                    </div>

                    {/* Water Heater */}
                    <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-3">
                      <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-emerald-500" />
                        <span>Water Heater</span>
                      </span>
                      <select
                        value={householdProfile.waterHeaterType || 'natural_gas_tank'}
                        onChange={e => handleFieldChange('waterHeaterType', e.target.value)}
                        className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2.5 focus:outline-none cursor-pointer"
                      >
                        {HOME_QUESTIONNAIRE_OPTIONS.waterHeater.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                      <p className="text-[13px] text-slate-500">
                        Hybrid heat pump water heaters use 70% less energy than standard gas tanks.
                      </p>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* STEP 4: ELECTRIC VEHICLE AT HOME                        */}
                {/* ------------------------------------------------------- */}
                {wizardStep === 4 && (
                  <div className="flex flex-col gap-5 text-[13px]">
                    {/* EV Presence Toggle Cards */}
                    <div>
                      <span className="text-[13px] font-semibold text-slate-800 block mb-2.5">
                        Do you have an electric vehicle (EV or Plug-in Hybrid) at home?
                      </span>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('hasEvAtHome', true)}
                          className={`p-4 rounded-[8px] border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                            householdProfile.hasEvAtHome !== false
                              ? 'bg-blue-50/80 border-[#18457c] ring-2 ring-[#18457c]/20 shadow-2xs font-semibold text-[#18457c]'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Car className="w-6 h-6" />
                          <span>Yes, I have an EV</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFieldChange('hasEvAtHome', false)}
                          className={`p-4 rounded-[8px] border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                            householdProfile.hasEvAtHome === false
                              ? 'bg-blue-50/80 border-[#18457c] ring-2 ring-[#18457c]/20 shadow-2xs font-semibold text-[#18457c]'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <X className="w-6 h-6" />
                          <span>No EV at home</span>
                        </button>
                      </div>
                    </div>

                    {householdProfile.hasEvAtHome !== false && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                        {/* Charger Type */}
                        <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
                          <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                            <BatteryCharging className="w-4 h-4 text-emerald-600" />
                            <span>What type of charger do you have at home?</span>
                          </span>
                          <div className="grid grid-cols-3 gap-2 mt-1">
                            {[
                              { id: 'level2_240v', label: 'Level 2', sub: '240V Outlet' },
                              { id: 'level1_120v', label: 'Level 1', sub: '120V Standard' },
                              { id: 'none', label: 'No Charger', sub: 'Public only' }
                            ].map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleFieldChange('evChargerType', c.id)}
                                className={`p-2.5 rounded-[8px] border text-center transition-all cursor-pointer ${
                                  (householdProfile.evChargerType || 'level2_240v') === c.id
                                    ? 'bg-[#18457c] text-white border-[#18457c] shadow-2xs font-semibold'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 font-semibold'
                                }`}
                              >
                                <span className="block text-[13px]">{c.label}</span>
                                <span className={`block text-[13px] ${ (householdProfile.evChargerType || 'level2_240v') === c.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                  {c.sub}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Frequency */}
                        <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-2.5">
                          <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <span>How often do you charge at home?</span>
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                            {[
                              { id: 'daily', label: 'Daily' },
                              { id: 'few_times_week', label: '2–3x/wk' },
                              { id: 'weekends', label: 'Weekends' },
                              { id: 'never', label: 'Never' }
                            ].map(f => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => handleFieldChange('evHomeChargingFrequency', f.id)}
                                className={`py-2 px-1 rounded-[8px] border text-center text-[13px] font-semibold transition-all cursor-pointer ${
                                  (householdProfile.evHomeChargingFrequency || 'daily') === f.id
                                    ? 'bg-[#18457c] text-white border-[#18457c] shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Daily Miles & Schedule (Only if not never) */}
                        {householdProfile.evHomeChargingFrequency !== 'never' && (
                          <>
                            <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-2">
                              <span className="font-semibold text-slate-900 text-[13px]">Average daily miles charged at home</span>
                              <div className="flex items-center gap-3 mt-1">
                                <input
                                  type="number"
                                  min="5"
                                  max="200"
                                  step="5"
                                  value={householdProfile.evDailyHomeMiles || 35}
                                  onChange={e => handleFieldChange('evDailyHomeMiles', Number(e.target.value) || 35)}
                                  className="w-24 text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                                />
                                <span className="text-slate-500 font-medium text-[13px]">
                                  mi/day (~{((Number(householdProfile.evDailyHomeMiles) || 35) * 30).toLocaleString()} mi/mo)
                                </span>
                              </div>
                            </div>

                            <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-2">
                              <span className="font-semibold text-slate-900 text-[13px]">When do you plug in?</span>
                              <select
                                value={householdProfile.evChargingSchedule || 'overnight_offpeak'}
                                onChange={e => handleFieldChange('evChargingSchedule', e.target.value)}
                                className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2.5 focus:outline-none cursor-pointer mt-1"
                              >
                                <option value="overnight_offpeak">Overnight Off-Peak (Midnight – 3 PM cheapest)</option>
                                <option value="any_time">Any time / Whenever plugged in</option>
                                <option value="daytime_solar">Daytime to absorb rooftop solar generation</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* STEP 5: POOL OR SPA                                     */}
                {/* ------------------------------------------------------- */}
                {wizardStep === 5 && (
                  <div className="flex flex-col gap-5 text-[13px]">
                    <div>
                      <span className="text-[13px] font-semibold text-slate-800 block mb-2.5">
                        Do you have a swimming pool or hot tub spa?
                      </span>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('hasPool', false)}
                          className={`p-4 rounded-[8px] border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                            !householdProfile.hasPool
                              ? 'bg-blue-50/80 border-[#18457c] ring-2 ring-[#18457c]/20 shadow-2xs font-semibold text-[#18457c]'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <X className="w-6 h-6" />
                          <span>No Pool or Spa</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFieldChange('hasPool', true)}
                          className={`p-4 rounded-[8px] border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                            Boolean(householdProfile.hasPool)
                              ? 'bg-blue-50/80 border-[#18457c] ring-2 ring-[#18457c]/20 shadow-2xs font-semibold text-[#18457c]'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Droplets className="w-6 h-6 text-blue-500" />
                          <span>Yes, Pool or Spa</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* STEP 6: ROOFTOP SOLAR & BATTERY                         */}
                {/* ------------------------------------------------------- */}
                {wizardStep === 6 && (
                  <div className="flex flex-col gap-5 text-[13px]">
                    <div>
                      <span className="text-[13px] font-semibold text-slate-800 block mb-2.5">
                        Do you have rooftop solar panels installed?
                      </span>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('hasSolar', false)}
                          className={`p-4 rounded-[8px] border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                            !householdProfile.hasSolar
                              ? 'bg-blue-50/80 border-[#18457c] ring-2 ring-[#18457c]/20 shadow-2xs font-semibold text-[#18457c]'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <X className="w-6 h-6" />
                          <span>No Solar Panels</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleFieldChange('hasSolar', true)}
                          className={`p-4 rounded-[8px] border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                            Boolean(householdProfile.hasSolar)
                              ? 'bg-blue-50/80 border-[#18457c] ring-2 ring-[#18457c]/20 shadow-2xs font-semibold text-[#18457c]'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Sun className="w-6 h-6 text-amber-500" />
                          <span>Yes, Have Rooftop Solar</span>
                        </button>
                      </div>
                    </div>

                    {Boolean(householdProfile.hasSolar) && (
                      <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                          <div className="p-3.5 rounded-[8px] bg-white border border-slate-200">
                            <span className="text-[13px] font-semibold text-slate-500 block mb-1">Panels Count</span>
                            <input
                              type="number"
                              min="4"
                              max="80"
                              value={householdProfile.solarPanelCount || 20}
                              onChange={e => handleFieldChange('solarPanelCount', Number(e.target.value) || 20)}
                              className="w-full text-sm font-semibold text-slate-900 bg-transparent focus:outline-none"
                            />
                          </div>

                          <div className="p-3.5 rounded-[8px] bg-white border border-slate-200">
                            <span className="text-[13px] font-semibold text-slate-500 block mb-1">Watts / Panel</span>
                            <input
                              type="number"
                              min="200"
                              max="600"
                              step="10"
                              value={householdProfile.solarWattsPerPanel || 400}
                              onChange={e => handleFieldChange('solarWattsPerPanel', Number(e.target.value) || 400)}
                              className="w-full text-sm font-semibold text-slate-900 bg-transparent focus:outline-none"
                            />
                          </div>

                          <div className="p-3.5 rounded-[8px] bg-white border border-slate-200">
                            <span className="text-[13px] font-semibold text-slate-500 block mb-1">Ownership</span>
                            <select
                              value={householdProfile.solarOwnership || 'owned'}
                              onChange={e => handleFieldChange('solarOwnership', e.target.value)}
                              className="w-full text-[13px] font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                            >
                              <option value="owned">Owned</option>
                              <option value="leased">Leased</option>
                              <option value="ppa">PPA</option>
                            </select>
                          </div>

                          <div className="p-3.5 rounded-[8px] bg-white border border-slate-200">
                            <span className="text-[13px] font-semibold text-slate-500 block mb-1">Net Metering</span>
                            <select
                              value={householdProfile.solarBillingPlan || 'nem_2'}
                              onChange={e => handleFieldChange('solarBillingPlan', e.target.value)}
                              className="w-full text-[13px] font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                            >
                              <option value="nem_2">NEM 2.0</option>
                              <option value="nem_3">NEM 3.0</option>
                              <option value="nem_1">NEM 1.0</option>
                            </select>
                          </div>
                        </div>

                        {/* Battery Storage */}
                        <div className="p-4 rounded-[8px] bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div>
                            <span className="font-semibold text-slate-900 text-[13px] block">Home Battery Backup (e.g. Tesla Powerwall)</span>
                            <span className="text-[13px] text-slate-500 block mt-0.5">Stores solar energy for overnight usage and grid outages.</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer font-semibold text-[13px] text-slate-800">
                              <input
                                type="checkbox"
                                checked={Boolean(householdProfile.solarHasBattery)}
                                onChange={e => handleFieldChange('solarHasBattery', e.target.checked)}
                                className="w-4 h-4 rounded text-[#18457c] accent-[#18457c]"
                              />
                              <span>Battery Installed</span>
                            </label>
                            {householdProfile.solarHasBattery && (
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="5"
                                  max="60"
                                  value={householdProfile.solarBatteryCapacityKwh || 13.5}
                                  onChange={e => handleFieldChange('solarBatteryCapacityKwh', Number(e.target.value) || 13.5)}
                                  className="w-14 font-semibold text-slate-900 bg-transparent text-right text-[13px] focus:outline-none"
                                />
                                <span className="text-[13px] text-slate-500 font-semibold">kWh</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ------------------------------------------------------- */}
                {/* STEP 7: SERVICE PROVIDERS & PLAN NAMES                  */}
                {/* ------------------------------------------------------- */}
                {wizardStep === 7 && (
                  <div className="flex flex-col gap-6 text-[13px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* 1. Home Internet */}
                      <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-3">
                        <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-blue-600" />
                          <span>1. Home Internet & WiFi</span>
                        </span>

                        <div>
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">Provider</span>
                          <input
                            type="text"
                            value={householdProfile.internetProvider || ''}
                            onChange={e => handleFieldChange('internetProvider', e.target.value)}
                            placeholder="e.g. Xfinity, AT&T Fiber, Spectrum, Starlink..."
                            className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {['Xfinity', 'AT&T Fiber', 'Spectrum', 'Verizon Fios', 'Frontier', 'Starlink'].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => handleFieldChange('internetProvider', p)}
                                className={`px-2.5 py-1 rounded-lg text-[13px] font-semibold border transition-colors cursor-pointer ${householdProfile.internetProvider === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">
                            Plan Name (enter or pick a suggestion)
                          </span>
                          <input
                            type="text"
                            list="internet-plans-list"
                            value={householdProfile.internetPlan || ''}
                            onChange={e => handleFieldChange('internetPlan', e.target.value)}
                            placeholder="Type plan name, e.g. Gigabit Extra, Fast 300, Performance Pro..."
                            className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                          />
                          <datalist id="internet-plans-list">
                            {suggestedInternetPlans.map(p => (
                              <option key={p.name} value={p.name}>{p.name} ({p.tag})</option>
                            ))}
                          </datalist>

                          {suggestedInternetPlans.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-2 max-h-24 overflow-y-auto pr-1">
                              {suggestedInternetPlans.map(p => {
                                const isSelected = householdProfile.internetPlan === p.name;
                                return (
                                  <button
                                    key={p.name}
                                    type="button"
                                    onClick={() => handleFieldChange('internetPlan', p.name)}
                                    className={`px-2 py-0.5 rounded text-[13px] font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                                      isSelected
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>{p.name}</span>
                                    <span className={`text-[13px] px-1 py-0.2 rounded font-medium ${
                                      isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {p.tag}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. Mobile & Cell Phone */}
                      <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-blue-600" />
                            <span>2. Mobile & Cell Phone</span>
                          </span>
                          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200">
                            <span className="text-[13px] font-semibold text-slate-500">Lines:</span>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={householdProfile.phoneLines || 3}
                              onChange={e => handleFieldChange('phoneLines', Number(e.target.value) || 1)}
                              className="w-7 text-center font-semibold text-slate-900 bg-transparent focus:outline-none text-[13px]"
                            />
                          </div>
                        </div>

                        <div>
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">Carrier</span>
                          <input
                            type="text"
                            value={householdProfile.phoneProvider || ''}
                            onChange={e => handleFieldChange('phoneProvider', e.target.value)}
                            placeholder="e.g. T-Mobile, AT&T, Verizon, Mint Mobile..."
                            className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {['T-Mobile', 'AT&T', 'Verizon', 'Mint Mobile', 'Google Fi', 'Visible'].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => handleFieldChange('phoneProvider', p)}
                                className={`px-2.5 py-1 rounded-lg text-[13px] font-semibold border transition-colors cursor-pointer ${householdProfile.phoneProvider === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">
                            Plan Name (enter or pick a suggestion)
                          </span>
                          <input
                            type="text"
                            list="phone-plans-list"
                            value={householdProfile.phonePlan || ''}
                            onChange={e => handleFieldChange('phonePlan', e.target.value)}
                            placeholder="Type plan name, e.g. Go5G Plus, Experience Beyond, Magenta MAX, Simple Choice..."
                            className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                          />
                          <datalist id="phone-plans-list">
                            {suggestedPhonePlans.map(p => (
                              <option key={p.name} value={p.name}>{p.name} ({p.tag})</option>
                            ))}
                          </datalist>

                          {suggestedPhonePlans.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-2 max-h-24 overflow-y-auto pr-1">
                              {suggestedPhonePlans.map(p => {
                                const isSelected = householdProfile.phonePlan === p.name;
                                return (
                                  <button
                                    key={p.name}
                                    type="button"
                                    onClick={() => handleFieldChange('phonePlan', p.name)}
                                    className={`px-2 py-0.5 rounded text-[13px] font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                                      isSelected
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>{p.name}</span>
                                    <span className={`text-[13px] px-1 py-0.2 rounded font-medium ${
                                      isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {p.tag}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. Electric & Gas Utility */}
                      <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-3">
                        <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span>3. Electric & Gas Utility Plan</span>
                        </span>

                        <div>
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">Utility</span>
                          <input
                            type="text"
                            value={householdProfile.electricGasProvider || (UTILITY_REGIONS.find(r => r.id === householdProfile.utilityRegionId)?.name || 'Pacific Gas & Electric (PG&E)')}
                            onChange={e => handleFieldChange('electricGasProvider', e.target.value)}
                            className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {['PG&E', 'SCE', 'SDG&E', 'SoCalGas', 'SMUD'].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => handleFieldChange('electricGasProvider', p)}
                                className={`px-2.5 py-1 rounded-lg text-[13px] font-semibold border transition-colors cursor-pointer ${householdProfile.electricGasProvider === p ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">
                            Utility Rate Plan Name
                          </span>
                          <input
                            type="text"
                            list="utility-plans-list"
                            value={householdProfile.electricGasPlan || ''}
                            onChange={e => handleFieldChange('electricGasPlan', e.target.value)}
                            placeholder="Type rate plan, e.g. EV2-A, E-TOU-C, E-ELEC, Tiered E-1, CARE..."
                            className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                          />
                          <datalist id="utility-plans-list">
                            {suggestedUtilityPlans.map(p => (
                              <option key={p.name} value={p.name}>{p.name} ({p.tag})</option>
                            ))}
                          </datalist>

                          {suggestedUtilityPlans.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-2 max-h-24 overflow-y-auto pr-1">
                              {suggestedUtilityPlans.map(p => {
                                const isSelected = householdProfile.electricGasPlan === p.name;
                                return (
                                  <button
                                    key={p.name}
                                    type="button"
                                    onClick={() => handleFieldChange('electricGasPlan', p.name)}
                                    className={`px-2 py-0.5 rounded text-[13px] font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                                      isSelected
                                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>{p.name}</span>
                                    <span className={`text-[13px] px-1 py-0.2 rounded font-medium ${
                                      isSelected ? 'bg-amber-700 text-amber-100' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {p.tag}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4. Municipal Trash & Recycling */}
                      <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-3">
                        <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-blue-500" />
                          <span>4. Municipal Trash & Recycling</span>
                        </span>

                        <div>
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">Provider</span>
                          <input
                            type="text"
                            value={householdProfile.trashProvider || ''}
                            onChange={e => handleFieldChange('trashProvider', e.target.value)}
                            placeholder="e.g. City Municipal Utilities, Waste Management..."
                            className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                          />
                        </div>

                        <div>
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">
                            Cart Size / Plan Name
                          </span>
                          <input
                            type="text"
                            list="trash-plans-list"
                            value={householdProfile.trashPlan || ''}
                            onChange={e => handleFieldChange('trashPlan', e.target.value)}
                            placeholder="Type plan, e.g. 64-Gallon Standard, 96-Gallon Large, 32-Gallon Eco..."
                            className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                          />
                          <datalist id="trash-plans-list">
                            {suggestedTrashPlans.map(p => (
                              <option key={p.name} value={p.name}>{p.name} ({p.tag})</option>
                            ))}
                          </datalist>

                          {suggestedTrashPlans.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-2 max-h-24 overflow-y-auto pr-1">
                              {suggestedTrashPlans.map(p => {
                                const isSelected = householdProfile.trashPlan === p.name;
                                return (
                                  <button
                                    key={p.name}
                                    type="button"
                                    onClick={() => handleFieldChange('trashPlan', p.name)}
                                    className={`px-2 py-0.5 rounded text-[13px] font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                                      isSelected
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>{p.name}</span>
                                    <span className={`text-[13px] px-1 py-0.2 rounded font-medium ${
                                      isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {p.tag}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 5. Home Security */}
                      <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-3 md:col-span-2">
                        <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>5. Home Security & Smart Home</span>
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <span className="text-[13px] font-semibold text-slate-500 block mb-1">Brand / System</span>
                            <input
                              type="text"
                              value={householdProfile.securityProvider || ''}
                              onChange={e => handleFieldChange('securityProvider', e.target.value)}
                              placeholder="e.g. Ring, ADT, SimpliSafe, Nest, Vivint, None..."
                              className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                            />
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                              {['Ring', 'ADT', 'SimpliSafe', 'Vivint', 'Nest', 'Self-Monitored'].map(p => (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => handleFieldChange('securityProvider', p)}
                                  className={`px-2.5 py-1 rounded-lg text-[13px] font-semibold border transition-colors cursor-pointer ${householdProfile.securityProvider === p ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="text-[13px] font-semibold text-slate-500 block mb-1">
                              Security Plan Name
                            </span>
                            <input
                              type="text"
                              list="security-plans-list"
                              value={householdProfile.securityPlan || ''}
                              onChange={e => handleFieldChange('securityPlan', e.target.value)}
                              placeholder="Type plan, e.g. Ring Protect Pro, Fast Protect Monitoring, Nest Aware..."
                              className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                            />
                            <datalist id="security-plans-list">
                              {suggestedSecurityPlans.map(p => (
                                <option key={p.name} value={p.name}>{p.name} ({p.tag})</option>
                              ))}
                            </datalist>

                            {suggestedSecurityPlans.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap mt-2 max-h-24 overflow-y-auto pr-1">
                                {suggestedSecurityPlans.map(p => {
                                  const isSelected = householdProfile.securityPlan === p.name;
                                  return (
                                    <button
                                      key={p.name}
                                      type="button"
                                      onClick={() => handleFieldChange('securityPlan', p.name)}
                                      className={`px-2 py-0.5 rounded text-[13px] font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                                        isSelected
                                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      <span>{p.name}</span>
                                      <span className={`text-[13px] px-1 py-0.2 rounded font-medium ${
                                        isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-500'
                                      }`}>
                                        {p.tag}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 6. Home Warranty & Protection */}
                      <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-3">
                        <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                          <Shield className="w-4 h-4 text-rose-600" />
                          <span>6. Home Warranty & Protection</span>
                        </span>

                        <div>
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">Warranty Company</span>
                          <input
                            type="text"
                            value={householdProfile.homeWarrantyProvider || ''}
                            onChange={e => handleFieldChange('homeWarrantyProvider', e.target.value)}
                            placeholder="e.g. American Home Shield, Choice Home Warranty, First American, Cinch..."
                            className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {['American Home Shield', 'Choice Home Warranty', 'First American', 'Cinch Home Services', 'Liberty Home Guard', 'Select Home Warranty', 'None'].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => handleFieldChange('homeWarrantyProvider', p)}
                                className={`px-2.5 py-1 rounded-lg text-[13px] font-semibold border transition-colors cursor-pointer ${householdProfile.homeWarrantyProvider === p ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">
                            Warranty Plan Name
                          </span>
                          <input
                            type="text"
                            list="warranty-plans-list"
                            value={householdProfile.homeWarrantyPlan || ''}
                            onChange={e => handleFieldChange('homeWarrantyPlan', e.target.value)}
                            placeholder="Type plan, e.g. ShieldGold, ShieldPlatinum, Total Plan, Basic Plan..."
                            className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                          />
                          <datalist id="warranty-plans-list">
                            {suggestedHomeWarrantyPlans.map(p => (
                              <option key={p.name} value={p.name}>{p.name} ({p.tag})</option>
                            ))}
                          </datalist>

                          {suggestedHomeWarrantyPlans.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-2 max-h-24 overflow-y-auto pr-1">
                              {suggestedHomeWarrantyPlans.map(p => {
                                const isSelected = householdProfile.homeWarrantyPlan === p.name;
                                return (
                                  <button
                                    key={p.name}
                                    type="button"
                                    onClick={() => handleFieldChange('homeWarrantyPlan', p.name)}
                                    className={`px-2 py-0.5 rounded text-[13px] font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                                      isSelected
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>{p.name}</span>
                                    <span className={`text-[13px] px-1 py-0.2 rounded font-medium ${
                                      isSelected ? 'bg-rose-700 text-rose-100' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {p.tag}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 7. Municipal Water Service */}
                      <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-3">
                        <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-blue-600" />
                          <span>7. Municipal Water Service</span>
                        </span>

                        <div>
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">Water Utility / District</span>
                          <input
                            type="text"
                            value={householdProfile.waterProvider || ''}
                            onChange={e => handleFieldChange('waterProvider', e.target.value)}
                            placeholder="e.g. City Water Works, American Water, County Water District..."
                            className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {['City Water Works', 'County Water District', 'American Water', 'California Water Service', 'None'].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => handleFieldChange('waterProvider', p)}
                                className={`px-2.5 py-1 rounded-lg text-[13px] font-semibold border transition-colors cursor-pointer ${householdProfile.waterProvider === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[13px] font-semibold text-slate-500 block mb-1">
                            Water Rate / Meter Plan
                          </span>
                          <input
                            type="text"
                            list="water-plans-list"
                            value={householdProfile.waterPlan || ''}
                            onChange={e => handleFieldChange('waterPlan', e.target.value)}
                            placeholder="Type plan, e.g. Standard Residential Meter, Tiered Conservation..."
                            className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-[8px] px-3 py-2 focus:outline-none"
                          />
                          <datalist id="water-plans-list">
                            {suggestedWaterPlans.map(p => (
                              <option key={p.name} value={p.name}>{p.name} ({p.tag})</option>
                            ))}
                          </datalist>

                          {suggestedWaterPlans.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-2 max-h-24 overflow-y-auto pr-1">
                              {suggestedWaterPlans.map(p => {
                                const isSelected = householdProfile.waterPlan === p.name;
                                return (
                                  <button
                                    key={p.name}
                                    type="button"
                                    onClick={() => handleFieldChange('waterPlan', p.name)}
                                    className={`px-2 py-0.5 rounded text-[13px] font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                                      isSelected
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>{p.name}</span>
                                    <span className={`text-[13px] px-1 py-0.2 rounded font-medium ${
                                      isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {p.tag}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 8. Extra / Custom Household Providers */}
                      <div className="p-5 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col gap-3 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            <span>8. Extra Household Providers</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenAddExtraProvider()}
                            className="px-2.5 py-1 rounded-lg bg-[#18457c] text-white text-[13px] font-semibold hover:bg-[#123561] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Extra Provider</span>
                          </button>
                        </div>

                        <p className="text-[13px] text-slate-500">
                          Add pest control, lawn care, pool service, propane, or additional protection contracts.
                        </p>

                        {(householdProfile.extraProviders || []).length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {(householdProfile.extraProviders || []).map(p => (
                              <div
                                key={p.id}
                                onClick={() => handleOpenEditExtraProvider(p)}
                                className="p-2.5 rounded-[8px] bg-white border border-slate-200 flex items-center justify-between text-[13px] cursor-pointer hover:border-[#18457c] transition-colors"
                              >
                                <div className="truncate pr-2">
                                  <span className="font-semibold text-slate-900 block truncate">{p.name}</span>
                                  <span className="text-[13px] text-slate-500">{p.type} {p.plan ? `· ${p.plan}` : ''}</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-semibold text-slate-800 text-[13px]">{p.monthlyCost ? `$${p.monthlyCost}/mo` : 'Active'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAddExtraProvider()}
                            className="w-full py-4 border border-dashed border-slate-300 rounded-[8px] bg-white hover:bg-blue-50/50 text-[#18457c] text-[13px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Click to Add an Extra Provider</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Wizard Bottom Controls */}
              <div className="px-6 py-4.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <button
                  type="button"
                  disabled={wizardStep === 1}
                  onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
                  className="px-4 py-2 rounded-[8px] border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 text-slate-700 text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {/* Step indicator in center */}
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: totalWizardSteps }).map((_, i) => (
                    <button
                      key={i + 1}
                      type="button"
                      onClick={() => setWizardStep(i + 1)}
                      className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                        wizardStep === i + 1 ? 'bg-[#18457c] w-6' : 'bg-slate-300 hover:bg-slate-400'
                      }`}
                      aria-label={`Go to step ${i + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {wizardStep < totalWizardSteps ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep(Math.min(totalWizardSteps, wizardStep + 1))}
                      className="px-5 py-2.5 rounded-[8px] bg-[#18457c] hover:bg-[#123561] text-white text-[13px] font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-2"
                    >
                      <span>Next question</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFinishWizard}
                      className="px-6 py-2.5 rounded-[8px] bg-emerald-700 hover:bg-emerald-800 text-white text-[13px] font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-2"
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
          {/* VIEW B: MINIMIZED & EXPANDED HOUSEHOLD VIEW                   */}
          {/* ============================================================= */}
          {householdView === 'saved' && (
            <div className="flex flex-col gap-4">
              {/* Header Bar: Clean title matching Health section (no cluttered button in the header) */}
              <div className="px-1">
                <h2 className="font-semibold text-xl text-[var(--ink)] tracking-tight">Household</h2>
                <p className="text-[13px] text-[var(--muted)] mt-0.5">
                  1 active property · Click card to expand or collapse details
                </p>
              </div>

              {/* Restyled Household Card with Spacious Layout */}
              <section className="bg-[var(--surface)] border border-[var(--line)] rounded-[12px] shadow-2xs overflow-hidden transition-all">
                {/* 5. Card Header: Address, One Summary Line, Monthly Bills Total & Collapse Arrow */}
                <div
                  onClick={() => setIsHouseholdExpanded(!isHouseholdExpanded)}
                  className="w-full px-6 sm:px-[36px] py-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors select-none"
                >
                  {/* Left: Address + One Summary Line */}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[var(--ink)] text-base sm:text-lg tracking-tight truncate">
                      {householdProfile.address || 'Household Property'}
                    </h3>
                    <p className="text-[13px] text-[var(--muted)] mt-0.5 truncate">
                      {DWELLING_TYPES.find(d => d.id === householdProfile.dwellingType)?.label || 'Single-Family House'} · {householdProfile.bedrooms || 3} bd, {householdProfile.bathrooms || 2} ba · {Number(householdProfile.sqFt || 2100).toLocaleString()} sq ft
                    </p>
                  </div>

                  {/* Right: Monthly Bills Total on the Right + Collapse Arrow */}
                  <div className="flex items-center gap-4 shrink-0">
                    {actualHouseholdBills.length > 0 ? (
                      <div className="text-right">
                        <div className="text-base sm:text-lg font-semibold text-[var(--ink)]">
                          ${totalActualBills.toLocaleString()}<span className="text-[13px] font-normal text-[var(--muted)]">/mo</span>
                        </div>
                        <div className="text-[13px] text-[var(--muted)]">Monthly bills</div>
                      </div>
                    ) : (
                      <div className="text-right text-[13px] text-[var(--muted)]">
                        No bills synced
                      </div>
                    )}

                    <div className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                      {isHouseholdExpanded ? (
                        <ChevronUp className="w-5 h-5 text-[var(--muted)]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--muted)]" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Sections Container with 36px horizontal padding */}
                {isHouseholdExpanded && (
                  <div className="border-t border-[var(--line)] bg-[var(--surface)] px-6 sm:px-[36px] pb-8 flex flex-col gap-6">
                    {/* Household Section Sub-Tabs: Property | Home systems | Providers | Bills */}
                    <div className="sticky top-0 z-10 -mx-6 sm:-mx-[36px] px-6 sm:px-[36px] py-3.5 bg-[var(--surface)]/95 border-b border-[var(--line)] flex items-center justify-between flex-wrap gap-3 backdrop-blur-xs">
                      <div className="flex items-center gap-1.5 bg-[var(--surface-subtle)] border border-[var(--line)] p-1 rounded-xl text-[13px]">
                        <button
                          type="button"
                          onClick={() => setHouseholdSubTab('property')}
                          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                            householdSubTab === 'property'
                              ? 'bg-[var(--brand)] text-white shadow-2xs'
                              : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          <Building className="w-3.5 h-3.5" />
                          <span>Property</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHouseholdSubTab('systems')}
                          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                            householdSubTab === 'systems'
                              ? 'bg-[var(--brand)] text-white shadow-2xs'
                              : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Home systems</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHouseholdSubTab('providers')}
                          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                            householdSubTab === 'providers'
                              ? 'bg-[var(--brand)] text-white shadow-2xs'
                              : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Providers</span>
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                              householdSubTab === 'providers'
                                ? 'bg-white/20 text-white'
                                : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]'
                            }`}
                          >
                            {7 + (householdProfile.extraProviders || []).length}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHouseholdSubTab('bills')}
                          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                            householdSubTab === 'bills'
                              ? 'bg-[var(--brand)] text-white shadow-2xs'
                              : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Bills</span>
                          {actualHouseholdBills.length > 0 && (
                            <span
                              className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                                householdSubTab === 'bills'
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]'
                              }`}
                            >
                              ${totalActualBills.toLocaleString()}
                            </span>
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (isOverview && onNavigateToLifestyle) {
                            onNavigateToLifestyle();
                          } else {
                            setWizardStep(householdSubTab === 'systems' ? 4 : householdSubTab === 'providers' ? 7 : 1);
                            setHouseholdView('wizard');
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)] text-[13px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-[var(--line)] shadow-2xs"
                      >
                        <Sliders className="w-3.5 h-3.5 text-[var(--muted)]" />
                        <span>{isOverview ? 'Manage in Lifestyle' : 'Update my answers'}</span>
                        {isOverview && <ArrowRight className="w-3.5 h-3.5 text-[var(--muted)]" />}
                      </button>
                    </div>

                    {/* 1. SECTION 1: PROPERTY SPECS (Plain 4-column label/value grid, 19px value, no boxes) */}
                    {householdSubTab === 'property' && (
                      <div id="section-property" className="scroll-mt-16 pt-2">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-6">
                        <div>
                          <h4 className="text-[13px] font-semibold  text-slate-400 dark:text-slate-500">
                            Property
                          </h4>
                          <span className="text-[13px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                            {householdProfile.zillowImportedAt
                              ? `Zillow verified on ${new Date(householdProfile.zillowImportedAt).toLocaleDateString()}`
                              : 'Property specifications'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (isOverview && onNavigateToLifestyle) {
                              onNavigateToLifestyle();
                            } else {
                              setWizardStep(1);
                              setHouseholdView('wizard');
                            }
                          }}
                          className="text-[13px] font-semibold text-[#18457c] dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {isOverview ? 'Manage in Lifestyle' : 'Edit'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-7">
                        <div>
                          <span className="text-[13px] text-slate-400 dark:text-slate-500 block font-medium">Bedrooms</span>
                          <span className="text-[19px] leading-snug font-semibold text-slate-900 dark:text-slate-100 block mt-1">
                            {householdProfile.bedrooms || 3} Beds
                          </span>
                        </div>
                        <div>
                          <span className="text-[13px] text-slate-400 dark:text-slate-500 block font-medium">Bathrooms</span>
                          <span className="text-[19px] leading-snug font-semibold text-slate-900 dark:text-slate-100 block mt-1">
                            {householdProfile.bathrooms || 2} Baths
                          </span>
                        </div>
                        <div>
                          <span className="text-[13px] text-slate-400 dark:text-slate-500 block font-medium">Living Area</span>
                          <span className="text-[19px] leading-snug font-semibold text-slate-900 dark:text-slate-100 block mt-1">
                            {Number(householdProfile.sqFt || 2100).toLocaleString()} sq ft
                          </span>
                        </div>
                        <div>
                          <span className="text-[13px] text-slate-400 dark:text-slate-500 block font-medium">Year Built</span>
                          <span className="text-[19px] leading-snug font-semibold text-slate-900 dark:text-slate-100 block mt-1">
                            {householdProfile.yearBuilt || 2004}
                          </span>
                        </div>
                        <div>
                          <span className="text-[13px] text-slate-400 dark:text-slate-500 block font-medium">Lot Size</span>
                          <span className="text-[19px] leading-snug font-semibold text-slate-900 dark:text-slate-100 block mt-1">
                            {householdProfile.lotSize || '6,500 sq ft'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[13px] text-slate-400 dark:text-slate-500 block font-medium">Estimated Value</span>
                          <span className="text-[19px] leading-snug font-semibold text-slate-900 dark:text-slate-100 block mt-1">
                            {householdProfile.estimatedValue || '$425,000'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[13px] text-slate-400 dark:text-slate-500 block font-medium">County</span>
                          <span className="text-[19px] leading-snug font-semibold text-slate-900 dark:text-slate-100 block mt-1">
                            {householdProfile.county || 'Fresno County'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[13px] text-slate-400 dark:text-slate-500 block font-medium">Garage</span>
                          <span className="text-[19px] leading-snug font-semibold text-slate-900 dark:text-slate-100 block mt-1">
                            {householdProfile.garage || 'Attached 2-Car'}
                          </span>
                        </div>
                      </div>
                    </div>
                    )}

                    {/* 2. SECTION 2: HOME SYSTEMS (Simple rows, 1px lines, 20px padding, no pills, 'Add solar' link) */}
                    {householdSubTab === 'systems' && (
                    <div id="section-systems" className="scroll-mt-16 pt-2">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h4 className="text-[13px] font-semibold  text-slate-400 dark:text-slate-500">
                          Home systems
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            if (isOverview && onNavigateToLifestyle) {
                              onNavigateToLifestyle();
                            } else {
                              setWizardStep(4);
                              setHouseholdView('wizard');
                            }
                          }}
                          className="text-[13px] font-semibold text-[#18457c] dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {isOverview ? 'Manage in Lifestyle' : 'Edit'}
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {/* Heating & Cooling */}
                        <div className="py-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Heating & cooling</span>
                          <div className="sm:text-right">
                            <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 capitalize block">
                              {(householdProfile.heatingType || 'natural_gas_furnace').replace(/_/g, ' ')} · {(householdProfile.coolingType || 'central_ac').replace(/_/g, ' ')}
                            </span>
                            <span className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 block capitalize">
                              Water heater: {(householdProfile.waterHeaterType || 'natural_gas_tank').replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>

                        {/* EV Home Charging */}
                        <div className="py-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">EV home charging</span>
                          <div className="sm:text-right">
                            <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 block">
                              {householdProfile.hasEvAtHome !== false
                                ? (householdProfile.evChargerType === 'level2_240v' ? 'Level 2 (240V Dedicated)' : householdProfile.evChargerType === 'level1_120v' ? 'Level 1 (120V Outlet)' : 'No Home Charger')
                                : 'No EV at Home'}
                            </span>
                            {householdProfile.hasEvAtHome !== false && householdProfile.evHomeChargingFrequency !== 'never' && (
                              <span className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                                {householdProfile.evDailyHomeMiles || 35} mi/day · {(householdProfile.evChargingSchedule || 'overnight').replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Rooftop Solar (with 7. Add solar link when none is installed) */}
                        <div className="py-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Rooftop solar</span>
                          <div className="sm:text-right">
                            {Boolean(householdProfile.hasSolar) ? (
                              <>
                                <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 block">
                                  {(((Number(householdProfile.solarPanelCount) || 20) * (Number(householdProfile.solarWattsPerPanel) || 400)) / 1000).toFixed(2)} kW System
                                </span>
                                <span className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                                  {householdProfile.solarPanelCount || 20} Panels · {(householdProfile.solarOwnership || 'owned').toUpperCase()}
                                </span>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 sm:justify-end">
                                <span className="text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400">
                                  None installed
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isOverview && onNavigateToLifestyle) {
                                      onNavigateToLifestyle();
                                    } else {
                                      setWizardStep(6);
                                      setHouseholdView('wizard');
                                    }
                                  }}
                                  className="text-[13px] font-semibold text-[#18457c] dark:text-blue-400 hover:underline cursor-pointer"
                                >
                                  {isOverview ? 'Manage in Lifestyle' : 'Add solar'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Battery Storage */}
                        <div className="py-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Battery storage</span>
                          <div className="sm:text-right">
                            <span className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 block">
                              {householdProfile.solarHasBattery
                                ? `${householdProfile.solarBatteryCapacityKwh || 13.5} kWh Battery`
                                : 'No Battery Backup'}
                            </span>
                            <span className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                              Billing plan: {(householdProfile.solarBillingPlan || 'nem_2').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    )}

                    {/* 3. SECTION 3: SERVICE PROVIDERS (Simple rows, 1px lines, 20px padding, no pills, never truncate plan names) */}
                    {householdSubTab === 'providers' && (
                    <div id="section-providers" className="scroll-mt-16 pt-2">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-[13px] font-semibold  text-slate-400 dark:text-slate-500">
                            Providers
                          </h4>
                          <span className="text-[13px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {7 + (householdProfile.extraProviders || []).length}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isOverview && (
                            <button
                              type="button"
                              onClick={() => handleOpenAddExtraProvider()}
                              className="px-3 py-1.5 rounded-[8px] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-[#18457c] dark:text-blue-400 text-[13px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Provider</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (isOverview && onNavigateToLifestyle) {
                                onNavigateToLifestyle();
                              } else {
                                setWizardStep(7);
                                setHouseholdView('wizard');
                              }
                            }}
                            className="text-[13px] font-semibold text-[#18457c] dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            {isOverview ? 'Manage in Lifestyle' : 'Edit'}
                          </button>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {/* 1. Internet */}
                        <div
                          onClick={() => handleOpenProvider('internet')}
                          className="py-4 px-3 rounded-[12px] flex items-center justify-between gap-4 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 cursor-pointer transition-all group select-none"
                          title="Click to view details and upload statements"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-[12px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 shadow-2xs group-hover:scale-105 transition-transform">
                              <Wifi className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block group-hover:text-[#18457c] dark:group-hover:text-blue-400 transition-colors">
                                Internet & WiFi
                              </span>
                              <span className="text-[13px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                                {householdProfile.internetProvider || 'Xfinity'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                                  {householdProfile.internetPlan || 'Gigabit Extra'}
                                </span>
                                {householdProfile.internetMonthlyCost && (
                                  <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                    ${householdProfile.internetMonthlyCost}/mo
                                  </span>
                                )}
                              </div>
                              <span className={`text-[13px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                                householdProfile.providerDocuments?.internet?.length
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'text-slate-400'
                              }`}>
                                {householdProfile.providerDocuments?.internet?.length ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Statement on file</span>
                                  </>
                                ) : (
                                  <span>Upload statement</span>
                                )}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 2. Mobile Wireless */}
                        <div
                          onClick={() => handleOpenProvider('phone')}
                          className="py-4 px-3 rounded-[12px] flex items-center justify-between gap-4 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 cursor-pointer transition-all group select-none"
                          title="Click to view details and upload statements"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-[12px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 shadow-2xs group-hover:scale-105 transition-transform">
                              <Smartphone className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block group-hover:text-[#18457c] dark:group-hover:text-blue-400 transition-colors">
                                Mobile Wireless
                              </span>
                              <span className="text-[13px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                                {householdProfile.phoneProvider || 'T-Mobile'} ({householdProfile.phoneLines || 3} lines)
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                                  {householdProfile.phonePlan || 'Go5G Plus'}
                                </span>
                                {householdProfile.phoneMonthlyCost && (
                                  <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                    ${householdProfile.phoneMonthlyCost}/mo
                                  </span>
                                )}
                              </div>
                              <span className={`text-[13px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                                householdProfile.providerDocuments?.phone?.length
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'text-slate-400'
                              }`}>
                                {householdProfile.providerDocuments?.phone?.length ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Statement on file</span>
                                  </>
                                ) : (
                                  <span>Upload statement</span>
                                )}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 3. Electric & Gas Utility */}
                        <div
                          onClick={() => handleOpenProvider('electric')}
                          className="py-4 px-3 rounded-[12px] flex items-center justify-between gap-4 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 cursor-pointer transition-all group select-none"
                          title="Click to view details and upload statements"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-[12px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/40 shadow-2xs group-hover:scale-105 transition-transform">
                              <Zap className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block group-hover:text-[#18457c] dark:group-hover:text-blue-400 transition-colors">
                                Electric & Gas Utility
                              </span>
                              <span className="text-[13px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                                {householdProfile.electricGasProvider || 'PG&E'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                                  {householdProfile.electricGasPlan || 'EV2-A Home TOU'}
                                </span>
                                {householdProfile.electricGasMonthlyCost && (
                                  <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                    ${householdProfile.electricGasMonthlyCost}/mo
                                  </span>
                                )}
                              </div>
                              <span className={`text-[13px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                                householdProfile.providerDocuments?.electric?.length
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'text-slate-400'
                              }`}>
                                {householdProfile.providerDocuments?.electric?.length ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Statement on file</span>
                                  </>
                                ) : (
                                  <span>Upload statement</span>
                                )}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 4. Trash & Recycling */}
                        <div
                          onClick={() => handleOpenProvider('trash')}
                          className="py-4 px-3 rounded-[12px] flex items-center justify-between gap-4 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 cursor-pointer transition-all group select-none"
                          title="Click to view details and upload statements"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-[12px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 shadow-2xs group-hover:scale-105 transition-transform">
                              <Droplets className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block group-hover:text-[#18457c] dark:group-hover:text-blue-400 transition-colors">
                                Trash & Recycling
                              </span>
                              <span className="text-[13px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                                {householdProfile.trashProvider || 'City Utilities'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                                  {householdProfile.trashPlan || '64-Gal Cart'}
                                </span>
                                {householdProfile.trashMonthlyCost && (
                                  <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                    ${householdProfile.trashMonthlyCost}/mo
                                  </span>
                                )}
                              </div>
                              <span className={`text-[13px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                                householdProfile.providerDocuments?.trash?.length
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'text-slate-400'
                              }`}>
                                {householdProfile.providerDocuments?.trash?.length ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Statement on file</span>
                                  </>
                                ) : (
                                  <span>Upload statement</span>
                                )}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 5. Home Security */}
                        <div
                          onClick={() => handleOpenProvider('security')}
                          className="py-4 px-3 rounded-[12px] flex items-center justify-between gap-4 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 cursor-pointer transition-all group select-none"
                          title="Click to view details and upload statements"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-[12px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40 shadow-2xs group-hover:scale-105 transition-transform">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block group-hover:text-[#18457c] dark:group-hover:text-blue-400 transition-colors">
                                Home Security
                              </span>
                              <span className="text-[13px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                                {householdProfile.securityProvider || 'Ring'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                                  {householdProfile.securityPlan || 'Ring Protect Pro'}
                                </span>
                                {householdProfile.securityMonthlyCost && (
                                  <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                    ${householdProfile.securityMonthlyCost}/mo
                                  </span>
                                )}
                              </div>
                              <span className={`text-[13px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                                householdProfile.providerDocuments?.security?.length
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'text-slate-400'
                              }`}>
                                {householdProfile.providerDocuments?.security?.length ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Statement on file</span>
                                  </>
                                ) : (
                                  <span>Upload statement</span>
                                )}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 6. Water Service */}
                        <div
                          onClick={() => handleOpenProvider('water')}
                          className="py-4 px-3 rounded-[12px] flex items-center justify-between gap-4 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 cursor-pointer transition-all group select-none"
                          title="Click to view details and upload statements"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-[12px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 shadow-2xs group-hover:scale-105 transition-transform">
                              <Droplets className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block group-hover:text-[#18457c] dark:group-hover:text-blue-400 transition-colors">
                                Water Service
                              </span>
                              <span className="text-[13px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                                {householdProfile.waterProvider || 'City Water Works'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                                  {householdProfile.waterPlan || 'Standard Residential Meter'}
                                </span>
                                {householdProfile.waterMonthlyCost && (
                                  <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                    ${householdProfile.waterMonthlyCost}/mo
                                  </span>
                                )}
                              </div>
                              <span className={`text-[13px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                                householdProfile.providerDocuments?.water?.length
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'text-slate-400'
                              }`}>
                                {householdProfile.providerDocuments?.water?.length ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Statement on file</span>
                                  </>
                                ) : (
                                  <span>Upload statement</span>
                                )}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* 7. Home Warranty */}
                        <div
                          onClick={() => handleOpenProvider('homeWarranty')}
                          className="py-4 px-3 rounded-[12px] flex items-center justify-between gap-4 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 cursor-pointer transition-all group select-none"
                          title="Click to view details and upload statements"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-[12px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/40 shadow-2xs group-hover:scale-105 transition-transform">
                              <Shield className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block group-hover:text-[#18457c] dark:group-hover:text-blue-400 transition-colors">
                                Home Warranty & Protection
                              </span>
                              <span className="text-[13px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                                {householdProfile.homeWarrantyProvider || 'American Home Shield'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                                  {householdProfile.homeWarrantyPlan || 'ShieldGold'}
                                </span>
                                {householdProfile.homeWarrantyMonthlyCost && (
                                  <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                    ${householdProfile.homeWarrantyMonthlyCost}/mo
                                  </span>
                                )}
                              </div>
                              <span className={`text-[13px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                                householdProfile.providerDocuments?.homeWarranty?.length
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'text-slate-400'
                              }`}>
                                {householdProfile.providerDocuments?.homeWarranty?.length ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Statement on file</span>
                                  </>
                                ) : (
                                  <span>Upload statement</span>
                                )}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        {/* Extra Providers Added by User */}
                        {(householdProfile.extraProviders || []).map((prov) => (
                          <div
                            key={prov.id}
                            onClick={() => handleOpenProvider(prov.id)}
                            className="py-4 px-3 rounded-[12px] flex items-center justify-between gap-4 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 cursor-pointer transition-all group select-none"
                            title="Click to view details and upload statements"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-[12px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40 shadow-2xs group-hover:scale-105 transition-transform">
                                <Sparkles className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 block group-hover:text-[#18457c] dark:group-hover:text-blue-400 transition-colors">
                                    {prov.type || 'Custom Provider'}
                                  </span>
                                  <span className="text-[13px] px-1.5 py-0.2 rounded font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    Extra
                                  </span>
                                </div>
                                <span className="text-[13px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                                  {prov.name || 'Provider Name'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                                    {prov.plan || 'Active Service'}
                                  </span>
                                  {prov.monthlyCost && (
                                    <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                      ${prov.monthlyCost}/mo
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[13px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                                  householdProfile.providerDocuments?.[prov.id]?.length
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'text-slate-400'
                                }`}>
                                  {householdProfile.providerDocuments?.[prov.id]?.length ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Statement on file</span>
                                    </>
                                  ) : (
                                    <span>Upload statement</span>
                                  )}
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* + Add Extra Provider Button at bottom of section */}
                      {!isOverview && (
                        <div className="pt-3">
                          <button
                            type="button"
                            onClick={() => handleOpenAddExtraProvider()}
                            className="w-full py-3.5 px-4 rounded-[12px] border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#18457c] dark:hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/50 text-[#18457c] dark:text-blue-400 text-[13px] font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Extra Provider (Home Warranty, Pest, Pool, Lawn, Gas...)</span>
                          </button>
                        </div>
                      )}
                    </div>
                    )}

                    {/* 4. SECTION 4: BILLS TABLE (Provider Filter Buttons & Table) */}
                    {householdSubTab === 'bills' && (
                    <div id="section-bills" className="scroll-mt-16 pt-2 flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                        <div>
                          <h4 className="text-[13px] font-semibold text-slate-400 dark:text-slate-500">
                            Household Provider Bills
                          </h4>
                          <span className="text-[13px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                            Verified bills for household utilities, protection, connectivity, and housing
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                            ${displayedBillsTotal.toLocaleString()}
                            <span className="text-[13px] font-normal text-slate-400"> /mo</span>
                          </span>
                          {selectedBillProvider !== 'all' && (
                            <span className="text-[11px] text-slate-400 block">
                              Filtered by {providerFilterOptions.find(p => p.id === selectedBillProvider)?.shortLabel || 'provider'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Provider Switcher Button Bar */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar flex-wrap">
                        {providerFilterOptions.map((btn) => {
                          const IconComponent = btn.icon || Receipt;
                          const isSelected = selectedBillProvider === btn.id;
                          return (
                            <button
                              key={btn.id}
                              type="button"
                              onClick={() => setSelectedBillProvider(btn.id)}
                              className={`px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                                isSelected
                                  ? 'bg-[var(--brand)] text-white shadow-2xs'
                                  : 'bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] border border-[var(--line)]'
                              }`}
                            >
                              <IconComponent className="w-3.5 h-3.5" />
                              <span>{btn.shortLabel || btn.label}</span>
                              {btn.count > 0 && (
                                <span
                                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : 'bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)]'
                                  }`}
                                >
                                  ${Number(btn.total || 0).toLocaleString()}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Bills Table */}
                      {displayedHouseholdBills.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[13px] min-w-[550px]">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-slate-800 text-[13px] font-semibold text-slate-400 dark:text-slate-500">
                                <th className="py-4 pr-4 font-medium">Bill / Provider</th>
                                <th className="py-4 px-4 font-medium">Category</th>
                                <th className="py-4 px-4 font-medium">Due date</th>
                                <th className="py-4 px-4 font-medium">Source</th>
                                <th className="py-4 pl-4 text-right font-medium">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {displayedHouseholdBills.map((b) => (
                                <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                  <td className="py-4 pr-4 font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                    {b.name}
                                  </td>
                                  <td className="py-4 px-4 text-slate-500 dark:text-slate-400 capitalize">
                                    {b.category || 'Utilities'}
                                  </td>
                                  <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                                    {b.nextDueDate || `Monthly on Day ${b.dueDay || 15}`}
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                                      <span>From payments</span>
                                    </span>
                                  </td>
                                  <td className="py-4 pl-4 text-right font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                    ${Number(b.expectedAmount || b.amount || 0).toLocaleString()}
                                    <span className="text-slate-400 text-[13px] font-normal"> /mo</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                                <td colSpan="4" className="py-5 pr-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {selectedBillProvider === 'all'
                                    ? 'Total monthly household bills'
                                    : `Total ${providerFilterOptions.find(p => p.id === selectedBillProvider)?.shortLabel || 'provider'} bill`}
                                </td>
                                <td className="py-5 pl-4 text-right text-base font-semibold text-slate-900 dark:text-slate-100">
                                  ${displayedBillsTotal.toLocaleString()}
                                  <span className="text-[13px] font-normal text-slate-400"> /mo</span>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                          <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <b className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                            {selectedBillProvider === 'all'
                              ? 'No household provider bills synced yet'
                              : `No synced bills for ${providerFilterOptions.find(p => p.id === selectedBillProvider)?.shortLabel || 'this provider'} yet`}
                          </b>
                          <p className="text-[13px] text-slate-400 dark:text-slate-500 max-w-sm">
                            {selectedBillProvider === 'all'
                              ? 'Once your payments or utility accounts sync in Klarity, verified household bills will appear here.'
                              : 'When payments for this provider are detected in your connected accounts, they will be tracked here automatically.'}
                          </p>
                          {selectedBillProvider !== 'all' && (
                            <button
                              type="button"
                              onClick={() => setSelectedBillProvider('all')}
                              className="mt-2 text-[13px] font-semibold text-[var(--brand)] hover:underline cursor-pointer"
                            >
                              View all household provider bills &rarr;
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
          {/* ============================================================= */}
          {/* VIEW C: PROVIDER DETAIL & STATEMENT UPLOADER PAGE             */}
          {/* ============================================================= */}
          {householdView === 'providerDetail' && selectedProviderKey && (() => {
            const cfg = HOUSEHOLD_PROVIDER_CONFIGS[selectedProviderKey] || (() => {
              const extraProv = (householdProfile.extraProviders || []).find(p => p.id === selectedProviderKey);
              if (!extraProv) return null;
              return {
                key: extraProv.id,
                label: extraProv.type || 'Custom Provider',
                title: extraProv.name || extraProv.type || 'Custom Provider',
                category: extraProv.type || 'Custom Service',
                icon: 'Sparkles',
                colorClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
                isExtra: true,
                defaultProvider: extraProv.name || '',
                defaultPlan: extraProv.plan || '',
                placeholderProvider: 'Provider Company Name',
                placeholderPlan: 'Plan / Coverage Name',
                quickProviders: [],
                quickPlans: []
              };
            })();
            if (!cfg) return null;

            const extraProv = cfg.isExtra ? (householdProfile.extraProviders || []).find(p => p.id === selectedProviderKey) : null;
            const currentProvider = cfg.isExtra ? (extraProv?.name || '') : (householdProfile[cfg.providerField] || cfg.defaultProvider);
            const currentPlan = cfg.isExtra ? (extraProv?.plan || '') : (householdProfile[cfg.planField] || cfg.defaultPlan);
            const currentAccount = cfg.isExtra ? (extraProv?.accountNumber || '') : (householdProfile[cfg.accountField] || '');
            const currentCost = cfg.isExtra ? (extraProv?.monthlyCost || '') : (householdProfile[cfg.costField] || '');
            const currentNotes = cfg.isExtra ? (extraProv?.notes || '') : (householdProfile[cfg.notesField] || '');
            const docs = householdProfile.providerDocuments?.[selectedProviderKey] || [];

            // Match actual bills from payments for this provider
            const matchingBills = actualHouseholdBills.filter(b =>
              (b.name && currentProvider && b.name.toLowerCase().includes(currentProvider.toLowerCase())) ||
              (currentProvider && b.name && currentProvider.toLowerCase().includes(b.name.toLowerCase()))
            );

            return (
              <div className="flex flex-col gap-6 animate-in fade-in duration-200 max-w-5xl mx-auto w-full">
                {/* 1. Header & Navigation Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setHouseholdView('saved');
                        setSelectedProviderKey(null);
                        setIsEditingProviderDetail(false);
                      }}
                      className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#18457c] dark:text-blue-400 hover:bg-slate-200/70 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-[8px] transition-all cursor-pointer shadow-2xs"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Household Providers</span>
                    </button>
                    <span className="hidden sm:inline text-[13px] text-slate-400">/</span>
                    <span className="hidden sm:inline text-[13px] font-medium text-slate-500 truncate max-w-[200px]">
                      {currentProvider || cfg.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditingProviderDetail ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditingProviderDetail(false)}
                          className="px-3.5 py-2 rounded-[8px] border border-slate-200 text-slate-600 hover:bg-slate-50 text-[13px] font-semibold cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveProviderDetails}
                          className="px-4 py-2 rounded-[8px] bg-[#18457c] hover:bg-[#123561] text-white text-[13px] font-semibold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditingProviderDetail(true)}
                          className="px-3.5 py-2 rounded-[8px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-semibold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5 text-[#18457c]" />
                          <span>Edit Details</span>
                        </button>
                        {cfg.isExtra && (
                          <button
                            type="button"
                            onClick={handleDeleteProviderFromDetail}
                            className="px-3 py-2 rounded-[8px] border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 text-[13px] font-semibold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                            title="Remove Provider"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Hero Header Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[12px] p-6 sm:p-7 shadow-xs flex flex-col gap-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-[12px] flex items-center justify-center shrink-0 shadow-2xs border ${cfg.colorClass}`}>
                        {cfg.icon === 'Wifi' && <Wifi className="w-7 h-7" />}
                        {cfg.icon === 'Smartphone' && <Smartphone className="w-7 h-7" />}
                        {cfg.icon === 'Zap' && <Zap className="w-7 h-7" />}
                        {cfg.icon === 'Droplets' && <Droplets className="w-7 h-7" />}
                        {cfg.icon === 'ShieldCheck' && <ShieldCheck className="w-7 h-7" />}
                        {cfg.icon === 'Shield' && <Shield className="w-7 h-7" />}
                        {cfg.icon === 'Sparkles' && <Sparkles className="w-7 h-7" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                            {currentProvider || 'Provider Name'}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#18457c] font-semibold text-[13px] border border-blue-200">
                            {cfg.category || cfg.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[13px] border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Active Provider
                          </span>
                        </div>
                        <p className="text-[13px] sm:text-sm text-slate-500 mt-1">
                          {currentPlan || 'Standard Plan'} {currentAccount ? `· Account #${currentAccount}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Quick Stats Pill */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="px-3.5 py-2 rounded-[12px] bg-slate-50 border border-slate-200 text-right">
                        <span className="text-[13px] font-semibold text-slate-400 block ">Monthly Rate</span>
                        <span className="text-lg font-semibold text-slate-900 block leading-tight">
                          {matchingBills[0]?.amount ? `$${matchingBills[0].amount}/mo` : (currentCost ? `$${currentCost}/mo` : '—')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Stat Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3.5 rounded-[12px] bg-slate-50/70 border border-slate-200/70 flex flex-col justify-between">
                      <span className="text-[13px] font-semibold text-slate-400 ">Service Tier</span>
                      <span className="text-sm font-semibold text-slate-800 truncate mt-1">{currentPlan || 'Standard'}</span>
                    </div>

                    <div className="p-3.5 rounded-[12px] bg-slate-50/70 border border-slate-200/70 flex flex-col justify-between">
                      <span className="text-[13px] font-semibold text-slate-400 ">Account / ID #</span>
                      <div className="flex items-center justify-between gap-1 mt-1">
                        <span className="text-[13px]  font-semibold text-slate-800 truncate">{currentAccount || 'Not set'}</span>
                        {currentAccount && (
                          <button
                            type="button"
                            onClick={() => handleCopyAccount(currentAccount)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
                            title="Copy Account Number"
                          >
                            {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-[12px] bg-slate-50/70 border border-slate-200/70 flex flex-col justify-between">
                      <span className="text-[13px] font-semibold text-slate-400 ">Documents</span>
                      <span className="text-sm font-semibold text-slate-800 mt-1">{docs.length} on file</span>
                    </div>

                    <div className="p-3.5 rounded-[12px] bg-slate-50/70 border border-slate-200/70 flex flex-col justify-between">
                      <span className="text-[13px] font-semibold text-slate-400 ">Billing Status</span>
                      <span className="text-[13px] font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Connected</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Main Content: When Editing Form vs When Viewing */}
                {isEditingProviderDetail ? (
                  /* Clean Editing Card */
                  <div className="bg-white border border-slate-200/90 rounded-[12px] p-6 sm:p-7 shadow-xs flex flex-col gap-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">Edit Provider & Plan Details</h3>
                        <p className="text-[13px] text-slate-500 mt-0.5">Update company name, plan tier, monthly cost, and account notes.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
                      {/* Provider Name */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-700">Company / Provider Name</label>
                        <input
                          type="text"
                          value={providerEditForm?.provider || ''}
                          onChange={e => setProviderEditForm({ ...providerEditForm, provider: e.target.value })}
                          placeholder={cfg.placeholderProvider}
                          className="w-full bg-white border border-slate-200 rounded-[8px] px-3.5 py-2.5 font-semibold text-slate-900 focus:outline-none focus:border-[#18457c]"
                        />
                        {cfg.quickProviders?.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {cfg.quickProviders.map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setProviderEditForm({ ...providerEditForm, provider: p })}
                                className={`px-2 py-0.5 rounded-lg text-[13px] font-semibold border transition-colors cursor-pointer ${
                                  providerEditForm?.provider === p
                                    ? 'bg-[#18457c] text-white border-[#18457c]'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Plan / Tier Name */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-700">Plan / Coverage Tier</label>
                        <input
                          type="text"
                          value={providerEditForm?.plan || ''}
                          onChange={e => setProviderEditForm({ ...providerEditForm, plan: e.target.value })}
                          placeholder={cfg.placeholderPlan}
                          className="w-full bg-white border border-slate-200 rounded-[8px] px-3.5 py-2.5 font-semibold text-slate-900 focus:outline-none focus:border-[#18457c]"
                        />
                        {cfg.quickPlans?.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {cfg.quickPlans.map(pl => (
                              <button
                                key={pl}
                                type="button"
                                onClick={() => setProviderEditForm({ ...providerEditForm, plan: pl })}
                                className={`px-2 py-0.5 rounded-lg text-[13px] font-semibold border transition-colors cursor-pointer ${
                                  providerEditForm?.plan === pl
                                    ? 'bg-[#18457c] text-white border-[#18457c]'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {pl}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Account Number */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-700">Account / Customer ID Number</label>
                        <input
                          type="text"
                          value={providerEditForm?.accountNumber || ''}
                          onChange={e => setProviderEditForm({ ...providerEditForm, accountNumber: e.target.value })}
                          placeholder="e.g. 8495-201-9481"
                          className="w-full bg-white border border-slate-200 rounded-[8px] px-3.5 py-2.5  text-slate-900 focus:outline-none focus:border-[#18457c]"
                        />
                      </div>

                      {/* Monthly Cost */}
                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-slate-700">Monthly Bill Amount ($)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={providerEditForm?.monthlyCost || ''}
                            onChange={e => setProviderEditForm({ ...providerEditForm, monthlyCost: e.target.value })}
                            placeholder="0.00"
                            className="w-full bg-white border border-slate-200 rounded-[8px] pl-7 pr-3.5 py-2.5  text-slate-900 focus:outline-none focus:border-[#18457c]"
                          />
                        </div>
                      </div>

                      {/* Notes / Contract Details */}
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="font-semibold text-slate-700">Contract & Service Notes</label>
                        <textarea
                          rows={2}
                          value={providerEditForm?.notes || ''}
                          onChange={e => setProviderEditForm({ ...providerEditForm, notes: e.target.value })}
                          placeholder="Renewal dates, equipment rentals, warranty coverage items, emergency numbers..."
                          className="w-full bg-white border border-slate-200 rounded-[8px] p-3 text-slate-800 focus:outline-none focus:border-[#18457c]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsEditingProviderDetail(false)}
                        className="px-4 py-2 rounded-[8px] border border-slate-200 text-slate-600 hover:bg-slate-50 text-[13px] font-semibold cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveProviderDetails}
                        className="px-5 py-2 rounded-[8px] bg-[#18457c] hover:bg-[#123561] text-white font-semibold text-[13px] cursor-pointer shadow-2xs transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Save Provider Details</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Viewing Mode Cards */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Account & Contract Specifications Card */}
                    <div className="lg:col-span-1 bg-white border border-slate-200/90 rounded-[12px] p-6 shadow-xs flex flex-col justify-between gap-5">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <h3 className="font-semibold text-slate-900 text-sm">Account Overview</h3>
                          <button
                            type="button"
                            onClick={() => setIsEditingProviderDetail(true)}
                            className="text-[13px] text-[#18457c] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </div>

                        <div className="space-y-4 pt-3 text-[13px]">
                          <div>
                            <span className="text-[13px] font-semibold text-slate-400 block ">Service Category</span>
                            <span className="font-semibold text-slate-900 mt-0.5 block">{cfg.category || cfg.title}</span>
                          </div>

                          <div>
                            <span className="text-[13px] font-semibold text-slate-400 block ">Company</span>
                            <span className="font-semibold text-slate-900 mt-0.5 block">{currentProvider || 'Not specified'}</span>
                          </div>

                          <div>
                            <span className="text-[13px] font-semibold text-slate-400 block ">Active Plan</span>
                            <span className="font-semibold text-slate-900 mt-0.5 block">{currentPlan || 'Not specified'}</span>
                          </div>

                          <div>
                            <span className="text-[13px] font-semibold text-slate-400 block ">Account / Customer ID</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className=" font-semibold text-slate-900">{currentAccount || 'None'}</span>
                              {currentAccount && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyAccount(currentAccount)}
                                  className="text-[13px] font-semibold text-[#18457c] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedAccount ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedAccount ? 'Copied' : 'Copy'}</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[13px] font-semibold text-slate-400 block ">Monthly Rate</span>
                            <span className="font-semibold text-slate-900 mt-0.5 block">
                              {currentCost ? `$${parseFloat(currentCost).toFixed(2)} / month` : 'Not specified'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[13px] font-semibold text-slate-400 block ">Contract / Service Notes</span>
                            <p className="text-slate-600 mt-0.5 whitespace-pre-wrap leading-relaxed">
                              {currentNotes || 'No contract terms or notes added yet.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsEditingProviderDetail(true)}
                        className="w-full py-2.5 rounded-[8px] border border-slate-200 hover:bg-slate-50 text-slate-700 text-[13px] font-semibold transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit Account Information</span>
                      </button>
                    </div>

                    {/* Right: Statements, Documents & Matching Payments (2 cols) */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                      {/* Statements & Document Uploader */}
                      <div className="bg-white border border-slate-200/90 rounded-[12px] p-6 shadow-xs flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-sm">Statements & Contracts</h3>
                            <p className="text-[13px] text-slate-500 mt-0.5">Upload bills, rate sheets, or warranties (PDF or image). Klarity auto-extracts your account & cost.</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-[8px] bg-slate-100 text-slate-600 text-[13px] font-semibold">
                            {docs.length} on file
                          </span>
                        </div>

                        {/* Scan status alert */}
                        {providerScanSuccess && (
                          <div className="p-3.5 rounded-[8px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] flex items-center gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-medium">{providerScanSuccess}</span>
                          </div>
                        )}

                        {/* Upload Bar / Dropzone */}
                        <div
                          onClick={() => providerDocInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-300 hover:border-[#18457c] rounded-[12px] p-5 text-center bg-slate-50/60 hover:bg-blue-50/30 cursor-pointer transition-all flex items-center justify-center gap-3.5 group"
                        >
                          <input
                            ref={providerDocInputRef}
                            type="file"
                            accept=".pdf,image/png,image/jpeg,image/jpg"
                            onChange={handleUploadProviderDocument}
                            className="hidden"
                          />
                          <div className="w-10 h-10 rounded-[8px] bg-blue-50 text-[#18457c] flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs shrink-0">
                            {isScanningProviderDoc ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <UploadCloud className="w-5 h-5" />
                            )}
                          </div>
                          <div className="text-left">
                            <span className="text-[13px] sm:text-sm font-semibold text-slate-900 block">
                              {isScanningProviderDoc ? providerScanProgress : `Upload ${currentProvider || 'Provider'} Statement`}
                            </span>
                            <span className="text-[13px] text-slate-400 block">
                              PDF, PNG, JPG (Account numbers & bill amounts will be auto-scanned)
                            </span>
                          </div>
                        </div>

                        {/* Saved Documents */}
                        {docs.length > 0 && (
                          <div className="space-y-2.5 pt-1">
                            <span className="text-[13px] font-semibold text-slate-700 block">Uploaded Statements</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {docs.map(doc => (
                                <div
                                  key={doc.id}
                                  className="p-3.5 rounded-[12px] bg-slate-50/70 border border-slate-200/80 flex items-start justify-between gap-2.5"
                                >
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-[8px] bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                      <FileText className="w-4 h-4 text-[#18457c]" />
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-semibold text-slate-900 text-[13px] block truncate" title={doc.name}>
                                        {doc.name}
                                      </span>
                                      <span className="text-[13px] text-slate-400 block mt-0.5">
                                        {new Date(doc.uploadedAt).toLocaleDateString()} · {doc.size || 'PDF'}
                                      </span>
                                      {doc.extracted?.accountNumber && (
                                        <span className="text-[13px]  text-emerald-700 font-semibold block mt-0.5">
                                          Acct: {doc.extracted.accountNumber}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {doc.dataUrl && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setViewingCardPhoto(doc.dataUrl);
                                          setViewingCardTitle(doc.name);
                                        }}
                                        className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white transition-colors cursor-pointer"
                                        title="View Statement"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteProviderDocument(doc.id)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors cursor-pointer"
                                      title="Delete Statement"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Matching Payments / Bills */}
                      {matchingBills.length > 0 && (
                        <div className="bg-white border border-slate-200/90 rounded-[12px] p-6 shadow-xs flex flex-col gap-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="font-semibold text-slate-900 text-[13px] flex items-center gap-2">
                              <Receipt className="w-4 h-4 text-emerald-600" />
                              <span>Connected Payments & Bills</span>
                            </span>
                            <span className="text-[13px] text-slate-400">
                              {matchingBills.length} matched payment{matchingBills.length === 1 ? '' : 's'}
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {matchingBills.map(b => (
                              <div key={b.id} className="py-2.5 flex items-center justify-between text-[13px]">
                                <div>
                                  <span className="font-semibold text-slate-900 block">{b.name}</span>
                                  <span className="text-[13px] text-slate-400">{b.category || 'Utility'} · {b.dueDate ? `Due ${b.dueDate}` : 'Active payment'}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-semibold text-slate-900 text-sm block">${b.amount}</span>
                                  <span className="text-[13px] text-emerald-600 font-semibold flex items-center gap-1 justify-end">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                    From payments
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

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
              {/* Header Bar with Count and Add Card button */}
              <div className="flex items-center justify-between flex-wrap gap-3 px-1">
                <div>
                  <h2 className="font-semibold text-lg text-slate-900 dark:text-white">Vehicles & Auto insurance</h2>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">
                    {metrics.fleet.vehicles.length === 1 ? '1 active vehicle & insurance card' : `${metrics.fleet.vehicles.length} active vehicles & insurance cards`} · Click any card to expand or minimize
                  </p>
                </div>
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
              {/* Header Bar with Count and Add Card button */}
              <div className="flex items-center justify-between flex-wrap gap-3 px-1">
                <div>
                  <h2 className="font-semibold text-lg text-slate-900 dark:text-white">Health insurance</h2>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">
                    {policies.length === 1 ? '1 active card' : `${policies.length} active cards`} · Click any card to expand or minimize
                  </p>
                </div>
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

      {/* Extra Provider Modal Dialog */}
      {isExtraProviderModalOpen && extraProviderForm && (
        <div
          className="fixed inset-0 bg-[#0A1423]/55  flex items-center justify-center p-4 z-50 cursor-pointer"
          onClick={() => {
            setIsExtraProviderModalOpen(false);
            setExtraProviderForm(null);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-[12px] border border-slate-200/90 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 sm:p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-slate-200 max-h-[90vh] overflow-y-auto cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs border border-blue-200 dark:border-blue-800">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-title text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {extraProviderForm.isNew ? 'Add Extra Provider' : 'Edit Extra Provider'}
                  </h3>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Home warranty, pest control, lawn care, pool, gas, or other services
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsExtraProviderModalOpen(false);
                  setExtraProviderForm(null);
                }}
                className="p-1 rounded-[8px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category / Type Selector */}
              <div>
                <label className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Service Category
                </label>
                <select
                  value={extraProviderForm.type || 'Home Warranty & Protection'}
                  onChange={e => setExtraProviderForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full text-[13px] font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[8px] px-3.5 py-2.5 focus:outline-none"
                >
                  <option value="Home Warranty & Protection">Home Warranty & Appliance Protection (HomeShield, Choice...)</option>
                  <option value="Pest Control">Pest Control (Orkin, Terminix...)</option>
                  <option value="Lawn Care & Landscaping">Lawn Care & Landscaping (TruGreen, Local...)</option>
                  <option value="Pool & Spa Maintenance">Pool & Spa Maintenance (Leslie's, Local...)</option>
                  <option value="Gas & Propane">Gas & Propane (Suburban Propane, AmeriGas...)</option>
                  <option value="Cleaning & Maid Service">Cleaning & Maid Service (Merry Maids...)</option>
                  <option value="Home Security & Cameras">Home Security & Cameras (Ring, ADT, Vivint...)</option>
                  <option value="Homeowners Insurance">Homeowners Insurance (State Farm, Travelers...)</option>
                  <option value="Custom Service">Other / Custom Home Service</option>
                </select>
              </div>

              {/* Provider Company Name with Quick Suggestions */}
              <div>
                <label className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Provider Company Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. American Home Shield, Choice Home Warranty, Orkin, TruGreen..."
                  value={extraProviderForm.name || ''}
                  onChange={e => setExtraProviderForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full text-[13px] font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[8px] px-3.5 py-2.5 focus:outline-none"
                  autoFocus
                />
                {/* Quick Provider Suggestions for Selected Category */}
                {suggestedQuickCompanies.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {suggestedQuickCompanies.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setExtraProviderForm(prev => ({ ...prev, name: c }))}
                        className={`px-2.5 py-1 rounded-lg text-[13px] font-semibold border transition-colors cursor-pointer ${
                          extraProviderForm.name === c
                            ? 'bg-[#18457c] text-white border-[#18457c]'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Plan Name & Monthly Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Plan / Coverage Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ShieldGold, Total Plan, Premium..."
                    value={extraProviderForm.plan || ''}
                    onChange={e => setExtraProviderForm(prev => ({ ...prev, plan: e.target.value }))}
                    className="w-full text-[13px] font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[8px] px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Monthly Cost ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[13px]">$</span>
                    <input
                      type="number"
                      placeholder="e.g. 65"
                      value={extraProviderForm.monthlyCost || ''}
                      onChange={e => setExtraProviderForm(prev => ({ ...prev, monthlyCost: e.target.value }))}
                      className="w-full text-[13px] font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[8px] pl-8 pr-3.5 py-2.5 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Account / Policy Number */}
              <div>
                <label className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Account Number / Policy #
                </label>
                <input
                  type="text"
                  placeholder="e.g. HW-98218342"
                  value={extraProviderForm.accountNumber || ''}
                  onChange={e => setExtraProviderForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                  className="w-full text-[13px] font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[8px] px-3.5 py-2.5 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Notes & Contract Details
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Deductible is $100 per trade call. Covers AC, plumbing, refrigerator..."
                  value={extraProviderForm.notes || ''}
                  onChange={e => setExtraProviderForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full text-[13px] font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[8px] px-3.5 py-2 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              {!extraProviderForm.isNew ? (
                <button
                  type="button"
                  onClick={() => handleDeleteExtraProvider(extraProviderForm.id)}
                  className="px-3.5 py-2 rounded-[8px] border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[13px] font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsExtraProviderModalOpen(false);
                    setExtraProviderForm(null);
                  }}
                  className="px-4 py-2 rounded-[8px] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[13px] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!extraProviderForm.name?.trim()}
                  onClick={handleSaveExtraProvider}
                  className="px-5 py-2 rounded-[8px] bg-[#18457c] hover:bg-[#123561] disabled:opacity-50 text-white font-semibold text-[13px] cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Provider</span>
                </button>
              </div>
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

      <ConfirmDialog
        open={Boolean(pendingDeleteProviderId)}
        title="Remove provider?"
        message="Are you sure you want to remove this provider from your household?"
        confirmLabel="Remove provider"
        variant="danger"
        onCancel={() => {
          setPendingDeleteProviderId(null);
          setPendingDeleteSource(null);
        }}
        onConfirm={executeDeleteExtraProvider}
      />
    </div>
  );
}
