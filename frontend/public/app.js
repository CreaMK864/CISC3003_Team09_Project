import {
  initializeAuth,
  showLoginForm,
  getAuthToken,
  getCurrentUser,
} from "./auth.js";
import { API_BASE_URL } from "./config.js";

// DOM elements
/** @type {HTMLFormElement} */
const messageForm = document.getElementById("login-form");
/** @type {HTMLInputElement} */
const messageInput = document.getElementById("message-input");
/** @type {HTMLDivElement} */
const messagesContainer = document.getElementById("chat-messages");

/** @type {WebSocket|null} */
let activeSocket = null;
/** @type {number|null} */
let currentConversationId = null;

/**
 * Initialize the application
 * @returns {Promise<void>}
 */
export async function initialize() {
  const user = await initializeAuth();

  if (user) {
    await getOrCreateConversation();
  } else {
    displayErrorMessage("Failed to authenticate. Please try again.");
  }
}

/**
 * Get existing conversations or create a new one
 * @returns {Promise<void>}
 */
async function getOrCreateConversation() {
  try {
    // Get existing conversations for the user
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

    /** @type {Array<{id: number, title: string}>} */
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
    // Fallback to a default conversation ID
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

    /** @type {{id: number, title: string}} */
    const conversation = await response.json();
    currentConversationId = conversation.id;
    document.querySelector(".chat-header h2").textContent = conversation.title;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error; // Let the caller handle the error
  }
}

/**
 * Display a message in the chat UI
 * @param {string} content - The message content
 * @param {string} role - The role of the sender ('user' or 'assistant')
 * @returns {void}
 */
function displayMessage(content, role) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");
  messageElement.classList.add(
    role === "user" ? "user-message" : "bot-message",
  );
  messageElement.textContent = content;

  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
      showLoginForm();
      return;
    }

    if (!currentConversationId) {
      await getOrCreateConversation();
    }

    displayMessage(content, "user");

    const botMessageElement = document.createElement("div");
    botMessageElement.classList.add("message", "bot-message");
    botMessageElement.textContent = "";
    messagesContainer.appendChild(botMessageElement);

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
        `HTTP error! Status: ${response.status} - ${await response.text()}`,
      );
    }

    /** @type {{ws_url: string}} */
    const data = await response.json();
    const wsUrl = data.ws_url;

    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.close();
    }

    activeSocket = new WebSocket(wsUrl);

    /** @type {string} */
    let fullResponse = "";

    activeSocket.addEventListener("open", () => {
      console.log("Connected to WebSocket for streaming response");
    });

    activeSocket.addEventListener("message", (event) => {
      try {
        /** @type {{error?: string, event?: string}} */
        const jsonData = JSON.parse(event.data);

        // Check if this is an error or event message
        if (jsonData.error) {
          console.error("Error from server:", jsonData.error);
          botMessageElement.textContent = `Error: ${jsonData.error}`;
          return;
        }

        if (jsonData.event === "chat_ended") {
          console.log("Chat response complete");
          return;
        }

        // If we got here, it's actually a JSON message, append it
        fullResponse += JSON.stringify(jsonData);
        botMessageElement.textContent = fullResponse;
      } catch {
        // Not JSON, so it's a plain text chunk of the response
        fullResponse += event.data;
        botMessageElement.textContent = fullResponse;
      }

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });

    activeSocket.addEventListener("close", () => {
      console.log("Disconnected from WebSocket");
    });

    activeSocket.addEventListener("error", (event) => {
      console.error("WebSocket error:", event);
      botMessageElement.textContent =
        "Error: Failed to connect to response stream";
    });

    // Clear the input
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

// Handle form submission
messageForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const message = messageInput.value.trim();
  if (message) {
    sendMessage(message);
  }
});

// Initialize the app when the page loads
document.addEventListener("DOMContentLoaded", () => {
  initialize();
});
