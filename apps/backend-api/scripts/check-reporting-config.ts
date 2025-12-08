import "dotenv/config";
import { getConfig } from "@repo/config";

console.log("🔍 Checking Reporting Configuration...\n");

const config = getConfig();

console.log("REPORTING_ENABLED:", config.REPORTING_ENABLED);
console.log("PDF_EXPORT_ENABLED:", config.PDF_EXPORT_ENABLED);
console.log("EXCEL_EXPORT_ENABLED:", config.EXCEL_EXPORT_ENABLED);
console.log("SCHEDULED_REPORTS_ENABLED:", config.SCHEDULED_REPORTS_ENABLED);

if (config.REPORTING_ENABLED) {
  console.log("\n✅ Reporting is ENABLED");
} else {
  console.log("\n❌ Reporting is DISABLED");
  console.log("💡 Make sure REPORTING_ENABLED=true is in your .env file");
}


