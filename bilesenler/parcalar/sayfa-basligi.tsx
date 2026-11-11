// Sayfanın başlığı (kart 0135, karar 0102): sayfanın tek h1'i, yanında isteğe bağlı soluk ek yazı ("4 ürün").
// Başlık sitenin başlık yazı tipiyle yazılır. Metinleri kullanan sayfa verir. Düzey yalnız başka bir sayfanın
// içinde gösterilen örnekte (bileşen kataloğu) 2 olur; vitrin sayfası 1 kullanır.
import type { ReactNode } from "react";
import { sinif } from "./sinif.ts";

const basliklar = { 1: "h1", 2: "h2" } as const;

export function SayfaBasligi({
  baslik,
  ek,
  duzey = 1,
  className,
}: {
  baslik: ReactNode;
  duzey?: keyof typeof basliklar;
  // Başlığın yanında soluk yazı, örneğin ürün sayısı.
  ek?: ReactNode;
  className?: string;
}) {
  const Baslik = basliklar[duzey];
  return (
    <div
      data-slot="sayfa-basligi"
      className={sinif("flex flex-wrap items-baseline gap-x-3 gap-y-1", className)}
    >
      <Baslik className="font-baslik font-baslik-kalinligi text-baslik-2 text-yazi wrap-anywhere tablet:text-baslik-1">
        {baslik}
      </Baslik>
      {ek === undefined ? null : <span className="text-soluk-yazi">{ek}</span>}
    </div>
  );
}
