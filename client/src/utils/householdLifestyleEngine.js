/**
 * Household, Utility (PG&E / Water / Gas) & Vehicle Fleet Intelligence Engine
 *
 * Provides institutional-grade real-world estimation and advisory models for:
 * 1. Dwelling & Household Utility Modeling (PG&E Electric & Gas, Municipal Water/Trash)
 * 2. Vehicle Fleet Fuel & Maintenance Costing (Gas ICE, Hybrid, PHEV, Battery EV)
 * 3. Free & Low-Cost EV Charging Network Directory by Region
 * 4. 0% APR New Electric Vehicle Acquisition & Rebate Stacking Advisor
 */

export const DWELLING_TYPES = [
  {
    id: 'apartment',
    label: 'Apartment / Condo',
    defaultSqFt: 950,
    baseKwh: 260,
    baseTherms: 12,
    baseWaterGalPerDay: 45,
    baseTrashSewer: 45,
    hvacFactor: 0.75,
    description: 'Shared walls reduce heating/cooling loss; typically lower water/trash base.'
  },
  {
    id: 'townhouse',
    label: 'Townhouse / Duplex',
    defaultSqFt: 1550,
    baseKwh: 410,
    baseTherms: 22,
    baseWaterGalPerDay: 75,
    baseTrashSewer: 68,
    hvacFactor: 1.0,
    description: 'Multi-level living with moderate HVAC load and small patio/yard.'
  },
  {
    id: 'single_family',
    label: 'Single-Family House',
    defaultSqFt: 2150,
    baseKwh: 590,
    baseTherms: 34,
    baseWaterGalPerDay: 140,
    baseTrashSewer: 95,
    hvacFactor: 1.35,
    description: 'Standalone home with full roof/wall exposure, yard irrigation, and full municipal bins.'
  },
  {
    id: 'large_estate',
    label: 'Large Multi-Gen House',
    defaultSqFt: 3100,
    baseKwh: 850,
    baseTherms: 48,
    baseWaterGalPerDay: 210,
    baseTrashSewer: 125,
    hvacFactor: 1.75,
    description: 'Larger footprint suitable for extended family, dual HVAC zones, and higher baseline load.'
  }
];

export const UTILITY_REGIONS = [
  {
    id: 'pge_norcal',
    name: 'PG&E (Northern & Central CA)',
    electricProvider: 'Pacific Gas & Electric (PG&E)',
    standardRateKwh: 0.42,
    evOffPeakRateKwh: 0.31,
    thermRate: 2.28,
    waterRatePer1000Gal: 9.80,
    avgGasPricePerGal: 4.85,
    careDiscountPercent: 32, // PG&E CARE provides ~30-35% discount on electric & 20% on gas
    feraDiscountPercent: 18
  },
  {
    id: 'smud_sac',
    name: 'SMUD + PG&E Gas (Sacramento)',
    electricProvider: 'SMUD (Sacramento Municipal Utility)',
    standardRateKwh: 0.17,
    evOffPeakRateKwh: 0.12,
    thermRate: 2.25,
    waterRatePer1000Gal: 8.50,
    avgGasPricePerGal: 4.69,
    careDiscountPercent: 30,
    feraDiscountPercent: 15
  },
  {
    id: 'sce_socal',
    name: 'SoCal Edison + SoCalGas (Southern CA)',
    electricProvider: 'Southern California Edison (SCE)',
    standardRateKwh: 0.36,
    evOffPeakRateKwh: 0.25,
    thermRate: 2.10,
    waterRatePer1000Gal: 10.40,
    avgGasPricePerGal: 4.89,
    careDiscountPercent: 30,
    feraDiscountPercent: 18
  },
  {
    id: 'sdge_sandiego',
    name: 'SDG&E (San Diego)',
    electricProvider: 'San Diego Gas & Electric (SDG&E)',
    standardRateKwh: 0.45,
    evOffPeakRateKwh: 0.28,
    thermRate: 2.30,
    waterRatePer1000Gal: 11.90,
    avgGasPricePerGal: 4.92,
    careDiscountPercent: 35,
    feraDiscountPercent: 18
  },
  {
    id: 'ladwp_la',
    name: 'LADWP + SoCalGas (Los Angeles)',
    electricProvider: 'LA Dept. of Water & Power (LADWP)',
    standardRateKwh: 0.24,
    evOffPeakRateKwh: 0.18,
    thermRate: 2.10,
    waterRatePer1000Gal: 10.10,
    avgGasPricePerGal: 4.95,
    careDiscountPercent: 25,
    feraDiscountPercent: 15
  },
  {
    id: 'national_avg',
    name: 'U.S. National Average Utility',
    electricProvider: 'Local Municipal / Regional Utility',
    standardRateKwh: 0.18,
    evOffPeakRateKwh: 0.11,
    thermRate: 1.55,
    waterRatePer1000Gal: 7.40,
    avgGasPricePerGal: 3.55,
    careDiscountPercent: 20,
    feraDiscountPercent: 12
  }
];

export const HOME_QUESTIONNAIRE_OPTIONS = {
  heating: [
    { id: 'natural_gas_furnace', label: 'Natural Gas Furnace (Central Ducted)' },
    { id: 'heat_pump', label: 'Electric Heat Pump (Mini-Split or Central)' },
    { id: 'electric_baseboard', label: 'Electric Baseboard / Wall Heaters' },
    { id: 'propane_other', label: 'Propane / Wood / Other' }
  ],
  cooling: [
    { id: 'central_ac', label: 'Central Air Conditioning' },
    { id: 'heat_pump', label: 'Heat Pump (Heating & Cooling)' },
    { id: 'evaporative_cooler', label: 'Evaporative / Swamp Cooler' },
    { id: 'window_units', label: 'Window / Portable AC Units' },
    { id: 'none', label: 'No Air Conditioning' }
  ],
  waterHeater: [
    { id: 'natural_gas_tank', label: 'Natural Gas Tank (40–50 Gal)' },
    { id: 'tankless_gas', label: 'Tankless Natural Gas (On-Demand)' },
    { id: 'electric_tank', label: 'Standard Electric Tank' },
    { id: 'hybrid_heat_pump', label: 'Hybrid Heat Pump Water Heater' }
  ],
  evCharger: [
    { id: 'level2_240v', label: 'Level 2 (240V Dedicated Wall Connector / NEMA 14-50)' },
    { id: 'level1_120v', label: 'Level 1 (Standard 120V Wall Outlet)' },
    { id: 'no_charger', label: 'No Home Charger (Charge Away from Home)' }
  ],
  evChargingFrequency: [
    { id: 'daily', label: 'Daily (Plug in every night)' },
    { id: 'several_times_week', label: '2–4 Times a Week' },
    { id: 'rarely', label: 'Rarely (Occasional top-offs only)' },
    { id: 'never', label: 'Never (Charge 100% away from home)' }
  ],
  evChargingSchedule: [
    { id: 'overnight_offpeak', label: 'Overnight / Off-Peak (Midnight – 6 AM, lowest electric rate)' },
    { id: 'daytime_solar', label: 'Daytime (While solar panels produce)' },
    { id: 'evening_peak', label: 'Evening Peak (4 PM – 9 PM, highest rate)' },
    { id: 'anytime', label: 'Anytime / Unscheduled' }
  ],
  evFreeWorkplaceCharging: [
    { id: 'no', label: 'No (100% home power)' },
    { id: 'yes_sometimes', label: 'Yes, 20–30% free public or workplace' },
    { id: 'yes_often', label: 'Yes, 50%+ free public or workplace' }
  ],
  poolOrSpa: [
    { id: 'none', label: 'None' },
    { id: 'pool_only', label: 'In-Ground Swimming Pool' },
    { id: 'spa_only', label: 'Hot Tub / Spa Only' },
    { id: 'pool_and_spa', label: 'Pool & Spa Combo' }
  ],
  poolPump: [
    { id: 'variable_speed', label: 'Variable-Speed Eco Pump (Energy Star)' },
    { id: 'single_speed', label: 'Single-Speed Standard Pump' }
  ],
  poolHeating: [
    { id: 'none', label: 'Unheated / Ambient' },
    { id: 'solar', label: 'Rooftop Solar Pool Panels' },
    { id: 'gas', label: 'Natural Gas Pool Heater' },
    { id: 'electric_heat_pump', label: 'Electric Pool Heat Pump' }
  ],
  solarOwnership: [
    { id: 'owned', label: 'Owned (Paid Off / Purchased)' },
    { id: 'leased', label: 'Leased' },
    { id: 'ppa', label: 'Power Purchase Agreement (PPA)' }
  ],
  solarBillingPlans: [
    { id: 'nem_2', label: 'NEM 2.0 (Grandfathered Net Energy Metering)' },
    { id: 'nem_3', label: 'NEM 3.0 (Solar Billing Plan / Net Billing)' },
    { id: 'nem_1', label: 'NEM 1.0 (Original Net Metering)' },
    { id: 'other', label: 'Wholesale / Avoided Cost Rate' }
  ],
  batteryModes: [
    { id: 'self_consumption', label: 'Maximize Solar Self-Consumption' },
    { id: 'backup_only', label: 'Emergency Backup Only (100% Reserve)' },
    { id: 'tou_arbitrage', label: 'Time-of-Use Rate Arbitrage' }
  ]
};

export const DEFAULT_HOUSEHOLD_PROFILE = {
  // Property details
  address: '',
  street: '',
  city: '',
  state: 'CA',
  zip: '',
  cityOrZip: 'Bay Area / Northern CA',
  zillowUrl: '',
  zillowImportedAt: null,
  dwellingType: 'single_family',
  ownership: 'own',
  householdSize: 4,
  sqFt: 2100,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 2004,
  lotSize: '6,500 sq ft',
  estimatedValue: '$425,000',
  county: 'Fresno County',
  garage: 'Attached 2-Car Garage',
  utilityRegionId: 'pge_norcal',
  hasCareDiscount: true, // CARE/FERA low-income or senior discount

  // Questionnaire: Heating, Cooling, Water, EV, Pool
  heatingType: 'natural_gas_furnace', // 'natural_gas_furnace' | 'heat_pump' | 'electric_baseboard' | 'propane_other'
  coolingType: 'central_ac', // 'central_ac' | 'heat_pump' | 'evaporative_cooler' | 'window_units' | 'none'
  waterHeaterType: 'natural_gas_tank', // 'natural_gas_tank' | 'tankless_gas' | 'electric_tank' | 'hybrid_heat_pump'
  hasEvAtHome: true,
  evChargerType: 'level2_240v', // 'level2_240v' | 'level1_120v' | 'no_charger'
  evHomeChargingFrequency: 'daily', // 'daily' | 'several_times_week' | 'rarely' | 'never'
  evChargingSchedule: 'overnight_offpeak', // 'overnight_offpeak' | 'daytime_solar' | 'evening_peak' | 'anytime'
  evDailyHomeMiles: 35,
  evFreeWorkplaceCharging: 'no', // 'no' | 'yes_sometimes' | 'yes_often'
  poolOrSpa: 'none', // 'none' | 'pool_only' | 'spa_only' | 'pool_and_spa'
  poolPumpType: 'variable_speed', // 'variable_speed' | 'single_speed'
  poolHeating: 'none', // 'none' | 'solar' | 'gas' | 'electric_heat_pump'

  // Household Providers (Internet, Phones, Security, Trash)
  internetProvider: 'Xfinity',
  phoneProvider: 'T-Mobile',
  phoneLines: 3,
  securityProvider: 'Ring',
  trashProvider: 'City Municipal Utilities',

  // Solar & Storage suite
  hasSolar: false,
  solarPanelCount: 20,
  solarWattsPerPanel: 400,
  solarOwnership: 'owned', // 'owned' | 'leased' | 'ppa'
  solarMonthlyPayment: 165,
  solarBillingPlan: 'nem_2', // 'nem_2' | 'nem_3' | 'nem_1' | 'other'
  solarYearInstalled: 2021,
  hasSolarBattery: false,
  solarBatteryModel: 'Tesla Powerwall 2',
  solarBatteryKwh: 13.5,
  solarBatteryMode: 'self_consumption', // 'self_consumption' | 'backup_only' | 'tou_arbitrage'
  solarPeakSunHours: 5.5,

  // User-customized monthly home costs { [costKey]: { provider, amount, source: 'user' | 'estimate' | 'bills' } }
  monthlyCosts: {},

  climateSeason: 'average', // 'average' | 'summer_ac' | 'winter_heat'
  foodMonthly: 650,
  health: {
    provider: '',
    planName: '',
    memberId: '',
    groupNumber: '',
    network: '',
    rxBin: '',
    monthlyPremium: 0,
    deductible: null,
    outOfPocketMax: null,
    copays: {
      primaryCare: null,
      specialist: null,
      urgentCare: null,
      er: null,
      rxGeneric: null
    },
    doctors: [],
    cards: []
  },
  vehicles: [
    {
      id: 'veh-1',
      year: 2024,
      make: 'Toyota',
      model: 'Camry Hybrid',
      name: '2024 Toyota Camry Hybrid',
      type: 'hybrid', // 'gas' | 'hybrid' | 'phev' | 'ev'
      ownership: 'owned',
      insuranceProvider: 'GEICO',
      insuranceCoverage: 'liability_only',
      insuranceMonthly: 65,
      insurancePolicyNumber: 'G-8821943',
      insuranceCardPhoto: null,
      estimatedValue: 26500,
      odometer: 14200,
      threeYearMileLimit: null,
      mpgOrEfficiency: 51,
      fuelGrade: 'regular',
      monthlyMiles: 950,
      monthlyPayment: 0,
      apr: 0,
      freeChargingSharePercent: 0
    },
    {
      id: 'veh-2',
      year: 2024,
      make: 'Tesla',
      model: 'Model Y Long Range',
      name: '2024 Tesla Model Y Long Range',
      type: 'ev',
      ownership: 'lease',
      insuranceProvider: 'State Farm',
      insuranceCoverage: 'full_coverage_gap',
      insuranceMonthly: 145,
      insurancePolicyNumber: 'SF-4401923',
      insuranceCardPhoto: null,
      estimatedValue: 38000,
      odometer: 8900,
      threeYearMileLimit: 36000,
      mpgOrEfficiency: 28,
      batteryKwh: 75,
      fuelGrade: 'electric',
      monthlyMiles: 1000,
      monthlyPayment: 429,
      apr: 0,
      freeChargingSharePercent: 30
    }
  ]
};

/**
 * Calculates comprehensive monthly utility bills (PG&E Electric, Natural Gas, Water/Sewer/Trash)
 * and Fleet Fuel/Charging expenses based on the household profile.
 */

/**
 * Helper to suggest utility, telecom, and home finance providers based on ZIP code & region.
 */
export function getSuggestedProviders(profile = {}) {
  const regId = profile.utilityRegionId || 'pge_norcal';
  const city = (profile.city || profile.cityOrZip || 'Fresno').split(',')[0].trim();
  const county = profile.county || 'Fresno County';

  let electric = 'Pacific Gas & Electric (PG&E)';
  let gas = 'Pacific Gas & Electric (PG&E)';

  if (regId === 'smud_sac') {
    electric = 'SMUD (Sacramento Municipal Utility)';
    gas = 'Pacific Gas & Electric (PG&E)';
  } else if (regId === 'sce_socal') {
    electric = 'Southern California Edison (SCE)';
    gas = 'SoCalGas';
  } else if (regId === 'sdge_sandiego') {
    electric = 'San Diego Gas & Electric (SDG&E)';
    gas = 'San Diego Gas & Electric (SDG&E)';
  } else if (regId === 'ladwp_la') {
    electric = 'Los Angeles Dept of Water & Power (LADWP)';
    gas = 'SoCalGas';
  } else if (regId === 'national_avg') {
    electric = 'Local Electric Utility';
    gas = 'Local Natural Gas Utility';
  }

  const waterTrash = profile.trashProvider || `City of ${city || 'Municipal'} Utilities`;
  const internet = profile.internetProvider || 'Xfinity / AT&T Fiber';
  const phone = profile.phoneProvider || 'T-Mobile Family Plan';
  const security = profile.securityProvider || 'Ring / Smart Home';
  const mortgageRent = profile.ownership === 'rent' ? 'Property Landlord / Management' : 'Mortgage Servicer';
  const propertyTax = `${county} Tax Collector`;
  const hoa = 'HOA Community Association';
  const homeInsurance = profile.ownership === 'rent' ? 'Lemonade / State Farm Renters' : 'State Farm / Travelers Homeowners';

  return {
    electricity: electric,
    gas,
    waterTrash,
    internet,
    phone,
    security,
    mortgageRent,
    propertyTax,
    hoa,
    homeInsurance
  };
}

/**
 * Computes standard monthly cost items matching bills, user inputs, and calculated engine estimates.
 */
export function calculateHomeCostBreakdown(profile = {}, metrics = null, userBills = []) {
  const suggestedProviders = getSuggestedProviders(profile);
  const userCosts = profile.monthlyCosts || {};
  const bills = Array.isArray(userBills) ? userBills : [];

  const rawVal = Number(String(profile.estimatedValue || '425000').replace(/[^0-9]/g, '')) || 425000;
  const isRent = profile.ownership === 'rent';
  const sqFt = Number(profile.sqFt) || 2100;

  // Baseline estimates
  const estElectric = metrics?.utilities?.homeElectricCost != null
    ? metrics.utilities.homeElectricCost + (metrics.utilities.evHomeChargingCost || 0)
    : 378;
  const estGas = metrics?.utilities?.naturalGasCost != null ? metrics.utilities.naturalGasCost : 119;
  const estWaterTrash = metrics?.utilities?.waterTrashTotalCost != null ? metrics.utilities.waterTrashTotalCost : 216;
  const estInternet = 65;
  const estMortgageRent = isRent ? Math.round(sqFt * 1.35) : Math.round(rawVal * 0.0052);
  const estPropertyTax = isRent ? 0 : Math.round((rawVal * 0.0115) / 12);
  const estHoa = profile.dwellingType === 'apartment' || profile.dwellingType === 'townhouse' ? 245 : 0;
  const estHomeInsurance = isRent ? 22 : Math.round((rawVal * 0.0035) / 12);

  const categories = [
    { id: 'electricity', label: 'Electricity', defaultProvider: suggestedProviders.electricity, estAmount: estElectric, billTerms: ['electric', 'pg&e', 'pge', 'smud', 'edison', 'sdge', 'ladwp'] },
    { id: 'gas', label: 'Natural Gas', defaultProvider: suggestedProviders.gas, estAmount: estGas, billTerms: ['gas', 'socalgas', 'natural gas'] },
    { id: 'waterTrash', label: 'Water & Trash', defaultProvider: suggestedProviders.waterTrash, estAmount: estWaterTrash, billTerms: ['water', 'trash', 'sewer', 'waste', 'city utilities', 'republic services', 'waste management'] },
    { id: 'internet', label: 'Internet', defaultProvider: suggestedProviders.internet, estAmount: estInternet, billTerms: ['internet', 'wifi', 'xfinity', 'comcast', 'at&t', 'spectrum', 'verizon fios', 'frontier', 'sonic'] },
    { id: 'phone', label: 'Mobile & Phone', defaultProvider: suggestedProviders.phone, estAmount: profile.phoneLines ? Number(profile.phoneLines) * 35 : 105, billTerms: ['phone', 'cell', 'mobile', 'wireless', 't-mobile', 'tmobile', 'verizon', 'att wireless', 'at&t wireless', 'mint mobile', 'google fi'] },
    { id: 'mortgageRent', label: isRent ? 'Rent' : 'Mortgage or Rent', defaultProvider: suggestedProviders.mortgageRent, estAmount: estMortgageRent, billTerms: ['mortgage', 'rent', 'housing', 'lease'] },
    { id: 'propertyTax', label: 'Property Tax', defaultProvider: suggestedProviders.propertyTax, estAmount: estPropertyTax, billTerms: ['property tax', 'county tax', 'tax collector'] },
    { id: 'hoa', label: 'HOA', defaultProvider: suggestedProviders.hoa, estAmount: estHoa, billTerms: ['hoa', 'homeowners association', 'condo fee'] },
    { id: 'homeInsurance', label: isRent ? 'Renters Insurance' : 'Home Insurance', defaultProvider: suggestedProviders.homeInsurance, estAmount: estHomeInsurance, billTerms: ['home insurance', 'hazard insurance', 'renters insurance', 'homeowners insurance'] }
  ];

  return categories.map(cat => {
    // 1. User manual entry takes top precedence
    if (userCosts[cat.id] && userCosts[cat.id].amount !== undefined) {
      return {
        id: cat.id,
        label: cat.label,
        provider: userCosts[cat.id].provider || cat.defaultProvider,
        amount: Number(userCosts[cat.id].amount) || 0,
        source: userCosts[cat.id].source || 'user'
      };
    }

    // 2. Check user bills
    const matchedBill = bills.find(b => {
      const bName = (b.name || '').toLowerCase();
      const bCat = (b.category || '').toLowerCase();
      return cat.billTerms.some(term => bName.includes(term) || bCat.includes(term));
    });

    if (matchedBill && Number(matchedBill.expectedAmount) > 0) {
      return {
        id: cat.id,
        label: cat.label,
        provider: matchedBill.name || cat.defaultProvider,
        amount: Math.round(Number(matchedBill.expectedAmount)),
        source: 'bills'
      };
    }

    // 3. Fallback to model estimate
    return {
      id: cat.id,
      label: cat.label,
      provider: cat.defaultProvider,
      amount: Math.round(cat.estAmount),
      source: 'estimate'
    };
  });
}

export function calculateHouseholdAndFleetMetrics(profile = DEFAULT_HOUSEHOLD_PROFILE) {
  const dwelling = DWELLING_TYPES.find(d => d.id === profile.dwellingType) || DWELLING_TYPES[2];
  const region = UTILITY_REGIONS.find(r => r.id === profile.utilityRegionId) || UTILITY_REGIONS[0];
  const people = Math.max(1, Number(profile.householdSize) || 1);
  const sqFt = Math.max(300, Number(profile.sqFt) || dwelling.defaultSqFt);
  const sqFtRatio = sqFt / dwelling.defaultSqFt;

  // Season multiplier
  const electricSeasonMult = profile.climateSeason === 'summer_ac' ? 1.35 : profile.climateSeason === 'winter_heat' ? 0.92 : 1.0;
  const gasSeasonMult = profile.climateSeason === 'winter_heat' ? 1.65 : profile.climateSeason === 'summer_ac' ? 0.65 : 1.0;

  // Heating & Cooling equipment adjustments
  let heatingElectricDelta = 0;
  let heatingGasDelta = 0;
  if (profile.heatingType === 'heat_pump') {
    heatingElectricDelta = 110 * (profile.climateSeason === 'winter_heat' ? 1.8 : 0.6);
    heatingGasDelta = -18;
  } else if (profile.heatingType === 'electric_baseboard') {
    heatingElectricDelta = 220 * (profile.climateSeason === 'winter_heat' ? 2.1 : 0.5);
    heatingGasDelta = -25;
  } else if (profile.heatingType === 'propane_other') {
    heatingGasDelta = -20;
  }

  let coolingElectricMult = 1.0;
  if (profile.coolingType === 'heat_pump') {
    coolingElectricMult = 0.88;
  } else if (profile.coolingType === 'evaporative_cooler') {
    coolingElectricMult = 0.65;
  } else if (profile.coolingType === 'window_units') {
    coolingElectricMult = 0.82;
  } else if (profile.coolingType === 'none') {
    coolingElectricMult = 0.60;
  }

  // Water heater equipment adjustments
  let waterElectricDelta = 0;
  let waterGasDelta = 0;
  if (profile.waterHeaterType === 'electric_tank') {
    waterElectricDelta = 190;
    waterGasDelta = -12;
  } else if (profile.waterHeaterType === 'hybrid_heat_pump') {
    waterElectricDelta = 65;
    waterGasDelta = -12;
  } else if (profile.waterHeaterType === 'tankless_gas') {
    waterGasDelta = -6;
  }

  // Pool & Spa load adjustments
  let poolElectricDelta = 0;
  let poolGasDelta = 0;
  if (profile.poolOrSpa === 'pool_only' || profile.poolOrSpa === 'pool_and_spa') {
    poolElectricDelta += profile.poolPumpType === 'single_speed' ? 160 : 75;
    if (profile.poolHeating === 'gas') poolGasDelta += 24;
    else if (profile.poolHeating === 'electric_heat_pump') poolElectricDelta += 115;
  }
  if (profile.poolOrSpa === 'spa_only' || profile.poolOrSpa === 'pool_and_spa') {
    poolElectricDelta += 85;
    if (profile.poolHeating === 'gas') poolGasDelta += 12;
  }

  // Solar system computed parameters
  const solarPanelCount = Math.max(1, Number(profile.solarPanelCount) || 20);
  const solarWattsPerPanel = Math.max(100, Number(profile.solarWattsPerPanel) || 400);
  const solarSystemKw = Number(((solarPanelCount * solarWattsPerPanel) / 1000).toFixed(2));
  const solarPeakSunHours = Math.max(1, Number(profile.solarPeakSunHours) || 5.5);
  // Monthly solar kWh with 20% system losses stated (inverter, wiring, dust, heat)
  const solarMonthlyKwh = Math.round(solarSystemKw * solarPeakSunHours * 30 * 0.80);

  // 1. Home Electricity (excluding EV charging)
  // Base dwelling kWh scaled by sqFt + 115 kWh per person, modified by HVAC, water heater, and pool
  let grossHomeKwh = Math.round((dwelling.baseKwh * sqFtRatio * coolingElectricMult + (people * 115) + heatingElectricDelta + waterElectricDelta + poolElectricDelta) * electricSeasonMult);

  let homeKwh = grossHomeKwh;
  if (profile.hasSolar) {
    const offsetFactor = profile.solarBillingPlan === 'nem_3' ? 0.70 : 0.85;
    const solarOffset = Math.round(solarMonthlyKwh * offsetFactor);
    homeKwh = Math.max(85, grossHomeKwh - solarOffset);
  }

  const effectiveElectricRate = profile.hasCareDiscount
    ? region.standardRateKwh * (1 - region.careDiscountPercent / 100)
    : region.standardRateKwh;

  const effectiveEvRate = profile.hasCareDiscount
    ? region.evOffPeakRateKwh * (1 - region.careDiscountPercent / 100)
    : region.evOffPeakRateKwh;

  const homeElectricCost = Math.round(homeKwh * effectiveElectricRate);

  // 2. Natural Gas (Water heating, stove, furnace, pool)
  const grossTherms = (dwelling.baseTherms * Math.sqrt(sqFtRatio) + (people * 6) + heatingGasDelta + waterGasDelta + poolGasDelta) * gasSeasonMult;
  const monthlyTherms = Math.max(4, Math.round(grossTherms));
  const effectiveThermRate = profile.hasCareDiscount
    ? region.thermRate * 0.80 // 20% CARE gas discount
    : region.thermRate;
  const naturalGasCost = Math.round(monthlyTherms * effectiveThermRate);

  // 3. Water, Sewer & Trash
  // Avg ~70 gallons per person per day indoor + dwelling base irrigation
  const monthlyWaterGallons = Math.round((dwelling.baseWaterGalPerDay + (people * 68)) * 30);
  const waterUsageCost = (monthlyWaterGallons / 1000) * region.waterRatePer1000Gal;
  const waterTrashTotalCost = Math.round(waterUsageCost + dwelling.baseTrashSewer);

  // 4. Vehicle Fleet Calculations (Gasoline + EV Home Charging + Free Public Charging)
  const vehicles = Array.isArray(profile.vehicles) ? profile.vehicles : [];
  let totalMonthlyGasCost = 0;
  let totalMonthlyEvHomeKwh = 0;
  let totalMonthlyEvHomeCost = 0;
  let totalMonthlyInsurance = 0;
  let totalMonthlyCarPayments = 0;
  let totalMonthlyMaintenance = 0;

  const vehicleBreakdowns = vehicles.map(v => {
    const miles = Math.max(0, Number(v.monthlyMiles) || 0);
    const ins = Math.max(0, Number(v.insuranceMonthly) || 110);
    const payment = v.ownership === 'owned' ? 0 : Math.max(0, Number(v.monthlyPayment) || 0);
    totalMonthlyInsurance += ins;
    totalMonthlyCarPayments += payment;

    if (v.type === 'ev') {
      // EV efficiency in kWh per 100 miles (default 28 kWh / 100 mi, ~3.5 mi/kWh)
      const kwhPer100 = Number(v.mpgOrEfficiency) > 10 && Number(v.mpgOrEfficiency) < 60 ? Number(v.mpgOrEfficiency) : 28;
      const totalKwhNeeded = (miles / 100) * kwhPer100;
      const freeShare = Math.min(100, Math.max(0, Number(v.freeChargingSharePercent) || 0)) / 100;
      const paidHomeKwh = Math.round(totalKwhNeeded * (1 - freeShare));
      const freeKwh = Math.round(totalKwhNeeded * freeShare);
      const chargingCost = Math.round(paidHomeKwh * effectiveEvRate);
      const maintenance = Math.round(miles * 0.03); // Tire rotation, cabin filter, wiper fluid (~$28/mo, no oil changes)

      // Compare what a 30 MPG gas car would cost for the same miles
      const equivalentGasCost = Math.round((miles / 30) * region.avgGasPricePerGal);
      const monthlyFuelSavings = Math.max(0, equivalentGasCost - chargingCost);

      totalMonthlyEvHomeKwh += paidHomeKwh;
      totalMonthlyEvHomeCost += chargingCost;
      totalMonthlyMaintenance += maintenance;

      return {
        ...v,
        fuelGrade: 'electric',
        ownership: v.ownership || (payment > 0 ? 'financed' : 'owned'),
        monthlyFuelOrChargeCost: chargingCost,
        paidHomeKwh,
        freeKwh,
        maintenance,
        equivalentGasCost,
        monthlyFuelSavings,
        totalMonthlyVehicleCost: chargingCost + ins + payment + maintenance
      };
    } else if (v.type === 'phev') {
      // Plug-in hybrid: ~50% electric, ~50% gas
      const mpg = Math.max(20, Number(v.mpgOrEfficiency) || 42);
      const gasMiles = miles * 0.5;
      const evMiles = miles * 0.5;
      const gallons = gasMiles / mpg;
      const gasPrice = v.fuelGrade === 'premium'
        ? region.avgGasPricePerGal + 0.50
        : v.fuelGrade === 'diesel'
          ? region.avgGasPricePerGal + 0.35
          : region.avgGasPricePerGal;
      const gasCost = Math.round(gallons * gasPrice);
      const homeKwh = Math.round((evMiles / 100) * 30);
      const evCost = Math.round(homeKwh * effectiveEvRate);
      const maintenance = Math.round(miles * 0.055);

      totalMonthlyGasCost += gasCost;
      totalMonthlyEvHomeKwh += homeKwh;
      totalMonthlyEvHomeCost += evCost;
      totalMonthlyMaintenance += maintenance;

      return {
        ...v,
        fuelGrade: v.fuelGrade || 'regular',
        ownership: v.ownership || (payment > 0 ? 'financed' : 'owned'),
        monthlyFuelOrChargeCost: gasCost + evCost,
        gallonsUsed: Math.round(gallons * 10) / 10,
        paidHomeKwh: homeKwh,
        maintenance,
        totalMonthlyVehicleCost: gasCost + evCost + ins + payment + maintenance
      };
    } else {
      // Gas ICE or Standard Hybrid
      const defaultMpg = v.type === 'hybrid' ? 48 : 28;
      const mpg = Math.max(10, Number(v.mpgOrEfficiency) || defaultMpg);
      const gallons = miles / mpg;
      const gasPrice = v.fuelGrade === 'premium'
        ? region.avgGasPricePerGal + 0.50
        : v.fuelGrade === 'diesel'
          ? region.avgGasPricePerGal + 0.35
          : region.avgGasPricePerGal;
      const gasCost = Math.round(gallons * gasPrice);
      const maintenance = Math.round(miles * (v.type === 'hybrid' ? 0.05 : 0.075)); // Oil changes, brakes, belts, smog

      // Calculate how much they would save switching this car to an EV (with 35% free charging + off-peak home rate)
      const projectedEvKwh = (miles / 100) * 27 * 0.65;
      const projectedEvCost = Math.round(projectedEvKwh * effectiveEvRate);
      const potentialEvSwitchSavings = Math.max(0, (gasCost + maintenance) - (projectedEvCost + Math.round(miles * 0.03)));

      totalMonthlyGasCost += gasCost;
      totalMonthlyMaintenance += maintenance;

      return {
        ...v,
        fuelGrade: v.fuelGrade || (v.type === 'hybrid' ? 'regular' : 'regular'),
        ownership: v.ownership || (payment > 0 ? 'financed' : 'owned'),
        monthlyFuelOrChargeCost: gasCost,
        gallonsUsed: Math.round(gallons * 10) / 10,
        maintenance,
        potentialEvSwitchSavings,
        totalMonthlyVehicleCost: gasCost + ins + payment + maintenance
      };
    }
  });

  // If user selected 'never' for home charging, force home EV charging kWh and cost to 0
  if (profile.hasEvAtHome === false || profile.evHomeChargingFrequency === 'never' || profile.evChargerType === 'no_charger') {
    totalMonthlyEvHomeKwh = 0;
    totalMonthlyEvHomeCost = 0;
  }

  const totalPgeCombinedBill = homeElectricCost + naturalGasCost + totalMonthlyEvHomeCost;
  const totalUtilitiesMonthly = totalPgeCombinedBill + waterTrashTotalCost;
  const totalFleetMonthly = totalMonthlyGasCost + totalMonthlyEvHomeCost + totalMonthlyInsurance + totalMonthlyCarPayments + totalMonthlyMaintenance;

  // Potential CARE discount savings if not yet enrolled
  const careMonthlySavingsPotential = !profile.hasCareDiscount
    ? Math.round((homeElectricCost + totalMonthlyEvHomeCost) * (region.careDiscountPercent / 100) + naturalGasCost * 0.20)
    : Math.round(((homeElectricCost + totalMonthlyEvHomeCost) / (1 - region.careDiscountPercent / 100)) * (region.careDiscountPercent / 100));

  // Solar suite details
  const solar = {
    hasSolar: Boolean(profile.hasSolar),
    panelCount: solarPanelCount,
    wattsPerPanel: solarWattsPerPanel,
    systemSizeKw: solarSystemKw,
    peakSunHours: solarPeakSunHours,
    monthlyKwhEstimate: solarMonthlyKwh,
    ownership: profile.solarOwnership || 'owned',
    monthlyPayment: profile.solarOwnership !== 'owned' ? (Number(profile.solarMonthlyPayment) || 0) : 0,
    billingPlan: profile.solarBillingPlan || 'nem_2',
    yearInstalled: profile.solarYearInstalled || 2021,
    hasBattery: Boolean(profile.hasSolarBattery),
    batteryModel: profile.solarBatteryModel || 'Tesla Powerwall 2',
    batteryKwh: Number(profile.solarBatteryKwh) || 13.5,
    batteryMode: profile.solarBatteryMode || 'self_consumption'
  };

  return {
    dwelling,
    region,
    people,
    sqFt,
    solar,
    utilities: {
      grossHomeKwh,
      homeKwh,
      evHomeKwh: totalMonthlyEvHomeKwh,
      totalKwh: homeKwh + totalMonthlyEvHomeKwh,
      effectiveElectricRate: Math.round(effectiveElectricRate * 100) / 100,
      effectiveEvRate: Math.round(effectiveEvRate * 100) / 100,
      homeElectricCost,
      evHomeChargingCost: totalMonthlyEvHomeCost,
      monthlyTherms,
      naturalGasCost,
      totalPgeCombinedBill,
      monthlyWaterGallons,
      waterTrashTotalCost,
      totalUtilitiesMonthly,
      careMonthlySavingsPotential
    },
    fleet: {
      vehicles: vehicleBreakdowns,
      totalMonthlyGasCost,
      totalMonthlyEvHomeCost,
      totalMonthlyInsurance,
      totalMonthlyCarPayments,
      totalMonthlyMaintenance,
      totalFleetMonthly,
      totalPotentialEvSwitchSavings: vehicleBreakdowns.reduce((sum, v) => sum + (v.potentialEvSwitchSavings || 0), 0)
    }
  };
}

/**
 * Curated Free & Ultra-Low-Cost EV Charging Strategies
 */
export const FREE_EV_CHARGING_GUIDE = [
  {
    category: 'Volta / Shell Recharge Shopping Networks',
    cost: '100% FREE (First 30–60 mins)',
    connector: 'J1772 Level 2 (7–10 kW)',
    locations: 'Whole Foods, Target, Safeway, Kohl\'s, Cinemark Theaters, Walgreens, Shopping Malls',
    tip: 'Plug in while grocery shopping twice a week to add ~45–60 miles of free range per week (~220 free miles/month).'
  },
  {
    category: 'Municipal, City Hall & Public Library Chargers',
    cost: '100% FREE (2–4 hr limit)',
    connector: 'J1772 Level 2',
    locations: 'City Halls, County Civic Centers, Public Libraries, Community Senior Centers, Regional Parks',
    tip: 'Many California cities fund free daytime solar-backed Level 2 charging at civic parking lots.'
  },
  {
    category: 'Caltrans Highway Rest Stops & Park-and-Ride',
    cost: '100% FREE DC Fast Charging',
    connector: 'CCS1 / CHAdeMO (50 kW DC Fast)',
    locations: 'Selected Caltrans Safety Roadside Rest Areas along I-5, I-80, US-101, and SR-99',
    tip: 'Ideal for regional road trips—charges 20% to 80% in ~35 minutes at zero cost.'
  },
  {
    category: 'Automaker Complimentary Charging Networks',
    cost: '100% FREE (1 to 2 Years Included)',
    connector: 'Electrify America / EVgo / ChargePoint (150–350 kW)',
    locations: 'Included with new Hyundai Ioniq 5/6, Kia EV6/EV9, Toyota bZ4X, Subaru Solterra, or VW ID.4 promotions',
    tip: 'When negotiating a new EV, always verify the complimentary Electrify America or ChargePoint credit package.'
  },
  {
    category: 'PG&E EV2-A Off-Peak + CARE Discount (Home)',
    cost: '~$0.21/kWh (Equivalent to $0.95/gallon gas)',
    connector: 'Home Level 2 / 240V NEMA 14-50',
    locations: 'Your own garage/driveway between 12:00 AM (Midnight) and 3:00 PM daily',
    tip: 'Schedule your EV in-car timer to start charging at 12:05 AM. Never charge between 4:00 PM and 9:00 PM peak hours.'
  }
];

/**
 * 0% APR New Electric Vehicle Acquisition & Incentive Stacking Guide
 */
export const ZERO_APR_EV_MODELS = [
  {
    model: 'Hyundai Ioniq 5 / Ioniq 6',
    promoApr: '0% APR for 60–72 Months',
    epaRange: '303–342 miles',
    msrpRange: '$41,800 – $51,000',
    federalAndDealerCash: 'Up to $7,500 Retail Bonus Cash or 0% APR + $2,500 Dealer Discount',
    chargingPerk: 'Ultra-fast 800V charging (10% to 80% in 18 mins) + Free ChargePoint Home Charger or charging credit',
    bestWhereToBuy: 'High-volume Hyundai EV certified dealers (San Jose, Stevens Creek, Fremont, Roseville, or SoCal mega-dealers)'
  },
  {
    model: 'Chevrolet Equinox EV (LT / RS)',
    promoApr: '0% – 0.9% APR for 60 Months',
    epaRange: '319 miles',
    msrpRange: '$34,995 – $43,000',
    federalAndDealerCash: 'Qualifies for full $7,500 Federal Point-of-Sale Tax Credit upfront at the dealership!',
    chargingPerk: 'Lowest net price in America (~$27,495 after $7,500 instant point-of-sale credit) + Costco Member $1,000 bonus',
    bestWhereToBuy: 'High-allocation Chevrolet EV volume dealers offering invoice pricing + Costco Auto Program'
  },
  {
    model: 'Ford Mustang Mach-E / F-150 Lightning',
    promoApr: '0% APR for 72 Months',
    epaRange: '250–320 miles',
    msrpRange: '$39,995 – $54,995',
    federalAndDealerCash: '0% APR for 72 mos + Free Ford Power Promise Home Charger & Free Standard Home Installation!',
    chargingPerk: 'Includes Tesla Supercharger NACS adapter + Free 240V Home Charger installation',
    bestWhereToBuy: 'Volume Ford EV dealers at quarter-end (March, June, Sept, Dec)'
  },
  {
    model: 'Tesla Model Y / Model 3 Long Range',
    promoApr: '0% – 0.99% Promotional APR (60–72 Mos)',
    epaRange: '320–363 miles',
    msrpRange: '$38,990 – $47,990',
    federalAndDealerCash: '$7,500 Instant Point-of-Sale Federal EV Credit + Inventory Discounts ($1,500–$3,000 off existing inventory)',
    chargingPerk: 'Full native Tesla Supercharger network access + zero dealer markups (direct online ordering)',
    bestWhereToBuy: 'Tesla.com -> "Existing Inventory" during the last 2 weeks of March, June, September, or December'
  },
  {
    model: 'Kia EV6 / Kia EV9 (3-Row Family SUV)',
    promoApr: '0% APR for 60–72 Months',
    epaRange: '280–310 miles',
    msrpRange: '$42,600 – $56,000',
    federalAndDealerCash: '0% APR for 72 mos OR up to $7,500–$10,000 Customer Cash',
    chargingPerk: '1,000 kWh free Electrify America fast charging (~3,500 miles of free road trips)',
    bestWhereToBuy: 'High-volume Kia EV dealers competing on end-of-month internet quotes'
  },
  {
    model: 'Toyota bZ4X / Subaru Solterra',
    promoApr: '0% APR for 72 Months',
    epaRange: '227–252 miles',
    msrpRange: '$37,070 – $44,995',
    federalAndDealerCash: '0% APR for 72 mos + $2,500–$5,000 TFS/Chase cash or $199/mo lease specials',
    chargingPerk: '1 year of complimentary EVgo / ChargePoint charging + standard AWD safety suite',
    bestWhereToBuy: 'Credit-union partnered or Costco Auto certified Toyota/Subaru Fleet Departments'
  }
];

export const EV_REBATE_STACK_PROGRAMS = [
  {
    name: 'Federal Clean Vehicle Point-of-Sale Credit (IRS 30D)',
    amount: 'Up to $7,500 Instant Off at Dealer',
    eligibility: 'Income cap: $300k Married Filing Jointly / $225k Head of Household / $150k Single. Transferred to dealer at purchase so it reduces your loan principal on Day 1.'
  },
  {
    name: 'California Clean Cars 4 All / Replace Your Ride',
    amount: 'Up to $9,500 – $12,000 Grant',
    eligibility: 'For California households (Bay Area BAAQMD, Sacramento, San Joaquin, SoCal SCAQMD) retiring an older 2010 or older gas car and switching to an EV.'
  },
  {
    name: 'PG&E Pre-Owned & Residential EV Rebate + Charger Rebate',
    amount: '$1,000 – $4,000 Rebate + $700 Charger Rebate',
    eligibility: 'PG&E customers (especially CARE/FERA enrolled households) qualify for enhanced rebates on EV purchases and 240V smart home charger installations.'
  },
  {
    name: 'Costco Auto Program / Supplier Friends & Family Pricing',
    amount: '$1,000 – $2,500 Additional Instant Rebate',
    eligibility: 'Active Costco members frequently receive $1,000+ stackable member-only incentives on Chevy, Volvo, Polestar, and GMC EVs on top of 0% APR.'
  }
];

// Major Health Insurance Providers & Common Exact Plans
export const MAJOR_HEALTH_PLANS = [
  // UnitedHealthcare
  {
    id: 'uhc-choice-plus',
    provider: 'UnitedHealthcare',
    planName: 'Choice Plus (PPO)',
    network: 'PPO',
    copays: { primaryCare: 25, specialist: 50, urgentCare: 35, er: 250, rxGeneric: 10 }
  },
  {
    id: 'uhc-navigate',
    provider: 'UnitedHealthcare',
    planName: 'Navigate (HMO)',
    network: 'HMO',
    copays: { primaryCare: 20, specialist: 40, urgentCare: 30, er: 200, rxGeneric: 10 }
  },
  {
    id: 'uhc-charter',
    provider: 'UnitedHealthcare',
    planName: 'Charter (EPO/HMO)',
    network: 'EPO/HMO',
    copays: { primaryCare: 20, specialist: 40, urgentCare: 30, er: 200, rxGeneric: 10 }
  },
  {
    id: 'uhc-nexus-aco',
    provider: 'UnitedHealthcare',
    planName: 'NexusACO (Open Access)',
    network: 'ACO',
    copays: { primaryCare: 20, specialist: 40, urgentCare: 30, er: 250, rxGeneric: 10 }
  },
  {
    id: 'uhc-dual-complete',
    provider: 'UnitedHealthcare',
    planName: 'Dual Complete (HMO-POS D-SNP)',
    network: 'Medicare Advantage D-SNP',
    copays: { primaryCare: 0, specialist: 0, urgentCare: 0, er: 0, rxGeneric: 0 }
  },
  {
    id: 'uhc-aarp-medicare',
    provider: 'UnitedHealthcare',
    planName: 'AARP Medicare Advantage (HMO-POS / PPO)',
    network: 'Medicare Advantage',
    copays: { primaryCare: 0, specialist: 35, urgentCare: 30, er: 120, rxGeneric: 4 }
  },
  {
    id: 'uhc-community',
    provider: 'UnitedHealthcare',
    planName: 'Community Plan (Medicaid / CHIP)',
    network: 'Medicaid / CHIP',
    copays: { primaryCare: 0, specialist: 0, urgentCare: 0, er: 0, rxGeneric: 0 }
  },

  // Kaiser Permanente
  {
    id: 'kaiser-traditional-hmo',
    provider: 'Kaiser Permanente',
    planName: 'Traditional HMO',
    network: 'HMO',
    copays: { primaryCare: 15, specialist: 30, urgentCare: 20, er: 100, rxGeneric: 10 }
  },
  {
    id: 'kaiser-deductible-hmo',
    provider: 'Kaiser Permanente',
    planName: 'Deductible HMO (Silver / Bronze)',
    network: 'HMO',
    copays: { primaryCare: 35, specialist: 50, urgentCare: 35, er: 250, rxGeneric: 15 }
  },
  {
    id: 'kaiser-gold-hmo',
    provider: 'Kaiser Permanente',
    planName: 'Gold / Platinum HMO',
    network: 'HMO',
    copays: { primaryCare: 10, specialist: 20, urgentCare: 15, er: 100, rxGeneric: 5 }
  },
  {
    id: 'kaiser-senior-advantage',
    provider: 'Kaiser Permanente',
    planName: 'Senior Advantage (Medicare HMO)',
    network: 'Medicare Advantage HMO',
    copays: { primaryCare: 5, specialist: 15, urgentCare: 10, er: 75, rxGeneric: 3 }
  },
  {
    id: 'kaiser-added-choice',
    provider: 'Kaiser Permanente',
    planName: 'Added Choice (POS)',
    network: 'POS',
    copays: { primaryCare: 25, specialist: 40, urgentCare: 30, er: 150, rxGeneric: 15 }
  },

  // Blue Cross Blue Shield / Anthem
  {
    id: 'bcbs-blue-choice-ppo',
    provider: 'Blue Cross Blue Shield',
    planName: 'Blue Choice (PPO)',
    network: 'PPO',
    copays: { primaryCare: 25, specialist: 45, urgentCare: 35, er: 250, rxGeneric: 10 }
  },
  {
    id: 'bcbs-blue-preferred-epo',
    provider: 'Blue Cross Blue Shield',
    planName: 'Blue Preferred (EPO)',
    network: 'EPO',
    copays: { primaryCare: 25, specialist: 45, urgentCare: 30, er: 200, rxGeneric: 10 }
  },
  {
    id: 'bcbs-blue-care-hmo',
    provider: 'Blue Cross Blue Shield',
    planName: 'Blue Care (HMO)',
    network: 'HMO',
    copays: { primaryCare: 20, specialist: 40, urgentCare: 25, er: 175, rxGeneric: 10 }
  },
  {
    id: 'anthem-prudent-buyer-ppo',
    provider: 'Anthem Blue Cross',
    planName: 'Prudent Buyer PPO',
    network: 'PPO',
    copays: { primaryCare: 25, specialist: 45, urgentCare: 35, er: 250, rxGeneric: 10 }
  },
  {
    id: 'anthem-select-hmo',
    provider: 'Anthem Blue Cross',
    planName: 'Select HMO',
    network: 'HMO',
    copays: { primaryCare: 20, specialist: 40, urgentCare: 25, er: 175, rxGeneric: 10 }
  },
  {
    id: 'bcbs-fep-standard',
    provider: 'Blue Cross Blue Shield',
    planName: 'Federal Employee Program (FEP) Standard PPO',
    network: 'Federal PPO',
    copays: { primaryCare: 30, specialist: 40, urgentCare: 35, er: 250, rxGeneric: 10 }
  },
  {
    id: 'bcbs-fep-basic',
    provider: 'Blue Cross Blue Shield',
    planName: 'Federal Employee Program (FEP) Basic',
    network: 'Federal PPO',
    copays: { primaryCare: 35, specialist: 45, urgentCare: 35, er: 250, rxGeneric: 15 }
  },
  {
    id: 'blue-shield-ca-trio',
    provider: 'Blue Shield of California',
    planName: 'Trio HMO',
    network: 'HMO',
    copays: { primaryCare: 20, specialist: 35, urgentCare: 25, er: 150, rxGeneric: 10 }
  },
  {
    id: 'blue-shield-ca-access-plus',
    provider: 'Blue Shield of California',
    planName: 'Access+ HMO',
    network: 'HMO',
    copays: { primaryCare: 25, specialist: 40, urgentCare: 30, er: 150, rxGeneric: 10 }
  },

  // Aetna
  {
    id: 'aetna-choice-pos-2',
    provider: 'Aetna',
    planName: 'Choice POS II (Open Access)',
    network: 'POS',
    copays: { primaryCare: 25, specialist: 45, urgentCare: 35, er: 250, rxGeneric: 12 }
  },
  {
    id: 'aetna-open-choice-ppo',
    provider: 'Aetna',
    planName: 'Open Choice (PPO)',
    network: 'PPO',
    copays: { primaryCare: 30, specialist: 50, urgentCare: 40, er: 300, rxGeneric: 15 }
  },
  {
    id: 'aetna-select-hmo',
    provider: 'Aetna',
    planName: 'Select (HMO / EPO)',
    network: 'HMO/EPO',
    copays: { primaryCare: 20, specialist: 35, urgentCare: 30, er: 200, rxGeneric: 10 }
  },
  {
    id: 'aetna-medicare-advantage',
    provider: 'Aetna',
    planName: 'Aetna Medicare Advantage (PPO / HMO)',
    network: 'Medicare Advantage',
    copays: { primaryCare: 0, specialist: 30, urgentCare: 25, er: 100, rxGeneric: 4 }
  },

  // Cigna
  {
    id: 'cigna-open-access-plus',
    provider: 'Cigna Healthcare',
    planName: 'Open Access Plus (OAP)',
    network: 'OAP/PPO',
    copays: { primaryCare: 25, specialist: 45, urgentCare: 35, er: 250, rxGeneric: 12 }
  },
  {
    id: 'cigna-localplus',
    provider: 'Cigna Healthcare',
    planName: 'LocalPlus',
    network: 'HMO/EPO',
    copays: { primaryCare: 20, specialist: 40, urgentCare: 30, er: 200, rxGeneric: 10 }
  },
  {
    id: 'cigna-connect',
    provider: 'Cigna Healthcare',
    planName: 'Connect (Marketplace HMO/EPO)',
    network: 'Marketplace',
    copays: { primaryCare: 30, specialist: 55, urgentCare: 40, er: 300, rxGeneric: 15 }
  },
  {
    id: 'cigna-true-choice-medicare',
    provider: 'Cigna Healthcare',
    planName: 'True Choice Medicare (PPO)',
    network: 'Medicare Advantage',
    copays: { primaryCare: 0, specialist: 35, urgentCare: 25, er: 120, rxGeneric: 4 }
  },

  // Humana
  {
    id: 'humana-gold-plus',
    provider: 'Humana',
    planName: 'Gold Plus (HMO)',
    network: 'Medicare Advantage HMO',
    copays: { primaryCare: 0, specialist: 25, urgentCare: 20, er: 100, rxGeneric: 3 }
  },
  {
    id: 'humana-choice-ppo',
    provider: 'Humana',
    planName: 'Humana Choice (PPO)',
    network: 'Medicare Advantage PPO',
    copays: { primaryCare: 0, specialist: 35, urgentCare: 30, er: 125, rxGeneric: 5 }
  },
  {
    id: 'humana-commercial-ppo',
    provider: 'Humana',
    planName: 'Commercial Open Access PPO',
    network: 'PPO',
    copays: { primaryCare: 30, specialist: 50, urgentCare: 35, er: 250, rxGeneric: 15 }
  },

  // Centene / Ambetter / Wellcare / Health Net
  {
    id: 'ambetter-complete',
    provider: 'Ambetter',
    planName: 'Complete (Silver HMO)',
    network: 'Marketplace HMO',
    copays: { primaryCare: 20, specialist: 40, urgentCare: 30, er: 250, rxGeneric: 15 }
  },
  {
    id: 'wellcare-medicare-hmo',
    provider: 'Wellcare',
    planName: 'Medicare Advantage (HMO)',
    network: 'Medicare Advantage',
    copays: { primaryCare: 0, specialist: 25, urgentCare: 20, er: 100, rxGeneric: 0 }
  },
  {
    id: 'health-net-communitycare',
    provider: 'Health Net',
    planName: 'CommunityCare HMO',
    network: 'HMO',
    copays: { primaryCare: 15, specialist: 30, urgentCare: 25, er: 150, rxGeneric: 10 }
  },

  // Molina Healthcare
  {
    id: 'molina-marketplace-hmo',
    provider: 'Molina Healthcare',
    planName: 'Marketplace HMO',
    network: 'Marketplace HMO',
    copays: { primaryCare: 20, specialist: 40, urgentCare: 30, er: 250, rxGeneric: 15 }
  },
  {
    id: 'molina-complete-care',
    provider: 'Molina Healthcare',
    planName: 'Complete Care (Medicaid / Medi-Cal)',
    network: 'Medicaid',
    copays: { primaryCare: 0, specialist: 0, urgentCare: 0, er: 0, rxGeneric: 0 }
  },

  // Government & State Programs
  {
    id: 'medical-california',
    provider: 'Medi-Cal',
    planName: 'California Medicaid (Full Scope)',
    network: 'State Medicaid',
    copays: { primaryCare: 0, specialist: 0, urgentCare: 0, er: 0, rxGeneric: 0 }
  },
  {
    id: 'medicare-part-ab',
    provider: 'Medicare',
    planName: 'Original Medicare (Part A & Part B)',
    network: 'Federal Medicare',
    copays: { primaryCare: 20, specialist: 40, urgentCare: 30, er: 150, rxGeneric: 10 }
  },
  {
    id: 'medigap-plan-g',
    provider: 'Medicare Supplement',
    planName: 'Medigap Plan G',
    network: 'Medicare Supplement',
    copays: { primaryCare: 0, specialist: 0, urgentCare: 0, er: 0, rxGeneric: 0 }
  },
  {
    id: 'tricare-prime',
    provider: 'TRICARE',
    planName: 'TRICARE Prime (Military)',
    network: 'Military Health',
    copays: { primaryCare: 0, specialist: 0, urgentCare: 0, er: 0, rxGeneric: 0 }
  },
  {
    id: 'tricare-select',
    provider: 'TRICARE',
    planName: 'TRICARE Select (Military PPO)',
    network: 'Military Health',
    copays: { primaryCare: 22, specialist: 33, urgentCare: 25, er: 70, rxGeneric: 12 }
  },
  {
    id: 'va-health-care',
    provider: 'VA Health Care',
    planName: 'Veterans Affairs Health Benefits',
    network: 'Veterans Affairs',
    copays: { primaryCare: 0, specialist: 0, urgentCare: 0, er: 0, rxGeneric: 0 }
  }
];

// Comprehensive database of popular vehicles with pre-filled specs (Fuel, MPG, kWh/100mi, Battery kWh)
export const POPULAR_CAR_DATABASE = [
  // Acura
  { fullName: 'Acura MDX Type S', make: 'Acura', model: 'MDX Type S', type: 'gas', mpgOrEfficiency: 19, fuelGrade: 'premium', defaultInsurance: 165 },
  { fullName: 'Acura MDX A-Spec / Advance', make: 'Acura', model: 'MDX A-Spec', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'premium', defaultInsurance: 155 },
  { fullName: 'Acura RDX A-Spec', make: 'Acura', model: 'RDX A-Spec', type: 'gas', mpgOrEfficiency: 23, fuelGrade: 'premium', defaultInsurance: 145 },
  { fullName: 'Acura Integra A-Spec / Type S', make: 'Acura', model: 'Integra A-Spec', type: 'gas', mpgOrEfficiency: 32, fuelGrade: 'premium', defaultInsurance: 140 },
  { fullName: 'Acura ZDX (EV)', make: 'Acura', model: 'ZDX Type S', type: 'ev', mpgOrEfficiency: 35, batteryKwh: 102, fuelGrade: 'electric', defaultInsurance: 175 },

  // Audi & Porsche
  { fullName: 'Audi A4 45 TFSI Premium Plus', make: 'Audi', model: 'A4 Premium Plus', type: 'gas', mpgOrEfficiency: 27, fuelGrade: 'premium', defaultInsurance: 160 },
  { fullName: 'Audi A6 55 TFSI', make: 'Audi', model: 'A6 55 TFSI', type: 'gas', mpgOrEfficiency: 24, fuelGrade: 'premium', defaultInsurance: 175 },
  { fullName: 'Audi Q5 45 TFSI Premium Plus', make: 'Audi', model: 'Q5 Premium Plus', type: 'gas', mpgOrEfficiency: 25, fuelGrade: 'premium', defaultInsurance: 160 },
  { fullName: 'Audi Q5 55 TFSI e (PHEV)', make: 'Audi', model: 'Q5 PHEV', type: 'phev', mpgOrEfficiency: 27, fuelGrade: 'premium', defaultInsurance: 165 },
  { fullName: 'Audi Q7 55 TFSI Prestige', make: 'Audi', model: 'Q7 Prestige', type: 'gas', mpgOrEfficiency: 20, fuelGrade: 'premium', defaultInsurance: 180 },
  { fullName: 'Audi Q8 e-tron (EV)', make: 'Audi', model: 'Q8 e-tron', type: 'ev', mpgOrEfficiency: 39, batteryKwh: 114, fuelGrade: 'electric', defaultInsurance: 185 },
  { fullName: 'Audi Q4 e-tron (EV)', make: 'Audi', model: 'Q4 e-tron', type: 'ev', mpgOrEfficiency: 33, batteryKwh: 82, fuelGrade: 'electric', defaultInsurance: 155 },
  { fullName: 'Porsche Macan (Gas)', make: 'Porsche', model: 'Macan GTS', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'premium', defaultInsurance: 185 },
  { fullName: 'Porsche Macan EV', make: 'Porsche', model: 'Macan EV', type: 'ev', mpgOrEfficiency: 35, batteryKwh: 100, fuelGrade: 'electric', defaultInsurance: 200 },
  { fullName: 'Porsche Cayenne S / E-Hybrid', make: 'Porsche', model: 'Cayenne S', type: 'gas', mpgOrEfficiency: 19, fuelGrade: 'premium', defaultInsurance: 200 },
  { fullName: 'Porsche Taycan 4S (EV)', make: 'Porsche', model: 'Taycan 4S', type: 'ev', mpgOrEfficiency: 36, batteryKwh: 93.4, fuelGrade: 'electric', defaultInsurance: 225 },

  // BMW
  { fullName: 'BMW 330i Sedan (M Sport)', make: 'BMW', model: '330i M Sport', type: 'gas', mpgOrEfficiency: 29, fuelGrade: 'premium', defaultInsurance: 160 },
  { fullName: 'BMW 330e (PHEV)', make: 'BMW', model: '330e PHEV', type: 'phev', mpgOrEfficiency: 28, fuelGrade: 'premium', defaultInsurance: 160 },
  { fullName: 'BMW M340i xDrive', make: 'BMW', model: 'M340i', type: 'gas', mpgOrEfficiency: 26, fuelGrade: 'premium', defaultInsurance: 175 },
  { fullName: 'BMW 530i / 540i Sedan', make: 'BMW', model: '530i M Sport', type: 'gas', mpgOrEfficiency: 27, fuelGrade: 'premium', defaultInsurance: 170 },
  { fullName: 'BMW X3 xDrive30i M Sport', make: 'BMW', model: 'X3 xDrive30i', type: 'gas', mpgOrEfficiency: 25, fuelGrade: 'premium', defaultInsurance: 155 },
  { fullName: 'BMW X3 M50', make: 'BMW', model: 'X3 M50', type: 'gas', mpgOrEfficiency: 24, fuelGrade: 'premium', defaultInsurance: 170 },
  { fullName: 'BMW X5 xDrive40i M Sport', make: 'BMW', model: 'X5 xDrive40i', type: 'gas', mpgOrEfficiency: 25, fuelGrade: 'premium', defaultInsurance: 175 },
  { fullName: 'BMW X5 xDrive50e (PHEV)', make: 'BMW', model: 'X5 PHEV', type: 'phev', mpgOrEfficiency: 22, fuelGrade: 'premium', defaultInsurance: 180 },
  { fullName: 'BMW X7 xDrive40i', make: 'BMW', model: 'X7 xDrive40i', type: 'gas', mpgOrEfficiency: 22, fuelGrade: 'premium', defaultInsurance: 195 },
  { fullName: 'BMW i4 eDrive40 / M50 (EV)', make: 'BMW', model: 'i4 eDrive40', type: 'ev', mpgOrEfficiency: 31, batteryKwh: 81.2, fuelGrade: 'electric', defaultInsurance: 170 },
  { fullName: 'BMW iX xDrive50 (EV)', make: 'BMW', model: 'iX xDrive50', type: 'ev', mpgOrEfficiency: 36, batteryKwh: 105.2, fuelGrade: 'electric', defaultInsurance: 195 },

  // Buick & Cadillac
  { fullName: 'Buick Enclave Avenir', make: 'Buick', model: 'Enclave Avenir', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Buick Envision Avenir', make: 'Buick', model: 'Envision Avenir', type: 'gas', mpgOrEfficiency: 26, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Cadillac Escalade Premium Luxury', make: 'Cadillac', model: 'Escalade Premium Luxury', type: 'gas', mpgOrEfficiency: 16, fuelGrade: 'premium', defaultInsurance: 195 },
  { fullName: 'Cadillac Lyriq Sport / Luxury (EV)', make: 'Cadillac', model: 'Lyriq Sport', type: 'ev', mpgOrEfficiency: 34, batteryKwh: 102, fuelGrade: 'electric', defaultInsurance: 170 },
  { fullName: 'Cadillac XT5 Premium Luxury', make: 'Cadillac', model: 'XT5 Premium Luxury', type: 'gas', mpgOrEfficiency: 24, fuelGrade: 'regular', defaultInsurance: 140 },

  // Chevrolet (Full Comprehensive Trims including Traverse Premier, RS, LT, Tahoe, Suburban, etc.)
  { fullName: 'Chevrolet Traverse Premier', make: 'Chevrolet', model: 'Traverse Premier', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Chevrolet Traverse RS', make: 'Chevrolet', model: 'Traverse RS', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Chevrolet Traverse Z71', make: 'Chevrolet', model: 'Traverse Z71', type: 'gas', mpgOrEfficiency: 20, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Chevrolet Traverse High Country', make: 'Chevrolet', model: 'Traverse High Country', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Chevrolet Traverse LT', make: 'Chevrolet', model: 'Traverse LT', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 130 },
  { fullName: 'Chevrolet Traverse LS', make: 'Chevrolet', model: 'Traverse LS', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Chevrolet Tahoe Premier', make: 'Chevrolet', model: 'Tahoe Premier', type: 'gas', mpgOrEfficiency: 17, fuelGrade: 'regular', defaultInsurance: 165 },
  { fullName: 'Chevrolet Tahoe High Country', make: 'Chevrolet', model: 'Tahoe High Country', type: 'gas', mpgOrEfficiency: 16, fuelGrade: 'premium', defaultInsurance: 170 },
  { fullName: 'Chevrolet Tahoe RST', make: 'Chevrolet', model: 'Tahoe RST', type: 'gas', mpgOrEfficiency: 17, fuelGrade: 'regular', defaultInsurance: 160 },
  { fullName: 'Chevrolet Tahoe Z71', make: 'Chevrolet', model: 'Tahoe Z71', type: 'gas', mpgOrEfficiency: 17, fuelGrade: 'regular', defaultInsurance: 160 },
  { fullName: 'Chevrolet Tahoe LT', make: 'Chevrolet', model: 'Tahoe LT', type: 'gas', mpgOrEfficiency: 17, fuelGrade: 'regular', defaultInsurance: 155 },
  { fullName: 'Chevrolet Suburban Premier', make: 'Chevrolet', model: 'Suburban Premier', type: 'gas', mpgOrEfficiency: 16, fuelGrade: 'regular', defaultInsurance: 170 },
  { fullName: 'Chevrolet Suburban High Country', make: 'Chevrolet', model: 'Suburban High Country', type: 'gas', mpgOrEfficiency: 16, fuelGrade: 'premium', defaultInsurance: 175 },
  { fullName: 'Chevrolet Suburban LT', make: 'Chevrolet', model: 'Suburban LT', type: 'gas', mpgOrEfficiency: 16, fuelGrade: 'regular', defaultInsurance: 165 },
  { fullName: 'Chevrolet Silverado 1500 High Country', make: 'Chevrolet', model: 'Silverado 1500 High Country', type: 'gas', mpgOrEfficiency: 18, fuelGrade: 'regular', defaultInsurance: 150 },
  { fullName: 'Chevrolet Silverado 1500 LT / RST', make: 'Chevrolet', model: 'Silverado 1500 LT', type: 'gas', mpgOrEfficiency: 19, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Chevrolet Silverado 1500 Trail Boss', make: 'Chevrolet', model: 'Silverado 1500 Trail Boss', type: 'gas', mpgOrEfficiency: 17, fuelGrade: 'regular', defaultInsurance: 145 },
  { fullName: 'Chevrolet Silverado EV RST (EV)', make: 'Chevrolet', model: 'Silverado EV RST', type: 'ev', mpgOrEfficiency: 48, batteryKwh: 131, fuelGrade: 'electric', defaultInsurance: 170 },
  { fullName: 'Chevrolet Equinox Premier (Gas)', make: 'Chevrolet', model: 'Equinox Premier', type: 'gas', mpgOrEfficiency: 28, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Chevrolet Equinox RS / LT (Gas)', make: 'Chevrolet', model: 'Equinox RS', type: 'gas', mpgOrEfficiency: 28, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Chevrolet Equinox EV RS / LT (EV)', make: 'Chevrolet', model: 'Equinox EV 2RS', type: 'ev', mpgOrEfficiency: 30, batteryKwh: 85, fuelGrade: 'electric', defaultInsurance: 130 },
  { fullName: 'Chevrolet Blazer RS / Premier', make: 'Chevrolet', model: 'Blazer RS', type: 'gas', mpgOrEfficiency: 22, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Chevrolet Blazer EV RS / LT (EV)', make: 'Chevrolet', model: 'Blazer EV RS', type: 'ev', mpgOrEfficiency: 34, batteryKwh: 85, fuelGrade: 'electric', defaultInsurance: 145 },
  { fullName: 'Chevrolet Trax 2RS / Activ / LT', make: 'Chevrolet', model: 'Trax 2RS', type: 'gas', mpgOrEfficiency: 30, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Chevrolet Trailblazer RS / Activ', make: 'Chevrolet', model: 'Trailblazer RS', type: 'gas', mpgOrEfficiency: 31, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Chevrolet Colorado ZR2 / Z71 / LT', make: 'Chevrolet', model: 'Colorado ZR2', type: 'gas', mpgOrEfficiency: 19, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Chevrolet Malibu Premier / LT', make: 'Chevrolet', model: 'Malibu Premier', type: 'gas', mpgOrEfficiency: 31, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Chevrolet Corvette Stingray / Z06', make: 'Chevrolet', model: 'Corvette Stingray', type: 'gas', mpgOrEfficiency: 19, fuelGrade: 'premium', defaultInsurance: 185 },
  { fullName: 'Chevrolet Camaro SS / LT', make: 'Chevrolet', model: 'Camaro SS', type: 'gas', mpgOrEfficiency: 20, fuelGrade: 'premium', defaultInsurance: 165 },
  { fullName: 'Chevrolet Bolt EV / EUV Premier (EV)', make: 'Chevrolet', model: 'Bolt EUV Premier', type: 'ev', mpgOrEfficiency: 28, batteryKwh: 65, fuelGrade: 'electric', defaultInsurance: 115 },

  // Chrysler, Dodge & Ram
  { fullName: 'Chrysler Pacifica Pinnacle Hybrid (PHEV)', make: 'Chrysler', model: 'Pacifica Hybrid', type: 'phev', mpgOrEfficiency: 30, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Dodge Durango R/T / SRT', make: 'Dodge', model: 'Durango R/T', type: 'gas', mpgOrEfficiency: 17, fuelGrade: 'regular', defaultInsurance: 155 },
  { fullName: 'Dodge Durango GT / SXT', make: 'Dodge', model: 'Durango GT', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Dodge Charger / Challenger R/T', make: 'Dodge', model: 'Charger R/T', type: 'gas', mpgOrEfficiency: 19, fuelGrade: 'premium', defaultInsurance: 170 },
  { fullName: 'Ram 1500 Limited / Longhorn', make: 'Ram', model: '1500 Limited', type: 'gas', mpgOrEfficiency: 19, fuelGrade: 'regular', defaultInsurance: 155 },
  { fullName: 'Ram 1500 Laramie / Bighorn', make: 'Ram', model: '1500 Laramie', type: 'gas', mpgOrEfficiency: 20, fuelGrade: 'regular', defaultInsurance: 145 },

  // Ford
  { fullName: 'Ford F-150 Lariat / Platinum / King Ranch', make: 'Ford', model: 'F-150 Lariat', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 150 },
  { fullName: 'Ford F-150 XLT / STX (Gas)', make: 'Ford', model: 'F-150 XLT', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Ford F-150 PowerBoost Hybrid', make: 'Ford', model: 'F-150 Hybrid', type: 'hybrid', mpgOrEfficiency: 24, fuelGrade: 'regular', defaultInsurance: 145 },
  { fullName: 'Ford F-150 Lightning Lariat / Platinum (EV)', make: 'Ford', model: 'F-150 Lightning Lariat', type: 'ev', mpgOrEfficiency: 48, batteryKwh: 98, fuelGrade: 'electric', defaultInsurance: 165 },
  { fullName: 'Ford Mustang Mach-E Premium / GT (EV)', make: 'Ford', model: 'Mustang Mach-E Premium', type: 'ev', mpgOrEfficiency: 33, batteryKwh: 72, fuelGrade: 'electric', defaultInsurance: 145 },
  { fullName: 'Ford Explorer Limited / Platinum / ST', make: 'Ford', model: 'Explorer Limited', type: 'gas', mpgOrEfficiency: 24, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Ford Maverick Lariat Hybrid', make: 'Ford', model: 'Maverick Hybrid', type: 'hybrid', mpgOrEfficiency: 42, fuelGrade: 'regular', defaultInsurance: 110 },
  { fullName: 'Ford Escape ST-Line / Titanium Hybrid', make: 'Ford', model: 'Escape Hybrid', type: 'hybrid', mpgOrEfficiency: 42, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Ford Bronco Badlands / Outer Banks', make: 'Ford', model: 'Bronco Badlands', type: 'gas', mpgOrEfficiency: 20, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Ford Mustang GT Premium (5.0L V8)', make: 'Ford', model: 'Mustang GT Premium', type: 'gas', mpgOrEfficiency: 18, fuelGrade: 'premium', defaultInsurance: 165 },

  // Genesis & Hyundai
  { fullName: 'Genesis GV70 Electrified (EV)', make: 'Genesis', model: 'GV70 Electrified', type: 'ev', mpgOrEfficiency: 35, batteryKwh: 77.4, fuelGrade: 'electric', defaultInsurance: 165 },
  { fullName: 'Genesis GV80 3.5T Prestige', make: 'Genesis', model: 'GV80 Prestige', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'premium', defaultInsurance: 175 },
  { fullName: 'Genesis G70 / G80 Sport', make: 'Genesis', model: 'G70 Sport', type: 'gas', mpgOrEfficiency: 24, fuelGrade: 'premium', defaultInsurance: 160 },
  { fullName: 'Hyundai Ioniq 5 Limited (EV)', make: 'Hyundai', model: 'Ioniq 5 Limited', type: 'ev', mpgOrEfficiency: 29, batteryKwh: 77.4, fuelGrade: 'electric', defaultInsurance: 135 },
  { fullName: 'Hyundai Ioniq 6 Limited (EV)', make: 'Hyundai', model: 'Ioniq 6 Limited', type: 'ev', mpgOrEfficiency: 26, batteryKwh: 77.4, fuelGrade: 'electric', defaultInsurance: 135 },
  { fullName: 'Hyundai Palisade Calligraphy', make: 'Hyundai', model: 'Palisade Calligraphy', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Hyundai Santa Fe Calligraphy Hybrid', make: 'Hyundai', model: 'Santa Fe Calligraphy Hybrid', type: 'hybrid', mpgOrEfficiency: 36, fuelGrade: 'regular', defaultInsurance: 130 },
  { fullName: 'Hyundai Tucson Limited Hybrid', make: 'Hyundai', model: 'Tucson Limited Hybrid', type: 'hybrid', mpgOrEfficiency: 38, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Hyundai Elantra Limited / Hybrid', make: 'Hyundai', model: 'Elantra Limited', type: 'hybrid', mpgOrEfficiency: 54, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Hyundai Kona Electric Limited (EV)', make: 'Hyundai', model: 'Kona Electric Limited', type: 'ev', mpgOrEfficiency: 27, batteryKwh: 64.8, fuelGrade: 'electric', defaultInsurance: 125 },

  // GMC
  { fullName: 'GMC Sierra 1500 Denali / Ultimate', make: 'GMC', model: 'Sierra 1500 Denali', type: 'gas', mpgOrEfficiency: 18, fuelGrade: 'regular', defaultInsurance: 160 },
  { fullName: 'GMC Sierra 1500 AT4 / SLT', make: 'GMC', model: 'Sierra 1500 AT4', type: 'gas', mpgOrEfficiency: 19, fuelGrade: 'regular', defaultInsurance: 150 },
  { fullName: 'GMC Yukon Denali / Ultimate', make: 'GMC', model: 'Yukon Denali', type: 'gas', mpgOrEfficiency: 16, fuelGrade: 'regular', defaultInsurance: 175 },
  { fullName: 'GMC Yukon AT4 / SLT', make: 'GMC', model: 'Yukon AT4', type: 'gas', mpgOrEfficiency: 17, fuelGrade: 'regular', defaultInsurance: 165 },
  { fullName: 'GMC Acadia Denali / AT4', make: 'GMC', model: 'Acadia Denali', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'GMC Terrain Denali / SLT', make: 'GMC', model: 'Terrain Denali', type: 'gas', mpgOrEfficiency: 26, fuelGrade: 'regular', defaultInsurance: 125 },

  // Honda
  { fullName: 'Honda Civic Touring / Sport Touring', make: 'Honda', model: 'Civic Touring', type: 'gas', mpgOrEfficiency: 36, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Honda Civic Sport / EX / LX', make: 'Honda', model: 'Civic Sport', type: 'gas', mpgOrEfficiency: 35, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Honda Civic Hybrid Sport Touring', make: 'Honda', model: 'Civic Hybrid Sport Touring', type: 'hybrid', mpgOrEfficiency: 50, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Honda Accord Touring Hybrid', make: 'Honda', model: 'Accord Touring Hybrid', type: 'hybrid', mpgOrEfficiency: 48, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Honda Accord Sport / EX-L', make: 'Honda', model: 'Accord Sport', type: 'gas', mpgOrEfficiency: 32, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Honda CR-V Sport Touring Hybrid', make: 'Honda', model: 'CR-V Sport Touring Hybrid', type: 'hybrid', mpgOrEfficiency: 40, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Honda CR-V EX-L / EX', make: 'Honda', model: 'CR-V EX-L', type: 'gas', mpgOrEfficiency: 30, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Honda Pilot Elite / Touring', make: 'Honda', model: 'Pilot Elite', type: 'gas', mpgOrEfficiency: 22, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Honda Odyssey Elite / Touring', make: 'Honda', model: 'Odyssey Elite', type: 'gas', mpgOrEfficiency: 22, fuelGrade: 'regular', defaultInsurance: 130 },
  { fullName: 'Honda HR-V Sport / EX-L', make: 'Honda', model: 'HR-V Sport', type: 'gas', mpgOrEfficiency: 28, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Honda Prologue Elite / Touring (EV)', make: 'Honda', model: 'Prologue Elite', type: 'ev', mpgOrEfficiency: 32, batteryKwh: 85, fuelGrade: 'electric', defaultInsurance: 140 },

  // Jeep
  { fullName: 'Jeep Grand Cherokee Summit Reserve', make: 'Jeep', model: 'Grand Cherokee Summit', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 160 },
  { fullName: 'Jeep Grand Cherokee 4xe Summit / Overland (PHEV)', make: 'Jeep', model: 'Grand Cherokee 4xe', type: 'phev', mpgOrEfficiency: 23, fuelGrade: 'regular', defaultInsurance: 160 },
  { fullName: 'Jeep Wrangler Rubicon 4xe (PHEV)', make: 'Jeep', model: 'Wrangler Rubicon 4xe', type: 'phev', mpgOrEfficiency: 20, fuelGrade: 'regular', defaultInsurance: 155 },
  { fullName: 'Jeep Wrangler Sahara / Sport', make: 'Jeep', model: 'Wrangler Sahara', type: 'gas', mpgOrEfficiency: 20, fuelGrade: 'regular', defaultInsurance: 145 },

  // Kia
  { fullName: 'Kia EV9 GT-Line 3-Row (EV)', make: 'Kia', model: 'EV9 GT-Line', type: 'ev', mpgOrEfficiency: 38, batteryKwh: 99.8, fuelGrade: 'electric', defaultInsurance: 160 },
  { fullName: 'Kia EV6 GT-Line / Wind (EV)', make: 'Kia', model: 'EV6 GT-Line', type: 'ev', mpgOrEfficiency: 29, batteryKwh: 77.4, fuelGrade: 'electric', defaultInsurance: 140 },
  { fullName: 'Kia Telluride SX Prestige / X-Line', make: 'Kia', model: 'Telluride SX Prestige', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Kia Sorento SX Prestige Hybrid', make: 'Kia', model: 'Sorento SX Prestige Hybrid', type: 'hybrid', mpgOrEfficiency: 37, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Kia Sportage SX Prestige Hybrid', make: 'Kia', model: 'Sportage SX Prestige Hybrid', type: 'hybrid', mpgOrEfficiency: 43, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Kia Carnival SX Prestige Hybrid', make: 'Kia', model: 'Carnival SX Prestige Hybrid', type: 'hybrid', mpgOrEfficiency: 33, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Kia K4 / Forte GT-Line', make: 'Kia', model: 'K4 GT-Line', type: 'gas', mpgOrEfficiency: 34, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Kia Niro EV Wave', make: 'Kia', model: 'Niro EV Wave', type: 'ev', mpgOrEfficiency: 28, batteryKwh: 64.8, fuelGrade: 'electric', defaultInsurance: 125 },

  // Lexus
  { fullName: 'Lexus RX 350 Luxury / F SPORT', make: 'Lexus', model: 'RX 350 Luxury', type: 'gas', mpgOrEfficiency: 25, fuelGrade: 'regular', defaultInsurance: 150 },
  { fullName: 'Lexus RX 350h / 500h F SPORT Hybrid', make: 'Lexus', model: 'RX 350h Hybrid', type: 'hybrid', mpgOrEfficiency: 36, fuelGrade: 'regular', defaultInsurance: 150 },
  { fullName: 'Lexus NX 350h / 450h+ Luxury', make: 'Lexus', model: 'NX 350h Luxury', type: 'hybrid', mpgOrEfficiency: 39, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Lexus ES 350 Ultra Luxury', make: 'Lexus', model: 'ES 350 Ultra Luxury', type: 'gas', mpgOrEfficiency: 26, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Lexus ES 300h Ultra Luxury Hybrid', make: 'Lexus', model: 'ES 300h Ultra Luxury', type: 'hybrid', mpgOrEfficiency: 44, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Lexus TX 350 / 500h F SPORT Luxury', make: 'Lexus', model: 'TX 350 Luxury', type: 'hybrid', mpgOrEfficiency: 23, fuelGrade: 'regular', defaultInsurance: 155 },
  { fullName: 'Lexus RZ 450e Luxury (EV)', make: 'Lexus', model: 'RZ 450e Luxury', type: 'ev', mpgOrEfficiency: 34, batteryKwh: 71.4, fuelGrade: 'electric', defaultInsurance: 160 },

  // Mazda
  { fullName: 'Mazda CX-5 2.5 Turbo Signature', make: 'Mazda', model: 'CX-5 2.5 Turbo Signature', type: 'gas', mpgOrEfficiency: 25, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Mazda CX-5 2.5 S Premium Plus', make: 'Mazda', model: 'CX-5 Premium Plus', type: 'gas', mpgOrEfficiency: 28, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Mazda CX-50 2.5 Turbo Meridian / Premium', make: 'Mazda', model: 'CX-50 Turbo', type: 'gas', mpgOrEfficiency: 25, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Mazda CX-90 Turbo S Premium Plus', make: 'Mazda', model: 'CX-90 Turbo S', type: 'gas', mpgOrEfficiency: 25, fuelGrade: 'premium', defaultInsurance: 145 },
  { fullName: 'Mazda CX-90 PHEV Premium Plus', make: 'Mazda', model: 'CX-90 PHEV', type: 'phev', mpgOrEfficiency: 25, fuelGrade: 'regular', defaultInsurance: 145 },
  { fullName: 'Mazda 3 2.5 Turbo Premium Plus', make: 'Mazda', model: 'Mazda 3 Turbo', type: 'gas', mpgOrEfficiency: 27, fuelGrade: 'regular', defaultInsurance: 120 },

  // Mercedes-Benz
  { fullName: 'Mercedes-Benz C300 Sedan (AMG Line)', make: 'Mercedes-Benz', model: 'C300 AMG Line', type: 'gas', mpgOrEfficiency: 29, fuelGrade: 'premium', defaultInsurance: 165 },
  { fullName: 'Mercedes-Benz E350 / E450 Sedan (AMG Line)', make: 'Mercedes-Benz', model: 'E350 AMG Line', type: 'gas', mpgOrEfficiency: 26, fuelGrade: 'premium', defaultInsurance: 180 },
  { fullName: 'Mercedes-Benz GLC 300 SUV (AMG Line)', make: 'Mercedes-Benz', model: 'GLC 300 AMG Line', type: 'gas', mpgOrEfficiency: 26, fuelGrade: 'premium', defaultInsurance: 165 },
  { fullName: 'Mercedes-Benz GLE 350 / 450 (AMG Line)', make: 'Mercedes-Benz', model: 'GLE 450 AMG Line', type: 'gas', mpgOrEfficiency: 22, fuelGrade: 'premium', defaultInsurance: 185 },
  { fullName: 'Mercedes-Benz GLS 450 / 580', make: 'Mercedes-Benz', model: 'GLS 450', type: 'gas', mpgOrEfficiency: 20, fuelGrade: 'premium', defaultInsurance: 205 },
  { fullName: 'Mercedes-Benz EQE 350+ SUV (EV)', make: 'Mercedes-Benz', model: 'EQE SUV', type: 'ev', mpgOrEfficiency: 37, batteryKwh: 90.6, fuelGrade: 'electric', defaultInsurance: 185 },
  { fullName: 'Mercedes-Benz EQS 450+ Sedan (EV)', make: 'Mercedes-Benz', model: 'EQS Sedan', type: 'ev', mpgOrEfficiency: 33, batteryKwh: 108.4, fuelGrade: 'electric', defaultInsurance: 215 },

  // Nissan
  { fullName: 'Nissan Rogue Platinum / SL', make: 'Nissan', model: 'Rogue Platinum', type: 'gas', mpgOrEfficiency: 33, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Nissan Rogue SV / S', make: 'Nissan', model: 'Rogue SV', type: 'gas', mpgOrEfficiency: 33, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Nissan Pathfinder Platinum / Rock Creek', make: 'Nissan', model: 'Pathfinder Platinum', type: 'gas', mpgOrEfficiency: 23, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Nissan Altima SR / SL', make: 'Nissan', model: 'Altima SR', type: 'gas', mpgOrEfficiency: 32, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Nissan Sentra SR / SV', make: 'Nissan', model: 'Sentra SR', type: 'gas', mpgOrEfficiency: 34, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Nissan Ariya Evolve+ / Empower+ (EV)', make: 'Nissan', model: 'Ariya Evolve+', type: 'ev', mpgOrEfficiency: 32, batteryKwh: 87, fuelGrade: 'electric', defaultInsurance: 145 },
  { fullName: 'Nissan Leaf SV Plus (EV)', make: 'Nissan', model: 'Leaf SV Plus', type: 'ev', mpgOrEfficiency: 30, batteryKwh: 60, fuelGrade: 'electric', defaultInsurance: 115 },

  // Rivian & Polestar
  { fullName: 'Rivian R1S Adventure / Quad-Motor (EV)', make: 'Rivian', model: 'R1S Adventure', type: 'ev', mpgOrEfficiency: 44, batteryKwh: 135, fuelGrade: 'electric', defaultInsurance: 195 },
  { fullName: 'Rivian R1T Adventure / Quad-Motor (EV)', make: 'Rivian', model: 'R1T Adventure', type: 'ev', mpgOrEfficiency: 45, batteryKwh: 135, fuelGrade: 'electric', defaultInsurance: 195 },
  { fullName: 'Polestar 2 Long Range Dual Motor (EV)', make: 'Polestar', model: 'Polestar 2 Dual Motor', type: 'ev', mpgOrEfficiency: 31, batteryKwh: 78, fuelGrade: 'electric', defaultInsurance: 155 },
  { fullName: 'Polestar 3 Performance SUV (EV)', make: 'Polestar', model: 'Polestar 3 Performance', type: 'ev', mpgOrEfficiency: 35, batteryKwh: 111, fuelGrade: 'electric', defaultInsurance: 180 },

  // Subaru
  { fullName: 'Subaru Outback Touring / Wilderness', make: 'Subaru', model: 'Outback Touring', type: 'gas', mpgOrEfficiency: 28, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Subaru Outback Premium / Limited', make: 'Subaru', model: 'Outback Limited', type: 'gas', mpgOrEfficiency: 29, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Subaru Forester Touring / Wilderness', make: 'Subaru', model: 'Forester Touring', type: 'gas', mpgOrEfficiency: 29, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Subaru Crosstrek Wilderness / Limited', make: 'Subaru', model: 'Crosstrek Limited', type: 'gas', mpgOrEfficiency: 30, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Subaru Ascent Touring (3-Row)', make: 'Subaru', model: 'Ascent Touring', type: 'gas', mpgOrEfficiency: 22, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Subaru Solterra Touring (EV)', make: 'Subaru', model: 'Solterra Touring', type: 'ev', mpgOrEfficiency: 31, batteryKwh: 72.8, fuelGrade: 'electric', defaultInsurance: 130 },

  // Tesla
  { fullName: 'Tesla Model Y Long Range AWD (EV)', make: 'Tesla', model: 'Model Y Long Range', type: 'ev', mpgOrEfficiency: 28, batteryKwh: 75, fuelGrade: 'electric', defaultInsurance: 165 },
  { fullName: 'Tesla Model Y Performance (EV)', make: 'Tesla', model: 'Model Y Performance', type: 'ev', mpgOrEfficiency: 30, batteryKwh: 75, fuelGrade: 'electric', defaultInsurance: 175 },
  { fullName: 'Tesla Model Y Standard RWD (EV)', make: 'Tesla', model: 'Model Y RWD', type: 'ev', mpgOrEfficiency: 26, batteryKwh: 60, fuelGrade: 'electric', defaultInsurance: 155 },
  { fullName: 'Tesla Model 3 Long Range AWD (EV)', make: 'Tesla', model: 'Model 3 Long Range', type: 'ev', mpgOrEfficiency: 24, batteryKwh: 75, fuelGrade: 'electric', defaultInsurance: 150 },
  { fullName: 'Tesla Model 3 Performance (EV)', make: 'Tesla', model: 'Model 3 Performance', type: 'ev', mpgOrEfficiency: 27, batteryKwh: 75, fuelGrade: 'electric', defaultInsurance: 165 },
  { fullName: 'Tesla Model 3 Standard RWD (EV)', make: 'Tesla', model: 'Model 3 RWD', type: 'ev', mpgOrEfficiency: 23, batteryKwh: 60, fuelGrade: 'electric', defaultInsurance: 145 },
  { fullName: 'Tesla Model X Plaid / AWD (EV)', make: 'Tesla', model: 'Model X Plaid', type: 'ev', mpgOrEfficiency: 34, batteryKwh: 100, fuelGrade: 'electric', defaultInsurance: 205 },
  { fullName: 'Tesla Model S Plaid / AWD (EV)', make: 'Tesla', model: 'Model S Plaid', type: 'ev', mpgOrEfficiency: 28, batteryKwh: 100, fuelGrade: 'electric', defaultInsurance: 200 },
  { fullName: 'Tesla Cybertruck Cyberbeast / AWD (EV)', make: 'Tesla', model: 'Cybertruck Cyberbeast', type: 'ev', mpgOrEfficiency: 42, batteryKwh: 123, fuelGrade: 'electric', defaultInsurance: 205 },

  // Toyota
  { fullName: 'Toyota Camry SE', make: 'Toyota', model: 'Camry SE', type: 'gas', mpgOrEfficiency: 32, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Toyota Camry XSE', make: 'Toyota', model: 'Camry XSE', type: 'gas', mpgOrEfficiency: 31, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Toyota Camry XLE', make: 'Toyota', model: 'Camry XLE', type: 'gas', mpgOrEfficiency: 31, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Toyota Camry LE', make: 'Toyota', model: 'Camry LE', type: 'gas', mpgOrEfficiency: 34, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Toyota Camry Hybrid SE', make: 'Toyota', model: 'Camry Hybrid SE', type: 'hybrid', mpgOrEfficiency: 47, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Toyota Camry Hybrid XLE', make: 'Toyota', model: 'Camry Hybrid XLE', type: 'hybrid', mpgOrEfficiency: 46, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Toyota Camry Hybrid LE', make: 'Toyota', model: 'Camry Hybrid LE', type: 'hybrid', mpgOrEfficiency: 51, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Toyota RAV4 XLE / Limited (Gas)', make: 'Toyota', model: 'RAV4 XLE', type: 'gas', mpgOrEfficiency: 30, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Toyota RAV4 Hybrid Limited / XSE', make: 'Toyota', model: 'RAV4 Hybrid Limited', type: 'hybrid', mpgOrEfficiency: 40, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Toyota RAV4 Prime XSE (PHEV)', make: 'Toyota', model: 'RAV4 Prime XSE', type: 'phev', mpgOrEfficiency: 38, fuelGrade: 'regular', defaultInsurance: 130 },
  { fullName: 'Toyota Prius Limited / XLE Hybrid', make: 'Toyota', model: 'Prius Limited', type: 'hybrid', mpgOrEfficiency: 57, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Toyota Prius Prime XSE (PHEV)', make: 'Toyota', model: 'Prius Prime XSE', type: 'phev', mpgOrEfficiency: 52, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Toyota Corolla SE / XSE', make: 'Toyota', model: 'Corolla SE', type: 'gas', mpgOrEfficiency: 35, fuelGrade: 'regular', defaultInsurance: 110 },
  { fullName: 'Toyota Corolla Hybrid SE / XLE', make: 'Toyota', model: 'Corolla Hybrid SE', type: 'hybrid', mpgOrEfficiency: 50, fuelGrade: 'regular', defaultInsurance: 110 },
  { fullName: 'Toyota Highlander Limited / Platinum', make: 'Toyota', model: 'Highlander Platinum', type: 'gas', mpgOrEfficiency: 25, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Toyota Highlander Hybrid Limited / Platinum', make: 'Toyota', model: 'Highlander Hybrid Platinum', type: 'hybrid', mpgOrEfficiency: 36, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Toyota Grand Highlander Hybrid MAX', make: 'Toyota', model: 'Grand Highlander Hybrid MAX', type: 'hybrid', mpgOrEfficiency: 27, fuelGrade: 'regular', defaultInsurance: 145 },
  { fullName: 'Toyota Tacoma TRD Pro / Off-Road', make: 'Toyota', model: 'Tacoma TRD Pro', type: 'gas', mpgOrEfficiency: 23, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Toyota Tundra 1794 / Platinum Hybrid', make: 'Toyota', model: 'Tundra Platinum Hybrid', type: 'hybrid', mpgOrEfficiency: 20, fuelGrade: 'regular', defaultInsurance: 150 },
  { fullName: 'Toyota Sienna Platinum / Limited Hybrid', make: 'Toyota', model: 'Sienna Platinum', type: 'hybrid', mpgOrEfficiency: 36, fuelGrade: 'regular', defaultInsurance: 130 },
  { fullName: 'Toyota bZ4X Limited (EV)', make: 'Toyota', model: 'bZ4X Limited', type: 'ev', mpgOrEfficiency: 28, batteryKwh: 71.4, fuelGrade: 'electric', defaultInsurance: 135 },

  // Volkswagen & Volvo
  { fullName: 'Volkswagen Atlas SEL Premium R-Line', make: 'Volkswagen', model: 'Atlas SEL Premium', type: 'gas', mpgOrEfficiency: 22, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Volkswagen Tiguan SEL R-Line', make: 'Volkswagen', model: 'Tiguan SEL R-Line', type: 'gas', mpgOrEfficiency: 26, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Volkswagen ID.4 Pro S / AWD (EV)', make: 'Volkswagen', model: 'ID.4 Pro S', type: 'ev', mpgOrEfficiency: 32, batteryKwh: 82, fuelGrade: 'electric', defaultInsurance: 140 },
  { fullName: 'Volkswagen Jetta SEL', make: 'Volkswagen', model: 'Jetta SEL', type: 'gas', mpgOrEfficiency: 34, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Volvo XC90 Recharge Ultimate (PHEV)', make: 'Volvo', model: 'XC90 Recharge Ultimate', type: 'phev', mpgOrEfficiency: 27, fuelGrade: 'premium', defaultInsurance: 175 },
  { fullName: 'Volvo XC60 Recharge Ultimate (PHEV)', make: 'Volvo', model: 'XC60 Recharge Ultimate', type: 'phev', mpgOrEfficiency: 28, fuelGrade: 'premium', defaultInsurance: 165 },
  { fullName: 'Volvo EX90 Twin Motor (EV)', make: 'Volvo', model: 'EX90 Twin Motor', type: 'ev', mpgOrEfficiency: 38, batteryKwh: 111, fuelGrade: 'electric', defaultInsurance: 190 },
  { fullName: 'Volvo EX30 Ultra (EV)', make: 'Volvo', model: 'EX30 Ultra', type: 'ev', mpgOrEfficiency: 28, batteryKwh: 69, fuelGrade: 'electric', defaultInsurance: 145 }
];

// Alphabetically ordered vehicle makes
export const POPULAR_CAR_MAKES = [
  'Acura',
  'Alfa Romeo',
  'Audi',
  'BMW',
  'Buick',
  'Cadillac',
  'Chevrolet',
  'Chrysler',
  'Dodge',
  'Fiat',
  'Ford',
  'Genesis',
  'GMC',
  'Honda',
  'Hyundai',
  'Infiniti',
  'Jaguar',
  'Jeep',
  'Kia',
  'Land Rover',
  'Lexus',
  'Lincoln',
  'Lucid',
  'Maserati',
  'Mazda',
  'Mercedes-Benz',
  'MINI',
  'Mitsubishi',
  'Nissan',
  'Polestar',
  'Porsche',
  'Ram',
  'Rivian',
  'Subaru',
  'Tesla',
  'Toyota',
  'Volkswagen',
  'Volvo',
  'Other / Custom'
];

export const AUTO_INSURANCE_PROVIDERS = [
  'State Farm',
  'GEICO',
  'Progressive',
  'Allstate',
  'AAA (Auto Club)',
  'Farmers Insurance',
  'Liberty Mutual',
  'USAA (Military & Family)',
  'Travelers',
  'Nationwide',
  'American Family',
  'Mercury Insurance',
  'Other / Custom'
];

export const AUTO_INSURANCE_TYPES = [
  { id: 'full_coverage', label: 'Full Coverage (Comprehensive + Collision)', desc: 'Standard protection required for all leases & financed vehicles. Covers collision, vandalism, weather, theft & hit-and-run.' },
  { id: 'full_coverage_gap', label: 'Full Coverage + GAP Insurance', desc: 'Crucial for new leases & auto loans: pays the negative equity difference if the car is totaled before the lease/loan is paid off.' },
  { id: 'standard_comp_coll', label: 'Collision & Comprehensive Only', desc: 'Standard physical damage protection with customizable collision/comprehensive deductibles.' },
  { id: 'liability_only', label: 'Liability Only (State Minimum / Bodily Injury & Property)', desc: 'Only covers damages and injuries you cause to other drivers. Best suited for older, paid-off cars with lower cash value.' },
  { id: 'rideshare', label: 'Personal + Rideshare / Delivery Endorsement', desc: 'Commercial rideshare rider covering Uber, Lyft, DoorDash, and delivery driving activities.' }
];

/**
 * Intelligent spec detector that matches any user input (e.g. "2013 Toyota Camry SE", "Civic EX", "Model Y")
 * and extracts powertrain, MPG/efficiency, fuel grade, and realistic insurance estimate based on coverage.
 */
export function detectCarSpecs(make = '', modelStr = '', coverage = 'full_coverage') {
  let m = (modelStr || '').toLowerCase().trim();
  let mk = (make || '').toLowerCase().trim();
  if (mk === 'chevy') mk = 'chevrolet';
  m = m.replace(/\bchevy\b/g, 'chevrolet').replace(/\bpremiere\b/g, 'premier');

  const isLiability = coverage === 'liability_only';
  const isGap = coverage === 'full_coverage_gap';

  // 1. Direct or partial match in POPULAR_CAR_DATABASE
  const directMatch = POPULAR_CAR_DATABASE.find(c => {
    const dbModel = c.model.toLowerCase();
    const dbFull = c.fullName.toLowerCase();
    const makeMatches = !mk || mk === 'other' || mk === 'other / custom' || c.make.toLowerCase() === mk;
    return makeMatches && (m.includes(dbModel) || dbModel.includes(m) || dbFull.includes(m));
  });

  if (directMatch) {
    const baseIns = directMatch.defaultInsurance || 120;
    const adjIns = isLiability ? Math.max(50, Math.round(baseIns * 0.52)) : isGap ? Math.round(baseIns * 1.15) : baseIns;
    return {
      type: directMatch.type,
      mpgOrEfficiency: directMatch.mpgOrEfficiency,
      fuelGrade: directMatch.fuelGrade,
      batteryKwh: directMatch.batteryKwh || (directMatch.type === 'ev' ? 75 : 0),
      insuranceMonthly: adjIns
    };
  }

  // 2. Keyword heuristic checks
  const isEv = m.includes('ev') || m.includes('electric') || m.includes('tesla') || m.includes('rivian') || m.includes('polestar') || m.includes('ioniq') || m.includes('lightning') || m.includes('bz4x') || m.includes('solterra') || m.includes('ariya') || m.includes('model 3') || m.includes('model y') || m.includes('model s') || m.includes('model x') || m.includes('cybertruck') || m.includes('equinox ev') || m.includes('blazer ev');
  const isPhev = !isEv && (m.includes('phev') || m.includes('plug-in') || m.includes('prime') || m.includes('4xe') || m.includes('330e'));
  const isHybrid = !isEv && !isPhev && (m.includes('hybrid') || m.includes('prius') || m.includes('powerboost'));

  const type = isEv ? 'ev' : isPhev ? 'phev' : isHybrid ? 'hybrid' : 'gas';
  let fuelGrade = isEv ? 'electric' : 'regular';
  if (['bmw', 'mercedes-benz', 'audi', 'porsche', 'lexus'].includes(mk) || m.includes('amg') || m.includes('m3') || m.includes('m340i') || m.includes('gt') || m.includes('c300') || m.includes('e350')) {
    if (!isEv) fuelGrade = 'premium';
  }

  let mpgOrEfficiency = 30;
  let batteryKwh = 0;
  if (type === 'ev') {
    mpgOrEfficiency = m.includes('truck') || m.includes('lightning') || m.includes('r1t') || m.includes('cybertruck') ? 45 : 28;
    batteryKwh = m.includes('truck') || m.includes('lightning') || m.includes('r1t') || m.includes('cybertruck') ? 120 : 75;
  } else if (type === 'hybrid') {
    mpgOrEfficiency = m.includes('camry') || m.includes('prius') || m.includes('elantra') || m.includes('corolla') ? 50 : 38;
  } else if (type === 'phev') {
    mpgOrEfficiency = 38;
    batteryKwh = 18;
  } else {
    // gas ICE
    if (m.includes('camry') || m.includes('accord') || m.includes('altima')) mpgOrEfficiency = 32;
    else if (m.includes('corolla') || m.includes('civic') || m.includes('sentra') || m.includes('elantra') || m.includes('forte')) mpgOrEfficiency = 35;
    else if (m.includes('f-150') || m.includes('silverado') || m.includes('tahoe') || m.includes('ram') || m.includes('tundra') || m.includes('yukon')) mpgOrEfficiency = 19;
    else if (m.includes('rav4') || m.includes('cr-v') || m.includes('rogue') || m.includes('cx-5') || m.includes('forester') || m.includes('tucson') || m.includes('sportage')) mpgOrEfficiency = 29;
    else mpgOrEfficiency = 28;
  }

  const baseIns = type === 'ev' ? 150 : ['bmw', 'mercedes-benz', 'audi', 'porsche'].includes(mk) ? 165 : 120;
  const adjIns = isLiability ? Math.max(50, Math.round(baseIns * 0.52)) : isGap ? Math.round(baseIns * 1.15) : baseIns;

  return {
    type,
    mpgOrEfficiency,
    fuelGrade,
    batteryKwh,
    insuranceMonthly: adjIns
  };
}
