import {
  initializeAuth,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  resetPassword,
  getAuthToken,
  getCurrentUser,
  signOut,
} from "./auth.js";
import { API_BASE_URL } from "./config.js";
import { sendMessage, connectToStream } from "./chat.js";

// DOM elements for chat page (home.html)
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

// New button for creating a new chat
const createNewChatButton = document.getElementById("create-new-chat");

let activeSocket = null;
let currentConversationId = null;

/**
 * Apply the selected theme to the document
 * @param {string} theme - The theme to apply ('light' or 'dark')
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
  }
}

/**
 * Update authentication UI based on user state
 * @param {any} user
 */
async function updateAuthUI(user) {
  const auth_reg = document.getElementById("auth_reg");
  const auth_logout = document.getElementById("auth_logout");
  const userEmail = document.getElementById("user-email");
  const alert_msg = document.getElementById("alert_msg");
  const rdylogin = document.querySelector(".rdylogin");

  if (user) {
    userEmail.textContent = "WELCOME ~ " + user.email;
    auth_logout.style.display = "block";
    auth_reg.style.display = "none";
    document.querySelector(".auth-buttons").style.display = "none";
    rdylogin.style.display = "inline";
    alert_msg.style.display = "none";
  } else {
    userEmail.textContent = "";
    auth_reg.style.display = "block";
    auth_logout.style.display = "none";
    document.querySelector(".auth-buttons").style.display = "flex";
    rdylogin.style.display = "none";
    alert_msg.style.display = "flex";
  }
}

/**
 * Show a specific tab (for test-auth.html)
 * @param {string} tabName - The name of the tab to show ('login', 'register', 'reset')
 */
function showTab(tabName) {
  if (!testLoginForm || !testRegisterForm || !testResetForm) return;

  testLoginForm.classList.add("hidden");
  testRegisterForm.classList.add("hidden");
  testResetForm.classList.add("hidden");

  loginTab?.classList.remove("tab-active");
  registerTab?.classList.remove("tab-active");
  resetTab?.classList.remove("tab-active");

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
    "text-red-800",
  );
  if (isError) {
    statusMessage.classList.add(
      "bg-red-100",
      "text-red-800",
      "dark:bg-red-900",
      "dark:text-red-200",
    );
  } else {
    statusMessage.classList.add(
      "bg-green-100",
      "text-green-800",
      "dark:bg-green-900",
      "dark:text-green-200",
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
        `HTTP error! Status: ${response.status} - ${await response.text()}`,
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
      currentConversationId.toString(),
    );
  } catch (error) {
    console.error("Error getting conversations:", error);
    displayErrorMessage(
      "Failed to load conversations. Using a default conversation.",
    );
    currentConversationId = 1;
    document.querySelector(".chat-header h2").textContent =
      "Default Conversation";
    localStorage.setItem(
      "current_conversation_id",
      currentConversationId.toString(),
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
        `HTTP error! Status: ${response.status} - ${await response.text()}`,
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
 * Create a new chat and reset the chat area
 * @returns {Promise<void>}
 */
async function createNewChat() {
  try {
    // Create a new conversation
    await createNewConversation();

    // Update localStorage
    localStorage.setItem(
      "current_conversation_id",
      currentConversationId.toString(),
    );

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
document.addEventListener("DOMContentLoaded", () => {
  messageForm = document.getElementById("message-form");
  messageInput = document.getElementById("message-input");
  messagesContainer = document.getElementById("chat-messages");

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
          (error) => {
            botMessageElement.textContent = `Error: ${error}`;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          },
        );
      } catch (error) {
        displayErrorMessage(`Error: ${error.message}`);
      }
    });
  }

  // Handle Create New Chat button click
  if (createNewChatButton) {
    createNewChatButton.addEventListener("click", async () => {
      await createNewChat();
    });
  }

  const profileForm = document.getElementById("profile-form");
  const themeSelect = document.getElementById("theme-select");
  if (profileForm && themeSelect) {
    profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const selectedTheme = themeSelect.value;
      localStorage.setItem("theme", selectedTheme);
      applyTheme(selectedTheme);
    });
  }

  const themeToggleBtn = document.getElementById("theme-toggle");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const currentTheme = localStorage.getItem("theme") || "light";
      const newTheme = currentTheme === "light" ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
      applyTheme(newTheme);
    });
  }

  document
    .getElementById("logout-button")
    ?.addEventListener("click", async () => {
      try {
        await signOut();
        window.location.href = "login.html";
      } catch (error) {
        console.error("Logout failed:", error);
        displayErrorMessage("Failed to sign out. Please try again.");
      }
    });
});

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = loginForm.querySelector("#email").value;
    const password = loginForm.querySelector("#password").value;
    try {
      const user = await signInWithEmail(email, password);
      if (user) {
        window.location.href = "home.html";
      }
    } catch (error) {
      alert("Login failed: " + error.message);
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = registerForm.querySelector("#email").value;
    const password = registerForm.querySelector("#password").value;
    try {
      const user = await signUpWithEmail(email, password);
      if (user) {
        window.location.href = "home.html";
      }
    } catch (error) {
      alert("Sign up failed: " + error.message);
    }
  });
}

if (googleLoginButton) {
  googleLoginButton.addEventListener("click", async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      alert("Google Sign-In failed: " + error.message);
    }
  });
}

if (googleRegisterButton) {
  googleRegisterButton.addEventListener("click", async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      alert("Google Sign-In failed: " + error.message);
    }
  });
}

if (loginTab) {
  loginTab.addEventListener("click", () => showTab("login"));
}
if (registerTab) {
  registerTab.addEventListener("click", () => showTab("register"));
}
if (resetTab) {
  resetTab.addEventListener("click", () => showTab("reset"));
}

if (testLoginForm) {
  testLoginForm.querySelector("button").addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    try {
      const user = await signInWithEmail(email, password);
      if (user) {
        showMessage("Login successful!");
        setTimeout(() => {
          window.location.href = "home.html";
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
  testRegisterForm
    .querySelector("button")
    .addEventListener("click", async () => {
      const email = document.getElementById("registerEmail").value;
      const password = document.getElementById("registerPassword").value;
      try {
        const user = await signUpWithEmail(email, password);
        if (user) {
          showMessage(
            "Registration successful! Please check your email for confirmation.",
          );
          setTimeout(() => {
            window.location.href = "home.html";
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

document.addEventListener("DOMContentLoaded", () => {
  initialize();
});

window.addEventListener("storage", (event) => {
  if (event.key === "theme") {
    applyTheme(event.newValue || "light");
  }
});
