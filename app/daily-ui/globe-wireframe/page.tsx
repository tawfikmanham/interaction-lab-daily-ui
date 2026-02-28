"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    THREE?: any;
  }
}

const THREE_CDN_URL = "https://unpkg.com/three@0.160.0/build/three.min.js";
const COUNTRIES_GEOJSON_URL = "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";

function loadThreeScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.THREE) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-threejs="cdn"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Three.js")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = THREE_CDN_URL;
    script.async = true;
    script.dataset.threejs = "cdn";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Three.js"));
    document.head.appendChild(script);
  });
}

function latLonToVector3(lat: number, lon: number, radius: number, THREE: any) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

export default function GlobeWireframePage() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let frameId = 0;
    let resizeHandler: (() => void) | null = null;
    let cleanupPointerHandlers: (() => void) | null = null;
    let renderer: any;

    const init = async () => {
      try {
        await loadThreeScript();
        if (!mounted || !mountRef.current || !window.THREE) return;

        const THREE = window.THREE;
        const container = mountRef.current;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(0, 0, 6);
        const minZoom = 3.2;
        const maxZoom = 10;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setClearColor(0xffffff, 1);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        const globeGroup = new THREE.Group();
        scene.add(globeGroup);

        const baseRadius = 1.9;
        const gridGroup = new THREE.Group();
        globeGroup.add(gridGroup);

        const gridLineMaterial = new THREE.LineBasicMaterial({
          color: 0xbdbdbd,
          transparent: true,
          opacity: 0.8,
        });

        for (let lat = -75; lat <= 75; lat += 15) {
          const points = [];
          for (let lon = -180; lon < 180; lon += 3) {
            points.push(latLonToVector3(lat, lon, baseRadius, THREE));
          }
          const latGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const latLine = new THREE.LineLoop(latGeometry, gridLineMaterial);
          gridGroup.add(latLine);
        }

        for (let lon = -180; lon < 180; lon += 15) {
          const points = [];
          for (let lat = -90; lat <= 90; lat += 3) {
            points.push(latLonToVector3(lat, lon, baseRadius, THREE));
          }
          const lonGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const lonLine = new THREE.Line(lonGeometry, gridLineMaterial);
          gridGroup.add(lonLine);
        }

        const countryGroup = new THREE.Group();
        globeGroup.add(countryGroup);

        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0x3f3f3f,
          transparent: true,
          opacity: 0.95,
        });

        try {
          const response = await fetch(COUNTRIES_GEOJSON_URL, { cache: "force-cache" });
          const data = await response.json();
          if (!mounted) return;

          for (const feature of data.features ?? []) {
            const geometry = feature.geometry;
            if (!geometry) continue;

            const polygons =
              geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];

            for (const polygon of polygons) {
              for (const ring of polygon) {
                if (!Array.isArray(ring) || ring.length < 2) continue;
                const points = ring
                  .map((pair: [number, number]) => latLonToVector3(pair[1], pair[0], baseRadius + 0.01, THREE))
                  .filter(Boolean);
                const ringGeometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(ringGeometry, lineMaterial);
                countryGroup.add(line);
              }
            }
          }
        } catch {
          if (mounted) {
            setError("Could not load country outlines from the external GeoJSON source.");
          }
        }

        let isPointerDown = false;
        let velocityX = 0;
        let velocityY = 0;
        let lastPointerX = 0;
        let lastPointerY = 0;

        const onPointerDown = (event: PointerEvent) => {
          isPointerDown = true;
          lastPointerX = event.clientX;
          lastPointerY = event.clientY;
        };

        const onPointerMove = (event: PointerEvent) => {
          if (!isPointerDown) return;
          const dx = event.clientX - lastPointerX;
          const dy = event.clientY - lastPointerY;
          lastPointerX = event.clientX;
          lastPointerY = event.clientY;

          const rotateSpeed = 0.005;
          globeGroup.rotation.y += dx * rotateSpeed;
          globeGroup.rotation.x += dy * rotateSpeed;
          globeGroup.rotation.x = Math.max(-1.25, Math.min(1.25, globeGroup.rotation.x));

          velocityX = dx * 0.0009;
          velocityY = dy * 0.0009;
        };

        const onPointerUp = () => {
          isPointerDown = false;
        };

        const onWheel = (event: WheelEvent) => {
          event.preventDefault();
          const zoomSpeed = 0.004;
          const nextZ = camera.position.z + event.deltaY * zoomSpeed;
          camera.position.z = Math.max(minZoom, Math.min(maxZoom, nextZ));
        };

        renderer.domElement.addEventListener("pointerdown", onPointerDown);
        renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);

        cleanupPointerHandlers = () => {
          renderer?.domElement?.removeEventListener("pointerdown", onPointerDown);
          renderer?.domElement?.removeEventListener("wheel", onWheel);
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
        };

        const animate = () => {
          frameId = window.requestAnimationFrame(animate);

          if (!isPointerDown) {
            globeGroup.rotation.y += 0.0015 + velocityX;
            globeGroup.rotation.x += velocityY;
            globeGroup.rotation.x = Math.max(-1.25, Math.min(1.25, globeGroup.rotation.x));
            velocityX *= 0.94;
            velocityY *= 0.9;
          }

          renderer.render(scene, camera);
        };
        animate();

        resizeHandler = () => {
          if (!renderer || !mountRef.current) return;
          camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        };
        window.addEventListener("resize", resizeHandler);
      } catch {
        if (mounted) {
          setError("Three.js failed to load. Check internet connection and try again.");
        }
      }
    };

    void init();

    return () => {
      mounted = false;
      window.cancelAnimationFrame(frameId);
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (cleanupPointerHandlers) cleanupPointerHandlers();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6 md:p-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold md:text-4xl">3D Globe</h1>
          <p className="max-w-3xl text-sm text-zinc-600 md:text-base">
            Drag to rotate and scroll to zoom.
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-zinc-300/80 bg-white">
          <div ref={mountRef} className="h-[65vh] min-h-[420px] w-full" />
        </section>

        {error ? (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>
        ) : null}
      </div>
    </main>
  );
}
