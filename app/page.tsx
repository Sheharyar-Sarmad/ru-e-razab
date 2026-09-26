import type { Metadata } from "next";
import HomeHero from "@/components/client/layout/HomeHero";
import StatsStrip from "@/components/client/layout/StatsStrip";
import KalamOfTheDay from "@/components/client/layout/KalamOfTheDay";
import FeaturedKalam from "@/components/client/layout/FeaturedKalam";
import TimelineSection from "@/components/client/layout/TimelineSection";
import AboutRazab from "@/components/client/layout/AboutRazab";
import ExploreKalam from "@/components/client/layout/ExploreKalam";
import AIAnalysisBanner from "@/components/client/layout/AIAnalysisBanner";

export const metadata: Metadata = {
  title: "Ru-e-Razab",
  description: "The poetry and literary world of Razab Tabraiz.",
};

export default function Home() {
  return (
    <main>
      <HomeHero />
      <StatsStrip />
      <KalamOfTheDay />
      <FeaturedKalam />
      <TimelineSection />
      <AboutRazab />
      <ExploreKalam />
      <AIAnalysisBanner />
    </main>
  );
}