"use client";

import { useEffect, ReactNode } from "react";
import Lenis from "lenis";

/**
 * LenisProvider
 * -----------------------------------------
 * Wraps the app in a smooth-scroll context.
 * - Uses Lenis for fluid scrolling (works great with Framer Motion + GSAP ScrollTrigger)
 * - Syncs with requestAnimationFrame
 * - Cleans up on unmount
 * - Handles reduced-motion users gracefully
 * - Exposes lenis instance on window for debugging (dev only)
 */
export default function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Respect reduced-motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
    });

    // Expose for debugging in dev only
    if (process.env.NODE_ENV === "development") {
      (window as any).lenis = lenis;
    }

    let rafId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // Integrate with GSAP ScrollTrigger if present
    let cleanupScrollTrigger: (() => void) | undefined;
    (async () => {
      try {
        const { default: gsap } = await import("gsap");
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        gsap.registerPlugin(ScrollTrigger);

        const onLenisScroll = () => ScrollTrigger.update();
        lenis.on("scroll", onLenisScroll);

        const tickerCallback = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(tickerCallback);
        gsap.ticker.lagSmoothing(0);

        cleanupScrollTrigger = () => {
          lenis.off("scroll", onLenisScroll);
          gsap.ticker.remove(tickerCallback);
        };
      } catch {
        /* GSAP not installed — skip integration */
      }
    })();

    return () => {
      cancelAnimationFrame(rafId);
      cleanupScrollTrigger?.();
      lenis.destroy();
      if (process.env.NODE_ENV === "development") {
        delete (window as any).lenis;
      }
    };
  }, []);

  return <>{children}</>;
}