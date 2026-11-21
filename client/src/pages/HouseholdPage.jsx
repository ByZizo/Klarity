import React from 'react';
import HouseholdLifestyleHub from '../components/HouseholdLifestyleHub';

export function HouseholdPage({
  bills = [],
  householdProfile,
  onUpdateProfile,
  onSyncUtilitiesToBills,
  onSyncUtilityBills,
  onAskAiAdvisor,
  onShowToast
}) {
  const syncHandler = onSyncUtilitiesToBills || onSyncUtilityBills;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[26px] font-semibold text-[var(--ink)] tracking-tight">
          Household and providers
        </h1>
        <p className="text-[15px] font-medium text-[var(--muted)] mt-0.5">
          Manage home utilities, warranty protection, vehicles, health coverage, and household services.
        </p>
      </div>

      <HouseholdLifestyleHub
        bills={bills}
        householdProfile={householdProfile}
        onUpdateProfile={onUpdateProfile}
        onSyncUtilitiesToBills={syncHandler}
        onAskAiAdvisor={onAskAiAdvisor}
        onShowToast={onShowToast}
        isOverview={false}
      />
    </div>
  );
}

export default HouseholdPage;
