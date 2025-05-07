import { checkAuth, signOut } from "./auth.js";
import { API_BASE_URL } from "../../config.js";

/**
 * @typedef {Object} Conversation
 * @property {number} id - Conversation ID
 * @property {string} title - Conversation title
 * @property {string} model - Model used for the conversation
 */

/**
 * @typedef {Object} Message
 * @property {string} content - Message content
 * @property {string} role - Message role (user/bot)
 */

/**
 * @typedef {Object} StreamResponse
 * @property {string} ws_url - WebSocket URL for streaming
 */

class SignOutError extends Error {
    /**
     * @param {string | undefined} message
     */
    constructor(message) {
        super(message);
        this.name = "SignOutError";
    }
}

/**
 * Load user's conversations
 * @returns {Promise<Conversation[]>}
 */
async function loadConversations() {
    const session = await checkAuth();
    if (!session) {
        throw new SignOutError("User is not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/conversations`, {
        headers: {
            "Authorization": `Bearer ${session.access_token}`
        }
    });
    return response.json();
}

/**
 * Load messages for a conversation
 * @param {number} conversationId - ID of the conversation to load
 * @returns {Promise<Message[]>}
 */
async function loadConversationMessages(conversationId) {
    const session = await checkAuth();
    if (!session) {
        throw new SignOutError("User is not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
        headers: {
            "Authorization": `Bearer ${session.access_token}`
        }
    });
    return response.json();
}

/**
 * Create a new conversation
 * @returns {Promise<Conversation | null>}
 */
async function createNewConversation() {
    const session = await checkAuth();
    if (!session) {
        throw new SignOutError("User is not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title: "New Conversation",
            model: "gpt-4.1-nano" // Default model
        })
    });
    return response.json();
}

/**
 * Search conversations
 * @param {string} query - Search query
 * @returns {Promise<Conversation[]>}
 */
async function searchConversations(query) {
    if (!query) {
        return loadConversations();
    }

    const session = await checkAuth();
    if (!session) {
        throw new SignOutError("User is not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/conversations/search?query=${encodeURIComponent(query)}`, {
        headers: {
            "Authorization": `Bearer ${session.access_token}`
        }
    });
    const results = await response.json();
    return results.map((/** @type {{ conversation: Conversation }} */ r) => r.conversation);
}

/**
 * Send a message and get stream ID
 * @param {number} conversationId - ID of the conversation
 * @param {string} content - Message content
 * @returns {Promise<StreamResponse | null>}
 */
async function sendMessage(conversationId, content) {
    const session = await checkAuth();
    if (!session) {
        throw new SignOutError("User is not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            conversation_id: conversationId,
            content
        })
    });
    const data = await response.json();
    return data;
}

/**
 * Connect to WebSocket for streaming response
 * @param {string} ws_url - WebSocket URL from StreamResponse
 * @param {function(string): void} onContent - Callback for content updates
 * @param {function(string): void} onError - Callback for errors
 * @returns {WebSocket}
 */
function connectToStream(ws_url, onContent, onError) {
    const ws = new WebSocket(ws_url);
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "content") {
            onContent(data.content);
        } else if (data.type === "error") {
            onError(data.error);
        }
    };

    return ws;
}

/**
 * Update a conversation's title or model
 * @param {number} conversationId - ID of the conversation to update
 * @param {{ title?: string, model?: string }} update - Update data
 * @returns {Promise<Conversation>}
 */
async function updateConversation(conversationId, update) {
    const session = await checkAuth();
    if (!session) {
        throw new SignOutError("User is not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(update)
    });
    return response.json();
}

export {
    loadConversations,
    loadConversationMessages,
    createNewConversation,
    searchConversations,
    sendMessage,
    connectToStream,
    signOut,
    SignOutError,
    updateConversation,
}; 