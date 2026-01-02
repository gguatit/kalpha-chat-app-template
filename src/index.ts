/**
 * 오늘의 운세 - AI 챗봇
 * Cloudflare Workers AI (Llama 3.1 8B)를 사용한 한국어 운세 챗봇
 * @license MIT
 */
import { Env, ChatMessage, ZODIAC_SIGNS, ZodiacSign } from "./types";

const MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fp8";

// AI 시스템 프롬프트: 한국어 운세 생성 규칙
const SYSTEM_PROMPT = `당신은 한국어만 사용하는 운세 상담 AI입니다.
1) 모든 응답은 반드시 한국어로만 작성하십시오.
2) 운세는 "오늘 당신의 운세는 <한 줄 요약> 입니다."로 시작합니다.
3) 사용자가 제공하지 않은 정보(날짜, 요일, 띠)는 절대 생성하지 마십시오.
4) 운세는 중간 정도의 길이로 간결하게 작성합니다.
5) 10~30% 확률로 주의가 필요한 내용도 포함하되, 현실적인 조언을 함께 제공합니다.
6) 별자리 정보가 제공되면 해당 특성을 자연스럽게 반영합니다.
7) 구체적이고 창의적으로 작성하되, 실질적인 조언에 초점을 맞춥니다.`;

export default {
  /**
   * Worker의 메인 요청 핸들러
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // 정적 자산(프론트엔드) 처리
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API 라우트
    if (url.pathname.startsWith("/api/auth/")) {
      return handleAuthRequest(request, env);
    }

    if (url.pathname === "/api/chat") {
      // 채팅용 POST 요청 처리
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }

      // 다른 요청 타입은 허용하지 않음
      return new Response("Method not allowed", { status: 405 });
    }

    // 일치하지 않는 라우트는 404 처리
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * 인증 API 요청 처리
 */
async function handleAuthRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json() as any;
    
    if (url.pathname === "/api/auth/register") {
      const { username, password, birthdate } = body;
      if (!username || !password) {
        return new Response("Username and password required", { status: 400 });
      }

      // 사용자 존재 여부 확인
      const existing = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
      if (existing) {
        return new Response("Username already exists", { status: 409 });
      }

      // 사용자명 형식 검증 (영문/숫자, 4-20자)
      if (!/^[a-zA-Z0-9]{4,20}$/.test(username)) {
        return new Response("아이디는 영문/숫자 4~20자여야 합니다.", { status: 400 });
      }

      // 비밀번호 강도 검증 (최소 8자)
      if (password.length < 8) {
        return new Response("비밀번호는 최소 8자 이상이어야 합니다.", { status: 400 });
      }

      // 비밀번호 해싱
      const salt = crypto.randomUUID();
      const passwordHash = await hashPassword(password, salt);

      // 사용자 정보 삽입
      await env.DB.prepare(
        "INSERT INTO users (username, password_hash, salt, birthdate) VALUES (?, ?, ?, ?)"
      ).bind(username, passwordHash, salt, birthdate || null).run();

      return new Response(JSON.stringify({ success: true }), { 
        headers: { "Content-Type": "application/json" } 
      });
    }

    if (url.pathname === "/api/auth/login") {
      const { username, password } = body;
      if (!username || !password) {
        return new Response("아이디와 비밀번호를 입력해주세요.", { status: 400 });
      }

      // 사용자 정보 조회
      const user = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first<any>();
      if (!user) {
        return new Response("존재하지 않는 아이디입니다.", { status: 401 });
      }

      // 비밀번호 검증
      const hash = await hashPassword(password, user.salt);
      if (hash !== user.password_hash) {
        return new Response("비밀번호가 일치하지 않습니다.", { status: 401 });
      }

      try {
        // 마지막 로그인 시간 및 위치 업데이트
        const cf = request.cf as any;
        const location = cf ? `${cf.country || 'Unknown'}, ${cf.city || 'Unknown'}` : 'Unknown';
        
        try {
          await env.DB.prepare(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP, location = ? WHERE id = ?"
          ).bind(location, user.id).run();
        } catch (dbError) {
          console.error("Database update error:", dbError);
          // 업데이트 실패해도 계속 진행
        }

        // JWT 토큰 생성
        const token = await signJWT({ sub: user.id, username: user.username, birthdate: user.birthdate });

        return new Response(JSON.stringify({ token, username: user.username, birthdate: user.birthdate }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (jwtError) {
        console.error("JWT generation error:", jwtError);
        return new Response("토큰 생성 중 오류가 발생했습니다.", { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  } catch (e) {
    console.error(e);
    return new Response("Internal Server Error", { status: 500 });
  }
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  
  const exported = await crypto.subtle.exportKey("raw", key) as ArrayBuffer;
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// 프로덕션 환경에서는 더 강력한 시크릿 키를 사용하세요 (환경 변수 권장)
const JWT_SECRET = "secret-key-change-this-in-production"; 

// XSS 방지를 위한 입력 문자열 정제 헬퍼 함수
function sanitize(str: string): string {
  return str.replace(/[&<>"']/g, (match) => {
    const escape: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escape[match];
  });
}

async function signJWT(payload: any): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSha256(data, JWT_SECRET);
  
  return `${data}.${signature}`;
}

function base64UrlEncode(str: string): string {
  const base64 = btoa(unescape(encodeURIComponent(str)));
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function hmacSha256(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function verifyJWT(token: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, providedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = await hmacSha256(data, JWT_SECRET);
    
    if (providedSignature !== expectedSignature) return null;
    
    // Decode payload
    const payloadJson = atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payloadJson);
  } catch (e) {
    return null;
  }
}

/**
 * 생년월일로 12별자리 계산
 * 
 * @param birthdate - 생년월일 문자열 (YYYY-MM-DD 형식, 예: "1990-03-21")
 * @returns ZodiacSign 객체 또는 null (유효하지 않은 입력)
 * 
 * 동작 원리:
 * 1. birthdate에서 월-일 추출 (MMDD 형식)
 * 2. ZODIAC_SIGNS 배열을 순회하며 날짜 범위 비교
 * 3. 연도 경계를 넘는 경우(염소자리) 특수 처리
 * 
 * 예시:
 * - calculateZodiacSign("1990-03-21") -> 양자리
 * - calculateZodiacSign("2000-12-25") -> 염소자리
 */
function calculateZodiacSign(birthdate: string): ZodiacSign | null {
  // 입력 검증: YYYY-MM-DD 형식 (길이 10)
  if (!birthdate || birthdate.length !== 10) return null;
  
  // 월-일 추출: "1990-03-21" -> "0321"
  const mmdd = birthdate.substring(5).replace("-", "");
  
  // 12별자리 중 일치하는 별자리 찾기
  for (const sign of ZODIAC_SIGNS) {
    // 연도 경계 처리: start > end인 경우 (예: 염소자리 1222~0119)
    if (sign.start > sign.end) {
      // mmdd가 start 이후이거나 end 이전이면 매칭
      // 예: 1225(12월 25일) >= 1222 또는 0115(1월 15일) <= 0119
      if (mmdd >= sign.start || mmdd <= sign.end) {
        return sign;
      }
    } else {
      // 일반적인 범위: 같은 연도 내에서 start~end
      if (mmdd >= sign.start && mmdd <= sign.end) {
        return sign;
      }
    }
  }
  
  // 일치하는 별자리가 없으면 null 반환
  return null;
}

/**
 * 채팅 API 요청 처리 및 응답 스트리밍
 */
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  // JWT 인증 확인
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "로그인이 필요합니다." }), { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  const payload = await verifyJWT(token);
  if (!payload) {
    return new Response(JSON.stringify({ error: "유효하지 않은 인증 토큰입니다." }), { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // JSON 요청 본문 파싱
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // 시스템 프롬프트 강제 적용 및 기존 system 메시지 제거
    // 이를 통해 AI가 한국어 전용 + 검증 규칙을 항상 따르도록 보장
    const nonSystem = messages.filter((msg) => msg.role !== "system");
    
    // 채팅 기록에서 생년월일 추출 후 별자리 계산
    // 별자리 정보를 시스템 프롬프트에 추가하여 AI가 운세 생성에 활용
    let zodiacInfo = "";
    const birthdateMsg = nonSystem.find((m) => m.content && m.content.startsWith("[생년월일]"));
    if (birthdateMsg) {
      // "[생년월일] 1990-03-21" 형태에서 날짜 추출
      const birthdate = birthdateMsg.content.replace("[생년월일]", "").trim();
      const zodiac = calculateZodiacSign(birthdate);
      
      if (zodiac) {
        // AI에게 전달할 별자리 정보 포맷
        // 예: "[별자리 정보] 사용자의 별자리: 양자리 (Aries, 03/21 - 04/19). 특성: 에너지와 추진력..."
        zodiacInfo = `\n\n[별자리 정보] 사용자의 별자리: ${zodiac.name} (${zodiac.nameEn}, ${zodiac.start.substring(0,2)}/${zodiac.start.substring(2)} - ${zodiac.end.substring(0,2)}/${zodiac.end.substring(2)}). 특성: ${zodiac.traits}`;
      }
    }
    
    // 최종 메시지 배열: 시스템 프롬프트(+ 별자리 정보) + 사용자 메시지들
    const enforcedMessages = [
      { role: "system", content: SYSTEM_PROMPT + zodiacInfo },
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
        // AI Gateway 사용 시 주석 해제
        // gateway: {
        //   id: "YOUR_GATEWAY_ID", // AI Gateway ID로 교체
        //   skipCache: false,      // 캐시 우회 시 true로 설정
        //   cacheTtl: 3600,        // 캐시 유지 시간(초)
        // },
      },
    );

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
