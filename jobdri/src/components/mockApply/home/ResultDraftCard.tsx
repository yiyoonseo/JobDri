import React, { useState, useRef, useEffect } from "react";
import { ResultDraftStep } from "./ResultDraftStep";
import { DraftData } from "./types";
import Icon from "@/components/common/icons/Icon";
import Avatar from "./Avatar";
import { DropDownMenu } from "@/components/common/dropdown";
import { ANALYTICS_EVENTS, track } from "@/lib/analytics";
import clsx from "clsx";

interface ResultDraftCardProps {
  data: DraftData;
  onClick?: () => void;
  onDelete?: (id: string) => void; // 삭제 핸들러 추가
}

export const ResultDraftCard: React.FC<ResultDraftCardProps> = ({
  data,
  onClick,
  onDelete,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 외부 클릭 시 드롭다운을 닫는 로직
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleKababClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 토글이므로 메뉴가 열리는 클릭만 집계한다.
    if (!isMenuOpen) {
      track(ANALYTICS_EVENTS.PAUSED_KEBAB_CLICKED, {
        mock_apply_id: data.mockApplyId,
        company: data.companyName,
      });
    }

    setIsMenuOpen((prev) => !prev);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (onDelete) {
      onDelete(data.id);
    }
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        "flex items-center justify-between p-4 rounded-card transition-colors",
        "active:bg-fill-quaternary-assistive-pressed",
        "bg-transparent hover:bg-fill-quaternary-assistive-hover",
        onClick && "cursor-pointer",
      )}
    >
      {/* 1. 왼쪽 영역: 무조건 전체의 2/3 (66.6%) 고정 */}
      {/* 💡 flex-1을 빼고 shrink-0을 넣어서 크기가 줄어들지 않게 꽉 잡아줍니다. */}
      <div className="flex items-center w-2/3 gap-4 shrink-0 min-w-0">
        <Avatar
          name={data.companyName}
          color={data.profileColor}
          size="medium"
        />

        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1 text-label14-semibold min-w-0">
            <span className="truncate">{data.companyName}</span>
            <Icon
              type="CHEVRON_R_S"
              className="shrink-0 text-icon-neutral-strong"
            />
          </div>
          <span className="truncate text-cap12-med text-text-neutral-description">
            {data.position}
          </span>
        </div>
      </div>

      {/* 2. 중앙 영역: 남은 공간(1/3)의 절반을 알아서 차지 */}
      {/* 💡 flex-1만 남겨서 유연하게 맞춥니다. */}
      <div className="flex-1 flex justify-center shrink-0">
        <ResultDraftStep currentStep={data.currentStep} />
      </div>

      <div className="flex-1 flex items-center justify-end gap-4 min-w-0">
        <span className=" text-cap12-med w-40 text-text-neutral-caption text-center pl-2">
          {data.updatedAt}
        </span>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={handleKababClick}
            className="p-1 rounded-md text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <Icon type="KABAB" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 z-10">
              <DropDownMenu
                items={[
                  {
                    label: "삭제하기",
                    onClick: handleDeleteClick,
                  },
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
