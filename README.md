# Today's Horoscope

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/Cloudflare-D1-orange)](https://developers.cloudflare.com/d1/)
[![Workers AI](https://img.shields.io/badge/Workers-AI-blue)](https://developers.cloudflare.com/workers-ai/)

> 생년월일 기반 운세 분석을 제공하는 서버리스 AI 채팅 애플리케이션

Cloudflare Workers AI와 D1 Database를 기반으로 구축된 풀스택 한국어 운세 챗봇입니다. 실시간 스트리밍 응답과 안전한 사용자 인증을 제공하며, 완전히 서버리스 아키텍처로 설계되었습니다.

**[Live Online Demo](https://kalpha.c01.kr)** | [GitHub](https://github.com/gguatit/Today-s-horoscope)

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Security](#security)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [License](#license)

## Architecture

```mermaid
graph TB
    subgraph Client["Client Layer"]
        Browser[Browser/Mobile]
        UI[Vanilla JS UI]
        LocalStorage[LocalStorage]
    end

    subgraph Edge["Cloudflare Edge"]
        Worker[Workers Runtime]
        Assets[Static Assets]
    end

    subgraph Services["Cloudflare Services"]
        AI[Workers AI<br/>Llama 3.1 8B]
        D1[(D1 Database<br/>SQLite)]
    end

    Browser --> UI
    UI --> LocalStorage
    UI -->|HTTPS/SSE| Worker
    Worker --> Assets
    Worker -->|JWT Auth| D1
    Worker -->|Inference| AI
    Worker -->|SQL Queries| D1

    style Browser fill:#e1f5ff
    style Worker fill:#ff9800
    style AI fill:#2196f3
    style D1 fill:#4caf50
```

### Request Flow

1. **Client Request**: 사용자가 브라우저에서 운세를 요청
2. **Authentication**: JWT 토큰 검증 및 사용자 정보 조회
3. **AI Processing**: Llama 3.1 8B 모델을 사용한 운세 생성
4. **Streaming Response**: SSE(Server-Sent Events)를 통한 실시간 응답 전송
5. **State Persistence**: LocalStorage에 채팅 기록 및 세션 저장

## Features

### AI-Powered Horoscope Analysis

- **Llama 3.1 8B Instruct FP8** 모델 기반 운세 생성
- 생년월일과 목표 날짜를 기반으로 한 맞춤형 분석
- **12별자리(서양 점성술)** 자동 계산 및 운세 특성 반영
  - 별자리별 세부 특성 (에너지, 감성, 집중력, 직관력 등) 자연스럽게 운세에 통합
  - 12개 별자리(양자리~물고기자리) 각각의 강점과 주의사항 맞춤 반영
- 긍정적/부정적 조언의 균형잡힌 제공 (70% 긍정, 30% 주의)
- **간결한 운세 형식**: "오늘 당신의 운세는 '<한 줄 요약>' 입니다." 형식 사용
  - 예: "오늘 당신의 운세는 '새로운 기회가 찾아온다' 입니다."
- 환각(hallucination) 방지를 위한 시스템 프롬프트 최적화
- 한국어 전용 응답 및 문법 교정

### Real-time Interaction

- **Server-Sent Events (SSE)** 기반 스트리밍 응답
- 타이핑 인디케이터로 AI 응답 상태 표시
- 비동기 처리로 부드러운 사용자 경험 제공

### User Management

- JWT 기반 무상태 인증 시스템
- 회원가입/로그인 기능
- 사용자별 생년월일 정보 자동 연동
- 세션 유지 및 자동 로그인

### User Experience

- 모바일 최적화 UI (숫자 키패드 입력 지원)
- 날짜 증감 버튼으로 편리한 날짜 조정
- '오늘' 버튼으로 빠른 날짜 초기화
- **12별자리 자동 표시** (생년월일 설정 시 채팅창에 표시)
- LocalStorage 기반 채팅 기록 및 설정 유지
- 비밀번호 표시/숨김 토글

## Tech Stack

### Runtime & Infrastructure
- **Cloudflare Workers**: 글로벌 엣지 컴퓨팅 플랫폼
- **Cloudflare D1**: 서버리스 SQLite 데이터베이스
- **Cloudflare Workers AI**: 엣지에서 실행되는 AI 추론

### Backend
- **Language**: TypeScript 5.8
- **AI Model**: @cf/meta/llama-3.1-8b-instruct-fp8
- **Authentication**: Custom JWT implementation
- **Password Hashing**: PBKDF2 (SHA-256, 100,000 iterations)

### Frontend
- **UI**: Vanilla JavaScript, HTML5, CSS3
- **State Management**: LocalStorage
- **Streaming**: Server-Sent Events (SSE)
- **Input Handling**: Native browser APIs

### Development Tools
- **Build**: Wrangler 4.21.x
- **Type Checking**: TypeScript
- **Testing**: Vitest 3.2.4

## Security

### Authentication & Authorization

**JWT-based Stateless Authentication**
- HS256 알고리즘을 사용한 JWT 서명
- 사용자 ID, 사용자명, 생년월일 페이로드 포함
- 토큰 기반 세션 관리로 확장성 보장

```typescript
// JWT payload structure
{
  sub: number,        // User ID
  username: string,   // Username
  birthdate: string   // User birthdate (YYYYMMDD)
}
```

### Password Security

**PBKDF2 Key Derivation**
- 알고리즘: PBKDF2 with HMAC-SHA256
- 반복 횟수: 100,000 iterations
- 솔트: 사용자별 고유 UUID
- 키 길이: 256 bits (AES-GCM)

```typescript
// Password hashing implementation
- Salt generation: crypto.randomUUID()
- Key derivation: PBKDF2 + HMAC-SHA256
- Iterations: 100,000
- Output: Base64 encoded hash
```

### SQL Injection Prevention

**Parameterized Queries**
- 모든 데이터베이스 쿼리에 prepared statements 사용
- `prepare().bind()` 패턴으로 입력값 바인딩
- 사용자 입력값 직접 연결 금지

```typescript
// Example: Secure query pattern
await env.DB.prepare("SELECT * FROM users WHERE username = ?")
  .bind(username)
  .first();
```

### XSS Protection

**Input Sanitization**
- HTML 특수문자 이스케이프 처리
- `<`, `>`, `&`, `"`, `'` 문자 변환
- 사용자 입력값 반영 시 sanitize 함수 적용

```typescript
// Sanitization function
function sanitize(str: string): string {
  return str.replace(/[&<>"']/g, (match) => {
    const escape = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;'
    };
    return escape[match];
  });
}
```

### Input Validation

**Username Requirements**
- 형식: 영문/숫자 조합
- 길이: 4-20자
- 정규식: `^[a-zA-Z0-9]{4,20}$`

**Password Requirements**
- 최소 길이: 8자 이상
- 강력한 패스워드 권장 (구현 시 추가 검증 가능)

## Getting Started

### Prerequisites

```bash
Node.js 18 or higher
Wrangler CLI
Cloudflare account with Workers, D1, and AI access
```

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/gguatit/Today-s-horoscope.git
cd Today-s-horoscope
```

2. **Install dependencies**

```bash
npm install
```

3. **Authenticate with Cloudflare**

```bash
npx wrangler login
```

4. **Create D1 Database**

```bash
npx wrangler d1 create horoscope-db
```

생성된 `database_id`를 복사하여 `wrangler.jsonc` 파일의 `d1_databases` 섹션에 입력합니다.

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "horoscope-db",
      "database_id": "YOUR_DATABASE_ID_HERE"
    }
  ]
}
```

5. **Initialize Database Schema**

```bash
# Local development
npx wrangler d1 execute horoscope-db --local --file=./db/schema.sql

# Production
npx wrangler d1 execute horoscope-db --remote --file=./db/schema.sql
```

6. **Run Development Server**

```bash
npm run dev
```

Application will be available at `http://localhost:8787`

7. **Deploy to Production**

```bash
npm run deploy
```

### Environment Configuration

`wrangler.jsonc` 파일에서 다음 설정을 구성할 수 있습니다:

- **AI Binding**: Workers AI 모델 접근
- **D1 Database**: 데이터베이스 연결 설정
- **Assets**: 정적 파일 제공 경로
- **Compatibility Flags**: Node.js 호환성 설정

## Project Structure

```
Today-s-horoscope/
├── src/                      # Backend (TypeScript)
│   ├── index.ts              # Application entry point & API routes
│   │   ├── handleAuthRequest()    # Authentication endpoints
│   │   ├── handleChatRequest()    # AI chat endpoint with SSE streaming
│   │   ├── hashPassword()         # PBKDF2 password hashing
│   │   ├── signJWT()              # JWT token generation
│   │   ├── verifyJWT()            # JWT token verification
│   │   └── sanitize()             # XSS prevention utility
│   └── types.ts              # TypeScript type definitions
│       ├── ChatMessage            # Chat message interface
│       ├── ZodiacSign             # 12별자리 데이터 구조
│       └── ZODIAC_SIGNS           # 12별자리 상수 배열
│
├── public/                   # Frontend (Static Assets)
│   ├── index.html            # Main application view
│   ├── css/
│   │   └── styles.css        # Responsive UI styling (mobile-optimized)
│   └── js/
│       └── app.js            # Frontend controller & state management
│           ├── Authentication UI      # Login/Signup modal handling
│           ├── Chat Interface         # Message rendering & SSE handling
│           ├── Date Input Controls    # Birthdate/target date management
│           ├── Zodiac Calculator      # 12별자리 자동 계산 및 표시
│           └── LocalStorage Manager   # Session & history persistence
│
├── db/                       # Database (SQL)
│   └── schema.sql            # D1 database schema
│
├── types/                    # TypeScript Definitions
│   └── cloudflare-env.d.ts   # Cloudflare Workers runtime types
│
├── wrangler.jsonc            # Cloudflare Workers configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Project dependencies & scripts
```

### Key Files Description

**`src/index.ts`** (477 lines)
- **API 라우팅**: `/api/auth/*` (회원가입/로그인), `/api/chat` (AI 채팅)
- **JWT 인증**: HS256 서명, 토큰 생성/검증
- **PBKDF2 해싱**: 100,000 iterations, UUID salt
- **Workers AI 통합**: Llama 3.1 8B 모델, SSE 스트리밍 응답
- **D1 쿼리**: Prepared statements로 SQL injection 방지
- **최적화된 SYSTEM_PROMPT**: 8가지 핵심 규칙 + 12별자리 특성 가이드라인
  - 간결한 운세 형식: "오늘 당신의 운세는 '<요약>' 입니다."
  - 별자리별 상세 특성 (열정, 안정, 소통, 감성, 자신감, 세심함, 균형, 직관, 모험, 목표, 독창성, 상상력)

**`src/types.ts`** (67 lines)
- **Env**: Cloudflare Workers 환경 바인딩 (AI, DB, ASSETS)
- **ChatMessage**: `{role, content}` 채팅 메시지 구조
- **ZodiacSign**: 12별자리 데이터 구조
  - `name`: 한국어 별자리명 (예: "양자리", "황소자리")
  - `nameEn`: 영어 별자리명 (Aries, Taurus 등)
  - `start`, `end`: 별자리 기간 (MMDD 형식)
  - `traits`: 별자리 특성 설명
- **ZODIAC_SIGNS**: 12별자리 상수 배열 (양자리~물고기자리, 날짜 범위 포함)

**`public/js/app.js`** (JavaScript)
- **인증 UI**: 로그인/회원가입 모달, JWT 토큰 관리
- **SSE 스트리밍**: 실시간 AI 응답 처리, 타이핑 인디케이터
- **별자리 계산**: `calculateZodiacSign()`, `updateZodiacDisplay()`
- **날짜 입력**: 증감 버튼, 숫자 키패드 최적화
- **LocalStorage**: 채팅 기록, 세션 유지
- **한국어 검증**: 비한국어 입력 차단 및 재작성 요청

**`public/css/styles.css`** (699 lines)
- **반응형 디자인**: 모바일/데스크톱 최적화
- **터치 UI**: 44px 최소 터치 영역, Safe Area 지원
- **CSS 변수**: `--primary-color`, `--user-msg-bg` 등 테마 설정

**`types/cloudflare-env.d.ts`** (7,334 lines, generated)
- Cloudflare Workers runtime 타입 정의
- Wrangler `npm run cf-typegen`으로 자동 생성
- D1, AI, ASSETS 바인딩 타입

**`db/schema.sql`**
- `users` 테이블: id, username, password_hash, salt, birthdate
- UNIQUE 제약조건, AUTOINCREMENT primary key

## API Reference

### Authentication Endpoints

#### POST `/api/auth/register`

사용자 회원가입

**Request Body**
```json
{
  "username": "string (4-20 chars, alphanumeric)",
  "password": "string (min 8 chars)",
  "birthdate": "string (YYYYMMDD, optional)"
}
```

**Response**
```json
{
  "success": true
}
```

**Error Codes**
- `400`: Invalid input format
- `409`: Username already exists
- `500`: Server error

#### POST `/api/auth/login`

사용자 로그인

**Request Body**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response**
```json
{
  "token": "string (JWT)",
  "username": "string",
  "birthdate": "string | null"
}
```

**Error Codes**
- `400`: Missing credentials
- `401`: Invalid username or password
- `500`: Server error

### Chat Endpoint

#### POST `/api/chat`

AI 채팅 요청 (SSE 스트리밍)

**Request Body**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "string"
    }
  ]
}
```

**Response**
- Content-Type: `text/event-stream`
- Streaming SSE format with AI-generated response

**Error Codes**
- `405`: Method not allowed
- `500`: AI processing error

## Database Schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  birthdate TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Development

### Type Checking

```bash
npm run check
```

### Dry Run Deployment

```bash
wrangler deploy --dry-run
```

### Generate Types

```bash
npm run cf-typegen
```

## License

MIT License - see [LICENSE](LICENSE) file for details

---

Built with Cloudflare Workers, D1, and Workers AI
