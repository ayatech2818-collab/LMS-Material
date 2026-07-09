"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function VimeoStatusRefresher() {
  const router = useRouter();
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const controller = new AbortController();
    fetch("/api/vimeo/refresh", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.refreshed > 0) {
          router.refresh();
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [router]);

  return null;
}
