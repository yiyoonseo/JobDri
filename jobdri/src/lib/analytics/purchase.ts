import type { CreditPlanCode } from "./events";

/**
 * 결제창(토스페이)으로 이동하면 페이지가 바뀌어 상품 정보가 사라진다.
 * `credit_purchase_completed` 에 상품 정보를 붙이기 위해 결제 직전에 저장해 두고,
 * 결제 완료가 확인되면 꺼내 쓴다.
 */
export interface PendingPurchase {
  plan_code: CreditPlanCode;
  credit_amount: number;
  price: number;
}

const PENDING_PURCHASE_KEY = "jobdri.analytics.pendingPurchase";

export function savePendingPurchase(purchase: PendingPurchase) {
  try {
    window.sessionStorage.setItem(
      PENDING_PURCHASE_KEY,
      JSON.stringify(purchase),
    );
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 완료 이벤트만 생략된다.
  }
}

export function consumePendingPurchase(): PendingPurchase | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_PURCHASE_KEY);
    window.sessionStorage.removeItem(PENDING_PURCHASE_KEY);

    return raw ? (JSON.parse(raw) as PendingPurchase) : null;
  } catch {
    return null;
  }
}
