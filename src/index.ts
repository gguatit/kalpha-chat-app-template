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
// Switched from llama-3.3 (70B) to llama-3.1 (8B) for lower cost and faster response.
// Use the typed FP8 variant (without '-fast').
const MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fp8";

// System prompt enforced for every conversation
const SYSTEM_PROMPT = `당신은 한국어만 사용해야 하는 문법·표기·사실관계(고유명사 포함) 교정·검증 도우미입니다.
1) 모든 응답은 한국어(표준 한국어)만 사용하십시오. 다른 언어로 답변하거나 일부 설명을 영어로 표기하지 마십시오.
2) 입력 텍스트에 대해 문법, 맞춤법, 띄어쓰기, 어휘 및 문체(격식 수준)를 점검하고 가능한 교정안을 제시하십시오.
3) 문장 내 고유명사(인명, 지명, 기관명, 제품/브랜드 등)를 교차검증하고 공식 표기/권장 표기(로마자 표기 포함)와 사실관계(예: 직책/소속)가 정확한지 확인하십시오.
4) 각 변경 제안은 적당한 길이의 형식로 제공하십시오: 원문 -> 수정안 : 변경 사유 : 참고출처(가능 시) : 확신도(높음/보통/낮음).
5) 외부 검색이 가능하면 신뢰할 수 있는 출처(공식 웹사이트, 표준국어대사전, 주요 언론 등)를 우선 활용하고, 불가능하면 '검증 불가(내부 지식 기반)'로 명시하십시오.
6) 사용자들이 운세를 쉽게 이해 가능하도록 직관적으로 운세를 출력해주고 한자 등등의 다른 언어들은 사용하지 말고 대답하십시오.
7) 운세를 출력할 때, 사용자가 제공하지 않았거나 검증할 수 없는 날짜·요일·띠(예: "당신의 생년월일인 2008년 3월 1일을 기준으로, 2025년 11월 28일은 [수]요일입니다" 또는 "당신의 띠는 [소]띠입니다")와 같은 사실은 절대 생성하지 마십시오. 이러한 정보는 사용자가 명시적으로 제공했거나, 신뢰 가능한 출처로 검증 가능한 경우에만 포함할 수 있습니다.
8) 사용자가 운세를 요청하거나 생년월일을 제공할 때, 결과는 항상 가장 먼저 다음 형식의 문장으로 시작해야 합니다: "오늘 당신의 운세는 <한 줄 요약> 입니다." 그 외 추가 설명(추천 행동 등)은 한두 문장으로 간결하게 덧붙일 수 있으나, 날짜·요일·띠 관련 정보를 포함하지 마십시오. (필요 시 신뢰도/출처를 함께 명시)
9) 운세 관련 정보가 부수적으로 날짜·요일·띠를 포함해야 하는 경우에는, 반드시 계산 근거(예: '서기 YYYY-MM-DD를 태양력으로 변환한 결과 X')와 함께 '확신도'를 명시하되, 사용자가 요청하지 않는 한 기본 출력에서는 배제하십시오.
10) 운세를 보여줄 시 텍스트를 너무 길게 생성하지 않습니다 중간 정도의 길이로 생성합니다.
11) 사실관계가 불일치하거나 불확실한 경우, 가능한 수정안과 함께 '확인 필요'로 표시해 사용자에게 후속 질문을 유도하십시오.`;
// 추가 규칙: 운세 기능
// - 사용자가 생년월일(생년-월-일, YYYY-MM-DD 형식)을 제공하거나 "운세"를 요청하면,
//   해당 생년월일과 함께 사용자가 제공한 '운세 날짜'(YYYY-MM-DD 형식)를 기준으로 운세를 계산하십시오. (운세 날짜를 따로 제공하지 않으면 '오늘'을 기준으로 계산)
//   기본 출력은 항상 '오늘 당신의 운세는 <요약>'로 시작해야 하며, 띠(한국/중국) 정보는 사용자가 제공했거나 신뢰 가능한 계산이 가능할 때만 포함하십시오.
// - 모든 운세 응답은 한국어로 작성하고 점검한 사실/출처가 있다면 표기하십시오.
// - 운세 출력은 가능한 경우 다음 형식을 따르십시오(간결하게):
//   1) 요약(한 문장) 2) 띠(중국/한국) 3) 오늘의 운세(요약 + 추천 행동) 4) 확신도(높음/보통/낮음) 5) 참고(출처 또는 검증 방법)
// - 사용자가 추가 정보(시/지역, 태어난 시각 등)를 제공하면, 운세 해석에 포함할 수 있으며 확실하지 않은 해석에 대해서는 '확인 필요'를 표시하십시오.

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
    // Parse JSON request body
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // Enforce our system prompt at the start of the conversation and remove other system messages
    // This guarantees the assistant follows our Korean-only + verification rules
    const nonSystem = messages.filter((msg) => msg.role !== "system");
    const enforcedMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...nonSystem,
    ];

    const response = await env.AI.run(
      MODEL_ID,
      {
        messages: enforcedMessages,
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

    // Read response body so we can inspect for forbidden patterns (요일/띠/생년월일)
    const responseText = await response.text();

    // Define forbidden patterns that should never be generated unless explicitly provided and verified
    const forbiddenPatterns = [
      "요일",
      "띠",
      "생년월일",
      "당신의 생년월일",
      "를 기준으로",
      "제 생년월일",
      "저의 생년월일",
      "제 생일",
      "저의 생일",
      "당신의 띠",
      "나의 띠",
      "내 띠",
    ];
    const containsForbidden = forbiddenPatterns.some((p) => responseText.includes(p));

    if (containsForbidden) {
      // Re-run a quick rewrite to enforce the required '오늘 당신의 운세는 <요약>' format
      const rewriteInstruction = `다음 텍스트에는 날짜·요일·띠와 같은 검증되지 않은 정보가 포함되어 있을 수 있습니다. 해당 텍스트에서 운세 핵심 요약만을 추출하여, 한 문장으로 "오늘 당신의 운세는 <한 줄 요약> 입니다." 형태로 재작성해주십시오. 절대 날짜·요일·띠 관련 문장을 포함하거나 생성하지 마십시오. 원문: "${responseText.replaceAll('"', '\\"')}"`;

      const rewriteMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: rewriteInstruction },
      ];

      const rewrittenResponse = await env.AI.run(MODEL_ID, {
        messages: rewriteMessages,
        max_tokens: 200,
      }, { returnRawResponse: true });

      return rewrittenResponse;
    }

    // Otherwise return original streaming response (keep status and headers)
    return new Response(responseText, { status: response.status, headers: response.headers });
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
