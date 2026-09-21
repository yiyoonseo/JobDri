"use client";

import * as amplitude from "@amplitude/analytics-browser";
import type { AnalyticsEventName, AnalyticsEventProperties } from "./events";

const API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
const isDebugEnabled = process.env.NODE_ENV !== "production";

let isInitialized = false;

/**
 * Amplitude 초기화. API 키가 없으면 전송하지 않고 조용히 비활성화한다.
 * (로컬/프리뷰 환경에서 키 없이도 앱이 동작해야 하므로 throw 하지 않는다.)
 */
export function initAnalytics() {
  if (isInitialized || typeof window === "undefined") {
    return;
  }

  if (!API_KEY) {
    if (isDebugEnabled) {
      console.info(
        "[analytics] NEXT_PUBLIC_AMPLITUDE_API_KEY 가 없어 이벤트 전송이 비활성화되었습니다.",
      );
    }
    return;
  }

  amplitude.init(API_KEY, {
    // 택소노미에 정의된 이벤트만 수집한다. (PII 유입 가능성이 있는
    // 폼/엘리먼트 자동 수집은 끄고, 세션 집계만 유지)
    autocapture: {
      attribution: true,
      pageViews: false,
      sessions: true,
      formInteractions: false,
      fileDownloads: false,
      elementInteractions: false,
    },
  });

  isInitialized = true;
}

/**
 * 택소노미에 정의된 이벤트만 전송한다.
 * 이벤트 명과 속성 조합이 `AnalyticsEventProperties` 와 다르면 타입 에러가 난다.
 */
export function track<T extends AnalyticsEventName>(
  ...args: AnalyticsEventProperties[T] extends undefined
    ? [event: T]
    : [event: T, properties: AnalyticsEventProperties[T]]
) {
  const [event, properties] = args;

  if (typeof window === "undefined") {
    return;
  }

  if (isDebugEnabled) {
    console.debug("[analytics]", event, properties ?? {});
  }

  if (!isInitialized) {
    return;
  }

  amplitude.track(event, properties as Record<string, unknown> | undefined);
}
