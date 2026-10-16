import { getWpApiUrl } from "@/lib/wp-url";
import { WP_OFF } from "./env";
import type { Medsos } from "./profil";

const AUTH_USER = process.env.WORDPRESS_AUTH_USER;
const AUTH_PASS = process.env.WORDPRESS_AUTH_PASS;
const RAHASIA = process.env.UGC_DESK_SECRET ?? "";

export interface DataKontributor {
  username: string;
  email: string;
  nama: string;
  jabatan: string;
  bio: string;
  website: string;
  medsos: Partial<Record<Medsos, string>>;
  avatarUrl: string | null;
}

export interface HasilKontributor {
  wp_user_id: number;
  username?: string;
  ppma_term_id: number;
  avatar_media_id: number | null;
  avatar_url: string | null;
}

export interface MediaCms {
  id: number;
  source_url: string;
}

export class CmsError extends Error {
  status: number;
  kode: string | null;
  constructor(status: number, pesan: string, kode: string | null = null) {
    super(pesan);
    this.status = status;
    this.kode = kode;
  }
}

function kepala(tambahan: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { "X-UGC-Desk-Secret": RAHASIA, ...tambahan };
  if (AUTH_USER && AUTH_PASS) {
    h.Authorization = `Basic ${Buffer.from(`${AUTH_USER}:${AUTH_PASS}`).toString("base64")}`;
  }
  return h;
}

function dasar(): string {
  const base = getWpApiUrl();
  if (!base) throw new CmsError(500, "WORDPRESS_API_URL belum diisi");
  return base;
}

async function panggil<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${dasar()}${path}`, { ...init, cache: "no-store" });
  } catch {
    throw new CmsError(502, "cms gak bisa dihubungi");
  }
  const teks = await res.text();
  let data: unknown = null;
  try {
    data = teks ? JSON.parse(teks) : null;
  } catch {}
  if (!res.ok) {
    const pesan =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : `cms menjawab ${res.status}`;
    const kode = data && typeof data === "object" && "code" in data && typeof data.code === "string" ? data.code : null;
    throw new CmsError(res.status, pesan, kode);
  }
  return data as T;
}

function json(body: unknown, method: string): RequestInit {
  return {
    method,
    headers: kepala({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  };
}

export async function usernameAdaDiCms(username: string): Promise<boolean> {
  if (WP_OFF) return false;
  const data = await panggil<{ ada: boolean }>(
    `/ugc-desk/v1/kontributor/username-ada?u=${encodeURIComponent(username)}`,
    { headers: kepala() }
  );
  return data.ada === true;
}

let simpananPeran: { nilai: string[]; sampai: number } | null = null;

export async function peranReporterCms(): Promise<string[]> {
  if (WP_OFF) return [];
  if (simpananPeran && simpananPeran.sampai > Date.now()) return simpananPeran.nilai;
  try {
    const data = await panggil<{ peran?: unknown }>("/ugc-desk/v1/kontributor/peran-reporter", { headers: kepala() });
    const nilai = Array.isArray(data.peran) ? data.peran.filter((p): p is string => typeof p === "string") : [];
    simpananPeran = { nilai, sampai: Date.now() + 600_000 };
  } catch {
    simpananPeran = { nilai: simpananPeran?.nilai ?? [], sampai: Date.now() + 60_000 };
  }
  return simpananPeran.nilai;
}

export async function akunLamaDiCms(email: string): Promise<string | null> {
  if (WP_OFF) return null;
  const data = await panggil<{ username: string | null }>(
    `/ugc-desk/v1/kontributor/akun-lama?email=${encodeURIComponent(email)}`,
    { headers: kepala() }
  );
  return data.username || null;
}

export function buatKontributor(data: DataKontributor): Promise<HasilKontributor> {
  return panggil<HasilKontributor>("/ugc-desk/v1/kontributor", json(data, "POST"));
}

export function perbaruiKontributor(
  wpUserId: number,
  data: Omit<DataKontributor, "username" | "email"> & { avatar_media_id?: number | null }
): Promise<HasilKontributor> {
  return panggil<HasilKontributor>(`/ugc-desk/v1/kontributor/${wpUserId}`, json(data, "PUT"));
}

export async function unggahMedia(
  isi: Uint8Array,
  namaFile: string,
  tipe: string,
  judul: string
): Promise<MediaCms> {
  const data = await panggil<MediaCms>("/wp/v2/media", {
    method: "POST",
    headers: kepala({
      "content-type": tipe,
      "content-disposition": `attachment; filename="${namaFile}"`,
    }),
    body: new Blob([new Uint8Array(isi)], { type: tipe }),
  });
  if (judul) {
    await panggil(`/wp/v2/media/${data.id}`, json({ title: judul, alt_text: judul }, "POST")).catch(
      () => null
    );
  }
  return data;
}

export interface DataLaporan {
  post_id: number;
  pesan: string;
  nama: string;
  email: string;
  username: string | null;
  wp_user_id: number | null;
  akun_id: string;
  ip: string | null;
}

export function kirimLaporan(data: DataLaporan): Promise<{ id: number }> {
  return panggil<{ id: number }>("/ugc-desk/v1/laporan", json(data, "POST"));
}

export interface DataNaskah {
  wp_user_id: number;
  akun_id: string;
  naskah_id: string;
  judul: string;
  dek: string;
  kategori_id: number;
  tag: string[];
  gambar_utama_id: number | null;
  konten: string;
  kata: number;
}

export interface NaskahCms {
  id: number;
  judul: string;
  status: string;
  tanggal: string;
  link: string | null;
  keputusan: string | null;
  alasan: string | null;
  naskah_id: string | null;
  perubahan: boolean;
}

export interface IsiNaskahCms extends NaskahCms {
  dek: string;
  konten: string;
  kategori_id: number | null;
  tag: string[];
  gambar_utama: { id: number; src: string } | null;
}

export function buatNaskahCms(data: DataNaskah): Promise<{ post_id: number }> {
  return panggil<{ post_id: number }>("/ugc-desk/v1/naskah", json(data, "POST"));
}

export function kirimUlangNaskahCms(postId: number, data: DataNaskah): Promise<{ post_id: number }> {
  return panggil<{ post_id: number }>(`/ugc-desk/v1/naskah/${postId}`, json(data, "PUT"));
}

export async function daftarNaskahCms(wpUserId: number): Promise<NaskahCms[]> {
  if (WP_OFF) return [];
  return panggil<NaskahCms[]>(`/ugc-desk/v1/naskah?wp_user_id=${wpUserId}`, { headers: kepala() });
}

export function ambilNaskahCms(postId: number, wpUserId: number): Promise<IsiNaskahCms> {
  return panggil<IsiNaskahCms>(`/ugc-desk/v1/naskah/${postId}?wp_user_id=${wpUserId}`, { headers: kepala() });
}

export async function ambilMediaSrc(id: number): Promise<string | null> {
  if (WP_OFF) return null;
  try {
    const data = await panggil<{ source_url?: string }>(`/wp/v2/media/${id}?_fields=source_url`, {
      headers: kepala(),
    });
    return data.source_url ?? null;
  } catch {
    return null;
  }
}

export interface DataPerubahan {
  post_id: number;
  wp_user_id: number;
  akun_id: string;
  nama: string;
  email: string;
  pesan: string;
}

export function mintaPerubahanCms(data: DataPerubahan): Promise<{ ok: true }> {
  return panggil<{ ok: true }>("/ugc-desk/v1/perubahan", json(data, "POST"));
}
