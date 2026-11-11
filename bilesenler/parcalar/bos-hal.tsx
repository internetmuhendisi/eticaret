// Boş hâl (kart 0135, karar 0102): listede gösterilecek bir şey yokken ne olduğunu ve sonraki adımı söyler
// (.claude/rules/metinler.md: boş liste bir sonraki adımı ve o adımın düğmesini gösterir). Eylem düğmesi ya da
// bağlantısı children ile verilir. Metinleri kullanan sayfa verir.
import type { ReactNode } from "react";
import { Ikon } from "../ikonlar/ikon.tsx";
import type { IkonAdi } from "../ikonlar/sozluk.ts";
import { sinif } from "./sinif.ts";

const basliklar = { 2: "h2", 3: "h3" } as const;

export function BosHal({
  ikon,
  baslik,
  aciklama,
  duzey = 2,
  children,
  className,
}: {
  ikon: IkonAdi;
  baslik: string;
  aciklama?: string;
  // Başlığın düzeyi: sayfanın h1'inin altındaysa 2, bir bölümün içindeyse 3.
  duzey?: keyof typeof basliklar;
  // Sonraki adım: düğme ya da bağlantı.
  children?: ReactNode;
  className?: string;
}) {
  const Baslik = basliklar[duzey];
  return (
    <div
      data-slot="bos-hal"
      className={sinif(
        "flex flex-col items-center gap-3 rounded-orta bg-yuzey px-4 py-12 text-center",
        className,
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-dugme bg-zemin text-soluk-yazi">
        <Ikon ad={ikon} className="size-6" />
      </span>
      <Baslik className="font-baslik font-baslik-kalinligi text-baslik-3 text-yazi">
        {baslik}
      </Baslik>
      {aciklama === undefined ? null : <p className="max-w-form text-soluk-yazi">{aciklama}</p>}
      {children === undefined ? null : (
        <div className="flex flex-wrap justify-center gap-2">{children}</div>
      )}
    </div>
  );
}
