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

  // --- Cookie helpers ---
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

  // --- Consent management ---
  const consentCookieName = `_pxl_consent_${pixelId}`;
  const sessionCookieName = `_pxl_sid_${pixelId}`;

  function getConsent(): string | null {
    return getCookie(consentCookieName);
  }

  function setConsent(value: 'accepted' | 'declined'): void {
    setCookie(consentCookieName, value, 365);
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

  // Generate or retrieve session ID (only with consent)
  function getSessionId(useCookie: boolean): string {
    if (!useCookie) return generateId();
    let sessionId = getCookie(sessionCookieName);
    if (!sessionId) {
      sessionId = generateId();
      setCookie(sessionCookieName, sessionId, 30);
    }
    return sessionId;
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

  // --- Core tracking (consent-aware) ---
  let consentMode: 'accepted' | 'declined' = 'accepted';

  function trackEvent(eventType: string = 'page_view', data?: Record<string, any>): void {
    if (!shouldTrack(eventType)) return;

    // In declined mode, only allow form_submit and checkout events
    if (consentMode === 'declined' && eventType === 'page_view') return;

    const useCookie = consentMode === 'accepted';
    const sessionId = getSessionId(useCookie);
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
      consent_status: consentMode,
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

  // --- Full tracking initialization (after consent accepted) ---
  function initFullTracking(): void {
    consentMode = 'accepted';
    trackEvent('page_view');
    setupFormListener();
  }

  // --- Cookieless mode (after consent declined) ---
  function initCookielessTracking(): void {
    consentMode = 'declined';
    // Only capture form submissions — no page_view, no session cookie
    setupFormListener();
  }

  // --- Consent banner ---
  function showConsentBanner(): void {
    const banner = document.createElement('div');
    banner.id = '_pxl_consent_banner';
    banner.innerHTML =
      '<div style="position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#1a1a2e;color:#e0e0e0;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;font-family:-apple-system,system-ui,sans-serif;font-size:14px;box-shadow:0 -2px 10px rgba(0,0,0,.3)">' +
        '<span style="flex:1;min-width:200px">This site uses cookies to analyze traffic and improve your experience.</span>' +
        '<div style="display:flex;gap:8px">' +
          '<button id="_pxl_decline" style="padding:8px 18px;border:1px solid #555;border-radius:6px;background:transparent;color:#e0e0e0;cursor:pointer;font-size:13px">Decline</button>' +
          '<button id="_pxl_accept" style="padding:8px 18px;border:none;border-radius:6px;background:#6c63ff;color:#fff;cursor:pointer;font-size:13px;font-weight:600">Accept</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);

    document.getElementById('_pxl_accept')!.addEventListener('click', () => {
      setConsent('accepted');
      banner.remove();
      initFullTracking();
    });

    document.getElementById('_pxl_decline')!.addEventListener('click', () => {
      setConsent('declined');
      banner.remove();
      initCookielessTracking();
    });
  }

  // --- Entry point: check consent state ---
  const existingConsent = getConsent();

  if (existingConsent === 'accepted') {
    // Previously accepted — full tracking, no banner
    initFullTracking();
  } else if (existingConsent === 'declined') {
    // Previously declined — cookieless mode, no banner
    initCookielessTracking();
  } else {
    // No consent yet — show banner, do NOT track anything until user chooses
    // Expose global function early so custom events queue up after consent
    (window as any).__pixelTrack = trackEvent;
    if (document.body) {
      showConsentBanner();
    } else {
      document.addEventListener('DOMContentLoaded', showConsentBanner);
    }
    return; // Exit early — tracking starts only after consent choice
  }

  // Expose global tracking function
  (window as any).__pixelTrack = trackEvent;
})();
