import { Navbar } from "@/components/layout/Navbar";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <Navbar />
      {children}
    </div>
  );
}
