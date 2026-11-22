import type { Metadata } from "next";
import "@/app/globals.css";
import { Providers } from "@/components/providers";
export const metadata: Metadata = {
  title: { default: "ContextOps AI — AI Cost & Quality Analyzer", template: "%s | ContextOps AI" },
  description: "Measure and optimize the cost of existing AI workflows, without sacrificing quality.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="min-h-screen font-sans"><Providers>{children}</Providers></body></html>;
}
