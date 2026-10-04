"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Gemensam stack för blad och detaljvy: Esc stänger bara det översta lagret,
 * sidan bakom är låst så länge något lager är öppet, Tab stannar i det översta
 * lagret, och fokus flyttas in i lagret och tillbaka när det stängs. onClose läses via en ref så att en ny
 * funktion vid varje rendering inte flyttar fokus (fält i bladet behåller det).
 */
const stack: { close: () => void; panel: () => HTMLElement | null }[] = [];
let lockCount = 0;
let savedOverflow = "";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Tab från sista går till första och tvärtom; fokus utanför lagret dras in. */
function trapTab(e: KeyboardEvent, panel: HTMLElement) {
  const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (items.length === 0) { e.preventDefault(); panel.focus(); return; }
  const first = items[0];
  const last = items[items.length - 1];
  const current = document.activeElement;
  const inside = current instanceof Node && panel.contains(current) && current !== panel;
  if (e.shiftKey && (!inside || current === first)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (!inside || current === last)) { e.preventDefault(); first.focus(); }
}

function onKey(e: KeyboardEvent) {
  if (stack.length === 0) return;
  const top = stack[stack.length - 1];
  if (e.key === "Escape") {
    e.stopPropagation();
    top.close();
  } else if (e.key === "Tab") {
    const panel = top.panel();
    if (panel) trapTab(e, panel);
  }
}

export function useModalLayer(open: boolean, onClose: () => void, panelRef: RefObject<HTMLElement | null>) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const entry = { close: () => closeRef.current(), panel: () => panelRef.current };
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
