"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AvatarAkun } from "@/components/akun/avatar-akun";
import { namaDepan, useAkun } from "@/components/akun/use-akun";
import { ChevronDownIcon, LoginIcon } from "@/components/icons";
import { bukaMasuk, keluar } from "@/lib/akun/toko";

export function TombolAkun() {
  const akun = useAkun();
  const [buka, setBuka] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buka) return;
    const onTekan = (e: PointerEvent) => {
      if (!wadah.current?.contains(e.target as Node)) setBuka(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    document.addEventListener("pointerdown", onTekan);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onTekan);
      window.removeEventListener("keydown", onKey);
    };
  }, [buka]);

  if (akun.status === "memuat") {
    return <span aria-hidden className="h-[22px] w-[72px] shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800" />;
  }

  if (akun.status === "tamu" || !akun.user) {
    return (
      <button
        type="button"
        onClick={() => bukaMasuk()}
        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-ink px-3 text-xs leading-none font-semibold text-ink transition-colors hover:bg-ink hover:text-paper dark:border-paper dark:text-paper dark:hover:bg-paper dark:hover:text-ink"
      >
        <LoginIcon className="h-3.5 w-3.5" />
        Masuk
      </button>
    );
  }

  const { user } = akun;

  return (
    <div ref={wadah} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setBuka((b) => !b)}
        aria-haspopup="menu"
        aria-expanded={buka}
        className="inline-flex h-7 items-center gap-1.5 rounded-full pr-1 pl-0.5 text-xs leading-none font-semibold text-ink transition-colors hover:bg-neutral-100 dark:text-paper dark:hover:bg-neutral-900"
      >
        <AvatarAkun nama={user.name} src={user.image} ukuran={22} />
        <span className="max-w-24 truncate">{namaDepan(user.name) || "Akun"}</span>
        <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${buka ? "rotate-180" : ""}`} />
      </button>
      {buka && (
        <div
          role="menu"
          className="absolute top-full right-0 z-40 mt-2 w-56 border border-neutral-200 bg-paper py-1.5 text-[13px] shadow-lg dark:border-neutral-800 dark:bg-night"
        >
          <div className="px-4 py-2">
            <p className="truncate font-semibold text-ink dark:text-paper">{user.name}</p>
            <p className="truncate text-xs text-neutral-500">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          {user.peran !== "kontributor" && user.peran !== "reporter" && user.peran !== "penulis" ? (
            <Link
              href="/akun/"
              role="menuitem"
              onClick={() => setBuka(false)}
              className="block px-4 py-2 font-medium text-ink hover:bg-neutral-100 dark:text-paper dark:hover:bg-neutral-900"
            >
              Akun saya
            </Link>
          ) : user.peran !== "kontributor" || user.profilLengkap ? (
            <>
              <Link
                href="/akun/"
                role="menuitem"
                onClick={() => setBuka(false)}
                className="block px-4 py-2 font-medium text-ink hover:bg-neutral-100 dark:text-paper dark:hover:bg-neutral-900"
              >
                Tulisanmu
              </Link>
              <Link
                href="/akun/tulis/"
                role="menuitem"
                onClick={() => setBuka(false)}
                className="block px-4 py-2 font-medium text-ink hover:bg-neutral-100 dark:text-paper dark:hover:bg-neutral-900"
              >
                Kirim tulisan
              </Link>
              {user.peran === "kontributor" && (
                <Link
                  href="/akun/pengaturan/"
                  role="menuitem"
                  onClick={() => setBuka(false)}
                  className="block px-4 py-2 font-medium text-ink hover:bg-neutral-100 dark:text-paper dark:hover:bg-neutral-900"
                >
                  Pengaturan
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/akun/"
              role="menuitem"
              onClick={() => setBuka(false)}
              className="block px-4 py-2 font-medium text-ink hover:bg-neutral-100 dark:text-paper dark:hover:bg-neutral-900"
            >
              Akun saya
              <span className="mt-0.5 block text-xs font-normal text-neutral-500">Profil belum lengkap</span>
            </Link>
          )}
          <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setBuka(false);
              void keluar();
            }}
            className="block w-full px-4 py-2 text-left font-medium text-ink hover:bg-neutral-100 dark:text-paper dark:hover:bg-neutral-900"
          >
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}

export function TombolAkunLaci({ onTutup }: { onTutup: () => void }) {
  const akun = useAkun();

  if (akun.status !== "masuk" || !akun.user) {
    return (
      <button
        type="button"
        onClick={() => {
          onTutup();
          bukaMasuk();
        }}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-ink font-serif text-[15px] font-bold text-ink dark:border-paper dark:text-paper"
      >
        <LoginIcon className="h-4 w-4" />
        {akun.status === "memuat" ? "Memeriksa sesi…" : "Masuk atau daftar"}
      </button>
    );
  }

  const { user } = akun;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800">
      <AvatarAkun nama={user.name} src={user.image} ukuran={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[15px] leading-tight font-bold">{user.name}</p>
        <Link
          href="/akun/"
          onClick={onTutup}
          className="text-[13px] text-neutral-600 underline decoration-dotted underline-offset-4 dark:text-neutral-400"
        >
          Akun saya
        </Link>
      </div>
      <button
        type="button"
        onClick={() => {
          onTutup();
          void keluar();
        }}
        className="shrink-0 text-[13px] font-semibold text-neutral-600 hover:text-ink dark:text-neutral-400 dark:hover:text-paper"
      >
        Keluar
      </button>
    </div>
  );
}
