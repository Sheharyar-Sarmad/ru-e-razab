"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const COLORS = {
  darkOrange: "#C2410C",
  orangeGlow: "#EA580C",
  emeraldGreen: "#047857",
  gold: "#D4A24E",
};

export default function ThreeBackground({
  opacity = 0.85,
  particleCount = 200,
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

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = mount.clientWidth || mount.offsetWidth || 1200;
    let height = mount.clientHeight || mount.offsetHeight || 800;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.z = zCamera;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    mount.appendChild(renderer.domElement);

    /* particles */
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const cGold = new THREE.Color(COLORS.gold);
    const cOrange = new THREE.Color(COLORS.darkOrange);
    const cEmerald = new THREE.Color(COLORS.emeraldGreen);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 32;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;

      const pick = Math.random();
      const c = pick < 0.55 ? cGold : pick < 0.85 ? cOrange : cEmerald;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.11,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    /* rings */
    const ring1Geo = new THREE.TorusGeometry(7.5, 0.005, 16, 140);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.darkOrange),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2.7;
    ring1.position.set(-4, 1, -4);
    scene.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(5.2, 0.006, 16, 140);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.emeraldGreen),
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 5;
    ring2.position.set(5, -2, -3);
    scene.add(ring2);

    /* glow */
    const glowGeo = new THREE.CircleGeometry(11, 48);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COLORS.orangeGlow),
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0, -7);
    scene.add(glow);

    let animationId = 0;
    let isVisible = true;
    let elapsed = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      animationId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      if (!isVisible || prefersReducedMotion) {
        renderer.render(scene, camera);
        return;
      }

      points.rotation.y += dt * 0.045;
      points.rotation.x += dt * 0.01;
      points.position.y = Math.sin(elapsed * 0.3) * 0.25;

      ring1.rotation.z += dt * 0.09;
      ring2.rotation.x += dt * 0.12;
      glowMat.opacity = 0.04 + Math.sin(elapsed * 0.5) * 0.02;

      renderer.render(scene, camera);
    };
    animationId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!mount) return;
      width = mount.clientWidth || width;
      height = mount.clientHeight || height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const handleVisibility = () => {
      isVisible = document.visibilityState === "visible";
    };

    const remeasureTimer = setTimeout(handleResize, 300);
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(remeasureTimer);
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
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
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ opacity }}
    />
  );
}