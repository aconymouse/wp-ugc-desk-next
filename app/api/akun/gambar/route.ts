import { NextResponse } from "next/server";
import sharp from "sharp";
import { unggahMedia } from "@/lib/akun/cms";
import { catatLog } from "@/lib/akun/db";
import { AKUN_AKTIF, WP_OFF } from "@/lib/akun/env";
import { bolehLewat } from "@/lib/akun/limit";
import { ambilSesi, bolehMenulis, ipDari } from "@/lib/akun/sesi";

const MAKS_BYTE = 8 * 1024 * 1024;
const LEBAR_MAKS = 1600;
const TIPE_BOLEH = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  if (!AKUN_AKTIF) return new Response(null, { status: 404 });
  const sesi = await ambilSesi();
  if (!sesi) return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  if (!bolehMenulis(sesi)) {
    return NextResponse.json({ pesan: "Lengkapi profil dulu." }, { status: 403 });
  }
  if (!bolehLewat(`gambar:${sesi.user.id}`, 40, 3600)) {
    return NextResponse.json({ pesan: "Terlalu banyak unggahan. Coba lagi nanti." }, { status: 429 });
  }

  let berkas: File | null = null;
  let untuk = "isi";
  try {
    const form = await req.formData();
    const nilai = form.get("foto");
    if (nilai instanceof File) berkas = nilai;
    untuk = String(form.get("untuk") ?? "isi");
  } catch {}
  if (!berkas) return NextResponse.json({ pesan: "Pilih satu file gambar." }, { status: 400 });
  if (!TIPE_BOLEH.has(berkas.type)) {
    return NextResponse.json({ pesan: "Format harus JPG, PNG, atau WebP." }, { status: 400 });
  }
  if (berkas.size > MAKS_BYTE) {
    return NextResponse.json({ pesan: "Ukuran gambar maksimal 8 MB." }, { status: 400 });
  }

  let hasil: Uint8Array;
  try {
    hasil = new Uint8Array(
      await sharp(Buffer.from(await berkas.arrayBuffer()), { failOn: "error" })
        .rotate()
        .resize({ width: LEBAR_MAKS, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()
    );
  } catch {
    return NextResponse.json({ pesan: "Gambar gak bisa dibaca." }, { status: 400 });
  }

  if (WP_OFF) {
    const src = `data:image/webp;base64,${Buffer.from(hasil).toString("base64")}`;
    return NextResponse.json({ ok: true, id: Math.floor(Math.random() * 100000) + 1, src });
  }

  const dasar = berkas.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 60) || "gambar";
  const namaFile = `${untuk === "utama" ? "utama" : "isi"}-${dasar}-${Date.now().toString(36)}.webp`;
  try {
    const media = await unggahMedia(hasil, namaFile, "image/webp", dasar.replace(/-/g, " "));
    await catatLog(sesi.user.id, "gambar", ipDari(req));
    return NextResponse.json({ ok: true, id: media.id, src: media.source_url });
  } catch {
    return NextResponse.json({ pesan: "Gambar gagal diunggah. Coba lagi." }, { status: 502 });
  }
}
