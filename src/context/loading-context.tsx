"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isContentReady: boolean;
  setIsContentReady: (ready: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoadingState] = useState(true);
  const [isContentReady, setIsContentReadyState] = useState(false);

  const setIsLoading = useCallback((loading: boolean) => setIsLoadingState(loading), []);
  const setIsContentReady = useCallback((ready: boolean) => setIsContentReadyState(ready), []);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading, isContentReady, setIsContentReady }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}