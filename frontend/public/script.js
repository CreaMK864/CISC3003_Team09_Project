import { getAuthToken, getCurrentUser } from "./auth.js";
import { sendMessage, connectToStream } from "./chat.js";

document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
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

  // Apply theme based on localStorage
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.body.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
      document.body.classList.remove('dark-theme');
    }
  }

  // Apply saved theme on page load
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  // Listen for theme changes from other scripts
  document.addEventListener('themeChanged', (e) => {
    applyTheme(e.detail.theme);
  });

  // Listen for storage events to sync theme across tabs/pages
  window.addEventListener('storage', (event) => {
    if (event.key === 'theme') {
      applyTheme(event.newValue || 'light');
    }
  });

  // Toggle sidebar on mobile (hamburger button)
  if (hamburgerButton && sidebar) {
    hamburgerButton.addEventListener("click", () => {
      sidebar.classList.toggle("show");
    });
  }

  // Sidebar open/close buttons
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

  // Close sidebar when message input is focused
  if (messageInput && sidebar) {
    messageInput.addEventListener("focus", () => {
      sidebar.classList.remove("active");
    });
  }

  // Function to append a message to the chat
  function appendMessage(sender, content) {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${sender}-message`;
    messageElement.innerHTML = content;
    chatMessages.appendChild(messageElement);

    // Scroll to the bottom of the chat
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageElement;
  }

  // Function to get the conversation ID
  async function getConversationId() {
    const apiUrl = "https://api.saviomak.com/conversations";
    const token = await getAuthToken();

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.status} - ${await response.text()}`);
    }

    const conversations = await response.json();
    if (conversations.length > 0) {
      return conversations[0].id;
    } else {
      // Create a new conversation if none exist
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
        throw new Error(`Failed to create conversation: ${createResponse.status} - ${await createResponse.text()}`);
      }

      const conversation = await createResponse.json();
      return conversation.id;
    }
  }

  // Handle form submission
  if (messageForm) {
    messageForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      // Get user message
      const content = messageInput.value.trim();
      if (!content) return;

      // Check if user is authenticated
      const user = getCurrentUser();
      if (!user) {
        appendMessage("bot", "Please log in to send messages.");
        window.location.href = "login.html";
        return;
      }

      // Clear input field
      messageInput.value = "";

      // Display user message in the chat
      appendMessage("user", content);

      try {
        // Show loading indicator
        const loadingIndicator = appendMessage(
          "bot",
          '<div class="typing-indicator"><span></span><span></span><span></span></div>',
        );

        // Get conversation ID
        const conversationId = await getConversationId();

        // Send message and get stream response
        const response = await sendMessage(conversationId, content);
        if (!response || !response.ws_url) {
          chatMessages.removeChild(loadingIndicator);
          appendMessage("bot", "Error: No WebSocket URL received");
          return;
        }

        // Remove loading indicator
        chatMessages.removeChild(loadingIndicator);

        // Create bot message container
        const botMessageElement = appendMessage("bot", "");

        // Close existing WebSocket if any
        if (activeSocket) {
          activeSocket.close();
          activeSocket = null;
        }

        // Connect to WebSocket
        activeSocket = connectToStream(
          response.ws_url,
          (content) => {
            // Update bot message with streamed content
            botMessageElement.innerHTML += content;
            chatMessages.scrollTop = chatMessages.scrollHeight;
          },
          (error) => {
            botMessageElement.innerHTML = `Error: ${error}`;
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        );
      } catch (error) {
        // Handle errors
        console.error("Error:", error);
        appendMessage("bot", `Error: ${error.message}`);
      }
    });
  }

  // Search functionality for history page
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

  // Function to get messages for a specific conversation
  async function getMessagesForConversation(conversationId) {
    const apiUrl = `https://api.saviomak.com/conversations/${conversationId}/messages`;
    const token = await getAuthToken();

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.status} - ${await response.text()}`);
    }

    const messages = await response.json();
    return messages;
  }

  // Load initial messages when the page loads
  async function loadInitialMessages() {
    try {
      const conversationId = await getConversationId();
      const messages = await getMessagesForConversation(conversationId);
      messages.forEach(message => {
        appendMessage(message.role === "user" ? "user" : "bot", message.content);
      });
    } catch (error) {
      console.error("Error loading messages:", error);
      appendMessage("bot", `Error loading messages: ${error.message}`);
    }
  }

  // Initialize the chat with a welcome message if not already present
  if (chatMessages) {
    loadInitialMessages();
  }
});