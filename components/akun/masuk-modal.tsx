"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Logo from "@/components/logo";
import { CloseIcon } from "@/components/icons";
import { Kaca } from "@/components/akun/kaca";
import { Turnstile } from "@/components/akun/turnstile";
import { MASUK_EMAIL, PESAN_TERKUNCI } from "@/lib/akun/env";
import { authClient } from "@/lib/akun/klien";
import { ambilTetapDiSini } from "@/lib/akun/laporan";
import {
  ambilLanjut,
  bacaAkun,
  bacaAkunServer,
  bacaMasuk,
  bacaMasukServer,
  bukaMasuk,
  langgananAkun,
  langgananMasuk,
  muatAkun,
  muatAkunKalauAda,
  pasangPetunjuk,
  tutupMasuk,
} from "@/lib/akun/toko";
import { SITE_NAME } from "@/lib/situs";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const JEDA_KIRIM_ULANG = 45;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Tahap = "pilih" | "kode";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1C3.3 21.3 7.3 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3c-.5-1.5-.5-3.1 0-4.6V6.6H1.3c-1.7 3.4-1.7 7.4 0 10.8l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.7c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.6l4 3.1c.9-2.9 3.6-5 6.7-5z"
      />
    </svg>
  );
}

function pisahkanParam(): { masuk: string | null; lanjut: string | null } {
  const params = new URLSearchParams(window.location.search);
  const masuk = params.get("masuk");
  const lanjut = params.get("lanjut");
  if (!masuk && !lanjut) return { masuk: null, lanjut: null };
  params.delete("masuk");
  params.delete("lanjut");
  const sisa = params.toString();
  const bersih = `${window.location.pathname}${sisa ? `?${sisa}` : ""}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", bersih);
  return { masuk, lanjut: lanjut && lanjut.startsWith("/") && !lanjut.startsWith("//") ? lanjut : null };
}

function urlKembali(lanjut: string | null): string {
  const params = new URLSearchParams(window.location.search);
  params.set("masuk", "ok");
  if (lanjut) params.set("lanjut", lanjut);
  return `${window.location.pathname}?${params.toString()}`;
}

export default function MasukModal() {
  const keadaan = useSyncExternalStore(langgananMasuk, bacaMasuk, bacaMasukServer);
  const akun = useSyncExternalStore(langgananAkun, bacaAkun, bacaAkunServer);
  const router = useRouter();
  const pathname = usePathname();

  const setelahMasuk = useCallback(
    (lanjut: string | null) => {
      const { user } = bacaAkun();
      if (!user) return;
      if (ambilTetapDiSini()) return;
      const diPengaturan = pathname.replace(/\/+$/, "") === "/akun/pengaturan";
      if (user.peran === "kontributor" && !user.profilLengkap && !diPengaturan) {
        router.push("/akun/pengaturan/");
        return;
      }
      if (lanjut && lanjut !== pathname) router.push(lanjut);
    },
    [pathname, router]
  );

  useEffect(() => {
    const { masuk, lanjut } = pisahkanParam();
    if (masuk === "ok") {
      pasangPetunjuk();
      void muatAkun(true).then(() => setelahMasuk(lanjut));
      return;
    }
    if (masuk === "gagal") {
      bukaMasuk(lanjut);
      return;
    }
    if (masuk === "1") {
      bukaMasuk(lanjut);
      return;
    }
    muatAkunKalauAda();
  }, [setelahMasuk]);

  if (!keadaan.terbuka) return null;

  return createPortal(
    <Dialog
      sudahMasuk={akun.status === "masuk"}
      namaMasuk={akun.user?.name ?? ""}
      onTutup={tutupMasuk}
      onBerhasil={() => {
        tutupMasuk();
        setelahMasuk(ambilLanjut());
      }}
    />,
    document.body
  );
}

function Dialog({
  sudahMasuk,
  namaMasuk,
  onTutup,
  onBerhasil,
}: {
  sudahMasuk: boolean;
  namaMasuk: string;
  onTutup: () => void;
  onBerhasil: () => void;
}) {
  const wadah = useRef<HTMLDivElement>(null);
  const [tahap, setTahap] = useState<Tahap>("pilih");
  const [email, setEmail] = useState("");
  const [kode, setKode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState<"google" | "kirim" | "masuk" | null>(null);
  const [salah, setSalah] = useState<string | null>(null);
  const [jeda, setJeda] = useState(0);

  useEffect(() => {
    const pembuka = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const padding = document.body.style.paddingRight;
    const lebarScroll = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (lebarScroll > 0) document.body.style.paddingRight = `${lebarScroll}px`;
    wadah.current?.querySelector<HTMLElement>("[data-fokus-awal]")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onTutup();
        return;
      }
      if (e.key !== "Tab" || !wadah.current) return;
      const daftar = Array.from(wadah.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!daftar.length) return;
      const pertama = daftar[0];
      const terakhir = daftar[daftar.length - 1];
      if (e.shiftKey && document.activeElement === pertama) {
        e.preventDefault();
        terakhir.focus();
      } else if (!e.shiftKey && document.activeElement === terakhir) {
        e.preventDefault();
        pertama.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = padding;
      window.removeEventListener("keydown", onKey);
      pembuka?.focus();
    };
  }, [onTutup]);

  useEffect(() => {
    if (jeda <= 0) return;
    const id = window.setTimeout(() => setJeda((j) => j - 1), 1000);
    return () => window.clearTimeout(id);
  }, [jeda]);

  const lewatGoogle = async () => {
    setSalah(null);
    setSibuk("google");
    const lanjut = bacaMasuk().lanjut;
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: urlKembali(lanjut),
      errorCallbackURL: `${window.location.pathname}?masuk=gagal`,
      newUserCallbackURL: "/akun/?masuk=ok",
    });
    if (error) {
      setSibuk(null);
      setSalah("Google gak merespons. Coba lagi.");
    }
  };

  const kirimKode = async () => {
    const alamat = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alamat)) {
      setSalah("Alamat email gak valid.");
      return;
    }
    setSalah(null);
    setSibuk("kirim");
    try {
      const res = await fetch("/api/akun/kode/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: alamat, token }),
      });
      const data = (await res.json().catch(() => ({}))) as { pesan?: string };
      if (!res.ok) {
        setSalah(data.pesan ?? "Kode gagal dikirim.");
        return;
      }
      setEmail(alamat);
      setKode("");
      setTahap("kode");
      setJeda(JEDA_KIRIM_ULANG);
      requestAnimationFrame(() => {
        wadah.current?.querySelector<HTMLElement>("#akun-kode")?.focus();
      });
    } catch {
      setSalah("Jaringan bermasalah. Coba lagi.");
    } finally {
      setSibuk(null);
    }
  };

  const masukDenganKode = async () => {
    const angka = kode.replace(/\D/g, "");
    if (angka.length !== 6) {
      setSalah("Masukkan 6 angka dari email.");
      return;
    }
    setSalah(null);
    setSibuk("masuk");
    const { error } = await authClient.signIn.emailOtp({ email, otp: angka });
    if (error) {
      setSibuk(null);
      setSalah(
        error.code === "AKUN_TERKUNCI"
          ? PESAN_TERKUNCI
          : error.status === 429
            ? "Terlalu sering. Tunggu beberapa menit lalu coba lagi."
            : error.code === "TOO_MANY_ATTEMPTS"
              ? "Terlalu banyak percobaan. Minta kode baru."
              : error.code === "OTP_EXPIRED"
                ? "Kode sudah kedaluwarsa. Minta kode baru."
                : "Kode gak cocok. Cek lagi emailnya."
      );
      return;
    }
    pasangPetunjuk();
    await muatAkun(true);
    setSibuk(null);
    onBerhasil();
  };

  const tombolUtama =
    "flex h-11 w-full items-center justify-center rounded-full bg-ink px-5 text-[14px] font-semibold text-paper transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-paper dark:text-ink dark:hover:bg-neutral-200";
  const tombolGaris =
    "flex h-11 w-full items-center justify-center gap-3 rounded-full border border-neutral-300/80 bg-paper/70 px-5 text-[14px] font-semibold text-ink transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-night/60 dark:text-paper dark:hover:bg-neutral-900";
  const kolom =
    "h-11 w-full rounded-xl border border-neutral-300/80 bg-paper/70 px-4 text-[15px] text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-ink dark:border-neutral-700 dark:bg-night/60 dark:text-paper dark:focus:border-paper";

  return (
    <div className="akun-tirai" onPointerDown={(e) => e.target === e.currentTarget && onTutup()}>
      <Kaca
        role="dialog"
        aria-modal="true"
        aria-labelledby="akun-judul"
        className="text-ink dark:text-paper"
      >
        <div ref={wadah} className="relative px-7 pt-7 pb-6 sm:px-8">
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup"
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-ink/5 hover:text-ink dark:hover:bg-paper/10 dark:hover:text-paper"
          >
            <CloseIcon className="h-5 w-5" />
          </button>

          <Logo className="h-6 w-auto" />

          {sudahMasuk ? (
            <>
              <h2 id="akun-judul" className="mt-6 font-serif text-[26px] leading-tight font-bold">
                Kamu sudah masuk
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                Sesi {namaMasuk ? `sebagai ${namaMasuk}` : "kamu"} masih aktif.
              </p>
              <Link href="/akun/" onClick={onTutup} className={`${tombolUtama} mt-6`} data-fokus-awal>
                Buka Akun saya
              </Link>
            </>
          ) : tahap === "pilih" ? (
            <>
              <h2 id="akun-judul" className="mt-6 font-serif text-[26px] leading-tight font-bold">
                Masuk ke {SITE_NAME}
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                Belum punya akun? Otomatis dibuatkan begitu kamu masuk.
              </p>

              <button
                type="button"
                onClick={lewatGoogle}
                disabled={sibuk !== null}
                className={`${tombolGaris} mt-6`}
                data-fokus-awal
              >
                <GoogleIcon className="h-[18px] w-[18px]" />
                {sibuk === "google" ? "Membuka Google…" : "Lanjut dengan Google"}
              </button>

              {MASUK_EMAIL && (
                <>
                  <div className="my-5 flex items-center gap-3 text-[12px] text-neutral-500">
                    <span className="h-px flex-1 bg-neutral-300/80 dark:bg-neutral-700" />
                    atau
                    <span className="h-px flex-1 bg-neutral-300/80 dark:bg-neutral-700" />
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void kirimKode();
                    }}
                    noValidate
                  >
                    <label htmlFor="akun-email" className="block text-[12px] font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
                      Email
                    </label>
                    <input
                      id="akun-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className={`${kolom} mt-1.5`}
                    />
                    <Turnstile siteKey={SITE_KEY} onToken={setToken} className="mt-3 empty:hidden" />
                    <button
                      type="submit"
                      disabled={sibuk !== null}
                      className={`${tombolUtama} mt-3`}
                    >
                      {sibuk === "kirim" ? "Mengirim kode…" : "Kirim kode masuk"}
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (
            <>
              <h2 id="akun-judul" className="mt-6 font-serif text-[26px] leading-tight font-bold">
                Cek email kamu
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                Kode 6 angka dikirim ke <span className="font-semibold text-ink dark:text-paper">{email}</span>.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setTahap("pilih");
                    setSalah(null);
                  }}
                  className="underline decoration-dotted underline-offset-4 hover:text-ink dark:hover:text-paper"
                >
                  Ganti email
                </button>
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void masukDenganKode();
                }}
                noValidate
                className="mt-6"
              >
                <label htmlFor="akun-kode" className="block text-[12px] font-semibold tracking-wide text-neutral-600 uppercase dark:text-neutral-400">
                  Kode masuk
                </label>
                <input
                  id="akun-kode"
                  type="text"
                  name="kode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={kode}
                  onChange={(e) => setKode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="······"
                  className={`${kolom} mt-1.5 text-center font-serif text-[26px] tracking-[0.45em] placeholder:tracking-[0.45em]`}
                  data-fokus-awal
                />
                <button type="submit" disabled={sibuk !== null} className={`${tombolUtama} mt-3`}>
                  {sibuk === "masuk" ? "Memeriksa…" : "Masuk"}
                </button>
              </form>

              <p className="mt-4 text-center text-[13px] text-neutral-500">
                {jeda > 0 ? (
                  <>Kirim ulang bisa dalam {jeda} detik</>
                ) : (
                  <button
                    type="button"
                    onClick={() => void kirimKode()}
                    disabled={sibuk !== null}
                    className="underline decoration-dotted underline-offset-4 hover:text-ink dark:hover:text-paper"
                  >
                    Kirim ulang kode
                  </button>
                )}
              </p>
            </>
          )}

          {salah && (
            <p role="alert" className="mt-4 text-[13px] leading-snug text-red-700 dark:text-red-400">
              {salah}
            </p>
          )}

          {!sudahMasuk && (
            <p className="mt-6 text-[11px] leading-relaxed text-neutral-500">
              Dengan masuk, kamu setuju dengan{" "}
              <Link href="/kebijakan-privasi/" className="underline decoration-dotted underline-offset-4 hover:text-ink dark:hover:text-paper">
                Kebijakan Privasi
              </Link>{" "}
              {SITE_NAME}.
            </p>
          )}
        </div>
      </Kaca>
    </div>
  );
}
