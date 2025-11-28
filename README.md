# Today-s-horoscope

Cloudflare Workers와 Workers AI를 사용한 간단한 운세(생년월일 기반) 채팅 예제입니다. 서버에서 한국어 전용 `SYSTEM_PROMPT`와 검증 규칙을 강제해, 검증 불가한 사실(요일·띠·정확한 생년월일 표기 등)을 재작성하도록 처리합니다.

## 빠른 시작

필수 도구:

- Node.js 18 이상
- Wrangler CLI
- Cloudflare 계정(Workers 및 Workers AI 권한 필요)

설치 및 실행:

```bash
git clone https://github.com/gguatit/Today-s-horoscope.git
cd Today-s-horoscope
npm install
npm run cf-typegen
npm run dev
```

배포:

```bash
npm run check        # TypeScript 검사 + wrangler dry-run
wrangler deploy
```

## 프로젝트 개요

- Cloudflare Worker 기반의 간단한 API(`POST /api/chat`)와 정적 UI(`public/`)
- Workers AI를 통한 스트리밍 응답(SSE) 및 서버 측 검증·재작성
- 생년월일(YYYY‑MM‑DD) 입력 기반의 운세 자동 실행 기능

## 아키텍처(요약)

```mermaid
flowchart LR
  Browser[Browser / Client] --> ASSETS[Static Assets (public/)]
  Browser --> Worker[Cloudflare Worker (src/index.ts)]
  Worker --> AI[Workers AI (env.AI)]
  Worker -->|Optional| DO[Durable Object]
  DO --> KV[KV / R2]
```

클라이언트가 `/api/chat`으로 메시지를 보내면 워커가 `SYSTEM_PROMPT`를 최상단에 주입 후 모델에 요청합니다. 워커는 모델 응답에서 금지 패턴(요일·띠·정확한 생년월일 표기 등)을 감지하면 간결한 재작성(예: `오늘 당신의 운세는 <한 줄 요약> 입니다.`)을 요청해 반환합니다.

## 사용법

- 클라이언트 UI에서 생년월일을 설정하거나 메시지에 `[생년월일] YYYY‑MM‑DD` 형식으로 포함하세요.
- `운세`, `오늘 운세` 같은 문구를 입력하면, 생년월일이 설정된 경우 자동으로 운세 요청이 제출됩니다.

예시 (curl):

```bash
curl -X POST "https://<WORKER_URL>/api/chat" \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"오늘 운세 알려줘"}]}'
```

## 구성

- `src/index.ts`: `MODEL_ID`, `SYSTEM_PROMPT`, 요청 라우팅 및 재작성 로직
- `public/`: 프론트엔드 정적 자산
- `worker-configuration.d.ts`: 모델 타입 선언

## 개발 팁

- SSE 응답을 확인하려면 브라우저 개발자 도구의 네트워크 탭을 사용하세요.
- `npm run check`는 TypeScript 및 wrangler dry-run 검사를 수행합니다.

## 운영 권장

- 재작성 로직으로 모델 호출이 추가 발생하므로 비용을 모니터링하세요.
- 대규모 운영 시 AI Gateway, 캐싱, Durable Objects나 R2 등을 고려하세요.

## 기여

작은 변경도 Issue → Branch → PR 워크플로를 따라 주세요.

## 라이선스

MIT
