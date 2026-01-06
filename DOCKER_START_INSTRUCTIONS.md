# Docker Compose Start Instructions

## Port Configuration Updated

The web app port has been changed from **3000** to **3001** to avoid port conflicts.

## Updated Ports

- **Backend API**: `http://localhost:3800`
- **Web App**: `http://localhost:3001` (changed from 3000)
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **MinIO**: `localhost:9000` (API), `localhost:9001` (Console)

## Start the Full Stack

1. **Make sure Docker Desktop is running**

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Check service status:**
   ```bash
   docker-compose ps
   ```

4. **View logs:**
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f backend-api
   docker-compose logs -f worker-jobs
   docker-compose logs -f web-app
   ```

5. **Run database migrations (if needed):**
   ```bash
   docker-compose exec backend-api pnpm --filter backend-api db:migrate
   ```

## Access the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3800
- **API Health**: http://localhost:3800/healthz
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

## Verify Embedding/RAG Services

Once migrations are run, you can verify the embedding service is working:

1. Check if `document_embeddings` table exists:
   ```bash
   docker-compose exec postgres psql -U ai_muhasebi -d ai_muhasebi -c "\d document_embeddings"
   ```

2. Test embedding generation via API (requires authentication):
   ```bash
   POST http://localhost:3800/api/v1/ai/embeddings/generate
   ```

3. Test RAG search:
   ```bash
   POST http://localhost:3800/api/v1/ai/rag/search
   ```

## Troubleshooting

- **Port 3001 still in use**: Change to another port in `docker-compose.yml`
- **Database connection errors**: Wait for postgres to be healthy before starting other services
- **Migration errors**: Run migrations manually as shown above
- **Container won't start**: Check logs with `docker-compose logs <service-name>`

