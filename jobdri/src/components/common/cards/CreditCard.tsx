"use client";

import { useState, useEffect } from "react";
import type { HTMLAttributes } from "react";
import clsx from "clsx";
import { Button } from "@/components/common/buttons";
import { ModalCard } from "../modal/ModalCard";
import { ModalOverlay } from "../modal/ModalOverlay";
import type { PlanCode } from "@/lib/api/credit";
import { preparePurchase } from "@/lib/api/credit";
import { savePendingPurchase } from "@/lib/analytics";
import { Toast } from "../toast";

interface CreditCardProps extends HTMLAttributes<HTMLElement> {
  creditCount?: number;
  price?: string;
  discountRate?: string;
  buttonLabel?: string;
  planCode: PlanCode;
  onPurchase?: () => void;
}

export default function CreditCard({
  creditCount = 3,
  price = "2,500",
  discountRate = "21",
  buttonLabel = "구매하기",
  planCode,
  onPurchase,
  className,
  ...articleProps
}: CreditCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handlePurchaseClick = () => {
    onPurchase?.();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isLoading) setIsModalOpen(false);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleConfirmPurchase = async () => {
    setIsLoading(true);
    try {
      // 결제 준비
      const paymentData = await preparePurchase(planCode);

      // 결제 완료 후 credit_purchase_completed 에 붙일 상품 정보
      savePendingPurchase({
        plan_code: planCode,
        credit_amount: paymentData.creditAmount,
        price: paymentData.amount,
      });

      // 토스페이 결제창(checkoutPage)으로 리다이렉트
      if (paymentData.checkoutPage) {
        window.location.assign(paymentData.checkoutPage);
      } else {
        throw new Error("결제 페이지 URL을 찾을 수 없습니다.");
      }
    } catch (error: unknown) {
      console.error("결제 진행 중 오류:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "결제 진행 중 오류가 발생했습니다.";
      setToastMessage(errorMessage);
      setIsModalOpen(false);
      setIsLoading(false);
    }
  };

  return (
    <>
      {toastMessage && (
        <div className="fixed top-10 left-1/2 z-[9999] -translate-x-1/2">
          <Toast message={toastMessage} position="top" />
        </div>
      )}

      {isModalOpen && (
        <ModalOverlay onClose={handleCloseModal}>
          <ModalCard
            onSecondaryClick={handleCloseModal}
            onPrimaryClick={handleConfirmPurchase}
            title="크레딧을 충전할까요?"
            description={`${creditCount} 크레딧을 충전합니다.`}
            secondaryBtn="닫기"
            primaryBtn={isLoading ? "처리 중..." : "충전하기"}
          />
        </ModalOverlay>
      )}

      {/* 크레딧 카드 UI */}
      <main
        className={clsx(
          "flex w-full flex-col items-center h-fit rounded-card bg-bg-contents-default px-8 pt-8 pb-7 shadow-card",
          className,
        )}
        {...articleProps}
      >
        <div className="flex flex-1 flex-col justify-between gap-8 w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-end justify-center gap-1">
              <span className="text-center text-[32px] font-bold leading-[130%] text-text-neutral-title ">
                {creditCount}
              </span>
              <span className="flex items-center justify-center gap-2.5 pb-1 text-center text-b16-med text-text-neutral-caption">
                크레딧
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex items-start">
                <span className="text-center text-h24-bold text-text-neutral-title [font-feature-settings:'liga'_off,'clig'_off]">
                  {price}원
                </span>
              </div>

              <div
                className={clsx(
                  "flex items-start",
                  !discountRate ? "invisible" : "",
                )}
              >
                <span className="text-center text-b16-med text-text-primary-strong ">
                  {discountRate} 할인
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between gap-2 w-full">
            <Button
              label={buttonLabel}
              size="large"
              styleType="secondary"
              onClick={handlePurchaseClick}
            />
            <p className="text-cap12-med text-text-neutral-caption items-center justify-center flex">
              * 구매한 이용권은 구매일로부터 6개월간 유효합니다
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
