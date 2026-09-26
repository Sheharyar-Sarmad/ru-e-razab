// app/nazm/[slug]/page.tsx
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
   SERVER FETCH — client API with Next.js caching
========================================================= */
async function fetchNazm(slug: string) {
  try {
    const url = `${SITE_URL}/api/client/deewan/nazm/${slug}`;

    const res = await fetch(url, {
      next: {
        revalidate: 3600,
        tags: [`nazm-${slug}`, "kalam-nazm"],
      },
    });

    if (!res.ok) return null;

    const json = await res.json();
    if (!json?.success) return null;

    return json.data?.nazm ?? null;
  } catch (err) {
    console.error("fetchNazm failed:", err);
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
   METADATA
========================================================= */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const n = await fetchNazm(slug);

  if (!n) {
    return {
      title: "نظم نہیں ملی — Ru-e-Razab",
      description: "The requested nazm could not be found.",
      robots: { index: false, follow: false },
    };
  }

  // ✅ Nazm content: content[0].shairs[0].lines[0]
  const firstLine = n.content?.[0]?.shairs?.[0]?.lines?.[0] || "";
  // ✅ Nazm title prefers `unwan` before the first line
  const title = n.metaTitle || n.unwan || `${firstLine} — نظم`;
  const description =
    n.metaDescription || `Read this nazm by Razab Tabraiz — ${firstLine}`;

  const canonicalUrl = `${SITE_URL}/nazm/${slug}`;

  const coverImage = n.coverImage as string | undefined;
  const coverMeta = n.coverImageMetadata as
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
      alt: n.unwan
        ? `${n.unwan} — نظم از رزب تبریز`
        : firstLine
        ? `${firstLine} — نظم از رزب تبریز`
        : "نظم — رزب تبریز",
    },
  ];

  const publishedTime = n.publishedAt
    ? new Date(n.publishedAt).toISOString()
    : n.createdAt
    ? new Date(n.createdAt).toISOString()
    : undefined;

  return {
    metadataBase: new URL(SITE_URL),
    title: `${title} | Ru-e-Razab`,
    description,
    alternates: { canonical: canonicalUrl },
    authors: [{ name: "Razab Tabraiz" }],
    keywords: [
      "نظم",
      "Nazm",
      "Razab Tabraiz",
      "روئے رزب",
      "Urdu Poetry",
      "Urdu Nazm",
      ...(n.category || []),
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
   PAGE
========================================================= */
export default async function NazmDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <Suspense fallback={<KalamDetailSkeleton />}>
      <KalamDetailClient type="nazm" slug={slug} />
    </Suspense>
  );
}