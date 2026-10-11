/**
 * Client-Side DevTools and Anti-Tamper Protection Layer
 * Protects against inspection, DOM tampering, unauthorized shortcuts, and console modification.
 */

export function initClientSecurity() {
  if (typeof window === 'undefined') return;

  // 1. Prevent Right-Click Context Menu (Inspect Element)
  window.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement;
    // Allow right click ONLY inside regular text inputs or textareas for copy/paste convenience
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, true);

  // 2. Block DevTools Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // F12 key
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Chrome, Firefox, Edge DevTools)
    // Cmd+Option+I, Cmd+Option+J, Cmd+Option+C (Mac Safari/Chrome)
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.shiftKey || e.altKey) &&
      (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')
    ) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U / Cmd+Option+U (View Page Source)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S / Cmd+S (Save Page)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // 3. Capture-Phase Anti-Tamper Guard on Disabled Buttons & Actions
  // If a user uses DevTools to remove `disabled` attribute from the DOM,
  // this capture listener still detects tampering and suppresses the action!
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement)?.closest('button, [role="button"]') as HTMLElement | null;
    if (btn) {
      const isMarkedDisabled = 
        btn.hasAttribute('disabled') || 
        btn.getAttribute('data-disabled') === 'true' || 
        btn.getAttribute('aria-disabled') === 'true' ||
        btn.classList.contains('cursor-not-allowed') ||
        btn.classList.contains('pointer-events-none');

      if (isMarkedDisabled) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }
  }, true);

  // 4. Security Notice in Console
  try {
    const warningTitle = 'color: #ef4444; font-size: 20px; font-weight: bold; -webkit-text-stroke: 1px black;';
    const warningBody = 'color: #f59e0b; font-size: 13px; font-weight: 600;';
    const warningDesc = 'color: #94a3b8; font-size: 11px;';

    console.log('%c⛔ STOP! FBSTORE SECURITY SHIELD', warningTitle);
    console.log(
      '%cDeveloper Tools inspection, DOM state manipulation, and balance/stock tampering are strictly prohibited and monitored.',
      warningBody
    );
    console.log(
      '%cAll accounts inventory, pricing, permissions, and wallet transactions are validated cryptographically on the server backend.',
      warningDesc
    );
  } catch (err) {}

  // 5. Protect Storage & State against DevTools tampering
  window.addEventListener('storage', (e) => {
    if (e.key === 'fbstore_cached_user' || e.key === 'fbstore_box_settings_v4' || e.key === 'fbstore_cached_marquee') {
      // Re-verify against server truth immediately
      const token = localStorage.getItem('fbstore_auth_token');
      if (token) {
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              localStorage.setItem('fbstore_cached_user', JSON.stringify(data.user));
            }
          })
          .catch(() => {});
      }
      // Re-fetch store info to overwrite any spoofed box settings
      fetch('/api/store/info')
        .then(res => res.json())
        .then(data => {
          if (data) {
            localStorage.setItem('fbstore_box_settings_v4', JSON.stringify({
              simpleAccountsEnabled: data.simpleAccountsEnabled !== false,
              verifiedAccountsEnabled: data.verifiedAccountsEnabled !== false,
              simpleOfferEnabled: Boolean(data.simpleOfferEnabled),
              simpleOfferMessage: data.simpleOfferMessage || '',
              simpleOfferColor: data.simpleOfferColor || '#f59e0b',
              verifiedOfferEnabled: Boolean(data.verifiedOfferEnabled),
              verifiedOfferMessage: data.verifiedOfferMessage || '',
              verifiedOfferColor: data.verifiedOfferColor || '#06b6d4',
              boxesDisplayOrder: data.boxesDisplayOrder || 'simple_first',
            }));
          }
        })
        .catch(() => {});
    }
  });
}
