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
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      role: "user",
      content,
      model: "gpt-4.1-nano",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to send message: ${response.status} - ${await response.text()}`,
    );
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
    console.log("Raw WebSocket message:", rawData);

    if (isValidJSON(rawData)) {
      try {
        const data = JSON.parse(rawData);
        console.log("Parsed JSON data:", data);

        if (data.error) {
          console.error("Server error received:", data.error);
          onError(data.error);
        } else if (data.content) {
          // Handle structured or plain content
          if (data.type) {
            // Structured response with type
            switch (data.type) {
              case "text":
                onContent(`<p>${data.content}</p>`);
                break;
              case "code":
                onContent(`<pre><code>${data.content}</code></pre>`);
                break;
              case "formula":
                onContent(`<span class="formula">${data.content}</span>`);
                break;
              default:
                onContent(data.content);
            }
          } else {
            // Fallback for plain text
            onContent(data.content);
          }
        } else if (data.event === "chat_ended") {
          ws.close();
        } else if (typeof data === "string") {
          onContent(data);
        } else if (data.message) {
          onContent(data.message);
        } else if (typeof data === "number") {
          console.log("Ignoring numeric message:", data);
          return;
        } else {
          onError(`Unexpected JSON message format: ${JSON.stringify(data)}`);
        }
      } catch (error) {
        onError(`Failed to parse JSON message: ${error.message}`);
      }
    } else {
      if (rawData.trim() === "." || rawData.trim() === "") {
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

export { sendMessage, connectToStream };
