/**
 * @fileoverview Core chat application functionality
 * @module script
 */

import { getAuthToken, checkAuth } from "./auth.js";
import { API_BASE_URL } from "./config.js";

/**
 * Get or create a conversation ID
 * @returns {Promise<number>} The conversation ID
 * @throws {Error} If API request fails
 */
export async function getConversationId() {
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

/**
 * Search conversations based on query
 * @param {string} query - Search query
 * @param {AbortSignal} signal - Abort signal for cancelling request
 * @returns {Promise<Array<{id: number, title: string, created_at: string}>>} Array of matching conversations
 */
export async function searchConversations(query, signal) {
  if (!query) {
    return loadConversations();
  }

  const session = await checkAuth();
  if (!session) {
    throw new Error("Not authenticated");
  }

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
  /** @type {Array<{conversation: {id: number, title: string, created_at: string}}>} */
  const typedResults = results;
  return typedResults.map((r) => r.conversation);
}

/**
 * Load all conversations
 * @returns {Promise<Array<{id: number, title: string, created_at: string}>>} Array of conversations
 */
export async function loadConversations() {
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
export async function updateConversation(conversationId, update) {
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
 * Get messages for a specific conversation
 * @param {number} conversationId - ID of conversation to fetch messages for
 * @returns {Promise<Array<{role: string, content: string}>>} Array of messages
 */
export async function getMessagesForConversation(conversationId) {
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
