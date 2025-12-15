/**
 * Check Backend API
 * 
 * Verifies the backend API is running and responding correctly
 */

import "dotenv/config";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3800";

async function checkBackendAPI() {
  console.log("🔍 Checking Backend API...\n");
  console.log(`API URL: ${API_URL}\n`);

  try {
    // Test 1: Health check
    console.log("1️⃣ Testing health endpoint...");
    const healthResponse = await fetch(`${API_URL}/health`);
    if (healthResponse.ok) {
      console.log("   ✅ Backend is running\n");
    } else {
      console.log(`   ❌ Backend returned ${healthResponse.status}\n`);
      return;
    }

    // Test 2: Check if search-by-risk route exists
    console.log("2️⃣ Testing search-by-risk route (without auth - should get 401)...");
    const searchResponse = await fetch(`${API_URL}/api/v1/documents/search-by-risk?riskSeverity=high`);
    console.log(`   Status: ${searchResponse.status}`);
    
    if (searchResponse.status === 401) {
      console.log("   ✅ Route exists (401 = authentication required, which is expected)\n");
    } else if (searchResponse.status === 404) {
      console.log("   ❌ Route NOT FOUND (404) - Backend needs to be restarted!\n");
      console.log("   💡 Solution: Restart your backend server:");
      console.log("      pnpm --filter @repo/backend-api dev\n");
    } else {
      console.log(`   ⚠️  Unexpected status: ${searchResponse.status}\n`);
    }

    // Test 3: Check documents route
    console.log("3️⃣ Testing documents list route (without auth)...");
    const docsResponse = await fetch(`${API_URL}/api/v1/documents`);
    console.log(`   Status: ${docsResponse.status}`);
    if (docsResponse.status === 401 || docsResponse.status === 200) {
      console.log("   ✅ Documents route exists\n");
    } else if (docsResponse.status === 404) {
      console.log("   ❌ Documents route NOT FOUND\n");
    }

    console.log("\n📝 Summary:");
    console.log("   - If you see 404 errors, restart your backend server");
    console.log("   - If you see 401 errors, the routes exist (auth required)");
    console.log("   - Make sure backend is running on port 3800 (or your configured port)");
    console.log("\n💡 To restart backend:");
    console.log("   pnpm --filter @repo/backend-api dev");

  } catch (error: any) {
    console.error("\n❌ Error connecting to backend:");
    console.error(`   ${error.message}\n`);
    console.log("💡 Make sure your backend server is running:");
    console.log("   pnpm --filter @repo/backend-api dev");
  }
}

checkBackendAPI();


