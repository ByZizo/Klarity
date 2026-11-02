import React, { useState, useMemo } from 'react';
import {
  Home,
  Users,
  Zap,
  Flame,
  Droplets,
  Car,
  BatteryCharging,
  Sparkles,
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
  X
} from 'lucide-react';
import {
  DWELLING_TYPES,
  UTILITY_REGIONS,
  calculateHouseholdAndFleetMetrics,
  FREE_EV_CHARGING_GUIDE,
  ZERO_APR_EV_MODELS
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

  const [newCar, setNewCar] = useState({
    name: '',
    type: 'gas',
    mpgOrEfficiency: 30,
    monthlyMiles: 900,
    insuranceMonthly: 120,
    monthlyPayment: 0,
    freeChargingSharePercent: 30
  });

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

  const handleUploadInsuranceCard = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      handleHealthChange({
        cards: [
          ...(health.cards || []),
          { id: `ic-${Date.now()}`, name: file.name, dataUrl }
        ]
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveInsuranceCard = (id) => {
    handleHealthChange({
      cards: (health.cards || []).filter(c => c.id !== id)
    });
  };

  const handleAddVehicle = (e) => {
    e.preventDefault();
    if (!newCar.name.trim()) return;
    const item = {
      id: `veh-${Date.now()}`,
      name: newCar.name.trim(),
      type: newCar.type,
      mpgOrEfficiency: Number(newCar.mpgOrEfficiency) || (newCar.type === 'ev' ? 28 : 30),
      monthlyMiles: Number(newCar.monthlyMiles) || 900,
      insuranceMonthly: Number(newCar.insuranceMonthly) || 120,
      monthlyPayment: Number(newCar.monthlyPayment) || 0,
      freeChargingSharePercent: newCar.type === 'ev' ? Number(newCar.freeChargingSharePercent || 30) : 0
    };
    onUpdateProfile({
      ...householdProfile,
      vehicles: [...(householdProfile.vehicles || []), item]
    });
    setNewCar({
      name: '',
      type: 'gas',
      mpgOrEfficiency: 30,
      monthlyMiles: 900,
      insuranceMonthly: 120,
      monthlyPayment: 0,
      freeChargingSharePercent: 30
    });
    setShowAddCar(false);
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
          {onAskAiAdvisor && (
            <button
              type="button"
              onClick={() => {
                if (section === 'household') {
                  onAskAiAdvisor(`Review my Household setup (${metrics.dwelling.label}, ${metrics.people} people, PG&E $${metrics.utilities.totalPgeCombinedBill}/mo, Water $${metrics.utilities.waterTrashTotalCost}/mo, Food $${foodMonthly}/mo).`);
                } else if (section === 'auto') {
                  onAskAiAdvisor(`Review my Auto fleet (${metrics.fleet.vehicles.length} cars, Gas $${metrics.fleet.totalMonthlyGasCost}/mo) and show me free EV chargers nearby and the best 0% APR EV deals.`);
                } else {
                  onAskAiAdvisor(`Review my Health coverage (${health.provider}, copays, and doctors) and suggest ways to optimize medical expenses.`);
                }
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[#18457c] text-xs font-bold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 1: HOUSEHOLD (Electricity, Gas, Water, Food)              */}
      {/* ================================================================= */}
      {section === 'household' && (
        <div className="p-5 flex flex-col gap-4">
          {/* Quick Inputs Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
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
      {/* SECTION 2: AUTO (Vehicles, Gas, Free Chargers, 0% APR Deals)      */}
      {/* ================================================================= */}
      {section === 'auto' && (
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {[
                { id: 'vehicles', label: `Vehicles (${metrics.fleet.vehicles.length})` },
                { id: 'chargers', label: 'Free Chargers' },
                { id: 'deals', label: '0% APR Deals' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAutoView(tab.id)}
                  className={`px-3 py-1 rounded-lg cursor-pointer ${
                    autoView === tab.id ? 'bg-white text-[#18457c] shadow-2xs font-bold' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {autoView === 'vehicles' && (
              <button
                type="button"
                onClick={() => setShowAddCar(!showAddCar)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#18457c] text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Car</span>
              </button>
            )}
          </div>

          {autoView === 'vehicles' && (
            <>
              {showAddCar && (
                <form onSubmit={handleAddVehicle} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="Car (e.g. Toyota Camry)"
                    value={newCar.name}
                    onChange={e => setNewCar({ ...newCar, name: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white border border-slate-200"
                  />
                  <select
                    value={newCar.type}
                    onChange={e => {
                      const t = e.target.value;
                      setNewCar({ ...newCar, type: t, mpgOrEfficiency: t === 'ev' ? 28 : t === 'hybrid' ? 48 : 28 });
                    }}
                    className="px-3 py-2 rounded-lg bg-white border border-slate-200 font-semibold"
                  >
                    <option value="gas">Gas</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="phev">Plug-In Hybrid</option>
                    <option value="ev">Electric (EV)</option>
                  </select>
                  <input
                    type="number"
                    placeholder={newCar.type === 'ev' ? 'kWh/100mi' : 'MPG'}
                    value={newCar.mpgOrEfficiency}
                    onChange={e => setNewCar({ ...newCar, mpgOrEfficiency: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white border border-slate-200"
                  />
                  <input
                    type="number"
                    placeholder="Miles/mo"
                    value={newCar.monthlyMiles}
                    onChange={e => setNewCar({ ...newCar, monthlyMiles: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-white border border-slate-200"
                  />
                  <button type="submit" className="py-2 px-3 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer">
                    Save
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {metrics.fleet.vehicles.map(v => (
                  <div key={v.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{v.name}</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold uppercase text-slate-700">
                          {v.type}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVehicle(v.id)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-200/70">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{v.type === 'ev' ? 'Charging' : 'Gas'}</span>
                        <span className="font-bold text-slate-900">${v.monthlyFuelOrChargeCost}/mo</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Insurance</span>
                        <span className="font-bold text-slate-900">${v.insuranceMonthly}/mo</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total</span>
                        <span className="font-bold text-[#18457c]">${v.totalMonthlyVehicleCost}/mo</span>
                      </div>
                    </div>

                    {v.type === 'ev' ? (
                      <div className="flex items-center justify-between gap-2 text-[11px] text-emerald-800">
                        <span>Free Charging: <strong>{v.freeChargingSharePercent || 0}%</strong></span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={v.freeChargingSharePercent || 0}
                          onChange={e => handleUpdateVehicle(v.id, { freeChargingSharePercent: Number(e.target.value) })}
                          className="w-36 accent-emerald-600 cursor-pointer"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>EV switch saves <strong>~${v.potentialEvSwitchSavings}/mo</strong></span>
                        <button
                          type="button"
                          onClick={() => setAutoView('deals')}
                          className="text-[#18457c] font-bold hover:underline cursor-pointer"
                        >
                          0% APR Deals →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {autoView === 'chargers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {FREE_EV_CHARGING_GUIDE.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{item.category}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">{item.cost}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{item.locations}</p>
                </div>
              ))}
            </div>
          )}

          {autoView === 'deals' && (
            <div className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block">Price</span>
                  <input
                    type="number"
                    value={simEvMsrp}
                    onChange={e => setSimEvMsrp(Number(e.target.value) || 0)}
                    className="w-full font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 block">IRS Credit</span>
                  <input
                    type="number"
                    value={simFedCredit}
                    onChange={e => setSimFedCredit(Number(e.target.value) || 0)}
                    className="w-full font-bold text-emerald-700 bg-white px-2 py-1 rounded border border-slate-200 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 block">Rebates</span>
                  <input
                    type="number"
                    value={simStateRebate}
                    onChange={e => setSimStateRebate(Number(e.target.value) || 0)}
                    className="w-full font-bold text-emerald-700 bg-white px-2 py-1 rounded border border-slate-200 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Down Payment</span>
                  <input
                    type="number"
                    value={simDownPayment}
                    onChange={e => setSimDownPayment(Number(e.target.value) || 0)}
                    className="w-full font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 mt-0.5"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">0% Payment (After Gas Saved)</span>
                  <div className="font-bold text-sm text-[#18457c] mt-1">
                    ${zeroAprMonthlyPayment}/mo <span className="text-emerald-700">(${trueNetOutOfPocketMonthly} net)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ZERO_APR_EV_MODELS.map((ev, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{ev.model}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{ev.promoApr}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{ev.msrpRange} • {ev.epaRange}</span>
                    <span className="text-[11px] text-slate-700">{ev.federalAndDealerCash}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* SECTION 3: HEALTH (Insurance, Copays, Doctor Offices, Cards)      */}
      {/* ================================================================= */}
      {section === 'health' && (
        <div className="p-5 flex flex-col gap-5 text-xs">
          {/* Row 1: Insurance Plan & Copays */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <div className="col-span-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Insurance Provider</span>
              <input
                type="text"
                value={health.provider || ''}
                onChange={e => handleHealthChange({ provider: e.target.value })}
                placeholder="e.g. Kaiser, Medi-Cal, Medicare"
                className="w-full font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Member ID</span>
              <input
                type="text"
                value={health.memberId || ''}
                onChange={e => handleHealthChange({ memberId: e.target.value })}
                placeholder="ID / MRN #"
                className="w-full font-mono font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Group #</span>
              <input
                type="text"
                value={health.groupNumber || ''}
                onChange={e => handleHealthChange({ groupNumber: e.target.value })}
                placeholder="Group #"
                className="w-full font-mono font-bold text-slate-900 bg-transparent mt-0.5 focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Primary Copay</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className="font-bold text-slate-500">$</span>
                <input
                  type="number"
                  value={health.copays?.primaryCare ?? 15}
                  onChange={e => handleCopayChange('primaryCare', e.target.value)}
                  className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Specialist</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className="font-bold text-slate-500">$</span>
                <input
                  type="number"
                  value={health.copays?.specialist ?? 30}
                  onChange={e => handleCopayChange('specialist', e.target.value)}
                  className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">ER Copay</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className="font-bold text-slate-500">$</span>
                <input
                  type="number"
                  value={health.copays?.er ?? 100}
                  onChange={e => handleCopayChange('er', e.target.value)}
                  className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-semibold text-slate-400 block">Rx Copay</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className="font-bold text-slate-500">$</span>
                <input
                  type="number"
                  value={health.copays?.rxGeneric ?? 10}
                  onChange={e => handleCopayChange('rxGeneric', e.target.value)}
                  className="w-full font-bold text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Doctor Offices & Insurance Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Doctor Offices */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-[#18457c]" />
                  <span>Doctor Offices</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddDoctor(!showAddDoctor)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#18457c] text-white font-semibold text-[11px] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Doctor</span>
                </button>
              </div>

              {showAddDoctor && (
                <form onSubmit={handleAddDoctor} className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    required
                    placeholder="Doctor / Clinic Name"
                    value={newDoc.name}
                    onChange={e => setNewDoc({ ...newDoc, name: e.target.value })}
                    className="px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="Specialty (e.g. Primary, Dental)"
                    value={newDoc.specialty}
                    onChange={e => setNewDoc({ ...newDoc, specialty: e.target.value })}
                    className="px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="Office Location / Address"
                    value={newDoc.office}
                    onChange={e => setNewDoc({ ...newDoc, office: e.target.value })}
                    className="px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Phone #"
                      value={newDoc.phone}
                      onChange={e => setNewDoc({ ...newDoc, phone: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200"
                    />
                    <button type="submit" className="px-3 py-1.5 rounded bg-emerald-600 text-white font-bold cursor-pointer">
                      Add
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {(health.doctors || []).map(doc => (
                  <div key={doc.id} className="p-2.5 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900">{doc.name} {doc.specialty ? <span className="font-normal text-slate-500">• {doc.specialty}</span> : null}</div>
                      <div className="text-[11px] text-slate-500">{doc.office} {doc.phone ? `• ${doc.phone}` : ''}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDoctor(doc.id)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Insurance Cards */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Insurance Cards</span>
                </span>
                <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>Upload Card</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadInsuranceCard}
                    className="hidden"
                  />
                </label>
              </div>

              {(health.cards || []).length === 0 ? (
                <div className="p-6 bg-white rounded-lg border border-dashed border-slate-200 text-center text-slate-400 text-[11px]">
                  Upload front/back photos of your Health, Medicare, Medi-Cal, or Dental cards.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {(health.cards || []).map(c => (
                    <div key={c.id} className="relative bg-white p-2 rounded-lg border border-slate-200">
                      <img src={c.dataUrl} alt={c.name} className="w-full h-24 object-cover rounded" />
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] font-semibold text-slate-700 truncate">{c.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInsuranceCard(c.id)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
