"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AvatarAkun } from "@/components/akun/avatar-akun";
import {
  BIO_MAX,
  BIO_MIN,
  JABATAN_MAX,
  LABEL_MEDSOS,
  MEDSOS,
  NAMA_MAX,
  USERNAME_MAX,
  cekHandle,
  cekUsername,
  type Medsos,
} from "@/lib/akun/profil";
import { muatAkun } from "@/lib/akun/toko";
import { SITE_HOST, SITE_NAME } from "@/lib/situs";

export interface ProfilAwal {
  nama: string;
  email: string;
  image: string | null;
  username: string | null;
  usernameLama: string | null;
  saranUsername: string;
  jabatan: string;
  bio: string;
  website: string;
  medsos: Partial<Record<Medsos, string>>;
  profilLengkap: boolean;
}

type CekUsername = { untuk: string; keadaan: "diam" | "cek" | "ok" | "salah"; pesan?: string };

const KOLOM =
  "h-11 w-full rounded-xl border border-neutral-300 bg-paper px-4 text-[15px] text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-ink disabled:bg-neutral-100 disabled:text-neutral-500 dark:border-neutral-700 dark:bg-night dark:text-paper dark:focus:border-paper dark:disabled:bg-neutral-900";
const LABEL = "block text-[12px] font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400";
const BANTUAN = "mt-1.5 text-[12px] leading-snug text-neutral-500";
const SALAH = "mt-1.5 text-[12px] leading-snug text-red-700 dark:text-red-400";
const SESUAI = "mt-1.5 text-[12px] leading-snug text-green-700 dark:text-green-500";

function PensilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function PengaturanForm({ awal }: { awal: ProfilAwal }) {
  const router = useRouter();
  const [nama, setNama] = useState(awal.nama);
  const [username, setUsername] = useState(awal.username ?? awal.usernameLama ?? awal.saranUsername);
  const [jabatan, setJabatan] = useState(awal.jabatan);
  const [bio, setBio] = useState(awal.bio);
  const [website, setWebsite] = useState(awal.website);
  const [medsos, setMedsos] = useState<Partial<Record<Medsos, string>>>(awal.medsos);
  const [image, setImage] = useState(awal.image);
  const [cek, setCek] = useState<CekUsername>({ untuk: "", keadaan: "diam" });
  const [paham, setPaham] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [unggah, setUnggah] = useState(false);
  const [pesan, setPesan] = useState<{ jenis: "ok" | "salah"; teks: string; bidang?: string } | null>(null);
  const berkas = useRef<HTMLInputElement>(null);
  const usernameTerkunci = Boolean(awal.username || awal.usernameLama);

  const salahLokal = usernameTerkunci || !username ? null : cekUsername(username);
  const cekBerlaku = cek.untuk === username ? cek : null;

  useEffect(() => {
    if (usernameTerkunci || !username || cekUsername(username)) return;
    const nilai = username;
    let aktif = true;
    const id = window.setTimeout(async () => {
      setCek({ untuk: nilai, keadaan: "cek" });
      try {
        const res = await fetch(`/api/akun/username/?u=${encodeURIComponent(nilai)}`);
        const data = (await res.json()) as { tersedia: boolean; pesan?: string | null };
        if (!aktif) return;
        setCek(
          data.tersedia
            ? { untuk: nilai, keadaan: "ok" }
            : { untuk: nilai, keadaan: "salah", pesan: data.pesan ?? "Gak tersedia." }
        );
      } catch {
        if (aktif) setCek({ untuk: nilai, keadaan: "diam" });
      }
    }, 450);
    return () => {
      aktif = false;
      window.clearTimeout(id);
    };
  }, [username, usernameTerkunci]);

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesan(null);
    if (!usernameTerkunci) {
      const masalah = salahLokal ?? (cekBerlaku?.keadaan === "salah" ? cekBerlaku.pesan : null);
      if (masalah) {
        setPesan({ jenis: "salah", teks: masalah, bidang: "username" });
        return;
      }
      if (!paham) {
        setPesan({ jenis: "salah", teks: "Centang dulu pernyataan soal username.", bidang: "username" });
        return;
      }
    }
    const medsosSalah = MEDSOS.find((jenis) => medsos[jenis] && cekHandle(jenis, medsos[jenis]));
    if (medsosSalah) {
      setPesan({ jenis: "salah", teks: "Cek lagi isian media sosial.", bidang: `medsos.${medsosSalah}` });
      return;
    }
    if (bio.trim().length < BIO_MIN) {
      setPesan({ jenis: "salah", teks: `Bio minimal ${BIO_MIN} karakter.`, bidang: "bio" });
      return;
    }
    setSibuk(true);
    try {
      const res = await fetch("/api/akun/profil/", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nama: nama.trim(),
          username: usernameTerkunci ? undefined : username.trim().toLowerCase(),
          jabatan: jabatan.trim(),
          bio: bio.trim(),
          website: website.trim(),
          medsos,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        pesan?: string;
        bidang?: string;
        image?: string | null;
      };
      if (!res.ok) {
        setPesan({ jenis: "salah", teks: data.pesan ?? "Profil gagal disimpan.", bidang: data.bidang });
        return;
      }
      if (data.image) setImage(data.image);
      setPesan({
        jenis: "ok",
        teks: awal.profilLengkap ? "Perubahan tersimpan." : `Kamu resmi jadi warga ${SITE_NAME}.`,
      });
      await muatAkun(true);
      if (awal.profilLengkap) router.refresh();
      else router.push("/akun/?baru=1");
    } catch {
      setPesan({ jenis: "salah", teks: "Jaringan bermasalah. Coba lagi." });
    } finally {
      setSibuk(false);
    }
  };

  const unggahFoto = async (file: File) => {
    setPesan(null);
    setUnggah(true);
    try {
      const form = new FormData();
      form.set("foto", file);
      const res = await fetch("/api/akun/avatar/", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { image?: string; pesan?: string };
      if (!res.ok || !data.image) {
        setPesan({ jenis: "salah", teks: data.pesan ?? "Foto gagal diunggah." });
        return;
      }
      setImage(data.image);
      await muatAkun(true);
    } catch {
      setPesan({ jenis: "salah", teks: "Jaringan bermasalah. Coba lagi." });
    } finally {
      setUnggah(false);
      if (berkas.current) berkas.current.value = "";
    }
  };

  const panjangBio = bio.trim().length;

  return (
    <form onSubmit={simpan} noValidate className="mt-8">
      <div className="flex items-center gap-5">
        <div className="relative">
          <AvatarAkun nama={nama || awal.nama} src={image} ukuran={88} className={unggah ? "opacity-50" : ""} />
          <button
            type="button"
            onClick={() => berkas.current?.click()}
            disabled={unggah || !awal.profilLengkap}
            aria-label="Ganti foto profil"
            title={awal.profilLengkap ? "Ganti foto profil" : "Simpan profil dulu, lalu ganti foto"}
            className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-paper bg-ink text-paper transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-night dark:bg-paper dark:text-ink dark:hover:bg-neutral-200"
          >
            <PensilIcon className="h-3.5 w-3.5" />
          </button>
          <input
            ref={berkas}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void unggahFoto(file);
            }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] leading-snug text-neutral-600 dark:text-neutral-400">
            {image ? "Foto dari akun Google kamu dipakai sebagai awal." : "Belum ada foto. Inisial nama yang tampil."}
          </p>
          <p className="mt-1 text-[12px] text-neutral-500">JPG, PNG, atau WebP. Maksimal 8 MB.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6">
        <div>
          <label htmlFor="akun-nama" className={LABEL}>Nama</label>
          <input
            id="akun-nama"
            value={nama}
            maxLength={NAMA_MAX}
            onChange={(e) => setNama(e.target.value)}
            autoComplete="name"
            className={`${KOLOM} mt-1.5`}
          />
          <p className={BANTUAN}>Nama yang tampil di byline tulisan kamu.</p>
        </div>

        <div>
          <label htmlFor="akun-username" className={LABEL}>Username</label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[15px] text-neutral-400">
              {SITE_HOST}/author/
            </span>
            <input
              id="akun-username"
              value={username}
              maxLength={USERNAME_MAX}
              disabled={usernameTerkunci}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              autoComplete="off"
              spellCheck={false}
              className={`${KOLOM} pl-[8.9rem]`}
            />
          </div>
          {usernameTerkunci ? (
            <p className={BANTUAN}>
              {awal.username ? "Username sudah ditetapkan dan gak bisa diubah." : `Username dari akun lama kamu di ${SITE_NAME}.`}
            </p>
          ) : salahLokal ? (
            <p className={SALAH}>{salahLokal}</p>
          ) : cekBerlaku?.keadaan === "salah" ? (
            <p className={SALAH}>{cekBerlaku.pesan}</p>
          ) : cekBerlaku?.keadaan === "ok" ? (
            <p className={SESUAI}>Tersedia.</p>
          ) : cekBerlaku?.keadaan === "cek" ? (
            <p className={BANTUAN}>Mengecek…</p>
          ) : (
            <p className={BANTUAN}>Huruf kecil, angka, dan tanda hubung.</p>
          )}
          {!usernameTerkunci && (
            <label className="mt-3 flex items-start gap-2.5 text-[13px] leading-snug text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={paham}
                onChange={(e) => setPaham(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-ink dark:accent-paper"
              />
              Saya paham username cuma bisa ditetapkan sekali dan gak bisa diubah lagi.
            </label>
          )}
        </div>

        <div>
          <label htmlFor="akun-email" className={LABEL}>Email</label>
          <input id="akun-email" value={awal.email} disabled className={`${KOLOM} mt-1.5`} />
          <p className={BANTUAN}>Email mengikuti akun yang kamu pakai untuk masuk.</p>
        </div>

        <div>
          <label htmlFor="akun-jabatan" className={LABEL}>Jabatan</label>
          <input
            id="akun-jabatan"
            value={jabatan}
            maxLength={JABATAN_MAX}
            onChange={(e) => setJabatan(e.target.value)}
            placeholder="Misalnya: Peneliti kebijakan publik"
            className={`${KOLOM} mt-1.5`}
          />
          <p className={BANTUAN}>Tampil di bawah nama kamu.</p>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="akun-bio" className={LABEL}>Bio</label>
            <span className={`text-[12px] ${panjangBio < BIO_MIN ? "text-neutral-500" : "text-ink dark:text-paper"}`}>
              {panjangBio}/{BIO_MAX}
            </span>
          </div>
          <textarea
            id="akun-bio"
            value={bio}
            maxLength={BIO_MAX}
            onChange={(e) => {
              setBio(e.target.value);
              if (pesan?.bidang === "bio") setPesan(null);
            }}
            rows={5}
            placeholder="Ceritakan siapa kamu, apa yang kamu tekuni, dan kenapa kamu menulis."
            className={`${KOLOM} mt-1.5 h-auto resize-y py-3 leading-relaxed`}
          />
          <p className={panjangBio === 0 ? BANTUAN : panjangBio < BIO_MIN ? SALAH : SESUAI}>
            {panjangBio === 0
              ? `Minimal ${BIO_MIN} karakter.`
              : panjangBio < BIO_MIN
                ? `Kurang ${BIO_MIN - panjangBio} karakter lagi. Minimal ${BIO_MIN} karakter.`
                : "Tampil di halaman penulis dan di akhir tulisan kamu."}
          </p>
        </div>

        <div>
          <label htmlFor="akun-website" className={LABEL}>Website</label>
          <input
            id="akun-website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
            inputMode="url"
            className={`${KOLOM} mt-1.5`}
          />
          <p className={pesan?.bidang === "website" ? SALAH : BANTUAN}>
            {pesan?.bidang === "website" ? pesan.teks : "Opsional."}
          </p>
        </div>

        <fieldset>
          <legend className={LABEL}>Media sosial</legend>
          <p className={BANTUAN}>Opsional. Cukup username, tanpa tanda @.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {MEDSOS.map((jenis) => (
              <div key={jenis}>
                <label htmlFor={`akun-medsos-${jenis}`} className="block text-[12px] text-neutral-500">
                  {LABEL_MEDSOS[jenis]}
                </label>
                <input
                  id={`akun-medsos-${jenis}`}
                  value={medsos[jenis] ?? ""}
                  maxLength={120}
                  onChange={(e) => {
                    if (pesan?.bidang === `medsos.${jenis}`) setPesan(null);
                    setMedsos((m) => {
                      const baru = { ...m };
                      const nilai = e.target.value.replace(/^@/, "");
                      if (nilai) baru[jenis] = nilai;
                      else delete baru[jenis];
                      return baru;
                    });
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  className={`${KOLOM} mt-1 h-10 text-[14px] ${
                    medsos[jenis] && cekHandle(jenis, medsos[jenis]) ? "border-red-600 dark:border-red-500" : ""
                  }`}
                />
                {medsos[jenis] && cekHandle(jenis, medsos[jenis]) && (
                  <p className={SALAH}>{cekHandle(jenis, medsos[jenis])}</p>
                )}
              </div>
            ))}
          </div>
        </fieldset>
      </div>

      {pesan?.bidang === "username" && <p className={`${SALAH} mt-6`}>{pesan.teks}</p>}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={sibuk || unggah}
          className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-[14px] font-semibold text-paper transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-paper dark:text-ink dark:hover:bg-neutral-200"
        >
          {sibuk ? "Menyimpan…" : awal.profilLengkap ? "Simpan perubahan" : "Simpan profil"}
        </button>
        {pesan && !pesan.bidang && (
          <p
            role="status"
            className={`text-[13px] leading-snug ${pesan.jenis === "ok" ? "text-neutral-600 dark:text-neutral-400" : "text-red-700 dark:text-red-400"}`}
          >
            {pesan.teks}
          </p>
        )}
      </div>
    </form>
  );
}
