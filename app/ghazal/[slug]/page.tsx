// app/ghazal/[slug]/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import EnvSecrets from "@/config/env.secrets";
import KalamDetailClient from "@/components/client/layout/KalamDetailClient";
import KalamDetailSkeleton from "@/components/client/layout/KalamDetailSkeleton";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL = EnvSecrets.appUrl;

/* =========================================================
   SERVER FETCH — hits your admin API with Next.js caching
   ---------------------------------------------------------
   - `revalidate: 3600`  → 1-hour server-side cache (matches API TTL)
   - `tags`              → allows on-demand invalidation via
                           revalidateTag("ghazal-${slug}")
   - Handles the API's { data: { ghazal } } response shape
========================================================= */
async function fetchGhazal(slug: string) {
  try {
    const url = `${SITE_URL}/api/client/deewan/ghazal/${slug}`;

    const res = await fetch(url, {
      next: {
        revalidate: 3600, // 1 hour
        tags: [`ghazal-${slug}`, "kalam-ghazal"],
      },
    });

    if (!res.ok) return null;

    const json = await res.json();
    if (!json?.success) return null;

    // API wraps in { data: { ghazal, responseTime } }
    return json.data?.ghazal ?? null;
  } catch (err) {
    console.error("fetchGhazal failed:", err);
    return null;
  }
}

/* =========================================================
   CLOUDINARY OPTIMIZER — perfect 1200×630 OG dimensions
========================================================= */
function optimizeForOG(url: string): string {
  if (!url) return url;
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace(
      "/upload/",
      "/upload/w_1200,h_630,c_fill,q_auto,f_auto/"
    );
  }
  return url;
}

/* =========================================================
   METADATA — cover image is the primary OG / Twitter image
========================================================= */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const g = await fetchGhazal(slug);

  /* ---------- Not found ---------- */
  if (!g) {
    return {
      title: "غزل نہیں ملی — Ru-e-Razab",
      description: "The requested ghazal could not be found.",
      robots: { index: false, follow: false },
    };
  }

  /* ---------- Derive text ---------- */
  const firstLine = g.content?.[0]?.lines?.[0] || "";
  const title = g.metaTitle || `${firstLine} — غزل`;
  const description =
    g.metaDescription || `Read this ghazal by Razab Tabraiz — ${firstLine}`;

  const canonicalUrl = `${SITE_URL}/ghazal/${slug}`;

  /* ---------- Cover image as OG ---------- */
  const coverImage = g.coverImage as string | undefined;
  const coverMeta = g.coverImageMetadata as
    | { width?: number; height?: number; format?: string }
    | undefined;

  const primaryOgImage = coverImage
    ? optimizeForOG(coverImage)
    : `${SITE_URL}/logo.png`;

  const ogImageWidth = coverImage ? coverMeta?.width ?? 1200 : 512;
  const ogImageHeight = coverImage ? coverMeta?.height ?? 630 : 512;

  const ogImages = [
    {
      url: primaryOgImage,
      width: ogImageWidth,
      height: ogImageHeight,
      alt: firstLine
        ? `${firstLine} — غزل از رزب تبریز`
        : "غزل — رزب تبریز",
    },
  ];

  const publishedTime = g.publishedAt
    ? new Date(g.publishedAt).toISOString()
    : g.createdAt
    ? new Date(g.createdAt).toISOString()
    : undefined;

  /* ---------- Return full metadata ---------- */
  return {
    metadataBase: EnvSecrets.appUrl,
    title: `${title} | Ru-e-Razab`,
    description,
    alternates: { canonical: canonicalUrl },
    authors: [{ name: "Razab Tabraiz" }],
    keywords: [
      "غزل",
      "Ghazal",
      "Razab Tabraiz",
      "روئے رزب",
      "Urdu Poetry",
      "Urdu Ghazal",
      ...(g.category || []),
    ],

    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Ru-e-Razab",
      locale: "ur_PK",
      type: "article",
      publishedTime,
      authors: ["Razab Tabraiz"],
      images: ogImages,
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages.map((img) => img.url),
      creator: "@rue_razab",
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },

    other: {
      "og:image:secure_url": primaryOgImage,
      "og:image:type":
        coverMeta?.format === "png"
          ? "image/png"
          : coverMeta?.format === "webp"
          ? "image/webp"
          : "image/jpeg",
    },
  };
}

/* =========================================================
   PAGE — hands off to shared KalamDetailClient
========================================================= */
export default async function GhazalDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <Suspense fallback={<KalamDetailSkeleton />}>
      <KalamDetailClient type="ghazal" slug={slug} />
    </Suspense>
  );
}