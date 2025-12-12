# Global Search Feature

## Overview

The global search feature provides a unified search interface that allows users to quickly find clients, invoices, documents, risk alerts, and reports across the entire system using a single search query.

## Features

- **Quick Access**: Keyboard shortcut `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac)
- **Multi-Entity Search**: Search across clients, invoices, documents, risk alerts, and reports simultaneously
- **RBAC-Protected**: Results are filtered based on user permissions
- **Tenant-Isolated**: Users only see results from their own tenant
- **Real-time Results**: Results update as you type (with 300ms debounce)

## User Interface

### Accessing Global Search

1. **Keyboard Shortcut**: Press `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac) from anywhere in the application
2. **Search Button**: Click the "🔍 Ara" button in the top navigation bar

### Search Interface

- **Search Input**: Type your query (minimum 2 characters)
- **Placeholder**: "Ara... (müşteri, fatura, belge)"
- **Results Display**: Grouped by entity type:
  - Müşteriler (Clients)
  - Faturalar (Invoices)
  - Belgeler (Documents)
  - Risk Uyarıları (Risk Alerts)
  - Raporlar (Reports)

### Navigation

- Click any result to navigate to its detail page
- Press `Escape` to close the search modal
- Click outside the modal to close

## API Endpoint

### GET /api/v1/search/global

Search across all entities in the system.

**Authentication**: Required (JWT token)

**Query Parameters**:
- `query` (string, required): Search query (minimum 2 characters)

**Response**:
```json
{
  "data": {
    "clients": [
      {
        "id": "string",
        "name": "string",
        "taxNumber": "string"
      }
    ],
    "invoices": [
      {
        "id": "string",
        "externalId": "string | null",
        "counterpartyName": "string | null",
        "clientCompanyId": "string"
      }
    ],
    "documents": [
      {
        "id": "string",
        "originalFileName": "string",
        "clientCompanyId": "string"
      }
    ],
    "riskAlerts": [
      {
        "id": "string",
        "title": "string",
        "severity": "string",
        "clientCompanyId": "string | null"
      }
    ],
    "reports": [
      {
        "id": "string",
        "reportCode": "string",
        "startedAt": "Date"
      }
    ]
  }
}
```

**Error Responses**:
- `400 Bad Request`: Query too short (< 2 characters)
  ```json
  {
    "error": {
      "message": "Arama sorgusu en az 2 karakter olmalıdır."
    }
  }
  ```
- `401 Unauthorized`: Missing or invalid authentication token

**Search Behavior**:
- **Clients**: Searches in `name` and `taxNumber` fields
- **Invoices**: Searches in `externalId` and `counterpartyName` fields
- **Documents**: Searches in `originalFileName` field
- **Risk Alerts**: Searches in `title` and `message` fields
- **Reports**: Searches in `reportCode` field

**Result Limits**:
- Maximum 5 results per entity type (configurable)

**RBAC Enforcement**:
- Results are filtered based on user permissions:
  - `clients:read` permission required for client results
  - `invoices:read` permission required for invoice results
  - `documents:read` permission required for document results
  - `risk:view` permission required for risk alert results
  - `reports:view` permission required for report results

## Implementation Details

### Backend Service

**File**: `apps/backend-api/src/services/global-search-service.ts`

The `GlobalSearchService` class provides the `search()` method which:
1. Validates query length (minimum 2 characters)
2. Performs parallel searches across all entity types
3. Applies tenant filtering
4. Applies RBAC permission checks
5. Limits results per group
6. Returns grouped results

### Frontend Component

**File**: `apps/web-app/src/components/global-search.tsx`

The `GlobalSearch` component:
- Manages search state and debouncing
- Handles keyboard shortcuts
- Displays grouped results
- Navigates to detail pages on click
- Shows empty states and loading indicators

## Usage Examples

### JavaScript/TypeScript

```typescript
import { globalSearch } from "@repo/api-client";

// Search for "test"
const results = await globalSearch("test");

console.log(results.data.clients);    // Array of matching clients
console.log(results.data.invoices);   // Array of matching invoices
console.log(results.data.documents);  // Array of matching documents
console.log(results.data.riskAlerts); // Array of matching risk alerts
console.log(results.data.reports);    // Array of matching reports
```

### cURL

```bash
curl -X GET "http://localhost:3800/api/v1/search/global?query=test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Id: YOUR_TENANT_ID"
```

## Security Considerations

1. **Tenant Isolation**: All queries automatically filter by `tenantId` from the authenticated user's context
2. **RBAC**: Results are only returned for entities the user has permission to view
3. **Query Validation**: Minimum query length prevents excessive database queries
4. **Rate Limiting**: Should be applied to prevent abuse (future enhancement)

## Performance

- Search queries use database indexes for fast lookups
- Results are limited per group to prevent large responses
- Debouncing (300ms) reduces unnecessary API calls
- Parallel queries improve response time

## Future Enhancements

- Full-text search with ranking
- Search history
- Recent searches
- Advanced filters
- Search suggestions/autocomplete




