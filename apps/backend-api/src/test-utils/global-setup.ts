// Import env setup FIRST - this must run before any other imports
import "./env-setup.js";

import { setupTestDatabase } from "./test-db.js";

export default async function globalSetup() {
  console.log("🔧 Setting up test database...");
  await setupTestDatabase();
  console.log("✅ Test database setup complete");
}

