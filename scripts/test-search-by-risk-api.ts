/**
 * Test Search By Risk API Endpoint
 * 
 * Simulates the exact API call the frontend makes
 */

import "dotenv/config";

async function testSearchByRiskAPI() {
  console.log("🧪 Testing /api/v1/documents/search-by-risk API endpoint...\n");

  // Get auth token (you'll need to login first to get this)
  const token = process.env.TEST_TOKEN || "";

  if (!token) {
    console.log("⚠️  No TEST_TOKEN provided. Testing without auth (will likely fail)...");
  }

  const url = "http://localhost:3800/api/v1/documents/search-by-risk?riskSeverity=high&page=1&pageSize=20";

  console.log(`📡 Calling: ${url}`);
  console.log("");

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log("");

    if (!response.ok) {
      const errorText = await response.text();
      console.log("❌ Error Response:");
      console.log(errorText);
      return;
    }

    const data = await response.json();
    
    console.log("✅ Response Structure:");
    console.log(JSON.stringify(data, null, 2));
    console.log("");

    if (data.data) {
      console.log(`📊 Data Summary:`);
      console.log(`   Documents in response: ${data.data.data?.length || 0}`);
      console.log(`   Total: ${data.data.total || 0}`);
      console.log(`   Page: ${data.data.page || 0}`);
      console.log(`   PageSize: ${data.data.pageSize || 0}`);
      console.log(`   TotalPages: ${data.data.totalPages || 0}`);
      
      if (data.data.data && data.data.data.length > 0) {
        console.log(`\n   Sample document:`);
        const doc = data.data.data[0];
        console.log(`     ID: ${doc.id}`);
        console.log(`     File: ${doc.originalFileName}`);
        console.log(`     Risk Severity: ${(doc as any).riskSeverity || 'N/A'}`);
        console.log(`     Risk Score: ${(doc as any).riskScore || 'N/A'}`);
      } else {
        console.log(`\n   ⚠️  No documents in response array!`);
      }
    } else {
      console.log("❌ Response doesn't have expected structure!");
      console.log("   Expected: { data: { data: [...], total, ... } }");
      console.log("   Got:", Object.keys(data));
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.message.includes("ECONNREFUSED")) {
      console.log("\n💡 Backend server might not be running!");
      console.log("   Start it with: pnpm --filter @repo/backend-api dev");
    }
  }
}

testSearchByRiskAPI()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
