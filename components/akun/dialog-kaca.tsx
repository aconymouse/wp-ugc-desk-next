"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/icons";
import { Kaca } from "@/components/akun/kaca";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function DialogKaca({
  label,
  onTutup,
  children,
}: {
  label: string;
  onTutup: () => void;
  children: React.ReactNode;
}) {
  const wadah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pembuka = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const padding = document.body.style.paddingRight;
    const lebarScroll = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (lebarScroll > 0) document.body.style.paddingRight = `${lebarScroll}px`;
    (
      wadah.current?.querySelector<HTMLElement>("[data-fokus-awal]") ??
      wadah.current?.querySelector<HTMLElement>(FOCUSABLE)
    )?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onTutup();
        return;
      }
      if (e.key !== "Tab" || !wadah.current) return;
      const daftar = Array.from(wadah.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!daftar.length) return;
      const pertama = daftar[0];
      const terakhir = daftar[daftar.length - 1];
      if (e.shiftKey && document.activeElement === pertama) {
        e.preventDefault();
        terakhir.focus();
      } else if (!e.shiftKey && document.activeElement === terakhir) {
        e.preventDefault();
        pertama.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = padding;
      window.removeEventListener("keydown", onKey);
      pembuka?.focus();
    };
  }, [onTutup]);

  return createPortal(
    <div className="akun-tirai" onPointerDown={(e) => e.target === e.currentTarget && onTutup()}>
      <Kaca role="dialog" aria-modal="true" aria-label={label} className="text-ink dark:text-paper">
        <div ref={wadah} className="relative px-7 pt-7 pb-6 sm:px-8">
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup"
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-ink/5 hover:text-ink dark:hover:bg-paper/10 dark:hover:text-paper"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          {children}
        </div>
      </Kaca>
    </div>,
    document.body
  );
}
