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
  // Masaüstünde görsel kırpılarak afişi doldurur: yatay görselin yüksekliği doldurması için panelin iki katı
  // genişlikte kaynak gerekir (bağımsız kontrolün bulgusu: panel genişliği bulanık kaynak seçtiriyordu).
  panel: `(min-width: ${masaustu}) calc(2 * ${panel}), (min-width: ${tablet}) 25vw, 33vw`,
} as const;
export type GorselGenisligi = keyof typeof gorselGenislikleri;

const srcSet = (gorsel: BaglamGorseli) =>
  gorsel.kaynaklar.map((kaynak) => `${kaynak.adres} ${kaynak.genislik}w`).join(", ");

// Boyutları bilinen tek bir görsel (kart 0272: blog sayfaları vitrin bağlamını okumaz, görselin adreslerini kendisi
// kurar). Bölüm görseli de bununla çizilir.
export function VitrinGorseli({
  gorsel,
  telefon,
  alt,
  genislik,
  oncelikli = false,
  className,
}: {
  gorsel: BaglamGorseli;
  telefon?: BaglamGorseli | undefined;
  alt: string;
  genislik: GorselGenisligi;
  oncelikli?: boolean;
  className?: string | undefined;
}) {
  const img = (
    // biome-ignore lint/performance/noImgElement: boyutlar çekirdekte üretilir (karar 0073), srcset ile seçilir.
    <img
      src={gorsel.kaynaklar[0]?.adres}
      srcSet={srcSet(gorsel)}
      sizes={gorselGenislikleri[genislik]}
      alt={alt}
      width={gorsel.genislik}
      height={gorsel.yukseklik}
      loading={oncelikli ? "eager" : "lazy"}
      fetchPriority={oncelikli ? "high" : "auto"}
      decoding="async"
      className={className}
    />
  );
  if (telefon === undefined) return img;
  return (
    <picture className="contents">
      <source
        media={`(min-width: ${tablet})`}
        srcSet={srcSet(gorsel)}
        sizes={gorselGenislikleri[genislik]}
      />
      <source srcSet={srcSet(telefon)} sizes={gorselGenislikleri[genislik]} />
      {img}
    </picture>
  );
}

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
  return (
    <VitrinGorseli
      gorsel={varsayilan}
      telefon={asil === undefined ? undefined : telefon}
      alt={typeof alternatifMetin === "string" ? alternatifMetin : ""}
      genislik={genislik}
      oncelikli={oncelikli}
      className={className}
    />
  );
}
