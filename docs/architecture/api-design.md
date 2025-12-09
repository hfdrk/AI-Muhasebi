# API Design

## Principles

- RESTful API design
- Versioned endpoints (`/api/v1/...`)
- Consistent error responses
- Comprehensive request/response validation

## Endpoint Structure

### Authentication
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

### Users
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:id`
- `DELETE /api/v1/users/:id`

### Clients
- `GET /api/v1/clients`
- `GET /api/v1/clients/:id`
- `POST /api/v1/clients`
- `PATCH /api/v1/clients/:id`
- `DELETE /api/v1/clients/:id`

### Invoices
- `GET /api/v1/invoices`
- `GET /api/v1/invoices/:id`
- `POST /api/v1/invoices`
- `PATCH /api/v1/invoices/:id`
- `DELETE /api/v1/invoices/:id`
- `POST /api/v1/invoices/:id/export`

### Documents
- `GET /api/v1/documents`
- `GET /api/v1/documents/:id`
- `POST /api/v1/documents/upload`
- `DELETE /api/v1/documents/:id`
- `POST /api/v1/documents/:id/analyze`

### Risk
- `GET /api/v1/risk/scores`
- `GET /api/v1/risk/alerts`
- `PATCH /api/v1/risk/alerts/:id/acknowledge`

### Search
- `GET /api/v1/search/global?query=...` - Global search across all entities

### Saved Filters
- `GET /api/v1/saved-filters?target=...` - List saved filters
- `POST /api/v1/saved-filters` - Create saved filter
- `PUT /api/v1/saved-filters/:id` - Update saved filter
- `DELETE /api/v1/saved-filters/:id` - Delete saved filter

### Reports
- `GET /api/v1/reports`
- `GET /api/v1/reports/:id`
- `POST /api/v1/reports`
- `GET /api/v1/reports/:id/download`

## Response Format

```json
{
  "data": {},
  "meta": {
    "pagination": {}
  },
  "errors": []
}
```

## Error Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

## Authentication

All endpoints (except auth endpoints) require JWT token in `Authorization: Bearer <token>` header.

## Tenant Context

Tenant context automatically extracted from JWT token, no need to pass in request body.

