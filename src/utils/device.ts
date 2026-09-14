// Device Detection Utility (Feature-based capability check)

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  return hasTouch || isMobileUA;
}
