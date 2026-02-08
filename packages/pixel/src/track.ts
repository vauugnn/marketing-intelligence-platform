// Lightweight tracking pixel (<5KB)
(function () {
  const script = document.currentScript as HTMLScriptElement;
  const pixelId = script?.getAttribute('data-pixel-id');
  const apiUrl = script?.getAttribute('data-api-url')
    || (script?.src ? new URL(script.src).origin.replace(/:\d+$/, ':3001') + '/api/pixel/track' : null)
    || 'http://localhost:3001/api/pixel/track';

  // Global state for visitor data
  let visitorData: Record<string, any> = {};

  // Initialize global pixel object if not exists
  const win = window as any;
  win.pixel = win.pixel || function () {
    (win.pixel.q = win.pixel.q || []).push(arguments);
  };
  win.pixel.l = +new Date();

  // Process command queue
  const queue = win.pixel.q || [];

  // Override push to process immediately
  win.pixel = function (...args: any[]) {
    processCommand(args);
  };

  // Process existing queue
  queue.forEach((args: any[]) => processCommand(args));

  function processCommand(args: any[]) {
    const [command, ...params] = args;

    if (command === 'init') {
      // Handle init if we ever needed it, for now pixelId comes from script tag usually
      // But we could allow pixel('init', 'pix_123')
    } else if (command === 'identify') {
      const [data] = params;
      if (data && typeof data === 'object') {
        visitorData = { ...visitorData, ...data };
      }
    } else if (command === 'track') {
      const [eventType, data] = params;
      if (eventType) {
        trackEvent(eventType, data);
      }
    }
  }

  if (!pixelId) {
    console.warn('Pixel ID not found in script tag. Waiting for init command or manual tracking.');
  }

  // Generate or retrieve session ID
  function getSessionId(): string {
    if (!pixelId) return generateId(); // Fallback if no pixel ID yet

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

  function getUTMParams(): Record<string, string> {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};

    ['source', 'medium', 'campaign', 'term', 'content'].forEach(key => {
      const value = params.get(`utm_${key}`);
      if (value) utm[`utm_${key}`] = value;
    });

    return utm;
  }

  function trackEvent(eventType: string = 'page_view', data: Record<string, any> = {}): void {
    if (!pixelId) {
      console.warn('Cannot track event: Pixel ID not initialized');
      return;
    }

    const sessionId = getSessionId();
    const utmParams = getUTMParams();

    // Separate visitor data from other metadata if passed in track
    const {
      visitor_id, visitor_email, visitor_name, value, currency,
      ...customMetadata
    } = data;

    const event = {
      pixel_id: pixelId,
      session_id: sessionId,
      event_type: eventType,
      page_url: window.location.href,
      referrer: document.referrer || undefined,
      timestamp: new Date().toISOString(),

      // Visitor identification (merged from global state and local call)
      visitor_id: visitor_id || visitorData.visitor_id || visitorData.id,
      visitor_email: visitor_email || visitorData.visitor_email || visitorData.email,
      visitor_name: visitor_name || visitorData.visitor_name || visitorData.name,

      // Conversion data
      value: value,
      currency: currency,

      metadata: {
        ...customMetadata,
        cookies: getAllCookies()
      },
      ...utmParams
    };

    // Send to backend
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }).catch(err => console.error('Pixel tracking failed:', err));
  }

  function getAllCookies(): Record<string, string> {
    const cookies: Record<string, string> = {};
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name) cookies[name] = value;
    });
    return cookies;
  }

  // Track clicks
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');

    if (anchor) {
      trackEvent('click', {
        element_id: anchor.id,
        element_class: anchor.className,
        element_text: anchor.innerText,
        target_url: anchor.href
      });
    }
  });

  // Track initial page view (only if pixel ID is present in script tag, implying auto-setup)
  if (pixelId) {
    // Check for visitor info in URL params (e.g. from short link redirect)
    const params = new URLSearchParams(window.location.search);
    const visitorInfo: Record<string, any> = {};

    ['visitor_id', 'visitor_email', 'visitor_name'].forEach(key => {
      const value = params.get(key);
      if (value) visitorInfo[key] = value;
    });

    // Merge found visitor info
    if (Object.keys(visitorInfo).length > 0) {
      visitorData = { ...visitorData, ...visitorInfo };
    }

    trackEvent('page_view');
  }

  // Expose global tracking function directly as well (legacy support)
  (window as any).__pixelTrack = trackEvent;
})();
