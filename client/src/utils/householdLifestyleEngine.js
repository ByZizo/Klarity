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
  vehicles: [
    {
      id: 'veh-1',
      name: '2019 Toyota Camry SE',
      type: 'gas', // 'gas' | 'hybrid' | 'phev' | 'ev'
      mpgOrEfficiency: 32, // 32 MPG for gas/hybrid, or kWh/100mi for EV (e.g. 28 kWh/100mi)
      monthlyMiles: 950,
      monthlyPayment: 0,
      apr: 0,
      insuranceMonthly: 115,
      freeChargingSharePercent: 0
    },
    {
      id: 'veh-2',
      name: '2021 Honda CR-V Touring',
      type: 'gas',
      mpgOrEfficiency: 29,
      monthlyMiles: 850,
      monthlyPayment: 0,
      apr: 0,
      insuranceMonthly: 125,
      freeChargingSharePercent: 0
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
      const gasCost = Math.round(gallons * region.avgGasPricePerGal);
      const homeKwh = Math.round((evMiles / 100) * 30);
      const evCost = Math.round(homeKwh * effectiveEvRate);
      const maintenance = Math.round(miles * 0.055);

      totalMonthlyGasCost += gasCost;
      totalMonthlyEvHomeKwh += homeKwh;
      totalMonthlyEvHomeCost += evCost;
      totalMonthlyMaintenance += maintenance;

      return {
        ...v,
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
      const gasCost = Math.round(gallons * region.avgGasPricePerGal);
      const maintenance = Math.round(miles * (v.type === 'hybrid' ? 0.05 : 0.075)); // Oil changes, brakes, belts, smog

      // Calculate how much they would save switching this car to an EV (with 35% free charging + off-peak home rate)
      const projectedEvKwh = (miles / 100) * 27 * 0.65;
      const projectedEvCost = Math.round(projectedEvKwh * effectiveEvRate);
      const potentialEvSwitchSavings = Math.max(0, (gasCost + maintenance) - (projectedEvCost + Math.round(miles * 0.03)));

      totalMonthlyGasCost += gasCost;
      totalMonthlyMaintenance += maintenance;

      return {
        ...v,
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
