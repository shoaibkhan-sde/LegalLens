export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  const isMobileOrTabletViewport = window.innerWidth <= 1023;

  return Boolean(hasTouch && isMobileOrTabletViewport);
}

