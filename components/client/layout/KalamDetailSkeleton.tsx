"use client";

const THEME = { border: "#F2D6CF", strawberryWhite: "#FFF7F4" };

export default function KalamDetailSkeleton() {
  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: THEME.strawberryWhite }}
    >
      <div className="mx-auto max-w-3xl px-4 pt-12 pb-24 sm:px-6 sm:pt-16">
        <div
          className="h-64 w-full animate-pulse rounded-3xl sm:h-80"
          style={{ backgroundColor: `${THEME.border}80` }}
        />
        <div className="mt-10 flex flex-col items-center gap-4">
          <div
            className="h-4 w-24 animate-pulse rounded"
            style={{ backgroundColor: `${THEME.border}80` }}
          />
          <div
            className="h-4 w-56 animate-pulse rounded"
            style={{ backgroundColor: `${THEME.border}80` }}
          />
        </div>
        <div
          className="mt-8 rounded-3xl border p-6 sm:p-10"
          style={{
            backgroundColor: "rgba(255,255,255,0.6)",
            borderColor: THEME.border,
          }}
        >
          <div className="space-y-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-6 w-full animate-pulse rounded"
                style={{
                  backgroundColor: `${THEME.border}80`,
                  width: `${60 + ((i * 7) % 40)}%`,
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}