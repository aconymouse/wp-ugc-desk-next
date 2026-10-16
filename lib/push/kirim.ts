import type { Kysely } from "kysely";
import webpush, { WebPushError, type RequestOptions } from "web-push";
import { ambilDb, type BasisAkun } from "@/lib/akun/db";
import { KUNCI_PUBLIK } from "@/lib/push/env";

export interface ArtikelPush {
  postId: number;
  judul: string;
  isi: string;
  url: string;
  gambar: string | null;
  kategori: number[];
}

const PER_BATCH = 500;
const SERENTAK = 25;
const BATAS_GAGAL = 5;
const SUBJEK = `mailto:${process.env.VAPID_SUBJECT_EMAIL ?? "redaksi@example.com"}`;

export const VAPID_SIAP = Boolean(KUNCI_PUBLIK && process.env.VAPID_PRIVATE_KEY);

function pelanggan(db: Kysely<BasisAkun>, kategori: number[]) {
  return db.selectFrom("push_langganan").where((eb) =>
    kategori.length
      ? eb.or([
          eb("push_langganan.semua", "=", 1),
          eb.exists(
            eb
              .selectFrom("push_kategori")
              .select("push_kategori.langgananId")
              .whereRef("push_kategori.langgananId", "=", "push_langganan.id")
              .where("push_kategori.kategoriId", "in", kategori)
          ),
        ])
      : eb("push_langganan.semua", "=", 1)
  );
}

export async function hitungTarget(kategori: number[]): Promise<number> {
  const baris = await pelanggan(ambilDb(), kategori)
    .select((eb) => eb.fn.countAll().as("jumlah"))
    .executeTakeFirst();
  return Number(baris?.jumlah ?? 0);
}

export async function catatKiriman(artikel: ArtikelPush, target: number): Promise<boolean> {
  const hasil = await ambilDb()
    .insertInto("push_kirim")
    .orIgnore()
    .values({
      postId: artikel.postId,
      judul: artikel.judul.slice(0, 200),
      target,
      terkirim: 0,
      gagal: 0,
      mulai: new Date(),
      selesai: null,
    })
    .executeTakeFirst();
  return Number(hasil.numInsertedOrUpdatedRows ?? 0) > 0;
}

export async function targetTercatat(postId: number): Promise<number> {
  const baris = await ambilDb()
    .selectFrom("push_kirim")
    .select("target")
    .where("postId", "=", postId)
    .executeTakeFirst();
  return baris?.target ?? 0;
}

async function serentak<T>(daftar: T[], batas: number, kerja: (item: T) => Promise<void>) {
  let i = 0;
  const pekerja = Array.from({ length: Math.min(batas, daftar.length) }, async () => {
    while (i < daftar.length) {
      const item = daftar[i++];
      await kerja(item);
    }
  });
  await Promise.all(pekerja);
}

export async function sebarArtikel(artikel: ArtikelPush): Promise<void> {
  const db = ambilDb();
  const opsi: RequestOptions = {
    vapidDetails: {
      subject: SUBJEK,
      publicKey: KUNCI_PUBLIK,
      privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    },
    TTL: 6 * 3600,
    urgency: "normal",
    topic: `p${artikel.postId}`,
    timeout: 10000,
  };
  const muatan = JSON.stringify({
    judul: artikel.judul,
    isi: artikel.isi,
    url: artikel.url,
    gambar: artikel.gambar,
    tag: `naskah-${artikel.postId}`,
    waktu: Date.now(),
  });

  let kursor = "";
  let terkirim = 0;
  let gagal = 0;

  for (;;) {
    const baris = await pelanggan(db, artikel.kategori)
      .select(["push_langganan.id", "push_langganan.endpoint", "push_langganan.p256dh", "push_langganan.auth"])
      .where("push_langganan.id", ">", kursor)
      .orderBy("push_langganan.id")
      .limit(PER_BATCH)
      .execute();
    if (!baris.length) break;
    kursor = baris[baris.length - 1].id;

    const berhasil: string[] = [];
    const mati: string[] = [];
    const meleset: string[] = [];

    await serentak(baris, SERENTAK, async (b) => {
      try {
        await webpush.sendNotification({ endpoint: b.endpoint, keys: { p256dh: b.p256dh, auth: b.auth } }, muatan, opsi);
        berhasil.push(b.id);
      } catch (e) {
        if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) mati.push(b.id);
        else meleset.push(b.id);
      }
    });

    terkirim += berhasil.length;
    gagal += mati.length + meleset.length;
    const kini = new Date();

    if (berhasil.length) {
      await db
        .updateTable("push_langganan")
        .set({ gagal: 0, terakhirKirim: kini })
        .where("id", "in", berhasil)
        .execute();
    }
    if (meleset.length) {
      await db
        .updateTable("push_langganan")
        .set((eb) => ({ gagal: eb("gagal", "+", 1) }))
        .where("id", "in", meleset)
        .execute();
      mati.push(
        ...(
          await db
            .selectFrom("push_langganan")
            .select("id")
            .where("id", "in", meleset)
            .where("gagal", ">=", BATAS_GAGAL)
            .execute()
        ).map((b) => b.id)
      );
    }
    if (mati.length) {
      await db.deleteFrom("push_langganan").where("id", "in", mati).execute();
    }
    if (baris.length < PER_BATCH) break;
  }

  await db
    .updateTable("push_kirim")
    .set({ terkirim, gagal, selesai: new Date() })
    .where("postId", "=", artikel.postId)
    .execute();
}
