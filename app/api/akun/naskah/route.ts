import { NextResponse } from "next/server";
import { AKUN_AKTIF } from "@/lib/akun/env";
import { bolehLewat } from "@/lib/akun/limit";
import { ambilSesi, bolehMenulis, ipDari } from "@/lib/akun/sesi";
import { NaskahError, buatNaskah, skemaSimpanan } from "@/lib/naskah/simpan";

export async function POST(req: Request) {
  if (!AKUN_AKTIF) return new Response(null, { status: 404 });
  const sesi = await ambilSesi();
  if (!sesi) return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  if (!bolehMenulis(sesi)) {
    return NextResponse.json({ pesan: "Lengkapi profil dulu." }, { status: 403 });
  }
  if (!bolehLewat(`naskah-baru:${sesi.user.id}`, 20, 3600)) {
    return NextResponse.json({ pesan: "Terlalu sering." }, { status: 429 });
  }
  let masukan: unknown;
  try {
    masukan = await req.json();
  } catch {
    return NextResponse.json({ pesan: "Permintaan gak lengkap." }, { status: 400 });
  }
  const hasil = skemaSimpanan.safeParse(masukan);
  if (!hasil.success) return NextResponse.json({ pesan: "Isian belum benar." }, { status: 400 });
  try {
    const id = await buatNaskah(sesi, hasil.data, ipDari(req));
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    if (e instanceof NaskahError) return NextResponse.json({ pesan: e.message }, { status: e.status });
    return NextResponse.json({ pesan: "Draf gagal disimpan." }, { status: 500 });
  }
}
