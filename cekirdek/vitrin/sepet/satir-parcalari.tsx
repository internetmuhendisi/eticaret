"use client";
// Sepet satırının ortak parçaları (kart 0212'den ayrıldı, kart 0329): uyarının yazısı ve durdurup durdurmadığı, satırın
// adı, görseli ve seçimi, yükleniyor göstergesi. Sepet sayfası, her sayfadaki sepet penceresi, ödeme adımı, siparişin
// kalemleri ve panelin elle siparişi kullanır. Burada yalnız her yerde gereken küçük parçalar durur: sepet penceresi
// bütün sayfalara gider, sepet sayfasına özel kod (kupon alanı, adet seçici) bu dosyaya girmez (kart 0329, kod sınırı).
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { IskeletGorunum } from "../../../bilesenler/parcalar/iskelet";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { doldur } from "../../metinler/doldur";
import type { VitrinMetinAnahtari } from "../../metinler/istemci-metni";
import { useMetin } from "../../metinler/istemci-metni";
import type { SepetGorunumuSatiri } from "./veri";

export type Metin = ReturnType<typeof useMetin>;

const uyariMetinleri = {
  "fiyat-degisti": "vitrin.sepet.uyari.fiyatDegisti",
  "stok-azaldi": "vitrin.sepet.uyari.stokAzaldi",
  "en-cok": "vitrin.sepet.uyari.enCok",
  "en-az": "vitrin.sepet.uyari.enAz",
  tukendi: "vitrin.sepet.uyari.tukendi",
  kaldirildi: "vitrin.sepet.uyari.kaldirildi",
} as const satisfies Record<SepetGorunumuSatiri["uyarilar"][number]["kod"], VitrinMetinAnahtari>;

// Satırı durduran uyarı tehlike renginde, öteki uyarılar uyarı renginde.
// Satırın uyarısı ve durdurup durdurmadığı: panelin elle siparişi de aynı metni yazar (kart 0236).
export const durdurur = (kod: SepetGorunumuSatiri["uyarilar"][number]["kod"]) =>
  kod === "tukendi" || kod === "kaldirildi" || kod === "en-az";

export const uyariYazisi = (
  metin: Metin,
  satir: SepetGorunumuSatiri,
  uyari: SepetGorunumuSatiri["uyarilar"][number],
) =>
  doldur(metin(uyariMetinleri[uyari.kod]), {
    ...("sayi" in uyari ? { sayi: String(uyari.sayi) } : {}),
    ...("eskiYazili" in uyari && uyari.eskiYazili !== undefined ? { eski: uyari.eskiYazili } : {}),
    ...(satir.fiyat === undefined ? {} : { yeni: satir.fiyat.enDusuk.yazili.tutar }),
  });

export const satirAdi = (metin: Metin, satir: SepetGorunumuSatiri) =>
  satir.urun?.ad ?? metin("vitrin.sepet.kaldirilanUrun");

// Satırın görseli: sepet sayfası, sepet penceresi, ödeme adımının özeti (kart 0213) ve siparişin kalemleri (kart 0238).
// Görsel yanında adı yazan satırda süslemedir (alt boş); adı yalnız görselde olan yerde (Siparişlerim) alt verilir.
export function SatirGorseli({
  satir,
  buyukluk,
  alt = "",
}: {
  satir: Pick<SepetGorunumuSatiri, "gorsel"> & { satilabilir?: boolean };
  buyukluk: string;
  alt?: string;
}) {
  return (
    <span
      className={sinif(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-orta bg-yuzey",
        buyukluk,
        satir.satilabilir === false && "opacity-50",
      )}
      {...(satir.gorsel === undefined && alt !== "" ? { role: "img", "aria-label": alt } : {})}
    >
      {satir.gorsel === undefined ? (
        <Ikon ad="gorsel" className="text-soluk-yazi" />
      ) : (
        // biome-ignore lint/performance/noImgElement: boyutlar çekirdekte üretilir (karar 0073), srcset ile seçilir.
        <img
          src={satir.gorsel.kaynaklar[0]?.adres}
          srcSet={satir.gorsel.kaynaklar.map((k) => `${k.adres} ${k.genislik}w`).join(", ")}
          sizes="5rem"
          alt={alt}
          width={satir.gorsel.genislik}
          height={satir.gorsel.yukseklik}
          loading="lazy"
          className="size-7/8 object-contain"
        />
      )}
    </span>
  );
}

export function SecimYazisi({ satir }: { satir: SepetGorunumuSatiri }) {
  const metin = useMetin();
  if (satir.secim.length === 0) return null;
  return (
    <span className="text-kucuk text-soluk-yazi">
      {satir.secim.map((secim) => doldur(metin("vitrin.sepet.secim"), secim)).join(" · ")}
    </span>
  );
}

export function SepetYukleniyor() {
  const metin = useMetin();
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">{metin("vitrin.sepet.yukleniyor")}</span>
      <IskeletGorunum className="h-20 w-full" />
      <IskeletGorunum className="h-20 w-full" />
    </div>
  );
}
