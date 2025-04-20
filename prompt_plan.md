Below is a comprehensive blueprint along with a series of iterative prompts that you can feed to a code-generation LLM. Each prompt builds on the previous work, ensuring incremental progress from project initialization through integration, wiring everything together as you advance. Every step is broken into small, actionable tasks that avoid big jumps in complexity.

---

### **Overall Blueprint**

1. **Project Setup & Basic Backend Framework**  
   • Set up the repository structure, Python virtual environment, and essential files (e.g., `main.py`, `requirements.txt`, and `Dockerfile`).  
   • Initialize a FastAPI project and create a simple health-check endpoint.

2. **Database Integration & Data Modeling**  
   • Integrate SQLModel with PostgreSQL, configure a database connection, and define the key data models (User, Conversation, Message).  
   • Build simple CRUD endpoints to test database connectivity and model operations.

3. **Supabase Authentication Setup**  
   • Implement authentication endpoints that connect with Supabase's API for Google and email-based sign-in.  
   • Wire up endpoints so that user sessions, authentication tokens, and profile info are handled correctly.

4. **Real-Time Chat Using WebSockets**  
   • Create a WebSocket endpoint using FastAPI to handle real-time chat messages.  
   • Implement basic error handling and connection recovery, and integrate the chat endpoint with conversation history storage.

5. **Frontend – Basic HTML/CSS/JS Structure**  
   • Establish a static folder with HTML, CSS, and JavaScript files.  
   • Create a simple chat interface page that calls the backend endpoints (including the WebSocket for chat).

6. **Markdown Rendering & Enhanced UI**  
   • Integrate a markdown parser on the frontend to render incoming messages (including syntax highlighting for code blocks).  
   • Ensure that all UI elements (chat, sidebar, conversation history, etc.) are mobile-first and responsive.

7. **Multi-Page Navigation (History, Profile, Subscription, Settings)**  
   • Develop additional pages for conversation history, user profile, subscription simulation, and settings.  
   • Wire these pages together via a unified navigation sidebar/menu.

8. **Error Handling, Logging, and Security**  
   • Enhance error handling in all endpoints (HTTP and WebSocket) and add logging features.  
   • Enforce HTTPS, secure session management, CSRF protections (if needed), and best practices for sensitive data storage.

9. **Dockerization & Deployment Setup**  
   • Create a Dockerfile and (if needed) a docker-compose file.  
   • Ensure that the complete application (backend, database, and static files) can run in containers.

10. **CI/CD Pipeline with GitHub Actions**  
    • Build a GitHub Actions workflow file to automate tests, building, and deployment of the application.  
    • Integrate basic unit and integration tests to secure core functionality before each deployment.

---

### **Iterative Prompt Series**

Each prompt below is tagged in a code block as text. Copy them into your code-generation LLM in sequence to incrementally build your project.

---

#### **Prompt 1: Project Setup & Basic Backend Framework**

```text
You are tasked with initializing a new Chatbot Website project using FastAPI in Python. Follow these steps:

1. Create a new repository with a basic folder structure that includes:
   - a root directory containing `main.py`
   - a `requirements.txt` file listing FastAPI, uvicorn, and other basic dependencies.
   - a `Dockerfile` for later containerization.
2. In `main.py`, initialize a FastAPI application.
3. Create a simple health-check route at `/health` that returns a JSON message (e.g., {"status": "ok"}).
4. Ensure the application runs with Uvicorn when executing `main.py`.

Your output should provide code for `main.py`, `requirements.txt`, and `Dockerfile` with minimal yet complete content. End by ensuring that the basic backend is wired together and can serve the `/health` endpoint.
```

---

#### **Prompt 2: Database Integration & Data Modeling**

```text
Extend the Chatbot Website project by integrating a PostgreSQL database using SQLModel. Please do the following:

1. Update your `requirements.txt` to include SQLModel and any required drivers (e.g., asyncpg or psycopg2).
2. Create a new module (e.g., `database.py`) that sets up the database connection for SQLModel.
3. Define basic data models for:
   - `User`: with fields such as id, email, display_name, profile_picture_url, password_hash, and last_selected_model.
   - `Conversation`: including id, user_id, title, timestamps, and model used.
   - `Message`: with fields for conversation_id, sender role (user or bot), content, and timestamp.
4. Add basic CRUD endpoints (or internal functions) in your FastAPI app to test creating and retrieving these models.
5. Ensure that the new endpoints or functions are integrated with the initial FastAPI app from Prompt 1.

Output the updated code for the database connection, models, and sample endpoints that test model creation and retrieval.
```

---

#### **Prompt 3: Supabase Authentication Integration**

```text
Integrate Supabase authentication into your Chatbot Website project by adjusting the current authentication flow. Instead of reimplementing user registration and login in FastAPI, do the following:

1. Use Supabase's client libraries on the frontend to handle user signup, login, email verification, and session management.
2. Create a new module in your FastAPI backend (e.g., auth.py) that implements a dependency to validate Supabase-issued JWT tokens. This module should:
   - Extract the JWT from the HTTP Authorization header (using the format "Bearer <token>").
   - Verify the token's signature, issuer, and audience by using Supabase's public key (e.g., using python-jose).
   - Decode the token to retrieve user details (user ID, email, display name) for downstream processing.
3. Update your FastAPI routes to include this dependency. Protected endpoints (for instance, a /profile route) should use the verified token information to return or process user data.
4. Ensure that the backend does not duplicate the client-side authentication processes provided by Supabase, and solely focuses on verifying the legitimacy of the user's token.

Output the code for the new authentication module (auth.py) and an updated main application file (main.py) that demonstrates a protected endpoint using the token verification dependency.
```

---

#### **Prompt 4: Real-Time Chat with WebSockets**

```text
Build the real-time chat feature using FastAPI's WebSocket support. Extend your project with the following:

1. Create a new module (or extend `main.py`) to add a WebSocket endpoint at, for instance, `/ws/chat`.
2. Implement functionality for:
   - Receiving chat messages from the client.
   - Broadcasting messages or streaming responses back to the client.
   - Basic error and reconnection handling.
3. Tie the WebSocket endpoint into your conversation history by storing each message (using the Message model) in the database.
4. Ensure that all new WebSocket functionality is fully integrated with the existing FastAPI app, and that messages are handled in real-time.
5. Add necessary documentations for using the WebSocket endpoint.

Output code that demonstrates the WebSocket endpoint, integration with message storage, and minimal error handling.
```

---

#### **Prompt 5: Frontend Basic Setup & HTML/CSS/JS Structure**

```text
Set up the basic frontend for your Chatbot Website. Follow these instructions:

1. Create a `static` or `public` directory for your HTML, CSS, and JavaScript files.
2. Build a basic HTML page (e.g., `index.html`) that includes:
   - A chat area for displaying messages.
   - An input field to send messages.
   - A sidebar for navigation (to be used for conversation history and other pages later).
3. Write minimal CSS to style the chat interface and ensure a mobile-first, responsive design.
4. Implement JavaScript that:
   - Connects to the WebSocket endpoint from Prompt 4.
   - Sends and receives messages to/from the backend.
5. Ensure the frontend assets are correctly served by your FastAPI app.

Output the code for `index.html`, a basic CSS file, and a JavaScript file that wires up the chat functionality.
```

---

#### **Prompt 6: Markdown Rendering & Enhanced UI**

```text
Enhance the frontend by adding markdown rendering for incoming chat messages. Use the following steps:

1. Integrate a lightweight markdown parser library (e.g., marked.js) into your project by including its script in your HTML page.
2. Modify your JavaScript to:
   - Parse incoming messages as markdown before displaying them in the chat area.
   - Render code blocks with syntax highlighting (using a library if needed, e.g., highlight.js).
3. Ensure that the UI remains responsive, and all enhancements are seamlessly integrated with the existing chat functionality from Prompt 5.

Output the updated HTML and JavaScript code that incorporates markdown parsing and basic syntax highlighting, making sure the frontend remains fully integrated.
```

---

#### **Prompt 7: Multi-Page Navigation (History, Profile, Subscription, Settings)**

```text
Expand the application to include additional pages, forming a complete multi-page website. Complete the following:

1. Create new HTML pages for:
   - Conversation History: Displays a list of past conversations with infinite scrolling, inline renaming, and deletion (with confirmation).
   - User Profile: Displays and allows editing of the user's profile (display name, profile picture, email, password).
   - Subscription Simulation: Shows static subscription details and current status.
   - Settings/Configuration: Provides basic settings like language preference or notification toggles.
2. Update the sidebar or main navigation on each page to allow seamless navigation between pages.
3. Ensure that each page wires back to the main backend endpoints (e.g., retrieving conversation data, updating profile info) and integrates with the existing authentication and database modules.
4. Validate that there is no orphaned code – every new page is connected to the central navigation and functionality.

Output the HTML, CSS, and JavaScript code for these additional pages along with navigation updates.
```

---

#### **Prompt 8: Error Handling, Logging & Security Enhancements**

```text
Improve the reliability and security of the application by adding thorough error handling, logging, and basic security features. Please perform the following:

1. Review each API endpoint (both HTTP and WebSocket) and add comprehensive error handling that:
   - Returns appropriate HTTP status codes.
   - Notifies the user (or client) of connection drops in the WebSocket.
2. Add logging using Python's built-in logging module in all critical sections of your FastAPI application.
3. Enforce basic security measures:
   - Ensure the application only runs over HTTPS.
   - Secure session tokens and sensitive data (e.g., use bcrypt for password hashing).
   - Integrate simple CSRF protections if necessary.
4. Confirm that each endpoint and module integrates these improvements, and that any errors are logged appropriately for troubleshooting.

Output the updated backend code that incorporates error handling and logging along with snippets demonstrating security enhancements.
```

---

#### **Prompt 9: Dockerization & Deployment Setup**

```text
Prepare the application for deployment by containerizing it using Docker. Complete the following steps:

1. Update your existing `Dockerfile` (or create one if not already done) to:
   - Copy the application code.
   - Install all dependencies.
   - Expose the correct port.
   - Start the FastAPI app using Uvicorn.
2. If needed, create a `docker-compose.yml` file that:
   - Defines a service for the FastAPI application.
   - Defines a service for PostgreSQL, properly linked to the backend.
3. Ensure that all environment variables (e.g., database URL, Supabase configuration) are parameterized.
4. Confirm that the Docker setup wires together all components (backend, database, and static files) and can be launched with a single command.

Output the complete `Dockerfile` and `docker-compose.yml` that allow the full application to run in containers.
```

---

#### **Prompt 10: CI/CD Pipeline with GitHub Actions Integration**

```text
Set up CI/CD for your project using two separate GitHub Actions workflows, both running on GitHub-hosted runners. Follow these steps:

1. **Continuous Integration (CI) Workflow**
   - Create a workflow file at `.github/workflows/ci.yml` that:
     - Triggers on every push or pull request to main branches.
     - Checks out the repository.
     - Sets up a Python environment and installs dependencies.
     - Runs unit and integration tests (simulate tests for key endpoints and database operations if needed).
     - Builds the Docker image(s).

2. **Continuous Deployment (CD) Workflow**
   - Create a workflow file at `.github/workflows/cd.yml` that:
     - Triggers on push to the main branch (or on release/tag, as desired).
     - Checks out the repository.
     - Builds the Docker image(s) if not already built.
     - Uses SSH to connect to your VPS and runs a deployment script that is versioned in the repository (e.g., `deploy/deploy.sh`).
     - The deployment script should handle pulling the latest code, rebuilding containers, and restarting services as needed.

3. **Deployment Script**
   - Add a script (e.g., `deploy/deploy.sh`) to your repository that will be executed on your VPS by the CD workflow. This script should:
     - Pull the latest code from the repository.
     - Rebuild Docker containers as needed.
     - Restart services to apply the new deployment.

**Output:**
- Two GitHub Actions workflow YAML files: `.github/workflows/ci.yml` and `.github/workflows/cd.yml`.
- A deployment script (e.g., `deploy/deploy.sh`) in the repository, invoked by the CD workflow via SSH on your VPS.
```

---

Each prompt builds on the previous one while integrating all parts of the project step by step. You now have a series of detailed prompts to generate code and wire the entire Chatbot Website project together, ensuring smooth, incremental progress and full integration of features from backend to frontend and deployment.