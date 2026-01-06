# Docker Setup Guide

## Current Status

✅ **Infrastructure Services** (Running):
- PostgreSQL (port 5432)
- Redis (port 6379)
- MinIO (ports 9000-9001)

✅ **Application Services** (Built):
- Backend API (port 3800) - ✅ Built successfully
- Worker Jobs - ✅ Built successfully

⚠️ **Application Services** (In Progress):
- Web App (port 3000) - Build in progress (webpack/TypeScript issues)

## Quick Start

### Option 1: Full Docker Stack (Recommended for Production)

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Option 2: Hybrid Approach (Recommended for Development)

Run infrastructure in Docker, apps locally:

```bash
# Start only infrastructure services
docker-compose up -d postgres redis minio

# Run apps locally (in separate terminals)
pnpm --filter backend-api dev
pnpm --filter web-app dev
pnpm --filter worker-jobs dev
```

## Environment Variables

Create `.env` files in each app directory or use environment variables:

### Backend API (.env)
```env
DATABASE_URL=postgresql://ai_muhasebi:ai_muhasebi_dev@localhost:5432/ai_muhasebi
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-minimum-32-characters
PORT=3800
FRONTEND_URL=http://localhost:3000
```

### Web App (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3800
```

### Worker Jobs (.env)
```env
DATABASE_URL=postgresql://ai_muhasebi:ai_muhasebi_dev@localhost:5432/ai_muhasebi
REDIS_URL=redis://localhost:6379
```

## Services

### Backend API
- **Port**: 3800
- **Health Check**: http://localhost:3800/healthz
- **API Docs**: http://localhost:3800/api-docs

### Web App
- **Port**: 3000
- **URL**: http://localhost:3000

### Worker Jobs
- Runs background jobs (document processing, scheduled reports, etc.)

### PostgreSQL
- **Port**: 5432
- **Database**: ai_muhasebi
- **User**: ai_muhasebi
- **Password**: ai_muhasebi_dev

### Redis
- **Port**: 6379

### MinIO
- **API**: http://localhost:9000
- **Console**: http://localhost:9001
- **Credentials**: minioadmin / minioadmin

## Troubleshooting

### Build Issues

If Docker builds fail:
1. Use hybrid approach (infrastructure in Docker, apps locally)
2. Check TypeScript errors: `pnpm --filter <app> type-check`
3. Check logs: `docker-compose logs <service>`

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check database connection
docker-compose exec postgres psql -U ai_muhasebi -d ai_muhasebi

# Run migrations
pnpm --filter backend-api db:migrate
```

### Port Conflicts

If ports are already in use:
1. Stop conflicting services
2. Or modify ports in `docker-compose.yml`

## Production Deployment

For production:
1. Update environment variables in `docker-compose.yml`
2. Use secrets management (not hardcoded values)
3. Enable SSL/TLS
4. Set up proper monitoring and logging
5. Configure backup strategies

