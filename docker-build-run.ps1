# Build and run AI Muhasebi full stack
Write-Host "Building and starting AI Muhasebi full stack..." -ForegroundColor Green

# Build all services
Write-Host "Building Docker images..." -ForegroundColor Yellow
docker-compose build

# Start infrastructure services first
Write-Host "Starting infrastructure services (postgres, redis, minio)..." -ForegroundColor Yellow
docker-compose up -d postgres redis minio

# Wait for infrastructure to be healthy
Write-Host "Waiting for infrastructure services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Start application services
Write-Host "Starting application services (backend-api, web-app, worker-jobs)..." -ForegroundColor Yellow
docker-compose up -d backend-api worker-jobs web-app

# Show status
Write-Host ""
Write-Host "Services status:" -ForegroundColor Green
docker-compose ps

Write-Host ""
Write-Host "Services are starting. Check logs with:" -ForegroundColor Cyan
Write-Host "  docker-compose logs -f [service-name]"
Write-Host ""
Write-Host "Access points:" -ForegroundColor Cyan
Write-Host "  Web App: http://localhost:3000"
Write-Host "  Backend API: http://localhost:3800"
Write-Host "  API Health: http://localhost:3800/healthz"
Write-Host "  MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
Write-Host ""
Write-Host "To stop all services:" -ForegroundColor Cyan
Write-Host "  docker-compose down"
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Cyan
Write-Host "  docker-compose logs -f"

