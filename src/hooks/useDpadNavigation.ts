import { useEffect, useRef } from 'react';
import { DPAD_REPEAT_INTERVAL_MS, playNavTick } from '../services/launcherApis';
import type { DpadSpeed } from '../types/launcher';

interface UseDpadOptions {
  scopeSelector: string;
  enabled: boolean;
  soundEnabled: boolean;
  dpadSpeed?: DpadSpeed;
  onBack?: () => void;
  onMenu?: () => void;
  onMenuHold?: () => void;
}

type Direction = 'up' | 'down' | 'left' | 'right';

function getFocusableElements(scopeSelector: string): HTMLElement[] {
  const root = document.querySelector(scopeSelector) || document;
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>(
      '[data-focusable="true"]:not([disabled]):not([aria-disabled="true"])'
    )
  );
  return nodes.filter((el) => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function findBestCandidate(
  current: HTMLElement,
  candidates: HTMLElement[],
  dir: Direction
): HTMLElement | null {
  const currRect = current.getBoundingClientRect();
  const cx = currRect.left + currRect.width / 2;
  const cy = currRect.top + currRect.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const el of candidates) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const tx = r.left + r.width / 2;
    const ty = r.top + r.height / 2;
    const dx = tx - cx;
    const dy = ty - cy;

    let isValid = false;
    let primaryDist = 0;
    let crossDist = 0;

    if (dir === 'right') {
      isValid = dx > 4;
      primaryDist = dx;
      crossDist = Math.abs(dy);
    } else if (dir === 'left') {
      isValid = dx < -4;
      primaryDist = -dx;
      crossDist = Math.abs(dy);
    } else if (dir === 'down') {
      isValid = dy > 4;
      primaryDist = dy;
      crossDist = Math.abs(dx);
    } else if (dir === 'up') {
      isValid = dy < -4;
      primaryDist = -dy;
      crossDist = Math.abs(dx);
    }

    if (!isValid) continue;

    // Weight cross-axis distance heavier when navigating horizontally/vertically
    // so D-pad stays in natural rows/columns unless no direct neighbor exists
    const sameRowAttr =
      current.dataset.dpadRow && el.dataset.dpadRow && current.dataset.dpadRow === el.dataset.dpadRow;
    const rowBonus = (dir === 'left' || dir === 'right') && sameRowAttr ? 0.55 : 1;
    const score = (primaryDist + crossDist * 2.4) * rowBonus;

    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  return best;
}

export function useDpadNavigation({
  scopeSelector,
  enabled,
  soundEnabled,
  dpadSpeed = 'normal',
  onBack,
  onMenu,
  onMenuHold,
}: UseDpadOptions) {
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const lastMoveAtRef = useRef<number>(0);
  const menuHoldRef = useRef<{
    activeKey: string | null;
    timer: number | null;
    triggered: boolean;
  }>({ activeKey: null, timer: null, triggered: false });

  useEffect(() => {
    if (!enabled) return;

    const clearMenuHold = () => {
      if (menuHoldRef.current.timer !== null) {
        window.clearTimeout(menuHoldRef.current.timer);
        menuHoldRef.current.timer = null;
      }
      menuHoldRef.current.activeKey = null;
      menuHoldRef.current.triggered = false;
    };

    const focusInitial = () => {
      const candidates = getFocusableElements(scopeSelector);
      const active = document.activeElement as HTMLElement | null;
      if (active && candidates.includes(active)) return;
      const preferred =
        candidates.find((el) => el.dataset.dpadDefault === 'true') || candidates[0];
      preferred?.focus({ preventScroll: true });
    };

    const timer = window.setTimeout(focusInitial, 80);

    const isMenuKey = (e: KeyboardEvent, isTextField: boolean) =>
      e.key === 'F1' ||
      e.key === 'ContextMenu' ||
      (e.key.toLowerCase() === 'm' && !isTextField);

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName || '';
      const isTextField =
        (tag === 'INPUT' &&
          !['file', 'checkbox', 'radio', 'button', 'submit'].includes(
            (active as HTMLInputElement).type
          )) ||
        tag === 'TEXTAREA';

      if (e.key === 'Escape' || e.key === 'BrowserBack') {
        clearMenuHold();
        e.preventDefault();
        onBack?.();
        return;
      }

      if (e.key === 'Backspace' && !isTextField) {
        clearMenuHold();
        e.preventDefault();
        onBack?.();
        return;
      }

      if (isMenuKey(e, isTextField) && (onMenu || onMenuHold)) {
        e.preventDefault();
        if (!onMenuHold) {
          onMenu?.();
          return;
        }
        const normalizedKey = e.key.toLowerCase();
        if (e.repeat || menuHoldRef.current.activeKey === normalizedKey) {
          return;
        }
        clearMenuHold();
        menuHoldRef.current.activeKey = normalizedKey;
        menuHoldRef.current.triggered = false;
        menuHoldRef.current.timer = window.setTimeout(() => {
          menuHoldRef.current.timer = null;
          menuHoldRef.current.triggered = true;
          if (soundEnabled) playNavTick();
          onMenuHold();
        }, 550);
        return;
      }

      let dir: Direction | null = null;
      if (e.key === 'ArrowUp') dir = 'up';
      else if (e.key === 'ArrowDown') dir = 'down';
      else if (e.key === 'ArrowLeft') dir = 'left';
      else if (e.key === 'ArrowRight') dir = 'right';

      if (!dir) return;

      // Inside <select>, let Up/Down navigate options unless user is navigating out horizontally
      if (tag === 'SELECT' && (dir === 'up' || dir === 'down')) {
        return;
      }

      // Inside text input/textarea, allow Left/Right cursor movement if text exists
      if (isTextField && (dir === 'left' || dir === 'right')) {
        const input = active as HTMLInputElement | HTMLTextAreaElement;
        const pos = input.selectionStart ?? 0;
        const len = input.value.length;
        if (dir === 'left' && pos > 0) return;
        if (dir === 'right' && pos < len) return;
      }

      if (tag === 'TEXTAREA' && (dir === 'up' || dir === 'down')) {
        return;
      }

      const candidates = getFocusableElements(scopeSelector);
      if (candidates.length === 0) return;

      e.preventDefault();

      const now = performance.now();
      const repeatInterval = DPAD_REPEAT_INTERVAL_MS[dpadSpeed] ?? 140;
      if (e.repeat && now - lastMoveAtRef.current < repeatInterval) {
        return;
      }

      const scrollBehavior: ScrollBehavior = dpadSpeed === 'fast' ? 'auto' : 'smooth';

      if (!active || !candidates.includes(active)) {
        lastMoveAtRef.current = now;
        candidates[0]?.focus();
        candidates[0]?.scrollIntoView({
          behavior: scrollBehavior,
          block: 'nearest',
          inline: 'center',
        });
        return;
      }

      const next = findBestCandidate(active, candidates, dir);
      if (next) {
        lastMoveAtRef.current = now;
        lastFocusRef.current = next;
        next.focus({ preventScroll: true });
        next.scrollIntoView({
          behavior: scrollBehavior,
          block: 'nearest',
          inline: 'center',
        });
        if (soundEnabled) playNavTick();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const normalizedKey = e.key.toLowerCase();
      if (menuHoldRef.current.activeKey !== normalizedKey) return;
      const wasTriggered = menuHoldRef.current.triggered;
      clearMenuHold();
      if (!wasTriggered) {
        onMenu?.();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (menuHoldRef.current.activeKey === 'contextmenu') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', clearMenuHold);
    return () => {
      window.clearTimeout(timer);
      clearMenuHold();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', clearMenuHold);
    };
  }, [scopeSelector, enabled, soundEnabled, dpadSpeed, onBack, onMenu, onMenuHold]);
}
