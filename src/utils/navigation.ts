import React from 'react';

/**
 * Returns true if a click event is a plain left-click with no modifier keys held,
 * meaning it should be intercepted for Single Page App (SPA) client-side routing.
 * If middle-clicked, Ctrl/Cmd-clicked, Shift-clicked, Alt-clicked, or targeting a new window,
 * this returns false so the native browser behavior is preserved.
 */
export function shouldHandleSpaClick(
  e: React.MouseEvent<any>
): boolean {
  if (e.defaultPrevented) return false;
  // Button 0 indicates the primary / left button
  if (e.button !== 0) return false;
  // If user holds any modifier key (Command on Mac, Ctrl on Windows/Linux, Shift, Alt)
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;

  const target = (e.currentTarget as HTMLElement | null)?.getAttribute('target');
  if (target && target.toLowerCase() !== '_self') return false;

  return true;
}

/**
 * Intercepts a link click for client-side SPA routing if appropriate.
 */
export function handleSpaNavigation(
  e: React.MouseEvent<any>,
  href: string,
  onNavigate?: (path: string) => void
): void {
  if (shouldHandleSpaClick(e)) {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(href);
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
}
