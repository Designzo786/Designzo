"use client";

import { Canvas } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { Suspense } from "react";
import { ShapeMesh } from "@/components/three/ShapeMesh";
import { LazyMount } from "@/components/three/LazyMount";
import type { MockAssetShape } from "@/lib/mock/assets";

interface Props {
  shape: MockAssetShape;
  color: string;
}

export default function AssetCardPreview({ shape, color }: Props) {
  return (
    <LazyMount
      fallback={<div className="absolute inset-0 skeleton" />}
      rootMargin="300px"
    >
      <Canvas
        camera={{ position: [0, 0, 3.4], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        dpr={[1, 1.25]}
        frameloop="always"
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 4, 3]} intensity={1.4} />
        <pointLight position={[-3, -2, 2]} intensity={1.2} color="#7c3aed" />
        <pointLight position={[3, 3, -2]} intensity={0.7} color="#a855f7" />
        <Suspense fallback={null}>
          <Float speed={1.6} floatIntensity={0.4} rotationIntensity={0.7}>
            <mesh>
              <ShapeMesh shape={shape} />
              <meshStandardMaterial
                color={color}
                metalness={0.55}
                roughness={0.32}
              />
            </mesh>
          </Float>
        </Suspense>
      </Canvas>
    </LazyMount>
  );
}
