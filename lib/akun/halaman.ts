import { SITE_NAME, SITE_URL } from "@/lib/situs";
import { KATA_MAKS, KATA_MIN } from "@/lib/naskah/blok";

export const KIRIM_PATH = "/kirim-tulisan/";
export const KETENTUAN_PATH = "/ketentuan-kontributor/";
export const KIRIM_URL = `${SITE_URL}${KIRIM_PATH}`;

export const KIRIM_JUDUL = `Kirim Tulisan ke ${SITE_NAME}`;
export const KIRIM_DESKRIPSI = `Punya cerita, opini, atau temuan yang layak dibaca orang banyak? Tulis di ${SITE_NAME}. Naskah ${KATA_MIN} sampai ${KATA_MAKS} kata, dibaca redaksi, terbit dengan namamu sebagai Kolumnis.`;

export const KIRIM_FAQ: { tanya: string; jawab: string }[] = [
  {
    tanya: `Siapa yang boleh mengirim tulisan ke ${SITE_NAME}?`,
    jawab:
      `Siapa saja yang punya akun ${SITE_NAME}. Masuk pakai Google atau email, lengkapi profil (nama, username, foto, bio minimal 135 karakter), lalu tombol Kirim tulisan muncul di halaman akun kamu.`,
  },
  {
    tanya: "Berapa panjang tulisan yang diterima?",
    jawab: `Antara ${KATA_MIN} sampai ${KATA_MAKS} kata. Wajib ada judul dan satu kategori. Gambar utama, deskripsi singkat, dan tag boleh ditambahkan supaya tulisanmu lebih gampang ditemukan.`,
  },
  {
    tanya: "Apa yang terjadi setelah saya mengirim?",
    jawab:
      "Naskah masuk ke antrean redaksi dengan status Menunggu review. Redaksi bisa menerbitkannya, meminta revisi dengan catatan, atau menolaknya. Setiap keputusan dikirim ke email kamu dan terlihat di daftar Tulisanmu.",
  },
  {
    tanya: "Apakah tulisan saya akan disunting?",
    jawab:
      `Bisa. Redaksi berhak merapikan judul, ejaan, struktur, dan gambar supaya sesuai gaya ${SITE_NAME}, tanpa mengubah maksud tulisanmu. Kalau perubahannya besar, redaksi akan minta revisi dulu ke kamu.`,
  },
  {
    tanya: "Apakah saya dibayar?",
    jawab:
      "Untuk saat ini tidak ada honorarium. Tulisan terbit dengan namamu sebagai Kolumnis, lengkap dengan foto, bio, dan tautan media sosial dari profil akun kamu.",
  },
  {
    tanya: "Bolehkah mengirim tulisan yang sudah tayang di tempat lain?",
    jawab:
      `Tidak. ${SITE_NAME} hanya menerima naskah orisinal yang belum pernah terbit di media, blog, atau platform lain, termasuk akun media sosial pribadi dalam bentuk utuh.`,
  },
  {
    tanya: "Bisakah tulisan yang sudah terbit diubah?",
    jawab:
      "Tulisan yang sudah terbit tidak bisa diedit langsung dari akun. Kirim permintaan perubahan dari halaman akun kamu, redaksi yang akan menyesuaikan.",
  },
];
