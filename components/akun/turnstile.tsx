"use client";

import { useEffect, useRef } from "react";

const SKRIP = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opsi: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "flexible" | "compact";
      appearance?: "always" | "execute" | "interaction-only";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let memuat: Promise<void> | null = null;

function muatSkrip(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (memuat) return memuat;
  memuat = new Promise((selesai) => {
    const s = document.createElement("script");
    s.src = SKRIP;
    s.async = true;
    s.onload = () => selesai();
    s.onerror = () => selesai();
    document.head.appendChild(s);
  });
  return memuat;
}

export function Turnstile({
  siteKey,
  onToken,
  className = "",
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  className?: string;
}) {
  const wadah = useRef<HTMLDivElement>(null);
  const kirim = useRef(onToken);

  useEffect(() => {
    kirim.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!siteKey || !wadah.current) return;
    let id: string | null = null;
    let batal = false;
    const el = wadah.current;
    muatSkrip().then(() => {
      if (batal || !window.turnstile) return;
      id = window.turnstile.render(el, {
        sitekey: siteKey,
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
        size: "flexible",
        appearance: "interaction-only",
        callback: (token) => kirim.current(token),
        "expired-callback": () => kirim.current(null),
        "error-callback": () => kirim.current(null),
      });
    });
    return () => {
      batal = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={wadah} className={className} />;
}
