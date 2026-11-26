/**
 * Normalized Versioned Household Schema (v2), Centralized Labels,
 * Lossless Legacy Migration, Branching Logic, Validation, Reminders,
 * Completeness Tracking, and Bill-Sync Builders.
 *
 * Strictly local — zero network calls. Never asks for or stores
 * account numbers, passwords, SSN, income, or full card numbers.
 */

import { lookupLocalUtilityData } from '../data/usUtilityData.js';

export const HOUSEHOLD_SCHEMA_VERSION = 2;

/**
 * Single centralized label map used across questionnaire, summary, alerts, and bills.
 * No raw enum values or underscores should ever reach UI copy.
 */
export const HOUSEHOLD_LABELS = {
  yesNoNotSure: {
    yes: 'Yes',
    no: 'No',
    not_sure: 'Not sure'
  },
  yesMaybeNo: {
    yes: 'Yes',
    maybe: 'Maybe',
    no: 'No',
    not_sure: 'Not sure'
  },
  ownership: {
    own_with_mortgage: 'Own with mortgage',
    own_outright: 'Own outright',
    rent: 'Rent',
    other: 'Other arrangement',
    not_sure: 'Not sure'
  },
  homeType: {
    single_family: 'Single-family house',
    townhome: 'Townhome',
    condo: 'Condo',
    apartment: 'Apartment',
    mobile_home: 'Mobile home',
    multi_unit: 'Multi-unit home',
    not_sure: 'Not sure'
  },
  stories: {
    '1': '1 story',
    '2': '2 stories',
    '3_plus': '3+ stories',
    not_sure: 'Not sure'
  },
  garage: {
    none: 'No garage',
    '1_car': '1-car garage',
    '2_car': '2-car garage',
    '3_plus_car': '3+ car garage',
    not_sure: 'Not sure'
  },
  rentOutPart: {
    none: 'No',
    room: 'A room',
    adu: 'An ADU / guest unit',
    whole_home: 'Whole home',
    not_sure: 'Not sure'
  },
  insulation: {
    poor: 'Poor (older or drafty)',
    average: 'Average',
    good: 'Good (upgraded or newer)',
    not_sure: 'Not sure'
  },
  windows: {
    single_pane: 'Single-pane glass',
    double_pane: 'Double-pane glass',
    newer: 'Newer triple-pane / Low-E',
    not_sure: 'Not sure'
  },
  roofType: {
    composition_shingle: 'Asphalt / Composition shingle',
    tile: 'Clay or concrete tile',
    metal: 'Standing-seam / metal',
    flat_membrane: 'Flat / membrane (TPO / tar)',
    wood_shake: 'Wood shake',
    not_sure: 'Not sure'
  },
  foundation: {
    slab: 'Concrete slab',
    crawlspace: 'Crawlspace',
    basement: 'Basement',
    not_sure: 'Not sure'
  },
  heating: {
    gas_furnace: 'Gas furnace',
    heat_pump: 'Electric heat pump',
    electric: 'Electric resistance / baseboard',
    propane: 'Propane',
    wood: 'Wood / pellet stove',
    none: 'No heating',
    not_sure: 'Not sure'
  },
  cooling: {
    central_ac: 'Central air conditioning',
    heat_pump: 'Heat pump',
    window_units: 'Window or portable AC',
    evaporative: 'Evaporative cooler',
    none: 'No cooling',
    not_sure: 'Not sure'
  },
  thermostat: {
    manual: 'Manual dial or slider',
    programmable: 'Programmable (schedule)',
    smart: 'Smart thermostat (Wi-Fi)',
    not_sure: 'Not sure'
  },
  waterHeater: {
    gas_tank: 'Gas tank water heater',
    electric_tank: 'Electric tank water heater',
    tankless_gas: 'Tankless gas (on-demand)',
    tankless_electric: 'Tankless electric',
    heat_pump: 'Heat pump water heater',
    not_sure: 'Not sure'
  },
  cookingFuel: {
    gas: 'Gas stove / range',
    electric: 'Electric coil or radiant',
    induction: 'Induction cooktop',
    not_sure: 'Not sure'
  },
  dryer: {
    gas: 'Gas dryer',
    electric: 'Electric dryer',
    heat_pump: 'Heat pump dryer',
    none: 'No dryer at home',
    not_sure: 'Not sure'
  },
  refrigerators: {
    '1': '1 refrigerator',
    '2': '2 refrigerators',
    '3_plus': '3+ refrigerators',
    not_sure: 'Not sure'
  },
  otherLargeLoads: {
    well_pump: 'Well pump',
    sump_pump: 'Sump pump',
    hot_tub: 'Stand-alone hot tub',
    workshop: 'Workshop tools',
    computers_24_7: 'Computers / servers 24/7',
    aquarium: 'Large aquarium',
    none: 'None of these'
  },
  poolOrSpa: {
    none: 'No pool or spa',
    pool: 'Pool only',
    spa: 'Spa / hot tub only',
    both: 'Both pool and spa',
    not_sure: 'Not sure'
  },
  poolHeating: {
    none: 'Unheated',
    gas: 'Gas heater',
    electric: 'Electric resistance',
    heat_pump: 'Electric heat pump',
    solar: 'Solar pool heating',
    not_sure: 'Not sure'
  },
  poolService: {
    self: 'Do it myself',
    paid: 'Paid pool service',
    not_sure: 'Not sure'
  },
  solarOwnership: {
    owned: 'Owned outright',
    loan: 'Solar loan',
    leased: 'Solar lease',
    ppa: 'Power purchase agreement (PPA)',
    not_sure: 'Not sure'
  },
  solarBillingPlan: {
    net_metering: 'Net metering (1:1 or legacy export credit)',
    net_billing: 'Net billing (time-of-use export rate)',
    not_sure: 'Not sure'
  },
  roofDirection: {
    south: 'South-facing',
    west: 'West-facing',
    east: 'East-facing',
    mixed: 'Mixed directions',
    not_sure: 'Not sure'
  },
  solarShade: {
    none: 'No shade (full sun)',
    some: 'Some partial shade',
    heavy: 'Heavy tree / building shade',
    not_sure: 'Not sure'
  },
  batteryUse: {
    backup_only: 'Outage backup only',
    daily_use: 'Daily time-of-use shifting',
    both: 'Both daily shifting & backup',
    not_sure: 'Not sure'
  },
  evCount: {
    '0': 'No EVs or plug-in hybrids',
    '1': '1 EV or plug-in hybrid',
    '2_plus': '2+ EVs or plug-in hybrids',
    not_sure: 'Not sure'
  },
  homeCharger: {
    level_1: 'Level 1 (standard 120V wall outlet)',
    level_2: 'Level 2 (240V fast home charger)',
    none_at_home: 'No charger at home',
    public_only: 'Public charging only',
    not_sure: 'Not sure'
  },
  chargingLocation: {
    home: 'Mostly at home',
    work: 'Mostly at work',
    public_free: 'Mostly public or free chargers',
    not_sure: 'Not sure'
  },
  chargingHours: {
    overnight: 'Overnight off-peak',
    daytime: 'Daytime',
    mixed: 'Mixed hours',
    not_sure: 'Not sure'
  },
  billingFrequency: {
    monthly: 'Monthly',
    every_2_months: 'Every 2 months',
    quarterly: 'Quarterly',
    annual: 'Yearly',
    semi_annual: 'Twice a year',
    on_property_tax: 'Included on property tax'
  },
  propaneTankOwnership: {
    owned: 'Owned tank',
    leased: 'Leased tank',
    not_sure: 'Not sure'
  },
  waterBillingType: {
    metered: 'Metered (based on usage)',
    flat_rate: 'Flat monthly / cycle rate',
    not_sure: 'Not sure'
  },
  irrigationType: {
    sprinklers: 'Lawn sprinklers',
    drip: 'Drip irrigation',
    none: 'No automatic irrigation',
    not_sure: 'Not sure'
  },
  cartSize: {
    small_32: 'Small cart (32 gal)',
    standard_64: 'Standard cart (64 gal)',
    large_96: 'Large cart (96 gal)',
    shared_dumpster: 'Shared / HOA dumpster',
    not_sure: 'Not sure'
  },
  loanType: {
    fixed_30: '30-year fixed',
    fixed_15: '15-year or 20-year fixed',
    arm: 'Adjustable rate (ARM)',
    fha_va: 'FHA / VA / USDA',
    other: 'Other loan',
    not_sure: 'Not sure'
  },
  propertyTaxFrequency: {
    per_year: 'Per year',
    per_installment: 'Per installment (twice a year)',
    monthly: 'Monthly'
  },
  hoaFrequency: {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annual: 'Yearly'
  },
  generatorFuel: {
    natural_gas: 'Natural gas',
    propane: 'Propane',
    gasoline: 'Gasoline',
    diesel: 'Diesel',
    battery: 'Portable power station',
    not_sure: 'Not sure'
  },
  riskLevel: {
    low: 'Low risk',
    moderate: 'Moderate risk',
    high: 'High risk',
    not_sure: 'Not sure'
  }
};

/**
 * Formats any internal enum code cleanly using HOUSEHOLD_LABELS.
 * Never returns raw snake_case or unformatted enum keys.
 */
export function formatHouseholdLabel(group, value, emptyText = 'Not set') {
  if (value === null || value === undefined || value === '') return emptyText;
  const map = HOUSEHOLD_LABELS[group];
  if (map && Object.prototype.hasOwnProperty.call(map, String(value))) {
    return map[String(value)];
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return emptyText;
    return value.map((v) => formatHouseholdLabel(group, v, '')).filter(Boolean).join(', ') || emptyText;
  }
  const str = String(value).trim();
  if (!str) return emptyText;
  if (str.includes('_')) {
    return str
      .split('_')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
      .join(' ');
  }
  return str;
}

export function createEmptyV2Profile() {
  return {
    schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
    // Questionnaire state & prefill tracking (saved locally)
    questionnaireMeta: {
      mode: 'quick', // 'quick' | 'detailed'
      inProgress: false,
      lastSectionId: 'home_basics',
      lastScreenIndex: 0,
      completedSections: [],
      quickCompleted: false,
      detailedCompleted: false,
      lastSavedAt: null,
      reviewConfirmed: null,
      prefilledFields: {}
    },
    // AI Summary sharing permission (off by default, local summary only)
    shareSummaryWithAi: false,

    // 1. Home basics
    zillowUrl: '',
    zillowImportedAt: null,
    address: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    ownership: null,
    homeType: null,
    bedrooms: null,
    bathrooms: null,
    sqFt: null,
    yearBuilt: null,
    stories: null,
    lotSize: null,
    garage: null,
    garageAttached: null,
    yearsLivedHere: null,
    rentOutPart: null,

    // 2. Household
    adultsCount: null,
    childrenCount: null,
    workFromHomeDaysPerWeek: null,
    weekdayHoursEmpty: null,
    medicalEquipmentPower: null,
    petsCount: null,
    petsType: null,
    planToMove3Years: null,

    // 3. Building details (detailed)
    insulation: null,
    windows: null,
    roofType: null,
    roofAgeYears: null,
    hvacReplacedYear: null,
    waterHeaterReplacedYear: null,
    foundation: null,

    // 4. Heating, cooling, hot water
    heating: null,
    cooling: null,
    thermostat: null,
    waterHeater: null,
    spaceHeatersOrFireplace: null,

    // 5. Appliances
    cookingFuel: null,
    dryer: null,
    washerLoadsPerWeek: null,
    hasDishwasher: null,
    refrigeratorsCount: null,
    hasSeparateFreezer: null,
    otherLargeLoads: null,

    // 6. Pool or spa
    poolOrSpa: null,
    poolHeating: null,
    poolPumpHoursPerDay: null,
    poolService: null,
    poolServiceMonthlyCost: null,
    hasPoolCover: null,

    // 7. Solar and battery
    hasSolar: null,
    solarPanelCount: null,
    solarWattsPerPanel: null,
    solarOwnership: null,
    solarMonthlyPayment: null,
    solarLoanMonthsRemaining: null,
    solarBillingPlan: null,
    solarYearInstalled: null,
    solarRoofDirection: null,
    solarShade: null,
    solarKnownYearlyKwh: null,
    solarPeakSunHours: null,
    hasSolarBattery: null,
    solarBatteryKwh: null,
    solarBatteryUse: null,
    planToAddSolar: null,

    // 8. EV and charging (links to profile.vehicles without duplicating specs)
    evCount: null,
    evHomeCharger: null,
    evChargingLocation: null,
    evChargingHours: null,
    evReadyPanel: null,

    // 9. Electricity, gas, water, trash
    noElectricService: false,
    electricUtility: '',
    electricRatePlan: '',
    electricMonthlyBillSummer: null,
    electricMonthlyBillWinter: null,
    electricMonthlyKwh: null,
    electricLowIncomeDiscount: null,
    electricMedicalBaseline: null,
    electricSmartMeter: null,
    electricAutopay: null,
    electricBillingDay: null,
    electricLevelPay: null,
    electricBillingFrequency: 'monthly',

    noGasOrPropane: false,
    gasOrPropaneProvider: '',
    propaneTankOwnership: null,
    propaneFillFrequency: '',
    gasMonthlyBill: null,
    gasBillingFrequency: 'monthly',

    noWaterSewer: false,
    waterProvider: '',
    waterBillingType: null,
    hasWell: null,
    hasSeptic: null,
    septicLastPumpedYear: null,
    irrigationType: null,
    wateringDaysPerWeek: null,
    waterMonthlyBill: null,
    waterBillingFrequency: 'monthly',

    noTrashRecycling: false,
    trashProvider: '',
    trashCartSize: null,
    trashMonthlyBill: null,
    trashBillingFrequency: 'monthly',

    // 10. Internet, TV, phone
    noInternet: false,
    internetProvider: '',
    internetPlan: '',
    internetSpeedMbps: null,
    internetMonthlyCost: null,
    internetPromoPrice: null,
    internetPromoEndDate: '',
    internetEquipmentRentalFee: null,

    cableOrStreamingProvider: '',
    cableOrStreamingMonthlyCost: null,

    noMobilePhone: false,
    mobileCarrier: '',
    mobileLines: null,
    mobilePlanName: '',
    mobileMonthlyCost: null,
    mobilePaymentRemainingMonths: null,
    mobilePaymentBalance: null,

    hasLandline: null,
    landlineMonthlyCost: null,

    // 11. Housing costs
    mortgageMonthlyPI: null,
    mortgageInterestRate: null,
    mortgageLoanType: null,
    mortgageRemainingBalance: null,
    mortgageTermEndDate: '',
    mortgageEscrowTaxesInsurance: null,
    propertyTaxAmount: null,
    propertyTaxFrequency: 'per_year',
    hasHoa: null,
    hoaDues: null,
    hoaFrequency: 'monthly',
    hoaSpecialAssessments: null,
    monthlyRent: null,
    rentDueDay: null,
    leaseEndDate: '',
    hasSecondMortgageHeloc: null,
    secondMortgagePayment: null,
    secondMortgageBalance: null,
    hasSpecialDistrictTax: null,
    specialDistrictTaxAmount: null,

    // 12. Insurance and protection
    homeInsuranceCarrier: '',
    homeInsurancePremium: null,
    homeInsuranceFrequency: 'annual',
    homeInsuranceEndDate: '',
    homeInsuranceDeductible: null,
    homeInsuranceCoverageLimit: null,
    hasEarthquakeCoverage: null,
    hasFloodCoverage: null,
    hasUmbrellaPolicy: null,
    homeWarrantyProvider: '',
    homeWarrantyPlan: '',
    homeWarrantyCost: null,
    homeWarrantyRenewalDate: '',
    homeSecurityProvider: '',
    homeSecurityMonitored: null,
    homeSecurityMonthlyFee: null,
    autoInsBundledWithHome: null,

    // 13. Outdoor and services (chips + custom)
    outdoorServices: [], // [{ id, typeLabel, provider, cost, frequency }]
    hasBackupGenerator: null,
    backupGeneratorFuel: null,
    wildfireOrFloodRisk: null,

    // 14. Maintenance and big costs (owners + detailed)
    monthlyMaintenanceReserve: null,
    plannedProjectsSummary: '',
    plannedProjectsEstimatedCost: null,
    emergencyRepairFundTarget: null,

    // Preserved sibling sections & costs
    monthlyCosts: {},
    vehicles: [],
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
      copays: { primaryCare: null, specialist: null, urgentCare: null, er: null, rxGeneric: null },
      doctors: [],
      cards: []
    },
    extraProviders: []
  };
}

function mapLegacyValue(val, map, fallback = null) {
  if (val === null || val === undefined || val === '') return fallback;
  const key = String(val).trim();
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : fallback;
}

/**
 * Parses city/state/zip from a freeform US address string if separate fields are empty.
 */
export function parseAddressComponents(addressStr = '') {
  const clean = String(addressStr || '').trim();
  if (!clean) return {};
  const zipMatch = clean.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zip = zipMatch ? zipMatch[1] : '';
  const stateMatch = clean.match(/,\s*([A-Z]{2})(?:\s+\d{5}|,|$)/i);
  const state = stateMatch ? stateMatch[1].toUpperCase() : '';
  const parts = clean.split(',').map((s) => s.trim()).filter(Boolean);
  const city = parts.length >= 2 ? parts[1].replace(/\b[A-Z]{2}\b.*$/i, '').trim() : '';
  const street = parts[0] || '';
  return { street, city, state, zip };
}

/**
 * Losslessly migrates any legacy 7-topic household profile to v2 schema.
 * Unanswered fields stay strictly null (never false or 0).
 */
export function migrateHouseholdProfile(raw) {
  const base = createEmptyV2Profile();
  if (!raw || typeof raw !== 'object') return base;

  // Already v2+: ensure any newly added defaults exist and keep legacy vehicle/health/costs intact
  if (Number(raw.schemaVersion) >= HOUSEHOLD_SCHEMA_VERSION) {
    return {
      ...base,
      ...raw,
      schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
      questionnaireMeta: {
        ...base.questionnaireMeta,
        ...(raw.questionnaireMeta || {})
      },
      health: raw.health || base.health,
      vehicles: Array.isArray(raw.vehicles) ? raw.vehicles : [],
      outdoorServices: Array.isArray(raw.outdoorServices) ? raw.outdoorServices : [],
      monthlyCosts: raw.monthlyCosts || {}
    };
  }

  const parsedAddr = parseAddressComponents(raw.address || '');
  const ownershipMap = {
    own: 'own_with_mortgage',
    own_with_mortgage: 'own_with_mortgage',
    own_outright: 'own_outright',
    rent: 'rent',
    other: 'other'
  };
  const homeTypeMap = {
    single_family: 'single_family',
    large_estate: 'single_family',
    townhouse: 'townhome',
    townhome: 'townhome',
    condo: 'condo',
    apartment: 'apartment',
    mobile_home: 'mobile_home',
    multi_unit: 'multi_unit'
  };
  const heatingMap = {
    natural_gas_furnace: 'gas_furnace',
    gas_furnace: 'gas_furnace',
    heat_pump: 'heat_pump',
    electric_baseboard: 'electric',
    electric: 'electric',
    propane_other: 'propane',
    propane: 'propane',
    wood: 'wood',
    none: 'none'
  };
  const coolingMap = {
    central_ac: 'central_ac',
    heat_pump: 'heat_pump',
    window_units: 'window_units',
    evaporative_cooler: 'evaporative',
    evaporative: 'evaporative',
    none: 'none'
  };
  const waterHeaterMap = {
    natural_gas_tank: 'gas_tank',
    gas_tank: 'gas_tank',
    electric_tank: 'electric_tank',
    tankless_gas: 'tankless_gas',
    tankless_electric: 'tankless_electric',
    hybrid_heat_pump: 'heat_pump',
    heat_pump: 'heat_pump'
  };
  const poolMap = {
    none: 'none',
    pool_only: 'pool',
    pool: 'pool',
    spa_only: 'spa',
    spa: 'spa',
    pool_and_spa: 'both',
    both: 'both'
  };
  const poolHeatMap = {
    none: 'none',
    solar: 'solar',
    gas: 'gas',
    electric_heat_pump: 'heat_pump',
    heat_pump: 'heat_pump',
    electric: 'electric'
  };
  const solarBillingMap = {
    nem_1: 'net_metering',
    nem_2: 'net_metering',
    net_metering: 'net_metering',
    nem_3: 'net_billing',
    net_billing: 'net_billing',
    other: 'not_sure',
    not_sure: 'not_sure'
  };
  const solarOwnershipMap = {
    owned: 'owned',
    loan: 'loan',
    leased: 'leased',
    ppa: 'ppa'
  };
  const chargerMap = {
    level2_240v: 'level_2',
    level_2: 'level_2',
    level1_120v: 'level_1',
    level_1: 'level_1',
    no_charger: 'none_at_home',
    none_at_home: 'none_at_home',
    public_only: 'public_only'
  };
  const chargingHoursMap = {
    overnight_offpeak: 'overnight',
    overnight: 'overnight',
    daytime_solar: 'daytime',
    daytime: 'daytime',
    evening_peak: 'mixed',
    anytime: 'mixed',
    mixed: 'mixed'
  };
  const batteryUseMap = {
    backup_only: 'backup_only',
    self_consumption: 'daily_use',
    tou_arbitrage: 'both',
    daily_use: 'daily_use',
    both: 'both'
  };

  const prefilled = {};
  const trackPrefill = (key, val) => {
    if (val !== null && val !== undefined && val !== '') {
      prefilled[key] = true;
    }
    return val;
  };

  // Detect whether legacy data had explicit user answers vs unmodified defaults
  const hasRealSpecs = Boolean(raw.address || raw.dwellingType || (raw.sqFt && raw.sqFt > 0));
  const vehicles = Array.isArray(raw.vehicles) ? raw.vehicles : [];
  const evVehiclesCount = vehicles.filter((v) => v?.type === 'ev' || v?.type === 'phev').length;

  let migratedEvCount = null;
  if (evVehiclesCount >= 2) migratedEvCount = '2_plus';
  else if (evVehiclesCount === 1) migratedEvCount = '1';
  else if (raw.hasEvAtHome === true && hasRealSpecs) migratedEvCount = '1';
  else if (raw.hasEvAtHome === false && hasRealSpecs) migratedEvCount = '0';

  const legacySolarPlan = mapLegacyValue(raw.solarBillingPlan, solarBillingMap);
  const legacyElectricBill = raw.monthlyCosts?.electricity?.amount ?? null;
  const legacyGasBill = raw.monthlyCosts?.gas?.amount ?? null;
  const legacyWaterBill = raw.monthlyCosts?.waterTrash?.amount ?? null;
  const legacyInternetCost = raw.monthlyCosts?.internet?.amount ?? null;
  const legacyPhoneCost = raw.monthlyCosts?.phone?.amount ?? null;
  const legacyHousingCost = raw.monthlyCosts?.mortgageRent?.amount ?? null;
  const legacyPropTax = raw.monthlyCosts?.propertyTax?.amount != null ? Number(raw.monthlyCosts.propertyTax.amount) * 12 : null;
  const legacyHoa = raw.monthlyCosts?.hoa?.amount ?? null;
  const legacyInsurance = raw.monthlyCosts?.homeInsurance?.amount != null ? Number(raw.monthlyCosts.homeInsurance.amount) * 12 : null;

  const ownershipVal = hasRealSpecs ? mapLegacyValue(raw.ownership, ownershipMap) : null;

  // Preserve extra providers as outdoor services / custom services if applicable
  const extraServices = Array.isArray(raw.extraProviders)
    ? raw.extraProviders.map((ep, idx) => ({
        id: ep.id || `svc_migrated_${idx}`,
        typeLabel: ep.type || 'Custom service',
        provider: ep.name || '',
        cost: ep.monthlyCost != null && ep.monthlyCost !== '' ? Number(ep.monthlyCost) : null,
        frequency: 'monthly'
      }))
    : [];

  return {
    ...base,
    // Keep non-sensitive legacy vehicle/health/extras intact
    vehicles,
    health: raw.health || base.health,
    extraProviders: Array.isArray(raw.extraProviders) ? raw.extraProviders : [],
    monthlyCosts: raw.monthlyCosts || {},

    address: trackPrefill('address', raw.address || ''),
    street: raw.street || parsedAddr.street || '',
    city: trackPrefill('city', raw.city || parsedAddr.city || ''),
    state: trackPrefill('state', raw.state || parsedAddr.state || ''),
    zip: trackPrefill('zip', raw.zip || parsedAddr.zip || ''),

    ownership: trackPrefill('ownership', ownershipVal),
    homeType: trackPrefill('homeType', mapLegacyValue(raw.dwellingType, homeTypeMap)),
    bedrooms: trackPrefill('bedrooms', raw.bedrooms > 0 ? Number(raw.bedrooms) : null),
    bathrooms: trackPrefill('bathrooms', raw.bathrooms > 0 ? Number(raw.bathrooms) : null),
    sqFt: trackPrefill('sqFt', raw.sqFt > 0 ? Number(raw.sqFt) : null),
    yearBuilt: trackPrefill('yearBuilt', raw.yearBuilt ? Number(raw.yearBuilt) : null),
    lotSize: trackPrefill('lotSize', raw.lotSize || null),
    garage: raw.garage ? trackPrefill('garage', raw.garage === '2' ? '2_car' : raw.garage === '1' ? '1_car' : null) : null,

    adultsCount: hasRealSpecs && raw.householdSize > 0 ? trackPrefill('adultsCount', Number(raw.householdSize)) : null,

    heating: hasRealSpecs ? trackPrefill('heating', mapLegacyValue(raw.heatingType, heatingMap)) : null,
    cooling: hasRealSpecs ? trackPrefill('cooling', mapLegacyValue(raw.coolingType, coolingMap)) : null,
    waterHeater: hasRealSpecs ? trackPrefill('waterHeater', mapLegacyValue(raw.waterHeaterType, waterHeaterMap)) : null,

    poolOrSpa: hasRealSpecs ? trackPrefill('poolOrSpa', mapLegacyValue(raw.poolOrSpa, poolMap)) : null,
    poolHeating: hasRealSpecs && raw.poolOrSpa && raw.poolOrSpa !== 'none'
      ? mapLegacyValue(raw.poolHeating, poolHeatMap)
      : null,

    hasSolar: hasRealSpecs ? trackPrefill('hasSolar', raw.hasSolar ? 'yes' : 'no') : null,
    solarPanelCount: raw.hasSolar && raw.solarPanelCount ? Number(raw.solarPanelCount) : null,
    solarWattsPerPanel: raw.hasSolar && raw.solarWattsPerPanel ? Number(raw.solarWattsPerPanel) : null,
    solarOwnership: raw.hasSolar ? mapLegacyValue(raw.solarOwnership, solarOwnershipMap) : null,
    solarMonthlyPayment: raw.hasSolar && raw.solarOwnership !== 'owned' && raw.solarMonthlyPayment ? Number(raw.solarMonthlyPayment) : null,
    solarBillingPlan: raw.hasSolar ? legacySolarPlan : null,
    solarYearInstalled: raw.hasSolar && raw.solarYearInstalled ? Number(raw.solarYearInstalled) : null,
    solarPeakSunHours: raw.hasSolar && raw.solarPeakSunHours ? Number(raw.solarPeakSunHours) : null,
    hasSolarBattery: raw.hasSolar && raw.hasSolarBattery ? 'yes' : null,
    solarBatteryKwh: raw.hasSolar && raw.hasSolarBattery && raw.solarBatteryKwh ? Number(raw.solarBatteryKwh) : null,
    solarBatteryUse: raw.hasSolar && raw.hasSolarBattery ? mapLegacyValue(raw.solarBatteryMode, batteryUseMap) : null,

    evCount: trackPrefill('evCount', migratedEvCount),
    evHomeCharger: migratedEvCount && migratedEvCount !== '0' ? mapLegacyValue(raw.evChargerType, chargerMap) : null,
    evChargingHours: migratedEvCount && migratedEvCount !== '0' ? mapLegacyValue(raw.evChargingSchedule, chargingHoursMap) : null,
    evChargingLocation:
      migratedEvCount && migratedEvCount !== '0' && raw.evFreeWorkplaceCharging === 'yes_often'
        ? 'work'
        : migratedEvCount && migratedEvCount !== '0'
          ? 'home'
          : null,

    electricUtility: hasRealSpecs ? trackPrefill('electricUtility', raw.electricGasProvider || '') : '',
    electricRatePlan: hasRealSpecs ? (raw.electricGasPlan || '') : '',
    electricMonthlyBillSummer: legacyElectricBill != null ? Number(legacyElectricBill) : null,
    electricLowIncomeDiscount: hasRealSpecs ? (raw.hasCareDiscount ? 'yes' : 'no') : null,

    gasMonthlyBill: legacyGasBill != null ? Number(legacyGasBill) : null,
    waterMonthlyBill: legacyWaterBill != null ? Number(legacyWaterBill) : null,
    trashProvider: hasRealSpecs ? (raw.trashProvider || '') : '',
    trashCartSize:
      hasRealSpecs && raw.trashPlanType === 'large_96'
        ? 'large_96'
        : hasRealSpecs && raw.trashPlanType === 'small_32'
          ? 'small_32'
          : hasRealSpecs && raw.trashPlanType === 'standard_64'
            ? 'standard_64'
            : null,

    internetProvider: hasRealSpecs ? (raw.internetProvider || '') : '',
    internetPlan: hasRealSpecs ? (raw.internetPlan || '') : '',
    internetMonthlyCost: legacyInternetCost != null ? Number(legacyInternetCost) : null,

    mobileCarrier: hasRealSpecs ? (raw.phoneProvider || '') : '',
    mobilePlanName: hasRealSpecs ? (raw.phonePlan || '') : '',
    mobileLines: hasRealSpecs && raw.phoneLines ? Number(raw.phoneLines) : null,
    mobileMonthlyCost: legacyPhoneCost != null ? Number(legacyPhoneCost) : null,

    mortgageMonthlyPI: ownershipVal && ownershipVal !== 'rent' && legacyHousingCost != null ? Number(legacyHousingCost) : null,
    monthlyRent: ownershipVal === 'rent' && legacyHousingCost != null ? Number(legacyHousingCost) : null,
    propertyTaxAmount: ownershipVal && ownershipVal !== 'rent' && legacyPropTax != null ? Number(legacyPropTax) : null,
    hoaDues: legacyHoa != null ? Number(legacyHoa) : null,

    homeInsurancePremium: legacyInsurance != null ? Number(legacyInsurance) : null,
    homeWarrantyProvider: hasRealSpecs ? (raw.homeWarrantyProvider || '') : '',
    homeWarrantyPlan: hasRealSpecs ? (raw.homeWarrantyPlan || '') : '',
    homeWarrantyCost: hasRealSpecs && raw.homeWarrantyMonthlyCost ? Number(raw.homeWarrantyMonthlyCost) : null,
    homeSecurityProvider: hasRealSpecs ? (raw.securityProvider || '') : '',

    outdoorServices: extraServices,
    questionnaireMeta: {
      ...base.questionnaireMeta,
      quickCompleted: hasRealSpecs,
      prefilledFields: prefilled
    }
  };
}

/**
 * Syncs normalized v2 keys to legacy fields so external consumers
 * (Overview, Auto/Health tabs) continue working seamlessly.
 */
export function syncProfileCompatibilityAliases(v2) {
  if (!v2 || typeof v2 !== 'object') return v2;
  const ownershipCompat = v2.ownership === 'rent' ? 'rent' : 'own';
  const dwellingCompat =
    v2.homeType === 'townhome'
      ? 'townhouse'
      : v2.homeType === 'condo' || v2.homeType === 'apartment'
        ? 'apartment'
        : v2.homeType || '';
  const totalPeople =
    (Number(v2.adultsCount) || 0) + (Number(v2.childrenCount) || 0) ||
    Number(v2.householdSize) ||
    1;

  return {
    ...v2,
    schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
    dwellingType: dwellingCompat,
    ownershipCompat,
    householdSize: totalPeople,
    electricGasProvider: v2.electricUtility || v2.electricGasProvider || '',
    electricGasPlan: v2.electricRatePlan || v2.electricGasPlan || '',
    hasCareDiscount: v2.electricLowIncomeDiscount === 'yes',
    phoneProvider: v2.mobileCarrier || '',
    phonePlan: v2.mobilePlanName || '',
    phoneLines: v2.mobileLines || v2.phoneLines || null,
    securityProvider: v2.homeSecurityProvider || '',
    homeWarrantyMonthlyCost: v2.homeWarrantyCost != null ? Number(v2.homeWarrantyCost) : null
  };
}

// ---------- BRANCHING HELPERS ----------

export function isOwner(p) {
  return p?.ownership === 'own_with_mortgage' || p?.ownership === 'own_outright';
}

export function isRenter(p) {
  return p?.ownership === 'rent';
}

export function isHouseOrTownhome(p) {
  return p?.homeType === 'single_family' || p?.homeType === 'townhome' || p?.homeType === 'multi_unit';
}

export function isHouseOnly(p) {
  return p?.homeType === 'single_family' || p?.homeType === 'multi_unit';
}

export function hasAnyGasOrPropaneUsage(p) {
  if (!p) return false;
  if (p.heating === 'gas_furnace' || p.heating === 'propane') return true;
  if (p.waterHeater === 'gas_tank' || p.waterHeater === 'tankless_gas') return true;
  if (p.cookingFuel === 'gas') return true;
  if (p.dryer === 'gas') return true;
  if (p.poolHeating === 'gas') return true;
  return Boolean(p.gasOrPropaneProvider);
}

export function needsHoaSection(p) {
  return p?.homeType === 'condo' || p?.homeType === 'townhome' || p?.hasHoa === 'yes';
}

export function isDetailedMode(mode) {
  return mode === 'detailed';
}

/**
 * Computes effective EV/PHEV count from linked vehicles + user choice.
 */
export function getLinkedEvVehicles(p) {
  const list = Array.isArray(p?.vehicles) ? p.vehicles : [];
  return list.filter((v) => v?.type === 'ev' || v?.type === 'phev');
}

/**
 * 15 canonical sections in exact order for top stepper, section picker, and summary links.
 */
export const HOUSEHOLD_SECTIONS = [
  { id: 'home_basics', number: 1, title: 'Home basics', essential: true },
  { id: 'household', number: 2, title: 'Household', essential: true },
  { id: 'building_details', number: 3, title: 'Building details', essential: false, showIf: (p, mode) => mode === 'detailed' },
  { id: 'heating_cooling', number: 4, title: 'Heating & cooling', essential: true },
  { id: 'appliances', number: 5, title: 'Appliances', essential: true },
  { id: 'pool_spa', number: 6, title: 'Pool or spa', essential: true },
  { id: 'solar_battery', number: 7, title: 'Solar & battery', essential: true },
  { id: 'ev_charging', number: 8, title: 'EV & charging', essential: true },
  { id: 'utilities', number: 9, title: 'Utilities', essential: true },
  { id: 'internet_phone', number: 10, title: 'Internet & phone', essential: true },
  { id: 'housing_costs', number: 11, title: 'Housing costs', essential: true },
  { id: 'insurance', number: 12, title: 'Insurance', essential: true },
  { id: 'outdoor_services', number: 13, title: 'Outdoor & services', essential: false, showIf: (p, mode) => mode === 'detailed' },
  { id: 'maintenance', number: 14, title: 'Maintenance', essential: false, showIf: (p, mode) => mode === 'detailed' && isOwner(p) },
  { id: 'review', number: 15, title: 'Review', essential: true }
];

/**
 * Grouped screens (2–4 related fields per screen) for Quick and Detailed flows,
 * or single-section editing in a drawer/sheet.
 */
export const QUESTIONNAIRE_SCREENS = [
  {
    id: 'home_basics_zillow',
    sectionId: 'home_basics',
    title: 'Add your home’s Zillow link',
    whyWeAsk: 'Paste your Zillow listing link so Klarity AI can automatically pull your address, bedrooms, bathrooms, square footage, year built, and lot details for you.',
    essential: false
  },
  {
    id: 'home_basics_location',
    sectionId: 'home_basics',
    title: 'Home address and ownership',
    whyWeAsk: 'Your ZIP code sets local electric rates and available regional programs, without using any outside services.',
    essential: true
  },
  {
    id: 'home_basics_specs',
    sectionId: 'home_basics',
    title: 'Home size and structure',
    whyWeAsk: 'Square footage, bedrooms, and age determine baseline heating, cooling, and property upkeep estimates.',
    essential: true
  },
  {
    id: 'household_people',
    sectionId: 'household',
    title: 'Who lives and works at home',
    whyWeAsk: 'Daily occupancy and medical power needs shape electricity, water, and backup eligibility.',
    essential: true
  },
  {
    id: 'building_envelope',
    sectionId: 'building_details',
    title: 'Envelope, roof, and system ages',
    whyWeAsk: 'Insulation, windows, and equipment age reveal energy loss and upcoming replacement costs.',
    essential: false,
    showIf: (p, mode) => mode === 'detailed'
  },
  {
    id: 'heating_cooling_water',
    sectionId: 'heating_cooling',
    title: 'Heating, cooling, and hot water',
    whyWeAsk: 'These three systems typically drive more than half of a home’s monthly energy bill.',
    essential: true
  },
  {
    id: 'appliances_loads',
    sectionId: 'appliances',
    title: 'Cooking, laundry, and large appliances',
    whyWeAsk: 'Separates gas vs. electric appliances and flags continuous equipment loads.',
    essential: true
  },
  {
    id: 'pool_spa_screen',
    sectionId: 'pool_spa',
    title: 'Swimming pool or spa',
    whyWeAsk: 'Pool pumps and heaters can add significant seasonal electric or gas charges.',
    essential: true
  },
  {
    id: 'solar_panels_screen',
    sectionId: 'solar_battery',
    title: 'Solar panels and billing plan',
    whyWeAsk: 'Models monthly clean energy offset, export credit value, and lease or loan obligations.',
    essential: true
  },
  {
    id: 'ev_charging_screen',
    sectionId: 'ev_charging',
    title: 'Electric vehicles and home charging',
    whyWeAsk: 'Uses your linked vehicles to estimate off-peak charging kWh without asking vehicle details twice.',
    essential: true
  },
  {
    id: 'utilities_electric_gas',
    sectionId: 'utilities',
    title: 'Electricity and gas providers',
    whyWeAsk: 'Identifies your local rate plan, regional discounts, and seasonal bill swings.',
    essential: true
  },
  {
    id: 'utilities_water_trash',
    sectionId: 'utilities',
    title: 'Water, irrigation, and trash',
    whyWeAsk: 'Tracks municipal water, septic or well systems, yard watering, and bin size.',
    essential: true
  },
  {
    id: 'internet_tv_phone',
    sectionId: 'internet_phone',
    title: 'Internet, TV, and phone',
    whyWeAsk: 'Captures promo expiration dates and monthly telecom bills you can sync to Bills.',
    essential: true
  },
  {
    id: 'housing_costs_screen',
    sectionId: 'housing_costs',
    title: 'Housing payment and taxes',
    whyWeAsk: 'Separates principal and interest, escrow, property taxes, HOA dues, or rent so nothing is double-counted.',
    essential: true
  },
  {
    id: 'insurance_protection',
    sectionId: 'insurance',
    title: 'Insurance and home protection',
    whyWeAsk: 'Tracks coverage policies, deductibles, and upcoming warranty or policy renewal dates.',
    essential: true
  },
  {
    id: 'outdoor_services_screen',
    sectionId: 'outdoor_services',
    title: 'Outdoor services and resilience',
    whyWeAsk: 'Adds recurring yard, pool, or pest care plus backup power and local hazard risks.',
    essential: false,
    showIf: (p, mode) => mode === 'detailed'
  },
  {
    id: 'maintenance_costs_screen',
    sectionId: 'maintenance',
    title: 'Maintenance and planned projects',
    whyWeAsk: 'Helps set realistic homeowner repair reserves and track upcoming major upgrades.',
    essential: false,
    showIf: (p, mode) => mode === 'detailed' && isOwner(p)
  },
  {
    id: 'review_screen',
    sectionId: 'review',
    title: 'Review your household profile',
    whyWeAsk: 'Confirm what we have so far and jump directly to any section you want to update.',
    essential: true
  }
];

export function getVisibleSections(profile, mode = 'quick') {
  return HOUSEHOLD_SECTIONS.filter((sec) => {
    if (mode !== 'detailed' && !sec.essential) return false;
    if (typeof sec.showIf === 'function') return sec.showIf(profile, mode);
    return true;
  });
}

export function getVisibleScreens(profile, mode = 'quick', singleSectionId = null) {
  if (singleSectionId) {
    return QUESTIONNAIRE_SCREENS.filter((scr) => {
      if (scr.sectionId !== singleSectionId) return false;
      if (singleSectionId === 'maintenance' && !isOwner(profile)) return false;
      return true;
    });
  }
  return QUESTIONNAIRE_SCREENS.filter((scr) => {
    if (mode !== 'detailed' && !scr.essential) return false;
    if (typeof scr.showIf === 'function') return scr.showIf(profile, mode);
    return true;
  });
}

// ---------- VALIDATION ----------

function isValidMoney(val) {
  if (val === null || val === undefined || val === '') return true;
  const str = String(val).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) return false;
  return Number(str) >= 0;
}

function isValidCalendarDate(val) {
  if (!val) return true;
  const str = String(val).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function checkIntRange(val, min, max, label) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < min || num > max) {
    return `${label} must be a whole number between ${min.toLocaleString()} and ${max.toLocaleString()}.`;
  }
  return null;
}

function checkNumRange(val, min, max, label) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (!Number.isFinite(num) || num < min || num > max) {
    return `${label} must be between ${min.toLocaleString()} and ${max.toLocaleString()}.`;
  }
  return null;
}

/**
 * Validates only the fields present and active on a given screen.
 * Empty optional fields never trigger errors.
 */
export function validateScreen(screenId, profile) {
  const errors = {};
  const currentYear = new Date().getFullYear();

  if (screenId === 'home_basics_location') {
    if (profile.zip && !/^\d{5}$/.test(String(profile.zip).trim())) {
      errors.zip = 'Enter a valid 5-digit ZIP code.';
    }
  }

  if (screenId === 'home_basics_specs') {
    const sqErr = checkNumRange(profile.sqFt, 200, 20000, 'Square feet');
    if (sqErr) errors.sqFt = sqErr;
    const yrErr = checkIntRange(profile.yearBuilt, 1800, currentYear, 'Year built');
    if (yrErr) errors.yearBuilt = yrErr;
    const bedErr = checkIntRange(profile.bedrooms, 0, 20, 'Bedrooms');
    if (bedErr) errors.bedrooms = bedErr;
    const bathErr = checkNumRange(profile.bathrooms, 0, 20, 'Bathrooms');
    if (bathErr) errors.bathrooms = bathErr;
  }

  if (screenId === 'building_envelope') {
    if (isOwner(profile)) {
      const roofAgeErr = checkNumRange(profile.roofAgeYears, 0, 120, 'Roof age');
      if (roofAgeErr) errors.roofAgeYears = roofAgeErr;
      const hvacErr = checkIntRange(profile.hvacReplacedYear, 1950, currentYear, 'HVAC replacement year');
      if (hvacErr) errors.hvacReplacedYear = hvacErr;
      const whErr = checkIntRange(profile.waterHeaterReplacedYear, 1950, currentYear, 'Water heater replacement year');
      if (whErr) errors.waterHeaterReplacedYear = whErr;
    }
  }

  if (screenId === 'pool_spa_screen' && profile.poolOrSpa && profile.poolOrSpa !== 'none' && profile.poolOrSpa !== 'not_sure') {
    const hrsErr = checkNumRange(profile.poolPumpHoursPerDay, 0, 24, 'Pump hours per day');
    if (hrsErr) errors.poolPumpHoursPerDay = hrsErr;
    if (profile.poolService === 'paid' && !isValidMoney(profile.poolServiceMonthlyCost)) {
      errors.poolServiceMonthlyCost = 'Enter a non-negative amount with up to 2 decimal places.';
    }
  }

  if (screenId === 'solar_panels_screen' && profile.hasSolar === 'yes') {
    const panelErr = checkIntRange(profile.solarPanelCount, 1, 200, 'Number of panels');
    if (panelErr) errors.solarPanelCount = panelErr;
    const wattErr = checkIntRange(profile.solarWattsPerPanel, 100, 700, 'Watts per panel');
    if (wattErr) errors.solarWattsPerPanel = wattErr;
    if (!isValidMoney(profile.solarMonthlyPayment)) {
      errors.solarMonthlyPayment = 'Enter a non-negative amount with up to 2 decimal places.';
    }
    if (profile.hasSolarBattery === 'yes') {
      const batErr = checkNumRange(profile.solarBatteryKwh, 1, 100, 'Battery size (kWh)');
      if (batErr) errors.solarBatteryKwh = batErr;
    }
  }

  if (screenId === 'utilities_electric_gas') {
    if (!profile.noElectricService) {
      if (!isValidMoney(profile.electricMonthlyBillSummer)) errors.electricMonthlyBillSummer = 'Enter a non-negative amount (up to 2 decimals).';
      if (!isValidMoney(profile.electricMonthlyBillWinter)) errors.electricMonthlyBillWinter = 'Enter a non-negative amount (up to 2 decimals).';
      const dayErr = checkIntRange(profile.electricBillingDay, 1, 31, 'Billing day');
      if (dayErr) errors.electricBillingDay = dayErr;
    }
    if (!profile.noGasOrPropane && hasAnyGasOrPropaneUsage(profile)) {
      if (!isValidMoney(profile.gasMonthlyBill)) errors.gasMonthlyBill = 'Enter a non-negative amount (up to 2 decimals).';
    }
  }

  if (screenId === 'utilities_water_trash') {
    if (!profile.noWaterSewer && !isValidMoney(profile.waterMonthlyBill)) {
      errors.waterMonthlyBill = 'Enter a non-negative amount (up to 2 decimals).';
    }
    if (!profile.noTrashRecycling && !isValidMoney(profile.trashMonthlyBill)) {
      errors.trashMonthlyBill = 'Enter a non-negative amount (up to 2 decimals).';
    }
  }

  if (screenId === 'internet_tv_phone') {
    if (!profile.noInternet) {
      if (!isValidMoney(profile.internetMonthlyCost)) errors.internetMonthlyCost = 'Enter a non-negative amount (up to 2 decimals).';
      if (!isValidMoney(profile.internetPromoPrice)) errors.internetPromoPrice = 'Enter a non-negative amount (up to 2 decimals).';
      if (!isValidMoney(profile.internetEquipmentRentalFee)) errors.internetEquipmentRentalFee = 'Enter a non-negative amount (up to 2 decimals).';
      if (profile.internetPromoEndDate && !isValidCalendarDate(profile.internetPromoEndDate)) {
        errors.internetPromoEndDate = 'Enter a valid promo end date (YYYY-MM-DD).';
      }
    }
    if (!isValidMoney(profile.cableOrStreamingMonthlyCost)) errors.cableOrStreamingMonthlyCost = 'Enter a non-negative amount (up to 2 decimals).';
    if (!profile.noMobilePhone) {
      if (!isValidMoney(profile.mobileMonthlyCost)) errors.mobileMonthlyCost = 'Enter a non-negative amount (up to 2 decimals).';
      if (!isValidMoney(profile.mobilePaymentBalance)) errors.mobilePaymentBalance = 'Enter a non-negative amount (up to 2 decimals).';
    }
    if (profile.hasLandline === 'yes' && !isValidMoney(profile.landlineMonthlyCost)) {
      errors.landlineMonthlyCost = 'Enter a non-negative amount (up to 2 decimals).';
    }
  }

  if (screenId === 'housing_costs_screen') {
    if (profile.ownership === 'own_with_mortgage') {
      if (!isValidMoney(profile.mortgageMonthlyPI)) errors.mortgageMonthlyPI = 'Enter a non-negative amount (up to 2 decimals).';
      if (!isValidMoney(profile.mortgageRemainingBalance)) errors.mortgageRemainingBalance = 'Enter a non-negative amount (up to 2 decimals).';
      if (profile.mortgageTermEndDate && !isValidCalendarDate(profile.mortgageTermEndDate)) {
        errors.mortgageTermEndDate = 'Enter a valid loan term end date (YYYY-MM-DD).';
      }
    }
    if (isOwner(profile)) {
      if (!isValidMoney(profile.propertyTaxAmount)) errors.propertyTaxAmount = 'Enter a non-negative amount (up to 2 decimals).';
      if (profile.hasSecondMortgageHeloc === 'yes') {
        if (!isValidMoney(profile.secondMortgagePayment)) errors.secondMortgagePayment = 'Enter a non-negative amount (up to 2 decimals).';
        if (!isValidMoney(profile.secondMortgageBalance)) errors.secondMortgageBalance = 'Enter a non-negative amount (up to 2 decimals).';
      }
      if (profile.hasSpecialDistrictTax === 'yes' && !isValidMoney(profile.specialDistrictTaxAmount)) {
        errors.specialDistrictTaxAmount = 'Enter a non-negative amount (up to 2 decimals).';
      }
    }
    if (needsHoaSection(profile) && !isValidMoney(profile.hoaDues)) {
      errors.hoaDues = 'Enter a non-negative amount (up to 2 decimals).';
    }
    if (isRenter(profile)) {
      if (!isValidMoney(profile.monthlyRent)) errors.monthlyRent = 'Enter a non-negative amount (up to 2 decimals).';
      const rentDayErr = checkIntRange(profile.rentDueDay, 1, 31, 'Rent due day');
      if (rentDayErr) errors.rentDueDay = rentDayErr;
      if (profile.leaseEndDate && !isValidCalendarDate(profile.leaseEndDate)) {
        errors.leaseEndDate = 'Enter a valid lease end date (YYYY-MM-DD).';
      }
    }
  }

  if (screenId === 'insurance_protection') {
    if (!isValidMoney(profile.homeInsurancePremium)) errors.homeInsurancePremium = 'Enter a non-negative amount (up to 2 decimals).';
    if (!isValidMoney(profile.homeInsuranceDeductible)) errors.homeInsuranceDeductible = 'Enter a non-negative amount (up to 2 decimals).';
    if (!isValidMoney(profile.homeInsuranceCoverageLimit)) errors.homeInsuranceCoverageLimit = 'Enter a non-negative amount (up to 2 decimals).';
    if (profile.homeInsuranceEndDate && !isValidCalendarDate(profile.homeInsuranceEndDate)) {
      errors.homeInsuranceEndDate = 'Enter a valid policy end date (YYYY-MM-DD).';
    }
    if (!isValidMoney(profile.homeWarrantyCost)) errors.homeWarrantyCost = 'Enter a non-negative amount (up to 2 decimals).';
    if (profile.homeWarrantyRenewalDate && !isValidCalendarDate(profile.homeWarrantyRenewalDate)) {
      errors.homeWarrantyRenewalDate = 'Enter a valid renewal date (YYYY-MM-DD).';
    }
    if (!isValidMoney(profile.homeSecurityMonthlyFee)) errors.homeSecurityMonthlyFee = 'Enter a non-negative amount (up to 2 decimals).';
  }

  if (screenId === 'maintenance_costs_screen' && isOwner(profile)) {
    if (!isValidMoney(profile.monthlyMaintenanceReserve)) errors.monthlyMaintenanceReserve = 'Enter a non-negative amount (up to 2 decimals).';
    if (!isValidMoney(profile.plannedProjectsEstimatedCost)) errors.plannedProjectsEstimatedCost = 'Enter a non-negative amount (up to 2 decimals).';
    if (!isValidMoney(profile.emergencyRepairFundTarget)) errors.emergencyRepairFundTarget = 'Enter a non-negative amount (up to 2 decimals).';
  }

  return errors;
}

// ---------- COMPLETENESS & MISSING ITEMS ----------

export function calculateProfileCompleteness(rawProfile) {
  const p = migrateHouseholdProfile(rawProfile);

  const checks = [
    { key: 'address', sectionId: 'home_basics', sectionTitle: 'Home basics', label: 'Street address or ZIP code', highImpact: true, filled: () => Boolean(p.address || (p.city && p.zip)) },
    { key: 'ownership', sectionId: 'home_basics', sectionTitle: 'Home basics', label: 'Own or rent status', highImpact: true, filled: () => Boolean(p.ownership) },
    { key: 'homeType', sectionId: 'home_basics', sectionTitle: 'Home basics', label: 'Home type', highImpact: true, filled: () => Boolean(p.homeType) },
    { key: 'sqFt', sectionId: 'home_basics', sectionTitle: 'Home basics', label: 'Square feet & bedrooms', highImpact: true, filled: () => Boolean(p.sqFt && p.bedrooms != null) },
    { key: 'adultsCount', sectionId: 'household', sectionTitle: 'Household', label: 'Household members', highImpact: true, filled: () => p.adultsCount != null },
    { key: 'heating', sectionId: 'heating_cooling', sectionTitle: 'Heating & cooling', label: 'Heating & cooling systems', highImpact: true, filled: () => Boolean(p.heating && p.cooling) },
    { key: 'waterHeater', sectionId: 'heating_cooling', sectionTitle: 'Heating & cooling', label: 'Water heater type', highImpact: true, filled: () => Boolean(p.waterHeater) },
    { key: 'cookingFuel', sectionId: 'appliances', sectionTitle: 'Appliances', label: 'Cooking fuel & dryer', highImpact: false, filled: () => Boolean(p.cookingFuel && p.dryer) },
    { key: 'poolOrSpa', sectionId: 'pool_spa', sectionTitle: 'Pool or spa', label: 'Pool or spa status', highImpact: false, filled: () => Boolean(p.poolOrSpa) },
    { key: 'hasSolar', sectionId: 'solar_battery', sectionTitle: 'Solar & battery', label: 'Solar panels status', highImpact: true, filled: () => Boolean(p.hasSolar) },
    { key: 'evCount', sectionId: 'ev_charging', sectionTitle: 'EV & charging', label: 'EVs & home charging', highImpact: true, filled: () => Boolean(p.evCount || getLinkedEvVehicles(p).length > 0) },
    { key: 'electricUtility', sectionId: 'utilities', sectionTitle: 'Utilities', label: 'Electric utility & bill', highImpact: true, filled: () => p.noElectricService || Boolean(p.electricUtility) },
    { key: 'waterProvider', sectionId: 'utilities', sectionTitle: 'Utilities', label: 'Water & trash providers', highImpact: false, filled: () => (p.noWaterSewer || Boolean(p.waterProvider)) && (p.noTrashRecycling || Boolean(p.trashProvider)) },
    { key: 'internetProvider', sectionId: 'internet_phone', sectionTitle: 'Internet & phone', label: 'Internet & mobile plans', highImpact: true, filled: () => (p.noInternet || Boolean(p.internetProvider)) && (p.noMobilePhone || Boolean(p.mobileCarrier)) },
    { key: 'homeInsuranceCarrier', sectionId: 'insurance', sectionTitle: 'Insurance', label: isRenter(p) ? 'Renters insurance' : 'Homeowners insurance', highImpact: true, filled: () => Boolean(p.homeInsuranceCarrier || p.homeInsurancePremium != null) }
  ];

  if (p.ownership === 'own_with_mortgage') {
    checks.push({
      key: 'mortgageMonthlyPI',
      sectionId: 'housing_costs',
      sectionTitle: 'Housing costs',
      label: 'Mortgage payment & escrow',
      highImpact: true,
      filled: () => p.mortgageMonthlyPI != null
    });
  }
  if (isOwner(p)) {
    checks.push({
      key: 'propertyTaxAmount',
      sectionId: 'housing_costs',
      sectionTitle: 'Housing costs',
      label: 'Property tax',
      highImpact: true,
      filled: () => p.propertyTaxAmount != null
    });
  }
  if (isRenter(p)) {
    checks.push({
      key: 'monthlyRent',
      sectionId: 'housing_costs',
      sectionTitle: 'Housing costs',
      label: 'Monthly rent',
      highImpact: true,
      filled: () => p.monthlyRent != null
    });
  }
  if (p.hasSolar === 'yes') {
    checks.push({
      key: 'solarSpecs',
      sectionId: 'solar_battery',
      sectionTitle: 'Solar & battery',
      label: 'Solar panel count & billing plan',
      highImpact: true,
      filled: () => Boolean(p.solarPanelCount && p.solarWattsPerPanel && p.solarBillingPlan)
    });
  }

  let completedCount = 0;
  const missingItems = [];

  checks.forEach((c) => {
    if (c.filled()) {
      completedCount += 1;
    } else {
      missingItems.push({
        fieldKey: c.key,
        sectionId: c.sectionId,
        sectionTitle: c.sectionTitle,
        label: c.label,
        highImpact: c.highImpact
      });
    }
  });

  const totalCount = checks.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    percent,
    completedCount,
    totalCount,
    missingItems
  };
}

// ---------- REMINDERS ----------

function daysUntilDate(isoDate) {
  if (!isoDate) return null;
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Generates local-only reminders for expiring promo prices, warranties,
 * leases, insurance renewals, and aging owner equipment (roof, HVAC, water heater).
 */
export function generateHouseholdReminders(rawProfile) {
  const p = migrateHouseholdProfile(rawProfile);
  const currentYear = new Date().getFullYear();
  const reminders = [];

  const checkDateReminder = (dateStr, id, title, sectionId, category) => {
    if (!dateStr) return;
    const days = daysUntilDate(dateStr);
    if (days === null || days > 90) return;
    const urgency = days <= 0 ? 'urgent' : days <= 30 ? 'soon' : 'upcoming';
    const timingText =
      days < 0
        ? `Expired ${Math.abs(days)} days ago (${dateStr})`
        : days === 0
          ? `Due today (${dateStr})`
          : `In ${days} days (${dateStr})`;
    reminders.push({ id, title, detail: timingText, urgency, sectionId, category, days });
  };

  checkDateReminder(p.internetPromoEndDate, 'rem_internet_promo', `Internet promo rate ends${p.internetProvider ? ` (${p.internetProvider})` : ''}`, 'internet_phone', 'promo');
  checkDateReminder(p.homeWarrantyRenewalDate, 'rem_warranty', `Home warranty renewal${p.homeWarrantyProvider ? ` (${p.homeWarrantyProvider})` : ''}`, 'insurance', 'renewal');
  checkDateReminder(p.leaseEndDate, 'rem_lease', 'Rental lease end date', 'housing_costs', 'lease');
  checkDateReminder(p.homeInsuranceEndDate, 'rem_insurance', `${isRenter(p) ? 'Renters' : 'Homeowners'} policy renewal`, 'insurance', 'renewal');

  if (isOwner(p)) {
    if (p.roofAgeYears != null && Number(p.roofAgeYears) >= 18) {
      reminders.push({
        id: 'rem_roof_age',
        title: `Roof inspection recommended (${p.roofAgeYears} years old)`,
        detail: 'Composite/shingle roofs typically approach replacement around 20–25 years.',
        urgency: Number(p.roofAgeYears) >= 22 ? 'soon' : 'upcoming',
        sectionId: 'building_details',
        category: 'maintenance',
        days: 999
      });
    }
    if (p.hvacReplacedYear != null && currentYear - Number(p.hvacReplacedYear) >= 12) {
      const age = currentYear - Number(p.hvacReplacedYear);
      reminders.push({
        id: 'rem_hvac_age',
        title: `HVAC system is ${age} years old`,
        detail: 'Systems over 12–15 years benefit from annual tune-ups and replacement budgeting.',
        urgency: age >= 15 ? 'soon' : 'upcoming',
        sectionId: 'building_details',
        category: 'maintenance',
        days: 999
      });
    }
    if (p.waterHeaterReplacedYear != null && currentYear - Number(p.waterHeaterReplacedYear) >= 10) {
      const age = currentYear - Number(p.waterHeaterReplacedYear);
      reminders.push({
        id: 'rem_wh_age',
        title: `Water heater is ${age} years old`,
        detail: 'Tank water heaters typically last 8–12 years; check anode rod or plan replacement.',
        urgency: age >= 12 ? 'soon' : 'upcoming',
        sectionId: 'building_details',
        category: 'maintenance',
        days: 999
      });
    }
  }

  return reminders.sort((a, b) => (a.days ?? 999) - (b.days ?? 999));
}

// ---------- FREQUENCY CONVERSION & BILL SYNC ----------

export function toMonthlyEquivalent(amount, frequency = 'monthly') {
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) return 0;
  switch (frequency) {
    case 'every_2_months':
      return num / 2;
    case 'quarterly':
      return num / 3;
    case 'semi_annual':
    case 'per_installment':
      return num / 6;
    case 'annual':
    case 'per_year':
    case 'on_property_tax':
      return num / 12;
    case 'monthly':
    default:
      return num;
  }
}

/**
 * Builds deduplicated recurring bill candidates from confirmed household providers.
 * Never double-counts property tax or homeowners insurance when paid in mortgage escrow.
 */
export function buildSyncableBills(rawProfile, existingBills = []) {
  const p = migrateHouseholdProfile(rawProfile);
  const bills = Array.isArray(existingBills) ? existingBills : [];
  const candidates = [];

  const isInEscrow = p.ownership === 'own_with_mortgage' && p.mortgageEscrowTaxesInsurance === 'yes';

  const addCandidate = (id, name, category, amount, frequency, dueDay = 15, extraMatchTerms = []) => {
    const monthlyAmt = Math.round(toMonthlyEquivalent(amount, frequency) * 100) / 100;
    if (!monthlyAmt || monthlyAmt <= 0 || !name) return;
    const nameLower = name.toLowerCase();
    const terms = [nameLower, ...extraMatchTerms.map((t) => t.toLowerCase())];
    const matchedBill = bills.find((b) => {
      const bn = String(b?.name || '').toLowerCase();
      const bb = String(b?.biller || '').toLowerCase();
      return b?.id === `bill-hh-${id}` || terms.some((t) => t && (bn.includes(t) || bb.includes(t)));
    });
    candidates.push({
      key: id,
      billId: `bill-hh-${id}`,
      name,
      biller: name,
      category,
      expectedAmount: monthlyAmt,
      dueDay: Number(dueDay) || 15,
      frequency: frequency || 'monthly',
      alreadySynced: Boolean(matchedBill),
      matchedBill
    });
  };

  if (!p.noElectricService && p.electricUtility) {
    const eCost = p.electricMonthlyBillSummer ?? p.electricMonthlyBillWinter;
    if (eCost > 0) {
      addCandidate('electric', `${p.electricUtility} Electric`, 'Utilities', eCost, p.electricBillingFrequency, p.electricBillingDay || 15, ['electric', 'pg&e', 'sce', 'sdg&e', 'con ed', 'smud']);
    }
  }
  if (!p.noGasOrPropane && hasAnyGasOrPropaneUsage(p) && p.gasOrPropaneProvider && p.gasMonthlyBill > 0) {
    addCandidate('gas', `${p.gasOrPropaneProvider} Gas`, 'Utilities', p.gasMonthlyBill, p.gasBillingFrequency, 18, ['gas', 'propane', 'socalgas']);
  }
  if (!p.noWaterSewer && p.waterProvider && p.waterMonthlyBill > 0) {
    addCandidate('water', `${p.waterProvider} Water`, 'Utilities', p.waterMonthlyBill, p.waterBillingFrequency, 20, ['water', 'sewer']);
  }
  if (!p.noTrashRecycling && p.trashProvider && p.trashMonthlyBill > 0 && p.trashBillingFrequency !== 'on_property_tax') {
    addCandidate('trash', `${p.trashProvider} Trash`, 'Utilities', p.trashMonthlyBill, p.trashBillingFrequency, 22, ['trash', 'waste', 'republic']);
  }
  if (!p.noInternet && p.internetProvider && p.internetMonthlyCost > 0) {
    const totalNet = Number(p.internetMonthlyCost) + (Number(p.internetEquipmentRentalFee) || 0);
    addCandidate('internet', `${p.internetProvider} Internet`, 'Internet & Tech', totalNet, 'monthly', 12, ['internet', 'xfinity', 'fiber', 'spectrum', 'starlink']);
  }
  if (p.cableOrStreamingProvider && p.cableOrStreamingMonthlyCost > 0) {
    addCandidate('cable', `${p.cableOrStreamingProvider} TV / Streaming`, 'Subscriptions', p.cableOrStreamingMonthlyCost, 'monthly', 14, [p.cableOrStreamingProvider]);
  }
  if (!p.noMobilePhone && p.mobileCarrier && p.mobileMonthlyCost > 0) {
    addCandidate('mobile', `${p.mobileCarrier} Mobile`, 'Internet & Tech', p.mobileMonthlyCost, 'monthly', 24, ['mobile', 'wireless', 't-mobile', 'verizon', 'at&t']);
  }
  if (p.hasLandline === 'yes' && p.landlineMonthlyCost > 0) {
    addCandidate('landline', 'Home Landline Phone', 'Utilities', p.landlineMonthlyCost, 'monthly', 15, ['landline']);
  }
  if (p.hasSolar === 'yes' && (p.solarOwnership === 'leased' || p.solarOwnership === 'ppa' || p.solarOwnership === 'loan') && p.solarMonthlyPayment > 0) {
    addCandidate('solar', `Solar ${formatHouseholdLabel('solarOwnership', p.solarOwnership)}`, 'Utilities', p.solarMonthlyPayment, 'monthly', 10, ['solar', 'sunrun', 'sunnova']);
  }
  if (p.ownership === 'own_with_mortgage' && p.mortgageMonthlyPI > 0) {
    addCandidate('mortgage', 'Monthly Mortgage Payment', 'Housing', p.mortgageMonthlyPI, 'monthly', 1, ['mortgage', 'home loan']);
  }
  if (isRenter(p) && p.monthlyRent > 0) {
    addCandidate('rent', 'Monthly Rent', 'Housing', p.monthlyRent, 'monthly', p.rentDueDay || 1, ['rent', 'lease']);
  }
  if (isOwner(p) && !isInEscrow && p.propertyTaxAmount > 0) {
    addCandidate('property_tax', 'Property Tax Reserve', 'Housing', p.propertyTaxAmount, p.propertyTaxFrequency || 'per_year', 10, ['property tax']);
  }
  if (needsHoaSection(p) && p.hoaDues > 0) {
    addCandidate('hoa', 'HOA Dues', 'Housing', p.hoaDues, p.hoaFrequency || 'monthly', 1, ['hoa', 'homeowners association']);
  }
  if (!isInEscrow && p.homeInsuranceCarrier && p.homeInsurancePremium > 0) {
    addCandidate('home_insurance', `${p.homeInsuranceCarrier} ${isRenter(p) ? 'Renters' : 'Home'} Insurance`, 'Insurance', p.homeInsurancePremium, p.homeInsuranceFrequency || 'annual', 15, ['homeowners', 'renters insurance']);
  }
  if (p.homeWarrantyProvider && p.homeWarrantyCost > 0) {
    addCandidate('warranty', `${p.homeWarrantyProvider} Home Warranty`, 'Home', p.homeWarrantyCost, 'monthly', 15, ['warranty']);
  }
  if (p.homeSecurityProvider && p.homeSecurityMonthlyFee > 0) {
    addCandidate('security', `${p.homeSecurityProvider} Security`, 'Home', p.homeSecurityMonthlyFee, 'monthly', 15, ['security', 'ring', 'adt', 'simplisafe']);
  }
  if (p.poolService === 'paid' && p.poolServiceMonthlyCost > 0) {
    addCandidate('pool_service', 'Pool Maintenance Service', 'Home', p.poolServiceMonthlyCost, 'monthly', 15, ['pool service']);
  }
  (p.outdoorServices || []).forEach((svc) => {
    if (svc?.provider && svc?.cost > 0) {
      addCandidate(`svc_${svc.id}`, `${svc.provider} (${svc.typeLabel || 'Home service'})`, 'Home', svc.cost, svc.frequency || 'monthly', 15, [svc.provider]);
    }
  });

  return candidates;
}

/**
 * Helper to fetch local ZIP/state suggestions synchronously without network access.
 */
export function getLocalUtilitySuggestions(profile) {
  return lookupLocalUtilityData(profile?.zip, profile?.state, profile?.electricUtility);
}
