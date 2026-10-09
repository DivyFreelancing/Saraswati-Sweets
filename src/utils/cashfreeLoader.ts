let cashfreeLoadPromise: Promise<any> | null = null;

/**
 * Dynamically loads Cashfree SDK v3 on demand only when entering checkout
 * or initiating a payment transaction, preventing main-thread blocking on homepage.
 */
export function loadCashfreeScript(): Promise<any> {
  if (typeof (window as any).Cashfree !== 'undefined') {
    return Promise.resolve((window as any).Cashfree);
  }

  if (cashfreeLoadPromise) {
    return cashfreeLoadPromise;
  }

  cashfreeLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('cashfree-sdk-script') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).Cashfree));
      existing.addEventListener('error', () => reject(new Error('Cashfree SDK failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'cashfree-sdk-script';
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve((window as any).Cashfree);
    script.onerror = () => {
      cashfreeLoadPromise = null;
      reject(new Error('Cashfree SDK failed to load'));
    };
    document.head.appendChild(script);
  });

  return cashfreeLoadPromise;
}
