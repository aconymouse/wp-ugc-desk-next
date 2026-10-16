import { z } from "zod";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
export const BIO_MIN = 135;
export const BIO_MAX = 600;
export const NAMA_MAX = 60;
export const JABATAN_MAX = 80;

export const MEDSOS = [
  "instagram",
  "x",
  "threads",
  "tiktok",
  "linkedin",
  "youtube",
] as const;

export type Medsos = (typeof MEDSOS)[number];

export const LABEL_MEDSOS: Record<Medsos, string> = {
  instagram: "Instagram",
  x: "X",
  threads: "Threads",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

export const USERNAME_TERLARANG = new Set([
  "admin",
  "administrator",
  "redaksi",
  "editor",
  "author",
  "api",
  "akun",
  "masuk",
  "keluar",
  "daftar",
  "login",
  "logout",
  "root",
  "support",
  "bantuan",
  "info",
  "news",
  "berita",
  "tag",
  "category",
  "kategori",
  "page",
  "wp-admin",
  "writehere",
  "cari",
  "spill",
  "quiz",
  "al-quran",
  "sitemap",
  "feed",
]);

export const POLA_MEDSOS: Record<Medsos, { pola: RegExp; pesan: string }> = {
  instagram: { pola: /^[a-z0-9._]{1,30}$/i, pesan: "Username Instagram: huruf, angka, titik, garis bawah, maksimal 30." },
  x: { pola: /^[a-z0-9_]{1,15}$/i, pesan: "Username X: huruf, angka, garis bawah, maksimal 15." },
  threads: { pola: /^[a-z0-9._]{1,30}$/i, pesan: "Username Threads: huruf, angka, titik, garis bawah, maksimal 30." },
  tiktok: { pola: /^[a-z0-9._]{2,24}$/i, pesan: "Username TikTok: huruf, angka, titik, garis bawah, 2–24 karakter." },
  linkedin: { pola: /^[a-z0-9-]{3,100}$/i, pesan: "Isi bagian setelah linkedin.com/in/ saja." },
  youtube: { pola: /^[a-z0-9._-]{3,30}$/i, pesan: "Handle YouTube: huruf, angka, titik, garis bawah, tanda hubung, 3–30 karakter." },
};

export function cekHandle(jenis: Medsos, nilai: string): string | null {
  const bersih = bersihkanHandle(nilai);
  if (!bersih) return null;
  return POLA_MEDSOS[jenis].pola.test(bersih) ? null : POLA_MEDSOS[jenis].pesan;
}

export const skemaMedsos = z
  .partialRecord(z.enum(MEDSOS), z.string().trim().max(120))
  .superRefine((nilai, ctx) => {
    for (const jenis of MEDSOS) {
      const salah = nilai[jenis] ? cekHandle(jenis, nilai[jenis]) : null;
      if (salah) ctx.addIssue({ code: "custom", message: salah, path: [jenis] });
    }
  });

export const skemaProfil = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 huruf.").max(NAMA_MAX, `Nama maksimal ${NAMA_MAX} karakter.`),
  username: z.string().trim().toLowerCase().optional(),
  jabatan: z.string().trim().max(JABATAN_MAX, `Jabatan maksimal ${JABATAN_MAX} karakter.`).default(""),
  bio: z
    .string()
    .trim()
    .min(BIO_MIN, `Bio minimal ${BIO_MIN} karakter.`)
    .max(BIO_MAX, `Bio maksimal ${BIO_MAX} karakter.`),
  website: z.union([z.literal(""), z.url("Alamat website gak valid.").max(200)]).default(""),
  medsos: skemaMedsos.default({}),
});

export type DataProfil = z.infer<typeof skemaProfil>;

export interface ProfilKirim {
  name?: string | null;
  image?: string | null;
  jabatan?: string | null;
  bio?: string | null;
  profilLengkap?: boolean | null;
}

export function profilSiapKirim(u: ProfilKirim): boolean {
  return Boolean(u.profilLengkap && u.name?.trim() && u.image && u.jabatan?.trim() && u.bio?.trim());
}

export function cekUsername(nilai: string): string | null {
  const u = nilai.trim().toLowerCase();
  if (u.length < USERNAME_MIN) return `Username minimal ${USERNAME_MIN} karakter.`;
  if (u.length > USERNAME_MAX) return `Username maksimal ${USERNAME_MAX} karakter.`;
  if (!USERNAME_RE.test(u)) return "Pakai huruf kecil, angka, dan tanda hubung saja.";
  if (USERNAME_TERLARANG.has(u)) return "Username ini gak bisa dipakai.";
  return null;
}

export function saranUsername(email: string): string {
  const dasar = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, USERNAME_MAX);
  return dasar.length >= USERNAME_MIN ? dasar : "";
}

export function bersihkanHandle(nilai: string): string {
  return nilai
    .trim()
    .replace(/^https?:\/\/[^/]+\//i, "")
    .replace(/^@/, "")
    .replace(/\/+$/, "")
    .slice(0, 60);
}

export function urlMedsos(jenis: Medsos, handle: string): string {
  const h = encodeURIComponent(handle);
  switch (jenis) {
    case "instagram":
      return `https://www.instagram.com/${h}/`;
    case "x":
      return `https://x.com/${h}`;
    case "threads":
      return `https://www.threads.com/@${h}`;
    case "tiktok":
      return `https://www.tiktok.com/@${h}`;
    case "linkedin":
      return `https://www.linkedin.com/in/${h}/`;
    case "youtube":
      return `https://www.youtube.com/@${h}`;
  }
}

export function uraiMedsos(mentah: string | null | undefined): Partial<Record<Medsos, string>> {
  if (!mentah) return {};
  try {
    const hasil = skemaMedsos.safeParse(JSON.parse(mentah));
    return hasil.success ? hasil.data : {};
  } catch {
    return {};
  }
}
