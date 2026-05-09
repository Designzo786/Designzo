"use client";

import { Canvas } from "@react-three/fiber";
import { Float, Environment } from "@react-three/drei";
import { Suspense, type ReactElement } from "react";

interface ShowcaseCardProps {
  geometry: ReactElement;
  color: string;
  metalness?: number;
  roughness?: number;
}

export default function ShowcaseCard({
  geometry,
  color,
  metalness = 0.85,
  roughness = 0.15,
}: ShowcaseCardProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.2], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 3, 3]} intensity={2} color="#a855f7" />
      <pointLight position={[-3, -2, 1]} intensity={1} color="#7c3aed" />
      <Suspense fallback={null}>
        <Float speed={2} floatIntensity={0.6} rotationIntensity={1}>
          <mesh>
            {geometry}
            <meshStandardMaterial
              color={color}
              metalness={metalness}
              roughness={roughness}
              envMapIntensity={1.2}
            />
          </mesh>
        </Float>
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}
