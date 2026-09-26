// app/qata/[slug]/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import EnvSecrets from "@/config/env.secrets";
import KalamDetailClient from "@/components/client/layout/KalamDetailClient";
import KalamDetailSkeleton from "@/components/client/layout/KalamDetailSkeleton";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL = EnvSecrets.appUrl;

async function fetchQata(slug: string) {
  try {
    const url = `${SITE_URL}/api/client/deewan/qata/${slug}`;

    const res = await fetch(url, {
      next: {
        revalidate: 3600,
        tags: [`qata-${slug}`, "kalam-qata"],
      },
    });

    if (!res.ok) return null;

    const json = await res.json();
    if (!json?.success) return null;

    return json.data?.qata ?? null;
  } catch (err) {
    console.error("fetchQata failed:", err);
    return null;
  }
}

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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const q = await fetchQata(slug);

  if (!q) {
    return {
      title: "قطعہ نہیں ملا — Ru-e-Razab",
      description: "The requested qata could not be found.",
      robots: { index: false, follow: false },
    };
  }

  // ✅ Qata content: content[0].lines[0]
  const firstLine = q.content?.[0]?.lines?.[0] || "";
  const title = q.metaTitle || `${firstLine} — قطعہ`;
  const description =
    q.metaDescription || `Read this qata by Razab Tabraiz — ${firstLine}`;

  const canonicalUrl = `${SITE_URL}/qata/${slug}`;

  const coverImage = q.coverImage as string | undefined;
  const coverMeta = q.coverImageMetadata as
    | { width?: number; height?: number; format?: string }
    | undefined;

  const primaryOgImage = coverImage
    ? optimizeForOG(coverImage)
    : `${SITE_URL}/logo.png`;

  const ogImages = [
    {
      url: primaryOgImage,
      width: coverImage ? coverMeta?.width ?? 1200 : 512,
      height: coverImage ? coverMeta?.height ?? 630 : 512,
      alt: firstLine
        ? `${firstLine} — قطعہ از رزب تبریز`
        : "قطعہ — رزب تبریز",
    },
  ];

  const publishedTime = q.publishedAt
    ? new Date(q.publishedAt).toISOString()
    : q.createdAt
    ? new Date(q.createdAt).toISOString()
    : undefined;

  return {
    metadataBase: new URL(SITE_URL),
    title: `${title} | Ru-e-Razab`,
    description,
    alternates: { canonical: canonicalUrl },
    authors: [{ name: "Razab Tabraiz" }],
    keywords: [
      "قطعہ",
      "Qata",
      "Razab Tabraiz",
      "روئے رزب",
      "Urdu Poetry",
      ...(q.category || []),
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

export default async function QataDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <Suspense fallback={<KalamDetailSkeleton />}>
      <KalamDetailClient type="qata" slug={slug} />
    </Suspense>
  );
}