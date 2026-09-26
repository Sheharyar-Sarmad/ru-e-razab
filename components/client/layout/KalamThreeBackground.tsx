"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const COLORS = {
  gold: "#D4A24E",
  orange: "#C2410C",
  orangeGlow: "#EA580C",
  emerald: "#047857",
};

interface Props {
  /** Overall canvas opacity. Defaults to 0.75. */
  opacity?: number;
  /** Particle count. Defaults to 220. */
  particleCount?: number;
  /** Camera z-distance. Higher = further away. Default 14. */
  zCamera?: number;
  /** Additional className passthrough */
  className?: string;
}

export default function KalamThreeBackground({
  opacity = 0.75,
  particleCount = 220,
  zCamera = 14,
  className = "",
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let w = mount.clientWidth || mount.offsetWidth || 1200;
    let h = mount.clientHeight || mount.offsetHeight || 800;

    /* ---------- Scene ---------- */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
    camera.position.z = zCamera;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    mount.appendChild(renderer.domElement);

    /* ---------- LAYER 1: particle field (3 colors) ---------- */
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);

    const cGold = new THREE.Color(COLORS.gold);
    const cOrange = new THREE.Color(COLORS.orange);
    const cEmerald = new THREE.Color(COLORS.emerald);

    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 34;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 18;

      const pick = Math.random();
      const c = pick < 0.55 ? cGold : pick < 0.85 ? cOrange : cEmerald;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.11,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    /* ---------- LAYER 2: two rotating rings ---------- */
    const ring1Geo = new THREE.TorusGeometry(8.5, 0.005, 16, 140);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.orange),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2.7;
    ring1.rotation.z = Math.PI / 9;
    ring1.position.set(-5, 1, -5);
    scene.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(6, 0.006, 16, 140);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.emerald),
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 2;
    ring2.rotation.y = Math.PI / 5;
    ring2.position.set(6, -2, -4);
    scene.add(ring2);

    /* ---------- LAYER 3: soft glow disc ---------- */
    const glowGeo = new THREE.CircleGeometry(12, 48);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.orangeGlow),
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0, -8);
    scene.add(glow);

    /* ---------- Animation loop ---------- */
    let raf = 0;
    let visible = true;
    let elapsed = 0;
    let last = performance.now();

    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      if (!visible || prefersReducedMotion) {
        renderer.render(scene, camera);
        return;
      }

      // Particles drift
      points.rotation.y += dt * 0.045;
      points.rotation.x += dt * 0.012;
      points.position.y = Math.sin(elapsed * 0.35) * 0.35;

      // Rings spin at different speeds
      ring1.rotation.z += dt * 0.09;
      ring2.rotation.x += dt * 0.13;
      ring2.rotation.z -= dt * 0.06;

      // Glow pulse
      glowMat.opacity = 0.04 + Math.sin(elapsed * 0.5) * 0.02;

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(animate);

    /* ---------- Resize / visibility ---------- */
    const onResize = () => {
      if (!mount) return;
      w = mount.clientWidth || w;
      h = mount.clientHeight || h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
    };

    // Delayed re-measure: the container may size itself after mount
    const remeasureTimer = setTimeout(onResize, 300);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(remeasureTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      geo.dispose();
      mat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [particleCount, zCamera]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
      style={{ opacity }}
    />
  );
}