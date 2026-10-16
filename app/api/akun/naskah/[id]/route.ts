import { NextResponse } from "next/server";
import { AKUN_AKTIF } from "@/lib/akun/env";
import { bolehLewat } from "@/lib/akun/limit";
import { ambilSesi } from "@/lib/akun/sesi";
import { NaskahError, hapusNaskah, perbaruiNaskah, skemaSimpanan } from "@/lib/naskah/simpan";

type Konteks = { params: Promise<{ id: string }> };

function idValid(id: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(id);
}

export async function PUT(req: Request, { params }: Konteks) {
  if (!AKUN_AKTIF) return new Response(null, { status: 404 });
  const { id } = await params;
  if (!idValid(id)) return NextResponse.json({ pesan: "Draf tidak ditemukan." }, { status: 404 });
  const sesi = await ambilSesi();
  if (!sesi) return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  if (!bolehLewat(`naskah-simpan:${sesi.user.id}`, 120, 600)) {
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
    await perbaruiNaskah(sesi, id, hasil.data);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    if (e instanceof NaskahError) return NextResponse.json({ pesan: e.message }, { status: e.status });
    return NextResponse.json({ pesan: "Draf gagal disimpan." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Konteks) {
  if (!AKUN_AKTIF) return new Response(null, { status: 404 });
  const { id } = await params;
  if (!idValid(id)) return NextResponse.json({ pesan: "Draf tidak ditemukan." }, { status: 404 });
  const sesi = await ambilSesi();
  if (!sesi) return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  try {
    await hapusNaskah(sesi, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof NaskahError) return NextResponse.json({ pesan: e.message }, { status: e.status });
    return NextResponse.json({ pesan: "Draf gagal dihapus." }, { status: 500 });
  }
}
