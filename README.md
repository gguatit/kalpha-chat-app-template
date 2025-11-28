# LLM Chat Application Template

A simple, ready-to-deploy chat application template powered by Cloudflare Workers AI. This template provides a clean starting point for building AI chat applications with streaming responses.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/llm-chat-app-template)

<!-- dash-content-start -->

## Demo

This template demonstrates how to build an AI-powered chat interface using Cloudflare Workers AI with streaming responses. It features:

- Real-time streaming of AI responses using Server-Sent Events (SSE)
- Easy customization of models and system prompts
- Support for AI Gateway integration
- Clean, responsive UI that works on mobile and desktop

## Features

- 💬 Simple and responsive chat interface
- ⚡ Server-Sent Events (SSE) for streaming responses
- 🧠 Powered by Cloudflare Workers AI LLMs
- 🛠️ Built with TypeScript and Cloudflare Workers
- 📱 Mobile-friendly design
- 🔄 Maintains chat history on the client
- 🔎 Built-in Observability logging
<!-- dash-content-end -->

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- A Cloudflare account with Workers AI access

### Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/cloudflare/templates.git
   cd templates/llm-chat-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Generate Worker type definitions:
   ```bash
   npm run cf-typegen
   ```

### Development

Start a local development server:

```bash
npm run dev
```

This will start a local server at http://localhost:8787.

Note: Using Workers AI accesses your Cloudflare account even during local development, which will incur usage charges.

### Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

### Monitor

View real-time logs associated with any deployed Worker:

```bash
npm wrangler tail
```

## Project Structure

```
/
├── public/             # Static assets
│   ├── index.html      # Chat UI HTML (now references `styles.css` for styling)
│   ├── styles.css      # Extracted CSS file (moved from inlined styles in HTML)
│   └── chat.js         # Chat UI frontend script
├── src/
│   ├── index.ts        # Main Worker entry point
│   └── types.ts        # TypeScript type definitions
├── test/               # Test files
├── wrangler.jsonc      # Cloudflare Worker configuration
├── tsconfig.json       # TypeScript configuration
└── README.md           # This documentation
```

## How It Works

### Backend

The backend is built with Cloudflare Workers and uses the Workers AI platform to generate responses. The main components are:

1. **API Endpoint** (`/api/chat`): Accepts POST requests with chat messages and streams responses
2. **Streaming**: Uses Server-Sent Events (SSE) for real-time streaming of AI responses
3. **Workers AI Binding**: Connects to Cloudflare's AI service via the Workers AI binding

### Frontend

The frontend is a simple HTML/CSS/JavaScript application that:

1. Presents a chat interface
2. Sends user messages to the API
3. Processes streaming responses in real-time
4. Maintains chat history on the client side

## Customization

### Changing the Model

To use a different AI model, update the `MODEL_ID` constant in `src/index.ts`. You can find available models in the [Cloudflare Workers AI documentation](https://developers.cloudflare.com/workers-ai/models/).

### Using AI Gateway

The template includes commented code for AI Gateway integration, which provides additional capabilities like rate limiting, caching, and analytics.

To enable AI Gateway:

1. [Create an AI Gateway](https://dash.cloudflare.com/?to=/:account/ai/ai-gateway) in your Cloudflare dashboard
2. Uncomment the gateway configuration in `src/index.ts`
3. Replace `YOUR_GATEWAY_ID` with your actual AI Gateway ID
4. Configure other gateway options as needed:
   - `skipCache`: Set to `true` to bypass gateway caching
   - `cacheTtl`: Set the cache time-to-live in seconds

Learn more about [AI Gateway](https://developers.cloudflare.com/ai-gateway/).

## 아키텍처 개요

아래는 이 프로젝트의 전체 아키텍처를 간단히 나타낸 ASCII 다이어그램입니다. (클라이언트 → 워커(Cloudflare Worker) → Workers AI 순으로 요청이 흘러갑니다.)

```
      [Browser/Client]
                |
                | (1) http(s) 요청: /api/chat (POST)
                |     - `public/chat.js`에서 요청 생성
                |     - 생년월일, 운세 날짜, 메시지 등 포함
                V
      [Cloudflare Worker]
      (src/index.ts)
         - 엔드포인트: /api/chat -> handleChatRequest
         - SYSTEM_PROMPT 강제 주입 (한국어/검증 규칙)
         - 요청 전처리: 메시지 필터, DOB/Target 추가
         - AI 모델 호출: env.AI.run(MODEL_ID)
                |  - returnRawResponse: true (streaming, SSE)
                |  - 모델: @cf/meta/llama-3.1-8b-instruct-fp8 등
                V
      [Workers AI Model]
         - 텍스트 생성 (운세, 교정, 기타 응답)
         - (옵션) 리라이터 재요청: 서버에서 '요일/띠/생년월일' 등 금지 패턴을 감지하면
            추가 요청을 보내어 `오늘 당신의 운세는 <요약> 입니다.` 형식으로 재작성
                |
                V
      [Client receives SSE]
         - public/chat.js는 stream을 읽어 채팅 UI에 실시간으로 표시
         - 후처리(클라이언트 레벨 검증 또는 한글 재작성 요청)가 있을 수 있음
```

### 각 구성요소와 파일 매핑
- 브라우저(프론트엔드)
   - `public/index.html`: UI 구성, 컨트롤(생년월일, 운세 날짜, 툴바 등)
   - `public/chat.js`: 메시지 작성, 전송 로직, 스트리밍 응답 읽기/재작성 요청, 모바일 인터랙션
   - `public/styles.css`: 레이아웃/반응형 스타일

- 워커(백엔드)
   - `src/index.ts`: 요청 라우팅, 시스템 프롬프트 강제 주입, env.AI.run 호출, 응답 후처리(금지 패턴 감지 및 재작성 요청)
   - `worker-configuration.d.ts`: 런타임 타입 정보를 제공 (AI 모델 목록 등)

- AI 및 인프라
   - Workers AI (`env.AI`): 모델 ID(`MODEL_ID`)로 텍스트 생성, streaming SSE를 통한 응답
   - Static Assets (`env.ASSETS`): `public/` 정적 파일 제공

### 데이터 흐름 (상세)
- 사용자(브라우저)가 메시지를 입력하고 '전송'을 누르면, `public/chat.js`는 `chatHistory`와 함께 `/api/chat`으로 POST 요청을 보냅니다.
- `src/index.ts`는 요청을 받으면 `SYSTEM_PROMPT`를 항상 최상단에 추가하여 시스템 규칙(한국어 전용, 검증 규칙 등)을 강제합니다.
- Worker는 `env.AI.run(MODEL_ID, { messages })`로 모델에 요청을 보냅니다 (SSE / returnRawResponse: true).
- 모델이 응답을 스트리밍하면 클라이언트가 이를 수신하여 UI에 실시간으로 렌더링합니다.
- 워커에서 금지 패턴(요일/띠/생년월일 등)을 찾으면, 동일 모델(또는 스페셜 모델)로 재작성 요청을 보냅니다. 재작성 결과는 클라이언트로 반환됩니다.

### 고려 사항 및 확장 포인트
- 재작성 비용: 재작성 요청이 발생하면 모델 호출이 추가로 발생하므로 비용 증가 가능 (추적/캐싱/저비용 모델 사용 고려).
- 모델 변경: `MODEL_ID`를 바꾸면 타입 선언(`worker-configuration.d.ts`)과 권한(Cloudflare 대시보드 모델 액세스)이 영향을 받을 수 있음.
- 서버 측 검증: `src/index.ts`에서 사용자 입력(생년월일/운세 날짜) 유효성 검증을 강화하여 잘못된 입력을 사전에 차단할 수 있습니다.
- 외부 검증 서비스: 띠(중국/한국, 음력/태양력 변환)와 같은 민감한 정보는 외부 검증 서비스(또는 정확한 라이브러리)로 보완 가능합니다.

이제 아키텍처 설명이 README에 추가되었습니다. 더 상세한 시각화(SVG, PlantUML, Mermaid)나 다이어그램 파일을 추가하길 원하시면 알려주세요. 특히 배포 파이프라인(예: GitHub Actions → wrangler deploy)과 AI Gateway/캐시 계층을 포함하는 확장 다이어그램도 제공 가능합니다.

### Modifying the System Prompt

The default system prompt can be changed by updating the `SYSTEM_PROMPT` constant in `src/index.ts`.
By default, this template now enforces a Korean-only assistant that performs grammar and proper-noun verification. If you modify this behavior, make sure to keep the verification and language constraints if required by your use case.

### 운세 기능 안내
이 템플릿에는 기본적으로 운세 기능이 추가되어 있습니다. UI에서 생년월일을 입력하거나 채팅에 `[생년월일] YYYY-MM-DD` 형식으로 생년월일을 제공하면, AI가 해당 생년월일을 기반으로 다음 내용을 한국어로 제공합니다:

 - 한국/중국 띠(연도 기반)
 - 오늘의 운세(요약) 및 추천 행동
 - 확신도(높음/보통/낮음) 및 참고/출처(가능한 경우)

운세 응답의 출력 규칙 변경(중요):

- 시스템이 날짜·요일·띠와 같은 검증되지 않은 사실을 임의로 생성하지 않도록 정책을 적용했습니다. 즉, 예시와 같은 문장(예: "당신의 생년월일인 2008년 3월 1일을 기준으로, 2025년 11월 28일은 [수]요일입니다" 또는 "당신의 띠는 [소]띠입니다")을 원천적으로 출력하지 않습니다.

- 대신, 운세의 핵심 요약은 항상 다음 기본 문장으로 제공됩니다: `오늘 당신의 운세는 <한 줄 요약> 입니다.` (추가 권장 행동이나 설명은 한두 문장으로 간결하게 제공될 수 있습니다.)

UI에서 제공하는 '운세 요청' 체크박스를 활성화하고 '운세 타입'을 선택하면 운세 응답이 더 정확하게 생성됩니다.

자동 실행 동작: 사용자가 이미 '생년월일'을 설정한 상태에서 채팅에 '운세', '오늘 운세', '운세 봐줘' 등 운세 관련 문구를 입력하면, 앱은 수동 확인 없이 자동으로 운세 요청을 처리합니다. (생년월일이 없는 상황에서는 먼저 생년월일을 설정하라는 안내가 표시됩니다.)

UI 개선 (직관적/깔끔):

- 헤더에 긴 안내문을 접을 수 있도록 변경하여 화면이 한결 깔끔해졌습니다. 사용자는 '사용 방법' 요약을 클릭하여 자세한 안내를 볼 수 있습니다.
- 상단에 'Compact controls' 바를 추가했습니다: 생년월일 입력, 운세 날짜 입력, 설정(옵션) 버튼, 설정(저장/지우기) 버튼이 모여 있습니다.
- 채팅 말풍선은 padding/아이콘/섀도우로 정리되어 읽기 쉬워졌습니다.
- 모바일 전용 툴바를 추가해 자주 쓰는 동작(생년월일 입력 포커스, 운세 토글, 입력 포커스)을 빠르게 실행할 수 있습니다.

Mobile support: most modern mobile browsers support `input[type="date"]`; the UI prefers native date pickers on mobile, provides a fallback `select` UI only for browsers without native `date` support, and the header instructions are collapsed on smaller screens to reduce clutter. The message input is sticky and the send button is touch-friendly.

Mobile-only toolbar: We added a small set of quick-action buttons for mobile users above the input field: `생년월일` (date picker focus / selects toggle), `운세` (toggle horoscope request), and `입력` (focus message input). This toolbar only appears on small screens and is designed to improve one-hand usability.

추가 사용 팁:

UI에서 제공하는 '운세 요청' 체크박스를 활성화하고 '운세 타입'을 선택하면 운세 응답이 더 정확하게 생성됩니다.

추가 사용 팁:

- UI에서 제공하는 '운세 요청' 체크박스를 활성화하고 '운세 타입'을 선택하면 운세 응답이 더 정확하게 생성됩니다.

운세 날짜: 입력한 생년월일 뿐만 아니라, 운세를 확인하려는 날짜(운세 날짜)를 선택할 수 있습니다. 운세 날짜를 지정하거나 별도로 선택하지 않으면 기본값은 오늘 날짜입니다. 운세 날짜를 설정하려면 UI의 '운세 날짜' 입력란을 사용하세요.

The UI styling is contained in the `<style>` section of `public/index.html`. You can modify the CSS variables at the top to quickly change the color scheme.

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)
