"use client";

import { useEffect, useState } from "react";
import { DialogKaca } from "@/components/akun/dialog-kaca";
import { Turnstile } from "@/components/akun/turnstile";
import { PERUBAHAN_MAKS, PERUBAHAN_MIN } from "@/lib/naskah/perubahan";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function MintaPerubahan({ postId, judul, menunggu }: { postId: number; judul: string; menunggu: boolean }) {
  const [buka, setBuka] = useState(false);
  const [pesan, setPesan] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [selesai, setSelesai] = useState(menunggu);
  const [salah, setSalah] = useState<string | null>(null);
  const [petunjuk, setPetunjuk] = useState<string | null>(null);

  useEffect(() => {
    if (!petunjuk) return;
    const id = window.setTimeout(() => setPetunjuk(null), 3200);
    return () => window.clearTimeout(id);
  }, [petunjuk]);

  const bukaDialog = () => {
    if (selesai) {
      setPetunjuk("Permintaanmu sedang ditangani redaksi.");
      return;
    }
    setSalah(null);
    setBuka(true);
  };

  const kirim = async () => {
    setSalah(null);
    const isi = pesan.trim();
    if (isi.length < PERUBAHAN_MIN || isi.length > PERUBAHAN_MAKS) {
      setSalah(`Tulis ${PERUBAHAN_MIN} sampai ${PERUBAHAN_MAKS} karakter.`);
      return;
    }
    if (SITE_KEY && !token) {
      setSalah("Tunggu verifikasi sebentar, lalu coba lagi.");
      return;
    }
    setSibuk(true);
    try {
      const res = await fetch("/api/akun/perubahan/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId, pesan: isi, token }),
      });
      const data = (await res.json().catch(() => ({}))) as { pesan?: string };
      if (res.status === 409) {
        setSelesai(true);
        setBuka(false);
        setPetunjuk("Permintaanmu sedang ditangani redaksi.");
        return;
      }
      if (!res.ok) {
        setSalah(data.pesan ?? "Permintaan gagal dikirim.");
        setToken(null);
        return;
      }
      setSelesai(true);
      setPesan("");
    } catch {
      setSalah("Jaringan bermasalah. Coba lagi.");
    } finally {
      setSibuk(false);
    }
  };

  const panjang = pesan.trim().length;
  const warna =
    panjang === 0
      ? "text-neutral-500"
      : panjang < PERUBAHAN_MIN || panjang > PERUBAHAN_MAKS
        ? "text-red-700 dark:text-red-400"
        : "text-green-700 dark:text-green-500";

  return (
    <>
      <span className="relative inline-flex shrink-0">
        <button
          type="button"
          onClick={bukaDialog}
          aria-describedby={petunjuk ? `perubahan-petunjuk-${postId}` : undefined}
          className={`text-[13px] font-medium hover:underline hover:underline-offset-4 ${selesai ? "text-neutral-500" : "text-ink dark:text-paper"}`}
        >
          Minta perubahan
        </button>
        {petunjuk && (
          <span
            id={`perubahan-petunjuk-${postId}`}
            role="status"
            className="absolute top-full right-0 z-30 mt-2 w-max max-w-[240px] rounded-lg bg-ink px-3 py-2 text-[12px] leading-snug text-paper shadow-lg dark:bg-paper dark:text-ink"
          >
            <span aria-hidden className="absolute -top-1 right-4 h-2 w-2 rotate-45 bg-ink dark:bg-paper" />
            {petunjuk}
          </span>
        )}
      </span>

      {buka && (
        <DialogKaca label="Minta perubahan tulisan" onTutup={() => setBuka(false)}>
          {selesai ? (
            <>
              <h2 className="mt-1 font-serif text-[26px] leading-tight font-bold">Permintaan terkirim</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                Redaksi bakal baca dan menyesuaikan tulisannya. Tulisan tetap tayang selama itu.
              </p>
              <button
                type="button"
                onClick={() => setBuka(false)}
                className="mt-6 flex h-11 w-full items-center justify-center rounded-full bg-ink text-[14px] font-semibold text-paper hover:bg-neutral-800 dark:bg-paper dark:text-ink dark:hover:bg-neutral-200"
                data-fokus-awal
              >
                Tutup
              </button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void kirim();
              }}
              noValidate
            >
              <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Minta perubahan</p>
              <h2 className="mt-1 line-clamp-2 font-serif text-[22px] leading-snug font-bold">{judul}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                Tulisan yang sudah terbit gak bisa diedit langsung. Tulis bagian mana yang perlu diubah dan jadi apa,
                redaksi yang menyesuaikan.
              </p>
              <div className="mt-5 flex items-baseline justify-between">
                <label htmlFor="perubahan-pesan" className="text-[12px] font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
                  Pesan
                </label>
                <span className={`text-[12px] ${warna}`}>
                  {panjang} · {PERUBAHAN_MIN}–{PERUBAHAN_MAKS}
                </span>
              </div>
              <textarea
                id="perubahan-pesan"
                value={pesan}
                onChange={(e) => setPesan(e.target.value)}
                rows={5}
                placeholder="Isi pesan…"
                className="mt-1.5 w-full resize-y rounded-xl border border-neutral-300/80 bg-paper/70 px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-ink dark:border-neutral-700 dark:bg-night/60 dark:text-paper dark:focus:border-paper"
                data-fokus-awal
              />
              <Turnstile siteKey={SITE_KEY} onToken={setToken} className="mt-3 empty:hidden" />
              {salah && (
                <p role="alert" className="mt-2 text-[13px] text-red-700 dark:text-red-400">
                  {salah}
                </p>
              )}
              <button
                type="submit"
                disabled={sibuk}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-ink text-[14px] font-semibold text-paper transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-paper dark:text-ink dark:hover:bg-neutral-200"
              >
                {sibuk ? "Mengirim…" : "Kirim permintaan"}
              </button>
            </form>
          )}
        </DialogKaca>
      )}
    </>
  );
}
