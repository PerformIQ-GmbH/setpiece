const KEY = 'sp_signup_attribution';

// First visit in this tab keeps its origin until registration; no cookie, no third party.
export function captureSignupAttribution(): void {
  try {
    if (sessionStorage.getItem(KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const referrer = document.referrer ? new URL(document.referrer).hostname : '';
    const value = {
      signupUtmSource: params.get('utm_source')?.slice(0, 100) || undefined,
      signupUtmMedium: params.get('utm_medium')?.slice(0, 100) || undefined,
      signupUtmCampaign: params.get('utm_campaign')?.slice(0, 100) || undefined,
      signupReferrerHost: referrer && referrer !== window.location.hostname ? referrer : undefined,
    };
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage or an unusual referrer must never block the app; the origin is then unknown.
  }
}

export function signupAttribution(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}
