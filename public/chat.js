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
const targetDateToday = document.getElementById("target-date-today");
// '오늘로 설정' 관련 코드 제거됨

// Auth elements
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const authModal = document.getElementById("auth-modal");
const authTitle = document.getElementById("auth-title");
const authForm = document.getElementById("auth-form");
const authUsernameInput = document.getElementById("auth-username");
const authPasswordInput = document.getElementById("auth-password");
const togglePasswordCheck = document.getElementById("toggle-password-check");
const authBirthdateInput = document.getElementById("auth-birthdate");
const authCancelBtn = document.getElementById("auth-cancel");
const authMessage = document.getElementById("auth-message");

let authToken = localStorage.getItem("authToken");
let authUser = localStorage.getItem("authUser");

if (togglePasswordCheck) {
  togglePasswordCheck.addEventListener("change", () => {
    authPasswordInput.setAttribute("type", togglePasswordCheck.checked ? "text" : "password");
  });
}

function updateAuthUI() {
  if (authToken && authUser) {
    loginBtn.style.display = "none";
    signupBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInfo.style.display = "inline-block";
    userInfo.textContent = `${authUser}님`;
    
    // 로그인 상태: 채팅 기능 활성화
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.placeholder = "메시지를 입력하세요...";
  } else {
    loginBtn.style.display = "inline-block";
    signupBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userInfo.style.display = "none";
    
    // 로그아웃 상태: 채팅 기능 비활성화
    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.placeholder = "로그인이 필요합니다";
  }
}

loginBtn.addEventListener("click", () => {
  authModal.style.display = "flex";
  authTitle.textContent = "로그인";
  authBirthdateInput.style.display = "none";
  authBirthdateInput.required = false;
  authForm.dataset.mode = "login";
  authMessage.textContent = "";
});

signupBtn.addEventListener("click", () => {
  authModal.style.display = "flex";
  authTitle.textContent = "회원가입";
  authBirthdateInput.style.display = "block";
  authBirthdateInput.required = false; // Optional
  authForm.dataset.mode = "signup";
  authMessage.textContent = "";
});

authCancelBtn.addEventListener("click", () => {
  authModal.style.display = "none";
});

logoutBtn.addEventListener("click", () => {
  authToken = null;
  authUser = null;
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
  // Clear birthdate if it came from user profile
  // But maybe user wants to keep it? Let's keep it for now or clear it?
  // Let's clear it to be safe
  userBirthdate = null;
  localStorage.removeItem("userBirthdate");
  if (birthdateDisplay) birthdateDisplay.textContent = "";
  if (birthdateInput) birthdateInput.value = "";
  
  updateAuthUI();
  addMessageToChat("assistant", "로그아웃되었습니다.");
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const mode = authForm.dataset.mode;
  const username = authUsernameInput.value;
  const password = authPasswordInput.value;
  const birthdateRaw = authBirthdateInput.value;
  
  let birthdate = null;
  if (birthdateRaw && birthdateRaw.length === 8) {
    birthdate = formatBirthdate(birthdateRaw);
  }

  const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
  
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, birthdate })
    });
    
    if (res.ok) {
      const data = await res.json();
      if (mode === "login") {
        authToken = data.token;
        authUser = data.username;
        localStorage.setItem("authToken", authToken);
        localStorage.setItem("authUser", authUser);
        
        if (data.birthdate) {
          userBirthdate = data.birthdate;
          localStorage.setItem("userBirthdate", userBirthdate);
          if (birthdateDisplay) birthdateDisplay.textContent = `생년월일: ${userBirthdate}`;
          if (birthdateInput) birthdateInput.value = unformatBirthdate(userBirthdate);
        }
        
        updateAuthUI();
        authModal.style.display = "none";
        addMessageToChat("assistant", `${authUser}님, 환영합니다!`);
      } else {
        // Signup success, switch to login
        authMessage.style.color = "green";
        authMessage.textContent = "회원가입 성공! 로그인해주세요.";
        setTimeout(() => {
            authTitle.textContent = "로그인";
            authBirthdateInput.style.display = "none";
            authForm.dataset.mode = "login";
            authMessage.textContent = "";
            authPasswordInput.value = "";
        }, 1500);
      }
    } else {
      const errText = await res.text();
      authMessage.style.color = "red";
      authMessage.textContent = `오류: ${errText}`;
      // Visual feedback
      if (mode === "login") {
          authUsernameInput.style.borderColor = "red";
          authPasswordInput.style.borderColor = "red";
          setTimeout(() => {
              authUsernameInput.style.borderColor = "#ddd";
              authPasswordInput.style.borderColor = "#ddd";
          }, 2000);
      }
    }
  } catch (err) {
    authMessage.style.color = "red";
    authMessage.textContent = "서버 통신 오류";
  }
});

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

// Load history from local storage
function loadHistory() {
  const saved = localStorage.getItem("chatHistory");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        chatHistory = parsed;
        // Rebuild UI
        chatMessages.innerHTML = "";
        chatHistory.forEach(msg => {
          if (msg.role !== "system" && !msg.content.startsWith("[운세|") && !msg.content.startsWith("[생년월일]") && !msg.content.startsWith("[운세날짜]")) {
             addMessageToChat(msg.role, msg.content);
          }
        });
        // Add initial message if empty
        if (chatMessages.children.length === 0) {
             addMessageToChat("assistant", "안녕하세요! 저는 생년월일을 기반으로 운세를 알려드리는 한국어 전용 도우미입니다. 생년월일을 입력하거나 UI에서 설정하시면 띠 기반의 오늘의 운세 및 간단한 추천 행동을 한국어로 안내해 드립니다.");
        }
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }
  
  const savedBirthdate = localStorage.getItem("userBirthdate");
  if (savedBirthdate) {
    userBirthdate = savedBirthdate;
    if (birthdateDisplay) birthdateDisplay.textContent = `생년월일: ${userBirthdate}`;
    if (birthdateInput) birthdateInput.value = unformatBirthdate(userBirthdate);
  }
}

function saveHistory() {
  localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
  if (userBirthdate) localStorage.setItem("userBirthdate", userBirthdate);
  else localStorage.removeItem("userBirthdate");
}

// Initialize birthdate UI for mobile fallback
function isDateInputSupported() {
  // Always return true to force using the single input field, 
  // but we are now using type="text" with inputmode="numeric" for everyone.
  return true;
}

function populateBirthdateSelects() {
  // Deprecated: Selects are no longer used as primary input
}

function updateDaysSelect() {
  // Deprecated
}

function updatePreviewFromSelects() {
  // Deprecated
}

// Helper: Convert YYYYMMDD to YYYY-MM-DD
function formatBirthdate(val) {
  if (!val || val.length !== 8) return null;
  const y = val.substring(0, 4);
  const m = val.substring(4, 6);
  const d = val.substring(6, 8);
  // Basic validation
  const numM = parseInt(m, 10);
  const numD = parseInt(d, 10);
  if (numM < 1 || numM > 12) return null;
  if (numD < 1 || numD > 31) return null;
  return `${y}-${m}-${d}`;
}

// Helper: Convert YYYY-MM-DD to YYYYMMDD
function unformatBirthdate(val) {
  if (!val) return "";
  return val.replace(/-/g, "");
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
  // Current value in input is YYYYMMDD, userBirthdate is YYYY-MM-DD
  let current = userBirthdate || null;
  
  // If user manually typed something valid in input but didn't click set, try to use it
  if (birthdateInput.value && birthdateInput.value.length === 8) {
      const formatted = formatBirthdate(birthdateInput.value);
      if (formatted) current = formatted;
  }

  const next = adjustDateString(current, { days });
  userBirthdate = next; // Update internal state immediately for buttons
  birthdateInput.value = unformatBirthdate(next);
  
  if (birthdateDisplay) birthdateDisplay.textContent = `생년월일: ${next}`;
}

function initBirthdateUI() {
  // Force display of input, hide selects
  if (birthdateSelects) birthdateSelects.style.display = "none";
  if (birthdateInput) {
      birthdateInput.style.display = "inline-block";
      // Ensure attributes are set for numeric keypad
      birthdateInput.setAttribute("type", "text");
      birthdateInput.setAttribute("inputmode", "numeric");
      birthdateInput.setAttribute("pattern", "[0-9]*");
      birthdateInput.setAttribute("placeholder", "YYYYMMDD");
      birthdateInput.setAttribute("maxlength", "8");
  }
}

// Initialize UI on load
document.addEventListener("DOMContentLoaded", () => {
  initBirthdateUI();
  loadHistory();
  updateAuthUI();
});

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

// Controls panel toggle (small gear icon in controls bar)
const controlsToggle = document.getElementById('controls-toggle');
const controlsPanel = document.getElementById('controls-panel');
if (controlsToggle && controlsPanel) {
  controlsToggle.addEventListener('click', () => {
    const isVisible = controlsPanel.style.display === 'flex' || controlsPanel.style.display === 'block';
    controlsPanel.style.display = isVisible ? 'none' : 'flex';
    controlsToggle.setAttribute('aria-expanded', String(!isVisible));
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
  birthdateInput.addEventListener("input", () => {
    // Allow only numbers
    birthdateInput.value = birthdateInput.value.replace(/[^0-9]/g, '');
    
    if (birthdateInput.value.length === 8) {
      const formatted = formatBirthdate(birthdateInput.value);
      if (formatted && birthdateDisplay) {
        birthdateDisplay.textContent = `생년월일: ${formatted}`;
      } else if (birthdateDisplay) {
        birthdateDisplay.textContent = `생년월일: (유효하지 않음)`;
      }
    } else {
        if (birthdateDisplay) birthdateDisplay.textContent = `생년월일: 입력중...`;
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
    if (birthdateInput && birthdateInput.value) {
      // Try to parse YYYYMMDD
      if (birthdateInput.value.length === 8) {
          val = formatBirthdate(birthdateInput.value);
      }
    }
    
    if (!val) {
        addMessageToChat("assistant", "생년월일을 올바른 형식(YYYYMMDD, 예: 20080301)으로 입력해주세요.");
        return;
    }
    
    userBirthdate = val; // YYYY-MM-DD
    
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
    saveHistory();
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
    saveHistory();
  });
}

// Set and clear target date (manual controls)
if (targetDateDec) {
  targetDateDec.addEventListener("click", () => addDaysToTarget(-1));
}
if (targetDateInc) {
  targetDateInc.addEventListener("click", () => addDaysToTarget(1));
}

if (targetDateToday) {
  targetDateToday.addEventListener("click", () => {
    const today = todayStr();
    if (targetDateInput) targetDateInput.value = today;
    userTargetDate = today;
    if (targetDateDisplay) targetDateDisplay.textContent = `운세 날짜: ${today}`;
  });
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

  // 인증 확인
  if (!authToken) {
    addMessageToChat("assistant", "로그인이 필요합니다. 로그인 후 다시 시도해주세요.");
    return;
  }

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
  saveHistory();

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
      // If user is logged in but birthdate is missing in local state, try to fetch from profile
      if (authToken) {
         // This case should be handled by login, but as a fallback:
         addMessageToChat(
          "assistant",
          "운세를 요청하려면 생년월일을 먼저 설정해주세요.",
        );
      } else {
        addMessageToChat(
          "assistant",
          "운세를 요청하려면 생년월일을 먼저 설정하거나 로그인해주세요.",
        );
      }
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
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({
          messages: chatHistory,
      }),
    });

    // Handle errors
    if (!response.ok) {
      if (response.status === 401) {
        // 인증 토큰이 만료되거나 유효하지 않음
        authToken = null;
        authUser = null;
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        updateAuthUI();
        addMessageToChat("assistant", "세션이 만료되었습니다. 다시 로그인해주세요.");
        typingIndicator.classList.remove("visible");
        isProcessing = false;
        return;
      }
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
        if (!line.trim()) continue;
        let jsonStr = line;
        if (line.startsWith("data: ")) {
          jsonStr = line.slice(6);
        }
        if (jsonStr.trim() === "[DONE]") continue;

        try {
          const jsonData = JSON.parse(jsonStr);
          if (jsonData.response) {
            // Append new content to existing text
            responseText += jsonData.response;
            assistantMessageEl.querySelector("p").textContent = responseText;

            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        } catch (e) {
          // console.error("Error parsing JSON:", e);
        }
      }
    }

    chatHistory.push({ role: "assistant", content: responseText });
    saveHistory();

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
