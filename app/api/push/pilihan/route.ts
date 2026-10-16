import { NextResponse } from "next/server";
import { z } from "zod";
import { ambilDb } from "@/lib/akun/db";
import { bolehLewat } from "@/lib/akun/limit";
import { ipDari } from "@/lib/akun/sesi";
import { PUSH_AKTIF } from "@/lib/push/env";
import { bacaJson, kunciEndpoint, skemaEndpoint } from "@/lib/push/langganan";

const skema = z.object({ endpoint: skemaEndpoint });

export async function POST(req: Request) {
  if (!PUSH_AKTIF) return new Response(null, { status: 404 });
  if (!bolehLewat(`push:pilihan:${ipDari(req) ?? "?"}`, 120, 3600)) {
    return NextResponse.json({ pesan: "Terlalu banyak permintaan." }, { status: 429 });
  }
  const hasil = skema.safeParse(await bacaJson(req));
  if (!hasil.success) return NextResponse.json({ pesan: "Langganan gak valid." }, { status: 400 });

  const db = ambilDb();
  const baris = await db
    .selectFrom("push_langganan")
    .select(["id", "semua"])
    .where("kunciEndpoint", "=", kunciEndpoint(hasil.data.endpoint))
    .executeTakeFirst();
  if (!baris) return NextResponse.json({ pesan: "Belum berlangganan." }, { status: 404 });

  const kategori = await db
    .selectFrom("push_kategori")
    .select("kategoriId")
    .where("langgananId", "=", baris.id)
    .execute();

  return NextResponse.json({
    semua: Number(baris.semua) === 1,
    kategori: kategori.map((k) => k.kategoriId),
  });
}
