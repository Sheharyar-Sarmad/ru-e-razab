import type { Metadata } from "next";
import HomeHero from "@/components/client/layout/HomeHero";
import FeaturedKalam from "@/components/client/layout/FeaturedKalam";
import KalamOfTheDay from "@/components/client/layout/KalamOfTheDay";
import AboutRazab from "@/components/client/layout/AboutRazab";
import ExploreKalam from "@/components/client/layout/ExploreKalam";

export const metadata: Metadata = {
  title: "Ru-e-Razab",
  description: "The poetry and literary world of Razab Tabraiz.",
};
export default function Home() {
  return (
    <main>
      <HomeHero />
      <KalamOfTheDay />
      <FeaturedKalam />
      <AboutRazab />
      <ExploreKalam />
    </main>
  );
}