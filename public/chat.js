/**
 * LLM Chat App Frontend
 *
 * Handles the chat UI interactions and communication with the backend API.
 */

// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");
const birthdateInput = document.getElementById("birthdate-input");
const setBirthdateButton = document.getElementById("set-birthdate-button");
const clearBirthdateButton = document.getElementById("clear-birthdate-button");
const birthdateDisplay = document.getElementById("birthdate-display");

// Chat state
let chatHistory = [
  {
    role: "assistant",
    content:
      "Hello! I'm an LLM chat app powered by Cloudflare Workers AI. How can I help you today?",
  },
];
let isProcessing = false;
let userBirthdate = null; // yyyy-mm-dd string

// Auto-resize textarea as user types
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

// Send message on Enter (without Shift)
userInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Send button click handler
sendButton.addEventListener("click", sendMessage);

// Birthdate set/clear handlers
setBirthdateButton.addEventListener("click", () => {
  const val = birthdateInput.value;
  if (!val) return;
  userBirthdate = val; // format: YYYY-MM-DD
  const zodiac = getZodiacFromDate(val);
  birthdateDisplay.textContent = `${val} (${zodiac})`;
  // Add assistant-like message to confirm
  addMessageToChat("assistant", `생년월일이 설정되었습니다: ${val} (별자리: ${zodiac})`);
  // Add to chat history as assistant message for records
  chatHistory.push({ role: "assistant", content: `생년월일이 설정되었습니다: ${val} (별자리: ${zodiac})` });
});

clearBirthdateButton.addEventListener("click", () => {
  userBirthdate = null;
  birthdateInput.value = "";
  birthdateDisplay.textContent = "";
  addMessageToChat("assistant", "생년월일이 삭제되었습니다.");
  chatHistory.push({ role: "assistant", content: "생년월일이 삭제되었습니다." });
});

/**
 * Returns western zodiac sign name (Korean) based on YYYY-MM-DD
 */
function getZodiacFromDate(dateString) {
  try {
    const date = new Date(dateString);
    const m = date.getMonth() + 1; // 1..12
    const d = date.getDate();
    // Zodiac ranges
    if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return "물병자리";
    if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) return "물고기자리";
    if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return "양자리";
    if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return "황소자리";
    if ((m === 5 && d >= 21) || (m === 6 && d <= 21)) return "쌍둥이자리";
    if ((m === 6 && d >= 22) || (m === 7 && d <= 22)) return "게자리";
    if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return "사자자리";
    if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return "처녀자리";
    if ((m === 9 && d >= 23) || (m === 10 && d <= 23)) return "천칭자리";
    if ((m === 10 && d >= 24) || (m === 11 && d <= 22)) return "전갈자리";
    if ((m === 11 && d >= 23) || (m === 12 && d <= 21)) return "사수자리";
    return "염소자리";
  } catch (e) {
    return "알 수 없음";
  }
}

/**
 * Sends a message to the chat API and processes the response
 */
async function sendMessage() {
  const message = userInput.value.trim();

  // Don't send empty messages
  if (message === "" || isProcessing) return;

  // Disable input while processing
  isProcessing = true;
  userInput.disabled = true;
  sendButton.disabled = true;

  // Add user message to chat
  addMessageToChat("user", message);

  // Clear input
  userInput.value = "";
  userInput.style.height = "auto";

  // Show typing indicator
  typingIndicator.classList.add("visible");

  // Add message to history
  chatHistory.push({ role: "user", content: message });

  try {
    // Create new assistant response element
    const assistantMessageEl = document.createElement("div");
    assistantMessageEl.className = "message assistant-message";
    assistantMessageEl.innerHTML = "<p></p>";
    chatMessages.appendChild(assistantMessageEl);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Send request to API
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
        body: JSON.stringify({
          messages: chatHistory,
          birthdate: userBirthdate,
        }),
    });

    // Handle errors
    if (!response.ok) {
      throw new Error("Failed to get response");
    }

    // Process streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode chunk
      const chunk = decoder.decode(value, { stream: true });

      // Process SSE format
      const lines = chunk.split("\n");
      for (const line of lines) {
        try {
          const jsonData = JSON.parse(line);
          if (jsonData.response) {
            // Append new content to existing text
            responseText += jsonData.response;
            assistantMessageEl.querySelector("p").textContent = responseText;

            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        } catch (e) {
          console.error("Error parsing JSON:", e);
        }
      }
    }

    // Add completed response to chat history
    chatHistory.push({ role: "assistant", content: responseText });
  } catch (error) {
    console.error("Error:", error);
    addMessageToChat(
      "assistant",
      "Sorry, there was an error processing your request.",
    );
  } finally {
    // Hide typing indicator
    typingIndicator.classList.remove("visible");

    // Re-enable input
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

/**
 * Helper function to add message to chat
 */
function addMessageToChat(role, content) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}-message`;
  messageEl.innerHTML = `<p>${content}</p>`;
  chatMessages.appendChild(messageEl);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // If assistant refuses due to non-horoscope question, show examples
  if (role === "assistant" && content && content.includes("운세 관련 질문")) {
    const suggestionsEl = document.createElement("div");
    suggestionsEl.className = "assistant-suggestions";
    suggestionsEl.innerHTML = `
      <p>예시 질문:</p>
      <ul>
        <li>"오늘 물병자리 운세 알려줘"</li>
        <li>"내일 사자자리 운세는 어떨까?"</li>
        <li>"이번 주 쌍둥이자리 운세 알려줘"</li>
      </ul>
    `;
    chatMessages.appendChild(suggestionsEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}
