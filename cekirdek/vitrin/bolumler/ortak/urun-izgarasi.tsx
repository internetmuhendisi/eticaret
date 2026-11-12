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

// Izgaranın sütunları (Canlı Çarşı taslağı). Dikey kart geniş ekranda beş, masaüstünde dört, tablette üç,
// telefonda iki sütundur; yan afişin yanında bir sütun azdır. Yatay kart dar yerler içindir ama düğmeleri ve
// fiyatı sığmalı: telefonda bir, masaüstünde en çok üç (dörtte fiyat kırılıyordu, görüntüde ölçüldü); aralığı
// taslaktaki gibi 12 px'tir. Fırsatlarda panelin yanında kartlar iki sütundur.
// Filtreli liste (kart 0136): solda filtre sütunuyla masaüstünde üç sütun (Canlı Çarşı taslağı).
export type IzgaraYeri = "tam" | "yanli" | "iki-sutun" | "filtreli";
export const izgaraSiniflari = (kart: UrunKartiGorunumu, yer: IzgaraYeri): string => {
  if (kart === "yatay") {
    return yer === "tam"
      ? "gap-3 grid-cols-1 tablet:grid-cols-2 masaustu:grid-cols-3"
      : "gap-3 grid-cols-1 tablet:grid-cols-2";
  }
  if (yer === "iki-sutun") return "gap-4 grid-cols-2";
  if (yer === "filtreli") {
    return kart === "dikey"
      ? "gap-4 grid-cols-2 tablet:grid-cols-3"
      : "gap-3 grid-cols-1 tablet:grid-cols-2";
  }
  if (kart === "buyuk-gorsel") {
    return yer === "yanli" ? "gap-4 grid-cols-2" : "gap-4 grid-cols-2 masaustu:grid-cols-3";
  }
  return yer === "yanli"
    ? "gap-4 grid-cols-2 tablet:grid-cols-3 genis:grid-cols-4"
    : "gap-4 grid-cols-2 tablet:grid-cols-3 masaustu:grid-cols-4 genis:grid-cols-5";
};

export const seritSiniflari: Record<UrunKartiGorunumu, string> = {
  dikey: "basis-1/2 tablet:basis-1/3 masaustu:basis-1/4 genis:basis-1/5",
  yatay: "basis-full tablet:basis-1/2 masaustu:basis-1/3",
  "buyuk-gorsel": "basis-3/4 tablet:basis-1/2 masaustu:basis-1/3",
};

// Kartı saran parça (fırsatlarda biten indirimin kartı düşer) ve kartın bilgilerinin üst satırı (fırsatlarda
// kalan süre, taslaktaki gibi kartın içinde).
export type KartSarici = (kart: UrunKartiVerisi, icerik: ReactNode) => ReactNode;
export type KartUstSatiri = (kart: UrunKartiVerisi) => ReactNode;

export function UrunIzgarasi({
  kartlar,
  kart,
  baglam,
  kaydirmali,
  etiket,
  yer = "tam",
  sarici,
  ustSatir,
}: {
  kartlar: readonly UrunKartiVerisi[];
  kart: UrunKartiGorunumu;
  baglam: VitrinBaglami;
  kaydirmali: boolean;
  // Şeridin ekran okuyucudaki adı.
  etiket: string;
  yer?: IzgaraYeri;
  sarici?: KartSarici;
  ustSatir?: KartUstSatiri;
}) {
  const ciz = (urun: UrunKartiVerisi) => {
    const icerik = (
      <UrunKarti
        urun={urun}
        gorunum={kart}
        islevler={baglam.islevler}
        ustSatir={ustSatir?.(urun)}
        className="h-full"
      />
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
    <ul className={sinif("grid min-w-0", izgaraSiniflari(kart, yer))}>
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

// Yan afiş (Canlı Çarşı taslağının "Yeni gelenler" bölümü): başlığı verilmişse çizilir. Varsayılan zemin
// üçüncü kutu rengidir; başlık ve metin üstte, görsel sağa yaslı, koyu düğme altta. Bölümün başlığı yoksa yan
// afişin başlığı bölümün başlığıdır (h2, baslikKimligi ile); varsa yan afişinki düz yazıdır.
export function YanAfis({
  degerler,
  baglam,
  baslikKimligi,
}: {
  degerler: YanAfisDegerleri;
  baglam: VitrinBaglami;
  baslikKimligi?: string;
}) {
  if (!metinMi(degerler.yanBaslik)) return null;
  const baglanti = baglantiMi(degerler.yanBaglanti) ? degerler.yanBaglanti : undefined;
  const zemin = degerler.yanZemin ?? "kutu-3";
  const baslikSinifi =
    "font-baslik text-baslik-3 font-baslik-kalinligi wrap-anywhere tablet:text-baslik-2";
  return (
    <div
      className={sinif(
        "flex flex-col justify-between gap-4 rounded-orta p-6 tablet:shrink-0 masaustu:w-panel",
        zeminSiniflari(zemin, "kutu-3"),
      )}
    >
      {/* Başlık ve metin bir grup: aralarında 8 px (taslak). */}
      <div className="flex flex-col gap-2">
        {baslikKimligi === undefined ? (
          <p className={baslikSinifi}>{degerler.yanBaslik}</p>
        ) : (
          <h2 id={baslikKimligi} className={baslikSinifi}>
            {degerler.yanBaslik}
          </h2>
        )}
        {metinMi(degerler.yanMetin) ? (
          <p className={sinif("whitespace-pre-line", solukYaziSiniflari(zemin))}>
            {degerler.yanMetin}
          </p>
        ) : null}
      </div>
      <BolumGorseli
        baglam={baglam}
        gorsel={degerler.yanGorsel}
        alternatifMetin={degerler.yanGorselMetni}
        genislik="besteBir"
        className="aspect-square w-2/3 self-end object-contain"
      />
      {baglanti !== undefined && metinMi(degerler.yanDugmeYazisi) ? (
        <Link
          href={baglanti.adres}
          className={sinif(dugmeSiniflari({ tur: "ikincil" }), "w-fit no-underline")}
          {...yeniSekmeOzellikleri(baglanti.yeniSekme)}
        >
          {degerler.yanDugmeYazisi}
        </Link>
      ) : null}
    </div>
  );
}
