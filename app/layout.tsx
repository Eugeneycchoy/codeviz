import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CodeViz",
  description: "Drop a repo, understand it instantly — interactive dependency graphs with AI-powered explanations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fafafa] text-[#1a1a1a] font-sans selection:bg-blue-100">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
