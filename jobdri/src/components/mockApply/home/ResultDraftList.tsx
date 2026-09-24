"use client";

import React, { useState } from "react";
import { DraftData } from "./types";
import { ResultDraftCard } from "@/components/mockApply/home/ResultDraftCard";
import { Pagination } from "@/components/common/Pagination";
import { ANALYTICS_EVENTS, track } from "@/lib/analytics";

interface ResultDraftListProps {
  drafts: DraftData[];
  onItemClick: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ResultDraftList({
  drafts,
  onItemClick,
  onDelete,
}: ResultDraftListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 3;

  const totalPages = Math.max(1, Math.ceil(drafts.length / ITEMS_PER_PAGE));
  const currentDrafts = drafts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    if (page !== currentPage) {
      track(ANALYTICS_EVENTS.PAUSED_CAROUSEL_NAVIGATED, {
        direction: page > currentPage ? "right" : "left",
        total_pages: totalPages,
        current_page: page,
      });
    }

    setCurrentPage(page);
  };

  if (drafts.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h2 className="text-label14-semibold text-text-neutral-description flex items-center">
          이어서 작성하기
          <span className="px-1 text-text-primary-default">
            {drafts.length}
          </span>
        </h2>

        <Pagination
          variant="compact"
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </header>

      {/* 2. 리스트 영역 */}
      <div className="bg-bg-contents-default rounded-card-l p-3 flex flex-col">
        {currentDrafts.map((draft) => (
          <ResultDraftCard
            key={draft.id}
            data={draft}
            onClick={() => onItemClick(draft.id)}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}
