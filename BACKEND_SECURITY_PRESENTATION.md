# 오늘의 운세 - 백엔드 및 보안 설명서

발표용 핵심 요약 문서

---

## 1. 프로젝트 개요

AI 기반 한국어 운세 챗봇 서비스
- 생년월일 입력 시 12별자리 기반 맞춤 운세 제공
- 실시간 AI 응답 스트리밍
- 회원가입/로그인, 채팅 기록 저장

---

## 2. 기술 스택

### 프론트엔드
- HTML, CSS, Vanilla JavaScript (프레임워크 없음)

### 백엔드
- TypeScript + Cloudflare Workers (서버리스)
- Llama 3.1 8B AI (운세 생성)
- D1 Database (SQLite 기반)

### 왜 Cloudflare Workers?
```
전통 서버: 서울 서버 → 미국 사용자 느림 (300ms)
Workers: 전 세계 300개 도시 → 가까운 곳에서 응답 (50ms)
```

**장점:** 빠른 속도, 서버 관리 불필요, 저렴한 비용

---

## 3. 핵심 보안 메커니즘

### A. 비밀번호 암호화 (PBKDF2)

```
입력: mypassword123
처리: 소금(랜덤) + 100,000번 반복
저장: $2y$10$a3f9k2j1...해시값...
```

해커가 해독하려면 수년 소요

### B. SQL Injection 방어

```typescript
// 위험: 문자열 연결
query = "SELECT * FROM users WHERE username = '" + input + "'";

// 안전: Prepared Statements
env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(input);
```

### C. XSS 방어

```typescript
// 특수문자 자동 변환
<script>악성코드</script> → &lt;script&gt;악성코드&lt;/script&gt;
```

---

## 4. 현재 보안 취약점 (Top 3)

### 심각도: 높음

**1. JWT 비밀키 하드코딩**
```typescript
const JWT_SECRET = "secret-key-change-this-in-production";
```
- 소스코드 GitHub 공개 → 누구나 열람 가능
- 가짜 토큰 제작 가능
- 해결: 환경 변수 사용

**2. 토큰 만료 시간 없음**
- 토큰이 영구 유효
- 도난 시 계속 악용 가능
- 해결: 24시간 만료 설정

**3. LocalStorage 토큰 저장**
- JavaScript로 접근 가능
- XSS 공격 시 탈취 위험
- 해결: HttpOnly Cookie 사용

### 심각도: 중간

**4. Rate Limiting 없음**
- 무제한 로그인 시도 (비밀번호 무작위 대입)
- 무제한 회원가입 (스팸 계정)
- 무제한 AI 요청 (비용 폭탄)

---

## 5. 보안 개선 로드맵

### 즉시 조치 (Priority 1)
1. JWT_SECRET 환경 변수화 (10분, 무료)
2. JWT 만료 시간 추가 (30분, 무료)
3. HttpOnly Cookie 적용 (2시간, 무료)

### 1주일 내 (Priority 2)
4. Rate Limiting 구현 (4시간, 월 $5)
5. CORS 정책 설정 (1시간, 무료)

### 1개월 내 (Priority 3)
6. 비밀번호 강도 검증 강화 (2시간, 무료)

---

## 6. 성능 및 비용

### 현재 성능
- 로그인: 150ms
- AI 운세: 2-3초 (스트리밍)
- 글로벌 응답 속도: 50ms

### 운영 비용 (1,000명 기준)
```
현재 (무료 티어): $0/월
확장 시 (10,000명): $25/월
전통 서버 (AWS): $100/월
```

**비용 절감: 75%**

---

## 7. 결론

### 강점
- 빠른 글로벌 응답 속도
- 확장 가능한 서버리스 구조
- 저렴한 운영 비용

### 개선 필요
- 3가지 주요 보안 취약점 즉시 해결 필수
- Rate Limiting 추가로 비용 폭탄 방지

### 최종 평가
현대적이고 효율적인 기술 스택이지만,
보안 측면에서 우선순위 높은 조치가 필요합니다.

---

## 부록: 필수 용어

- **JWT**: 로그인 증명서 (영화표와 같은 개념)
- **API**: 프로그램 간 통신 방법
- **XSS**: 악성 스크립트 주입 공격
- **SQL Injection**: 데이터베이스 명령 조작 공격
- **CDN**: 전 세계 데이터센터 네트워크

---

작성일: 2026년 1월 5일
문서 버전: 2.0 (핵심 요약)
