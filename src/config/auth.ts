export const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'https://auth.adasystems.app';
export const TOKEN_KEY = 'ada_access_token';

/**
 * Build the AdaAuth redirect URL.
 * Flow: App → AdaAuth login → AdaAuth redirects back to /auth/callback?token=JWT
 */
export function buildAuthRedirectUrl(returnPath: string = '/'): string {
  const callbackUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(returnPath)}`;
  return `${AUTH_URL}/?redirect=${encodeURIComponent(callbackUrl)}`;
}
