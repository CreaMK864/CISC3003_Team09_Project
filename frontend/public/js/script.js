/**
 * @fileoverview Main chat application functionality
 * @module script
 */

import { getAuthToken, getCurrentUser, checkAuth } from "./auth.js";
import { sendMessage, connectToStream } from "./chat.js";
import { API_BASE_URL } from "./config.js";

/**
 * Initialize chat application when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", () => {
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
  /** @type {HTMLInputElement|null} */
  const searchInput = /** @type {HTMLInputElement|null} */ (
    document.getElementById("search-input")
  );
  /** @type {HTMLElement|null} */
  const historyItems = document.getElementById("history-items");
  /** @type {HTMLInputElement|null} */
  const themeSwitch = /** @type {HTMLInputElement|null} */ (
    document.getElementById("theme-switch")
  );
  const currentTheme = localStorage.getItem("theme");
  const savedTheme = localStorage.getItem("theme") || "light";
  /** @type {WebSocket|null} */
  let activeSocket = null;
  /** @type {AbortController|null} */
  let currentAbortController = null;

  load_chat();
  applyTheme(savedTheme);

  /**
   * Load chat history and initialize conversations
   */
  async function load_chat() {
    const conversations = await loadConversations();
    renderConversations(conversations);
  }

  /**
   * Apply theme to the document
   * @param {string} theme - Theme to apply ('light' or 'dark')
   */
  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark-theme");
      document.body.classList.add("dark-theme");
    } else {
      document.documentElement.classList.remove("dark-theme");
      document.body.classList.remove("dark-theme");
    }
  }

  if (themeSwitch && currentTheme === "dark") {
    document.body.classList.add("dark-theme");
    themeSwitch.checked = true;
  }

  if (themeSwitch) {
    themeSwitch.addEventListener("change", function () {
      document.body.classList.toggle("dark-theme");
      localStorage.setItem("theme", this.checked ? "dark" : "light");
    });
  }

  document.addEventListener("themeChanged", (/** @type {CustomEvent} */ e) => {
    applyTheme(e.detail.theme);
  });

  window.addEventListener("storage", (event) => {
    if (event.key === "theme") {
      applyTheme(event.newValue || "light");
    }
  });

  if (hamburgerButton && sidebar) {
    hamburgerButton.addEventListener("click", () => {
      sidebar.classList.toggle("show");
    });
  }

  /**
   * Append a message to the chat
   * @param {string} sender - Message sender ('user' or 'bot')
   * @param {string} content - Message content
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

  /**
   * Get or create a conversation ID
   * @returns {Promise<number>} The conversation ID
   * @throws {Error} If API request fails
   */
  async function getConversationId() {
    const apiUrl = `${API_BASE_URL}/conversations`;
    const token = await getAuthToken();

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch conversations: ${response.status} - ${await response.text()}`,
      );
    }

    const conversations = await response.json();
    if (conversations.length > 0) {
      return conversations[0].id;
    } else {
      const createResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "New Conversation",
          model: "gpt-4.1-nano",
        }),
      });

      if (!createResponse.ok) {
        throw new Error(
          `Failed to create conversation: ${createResponse.status} - ${await createResponse.text()}`,
        );
      }

      const conversation = await createResponse.json();
      return conversation.id;
    }
  }

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
        appendMessage("bot", `Error: ${error.message}`);
      }
    });
  }

  searchInput?.addEventListener("input", () => {
    if (searchInput.ariaValueMax?.trim() === "") {
      load_chat();
      return;
    }
    while (historyItems?.firstChild) {
      historyItems.removeChild(historyItems.firstChild);
    }
    handleSearch();
  });

  /**
   * Handle search input and fetch matching conversations
   */
  async function handleSearch() {
    if (!searchInput) return;
    if (currentAbortController) {
      currentAbortController.abort();
    }
    const query = searchInput.value.trim();
    currentAbortController = new AbortController();
    try {
      const conversations = await searchConversations(
        query,
        currentAbortController.signal,
      );
      renderConversations(conversations);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.log("Search error:", error);
      }
    }
  }

  /**
   * Search conversations based on query
   * @param {string} query - Search query
   * @param {AbortSignal} signal - Abort signal for cancelling request
   * @returns {Promise<Array>} Array of matching conversations
   */
  async function searchConversations(query, signal) {
    if (!query) {
      return loadConversations();
    }

    const session = await checkAuth();

    const response = await fetch(
      `${API_BASE_URL}/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        signal,
      },
    );
    const results = await response.json();
    return results.map((r) => r.conversation);
  }

  /**
   * Load all conversations
   * @returns {Promise<Array<{id: number, title: string, created_at: string}>>} Array of conversations
   */
  async function loadConversations() {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to load conversations: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update conversation details
   * @param {number} conversationId - ID of conversation to update
   * @param {Object} update - Update data
   * @returns {Promise<Object>} Updated conversation
   */
  async function updateConversation(conversationId, update) {
    const token = await getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(update),
      },
    );

    if (!response.ok) {
      throw new Error(`Update failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Start editing conversation title
   * @param {number} conversationId - ID of conversation to edit
   * @param {HTMLElement} titleElement - Title element to edit
   */
  function startEditing(conversationId, titleElement) {
    const currentTitle = titleElement.textContent;
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentTitle;
    input.className = "conversation-edit";

    const handleSubmit = async () => {
      const newTitle = input.value.trim();
      if (newTitle && newTitle !== currentTitle) {
        try {
          await updateConversation(conversationId, { title: newTitle });
          titleElement.textContent = newTitle;
        } catch (error) {
          console.error("Failed to update title:", error);
          titleElement.textContent = currentTitle;
        }
      } else {
        titleElement.textContent = currentTitle;
      }
      input.remove();
    };

    input.addEventListener("blur", handleSubmit);
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
    });

    titleElement.textContent = "";
    titleElement.appendChild(input);
    input.focus();
  }

  /**
   * Render conversations in the sidebar
   * @param {Array} conversations - Array of conversations to render
   */
  function renderConversations(conversations) {
    if (!historyItems || !chatMessages) return;

    historyItems.innerHTML = "";
    conversations.forEach((conversation) => {
      const li = document.createElement("li");
      li.className = "history-item";
      li.dataset.id = conversation.id;

      const titleSpan = document.createElement("h4");
      titleSpan.textContent = conversation.title;
      li.appendChild(titleSpan);

      const editBtn = document.createElement("button");
      editBtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';
      editBtn.className = "edit-btn";
      editBtn.title = "Edit title";
      editBtn.onclick = (e) => {
        e.stopPropagation();
        startEditing(conversation.id, titleSpan);
      };
      li.appendChild(editBtn);

      li.onclick = () => {
        window.location.href = `home.html?conversationId=${conversation.id}`;
      };

      historyItems.appendChild(li);
    });
  }

  /**
   * Get messages for a specific conversation
   * @param {number} conversationId - ID of conversation to fetch messages for
   * @returns {Promise<Array>} Array of messages
   */
  async function getMessagesForConversation(conversationId) {
    const token = await getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/messages`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to load messages: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Load initial messages for the current conversation
   */
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
        appendMessage("bot", `Error loading messages: ${error.message}`);
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
        appendMessage("bot", `Error loading messages: ${error.message}`);
      }
    }
  }

  if (chatMessages) {
    loadInitialMessages();
  }

  // Update getConversationId to respect URL parameter if present
  window.getConversationId = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get("conversationId");
    if (conversationId) return parseInt(conversationId, 10);
    const apiUrl = `${API_BASE_URL}/conversations`;
    const token = await getAuthToken();

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch conversations: ${response.status} - ${await response.text()}`,
      );
    }

    const conversations = await response.json();
    if (conversations.length > 0) {
      return conversations[0].id;
    } else {
      const createResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "New Conversation",
          model: "gpt-4.1-nano",
        }),
      });

      if (!createResponse.ok) {
        throw new Error(
          `Failed to create conversation: ${createResponse.status} - ${await createResponse.text()}`,
        );
      }

      const conversation = await createResponse.json();
      return conversation.id;
    }
  };
});
