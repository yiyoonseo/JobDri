"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard } from "@/components/common/cards";
import Useage from "@/components/common/credit/Useage";
import CouponRegistrationModal from "@/components/common/credit/CouponRegistrationModal";
import {
  fetchCreditPlans,
  checkPaymentStatus,
  type CreditPlan,
  fetchCreditBalance,
} from "@/lib/api/credit";
import Lnb from "@/components/common/lnb/Lnb";
import PageHeader from "@/components/common/PageHeader";
import { BusinessFooter } from "@/components/common/footer";
import { Toast } from "@/components/common/toast";
import { useCreditStore } from "@/lib/store/useCreditStore";
import { Button } from "@/components/common/buttons";
import {
  ANALYTICS_EVENTS,
  consumePendingPurchase,
  track,
} from "@/lib/analytics";

function calcDiscountRate(plan: CreditPlan, basePricePerUnit: number): string {
  const original = basePricePerUnit * plan.creditAmount;
  if (original <= plan.price) return "";
  const rate = Math.round(((original - plan.price) / original) * 100);
  return `${rate}%`;
}

function CreditContent() {
  const [plans, setPlans] = useState<CreditPlan[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponToastCreditAmount, setCouponToastCreditAmount] = useState<
    number | null
  >(null);
  const searchParams = useSearchParams();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const router = useRouter();
  const hasTrackedPageView = useRef(false);

  useEffect(() => {
    if (hasTrackedPageView.current) return;
    hasTrackedPageView.current = true;

    fetchCreditBalance()
      .then((balance) => {
        track(ANALYTICS_EVENTS.CREDIT_PAGE_VIEWED, {
          remaining_credit: balance,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    fetchCreditPlans()
      .then(setPlans)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const paymentId = searchParams.get("paymentId");

    if (paymentId) {
      let isPolling = true;

      const pollStatus = async () => {
        try {
          const response = await checkPaymentStatus(paymentId);
          // API 타입이 지정되지 않은 경우를 대비한 타입 단언
          const data = response as unknown as {
            status?: string;
            result?: { status?: string };
          };
          const status = data.status || data.result?.status;

          if (status === "COMPLETED") {
            isPolling = false;
            window.history.replaceState(null, "", window.location.pathname);
            setIsConfirming(false);

            const purchase = consumePendingPurchase();
            if (purchase) {
              track(ANALYTICS_EVENTS.CREDIT_PURCHASE_COMPLETED, purchase);
            }

            // 서버에서 최신 잔액 조회
            fetchCreditBalance()
              .then((latestBalance) => {
                useCreditStore.getState().setCreditCount(latestBalance);
                setToastMessage("크레딧 충전이 완료되었습니다.");
              })
              .catch((err) => {
                console.error("잔액 갱신 실패:", err);
                alert("결제는 완료되었으나 잔액 동기화에 실패했습니다.");
                window.location.reload();
              });
          } else if (status === "FAILED") {
            isPolling = false;
            window.history.replaceState(null, "", window.location.pathname);
            setIsConfirming(false);
            setToastMessage("결제에 실패했거나 취소되었습니다.");
          } else {
            // PENDING, PROCESSING, UNKNOWN 상태일 경우 계속 폴링
            if (isPolling) {
              setTimeout(pollStatus, 2000); // 2초 주기로 폴링
            }
          }
        } catch (error: unknown) {
          console.error("결제 상태 조회 실패:", error);
          isPolling = false;
          window.history.replaceState(null, "", window.location.pathname);
          setIsConfirming(false);
          alert("결제 상태를 확인하는 중 오류가 발생했습니다.");
        }
      };

      Promise.resolve().then(() => {
        setIsConfirming(true);
        pollStatus();
      });

      // 폴링 중단
      return () => {
        isPolling = false;
      };
    }
  }, [searchParams]);

  useEffect(() => {
    const isCanceled = searchParams.get("cancel");

    if (isCanceled === "true") {
      setTimeout(() => {
        setToastMessage("결제가 취소되었습니다.");
      }, 100);

      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    if (couponToastCreditAmount === null) return;

    const toastTimer = window.setTimeout(() => {
      setCouponToastCreditAmount(null);
    }, 3000);

    return () => window.clearTimeout(toastTimer);
  }, [couponToastCreditAmount]);

  const handleCouponRegistrationSuccess = (creditAmount: number) => {
    setIsCouponModalOpen(false);
    setCouponToastCreditAmount(creditAmount);
  };

  const basePricePerUnit =
    plans.find((p) => p.planCode === "ONE_TIME")?.price ?? 2500;

  return (
    <>
      <div className="flex self-stretch items-end justify-between">
        <PageHeader />
        <Button
          label="쿠폰 등록하기"
          styleType="tertiary"
          size="large"
          onClick={() => setIsCouponModalOpen(true)}
        />
      </div>

      {isCouponModalOpen && (
        <CouponRegistrationModal
          onClose={() => setIsCouponModalOpen(false)}
          onSuccess={handleCouponRegistrationSuccess}
        />
      )}

      {couponToastCreditAmount !== null && (
        <Toast
          message={`${couponToastCreditAmount}크레딧이 충전되었습니다!`}
          variant="check"
          onClose={() => setCouponToastCreditAmount(null)}
        />
      )}

      {isConfirming && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="text-white text-h24-bold animate-pulse">
            결제 결과를 확인하고 있습니다...
          </div>
        </div>
      )}
      <section className="mx-auto mt-8 mb-16 flex w-full flex-row gap-4">
        {plans.map((plan) => (
          <CreditCard
            key={plan.planCode}
            creditCount={plan.creditAmount}
            price={plan.price.toLocaleString()}
            planCode={plan.planCode}
            discountRate={calcDiscountRate(plan, basePricePerUnit)}
            onPurchase={() =>
              track(ANALYTICS_EVENTS.CREDIT_PLAN_CLICKED, {
                plan_code: plan.planCode,
                credit_amount: plan.creditAmount,
                price: plan.price,
              })
            }
          />
        ))}
      </section>
      <div className="min-w-265">
        <Useage />
      </div>
    </>
  );
}

export default function CreditPage() {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#F5F6F9]">
      <Lnb initialActiveItem={null} className="z-50 shrink-0" />
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <main className="mx-auto w-full max-w-[1320px] min-w-[1060px] px-18 pt-12 pb-60">
          <Suspense fallback={<div>로딩 중...</div>}>
            <CreditContent />
          </Suspense>
        </main>
        <BusinessFooter />
      </div>
    </div>
  );
}
