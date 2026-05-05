import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Preloader } from "@/components/shared/preloader";
import { LoadingProvider } from "@/context/loading-context";
import { Suspense } from "react";
import { RouteChangeListener } from "@/components/shared/route-change-listener";
import { NavigationInterceptor } from "@/components/shared/navigation-interceptor";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Material Operations Dashboard",
  description: "Educational content creation workflow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col bg-console-black">
        <LoadingProvider>
          <Preloader />
          <Suspense fallback={null}>
            <RouteChangeListener />
            <NavigationInterceptor />
          </Suspense>
          {children}
          <Toaster position="bottom-right" richColors theme="dark" />
        </LoadingProvider>
      </body>
    </html>
  );
}
