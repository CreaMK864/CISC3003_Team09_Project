/**
 * @fileoverview Main application JavaScript file handling authentication, chat functionality, and UI interactions.
 * @requires ./auth.js
 * @requires ./config.js
 * @requires ./chat.js
 */

import {
  initializeAuth,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  getAuthToken,
  getCurrentUser,
  signOut,
} from "./auth.js";
import { API_BASE_URL } from "./config.js";
import { sendMessage, connectToStream } from "./chat.js";

// DOM elements for chat page (home.html)
const messageForm = /** @type {HTMLFormElement} */ (
  document.getElementById("message-form")
);
const messageInput = /** @type {HTMLInputElement} */ (
  document.getElementById("message-input")
);
const messagesContainer = /** @type {HTMLDivElement} */ (
  document.getElementById("chat-messages")
);

// DOM elements for login and register pages (login.html, register.html)
const loginForm = /** @type {HTMLFormElement} */ (
  document.getElementById("login-form")
);
const registerForm = /** @type {HTMLFormElement} */ (
  document.getElementById("register-form")
);
const googleLoginButton = /** @type {HTMLButtonElement} */ (
  document.getElementById("google-login")
);
const googleRegisterButton = /** @type {HTMLButtonElement} */ (
  document.getElementById("google-register")
);

// New button for creating a new chat
const createNewChatButton = /** @type {HTMLButtonElement} */ (
  document.getElementById("create-new-chat")
);

let activeSocket = /** @type {WebSocket | null} */ (null);
let currentConversationId = /** @type {number | null} */ (null);

/**
 * @typedef {import('@supabase/auth-js').User} User
 */

/**
 * Apply the selected theme to the document
 * @param {string} theme - The theme to apply ('light' or 'dark')
 * @returns {void}
 */
function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark-theme");
    document.body.classList.add("dark-theme");
  } else {
    document.documentElement.classList.remove("dark-theme");
    document.body.classList.remove("dark-theme");
  }

  const themeChangeEvent = new CustomEvent("themeChanged", {
    detail: { theme },
  });
  document.dispatchEvent(themeChangeEvent);
}

/**
 * Initialize the application
 * @returns {Promise<void>}
 * @throws {Error} If initialization fails
 */
async function initialize() {
  const user = await initializeAuth();
  updateAuthUI(user);
  if (user) {
    if (window.location.pathname.includes("home.html")) {
      await getOrCreateConversation();
    } else if (
      window.location.pathname.includes("login.html") ||
      window.location.pathname.includes("register.html") ||
      window.location.pathname.includes("test-auth.html")
    ) {
      window.location.href = "home.html";
    }
  }
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (event) => {
      if (!localStorage.getItem("theme")) {
        const newTheme = event.matches ? "dark" : "light";
        applyTheme(newTheme);
      }
    });
}

/**
 * Get username from user ID
 * @param {string} uid - User ID
 * @returns {Promise<string>} The user's display name
 * @throws {Error} If the fetch operation fails
 */
export async function get_username(uid) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${uid}`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    return data["display_name"];
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    throw error;
  }
}
/**
 * Get username from user ID

/**
 * Update authentication UI based on user state
 * @param {User|null} user - The user object from authentication
 * @returns {Promise<void>}
 */
async function updateAuthUI(user) {
  const auth_reg = /** @type {HTMLElement} */ (
    document.getElementById("auth_reg")
  );
  const auth_logout = /** @type {HTMLElement} */ (
    document.getElementById("auth_logout")
  );
  const userEmail = /** @type {HTMLElement} */ (
    document.getElementById("user-email")
  );
  const alert_msg = /** @type {HTMLElement} */ (
    document.getElementById("alert_msg")
  );
  const rdylogin = /** @type {HTMLElement} */ (
    document.querySelector(".rdylogin")
  );
  const authButtons = /** @type {HTMLElement} */ (
    document.querySelector(".auth-buttons")
  );

  if (user) {
    userEmail.textContent = "WELCOME ~ " + (await get_username(user.id));
    auth_logout.style.display = "block";
    auth_reg.style.display = "none";
    authButtons.style.display = "none";
    rdylogin.style.display = "inline";
    alert_msg.style.display = "none";
  } else {
    userEmail.textContent = "";
    auth_reg.style.display = "block";
    auth_logout.style.display = "none";
    authButtons.style.display = "flex";
    rdylogin.style.display = "none";
    alert_msg.style.display = "flex";
  }
}

/**
 * Get existing conversations or create a new one
 * @returns {Promise<void>}
 * @throws {Error} If fetching or creating conversations fails
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
        `HTTP error! Status: ${response.status} - ${await response.text()}`,
      );
    }

    const conversations = await response.json();
    console.log(conversations);
    const url = new URL(window.location.href);
    const conversationId = url.searchParams.get("conversationId");

    if (conversations.length > 0) {
      const chatHeader = /** @type {HTMLElement} */ (
        document.querySelector(".chat-header h1")
      );
      if (chatHeader) {
        const conversation = conversations.find(
          (conv) => conv.id === +conversationId,
        );
        chatHeader.textContent = conversation.title;
      }
    } else {
      await createNewConversation();
    }

    if (currentConversationId !== null) {
      localStorage.setItem(
        "current_conversation_id",
        currentConversationId.toString(),
      );
    }
  } catch (error) {
    console.error("Error getting conversations:", error);
    displayErrorMessage(
      "Failed to load conversations. Using a default conversation.",
    );
    currentConversationId = 1;
    const chatHeader = /** @type {HTMLElement} */ (
      document.querySelector(".chat-header h1")
    );
    if (chatHeader) {
      chatHeader.textContent = "Default Conversation";
    }
    localStorage.setItem(
      "current_conversation_id",
      currentConversationId.toString(),
    );
  }
}

/**
 * Create a new conversation
 * @returns {Promise<void>}
 * @throws {Error} If conversation creation fails
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
        `HTTP error! Status: ${response.status} - ${await response.text()}`,
      );
    }

    const conversation = await response.json();
    currentConversationId = conversation.id;
    const chatHeader = /** @type {HTMLElement} */ (
      document.querySelector(".chat-header h1")
    );
    if (chatHeader) {
      chatHeader.textContent = conversation.title;
    }
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
}

/**
 * Create a new chat and reset the chat area
 * @returns {Promise<void>}
 * @throws {Error} If chat creation fails
 */
async function createNewChat() {
  try {
    // Create a new conversation
    await createNewConversation();

    // Update localStorage
    if (currentConversationId !== null) {
      localStorage.setItem(
        "current_conversation_id",
        currentConversationId.toString(),
      );
    }

    // Clear the chat messages area
    if (messagesContainer) {
      messagesContainer.innerHTML = "";
      // Optionally add a welcome message
      const welcomeMessage = document.createElement("div");
      welcomeMessage.classList.add("message", "bot-message");
      welcomeMessage.textContent = "Hello! How can I help you today?";
      messagesContainer.appendChild(welcomeMessage);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Close any active WebSocket connection
    if (activeSocket) {
      activeSocket.close();
      activeSocket = null;
    }
  } catch (error) {
    console.error("Error creating new chat:", error);
    displayErrorMessage("Failed to create a new chat. Please try again.");
  }
}

/**
 * Display a message in the chat UI
 * @param {string} content - The message content
 * @param {string} role - The role of the sender ('user' or 'assistant')
 * @returns {HTMLElement} The created message element
 */
function displayMessage(content, role) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");
  messageElement.classList.add(
    role === "user" ? "user-message" : "bot-message",
  );
  messageElement.textContent = content;

  if (messagesContainer) {
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } else {
    console.error("messagesContainer is null!");
  }
  return messageElement;
}

/**
 * Display an error message in the chat UI
 * @param {string} content - The error message content
 * @returns {void}
 */
function displayErrorMessage(content) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", "error-message");
  messageElement.textContent = content;

  if (messagesContainer) {
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } else {
    console.error("messagesContainer is null!");
  }
}

// Event Listeners
/**
 * @type {Event}
 * @event DOMContentLoaded
 */
document.addEventListener("DOMContentLoaded", () => {
  if (messageForm) {
    messageForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const content = messageInput.value.trim();
      if (!content) return;

      if (!getCurrentUser()) {
        displayErrorMessage("You need to be logged in to send messages.");
        window.location.href = "login.html";
        return;
      }

      if (!currentConversationId) {
        await getOrCreateConversation();
      }

      displayMessage(content, "user");
      messageInput.value = "";

      try {
        if (currentConversationId === null) {
          throw new Error("No active conversation");
        }
        const response = await sendMessage(currentConversationId, content);
        if (!response || !response.ws_url) {
          displayErrorMessage("Error: No WebSocket URL received");
          return;
        }

        if (activeSocket) {
          activeSocket.close();
          activeSocket = null;
        }

        const botMessageElement = displayMessage("", "assistant");

        activeSocket = connectToStream(
          response.ws_url,
          (content) => {
            botMessageElement.textContent += content;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          },
          /** @param {string} error */
          (error) => {
            botMessageElement.textContent = `Error: ${error}`;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          },
        );
      } catch (error) {
        if (error instanceof Error) {
          displayErrorMessage(`Error: ${error.message}`);
        } else {
          displayErrorMessage("An unknown error occurred");
        }
      }
    });
  }

  // Handle Create New Chat button click
  if (createNewChatButton) {
    createNewChatButton.addEventListener("click", async () => {
      await createNewChat();
    });
  }

  const profileForm = /** @type {HTMLFormElement} */ (
    document.getElementById("profile-form")
  );
  const themeSelect = /** @type {HTMLSelectElement} */ (
    document.getElementById("theme-select")
  );
  if (profileForm && themeSelect) {
    profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const selectedTheme = themeSelect.value;
      localStorage.setItem("theme", selectedTheme);
      applyTheme(selectedTheme);
    });
  }

  const themeToggleBtn = /** @type {HTMLButtonElement} */ (
    document.getElementById("theme-toggle")
  );
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const currentTheme = localStorage.getItem("theme") || "light";
      const newTheme = currentTheme === "light" ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
      applyTheme(newTheme);
    });
  }

  const logoutButton = /** @type {HTMLButtonElement} */ (
    document.getElementById("logout-button")
  );
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        await signOut();
        window.location.href = "login.html";
      } catch (error) {
        console.error("Logout failed:", error);
        displayErrorMessage("Failed to sign out. Please try again.");
      }
    });
  }
});

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const emailInput = /** @type {HTMLInputElement} */ (
      loginForm.querySelector("#email")
    );
    const passwordInput = /** @type {HTMLInputElement} */ (
      loginForm.querySelector("#password")
    );
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value;
    const password = passwordInput.value;
    try {
      const user = await signInWithEmail(email, password);
      if (user) {
        window.location.href = "home.html";
      }
    } catch (error) {
      if (error instanceof Error) {
        alert("Login failed: " + error.message);
      } else {
        alert("Login failed: An unknown error occurred");
      }
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const emailInput = /** @type {HTMLInputElement} */ (
      registerForm.querySelector("#email")
    );
    const passwordInput = /** @type {HTMLInputElement} */ (
      registerForm.querySelector("#password")
    );
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value;
    const password = passwordInput.value;
    try {
      const user = await signUpWithEmail(email, password);
      if (user) {
        window.location.href = "home.html";
      }
    } catch (error) {
      if (error instanceof Error) {
        alert("Sign up failed: " + error.message);
      } else {
        alert("Sign up failed: An unknown error occurred");
      }
    }
  });
}

if (googleLoginButton) {
  googleLoginButton.addEventListener("click", async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      if (error instanceof Error) {
        alert("Google Sign-In failed: " + error.message);
      } else {
        alert("Google Sign-In failed: An unknown error occurred");
      }
    }
  });
}

if (googleRegisterButton) {
  googleRegisterButton.addEventListener("click", async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      if (error instanceof Error) {
        alert("Google Sign-In failed: " + error.message);
      } else {
        alert("Google Sign-In failed: An unknown error occurred");
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initialize();
});

/**
 * @type {Event}
 * @event storage
 */
window.addEventListener("storage", (event) => {
  if (event.key === "theme") {
    applyTheme(event.newValue || "light");
  }
});
