import { getAuthToken, getCurrentUser } from "./auth.js";

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

  // Handle form submission
  if (messageForm) {
    messageForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      // Get user message
      const userMessage = messageInput.value.trim();
      if (!userMessage) return;

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
      appendMessage("user", userMessage);

      try {
        // Show loading indicator
        const loadingIndicator = appendMessage(
          "bot",
          '<div class="typing-indicator"><span></span><span></span><span></span></div>',
        );

        // Call the API to send the message
        const response = await sendMessageToAPI(userMessage);

        // Remove loading indicator
        chatMessages.removeChild(loadingIndicator);

        // Display bot response
        appendMessage("bot", response);

        // Scroll to the bottom of the chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
      } catch (error) {
        // Handle errors
        console.error("Error:", error);
        appendMessage(
          "bot",
          "Sorry, there was an error processing your request. Please try again.",
        );
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
    const apiUrl = "https://api.saviomak.com/conversations/1"; // Replace with the actual endpoint
    const token = await getAuthToken();

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch conversation ID.");
    }

    const conversation = await response.json();
    return conversation.id; // Return the conversation ID
  }

  // Function to send message to API with authentication
  async function sendMessageToAPI(message) {
    const conversationId = await getConversationId(); // Ensure this ID is valid
    const apiUrl = "https://api.saviomak.com/chat"; // This should be the correct endpoint for sending messages
    const token = await getAuthToken();

    if (!token) {
      throw new Error("No authentication token available. Please log in.");
    }

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        content: message,
        model: "gpt-3.5-turbo", // Replace with the actual model name
      }),
    };

    const response = await fetch(apiUrl, requestOptions);

    if (!response.ok) {
      throw new Error("Failed to send message.");
    }

    const result = await response.json();
    return result.response || result.message || JSON.stringify(result);
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
      throw new Error("Failed to fetch messages for the conversation.");
    }

    const messages = await response.json();
    return messages; // Return the list of messages
  }

  // Load initial messages when the page loads
  async function loadInitialMessages() {
    try {
      const conversationId = await getConversationId();
      const messages = await getMessagesForConversation(conversationId);
      messages.forEach(message => {
        appendMessage(message.role, message.content); // Assuming `role` can be 'user' or 'bot'
      });
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }

  // Initialize the chat with a welcome message if not already present
  if (chatMessages) {
    loadInitialMessages();
  }
});