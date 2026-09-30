// app/shair/[slug]/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import EnvSecrets from "@/config/env.secrets";
import KalamDetailClient from "@/components/client/layout/KalamDetailClient";
import KalamDetailSkeleton from "@/components/client/layout/KalamDetailSkeleton";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL = EnvSecrets.appUrl;

async function fetchShair(slug: string) {
  try {
    const url = `${SITE_URL}/api/client/deewan/shair/${slug}`;

    const res = await fetch(url, {
      next: {
        revalidate: 3600,
        tags: [`shair-${slug}`, "kalam-shair"],
      },
    });

    if (!res.ok) return null;

    const json = await res.json();
    if (!json?.success) return null;

    return json.data?.shair ?? null;
  } catch (err) {
    console.error("fetchShair failed:", err);
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
  const s = await fetchShair(slug);

  if (!s) {
    return {
      title: "شعر نہیں ملا — Ru-e-Razab",
      description: "The requested shair could not be found.",
      robots: { index: false, follow: false },
    };
  }

  // ✅ Shair content is a flat [string, string] array
  const firstLine = Array.isArray(s.content) ? s.content[0] ?? "" : "";
  const secondLine = Array.isArray(s.content) ? s.content[1] ?? "" : "";
  const title = s.metaTitle || `${firstLine} — شعر`;
  const description =
    s.metaDescription ||
    `Read this shair by Razab Tabraiz — ${firstLine}${
      secondLine ? " / " + secondLine : ""
    }`;

  const canonicalUrl = `${SITE_URL}/shair/${slug}`;

  const coverImage = s.coverImage as string | undefined;
  const coverMeta = s.coverImageMetadata as
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
        ? `${firstLine} — شعر از رزب تبریز`
        : "شعر — رزب تبریز",
    },
  ];

  const publishedTime = s.publishedAt
    ? new Date(s.publishedAt).toISOString()
    : s.createdAt
    ? new Date(s.createdAt).toISOString()
    : undefined;

  return {
    metadataBase: EnvSecrets.appUrl,
    title: `${title} | Ru-e-Razab`,
    description,
    alternates: { canonical: canonicalUrl },
    authors: [{ name: "Razab Tabraiz" }],
    keywords: [
      "شعر",
      "Shair",
      "Couplet",
      "Razab Tabraiz",
      "روئے رزب",
      "Urdu Poetry",
      ...(s.category || []),
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

export default async function ShairDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <Suspense fallback={<KalamDetailSkeleton />}>
      <KalamDetailClient type="shair" slug={slug} />
    </Suspense>
  );
}