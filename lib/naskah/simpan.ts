import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ambilDb, catatLog, type TabelNaskah } from "@/lib/akun/db";
import { WP_OFF } from "@/lib/akun/env";
import type { Sesi } from "@/lib/akun/sesi";
import {
  DEK_MAKS,
  JUDUL_MAKS,
  KATA_MAKS,
  KATA_MIN,
  TAG_MAKS,
  hitungKataDoc,
  keGutenberg,
  validasiDoc,
  type NodeJson,
} from "./blok";

export const skemaSimpanan = z.object({
  judul: z.string().trim().max(JUDUL_MAKS).default(""),
  dek: z.string().trim().max(DEK_MAKS).default(""),
  kategoriId: z.number().int().positive().nullable().default(null),
  tag: z.array(z.string().trim().min(1).max(40)).max(TAG_MAKS).default([]),
  gambarUtamaId: z.number().int().positive().nullable().default(null),
  isi: z.unknown(),
});

export type Simpanan = z.infer<typeof skemaSimpanan>;

export class NaskahError extends Error {
  status: number;
  constructor(status: number, pesan: string) {
    super(pesan);
    this.status = status;
  }
}

const DOC_KOSONG: NodeJson = { type: "doc", content: [{ type: "paragraph" }] };

function uraiIsi(mentah: unknown): NodeJson {
  const salah = validasiDoc(mentah, WP_OFF);
  if (salah) throw new NaskahError(400, salah);
  return mentah as NodeJson;
}

export function bacaIsi(mentah: string): NodeJson {
  try {
    const doc = JSON.parse(mentah) as unknown;
    return validasiDoc(doc, WP_OFF) ? DOC_KOSONG : (doc as NodeJson);
  } catch {
    return DOC_KOSONG;
  }
}

export function bacaTag(mentah: string): string[] {
  try {
    const nilai = JSON.parse(mentah) as unknown;
    return Array.isArray(nilai) ? nilai.filter((t): t is string => typeof t === "string").slice(0, TAG_MAKS) : [];
  } catch {
    return [];
  }
}

export async function ambilNaskah(id: string, userId: string): Promise<TabelNaskah | null> {
  const baris = await ambilDb()
    .selectFrom("naskah")
    .selectAll()
    .where("id", "=", id)
    .where("userId", "=", userId)
    .executeTakeFirst();
  return baris ?? null;
}

export async function daftarNaskah(userId: string): Promise<TabelNaskah[]> {
  return ambilDb()
    .selectFrom("naskah")
    .selectAll()
    .where("userId", "=", userId)
    .orderBy("diubah", "desc")
    .limit(50)
    .execute();
}

export async function buatNaskah(sesi: Sesi, data: Simpanan, ip: string | null): Promise<string> {
  const jumlah = await ambilDb()
    .selectFrom("naskah")
    .select((eb) => eb.fn.countAll<number>().as("n"))
    .where("userId", "=", sesi.user.id)
    .where("status", "=", "draf")
    .executeTakeFirst();
  if (Number(jumlah?.n ?? 0) >= 10) {
    throw new NaskahError(400, "Draf kamu sudah 10. Kirim atau hapus dulu salah satunya.");
  }
  const isi = uraiIsi(data.isi);
  const id = randomUUID();
  const kini = new Date();
  await ambilDb()
    .insertInto("naskah")
    .values({
      id,
      userId: sesi.user.id,
      judul: data.judul,
      dek: data.dek,
      kategoriId: data.kategoriId,
      tag: JSON.stringify(data.tag),
      gambarUtamaId: data.gambarUtamaId,
      isi: JSON.stringify(isi),
      wpPostId: null,
      status: "draf",
      dibuat: kini,
      diubah: kini,
    })
    .execute();
  await catatLog(sesi.user.id, "naskah-baru", ip);
  return id;
}

export async function perbaruiNaskah(sesi: Sesi, id: string, data: Simpanan): Promise<void> {
  const ada = await ambilNaskah(id, sesi.user.id);
  if (!ada) throw new NaskahError(404, "Draf tidak ditemukan.");
  if (ada.status === "dikirim") throw new NaskahError(409, "Naskah ini sudah dikirim dan sedang ditinjau redaksi.");
  const isi = uraiIsi(data.isi);
  await ambilDb()
    .updateTable("naskah")
    .set({
      judul: data.judul,
      dek: data.dek,
      kategoriId: data.kategoriId,
      tag: JSON.stringify(data.tag),
      gambarUtamaId: data.gambarUtamaId,
      isi: JSON.stringify(isi),
      diubah: new Date(),
    })
    .where("id", "=", id)
    .execute();
}

export async function hapusNaskah(sesi: Sesi, id: string): Promise<void> {
  const ada = await ambilNaskah(id, sesi.user.id);
  if (!ada) throw new NaskahError(404, "Draf tidak ditemukan.");
  if (ada.status === "dikirim") throw new NaskahError(409, "Naskah yang sudah dikirim tidak bisa dihapus dari sini.");
  await ambilDb().deleteFrom("naskah").where("id", "=", id).execute();
}

export interface PaketKirim {
  naskah: TabelNaskah;
  judul: string;
  dek: string;
  kategoriId: number;
  tag: string[];
  gambarUtamaId: number | null;
  konten: string;
  kata: number;
}

export function siapkanKirim(naskah: TabelNaskah): PaketKirim {
  const isi = bacaIsi(naskah.isi);
  const judul = naskah.judul.trim();
  if (judul.length < 10) throw new NaskahError(400, "Judul minimal 10 karakter.");
  if (!naskah.kategoriId) throw new NaskahError(400, "Pilih satu kategori.");
  const kata = hitungKataDoc(isi);
  if (kata < KATA_MIN) throw new NaskahError(400, `Naskah minimal ${KATA_MIN} kata, sekarang ${kata}.`);
  if (kata > KATA_MAKS) throw new NaskahError(400, `Naskah maksimal ${KATA_MAKS} kata.`);
  const konten = keGutenberg(isi, judul);
  if (!konten.trim()) throw new NaskahError(400, "Isi naskah masih kosong.");
  return {
    naskah,
    judul,
    dek: naskah.dek.trim(),
    kategoriId: naskah.kategoriId,
    tag: bacaTag(naskah.tag),
    gambarUtamaId: naskah.gambarUtamaId,
    konten,
    kata,
  };
}

export async function tandaiTerkirim(id: string, wpPostId: number): Promise<void> {
  await ambilDb()
    .updateTable("naskah")
    .set({ status: "dikirim", wpPostId, diubah: new Date() })
    .where("id", "=", id)
    .execute();
}

export async function naskahUntukRevisi(
  sesi: Sesi,
  wpPostId: number,
  data: { judul: string; dek: string; kategoriId: number | null; tag?: string[]; gambarUtamaId: number | null }
): Promise<string> {
  const db = ambilDb();
  const ada = await db
    .selectFrom("naskah")
    .select(["id", "status"])
    .where("userId", "=", sesi.user.id)
    .where("wpPostId", "=", wpPostId)
    .executeTakeFirst();
  const kini = new Date();
  if (ada) {
    await db
      .updateTable("naskah")
      .set({
        judul: data.judul,
        dek: data.dek,
        kategoriId: data.kategoriId,
        tag: JSON.stringify(data.tag ?? []),
        gambarUtamaId: data.gambarUtamaId,
        isi: "",
        status: "revisi",
        diubah: kini,
      })
      .where("id", "=", ada.id)
      .execute();
    return ada.id;
  }
  const id = randomUUID();
  await db
    .insertInto("naskah")
    .values({
      id,
      userId: sesi.user.id,
      judul: data.judul,
      dek: data.dek,
      kategoriId: data.kategoriId,
      tag: JSON.stringify(data.tag ?? []),
      gambarUtamaId: data.gambarUtamaId,
      isi: "",
      wpPostId,
      status: "revisi",
      dibuat: kini,
      diubah: kini,
    })
    .execute();
  return id;
}

export function modeLokal(): boolean {
  return WP_OFF;
}

export function isiMasihDariCms(naskah: TabelNaskah): boolean {
  return naskah.isi === "" && naskah.wpPostId !== null;
}
