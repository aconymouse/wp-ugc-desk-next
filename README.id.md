# wp-ugc-desk-next

[English](README.md)

Situs depan Next.js buat [WP UGC Desk](https://github.com/aconymouse/wp-ugc-desk). Isinya akun pembaca, editor buat nulis, dan notifikasi push.

Pembaca masuk pakai Google atau kode dari email, isi profil penulis, lalu nulis langsung di situs. Pas dikirim, tulisannya diubah jadi blok Gutenberg dan masuk ke WordPress buat ditinjau redaksi. Status dan catatan revisinya bisa dilihat di halaman akun.

Dipakai tiap hari di [Owrite](https://www.owrite.id). Teks tampilannya bahasa Indonesia.

## Coba langsung

- [owrite.id/kirim-tulisan](https://www.owrite.id/kirim-tulisan/), masuk lalu coba editornya. Selama belum klik Kirim, nggak ada yang masuk ke redaksi.
- [owrite.id/notifikasi](https://www.owrite.id/notifikasi/), nyalakan notifikasi dan pilih kategori.

## Isinya

- Masuk pakai Google atau kode 6 digit lewat email. Kode berlaku 10 menit. Kalau salah 15 kali dalam sejam, email itu dikunci sejam dan pemiliknya dapat peringatan. Ada Cloudflare Turnstile biar nggak di-spam bot.
- Akun yang udah ada di WordPress dikenali lewat email. Admin, editor, dan author tetap dengan perannya.
- Profil penulis (foto, nama, jabatan, bio, medsos) yang jadi byline pas tulisan terbit. Tombol Kirim baru nyala kalau profilnya lengkap.
- Editor Tiptap: subjudul, kutipan, daftar, gambar, dan sematan YouTube, X, Instagram, TikTok, Threads. Draf disimpan ke browser tiap ngetik dan ke server tiap beberapa detik, jadi aman kalau internet putus.
- Halaman Tulisanmu: draf, yang lagi ditinjau, yang diminta revisi beserta catatannya, sampai yang udah terbit.
- Form lapor di tiap artikel.
- Notifikasi push tanpa layanan pihak ketiga. Pakai service worker, kunci VAPID, dan `web-push`.

## Kenapa dibikin begini

Orang yang mau nulis buat media biasanya cuma punya sedikit waktu dan sabar. Jadi yang paling aku jaga: tulisan mereka nggak hilang, dan mereka selalu tahu langkah berikutnya.

- Draf disimpan ke browser tiap ngetik dan ke server tiap beberapa detik. Sinyal putus di tengah paragraf nggak bikin tulisan hilang.
- Tombol Kirim baru nyala setelah profil lengkap, jadi tulisan nggak pernah terbit tanpa nama dan foto penulis.
- Catatan revisi muncul di halaman akun, di samping tulisannya, bukan cuma nyelip di email.
- Pilihan kategori notifikasi langsung tersimpan begitu dicentang. Nggak ada tombol Simpan yang kelupaan.
- Di iPhone, notifikasi baru jalan setelah situs ditambahkan ke Layar Utama. Yang muncul tombol yang ngajarin caranya, bukan tulisan "tidak didukung".
- Di Mac, notifikasi pakai gambar artikel sebagai ikon, karena macOS nggak nampilin gambar besar di notifikasi.

## Yang dibutuhkan

- Node.js 20.9 ke atas
- MySQL atau MariaDB
- WordPress dengan [WP UGC Desk](https://github.com/aconymouse/wp-ugc-desk) dan PublishPress Authors aktif
- Opsional: klien OAuth Google, akun [Brevo](https://www.brevo.com) buat email, Cloudflare Turnstile

## Cara jalanin

1. Pasang dan atur plugin [WP UGC Desk](https://github.com/aconymouse/wp-ugc-desk/blob/main/README.id.md#cara-pasang) dulu.
2. Bikin database dan impor tabelnya:

   ```
   mysql -u root -p -e "CREATE DATABASE ugc_desk"
   mysql -u root -p ugc_desk < db/schema.sql
   ```

3. Salin `.env.example` jadi `.env.local`, lalu isi. Minimal:
   - `WORDPRESS_API_URL`, misalnya `https://cms.contoh.com/wp-json`
   - `WORDPRESS_AUTH_USER` dan `WORDPRESS_AUTH_PASS`, Application Password admin
   - `UGC_DESK_SECRET`, sama persis kayak Kunci di plugin
   - `AKUN_DATABASE_URL`
   - `BETTER_AUTH_SECRET`, isi pakai `openssl rand -hex 32`
4. `npm install`, lalu `npm run dev`.
5. Buka `http://localhost:3000/kirim-tulisan`.

Biar gampang nyoba:

- Tanpa `BREVO_API_KEY`, email dicetak di terminal, termasuk kode masuknya.
- Tanpa kunci Turnstile, pengecekannya dilewati selama bukan production.
- `AKUN_WP_OFF=1` bikin halaman akun dan editor bisa dicoba tanpa WordPress sama sekali.

## Notifikasi push

1. Bikin kunci sekali: `npx web-push generate-vapid-keys`. Simpan baik-baik, karena kalau diganti, semua langganan lama putus.
2. Isi `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT_EMAIL`, lalu `NEXT_PUBLIC_PUSH=1`.
3. Di WordPress, centang "Kirim notifikasi ke pembaca" di pos yang mau dikirim.

Di iPhone dan iPad, notifikasi baru jalan setelah situs ditambahkan ke Layar Utama. Itu aturan Apple, bukan bug.

## Variabel lingkungan

| Variabel | Gunanya |
| --- | --- |
| `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_URL` | Nama dan alamat situs, dipakai di teks, email, dan metadata |
| `NEXT_PUBLIC_CMS_URL` | Alamat publik WordPress, buat tautan dan gambar |
| `NEXT_PUBLIC_AKUN`, `NEXT_PUBLIC_PUSH` | Nyalakan fitur, isi `1` |
| `NEXT_PUBLIC_AKUN_EMAIL` | Isi `0` kalau cuma mau masuk pakai Google |
| `WORDPRESS_API_URL` | Alamat REST WordPress |
| `WORDPRESS_API_URL_BUILD` | Opsional, alamat REST waktu build kalau yang biasa ada di jaringan privat |
| `WORDPRESS_AUTH_USER`, `WORDPRESS_AUTH_PASS` | Application Password admin |
| `UGC_DESK_SECRET` | Kunci bersama dengan plugin |
| `AKUN_DATABASE_URL` | Koneksi MySQL atau MariaDB |
| `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` | Alamat dan rahasia Better Auth |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Masuk pakai Google |
| `BREVO_API_KEY`, `BREVO_PENGIRIM` | Kirim email dan alamat pengirimnya |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` | Cloudflare Turnstile |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT_EMAIL` | Notifikasi push |

## Nggak pakai Next.js?

Nggak masalah. Plugin-nya bisa dipakai stack apa saja. Repo ini cukup jadi contoh, dan semua request serta webhook-nya ada di [dokumentasi API](https://github.com/aconymouse/wp-ugc-desk/blob/main/docs/api.id.md).

## Susunan folder

```
app/akun/            halaman akun, pengaturan, editor
app/api/akun/        profil, avatar, gambar, draf, kirim, laporan, webhook
app/api/push/        langganan, pilihan kategori, ganti kunci, kirim
components/akun/     dialog masuk, tombol akun, form profil
components/naskah/   editor dan daftar tulisan
components/push/     pengaturan notifikasi
lib/akun/            login, database, email, batas percobaan, klien WordPress
lib/naskah/          ubah ke Gutenberg, draf lokal
lib/push/            langganan dan pengiriman
db/schema.sql        semua tabel
```

## Tentang pembuatnya

Aku Hafidz Nc, dikenal juga sebagai Aconymous. Founder [Owrite](https://www.owrite.id), dan yang ngerjain produknya sendiri, dari desain sampai kode.

Fokusku di UI/UX. Buatku tampilan itu bagian dari produk, sama pentingnya kayak fiturnya. Fitur yang ribet dipakai ujung-ujungnya ditinggal, dan di media itu langsung kerasa ke bisnis: naskah yang batal dikirim, atau pembaca yang nggak balik lagi. Makanya aku lebih sering ngabisin waktu di detail kecil kayak di bagian [Kenapa dibikin begini](#kenapa-dibikin-begini) daripada nambah fitur baru.

[aconymous.com](https://aconymous.com) · [GitHub](https://github.com/aconymouse) · [LinkedIn](https://www.linkedin.com/in/tjuanmudaco/)

Lisensi MIT.
