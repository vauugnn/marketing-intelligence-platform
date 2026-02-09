// Lightweight tracking pixel (<5KB)
(function() {
  const script = document.currentScript as HTMLScriptElement;
  const pixelId = script?.getAttribute('data-pixel-id');
  const apiUrl = script?.getAttribute('data-api-url')
    || 'https://nlsb.onrender.com/api/pixel/track';

  if (!pixelId) {
    console.error('Pixel ID not found');
    return;
  }

  // --- Dedup guard ---
  function shouldTrack(eventType: string): boolean {
    if (eventType !== 'page_view') return true;
    const key = `_pxl_pv_${pixelId}`;
    const tracked = sessionStorage.getItem(key);
    if (tracked === window.location.href) return false;
    sessionStorage.setItem(key, window.location.href);
    return true;
  }

  // Generate or retrieve session ID
  function getSessionId(): string {
    const cookieName = `_pxl_sid_${pixelId}`;
    let sessionId = getCookie(cookieName);

    if (!sessionId) {
      sessionId = generateId();
      setCookie(cookieName, sessionId, 30); // 30 day expiry
    }

    return sessionId;
  }

  function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function setCookie(name: string, value: string, days: number): void {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
  }

  function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getPageMetadata(): Record<string, string> {
    const meta: Record<string, string> = {};

    meta.page_title = document.title || '';

    const desc = document.querySelector('meta[name="description"]');
    if (desc) meta.page_description = desc.getAttribute('content') || '';

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) meta.canonical_url = canonical.getAttribute('href') || '';

    const ogType = document.querySelector('meta[property="og:type"]');
    if (ogType) meta.og_type = ogType.getAttribute('content') || '';

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) meta.og_title = ogTitle.getAttribute('content') || '';

    return meta;
  }

  // --- Script tag data-* attributes ---
  function getScriptData(): Record<string, string> {
    const attrs: Record<string, string> = {};
    if (!script) return attrs;
    const map: Record<string, string> = {
      'data-visitor-id': 'visitor_id',
      'data-email': 'email',
      'data-name': 'name',
      'data-value': 'value',
      'data-currency': 'currency',
    };
    for (const [attr, key] of Object.entries(map)) {
      const val = script.getAttribute(attr);
      if (val) attrs[key] = val;
    }
    return attrs;
  }

  // --- dataLayer integration (GTM pattern) ---
  function getDataLayerData(): Record<string, any> {
    const dl = (window as any).dataLayer;
    if (!Array.isArray(dl)) return {};
    const result: Record<string, any> = {};
    const fields = ['visitor_id', 'email', 'name', 'value', 'currency'];
    for (let i = dl.length - 1; i >= 0; i--) {
      const entry = dl[i];
      if (typeof entry !== 'object' || entry === null) continue;
      for (const f of fields) {
        if (!(f in result) && entry[f] != null) result[f] = entry[f];
      }
    }
    return result;
  }

  function getUTMParams(): Record<string, string> {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};

    ['source', 'medium', 'campaign', 'term', 'content'].forEach(key => {
      const value = params.get(`utm_${key}`);
      if (value) utm[`utm_${key}`] = value;
    });

    return utm;
  }

  function trackEvent(eventType: string = 'page_view', data?: Record<string, any>): void {
    if (!shouldTrack(eventType)) return;

    const sessionId = getSessionId();
    const utmParams = getUTMParams();
    const pageMetadata = getPageMetadata();
    const scriptData = getScriptData();
    const dataLayerData = getDataLayerData();

    const event = {
      pixel_id: pixelId,
      session_id: sessionId,
      event_type: eventType,
      page_url: window.location.href,
      referrer: document.referrer || undefined,
      timestamp: new Date().toISOString(),
      metadata: { ...pageMetadata, ...scriptData, ...dataLayerData, ...data },
      ...utmParams
    };

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }).catch(err => console.error('Pixel tracking failed:', err));
  }

  // --- Form submit listener ---
  function setupFormListener(): void {
    document.addEventListener('submit', (e) => {
      const form = e.target as HTMLFormElement;
      if (!form || form.tagName !== 'FORM') return;
      const data: Record<string, any> = {};
      const fieldMap: Record<string, string> = {
        email: 'email',
        name: 'name',
        full_name: 'name',
        fullname: 'name',
        amount: 'value',
        total: 'value',
        value: 'value',
        price: 'value',
      };
      for (const [inputName, key] of Object.entries(fieldMap)) {
        const input = form.querySelector(`[name="${inputName}"]`) as HTMLInputElement;
        if (input?.value) data[key] = input.value;
      }
      if (Object.keys(data).length > 0) {
        trackEvent('form_submit', data);
      }
    }, true);
  }

  // Track initial page view
  trackEvent('page_view');

  // Expose global tracking function
  (window as any).__pixelTrack = trackEvent;

  // Auto-capture form submissions
  setupFormListener();
})();
