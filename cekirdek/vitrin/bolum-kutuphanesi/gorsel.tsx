// Bölümlerin görseli (kart 0110, karar 0087). Görsel vitrin bağlamından gelir (boyutlarının adresleri ve
// ölçüsü); bölüm yalnız dosya kimliğini verir. Bağlamda olmayan görsel (silinmiş, boyutu yok) çizilmez.
//
// Telefon görseli verilmişse telefonda o, tablet ve masaüstünde asıl görsel görünür (<picture>). Görselin
// yaklaşık genişliği (sizes) yerine göre seçilir; kırılma noktaları tasarım değerlerindendir. Alternatif
// metin verilmezse görsel süstür (alt=""): yanındaki yazı aynı şeyi söyler.
import { sabitDegerler } from "../../../bilesenler/tasarim-degerleri/degerler";
import type { BaglamGorseli, VitrinBaglami } from "./baglam.ts";

const { tablet, masaustu } = sabitDegerler.kirilmaNoktalari;
const { icerik, panel } = sabitDegerler.genislikler;

// Görselin sayfadaki yaklaşık genişliği: bütün içerik, yarısı, üçte biri, beşte biri ya da yan afişinki (masaüstünde
// panel genişliği, daha darda afişin yanında dörtte ya da üçte biri; kart 0171).
export const gorselGenislikleri = {
  tam: `(min-width: ${icerik}) ${icerik}, 100vw`,
  yarim: `(min-width: ${tablet}) 50vw, 100vw`,
  ucteBir: `(min-width: ${masaustu}) 33vw, (min-width: ${tablet}) 50vw, 100vw`,
  besteBir: `(min-width: ${masaustu}) 20vw, 33vw`,
  panel: `(min-width: ${masaustu}) ${panel}, (min-width: ${tablet}) 25vw, 33vw`,
} as const;
export type GorselGenisligi = keyof typeof gorselGenislikleri;

const srcSet = (gorsel: BaglamGorseli) =>
  gorsel.kaynaklar.map((kaynak) => `${kaynak.adres} ${kaynak.genislik}w`).join(", ");

export function BolumGorseli({
  baglam,
  gorsel,
  telefonGorseli,
  alternatifMetin,
  genislik,
  oncelikli = false,
  className,
}: {
  baglam: VitrinBaglami;
  // Dosya kimlikleri (alan değerleri).
  gorsel: unknown;
  telefonGorseli?: unknown;
  alternatifMetin?: unknown;
  genislik: GorselGenisligi;
  // Sayfanın ilk görünen görseli beklemeden yüklenir (kayan afişin ilk slaytı).
  oncelikli?: boolean;
  className?: string;
}) {
  const asil = typeof gorsel === "string" ? baglam.gorseller[gorsel] : undefined;
  const telefon = typeof telefonGorseli === "string" ? baglam.gorseller[telefonGorseli] : undefined;
  const varsayilan = asil ?? telefon;
  if (varsayilan === undefined) return null;
  const alt = typeof alternatifMetin === "string" ? alternatifMetin : "";
  const img = (
    // biome-ignore lint/performance/noImgElement: boyutlar çekirdekte üretilir (karar 0073), srcset ile seçilir.
    <img
      src={varsayilan.kaynaklar[0]?.adres}
      srcSet={srcSet(varsayilan)}
      sizes={gorselGenislikleri[genislik]}
      alt={alt}
      width={varsayilan.genislik}
      height={varsayilan.yukseklik}
      loading={oncelikli ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
  if (asil === undefined || telefon === undefined) return img;
  return (
    <picture className="contents">
      <source
        media={`(min-width: ${tablet})`}
        srcSet={srcSet(asil)}
        sizes={gorselGenislikleri[genislik]}
      />
      <source srcSet={srcSet(telefon)} sizes={gorselGenislikleri[genislik]} />
      {img}
    </picture>
  );
}
