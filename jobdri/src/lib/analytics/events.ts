/**
 * 택소노미 이벤트 정의 (로그인 화면 / 내 모의지원 홈 화면)
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
  // 내 모의지원 홈
  HOME_PAGE_VIEWED: "home_page_viewed",
  NEW_APPLY_CLICKED: "new_apply_clicked",
  // 홈 > 이어서 작성하기
  PAUSED_APPLY_RESUMED: "paused_apply_resumed",
  PAUSED_CAROUSEL_NAVIGATED: "paused_carousel_navigated",
  PAUSED_KEBAB_CLICKED: "paused_kebab_clicked",
  APPLY_DELETE_CONFIRMED: "apply_delete_confirmed",
  // 홈 > 분석 완료
  RESULT_APPLY_VIEWED: "result_apply_viewed",
  APPLY_RETRY_CLICKED: "apply_retry_clicked",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** 로그인 페이지 유입 경로 */
export type LoginReferrer = "direct" | "mockApply" | "credit";

/** 로그인 방식 */
export type LoginMethod = "email" | "google";

/** 이어서 작성하기 캐러셀 이동 방향 */
export type CarouselDirection = "left" | "right";

/** 지원 기록이 속한 홈 화면 섹션 */
export type ApplySection = "paused" | "completed";

/**
 * 점수 뱃지 유형.
 *
 * 점수 구간 기준이 아직 정해지지 않아 현재는 전송하지 않는다.
 * 기준이 확정되면 resolveBadgeType() 한 곳만 채우면 된다.
 */
export type BadgeType = "needs_improvement" | "improvable";

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
  [ANALYTICS_EVENTS.HOME_PAGE_VIEWED]: {
    paused_count: number;
    completed_count: number;
  };
  [ANALYTICS_EVENTS.NEW_APPLY_CLICKED]: undefined;
  [ANALYTICS_EVENTS.PAUSED_APPLY_RESUMED]: {
    /** 공고만 저장하고 모의지원을 시작하지 않은 카드는 ID가 없다 */
    mock_apply_id?: number;
    company: string;
    position: string;
    status: string;
    progress: string;
  };
  [ANALYTICS_EVENTS.PAUSED_CAROUSEL_NAVIGATED]: {
    direction: CarouselDirection;
    total_pages: number;
    current_page: number;
  };
  [ANALYTICS_EVENTS.PAUSED_KEBAB_CLICKED]: {
    mock_apply_id?: number;
    company: string;
  };
  [ANALYTICS_EVENTS.APPLY_DELETE_CONFIRMED]: {
    mock_apply_id?: number;
    company: string;
    section: ApplySection;
  };
  [ANALYTICS_EVENTS.RESULT_APPLY_VIEWED]: {
    mock_apply_id: number;
    company: string;
    position: string;
    score?: number;
    badge_type?: BadgeType;
    analysis_date: string;
  };
  [ANALYTICS_EVENTS.APPLY_RETRY_CLICKED]: {
    mock_apply_id: number;
    company: string;
    score?: number;
  };
}
