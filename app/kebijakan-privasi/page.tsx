import type { Metadata } from "next";
import HalamanWp from "@/components/situs/halaman-wp";

export const metadata: Metadata = { title: "Kebijakan Privasi" };

export default function KebijakanPrivasi() {
  return <HalamanWp slug="kebijakan-privasi" />;
}
