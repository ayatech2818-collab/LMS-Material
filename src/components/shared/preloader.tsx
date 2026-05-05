"use client";

import { useEffect } from "react";
import { useLoading } from "@/context/loading-context";

export function Preloader() {
  const { isLoading, isContentReady, setIsLoading, setIsContentReady } = useLoading();

  // Loader is visible when actively processing a route change
  const isVisible = isLoading && !isContentReady;

  // Failsafe: force-dismiss the initial load loader after 2 seconds
  // in case RouteChangeListener or other signals don't fire
  useEffect(() => {
    const failsafe = setTimeout(() => {
      setIsLoading(false);
      setIsContentReady(true);
    }, 2000);
    return () => clearTimeout(failsafe);
  }, [setIsLoading, setIsContentReady]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black ease-out"
      style={{
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "all" : "none",
        visibility: isVisible ? "visible" : "hidden",
        transitionProperty: "opacity, visibility",
        transitionDuration: "300ms, 0ms",
        transitionDelay: isVisible ? "0ms, 0ms" : "0ms, 300ms",
      }}
    >
      <div
        className="relative flex items-center justify-center transition-all duration-300 ease-out"
        style={{
          transform: isVisible ? "scale(1)" : "scale(0.9)",
        }}
      >
        {/* Outer ring */}
        <div
          className="absolute w-16 h-16 rounded-full border-[2px] border-neutral-900 border-t-neutral-500"
          style={{ animation: "spin 1.5s linear infinite" }}
        />
        {/* Inner ring: BMW M-stripe colors */}
        <div
          className="absolute w-10 h-10 rounded-full border-[2px] border-transparent"
          style={{
            borderTopColor: "var(--color-m-red)",
            borderRightColor: "var(--color-m-blue-dark)",
            borderBottomColor: "var(--color-m-blue-light)",
            animation: "spin 1s linear infinite reverse",
          }}
        />
      </div>
    </div>
  );
}
