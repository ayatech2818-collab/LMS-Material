"use client";

import { useEffect, useCallback } from "react";
import { useLoading } from "@/context/loading-context";

export function NavigationInterceptor() {
  const { setIsLoading, setIsContentReady } = useLoading();

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor) return;

      if (anchor.getAttribute("data-shimmer-link") === "true") return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");

      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        targetAttr === "_blank"
      ) {
        return;
      }

      // Parse both URLs relative to the current origin for a reliable comparison
      try {
        const target = new URL(href, window.location.origin);
        const current = window.location;
        if (
          target.origin !== current.origin ||
          (target.pathname === current.pathname && target.search === current.search)
        ) {
          return;
        }
      } catch {
        return;
      }

      setIsContentReady(false);
      setIsLoading(true);
    },
    [setIsLoading, setIsContentReady]
  );

  useEffect(() => {
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [handleClick]);

  return null;
}