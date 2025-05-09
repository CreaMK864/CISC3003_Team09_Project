import { getAuthToken } from "./auth.js";
import { API_BASE_URL } from "./config.js";

/**
 * Send a message and get stream response
 * @param {number} conversationId - ID of the conversation
 * @param {string} content - Message content
 * @returns {Promise<{ ws_url: string } | null>}
 */
async function sendMessage(conversationId, content) {
    const token = await getAuthToken();
    if (!token) {
        throw new Error("User is not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            conversation_id: conversationId,
            role: "user",
            content,
            model: "gpt-4.1-nano" // Added model parameter
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    return data;
}

/**
 * Check if a string is valid JSON
 * @param {string} str - String to check
 * @returns {boolean}
 */
function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

/**
 * Connect to WebSocket for streaming response
 * @param {string} ws_url - WebSocket URL
 * @param {function(string): void} onContent - Callback for content updates
 * @param {function(string): void} onError - Callback for errors
 * @returns {WebSocket}
 */
function connectToStream(ws_url, onContent, onError) {
    const ws = new WebSocket(ws_url);

    ws.onmessage = (event) => {
        const rawData = event.data;
        console.log("Raw WebSocket message:", rawData); // Log raw message for debugging

        if (isValidJSON(rawData)) {
            try {
                const data = JSON.parse(rawData);
                console.log("Parsed JSON data:", data); // Log parsed JSON for debugging

                if (data.error) {
                    console.error("Server error received:", data.error); // Log specific error
                    onError(data.error);
                } else if (data.content) {
                    onContent(data.content);
                } else if (data.event === "chat_ended") {
                    ws.close();
                } else if (typeof data === "string") {
                    onContent(data);
                } else if (data.message) {
                    onContent(data.message);
                } else if (typeof data === "number") {
                    // Ignore numeric messages (e.g., conversation IDs)
                    console.log("Ignoring numeric message:", data);
                    return;
                } else {
                    onError(`Unexpected JSON message format: ${JSON.stringify(data)}`);
                }
            } catch (error) {
                onError(`Failed to parse JSON message: ${error.message}`);
            }
        } else {
            // Handle non-JSON messages
            if (rawData.trim() === "." || rawData.trim() === "") {
                // Ignore single periods or empty messages
                return;
            }
            onContent(rawData);
        }
    };

    ws.onerror = () => {
        onError("WebSocket connection error");
    };

    ws.onclose = () => {
        console.log("WebSocket connection closed");
    };

    return ws;
}

export {
    sendMessage,
    connectToStream
};