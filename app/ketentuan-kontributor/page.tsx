import type { Metadata } from "next";
import HalamanWp from "@/components/situs/halaman-wp";

export const metadata: Metadata = { title: "Ketentuan Kontributor" };

export default function Ketentuan() {
  return <HalamanWp slug="ketentuan-kontributor" />;
}
