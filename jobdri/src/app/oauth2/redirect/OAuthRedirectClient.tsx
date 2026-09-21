"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { ANALYTICS_EVENTS, track } from "@/lib/analytics";
import { getEmailFromAccessToken, saveAuthTokens } from "@/lib/auth";
import { shouldShowDesktopRequiredPage } from "@/utils/device";

export default function OAuthRedirectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = searchParams.get("accessToken");
  const refreshToken = searchParams.get("refreshToken");
  const error = searchParams.get("error");
  const errorMessage = searchParams.get("message");
  const message =
    accessToken && refreshToken
      ? "Google 로그인 처리 중입니다."
      : errorMessage ||
        (error
          ? "Google 로그인에 실패했습니다."
          : "로그인 정보를 확인할 수 없습니다.");

  useEffect(() => {
    if (accessToken && refreshToken) {
      saveAuthTokens(
        { accessToken, refreshToken },
        searchParams.get("email") ||
          getEmailFromAccessToken(accessToken) ||
          undefined,
      );
      track(ANALYTICS_EVENTS.LOGIN_COMPLETED, { login_method: "google" });
      router.replace(
        shouldShowDesktopRequiredPage()
          ? ROUTES.DESKTOP_REQUIRED
          : ROUTES.HOME,
      );
      return;
    }

    const timerId = window.setTimeout(() => {
      router.replace(ROUTES.LOGIN);
    }, 2000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [accessToken, refreshToken, router, searchParams]);

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-bg-default px-4">
      <section className="flex w-[440px] max-w-full flex-col items-center gap-6 rounded-card bg-bg-contents-default p-10 shadow-[0_0_24px_0_var(--color-bg-shadow-default)]">
        <h1 className="text-center text-[32px] leading-[130%] font-bold text-text-neutral-title [font-feature-settings:'liga'_off,'clig'_off]">
          JobDri
        </h1>
        <p className="text-sub14-med text-center text-text-neutral-caption [font-feature-settings:'liga'_off,'clig'_off]">
          {message}
        </p>
      </section>
    </main>
  );
}
