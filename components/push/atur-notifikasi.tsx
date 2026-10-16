"use client";

import { useEffect, useState } from "react";
import { KUNCI_PUBLIK, SW_PATH } from "@/lib/push/env";
import { SITE_NAME } from "@/lib/situs";

export interface KategoriPush {
  id: number;
  nama: string;
}

type Keadaan = "memuat" | "tak-didukung" | "ios" | "ditolak" | "mati" | "nyala";
type Simpan = "diam" | "menyimpan" | "tersimpan" | "gagal";

class GagalSimpan extends Error {}

function keBytes(b64: string): Uint8Array<ArrayBuffer> {
  const isi = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const mentah = atob(isi);
  const hasil = new Uint8Array(new ArrayBuffer(mentah.length));
  for (let i = 0; i < mentah.length; i++) hasil[i] = mentah.charCodeAt(i);
  return hasil;
}

function perangkatApple(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function modeAplikasi(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

async function langgananSekarang(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function kirimJson(url: string, method: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { semua?: boolean; kategori?: number[]; pesan?: string };
  return { ok: res.ok, data };
}

async function cekAwal(): Promise<{ keadaan: Keadaan; kategori?: number[] }> {
  const didukung = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!didukung) return { keadaan: perangkatApple() && !modeAplikasi() ? "ios" : "tak-didukung" };
  if (Notification.permission === "denied") return { keadaan: "ditolak" };
  const sub = Notification.permission === "granted" ? await langgananSekarang() : null;
  if (!sub) return { keadaan: "mati" };
  const hasil = await kirimJson("/api/push/pilihan/", "POST", { endpoint: sub.endpoint });
  if (!hasil.ok) return { keadaan: "mati" };
  return { keadaan: "nyala", kategori: hasil.data.semua ? [] : (hasil.data.kategori ?? []) };
}

function kunci(daftar: number[]): string {
  return [...daftar].sort((a, b) => a - b).join(",");
}

async function kirimPilihan(sub: PushSubscription, kategori: number[]) {
  const hasil = await kirimJson("/api/push/langganan/", "POST", {
    langganan: sub.toJSON(),
    semua: kategori.length === 0,
    kategori,
  });
  if (!hasil.ok) throw new GagalSimpan(hasil.data.pesan ?? "Pilihan gagal disimpan. Coba lagi.");
}

const KETERANGAN: Partial<Record<Keadaan, string>> = {
  ditolak:
    "Diblokir. Buka izin situs lewat ikon di samping alamat, ubah Notifikasi jadi Izinkan, lalu muat ulang halaman ini.",
  "tak-didukung": "Browser ini belum bisa menerima notifikasi. Coba Chrome, Edge, Firefox, atau Safari terbaru.",
};

function Centang({ aktif }: { aktif: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink dark:peer-focus-visible:outline-paper ${
        aktif
          ? "border-ink bg-lime dark:border-lime"
          : "border-neutral-400 bg-paper group-hover:border-ink dark:border-neutral-600 dark:bg-transparent dark:group-hover:border-paper"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-ink">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          pathLength={1}
          strokeDasharray={1}
          className={`transition-[stroke-dashoffset] duration-200 ease-out motion-reduce:transition-none ${
            aktif ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:1]"
          }`}
        />
      </svg>
    </span>
  );
}

function PasangDiIphone() {
  const [buka, setBuka] = useState(false);
  return (
    <div className="mt-5">
      <button
        type="button"
        aria-expanded={buka}
        aria-controls="pasang-iphone"
        onClick={() => setBuka((b) => !b)}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-semibold text-paper transition-colors hover:bg-neutral-800 dark:bg-paper dark:text-ink dark:hover:bg-neutral-200"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-4 w-4">
          <path d="M12 3v12" />
          <path d="M8 7l4-4 4 4" />
          <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
        </svg>
        Tambahkan ke Layar Utama
      </button>
      <p className="mt-2 text-[13px] leading-5 text-neutral-500">Biar bisa dapat notifikasi dari {SITE_NAME}.</p>
      {buka && (
        <ol
          id="pasang-iphone"
          className="mt-4 grid list-decimal gap-1.5 pl-5 text-[14px] leading-6 text-neutral-700 marker:text-neutral-400 dark:text-neutral-300"
        >
          <li>Ketuk tombol Bagikan di Safari. Kalau gak kelihatan, buka dulu menu ⋯.</li>
          <li>Pilih Tambahkan ke Layar Utama.</li>
          <li>Buka {SITE_NAME} dari ikon barunya, lalu ketuk lonceng.</li>
        </ol>
      )}
    </div>
  );
}

function BarisKategori({ nama, aktif, onUbah }: { nama: string; aktif: boolean; onUbah: () => void }) {
  return (
    <li>
      <label className="group flex cursor-pointer items-center justify-between gap-4 border-b border-neutral-200 py-2.5 dark:border-neutral-800">
        <span className="font-serif text-[16px] leading-6">{nama}</span>
        <input type="checkbox" className="peer sr-only" checked={aktif} onChange={onUbah} />
        <Centang aktif={aktif} />
      </label>
    </li>
  );
}

export function AturNotifikasi({ kategori }: { kategori: KategoriPush[] }) {
  const [keadaan, setKeadaan] = useState<Keadaan>("memuat");
  const [dipilih, setDipilih] = useState<number[]>([]);
  const [tersimpan, setTersimpan] = useState("");
  const [simpan, setSimpan] = useState<Simpan>("diam");
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    let aktif = true;
    cekAwal()
      .then((hasil) => {
        if (!aktif) return;
        setKeadaan(hasil.keadaan);
        if (hasil.kategori) {
          setDipilih(hasil.kategori);
          setTersimpan(kunci(hasil.kategori));
        }
      })
      .catch(() => {
        if (aktif) setKeadaan("mati");
      });
    return () => {
      aktif = false;
    };
  }, []);

  useEffect(() => {
    if (keadaan !== "nyala" || kunci(dipilih) === tersimpan) return;
    const jeda = window.setTimeout(async () => {
      const pilihan = dipilih;
      setSimpan("menyimpan");
      try {
        const sub = await langgananSekarang();
        if (!sub) {
          setKeadaan("mati");
          setSimpan("diam");
          return;
        }
        await kirimPilihan(sub, pilihan);
        setTersimpan(kunci(pilihan));
        setSimpan("tersimpan");
      } catch {
        setSimpan("gagal");
      }
    }, 700);
    return () => window.clearTimeout(jeda);
  }, [dipilih, keadaan, tersimpan]);

  const nyalakan = async () => {
    const izin = await Notification.requestPermission();
    if (izin !== "granted") {
      setKeadaan(izin === "denied" ? "ditolak" : "mati");
      return;
    }
    await navigator.serviceWorker.register(SW_PATH, { scope: "/", updateViaCache: "none" });
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keBytes(KUNCI_PUBLIK) }));
    await kirimPilihan(sub, dipilih);
    setTersimpan(kunci(dipilih));
    setKeadaan("nyala");
  };

  const matikan = async () => {
    const sub = await langgananSekarang();
    if (sub) {
      await kirimJson("/api/push/langganan/", "DELETE", { endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    setTersimpan("");
    setSimpan("diam");
    setKeadaan("mati");
  };

  const alihkan = async () => {
    setSibuk(true);
    setGalat("");
    try {
      if (keadaan === "nyala") await matikan();
      else await nyalakan();
    } catch (e) {
      setGalat(e instanceof GagalSimpan ? e.message : "Notifikasi gagal dinyalakan. Coba lagi sebentar.");
    } finally {
      setSibuk(false);
    }
  };

  const tandai = (id: number) => {
    setSimpan("diam");
    setDipilih((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  };

  const nyala = keadaan === "nyala";
  const bisaDiatur = keadaan === "mati" || keadaan === "nyala";
  const statusSimpan =
    simpan === "menyimpan"
      ? "Menyimpan…"
      : simpan === "tersimpan"
        ? "Tersimpan"
        : simpan === "gagal"
          ? "Gagal menyimpan"
          : "";

  return (
    <div>
      <div className="flex items-center justify-between gap-6">
        <h1 className="font-serif text-[clamp(32px,6vw,48px)] leading-[1.05] font-bold text-ink dark:text-paper">
          Notifikasi
        </h1>
        {keadaan !== "ios" && (
          <button
            type="button"
            role="switch"
            aria-checked={nyala}
            aria-label="Langganan notifikasi"
            disabled={!bisaDiatur || sibuk}
            onClick={alihkan}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
              nyala ? "bg-ink dark:bg-lime" : "bg-neutral-300 dark:bg-neutral-700"
            }`}
          >
            <span
              aria-hidden
              className={`absolute top-1 left-1 h-5 w-5 rounded-full transition-transform duration-200 motion-reduce:transition-none ${
                nyala ? "translate-x-5 bg-lime dark:bg-ink" : "translate-x-0 bg-paper"
              }`}
            />
          </button>
        )}
      </div>

      {KETERANGAN[keadaan] && (
        <p className="mt-3 max-w-[52ch] text-[13px] leading-5 text-neutral-600 dark:text-neutral-400">
          {KETERANGAN[keadaan]}
        </p>
      )}
      {keadaan === "ios" && <PasangDiIphone />}
      {galat && <p className="mt-3 text-[13px] leading-5 text-red-700 dark:text-red-400">{galat}</p>}
      {keadaan === "ditolak" && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 text-[13px] font-semibold underline underline-offset-4"
        >
          Muat ulang
        </button>
      )}

      {bisaDiatur && kategori.length > 0 && (
        <section aria-labelledby="push-kategori" className="mt-8 border-t-2 border-ink pt-5 dark:border-paper">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="push-kategori" className="font-serif text-[20px] leading-7 font-bold">
              Kategori
            </h2>
            <p role="status" className="text-[12px] text-neutral-500">
              {statusSimpan}
            </p>
          </div>
          <ul className="mt-2 border-t border-neutral-200 dark:border-neutral-800">
            <BarisKategori
              nama="Semua kategori"
              aktif={dipilih.length === 0}
              onUbah={() => {
                setSimpan("diam");
                setDipilih([]);
              }}
            />
            {kategori.map((k) => (
              <BarisKategori key={k.id} nama={k.nama} aktif={dipilih.includes(k.id)} onUbah={() => tandai(k.id)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
