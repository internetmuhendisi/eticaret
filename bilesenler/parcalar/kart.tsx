// Kart (kart 0103; shadcn/ui card). Kenarlıklı, köşeli kutu elle örülmez, bu kart kullanılır
// (.claude/rules/bilesenler.md). Başlığın düzeyi sayfadaki yerine göre verilir.
import type { HTMLAttributes } from "react";
import { sinif } from "./sinif.ts";

type Ozellikler = HTMLAttributes<HTMLDivElement>;

export function Kart({ className, ...ozellikler }: Ozellikler) {
  return (
    <div
      data-slot="kart"
      className={sinif(
        "flex flex-col gap-4 rounded-orta border border-kenar bg-zemin p-4 text-yazi shadow-kart tablet:p-6",
        className,
      )}
      {...ozellikler}
    />
  );
}

export function KartUstu({ className, ...ozellikler }: Ozellikler) {
  return (
    <div
      data-slot="kart-ustu"
      className={sinif("flex flex-wrap items-start justify-between gap-2", className)}
      {...ozellikler}
    />
  );
}

export function KartBasligi({
  duzey,
  className,
  ...ozellikler
}: HTMLAttributes<HTMLHeadingElement> & { duzey: 2 | 3 | 4 }) {
  const Baslik = `h${duzey}` as const;
  return (
    <Baslik
      data-slot="kart-basligi"
      className={sinif("text-baslik-4", className)}
      {...ozellikler}
    />
  );
}

export function KartAciklamasi({ className, ...ozellikler }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="kart-aciklamasi"
      className={sinif("text-soluk-yazi", className)}
      {...ozellikler}
    />
  );
}

export function KartIcerigi({ className, ...ozellikler }: Ozellikler) {
  return <div data-slot="kart-icerigi" className={sinif(className)} {...ozellikler} />;
}

export function KartAlti({ className, ...ozellikler }: Ozellikler) {
  return (
    <div
      data-slot="kart-alti"
      className={sinif("flex flex-wrap items-center gap-2", className)}
      {...ozellikler}
    />
  );
}
