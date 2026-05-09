"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Float, useGLTF, Center, Bounds } from "@react-three/drei";
import { Suspense } from "react";
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

export default function AssetViewer({ modelUrl, shape, color }: Props) {
  const hasModel = !!modelUrl;

  return (
    <Canvas
      camera={{ position: [0, 0.4, 4], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 3]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-3, 2, -2]} intensity={1.3} color="#7c3aed" />
      <pointLight position={[3, -1, 2]} intensity={0.9} color="#a855f7" />

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
  );
}
