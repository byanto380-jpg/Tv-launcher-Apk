import { useEffect, useState } from 'react';

export interface ModalTransitionState {
  shouldRender: boolean;
  isVisible: boolean;
}

/**
 * Keeps a modal mounted long enough for a smooth compositor-only fade-out
 * when closed, while entering with a crisp GPU fade-in on open.
 */
export function useModalTransition(isOpen: boolean, exitMs = 200): ModalTransitionState {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      let raf2 = 0;
      const raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      return () => {
        window.cancelAnimationFrame(raf1);
        if (raf2) window.cancelAnimationFrame(raf2);
      };
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => {
      setShouldRender(false);
    }, exitMs);
    return () => window.clearTimeout(timer);
  }, [isOpen, exitMs]);

  return { shouldRender, isVisible };
}
