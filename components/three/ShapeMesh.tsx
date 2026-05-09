import type { MockAssetShape } from "@/lib/mock/assets";

export function ShapeMesh({ shape }: { shape: MockAssetShape }) {
  switch (shape) {
    case "icosahedron":
      return <icosahedronGeometry args={[1, 0]} />;
    case "torusKnot":
      return <torusKnotGeometry args={[0.7, 0.22, 100, 16]} />;
    case "sphere":
      return <sphereGeometry args={[1, 48, 48]} />;
    case "box":
      return <boxGeometry args={[1.4, 1.4, 1.4]} />;
    case "torus":
      return <torusGeometry args={[0.8, 0.3, 24, 80]} />;
    case "octahedron":
      return <octahedronGeometry args={[1.2, 0]} />;
    case "cone":
      return <coneGeometry args={[0.9, 1.6, 32]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.7, 0.7, 1.6, 32]} />;
    case "dodecahedron":
      return <dodecahedronGeometry args={[1.1, 0]} />;
    case "tetrahedron":
      return <tetrahedronGeometry args={[1.3, 0]} />;
  }
}
