import { NextResponse } from "next/server";
import { z } from "zod";
import { CmsError, mintaPerubahanCms } from "@/lib/akun/cms";
import { catatLog } from "@/lib/akun/db";
import { AKUN_AKTIF, WP_OFF } from "@/lib/akun/env";
import { bolehLewat } from "@/lib/akun/limit";
import { ambilSesi, bolehMenulis, ipDari } from "@/lib/akun/sesi";
import { cekTurnstile } from "@/lib/akun/turnstile";
import { PERUBAHAN_MAKS, PERUBAHAN_MIN, PERUBAHAN_PER_HARI } from "@/lib/naskah/perubahan";

const skema = z.object({
  postId: z.number().int().positive(),
  pesan: z.string().trim().min(PERUBAHAN_MIN).max(PERUBAHAN_MAKS),
  token: z.string().nullish(),
});

export async function POST(req: Request) {
  if (!AKUN_AKTIF) return new Response(null, { status: 404 });
  const sesi = await ambilSesi();
  if (!sesi) return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  if (!bolehMenulis(sesi)) return NextResponse.json({ pesan: "Khusus akun penulis." }, { status: 403 });
  if (!WP_OFF && !sesi.wpUserId) {
    return NextResponse.json({ pesan: "Akun belum tersambung ke cms." }, { status: 403 });
  }

  let masukan: unknown;
  try {
    masukan = await req.json();
  } catch {
    return NextResponse.json({ pesan: "Permintaan gak lengkap." }, { status: 400 });
  }
  const hasil = skema.safeParse(masukan);
  if (!hasil.success) {
    return NextResponse.json({ pesan: `Tulis ${PERUBAHAN_MIN} sampai ${PERUBAHAN_MAKS} karakter.` }, { status: 400 });
  }

  const ip = ipDari(req);
  if (!(await cekTurnstile(hasil.data.token ?? undefined, ip))) {
    return NextResponse.json({ pesan: "Verifikasi gagal. Coba lagi." }, { status: 400 });
  }
  if (!bolehLewat(`perubahan:${sesi.user.id}`, PERUBAHAN_PER_HARI, 86400)) {
    return NextResponse.json({ pesan: `Maksimal ${PERUBAHAN_PER_HARI} permintaan per hari.` }, { status: 429 });
  }

  if (WP_OFF) {
    console.log(`[perubahan] pos ${hasil.data.postId} dari ${sesi.user.email}:\n${hasil.data.pesan}\n`);
    await catatLog(sesi.user.id, `perubahan:${hasil.data.postId}`, ip);
    return NextResponse.json({ ok: true });
  }

  try {
    await mintaPerubahanCms({
      post_id: hasil.data.postId,
      wp_user_id: sesi.wpUserId as number,
      akun_id: sesi.user.id,
      nama: sesi.user.name,
      email: sesi.user.email,
      pesan: hasil.data.pesan,
    });
    await catatLog(sesi.user.id, `perubahan:${hasil.data.postId}`, ip);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CmsError && e.status === 409) {
      return NextResponse.json({ pesan: e.message }, { status: 409 });
    }
    const pesan = e instanceof CmsError && e.status < 500 ? e.message : "Permintaan gagal dikirim. Coba lagi sebentar lagi.";
    return NextResponse.json({ pesan }, { status: e instanceof CmsError && e.status < 500 ? e.status : 502 });
  }
}
