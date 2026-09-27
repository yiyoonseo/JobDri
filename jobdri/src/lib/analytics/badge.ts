import type { BadgeType } from "./events";

/**
 * 서류 점수 → 점수 뱃지 유형(`badge_type`).
 *
 * TODO: 보완 필요 / 개선 가능을 가르는 점수 구간 기준이 아직 정해지지 않았다.
 * 기준이 확정되면 이 함수만 채우면 `result_apply_viewed` 에 badge_type 이 붙는다.
 * (기준 없이 임의 값을 보내면 지표가 오염되므로 그때까지는 속성을 생략한다.)
 */
export function resolveBadgeType(score?: number): BadgeType | undefined {
  void score;
  return undefined;
}
