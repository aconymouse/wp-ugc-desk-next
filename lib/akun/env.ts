export const AKUN_AKTIF = process.env.NEXT_PUBLIC_AKUN === "1";
export const MASUK_EMAIL = process.env.NEXT_PUBLIC_AKUN_EMAIL !== "0";
export const WP_OFF = process.env.AKUN_WP_OFF === "1";
export const PRODUKSI = process.env.NODE_ENV === "production";
export const KUKI_PETUNJUK = "ugcd_masuk";
export const SESI_HARI = 30;
export const PESAN_TERKUNCI = "Terlalu banyak percobaan untuk email ini. Coba lagi dalam 1 jam.";
