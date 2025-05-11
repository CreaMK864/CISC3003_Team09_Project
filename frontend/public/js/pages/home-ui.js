/**
 * @fileoverview UI/DOM interactions for the home page
 * @module home-ui
 */

import { getCurrentUser } from "../auth.js";
import { sendMessage, connectToStream } from "../chat.js";
import { getConversationId, getMessagesForConversation } from "../script.js";

/**
 * Initialize chat application when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  /** @type {HTMLFormElement|null} */
  const messageForm = /** @type {HTMLFormElement|null} */ (
    document.getElementById("message-form")
  );
  /** @type {HTMLInputElement|null} */
  const messageInput = /** @type {HTMLInputElement|null} */ (
    document.getElementById("message-input")
  );
  /** @type {HTMLElement|null} */
  const chatMessages = document.querySelector(".chat-messages");
  /** @type {HTMLElement|null} */
  const hamburgerButton = document.querySelector(".hamburger");
  /** @type {HTMLElement|null} */
  const sidebar = document.getElementById("sidebar");

  // State
  /** @type {WebSocket|null} */
  let activeSocket = null;

  // Initialize
  if (chatMessages) {
    loadInitialMessages();
  }

  // Navigation
  if (hamburgerButton && sidebar) {
    hamburgerButton.addEventListener("click", () => {
      sidebar.classList.toggle("show");
    });
  }

  // Message handling
  if (messageForm && messageInput) {
    messageForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const content = messageInput.value.trim();
      if (!content) return;

      const user = getCurrentUser();
      if (!user) {
        appendMessage("bot", "Please log in to send messages.");
        window.location.href = "login.html";
        return;
      }

      messageInput.value = "";
      appendMessage("user", content);

      try {
        const loadingIndicator = appendMessage(
          "bot",
          '<div class="typing-indicator"><span></span><span></span><span></span></div>',
        );

        const conversationId = await getConversationId();
        const response = await sendMessage(conversationId, content);
        if (!response || !response.ws_url) {
          if (chatMessages && loadingIndicator) {
            chatMessages.removeChild(loadingIndicator);
          }
          appendMessage("bot", "Error: No WebSocket URL received");
          return;
        }

        if (chatMessages && loadingIndicator) {
          chatMessages.removeChild(loadingIndicator);
        }
        const botMessageElement = appendMessage("bot", "");

        if (activeSocket) {
          activeSocket.close();
          activeSocket = null;
        }

        activeSocket = connectToStream(
          response.ws_url,
          (content) => {
            if (botMessageElement) {
              botMessageElement.innerHTML += content;
              if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            }
          },
          (error) => {
            if (botMessageElement) {
              botMessageElement.innerHTML = `Error: ${error}`;
              if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            }
          },
        );
      } catch (error) {
        console.error("Error:", error);
        appendMessage(
          "bot",
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  // UI Helper Functions
  /**
   * Appends a message to the chat messages container
   * @param {string} sender - The sender of the message (either "user" or "bot")
   * @param {string} content - The content of the message
   * @returns {HTMLElement} The created message element
   */
  function appendMessage(sender, content) {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${sender}-message`;
    messageElement.innerHTML = content;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageElement;
  }

  async function loadInitialMessages() {
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = parseInt(urlParams.get("conversationId") ?? "", 10);
    if (conversationId) {
      try {
        const messages = await getMessagesForConversation(conversationId);
        chatMessages.innerHTML = ""; // Clear existing messages
        messages.forEach((message) => {
          appendMessage(
            message.role === "user" ? "user" : "bot",
            message.content,
          );
        });
      } catch (error) {
        console.error("Error loading messages:", error);
        appendMessage(
          "bot",
          `Error loading messages: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      // Fallback to default behavior if no conversationId is provided
      const defaultConversationId = await getConversationId();
      try {
        const messages = await getMessagesForConversation(
          defaultConversationId,
        );
        chatMessages.innerHTML = ""; // Clear existing messages
        messages.forEach((message) => {
          appendMessage(
            message.role === "user" ? "user" : "bot",
            message.content,
          );
        });
      } catch (error) {
        console.error("Error loading default messages:", error);
        appendMessage(
          "bot",
          `Error loading messages: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
});
