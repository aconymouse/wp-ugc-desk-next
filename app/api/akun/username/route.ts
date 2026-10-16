import { NextResponse } from "next/server";
import { AKUN_AKTIF } from "@/lib/akun/env";
import { bolehLewat } from "@/lib/akun/limit";
import { ambilSesi } from "@/lib/akun/sesi";
import { usernameTersedia } from "@/lib/akun/simpan-profil";

export async function GET(req: Request) {
  if (!AKUN_AKTIF) return new Response(null, { status: 404 });
  const sesi = await ambilSesi();
  if (!sesi) return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  if (!bolehLewat(`username:${sesi.user.id}`, 60, 60)) {
    return NextResponse.json({ pesan: "Terlalu sering." }, { status: 429 });
  }
  if (sesi.user.username) {
    return NextResponse.json({ tersedia: false, pesan: "Username kamu sudah ditetapkan." });
  }
  const u = new URL(req.url).searchParams.get("u")?.trim().toLowerCase() ?? "";
  try {
    const pesan = await usernameTersedia(u, sesi.user.id);
    return NextResponse.json({ tersedia: pesan === null, pesan });
  } catch {
    return NextResponse.json(
      { tersedia: false, pesan: "Gak bisa mengecek sekarang." },
      { status: 502 }
    );
  }
}
