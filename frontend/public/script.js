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

        // Call the API with authenticated token
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

  // Function to send message to API with authentication
  async function sendMessageToAPI(message) {
    const apiUrl = "https://api.saviomak.com/chat";
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
        message: message,
      }),
    };

    const response = await fetch(apiUrl, requestOptions);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.message || JSON.stringify(data);
  }

  // Initialize the chat with a welcome message if not already present
  if (chatMessages) {
    const initialMessages = document.querySelectorAll(".bot-message");
    if (initialMessages.length === 0) {
      appendMessage("bot", "Hello! How can I help you today?");
    }
  }
});