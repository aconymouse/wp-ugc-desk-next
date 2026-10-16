import type { Metadata } from "next";
import { Crimson_Pro, Inter } from "next/font/google";
import Link from "next/link";
import Logo from "@/components/logo";
import { BellIcon } from "@/components/icons";
import MasukModal from "@/components/akun/masuk-modal";
import { TombolAkun } from "@/components/akun/tombol-akun";
import { AKUN_AKTIF } from "@/lib/akun/env";
import { PUSH_AKTIF } from "@/lib/push/env";
import { SITE_NAME, SITE_URL } from "@/lib/situs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const crimson = Crimson_Pro({ subsets: ["latin"], variable: "--font-crimson" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  formatDetection: { telephone: false, date: false, address: false, email: false },
};

const TEMA =
  '(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA }} />
      </head>
      <body className={`${inter.variable} ${crimson.variable} font-sans`}>
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
            <Link href="/" aria-label={`${SITE_NAME} beranda`}>
              <Logo />
            </Link>
            <nav className="flex items-center gap-4 text-[13px] font-semibold">
              {AKUN_AKTIF && (
                <Link href="/kirim-tulisan/" className="hidden hover:underline sm:inline">
                  Kirim tulisan
                </Link>
              )}
              {PUSH_AKTIF && (
                <Link href="/notifikasi/" aria-label="Notifikasi" className="flex h-9 w-9 items-center justify-center">
                  <BellIcon className="h-5 w-5" />
                </Link>
              )}
              {AKUN_AKTIF && <TombolAkun />}
            </nav>
          </div>
        </header>
        <main id="konten" tabIndex={-1}>
          {children}
        </main>
        {AKUN_AKTIF && <MasukModal />}
      </body>
    </html>
  );
}
