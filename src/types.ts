/**
 * Type definitions for the LLM chat application.
 */

export interface Env {
  /**
   * Binding for the Workers AI API.
   */
  AI: Ai;

  /**
   * Binding for D1 Database.
   */
  DB: D1Database;

  /**
   * Binding for static assets.
   */
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

/**
 * Represents a chat message.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * 12별자리(서양 점성술) 정보를 나타내는 인터페이스
 * 
 * 사용 예시:
 * - 생년월일로 별자리 찾기
 * - AI에게 별자리 특성 전달하여 맞춤형 운세 생성
 */
export interface ZodiacSign {
  name: string;       // 한글 이름 (예: "양자리")
  nameEn: string;     // 영문 이름 (예: "Aries")
  start: string;      // 시작일 MMDD 형식 (예: "0321" = 3월 21일)
  end: string;        // 종료일 MMDD 형식 (예: "0419" = 4월 19일)
  traits: string;     // 별자리 특성 (AI 운세 생성에 사용)
}

/**
 * 12별자리 데이터 배열 (양자리부터 물고기자리까지)
 * 
 * 주의사항:
 * - start > end인 경우 연도 경계를 넘어감 (예: 염소자리 12/22~1/19)
 * - traits는 AI가 운세 생성 시 참고하는 핵심 특성
 * - 날짜 범위 수정 시 반드시 MMDD 형식 유지 (4자리)
 */
export const ZODIAC_SIGNS: ZodiacSign[] = [
  { name: "양자리", nameEn: "Aries", start: "0321", end: "0419", traits: "에너지와 추진력이 강해 신속한 결단이 필요한 시점에 유리합니다. 다만 성급함을 조절할 필요가 있습니다." },
  { name: "황소자리", nameEn: "Taurus", start: "0420", end: "0520", traits: "안정적이고 꾸준한 흐름이 들어오며 재정·물질적 성취에 강세가 보입니다. 고집이 갈등 요인이 될 수 있습니다." },
  { name: "쌍둥이자리", nameEn: "Gemini", start: "0521", end: "0621", traits: "커뮤니케이션 능력이 강화되며 새로운 정보, 인맥, 기회가 늘어납니다. 과한 선택지로 인해 집중 분산이 발생할 수 있습니다." },
  { name: "게자리", nameEn: "Cancer", start: "0622", end: "0722", traits: "감정적 유대 및 가정·인간관계 중심의 변화가 있습니다. 안정과 보호 본능이 강화되며 내적 성찰에 적합합니다." },
  { name: "사자자리", nameEn: "Leo", start: "0723", end: "0822", traits: "자신감과 리더십이 상승합니다. 창작, 표현, 대외적 활동에 유리하며 주목받는 기회가 증가합니다." },
  { name: "처녀자리", nameEn: "Virgo", start: "0823", end: "0923", traits: "분석력·정밀함·실무 능력이 상승합니다. 건강 관리와 정리·정돈 분야에서 좋은 성과가 있습니다." },
  { name: "천칭자리", nameEn: "Libra", start: "0924", end: "1022", traits: "협력·균형·중재에 강세가 있으며 새로운 인간관계가 열립니다. 우유부단함이 단점으로 나타날 수 있습니다." },
  { name: "전갈자리", nameEn: "Scorpio", start: "1023", end: "1122", traits: "집중력·통찰·변화가 핵심입니다. 숨겨진 정보나 심층 분석에 능하며 권력 구조 변동에도 강합니다." },
  { name: "사수자리", nameEn: "Sagittarius", start: "1123", end: "1221", traits: "확장·모험·학습 분야에서 성장 기회가 큽니다. 이동·여행·지식 습득에 유리합니다." },
  { name: "염소자리", nameEn: "Capricorn", start: "1222", end: "0119", traits: "목표 달성 능력이 강화되며 책임·규율·현실적 성과에 강세가 있습니다. 장기 프로젝트에 적합합니다." },
  { name: "물병자리", nameEn: "Aquarius", start: "0120", end: "0218", traits: "혁신·독창성·기술 분야에서 기회가 큽니다. 기존 틀을 벗어나는 변화가 유리하게 작용합니다." },
  { name: "물고기자리", nameEn: "Pisces", start: "0219", end: "0320", traits: "직관·감성·창의성이 크게 강화됩니다. 예술·감성적 작업에 유리하지만 현실감 저하에 주의가 필요합니다." }
];
