import { NextResponse } from "next/server";
import { z } from "zod";
import { kirimLaporan } from "@/lib/akun/cms";
import { ambilDb, catatLog } from "@/lib/akun/db";
import { AKUN_AKTIF, WP_OFF } from "@/lib/akun/env";
import { LAPORAN_KATA_MAKS, LAPORAN_KATA_MIN, LAPORAN_PER_HARI, hitungKata } from "@/lib/akun/laporan";
import { bolehLewat } from "@/lib/akun/limit";
import { ambilSesi, ipDari } from "@/lib/akun/sesi";

const skema = z.object({
  postId: z.number().int().positive(),
  pesan: z.string().trim().min(1).max(2000),
});

export async function POST(req: Request) {
  if (!AKUN_AKTIF) return new Response(null, { status: 404 });
  const sesi = await ambilSesi();
  if (!sesi) return NextResponse.json({ pesan: "Masuk dulu untuk melapor." }, { status: 401 });

  let masukan: unknown;
  try {
    masukan = await req.json();
  } catch {
    return NextResponse.json({ pesan: "Permintaan gak lengkap." }, { status: 400 });
  }
  const hasil = skema.safeParse(masukan);
  if (!hasil.success) {
    return NextResponse.json({ pesan: "Isian belum benar." }, { status: 400 });
  }
  const kata = hitungKata(hasil.data.pesan);
  if (kata < LAPORAN_KATA_MIN || kata > LAPORAN_KATA_MAKS) {
    return NextResponse.json(
      { pesan: `Tulis ${LAPORAN_KATA_MIN} sampai ${LAPORAN_KATA_MAKS} kata.` },
      { status: 400 }
    );
  }

  const ip = ipDari(req);
  if (!bolehLewat(`laporan:ip:${ip ?? "?"}`, 20, 86400)) {
    return NextResponse.json({ pesan: "Terlalu banyak laporan dari jaringan ini." }, { status: 429 });
  }
  const aksi = `laporan:${hasil.data.postId}`;
  const sejak = new Date(Date.now() - 86400000);
  const riwayat = await ambilDb()
    .selectFrom("log_akun")
    .select("aksi")
    .where("userId", "=", sesi.user.id)
    .where("aksi", "like", "laporan:%")
    .where("waktu", ">", sejak)
    .execute();
  if (riwayat.some((r) => r.aksi === aksi)) {
    return NextResponse.json({ pesan: "Kamu sudah melaporkan artikel ini." }, { status: 409 });
  }
  if (riwayat.length >= LAPORAN_PER_HARI) {
    return NextResponse.json(
      { pesan: `Maksimal ${LAPORAN_PER_HARI} laporan per hari. Coba lagi besok.` },
      { status: 429 }
    );
  }

  if (WP_OFF) {
    console.log(`[laporan] pos ${hasil.data.postId} dari ${sesi.user.email}:\n${hasil.data.pesan}\n`);
    await catatLog(sesi.user.id, aksi, ip);
    return NextResponse.json({ ok: true, id: 0 });
  }

  try {
    const data = await kirimLaporan({
      post_id: hasil.data.postId,
      pesan: hasil.data.pesan,
      nama: sesi.user.name,
      email: sesi.user.email,
      username: sesi.user.username ?? null,
      wp_user_id: sesi.wpUserId,
      akun_id: sesi.user.id,
      ip,
    });
    await catatLog(sesi.user.id, aksi, ip);
    return NextResponse.json({ ok: true, id: data.id });
  } catch {
    return NextResponse.json({ pesan: "Laporan gagal dikirim. Coba lagi sebentar lagi." }, { status: 502 });
  }
}
