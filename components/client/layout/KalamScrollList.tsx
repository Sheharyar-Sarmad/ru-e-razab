"use client";

import KalamScrollItem, { type KalamScrollItemData } from "./KalamScrollItem";
import KalamSkeletonCard from "./KalamSkeletonCard";
import KalamEmptyState from "./KalamEmptyState";

interface Props {
  items: KalamScrollItemData[];
  loading?: boolean;
  skeletonCount?: number;
  emptyTitleUrdu?: string;
  emptyTitleEnglish?: string;
  emptyDescription?: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
}

export default function KalamScrollList({
  items,
  loading = false,
  skeletonCount = 6,
  emptyTitleUrdu,
  emptyTitleEnglish,
  emptyDescription,
  emptyActionHref,
  emptyActionLabel,
}: Props) {
  if (loading) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonRow key={i} index={i} />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <KalamEmptyState
        titleUrdu={emptyTitleUrdu}
        titleEnglish={emptyTitleEnglish}
        description={emptyDescription}
        actionHref={emptyActionHref}
        actionLabel={emptyActionLabel}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 sm:gap-10">
      {items.map((item, i) => (
        <KalamScrollItem
          key={`${item.type}-${item._id}`}
          item={item}
          index={i}
          priority={i < 2}
        />
      ))}
    </div>
  );
}

/* =========================================================
   SKELETON — mirrors the scroll item shape
========================================================= */
function SkeletonRow({ index }: { index: number }) {
  const imageOnLeft = index % 2 === 0;
  return (
    <div
      className={`
        flex flex-col overflow-hidden rounded-3xl border
        md:flex-row md:items-stretch
        ${!imageOnLeft ? "md:flex-row-reverse" : ""}
      `}
      style={{
        backgroundColor: "rgba(255,255,255,0.55)",
        borderColor: "#F2D6CF",
      }}
    >
      <div
        className="h-56 w-full animate-pulse md:h-auto md:w-[38%] md:min-h-[280px]"
        style={{ backgroundColor: "#F2D6CF80" }}
      />
      <div className="flex flex-1 flex-col justify-center gap-4 p-8">
        <div
          className="h-6 w-1/3 animate-pulse rounded"
          style={{ backgroundColor: "#F2D6CF80" }}
        />
        <div
          className="h-8 w-3/4 animate-pulse rounded"
          style={{ backgroundColor: "#F2D6CF80" }}
        />
        <div
          className="h-8 w-2/3 animate-pulse rounded"
          style={{ backgroundColor: "#F2D6CF80" }}
        />
        <div
          className="mt-2 h-4 w-1/4 animate-pulse rounded"
          style={{ backgroundColor: "#F2D6CF80" }}
        />
      </div>
    </div>
  );
}