import { ROUTES } from "@/constants/routes";
import type { LoginReferrer } from "./events";

/**
 * 로그인 페이지 유입 경로를 판별한다.
 *
 * 1순위: proxy / api client 가 붙여주는 `?redirect=` 파라미터
 *        (비로그인 상태로 보호된 경로에 접근해 리다이렉트된 경우)
 * 2순위: 같은 오리진에서 넘어온 document.referrer 의 경로
 * 그 외: direct
 */
export function resolveLoginReferrer(
  redirectPath?: string | null,
): LoginReferrer {
  const fromRedirect = matchReferrer(redirectPath);

  if (fromRedirect) {
    return fromRedirect;
  }

  return matchReferrer(getInternalReferrerPath()) ?? "direct";
}

function matchReferrer(path?: string | null): LoginReferrer | null {
  if (!path) {
    return null;
  }

  if (path.startsWith(ROUTES.APPLY)) {
    return "mockApply";
  }

  if (path.startsWith(ROUTES.CREDIT)) {
    return "credit";
  }

  return null;
}

function getInternalReferrerPath(): string | null {
  if (typeof window === "undefined" || !document.referrer) {
    return null;
  }

  try {
    const referrerUrl = new URL(document.referrer);

    return referrerUrl.origin === window.location.origin
      ? referrerUrl.pathname
      : null;
  } catch {
    return null;
  }
}
