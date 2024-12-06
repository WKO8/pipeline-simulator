import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { LogProvider } from "@/contexts/LogContext";
import { PipelineProvider } from "@/contexts/PipelineContext";
import { ForwardingProvider } from "@/contexts/ForwardingContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Pipeline Simulator",
  description: "Pipeline Simulator (Scaling and Superscaling)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
      <ForwardingProvider>
        <LogProvider>
          <PipelineProvider>
              {children}
          </PipelineProvider>
        </LogProvider>
      </ForwardingProvider>
      </body>
    </html>
  );
}
