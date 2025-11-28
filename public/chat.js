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
const birthdateIncButton = document.getElementById("birthdate-inc");
const birthdateDecButton = document.getElementById("birthdate-dec");
// Target date (운세 날짜) elements
const targetDateInput = document.getElementById("target-date-input");
const targetDateDisplay = document.getElementById("target-date-display");
const targetDateInc = document.getElementById("target-date-inc");
const targetDateDec = document.getElementById("target-date-dec");
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
let userTargetDate = null; // YYYY-MM-DD (date for which to compute horoscope - defaults to today)
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

// add or subtract days/months/years from a date string YYYY-MM-DD
function adjustDateString(dateStr, { days = 0, months = 0, years = 0 }) {
  let d;
  if (!dateStr) d = new Date(); else d = new Date(dateStr + "T00:00:00");
  if (years !== 0) d.setFullYear(d.getFullYear() + years);
  if (months !== 0) d.setMonth(d.getMonth() + months);
  if (days !== 0) d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysToInput(days) {
  if (!birthdateInput) return;
  const current = birthdateInput.value || userBirthdate || null;
  const next = adjustDateString(current, { days });
  birthdateInput.value = next;
  if (birthdateDisplay) birthdateDisplay.textContent = `생년월일: ${next}`;
  // do not auto-push to chatHistory; user should click '설정' to store
  // Sync selects in case they are visible
  if (birthdateYearSelect && birthdateMonthSelect && birthdateDaySelect) {
    const parts = next.split("-");
    birthdateYearSelect.value = parts[0];
    birthdateMonthSelect.value = String(parseInt(parts[1], 10));
    updateDaysSelect();
    birthdateDaySelect.value = String(parseInt(parts[2], 10));
    updatePreviewFromSelects();
  }
}

function initBirthdateUI() {
  // Use native date pickers when available (modern mobile browsers support them);
  // fallback to selects only if input[type=date] is not supported.
  const supported = isDateInputSupported();
  if (!supported) {
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

// Mobile UX: When input or birthdate inputs have focus, ensure the chat scrolls to bottom
function ensureScrollToBottomLater() {
  setTimeout(() => { if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight; }, 350);
}

if (userInput) {
  userInput.addEventListener('focus', ensureScrollToBottomLater);
}
if (birthdateInput) {
  birthdateInput.addEventListener('focus', ensureScrollToBottomLater);
}
if (targetDateInput) {
  targetDateInput.addEventListener('focus', ensureScrollToBottomLater);
}

// Allow tapping the messages area to focus the input on mobile
if (chatMessages) {
  chatMessages.addEventListener('click', () => {
    try { if (userInput) userInput.focus(); } catch (e) {}
    ensureScrollToBottomLater();
  });
}

// Mobile toolbar handlers
const toolbarDob = document.getElementById('toolbar-dob');
const toolbarHoroscope = document.getElementById('toolbar-horoscope');
const toolbarFocus = document.getElementById('toolbar-focus');

if (toolbarDob) {
  toolbarDob.addEventListener('click', () => {
    // If native date input is shown, focus it; otherwise toggle selects visibility
    if (birthdateInput && birthdateInput.style.display !== 'none') {
      try { birthdateInput.focus(); } catch (e) {}
    } else if (birthdateSelects) {
      // toggle select visibility quickly
      birthdateSelects.style.display = birthdateSelects.style.display === 'none' ? 'flex' : 'none';
      // Scroll to bottom so the selects are visible
      ensureScrollToBottomLater();
    }
  });
}

if (toolbarHoroscope) {
  toolbarHoroscope.addEventListener('click', () => {
    if (!horoscopeCheckbox) return;
    horoscopeCheckbox.checked = !horoscopeCheckbox.checked;
    addMessageToChat('assistant', `운세 요청이 ${horoscopeCheckbox.checked ? '활성화' : '비활성화'}되었습니다.`);
    // If enabling and birthdate is set, optionally auto-trigger (small hint only)
    if (horoscopeCheckbox.checked && userBirthdate) {
      addMessageToChat('assistant', '생년월일이 설정되어 있어 자동으로 운세 요청을 실행합니다.');
    }
  });
}

if (toolbarFocus) {
  toolbarFocus.addEventListener('click', () => {
    try { if (userInput) userInput.focus(); } catch (e) {}
    ensureScrollToBottomLater();
  });
}

// Initialize target date to today
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
if (targetDateInput) {
  const defaultToday = todayStr();
  targetDateInput.value = defaultToday;
  userTargetDate = defaultToday;
  if (targetDateDisplay) targetDateDisplay.textContent = `운세 날짜: ${defaultToday}`;
  targetDateInput.addEventListener("change", () => {
    if (targetDateInput.value) {
      userTargetDate = targetDateInput.value;
      if (targetDateDisplay) targetDateDisplay.textContent = `운세 날짜: ${targetDateInput.value}`;
    }
  });
}

// Update display when native date input changes
if (birthdateInput) {
  birthdateInput.addEventListener("change", () => {
    if (birthdateInput.value && birthdateDisplay) {
      birthdateDisplay.textContent = `생년월일: ${birthdateInput.value}`;
    }
    // Also update selects if present
    if (birthdateYearSelect && birthdateMonthSelect && birthdateDaySelect) {
      const parts = (birthdateInput && birthdateInput.value) ? birthdateInput.value.split("-") : [];
      if (parts.length === 3) {
        birthdateYearSelect.value = parts[0];
        birthdateMonthSelect.value = String(parseInt(parts[1], 10));
        updateDaysSelect();
        birthdateDaySelect.value = String(parseInt(parts[2], 10));
      }
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

// Set and clear target date (manual controls)
if (targetDateDec) {
  targetDateDec.addEventListener("click", () => addDaysToTarget(-1));
}
if (targetDateInc) {
  targetDateInc.addEventListener("click", () => addDaysToTarget(1));
}

function addDaysToTarget(days) {
  if (!targetDateInput) return;
  const current = targetDateInput.value || userTargetDate || todayStr();
  const next = adjustDateString(current, { days });
  targetDateInput.value = next;
  userTargetDate = next;
  if (targetDateDisplay) targetDateDisplay.textContent = `운세 날짜: ${next}`;
}

// Desktop increment / decrement buttons behavior
if (birthdateIncButton) {
  birthdateIncButton.addEventListener("click", () => {
    addDaysToInput(1);
  });
}
if (birthdateDecButton) {
  birthdateDecButton.addEventListener("click", () => {
    addDaysToInput(-1);
  });
}

// Keyboard shortcuts when focusing date input
if (birthdateInput) {
  birthdateInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (e.shiftKey) addDaysToInput(30); // shift+up -> next month approx
      else if (e.ctrlKey || e.metaKey) addDaysToInput(365); // ctrl+up -> next year
      else addDaysToInput(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (e.shiftKey) addDaysToInput(-30);
      else if (e.ctrlKey || e.metaKey) addDaysToInput(-365);
      else addDaysToInput(-1);
    }
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
      // Auto-enable and proceed immediately — user has birthdate set
      try { if (horoscopeCheckbox) horoscopeCheckbox.checked = true; } catch (e) {}
      // Brief feedback (non-blocking)
      addMessageToChat(
        "assistant",
        "생년월일이 등록되어 있어 자동으로 운세를 요청합니다.",
      );
      // Continue processing, do not return; the usual flow will append the tag and send
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

  // Ensure DOB and Target Date are in the history so the assistant can reference both
  // Add [생년월일] if userBirthdate present and no such message exists
  if (userBirthdate) {
    const existingDob = chatHistory.some((m) => m.role === "user" && m.content && m.content.startsWith("[생년월일]"));
    if (!existingDob) {
      chatHistory.splice(1, 0, { role: "user", content: `[생년월일] ${userBirthdate}` });
    }
  }
  // Add [운세날짜] target date if present and not already in history
  if (userTargetDate) {
    const existingTarget = chatHistory.some((m) => m.role === "user" && m.content && m.content.startsWith("[운세날짜]"));
    if (!existingTarget) {
      chatHistory.splice(2, 0, { role: "user", content: `[운세날짜] ${userTargetDate}` });
    }
  }

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

    // sanitize flag
    let sanitizedOnce = false;
    const containsForbiddenScript = (text) => /[A-Za-z\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF]/.test(text);

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

    // If response contains forbidden scripts (e.g., 한자/일본어/라틴/키릴), request a rewrite once
    if (containsForbiddenScript(responseText) && !sanitizedOnce) {
      sanitizedOnce = true;
      // Briefly notify user that we are auto-correcting
      addMessageToChat("assistant", "응답에 외래 문자 또는 섞인 문자가 포함되어 있어 자동으로 한글로 재작성 요청합니다...");

      // Add a user instruction to re-write the assistant content in Korean only
      const rewriteInstruction = {
        role: "user",
        content: `다음 텍스트를 한글(한글+숫자+기호)만 사용하여 재작성해 주세요. 원문: ${responseText}`,
      };
      // Push rewrite instruction to history and request a corrected response
      chatHistory.push(rewriteInstruction);

      // Fetch corrected response (synchronous: not streaming to keep it simple)
      try {
        const correctedResp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatHistory }),
        });
        if (correctedResp.ok) {
          const correctedText = await correctedResp.text();
          // correctedResp returns streaming SSE lines, but for simplicity, if backend returns streaming SSE, it may not be parsed here.
          // If it's raw text, parse JSON or fallback to plain text.
          // We'll try to extract any JSON lines with 'response' fields.
          let corrected = "";
          try {
            const parts = correctedText.split("\n");
            for (const p of parts) {
              try {
                const j = JSON.parse(p);
                if (j.response) corrected += j.response;
              } catch (e) {
                // ignore
              }
            }
          } catch (e) {
            corrected = correctedText;
          }
          if (!corrected) corrected = responseText; // fallback
          // Replace assistant message with corrected
          assistantMessageEl.querySelector("p").textContent = corrected;
          // Add corrected message to chat history
          chatHistory.push({ role: "assistant", content: corrected });
        } else {
          // could not fetch corrected response – keep original
          chatHistory.push({ role: "assistant", content: responseText });
        }
      } catch (e) {
        console.error("Error fetching corrected response:", e);
        chatHistory.push({ role: "assistant", content: responseText });
      }
    } else {
      // Add completed response to chat history
      chatHistory.push({ role: "assistant", content: responseText });
    }
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
