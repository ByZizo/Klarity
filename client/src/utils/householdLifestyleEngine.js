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

export const DEFAULT_HOUSEHOLD_PROFILE = {
  dwellingType: 'single_family',
  ownership: 'own',
  cityOrZip: 'Bay Area / Northern CA',
  utilityRegionId: 'pge_norcal',
  householdSize: 4,
  sqFt: 2100,
  hasCareDiscount: true, // CARE/FERA low-income or senior discount
  hasSolar: false,
  climateSeason: 'average', // 'average' | 'summer_ac' | 'winter_heat'
  foodMonthly: 650,
  health: {
    provider: 'Kaiser Permanente',
    planName: 'Senior Advantage / HMO',
    memberId: '',
    groupNumber: '',
    rxBin: '',
    monthlyPremium: 0,
    copays: {
      primaryCare: 15,
      specialist: 30,
      urgentCare: 20,
      er: 100,
      rxGeneric: 10
    },
    doctors: [
      { id: 'doc-1', name: 'Primary Care Clinic', specialty: 'Family Medicine', office: 'Medical Center', phone: '' }
    ],
    cards: []
  },
  autoInsurance: {
    provider: 'State Farm',
    policyType: 'full_coverage',
    deductible: 500,
    hasRoadside: true,
    hasGapCoverage: true,
    monthlyPremium: 140,
    policyNumber: ''
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
      insuranceCoverage: 'full_coverage',
      estimatedValue: 26500,
      odometer: 14200,
      threeYearMileLimit: null,
      mpgOrEfficiency: 51,
      fuelGrade: 'regular',
      monthlyMiles: 950,
      monthlyPayment: 0,
      apr: 0,
      insuranceMonthly: 115,
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
      insuranceCoverage: 'full_coverage_gap',
      estimatedValue: 38000,
      odometer: 8900,
      threeYearMileLimit: 36000,
      mpgOrEfficiency: 28,
      batteryKwh: 75,
      fuelGrade: 'electric',
      monthlyMiles: 1000,
      monthlyPayment: 429,
      apr: 0,
      insuranceMonthly: 145,
      freeChargingSharePercent: 30
    }
  ]
};

/**
 * Calculates comprehensive monthly utility bills (PG&E Electric, Natural Gas, Water/Sewer/Trash)
 * and Fleet Fuel/Charging expenses based on the household profile.
 */
export function calculateHouseholdAndFleetMetrics(profile = DEFAULT_HOUSEHOLD_PROFILE) {
  const dwelling = DWELLING_TYPES.find(d => d.id === profile.dwellingType) || DWELLING_TYPES[2];
  const region = UTILITY_REGIONS.find(r => r.id === profile.utilityRegionId) || UTILITY_REGIONS[0];
  const people = Math.max(1, Number(profile.householdSize) || 1);
  const sqFt = Math.max(300, Number(profile.sqFt) || dwelling.defaultSqFt);
  const sqFtRatio = sqFt / dwelling.defaultSqFt;

  // Season multiplier
  const electricSeasonMult = profile.climateSeason === 'summer_ac' ? 1.35 : profile.climateSeason === 'winter_heat' ? 0.92 : 1.0;
  const gasSeasonMult = profile.climateSeason === 'winter_heat' ? 1.65 : profile.climateSeason === 'summer_ac' ? 0.65 : 1.0;

  // 1. Home Electricity (excluding EV charging)
  // Base dwelling kWh scaled by sqFt + 115 kWh per person (appliances, laundry, refrigerators, electronics)
  let homeKwh = Math.round((dwelling.baseKwh * sqFtRatio + (people * 115)) * electricSeasonMult);
  if (profile.hasSolar) {
    homeKwh = Math.max(80, Math.round(homeKwh * 0.25)); // Solar offsets ~75% of daytime load
  }

  const effectiveElectricRate = profile.hasCareDiscount
    ? region.standardRateKwh * (1 - region.careDiscountPercent / 100)
    : region.standardRateKwh;

  const effectiveEvRate = profile.hasCareDiscount
    ? region.evOffPeakRateKwh * (1 - region.careDiscountPercent / 100)
    : region.evOffPeakRateKwh;

  const homeElectricCost = Math.round(homeKwh * effectiveElectricRate);

  // 2. Natural Gas (Water heating, stove, furnace)
  // Base dwelling therms + 6 therms per person for hot showers/laundry/cooking
  const monthlyTherms = Math.round((dwelling.baseTherms * Math.sqrt(sqFtRatio) + (people * 6)) * gasSeasonMult);
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
    const payment = Math.max(0, Number(v.monthlyPayment) || 0);
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

  const totalPgeCombinedBill = homeElectricCost + naturalGasCost + totalMonthlyEvHomeCost;
  const totalUtilitiesMonthly = totalPgeCombinedBill + waterTrashTotalCost;
  const totalFleetMonthly = totalMonthlyGasCost + totalMonthlyEvHomeCost + totalMonthlyInsurance + totalMonthlyCarPayments + totalMonthlyMaintenance;

  // Potential CARE discount savings if not yet enrolled
  const careMonthlySavingsPotential = !profile.hasCareDiscount
    ? Math.round((homeElectricCost + totalMonthlyEvHomeCost) * (region.careDiscountPercent / 100) + naturalGasCost * 0.20)
    : Math.round(((homeElectricCost + totalMonthlyEvHomeCost) / (1 - region.careDiscountPercent / 100)) * (region.careDiscountPercent / 100));

  return {
    dwelling,
    region,
    people,
    sqFt,
    utilities: {
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
      autoInsurance: profile.autoInsurance || null,
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
  // Toyota
  { fullName: 'Toyota Camry SE', make: 'Toyota', model: 'Camry SE', type: 'gas', mpgOrEfficiency: 32, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Toyota Camry LE', make: 'Toyota', model: 'Camry LE', type: 'gas', mpgOrEfficiency: 34, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Toyota Camry XLE', make: 'Toyota', model: 'Camry XLE', type: 'gas', mpgOrEfficiency: 31, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Toyota Camry (Gas)', make: 'Toyota', model: 'Camry', type: 'gas', mpgOrEfficiency: 32, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Toyota Camry Hybrid SE', make: 'Toyota', model: 'Camry Hybrid SE', type: 'hybrid', mpgOrEfficiency: 47, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Toyota Camry Hybrid', make: 'Toyota', model: 'Camry Hybrid', type: 'hybrid', mpgOrEfficiency: 51, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Toyota RAV4 (Gas)', make: 'Toyota', model: 'RAV4', type: 'gas', mpgOrEfficiency: 30, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Toyota RAV4 Hybrid', make: 'Toyota', model: 'RAV4 Hybrid', type: 'hybrid', mpgOrEfficiency: 40, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Toyota RAV4 Prime (PHEV)', make: 'Toyota', model: 'RAV4 Prime', type: 'phev', mpgOrEfficiency: 38, fuelGrade: 'regular', defaultInsurance: 130 },
  { fullName: 'Toyota Prius Hybrid', make: 'Toyota', model: 'Prius', type: 'hybrid', mpgOrEfficiency: 57, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Toyota Prius Prime (PHEV)', make: 'Toyota', model: 'Prius Prime', type: 'phev', mpgOrEfficiency: 52, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Toyota Corolla LE / SE', make: 'Toyota', model: 'Corolla SE', type: 'gas', mpgOrEfficiency: 35, fuelGrade: 'regular', defaultInsurance: 110 },
  { fullName: 'Toyota Corolla (Gas)', make: 'Toyota', model: 'Corolla', type: 'gas', mpgOrEfficiency: 35, fuelGrade: 'regular', defaultInsurance: 110 },
  { fullName: 'Toyota Corolla Hybrid', make: 'Toyota', model: 'Corolla Hybrid', type: 'hybrid', mpgOrEfficiency: 50, fuelGrade: 'regular', defaultInsurance: 110 },
  { fullName: 'Toyota Highlander (Gas)', make: 'Toyota', model: 'Highlander', type: 'gas', mpgOrEfficiency: 25, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Toyota Highlander Hybrid', make: 'Toyota', model: 'Highlander Hybrid', type: 'hybrid', mpgOrEfficiency: 36, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Toyota Grand Highlander Hybrid', make: 'Toyota', model: 'Grand Highlander Hybrid', type: 'hybrid', mpgOrEfficiency: 36, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Toyota Tacoma', make: 'Toyota', model: 'Tacoma', type: 'gas', mpgOrEfficiency: 23, fuelGrade: 'regular', defaultInsurance: 130 },
  { fullName: 'Toyota Tundra i-FORCE MAX', make: 'Toyota', model: 'Tundra', type: 'hybrid', mpgOrEfficiency: 20, fuelGrade: 'regular', defaultInsurance: 145 },
  { fullName: 'Toyota Sienna Hybrid', make: 'Toyota', model: 'Sienna', type: 'hybrid', mpgOrEfficiency: 36, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Toyota bZ4X (EV)', make: 'Toyota', model: 'bZ4X', type: 'ev', mpgOrEfficiency: 28, batteryKwh: 71.4, fuelGrade: 'electric', defaultInsurance: 135 },

  // Honda
  { fullName: 'Honda Civic EX / LX', make: 'Honda', model: 'Civic EX', type: 'gas', mpgOrEfficiency: 36, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Honda Civic Sport', make: 'Honda', model: 'Civic Sport', type: 'gas', mpgOrEfficiency: 35, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Honda Civic Sedan', make: 'Honda', model: 'Civic', type: 'gas', mpgOrEfficiency: 36, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Honda Civic Hybrid', make: 'Honda', model: 'Civic Hybrid', type: 'hybrid', mpgOrEfficiency: 50, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Honda Accord Sport', make: 'Honda', model: 'Accord Sport', type: 'gas', mpgOrEfficiency: 32, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Honda Accord (Gas)', make: 'Honda', model: 'Accord', type: 'gas', mpgOrEfficiency: 32, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Honda Accord Hybrid', make: 'Honda', model: 'Accord Hybrid', type: 'hybrid', mpgOrEfficiency: 48, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Honda CR-V EX / Touring', make: 'Honda', model: 'CR-V EX', type: 'gas', mpgOrEfficiency: 30, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Honda CR-V (Gas)', make: 'Honda', model: 'CR-V', type: 'gas', mpgOrEfficiency: 30, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Honda CR-V Hybrid', make: 'Honda', model: 'CR-V Hybrid', type: 'hybrid', mpgOrEfficiency: 40, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Honda Pilot', make: 'Honda', model: 'Pilot', type: 'gas', mpgOrEfficiency: 22, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Honda Odyssey', make: 'Honda', model: 'Odyssey', type: 'gas', mpgOrEfficiency: 22, fuelGrade: 'regular', defaultInsurance: 125 },
  { fullName: 'Honda HR-V', make: 'Honda', model: 'HR-V', type: 'gas', mpgOrEfficiency: 28, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Honda Prologue (EV)', make: 'Honda', model: 'Prologue', type: 'ev', mpgOrEfficiency: 32, batteryKwh: 85, fuelGrade: 'electric', defaultInsurance: 140 },

  // Tesla
  { fullName: 'Tesla Model Y Long Range AWD (EV)', make: 'Tesla', model: 'Model Y Long Range', type: 'ev', mpgOrEfficiency: 28, batteryKwh: 75, fuelGrade: 'electric', defaultInsurance: 165 },
  { fullName: 'Tesla Model Y Standard RWD (EV)', make: 'Tesla', model: 'Model Y RWD', type: 'ev', mpgOrEfficiency: 26, batteryKwh: 60, fuelGrade: 'electric', defaultInsurance: 155 },
  { fullName: 'Tesla Model Y Performance (EV)', make: 'Tesla', model: 'Model Y Performance', type: 'ev', mpgOrEfficiency: 30, batteryKwh: 75, fuelGrade: 'electric', defaultInsurance: 175 },
  { fullName: 'Tesla Model 3 Standard RWD (EV)', make: 'Tesla', model: 'Model 3 RWD', type: 'ev', mpgOrEfficiency: 23, batteryKwh: 60, fuelGrade: 'electric', defaultInsurance: 145 },
  { fullName: 'Tesla Model 3 Long Range AWD (EV)', make: 'Tesla', model: 'Model 3 Long Range', type: 'ev', mpgOrEfficiency: 24, batteryKwh: 75, fuelGrade: 'electric', defaultInsurance: 150 },
  { fullName: 'Tesla Model 3 Performance (EV)', make: 'Tesla', model: 'Model 3 Performance', type: 'ev', mpgOrEfficiency: 27, batteryKwh: 75, fuelGrade: 'electric', defaultInsurance: 165 },
  { fullName: 'Tesla Model X AWD (EV)', make: 'Tesla', model: 'Model X', type: 'ev', mpgOrEfficiency: 34, batteryKwh: 100, fuelGrade: 'electric', defaultInsurance: 195 },
  { fullName: 'Tesla Model S AWD (EV)', make: 'Tesla', model: 'Model S', type: 'ev', mpgOrEfficiency: 28, batteryKwh: 100, fuelGrade: 'electric', defaultInsurance: 190 },
  { fullName: 'Tesla Cybertruck Dual Motor AWD (EV)', make: 'Tesla', model: 'Cybertruck', type: 'ev', mpgOrEfficiency: 42, batteryKwh: 123, fuelGrade: 'electric', defaultInsurance: 195 },

  // Ford
  { fullName: 'Ford F-150 SuperCrew (Gas)', make: 'Ford', model: 'F-150', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Ford F-150 PowerBoost Hybrid', make: 'Ford', model: 'F-150 Hybrid', type: 'hybrid', mpgOrEfficiency: 24, fuelGrade: 'regular', defaultInsurance: 145 },
  { fullName: 'Ford F-150 Lightning (EV)', make: 'Ford', model: 'F-150 Lightning', type: 'ev', mpgOrEfficiency: 48, batteryKwh: 98, fuelGrade: 'electric', defaultInsurance: 160 },
  { fullName: 'Ford Mustang Mach-E (EV)', make: 'Ford', model: 'Mustang Mach-E', type: 'ev', mpgOrEfficiency: 33, batteryKwh: 72, fuelGrade: 'electric', defaultInsurance: 145 },
  { fullName: 'Ford Explorer', make: 'Ford', model: 'Explorer', type: 'gas', mpgOrEfficiency: 24, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Ford Maverick Hybrid', make: 'Ford', model: 'Maverick Hybrid', type: 'hybrid', mpgOrEfficiency: 42, fuelGrade: 'regular', defaultInsurance: 110 },
  { fullName: 'Ford Escape Hybrid', make: 'Ford', model: 'Escape Hybrid', type: 'hybrid', mpgOrEfficiency: 42, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Ford Bronco (4-Door)', make: 'Ford', model: 'Bronco', type: 'gas', mpgOrEfficiency: 20, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Ford Mustang GT (5.0L V8)', make: 'Ford', model: 'Mustang GT', type: 'gas', mpgOrEfficiency: 18, fuelGrade: 'premium', defaultInsurance: 165 },

  // Hyundai & Genesis
  { fullName: 'Hyundai Ioniq 5 (EV)', make: 'Hyundai', model: 'Ioniq 5', type: 'ev', mpgOrEfficiency: 29, batteryKwh: 77.4, fuelGrade: 'electric', defaultInsurance: 135 },
  { fullName: 'Hyundai Ioniq 6 (EV)', make: 'Hyundai', model: 'Ioniq 6', type: 'ev', mpgOrEfficiency: 26, batteryKwh: 77.4, fuelGrade: 'electric', defaultInsurance: 135 },
  { fullName: 'Hyundai Tucson Hybrid', make: 'Hyundai', model: 'Tucson Hybrid', type: 'hybrid', mpgOrEfficiency: 38, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Hyundai Santa Fe Hybrid', make: 'Hyundai', model: 'Santa Fe Hybrid', type: 'hybrid', mpgOrEfficiency: 36, fuelGrade: 'regular', defaultInsurance: 130 },
  { fullName: 'Hyundai Elantra', make: 'Hyundai', model: 'Elantra', type: 'gas', mpgOrEfficiency: 36, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Hyundai Elantra Hybrid', make: 'Hyundai', model: 'Elantra Hybrid', type: 'hybrid', mpgOrEfficiency: 54, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Hyundai Kona Electric (EV)', make: 'Hyundai', model: 'Kona Electric', type: 'ev', mpgOrEfficiency: 27, batteryKwh: 64.8, fuelGrade: 'electric', defaultInsurance: 125 },
  { fullName: 'Hyundai Palisade', make: 'Hyundai', model: 'Palisade', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Genesis GV70 Electrified (EV)', make: 'Genesis', model: 'GV70 Electrified', type: 'ev', mpgOrEfficiency: 35, batteryKwh: 77.4, fuelGrade: 'electric', defaultInsurance: 165 },

  // Kia
  { fullName: 'Kia EV6 (EV)', make: 'Kia', model: 'EV6', type: 'ev', mpgOrEfficiency: 29, batteryKwh: 77.4, fuelGrade: 'electric', defaultInsurance: 135 },
  { fullName: 'Kia EV9 3-Row (EV)', make: 'Kia', model: 'EV9', type: 'ev', mpgOrEfficiency: 38, batteryKwh: 99.8, fuelGrade: 'electric', defaultInsurance: 155 },
  { fullName: 'Kia Sportage Hybrid', make: 'Kia', model: 'Sportage Hybrid', type: 'hybrid', mpgOrEfficiency: 43, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Kia Telluride', make: 'Kia', model: 'Telluride', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Kia Sorento Hybrid', make: 'Kia', model: 'Sorento Hybrid', type: 'hybrid', mpgOrEfficiency: 37, fuelGrade: 'regular', defaultInsurance: 130 },
  { fullName: 'Kia Forte / K4', make: 'Kia', model: 'K4', type: 'gas', mpgOrEfficiency: 34, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Kia Niro EV', make: 'Kia', model: 'Niro EV', type: 'ev', mpgOrEfficiency: 28, batteryKwh: 64.8, fuelGrade: 'electric', defaultInsurance: 125 },
  { fullName: 'Kia Carnival Hybrid', make: 'Kia', model: 'Carnival Hybrid', type: 'hybrid', mpgOrEfficiency: 33, fuelGrade: 'regular', defaultInsurance: 130 },

  // Chevrolet & GMC
  { fullName: 'Chevrolet Equinox EV', make: 'Chevrolet', model: 'Equinox EV', type: 'ev', mpgOrEfficiency: 30, batteryKwh: 85, fuelGrade: 'electric', defaultInsurance: 130 },
  { fullName: 'Chevrolet Silverado 1500 (Gas)', make: 'Chevrolet', model: 'Silverado 1500', type: 'gas', mpgOrEfficiency: 19, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Chevrolet Silverado EV', make: 'Chevrolet', model: 'Silverado EV', type: 'ev', mpgOrEfficiency: 48, batteryKwh: 131, fuelGrade: 'electric', defaultInsurance: 170 },
  { fullName: 'Chevrolet Blazer EV', make: 'Chevrolet', model: 'Blazer EV', type: 'ev', mpgOrEfficiency: 34, batteryKwh: 85, fuelGrade: 'electric', defaultInsurance: 145 },
  { fullName: 'Chevrolet Bolt EV / EUV', make: 'Chevrolet', model: 'Bolt EV', type: 'ev', mpgOrEfficiency: 28, batteryKwh: 65, fuelGrade: 'electric', defaultInsurance: 115 },
  { fullName: 'Chevrolet Tahoe (V8)', make: 'Chevrolet', model: 'Tahoe', type: 'gas', mpgOrEfficiency: 17, fuelGrade: 'regular', defaultInsurance: 160 },
  { fullName: 'Chevrolet Trax', make: 'Chevrolet', model: 'Trax', type: 'gas', mpgOrEfficiency: 30, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'GMC Sierra 1500', make: 'GMC', model: 'Sierra 1500', type: 'gas', mpgOrEfficiency: 19, fuelGrade: 'regular', defaultInsurance: 145 },
  { fullName: 'GMC Yukon', make: 'GMC', model: 'Yukon', type: 'gas', mpgOrEfficiency: 17, fuelGrade: 'regular', defaultInsurance: 160 },

  // BMW
  { fullName: 'BMW 330i Sedan', make: 'BMW', model: '330i', type: 'gas', mpgOrEfficiency: 29, fuelGrade: 'premium', defaultInsurance: 160 },
  { fullName: 'BMW 330e (PHEV)', make: 'BMW', model: '330e', type: 'phev', mpgOrEfficiency: 28, fuelGrade: 'premium', defaultInsurance: 160 },
  { fullName: 'BMW M340i', make: 'BMW', model: 'M340i', type: 'gas', mpgOrEfficiency: 26, fuelGrade: 'premium', defaultInsurance: 175 },
  { fullName: 'BMW X3 xDrive30i', make: 'BMW', model: 'X3', type: 'gas', mpgOrEfficiency: 25, fuelGrade: 'premium', defaultInsurance: 155 },
  { fullName: 'BMW X5 xDrive40i', make: 'BMW', model: 'X5', type: 'gas', mpgOrEfficiency: 25, fuelGrade: 'premium', defaultInsurance: 175 },
  { fullName: 'BMW X5 xDrive50e (PHEV)', make: 'BMW', model: 'X5 PHEV', type: 'phev', mpgOrEfficiency: 22, fuelGrade: 'premium', defaultInsurance: 180 },
  { fullName: 'BMW i4 eDrive40 / M50 (EV)', make: 'BMW', model: 'i4', type: 'ev', mpgOrEfficiency: 31, batteryKwh: 81.2, fuelGrade: 'electric', defaultInsurance: 170 },
  { fullName: 'BMW iX xDrive50 (EV)', make: 'BMW', model: 'iX', type: 'ev', mpgOrEfficiency: 36, batteryKwh: 105.2, fuelGrade: 'electric', defaultInsurance: 195 },

  // Mercedes-Benz
  { fullName: 'Mercedes-Benz C300 Sedan', make: 'Mercedes-Benz', model: 'C300', type: 'gas', mpgOrEfficiency: 29, fuelGrade: 'premium', defaultInsurance: 165 },
  { fullName: 'Mercedes-Benz E350 Sedan', make: 'Mercedes-Benz', model: 'E350', type: 'gas', mpgOrEfficiency: 26, fuelGrade: 'premium', defaultInsurance: 175 },
  { fullName: 'Mercedes-Benz GLC 300 SUV', make: 'Mercedes-Benz', model: 'GLC 300', type: 'gas', mpgOrEfficiency: 26, fuelGrade: 'premium', defaultInsurance: 160 },
  { fullName: 'Mercedes-Benz GLE 350 / 450', make: 'Mercedes-Benz', model: 'GLE', type: 'gas', mpgOrEfficiency: 22, fuelGrade: 'premium', defaultInsurance: 180 },
  { fullName: 'Mercedes-Benz EQE SUV (EV)', make: 'Mercedes-Benz', model: 'EQE SUV', type: 'ev', mpgOrEfficiency: 37, batteryKwh: 90.6, fuelGrade: 'electric', defaultInsurance: 185 },
  { fullName: 'Mercedes-Benz EQS Sedan (EV)', make: 'Mercedes-Benz', model: 'EQS', type: 'ev', mpgOrEfficiency: 33, batteryKwh: 108.4, fuelGrade: 'electric', defaultInsurance: 210 },

  // Audi & Porsche
  { fullName: 'Audi A4 45 TFSI', make: 'Audi', model: 'A4', type: 'gas', mpgOrEfficiency: 27, fuelGrade: 'premium', defaultInsurance: 160 },
  { fullName: 'Audi Q5 45 TFSI', make: 'Audi', model: 'Q5', type: 'gas', mpgOrEfficiency: 25, fuelGrade: 'premium', defaultInsurance: 160 },
  { fullName: 'Audi Q5 55 TFSI e (PHEV)', make: 'Audi', model: 'Q5 PHEV', type: 'phev', mpgOrEfficiency: 27, fuelGrade: 'premium', defaultInsurance: 165 },
  { fullName: 'Audi Q4 e-tron (EV)', make: 'Audi', model: 'Q4 e-tron', type: 'ev', mpgOrEfficiency: 33, batteryKwh: 82, fuelGrade: 'electric', defaultInsurance: 155 },
  { fullName: 'Porsche Macan (Gas)', make: 'Porsche', model: 'Macan', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'premium', defaultInsurance: 185 },
  { fullName: 'Porsche Macan EV', make: 'Porsche', model: 'Macan EV', type: 'ev', mpgOrEfficiency: 35, batteryKwh: 100, fuelGrade: 'electric', defaultInsurance: 200 },
  { fullName: 'Porsche Cayenne', make: 'Porsche', model: 'Cayenne', type: 'gas', mpgOrEfficiency: 19, fuelGrade: 'premium', defaultInsurance: 200 },
  { fullName: 'Porsche Taycan (EV)', make: 'Porsche', model: 'Taycan', type: 'ev', mpgOrEfficiency: 36, batteryKwh: 93.4, fuelGrade: 'electric', defaultInsurance: 225 },

  // Lexus
  { fullName: 'Lexus RX 350 (Gas)', make: 'Lexus', model: 'RX 350', type: 'gas', mpgOrEfficiency: 25, fuelGrade: 'regular', defaultInsurance: 145 },
  { fullName: 'Lexus RX 350h Hybrid', make: 'Lexus', model: 'RX 350h', type: 'hybrid', mpgOrEfficiency: 36, fuelGrade: 'regular', defaultInsurance: 145 },
  { fullName: 'Lexus NX 350h Hybrid', make: 'Lexus', model: 'NX 350h', type: 'hybrid', mpgOrEfficiency: 39, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Lexus ES 350', make: 'Lexus', model: 'ES 350', type: 'gas', mpgOrEfficiency: 26, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Lexus ES 300h Hybrid', make: 'Lexus', model: 'ES 300h', type: 'hybrid', mpgOrEfficiency: 44, fuelGrade: 'regular', defaultInsurance: 135 },
  { fullName: 'Lexus TX 350 / 500h', make: 'Lexus', model: 'TX', type: 'hybrid', mpgOrEfficiency: 23, fuelGrade: 'regular', defaultInsurance: 150 },
  { fullName: 'Lexus RZ 450e (EV)', make: 'Lexus', model: 'RZ 450e', type: 'ev', mpgOrEfficiency: 34, batteryKwh: 71.4, fuelGrade: 'electric', defaultInsurance: 155 },

  // Subaru
  { fullName: 'Subaru Outback', make: 'Subaru', model: 'Outback', type: 'gas', mpgOrEfficiency: 28, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Subaru Forester', make: 'Subaru', model: 'Forester', type: 'gas', mpgOrEfficiency: 29, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Subaru Crosstrek', make: 'Subaru', model: 'Crosstrek', type: 'gas', mpgOrEfficiency: 30, fuelGrade: 'regular', defaultInsurance: 110 },
  { fullName: 'Subaru Ascent (3-Row)', make: 'Subaru', model: 'Ascent', type: 'gas', mpgOrEfficiency: 22, fuelGrade: 'regular', defaultInsurance: 130 },
  { fullName: 'Subaru Solterra (EV)', make: 'Subaru', model: 'Solterra', type: 'ev', mpgOrEfficiency: 31, batteryKwh: 72.8, fuelGrade: 'electric', defaultInsurance: 130 },

  // Mazda
  { fullName: 'Mazda CX-5', make: 'Mazda', model: 'CX-5', type: 'gas', mpgOrEfficiency: 28, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Mazda CX-50', make: 'Mazda', model: 'CX-50', type: 'gas', mpgOrEfficiency: 27, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Mazda CX-90 PHEV', make: 'Mazda', model: 'CX-90 PHEV', type: 'phev', mpgOrEfficiency: 25, fuelGrade: 'regular', defaultInsurance: 140 },
  { fullName: 'Mazda 3 Sedan / Hatch', make: 'Mazda', model: 'Mazda 3', type: 'gas', mpgOrEfficiency: 31, fuelGrade: 'regular', defaultInsurance: 115 },

  // Nissan
  { fullName: 'Nissan Rogue', make: 'Nissan', model: 'Rogue', type: 'gas', mpgOrEfficiency: 33, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Nissan Altima', make: 'Nissan', model: 'Altima', type: 'gas', mpgOrEfficiency: 32, fuelGrade: 'regular', defaultInsurance: 120 },
  { fullName: 'Nissan Sentra', make: 'Nissan', model: 'Sentra', type: 'gas', mpgOrEfficiency: 34, fuelGrade: 'regular', defaultInsurance: 115 },
  { fullName: 'Nissan Pathfinder', make: 'Nissan', model: 'Pathfinder', type: 'gas', mpgOrEfficiency: 23, fuelGrade: 'regular', defaultInsurance: 130 },
  { fullName: 'Nissan Ariya (EV)', make: 'Nissan', model: 'Ariya', type: 'ev', mpgOrEfficiency: 32, batteryKwh: 87, fuelGrade: 'electric', defaultInsurance: 140 },
  { fullName: 'Nissan Leaf (EV)', make: 'Nissan', model: 'Leaf', type: 'ev', mpgOrEfficiency: 30, batteryKwh: 60, fuelGrade: 'electric', defaultInsurance: 115 },

  // Rivian & Polestar
  { fullName: 'Rivian R1S 3-Row SUV (EV)', make: 'Rivian', model: 'R1S', type: 'ev', mpgOrEfficiency: 44, batteryKwh: 135, fuelGrade: 'electric', defaultInsurance: 195 },
  { fullName: 'Rivian R1T Pickup (EV)', make: 'Rivian', model: 'R1T', type: 'ev', mpgOrEfficiency: 45, batteryKwh: 135, fuelGrade: 'electric', defaultInsurance: 195 },
  { fullName: 'Polestar 2 (EV)', make: 'Polestar', model: 'Polestar 2', type: 'ev', mpgOrEfficiency: 31, batteryKwh: 78, fuelGrade: 'electric', defaultInsurance: 150 },
  { fullName: 'Polestar 3 SUV (EV)', make: 'Polestar', model: 'Polestar 3', type: 'ev', mpgOrEfficiency: 35, batteryKwh: 111, fuelGrade: 'electric', defaultInsurance: 175 },

  // Jeep, Dodge & Ram
  { fullName: 'Jeep Grand Cherokee 4xe (PHEV)', make: 'Jeep', model: 'Grand Cherokee 4xe', type: 'phev', mpgOrEfficiency: 23, fuelGrade: 'regular', defaultInsurance: 155 },
  { fullName: 'Jeep Wrangler 4xe (PHEV)', make: 'Jeep', model: 'Wrangler 4xe', type: 'phev', mpgOrEfficiency: 20, fuelGrade: 'regular', defaultInsurance: 150 },
  { fullName: 'Ram 1500 (V8 / Hurricane)', make: 'Ram', model: '1500', type: 'gas', mpgOrEfficiency: 19, fuelGrade: 'regular', defaultInsurance: 145 },
  { fullName: 'Dodge Durango', make: 'Dodge', model: 'Durango', type: 'gas', mpgOrEfficiency: 21, fuelGrade: 'regular', defaultInsurance: 145 }
];

export const POPULAR_CAR_MAKES = [
  'Toyota',
  'Honda',
  'Tesla',
  'Ford',
  'Hyundai',
  'Kia',
  'Chevrolet',
  'GMC',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Porsche',
  'Lexus',
  'Subaru',
  'Mazda',
  'Nissan',
  'Rivian',
  'Polestar',
  'Jeep',
  'Ram',
  'Dodge',
  'Other'
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
  const m = (modelStr || '').toLowerCase().trim();
  const mk = (make || '').toLowerCase().trim();

  const isLiability = coverage === 'liability_only';
  const isGap = coverage === 'full_coverage_gap';

  // 1. Direct or partial match in POPULAR_CAR_DATABASE
  const directMatch = POPULAR_CAR_DATABASE.find(c => {
    const dbModel = c.model.toLowerCase();
    const dbFull = c.fullName.toLowerCase();
    const makeMatches = !mk || mk === 'other' || c.make.toLowerCase() === mk;
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
