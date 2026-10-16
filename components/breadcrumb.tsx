import Link from "next/link";
import { Fragment } from "react";

export interface Jejak {
  nama: string;
  href?: string;
}

export default function Breadcrumb({ jejak }: { jejak: Jejak[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 font-sans text-[12px] text-neutral-500">
      {jejak.map((j, i) => (
        <Fragment key={`${j.nama}-${i}`}>
          {i > 0 && (
            <span aria-hidden className="opacity-40">
              /
            </span>
          )}
          {j.href ? (
            <Link href={j.href} className="transition-colors hover:text-ink dark:hover:text-paper">
              {j.nama}
            </Link>
          ) : (
            <span aria-current="page">{j.nama}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
