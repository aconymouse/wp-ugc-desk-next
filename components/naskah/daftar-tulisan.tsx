import Link from "next/link";
import { MintaPerubahan } from "@/components/naskah/minta-perubahan";
import { TombolHapusDraf } from "@/components/naskah/tombol-hapus-draf";
import { daftarNaskahCms, type NaskahCms } from "@/lib/akun/cms";
import { WP_OFF } from "@/lib/akun/env";
import type { Sesi } from "@/lib/akun/sesi";
import { daftarNaskah } from "@/lib/naskah/simpan";

type Status = "draf" | "review" | "revisi" | "terbit" | "ditolak";

interface Baris {
  kunci: string;
  judul: string;
  status: Status;
  waktu: Date;
  href: string | null;
  link: string | null;
  alasan: string | null;
  hapusId: string | null;
  wpId: number | null;
  perubahan: boolean;
}

const LABEL: Record<Status, string> = {
  draf: "Draf",
  review: "Menunggu review",
  revisi: "Perlu revisi",
  terbit: "Terbit",
  ditolak: "Ditolak",
};

const WARNA: Record<Status, string> = {
  draf: "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400",
  review: "border-amber-300 text-amber-800 dark:border-amber-700 dark:text-amber-400",
  revisi: "border-sky-300 text-sky-800 dark:border-sky-700 dark:text-sky-400",
  terbit: "border-green-300 text-green-800 dark:border-green-700 dark:text-green-400",
  ditolak: "border-red-300 text-red-800 dark:border-red-700 dark:text-red-400",
};

function statusCms(n: NaskahCms): Status | null {
  if (n.status === "publish") return "terbit";
  if (n.status === "pending") return "review";
  if (n.status === "ditolak") return "ditolak";
  if (n.status === "draft" && n.keputusan === "revisi") return "revisi";
  return null;
}

function waktuAman(nilai: unknown): Date {
  const d = new Date(typeof nilai === "string" || typeof nilai === "number" || nilai instanceof Date ? nilai : NaN);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function Pemisah() {
  return (
    <span aria-hidden className="text-neutral-300 dark:text-neutral-700">
      |
    </span>
  );
}

function tanggal(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(d);
}

export async function DaftarTulisan({ sesi }: { sesi: Sesi }) {
  const lokal = await daftarNaskah(sesi.user.id);
  let cms: NaskahCms[] = [];
  if (sesi.wpUserId) {
    try {
      cms = await daftarNaskahCms(sesi.wpUserId);
    } catch {}
  }

  const baris: Baris[] = [];
  const wpTerpakai = new Set<number>();
  const dariCms = new Map(cms.map((n) => [n.id, n]));

  for (const n of lokal) {
    if (n.status === "dikirim" && !WP_OFF) continue;
    const asal = n.wpPostId ? dariCms.get(n.wpPostId) : undefined;
    if (n.status === "revisi" && asal && statusCms(asal) !== "revisi") continue;
    if (n.wpPostId) wpTerpakai.add(n.wpPostId);
    baris.push({
      kunci: `lokal-${n.id}`,
      judul: n.judul.trim() || asal?.judul || "Tanpa judul",
      status: n.status === "revisi" ? "revisi" : n.status === "dikirim" ? "review" : "draf",
      waktu: waktuAman(n.diubah),
      href: n.status === "dikirim" ? null : `/akun/tulis/${n.id}/`,
      link: null,
      alasan: n.status === "revisi" ? (asal?.alasan ?? null) : null,
      hapusId: n.status === "draf" ? n.id : null,
      wpId: null,
      perubahan: false,
    });
  }

  for (const n of cms) {
    if (wpTerpakai.has(n.id)) continue;
    const status = statusCms(n);
    if (!status) continue;
    baris.push({
      kunci: `cms-${n.id}`,
      judul: n.judul || "Tanpa judul",
      status,
      waktu: waktuAman(n.tanggal),
      href: status === "revisi" ? `/akun/tulis/wp-${n.id}/` : null,
      link: status === "terbit" ? n.link : null,
      alasan: n.alasan,
      hapusId: null,
      wpId: n.id,
      perubahan: n.perubahan === true,
    });
  }

  baris.sort((a, b) => b.waktu.getTime() - a.waktu.getTime());

  if (!baris.length) {
    return (
      <div className="mt-8 border border-dashed border-neutral-200 px-6 py-10 text-center dark:border-neutral-800">
        <p className="font-serif text-[20px] leading-tight font-bold">Belum ada tulisan</p>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Draf tersimpan otomatis, jadi gak harus selesai sekali duduk. Begitu dikirim, statusnya muncul di sini.
        </p>
        <Link
          href="/akun/tulis/"
          className="mt-5 inline-flex h-10 items-center rounded-full bg-ink px-5 text-[13px] font-semibold text-paper hover:bg-neutral-800 dark:bg-paper dark:text-ink dark:hover:bg-neutral-200"
        >
          Tulis naskah pertama
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-neutral-200 dark:divide-neutral-800">
      {baris.map((b) => (
        <li key={b.kunci} className="py-4">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1">
              <p className="font-serif text-[18px] leading-snug font-bold">
                {b.link ? (
                  <a href={b.link} className="hover:underline hover:underline-offset-4">
                    {b.judul}
                  </a>
                ) : b.href ? (
                  <Link href={b.href} className="hover:underline hover:underline-offset-4">
                    {b.judul}
                  </Link>
                ) : (
                  b.judul
                )}
              </p>
              <p className="mt-1 text-[12px] text-neutral-500">{tanggal(b.waktu)}</p>
              {b.alasan && (b.status === "ditolak" || b.status === "revisi") && (
                <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-line text-neutral-600 dark:text-neutral-400">
                  <span className="font-semibold text-ink dark:text-paper">Catatan redaksi: </span>
                  {b.alasan}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${WARNA[b.status]}`}>
                {LABEL[b.status]}
              </span>
              {(b.href || b.hapusId || (b.status === "terbit" && b.wpId)) && (
                <span className="flex items-center gap-2 text-[13px]">
                  {b.href && (
                    <Link href={b.href} className="text-[13px] font-medium text-ink hover:underline hover:underline-offset-4 dark:text-paper">
                      {b.status === "revisi" ? "Perbaiki" : "Lanjutkan"}
                    </Link>
                  )}
                  {b.href && b.hapusId && <Pemisah />}
                  {b.hapusId && <TombolHapusDraf id={b.hapusId} />}
                  {b.status === "terbit" && b.wpId && <MintaPerubahan postId={b.wpId} judul={b.judul} menunggu={b.perubahan} />}
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
