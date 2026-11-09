// Sayfa içi bilgi, uyarı ve hata kutusu (kart 0027, 0103; shadcn/ui alert). Anlamı yazıyla ve ikonla
// verilir, renk yalnız destekler. Hata ve uyarı ekran okuyucuya hemen okunur (role="alert"), bilgi ve
// başarı sırası gelince (role="status").
import type { ReactNode } from "react";
import { Ikon } from "../ikonlar/ikon.tsx";
import type { IkonAdi } from "../ikonlar/sozluk.ts";
import { sinif } from "./sinif.ts";

const turler = {
  tehlike: {
    ikon: "hata",
    rol: "alert",
    siniflar: "border-tehlike bg-tehlike-zemin text-tehlike-yazi",
  },
  uyari: { ikon: "uyari", rol: "alert", siniflar: "border-uyari bg-uyari-zemin text-uyari-yazi" },
  basari: {
    ikon: "basari",
    rol: "status",
    siniflar: "border-basari bg-basari-zemin text-basari-yazi",
  },
  bilgi: { ikon: "bilgi", rol: "status", siniflar: "border-kenar bg-yuzey text-yazi" },
} as const satisfies Record<string, { ikon: IkonAdi; rol: string; siniflar: string }>;

export type UyariTuru = keyof typeof turler;

export function Uyari({
  tur,
  baslik,
  children,
  className,
}: {
  tur: UyariTuru;
  baslik?: string;
  children: ReactNode;
  className?: string;
}) {
  const { ikon, rol, siniflar } = turler[tur];
  return (
    <div
      role={rol}
      data-slot="uyari"
      data-tur={tur}
      className={sinif("flex items-start gap-3 rounded-orta border-2 p-3", siniflar, className)}
    >
      <Ikon ad={ikon} className="mt-0.5" />
      <div className="flex flex-col gap-1">
        {baslik === undefined ? null : <p className="font-kalin">{baslik}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
