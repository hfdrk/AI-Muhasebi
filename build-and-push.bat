@echo off
REM Production Deployment Script for AI Muhasebi
REM Deploy Docker images to gulfhoster registry and VPS

setlocal enabledelayedexpansion

echo.
echo ================================================================================
echo                    AI MUHASEBI - DEPLOYMENT EXECUTOR
echo ================================================================================
echo.

REM Step 1: Build Docker Images
echo Step 1: Building and pushing Docker images to gulfhoster...
echo.

docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker daemon is not running
    pause
    exit /b 1
)

echo [1/3] Building backend-api image...
docker build -f apps/backend-api/Dockerfile -t gulfhoster/ai-muhasebi-backend:latest -t gulfhoster/ai-muhasebi-backend:prod --progress=plain .
if errorlevel 1 (
    echo ERROR: Backend build failed
    pause
    exit /b 1
)
echo ✓ Backend built

echo.
echo [2/3] Building web-app image...
docker build -f apps/web-app/Dockerfile -t gulfhoster/ai-muhasebi-web:latest -t gulfhoster/ai-muhasebi-web:prod --progress=plain .
if errorlevel 1 (
    echo ERROR: Web app build failed
    pause
    exit /b 1
)
echo ✓ Web app built

echo.
echo [3/3] Building worker-jobs image...
docker build -f apps/worker-jobs/Dockerfile -t gulfhoster/ai-muhasebi-worker:latest -t gulfhoster/ai-muhasebi-worker:prod --progress=plain .
if errorlevel 1 (
    echo ERROR: Worker build failed
    pause
    exit /b 1
)
echo ✓ Worker built

echo.
echo ================================================================================
echo                         PUSHING TO DOCKER HUB
echo ================================================================================
echo.

echo Pushing backend image...
docker push gulfhoster/ai-muhasebi-backend:latest
docker push gulfhoster/ai-muhasebi-backend:prod

echo Pushing web app image...
docker push gulfhoster/ai-muhasebi-web:latest
docker push gulfhoster/ai-muhasebi-web:prod

echo Pushing worker image...
docker push gulfhoster/ai-muhasebi-worker:latest
docker push gulfhoster/ai-muhasebi-worker:prod

echo.
echo ================================================================================
echo                      BUILD & PUSH COMPLETE ✓
echo ================================================================================
echo.
echo Images ready on gulfhoster registry:
echo   • gulfhoster/ai-muhasebi-backend:latest
echo   • gulfhoster/ai-muhasebi-web:latest
echo   • gulfhoster/ai-muhasebi-worker:latest
echo.
echo Next: Deploy to VPS using deploy-to-vps.sh (on Linux/Mac)
echo        or configure .env.prod and run docker-compose on VPS
echo.

pause
