import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";

export const metadata: Metadata = {
  title: "CodeViz",
  description: "Drop a repo, understand it instantly — interactive dependency graphs with AI-powered explanations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const faviconSvg = encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#2563eb"/><text x="16" y="22" fontFamily="system-ui,sans-serif" fontSize="18" fontWeight="bold" fill="white" textAnchor="middle">C</text></svg>'
  );

  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href={`data:image/svg+xml,${faviconSvg}`} />
      </head>
      <body className="min-h-screen bg-[#fafafa] text-[#1a1a1a] font-sans selection:bg-blue-100">
        <SessionProviderWrapper>
          <Navbar />
          <main>{children}</main>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
