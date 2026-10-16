import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/akun/auth";
import { ambilDb } from "@/lib/akun/db";
import { AKUN_AKTIF } from "@/lib/akun/env";
import { bolehLewat } from "@/lib/akun/limit";
import { ipDari } from "@/lib/akun/sesi";
import { PUSH_AKTIF } from "@/lib/push/env";
import {
  bacaJson,
  kunciEndpoint,
  simpanKategori,
  skemaEndpoint,
  skemaKategori,
  skemaLangganan,
} from "@/lib/push/langganan";

const skemaSimpan = z.object({
  langganan: skemaLangganan,
  semua: z.boolean(),
  kategori: skemaKategori,
});

const skemaHapus = z.object({ endpoint: skemaEndpoint });

async function idAkun(req: Request): Promise<string | null> {
  if (!AKUN_AKTIF) return null;
  try {
    const data = await auth.api.getSession({ headers: req.headers });
    return data?.user.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (!PUSH_AKTIF) return new Response(null, { status: 404 });
  if (!bolehLewat(`push:ip:${ipDari(req) ?? "?"}`, 30, 3600)) {
    return NextResponse.json({ pesan: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429 });
  }
  const hasil = skemaSimpan.safeParse(await bacaJson(req));
  if (!hasil.success) {
    return NextResponse.json({ pesan: "Langganan gak valid. Muat ulang halaman lalu coba lagi." }, { status: 400 });
  }
  const { langganan, semua } = hasil.data;
  const kategori = semua ? [] : [...new Set(hasil.data.kategori)];
  if (!semua && !kategori.length) {
    return NextResponse.json({ pesan: "Pilih minimal satu kategori." }, { status: 400 });
  }

  const userId = await idAkun(req);
  const kunci = kunciEndpoint(langganan.endpoint);
  const kini = new Date();

  await ambilDb()
    .transaction()
    .execute(async (trx) => {
      await trx
        .insertInto("push_langganan")
        .values({
          id: randomUUID(),
          endpoint: langganan.endpoint,
          kunciEndpoint: kunci,
          p256dh: langganan.keys.p256dh,
          auth: langganan.keys.auth,
          semua: semua ? 1 : 0,
          userId,
          gagal: 0,
          dibuat: kini,
          diubah: kini,
          terakhirKirim: null,
        })
        .onDuplicateKeyUpdate({
          p256dh: langganan.keys.p256dh,
          auth: langganan.keys.auth,
          semua: semua ? 1 : 0,
          gagal: 0,
          diubah: kini,
          ...(userId ? { userId } : {}),
        })
        .execute();
      const baris = await trx
        .selectFrom("push_langganan")
        .select("id")
        .where("kunciEndpoint", "=", kunci)
        .executeTakeFirstOrThrow();
      await simpanKategori(trx, baris.id, kategori);
    });

  return NextResponse.json({ ok: true, semua, kategori });
}

export async function DELETE(req: Request) {
  if (!PUSH_AKTIF) return new Response(null, { status: 404 });
  const hasil = skemaHapus.safeParse(await bacaJson(req));
  if (!hasil.success) return NextResponse.json({ pesan: "Langganan gak valid." }, { status: 400 });
  await ambilDb()
    .deleteFrom("push_langganan")
    .where("kunciEndpoint", "=", kunciEndpoint(hasil.data.endpoint))
    .execute();
  return NextResponse.json({ ok: true });
}
