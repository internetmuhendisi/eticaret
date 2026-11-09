// Ürün bölümlerinin ortak parçaları (kart 0111, karar 0088): kartların ızgarası ya da kaydırmalı şeridi, başlık
// satırı ve yan afiş. Ürün vitrini, sekmeli vitrin ve fırsatlar bunlarla çizilir; kart her zaman UrunKarti'dır,
// verisi bağlamdaki kaynaktan gelir (fiyat, oran ve stok burada yeniden hesaplanmaz).
import Link from "next/link";
import type { ReactNode } from "react";
import { dugmeSiniflari } from "../../../../bilesenler/parcalar/dugme";
import {
  Serit,
  SeritDugmeleri,
  SeritIcerigi,
  SeritOgesi,
} from "../../../../bilesenler/parcalar/serit";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import type { UrunKartiGorunumu } from "../../../kayitlar/tema";
import { metin } from "../../../metinler/site-metni";
import type { VitrinBaglami } from "../../bolum-kutuphanesi/baglam";
import { BolumGorseli } from "../../bolum-kutuphanesi/gorsel";
import { secimDegeri } from "../../bolum-kutuphanesi/tarif";
import { type UrunKaynagi, urunKaynagiAnahtari } from "../../bolum-kutuphanesi/urun-kaynagi";
import { urunKartiGorunumu } from "../../urun-karti/gorunum";
import type { UrunKartiVerisi } from "../../urun-karti/tur";
import { UrunKarti } from "../../urun-karti/urun-karti";
import { baglantiMi, metinMi } from "./deger";
import { yeniSekmeOzellikleri } from "./menu";
import { kartGorunumuAlani } from "./urun-alanlari";
import { solukYaziSiniflari, zeminSiniflari } from "./zemin";

// Kaynağın bağlamdaki kartları. Kaynak tarifin şemasından geçmiştir; bağlamda olmayan kaynak boştur.
export const kaynaginKartlari = (
  baglam: VitrinBaglami,
  kaynak: unknown,
): readonly UrunKartiVerisi[] =>
  typeof kaynak === "object" && kaynak !== null && "tur" in kaynak
    ? (baglam.urunler[urunKaynagiAnahtari(kaynak as UrunKaynagi)] ?? [])
    : [];

// Bölümün kart görünümü: "tema" ya da tanınmayan değer temanın seçimidir (urunKartiGorunumu).
export const bolumunKartGorunumu = (baglam: VitrinBaglami, deger: unknown): UrunKartiGorunumu => {
  const secim = secimDegeri(kartGorunumuAlani, deger);
  return urunKartiGorunumu(baglam.parcaGorunumleri, secim === "tema" ? undefined : secim);
};

// Izgaranın sütunları. Yatay kart dar yerler içindir ama düğmeleri ve fiyatı sığmalı: telefonda bir,
// masaüstünde en çok üç (dörtte fiyat kırılıyordu, görüntüde ölçüldü). Yan afişin yanında bir sütun azdır;
// fırsatlarda panelin yanında kartlar iki sütundur (Canlı Çarşı taslağı).
export type IzgaraYeri = "tam" | "yanli" | "iki-sutun";
const izgaraSiniflari = (kart: UrunKartiGorunumu, yer: IzgaraYeri): string => {
  if (kart === "yatay") {
    return yer === "tam"
      ? "grid-cols-1 tablet:grid-cols-2 masaustu:grid-cols-3"
      : "grid-cols-1 tablet:grid-cols-2";
  }
  if (yer === "iki-sutun") return "grid-cols-2";
  if (kart === "buyuk-gorsel") {
    return yer === "yanli" ? "grid-cols-2" : "grid-cols-2 masaustu:grid-cols-3";
  }
  return yer === "yanli"
    ? "grid-cols-2 tablet:grid-cols-3"
    : "grid-cols-2 tablet:grid-cols-3 masaustu:grid-cols-4";
};

const seritSiniflari: Record<UrunKartiGorunumu, string> = {
  dikey: "basis-1/2 tablet:basis-1/3 masaustu:basis-1/4",
  yatay: "basis-full tablet:basis-1/2 masaustu:basis-1/3",
  "buyuk-gorsel": "basis-3/4 tablet:basis-1/2 masaustu:basis-1/3",
};

// Kartı saran parça: fırsatlarda kartın üstünde kalan süre yazar ve biten indirimin kartı düşer.
export type KartSarici = (kart: UrunKartiVerisi, icerik: ReactNode) => ReactNode;

export function UrunIzgarasi({
  kartlar,
  kart,
  baglam,
  kaydirmali,
  etiket,
  yer = "tam",
  sarici,
}: {
  kartlar: readonly UrunKartiVerisi[];
  kart: UrunKartiGorunumu;
  baglam: VitrinBaglami;
  kaydirmali: boolean;
  // Şeridin ekran okuyucudaki adı.
  etiket: string;
  yer?: IzgaraYeri;
  sarici?: KartSarici;
}) {
  const ciz = (urun: UrunKartiVerisi) => {
    const icerik = (
      <UrunKarti urun={urun} gorunum={kart} islevler={baglam.islevler} className="h-full" />
    );
    return sarici === undefined ? icerik : sarici(urun, icerik);
  };
  if (kaydirmali) {
    return (
      <Serit
        className="min-w-0"
        metinler={{
          etiket,
          seritTanimi: metin("ortak.parca.seritTanimi"),
          ogeTanimi: metin("ortak.parca.seritOgesi"),
          onceki: metin("ortak.parca.onceki"),
          sonraki: metin("ortak.parca.sonraki"),
        }}
      >
        <SeritIcerigi>
          {kartlar.map((urun) => (
            <SeritOgesi key={urun.kimlik} className={seritSiniflari[kart]}>
              {ciz(urun)}
            </SeritOgesi>
          ))}
        </SeritIcerigi>
        <SeritDugmeleri />
      </Serit>
    );
  }
  return (
    <ul className={sinif("grid min-w-0 gap-4", izgaraSiniflari(kart, yer))}>
      {kartlar.map((urun) => (
        // Fırsatlarda biten kartın yeri boş kalmaz (empty:hidden).
        <li key={urun.kimlik} className="min-w-0 empty:hidden">
          {ciz(urun)}
        </li>
      ))}
    </ul>
  );
}

// Bölümün başlık satırı: h2 başlık, isteğe bağlı yanında öğeler (sekmeler) ve "Tümünü gör" bağlantısı.
export function BolumBasligi({
  kimlik,
  baslik,
  tumu,
  children,
}: {
  kimlik: string;
  baslik: string | undefined;
  tumu?: unknown;
  children?: ReactNode;
}) {
  const baglanti = baglantiMi(tumu) ? tumu : undefined;
  if (baslik === undefined && baglanti === undefined && children === undefined) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        {baslik === undefined ? null : (
          <h2
            id={kimlik}
            className="min-w-0 font-baslik text-baslik-3 font-baslik-kalinligi wrap-anywhere tablet:text-baslik-2"
          >
            {baslik}
          </h2>
        )}
        {children}
      </div>
      {baglanti === undefined ? null : (
        <Link
          href={baglanti.adres}
          className="inline-flex min-h-11 items-center font-kalin text-yazi underline"
          {...yeniSekmeOzellikleri(baglanti.yeniSekme)}
        >
          {metin("vitrin.bolum.urun.tumunuGor")}
        </Link>
      )}
    </div>
  );
}

type YanAfisDegerleri = {
  yanBaslik?: unknown;
  yanMetin?: unknown;
  yanGorsel?: unknown;
  yanGorselMetni?: unknown;
  yanDugmeYazisi?: unknown;
  yanBaglanti?: unknown;
  yanZemin?: unknown;
};

// Yan afiş: başlığı verilmişse çizilir. Düğme bağlantı ve yazısıyla birlikte görünür.
export function YanAfis({
  degerler,
  baglam,
}: {
  degerler: YanAfisDegerleri;
  baglam: VitrinBaglami;
}) {
  if (!metinMi(degerler.yanBaslik)) return null;
  const baglanti = baglantiMi(degerler.yanBaglanti) ? degerler.yanBaglanti : undefined;
  const zemin = degerler.yanZemin ?? "yuzey";
  return (
    <div
      className={sinif(
        "flex flex-col gap-4 rounded-orta p-6 tablet:shrink-0 masaustu:w-panel",
        zeminSiniflari(zemin, "yuzey"),
      )}
    >
      <p className="font-baslik text-baslik-3 font-baslik-kalinligi wrap-anywhere">
        {degerler.yanBaslik}
      </p>
      {metinMi(degerler.yanMetin) ? (
        <p className={sinif("whitespace-pre-line", solukYaziSiniflari(zemin))}>
          {degerler.yanMetin}
        </p>
      ) : null}
      <BolumGorseli
        baglam={baglam}
        gorsel={degerler.yanGorsel}
        alternatifMetin={degerler.yanGorselMetni}
        genislik="besteBir"
        className="hidden aspect-square w-full object-contain masaustu:block"
      />
      {baglanti !== undefined && metinMi(degerler.yanDugmeYazisi) ? (
        <Link
          href={baglanti.adres}
          className={sinif(dugmeSiniflari({ tur: "birincil" }), "w-fit")}
          {...yeniSekmeOzellikleri(baglanti.yeniSekme)}
        >
          {degerler.yanDugmeYazisi}
        </Link>
      ) : null}
    </div>
  );
}
