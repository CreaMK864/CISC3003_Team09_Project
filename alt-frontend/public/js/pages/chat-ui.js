import {
    loadConversations,
    loadConversationMessages,
    createNewConversation,
    searchConversations,
    sendMessage,
    signOut,
    SignOutError,
    updateConversation,
} from "../lib/chat.js";

// DOM Elements
const newChatBtn = document.getElementById("newChatBtn");
const searchInput = /** @type {HTMLInputElement} */ (document.getElementById("searchInput"));
const searchBtn = document.getElementById("searchBtn");
const conversationList = document.getElementById("conversationList");
const messages = document.getElementById("messages");
const messageInput =  /** @type {HTMLInputElement} */ (document.getElementById("messageInput"));
const sendBtn = document.getElementById("sendBtn");
const signOutBtn = document.getElementById("signOutBtn");

// State
/** @type {number | null} */
let currentConversationId = null;
/** @type {WebSocket | null} */
let currentWebSocket = null;

// Render conversations
/**
 * @param {any[]} conversations
 */
function renderConversations(conversations) {
    if (!conversationList) return;
    
    conversationList.innerHTML = "";
    conversations.forEach(conversation => {
        const div = document.createElement("div");
        div.className = "conversation-item";
        div.dataset.id = conversation.id;
        if (conversation.id === currentConversationId) {
            div.classList.add("active");
        }

        const titleSpan = document.createElement("span");
        titleSpan.className = "conversation-title";
        titleSpan.textContent = conversation.title;
        div.appendChild(titleSpan);

        const editBtn = document.createElement("button");
        editBtn.className = "btn icon conversation-edit";
        editBtn.textContent = "✏️";
        editBtn.onclick = (e) => {
            e.stopPropagation();
            startEditing(conversation.id, titleSpan);
        };
        div.appendChild(editBtn);

        div.onclick = () => loadConversation(conversation.id);
        conversationList.appendChild(div);
    });
}

/**
 * @param {number} conversationId
 * @param {HTMLElement} titleElement
 */
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

// Load conversation
/**
 * @param {number} conversationId
 */
async function loadConversation(conversationId) {
    if (!messages) return;
    
    currentConversationId = conversationId;
    const conversationMessages = await loadConversationMessages(conversationId);
    
    // Render messages
    messages.innerHTML = "";
    conversationMessages.forEach(message => {
        appendMessage(message.content, message.role);
    });
    
    // Update active conversation in list
    document.querySelectorAll(".conversation-item").forEach(item => {
        item.classList.remove("active");
    });
    document.querySelector(`.conversation-item[data-id="${conversationId}"]`)?.classList.add("active");
}

// Append message to chat
/**
 * @param {string | null} content
 * @param {string} role
 */
function appendMessage(content, role) {
    if (!messages) return;
    
    const div = document.createElement("div");
    div.className = `message ${role}`;
    div.textContent = content;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

// Handle new chat
async function handleNewChat() {
    const conversation = await createNewConversation();
    if (conversation) {
        const conversations = await loadConversations();
        renderConversations(conversations);
        await loadConversation(conversation.id);
    }
}

// Handle search
async function handleSearch() {
    if (!searchInput) return;
    
    const query = searchInput.value.trim();
    const conversations = await searchConversations(query);
    renderConversations(conversations);
    
    // Add one-time event listener to reset conversations on next input
    const resetListener = async () => {
        const allConversations = await loadConversations();
        renderConversations(allConversations);
        searchInput.removeEventListener("input", resetListener);
    };
    searchInput.addEventListener("input", resetListener);
}

// Handle send message
async function handleSendMessage() {
    if (!messageInput || !currentConversationId) return;
    
    const content = messageInput.value.trim();
    if (!content) return;

    // Close existing WebSocket if any
    if (currentWebSocket) {
        currentWebSocket.close();
        currentWebSocket = null;
    }

    // Append user message
    appendMessage(content, "user");
    messageInput.value = "";

    // Send message and get stream ID
    const response = await sendMessage(currentConversationId, content);
    if (!response) return;

    // Create bot message container
    const botMessageDiv = document.createElement("div");
    botMessageDiv.className = "message assistant current";
    messages?.appendChild(botMessageDiv);

    let fullResponse = "";
    // Connect to WebSocket using ws_url
    currentWebSocket = new WebSocket(response.ws_url);
    currentWebSocket.addEventListener("message", (event) => {
      try {
        const jsonData = JSON.parse(event.data);

        if (jsonData.error) {
          console.error("Error from server:", jsonData.error);
          botMessageDiv.textContent = `Error: ${jsonData.error}`;
          return;
        }

        if (jsonData.event === "chat_ended") {
          console.log("Chat response complete");
          return;
        }

        fullResponse += JSON.stringify(jsonData);
        botMessageDiv.textContent = fullResponse;
      } catch {
        fullResponse += event.data;
        botMessageDiv.textContent = fullResponse;
      }

      if (messages) {
        messages.scrollTop = messages.scrollHeight;
      } else {
        console.error("messagesContainer is null!");
      }
    });

    currentWebSocket.addEventListener("close", () => {
      console.log("Disconnected from WebSocket");
    });

    currentWebSocket.addEventListener("error", (event) => {
      console.error("WebSocket error:", event);
      botMessageDiv.textContent =
        "Error: Failed to connect to response stream";
    });

    messageInput.value = "";

    // Clean up WebSocket on close
    currentWebSocket.onclose = () => {
        currentWebSocket = null;
        botMessageDiv.classList.remove("current");
    };
}

// Initialize
async function initialize() {
  try {
    const conversations = await loadConversations();
    renderConversations(conversations);
  } catch (error) {
    if (error instanceof SignOutError) {
      console.error("User is signed out:", error);
      window.location.href = "./index.html";
    } else {
      console.error("Error loading conversations:", error);
      throw error;
    }
  }
}

// Event Listeners
newChatBtn?.addEventListener("click", handleNewChat);
searchBtn?.addEventListener("click", handleSearch);
searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSearch();
});
sendBtn?.addEventListener("click", handleSendMessage);
messageInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});
signOutBtn?.addEventListener("click", async () => {
    await signOut();
    window.location.href = "./index.html";
});

// Start the app
initialize();