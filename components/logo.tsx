import { SITE_NAME } from "@/lib/situs";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-serif text-[20px] leading-none font-black tracking-tight ${className}`}>
      <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-lime" />
      {SITE_NAME}
    </span>
  );
}
