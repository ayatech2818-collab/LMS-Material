"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLoading } from "@/context/loading-context";

// Minimum time (ms) the loader stays visible after a route change.
// Gives React enough time to render the new page before hiding the loader.
const LOADER_MIN_MS = 400;

export function RouteChangeListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setIsLoading, setIsContentReady } = useLoading();

  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPath = `${pathname}?${searchParams?.toString()}`;

    // Initial mount: dismiss loader quickly after React has painted
    if (prevPathRef.current === null) {
      prevPathRef.current = currentPath;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsLoading(false);
          setIsContentReady(true);
        });
      });
      return;
    }

    // Same path — nothing to do
    if (currentPath === prevPathRef.current) return;
    prevPathRef.current = currentPath;

    // New route detected: ensure loader is visible, then dismiss after minimum time.
    // usePathname() updates when Next.js starts navigating (before the new page
    // finishes rendering), so we wait LOADER_MIN_MS to let the new tree paint.
    setIsLoading(true);
    setIsContentReady(false);

    const timer = setTimeout(() => {
      setIsLoading(false);
      setIsContentReady(true);
    }, LOADER_MIN_MS);

    // Clean up timer if the path changes again before it fires
    return () => clearTimeout(timer);
  }, [pathname, searchParams, setIsLoading, setIsContentReady]);

  return null;
}
