"use client";

import Link from "next/link";
import { useLoading } from "@/context/loading-context";
import { useCallback, MouseEvent } from "react";

interface SmartLinkProps extends React.ComponentProps<typeof Link> {
  shimmer?: boolean;
}

export function SmartLink({ href, onClick, children, shimmer, className, ...props }: SmartLinkProps) {
  const { setIsLoading, setIsContentReady } = useLoading();

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      const target = e.currentTarget;
      const targetAttr = target.getAttribute("target");

      if (
        targetAttr === "_blank" ||
        (typeof href === "string" &&
          (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")))
      ) {
        return;
      }

      onClick?.(e);
      if (e.defaultPrevented) return;

      // Show loader immediately, then let next/link handle client-side navigation.
      // RouteChangeListener will dismiss the loader after the new page renders.
      setIsLoading(true);
      setIsContentReady(false);
    },
    [href, onClick, setIsLoading, setIsContentReady]
  );

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={className}
      data-shimmer-link="true"
      {...props}
    >
      {children}
    </Link>
  );
}
