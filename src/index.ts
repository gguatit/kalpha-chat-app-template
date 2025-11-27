/**
 * LLM Chat Application Template
 *
 * A simple chat application using Cloudflare Workers AI.
 * This template demonstrates how to implement an LLM-powered chat interface with
 * streaming responses using Server-Sent Events (SSE).
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
// https://developers.cloudflare.com/workers-ai/models/
const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// Default system prompt (Korean) - make assistant behave as a horoscope-only bot
const SYSTEM_PROMPT =
  "당신은 오직 운세 관련 질문(별자리, 오늘의 운세, 내일의 운세, 사주, 별자리 궁합 등)에만 답하는 친절한 한국어 어시스턴트입니다. 사용자가 운세와 관련 없는 질문을 하면 공손히 답변을 거부하고 운세 관련 질문을 하도록 안내하세요. 응답은 간결하고 이해하기 쉽게 한국어로 작성하세요. 또한, 응답에 절대 내부 모델 ID(@cf/...)나 시스템 메타데이터 같은 구현 세부사항을 포함하지 마세요.";

// Keywords used to determine whether a user message is a horoscope-related query
const HOROSCOPE_KEYWORDS = [
  "운세",
  "오늘의 운세",
  "내일의 운세",
  "별자리",
  "사주",
  "궁합",
  "별자리 운세",
  "별자리 오늘",
  "띠",
  "운명",
  "점",
  "타로",
  "별점",
  "운",
  // Korean zodiac / western zodiac signs
  "물병자리",
  "물고기자리",
  "양자리",
  "황소자리",
  "쌍둥이자리",
  "게자리",
  "사자자리",
  "처녀자리",
  "천칭자리",
  "전갈자리",
  "사수자리",
  "염소자리",
];

export default {
  /**
   * Main request handler for the Worker
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle static assets (frontend)
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API Routes
    if (url.pathname === "/api/chat") {
      // Handle POST requests for chat
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }

      // Method not allowed for other request types
      return new Response("Method not allowed", { status: 405 });
    }

    // Handle 404 for unmatched routes
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    // Parse JSON request body (messages + optional birthdate)
    const { messages = [], birthdate } = (await request.json()) as {
      messages: ChatMessage[];
      birthdate?: string | null;
    };

    // Add system prompt if not present
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    // If a birthdate was provided, compute zodiac and add to system context
    if (birthdate) {
      const zodiac = getZodiacSignFromDate(birthdate);
      const birthContext = `사용자 생년월일: ${birthdate} (별자리: ${zodiac})`;
      // Add as a system message as additional context
      messages.unshift({ role: "system", content: birthContext });
    }

    // Simple heuristic to check whether the latest user query is horoscope-related
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const isHoroscopeQuery = (() => {
      if (!lastUserMessage) return false;
      const text = lastUserMessage.content.toLowerCase();
      return HOROSCOPE_KEYWORDS.some((kw) => text.includes(kw));
    })();

    // If it's not a horoscope-related question, return a single streaming
    // assistant message that politely refuses and asks for a horoscope-related question.
    if (!isHoroscopeQuery) {
      const politeMsg =
        "죄송합니다. 이 챗봇은 운세 관련 질문에만 답변합니다. 운세(예: 오늘의 운세, 별자리, 사주, 궁합)와 관련된 질문을 해주세요.";

      // Stream a single JSON line that the frontend understands (newline-delimited JSON)
      const stream = new ReadableStream({
        start(controller) {
          const payload = JSON.stringify({ response: politeMsg }) + "\n";
          controller.enqueue(new TextEncoder().encode(payload));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { "content-type": "text/event-stream; charset=utf-8" },
      });
    }

    // 1) Generate initial answer (non-streaming so we can validate)
    const generation = await env.AI.run(MODEL_ID, {
      messages,
      max_tokens: 1024,
    });

    // extract text safely
    const initialText = (generation as any)?.response ?? (generation as any)?.output?.response ?? "";

    // 2) Validate/Rewrite to Korean if needed using additional verifier calls
    const finalText = await ensureKoreanAndGrammar(env, MODEL_ID, initialText);

    // Remove any accidental model ID mentions (e.g., @cf/...) before returning
    const sanitizedFinal = finalText.replace(/@cf\/[\S]+/g, '').replace(/\s{2,}/g, ' ').trim();

    // 3) Stream the final validated answer back to the client as newline-delimited JSON
    const stream = new ReadableStream({
      start(controller) {
        const payload = JSON.stringify({ response: sanitizedFinal }) + "\n";
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "content-type": "text/event-stream; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error processing chat request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}

/**
 * Runs a validation flow to ensure the model text is Korean and grammatically correct.
 * If the text is not valid, ask the model to rewrite in Korean.
 */
async function ensureKoreanAndGrammar(
  env: Env,
  text: string,
  maxAttempts = 3,
): Promise<string> {
  // Quick check for Hangul characters (Korean)
  function containsHangul(t: string) {
    return /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/u.test(t);
  }

  // If there's no Hangul at all, we immediately request a rewrite
  let current = text;
  for (let i = 0; i < maxAttempts; i++) {
    // If it contains hangul, attempt to validate with the model (grammar and naturalness)
    const verifierSystem =
      "당신은 한국어 문법 검증자입니다. 다음 텍스트가 완전한 한국어(문법, 어순, 자연스러운 표현)인지 검사하세요. 만약 완벽하면 JSON으로 {\"status\":\"ok\", \"text\": \"원본 텍스트\"} 를 출력하세요. 만약 한국어가 아니거나 문법적 오류가 있거나 어색한 표현이 있다면, JSON으로 {\"status\":\"rewrite\", \"text\": \"수정된 한국어 텍스트\"} 를 출력하세요. 절대 다른 설명을 섞어 출력하지 마세요.";
    // 추가 규칙: 어떤 경우든 모델 ID(@cf/...)나 "모델 이름" 같은 시스템 메타데이터를 포함하면 안 된다.
    // 재작성 요구시, 그러한 식별자는 반드시 제거하여 응답에 포함하지 마세요.
    const verifierSystemAdvised = verifierSystem +
      " 추가 규칙: 응답에 내부 모델 ID(@cf/...)나 구현 세부사항(모델 이름, 버전 등)을 절대 포함하지 마세요. 재작성시 해당 정보를 제거하십시오.";

    const verifierMessages = [
      { role: "system", content: verifierSystem + " 추가 규칙: 응답에 내부 모델 ID(@cf/...)나 구현 세부사항(모델 이름, 버전 등)을 절대 포함하지 마세요. 재작성시 해당 정보를 제거하십시오." },
      {
        role: "user",
        content: `검증/교정할 텍스트입니다:\n\n${current}`,
      },
    ];

    const verification = await env.AI.run(MODEL_ID, {
      messages: verifierMessages,
      max_tokens: 512,
    });
    const verificationText = (verification as any)?.response ?? "";

    // Try to parse JSON - expected {status, text}
    let parsed: { status?: string; text?: string } | null = null;
    try {
      parsed = JSON.parse(verificationText);
    } catch (e) {
      // Fallback: if verificationText is just 'OK' or contains 'ok', treat as ok
      const t = verificationText.trim();
      if (/^ok$/i.test(t)) {
        return current;
      }
    }

    if (parsed && parsed.status === "ok") {
      // Make sure the 'text' contains Hangul
      return parsed.text ?? current;
    }

    if (parsed && parsed.status === "rewrite" && parsed.text) {
      // If the model suggests a rewrite, update current and loop again to validate the rewrite
      current = parsed.text;
      if (!containsHangul(current)) {
        // If still not Korean, keep looping but this likely won't help
        continue;
      }
      // continue loop to re-validate the rewritten version
      continue;
    }

    // If we failed to parse JSON, fallback heuristics: if verificationText contains Hangul, treat it as rewritten
    if (containsHangul(verificationText)) {
      current = verificationText;
      continue;
    }

    // Last resort: if we ran out of attempts or no rewrite found, return current
  }

  return current;
}

// Helper: determine western zodiac sign name (Korean)
function getZodiacSignFromDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return "물병자리";
    if ((m === 2 && day >= 19) || (m === 3 && day <= 20)) return "물고기자리";
    if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return "양자리";
    if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return "황소자리";
    if ((m === 5 && day >= 21) || (m === 6 && day <= 21)) return "쌍둥이자리";
    if ((m === 6 && day >= 22) || (m === 7 && day <= 22)) return "게자리";
    if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return "사자자리";
    if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return "처녀자리";
    if ((m === 9 && day >= 23) || (m === 10 && day <= 23)) return "천칭자리";
    if ((m === 10 && day >= 24) || (m === 11 && day <= 22)) return "전갈자리";
    if ((m === 11 && day >= 23) || (m === 12 && day <= 21)) return "사수자리";
    return "염소자리";
  } catch (e) {
    return "알 수 없음";
  }
}
