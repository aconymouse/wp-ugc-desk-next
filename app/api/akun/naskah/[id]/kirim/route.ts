import { NextResponse } from "next/server";
import { CmsError, buatNaskahCms, kirimUlangNaskahCms } from "@/lib/akun/cms";
import { catatLog } from "@/lib/akun/db";
import { AKUN_AKTIF, WP_OFF } from "@/lib/akun/env";
import { bolehLewat } from "@/lib/akun/limit";
import { penulisRedaksi } from "@/lib/akun/peran";
import { ambilSesi, ipDari, siapKirim } from "@/lib/akun/sesi";
import { NaskahError, ambilNaskah, siapkanKirim, tandaiTerkirim } from "@/lib/naskah/simpan";

type Konteks = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Konteks) {
  if (!AKUN_AKTIF) return new Response(null, { status: 404 });
  const { id } = await params;
  const sesi = await ambilSesi();
  if (!sesi) return NextResponse.json({ pesan: "Belum masuk." }, { status: 401 });
  if (!siapKirim(sesi)) {
    return NextResponse.json({ pesan: "Lengkapi profil untuk mengirimkan tulisan." }, { status: 403 });
  }
  if (!WP_OFF && !sesi.wpUserId) {
    return NextResponse.json({ pesan: "Akun belum tersambung ke cms. Simpan ulang profil kamu." }, { status: 403 });
  }
  const reporter = penulisRedaksi(sesi.peran);
  const batas = reporter ? 50 : 5;
  if (!bolehLewat(`naskah-kirim:${sesi.user.id}`, batas, 86400)) {
    return NextResponse.json({ pesan: `Maksimal ${batas} pengiriman per hari.` }, { status: 429 });
  }
  let setuju = false;
  try {
    const body = (await req.json()) as { setuju?: unknown };
    setuju = body.setuju === true;
  } catch {}
  if (!setuju && !reporter) return NextResponse.json({ pesan: "Centang dulu persetujuan ketentuan kontributor." }, { status: 400 });

  const naskah = await ambilNaskah(id, sesi.user.id);
  if (!naskah) return NextResponse.json({ pesan: "Draf tidak ditemukan." }, { status: 404 });
  if (naskah.status === "dikirim") {
    return NextResponse.json({ pesan: "Naskah ini sudah dikirim." }, { status: 409 });
  }

  let paket;
  try {
    paket = siapkanKirim(naskah);
  } catch (e) {
    if (e instanceof NaskahError) return NextResponse.json({ pesan: e.message }, { status: e.status });
    throw e;
  }

  const ip = ipDari(req);
  if (WP_OFF) {
    console.log(`[naskah] ${paket.judul} (${paket.kata} kata) dari ${sesi.user.email}\n${paket.konten}\n`);
    await tandaiTerkirim(naskah.id, naskah.wpPostId ?? 0);
    await catatLog(sesi.user.id, "naskah-kirim", ip);
    if (!reporter) await catatLog(sesi.user.id, "setuju-ketentuan", ip);
    return NextResponse.json({ ok: true, wpPostId: naskah.wpPostId ?? 0 });
  }

  const data = {
    wp_user_id: sesi.wpUserId as number,
    akun_id: sesi.user.id,
    naskah_id: naskah.id,
    judul: paket.judul,
    dek: paket.dek,
    kategori_id: paket.kategoriId,
    tag: paket.tag,
    gambar_utama_id: paket.gambarUtamaId,
    konten: paket.konten,
    kata: paket.kata,
  };

  try {
    const hasil = naskah.wpPostId
      ? await kirimUlangNaskahCms(naskah.wpPostId, data)
      : await buatNaskahCms(data);
    await tandaiTerkirim(naskah.id, hasil.post_id);
    await catatLog(sesi.user.id, naskah.wpPostId ? "naskah-kirim-ulang" : "naskah-kirim", ip);
    if (!reporter) await catatLog(sesi.user.id, "setuju-ketentuan", ip);
    return NextResponse.json({ ok: true, wpPostId: hasil.post_id });
  } catch (e) {
    const pesan = e instanceof CmsError && e.status < 500 ? e.message : "Naskah gagal dikirim ke redaksi. Coba lagi sebentar lagi.";
    return NextResponse.json({ pesan }, { status: 502 });
  }
}
