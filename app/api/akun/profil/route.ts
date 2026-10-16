import { NextResponse } from "next/server";
import { AKUN_AKTIF } from "@/lib/akun/env";
import { bolehLewat } from "@/lib/akun/limit";
import { skemaProfil } from "@/lib/akun/profil";
import { ambilSesi, ipDari } from "@/lib/akun/sesi";
import { ProfilError, simpanProfil } from "@/lib/akun/simpan-profil";

export async function PUT(req: Request) {
  if (!AKUN_AKTIF) return new Response(null, { status: 404 });
  const sesi = await ambilSesi();
  if (!sesi) return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  if (!bolehLewat(`profil:${sesi.user.id}`, 20, 600)) {
    return NextResponse.json({ pesan: "Terlalu sering. Coba beberapa menit lagi." }, { status: 429 });
  }

  let masukan: unknown;
  try {
    masukan = await req.json();
  } catch {
    return NextResponse.json({ pesan: "Permintaan gak lengkap." }, { status: 400 });
  }
  const hasil = skemaProfil.safeParse(masukan);
  if (!hasil.success) {
    const pertama = hasil.error.issues[0];
    return NextResponse.json(
      { pesan: pertama?.message ?? "Isian belum benar.", bidang: String(pertama?.path[0] ?? "") },
      { status: 400 }
    );
  }

  try {
    const data = await simpanProfil(sesi, hasil.data, ipDari(req));
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    if (e instanceof ProfilError) {
      return NextResponse.json({ pesan: e.message, bidang: e.bidang }, { status: e.status });
    }
    return NextResponse.json({ pesan: "Profil gagal disimpan." }, { status: 500 });
  }
}
