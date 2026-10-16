"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TAB = [
  { href: "/akun/", label: "Tulisanmu" },
  { href: "/akun/pengaturan/", label: "Pengaturan" },
];

export function NavAkun() {
  const pathname = usePathname().replace(/\/+$/, "") || "/";
  return (
    <nav aria-label="Akun" className="mb-8 flex gap-6 border-b border-neutral-200 dark:border-neutral-800">
      {TAB.map((t) => {
        const aktif = pathname === t.href.replace(/\/+$/, "");
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={aktif ? "page" : undefined}
            className={`-mb-px border-b-2 pb-3 text-[14px] font-semibold transition-colors ${
              aktif
                ? "border-ink text-ink dark:border-paper dark:text-paper"
                : "border-transparent text-neutral-500 hover:text-ink dark:hover:text-paper"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
