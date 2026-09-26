"use client";

import KalamCard, { type KalamCardItem } from "./KalamCard";
import KalamSkeletonCard from "./KalamSkeletonCard";
import KalamEmptyState from "./KalamEmptyState";

interface KalamGridProps {
  items: KalamCardItem[];
  loading?: boolean;
  skeletonCount?: number;
  emptyTitleUrdu?: string;
  emptyTitleEnglish?: string;
  emptyDescription?: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
  columns?: 2 | 3 | 4;
}

export default function KalamGrid({
  items,
  loading = false,
  skeletonCount = 9,
  emptyTitleUrdu,
  emptyTitleEnglish,
  emptyDescription,
  emptyActionHref,
  emptyActionLabel,
  columns = 3,
}: KalamGridProps) {
  const colClass =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      : "sm:grid-cols-2 lg:grid-cols-3";

  if (loading) {
    return (
      <div className={`grid grid-cols-1 gap-6 ${colClass}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <KalamSkeletonCard key={i} index={i} />
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
    <div className={`grid grid-cols-1 gap-6 ${colClass}`} dir="rtl">
      {items.map((item, i) => (
        <KalamCard
          key={`${item.type}-${item._id}`}
          item={item}
          index={i}
          priority={i < 3}
        />
      ))}
    </div>
  );
}