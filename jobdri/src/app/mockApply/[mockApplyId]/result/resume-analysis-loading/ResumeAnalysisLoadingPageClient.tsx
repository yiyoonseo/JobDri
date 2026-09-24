"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import ResumeAnalysisLoading from "@/components/mockApply/ResumeAnalysisLoading";
import { ModalNotice } from "@/components/common/modal";
import {
  AnalysisPendingError,
  CreditInsufficientError,
  fetchAnalysisResult,
  fetchAnalysisTaskStatus,
  isCreditInsufficientMessage,
  subscribeAnalysisTaskStream,
} from "@/lib/api/result";
import { fetchMockApplyJobPosting } from "@/lib/api/mockApplies";
import {
  ANALYTICS_EVENTS,
  track,
  type AnalysisErrorType,
} from "@/lib/analytics";

const RESUME_ANALYSIS_LOADING_DURATION_MS = 316_000;
const ANALYSIS_POLL_INTERVAL_MS = 2_500;
const ANALYSIS_POLL_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_CONSECUTIVE_STATUS_ERRORS = 3;
const INVALID_MOCK_APPLY_MESSAGE =
  "지원 정보를 확인할 수 없어요. 홈에서 다시 시도해주세요.";

interface ResumeAnalysisLoadingPageClientProps {
  taskId?: string;
  jobPostingId?: number;
  applicationLabel?: string;
  initialSequence?: number;
  isError?: boolean;
}

function isFailedTaskStatus(status: string) {
  const normalizedStatus = status.trim().toUpperCase();

  return (
    normalizedStatus.includes("FAIL") ||
    normalizedStatus.includes("ERROR") ||
    normalizedStatus.includes("CANCEL")
  );
}

function isCompletedTaskStatus(status: string) {
  const normalizedStatus = status.trim().toUpperCase();

  return (
    normalizedStatus.includes("COMPLETE") ||
    normalizedStatus.includes("SUCCESS") ||
    normalizedStatus.includes("SUCCEED") ||
    normalizedStatus.includes("DONE")
  );
}

export default function ResumeAnalysisLoadingPageClient({
  taskId,
  jobPostingId,
  applicationLabel,
  initialSequence,
  isError,
}: ResumeAnalysisLoadingPageClientProps) {
  const router = useRouter();

  const params = useParams();
  const mockApplyId = Number(params.mockApplyId);
  const isValidMockApplyId = Number.isInteger(mockApplyId) && mockApplyId > 0;
  const [pollingRetryKey, setPollingRetryKey] = useState(0);
  const [isCreditShortModalOpen, setIsCreditShortModalOpen] = useState(false);
  const [jobPostingHeader, setJobPostingHeader] = useState({
    companyName: "",
    jobTitle: "",
  });
  const [errorMessage, setErrorMessage] = useState(
    isError
      ? `응답 대기 시간이 길어져 작업을 멈췄어요.\n소모된 크레딧이 복구됐어요.`
      : isValidMockApplyId
        ? ""
        : INVALID_MOCK_APPLY_MESSAGE,
  );

  const hasTrackedStartRef = useRef(false);

  const trackAnalysisFailed = useCallback(
    (errorType: AnalysisErrorType) => {
      track(ANALYTICS_EVENTS.ANALYSIS_FAILED, {
        mock_apply_id: mockApplyId,
        error_type: errorType,
      });
    },
    [mockApplyId],
  );

  const openCreditShortModal = useCallback(() => {
    trackAnalysisFailed("credit_insufficient");
    track(ANALYTICS_EVENTS.CREDIT_INSUFFICIENT_SHOWN, {
      mock_apply_id: mockApplyId,
    });
    setIsCreditShortModalOpen(true);
  }, [mockApplyId, trackAnalysisFailed]);

  const failAnalysis = useCallback(
    (message: string) => {
      trackAnalysisFailed("unknown");
      setErrorMessage(message);
    },
    [trackAnalysisFailed],
  );

  useEffect(() => {
    // 알림에서 실패 결과로 진입한 경우(isError)는 분석이 시작된 것이 아니다.
    if (isError || !isValidMockApplyId || hasTrackedStartRef.current) {
      return;
    }

    hasTrackedStartRef.current = true;
    track(ANALYTICS_EVENTS.ANALYSIS_STARTED, {
      mock_apply_id: mockApplyId,
      job_posting_id: jobPostingId,
    });
  }, [isError, isValidMockApplyId, jobPostingId, mockApplyId]);

  const moveToResult = useCallback(
    (sequence?: number) => {
      if (!Number.isInteger(mockApplyId) || mockApplyId <= 0) {
        return;
      }

      const resolvedSequence = sequence ?? initialSequence;

      track(ANALYTICS_EVENTS.ANALYSIS_COMPLETED, {
        mock_apply_id: mockApplyId,
        job_posting_id: jobPostingId,
        sequence: resolvedSequence,
      });

      const resultSearchParams = new URLSearchParams();

      if (jobPostingId) {
        resultSearchParams.set("jobPostingId", String(jobPostingId));
      }

      if (resolvedSequence) {
        resultSearchParams.set("sequence", String(resolvedSequence));
      }

      const resultQuery = resultSearchParams.size
        ? `?${resultSearchParams.toString()}`
        : "";

      router.replace(`/mockApply/${mockApplyId}/result${resultQuery}`);
    },
    [initialSequence, jobPostingId, mockApplyId, router],
  );

  const moveBackToResume = useCallback(() => {
    const jobPostingQuery = jobPostingId ? `?jobPostingId=${jobPostingId}` : "";

    router.replace(`/mockApply/${mockApplyId}${jobPostingQuery}`);
  }, [jobPostingId, mockApplyId, router]);

  useEffect(() => {
    if (!isValidMockApplyId) {
      return;
    }

    let ignore = false;

    const loadJobPostingHeader = async () => {
      try {
        const jobPosting = await fetchMockApplyJobPosting(mockApplyId);

        if (!ignore) {
          setJobPostingHeader({
            companyName: jobPosting.companyName,
            jobTitle:
              jobPosting.jobTitle || jobPosting.detailClassificationName || "",
          });
        }
      } catch (error) {
        if (!ignore) {
          console.error("채용 공고 정보를 불러오지 못했습니다.", error);
        }
      }
    };

    void loadJobPostingHeader();

    return () => {
      ignore = true;
    };
  }, [isValidMockApplyId, mockApplyId]);

  useEffect(() => {
    if (isError || !isValidMockApplyId) {
      return;
    }

    let cancelled = false;
    let isStatusRequestInFlight = false;
    let isFinished = false;
    let consecutiveStatusErrors = 0;
    const abortController = new AbortController();

    const pollAnalysis = async () => {
      if (cancelled || isFinished || isStatusRequestInFlight) {
        return;
      }

      isStatusRequestInFlight = true;

      try {
        if (!taskId) {
          const legacyResult = await fetchAnalysisResult(
            mockApplyId,
            abortController.signal,
          );

          if (!cancelled) {
            isFinished = true;
            abortController.abort();
            moveToResult(legacyResult.sequence);
          }
          return;
        }

        const task = await fetchAnalysisTaskStatus(
          mockApplyId,
          taskId,
          abortController.signal,
        );
        consecutiveStatusErrors = 0;

        if (cancelled) {
          return;
        }

        const resultMockApplyId = task.result?.mockApplyId ?? 0;
        const hasMismatchedTask =
          (Boolean(task.taskId) && task.taskId !== taskId) ||
          (task.mockApplyId > 0 && task.mockApplyId !== mockApplyId) ||
          (resultMockApplyId > 0 && resultMockApplyId !== mockApplyId);

        if (hasMismatchedTask) {
          isFinished = true;
          abortController.abort();
          failAnalysis("요청한 지원서와 분석 작업 정보가 일치하지 않아요.");
          return;
        }

        if (
          isCreditInsufficientMessage(task.error) ||
          isCreditInsufficientMessage(task.failureReason)
        ) {
          isFinished = true;
          abortController.abort();
          openCreditShortModal();
          return;
        }

        if (
          task.error ||
          task.failureReason ||
          isFailedTaskStatus(task.status)
        ) {
          isFinished = true;
          abortController.abort();
          failAnalysis(
            task.failureReason ||
              task.error ||
              task.message ||
              "자소서 분석에 실패했어요. 다시 시도해주세요.",
          );
          return;
        }

        if (task.result) {
          isFinished = true;
          abortController.abort();
          moveToResult(task.result.sequence);
          return;
        }

        if (isCompletedTaskStatus(task.status)) {
          isFinished = true;
          abortController.abort();
          failAnalysis(
            task.message || "완료된 자소서 분석 결과를 확인할 수 없어요.",
          );
        }
      } catch (error) {
        if (cancelled || abortController.signal.aborted) {
          return;
        }

        if (error instanceof AnalysisPendingError) {
          consecutiveStatusErrors = 0;
          return;
        }

        if (error instanceof CreditInsufficientError) {
          isFinished = true;
          abortController.abort();
          openCreditShortModal();
          return;
        }

        consecutiveStatusErrors += 1;
        console.warn(
          `분석 상태 조회에 실패했습니다. (${consecutiveStatusErrors}/${MAX_CONSECUTIVE_STATUS_ERRORS})`,
          error,
        );

        if (consecutiveStatusErrors < MAX_CONSECUTIVE_STATUS_ERRORS) {
          return;
        }

        isFinished = true;
        abortController.abort();
        failAnalysis(
          error instanceof Error
            ? error.message
            : "분석 결과를 불러오지 못했어요.",
        );
      } finally {
        isStatusRequestInFlight = false;
      }
    };

    const pollTimer = window.setInterval(() => {
      void pollAnalysis();
    }, ANALYSIS_POLL_INTERVAL_MS);
    const timeoutTimer = window.setTimeout(() => {
      if (cancelled || isFinished) {
        return;
      }

      isFinished = true;
      abortController.abort();
      failAnalysis(
        "분석 시간이 예상보다 길어지고 있어요. 잠시 후 다시 확인해주세요.",
      );
    }, ANALYSIS_POLL_TIMEOUT_MS);

    void pollAnalysis();
    if (taskId) {
      void subscribeAnalysisTaskStream(mockApplyId, taskId, {
        signal: abortController.signal,
        onEvent: () => {
          void pollAnalysis();
        },
      }).catch((error) => {
        if (!cancelled && !abortController.signal.aborted) {
          console.warn(
            "실시간 분석 상태 연결이 종료되어 상태 조회를 계속합니다.",
            error,
          );
        }
      });
    }

    return () => {
      cancelled = true;
      abortController.abort();
      window.clearInterval(pollTimer);
      window.clearTimeout(timeoutTimer);
    };
  }, [
    isValidMockApplyId,
    mockApplyId,
    moveToResult,
    failAnalysis,
    openCreditShortModal,
    pollingRetryKey,
    taskId,
    isError,
  ]);

  const handleRetry = () => {
    if (!isValidMockApplyId) {
      setErrorMessage(INVALID_MOCK_APPLY_MESSAGE);
      return;
    }

    setErrorMessage("");
    setPollingRetryKey((current) => current + 1);
  };

  return (
    <>
      <ResumeAnalysisLoading
        durationMs={RESUME_ANALYSIS_LOADING_DURATION_MS}
        onBack={moveBackToResume}
        applicationLabel={applicationLabel}
        companyName={jobPostingHeader.companyName}
        jobTitle={jobPostingHeader.jobTitle}
      />

      {isCreditShortModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-lightbox-default">
          <ModalNotice
            type="confirmation"
            title="크레딧이 부족해요"
            description="크레딧을 충전하고 다시 시도해주세요."
            onClose={moveBackToResume}
            secondaryAction={{
              label: "닫기",
              onClick: moveBackToResume,
            }}
            primaryAction={{
              label: "충전하기",
              onClick: () => {
                track(ANALYTICS_EVENTS.CREDIT_CHARGE_FROM_MODAL_CLICKED, {
                  mock_apply_id: mockApplyId,
                });
                router.push("/credit");
              },
            }}
          />
        </div>
      )}

      {errorMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-lightbox-default">
          {isError || !isValidMockApplyId ? (
            <ModalNotice
              type="alertModal"
              title="나중에 다시 시도해주세요."
              description={errorMessage}
              onClose={moveBackToResume}
              primaryAction={{
                label: "확인",
                onClick: moveBackToResume,
              }}
            />
          ) : (
            <ModalNotice
              type="confirmation"
              title="분석 결과를 불러오지 못했어요"
              description={errorMessage}
              onClose={moveBackToResume}
              secondaryAction={{
                label: "자소서로 돌아가기",
                onClick: moveBackToResume,
              }}
              primaryAction={{
                label: "다시 확인",
                onClick: handleRetry,
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
