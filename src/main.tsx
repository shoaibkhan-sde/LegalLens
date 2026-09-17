import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global guard to completely block native browser ghost images, drag previews, touch callouts, and selection shadows
if (typeof window !== 'undefined') {
  const preventImageGhosting = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'IMG' ||
        target.tagName === 'SVG' ||
        target.closest('img') ||
        target.getAttribute('draggable') === 'false')
    ) {
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  ['dragstart', 'contextmenu', 'selectstart', 'touchstart', 'touchmove', 'dblclick'].forEach((evt) => {
    window.addEventListener(evt, preventImageGhosting, { capture: true, passive: false });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
