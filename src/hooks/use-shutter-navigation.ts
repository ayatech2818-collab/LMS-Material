"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { useLoading } from "@/context/loading-context";

export function useShutterNavigation() {
  const router = useNextRouter();
  const { setIsLoading, setIsContentReady } = useLoading();

  const push = (href: string) => {
    setIsContentReady(false);
    setIsLoading(true);
    router.push(href);
  };

  const replace = (href: string) => {
    setIsContentReady(false);
    setIsLoading(true);
    router.replace(href);
  };

  return {
    ...router,
    push,
    replace,
  };
}