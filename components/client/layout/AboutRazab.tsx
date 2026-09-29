"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const ABOUT_IMAGE = "/about-razab.png";

const THEME = {
  background: "#120B09",
  surface: "#1A100D",
  orange: "#EA580C",
  amber: "#F59E0B",
  ivory: "#FFF7F4",
  muted: "#D8B8AE",
  emerald: "#047857",
};

/* -------------------------------------------------------------------------- */
/*                              ABOUT RAZAB                                   */
/* -------------------------------------------------------------------------- */

export default function AboutRazab() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".razab-about-eyebrow",
        {
          opacity: 0,
          y: 18,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 78%",
            once: true,
          },
        }
      );

      gsap.fromTo(
        ".razab-about-heading",
        {
          opacity: 0,
          y: 30,
        },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          delay: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 76%",
            once: true,
          },
        }
      );

      gsap.fromTo(
        ".razab-about-line",
        {
          scaleX: 0,
          transformOrigin: "right center",
        },
        {
          scaleX: 1,
          duration: 0.9,
          delay: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 74%",
            once: true,
          },
        }
      );

      gsap.fromTo(
        ".razab-about-copy",
        {
          opacity: 0,
          y: 30,
        },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          delay: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            once: true,
          },
        }
      );

      if (imageRef.current) {
        gsap.fromTo(
          imageRef.current,
          {
            opacity: 0,
            x: 45,
            scale: 1.035,
          },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 1.2,
            delay: 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 72%",
              once: true,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="راز تبریز کے بارے میں"
      className="relative w-full overflow-hidden"
      style={{
        backgroundColor: THEME.background,
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Atmospheric Background                                              */}
      {/* ------------------------------------------------------------------ */}

      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        {/* Burgundy glow */}

        <div
          className="absolute -left-48 top-1/3 h-[520px] w-[520px] rounded-full blur-[150px]"
          style={{
            background:
              "rgba(92, 25, 20, 0.45)",
          }}
        />

        {/* Orange glow */}

        <div
          className="absolute -right-48 bottom-0 h-[500px] w-[500px] rounded-full blur-[170px]"
          style={{
            background:
              "rgba(234, 88, 12, 0.08)",
          }}
        />

        {/* Emerald hint */}

        <div
          className="absolute right-1/4 top-1/2 h-[250px] w-[250px] rounded-full blur-[130px]"
          style={{
            background:
              "rgba(4, 120, 87, 0.045)",
          }}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main Container                                                      */}
      {/* ------------------------------------------------------------------ */}

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24 md:px-12 lg:px-16 lg:py-28 xl:px-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.95fr] lg:gap-16 xl:gap-24">
          {/* ---------------------------------------------------------------- */}
          {/* IMAGE                                                             */}
          {/* ---------------------------------------------------------------- */}

          <div
            ref={imageRef}
            className="order-1"
          >
            <motion.div
              whileHover={{
                scale: 1.015,
              }}
              transition={{
                duration: 0.7,
                ease: "easeOut",
              }}
              className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[16/11]">
                <Image
                  src={ABOUT_IMAGE}
                  alt="راز تبریز کے ادبی مزاج کی نمائندگی کرتی ہوئی تصویر"
                  fill
                  priority={false}
                  quality={100}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
                />

                {/* Dark cinematic overlay */}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-orange-950/20" />

                {/* Inner frame */}

                <div className="absolute inset-5 rounded-[1.5rem] border border-white/10 sm:inset-6" />

                {/* Image label */}

                <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between gap-5 sm:bottom-9 sm:left-9 sm:right-9">
                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-[0.35em] text-orange-300">
                      Urdu Poetry
                    </p>

                    <p
                      dir="rtl"
                      className="font-urdu mt-2 text-xl leading-[1.8] text-white sm:text-2xl"
                    >
                      لفظ، خیال، معنی
                    </p>
                  </div>

                  {/* Decorative mark */}

                  <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/20 backdrop-blur-sm">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          THEME.orange,
                        boxShadow:
                          "0 0 18px rgba(234,88,12,0.8)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* CONTENT                                                          */}
          {/* ---------------------------------------------------------------- */}

          <div className="razab-about-copy order-2 text-right">
            {/* Eyebrow */}

            <div className="razab-about-eyebrow mb-5 flex items-center justify-end gap-3">
              <span
                className="h-px w-10"
                style={{
                  backgroundColor:
                    THEME.orange,
                }}
              />

              <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-orange-300 sm:text-xs">
                The Poet
              </span>
            </div>

            {/* Heading */}

            <h2
              dir="rtl"
              className="razab-about-heading font-urdu text-4xl leading-[1.9] text-white sm:text-5xl md:text-6xl"
            >
              رازِ تبریز
            </h2>

            <div className="razab-about-line mr-0 mt-3 h-[2px] w-24 origin-right bg-orange-500" />

            {/* Urdu identity */}

            <p
              dir="rtl"
              className="font-urdu mt-5 text-xl leading-[2] text-orange-200/90 sm:text-2xl"
            >
              ایک اردو شاعر — اپنے منفرد طرزِ
              اظہار کے ساتھ
            </p>

            {/* Main Description */}

            <div className="mt-8 space-y-6">
              <p
                dir="rtl"
                className="font-urdu text-xl leading-[2.25] text-white/90 sm:text-2xl"
              >
                رزب تبریز اردو شاعری کے ان شعراء
                میں سے ہیں جن کے ہاں لفظ محض اظہار
                کا وسیلہ نہیں بلکہ معنی کی ایک وسیع
                دنیا کا دروازہ ہے۔
              </p>

              <p
                dir="rtl"
                className="font-urdu text-lg leading-[2.3] text-[#D8B8AE] sm:text-xl"
              >
                ان کے کلام میں دقیق لفظیات، پیچیدہ
                تراکیب، تہہ دار استعارات اور گہری
                فکری جہتیں نمایاں ہوتی ہیں۔ ان کی
                شاعری فوری فہم سے زیادہ ٹھہر کر
                پڑھنے، لفظوں کو پرکھنے اور معنی کی
                تہوں تک اترنے کا تقاضا کرتی ہے۔
              </p>

              <p
                dir="rtl"
                className="font-urdu text-lg leading-[2.3] text-[#D8B8AE] sm:text-xl"
              >
                بڑے فیس بک ادبی حلقوں میں ان کا کلام
                قارئین تک پہنچتا رہا ہے، جہاں ان کے
                اشعار اپنی منفرد زبان، لفظی انتخاب
                اور فکری گہرائی کے باعث اپنی الگ
                شناخت رکھتے ہیں۔
              </p>
            </div>

            {/* Literary Characteristics                                         */}

            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  title: "دقیق لفظیات",
                  description:
                    "Refined Vocabulary",
                },
                {
                  title: "تہہ دار معنی",
                  description:
                    "Layered Meaning",
                },
                {
                  title: "فکری گہرائی",
                  description:
                    "Intellectual Depth",
                },
                {
                  title: "منفرد اسلوب",
                  description:
                    "Distinct Voice",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="group rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-4 text-center backdrop-blur-sm transition duration-300 hover:border-orange-400/20 hover:bg-orange-500/[0.05]"
                >
                  <p
                    dir="rtl"
                    className="font-urdu text-base leading-[1.8] text-white"
                  >
                    {item.title}
                  </p>

                  <p className="mt-1 text-[8px] uppercase tracking-[0.15em] text-white/30 transition group-hover:text-orange-300/60">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* CTA                                                               */}
            {/* ---------------------------------------------------------------- */}

            <div className="mt-9 flex justify-end">
              <Link
                href="/kulliyat"
                dir="rtl"
                className="group inline-flex items-center justify-center gap-3 rounded-full border border-orange-400/25 bg-orange-500/10 px-6 py-3.5 text-white transition-all duration-300 hover:border-orange-400/50 hover:bg-orange-500/20"
              >
                <span className="font-urdu text-base leading-none">
                  کلیات پڑھیں
                </span>

                <span
                  aria-hidden="true"
                  className="text-lg text-orange-300 transition-transform duration-300 group-hover:-translate-x-1"
                >
                  ←
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom Divider                                                      */}
      {/* ------------------------------------------------------------------ */}

      <div
        className="absolute bottom-0 left-0 h-px w-full"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(234,88,12,0.5), transparent)",
        }}
      />
    </section>
  );
}