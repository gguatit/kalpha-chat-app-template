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

// System prompt enforced for every conversation
const SYSTEM_PROMPT = `당신은 한국어만 사용해야 하는 문법·표기·사실관계(고유명사 포함) 교정·검증 도우미입니다.
1) 모든 응답은 한국어(표준 한국어)만 사용하십시오. 다른 언어로 답변하거나 일부 설명을 영어로 표기하지 마십시오.
2) 입력 텍스트에 대해 문법, 맞춤법, 띄어쓰기, 어휘 및 문체(격식 수준)를 점검하고 가능한 교정안을 제시하십시오.
3) 문장 내 고유명사(인명, 지명, 기관명, 제품/브랜드 등)를 교차검증하고 공식 표기/권장 표기(로마자 표기 포함)와 사실관계(예: 직책/소속)가 정확한지 확인하십시오.
4) 각 변경 제안은 다음 형식(짧게)으로 제공하십시오: 원문 -> 수정안 : 변경 사유 : 참고출처(가능 시) : 확신도(높음/보통/낮음).
5) 외부 검색이 가능하면 신뢰할 수 있는 출처(공식 웹사이트, 표준국어대사전, 주요 언론 등)를 우선 활용하고, 불가능하면 '검증 불가(내부 지식 기반)'로 명시하십시오.
6) 사실관계가 불일치하거나 불확실한 경우, 가능한 수정안과 함께 '확인 필요'로 표시해 사용자에게 후속 질문을 유도하십시오.`;

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
