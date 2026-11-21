/**
 * Household, Utility & Vehicle Fleet Intelligence Engine (100% local, zero network calls)
 *
 * Provides real-world estimation and advisory models for:
 * 1. Dwelling & Household Utility Modeling (regional ZIP rates, Gas/Propane, Water/Trash)
 * 2. Vehicle Fleet Fuel & Maintenance Costing (Gas ICE, Hybrid, PHEV, Battery EV)
 * 3. Free & Low-Cost EV Charging Network Directory by Region
 * 4. 0% APR New Electric Vehicle Acquisition & Rebate Stacking Advisor
 */

import { lookupLocalUtilityData } from '../data/usUtilityData.js';
import {
  createEmptyV2Profile,
  migrateHouseholdProfile,
  formatHouseholdLabel,
  hasAnyGasOrPropaneUsage,
  isOwner,
  isRenter,
  needsHoaSection,
  toMonthlyEquivalent,
  generateHouseholdReminders,
  calculateProfileCompleteness,
  buildSyncableBills
} from './householdSchema.js';

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

export const PROVIDER_SPECIFIC_PLANS = {
  phone: {
    't-mobile': [
      { name: 'Go5G Next', tag: 'Current' },
      { name: 'Go5G Plus', tag: 'Current' },
      { name: 'Go5G', tag: 'Current' },
      { name: 'Experience Beyond', tag: 'Promo / New' },
      { name: 'Magenta MAX', tag: 'Grandfathered' },
      { name: 'Magenta', tag: 'Grandfathered' },
      { name: 'ONE Plan', tag: 'Grandfathered' },
      { name: 'ONE Plus', tag: 'Grandfathered' },
      { name: 'Simple Choice', tag: 'Grandfathered' },
      { name: 'Essentials', tag: 'Current' },
      { name: 'Connect by T-Mobile', tag: 'Prepaid' }
    ],
    'at&t': [
      { name: 'Unlimited Premium PL', tag: 'Current' },
      { name: 'Unlimited Extra EL', tag: 'Current' },
      { name: 'Unlimited Starter SL', tag: 'Current' },
      { name: 'Unlimited Elite', tag: 'Grandfathered' },
      { name: 'Unlimited Plus', tag: 'Grandfathered' },
      { name: 'Unlimited Choice', tag: 'Grandfathered' },
      { name: 'Unlimited &More Premium', tag: 'Grandfathered' },
      { name: 'Value Plus VL', tag: 'Current' },
      { name: '4GB Plan', tag: 'Current' }
    ],
    'verizon': [
      { name: 'Unlimited Ultimate', tag: 'Current' },
      { name: 'Unlimited Plus', tag: 'Current' },
      { name: 'Unlimited Welcome', tag: 'Current' },
      { name: '5G Get More', tag: 'Grandfathered' },
      { name: '5G Play More', tag: 'Grandfathered' },
      { name: '5G Do More', tag: 'Grandfathered' },
      { name: '5G Start', tag: 'Grandfathered' },
      { name: 'The New Verizon Plan Unlimited', tag: 'Grandfathered' },
      { name: 'Single Basic Phone Plan', tag: 'Grandfathered' }
    ],
    'mint': [
      { name: 'Unlimited (40GB high-speed)', tag: 'Current' },
      { name: '20GB 5G/4G LTE', tag: 'Current' },
      { name: '15GB 5G/4G LTE', tag: 'Current' },
      { name: '5GB 5G/4G LTE', tag: 'Current' }
    ],
    'google fi': [
      { name: 'Unlimited Plus', tag: 'Current' },
      { name: 'Simply Unlimited', tag: 'Current' },
      { name: 'Flexible ($20 + $10/GB)', tag: 'Current' }
    ],
    'visible': [
      { name: 'Visible+', tag: 'Current' },
      { name: 'Visible Base', tag: 'Current' }
    ]
  },
  internet: {
    'xfinity': [
      { name: 'Gigabit Extra (1200 Mbps)', tag: 'Current' },
      { name: 'Gigabit x2 (2000 Mbps)', tag: 'Current' },
      { name: 'Gigabit (1000 Mbps)', tag: 'Current' },
      { name: 'Ultrafast (800 Mbps)', tag: 'Current' },
      { name: 'Superfast (500 Mbps)', tag: 'Current' },
      { name: 'Fast (300 Mbps)', tag: 'Current' },
      { name: 'Connect More (200 Mbps)', tag: 'Current' },
      { name: 'Connect (75 Mbps)', tag: 'Current' },
      { name: 'NOW Internet', tag: 'Current' },
      { name: 'Extreme Pro', tag: 'Grandfathered' },
      { name: 'Performance Pro', tag: 'Grandfathered' }
    ],
    'at&t': [
      { name: 'AT&T Fiber 5000 (5 Gigs)', tag: 'Current' },
      { name: 'AT&T Fiber 2000 (2 Gigs)', tag: 'Current' },
      { name: 'AT&T Fiber 1000 (1 Gig)', tag: 'Current' },
      { name: 'AT&T Fiber 500', tag: 'Current' },
      { name: 'AT&T Fiber 300', tag: 'Current' },
      { name: 'Internet Air (5G Home)', tag: 'Current' },
      { name: 'Internet 100 (Copper/VDSL)', tag: 'Grandfathered' },
      { name: 'Internet 50 / 25', tag: 'Grandfathered' }
    ],
    'spectrum': [
      { name: 'Spectrum Internet Gig (1000 Mbps)', tag: 'Current' },
      { name: 'Spectrum Internet Ultra (500 Mbps)', tag: 'Current' },
      { name: 'Spectrum Internet (300 Mbps)', tag: 'Current' },
      { name: 'Spectrum Internet 100', tag: 'Current' },
      { name: 'Spectrum Internet Assist (30 Mbps)', tag: 'Grandfathered / Low-Income' }
    ],
    'verizon': [
      { name: 'Fios 2 Gigabit', tag: 'Current' },
      { name: 'Fios 1 Gigabit', tag: 'Current' },
      { name: 'Fios 500 Mbps', tag: 'Current' },
      { name: 'Fios 300 Mbps', tag: 'Current' },
      { name: '5G Home Plus', tag: 'Current' },
      { name: '5G Home', tag: 'Current' }
    ],
    'frontier': [
      { name: 'Fiber 5 Gig', tag: 'Current' },
      { name: 'Fiber 2 Gig', tag: 'Current' },
      { name: 'Fiber 1 Gig', tag: 'Current' },
      { name: 'Fiber 500 Mbps', tag: 'Current' },
      { name: 'Frontier Internet (DSL)', tag: 'Grandfathered' }
    ],
    'starlink': [
      { name: 'Standard (Residential)', tag: 'Current' },
      { name: 'Priority (High Demand / Business)', tag: 'Current' },
      { name: 'Mobile (Roam / RV)', tag: 'Current' },
      { name: 'Best Effort', tag: 'Grandfathered' }
    ]
  },
  electricGas: {
    'pg&e': [
      { name: 'EV2-A (Home Charging & Solar TOU)', tag: 'EV / Storage' },
      { name: 'E-ELEC (Electric Home / Heat Pump / EV)', tag: 'All-Electric' },
      { name: 'E-TOU-C (Peak 4–9 PM Every Day)', tag: 'Default TOU' },
      { name: 'E-TOU-D (Peak 5–8 PM Weekdays)', tag: 'TOU' },
      { name: 'E-1 (Tiered Rate Plan)', tag: 'Grandfathered / Tiered' },
      { name: 'CARE Discount Rate (30%+ off)', tag: 'Discount Program' },
      { name: 'FERA Discount Rate (18% off)', tag: 'Discount Program' },
      { name: 'G-1 Residential Natural Gas', tag: 'Gas Rate' }
    ],
    'pge': [
      { name: 'EV2-A (Home Charging & Solar TOU)', tag: 'EV / Storage' },
      { name: 'E-ELEC (Electric Home / Heat Pump / EV)', tag: 'All-Electric' },
      { name: 'E-TOU-C (Peak 4–9 PM Every Day)', tag: 'Default TOU' },
      { name: 'E-TOU-D (Peak 5–8 PM Weekdays)', tag: 'TOU' },
      { name: 'E-1 (Tiered Rate Plan)', tag: 'Grandfathered / Tiered' },
      { name: 'CARE Discount Rate (30%+ off)', tag: 'Discount Program' },
      { name: 'FERA Discount Rate (18% off)', tag: 'Discount Program' }
    ],
    'sce': [
      { name: 'TOU-D-PRIME (EV, Battery & Heat Pump)', tag: 'EV / Storage' },
      { name: 'TOU-D-4-9PM (Peak 4–9 PM)', tag: 'Current' },
      { name: 'TOU-D-5-8PM (Peak 5–8 PM)', tag: 'Current' },
      { name: 'Domestic (Tiered D)', tag: 'Tiered' },
      { name: 'CARE / FERA Rate', tag: 'Discount Program' }
    ],
    'sdg&e': [
      { name: 'EV-TOU-5 (Super Off-Peak EV)', tag: 'EV Rate' },
      { name: 'EV-TOU-2', tag: 'EV Rate' },
      { name: 'TOU-DR1 (Peak 4–9 PM)', tag: 'Default TOU' },
      { name: 'Standard DR (Tiered Rate)', tag: 'Tiered' }
    ],
    'socalgas': [
      { name: 'GR (Residential Natural Gas Service)', tag: 'Current' },
      { name: 'G-CARE (Gas Discount Program)', tag: 'Discount Program' }
    ],
    'smud': [
      { name: 'Time-of-Day (5–8 PM Peak)', tag: 'Default' },
      { name: 'Fixed Rate (Standard Residential)', tag: 'Tiered' }
    ]
  },
  trash: {
    'standard': [
      { name: '96-Gallon Heavy / Large Family Cart', tag: 'Large' },
      { name: '64-Gallon Standard Household Cart', tag: 'Standard' },
      { name: '32-Gallon Eco / Small Cart', tag: 'Eco / Small' },
      { name: 'Commercial 2-Yard Bin', tag: 'Commercial' },
      { name: 'Included in Municipal Property Taxes / HOA', tag: 'Included' }
    ]
  },
  security: {
    'ring': [
      { name: 'Ring Protect Pro ($20/mo or $200/yr)', tag: '24/7 Pro + Backup' },
      { name: 'Ring Protect Plus ($10/mo)', tag: 'Video All Devices' },
      { name: 'Ring Protect Basic ($3.99/mo)', tag: 'Single Device Video' },
      { name: 'Ring Home Standard', tag: 'New Tier' },
      { name: 'Ring Home Premium', tag: 'New Tier' },
      { name: 'Free (Live View & Notifications only)', tag: 'No Subscription' }
    ],
    'adt': [
      { name: 'ADT Complete (Video + Smart Home + Pro Monitoring)', tag: 'Full Package' },
      { name: 'ADT Remote (Smart Home + Pro Monitoring)', tag: 'Current' },
      { name: 'ADT Secure (Basic 24/7 Police Monitoring)', tag: 'Current' },
      { name: 'ADT Self Setup', tag: 'DIY' }
    ],
    'simplisafe': [
      { name: 'Fast Protect Monitoring ($31.99/mo)', tag: 'Live Guard + 24/7' },
      { name: 'Standard Monitoring ($21.99/mo)', tag: '24/7 Police Dispatch' },
      { name: 'Self-Monitoring with Camera Recording ($9.99/mo)', tag: 'Cloud Storage' },
      { name: 'Unmonitored Free', tag: 'Self-Monitored' }
    ],
    'nest': [
      { name: 'Nest Aware Plus (24/7 10-day video + 60 days events)', tag: 'Full Video' },
      { name: 'Nest Aware (30-day event video history)', tag: 'Event History' },
      { name: 'Nest 1st Gen Grandfathered ($5/$10/mo)', tag: 'Grandfathered' },
      { name: 'Nest Free (3-hour snapshot)', tag: 'Free' }
    ],
    'vivint': [
      { name: 'Vivint Smart Home Total Video & Cloud', tag: 'Top Tier' },
      { name: 'Vivint Smart Home Automation & Monitoring', tag: 'Current' },
      { name: 'Vivint Security Basics', tag: 'Monitoring' }
    ]
  },
  homeWarranty: {
    'homeshield': [
      { name: 'ShieldGold (Systems & Appliances)', tag: 'Combo Plan' },
      { name: 'ShieldPlatinum (Comprehensive + Roof Leak)', tag: 'Premium' },
      { name: 'ShieldSilver (Major Built-in Systems)', tag: 'Systems Only' }
    ],
    'choice': [
      { name: 'Total Plan (Appliances & Plumbing/HVAC)', tag: 'Combo Plan' },
      { name: 'Basic Plan (Primary Appliances)', tag: 'Basic' }
    ],
    'firstamerican': [
      { name: 'Eagle Premier (Comprehensive Systems & Appliances)', tag: 'Full Coverage' },
      { name: 'Basic Plan (Appliances Only)', tag: 'Standard' }
    ],
    'cinch': [
      { name: 'Complete Home Plan', tag: 'All-in-One' },
      { name: 'Appliances Plan', tag: 'Appliances' },
      { name: 'Built-in Systems Plan', tag: 'Systems' }
    ],
    'liberty': [
      { name: 'Total Home Guard', tag: 'Combo Plan' },
      { name: 'Appliance Guard', tag: 'Appliances' },
      { name: 'Systems Guard', tag: 'Systems' }
    ],
    'select': [
      { name: 'Platinum Care (Systems & Appliances)', tag: 'Comprehensive' },
      { name: 'Gold Care (Major Systems)', tag: 'Systems' },
      { name: 'Bronze Care (Major Appliances)', tag: 'Appliances' }
    ]
  }
};

export function getPlansForProvider(category, providerName) {
  if (!providerName) {
    if (category === 'trash') return PROVIDER_SPECIFIC_PLANS.trash.standard;
    const catObj = PROVIDER_SPECIFIC_PLANS[category] || {};
    const firstKey = Object.keys(catObj)[0];
    return firstKey ? catObj[firstKey] : [];
  }
  const norm = String(providerName).toLowerCase().replace(/[^a-z0-9&]/g, '');
  const catObj = PROVIDER_SPECIFIC_PLANS[category] || {};

  for (const [key, list] of Object.entries(catObj)) {
    const keyNorm = key.replace(/[^a-z0-9&]/g, '');
    if (norm.includes(keyNorm) || keyNorm.includes(norm)) {
      return list;
    }
  }

  if (category === 'trash') return PROVIDER_SPECIFIC_PLANS.trash.standard;

  // Flatten unique plans from this category as fallback
  const allInCat = [];
  for (const list of Object.values(catObj)) {
    for (const item of list) {
      if (!allInCat.some(x => x.name === item.name)) {
        allInCat.push(item);
      }
    }
  }
  return allInCat;
}

export const HOUSEHOLD_PLAN_OPTIONS = {
  internet: [
    { id: 'gigabit_fiber', label: 'Gigabit Fiber (1000+ Mbps)' },
    { id: 'fast_500', label: 'Fast Fiber / Cable (500 Mbps)' },
    { id: 'standard_300', label: 'Standard High-Speed (300 Mbps)' },
    { id: 'wireless_5g', label: '5G Home Wireless Internet' },
    { id: 'basic_dsl', label: 'Basic Cable / DSL' }
  ],
  phone: [
    { id: 'unlimited_premium', label: 'Unlimited Premium (Priority Data & Hotspot)' },
    { id: 'unlimited_standard', label: 'Unlimited Standard (Core Data Plan)' },
    { id: 'budget_prepaid', label: 'Prepaid / Budget Unlimited' },
    { id: 'by_the_gig', label: 'Shared / By-the-Gig Plan' }
  ],
  electricGas: [
    { id: 'tou_ev', label: 'Time-of-Use EV Rate (Lowest overnight off-peak)' },
    { id: 'tou_standard', label: 'Time-of-Use 4–9 PM Peak (Standard TOU)' },
    { id: 'tiered_flat', label: 'Tiered Flat Rate (Traditional Tier 1/2)' },
    { id: 'care_discount', label: 'CARE / FERA Discounted Rate Plan' }
  ],
  trash: [
    { id: 'standard_64', label: 'Standard Household (64-Gal Carts)' },
    { id: 'large_96', label: 'Large Family (96-Gal Carts)' },
    { id: 'small_32', label: 'Eco / Small Household (32-Gal Carts)' }
  ],
  security: [
    { id: 'pro_monitoring', label: '24/7 Professional Police Monitoring' },
    { id: 'cloud_video', label: 'Cloud Video Recording & History' },
    { id: 'self_monitored', label: 'Self-Monitored (No subscription)' },
    { id: 'none', label: 'No Security System' }
  ]
};

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

export const DEFAULT_HOUSEHOLD_PROFILE = createEmptyV2Profile();

/**
 * Helper to suggest utility, telecom, and home finance providers from bundled local ZIP data.
 */
export function getSuggestedProviders(rawProfile = {}) {
  const profile = migrateHouseholdProfile(rawProfile);
  const local = lookupLocalUtilityData(profile.zip, profile.state, profile.electricUtility);
  const city = (profile.city || 'Municipal').split(',')[0].trim();

  return {
    electricity: profile.electricUtility || local.primaryElectricUtility,
    gas: profile.gasOrPropaneProvider || local.gasUtilities?.[0] || 'Local Natural Gas Utility',
    waterTrash: profile.waterProvider || profile.trashProvider || `${city} Water & Trash`,
    internet: profile.internetProvider || 'Local Fiber / Cable Internet',
    phone: profile.mobileCarrier || 'Mobile Carrier',
    security: profile.homeSecurityProvider || 'Home Security',
    homeWarranty: profile.homeWarrantyProvider || 'Home Warranty',
    mortgageRent: isRenter(profile) ? 'Landlord / Property Manager' : 'Mortgage Servicer',
    propertyTax: 'County Tax Collector',
    hoa: 'HOA Community Association',
    homeInsurance: isRenter(profile) ? 'Renters Insurance' : 'Homeowners Insurance'
  };
}

function matchUserBill(bills, terms = []) {
  return bills.find((b) => {
    const bName = String(b?.name || '').toLowerCase();
    const bCat = String(b?.category || '').toLowerCase();
    const bId = String(b?.id || '').toLowerCase();
    if (b?.isSimulated || b?.isMock || bId.startsWith('mock-') || bId.startsWith('demo-')) return false;
    return terms.some((t) => bName.includes(t) || bCat.includes(t));
  });
}

/**
 * Computes itemized monthly home cost items with explicit source attribution:
 *   - 'verified'     (matched to a connected/synced bill in userBills)
 *   - 'user_entered' (explicitly entered in the Household questionnaire or cost editor)
 *   - 'estimate'     (calculated by the local engine)
 *
 * Strictly enforces renter/owner branching and avoids double-counting escrow taxes/insurance.
 */
export function calculateHomeCostBreakdown(rawProfile = {}, metrics = null, userBills = []) {
  const profile = migrateHouseholdProfile(rawProfile);
  const computedMetrics = metrics || calculateHouseholdAndFleetMetrics(profile);
  const suggestedProviders = getSuggestedProviders(profile);
  const userCosts = profile.monthlyCosts || {};
  const bills = Array.isArray(userBills) ? userBills : [];

  const rentMode = isRenter(profile);
  const ownerMode = isOwner(profile);
  const inEscrow = profile.ownership === 'own_with_mortgage' && profile.mortgageEscrowTaxesInsurance === 'yes';

  const rawVal = Number(String(profile.estimatedValue || '425000').replace(/[^0-9]/g, '')) || 425000;
  const sqFt = Number(profile.sqFt) || computedMetrics.sqFt || 1850;

  const estElectric =
    computedMetrics?.utilities?.homeElectricCost != null
      ? computedMetrics.utilities.homeElectricCost + (computedMetrics.utilities.evHomeChargingCost || 0)
      : 165;
  const estGas = computedMetrics?.utilities?.naturalGasCost != null ? computedMetrics.utilities.naturalGasCost : 65;
  const estWaterTrash =
    computedMetrics?.utilities?.waterTrashTotalCost != null ? computedMetrics.utilities.waterTrashTotalCost : 110;

  const rows = [];

  const resolveCostRow = ({
    id,
    label,
    provider,
    directAmount = null,
    directFrequency = 'monthly',
    legacyCostKey = null,
    estAmount = null,
    billTerms = [],
    detail = '',
    disabled = false,
    disabledNote = ''
  }) => {
    if (disabled) {
      return {
        id,
        label,
        provider: provider || 'None',
        amount: 0,
        source: 'user_entered',
        detail: disabledNote || 'Not applicable',
        excluded: true
      };
    }

    // 1. Verified real/synced bill takes top priority if present
    const matchedBill = billTerms.length > 0 ? matchUserBill(bills, billTerms) : null;
    if (matchedBill && Number(matchedBill.expectedAmount) > 0) {
      return {
        id,
        label,
        provider: provider || matchedBill.name || label,
        amount: Math.round(Number(matchedBill.expectedAmount) * 100) / 100,
        source: 'verified',
        detail: detail || `Matched bill: ${matchedBill.name}`,
        billId: matchedBill.id
      };
    }

    // 2. Direct amount entered in Household questionnaire/editor
    if (directAmount !== null && directAmount !== undefined && directAmount !== '' && Number(directAmount) >= 0) {
      const monthly = Math.round(toMonthlyEquivalent(Number(directAmount), directFrequency) * 100) / 100;
      return {
        id,
        label,
        provider: provider || label,
        amount: monthly,
        source: 'user_entered',
        detail:
          directFrequency && directFrequency !== 'monthly'
            ? `${formatHouseholdLabel('billingFrequency', directFrequency)} · converted to monthly`
            : detail
      };
    }

    // 3. Legacy monthlyCosts override
    if (legacyCostKey && userCosts[legacyCostKey] && userCosts[legacyCostKey].amount != null) {
      return {
        id,
        label,
        provider: provider || userCosts[legacyCostKey].provider || label,
        amount: Math.round(Number(userCosts[legacyCostKey].amount) * 100) / 100,
        source: 'user_entered',
        detail
      };
    }

    // 4. Local estimate fallback
    if (estAmount !== null && estAmount !== undefined) {
      return {
        id,
        label,
        provider: provider || label,
        amount: Math.round(Number(estAmount) * 100) / 100,
        source: 'estimate',
        detail
      };
    }

    return null;
  };

  // Electricity
  const avgUserElectric =
    profile.electricMonthlyBillSummer != null && profile.electricMonthlyBillWinter != null
      ? (Number(profile.electricMonthlyBillSummer) + Number(profile.electricMonthlyBillWinter)) / 2
      : profile.electricMonthlyBillSummer ?? profile.electricMonthlyBillWinter ?? null;

  rows.push(
    resolveCostRow({
      id: 'electricity',
      label: 'Electricity',
      provider: profile.electricUtility || suggestedProviders.electricity,
      directAmount: avgUserElectric,
      directFrequency: profile.electricBillingFrequency || 'monthly',
      legacyCostKey: 'electricity',
      estAmount: profile.noElectricService ? 0 : estElectric,
      billTerms: ['electric', 'pg&e', 'pge', 'smud', 'edison', 'sdg&e', 'con ed', 'ladwp', 'fpl', 'comed'],
      detail: profile.electricRatePlan || '',
      disabled: Boolean(profile.noElectricService),
      disabledNote: 'No electric service'
    })
  );

  // Natural Gas or Propane (only when gas/propane is used and not marked "I don't have this")
  if (!profile.noGasOrPropane && hasAnyGasOrPropaneUsage(profile)) {
    rows.push(
      resolveCostRow({
        id: 'gas',
        label: profile.heating === 'propane' ? 'Propane / Gas' : 'Natural gas',
        provider: profile.gasOrPropaneProvider || suggestedProviders.gas,
        directAmount: profile.gasMonthlyBill,
        directFrequency: profile.gasBillingFrequency || 'monthly',
        legacyCostKey: 'gas',
        estAmount: estGas,
        billTerms: ['natural gas', 'socalgas', 'atmos', 'nicor', 'propane', 'gas']
      })
    );
  }

  // Water & Sewer
  if (!profile.noWaterSewer && profile.hasWell !== 'yes') {
    rows.push(
      resolveCostRow({
        id: 'water',
        label: 'Water & sewer',
        provider: profile.waterProvider || 'Municipal Water',
        directAmount: profile.waterMonthlyBill,
        directFrequency: profile.waterBillingFrequency || 'monthly',
        estAmount: Math.round(estWaterTrash * 0.6),
        billTerms: ['water', 'sewer']
      })
    );
  }

  // Trash & Recycling
  if (!profile.noTrashRecycling && profile.trashBillingFrequency !== 'on_property_tax') {
    rows.push(
      resolveCostRow({
        id: 'trash',
        label: 'Trash & recycling',
        provider: profile.trashProvider || 'Waste & Recycling',
        directAmount: profile.trashMonthlyBill,
        directFrequency: profile.trashBillingFrequency || 'monthly',
        estAmount: Math.round(estWaterTrash * 0.4),
        billTerms: ['trash', 'waste', 'republic services', 'recology']
      })
    );
  }

  // Internet
  if (!profile.noInternet) {
    const netTotal =
      profile.internetMonthlyCost != null
        ? Number(profile.internetMonthlyCost) + (Number(profile.internetEquipmentRentalFee) || 0)
        : null;
    rows.push(
      resolveCostRow({
        id: 'internet',
        label: 'Internet',
        provider: profile.internetProvider || suggestedProviders.internet,
        directAmount: netTotal,
        directFrequency: 'monthly',
        legacyCostKey: 'internet',
        estAmount: 70,
        billTerms: ['internet', 'wifi', 'xfinity', 'comcast', 'at&t fiber', 'spectrum', 'verizon fios', 'frontier', 'starlink'],
        detail: profile.internetPlan || ''
      })
    );
  }

  // Cable / Streaming Bundle
  if (profile.cableOrStreamingProvider || profile.cableOrStreamingMonthlyCost != null) {
    rows.push(
      resolveCostRow({
        id: 'cable_streaming',
        label: 'TV / Streaming bundle',
        provider: profile.cableOrStreamingProvider || 'TV / Streaming',
        directAmount: profile.cableOrStreamingMonthlyCost ?? 0,
        directFrequency: 'monthly',
        billTerms: ['youtube tv', 'hulu', 'directv', 'cable', 'streaming']
      })
    );
  }

  // Mobile Phone
  if (!profile.noMobilePhone) {
    rows.push(
      resolveCostRow({
        id: 'mobile',
        label: 'Mobile phone',
        provider: profile.mobileCarrier || suggestedProviders.phone,
        directAmount: profile.mobileMonthlyCost,
        directFrequency: 'monthly',
        legacyCostKey: 'phone',
        estAmount: profile.mobileLines ? Number(profile.mobileLines) * 38 : 95,
        billTerms: ['mobile', 'wireless', 't-mobile', 'tmobile', 'verizon', 'mint mobile', 'google fi'],
        detail: profile.mobileLines ? `${profile.mobileLines} line(s)` : ''
      })
    );
  }

  // Landline
  if (profile.hasLandline === 'yes') {
    rows.push(
      resolveCostRow({
        id: 'landline',
        label: 'Home landline',
        provider: 'Home Landline',
        directAmount: profile.landlineMonthlyCost ?? 0,
        directFrequency: 'monthly',
        billTerms: ['landline', 'home phone']
      })
    );
  }

  // Solar lease / PPA / loan payment
  if (profile.hasSolar === 'yes' && ['loan', 'leased', 'ppa'].includes(profile.solarOwnership)) {
    rows.push(
      resolveCostRow({
        id: 'solar_payment',
        label: `Solar (${formatHouseholdLabel('solarOwnership', profile.solarOwnership)})`,
        provider: 'Solar Financing / Lease',
        directAmount: profile.solarMonthlyPayment ?? 0,
        directFrequency: 'monthly',
        billTerms: ['solar', 'sunrun', 'sunnova', 'mosaic']
      })
    );
  }

  // Housing cost: strictly branch owner vs renter
  if (rentMode) {
    rows.push(
      resolveCostRow({
        id: 'housing_rent',
        label: 'Monthly rent',
        provider: 'Landlord / Property Manager',
        directAmount: profile.monthlyRent,
        directFrequency: 'monthly',
        legacyCostKey: 'mortgageRent',
        estAmount: Math.round(sqFt * 1.35),
        billTerms: ['rent', 'lease', 'apartment']
      })
    );
  } else if (profile.ownership === 'own_with_mortgage') {
    rows.push(
      resolveCostRow({
        id: 'housing_mortgage',
        label: 'Mortgage payment',
        provider: 'Mortgage Servicer',
        directAmount: profile.mortgageMonthlyPI,
        directFrequency: 'monthly',
        legacyCostKey: 'mortgageRent',
        estAmount: Math.round(rawVal * 0.0052),
        billTerms: ['mortgage', 'home loan'],
        detail: inEscrow ? 'Includes property tax & homeowners insurance (escrow)' : 'Principal & interest'
      })
    );
  }

  // Second mortgage / HELOC (owners only)
  if (ownerMode && profile.hasSecondMortgageHeloc === 'yes') {
    rows.push(
      resolveCostRow({
        id: 'second_mortgage',
        label: 'Second mortgage / HELOC',
        provider: 'HELOC / 2nd Lien',
        directAmount: profile.secondMortgagePayment ?? 0,
        directFrequency: 'monthly',
        billTerms: ['heloc', 'second mortgage']
      })
    );
  }

  // Property Tax (owners only; excluded from incremental sum if in mortgage escrow)
  if (ownerMode) {
    rows.push(
      resolveCostRow({
        id: 'property_tax',
        label: 'Property tax',
        provider: 'County Tax Collector',
        directAmount: profile.propertyTaxAmount,
        directFrequency: profile.propertyTaxFrequency || 'per_year',
        legacyCostKey: 'propertyTax',
        estAmount: Math.round((rawVal * 0.0115) / 12),
        billTerms: ['property tax', 'tax collector'],
        disabled: inEscrow,
        disabledNote: 'Included in mortgage escrow (not counted twice)'
      })
    );
  }

  // Special District Taxes (owners only)
  if (ownerMode && profile.hasSpecialDistrictTax === 'yes' && profile.specialDistrictTaxAmount > 0) {
    rows.push(
      resolveCostRow({
        id: 'special_district',
        label: 'Special district taxes',
        provider: 'Local District Assessment',
        directAmount: profile.specialDistrictTaxAmount,
        directFrequency: 'annual',
        billTerms: ['special district', 'mello-roos']
      })
    );
  }

  // HOA dues
  if (needsHoaSection(profile)) {
    rows.push(
      resolveCostRow({
        id: 'hoa',
        label: 'HOA dues',
        provider: 'HOA Association',
        directAmount: profile.hoaDues,
        directFrequency: profile.hoaFrequency || 'monthly',
        legacyCostKey: 'hoa',
        estAmount: profile.homeType === 'condo' ? 290 : 120,
        billTerms: ['hoa', 'association']
      })
    );
  }

  // Homeowners vs Renters Insurance (excluded from incremental sum if in escrow)
  rows.push(
    resolveCostRow({
      id: 'home_insurance',
      label: rentMode ? 'Renters insurance' : 'Homeowners insurance',
      provider: profile.homeInsuranceCarrier || suggestedProviders.homeInsurance,
      directAmount: profile.homeInsurancePremium,
      directFrequency: profile.homeInsuranceFrequency || 'annual',
      legacyCostKey: 'homeInsurance',
      estAmount: rentMode ? 22 : Math.round((rawVal * 0.0035) / 12),
      billTerms: ['homeowners', 'renters insurance', 'hazard insurance'],
      disabled: !rentMode && inEscrow,
      disabledNote: 'Included in mortgage escrow (not counted twice)'
    })
  );

  // Home Warranty
  if (profile.homeWarrantyProvider || profile.homeWarrantyCost > 0) {
    rows.push(
      resolveCostRow({
        id: 'home_warranty',
        label: 'Home warranty',
        provider: profile.homeWarrantyProvider || 'Home Warranty',
        directAmount: profile.homeWarrantyCost ?? 0,
        directFrequency: 'monthly',
        billTerms: ['home warranty', 'american home shield', 'choice home warranty']
      })
    );
  }

  // Home Security
  if (profile.homeSecurityProvider || profile.homeSecurityMonthlyFee > 0) {
    rows.push(
      resolveCostRow({
        id: 'home_security',
        label: 'Home security',
        provider: profile.homeSecurityProvider || 'Home Security',
        directAmount: profile.homeSecurityMonthlyFee ?? 0,
        directFrequency: 'monthly',
        billTerms: ['ring', 'adt', 'simplisafe', 'vivint', 'home security']
      })
    );
  }

  // Paid Pool Service
  if (profile.poolOrSpa && profile.poolOrSpa !== 'none' && profile.poolService === 'paid' && profile.poolServiceMonthlyCost > 0) {
    rows.push(
      resolveCostRow({
        id: 'pool_service',
        label: 'Pool service',
        provider: 'Pool Service',
        directAmount: profile.poolServiceMonthlyCost,
        directFrequency: 'monthly',
        billTerms: ['pool service']
      })
    );
  }

  // Outdoor & custom services
  (profile.outdoorServices || []).forEach((svc) => {
    if (svc?.provider && svc?.cost > 0) {
      rows.push(
        resolveCostRow({
          id: `outdoor_${svc.id}`,
          label: svc.typeLabel || 'Home service',
          provider: svc.provider,
          directAmount: svc.cost,
          directFrequency: svc.frequency || 'monthly',
          billTerms: [svc.provider]
        })
      );
    }
  });

  // Maintenance reserve (owners with explicit entry)
  if (ownerMode && profile.monthlyMaintenanceReserve > 0) {
    rows.push(
      resolveCostRow({
        id: 'maintenance_reserve',
        label: 'Maintenance reserve',
        provider: 'Self-budgeted upkeep reserve',
        directAmount: profile.monthlyMaintenanceReserve,
        directFrequency: 'monthly'
      })
    );
  }

  return rows.filter(Boolean);
}

/**
 * Summarizes total monthly home cost and totals by source ('verified' | 'user_entered' | 'estimate').
 */
export function summarizeHomeCosts(breakdown = []) {
  return breakdown.reduce(
    (acc, item) => {
      if (item.excluded) return acc;
      const amt = Number(item.amount) || 0;
      acc.totalMonthly += amt;
      if (item.source === 'verified') acc.verified += amt;
      else if (item.source === 'user_entered') acc.userEntered += amt;
      else acc.estimated += amt;
      return acc;
    },
    { totalMonthly: 0, verified: 0, userEntered: 0, estimated: 0 }
  );
}

export function calculateHouseholdAndFleetMetrics(rawProfile = DEFAULT_HOUSEHOLD_PROFILE) {
  const profile = migrateHouseholdProfile(rawProfile);
  const local = lookupLocalUtilityData(profile.zip, profile.state, profile.electricUtility);

  const dwellingMap = {
    apartment: DWELLING_TYPES[0],
    condo: DWELLING_TYPES[0],
    townhome: DWELLING_TYPES[1],
    townhouse: DWELLING_TYPES[1],
    single_family: DWELLING_TYPES[2],
    multi_unit: DWELLING_TYPES[3],
    mobile_home: DWELLING_TYPES[1]
  };
  const dwelling = dwellingMap[profile.homeType] || DWELLING_TYPES[2];

  const peopleCount =
    (Number(profile.adultsCount) || 0) + (Number(profile.childrenCount) || 0) ||
    Number(profile.householdSize) ||
    2;
  const people = Math.max(1, peopleCount);
  const sqFt = Math.max(200, Number(profile.sqFt) || dwelling.defaultSqFt);
  const sqFtRatio = sqFt / dwelling.defaultSqFt;

  // Climate & WFH occupancy modifiers
  const electricSeasonMult = profile.climateSeason === 'summer_ac' ? 1.35 : profile.climateSeason === 'winter_heat' ? 0.92 : 1.0;
  const gasSeasonMult = profile.climateSeason === 'winter_heat' ? 1.65 : profile.climateSeason === 'summer_ac' ? 0.65 : 1.0;
  const wfhMult = profile.workFromHomeDaysPerWeek != null ? 1 + (Number(profile.workFromHomeDaysPerWeek) * 0.025) : 1.0;
  const envelopeMult =
    profile.insulation === 'poor'
      ? 1.18
      : profile.insulation === 'good'
        ? 0.88
        : 1.0;

  // Heating & Cooling equipment adjustments
  const heatType = profile.heating || profile.heatingType || 'gas_furnace';
  let heatingElectricDelta = 0;
  let heatingGasDelta = 0;
  if (heatType === 'heat_pump') {
    heatingElectricDelta = 110 * (profile.climateSeason === 'winter_heat' ? 1.8 : 0.6);
    heatingGasDelta = -18;
  } else if (heatType === 'electric' || heatType === 'electric_baseboard') {
    heatingElectricDelta = 220 * (profile.climateSeason === 'winter_heat' ? 2.1 : 0.5);
    heatingGasDelta = -25;
  } else if (heatType === 'propane' || heatType === 'wood' || heatType === 'none') {
    heatingGasDelta = -22;
  }

  const coolType = profile.cooling || profile.coolingType || 'central_ac';
  let coolingElectricMult = 1.0;
  if (coolType === 'heat_pump') coolingElectricMult = 0.88;
  else if (coolType === 'evaporative' || coolType === 'evaporative_cooler') coolingElectricMult = 0.65;
  else if (coolType === 'window_units') coolingElectricMult = 0.82;
  else if (coolType === 'none') coolingElectricMult = 0.60;

  const thermostatMult = profile.thermostat === 'smart' ? 0.92 : profile.thermostat === 'programmable' ? 0.96 : 1.0;

  // Water heater equipment adjustments
  const whType = profile.waterHeater || profile.waterHeaterType || 'gas_tank';
  let waterElectricDelta = 0;
  let waterGasDelta = 0;
  if (whType === 'electric_tank' || whType === 'tankless_electric') {
    waterElectricDelta = whType === 'tankless_electric' ? 165 : 190;
    waterGasDelta = -12;
  } else if (whType === 'heat_pump' || whType === 'hybrid_heat_pump') {
    waterElectricDelta = 65;
    waterGasDelta = -12;
  } else if (whType === 'tankless_gas') {
    waterGasDelta = -6;
  }

  // Appliance delta
  let applianceElectricDelta = 0;
  let applianceGasDelta = 0;
  if (profile.cookingFuel === 'electric' || profile.cookingFuel === 'induction') {
    applianceElectricDelta += 35;
    applianceGasDelta -= 4;
  }
  if (profile.dryer === 'electric') {
    applianceElectricDelta += 45;
    applianceGasDelta -= 3;
  } else if (profile.dryer === 'heat_pump') {
    applianceElectricDelta += 22;
    applianceGasDelta -= 3;
  }

  // Pool & Spa load adjustments
  let poolElectricDelta = 0;
  let poolGasDelta = 0;
  const poolState = profile.poolOrSpa;
  if (poolState === 'pool' || poolState === 'pool_only' || poolState === 'both' || poolState === 'pool_and_spa') {
    const hrsMult = profile.poolPumpHoursPerDay ? Math.min(2, Math.max(0.4, Number(profile.poolPumpHoursPerDay) / 6)) : 1;
    poolElectricDelta += 85 * hrsMult;
    if (profile.poolHeating === 'gas') poolGasDelta += 24;
    else if (profile.poolHeating === 'electric' || profile.poolHeating === 'heat_pump' || profile.poolHeating === 'electric_heat_pump') {
      poolElectricDelta += 110;
    }
  }
  if (poolState === 'spa' || poolState === 'spa_only' || poolState === 'both' || poolState === 'pool_and_spa') {
    poolElectricDelta += 75;
    if (profile.poolHeating === 'gas') poolGasDelta += 12;
  }

  // Solar system computed parameters
  const hasSolar = profile.hasSolar === 'yes' || profile.hasSolar === true;
  const solarPanelCount = hasSolar ? Math.max(1, Number(profile.solarPanelCount) || 18) : 0;
  const solarWattsPerPanel = hasSolar ? Math.max(100, Number(profile.solarWattsPerPanel) || 400) : 400;
  const solarSystemKw = hasSolar ? Number(((solarPanelCount * solarWattsPerPanel) / 1000).toFixed(2)) : 0;
  const solarPeakSunHours = Math.max(1, Number(profile.solarPeakSunHours) || local.defaultPeakSunHours);
  const solarMonthlyKwh = hasSolar
    ? profile.solarKnownYearlyKwh > 0
      ? Math.round(Number(profile.solarKnownYearlyKwh) / 12)
      : Math.round(solarSystemKw * solarPeakSunHours * 30 * 0.80)
    : 0;

  // 1. Home Electricity (excluding EV charging)
  let grossHomeKwh = Math.round(
    (dwelling.baseKwh * sqFtRatio * coolingElectricMult * envelopeMult * thermostatMult * wfhMult +
      people * 110 +
      heatingElectricDelta +
      waterElectricDelta +
      applianceElectricDelta +
      poolElectricDelta) *
      electricSeasonMult
  );
  if (profile.noElectricService) grossHomeKwh = 0;

  let homeKwh = grossHomeKwh;
  if (hasSolar && !profile.noElectricService) {
    const offsetFactor = profile.solarBillingPlan === 'net_billing' || profile.solarBillingPlan === 'nem_3' ? 0.72 : 0.85;
    const solarOffset = Math.round(solarMonthlyKwh * offsetFactor);
    homeKwh = Math.max(65, grossHomeKwh - solarOffset);
  }

  const hasDiscount = profile.electricLowIncomeDiscount === 'yes';
  const effectiveElectricRate = hasDiscount
    ? local.standardRateKwh * (1 - local.electricDiscountPct / 100)
    : local.standardRateKwh;
  const effectiveEvRate = hasDiscount
    ? local.evOffPeakRateKwh * (1 - local.electricDiscountPct / 100)
    : local.evOffPeakRateKwh;

  const homeElectricCost = profile.noElectricService ? 0 : Math.round(homeKwh * effectiveElectricRate);

  // 2. Natural Gas / Propane
  const usesGas = hasAnyGasOrPropaneUsage(profile) && !profile.noGasOrPropane;
  const grossTherms = usesGas
    ? (dwelling.baseTherms * Math.sqrt(sqFtRatio) * envelopeMult + people * 5 + heatingGasDelta + waterGasDelta + applianceGasDelta + poolGasDelta) * gasSeasonMult
    : 0;
  const monthlyTherms = usesGas ? Math.max(4, Math.round(grossTherms)) : 0;
  const effectiveThermRate = hasDiscount
    ? local.thermRate * (1 - local.gasDiscountPct / 100)
    : local.thermRate;
  const naturalGasCost = usesGas ? Math.round(monthlyTherms * effectiveThermRate) : 0;

  // 3. Water, Sewer & Trash
  const irrigationExtraGal =
    profile.irrigationType === 'sprinklers'
      ? (Number(profile.wateringDaysPerWeek) || 3) * 45
      : profile.irrigationType === 'drip'
        ? (Number(profile.wateringDaysPerWeek) || 3) * 18
        : 0;
  const monthlyWaterGallons = profile.noWaterSewer || profile.hasWell === 'yes'
    ? 0
    : Math.round((dwelling.baseWaterGalPerDay + people * 65 + irrigationExtraGal) * 30);
  const waterUsageCost = (monthlyWaterGallons / 1000) * local.waterRatePer1000Gal;
  const trashCost = profile.noTrashRecycling ? 0 : dwelling.baseTrashSewer;
  const waterTrashTotalCost = Math.round(waterUsageCost + trashCost);

  // 4. Vehicle Fleet Calculations (uses existing vehicles without duplicating vehicle prompts)
  const vehicles = Array.isArray(profile.vehicles) ? profile.vehicles : [];
  let totalMonthlyGasCost = 0;
  let totalMonthlyEvHomeKwh = 0;
  let totalMonthlyEvHomeCost = 0;
  let totalMonthlyInsurance = 0;
  let totalMonthlyCarPayments = 0;
  let totalMonthlyMaintenance = 0;

  const evHomeDisabled =
    profile.evCount === '0' ||
    profile.evHomeCharger === 'none_at_home' ||
    profile.evHomeCharger === 'public_only' ||
    profile.evChargingLocation === 'public_free';

  const vehicleBreakdowns = vehicles.map((v) => {
    const miles = Math.max(0, Number(v.monthlyMiles) || 0);
    const ins = Math.max(0, Number(v.insuranceMonthly) || 110);
    const payment = v.ownership === 'owned' ? 0 : Math.max(0, Number(v.monthlyPayment) || 0);
    totalMonthlyInsurance += ins;
    totalMonthlyCarPayments += payment;

    if (v.type === 'ev') {
      const kwhPer100 = Number(v.mpgOrEfficiency) > 10 && Number(v.mpgOrEfficiency) < 60 ? Number(v.mpgOrEfficiency) : 28;
      const totalKwhNeeded = (miles / 100) * kwhPer100;
      const freeShare = Math.min(100, Math.max(0, Number(v.freeChargingSharePercent) || 0)) / 100;
      const paidHomeKwh = evHomeDisabled ? 0 : Math.round(totalKwhNeeded * (1 - freeShare));
      const freeKwh = Math.round(totalKwhNeeded * freeShare);
      const chargingCost = Math.round(paidHomeKwh * effectiveEvRate);
      const maintenance = Math.round(miles * 0.03);
      const equivalentGasCost = Math.round((miles / 30) * local.avgGasPricePerGal);
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
    }

    if (v.type === 'phev') {
      const mpg = Math.max(20, Number(v.mpgOrEfficiency) || 42);
      const gasMiles = miles * 0.5;
      const evMiles = miles * 0.5;
      const gallons = gasMiles / mpg;
      const gasPrice =
        v.fuelGrade === 'premium'
          ? local.avgGasPricePerGal + 0.5
          : v.fuelGrade === 'diesel'
            ? local.avgGasPricePerGal + 0.35
            : local.avgGasPricePerGal;
      const gasCost = Math.round(gallons * gasPrice);
      const homeKwh = evHomeDisabled ? 0 : Math.round((evMiles / 100) * 30);
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
    }

    const defaultMpg = v.type === 'hybrid' ? 48 : 28;
    const mpg = Math.max(10, Number(v.mpgOrEfficiency) || defaultMpg);
    const gallons = miles / mpg;
    const gasPrice =
      v.fuelGrade === 'premium'
        ? local.avgGasPricePerGal + 0.5
        : v.fuelGrade === 'diesel'
          ? local.avgGasPricePerGal + 0.35
          : local.avgGasPricePerGal;
    const gasCost = Math.round(gallons * gasPrice);
    const maintenance = Math.round(miles * (v.type === 'hybrid' ? 0.05 : 0.075));
    const projectedEvKwh = (miles / 100) * 27 * 0.65;
    const projectedEvCost = Math.round(projectedEvKwh * effectiveEvRate);
    const potentialEvSwitchSavings = Math.max(0, gasCost + maintenance - (projectedEvCost + Math.round(miles * 0.03)));

    totalMonthlyGasCost += gasCost;
    totalMonthlyMaintenance += maintenance;

    return {
      ...v,
      fuelGrade: v.fuelGrade || 'regular',
      ownership: v.ownership || (payment > 0 ? 'financed' : 'owned'),
      monthlyFuelOrChargeCost: gasCost,
      gallonsUsed: Math.round(gallons * 10) / 10,
      maintenance,
      potentialEvSwitchSavings,
      totalMonthlyVehicleCost: gasCost + ins + payment + maintenance
    };
  });

  // If user reported EV(s) in Household questionnaire but hasn't added vehicle cards yet
  if (
    !evHomeDisabled &&
    (profile.evCount === '1' || profile.evCount === '2_plus') &&
    totalMonthlyEvHomeKwh === 0
  ) {
    const countMult = profile.evCount === '2_plus' ? 2 : 1;
    const locMult = profile.evChargingLocation === 'work' ? 0.35 : 0.9;
    totalMonthlyEvHomeKwh = Math.round(280 * countMult * locMult);
    totalMonthlyEvHomeCost = Math.round(totalMonthlyEvHomeKwh * effectiveEvRate);
  }

  const totalCombinedEnergyBill = homeElectricCost + naturalGasCost + totalMonthlyEvHomeCost;
  const totalUtilitiesMonthly = totalCombinedEnergyBill + waterTrashTotalCost;
  const totalFleetMonthly =
    totalMonthlyGasCost + totalMonthlyEvHomeCost + totalMonthlyInsurance + totalMonthlyCarPayments + totalMonthlyMaintenance;

  const discountMonthlySavingsPotential = !hasDiscount
    ? Math.round((homeElectricCost + totalMonthlyEvHomeCost) * (local.electricDiscountPct / 100) + naturalGasCost * (local.gasDiscountPct / 100))
    : Math.round(((homeElectricCost + totalMonthlyEvHomeCost) / (1 - local.electricDiscountPct / 100)) * (local.electricDiscountPct / 100));

  const solar = {
    hasSolar,
    panelCount: solarPanelCount,
    wattsPerPanel: solarWattsPerPanel,
    systemSizeKw: solarSystemKw,
    peakSunHours: solarPeakSunHours,
    monthlyKwhEstimate: solarMonthlyKwh,
    ownership: profile.solarOwnership || null,
    monthlyPayment:
      hasSolar && ['loan', 'leased', 'ppa'].includes(profile.solarOwnership)
        ? Number(profile.solarMonthlyPayment) || 0
        : 0,
    billingPlan: profile.solarBillingPlan || null,
    yearInstalled: profile.solarYearInstalled || null,
    hasBattery: profile.hasSolarBattery === 'yes',
    batteryKwh: profile.solarBatteryKwh != null ? Number(profile.solarBatteryKwh) : null,
    batteryUse: profile.solarBatteryUse || null
  };

  const region = {
    id: local.regionId,
    name: local.regionName,
    electricProvider: local.primaryElectricUtility,
    standardRateKwh: local.standardRateKwh,
    evOffPeakRateKwh: local.evOffPeakRateKwh,
    thermRate: local.thermRate,
    waterRatePer1000Gal: local.waterRatePer1000Gal,
    avgGasPricePerGal: local.avgGasPricePerGal,
    discountProgram: local.discountProgram
  };

  return {
    dwelling,
    region,
    localUtility: local,
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
      totalPgeCombinedBill: totalCombinedEnergyBill,
      monthlyWaterGallons,
      waterTrashTotalCost,
      totalUtilitiesMonthly,
      careMonthlySavingsPotential: discountMonthlySavingsPotential,
      discountProgramName: local.discountProgram
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
 * Builds an anonymized, summary-only snapshot for the AI Advisor.
 * Should only be called/attached when the user enables Household AI permission.
 */
export function buildHouseholdAiSummary(rawProfile = {}, metrics = null, userBills = []) {
  const p = migrateHouseholdProfile(rawProfile);
  const m = metrics || calculateHouseholdAndFleetMetrics(p);
  const breakdown = calculateHomeCostBreakdown(p, m, userBills);
  const costTotals = summarizeHomeCosts(breakdown);
  const completeness = calculateProfileCompleteness(p);
  const reminders = generateHouseholdReminders(p);
  const syncable = buildSyncableBills(p, userBills);

  return {
    location: [p.city, p.state].filter(Boolean).join(', ') || 'Location not set',
    ownership: formatHouseholdLabel('ownership', p.ownership),
    homeType: formatHouseholdLabel('homeType', p.homeType),
    specs: {
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      sqFt: p.sqFt,
      yearBuilt: p.yearBuilt
    },
    systems: {
      heating: formatHouseholdLabel('heating', p.heating),
      cooling: formatHouseholdLabel('cooling', p.cooling),
      waterHeater: formatHouseholdLabel('waterHeater', p.waterHeater),
      solar: p.hasSolar === 'yes' ? `${m.solar.systemSizeKw} kW (${formatHouseholdLabel('solarOwnership', p.solarOwnership)})` : formatHouseholdLabel('yesNoNotSure', p.hasSolar),
      evCount: formatHouseholdLabel('evCount', p.evCount),
      poolOrSpa: formatHouseholdLabel('poolOrSpa', p.poolOrSpa)
    },
    estimatedMonthlyHomeCost: Math.round(costTotals.totalMonthly),
    costSources: {
      verified: Math.round(costTotals.verified),
      userEntered: Math.round(costTotals.userEntered),
      estimated: Math.round(costTotals.estimated)
    },
    completenessPercent: completeness.percent,
    syncedBillsCount: syncable.filter((b) => b.alreadySynced).length,
    upcomingReminders: reminders.slice(0, 5).map((r) => ({ title: r.title, detail: r.detail, urgency: r.urgency }))
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
