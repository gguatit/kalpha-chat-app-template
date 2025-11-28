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
const horoscopeCheckbox = document.getElementById("horoscope-checkbox");
const horoscopeTypeSelect = document.getElementById("horoscope-type");
const birthdateSelects = document.getElementById("birthdate-selects");
const birthdateYearSelect = document.getElementById("birthdate-year");
const birthdateMonthSelect = document.getElementById("birthdate-month");
const birthdateDaySelect = document.getElementById("birthdate-day");
// '오늘로 설정' 관련 코드 제거됨

// Chat state
let chatHistory = [
  {
    role: "assistant",
    content:
      "안녕하세요! 저는 생년월일을 기반으로 운세를 알려드리는 한국어 전용 도우미입니다. 생년월일을 입력하거나 UI에서 설정하시면 띠 기반의 오늘의 운세 및 간단한 추천 행동을 한국어로 안내해 드립니다.",
  },
];
let userBirthdate = null; // YYYY-MM-DD
let isProcessing = false;

// Initialize birthdate UI for mobile fallback
function isDateInputSupported() {
  try {
    const input = document.createElement("input");
    input.setAttribute("type", "date");
    const invalidValue = "not-a-date";
    input.setAttribute("value", invalidValue);
    return input.value !== invalidValue;
  } catch (e) {
    return false;
  }
}

function populateBirthdateSelects() {
  if (!birthdateYearSelect || !birthdateMonthSelect || !birthdateDaySelect) return;
  const now = new Date();
  const currentYear = now.getFullYear();
  const startYear = currentYear - 100; // last 100 years
  birthdateYearSelect.innerHTML = "<option value=''>년</option>";
  for (let y = currentYear; y >= startYear; y--) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    birthdateYearSelect.appendChild(opt);
  }
  birthdateMonthSelect.innerHTML = "<option value=''>월</option>";
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement("option");
    opt.value = String(m);
    opt.textContent = String(m).padStart(2, "0");
    birthdateMonthSelect.appendChild(opt);
  }
  // Default days
  updateDaysSelect();
}

function updateDaysSelect() {
  if (!birthdateYearSelect || !birthdateMonthSelect || !birthdateDaySelect) return;
  const y = parseInt(birthdateYearSelect.value, 10);
  const m = parseInt(birthdateMonthSelect.value, 10);
  let maxDays = 31;
  if (!isNaN(m)) {
    if ([4, 6, 9, 11].includes(m)) maxDays = 30;
    else if (m === 2) {
      if (!isNaN(y) && ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) maxDays = 29;
      else maxDays = 28;
    }
  }
  birthdateDaySelect.innerHTML = "<option value=''>일</option>";
  for (let d = 1; d <= maxDays; d++) {
    const opt = document.createElement("option");
    opt.value = String(d);
    opt.textContent = String(d).padStart(2, "0");
    birthdateDaySelect.appendChild(opt);
  }
}

function updatePreviewFromSelects() {
  if (!birthdateYearSelect || !birthdateMonthSelect || !birthdateDaySelect || !birthdateDisplay) return;
  const y = birthdateYearSelect.value;
  const m = birthdateMonthSelect.value;
  const d = birthdateDaySelect.value;
  if (y && m && d) {
    birthdateDisplay.textContent = `생년월일: ${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
}

function initBirthdateUI() {
  const supported = isDateInputSupported();
  const isSmallScreen = window && window.matchMedia && window.matchMedia('(max-width: 480px)').matches;
  if (!supported || isSmallScreen) {
    // Show selects fallback
    if (birthdateSelects) birthdateSelects.style.display = "flex";
    if (birthdateInput) birthdateInput.style.display = "none";
    populateBirthdateSelects();
    // Update days when year/month change
    if (birthdateYearSelect) birthdateYearSelect.addEventListener("change", updateDaysSelect);
    if (birthdateMonthSelect) birthdateMonthSelect.addEventListener("change", updateDaysSelect);
    if (birthdateYearSelect) birthdateYearSelect.addEventListener("change", updatePreviewFromSelects);
    if (birthdateMonthSelect) birthdateMonthSelect.addEventListener("change", updatePreviewFromSelects);
    if (birthdateDaySelect) birthdateDaySelect.addEventListener("change", updatePreviewFromSelects);
  } else {
    // Hide selects
    if (birthdateSelects) birthdateSelects.style.display = "none";
    if (birthdateInput) birthdateInput.style.display = "inline-block";
  }
}

// Initialize UI on load
document.addEventListener("DOMContentLoaded", initBirthdateUI);

// Update display when native date input changes
if (birthdateInput) {
  birthdateInput.addEventListener("change", () => {
    if (birthdateInput.value && birthdateDisplay) {
      birthdateDisplay.textContent = `생년월일: ${birthdateInput.value}`;
    }
  });
}

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

// Birthdate buttons
if (setBirthdateButton && birthdateInput) {
  setBirthdateButton.addEventListener("click", () => {
    // Determine date source depending on native support
    let val = "";
    if (birthdateInput && birthdateInput.type === "date" && birthdateInput.value) {
      val = birthdateInput.value;
    } else if (birthdateSelects && birthdateYearSelect && birthdateMonthSelect && birthdateDaySelect) {
      const y = birthdateYearSelect.value;
      const m = birthdateMonthSelect.value;
      const d = birthdateDaySelect.value;
      if (y && m && d) {
        const mm = m.padStart(2, "0");
        const dd = d.padStart(2, "0");
        val = `${y}-${mm}-${dd}`;
      }
    }
    if (!val) return;
    userBirthdate = val; // YYYY-MM-DD
    // Sync UI inputs
    if (birthdateInput && birthdateInput.type === "date" && birthdateInput.value !== val) {
      birthdateInput.value = val;
    }
    if (birthdateYearSelect && birthdateMonthSelect && birthdateDaySelect) {
      const parts = val.split("-");
      if (parts.length === 3) {
        birthdateYearSelect.value = parts[0];
        birthdateMonthSelect.value = String(parseInt(parts[1], 10));
        updateDaysSelect();
        birthdateDaySelect.value = String(parseInt(parts[2], 10));
      }
    }

    // Update display
    if (birthdateDisplay) birthdateDisplay.textContent = `생년월일: ${val}`;

    // Add or replace profile entry in chat history
    const profileIndex = chatHistory.findIndex((m) => m.content && m.content.startsWith("[생년월일]"));
    const profileMsg = { role: "user", content: `[생년월일] ${val}` };
    if (profileIndex === -1) {
      // insert after initial assistant message
      chatHistory.splice(1, 0, profileMsg);
      addMessageToChat("assistant", `생년월일이 저장되었습니다: ${val}`);
    } else {
      chatHistory[profileIndex] = profileMsg;
      addMessageToChat("assistant", `생년월일이 업데이트되었습니다: ${val}`);
    }
  });
}

if (clearBirthdateButton) {
  clearBirthdateButton.addEventListener("click", () => {
    userBirthdate = null;
    if (birthdateDisplay) birthdateDisplay.textContent = "";
    // Remove profile from chat history
    const profileIndex = chatHistory.findIndex((m) => m.content && m.content.startsWith("[생년월일]"));
    if (profileIndex !== -1) {
      chatHistory.splice(profileIndex, 1);
    }
    addMessageToChat("assistant", `생년월일이 삭제되었습니다.`);
  });
}

// 관련 코드 삭제 완료

/**
 * Sends a message to the chat API and processes the response
 */
async function sendMessage() {
  const message = userInput.value.trim();

  // Don't send empty messages
  if (message === "" || isProcessing) return;

  // Warn if message doesn't contain Korean characters
  if (!/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(message)) {
    addMessageToChat(
      "assistant",
      "알림: 이 챗봇은 한국어 전용입니다. 메시지를 한국어로 입력해 주세요. (자동으로 한국어로 답변을 시도하겠지만, 최상의 결과를 위해 한국어로 입력해 주세요.)",
    );
    // reset and exit
    userInput.value = "";
    userInput.style.height = "auto";
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    return;
  }

  // Auto-detect '운세' keyword: if message contains '운세' but the checkbox is not checked,
  // prompt user to enable the checkbox or set birthdate.
  if (/운세/.test(message) && horoscopeCheckbox && !horoscopeCheckbox.checked) {
    if (!userBirthdate) {
      addMessageToChat(
        "assistant",
        "'운세' 요청이 감지되었습니다. 운세를 요청하려면 먼저 생년월일을 설정하고, '운세 요청'을 체크하세요.",
      );
      // reset and exit
      userInput.value = "";
      userInput.style.height = "auto";
      isProcessing = false;
      userInput.disabled = false;
      sendButton.disabled = false;
      return;
    } else {
      addMessageToChat(
        "assistant",
        "운세 요청을 위해 '운세 요청' 체크박스를 활성화합니다. 계속 진행하시려면 다시 전송하세요.",
      );
      // Optionally auto-check the checkbox
      try { if (horoscopeCheckbox) horoscopeCheckbox.checked = true; } catch (e) {}
      userInput.value = "";
      userInput.style.height = "auto";
      isProcessing = false;
      userInput.disabled = false;
      sendButton.disabled = false;
      return;
    }
  }

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

  // If horoscope checkbox is checked, add horoscope request
  if (horoscopeCheckbox && horoscopeCheckbox.checked) {
    // If birthdate not set, prompt user
    if (!userBirthdate) {
      addMessageToChat(
        "assistant",
        "운세를 요청하려면 생년월일을 먼저 설정해주세요.",
      );
      // reset input and UI and return
      isProcessing = false;
      userInput.disabled = false;
      sendButton.disabled = false;
      typingIndicator.classList.remove("visible");
      return;
    }

    const type = (horoscopeTypeSelect && horoscopeTypeSelect.value) || "mixed";
    // Insert a tag message for the model to indicate an explicit horoscope request
    const horoscopeTag = { role: "user", content: `[운세|type:${type}]` };
    chatHistory.push(horoscopeTag);
  }

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
}
