"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import TabMenu from "@/components/common/tabs/TabMenu";

const analysisTabs = [
  { id: "ai-feedback", label: "AI 피드백" },
  { id: "score-detail", label: "채점 상세" },
];

interface AnalysisHeaderProps {
  activeTabId: string;
  onTabChange?: (tabId: string) => void;
}

export default function AnalysisHeader({
  activeTabId,
  onTabChange,
}: AnalysisHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleTabChange = (tabId: string) => {
    if (tabId !== activeTabId) {
      onTabChange?.(tabId);
    }

    const params = new URLSearchParams(searchParams?.toString());
    params.set("tab", tabId);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <section className="flex flex-col items-center gap-2 self-stretch rounded-card-l bg-fill-quaternary-assistive px-16 pt-10 pb-0">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col items-start gap-2">
        <div className="flex flex-col items-start self-stretch px-1">
          <h1 className="text-h24-bold tracking-normal text-text-neutral-title [font-feature-settings:'liga'_off,'clig'_off]">
            자기소개서 분석 결과
          </h1>
        </div>

        <div className="flex flex-col items-start self-stretch px-1">
          <TabMenu
            tabs={analysisTabs}
            style="NORMAL"
            size="M"
            activeTabId={activeTabId}
            onTabChange={handleTabChange}
          />
        </div>
      </div>
    </section>
  );
}
