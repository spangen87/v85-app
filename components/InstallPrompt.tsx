"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-install-dismissed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Redan installerad som PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Användaren har stängt prompten tidigare
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // iOS-detektion (Safari)
    const ua = navigator.userAgent;
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(ua) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;

    if (isIOSDevice) {
      setIsIOS(true);
      setVisible(true);
      return;
    }

    // Android / Chrome – lyssna på beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      dismiss();
    }
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-3 pb-2 md:hidden">
      <div className="bg-indigo-600 dark:bg-indigo-700 rounded-2xl p-3 flex items-center gap-3 shadow-xl">
        {/* App-ikon */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/apple-touch-icon.png"
          alt=""
          className="w-12 h-12 rounded-xl shrink-0 shadow"
        />

        {/* Text + knapp */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight">
            Installera V85 Analys
          </p>
          {isIOS ? (
            <p className="text-indigo-200 text-xs mt-0.5 leading-snug">
              Tryck på{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-3 h-3 inline-block align-middle"
              >
                <path d="M11.47 1.72a.75.75 0 011.06 0l3 3a.75.75 0 01-1.06 1.06l-1.72-1.72V7.5h-1.5V4.06L9.53 5.78a.75.75 0 01-1.06-1.06l3-3zM11.25 7.5V15a.75.75 0 001.5 0V7.5h3.75a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9a3 3 0 013-3h3.75z" />
              </svg>{" "}
              och välj &quot;Lägg till på hemskärmen&quot;
            </p>
          ) : (
            <>
              <p className="text-indigo-200 text-xs mt-0.5">
                Snabbare åtkomst, fungerar offline
              </p>
              <button
                onClick={handleInstall}
                className="mt-1.5 px-3 py-1 bg-white text-indigo-600 text-xs font-bold rounded-lg shadow"
              >
                Installera
              </button>
            </>
          )}
        </div>

        {/* Stäng */}
        <button
          onClick={dismiss}
          className="self-start text-indigo-200 hover:text-white transition-colors shrink-0 p-1"
          aria-label="Stäng"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
