import type { Metadata } from "next";
import { HalamanTulis } from "@/components/naskah/halaman-tulis";

export const metadata: Metadata = {
  title: "Kirim tulisan",
  robots: { index: false, follow: false },
};

export default async function TulisIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HalamanTulis id={id} />;
}
