# Today's Horoscope (오늘의 운세)

![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)
![D1 Database](https://img.shields.io/badge/Cloudflare-D1-orange)

Cloudflare Workers AI와 D1 Database를 기반으로 한 서버리스 운세 채팅 애플리케이션입니다. 이 프로젝트는 안전한 사용자 인증과 실시간 스트리밍 응답을 갖춘 한국어 AI 챗봇의 풀스택 구현 사례를 보여줍니다.

## System Architecture

```mermaid
graph TD
    Client([Client / Browser])
    Worker[Cloudflare Worker]
    Auth[Auth System]
    AI[Workers AI \n (Llama 3.1 8B)]
    DB[(D1 Database \n SQLite)]

    Client -- "HTTPS / SSE" --> Worker
    Worker -- "JWT Validation" --> Auth
    Worker -- "Inference Request" --> AI
    Worker -- "SQL Query (Prepared)" --> DB
    
    subgraph Cloudflare Ecosystem
        Worker
        Auth
        AI
        DB
    end
    
    style Client fill:#f9f,stroke:#333,stroke-width:2px
    style Worker fill:#fa0,stroke:#333,stroke-width:2px
    style AI fill:#0af,stroke:#333,stroke-width:2px
    style DB fill:#0fa,stroke:#333,stroke-width:2px
```

## Features

**AI 기반 분석 (AI-Powered Analysis)**
Cloudflare Workers AI의 Llama 3.1 8B 모델을 활용하여 생년월일 데이터를 기반으로 일일 운세를 생성합니다. 최적화된 시스템 프롬프트로 자연스러운 한국어 출력과 문맥에 맞는 조언을 보장합니다.

**실시간 상호작용 (Real-time Interaction)**
SSE(Server-Sent Events)를 사용하여 AI 응답을 스트리밍함으로써, 현대적인 채팅 인터페이스와 유사한 즉각적이고 몰입감 있는 사용자 경험을 제공합니다.

**사용자 관리 (User Management)**
회원가입 및 로그인을 포함한 완전한 인증 시스템입니다. 로그인 시 사용자의 생년월일 데이터가 자동으로 검색되어 운세 요청 프로세스를 간소화합니다.

**상태 유지 (Persistent State)**
LocalStorage를 사용한 프론트엔드 상태 관리로 페이지 새로고침 후에도 채팅 기록과 사용자 세션이 유지됩니다.

## Security Architecture

**데이터베이스 보호 (Database Protection)**
SQL 인젝션 취약점을 제거하기 위해 매개변수화된 쿼리(Cloudflare D1 `prepare().bind()`)를 엄격하게 사용합니다.

**비밀번호 해싱 (Password Hashing)**
안전한 비밀번호 저장을 위해 사용자별 고유 솔트(Salt)와 함께 PBKDF2(SHA-256, 100,000회 반복)를 구현했습니다.

**입력 검증 및 위생 처리 (Input Validation & Sanitization)**
XSS 공격을 방지하기 위해 사용자 입력에 대한 포괄적인 검증과 HTML 위생 처리를 수행합니다.

**무상태 인증 (Stateless Authentication)**
안전하고 확장 가능한 세션 관리를 위해 JWT(JSON Web Token) 기반 인증을 사용합니다.

## Tech Stack

*   **Runtime**: Cloudflare Workers
*   **Language**: TypeScript
*   **Database**: Cloudflare D1 (SQLite)
*   **AI Model**: Llama 3.1 8B (Workers AI)
*   **Frontend**: Vanilla JavaScript, HTML5, CSS3

## Getting Started

### Prerequisites

*   Node.js 18 이상
*   Wrangler CLI
*   Cloudflare 계정

### Installation

1.  **저장소 복제**
    ```bash
    git clone https://github.com/gguatit/Today-s-horoscope.git
    cd Today-s-horoscope
    npm install
    ```

2.  **Cloudflare 인증**
    ```bash
    npx wrangler login
    ```

3.  **데이터베이스 설정**
    D1 데이터베이스를 생성하고 `wrangler.jsonc` 파일에 ID를 업데이트합니다.
    ```bash
    npx wrangler d1 create horoscope-db
    ```

4.  **스키마 마이그레이션**
    ```bash
    # 로컬 환경
    npx wrangler d1 execute horoscope-db --local --file=./schema.sql

    # 원격(배포) 환경
    npx wrangler d1 execute horoscope-db --remote --file=./schema.sql
    ```

5.  **개발 및 배포**
    ```bash
    # 로컬 실행
    npm run dev

    # Cloudflare 배포
    npm run deploy
    ```

## Project Structure

```
src/
  index.ts       # 애플리케이션 진입점, API 라우트, 비즈니스 로직
  types.ts       # TypeScript 타입 정의
public/
  index.html     # 메인 애플리케이션 뷰
  chat.js        # 프론트엔드 컨트롤러 및 상태 관리
  styles.css     # 애플리케이션 스타일링
schema.sql       # 데이터베이스 스키마 정의
wrangler.jsonc   # Cloudflare 설정 파일
```

## License

Distributed under the MIT License.
