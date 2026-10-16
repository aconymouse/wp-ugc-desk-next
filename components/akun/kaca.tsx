"use client";

import { useEffect, useRef, useState, type HTMLAttributes } from "react";

const LENSA_ID = "ugcd-lensa";

function petaGradien(arah: "x" | "y", warna: "R" | "G"): string {
  const stops = [
    [0, 0],
    [0.14, 58],
    [0.5, 128],
    [0.86, 198],
    [1, 255],
  ]
    .map(([posisi, nilai]) => {
      const rgb = warna === "R" ? `rgb(${nilai},0,0)` : `rgb(0,${nilai},0)`;
      return `<stop offset='${posisi}' stop-color='${rgb}'/>`;
    })
    .join("");
  const sumbu = arah === "x" ? "x1='0' y1='0' x2='1' y2='0'" : "x1='0' y1='0' x2='0' y2='1'";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><defs><linearGradient id='g' ${sumbu}>${stops}</linearGradient></defs><rect width='64' height='64' fill='url(#g)'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const PETA_X = petaGradien("x", "R");
const PETA_Y = petaGradien("y", "G");

function dukungLensa(): boolean {
  if (typeof window === "undefined") return false;
  if (!("chrome" in window)) return false;
  try {
    return CSS.supports("backdrop-filter", `url(#${LENSA_ID})`);
  } catch {
    return false;
  }
}

function Lensa() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <filter
        id={LENSA_ID}
        x="0"
        y="0"
        width="100%"
        height="100%"
        colorInterpolationFilters="sRGB"
      >
        <feImage href={PETA_X} preserveAspectRatio="none" result="merah" />
        <feImage href={PETA_Y} preserveAspectRatio="none" result="hijau" />
        <feComposite in="merah" in2="hijau" operator="arithmetic" k2="1" k3="1" result="peta" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="peta"
          scale="16"
          xChannelSelector="R"
          yChannelSelector="G"
          result="bias"
        />
        <feGaussianBlur in="bias" stdDeviation="13" result="kabur" />
        <feColorMatrix in="kabur" type="saturate" values="1.7" />
      </filter>
    </svg>
  );
}

interface Pegas {
  nilai: number;
  laju: number;
}

function langkah(p: Pegas, tujuan: number, dt: number): boolean {
  const kaku = 90;
  const redam = 13;
  const gaya = -kaku * (p.nilai - tujuan) - redam * p.laju;
  p.laju += gaya * dt;
  p.nilai += p.laju * dt;
  return Math.abs(p.nilai - tujuan) > 0.002 || Math.abs(p.laju) > 0.002;
}

export function Kaca({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const [lensa, setLensa] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (dukungLensa()) {
      const id = requestAnimationFrame(() => setLensa(true));
      return () => cancelAnimationFrame(id);
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }

    const awal = { kx: 0.3, ky: 0.05, dx: 0, dy: 0 };
    const tujuan = { ...awal };
    const pegas = {
      kx: { nilai: awal.kx, laju: 0 },
      ky: { nilai: awal.ky, laju: 0 },
      dx: { nilai: 0, laju: 0 },
      dy: { nilai: 0, laju: 0 },
    };
    let raf = 0;
    let terakhir = 0;

    const gambar = (waktu: number) => {
      const dt = Math.min(0.032, terakhir ? (waktu - terakhir) / 1000 : 1 / 60);
      terakhir = waktu;
      let gerak = false;
      for (const kunci of ["kx", "ky", "dx", "dy"] as const) {
        if (langkah(pegas[kunci], tujuan[kunci], dt)) gerak = true;
      }
      el.style.setProperty("--kx", `${(pegas.kx.nilai * 100).toFixed(2)}%`);
      el.style.setProperty("--ky", `${(pegas.ky.nilai * 100).toFixed(2)}%`);
      el.style.setProperty("--dx", `${pegas.dx.nilai.toFixed(2)}px`);
      el.style.setProperty("--dy", `${pegas.dy.nilai.toFixed(2)}px`);
      if (gerak) {
        raf = requestAnimationFrame(gambar);
      } else {
        raf = 0;
        terakhir = 0;
      }
    };

    const mulai = () => {
      if (!raf) raf = requestAnimationFrame(gambar);
    };

    const onGerak = (e: PointerEvent) => {
      const kotak = el.getBoundingClientRect();
      const px = (e.clientX - kotak.left) / kotak.width;
      const py = (e.clientY - kotak.top) / kotak.height;
      tujuan.kx = Math.min(1.2, Math.max(-0.2, px));
      tujuan.ky = Math.min(1.2, Math.max(-0.2, py));
      const tengahX = kotak.left + kotak.width / 2;
      const tengahY = kotak.top + kotak.height / 2;
      tujuan.dx = Math.max(-7, Math.min(7, ((e.clientX - tengahX) / window.innerWidth) * 18));
      tujuan.dy = Math.max(-7, Math.min(7, ((e.clientY - tengahY) / window.innerHeight) * 18));
      mulai();
    };

    const onKeluar = () => {
      Object.assign(tujuan, awal);
      mulai();
    };

    window.addEventListener("pointermove", onGerak, { passive: true });
    document.addEventListener("pointerleave", onKeluar);
    return () => {
      window.removeEventListener("pointermove", onGerak);
      document.removeEventListener("pointerleave", onKeluar);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={`akun-kaca ${lensa ? "punya-lensa" : ""} ${className}`} {...rest}>
      {lensa && <Lensa />}
      <span aria-hidden className="akun-kaca-lapis" />
      {children}
    </div>
  );
}
