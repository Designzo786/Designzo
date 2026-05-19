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
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ShapeMesh } from "@/components/three/ShapeMesh";
import type { MockAssetShape } from "@/lib/mock/assets";

interface Props {
  // Either a real GLTF/GLB model URL (used when the user uploaded a 3D file)
  modelUrl?: string;
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
 * Neutral studio lighting for REAL uploaded models.
 *
 * A procedural <Environment> built from Lightformers (no HDRI download, so
 * it works offline) gives PBR materials proper image-based lighting —
 * metals reflect, surfaces shade realistically. The directional lights add
 * crisp definition. All lights are white so the model shows its TRUE colours
 * instead of the brand-purple tint used for the decorative mock shapes.
 */
function StudioLighting() {
  return (
    <>
      <ambientLight intensity={0.35} />
      {/* Key light — top-front, casts the main definition */}
      <directionalLight position={[5, 8, 5]} intensity={2.4} color="#ffffff" />
      {/* Fill light — softer, opposite side, lifts the shadows */}
      <directionalLight position={[-6, 3, -4]} intensity={0.9} color="#ffffff" />

      {/* Image-based lighting — the reason PBR metals look real */}
      <Environment resolution={256}>
        {/* Large soft key softbox above */}
        <Lightformer
          form="rect"
          intensity={3}
          position={[0, 5, 2]}
          scale={[10, 5, 1]}
          rotation={[-Math.PI / 3, 0, 0]}
        />
        {/* Side fills */}
        <Lightformer
          form="rect"
          intensity={1.6}
          position={[-6, 1, 1]}
          scale={[4, 8, 1]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.6}
          position={[6, 1, 1]}
          scale={[4, 8, 1]}
          rotation={[0, -Math.PI / 2, 0]}
        />
        {/* Rim light from behind — separates the model from the background */}
        <Lightformer
          form="rect"
          intensity={2.2}
          position={[0, 3, -6]}
          scale={[10, 5, 1]}
        />
      </Environment>
    </>
  );
}

/**
 * Stylised purple lighting for the decorative mock primitives. Intentionally
 * brand-tinted — these aren't real assets, they're abstract showcase shapes.
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
 * `useProgress` tracks every asset going through Three's loading manager —
 * `active` is true only while something is in flight, so the overlay
 * appears for slow GLTF/GLB files and vanishes the moment they're ready.
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

export default function AssetViewer({ modelUrl, shape, color }: Props) {
  const hasModel = !!modelUrl;

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 0.4, 4], fov: 38 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
      >
        {hasModel ? <StudioLighting /> : <MockLighting />}

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

          {!hasModel && (
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
          // Real models: full freedom. No polar lock, pan enabled, generous zoom range.
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
          // Mock primitives: keep the original cinematic constraints.
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

      {hasModel && <ViewerLoader />}
    </div>
  );
}
