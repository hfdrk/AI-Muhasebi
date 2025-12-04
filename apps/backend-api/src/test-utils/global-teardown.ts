import { teardownTestDatabase } from "./test-db.js";

export default async function globalTeardown() {
  console.log("🧹 Tearing down test database...");
  await teardownTestDatabase();
  console.log("✅ Test database teardown complete");
}

