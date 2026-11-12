// Sayfanın başlığı (kart 0135, karar 0102): sayfanın tek h1'i, yanında isteğe bağlı soluk ek yazı ("4 ürün").
// Vitrinde başlık sitenin başlık yazı tipiyle yazılır; panelde gövde yazı tipiyle ve daha küçük (kart 0141, taslak). Metinleri kullanan sayfa verir. Düzey yalnız başka bir sayfanın
// içinde gösterilen örnekte (bileşen kataloğu) 2 olur; vitrin sayfası 1 kullanır.
import type { ReactNode } from "react";
import { sinif } from "./sinif.ts";

const basliklar = { 1: "h1", 2: "h2" } as const;

const gorunumler = {
  vitrin:
    "font-baslik font-baslik-kalinligi text-baslik-2 text-yazi wrap-anywhere tablet:text-baslik-1",
  panel: "font-govde font-en-kalin text-baslik-3 text-yazi wrap-anywhere",
} as const;

export function SayfaBasligi({
  baslik,
  ek,
  duzey = 1,
  gorunum = "vitrin",
  className,
}: {
  baslik: ReactNode;
  duzey?: keyof typeof basliklar;
  gorunum?: keyof typeof gorunumler;
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
      <Baslik className={gorunumler[gorunum]}>{baslik}</Baslik>
      {ek === undefined ? null : <span className="text-soluk-yazi">{ek}</span>}
    </div>
  );
}
