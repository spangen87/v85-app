"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Gemensam stack för blad och detaljvy: Esc stänger bara det översta lagret,
 * sidan bakom är låst så länge något lager är öppet, och fokus flyttas in i
 * lagret och tillbaka när det stängs. onClose läses via en ref så att en ny
 * funktion vid varje rendering inte flyttar fokus (fält i bladet behåller det).
 */
const stack: { close: () => void }[] = [];
let lockCount = 0;
let savedOverflow = "";

function onKey(e: KeyboardEvent) {
  if (e.key !== "Escape" || stack.length === 0) return;
  e.stopPropagation();
  stack[stack.length - 1].close();
}

export function useModalLayer(open: boolean, onClose: () => void, panelRef: RefObject<HTMLElement | null>) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const entry = { close: () => closeRef.current() };
    stack.push(entry);
    if (stack.length === 1) window.addEventListener("keydown", onKey);
    if (lockCount++ === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0) window.removeEventListener("keydown", onKey);
      if (--lockCount === 0) document.body.style.overflow = savedOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open, panelRef]);
}
