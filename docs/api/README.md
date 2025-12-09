# API Documentation

API documentation will be generated from OpenAPI/Swagger specifications.

## Endpoints

See [API Design](../architecture/api-design.md) for endpoint structure.

## Feature Documentation

### Global Search
- [Global Search Feature](../features/global-search.md) - Search across all entities
- Endpoint: `GET /api/v1/search/global?query=...`

### Saved Filters
- [Saved Filters Feature](../features/saved-filters.md) - Save and reuse filter configurations
- Endpoints:
  - `GET /api/v1/saved-filters?target=...`
  - `POST /api/v1/saved-filters`
  - `PUT /api/v1/saved-filters/:id`
  - `DELETE /api/v1/saved-filters/:id`

## Authentication

All endpoints require JWT authentication except:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`

## Rate Limiting

Rate limiting will be implemented per tenant and per endpoint.

## Versioning

API versioning via URL path: `/api/v1/...`

