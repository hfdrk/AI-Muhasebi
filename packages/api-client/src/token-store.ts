/**
 * In-memory token store
 *
 * Stores the access token in a module-level variable instead of localStorage
 * to prevent XSS attacks from stealing the token. The refresh token is stored
 * in an httpOnly cookie managed by the browser.
 */

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
