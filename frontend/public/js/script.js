import { getAuthToken, getCurrentUser, checkAuth } from "./auth.js";
import { sendMessage, connectToStream } from "./chat.js";
import { API_BASE_URL } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
  const messageForm = document.getElementById("message-form");
  const messageInput = document.getElementById("message-input");
  const chatMessages = document.querySelector(".chat-messages");
  const hamburgerButton = document.querySelector(".hamburger");
  const sidebar = document.getElementById("sidebar");
  const searchInput = document.getElementById("search-input");
  const historyItems = document.getElementById("history-items");
  const themeSwitch = document.getElementById("theme-switch");
  const currentTheme = localStorage.getItem("theme");
  const savedTheme = localStorage.getItem("theme") || "light";
  let activeSocket = null;
  let currentAbortController = null;

  load_chat();
  applyTheme(savedTheme);

  async function load_chat() {
    const conversations = await loadConversations();
    renderConversations(conversations);
  }

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

  document.addEventListener("themeChanged", (e) => {
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

  function appendMessage(sender, content) {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${sender}-message`;
    messageElement.innerHTML = content;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageElement;
  }

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

  if (messageForm) {
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
          chatMessages.removeChild(loadingIndicator);
          appendMessage("bot", "Error: No WebSocket URL received");
          return;
        }

        chatMessages.removeChild(loadingIndicator);
        const botMessageElement = appendMessage("bot", "");

        if (activeSocket) {
          activeSocket.close();
          activeSocket = null;
        }

        activeSocket = connectToStream(
          response.ws_url,
          (content) => {
            botMessageElement.innerHTML += content;
            chatMessages.scrollTop = chatMessages.scrollHeight;
          },
          (error) => {
            botMessageElement.innerHTML = `Error: ${error}`;
            chatMessages.scrollTop = chatMessages.scrollHeight;
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
    return results.map(
      (/** @type {{ conversation: Conversation }} */ r) => r.conversation,
    );
  }
  async function loadConversations() {
    const session = await checkAuth();

    const response = await fetch(`${API_BASE_URL}/conversations`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    return response.json();
  }

  async function updateConversation(conversationId, update) {
    const session = await checkAuth();

    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(update),
      },
    );
    return response.json();
  }

  function startEditing(conversationId, titleElement) {
    const currentTitle = titleElement.textContent || "";
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
          console.error("Failed to update conversation title:", error);
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

  function renderConversations(conversations) {
    if (!historyItems) return;

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

  async function getMessagesForConversation(conversationId) {
    const apiUrl = `${API_BASE_URL}/conversations/${conversationId}/messages`;
    const token = await getAuthToken();

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch messages: ${response.status} - ${await response.text()}`,
      );
    }

    const messages = await response.json();
    return messages;
  }

  async function loadInitialMessages() {
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get("conversationId");
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
