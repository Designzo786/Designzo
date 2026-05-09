"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import { Suspense, useRef } from "react";
import type * as THREE from "three";

function HeroShape() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.12;
    ref.current.rotation.y += delta * 0.18;
  });

  return (
    <Float speed={1.2} floatIntensity={0.9} rotationIntensity={0.4}>
      <mesh ref={ref} scale={1.45}>
        <icosahedronGeometry args={[1, 4]} />
        <MeshDistortMaterial
          color="#7c3aed"
          distort={0.45}
          speed={1.6}
          roughness={0.2}
          metalness={0.7}
        />
      </mesh>
    </Float>
  );
}

export default function Hero3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 5, 5]} intensity={1.6} color="#ffffff" />
      <pointLight position={[5, 5, 5]} intensity={2.4} color="#a855f7" />
      <pointLight position={[-5, -5, 2]} intensity={1.5} color="#7c3aed" />
      <pointLight position={[0, 5, -5]} intensity={0.9} color="#fbbf24" />
      <Suspense fallback={null}>
        <HeroShape />
      </Suspense>
    </Canvas>
  );
}
