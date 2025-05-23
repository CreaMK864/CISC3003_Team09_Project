# Chatbot Website Project - TODO Checklist

## 1. Project Setup & Basic Backend Framework
- [x] **Repository & Structure**
  - [x] Create a new repository.
  - [x] Set up the folder structure with:
    - Root directory.
    - `main.py` file.
    - `requirements.txt` file.
    - `Dockerfile` for deployment.
- [x] **Basic FastAPI App**
  - [x] Initialize a FastAPI application in `main.py`.
  - [x] Add a simple `/health` endpoint returning JSON (e.g., `{"status": "ok"}`).
  - [x] Set up Uvicorn to run the app when executing `main.py`.

## 2. Database Integration & Data Modeling
- [x] **Update Dependencies**
  - [x] Add SQLModel and the necessary PostgreSQL driver (e.g., asyncpg or psycopg2) to `requirements.txt`.
- [x] **Database Connection Module**
  - [x] Create a `database.py` module.
  - [x] Configure database connection using SQLModel.
- [x] **Data Models**
  - [x] Define the `User` model with fields: id, email, display_name, profile_picture_url, password_hash, last_selected_model.
  - [x] Define the `Conversation` model with fields: id, user_id, title, timestamps, and selected model.
  - [x] Define the `Message` model with fields: conversation_id, sender (user/bot), content, timestamp.
- [x] **CRUD Endpoints/Functions**
  - [x] Implement basic CRUD operations to test model creation and retrieval.
  - [x] Integrate these endpoints or internal functions into the FastAPI app.

## 3. Supabase Authentication Integration
- [x] **Auth Dependencies**
  - [x] Ensure necessary libraries (like httpx) are added to the dependencies.
- [ ] **Auth Module**
  - [x] Create an `auth.py` module.
  - [x] Create a route to check the current session/token and return user profile information.
- [x] **Integration**
  - [x] Wire the authentication endpoints into your main FastAPI app.
  - [x] Ensure that user data integrates well with the defined User model.

## 4. Real-Time Chat with WebSockets
- [x] **WebSocket Endpoint**
  - [x] Create a WebSocket endpoint (e.g., `/ws/chat`) in your FastAPI app.
- [x] **Message Handling**
  - [x] Implement functionality to receive chat messages from clients.
  - [x] Send responses (or stream responses) back to the client.
- [x] **Database Integration**
  - [x] Store incoming chat messages in the database using the Message model.
- [x] **Error Handling**
  - [x] Add basic error handling and reconnection strategies in the WebSocket endpoint.

## 5. Frontend Basic Setup & HTML/CSS/JS Structure
- [x] **Static Files Setup**
  - [x] Create a `static` or `public` directory.
- [x] **Basic HTML Page**
  - [x] Build an `index.html` file that includes:
    - A chat area.
    - An input field for sending messages.
    - A sidebar for navigation (to be extended later).
- [x] **CSS Styling**
  - [x] Write minimal CSS to style the chat interface (mobile-first and responsive).
- [x] **JavaScript Integration**
  - [x] Write JS code to:
    - Connect to the WebSocket endpoint.
    - Send messages from the input field.
    - Display received messages in the chat area.
- [x] **Backend Serving**
  - [x] Configure FastAPI to serve static files.

## 6. Markdown Rendering & Enhanced UI
- [ ] **Markdown Parser Integration**
  - [ ] Include a markdown parser library (e.g., marked.js) in your HTML page.
- [ ] **Syntax Highlighting**
  - [ ] Integrate a syntax highlighting library (e.g., highlight.js) for code blocks.
- [ ] **Update JS Code**
  - [ ] Modify JS to parse incoming chat messages as markdown.
  - [ ] Render formatted messages including highlighted code blocks.
- [ ] **UI Testing**
  - [ ] Verify that the UI remains responsive on mobile and desktop devices.

## 7. Multi-Page Navigation (History, Profile, Subscription, Settings)
- [ ] **Additional Pages**
  - [ ] Create HTML pages for:
    - Conversation History (with infinite scrolling, inline renaming, deletion with confirmation).
    - User Profile (view and edit profile info).
    - Subscription Simulation (display subscription status and plan details).
    - Settings/Configuration (options for language preference, notifications, etc.).
- [ ] **Navigation Integration**
  - [ ] Update the sidebar or main navigation to enable switching between pages.
- [ ] **Backend Connections**
  - [ ] Ensure each page integrates with the corresponding backend endpoints (e.g., conversation data, user profile updates).

## 8. Error Handling, Logging & Security Enhancements
- [ ] **Error Handling**
  - [ ] Enhance HTTP endpoints with comprehensive error handling and proper HTTP status codes.
  - [ ] Improve WebSocket error handling and client notifications.
- [ ] **Logging**
  - [ ] Integrate Python's logging module to log important events and errors.
- [ ] **Security Measures**
  - [ ] Enforce HTTPS and secure session token management.
  - [ ] Secure passwords by using bcrypt (or similar) for hashing.
  - [ ] Implement basic CSRF protections where necessary.
- [ ] **Final Validation**
  - [ ] Review and test all endpoints for robust error handling and security compliance.

## 9. Dockerization & Deployment Setup
- [x] **Dockerfile**
  - [x] Update or create a `Dockerfile` that:
    - Copies the application code.
    - Installs all dependencies.
    - Exposes the required port.
    - Launches the FastAPI app with Uvicorn.
- [x] **docker-compose Setup**
  - [x] Create a `docker-compose.yml` file for:
    - The FastAPI application service.
    - A PostgreSQL service linked properly to the backend.
- [x] **Environment Variables**
  - [x] Parameterize database URLs, Supabase configuration, and other sensitive settings.
- [x] **Integration Testing**
  - [x] Ensure the full stack (backend, database, frontend) runs within containers.

## 10. CI/CD Pipeline with GitHub Actions Integration
- [x] **GitHub Actions Workflows**
  - [x] Create two workflow files:
    - `.github/workflows/ci.yml` for CI (test/build):
      - Checks out the repository.
      - Sets up a Python environment and installs dependencies.
      - Runs unit and integration tests.
      - Builds the Docker image(s).
    - `.github/workflows/cd.yml` for CD (deployment):
      - Checks out the repository.
      - Builds the Docker image(s) if needed.
      - SSHes into your VPS and runs a deployment script from the repo (e.g., `deploy/deploy.sh`).
      - The deployment script should handle pulling the latest code, rebuilding containers, and restarting services as needed.
  - [x] Use GitHub-hosted runners for both workflows.
- [x] **Deployment Script**
  - [x] Add a versioned deployment script (e.g., `deploy/deploy.sh`) to the repository.
- [x] **Validation**
  - [x] Verify that each push triggers the CI workflow and that tests pass successfully.
  - [x] Verify that a push to the deploy branch (or release/tag) triggers the CD workflow and deploys to the VPS.

---

# Additional Notes
- Regularly commit progress to your repository.
- Test each feature thoroughly before integrating the next set of tasks.
- Ensure seamless integration of frontend and backend functionalities.
- Update this checklist as the project evolves or new tasks are identified.

