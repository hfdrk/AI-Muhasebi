# Demo Data for Reports and Integrations

This directory contains demo data examples for the Reports and Integrations features of AI Muhasebi.

## Files

### `integration-demo-data.json`
Contains demo data for integration-related entities:
- **TenantIntegration**: Integration configurations for various providers (Mikro, Logo, ETA, İş Bankası, Garanti BBVA)
- **IntegrationSyncJob**: Sync job records showing different statuses (success, failed, in_progress)
- **IntegrationSyncLog**: Detailed sync logs with info, warning, and error levels

### `report-demo-data.json`
Contains demo data for report-related entities:
- **ScheduledReport**: Scheduled report configurations with different schedules (daily, weekly, monthly)
- **ReportExecutionLog**: Execution logs showing successful and failed report runs
- **ReportDefinition**: Report type definitions

## Usage

These JSON files can be used for:
1. **Testing**: Import into test databases for integration and UI testing
2. **Documentation**: Reference examples for API responses and data structures
3. **Development**: Sample data for frontend development and mock API responses
4. **Seeding**: Can be adapted into seed scripts for populating demo environments

## Data Structure

### Integration Data
- **Tenant Integration**: Represents a connection between a tenant and an integration provider
- **Sync Job**: Represents a single synchronization operation (pull invoices, pull bank transactions)
- **Sync Log**: Detailed logs for sync operations with context data

### Report Data
- **Scheduled Report**: Automated report generation with cron schedules
- **Execution Log**: Records of report generation attempts (success/failed)
- **Report Definition**: Available report types and their descriptions

## Example Usage in Code

```typescript
// Import demo data
import integrationDemoData from './reports/integrations/integration-demo-data.json';
import reportDemoData from './reports/integrations/report-demo-data.json';

// Use in tests
const mockIntegration = integrationDemoData.tenantIntegrations[0];
const mockReport = reportDemoData.scheduledReports[0];
```

## Notes

- All dates are in ISO 8601 format (UTC)
- IDs are example values and should be replaced with actual database IDs when seeding
- Config values (API keys, secrets) are example values and should not be used in production
- Turkish language is used for display names and messages to match the application locale


