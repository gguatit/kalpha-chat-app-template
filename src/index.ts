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
  "당신은 오직 운세 관련 질문(별자리, 오늘의 운세, 내일의 운세, 사주, 별자리 궁합 등)에만 답하는 친절한 한국어 어시스턴트입니다. 사용자가 운세와 관련 없는 질문을 하면 공손히 답변을 거부하고 운세 관련 질문을 하도록 안내하세요. 응답은 간결하고 이해하기 쉽게 한국어로 작성하세요.";

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

    const response = await env.AI.run(
      MODEL_ID,
      {
        messages,
        max_tokens: 1024,
      },
      {
        returnRawResponse: true,
        // Uncomment to use AI Gateway
        // gateway: {
        //   id: "YOUR_GATEWAY_ID", // Replace with your AI Gateway ID
        //   skipCache: false,      // Set to true to bypass cache
        //   cacheTtl: 3600,        // Cache time-to-live in seconds
        // },
      },
    );

    // Return streaming response
    return response;
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
