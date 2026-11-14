// Rozet (kart 0103; shadcn/ui badge). Kısa bir durum ya da etiket yazısıdır: "Yeni", "Tükendi". Anlamı
// yazıyla verir, renk yalnız destekler. Metni kullanan sayfa verir.
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { sinif } from "./sinif.ts";

export const rozetSiniflari = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-kucuk border px-2 py-0.5 text-kucuk font-en-kalin whitespace-nowrap",
  {
    variants: {
      tur: {
        // Temanın rozet rengi (kart 0124): çoğu temada ana renge bağlıdır, Keskin Çizgi'de sarıdır.
        birincil: "border-transparent bg-rozet text-rozet-ustu",
        ikincil: "border-transparent bg-yuzey text-yazi",
        cerceveli: "border-yazi bg-transparent text-yazi",
        // Koyu rozet: "Tükendi" ve öne çıkan etiketler.
        koyu: "border-transparent bg-yazi text-zemin",
        tehlike: "border-transparent bg-tehlike-zemin text-tehlike-yazi",
        basari: "border-transparent bg-basari-zemin text-basari-yazi",
        uyari: "border-transparent bg-uyari-zemin text-uyari-yazi",
      },
    },
    defaultVariants: { tur: "birincil" },
  },
);

export function Rozet({
  tur,
  className,
  ...ozellikler
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof rozetSiniflari>) {
  return (
    <span data-slot="rozet" className={sinif(rozetSiniflari({ tur }), className)} {...ozellikler} />
  );
}
