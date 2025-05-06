import {
  initializeAuth,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  resetPassword,
  getAuthToken,
  getCurrentUser,
} from "./auth.js";
import { API_BASE_URL } from "./config.js";

// DOM elements for chat page (index.html)
let messageForm = document.getElementById("message-form");
let messageInput = document.getElementById("message-input");
let messagesContainer = document.getElementById("chat-messages");

// DOM elements for login and register pages (login.html, register.html)
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const googleLoginButton = document.getElementById("google-login");
const googleRegisterButton = document.getElementById("google-register");

// DOM elements for test-auth.html
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const resetTab = document.getElementById("resetTab");
const testLoginForm = document.getElementById("loginForm");
const testRegisterForm = document.getElementById("registerForm");
const testResetForm = document.getElementById("resetForm");
const statusMessage = document.getElementById("statusMessage");

let activeSocket = null;
let currentConversationId = null;

/**
 * Initialize the application
 * @returns {Promise<void>}
 */
async function initialize() {
  const user = await initializeAuth();

  if (user) {
    // If user is authenticated
    if (window.location.pathname.includes("index.html")) {
      await getOrCreateConversation();
    } else if (
      window.location.pathname.includes("login.html") ||
      window.location.pathname.includes("register.html") ||
      window.location.pathname.includes("test-auth.html")
    ) {
      window.location.href = "index.html";
    }
  } else {
    // If user is not authenticated
    if (window.location.pathname.includes("index.html")) {
      window.location.href = "login.html";
    } else if (window.location.pathname.includes("test-auth.html")) {
      showTab("login"); // Default to login tab
    }
  }
}

/**
 * Show a specific tab (for test-auth.html)
 * @param {string} tabName - The name of the tab to show ('login', 'register', 'reset')
 */
function showTab(tabName) {
  if (!testLoginForm || !testRegisterForm || !testResetForm) return;

  // Hide all forms
  testLoginForm.classList.add("hidden");
  testRegisterForm.classList.add("hidden");
  testResetForm.classList.add("hidden");

  // Reset active tab styles
  loginTab?.classList.remove("tab-active");
  registerTab?.classList.remove("tab-active");
  resetTab?.classList.remove("tab-active");

  // Show selected form and activate tab
  if (tabName === "login") {
    testLoginForm.classList.remove("hidden");
    loginTab?.classList.add("tab-active");
  } else if (tabName === "register") {
    testRegisterForm.classList.remove("hidden");
    registerTab?.classList.add("tab-active");
  } else if (tabName === "reset") {
    testResetForm.classList.remove("hidden");
    resetTab?.classList.add("tab-active");
  }
}

/**
 * Show status message (for test-auth.html)
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether the message is an error
 */
function showMessage(message, isError = false) {
  if (!statusMessage) return;

  statusMessage.textContent = message;
  statusMessage.classList.remove(
    "hidden",
    "bg-green-100",
    "text-green-800",
    "bg-red-100",
    "text-red-800"
  );
  if (isError) {
    statusMessage.classList.add(
      "bg-red-100",
      "text-red-800",
      "dark:bg-red-900",
      "dark:text-red-200"
    );
  } else {
    statusMessage.classList.add(
      "bg-green-100",
      "text-green-800",
      "dark:bg-green-900",
      "dark:text-green-200"
    );
  }
}

/**
 * Get existing conversations or create a new one
 * @returns {Promise<void>}
 */
async function getOrCreateConversation() {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${await getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! Status: ${response.status} - ${await response.text()}`
      );
    }

    const conversations = await response.json();

    if (conversations.length > 0) {
      currentConversationId = conversations[0].id;
      document.querySelector(".chat-header h2").textContent =
        conversations[0].title;
    } else {
      await createNewConversation();
    }

    localStorage.setItem(
      "current_conversation_id",
      currentConversationId.toString()
    );
  } catch (error) {
    console.error("Error getting conversations:", error);
    displayErrorMessage(
      "Failed to load conversations. Using a default conversation."
    );
    currentConversationId = 1;
    document.querySelector(".chat-header h2").textContent =
      "Default Conversation";
    localStorage.setItem(
      "current_conversation_id",
      currentConversationId.toString()
    );
  }
}

/**
 * Create a new conversation
 * @returns {Promise<void>}
 */
async function createNewConversation() {
  try {
    const response = await fetch(`${API_BASE_URL}/conversations/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({
        title: "New Conversation",
        model: "gpt-4.1-nano",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! Status: ${response.status} - ${await response.text()}`
      );
    }

    const conversation = await response.json();
    currentConversationId = conversation.id;
    document.querySelector(".chat-header h2").textContent = conversation.title;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
}

/**
 * Display a message in the chat UI
 * @param {string} content - The message content
 * @param {string} role - The role of the sender ('user' or 'assistant')
 */
function displayMessage(content, role) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");
  messageElement.classList.add(
    role === "user" ? "user-message" : "bot-message"
  );
  messageElement.textContent = content;

  if (messagesContainer) {
    messagesContainer?.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } else {
    console.error("messagesContainer is null!");
  }
}

/**
 * Display an error message in the chat UI
 * @param {string} content - The error message content
 */
function displayErrorMessage(content) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", "error-message");
  messageElement.textContent = content;

  if (messagesContainer) {
    messagesContainer?.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } else {
    console.error("messagesContainer is null!");
  }
}

/**
 * Send a message to the API and handle the streamed response
 * @param {string} content - The message content
 * @returns {Promise<void>}
 */
async function sendMessage(content) {
  try {
    if (!getCurrentUser()) {
      displayErrorMessage("You need to be logged in to send messages.");
      window.location.href = "login.html";
      return;
    }

    if (!currentConversationId) {
      await getOrCreateConversation();
    }

    displayMessage(content, "user");

    const botMessageElement = document.createElement("div");
    botMessageElement.classList.add("message", "bot-message");
    botMessageElement.textContent = "";

    if (messagesContainer) {
      messagesContainer.appendChild(botMessageElement);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } else {
      console.error("messagesContainer is null!");
      return; // Exit the function if messagesContainer is null
    }

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({
        conversation_id: getCurrentConversationId(),
        role: "user",
        content: content,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! Status: ${response.status} - ${await response.text()}`
      );
    }

    const data = await response.json();
    const wsUrl = data.ws_url;

    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.close();
    }

    activeSocket = new WebSocket(wsUrl);

    let fullResponse = "";

    activeSocket.addEventListener("open", () => {
      console.log("Connected to WebSocket for streaming response");
    });

    activeSocket.addEventListener("message", (event) => {
      try {
        const jsonData = JSON.parse(event.data);

        if (jsonData.error) {
          console.error("Error from server:", jsonData.error);
          botMessageElement.textContent = `Error: ${jsonData.error}`;
          return;
        }

        if (jsonData.event === "chat_ended") {
          console.log("Chat response complete");
          return;
        }

        fullResponse += JSON.stringify(jsonData);
        botMessageElement.textContent = fullResponse;
      } catch {
        fullResponse += event.data;
        botMessageElement.textContent = fullResponse;
      }

      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } else {
        console.error("messagesContainer is null!");
      }
    });

    activeSocket.addEventListener("close", () => {
      console.log("Disconnected from WebSocket");
    });

    activeSocket.addEventListener("error", (event) => {
      console.error("WebSocket error:", event);
      botMessageElement.textContent =
        "Error: Failed to connect to response stream";
    });

    messageInput.value = "";
  } catch (error) {
    console.error("Error sending message:", error);
    displayErrorMessage("Failed to send message: " + error.message);
  }
}

/**
 * Get the current conversation ID
 * @returns {number|null} The current conversation ID
 */
function getCurrentConversationId() {
  return currentConversationId;
}

// Handle form submission for chat page (index.html)
document.addEventListener("DOMContentLoaded", () => {
  messageForm = document.getElementById("message-form");
  messageInput = document.getElementById("message-input");
  messagesContainer = document.getElementById("chat-messages");

  if (messageForm) {
    messageForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const message = messageInput.value.trim();
      if (message) {
        sendMessage(message); // Call the sendMessage function from app.js
      }
    });
  }
});

// Handle login form submission (login.html)
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = loginForm.querySelector("#email").value;
    const password = loginForm.querySelector("#password").value;
    try {
      const user = await signInWithEmail(email, password);
      if (user) {
        window.location.href = "index.html";
      }
    } catch (error) {
      alert("Login failed: " + error.message);
    }
  });
}

// Handle register form submission (register.html)
if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = registerForm.querySelector("#name").value;
    const email = registerForm.querySelector("#email").value;
    const password = registerForm.querySelector("#password").value;
    try {
      const user = await signUpWithEmail(email, password);
      if (user) {
        window.location.href = "index.html";
      }
    } catch (error) {
      alert("Sign up failed: " + error.message);
    }
  });
}

// Handle Google login (login.html)
if (googleLoginButton) {
  googleLoginButton.addEventListener("click", async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      alert("Google Sign-In failed: " + error.message);
    }
  });
}

// Handle Google register (register.html)
if (googleRegisterButton) {
  googleRegisterButton.addEventListener("click", async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      alert("Google Sign-In failed: " + error.message);
    }
  });
}

// Handle tab clicks for test-auth.html
if (loginTab) {
  loginTab.addEventListener("click", () => showTab("login"));
}
if (registerTab) {
  registerTab.addEventListener("click", () => showTab("register"));
}
if (resetTab) {
  resetTab.addEventListener("click", () => showTab("reset"));
}

// Handle form submissions for test-auth.html
if (testLoginForm) {
  testLoginForm.querySelector("button").addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    try {
      const user = await signInWithEmail(email, password);
      if (user) {
        showMessage("Login successful!");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1500);
      }
    } catch (error) {
      showMessage(`Error: ${error.message}`, true);
    }
  });

  testLoginForm
    .querySelector("button[onclick='signInWithGoogle()']")
    .addEventListener("click", async () => {
      try {
        await signInWithGoogle();
      } catch (error) {
        showMessage(`Error: ${error.message}`, true);
      }
    });
}

if (testRegisterForm) {
  testRegisterForm.querySelector("button").addEventListener("click", async () => {
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    try {
      const user = await signUpWithEmail(email, password);
      if (user) {
        showMessage(
          "Registration successful! Please check your email for confirmation."
        );
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1500);
      }
    } catch (error) {
      showMessage(`Error: ${error.message}`, true);
    }
  });

  testRegisterForm
    .querySelector("button[onclick='signInWithGoogle()']")
    .addEventListener("click", async () => {
      try {
        await signInWithGoogle();
      } catch (error) {
        showMessage(`Error: ${error.message}`, true);
      }
    });
}

if (testResetForm) {
  testResetForm.querySelector("button").addEventListener("click", async () => {
    const email = document.getElementById("resetEmail").value;
    try {
      await resetPassword(email);
      showMessage("Password reset email sent. Please check your inbox.");
    } catch (error) {
      showMessage(`Error: ${error.message}`, true);
    }
  });
}

// Initialize the app when the page loads
document.addEventListener("DOMContentLoaded", () => {
  initialize();
});