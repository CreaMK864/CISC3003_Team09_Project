# Chatbot Website Project – Developer Specification

## 1. Overview

**Purpose:**  
The project is a general conversational chatbot website designed as a submission for a web programming course. It mimics the ChatGPT interface but remains simplified. The core functionality includes real-time chat interactions, persistent conversation history, and model selection functionality—all wrapped in a multi-page design that meets course requirements.

**Core Features:**  
- **Real-Time Chat:** A chat interface using WebSockets for streaming responses.
- **User Authentication:** Integrated using Supabase for both Google and email logins, leveraging built-in features.
- **Conversation History:** Stores complete conversation logs with inline renaming and deletion (with prompt confirmation) and supports keyword search and infinite scrolling.
- **Model Selection:** Users can choose among available models (either via OpenAI’s API or OpenRouter); the choice is saved in the user profile.
- **Multi-Page Layout:** Includes at least five pages (chat interface, conversation history, user profile, subscription simulation, and a basic settings/configuration page).
- **Mobile-First & Responsive Design:** UI that scales well on mobile, tablet, and desktop.
- **Markdown Rendering:** Incoming messages support markdown formatting and, if available, syntax highlighting for code blocks.

---

## 2. Architecture & Technology Stack

### 2.1 Backend
- **Language & Framework:** Python with FastAPI for building RESTful API endpoints and WebSocket support.
- **ORM:** SQLModel for modeling, querying, and managing the PostgreSQL database.
- **Database:** PostgreSQL to store user information, conversation logs, model settings, and other metadata.
- **Authentication:**  
  - Use Supabase for handling user authentication.
  - Support for Google and email login.
  - Leverage Supabase’s built-in email verification, password recovery, and session management.
- **API Integration:**  
  - A single, backend-managed API key to integrate with external language models.
  - Model selection mechanism; users choose among the available models without parameter adjustments (fixed settings per model).
- **WebSockets:**  
  - FastAPI’s WebSocket support for real-time message streaming.
  - Basic reconnection/error alert handling for dropped connections.

### 2.2 Frontend
- **Technologies:**  
  - HTML, CSS, and vanilla JavaScript (no heavy frameworks like React).
  - A simplified version of the ChatGPT user interface, with a sidebar for conversation history and model selection.
- **Responsiveness:**  
  - Mobile-first design with adaptations for tablet and desktop layouts.
- **Rendering:**  
  - Markdown parser for rendering chat messages.  
  - Syntax highlighting for code blocks if natively supported by the chosen markdown library (no live preview during composition).

### 2.3 Deployment
- **Environment:**  
  - The application will run on a VPS (Hetzner) with an existing domain.
- **Containerization:**  
  - Docker will be used for packaging and deployment.
- **CI/CD:**  
  - A minimal GitHub Actions pipeline to automate deployment with each push.

---

## 3. Data Handling & Storage

### 3.1 Conversation Data Model
For each conversation, the following details will be stored:
- **Conversation ID:** Unique identifier for each conversation.
- **User ID:** Identifier linking conversations to authenticated users.
- **Messages:**  
  - Each message entry should include:
    - Sender role (e.g., user or bot).
    - Message content.
    - Timestamp.
- **Conversation Metadata:**  
  - Custom conversation title (editable inline).
  - Model used for the conversation.
  - Session timestamps and any other relevant metadata (e.g., last updated timestamp).

### 3.2 User Profile Data
The user profile table should include:
- **Display Name**
- **Profile Picture URL**
- **Email Address**
- **Password Hash**
- **Last Selected Model:** Persisting the model selection for future sessions.

### 3.3 Other Data Considerations
- **Subscription Data:**  
  - For the simulated subscription page: store only the current subscription status and static plan details.
- **Search Functionality:**  
  - Implement keyword search on conversation titles/content.

---

## 4. Error Handling & Security

### 4.1 Error Handling Strategies
- **WebSocket Connections:**  
  - Implement the simplest error alerts. If a connection drops, notify the user via a simple alert or message.
- **HTTP Endpoints:**  
  - Use standard FastAPI error handling. Return appropriate HTTP status codes and error messages for API failures.
- **Conversation Context:**  
  - Always send the full conversation history with each API call to the language model. In the event of context size overflows leading to API failures, allow the error to propagate without intermediate summarization logic.

### 4.2 Security Measures
- **Transport Security:**  
  - All communications must occur over HTTPS.
- **Authentication & Authorization:**  
  - Use token-based authentication for HTTP endpoints and WebSocket connections.
  - Rely on Supabase’s security best practices.
- **Data Protection:**  
  - Store sensitive data (such as passwords) encrypted using bcrypt (or a similar secure hashing function).
  - Ensure that user session tokens are securely generated and validated.
- **Basic Security Practices:**  
  - Cross-Site Request Forgery (CSRF) protection and rate limiting can be considered if time permits, but the focus remains on keeping implementation simple.

---

## 5. Page-by-Page Functionality

### 5.1 Chat Interface Page
- **Components:**
  - Main conversation area for displaying messages.
  - Sidebar for browsing conversation history and selecting the active model.
- **Functionality:**
  - Real-time message sending and receiving via WebSocket.
  - Markdown rendering for incoming messages.
  - Include the full conversation context with every API call.
  
### 5.2 Conversation History Page
- **Components:**
  - List view of previous conversation threads.
  - Keyword search bar for filtering conversations.
- **Functionality:**
  - Infinite scrolling to handle large histories.
  - Inline editing for renaming conversation titles.
  - Deletion option that triggers a confirmation prompt.

### 5.3 User Profile Page
- **Components:**
  - Fields for display name, profile picture, email address, and password.
- **Functionality:**
  - Allow users to view and update their profile details.
  - Display and persist the last selected language model.

### 5.4 Subscription Simulation Page
- **Components:**
  - UI elements to show current subscription status.
  - Display of static plan details.
- **Functionality:**
  - Simulate a subscription workflow without real payment integration.

### 5.5 Settings/Configuration Page
- **Components:**
  - Basic settings options (e.g., language preference or notification toggles).
- **Functionality:**
  - Serve as an additional page to satisfy multi-page project requirements.
  - Settings can be minimal and mainly for demonstration purposes.

---

## 6. Testing Plan

Although the project timeline is short and testing is not a primary focus, implementing a minimal testing plan is advisable to ensure core functionalities work as expected.

### 6.1 Unit Testing
- **Backend Logic:**
  - Write unit tests for critical API endpoints in FastAPI (using pytest or similar).
  - Validate data models and database interactions through SQLModel.
- **Key Test Cases:**
  - User authentication and session management.
  - Message creation, retrieval, and deletion functions.
  - Model selection persistence in user profiles.

### 6.2 Integration Testing
- **API Endpoints:**
  - End-to-end tests for chat messages being sent/received.
  - Integration tests for Supabase authentication flows (Google and email login).
- **WebSocket Testing:**
  - Verify that WebSocket endpoints handle connection drops appropriately and stream responses correctly.

### 6.3 Minimal Test Automation
- **CI/CD Integration:**
  - Set up basic test running steps within GitHub Actions to ensure tests pass before deployment.
- **Documentation:**
  - Include instructions on how to run tests locally (e.g., commands for running pytest).

*Note:* Testing coverage will focus on core features rather than exhaustive coverage, given the project’s scope and timeline.

---

## 7. Deployment & Infrastructure

### 7.1 Environment Setup
- **Hosting:**  
  - Deploy on a Hetzner VPS.
- **Containerization:**  
  - Use Docker to package the application components (backend, database, etc.).
- **CD Pipeline:**  
  - Configure GitHub Actions to build and deploy the Docker containers automatically on push events.

### 7.2 Operational Considerations
- **Basic Logging:**  
  - Implement server-side logging using FastAPI’s logging mechanisms. No additional centralized logging services (like Sentry) are planned.
- **Monitoring:**  
  - Simple error alerts (in the UI) and log outputs to the console/files for troubleshooting.

---

## 8. Summary

This specification outlines the complete requirements for a ChatGPT-like chatbot website, covering:

- **Purpose & Core Features:**  
  Real-time chat, user authentication via Supabase (Google and email), persistent conversation history with inline editing and deletion, and model selection with persistence.
  
- **Architecture:**  
  A Python-based backend using FastAPI and SQLModel with PostgreSQL, a simple HTML/CSS/JS frontend, Docker-based deployment on a Hetzner VPS, and minimal GitHub Actions for CI/CD.

- **Pages:**  
  At least five pages covering chat interaction, conversation history, user profile, a simulated subscription flow, and a basic settings page.

- **Data Handling & Security:**  
  Detailed models for conversations and user profiles, full conversation context for API calls, HTTPS, token-based authentication, and basic encryption for sensitive data.

- **Error Handling:**  
  Straightforward strategies for both WebSocket and HTTP endpoints, with simple alerts for connection issues.

- **Testing Plan:**  
  A minimal suite of unit and integration tests for critical functionality, with CI integration via GitHub Actions to support deployment stability.
