// Lightweight tracking pixel (<5KB)
(function() {
  const script = document.currentScript as HTMLScriptElement;
  const pixelId = script?.getAttribute('data-pixel-id');

  if (!pixelId) {
    console.error('Pixel ID not found');
    return;
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

  function getUTMParams(): Record<string, string> {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};

    ['source', 'medium', 'campaign', 'term', 'content'].forEach(key => {
      const value = params.get(`utm_${key}`);
      if (value) utm[`utm_${key}`] = value;
    });

    return utm;
  }

  function trackEvent(eventType: string = 'page_view'): void {
    const sessionId = getSessionId();
    const utmParams = getUTMParams();

    const event = {
      pixel_id: pixelId,
      session_id: sessionId,
      event_type: eventType,
      page_url: window.location.href,
      referrer: document.referrer || undefined,
      timestamp: new Date().toISOString(),
      ...utmParams
    };

    // Send to backend
    fetch('http://localhost:3001/api/pixel/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }).catch(err => console.error('Pixel tracking failed:', err));
  }

  // Track initial page view
  trackEvent('page_view');

  // Expose global tracking function
  (window as any).__pixelTrack = trackEvent;
})();
