/**
 * @fileoverview UI/DOM interactions for the history page
 * @module history-ui
 */

import {
  searchConversations,
  loadConversations,
  updateConversation,
} from "../script.js";

/**
 * Initialize history page when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  /** @type {HTMLInputElement|null} */
  const searchInput = /** @type {HTMLInputElement|null} */ (
    document.getElementById("search-input")
  );
  /** @type {HTMLElement|null} */
  const historyItems = document.getElementById("history-items");
  /** @type {HTMLElement|null} */
  const hamburgerButton = document.querySelector(".hamburger");
  /** @type {HTMLElement|null} */
  const sidebar = document.getElementById("sidebar");

  // State
  /** @type {AbortController|null} */
  let currentAbortController = null;

  // Initialize
  load_chat();

  // Navigation
  if (hamburgerButton && sidebar) {
    hamburgerButton.addEventListener("click", () => {
      sidebar.classList.toggle("show");
    });
  }

  // Search handling
  searchInput?.addEventListener("input", () => {
    if (searchInput.value.trim() === "") {
      load_chat();
      return;
    }
    while (historyItems?.firstChild) {
      historyItems.removeChild(historyItems.firstChild);
    }
    handleSearch();
  });

  /**
   * Starts editing a conversation title
   * @param {string} conversationId - The ID of the conversation to edit
   * @param {HTMLElement} titleElement - The element containing the current title
   */
  function startEditing(conversationId, titleElement) {
    const currentTitle = titleElement.textContent;
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentTitle;
    input.className = "conversation-edit";

    // Find the parent li element to disable its click event during editing
    const listItem = titleElement.closest(".history-item");
    const originalOnClick = listItem ? listItem.onclick : null;

    // Disable the click event on the parent list item during editing
    if (listItem) {
      listItem.onclick = (e) => e.stopPropagation();
    }

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

      // Restore the original click handler after editing is complete
      if (listItem && originalOnClick) {
        listItem.onclick = originalOnClick;
      }
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
   * Renders a list of conversations
   * @param {Array<{id: string, title: string}>} conversations - The list of conversations to render
   */
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

  // Core functionality calls
  async function load_chat() {
    const conversations = await loadConversations();
    renderConversations(conversations);
  }

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
      if (error instanceof Error && error.name !== "AbortError") {
        console.log("Search error:", error);
      }
    }
  }
});
