import { useEffect } from 'react';

// Keep track of active modal scroll locks globally across nested modals
let activeLocks = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let originalBodyPaddingRight = '';

/**
 * Custom hook to cleanly restrict background scrolling when a modal or dialog is open.
 * Handles scrollbar compensation to prevent horizontal layout shift,
 * and restores previous styles when the modal closes.
 */
export function useLockBodyScroll(lock: boolean = true): void {
  useEffect(() => {
    if (!lock || typeof document === 'undefined') return;

    if (activeLocks === 0) {
      originalBodyOverflow = document.body.style.overflow;
      originalHtmlOverflow = document.documentElement.style.overflow;
      originalBodyPaddingRight = document.body.style.paddingRight;

      // Prevent layout shift when scrollbar disappears on desktop
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    }

    activeLocks++;

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);
      if (activeLocks === 0) {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.paddingRight = originalBodyPaddingRight;
        document.body.classList.remove('modal-open');
      }
    };
  }, [lock]);
}
