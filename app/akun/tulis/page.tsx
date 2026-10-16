import type { Metadata } from "next";
import { HalamanTulis } from "@/components/naskah/halaman-tulis";

export const metadata: Metadata = {
  title: "Kirim tulisan",
  robots: { index: false, follow: false },
};

export default function TulisPage() {
  return <HalamanTulis />;
}
