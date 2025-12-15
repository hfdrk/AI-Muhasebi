# Saved Filters Feature

## Overview

The saved filters feature allows users to save and reuse filter configurations for list pages. Users can create named filters, set default filters that auto-apply, and manage their saved filters.

## Features

- **Save Current Filters**: Save any filter configuration with a custom name
- **Default Filters**: Set a filter as default to auto-apply when opening the page
- **Filter Management**: Update, delete, and set default status for saved filters
- **Per-User Filters**: Each user has their own set of saved filters
- **Per-Target Filters**: Filters are organized by target (CLIENT_COMPANIES, INVOICES, etc.)
- **Single Default**: Only one default filter allowed per (user, target) combination

## Supported Pages

Currently implemented for:
- **Client Companies List** (`/clients`)
- **Invoices List** (`/invoices`)

Future support planned for:
- Documents List
- Risk Alerts List
- Reports List

## User Interface

### Saved Filters Dropdown

Located above the filter controls on list pages.

**Features**:
- Dropdown showing all saved filters for the current page
- "Filtreyi Kaydet" button to save current filter
- "Varsayılan Yap" button to set a filter as default
- "Sil" button to delete a filter
- Visual indicator for default filter

### Save Filter Modal

Opens when clicking "Filtreyi Kaydet".

**Fields**:
- **Filtre Adı** (Filter Name): Required text input
- **Varsayılan filtre yap** (Set as Default): Checkbox

**Behavior**:
- If "Set as Default" is checked, any existing default filter for the same target is automatically unset
- Saved filter replaces current filter state when selected

### Default Filter Auto-Apply

When a page loads:
1. System checks for a default filter for the current user and target
2. If found, automatically applies the filter
3. Shows message: "Varsayılan filtre uygulanıyor: {name}"

## API Endpoints

### GET /api/v1/saved-filters

List all saved filters for the current user.

**Authentication**: Required (JWT token)

**Query Parameters**:
- `target` (string, optional): Filter by target type
  - `CLIENT_COMPANIES`
  - `INVOICES`
  - `DOCUMENTS`
  - `RISK_ALERTS`
  - `REPORTS`

**Response**:
```json
{
  "data": [
    {
      "id": "string",
      "tenantId": "string",
      "userId": "string",
      "name": "string",
      "target": "CLIENT_COMPANIES",
      "filters": {
        "search": "string",
        "isActive": true
      },
      "isDefault": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /api/v1/saved-filters

Create a new saved filter.

**Authentication**: Required (JWT token)

**Request Body**:
```json
{
  "name": "Aktif Müşteriler",
  "target": "CLIENT_COMPANIES",
  "filters": {
    "search": "",
    "isActive": true
  },
  "isDefault": false
}
```

**Response**: `201 Created`
```json
{
  "data": {
    "id": "string",
    "tenantId": "string",
    "userId": "string",
    "name": "Aktif Müşteriler",
    "target": "CLIENT_COMPANIES",
    "filters": {
      "search": "",
      "isActive": true
    },
    "isDefault": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Behavior**:
- If `isDefault: true`, automatically unsets any existing default filter for the same (tenant, user, target)
- `tenantId` and `userId` are automatically set from the authenticated user's context

### PUT /api/v1/saved-filters/:id

Update an existing saved filter.

**Authentication**: Required (JWT token)

**Request Body** (all fields optional):
```json
{
  "name": "Updated Filter Name",
  "filters": {
    "search": "new search",
    "isActive": false
  },
  "isDefault": true
}
```

**Response**: `200 OK`
```json
{
  "data": {
    "id": "string",
    "tenantId": "string",
    "userId": "string",
    "name": "Updated Filter Name",
    "target": "CLIENT_COMPANIES",
    "filters": {
      "search": "new search",
      "isActive": false
    },
    "isDefault": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:
- `404 Not Found`: Filter doesn't exist or user doesn't own it
- `403 Forbidden`: User trying to update another user's filter

**Behavior**:
- Only the filter owner can update it
- If setting `isDefault: true`, automatically unsets other defaults for the same (tenant, user, target)

### DELETE /api/v1/saved-filters/:id

Delete a saved filter.

**Authentication**: Required (JWT token)

**Response**: `200 OK`
```json
{
  "data": {
    "message": "Kayıtlı filtre silindi."
  }
}
```

**Error Responses**:
- `404 Not Found`: Filter doesn't exist or user doesn't own it
- `403 Forbidden`: User trying to delete another user's filter

## Database Schema

### saved_filters Table

```sql
CREATE TABLE "saved_filters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "target" VARCHAR(50) NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    
    CONSTRAINT "saved_filters_tenant_id_fkey" 
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "saved_filters_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "saved_filters_tenant_id_idx" ON "saved_filters"("tenant_id");
CREATE INDEX "saved_filters_user_id_idx" ON "saved_filters"("user_id");
CREATE INDEX "saved_filters_tenant_id_user_id_target_idx" 
    ON "saved_filters"("tenant_id", "user_id", "target");
```

**Fields**:
- `id`: Unique identifier (CUID)
- `tenant_id`: Foreign key to tenants table
- `user_id`: Foreign key to users table
- `name`: Display name for the filter
- `target`: Filter target type (CLIENT_COMPANIES, INVOICES, etc.)
- `filters`: JSON object containing the filter configuration
- `is_default`: Boolean indicating if this is the default filter
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

**Constraints**:
- Only one default filter per (tenant_id, user_id, target) combination (enforced in application logic)
- Cascade delete when tenant or user is deleted

## Filter Target Types

### CLIENT_COMPANIES

Filter structure:
```json
{
  "search": "string | undefined",
  "isActive": "boolean | undefined"
}
```

### INVOICES

Filter structure:
```json
{
  "clientCompanyId": "string | undefined",
  "issueDateFrom": "string (ISO date) | undefined",
  "issueDateTo": "string (ISO date) | undefined",
  "type": "SATIŞ | ALIŞ | undefined",
  "status": "taslak | kesildi | iptal | muhasebeleştirilmiş | undefined"
}
```

## Implementation Details

### Backend Service

**File**: `apps/backend-api/src/services/saved-filter-service.ts`

The `SavedFilterService` class provides:
- `listSavedFilters()`: List filters with optional target filter
- `createSavedFilter()`: Create new filter with default handling
- `updateSavedFilter()`: Update filter with ownership validation
- `deleteSavedFilter()`: Delete filter with ownership validation

**Default Filter Logic**:
- When creating/updating a filter with `isDefault: true`, the service automatically unsets all other default filters for the same (tenant, user, target)
- This ensures only one default exists at a time

### Frontend Components

**Files**:
- `apps/web-app/src/components/saved-filters-dropdown.tsx`: Dropdown UI
- `apps/web-app/src/components/save-filter-modal.tsx`: Save filter modal

**Integration**:
- `apps/web-app/src/app/(protected)/clients/page.tsx`: Clients page integration
- `apps/web-app/src/app/(protected)/invoices/page.tsx`: Invoices page integration

## Usage Examples

### JavaScript/TypeScript

```typescript
import { 
  listSavedFilters, 
  createSavedFilter, 
  updateSavedFilter, 
  deleteSavedFilter,
  SAVED_FILTER_TARGETS 
} from "@repo/api-client";

// List all saved filters for clients
const filters = await listSavedFilters(SAVED_FILTER_TARGETS.CLIENT_COMPANIES);

// Create a new saved filter
const newFilter = await createSavedFilter({
  name: "Aktif Müşteriler",
  target: SAVED_FILTER_TARGETS.CLIENT_COMPANIES,
  filters: {
    search: "",
    isActive: true
  },
  isDefault: true
});

// Update a filter
await updateSavedFilter(newFilter.data.id, {
  name: "Updated Name",
  isDefault: false
});

// Delete a filter
await deleteSavedFilter(newFilter.data.id);
```

### cURL Examples

**List saved filters**:
```bash
curl -X GET "http://localhost:3800/api/v1/saved-filters?target=CLIENT_COMPANIES" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Id: YOUR_TENANT_ID"
```

**Create saved filter**:
```bash
curl -X POST "http://localhost:3800/api/v1/saved-filters" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Id: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aktif Müşteriler",
    "target": "CLIENT_COMPANIES",
    "filters": {
      "search": "",
      "isActive": true
    },
    "isDefault": true
  }'
```

**Update saved filter**:
```bash
curl -X PUT "http://localhost:3800/api/v1/saved-filters/FILTER_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Id: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "isDefault": false
  }'
```

**Delete saved filter**:
```bash
curl -X DELETE "http://localhost:3800/api/v1/saved-filters/FILTER_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant-Id: YOUR_TENANT_ID"
```

## Security Considerations

1. **Tenant Isolation**: All filters are scoped to the user's tenant
2. **User Isolation**: Users can only access their own saved filters
3. **Ownership Validation**: Update and delete operations verify filter ownership
4. **RBAC**: All roles can manage their own filters (no special permissions required)

## Best Practices

1. **Naming**: Use descriptive names that indicate what the filter does
2. **Defaults**: Set default filters for commonly used configurations
3. **Cleanup**: Delete unused filters to keep the list manageable
4. **Organization**: Use consistent naming conventions across filters

## Future Enhancements

- Share filters with other users (with permissions)
- Filter templates for common use cases
- Import/export filters
- Filter categories/tags
- Filter usage analytics





