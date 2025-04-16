# Chatbot API

This is the backend API for the Chatbot Website project.

## Setup

1. Create a Python 3.12 virtual environment:
```
python -m venv .venv
```

2. Activate the virtual environment:
```
# Windows
.venv\Scripts\activate

# Unix/macOS
source .venv/bin/activate
```

3. Install dependencies:
```
pip install -e .
```

4. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the variables with your actual values:
     - `DATABASE_URL`: PostgreSQL connection string
     - `SUPABASE_URL`: Your Supabase project URL
     - `SUPABASE_JWT_SECRET`: Your Supabase JWT secret

## Supabase Authentication

This project uses Supabase for authentication. The API expects JWT tokens in the `Authorization` header with the format `Bearer {token}`. The token should be obtained from Supabase client on the frontend.

### Protected Endpoints

All protected endpoints require authentication using a valid Supabase JWT token:

- `GET /profile`: Get the current user's profile
- `GET /conversations`: Get all conversations for the authenticated user
- `GET /conversations/{conversation_id}`: Get a specific conversation (must belong to authenticated user)
- `POST /conversations/`: Create a new conversation for the authenticated user

## Development

Run the development server with:
```
uvicorn chatbot_api.main:app --reload
```

The API will be available at `http://localhost:8000`. API documentation is available at `http://localhost:8000/docs`.
