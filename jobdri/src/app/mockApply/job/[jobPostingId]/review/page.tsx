"use client";

import {
  useMemo,
  useState,
  useEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/common/header/Header";
import SideHeaderContainer from "@/components/common/header/SideHeaderContainer";
import {
  LnbScrollbar,
  lnbHiddenScrollbarClass,
  useLnbScrollMetrics,
} from "@/components/common/lnb/LnbScrollbar";
import { CtaFooter } from "@/components/common/cta";
import { JDInput } from "@/components/common/input";
import { ModalNotice } from "@/components/common/modal";
import Avatar, { type AvatarColor } from "@/components/mockApply/home/Avatar";
import {
  clearJobPostingInput,
  getJobPostingAnalysis,
} from "@/app/mockApply/job/jobPostingDraftStore";
import {
  fetchMyJobPosting,
  saveJobPosting,
  updateJobPosting,
  type JobPostingSavePayload,
  type JobPostingProfileColor,
} from "@/lib/api/jobPostings";
import {
  createApplyFromJobPosting,
  getSelectedApplyType,
} from "@/lib/api/mockApplies";
import { useDebounce } from "@/hooks/useDebounce";
import { normalizeJdLineBreaks } from "@/utils/jdCriteria";
import { ANALYTICS_EVENTS, track, type JdSectionId } from "@/lib/analytics";

/** 편집 필드 → 택소노미 section_id (공고명은 택소노미 대상이 아니다) */
const JD_SECTION_ID_BY_FIELD: Record<string, JdSectionId> = {
  "company-name": "company_name",
  role: "position",
  task: "duties",
  qualification: "requirements",
  prefer: "preferred",
};

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

const wizardSteps = [
  { label: "공고 확인" },
  { label: "자소서 입력" },
  { label: "첨삭 결과" },
];

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex w-full min-w-[612px] max-w-[1000px] flex-col items-start gap-6 rounded-card bg-bg-contents-default px-5 pt-6 pb-7">
      <div className="flex items-center justify-center gap-2.5 px-1">
        <h2 className="text-[18px] leading-[26px] font-semibold tracking-[-0.36px] text-text-neutral-title [font-feature-settings:'liga'_off,'clig'_off]">
          {title}
        </h2>
      </div>
      <div className="flex self-stretch flex-col items-start gap-1">
        {children}
      </div>
    </section>
  );
}

function JobProfileRow({
  avatarName,
  profileColor,
  onProfileColorChange,
}: {
  avatarName: string;
  profileColor: JobPostingProfileColor;
  onProfileColorChange: (color: JobPostingProfileColor) => void;
}) {
  return (
    <div className="flex w-full items-start gap-8 px-2 py-5">
      <div className="flex w-[200px] shrink-0 flex-col items-start justify-center gap-1">
        <div className="flex items-center gap-1.5 self-stretch">
          <span className="text-b16-semibold text-text-neutral-title [font-feature-settings:'liga'_off,'clig'_off]">
            공고 프로필
          </span>
          <svg
            aria-hidden="true"
            className="h-[5px] w-[5px] shrink-0"
            viewBox="0 0 5 5"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="2.5"
              cy="2.5"
              r="2"
              fill="var(--color-fill-system-fail-strong)"
              stroke="#FF4242"
            />
          </svg>
        </div>
        <span className="text-cap12-med text-text-neutral-disabled [font-feature-settings:'liga'_off,'clig'_off]">
          이 공고의 프로필 색상을 선택해 주세요.
        </span>
      </div>
      <div className="flex flex-1 items-start py-0.5">
        <Avatar
          name={avatarName}
          type="company"
          color={profileColor}
          size="large"
          isEditable
          onChange={(color: AvatarColor) =>
            onProfileColorChange(color.toUpperCase() as JobPostingProfileColor)
          }
          className="!h-11 !w-11"
        />
      </div>
    </div>
  );
}

export default function JobPostingReviewPage() {
  const router = useRouter();
  const params = useParams();
  const urlJobPostingId = params.jobPostingId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [profileColor, setProfileColor] =
    useState<JobPostingProfileColor>("DEFAULT");
  const [jobPostingName, setJobPostingName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [task, setTask] = useState("");
  const [requirements, setRequirements] = useState("");
  const [preferred, setPreferred] = useState("");
  const [companySize, setCompanySize] = useState("STARTUP");
  const [detailClassificationId, setDetailClassificationId] = useState(0);
  const [jobPostingId, setJobPostingId] = useState<number | null>(null);

  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const [editingFieldIds, setEditingFieldIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  const isInitialRender = useRef(true);
  const hasTrackedPageView = useRef(false);

  const currentPayload: JobPostingSavePayload = useMemo(
    () => ({
      profileColor,
      postingName: jobPostingName.trim(),
      companyName: companyName.trim(),
      companySize: companySize,
      jobTitle: roleName.trim(),
      detailClassificationId: detailClassificationId,
      task: task.trim(),
      requirement: requirements.trim(),
      preferred: preferred.trim(),
    }),
    [
      profileColor,
      jobPostingName,
      companyName,
      companySize,
      roleName,
      detailClassificationId,
      task,
      requirements,
      preferred,
    ],
  );

  const debouncedPayload = useDebounce(currentPayload, 1000);

  useEffect(() => {
    if (
      isLoading ||
      debouncedPayload.detailClassificationId <= 0 ||
      !debouncedPayload.postingName ||
      !debouncedPayload.companyName ||
      !debouncedPayload.jobTitle
    ) {
      return;
    }

    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    const autoSave = async () => {
      try {
        let savedResult;
        if (jobPostingId) {
          savedResult = await updateJobPosting(jobPostingId, debouncedPayload);
        } else {
          savedResult = await saveJobPosting(debouncedPayload);
          setJobPostingId(savedResult.jobPostingId);
        }

        const now = new Date();
        setLastSavedTime(
          `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        );
      } catch (error) {
        console.error("채용 공고 자동 저장 실패:", error);
      }
    };

    autoSave();
  }, [debouncedPayload, jobPostingId, isLoading]);

  const { scrollAreaRef, scrollbarMetrics, updateScrollbarMetrics } =
    useLnbScrollMetrics(true, "job-posting-review", { trackPadding: 28 });

  const companyAvatarName = useMemo(() => {
    const trimmedCompanyName = companyName.trim();
    return trimmedCompanyName.length > 0 ? trimmedCompanyName[0] : "T";
  }, [companyName]);

  const isNextEnabled = useMemo(
    () =>
      [jobPostingName, companyName, roleName].every(
        (value) => value.trim().length > 0,
      ),
    [companyName, jobPostingName, roleName],
  );
  const isAnyInputEditing = editingFieldIds.size > 0;

  const handleInputEditingChange = (fieldId: string, isEditing: boolean) => {
    const sectionId = JD_SECTION_ID_BY_FIELD[fieldId];

    if (sectionId) {
      track(
        isEditing
          ? ANALYTICS_EVENTS.JD_SECTION_EDIT_CLICKED
          : ANALYTICS_EVENTS.JD_SECTION_EDITED,
        { section_id: sectionId },
      );
    }

    setEditingFieldIds((current) => {
      const next = new Set(current);

      if (isEditing) {
        next.add(fieldId);
      } else {
        next.delete(fieldId);
      }

      return next;
    });
  };

  // 1. 초기 데이터 로딩
  useEffect(() => {
    const loadData = async () => {
      try {
        if (urlJobPostingId) {
          const saved = await fetchMyJobPosting(Number(urlJobPostingId));
          setProfileColor(saved.profileColor ?? "DEFAULT");
          setJobPostingName(
            firstNonEmpty(
              saved.postingName,
              saved.jobTitle,
              saved.detailClassificationName,
            ),
          );
          setCompanyName(saved.companyName ?? "");
          setRoleName(
            firstNonEmpty(saved.jobTitle, saved.detailClassificationName),
          );
          setTask(saved.task ?? "");
          setRequirements(normalizeJdLineBreaks(saved.requirement ?? ""));
          setPreferred(normalizeJdLineBreaks(saved.preferred ?? ""));
          setCompanySize(saved.companySize?.trim() || "STARTUP");
          setDetailClassificationId(saved.detailClassificationId ?? 0);
          setJobPostingId(saved.jobPostingId ?? null);
        } else {
          const result = getJobPostingAnalysis();
          if (!result) {
            router.replace("/mockApply/job/create");
            return;
          }
          const { generated, extracted, saved } = result;
          setProfileColor(saved?.profileColor ?? "DEFAULT");
          setJobPostingName(
            firstNonEmpty(
              saved?.postingName,
              generated?.jobTitle,
              extracted?.jobTitle,
              saved?.jobTitle,
              result?.classification?.detailClassificationName,
              saved?.detailClassificationName,
            ),
          );
          setCompanyName(
            firstNonEmpty(
              saved?.companyName,
              generated?.companyName,
              extracted?.companyName,
            ),
          );
          setRoleName(
            firstNonEmpty(
              saved?.jobTitle,
              generated?.jobTitle,
              extracted?.jobTitle,
              result?.classification?.detailClassificationName,
              saved?.detailClassificationName,
            ),
          );
          setTask(firstNonEmpty(generated?.task, extracted?.task, saved?.task));
          setRequirements(
            normalizeJdLineBreaks(
              firstNonEmpty(
                generated?.requirements,
                extracted?.requirements,
                saved?.requirement,
              ),
            ),
          );
          setPreferred(
            normalizeJdLineBreaks(
              firstNonEmpty(
                generated?.preferredQualifications,
                extracted?.preferredQualifications,
                saved?.preferred,
              ),
            ),
          );
          setCompanySize(saved?.companySize?.trim() || "STARTUP");
          setDetailClassificationId(
            saved?.detailClassificationId ??
              result?.classification?.detailClassificationId ??
              result?.candidates?.[0]?.detailClassificationId ??
              0,
          );
          setJobPostingId(saved?.jobPostingId ?? null);
        }

        if (!hasTrackedPageView.current) {
          hasTrackedPageView.current = true;
          track(ANALYTICS_EVENTS.JD_REVIEW_PAGE_VIEWED, {});
        }
      } catch (error) {
        console.error("데이터 로드 실패", error);
        router.replace("/");
      } finally {
        setIsLoading(false);
        const now = new Date();
        setLastSavedTime(
          `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        );
      }
    };

    loadData();
  }, [urlJobPostingId, router]);

  const handleHomeClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setShowHomeConfirm(true);
  };

  const handleNext = async () => {
    if (!isNextEnabled || isSaving || isAnyInputEditing) return;

    setIsSaving(true);
    setSaveErrorMessage("");

    try {
      if (detailClassificationId <= 0) {
        throw new Error("직무 분류 정보가 없어 공고를 저장할 수 없습니다.");
      }

      const savedJobPosting = jobPostingId
        ? await updateJobPosting(jobPostingId, currentPayload)
        : await saveJobPosting(currentPayload);

      const createdApply = await createApplyFromJobPosting({
        jobPostingId: savedJobPosting.jobPostingId,
        applyType: getSelectedApplyType(),
      });

      clearJobPostingInput();
      router.push(
        `/mockApply/${createdApply.mockApplyId}?jobPostingId=${savedJobPosting.jobPostingId}`,
      );
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error
          ? error.message
          : "채용 공고를 저장하지 못했습니다.",
      );
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-dvh w-dvw items-center justify-center bg-bg-white">
        <span className="text-text-neutral-description">
          데이터를 불러오는 중입니다...
        </span>
      </div>
    );
  }

  return (
    <div className="h-dvh w-dvw overflow-hidden bg-line-neutral-assistive">
      <div className="flex h-dvh w-dvw min-w-[1100px] flex-col bg-bg-white">
        <Header
          companyName={companyName}
          jobTitle={roleName}
          applicationLabel="첫 번째 지원"
          currentStep={1}
          steps={wizardSteps}
          lastSavedAt={lastSavedTime}
          homeAction={{ label: "홈으로", onClick: handleHomeClick }}
          className="min-w-[1100px] max-w-none shrink-0 self-stretch"
        />

        <div className="relative flex min-h-0 w-full flex-1 items-stretch overflow-visible px-2 pb-0">
          <div
            ref={scrollAreaRef}
            onScroll={updateScrollbarMetrics}
            className={`flex min-h-0 w-full flex-1 items-start justify-center overflow-y-auto overflow-x-hidden rounded-card-l bg-fill-quaternary-assistive ${lnbHiddenScrollbarClass}`}
          >
            <div className="flex min-h-full flex-1 items-start justify-center self-stretch bg-fill-quaternary-assistive">
              <main className="flex flex-1 items-start justify-between">
                <SideHeaderContainer
                  leading={1}
                  title="공고 내용을 확인해주세요."
                  subtitle="입력해 준 내용을 바탕으로 AI가 자동으로 추출한 정보예요. 고치고 싶은 부분이 있다면 수정 버튼을 눌러 원하는 내용을 입력해주세요."
                  element={<></>}
                  className="shrink-0 self-stretch"
                />

                <div className="flex [flex:1_0_0] flex-col items-center gap-3 pt-16 pr-[72px] pl-20">
                  <SectionCard title="공고 정보 편집">
                    <JobProfileRow
                      avatarName={companyAvatarName}
                      profileColor={profileColor}
                      onProfileColorChange={setProfileColor}
                    />
                    <JDInput
                      label="공고명"
                      description="이 공고의 이름이에요."
                      type="company"
                      value={jobPostingName}
                      onChange={setJobPostingName}
                      onEdit={() =>
                        handleInputEditingChange("posting-name", true)
                      }
                      onAdd={() =>
                        handleInputEditingChange("posting-name", false)
                      }
                      className="!w-full"
                    />
                    <JDInput
                      label="회사명"
                      description="채용 공고를 올린 회사예요."
                      type="company"
                      value={companyName}
                      onChange={setCompanyName}
                      onEdit={() =>
                        handleInputEditingChange("company-name", true)
                      }
                      onAdd={() =>
                        handleInputEditingChange("company-name", false)
                      }
                      className="!w-full"
                    />
                  </SectionCard>

                  <SectionCard title="직무 정보">
                    <JDInput
                      type="role"
                      value={roleName}
                      onChange={setRoleName}
                      onEdit={() => handleInputEditingChange("role", true)}
                      onAdd={() => handleInputEditingChange("role", false)}
                      className="!w-full"
                    />
                    <JDInput
                      type="task"
                      description="이 직무에서 담당할 업무예요."
                      required={false}
                      value={task}
                      onChange={setTask}
                      onEdit={() => handleInputEditingChange("task", true)}
                      onAdd={() => handleInputEditingChange("task", false)}
                      className="!w-full"
                    />
                  </SectionCard>

                  <SectionCard title="채용 기준">
                    <JDInput
                      type="qualification"
                      required={false}
                      value={requirements}
                      onChange={setRequirements}
                      onEdit={() =>
                        handleInputEditingChange("qualification", true)
                      }
                      onAdd={() =>
                        handleInputEditingChange("qualification", false)
                      }
                      className="!w-full"
                    />
                    <JDInput
                      type="prefer"
                      required={false}
                      value={preferred}
                      onChange={setPreferred}
                      onEdit={() => handleInputEditingChange("prefer", true)}
                      onAdd={() => handleInputEditingChange("prefer", false)}
                      className="!w-full"
                    />
                  </SectionCard>

                  <div aria-hidden="true" className="h-[108px] shrink-0" />
                </div>
              </main>
            </div>
          </div>
          <LnbScrollbar
            metrics={scrollbarMetrics}
            size="l"
            className="!top-[10px] !right-1 !bottom-[10px] z-10"
          />
        </div>

        <CtaFooter
          type="wizard"
          className="!w-full shrink-0"
          backAction={{
            label: "이전으로",
            onClick: () => setShowBackConfirm(true),
          }}
          nextAction={{
            label: "다음으로",
            disabled: !isNextEnabled || isSaving || isAnyInputEditing,
            onClick: () => void handleNext(),
          }}
        />
      </div>

      {showBackConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-lightbox-default">
          <ModalNotice
            type="confirmation"
            title="공고 입력으로 돌아갈까요?"
            description="공고 확인에서 수정한 내용은 저장되지 않아요."
            onClose={() => setShowBackConfirm(false)}
            secondaryAction={{
              label: "돌아가기",
              onClick: () =>
                router.push("/mockApply/job/create?analysisCanceled=1"),
            }}
            primaryAction={{
              label: "계속 작성",
              onClick: () => setShowBackConfirm(false),
            }}
          />
        </div>
      )}

      {showHomeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-lightbox-default">
          <ModalNotice
            type="confirmation"
            title="페이지를 나가시겠어요?"
            description="자동 저장 이후 작성된 내용은 저장되지 않아요."
            onClose={() => setShowHomeConfirm(false)}
            secondaryAction={{
              label: "홈으로",
              onClick: () => router.push("/"),
            }}
            primaryAction={{
              label: "취소",
              onClick: () => setShowHomeConfirm(false),
            }}
          />
        </div>
      )}

      {saveErrorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-lightbox-default">
          <ModalNotice
            type="alertModal"
            title="공고를 저장하지 못했습니다."
            description={saveErrorMessage}
            onClose={() => setSaveErrorMessage("")}
            primaryAction={{
              label: "확인",
              onClick: () => setSaveErrorMessage(""),
            }}
          />
        </div>
      )}
    </div>
  );
}
