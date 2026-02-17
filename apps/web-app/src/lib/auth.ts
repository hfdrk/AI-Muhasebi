"use client";

import {
  getAccessToken as getToken,
  setAccessToken as storeToken,
  clearAccessToken,
} from "@repo/api-client";

export function setAccessToken(token: string): void {
  storeToken(token);
}

export function getAccessToken(): string | null {
  return getToken();
}

export function removeAccessToken(): void {
  clearAccessToken();
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}
