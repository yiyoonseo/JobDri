"use client";

import { useState } from "react";
import clsx from "clsx";
import Divider from "@/components/common/Divider";
import Icon from "@/components/common/icons/Icon";
import {
  LnbScrollbar,
  lnbHiddenScrollbarClass,
  useLnbScrollMetrics,
} from "@/components/common/lnb/LnbScrollbar";
import TabMenu from "@/components/common/tabs/TabMenu";
import Evaluation from "@/components/mockApply/result/Evaluation";
import ScoreBar from "@/components/mockApply/result/ScoreBar";
import ScoreCircle from "@/components/mockApply/result/ScoreCircle";
import type { AnalysisResult } from "@/lib/api/result";

interface ResumeAnalysisFeedbackProps {
  mockApplyId?: number;
  sequence?: number;
  children?: React.ReactNode;
  analysisData: AnalysisResult;
  onReviewTabChange?: (tabId: string) => void;
}

const reviewTabs = [
  { id: "strengths", label: "핵심 강점" },
  { id: "weaknesses", label: "핵심 약점" },
];

function ScoreSummaryIcon() {
  return (
    <span className="flex h-5 w-5 shrink-0" aria-hidden="true">
      <Icon type="SCORE_20" className="h-5 w-5" />
    </span>
  );
}

function ReviewSummaryIcon() {
  return (
    <span className="flex h-5 w-5 shrink-0" aria-hidden="true">
      <Icon type="REVIEW_20" className="h-5 w-5" />
    </span>
  );
}

function ScoreMetricRow({
  label,
  score,
  tone,
}: {
  label: string;
  score: number;
  tone: "primary" | "danger";
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 self-stretch">
      <span className="w-[92px] shrink-0 text-sub14-med tracking-normal text-text-neutral-description [font-feature-settings:'liga'_off,'clig'_off]">
        {label}
      </span>
      <ScoreBar
        score={score}
        tone={tone}
        className="h-2.5 min-w-0 max-w-[400px]"
      />
      <div className="flex w-[72px] shrink-0 items-baseline justify-end gap-0.5">
        <span className="text-label14-semibold tracking-normal text-text-neutral-title [font-feature-settings:'liga'_off,'clig'_off]">
          {score}
        </span>
        <span className="text-cap12-med tracking-normal text-text-neutral-caption [font-feature-settings:'liga'_off,'clig'_off]">
          / 100점
        </span>
      </div>
    </div>
  );
}

function ScoreSummaryCard({ data }: { data: AnalysisResult }) {
  // API 데이터를 기반으로 점수 항목 생성 (80점 미만이면 danger 톤으로 처리)
  const scoreItems = [
    {
      label: "직무 적합성",
      score: data.jobFit,
      tone: data.jobFit >= 80 ? "primary" : "danger",
    },
    {
      label: "정량적 성과",
      score: data.impact,
      tone: data.impact >= 80 ? "primary" : "danger",
    },
    {
      label: "논리 구조",
      score: data.completeness,
      tone: data.completeness >= 80 ? "primary" : "danger",
    },
  ] as const;

  return (
    <article
      className="flex [flex:1_0_0] flex-col items-start gap-3 rounded-card-l bg-bg-contents-default px-6 pt-4 pb-7"
      style={{ minWidth: "min(580px, calc(100% - 372px))" }}
    >
      <div className="flex h-9 items-center gap-2 self-stretch pl-1">
        <ScoreSummaryIcon />
        <span className="flex-1 text-label14-semibold text-text-neutral-description">
          총점
        </span>
      </div>

      <Divider className="bg-line-neutral-default" />

      <div className="flex flex-col justify-end gap-4 self-stretch">
        <div className="flex items-center gap-12 self-stretch px-4 py-8">
          <div className="flex flex-col items-center justify-center">
            <ScoreCircle score={data.score} size="medium" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
            {scoreItems.map((item) => (
              <ScoreMetricRow
                key={item.label}
                label={item.label}
                score={item.score}
                tone={item.tone}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 self-stretch rounded-card-result bg-fill-quaternary-assistive px-5 py-4">
          <div className="flex items-center gap-1 self-stretch">
            <Icon
              type="SPARKLE"
              className="h-6 w-6 shrink-0 text-icon-primary-default"
            />
            <h2 className="text-b16-semibold text-text-neutral-title">
              {data.score >= 80
                ? "강점이 잘 드러나고 있어요"
                : "조금 더 보완이 필요해요"}
            </h2>
          </div>

          <div className="flex flex-col items-start self-stretch">
            <p className="self-stretch text-justify text-sub14-reg text-text-neutral-description whitespace-pre-line">
              {data.feedback}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function ReviewSummaryCard({
  data,
  onTabChange,
}: {
  data: AnalysisResult;
  onTabChange?: (tabId: string) => void;
}) {
  const [activeTabId, setActiveTabId] = useState(reviewTabs[0].id);

  const handleTabChange = (tabId: string) => {
    if (tabId !== activeTabId) {
      onTabChange?.(tabId);
    }

    setActiveTabId(tabId);
  };
  const isStrengthTab = activeTabId === "strengths";

  const evaluations = isStrengthTab
    ? data.keyStrengths
    : data.keyWeaknesses;
  const hasSingleEvaluation = evaluations.length === 1;

  return (
    <aside
      className={clsx(
        "flex min-w-[360px] max-w-[480px] [flex:1_0_0] flex-col items-start self-stretch rounded-card-l bg-bg-contents-default px-6 pt-4 pb-7",
        hasSingleEvaluation ? "justify-start gap-5" : "justify-between",
      )}
    >
      <div className="flex h-9 items-center gap-2 self-stretch pl-1">
        <ReviewSummaryIcon />
        <span className="flex-1 text-label14-semibold text-text-neutral-description">
          총평
        </span>
        <TabMenu
          tabs={reviewTabs}
          style="STRONG"
          size="S"
          activeTabId={activeTabId}
          onTabChange={handleTabChange}
        />
      </div>

      <div className="flex flex-col items-start gap-5 self-stretch pb-1">
        {evaluations.map((evaluation, index) => (
          <Evaluation
            key={`${activeTabId}-${index}`}
            rating={isStrengthTab ? "good" : "bad"}
            content={evaluation.title}
            quote={evaluation.quote}
          />
        ))}
      </div>
    </aside>
  );
}

export default function ResumeAnalysisFeedback({
  analysisData,
  children,
  onReviewTabChange,
}: ResumeAnalysisFeedbackProps) {
  const { scrollAreaRef, scrollbarMetrics, updateScrollbarMetrics } =
    useLnbScrollMetrics<HTMLElement>(true, "resume-analysis-feedback");

  return (
    <div className="relative flex min-h-0 flex-1 items-stretch self-stretch overflow-visible">
      <main
        ref={scrollAreaRef}
        onScroll={updateScrollbarMetrics}
        className={`flex min-h-0 flex-1  bg-fill-quaternary-assistive items-start justify-center self-stretch overflow-y-auto mx-2 rounded-card-l overflow-x-hidden px-2 pb-0 ${lnbHiddenScrollbarClass}`}
      >
        <div className="flex flex-1 flex-col items-center p-0">
          {children}

          <section className="flex items-center justify-center gap-3 self-stretch px-16 pt-8 pb-[120px]">
            <div className="mx-auto justify-center flex w-full max-w-[1320px] items-start gap-3 self-stretch">
              {/* 🌟 데이터 내려주기 */}
              <ScoreSummaryCard data={analysisData} />
              <ReviewSummaryCard
                data={analysisData}
                onTabChange={onReviewTabChange}
              />
            </div>
          </section>
        </div>
      </main>

      <LnbScrollbar
        metrics={scrollbarMetrics}
        size="l"
        className="inset-y-0 right-0 z-20 items-end"
      />
    </div>
  );
}
