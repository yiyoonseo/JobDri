/**
 * 택소노미 이벤트 정의 (로그인 화면 / 내 모의지원 홈 화면 / 모의 지원 플로우)
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
  // 모의 공고 > 공고 입력
  JD_INPUT_PAGE_VIEWED: "jd_input_page_viewed",
  JD_INPUT_SUBMITTED: "jd_input_submitted",
  // 모의 공고 > 공고 확인
  JD_REVIEW_PAGE_VIEWED: "jd_review_page_viewed",
  JD_SECTION_EDIT_CLICKED: "jd_section_edit_clicked",
  JD_SECTION_EDITED: "jd_section_edited",
  // 모의 공고 > 문항 선택
  CUSTOM_QUESTION_ADDED: "custom_question_added",
  // 모의 공고 > 자소서 입력
  WRITE_PAGE_VIEWED: "write_page_viewed",
  ANSWER_TAB_SWITCHED: "answer_tab_switched",
  ANSWER_AUTO_SAVED: "answer_auto_saved",
  APPLY_SUBMIT_CLICKED: "apply_submit_clicked",
  APPLY_CONFIRMED: "apply_confirmed",
  CREDIT_INSUFFICIENT_SHOWN: "credit_insufficient_shown",
  CREDIT_CHARGE_FROM_MODAL_CLICKED: "credit_charge_from_modal_clicked",
  // 모의 공고 > 분석 로딩
  ANALYSIS_STARTED: "analysis_started",
  ANALYSIS_COMPLETED: "analysis_completed",
  ANALYSIS_FAILED: "analysis_failed",
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

/**
 * 공고 입력 페이지 유입 경로.
 * (택소노미의 `extension` 은 추후 추가 예정으로 현재는 제외)
 */
export type JdEntrySource = "new" | "resume" | "retry";

/** 공고 입력 방식 */
export type JdInputMethod = "text" | "image";

/** 공고 확인 화면에서 수정할 수 있는 섹션 */
export type JdSectionId =
  | "company_name"
  | "position"
  | "duties"
  | "requirements"
  | "preferred";

/** AI 분석 실패 유형 */
export type AnalysisErrorType = "credit_insufficient" | "unknown";

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
  /**
   * 모의 지원(mock_apply_id)은 공고 확인에서 '다음으로'를 눌러야 생성된다.
   * 그 이전 단계(공고 입력 / 공고 확인)에서는 ID가 없어 생략한다.
   */
  [ANALYTICS_EVENTS.JD_INPUT_PAGE_VIEWED]: {
    mock_apply_id?: number;
    entry_source: JdEntrySource;
  };
  [ANALYTICS_EVENTS.JD_INPUT_SUBMITTED]: {
    mock_apply_id?: number;
    input_method: JdInputMethod;
    /** 공고 분석 전이라 판별할 수 없어 현재는 생략한다 */
    has_company_name?: boolean;
  };
  [ANALYTICS_EVENTS.JD_REVIEW_PAGE_VIEWED]: { mock_apply_id?: number };
  [ANALYTICS_EVENTS.JD_SECTION_EDIT_CLICKED]: {
    mock_apply_id?: number;
    section_id: JdSectionId;
  };
  [ANALYTICS_EVENTS.JD_SECTION_EDITED]: {
    mock_apply_id?: number;
    section_id: JdSectionId;
  };
  [ANALYTICS_EVENTS.CUSTOM_QUESTION_ADDED]: {
    mock_apply_id: number;
    selected_count: number;
  };
  [ANALYTICS_EVENTS.WRITE_PAGE_VIEWED]: {
    mock_apply_id: number;
    question_count: number;
  };
  [ANALYTICS_EVENTS.ANSWER_TAB_SWITCHED]: {
    mock_apply_id: number;
    question_index: number;
  };
  [ANALYTICS_EVENTS.ANSWER_AUTO_SAVED]: {
    mock_apply_id: number;
    completed_count: number;
  };
  [ANALYTICS_EVENTS.APPLY_SUBMIT_CLICKED]: {
    mock_apply_id: number;
    all_complete: boolean;
  };
  [ANALYTICS_EVENTS.APPLY_CONFIRMED]: {
    mock_apply_id: number;
    job_posting_id?: number;
  };
  [ANALYTICS_EVENTS.CREDIT_INSUFFICIENT_SHOWN]: { mock_apply_id: number };
  [ANALYTICS_EVENTS.CREDIT_CHARGE_FROM_MODAL_CLICKED]: {
    mock_apply_id: number;
  };
  [ANALYTICS_EVENTS.ANALYSIS_STARTED]: {
    mock_apply_id: number;
    job_posting_id?: number;
  };
  [ANALYTICS_EVENTS.ANALYSIS_COMPLETED]: {
    mock_apply_id: number;
    job_posting_id?: number;
    sequence?: number;
  };
  [ANALYTICS_EVENTS.ANALYSIS_FAILED]: {
    mock_apply_id: number;
    error_type: AnalysisErrorType;
  };
}
