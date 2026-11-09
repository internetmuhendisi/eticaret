// Yükleniyor göstergesi (kart 0103; shadcn/ui spinner). Döner ikon ve ekran okuyucuya okunan yazı. Yazı
// durum alanının içeriğidir, ad (aria-label) değil: ekran okuyucular durum alanının içeriğini okur.
// Hareketi azaltmayı seçen kullanıcıda dönmez. Adı kullanan sayfa verir.
import { Ikon } from "../ikonlar/ikon.tsx";
import { sinif } from "./sinif.ts";

export function YukleniyorGostergesi({
  etiket,
  className,
}: {
  etiket: string;
  className?: string;
}) {
  return (
    <span role="status" data-slot="yukleniyor" className={sinif("inline-flex", className)}>
      <Ikon ad="yukleniyor" className="animate-don" />
      <span className="sr-only">{etiket}</span>
    </span>
  );
}
