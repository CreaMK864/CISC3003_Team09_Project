# CISC3003 Team09 Project - Chatbot Application

## Docker Setup Instructions

This project uses Docker and Docker Compose to simplify development and deployment.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Environment Variables

Before running the application, you need to set up your environment variables:

1. Copy the example environment file:
   ```
   cp .env.example .env
   ```

2. Edit the `.env` file and fill in your actual values:
   - `DATABASE_URL`: PostgreSQL connection string (Should be found from your Supabase project)
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_JWT_SECRET`: Your Supabase JWT secret key
   - `OPENAI_API_KEY`: Your OpenAI API key (if using OpenAI)

### Running the Application

To start all services (backend, frontend, and database):

```bash
docker compose up
```

To run in detached mode (background):

```bash
docker compose up -d
```

To build or rebuild the images:

```bash
docker compose build
```

To stop all services:

```bash
docker compose down
```

### Accessing the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/docs
- Database: http://localhost:5432 (use pgAdmin or any other client to connect)
- Supabase: http://localhost:8000 (if using Supabase)

### Production Deployment

For production, it's recommended to:

1. Modify the Dockerfiles to build optimized production assets
2. Remove development-only volumes in docker-compose.yml
3. Use proper secret management instead of environment variables
4. Set up proper database backups and security measures
