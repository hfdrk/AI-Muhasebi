import { NextRequest, NextResponse } from "next/server";

// Public routes that don't require authentication
const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Root path — handled by page.tsx redirector
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Check for refresh token cookie (httpOnly, always present when authenticated)
  const refreshToken = request.cookies.get("refreshToken")?.value;

  if (!refreshToken) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static assets, API proxy, and health checks
    "/((?!api|_next/static|_next/image|favicon.ico|healthz).*)",
  ],
};
