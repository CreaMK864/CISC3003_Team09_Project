import { getAuthToken, getCurrentUser } from "./auth.js";
import { sendMessage, connectToStream } from "./chat.js";

document.addEventListener("DOMContentLoaded", () => {
  const messageForm = document.getElementById("message-form");
  const messageInput = document.getElementById("message-input");
  const chatMessages = document.querySelector(".chat-messages");
  const hamburgerButton = document.querySelector(".hamburger");
  const sidebar = document.getElementById("sidebar");
  const openSidebarBtn = document.getElementById("open-sidebar");
  const closeSidebarBtn = document.getElementById("close-sidebar");
  const searchInput = document.getElementById("search-input");
  const historyItems = document.querySelectorAll(".history-item");

  let activeSocket = null;

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.classList.add("dark-theme");
      document.body.classList.add("dark-theme");
    } else {
      document.documentElement.classList.remove("dark-theme");
      document.body.classList.remove("dark-theme");
    }
  }
  //theme
  const themeSwitch = document.getElementById("theme-switch");
  const currentTheme = localStorage.getItem("theme");
  if (currentTheme === "dark") {
    document.body.classList.add("dark-theme");
    themeSwitch.checked = true;
  }
  themeSwitch.addEventListener("change", function () {
    document.body.classList.toggle("dark-theme");
    localStorage.setItem("theme", this.checked ? "dark" : "light");
  });
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);

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

  if (openSidebarBtn && sidebar) {
    openSidebarBtn.addEventListener("click", () => {
      sidebar.classList.add("active");
    });
  }

  if (closeSidebarBtn && sidebar) {
    closeSidebarBtn.addEventListener("click", () => {
      sidebar.classList.remove("active");
    });
  }

  if (messageInput && sidebar) {
    messageInput.addEventListener("focus", () => {
      sidebar.classList.remove("active");
    });
  }

  function appendMessage(sender, content) {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${sender}-message`;
    messageElement.innerHTML = content; // Use innerHTML to render HTML tags
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageElement;
  }

  async function getConversationId() {
    const apiUrl = "https://api.saviomak.com/conversations";
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
            // Append formatted content
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

  if (searchInput && historyItems.length > 0) {
    searchInput.addEventListener("input", () => {
      const searchTerm = searchInput.value.toLowerCase();
      historyItems.forEach((item) => {
        const title = item.querySelector("h4").textContent.toLowerCase();
        const summary = item.querySelector("p").textContent.toLowerCase();
        if (title.includes(searchTerm) || summary.includes(searchTerm)) {
          item.style.display = "block";
        } else {
          item.style.display = "none";
        }
      });
    });
  }

  async function getMessagesForConversation(conversationId) {
    const apiUrl = `https://api.saviomak.com/conversations/${conversationId}/messages`;
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
    try {
      const conversationId = await getConversationId();
      const messages = await getMessagesForConversation(conversationId);
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
  }

  if (chatMessages) {
    loadInitialMessages();
  }
});
