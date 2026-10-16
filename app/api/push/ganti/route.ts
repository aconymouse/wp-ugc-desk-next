import { NextResponse } from "next/server";
import { z } from "zod";
import { ambilDb } from "@/lib/akun/db";
import { bolehLewat } from "@/lib/akun/limit";
import { ipDari } from "@/lib/akun/sesi";
import { PUSH_AKTIF } from "@/lib/push/env";
import { bacaJson, kunciEndpoint, skemaEndpoint, skemaLangganan } from "@/lib/push/langganan";

const skema = z.object({ lama: skemaEndpoint, langganan: skemaLangganan });

export async function POST(req: Request) {
  if (!PUSH_AKTIF) return new Response(null, { status: 404 });
  if (!bolehLewat(`push:ganti:${ipDari(req) ?? "?"}`, 30, 3600)) {
    return NextResponse.json({ pesan: "Terlalu banyak permintaan." }, { status: 429 });
  }
  const hasil = skema.safeParse(await bacaJson(req));
  if (!hasil.success) return NextResponse.json({ pesan: "Langganan gak valid." }, { status: 400 });

  const { lama, langganan } = hasil.data;
  const kunciLama = kunciEndpoint(lama);
  const kunciBaru = kunciEndpoint(langganan.endpoint);

  await ambilDb()
    .transaction()
    .execute(async (trx) => {
      const ada = await trx
        .selectFrom("push_langganan")
        .select("id")
        .where("kunciEndpoint", "=", kunciLama)
        .executeTakeFirst();
      if (!ada) return;
      if (kunciBaru !== kunciLama) {
        await trx.deleteFrom("push_langganan").where("kunciEndpoint", "=", kunciBaru).execute();
      }
      await trx
        .updateTable("push_langganan")
        .set({
          endpoint: langganan.endpoint,
          kunciEndpoint: kunciBaru,
          p256dh: langganan.keys.p256dh,
          auth: langganan.keys.auth,
          gagal: 0,
          diubah: new Date(),
        })
        .where("id", "=", ada.id)
        .execute();
    });

  return NextResponse.json({ ok: true });
}
