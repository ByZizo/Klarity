export const PERFORMANCE_MODE_KEY = 'klarity_ui_performance_mode'; // 'auto' | 'low' | 'standard'

/**
 * Safely inspect browser / Chrome OS / Electron hardware capabilities without throwing
 * in sandboxed web or older browser environments.
 */
export function detectDeviceCapabilities(desktopHardware = null) {
  let navMem = null;
  let navCores = null;
  let ua = '';
  let prefersReducedMotion = false;
  let hasWebGPU = false;

  try {
    if (typeof navigator !== 'undefined') {
      if (typeof navigator.deviceMemory === 'number' && Number.isFinite(navigator.deviceMemory)) {
        navMem = navigator.deviceMemory;
      }
      if (typeof navigator.hardwareConcurrency === 'number' && Number.isFinite(navigator.hardwareConcurrency)) {
        navCores = navigator.hardwareConcurrency;
      }
      ua = String(navigator.userAgent || '');
      hasWebGPU = Boolean(navigator.gpu);
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      prefersReducedMotion = Boolean(window.matchMedia('(prefers-reduced-motion: reduce)')?.matches);
    }
  } catch {}

  const deviceMemoryGB =
    typeof desktopHardware?.totalMemGB === 'number' && Number.isFinite(desktopHardware.totalMemGB)
      ? desktopHardware.totalMemGB
      : navMem;

  const cpuCores =
    typeof desktopHardware?.cpuCount === 'number' && Number.isFinite(desktopHardware.cpuCount)
      ? desktopHardware.cpuCount
      : navCores;

  const isChromeOS = Boolean(desktopHardware?.isChromeOS || /\bCrOS\b/i.test(ua));
  const isLowRam = deviceMemoryGB != null && deviceMemoryGB <= 4;
  const isLowCpu = cpuCores != null && cpuCores <= 4;

  const isLowEndHardware = Boolean(
    desktopHardware?.isLowPowerDevice ||
      isChromeOS ||
      isLowRam ||
      isLowCpu ||
      prefersReducedMotion
  );

  const reasons = [];
  if (isChromeOS) reasons.push('Chrome OS / Chromebook');
  if (deviceMemoryGB != null) reasons.push(`${deviceMemoryGB} GB RAM`);
  if (cpuCores != null) reasons.push(`${cpuCores} CPU threads`);
  if (prefersReducedMotion) reasons.push('OS reduced motion');

  return {
    deviceMemoryGB,
    cpuCores,
    isChromeOS,
    prefersReducedMotion,
    hasWebGPU,
    isLowEndHardware,
    summaryLabel:
      reasons.length > 0
        ? `${reasons.join(' · ')}${isLowEndHardware ? ' (Low-power recommended)' : ''}`
        : isLowEndHardware
          ? 'Low-power hardware detected'
          : 'Standard hardware'
  };
}

export function loadPerformanceModePref() {
  try {
    const saved = localStorage.getItem(PERFORMANCE_MODE_KEY);
    if (saved === 'low' || saved === 'standard' || saved === 'auto') {
      return saved;
    }
  } catch {}
  return 'auto';
}

export function savePerformanceModePref(mode) {
  const valid = mode === 'low' || mode === 'standard' ? mode : 'auto';
  try {
    localStorage.setItem(PERFORMANCE_MODE_KEY, valid);
  } catch {}
  return valid;
}

export function resolveLowPowerState(mode = 'auto', desktopHardware = null) {
  const capabilities = detectDeviceCapabilities(desktopHardware);
  const isLowPower =
    mode === 'low' ? true : mode === 'standard' ? false : capabilities.isLowEndHardware;
  return { isLowPower, capabilities };
}

export function applyLowPowerMode(isLowPower) {
  try {
    if (typeof document === 'undefined' || !document.documentElement) return;
    const root = document.documentElement;
    if (isLowPower) {
      root.classList.add('low-power');
      root.dataset.performance = 'low';
    } else {
      root.classList.remove('low-power');
      root.dataset.performance = 'standard';
    }
  } catch {}
}
