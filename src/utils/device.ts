// Device Detection Utility (Multi-tiered detection for mobile & tablet devices)

export function isMobileOrTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. High-Entropy UserAgentData API (Modern Chromium/Edge/Chrome browsers)
  const nav = navigator as any;
  if (nav.userAgentData && typeof nav.userAgentData.mobile === 'boolean') {
    if (nav.userAgentData.mobile) return true;
  }

  // 2. User Agent String Inspection for Mobile & Tablet Signatures
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
  if (isMobileUA) return true;

  // 3. Pointer & Screen Size Fallback (Coarse Touch Pointer + Viewport <= 1024px)
  const isCoarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  const isSmallViewport = window.innerWidth <= 1024;

  return Boolean((isCoarsePointer || hasTouch) && isSmallViewport);
}

export function isMobileDevice(): boolean {
  return isMobileOrTabletDevice();
}


