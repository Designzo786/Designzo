"use client";

import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  Float,
  useGLTF,
  Center,
  Bounds,
  Environment,
  Lightformer,
  useProgress,
} from "@react-three/drei";
import { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import { ACESFilmicToneMapping } from "three";
import { Loader2, Sun, Moon, ImageOff } from "lucide-react";
import { ShapeMesh } from "@/components/three/ShapeMesh";
import { LottiePlayer } from "./LottiePlayer";
import { SvgIconViewer } from "./SvgIconViewer";
import { cn } from "@/lib/utils";
import type { MockAssetShape } from "@/lib/mock/assets";

type LightingMode = "studio" | "ambience";
const LIGHTING_STORAGE_KEY = "designzo.viewer.lighting";

interface Props {
  // What KIND of asset we're rendering. Drives the dispatch below — 3D model
  // goes through Three.js, Lottie through dotlottie-react, SVG through a
  // sandboxed <img>, and falling through to the brand-tinted primitive when
  // we have no real file.
  fileType?: string;
  // Public URL of the asset file (.glb / .gltf for 3D, .json / .lottie for
  // Lottie, .svg for SVG icons). Treated as optional so the fallback
  // primitive path stays accessible.
  modelUrl?: string;
  // Title used as alt-text on the SVG viewer.
  title?: string;
  // Or a mock primitive — used by seeded sample assets without a real file
  shape?: MockAssetShape;
  color?: string;
}

function GltfModel({ url }: { url: string }) {
  const gltf = useGLTF(url);
  // `<Bounds fit clip>` (without `observe`) only auto-frames the camera ONCE
  // when the model loads. Without `observe`, OrbitControls fully owns the
  // camera afterwards — drag/zoom/pan all behave normally.
  return (
    <Bounds fit clip margin={1.2}>
      <Center>
        <primitive object={gltf.scene} />
      </Center>
    </Bounds>
  );
}

/**
 * Error boundary that wraps the entire <Canvas> tree.
 *
 *   The most common failure mode is `useGLTF` throwing when it can't fetch
 *   the .glb — CORS rejection from R2, a slow network giving up, a corrupt
 *   binary, or a malformed glTF root. Without this boundary that error
 *   propagates past Suspense, past R3F, all the way up to the route-level
 *   error.tsx and the user sees a full-page "Something went wrong" crash.
 *
 *   Catching it here lets the rest of the asset detail page render fine,
 *   with just the 3D viewer slot replaced by a small, calm "preview
 *   unavailable" card.
 */
class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[AssetViewer] model load failed:", err);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function ModelLoadFailed() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 bg-linear-to-br from-elevated to-canvas">
      <div className="w-12 h-12 rounded-xl bg-elevated border border-border flex items-center justify-center text-muted">
        <ImageOff className="w-5 h-5" />
      </div>
      <div>
        <div className="text-sm font-medium text-secondary">
          3D preview unavailable
        </div>
        <div className="text-[11px] text-muted mt-1 max-w-xs leading-snug">
          We couldn&apos;t load this model right now. The rest of the page
          works normally — try refreshing in a moment.
        </div>
      </div>
    </div>
  );
}

/**
 * Neutral STUDIO lighting — bright, evaluation-grade.
 *
 *  • <hemisphereLight> + ambient = soft fill from the whole sky so even
 *    cavities never go black.
 *  • Three directional lights (key, fill, rim) — classic 3-point setup,
 *    so the silhouette pops off the background.
 *  • <Environment> built from Lightformers (no HDRI download — works
 *    offline) gives PBR materials proper image-based lighting; metals
 *    reflect realistically, roughness reads correctly.
 *  • All lights are WHITE so the model shows its true colours — ideal
 *    for evaluating a model's material work before approving.
 */
function StudioLighting() {
  return (
    <>
      <hemisphereLight args={["#ffffff", "#1a1a22", 0.55]} />
      <ambientLight intensity={0.45} />

      <directionalLight position={[5, 8, 5]} intensity={3.0} color="#ffffff" />
      <directionalLight position={[-6, 3, -4]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[0, 4, -6]} intensity={1.4} color="#ffffff" />

      <Environment resolution={256}>
        <Lightformer
          form="rect"
          intensity={3.5}
          position={[0, 5, 2]}
          scale={[10, 5, 1]}
          rotation={[-Math.PI / 3, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.8}
          position={[-6, 1, 1]}
          scale={[4, 8, 1]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.8}
          position={[6, 1, 1]}
          scale={[4, 8, 1]}
          rotation={[0, -Math.PI / 2, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2.5}
          position={[0, 3, -6]}
          scale={[10, 5, 1]}
        />
        <Lightformer
          form="rect"
          intensity={0.8}
          position={[0, -4, 0]}
          scale={[8, 8, 1]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </Environment>
    </>
  );
}

/**
 * AMBIENCE lighting — warm, soft, cinematic.
 *
 *  • Half the directional intensity of studio mode so contrast and shape
 *    do the heavy lifting instead of raw brightness.
 *  • Subtle warm key (slightly amber, like late-afternoon sun) + cool
 *    rim (slightly blue) for a complementary push-pull that flatters
 *    almost any material.
 *  • One large overhead lightformer + a single back rim — same shape
 *    language as a photography product set with one diffuser and one
 *    bounce card.
 *  • Reduced underglow so the lower half drops into honest shadow,
 *    giving the model weight and grounding it.
 */
function AmbienceLighting() {
  return (
    <>
      {/* Soft, slightly warm overall fill — feels like sunset bouncing
          around a room rather than a clinical studio. */}
      <hemisphereLight args={["#ffe4cc", "#0d0815", 0.4]} />
      <ambientLight intensity={0.3} />

      {/* Warm key (low intensity) */}
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.6}
        color="#ffd9a8"
      />
      {/* Cool rim — adds a subtle complementary push along the back edge */}
      <directionalLight
        position={[-3, 3, -5]}
        intensity={0.9}
        color="#9bb8ff"
      />

      <Environment resolution={256}>
        {/* Single big soft overhead — like a diffused window light */}
        <Lightformer
          form="rect"
          intensity={2.2}
          position={[0, 5, 1]}
          scale={[12, 4, 1]}
          rotation={[-Math.PI / 2.5, 0, 0]}
          color="#fff4e0"
        />
        {/* Cool rim from behind for separation */}
        <Lightformer
          form="rect"
          intensity={1.4}
          position={[0, 2, -6]}
          scale={[8, 5, 1]}
          color="#cfd9ff"
        />
        {/* Very gentle warm side fill */}
        <Lightformer
          form="rect"
          intensity={0.6}
          position={[5, 1, 0]}
          scale={[3, 6, 1]}
          rotation={[0, -Math.PI / 2, 0]}
          color="#ffe7c8"
        />
      </Environment>
    </>
  );
}

/**
 * Stylised purple lighting for the decorative fallback primitives.
 * Intentionally brand-tinted — these aren't real assets.
 */
function MockLighting() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 3]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-3, 2, -2]} intensity={1.3} color="#7c3aed" />
      <pointLight position={[3, -1, 2]} intensity={0.9} color="#a855f7" />
    </>
  );
}

/**
 * Loading overlay shown while a real 3D model downloads and parses.
 */
function ViewerLoader() {
  const { active, progress } = useProgress();
  if (!active) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/80 backdrop-blur-sm pointer-events-none">
      <Loader2 className="w-7 h-7 text-accent-light animate-spin" />
      <div className="text-xs font-medium text-secondary">
        Loading 3D model… {Math.round(progress)}%
      </div>
    </div>
  );
}

/**
 * Tiny segmented control floating in the corner of the viewer that lets the
 * viewer flip between Studio (bright, neutral) and Ambience (warm, soft)
 * lighting. The choice is persisted in localStorage so users see the same
 * preset next time they open ANY 3D viewer in the app.
 */
function LightingToggle({
  mode,
  onChange,
}: {
  mode: LightingMode;
  onChange: (m: LightingMode) => void;
}) {
  return (
    <div
      className="absolute top-3 right-3 inline-flex items-center gap-0.5 p-0.5 rounded-full bg-canvas/70 backdrop-blur border border-border shadow-sm"
      role="radiogroup"
      aria-label="Lighting mode"
    >
      <LightingButton
        active={mode === "studio"}
        onClick={() => onChange("studio")}
        icon={<Sun className="w-3.5 h-3.5" />}
        label="Studio"
      />
      <LightingButton
        active={mode === "ambience"}
        onClick={() => onChange("ambience")}
        icon={<Moon className="w-3.5 h-3.5" />}
        label="Ambience"
      />
    </div>
  );
}

function LightingButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      // eslint-disable-next-line jsx-a11y/aria-proptypes -- React serializes boolean to "true"/"false" string for aria-checked
      aria-checked={active}
      onClick={onClick}
      title={`${label} lighting`}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
        active
          ? "bg-accent text-white shadow-[0_0_12px_-2px_rgba(124,58,237,0.6)]"
          : "text-muted hover:text-primary"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function AssetViewer({
  fileType,
  modelUrl,
  title,
  shape,
  color,
}: Props) {
  // Branch on the asset's declared file type — each one has its own renderer.
  // Lottie + SVG paths short-circuit out before any of the Three.js setup
  // runs, so we don't waste a Canvas + WebGL context on a 4KB icon.
  if (modelUrl && fileType === "LOTTIE") {
    return (
      <div className="relative w-full h-full">
        <ModelErrorBoundary fallback={<ModelLoadFailed />}>
          <LottiePlayer src={modelUrl} />
        </ModelErrorBoundary>
      </div>
    );
  }
  if (modelUrl && fileType === "SVG_ICON") {
    return (
      <div className="relative w-full h-full">
        <ModelErrorBoundary fallback={<ModelLoadFailed />}>
          <SvgIconViewer src={modelUrl} title={title} />
        </ModelErrorBoundary>
      </div>
    );
  }

  const hasModel = !!modelUrl;
  // Lighting preference, persisted across sessions. Studio is the default
  // because it's the most useful for evaluation (no warm/cool tint hiding
  // the real material colors).
  const [lighting, setLighting] = useState<LightingMode>("studio");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(
      LIGHTING_STORAGE_KEY
    ) as LightingMode | null;
    if (saved === "studio" || saved === "ambience") setLighting(saved);
  }, []);

  function updateLighting(next: LightingMode) {
    setLighting(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LIGHTING_STORAGE_KEY, next);
    }
  }

  return (
    <div className="relative w-full h-full">
      <ModelErrorBoundary fallback={<ModelLoadFailed />}>
      <Canvas
        camera={{ position: [0, 0.4, 4], fov: 38 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          // ACES Filmic = the same tone-mapping curve Unreal / Blender Cycles
          // use; PBR materials render with cinematic highlight rolloff instead
          // of the default washed-out linear mapping.
          toneMapping: ACESFilmicToneMapping,
          // Ambience drops exposure slightly for a softer, less-blown look.
          toneMappingExposure: lighting === "ambience" ? 1.0 : 1.15,
        }}
        dpr={[1, 1.5]}
      >
        {hasModel ? (
          lighting === "studio" ? (
            <StudioLighting />
          ) : (
            <AmbienceLighting />
          )
        ) : (
          <MockLighting />
        )}

        <Suspense fallback={null}>
          {hasModel ? (
            <GltfModel url={modelUrl} />
          ) : (
            <Float speed={1} floatIntensity={0.3} rotationIntensity={0.2}>
              <mesh>
                <ShapeMesh shape={shape ?? "icosahedron"} />
                <meshStandardMaterial
                  color={color ?? "#7c3aed"}
                  metalness={0.6}
                  roughness={0.28}
                />
              </mesh>
            </Float>
          )}

          {/* Ground shadow — grounds the model so it doesn't look like it's
              floating. Real uploads need a wider, softer shadow than the mock
              primitives because their bounds can be much larger. Ambience mode
              gets a slightly darker shadow for extra weight. */}
          {hasModel ? (
            <ContactShadows
              position={[0, -1.4, 0]}
              opacity={lighting === "ambience" ? 0.7 : 0.55}
              scale={12}
              blur={lighting === "ambience" ? 3.2 : 2.8}
              far={6}
              resolution={1024}
            />
          ) : (
            <ContactShadows
              position={[0, -1.7, 0]}
              opacity={0.5}
              scale={6}
              blur={2.4}
              far={3}
            />
          )}
        </Suspense>

        {hasModel ? (
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            autoRotate={false}
            minDistance={0.1}
            maxDistance={1000}
            makeDefault
          />
        ) : (
          <OrbitControls
            enablePan={false}
            enableZoom
            autoRotate
            autoRotateSpeed={0.8}
            minDistance={2.5}
            maxDistance={6}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.6}
          />
        )}
      </Canvas>
      </ModelErrorBoundary>

      {/* Toggle is only useful for real models — mock primitives stay on the
          stylised purple lighting for brand consistency. */}
      {hasModel && (
        <LightingToggle mode={lighting} onChange={updateLighting} />
      )}

      {hasModel && <ViewerLoader />}
    </div>
  );
}
