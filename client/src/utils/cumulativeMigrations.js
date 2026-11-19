// ============================================================================
// KLARITY CUMULATIVE & IDEMPOTENT CLIENT MIGRATION ENGINE
// 
// Ensures that users jumping across any number of versions (e.g. v1.0 -> v3.12)
// immediately catch up to the current schema in a single boot step without
// needing incremental delta scripts, sequential upgrade loops, or data loss.
// ============================================================================

import { enforceStorageEncryptionAudit } from './securityCrypto.js';
import { loadDocumentFolders } from './documentVaultStorage.js';
import {
  DEFAULT_BROWSER_SETTINGS,
  DEFAULT_NEWTAB_PREFS,
  DEFAULT_NOTE_STYLES
} from './browserSettings.js';

export const CURRENT_CLIENT_SCHEMA_VERSION = '3.12.59';

/**
 * Runs all schema integrity verifications cumulatively and idempotently.
 * Safe to run on every application boot.
 */
export async function runCumulativeClientMigrations() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { ok: true, skipped: true };
  }

  const migrationResults = {
    budgetsMigrated: false,
    documentFoldersReconciled: false,
    vaultSectionsReconciled: false,
    securityDefaultsApplied: false,
    browserSettingsNormalized: false,
    uiPreferencesNormalized: false,
    encryptionAudited: false
  };

  try {
    // ------------------------------------------------------------------------
    // 1. CUMULATIVE BUDGET SCHEMA MIGRATION (v1 -> v2 / missing fields)
    // ------------------------------------------------------------------------
    try {
      const v2Raw = localStorage.getItem('klarity_budgets_v2');
      const v1Raw = localStorage.getItem('klarity_budgets');

      if (!v2Raw && v1Raw) {
        // Upgrade legacy v1 budgets to v2
        try {
          const parsedV1 = JSON.parse(v1Raw);
          if (Array.isArray(parsedV1)) {
            const upgraded = parsedV1.map((b, idx) => ({
              id: b.id || `bgt-${idx}-${Date.now()}`,
              category: b.category || 'General',
              monthlyLimit: Number(b.monthlyLimit || b.limit || 0),
              spent: Number(b.spent || 0)
            }));
            localStorage.setItem('klarity_budgets_v2', JSON.stringify(upgraded));
            migrationResults.budgetsMigrated = true;
          }
        } catch {}
      } else if (v2Raw) {
        // Validate v2 budgets integrity
        try {
          const parsedV2 = JSON.parse(v2Raw);
          if (Array.isArray(parsedV2)) {
            let neededFix = false;
            const sanitized = parsedV2.map((b, idx) => {
              const clean = {
                id: b.id || `bgt-${idx}-${Date.now()}`,
                category: b.category || 'General',
                monthlyLimit: Number(b.monthlyLimit !== undefined ? b.monthlyLimit : (b.limit || 0)),
                spent: Number(b.spent || 0)
              };
              if (!b.id || b.monthlyLimit === undefined) neededFix = true;
              return clean;
            });
            if (neededFix) {
              localStorage.setItem('klarity_budgets_v2', JSON.stringify(sanitized));
              migrationResults.budgetsMigrated = true;
            }
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Cumulative migration notice (budgets):', e);
    }

    // ------------------------------------------------------------------------
    // 2. DOCUMENT VAULT FOLDERS & METADATA RECONCILIATION
    // ------------------------------------------------------------------------
    try {
      // Reconciles folders from document metadata and localStorage idempotently
      loadDocumentFolders();
      migrationResults.documentFoldersReconciled = true;
    } catch (e) {
      console.warn('Cumulative migration notice (document folders):', e);
    }

    // ------------------------------------------------------------------------
    // 3. PASSWORD VAULT SECTIONS NORMALIZATION
    // ------------------------------------------------------------------------
    try {
      const sectionsRaw = localStorage.getItem('klarity_vault_sections');
      const defaultSections = ['Favorites', 'General', 'Utilities', 'Finance', 'Personal'];

      if (!sectionsRaw) {
        localStorage.setItem('klarity_vault_sections', JSON.stringify(defaultSections));
        migrationResults.vaultSectionsReconciled = true;
      } else {
        try {
          const parsed = JSON.parse(sectionsRaw);
          if (Array.isArray(parsed)) {
            // Ensure Favorites exists at index 0
            const hasFavorites = parsed.some(s => String(s).toLowerCase() === 'favorites');
            if (!hasFavorites) {
              const nextSections = ['Favorites', ...parsed.filter(Boolean)];
              localStorage.setItem('klarity_vault_sections', JSON.stringify(nextSections));
              migrationResults.vaultSectionsReconciled = true;
            }
          }
        } catch {
          localStorage.setItem('klarity_vault_sections', JSON.stringify(defaultSections));
          migrationResults.vaultSectionsReconciled = true;
        }
      }
    } catch (e) {
      console.warn('Cumulative migration notice (vault sections):', e);
    }

    // ------------------------------------------------------------------------
    // 4. SECURITY & AUTO-LOCK DEFAULTS
    // ------------------------------------------------------------------------
    try {
      if (!localStorage.getItem('klarity_vault_lock_type')) {
        localStorage.setItem('klarity_vault_lock_type', 'pin');
        migrationResults.securityDefaultsApplied = true;
      }
      if (!localStorage.getItem('klarity_idle_action')) {
        localStorage.setItem('klarity_idle_action', 'lock');
        migrationResults.securityDefaultsApplied = true;
      }
      if (!localStorage.getItem('klarity_vault_pin_timeout')) {
        localStorage.setItem('klarity_vault_pin_timeout', '15m');
        migrationResults.securityDefaultsApplied = true;
      }
      const autoLockMins = Number(localStorage.getItem('klarity_auto_lock_mins'));
      if (Number.isNaN(autoLockMins) || autoLockMins <= 0) {
        localStorage.setItem('klarity_auto_lock_mins', '15');
        migrationResults.securityDefaultsApplied = true;
      }
    } catch (e) {
      console.warn('Cumulative migration notice (security):', e);
    }

    // ------------------------------------------------------------------------
    // 5. BROWSER & NEW TAB PREFERENCES NORMALIZATION
    // ------------------------------------------------------------------------
    try {
      const rawBrowser = localStorage.getItem('klarity_browser_settings');
      if (rawBrowser) {
        try {
          const parsed = JSON.parse(rawBrowser);
          if (parsed && typeof parsed === 'object') {
            const merged = { ...DEFAULT_BROWSER_SETTINGS, ...parsed };
            // Check if any default field was missing in user's saved config
            let missingField = false;
            for (const key of Object.keys(DEFAULT_BROWSER_SETTINGS)) {
              if (parsed[key] === undefined) {
                missingField = true;
                break;
              }
            }
            if (missingField) {
              localStorage.setItem('klarity_browser_settings', JSON.stringify(merged));
              migrationResults.browserSettingsNormalized = true;
            }
          }
        } catch {}
      }

      const rawNewTab = localStorage.getItem('klarity_newtab_prefs');
      if (rawNewTab) {
        try {
          const parsed = JSON.parse(rawNewTab);
          if (parsed && typeof parsed === 'object') {
            const mergedStyles = {
              ...DEFAULT_NOTE_STYLES,
              ...(parsed.noteStyles || {})
            };
            const mergedPrefs = {
              ...DEFAULT_NEWTAB_PREFS,
              ...parsed,
              noteStyles: mergedStyles
            };
            let missingPref = false;
            for (const key of Object.keys(DEFAULT_NEWTAB_PREFS)) {
              if (parsed[key] === undefined) {
                missingPref = true;
                break;
              }
            }
            if (missingPref) {
              localStorage.setItem('klarity_newtab_prefs', JSON.stringify(mergedPrefs));
              migrationResults.browserSettingsNormalized = true;
            }
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Cumulative migration notice (browser):', e);
    }

    // ------------------------------------------------------------------------
    // 6. UI ACCESSIBILITY & THEME PREFERENCES NORMALIZATION
    // ------------------------------------------------------------------------
    try {
      const rawScale = localStorage.getItem('klarity_ui_font_scale');
      if (rawScale) {
        let normalizedScale = null;
        if (rawScale === 'normal') normalizedScale = '100';
        else if (rawScale === 'large') normalizedScale = '125';
        else if (rawScale === 'xlarge') normalizedScale = '150';
        else if (rawScale === 'huge') normalizedScale = '175';
        else if (rawScale === 'maximum' || rawScale === 'max') normalizedScale = '200';
        if (normalizedScale && normalizedScale !== rawScale) {
          localStorage.setItem('klarity_ui_font_scale', normalizedScale);
          migrationResults.uiPreferencesNormalized = true;
        }
      }
      if (!localStorage.getItem('klarity_ui_density')) {
        localStorage.setItem('klarity_ui_density', 'comfortable');
        migrationResults.uiPreferencesNormalized = true;
      }
    } catch (e) {
      console.warn('Cumulative migration notice (ui):', e);
    }

    // ------------------------------------------------------------------------
    // 7. STORAGE ENCRYPTION AUDIT (ENCv1 / ENCv2 -> ENCv3 AES-256-GCM)
    // ------------------------------------------------------------------------
    try {
      await enforceStorageEncryptionAudit();
      migrationResults.encryptionAudited = true;
    } catch (e) {
      console.warn('Cumulative migration notice (encryption):', e);
    }

    // Record migration timestamp and target schema version
    localStorage.setItem('klarity_schema_version', CURRENT_CLIENT_SCHEMA_VERSION);
    localStorage.setItem('klarity_migrated_at', new Date().toISOString());

    return { ok: true, results: migrationResults };
  } catch (err) {
    console.error('Krystal cumulative migration exception:', err);
    return { ok: false, error: err.message };
  }
}
