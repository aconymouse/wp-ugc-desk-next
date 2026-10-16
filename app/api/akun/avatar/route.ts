import { NextResponse } from "next/server";
import sharp from "sharp";
import { perbaruiKontributor, unggahMedia } from "@/lib/akun/cms";
import { ambilDb, catatLog } from "@/lib/akun/db";
import { AKUN_AKTIF, WP_OFF } from "@/lib/akun/env";
import { bolehLewat } from "@/lib/akun/limit";
import { uraiMedsos } from "@/lib/akun/profil";
import { ambilSesi, ipDari } from "@/lib/akun/sesi";

const MAKS_BYTE = 8 * 1024 * 1024;
const UKURAN = 512;
const TIPE_BOLEH = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  if (!AKUN_AKTIF) return new Response(null, { status: 404 });
  const sesi = await ambilSesi();
  if (!sesi) return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  if (sesi.peran !== "kontributor") {
    return NextResponse.json({ pesan: "Foto redaksi diatur lewat cms." }, { status: 403 });
  }
  if (!bolehLewat(`avatar:${sesi.user.id}`, 6, 600)) {
    return NextResponse.json({ pesan: "Terlalu sering. Coba beberapa menit lagi." }, { status: 429 });
  }
  if (WP_OFF) {
    return NextResponse.json({ pesan: "Unggah foto butuh koneksi ke cms." }, { status: 503 });
  }

  let berkas: File | null = null;
  try {
    const form = await req.formData();
    const nilai = form.get("foto");
    if (nilai instanceof File) berkas = nilai;
  } catch {}
  if (!berkas) return NextResponse.json({ pesan: "Pilih satu file foto." }, { status: 400 });
  if (!TIPE_BOLEH.has(berkas.type)) {
    return NextResponse.json({ pesan: "Format harus JPG, PNG, atau WebP." }, { status: 400 });
  }
  if (berkas.size > MAKS_BYTE) {
    return NextResponse.json({ pesan: "Ukuran foto maksimal 8 MB." }, { status: 400 });
  }

  let hasil: Uint8Array;
  try {
    hasil = new Uint8Array(
      await sharp(Buffer.from(await berkas.arrayBuffer()), { failOn: "error" })
        .rotate()
        .resize(UKURAN, UKURAN, { fit: "cover", position: "attention" })
        .webp({ quality: 86 })
        .toBuffer()
    );
  } catch {
    return NextResponse.json({ pesan: "Foto gak bisa dibaca." }, { status: 400 });
  }

  const user = sesi.user;
  const namaFile = `avatar-${user.username ?? user.id.slice(0, 8)}-${Date.now().toString(36)}.webp`;

  try {
    const media = await unggahMedia(hasil, namaFile, "image/webp", user.name);
    if (user.wpUserId) {
      await perbaruiKontributor(user.wpUserId, {
        nama: user.name,
        jabatan: user.jabatan ?? "",
        bio: user.bio ?? "",
        website: user.website ?? "",
        medsos: uraiMedsos(user.medsos),
        avatarUrl: media.source_url,
        avatar_media_id: media.id,
      });
    }
    await ambilDb()
      .updateTable("user")
      .set({ image: media.source_url, avatarMediaId: media.id, updatedAt: new Date() })
      .where("id", "=", user.id)
      .execute();
    await catatLog(user.id, "avatar", ipDari(req));
    return NextResponse.json({ ok: true, image: media.source_url });
  } catch {
    return NextResponse.json({ pesan: "Foto gagal diunggah. Coba lagi." }, { status: 502 });
  }
}
