// Device Detection Utility

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  return (hasTouch && isSmallScreen) || isMobileUA;
}
