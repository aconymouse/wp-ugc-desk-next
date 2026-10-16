import { notFound } from "next/navigation";
import Breadcrumb from "@/components/breadcrumb";
import { ambilHalaman, stripHtml } from "@/lib/wp";

export default async function HalamanWp({ slug }: { slug: string }) {
  const halaman = await ambilHalaman(slug);
  if (!halaman) notFound();
  const judul = stripHtml(halaman.title.rendered);
  return (
    <div className="mx-auto max-w-[720px] px-5 pt-7 pb-20 sm:px-6">
      <Breadcrumb jejak={[{ nama: "Beranda", href: "/" }, { nama: judul }]} />
      <h1 className="mb-6 font-serif text-[clamp(28px,5.5vw,44px)] leading-[1.1] font-bold">{judul}</h1>
      <div
        className="space-y-4 text-[16px] leading-7 [&_a]:underline [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-[24px] [&_h2]:font-bold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc"
        dangerouslySetInnerHTML={{ __html: halaman.content.rendered }}
      />
    </div>
  );
}
