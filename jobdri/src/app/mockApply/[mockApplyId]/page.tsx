"use client";
import { useState, useEffect, use, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QuestionList } from "@/components/mockApply/Question/QuestionList";
import JDSidePanel from "@/components/mockApply/Question/SidePanel";
import WritingForm from "@/components/mockApply/Question/WritingForm";
import clsx from "clsx";
import { scrollbarClassS } from "@/components/common/scrollbar/scrollbarStyles";
import {
  fetchQuestions,
  fetchSelectedQuestions,
  saveQuestions,
  saveApply,
  type QuestionItem,
} from "@/lib/api/questions";
import { ModalNotice } from "@/components/common/modal";
import { Toast, type ToastVariant } from "@/components/common/toast";
import {
  CreditInsufficientError,
  fetchAnalysisResult,
  fetchSequence,
  isCachedAnalysisResultAvailable,
  requestAnalysis,
} from "@/lib/api/result";
import MockApplyTemplate from "@/components/common/MockApplyTemplate";
import { fetchMockApplyJobPosting } from "@/lib/api/mockApplies";
import type { JDData } from "@/components/mockApply/Question/SidePanel";
import { saveJobPostingAnalysis } from "@/app/mockApply/job/jobPostingDraftStore";
import { useDebounce } from "@/hooks/useDebounce";
import { ANALYTICS_EVENTS, track } from "@/lib/analytics";

const getSubmitPayload = (questionsData: QuestionItem[]) =>
  questionsData.map((question) => {
    const payload = {
      content: question.question,
      charLimit: question.maxLength ?? 1000,
      answer: question.answer || "",
    };

    if (
      question.questionId !== undefined &&
      Number.isInteger(question.questionId) &&
      question.questionId > 0
    ) {
      return { ...payload, questionId: question.questionId };
    }

    return payload;
  });

const countCompletedAnswers = (questionsData: QuestionItem[]) =>
  questionsData.filter((question) => (question.answer || "").trim()).length;

const getCurrentTime = () => {
  const now = new Date();
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
};

const mergeLocalQuestionEdits = (
  canonicalQuestions: QuestionItem[],
  desiredQuestions: QuestionItem[],
  liveQuestions: QuestionItem[],
) =>
  canonicalQuestions.map((canonicalQuestion, index) => {
    const desiredQuestion = desiredQuestions[index];
    const latestQuestion = desiredQuestion
      ? liveQuestions.find(
          (question) =>
            question.id === desiredQuestion.id ||
            (question.questionId !== undefined &&
              question.questionId === desiredQuestion.questionId),
        )
      : undefined;

    return {
      ...canonicalQuestion,
      question:
        latestQuestion?.question ??
        desiredQuestion?.question ??
        canonicalQuestion.question,
      maxLength:
        latestQuestion?.maxLength ??
        desiredQuestion?.maxLength ??
        canonicalQuestion.maxLength,
      answer:
        latestQuestion?.answer ??
        desiredQuestion?.answer ??
        canonicalQuestion.answer ??
        "",
    };
  });

export default function MockApplyPage({
  params,
}: {
  params: Promise<{ mockApplyId: string }>;
}) {
  const { mockApplyId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedJobPostingId = Number(searchParams.get("jobPostingId"));
  const hasRequestedJobPostingId =
    Number.isInteger(requestedJobPostingId) && requestedJobPostingId > 0;
  const isRetryEntry = searchParams.get("retry") === "1";

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(true);
  const [questionsErrorMessage, setQuestionsErrorMessage] = useState("");
  const [jdData, setJdData] = useState<JDData | null>(null);
  const [linkedJobPostingId, setLinkedJobPostingId] = useState<number | null>(
    null,
  );
  const jobPostingId =
    linkedJobPostingId ??
    (hasRequestedJobPostingId ? requestedJobPostingId : null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string>("저장 전");

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    variant: ToastVariant;
  }>({ open: false, message: "", variant: "normal" });

  // 임시 주석 처리: 문항 삭제 모달 타겟 상태
  // const [modalTarget, setModalTarget] = useState<string | null>(null);

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isCreditShortModalOpen, setIsCreditShortModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debouncedQuestions = useDebounce(questions, 1000);

  const questionsRef = useRef<QuestionItem[]>([]);
  const questionSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const questionSaveRevisionRef = useRef(0);
  const isQuestionStructureSavingRef = useRef(false);
  const retryToastShownForRef = useRef<string | null>(null);
  const pageViewTrackedForRef = useRef<string | null>(null);

  const replaceQuestions = useCallback((nextQuestions: QuestionItem[]) => {
    questionsRef.current = nextQuestions;
    setQuestions(nextQuestions);
  }, []);

  const enqueueQuestionSave = useCallback(
    <T,>(operation: () => Promise<T>): Promise<T> => {
      const queuedOperation = questionSaveQueueRef.current.then(operation);
      questionSaveQueueRef.current = queuedOperation.then(
        () => undefined,
        () => undefined,
      );
      return queuedOperation;
    },
    [],
  );

  const syncQuestionStructure = useCallback(
    async (desiredQuestions: QuestionItem[]) => {
      if (isQuestionStructureSavingRef.current) {
        throw new Error("문항을 저장하고 있습니다. 잠시 후 다시 시도해주세요.");
      }

      isQuestionStructureSavingRef.current = true;
      const revision = ++questionSaveRevisionRef.current;
      let canonicalFallback: QuestionItem[] | null = null;

      try {
        const savedQuestions = await enqueueQuestionSave(async () => {
          const canonicalQuestions = await saveQuestions(
            Number(mockApplyId),
            desiredQuestions,
          );

          if (canonicalQuestions.length !== desiredQuestions.length) {
            throw new Error("저장된 문항 목록을 확인하지 못했습니다.");
          }

          const questionsWithLocalEdits = mergeLocalQuestionEdits(
            canonicalQuestions,
            desiredQuestions,
            questionsRef.current,
          );
          canonicalFallback = questionsWithLocalEdits;

          if (questionsWithLocalEdits.length === 0) {
            return [];
          }

          const savedApply = await saveApply(
            Number(mockApplyId),
            getSubmitPayload(questionsWithLocalEdits),
          );
          const persistedQuestions =
            savedApply.questions.length === questionsWithLocalEdits.length
              ? savedApply.questions
              : questionsWithLocalEdits;

          return mergeLocalQuestionEdits(
            persistedQuestions,
            desiredQuestions,
            questionsRef.current,
          );
        });

        if (revision === questionSaveRevisionRef.current) {
          replaceQuestions(savedQuestions);
        }

        return savedQuestions;
      } catch (error) {
        if (canonicalFallback && revision === questionSaveRevisionRef.current) {
          const reconciledQuestions = mergeLocalQuestionEdits(
            canonicalFallback,
            desiredQuestions,
            questionsRef.current,
          );
          replaceQuestions(reconciledQuestions);
          console.error(
            "문항 구성은 저장됐지만 답변 저장을 다시 시도해야 합니다.",
            error,
          );
          return reconciledQuestions;
        }
        throw error;
      } finally {
        if (revision === questionSaveRevisionRef.current) {
          isQuestionStructureSavingRef.current = false;
        }
      }
    },
    [enqueueQuestionSave, mockApplyId, replaceQuestions],
  );

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    if (!isRetryEntry || retryToastShownForRef.current === mockApplyId) {
      return;
    }

    retryToastShownForRef.current = mockApplyId;
    setToast({
      open: true,
      message: "기존 내용이 유지되었어요. 수정하고 다시 채점해 보세요!",
      variant: "check",
    });
  }, [isRetryEntry, mockApplyId]);

  // 1. 초기 데이터 불러오기
  useEffect(() => {
    let ignore = false;

    const loadQuestions = async () => {
      try {
        setIsQuestionsLoading(true);
        setQuestionsErrorMessage("");

        const parsedMockApplyId = Number(mockApplyId);
        let data = await fetchSelectedQuestions(parsedMockApplyId);

        if (ignore) {
          return;
        }

        if (data.length === 0) {
          const candidates = await fetchQuestions(parsedMockApplyId);

          if (ignore) {
            return;
          }

          const seenQuestionIds = new Set<number>();
          const seenQuestionContents = new Set<string>();
          const validCandidates = candidates.filter((question) => {
            const normalizedContent = question.question
              .trim()
              .replace(/\s+/g, " ");
            const questionId = question.questionId;

            if (!normalizedContent) {
              return false;
            }
            if (
              (questionId && seenQuestionIds.has(questionId)) ||
              seenQuestionContents.has(normalizedContent)
            ) {
              return false;
            }

            if (questionId) {
              seenQuestionIds.add(questionId);
            }
            seenQuestionContents.add(normalizedContent);
            return true;
          });
          const preselectedCandidates = validCandidates.filter(
            (question) => question.selected,
          );
          const initialQuestions = (
            preselectedCandidates.length > 0
              ? preselectedCandidates
              : validCandidates
          ).slice(0, 5);

          if (initialQuestions.length > 0) {
            const savedQuestions = await saveQuestions(
              parsedMockApplyId,
              initialQuestions,
            );

            if (savedQuestions.length === 0) {
              throw new Error("저장된 자소서 문항을 확인하지 못했습니다.");
            }

            data = savedQuestions;
          }
        }

        if (data.length > 5) {
          data = data.slice(0, 5);
        }

        if (ignore) {
          return;
        }

        replaceQuestions(data);
        setSelectedId(data[0]?.id ?? null);

        if (pageViewTrackedForRef.current !== mockApplyId) {
          pageViewTrackedForRef.current = mockApplyId;
          track(ANALYTICS_EVENTS.WRITE_PAGE_VIEWED, {
            mock_apply_id: parsedMockApplyId,
            question_count: data.length,
          });
        }

        if (data.length === 0) {
          setQuestionsErrorMessage(
            "등록된 문항이 없습니다. 문항 추가 버튼을 눌러 작성해주세요.",
          );
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        console.error("문항을 불러오지 못했습니다.", error);
        replaceQuestions([]);
        setSelectedId(null);
        setQuestionsErrorMessage(
          error instanceof Error
            ? error.message
            : "자소서 문항을 불러오지 못했습니다.",
        );
      } finally {
        if (!ignore) {
          setIsQuestionsLoading(false);
        }
      }
    };

    void loadQuestions();

    return () => {
      ignore = true;
    };
  }, [mockApplyId, replaceQuestions]);

  // 2. 연결된 채용 공고 불러오기
  useEffect(() => {
    const parsedMockApplyId = Number(mockApplyId);

    if (!Number.isInteger(parsedMockApplyId) || parsedMockApplyId <= 0) {
      return;
    }

    let ignore = false;

    fetchMockApplyJobPosting(parsedMockApplyId)
      .then((jobPosting) => {
        if (ignore) {
          return;
        }

        setLinkedJobPostingId(jobPosting.jobPostingId);
        setJdData({
          companyName: jobPosting.companyName,
          profileColor: jobPosting.profileColor,
          title:
            jobPosting.jobTitle ||
            jobPosting.detailClassificationName ||
            "채용 공고",
          sections: [
            {
              subtitle: "직무",
              content:
                jobPosting.jobTitle || jobPosting.detailClassificationName,
            },
            { subtitle: "주요 업무", content: jobPosting.task },
            { subtitle: "자격요건", content: jobPosting.requirement },
            { subtitle: "우대사항", content: jobPosting.preferred },
          ].filter((section) => section.content.trim().length > 0),
        });
        saveJobPostingAnalysis({
          savedToDatabase: true,
          message: "저장된 채용 공고를 불러왔습니다.",
          extracted: null,
          candidates: [],
          classification: null,
          generated: null,
          saved: jobPosting,
        });
      })
      .catch((error) => {
        if (!ignore) console.error("채용 공고를 불러오지 못했습니다.", error);
      });
    return () => {
      ignore = true;
    };
  }, [mockApplyId]);

  // 4. 토스트 자동 닫힘
  useEffect(() => {
    if (!toast.open) return;

    const toastTimer = window.setTimeout(() => {
      setToast({ open: false, message: "", variant: "normal" });
    }, 3000);

    return () => window.clearTimeout(toastTimer);
  }, [toast.open, toast.message]);

  useEffect(() => {
    if (
      isQuestionsLoading ||
      debouncedQuestions.length === 0 ||
      isQuestionStructureSavingRef.current
    ) {
      return;
    }

    const revision = questionSaveRevisionRef.current;
    const questionsSnapshot = debouncedQuestions;

    void enqueueQuestionSave(async () => {
      if (
        revision !== questionSaveRevisionRef.current ||
        isQuestionStructureSavingRef.current
      ) {
        return;
      }

      await saveApply(Number(mockApplyId), getSubmitPayload(questionsSnapshot));

      track(ANALYTICS_EVENTS.ANSWER_AUTO_SAVED, {
        mock_apply_id: Number(mockApplyId),
        completed_count: countCompletedAnswers(questionsSnapshot),
      });

      if (revision === questionSaveRevisionRef.current) {
        setLastSavedTime(getCurrentTime());
      }
    }).catch((error) => {
      if (revision === questionSaveRevisionRef.current) {
        console.error("자동 저장 실패:", error);
      }
    });
  }, [
    debouncedQuestions,
    enqueueQuestionSave,
    isQuestionsLoading,
    mockApplyId,
  ]);

  // --- 이벤트 핸들러 모음 ---

  const handleConfirm = async () => {
    if (isSubmitting) return;
    if (isQuestionStructureSavingRef.current) {
      setToast({
        open: true,
        message: "문항 저장이 끝난 뒤 다시 시도해주세요.",
        variant: "normal",
      });
      return;
    }

    setIsSubmitting(true);
    setIsConfirmModalOpen(false);
    questionSaveRevisionRef.current += 1;

    try {
      const savedApply = await enqueueQuestionSave(() =>
        saveApply(Number(mockApplyId), getSubmitPayload(questionsRef.current)),
      );
      const acceptedAnalysis = await requestAnalysis(Number(mockApplyId));
      const isCachedResultAvailable =
        isCachedAnalysisResultAvailable(acceptedAnalysis);
      const analysisResult = isCachedResultAvailable
        ? await fetchAnalysisResult(Number(mockApplyId))
        : null;
      const analysisTaskId = acceptedAnalysis.taskId?.trim();

      if (!isCachedResultAvailable && !analysisTaskId)
        throw new Error("자소서 분석 작업 번호를 확인할 수 없습니다.");

      let resolvedJobPostingId = jobPostingId;
      if (!resolvedJobPostingId || resolvedJobPostingId <= 0) {
        try {
          const sequenceResult = await fetchSequence(Number(mockApplyId));
          resolvedJobPostingId = sequenceResult.jobPostingId;
        } catch (error) {
          console.warn(
            "분석 결과에 연결할 채용 공고를 확인하지 못했습니다.",
            error,
          );
        }
      }

      // 분석 요청이 수락된 시점(크레딧 차감)을 최종 확정으로 본다.
      track(ANALYTICS_EVENTS.APPLY_CONFIRMED, {
        mock_apply_id: Number(mockApplyId),
        job_posting_id:
          resolvedJobPostingId && resolvedJobPostingId > 0
            ? resolvedJobPostingId
            : undefined,
      });

      const resultSearchParams = new URLSearchParams();
      if (resolvedJobPostingId && resolvedJobPostingId > 0)
        resultSearchParams.set("jobPostingId", String(resolvedJobPostingId));

      if (analysisResult) {
        const resultSequence =
          analysisResult.sequence > 0
            ? analysisResult.sequence
            : savedApply.sequence;

        if (resultSequence > 0)
          resultSearchParams.set("sequence", String(resultSequence));

        const resultQuery = resultSearchParams.size
          ? `?${resultSearchParams.toString()}`
          : "";
        router.push(`/mockApply/${mockApplyId}/result${resultQuery}`);
        return;
      }

      const loadingSearchParams = new URLSearchParams();
      loadingSearchParams.set("taskId", analysisTaskId);
      if (savedApply.sequence > 0)
        loadingSearchParams.set("sequence", String(savedApply.sequence));
      if (resolvedJobPostingId && resolvedJobPostingId > 0)
        loadingSearchParams.set("jobPostingId", String(resolvedJobPostingId));

      const loadingQuery = loadingSearchParams.size
        ? `?${loadingSearchParams.toString()}`
        : "";
      router.push(
        `/mockApply/${mockApplyId}/result/resume-analysis-loading${loadingQuery}`,
      );
    } catch (error) {
      setIsSubmitting(false);
      if (error instanceof CreditInsufficientError) {
        track(ANALYTICS_EVENTS.CREDIT_INSUFFICIENT_SHOWN, {
          mock_apply_id: Number(mockApplyId),
        });
        setIsCreditShortModalOpen(true);
        return;
      }
      console.error("제출 실패:", error);
      setToast({
        open: true,
        message:
          error instanceof Error
            ? error.message
            : "채점 요청 중 오류가 발생했습니다.",
        variant: "normal",
      });
    }
  };

  // 내용 여부(hasContent)를 인자로 받아 토스트를 띄울지 결정하도록 수정
  const performDelete = async (
    targetId: string,
    hasContent: boolean = false,
  ) => {
    if (isQuestionStructureSavingRef.current) {
      setToast({
        open: true,
        message: "문항을 저장하고 있어요. 잠시 후 다시 시도해주세요.",
        variant: "normal",
      });
      return;
    }

    const previousQuestions = questionsRef.current;
    const targetIndex = previousQuestions.findIndex(
      (question) => question.id === targetId,
    );
    if (targetIndex < 0) return;

    const selectedIndex = previousQuestions.findIndex(
      (question) => question.id === selectedId,
    );
    const desiredQuestions = previousQuestions.filter(
      (question) => question.id !== targetId,
    );

    try {
      const savedQuestions = await syncQuestionStructure(desiredQuestions);
      let nextSelectedIndex = selectedIndex;

      if (selectedIndex === targetIndex) {
        nextSelectedIndex = Math.max(0, targetIndex - 1);
      } else if (selectedIndex > targetIndex) {
        nextSelectedIndex = selectedIndex - 1;
      }

      setSelectedId(savedQuestions[nextSelectedIndex]?.id ?? null);
      setQuestionsErrorMessage(
        savedQuestions.length === 0
          ? "등록된 문항이 없습니다. 문항 추가 버튼을 눌러 작성해주세요."
          : "",
      );

      // 내용이 있을 때만 삭제 완료 토스트 오픈
      if (hasContent) {
        setToast({
          open: true,
          message: "문항이 삭제되었어요.",
          variant: "normal",
        });
      }
    } catch (error) {
      console.error("문항 삭제 실패:", error);
      setToast({
        open: true,
        message: "문항 삭제에 실패했어요. 잠시 후 다시 시도해주세요.",
        variant: "normal",
      });
    }
  };

  // 무조건 삭제를 호출하되, 내용 여부(hasContent)를 넘겨줍니다.
  const handleDeleteQuestion = (targetId: string) => {
    const targetQ = questions.find((q) => q.id === targetId);
    const hasContent =
      (targetQ?.question?.trim() || "") !== "" ||
      (targetQ?.answer?.trim() || "") !== "";

    void performDelete(targetId, hasContent);
  };

  const handleUpdate = (field: string, value: string) => {
    if (!selectedId) return;
    setQuestions((previousQuestions) => {
      const nextQuestions = previousQuestions.map((q) => {
        if (q.id !== selectedId) return q;
        if (field === "title") return { ...q, question: value };
        if (field === "answer") return { ...q, answer: value };
        if (field === "maxLength") return { ...q, maxLength: Number(value) };
        return q;
      });
      questionsRef.current = nextQuestions;
      return nextQuestions;
    });
  };

  const handleAddQuestion = async () => {
    if (
      questionsRef.current.length >= 5 ||
      isQuestionStructureSavingRef.current
    ) {
      return;
    }

    try {
      const newQuestion: QuestionItem = {
        id: `temp-${Date.now()}`,
        question: "새로운 문항",
        answer: "",
        maxLength: 1000,
        custom: true,
      };

      const desiredQuestions = [...questionsRef.current, newQuestion];
      const savedQuestions = await syncQuestionStructure(desiredQuestions);

      if (savedQuestions.length !== desiredQuestions.length) {
        throw new Error("추가된 자소서 문항을 확인하지 못했습니다.");
      }

      setQuestionsErrorMessage("");

      track(ANALYTICS_EVENTS.CUSTOM_QUESTION_ADDED, {
        mock_apply_id: Number(mockApplyId),
        selected_count: savedQuestions.length,
      });

      const lastQuestion = savedQuestions[savedQuestions.length - 1];
      if (lastQuestion) setSelectedId(lastQuestion.id);
    } catch (error) {
      console.error("문항 추가 실패:", error);
      setToast({
        open: true,
        message: "문항 추가에 실패했어요. 잠시 후 다시 시도해주세요.",
        variant: "normal",
      });
    }
  };

  const currentQ = questions.find((q) => q.id === selectedId);
  const mappedQuestionForForm = currentQ
    ? {
        title: currentQ.question,
        answer: currentQ.answer || "",
        maxLength: String(currentQ.maxLength || 1000),
      }
    : null;
  const isSubmitDisabled =
    !mappedQuestionForForm ||
    questions.some((question) => !(question.answer || "").trim());

  const handleSelectQuestion = (id: string) => {
    if (id !== selectedId) {
      track(ANALYTICS_EVENTS.ANSWER_TAB_SWITCHED, {
        mock_apply_id: Number(mockApplyId),
        question_index: questions.findIndex((question) => question.id === id),
      });
    }

    setSelectedId(id);
  };

  const handleSubmitClick = () => {
    track(ANALYTICS_EVENTS.APPLY_SUBMIT_CLICKED, {
      mock_apply_id: Number(mockApplyId),
      all_complete: countCompletedAnswers(questions) === questions.length,
    });
    setIsConfirmModalOpen(true);
  };

  return (
    <MockApplyTemplate
      mockApplyId={Number(mockApplyId)}
      currentStep={4}
      companyName={jdData?.companyName ?? ""}
      jobTitle={jdData?.title ?? ""}
      lastSavedAt={lastSavedTime}
      onBackClick={() => setIsLeaveModalOpen(true)}
      onNextClick={handleSubmitClick}
      isNextDisabled={isSubmitDisabled || isSubmitting}
      nextLabel="채점하기"
      nextIconType="SPARKLE"
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-bg-default">
        <main
          className={clsx(
            "flex min-h-0 min-w-0 flex-1 gap-6 overflow-hidden transition-all duration-300 ease-in-out",
            isPanelOpen ? "mr-[300px]" : "mr-0",
          )}
        >
          <div className="flex min-h-0 w-full min-w-0 flex-1 items-stretch justify-between self-stretch overflow-hidden">
            <aside className="flex min-h-0 w-[360px] shrink-0 flex-col items-start justify-between self-stretch overflow-hidden pt-20 pr-0 pb-16 pl-20">
              <div className="flex w-full min-w-0 flex-col items-start gap-8">
                <div className="flex flex-col items-start gap-5">
                  <h1 className="whitespace-pre-line text-h24-bold text-text-neutral-title [font-feature-settings:'liga'_off,'clig'_off]">
                    {"지원한 회사 기준으로\n채점하고 있어요"}
                  </h1>
                </div>

                <QuestionList
                  questions={questions}
                  selectedId={selectedId}
                  onSelect={handleSelectQuestion}
                  onDelete={handleDeleteQuestion}
                  onAdd={handleAddQuestion}
                />
              </div>
            </aside>

            <div
              className={clsx(
                "flex min-h-0 min-w-0 flex-1 flex-col items-center self-stretch overflow-y-auto overflow-x-hidden pt-16 pr-[40px] pb-16 pl-16",
                scrollbarClassS,
              )}
            >
              <div className="w-full min-w-[600px] max-w-[1000px]">
                {mappedQuestionForForm ? (
                  <WritingForm
                    question={mappedQuestionForForm}
                    onChange={handleUpdate}
                  />
                ) : isQuestionsLoading ? (
                  <div className="flex h-full items-center justify-center text-text-neutral-assistive">
                    문항을 불러오는 중입니다...
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-text-neutral-assistive">
                    {questionsErrorMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <JDSidePanel
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          onOpen={() => setIsPanelOpen(true)}
          data={jdData ?? undefined}
        />

        {toast.open && (
          <Toast
            message={toast.message}
            variant={toast.variant}
            position="top"
            onClose={() => setToast({ ...toast, open: false })}
            className="absolute top-6"
          />
        )}

        {/* 모달 UI 부분은 주석 처리 유지 */}
        {/* {modalTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-lightbox-default">
            ...
          </div>
        )} */}

        {isLeaveModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-lightbox-default">
            <ModalNotice
              type="confirmation"
              title="공고 확인으로 돌아갈까요?"
              description="지금까지 작성한 내용이 모두 삭제돼요."
              onClose={() => setIsLeaveModalOpen(false)}
              secondaryAction={{
                label: "돌아가기",
                onClick: () => {
                  setIsLeaveModalOpen(false);
                  router.push(
                    jobPostingId
                      ? `/mockApply/job/${jobPostingId}/review`
                      : "/mockApply/job/create",
                  );
                },
              }}
              primaryAction={{
                label: "계속 작성",
                onClick: () => setIsLeaveModalOpen(false),
              }}
            />
          </div>
        )}

        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-lightbox-default">
            <ModalNotice
              type="confirmation"
              title="이대로 채점할까요?"
              description="지원 시 1 크레딧이 차감되며, 취소할 수 없어요."
              onClose={() => setIsConfirmModalOpen(false)}
              secondaryAction={{
                label: "닫기",
                onClick: () => setIsConfirmModalOpen(false),
              }}
              primaryAction={{
                label: "지원하기",
                onClick: () => void handleConfirm(),
                disabled: isSubmitting,
              }}
            />
          </div>
        )}

        {isCreditShortModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-lightbox-default">
            <ModalNotice
              type="confirmation"
              title="크레딧이 부족해요"
              description="크레딧을 충전하고 다시 시도해주세요."
              onClose={() => setIsCreditShortModalOpen(false)}
              secondaryAction={{
                label: "닫기",
                onClick: () => setIsCreditShortModalOpen(false),
              }}
              primaryAction={{
                label: "충전하기",
                onClick: () => {
                  track(ANALYTICS_EVENTS.CREDIT_CHARGE_FROM_MODAL_CLICKED, {
                    mock_apply_id: Number(mockApplyId),
                  });
                  router.push("/credit");
                },
              }}
            />
          </div>
        )}
      </div>
    </MockApplyTemplate>
  );
}
