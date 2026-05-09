import { Navbar } from "@/components/layout/Navbar";
import { AiGenerateClient } from "./AiGenerateClient";

export const metadata = {
  title: "AI 3D Generator",
  description:
    "Describe an asset in natural language — generate a 3D model preview instantly.",
};

export default function AiGeneratePage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <Navbar />

      {/* ambient gradient */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(124,58,237,0.25), transparent 65%), radial-gradient(ellipse 60% 60% at 80% 80%, rgba(168,85,247,0.18), transparent 70%)",
        }}
      />

      <AiGenerateClient />
    </div>
  );
}
