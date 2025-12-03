# API Documentation

API documentation will be generated from OpenAPI/Swagger specifications.

## Endpoints

See [API Design](../architecture/api-design.md) for endpoint structure.

## Authentication

All endpoints require JWT authentication except:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`

## Rate Limiting

Rate limiting will be implemented per tenant and per endpoint.

## Versioning

API versioning via URL path: `/api/v1/...`

