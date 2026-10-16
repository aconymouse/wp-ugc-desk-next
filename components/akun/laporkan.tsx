"use client";

import { useEffect, useState } from "react";
import { DialogKaca } from "@/components/akun/dialog-kaca";
import { useAkun } from "@/components/akun/use-akun";
import {
  LAPORAN_KATA_MAKS,
  LAPORAN_KATA_MIN,
  bacaDraf,
  hapusDraf,
  hitungKata,
  laporanValid,
  simpanDraf,
  sudahLapor,
  tandaiSudahLapor,
  tandaiTetapDiSini,
} from "@/lib/akun/laporan";
import { bukaMasuk } from "@/lib/akun/toko";
import { NAMA_REDAKSI, SITE_NAME } from "@/lib/situs";

function BenderaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M4 22V4" />
      <path d="M4 4h12l-2 4 2 4H4" />
    </svg>
  );
}

export default function Laporkan({ postId, judul }: { postId: number; judul: string }) {
  const akun = useAkun();
  const [buka, setBuka] = useState(false);
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [selesai, setSelesai] = useState(false);
  const [salah, setSalah] = useState<string | null>(null);
  const [petunjuk, setPetunjuk] = useState<string | null>(null);

  useEffect(() => {
    if (!petunjuk) return;
    const id = window.setTimeout(() => setPetunjuk(null), 3200);
    return () => window.clearTimeout(id);
  }, [petunjuk]);

  useEffect(() => {
    if (akun.status !== "masuk") return;
    const draf = bacaDraf(postId);
    if (!draf) return;
    const id = requestAnimationFrame(() => {
      setPesan(draf);
      setBuka(true);
    });
    return () => cancelAnimationFrame(id);
  }, [akun.status, postId]);

  const bukaDialog = () => {
    if (akun.status === "masuk" && sudahLapor(postId)) {
      setPetunjuk(`Laporanmu segera dibaca ${NAMA_REDAKSI.toLowerCase()}.`);
      return;
    }
    setSalah(null);
    setSelesai(false);
    setPesan((p) => p || bacaDraf(postId));
    setBuka(true);
  };

  const tutup = () => {
    setBuka(false);
    if (!selesai) simpanDraf(postId, pesan);
  };

  const kirim = async () => {
    setSalah(null);
    if (!laporanValid(pesan)) {
      setSalah(`Tulis ${LAPORAN_KATA_MIN} sampai ${LAPORAN_KATA_MAKS} kata.`);
      return;
    }
    if (akun.status !== "masuk") {
      simpanDraf(postId, pesan);
      tandaiTetapDiSini();
      setBuka(false);
      bukaMasuk();
      return;
    }
    setSibuk(true);
    try {
      const res = await fetch("/api/akun/laporan/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId, pesan: pesan.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { pesan?: string };
      if (res.status === 401) {
        simpanDraf(postId, pesan);
        tandaiTetapDiSini();
        setBuka(false);
        bukaMasuk();
        return;
      }
      if (res.status === 409) {
        tandaiSudahLapor(postId);
        hapusDraf(postId);
        setBuka(false);
        setPesan("");
        setPetunjuk(`Laporanmu segera dibaca ${NAMA_REDAKSI.toLowerCase()}.`);
        return;
      }
      if (!res.ok) {
        setSalah(data.pesan ?? "Laporan gagal dikirim.");
        return;
      }
      hapusDraf(postId);
      tandaiSudahLapor(postId);
      setSelesai(true);
      setPesan("");
    } catch {
      setSalah("Jaringan bermasalah. Coba lagi.");
    } finally {
      setSibuk(false);
    }
  };

  const kata = hitungKata(pesan);
  const warnaKata =
    kata === 0
      ? "text-neutral-500"
      : kata < LAPORAN_KATA_MIN || kata > LAPORAN_KATA_MAKS
        ? "text-red-700 dark:text-red-400"
        : "text-green-700 dark:text-green-500";

  return (
    <>
      <span className="relative inline-flex shrink-0">
        <button
          type="button"
          onClick={bukaDialog}
          aria-describedby={petunjuk ? "laporan-petunjuk" : undefined}
          className="inline-flex items-center gap-1.5 font-sans text-[13px] leading-none text-neutral-600 underline decoration-neutral-400 decoration-dotted underline-offset-4 transition-colors hover:text-ink hover:decoration-solid dark:text-neutral-400 dark:decoration-neutral-500 dark:hover:text-paper"
        >
          <BenderaIcon className="size-3" />
          Laporkan
        </button>
        {petunjuk && (
          <span
            id="laporan-petunjuk"
            role="status"
            className="absolute top-full right-0 z-30 mt-2 w-max max-w-[240px] rounded-lg bg-ink px-3 py-2 text-[12px] leading-snug text-paper shadow-lg dark:bg-paper dark:text-ink"
          >
            <span aria-hidden className="absolute -top-1 right-4 h-2 w-2 rotate-45 bg-ink dark:bg-paper" />
            {petunjuk}
          </span>
        )}
      </span>

      {buka && (
        <DialogKaca label="Laporkan artikel" onTutup={tutup}>
          {selesai ? (
            <>
              <h2 className="mt-1 font-serif text-[26px] leading-tight font-bold">Laporan terkirim</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                Makasih sudah ikut jaga {SITE_NAME}. Redaksi bakal baca laporanmu.
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
              <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Laporkan</p>
              <h2 className="mt-1 line-clamp-2 font-serif text-[22px] leading-snug font-bold">{judul}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                Ada yang keliru, menyesatkan, atau gak pantas? Ceritakan singkat bagian mana dan kenapa.
              </p>
              <div className="mt-5 flex items-baseline justify-between">
                <label htmlFor="laporan-pesan" className="text-[12px] font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
                  Pesan
                </label>
                <span className={`text-[12px] ${warnaKata}`}>
                  {kata} kata · {LAPORAN_KATA_MIN}–{LAPORAN_KATA_MAKS}
                </span>
              </div>
              <textarea
                id="laporan-pesan"
                value={pesan}
                onChange={(e) => setPesan(e.target.value)}
                rows={5}
                placeholder="Isi pesan…"
                className="mt-1.5 w-full resize-y rounded-xl border border-neutral-300/80 bg-paper/70 px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-ink dark:border-neutral-700 dark:bg-night/60 dark:text-paper dark:focus:border-paper"
                data-fokus-awal
              />
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
                {sibuk ? "Mengirim…" : akun.status === "masuk" ? "Kirim laporan" : "Lanjut dan masuk"}
              </button>
              {akun.status !== "masuk" && (
                <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
                  Laporan butuh akun supaya redaksi bisa menindaklanjuti. Pesanmu disimpan dulu, setelah
                  masuk tinggal kirim.
                </p>
              )}
            </form>
          )}
        </DialogKaca>
      )}
    </>
  );
}
