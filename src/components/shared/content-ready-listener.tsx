"use client";

import { useEffect, useRef } from "react";
import { useLoading } from "@/context/loading-context";

export function ContentReadyListener() {
  const { isLoading, setIsContentReady, isContentReady } = useLoading();
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    if (!isLoading && !isContentReady) {
      setIsContentReady(true);
    }
  }, [isLoading, isContentReady, setIsContentReady]);

  useEffect(() => {
    const handleDOMContentLoaded = () => {
      if (isLoading) {
        setIsContentReady(true);
      }
    };

    if (document.readyState === "complete") {
      if (isLoading) {
        setIsContentReady(true);
      }
    } else {
      window.addEventListener("load", handleDOMContentLoaded);
      return () => window.removeEventListener("load", handleDOMContentLoaded);
    }
  }, [isLoading, setIsContentReady]);

  return null;
}