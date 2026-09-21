/**
 * 로그인 화면 택소노미 이벤트 정의
 *
 * 이벤트 명/속성 key 는 택소노미 문서와 1:1로 대응하며,
 * 이 파일 외부에서는 문자열 리터럴을 직접 쓰지 않는다.
 */

export const ANALYTICS_EVENTS = {
  // 로그인
  LOGIN_PAGE_VIEWED: "login_page_viewed",
  LOGIN_SUBMITTED: "login_submitted",
  LOGIN_COMPLETED: "login_completed",
  LOGIN_FAILED: "login_failed",
  GOOGLE_LOGIN_CLICKED: "google_login_clicked",
  // 회원가입
  SIGNUP_PAGE_VIEWED: "signup_page_viewed",
  SIGNUP_SUBMITTED: "signup_submitted",
  SIGNUP_FAILED: "signup_failed",
  // 이메일 인증
  VERIFICATION_SUBMITTED: "verification_submitted",
  VERIFICATION_COMPLETED: "verification_completed",
  VERIFICATION_FAILED: "verification_failed",
  VERIFICATION_RESEND_CLICKED: "verification_resend_clicked",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** 로그인 페이지 유입 경로 */
export type LoginReferrer = "direct" | "mockApply" | "credit";

/** 로그인 방식 */
export type LoginMethod = "email" | "google";

/** 이벤트별 속성 스키마 (택소노미의 `속성 key` 컬럼) */
export interface AnalyticsEventProperties {
  [ANALYTICS_EVENTS.LOGIN_PAGE_VIEWED]: { referrer: LoginReferrer };
  [ANALYTICS_EVENTS.LOGIN_SUBMITTED]: {
    login_method: Extract<LoginMethod, "email">;
  };
  [ANALYTICS_EVENTS.LOGIN_COMPLETED]: { login_method: LoginMethod };
  [ANALYTICS_EVENTS.LOGIN_FAILED]: {
    login_method: Extract<LoginMethod, "email">;
    error_message: string;
  };
  [ANALYTICS_EVENTS.GOOGLE_LOGIN_CLICKED]: undefined;
  [ANALYTICS_EVENTS.SIGNUP_PAGE_VIEWED]: undefined;
  [ANALYTICS_EVENTS.SIGNUP_SUBMITTED]: undefined;
  [ANALYTICS_EVENTS.SIGNUP_FAILED]: { error_message: string };
  [ANALYTICS_EVENTS.VERIFICATION_SUBMITTED]: undefined;
  [ANALYTICS_EVENTS.VERIFICATION_COMPLETED]: undefined;
  [ANALYTICS_EVENTS.VERIFICATION_FAILED]: { error_message: string };
  [ANALYTICS_EVENTS.VERIFICATION_RESEND_CLICKED]: undefined;
}
