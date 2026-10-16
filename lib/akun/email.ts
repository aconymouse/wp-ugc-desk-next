import { PRODUKSI, WP_OFF } from "./env";
import { NAMA_REDAKSI, SITE_HOST, SITE_NAME, SITE_URL } from "@/lib/situs";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const PENGIRIM_NAMA = NAMA_REDAKSI;

interface Surat {
  ke: string;
  subjek: string;
  teks: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function kirimEmail(surat: Surat): Promise<void> {
  const kunci = process.env.BREVO_API_KEY;
  const pengirim = process.env.BREVO_PENGIRIM ?? "redaksi@example.com";
  if (!kunci) {
    if (PRODUKSI && !WP_OFF) throw new Error("BREVO_API_KEY belum diisi");
    console.log(`\n[email ke ${surat.ke}] ${surat.subjek}\n${surat.teks}\n`);
    return;
  }
  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": kunci,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: PENGIRIM_NAMA, email: pengirim },
      to: [{ email: surat.ke }],
      subject: surat.subjek,
      textContent: surat.teks,
      htmlContent: surat.html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Brevo menolak: ${res.status}`);
  }
}

export function kirimKodeMasuk(email: string, kode: string): Promise<void> {
  const teks = [
    `Kode masuk kamu: ${kode}`,
    "",
    "Kode ini berlaku 10 menit dan cuma bisa dipakai sekali.",
    "Kalau kamu gak merasa minta kode ini, abaikan saja email ini.",
    "",
    SITE_NAME,
    SITE_URL,
  ].join("\n");

  const html = `<!doctype html><html lang="id"><body style="margin:0;padding:32px 16px;background:#f5f5f5;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111">
<div style="max-width:440px;margin:0 auto;background:#fff;padding:32px 28px;border:1px solid #e5e5e5">
<p style="margin:0 0 20px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#777">${escapeHtml(SITE_NAME)}</p>
<p style="margin:0 0 8px;font-size:15px">Kode masuk kamu:</p>
<p style="margin:0 0 24px;font-size:34px;font-weight:700;letter-spacing:.18em;font-family:Georgia,serif">${escapeHtml(kode)}</p>
<p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#444">Berlaku 10 menit dan cuma bisa dipakai sekali.</p>
<p style="margin:0;font-size:14px;line-height:1.6;color:#444">Kalau kamu gak merasa minta kode ini, abaikan saja email ini.</p>
</div>
<p style="max-width:440px;margin:16px auto 0;font-size:12px;color:#888;text-align:center">${escapeHtml(SITE_HOST)}</p>
</body></html>`;

  return kirimEmail({
    ke: email,
    subjek: `Kode masuk ${SITE_NAME}: ${kode}`,
    teks,
    html,
  });
}

export function kirimPeringatanMasuk(email: string): Promise<void> {
  const paragraf = [
    "Halo,",
    `Ada beberapa percobaan masuk ke akun ${SITE_NAME} kamu dengan kode yang salah. Demi keamanan, masuk lewat kode email kami tahan selama 1 jam.`,
    "Kalau itu kamu, tunggu sebentar lalu minta kode baru.",
    "Kalau bukan, gak perlu khawatir. Tanpa kode yang dikirim ke email ini, akunmu gak bisa dibuka.",
  ];
  const teks = [...paragraf, "", SITE_NAME, SITE_URL].join("\n\n");
  return kirimEmail({
    ke: email,
    subjek: `Ada yang mencoba masuk ke akun ${SITE_NAME} kamu`,
    teks,
    html: bungkus("Percobaan masuk ke akunmu", paragraf.map(escapeHtml)),
  });
}

export type KejadianNaskah = "terbit" | "revisi" | "ditolak" | "ubah-selesai";

function bungkus(judul: string, isi: string[]): string {
  const badan = isi.map((p) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:#333">${p}</p>`).join("");
  return `<!doctype html><html lang="id"><body style="margin:0;padding:32px 16px;background:#f5f5f5;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111">
<div style="max-width:480px;margin:0 auto;background:#fff;padding:32px 28px;border:1px solid #e5e5e5">
<p style="margin:0 0 20px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#777">${escapeHtml(SITE_NAME)}</p>
<p style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:700;font-family:Georgia,serif">${escapeHtml(judul)}</p>
${badan}
</div>
<p style="max-width:480px;margin:16px auto 0;font-size:12px;color:#888;text-align:center">${escapeHtml(SITE_HOST)}</p>
</body></html>`;
}

export function kirimKabarNaskah(
  email: string,
  nama: string,
  kejadian: KejadianNaskah,
  judulNaskah: string,
  alasan: string,
  link: string | null
): Promise<void> {
  const sapa = nama.trim() ? `Halo ${nama.trim()},` : "Halo,";
  const akun = `${SITE_URL}/akun/`;
  const judul = judulNaskah.trim() || "tulisanmu";
  let subjek: string;
  let paragraf: string[];

  if (kejadian === "terbit") {
    subjek = `Tulisanmu terbit: ${judul}`;
    paragraf = [
      sapa,
      `Tulisan kamu "${judul}" sudah terbit di ${SITE_NAME}.`,
      link ? `Baca di sini: ${link}` : "Bisa kamu lihat dari halaman akun.",
      "Terima kasih sudah menulis bareng kami.",
    ];
  } else if (kejadian === "ubah-selesai") {
    subjek = `Permintaan perubahan selesai: ${judul}`;
    paragraf = [
      sapa,
      `Redaksi sudah menindaklanjuti permintaan perubahanmu untuk "${judul}".`,
      alasan.trim() ? `Permintaanmu:\n${alasan.trim()}` : "",
      link ? `Cek hasilnya di sini: ${link}` : "Bisa kamu cek dari halaman akun.",
      "Kalau masih ada yang kurang pas, kirim permintaan baru dari Tulisanmu.",
    ].filter(Boolean);
  } else if (kejadian === "revisi") {
    subjek = `Perlu revisi: ${judul}`;
    paragraf = [
      sapa,
      `Redaksi sudah membaca "${judul}" dan minta beberapa perbaikan sebelum terbit.`,
      alasan.trim() ? `Catatan redaksi:\n${alasan.trim()}` : "",
      `Buka halaman akun kamu, pilih tulisan ini, lalu kirim ulang setelah diperbaiki: ${akun}`,
    ].filter(Boolean);
  } else {
    subjek = `Kabar soal naskah: ${judul}`;
    paragraf = [
      sapa,
      `Maaf, kali ini "${judul}" belum bisa kami terbitkan.`,
      alasan.trim() ? `Catatan redaksi:\n${alasan.trim()}` : "",
      "Jangan kapok. Kamu tetap bisa kirim tulisan lain kapan saja lewat halaman akun.",
    ].filter(Boolean);
  }

  const teks = [...paragraf, "", SITE_NAME, SITE_URL].join("\n\n").replace(/\n\n\n/g, "\n\n");
  const html = bungkus(
    kejadian === "terbit"
      ? "Tulisanmu terbit"
      : kejadian === "ubah-selesai"
        ? "Permintaanmu sudah ditindaklanjuti"
        : kejadian === "revisi"
          ? "Perlu sedikit perbaikan"
          : "Belum bisa terbit",
    paragraf.map((p) =>
      escapeHtml(p)
        .replace(/\n/g, "<br>")
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#111">$1</a>')
    )
  );

  return kirimEmail({ ke: email, subjek, teks, html });
}
