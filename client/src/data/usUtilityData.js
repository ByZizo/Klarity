/**
 * Bundled Local US ZIP Prefix & State Utility Dataset (100% offline, zero network calls)
 * Maps ZIP codes and states to regional electric/gas utilities, common rate plans,
 * regional energy discount programs, solar peak sun hours, and average utility rates.
 */

export const UTILITY_PROFILES_BY_REGION = {
  ca_norcal_pge: {
    regionId: 'ca_norcal_pge',
    regionName: 'Northern & Central California',
    state: 'CA',
    discountProgram: 'CARE / FERA',
    discountDescription: 'California Alternate Rates for Energy (30–35% off electric, 20% off gas) or FERA (18% off electric)',
    electricDiscountPct: 32,
    gasDiscountPct: 20,
    defaultPeakSunHours: 5.5,
    waterRatePer1000Gal: 9.8,
    avgGasPricePerGal: 4.85,
    electricUtilities: [
      {
        name: 'PG&E (Pacific Gas & Electric)',
        avgRateKwh: 0.42,
        evOffPeakRateKwh: 0.31,
        ratePlans: [
          'E-TOU-C (Peak 4–9 PM)',
          'EV2-A (Home EV Charging & Solar TOU)',
          'E-ELEC (Heat Pump, EV & Battery)',
          'E-TOU-D (Peak 5–8 PM Weekdays)',
          'E-1 (Tiered Rate)',
          'CARE / FERA Discount Rate'
        ]
      },
      {
        name: 'Silicon Valley Power',
        avgRateKwh: 0.16,
        evOffPeakRateKwh: 0.14,
        ratePlans: ['D-1 Residential Service', 'TOU Residential']
      },
      {
        name: 'Alameda Municipal Power',
        avgRateKwh: 0.22,
        evOffPeakRateKwh: 0.16,
        ratePlans: ['D-1 Residential', 'TOU-EV']
      }
    ],
    gasUtilities: [
      { name: 'PG&E Gas', avgThermRate: 2.28 },
      { name: 'Propane Delivery', avgThermRate: 3.10 }
    ]
  },
  ca_sac_smud: {
    regionId: 'ca_sac_smud',
    regionName: 'Sacramento Metro (CA)',
    state: 'CA',
    discountProgram: 'SMUD Energy Assistance Program (EAPR) / PG&E CARE',
    discountDescription: 'Regional electric and gas assistance discounts for eligible households',
    electricDiscountPct: 30,
    gasDiscountPct: 20,
    defaultPeakSunHours: 5.6,
    waterRatePer1000Gal: 8.5,
    avgGasPricePerGal: 4.69,
    electricUtilities: [
      {
        name: 'SMUD (Sacramento Municipal Utility District)',
        avgRateKwh: 0.17,
        evOffPeakRateKwh: 0.12,
        ratePlans: [
          'Time-of-Day (5–8 PM Peak)',
          'Time-of-Day + EV Discount',
          'Fixed Rate Residential'
        ]
      },
      {
        name: 'Roseville Electric',
        avgRateKwh: 0.15,
        evOffPeakRateKwh: 0.12,
        ratePlans: ['Standard Residential', 'EV Off-Peak Rebate']
      }
    ],
    gasUtilities: [
      { name: 'PG&E Gas', avgThermRate: 2.25 },
      { name: 'Propane Delivery', avgThermRate: 3.10 }
    ]
  },
  ca_socal_sce: {
    regionId: 'ca_socal_sce',
    regionName: 'Southern California',
    state: 'CA',
    discountProgram: 'CARE / FERA',
    discountDescription: 'California Alternate Rates for Energy or FERA discount program',
    electricDiscountPct: 30,
    gasDiscountPct: 20,
    defaultPeakSunHours: 5.7,
    waterRatePer1000Gal: 10.4,
    avgGasPricePerGal: 4.89,
    electricUtilities: [
      {
        name: 'Southern California Edison (SCE)',
        avgRateKwh: 0.36,
        evOffPeakRateKwh: 0.25,
        ratePlans: [
          'TOU-D-4-9PM',
          'TOU-D-PRIME (EV, Battery & Heat Pump)',
          'TOU-D-5-8PM',
          'Domestic Tiered (Schedule D)',
          'CARE / FERA Rate'
        ]
      },
      {
        name: 'Anaheim Public Utilities',
        avgRateKwh: 0.20,
        evOffPeakRateKwh: 0.15,
        ratePlans: ['Domestic Standard', 'Domestic Time-of-Use']
      },
      {
        name: 'Riverside Public Utilities',
        avgRateKwh: 0.21,
        evOffPeakRateKwh: 0.16,
        ratePlans: ['Domestic Standard', 'Time-of-Use']
      }
    ],
    gasUtilities: [
      { name: 'SoCalGas', avgThermRate: 2.10 },
      { name: 'Southwest Gas', avgThermRate: 1.95 },
      { name: 'Propane Delivery', avgThermRate: 3.10 }
    ]
  },
  ca_la_ladwp: {
    regionId: 'ca_la_ladwp',
    regionName: 'Los Angeles Metro (CA)',
    state: 'CA',
    discountProgram: 'LADWP EZ-SAVE / Lifeline / SoCalGas CARE',
    discountDescription: 'Low-income & senior bill discounts available through LADWP and SoCalGas',
    electricDiscountPct: 25,
    gasDiscountPct: 20,
    defaultPeakSunHours: 5.7,
    waterRatePer1000Gal: 10.1,
    avgGasPricePerGal: 4.95,
    electricUtilities: [
      {
        name: 'LADWP (Los Angeles Dept. of Water & Power)',
        avgRateKwh: 0.24,
        evOffPeakRateKwh: 0.18,
        ratePlans: [
          'R-1A Standard Residential (Tiered)',
          'R-1B Time-of-Use',
          'EZ-SAVE Discount Plan'
        ]
      },
      {
        name: 'Southern California Edison (SCE)',
        avgRateKwh: 0.36,
        evOffPeakRateKwh: 0.25,
        ratePlans: ['TOU-D-4-9PM', 'TOU-D-PRIME', 'Domestic Tiered']
      }
    ],
    gasUtilities: [
      { name: 'SoCalGas', avgThermRate: 2.10 }
    ]
  },
  ca_sd_sdge: {
    regionId: 'ca_sd_sdge',
    regionName: 'San Diego Area (CA)',
    state: 'CA',
    discountProgram: 'CARE / FERA',
    discountDescription: 'SDG&E CARE (35% electric, 20% gas) and FERA (18% electric) discounts',
    electricDiscountPct: 35,
    gasDiscountPct: 20,
    defaultPeakSunHours: 5.8,
    waterRatePer1000Gal: 11.9,
    avgGasPricePerGal: 4.92,
    electricUtilities: [
      {
        name: 'SDG&E (San Diego Gas & Electric)',
        avgRateKwh: 0.45,
        evOffPeakRateKwh: 0.28,
        ratePlans: [
          'TOU-DR1 (Peak 4–9 PM)',
          'EV-TOU-5 (Super Off-Peak EV)',
          'EV-TOU-2',
          'Standard DR (Tiered)',
          'CARE / FERA Rate'
        ]
      }
    ],
    gasUtilities: [
      { name: 'SDG&E Gas', avgThermRate: 2.30 }
    ]
  },
  ny_metro: {
    regionId: 'ny_metro',
    regionName: 'New York & Downstate NY',
    state: 'NY',
    discountProgram: 'EAP (Energy Affordability Program) / HEAP',
    discountDescription: 'New York Energy Affordability Program & Home Energy Assistance Program',
    electricDiscountPct: 25,
    gasDiscountPct: 20,
    defaultPeakSunHours: 4.0,
    waterRatePer1000Gal: 8.6,
    avgGasPricePerGal: 3.65,
    electricUtilities: [
      {
        name: 'Con Edison (Consolidated Edison)',
        avgRateKwh: 0.26,
        evOffPeakRateKwh: 0.16,
        ratePlans: [
          'SC-1 Residential Standard',
          'SC-1 Time-of-Use (TOU)',
          'SmartCharge EV Off-Peak',
          'Energy Affordability Program (EAP)'
        ]
      },
      {
        name: 'PSEG Long Island',
        avgRateKwh: 0.24,
        evOffPeakRateKwh: 0.15,
        ratePlans: ['Rate 180 Residential', 'Rate 194/195 Time-of-Day']
      },
      {
        name: 'National Grid NY',
        avgRateKwh: 0.19,
        evOffPeakRateKwh: 0.13,
        ratePlans: ['SC-1 Standard Residential', 'Voluntary Time-of-Use']
      }
    ],
    gasUtilities: [
      { name: 'Con Edison Gas', avgThermRate: 1.78 },
      { name: 'National Grid Gas', avgThermRate: 1.65 },
      { name: 'NYSEG', avgThermRate: 1.55 }
    ]
  },
  tx_ercot: {
    regionId: 'tx_ercot',
    regionName: 'Texas (ERCOT / Municipal)',
    state: 'TX',
    discountProgram: 'CEAP / Utility Bill Assistance',
    discountDescription: 'Texas Comprehensive Energy Assistance Program & local utility discount plans',
    electricDiscountPct: 20,
    gasDiscountPct: 18,
    defaultPeakSunHours: 5.4,
    waterRatePer1000Gal: 6.9,
    avgGasPricePerGal: 3.15,
    electricUtilities: [
      {
        name: 'Oncor (TXU / Reliant / Retail Provider)',
        avgRateKwh: 0.15,
        evOffPeakRateKwh: 0.09,
        ratePlans: [
          'Fixed-Rate 12/24 Month Plan',
          'Free Nights & Solar Days Plan',
          'Time-of-Use EV Plan'
        ]
      },
      {
        name: 'CenterPoint Energy (Retail Provider)',
        avgRateKwh: 0.15,
        evOffPeakRateKwh: 0.09,
        ratePlans: ['Fixed-Rate Residential', 'Free Nights / Weekends Plan', 'Time-of-Use Plan']
      },
      {
        name: 'Austin Energy',
        avgRateKwh: 0.14,
        evOffPeakRateKwh: 0.09,
        ratePlans: ['Tiered Residential', 'EV360 Off-Peak Charging', 'CAP Discount Program']
      },
      {
        name: 'CPS Energy (San Antonio)',
        avgRateKwh: 0.14,
        evOffPeakRateKwh: 0.10,
        ratePlans: ['Standard Residential', 'Affordability Discount Program']
      }
    ],
    gasUtilities: [
      { name: 'Atmos Energy', avgThermRate: 1.38 },
      { name: 'CenterPoint Energy Gas', avgThermRate: 1.35 },
      { name: 'Texas Gas Service', avgThermRate: 1.42 }
    ]
  },
  fl_se: {
    regionId: 'fl_se',
    regionName: 'Florida',
    state: 'FL',
    discountProgram: 'LIHEAP / EAP Utility Assistance',
    discountDescription: 'Low Income Home Energy Assistance Program & utility hardship credits',
    electricDiscountPct: 20,
    gasDiscountPct: 15,
    defaultPeakSunHours: 5.3,
    waterRatePer1000Gal: 7.1,
    avgGasPricePerGal: 3.35,
    electricUtilities: [
      {
        name: 'FPL (Florida Power & Light)',
        avgRateKwh: 0.15,
        evOffPeakRateKwh: 0.09,
        ratePlans: ['RS-1 Standard Residential', 'RTR-1 Time-of-Use', 'FPL EVolution Home']
      },
      {
        name: 'Duke Energy Florida',
        avgRateKwh: 0.16,
        evOffPeakRateKwh: 0.11,
        ratePlans: ['RS-1 Residential', 'Off-Peak EV Credit']
      },
      {
        name: 'Tampa Electric (TECO)',
        avgRateKwh: 0.15,
        evOffPeakRateKwh: 0.10,
        ratePlans: ['Standard Residential', 'RSVP-1 Time-of-Use']
      }
    ],
    gasUtilities: [
      { name: 'TECO Peoples Gas', avgThermRate: 1.65 },
      { name: 'Florida City Gas', avgThermRate: 1.70 },
      { name: 'Propane Delivery', avgThermRate: 2.85 }
    ]
  },
  wa_or_pnw: {
    regionId: 'wa_or_pnw',
    regionName: 'Pacific Northwest (WA / OR)',
    state: 'WA',
    discountProgram: 'Utility Bill Discount Rate / LIHEAP',
    discountDescription: 'Washington/Oregon utility income-qualified bill discount & weatherization programs',
    electricDiscountPct: 25,
    gasDiscountPct: 20,
    defaultPeakSunHours: 3.9,
    waterRatePer1000Gal: 8.2,
    avgGasPricePerGal: 4.15,
    electricUtilities: [
      {
        name: 'Puget Sound Energy (PSE)',
        avgRateKwh: 0.13,
        evOffPeakRateKwh: 0.10,
        ratePlans: ['Schedule 7 Residential', 'Schedule 307 Time-of-Use', 'Bill Discount Rate']
      },
      {
        name: 'Seattle City Light',
        avgRateKwh: 0.13,
        evOffPeakRateKwh: 0.09,
        ratePlans: ['Standard Residential', 'Time-of-Use', 'Utility Discount Program (UDP)']
      },
      {
        name: 'Portland General Electric (PGE)',
        avgRateKwh: 0.17,
        evOffPeakRateKwh: 0.11,
        ratePlans: ['Basic Service', 'Time of Day', 'Income-Qualified Bill Discount']
      }
    ],
    gasUtilities: [
      { name: 'NW Natural', avgThermRate: 1.48 },
      { name: 'Puget Sound Energy Gas', avgThermRate: 1.42 },
      { name: 'Avista Utilities', avgThermRate: 1.36 }
    ]
  },
  il_midwest: {
    regionId: 'il_midwest',
    regionName: 'Illinois & Great Lakes',
    state: 'IL',
    discountProgram: 'LIHEAP / PIPP / ComEd Bill Assistance',
    discountDescription: 'Illinois LIHEAP, Percentage of Income Payment Plan & Low-Income Discount',
    electricDiscountPct: 22,
    gasDiscountPct: 20,
    defaultPeakSunHours: 4.3,
    waterRatePer1000Gal: 7.4,
    avgGasPricePerGal: 3.65,
    electricUtilities: [
      {
        name: 'ComEd (Commonwealth Edison)',
        avgRateKwh: 0.16,
        evOffPeakRateKwh: 0.09,
        ratePlans: ['BES Basic Electric Service', 'Hourly Pricing', 'Time-of-Day Residential']
      },
      {
        name: 'Ameren Illinois',
        avgRateKwh: 0.15,
        evOffPeakRateKwh: 0.10,
        ratePlans: ['DS-1 Residential', 'Power Smart Pricing']
      },
      {
        name: 'DTE Energy',
        avgRateKwh: 0.19,
        evOffPeakRateKwh: 0.12,
        ratePlans: ['D1.11 Standard Time of Day', 'D1.2 Time of Day EV']
      }
    ],
    gasUtilities: [
      { name: 'Peoples Gas', avgThermRate: 1.48 },
      { name: 'Nicor Gas', avgThermRate: 1.25 },
      { name: 'Ameren Gas', avgThermRate: 1.32 }
    ]
  },
  ne_ma: {
    regionId: 'ne_ma',
    regionName: 'New England (MA / CT / NH)',
    state: 'MA',
    discountProgram: 'Utility Discount Rate (R-2 / LIHEAP)',
    discountDescription: 'Massachusetts & New England R-2 Electric/Gas Discount Rate & Fuel Assistance',
    electricDiscountPct: 28,
    gasDiscountPct: 25,
    defaultPeakSunHours: 4.1,
    waterRatePer1000Gal: 8.8,
    avgGasPricePerGal: 3.55,
    electricUtilities: [
      {
        name: 'Eversource',
        avgRateKwh: 0.29,
        evOffPeakRateKwh: 0.21,
        ratePlans: ['R-1 Residential Standard', 'R-2 Low-Income Discount', 'EV Managed Charging']
      },
      {
        name: 'National Grid',
        avgRateKwh: 0.28,
        evOffPeakRateKwh: 0.20,
        ratePlans: ['R-1 Basic Residential', 'R-2 Discount Rate', 'Off-Peak EV Rebate']
      }
    ],
    gasUtilities: [
      { name: 'National Grid Gas', avgThermRate: 1.85 },
      { name: 'Eversource Gas', avgThermRate: 1.88 }
    ]
  },
  az_sw: {
    regionId: 'az_sw',
    regionName: 'Southwest (AZ / NV / NM)',
    state: 'AZ',
    discountProgram: 'Utility Energy Support / LIHEAP',
    discountDescription: 'APS Energy Support, SRP Economy Price Plan, NV Energy Assistance & LIHEAP',
    electricDiscountPct: 25,
    gasDiscountPct: 18,
    defaultPeakSunHours: 5.9,
    waterRatePer1000Gal: 7.2,
    avgGasPricePerGal: 3.75,
    electricUtilities: [
      {
        name: 'APS (Arizona Public Service)',
        avgRateKwh: 0.16,
        evOffPeakRateKwh: 0.09,
        ratePlans: ['Fixed Energy Charge', 'Time-of-Use 4–7 PM Peak', 'Time-of-Use + Demand Charge']
      },
      {
        name: 'SRP (Salt River Project)',
        avgRateKwh: 0.14,
        evOffPeakRateKwh: 0.08,
        ratePlans: ['Basic Price Plan', 'EZ-3 Price Plan', 'EV Price Plan (E-29)']
      },
      {
        name: 'NV Energy',
        avgRateKwh: 0.15,
        evOffPeakRateKwh: 0.09,
        ratePlans: ['Single-Family Residential', 'Time-of-Use EV', 'PowerShift Program']
      }
    ],
    gasUtilities: [
      { name: 'Southwest Gas', avgThermRate: 1.55 }
    ]
  },
  se_general: {
    regionId: 'se_general',
    regionName: 'Southeast US',
    state: 'GA',
    discountProgram: 'LIHEAP / Senior & Bill Assistance',
    discountDescription: 'Regional Low Income Home Energy Assistance & senior utility discount programs',
    electricDiscountPct: 20,
    gasDiscountPct: 15,
    defaultPeakSunHours: 5.0,
    waterRatePer1000Gal: 6.8,
    avgGasPricePerGal: 3.25,
    electricUtilities: [
      {
        name: 'Duke Energy',
        avgRateKwh: 0.14,
        evOffPeakRateKwh: 0.09,
        ratePlans: ['Standard Residential', 'Time-of-Use']
      },
      {
        name: 'Georgia Power',
        avgRateKwh: 0.15,
        evOffPeakRateKwh: 0.08,
        ratePlans: ['Residential Service', 'Smart Usage', 'Overnight Advantage (EV)']
      },
      {
        name: 'Dominion Energy',
        avgRateKwh: 0.14,
        evOffPeakRateKwh: 0.10,
        ratePlans: ['Schedule 1 Residential', 'Off-Peak Plan (1G)']
      }
    ],
    gasUtilities: [
      { name: 'Atlanta Gas Light / Gas South', avgThermRate: 1.45 },
      { name: 'Piedmont Natural Gas', avgThermRate: 1.38 },
      { name: 'Dominion Energy Gas', avgThermRate: 1.42 }
    ]
  },
  national_avg: {
    regionId: 'national_avg',
    regionName: 'United States (Regional Average)',
    state: 'US',
    discountProgram: 'LIHEAP / Utility Bill Discount Program',
    discountDescription: 'Local utility low-income bill discount or LIHEAP assistance program',
    electricDiscountPct: 20,
    gasDiscountPct: 15,
    defaultPeakSunHours: 4.5,
    waterRatePer1000Gal: 7.4,
    avgGasPricePerGal: 3.55,
    electricUtilities: [
      {
        name: 'Local Electric Utility',
        avgRateKwh: 0.17,
        evOffPeakRateKwh: 0.11,
        ratePlans: [
          'Standard Flat / Tiered Rate',
          'Time-of-Use (TOU)',
          'EV Off-Peak Rate',
          'Budget / Levelized Billing'
        ]
      }
    ],
    gasUtilities: [
      { name: 'Local Natural Gas Utility', avgThermRate: 1.50 },
      { name: 'Propane Delivery', avgThermRate: 2.85 }
    ]
  }
};

function resolveRegionFromZip3(zip3) {
  if (!zip3 || zip3.length < 3) return null;
  const n = Number(zip3);
  if (Number.isNaN(n)) return null;

  // California ZIP 3-digit ranges
  if (n >= 900 && n <= 908) return 'ca_la_ladwp';
  if (n >= 910 && n <= 918) return 'ca_socal_sce';
  if (n >= 919 && n <= 921) return 'ca_sd_sdge';
  if (n >= 922 && n <= 935) return 'ca_socal_sce';
  if (n === 942 || (n >= 956 && n <= 958)) return 'ca_sac_smud';
  if (n >= 936 && n <= 961) return 'ca_norcal_pge';

  // Pacific Northwest
  if ((n >= 970 && n <= 979) || (n >= 980 && n <= 994)) return 'wa_or_pnw';

  // Arizona & Nevada
  if ((n >= 850 && n <= 865) || (n >= 889 && n <= 898)) return 'az_sw';

  // Texas
  if (n >= 750 && n <= 799) return 'tx_ercot';

  // Florida
  if (n >= 320 && n <= 349) return 'fl_se';

  // New York
  if (n >= 100 && n <= 149) return 'ny_metro';

  // New England (MA, RI, NH, ME, VT, CT)
  if (n >= 10 && n <= 69) return 'ne_ma';

  // Illinois & Great Lakes (IL, MI, WI, OH, IN)
  if ((n >= 600 && n <= 629) || (n >= 430 && n <= 499) || (n >= 530 && n <= 549)) return 'il_midwest';

  // Southeast (GA, NC, SC, VA, AL, TN)
  if ((n >= 220 && n <= 319) || (n >= 350 && n <= 385)) return 'se_general';

  return null;
}

function resolveRegionFromState(state) {
  const s = String(state || '').trim().toUpperCase();
  if (!s) return null;
  if (s === 'CA') return 'ca_norcal_pge';
  if (s === 'NY') return 'ny_metro';
  if (s === 'TX') return 'tx_ercot';
  if (s === 'FL') return 'fl_se';
  if (s === 'WA' || s === 'OR') return 'wa_or_pnw';
  if (s === 'AZ' || s === 'NV' || s === 'NM') return 'az_sw';
  if (s === 'IL' || s === 'MI' || s === 'OH' || s === 'WI' || s === 'IN' || s === 'MN') return 'il_midwest';
  if (['MA', 'CT', 'RI', 'NH', 'VT', 'ME'].includes(s)) return 'ne_ma';
  if (['GA', 'NC', 'SC', 'VA', 'AL', 'TN', 'MS', 'LA'].includes(s)) return 'se_general';
  return null;
}

/**
 * Looks up local utility options, rate plans, regional low-income discount name,
 * and energy rates purely from bundled data (no network calls).
 */
export function lookupLocalUtilityData(zip = '', state = '', chosenElectricUtility = '') {
  const cleanZip = String(zip || '').replace(/[^0-9]/g, '');
  const zip3 = cleanZip.slice(0, 3);
  const regionId =
    resolveRegionFromZip3(zip3) ||
    resolveRegionFromState(state) ||
    'national_avg';

  const region = UTILITY_PROFILES_BY_REGION[regionId] || UTILITY_PROFILES_BY_REGION.national_avg;

  const chosenLower = String(chosenElectricUtility || '').trim().toLowerCase();
  const matchedElectric = chosenLower
    ? region.electricUtilities.find(
        (u) =>
          u.name.toLowerCase().includes(chosenLower) ||
          chosenLower.includes(u.name.toLowerCase().split('(')[0].trim())
      )
    : null;

  const primaryElectric = matchedElectric || region.electricUtilities[0] || UTILITY_PROFILES_BY_REGION.national_avg.electricUtilities[0];

  const ratePlans = Array.from(
    new Set([
      ...(primaryElectric?.ratePlans || []),
      'Standard Flat / Tiered Rate',
      'Time-of-Use (TOU)',
      'Budget / Levelized Billing'
    ])
  );

  return {
    regionId: region.regionId,
    regionName: region.regionName,
    state: region.state,
    discountProgram: region.discountProgram,
    discountDescription: region.discountDescription,
    electricDiscountPct: region.electricDiscountPct,
    gasDiscountPct: region.gasDiscountPct,
    defaultPeakSunHours: region.defaultPeakSunHours,
    waterRatePer1000Gal: region.waterRatePer1000Gal,
    avgGasPricePerGal: region.avgGasPricePerGal,
    electricUtilities: region.electricUtilities.map((u) => u.name),
    gasUtilities: region.gasUtilities.map((g) => g.name),
    ratePlans,
    primaryElectricUtility: primaryElectric?.name || 'Local Electric Utility',
    standardRateKwh: primaryElectric?.avgRateKwh ?? 0.17,
    evOffPeakRateKwh: primaryElectric?.evOffPeakRateKwh ?? 0.11,
    thermRate: region.gasUtilities?.[0]?.avgThermRate ?? 1.50
  };
}
