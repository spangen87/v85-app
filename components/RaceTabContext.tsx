"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface RaceTabContextValue {
  activeRaceNumber: number;
  setActiveRaceNumber: (n: number) => void;
}

export const RaceTabContext = createContext<RaceTabContextValue | null>(null);

export function useRaceTab(): RaceTabContextValue {
  const ctx = useContext(RaceTabContext);
  if (!ctx) throw new Error("useRaceTab must be used inside RaceTabContext.Provider");
  return ctx;
}

export function RaceTabProvider({
  initialRaceNumber,
  children,
}: {
  initialRaceNumber: number;
  children: ReactNode;
}) {
  const [activeRaceNumber, setActiveRaceNumber] = useState(initialRaceNumber);
  return (
    <RaceTabContext.Provider value={{ activeRaceNumber, setActiveRaceNumber }}>
      {children}
    </RaceTabContext.Provider>
  );
}
