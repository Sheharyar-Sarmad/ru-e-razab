"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const COLORS = {
  gold: "#D4A24E",
  orange: "#C2410C",
  emerald: "#047857",
  glow: "#EA580C",
};

export default function KalamThreeBackground({
  opacity = 0.85,
  particleCount = 180,
  zCamera = 14,
}: {
  opacity?: number;
  particleCount?: number;
  zCamera?: number;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = mount.clientWidth || mount.offsetWidth || 1200;
    let h = mount.clientHeight || mount.offsetHeight || 800;

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

    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const cG = new THREE.Color(COLORS.gold);
    const cO = new THREE.Color(COLORS.orange);
    const cE = new THREE.Color(COLORS.emerald);

    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 32;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
      const p = Math.random();
      const c = p < 0.55 ? cG : p < 0.85 ? cO : cE;
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
      opacity: 0.6,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const ringGeo = new THREE.TorusGeometry(8, 0.005, 16, 140);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.orange),
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.7;
    ring.position.set(-4, 1, -5);
    scene.add(ring);

    const glowGeo = new THREE.CircleGeometry(11, 48);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.glow),
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0, -8);
    scene.add(glow);

    let rafId = 0;
    let visible = true;
    let elapsed = 0;
    let last = performance.now();

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      if (!visible || reduced) {
        renderer.render(scene, camera);
        return;
      }
      points.rotation.y += dt * 0.04;
      points.position.y = Math.sin(elapsed * 0.3) * 0.22;
      ring.rotation.z += dt * 0.08;
      glowMat.opacity = 0.04 + Math.sin(elapsed * 0.5) * 0.02;
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    const onResize = () => {
      w = mount.clientWidth || w;
      h = mount.clientHeight || h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const onVis = () => {
      visible = document.visibilityState === "visible";
    };
    const remeasure = setTimeout(onResize, 300);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearTimeout(remeasure);
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      geo.dispose();
      mat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [particleCount, zCamera]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ opacity }}
    />
  );
}