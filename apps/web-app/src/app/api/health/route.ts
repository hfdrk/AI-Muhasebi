import { NextResponse } from "next/server";

/**
 * Health check endpoint for Docker/container orchestration
 * Returns 200 if the Next.js server is running
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "web-app",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

