"use client";
// Ürün sayfasının üst kısmı (kart 0138, karar 0108; Canlı Çarşı taslağı): solda galeri, sağda ürünün adı,
// fiyatı, seçenekleri ve stok durumu.
//
// - Seçim kuralları secim.ts'tedir. Fiyat, stok yazısı ve stok kodu her birleşim için sunucuda, çekirdeğin tek
//   işlevlerinden çizilmiş gelir (bilgiler); burada yalnız seçili birleşiminki gösterilir, hesap yapılmaz.
//   Seçim tamamlanmamışsa ürünün genel bilgisi (fiyat aralığı ve genel stok durumu) görünür.
// - Seçim değişince adres yenilenir (sayfa yeniden yüklenmez), galeri birleşimin görseline geçer, fiyat ve stok
//   bölgesi ekran okuyucuya duyurulur.
import { type ReactNode, useState } from "react";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { Bolum } from "../../izleme/bolum";
import type { TukenmisSecenekGosterimi } from "../../kayitlar/urun";
import { useMetin } from "../../metinler/istemci-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { UrunGalerisi } from "./galeri";
import {
  degerDurumu,
  type Secim,
  type SecimBirimi,
  type SecimSecenegi,
  seciliBirim,
  secimdenSorgu,
  secimiDegistir,
} from "./secim";
import type { SayfaGaleriOgesi } from "./veri";

// Birleşimin (ya da seçimsiz ürünün) sunucuda çizilmiş değişen bilgileri.
export type DegisenBilgiler = { fiyat: ReactNode; stok: ReactNode; stokKodu: ReactNode };

export function UrunUstKismi({
  urunAdi,
  basliklar,
  kisaAciklama,
  altBilgi,
  galeri,
  anaGorselSirasi,
  secenekler,
  birimler,
  ilkSecim,
  bilgiler,
  genelBilgi,
  tukenmisSecenek,
}: {
  urunAdi: string;
  // Marka ve ürünün adı (h1).
  basliklar: ReactNode;
  kisaAciklama: ReactNode;
  // Kargo bilgisi gibi seçimden bağımsız satırlar.
  altBilgi: ReactNode;
  galeri: readonly SayfaGaleriOgesi[];
  anaGorselSirasi: number | undefined;
  secenekler: readonly SecimSecenegi[];
  birimler: readonly (SecimBirimi & { gorselSirasi?: number })[];
  ilkSecim: Secim;
  bilgiler: Readonly<Record<string, DegisenBilgiler>>;
  genelBilgi: DegisenBilgiler;
  tukenmisSecenek: TukenmisSecenekGosterimi;
}) {
  const metin = useMetin();
  const [secim, setSecim] = useState<Secim>(ilkSecim);
  // Müşterinin her seçenekte elle seçtiği son değer (secimiDegistir'in tercihi).
  const [tercih, setTercih] = useState<Secim>(ilkSecim);
  const birim = seciliBirim(birimler, secim, secenekler.length);
  const birimSirasi = (birimler.find((aday) => aday.kimlik === birim?.kimlik) ?? undefined)
    ?.gorselSirasi;
  const [aktif, setAktif] = useState(birimSirasi ?? anaGorselSirasi ?? 0);
  const bilgi = (birim === undefined ? undefined : bilgiler[birim.kimlik]) ?? genelBilgi;
  // Satılabilir birleşim yoksa seçim istenmez: ürün tükenmiştir, yalnız "Tükendi" görünür.
  const eksikSecim =
    secenekler.length > 0 && birim === undefined && birimler.some((aday) => aday.satilabilir);

  const sec = (sira: number, deger: string) => {
    const yeniTercih = secenekler.map((_, i) => (i === sira ? deger : tercih[i]));
    const yeni = secimiDegistir(secenekler, birimler, secim, sira, deger, yeniTercih);
    if (yeni === secim) return;
    setTercih(yeniTercih);
    setSecim(yeni);
    const yeniBirim = seciliBirim(birimler, yeni, secenekler.length);
    const gorsel = birimler.find((aday) => aday.kimlik === yeniBirim?.kimlik)?.gorselSirasi;
    if (gorsel !== undefined) setAktif(gorsel);
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${secimdenSorgu(secenekler, yeni, window.location.search)}${window.location.hash}`,
    );
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 tablet:grid-cols-2 tablet:gap-6 masaustu:gap-10">
      {/* Galeri bozulursa yalnız kendi yerinde uyarı görünür; seçim ve fiyat çalışmaya devam eder. */}
      <Bolum>
        <UrunGalerisi ogeler={galeri} aktif={aktif} onAktifDegisti={setAktif} urunAdi={urunAdi} />
      </Bolum>
      <div className="flex min-w-0 flex-col gap-4">
        {basliklar}
        <div aria-live="polite" className="flex min-w-0 flex-col gap-2">
          {bilgi.fiyat}
        </div>
        {kisaAciklama}
        {secenekler.map((secenek, sira) => {
          let tukenmisVar = false;
          const ogeler = secenek.degerler.flatMap((deger) => {
            const durum = degerDurumu(birimler, secim, sira, deger.kimlik);
            if (durum === "yok") return [];
            if (durum === "tukendi") {
              // Seçili değer (adresle verilen tükenmiş birleşim) "gizle" ayarında da görünür.
              if (tukenmisSecenek === "gizle" && secim[sira] !== deger.kimlik) return [];
              tukenmisVar = true;
            }
            return [{ deger: deger.kimlik, ad: deger.ad, secilemez: durum === "tukendi" }];
          });
          if (ogeler.length === 0) return null;
          const secili = secenek.degerler.find((deger) => deger.kimlik === secim[sira]);
          return (
            <SecenekGrubu
              key={secenek.kimlik}
              etiket={secenek.ad}
              baslik={
                secili === undefined ? (
                  secenek.ad
                ) : (
                  <>
                    {doldur(metin("vitrin.urunSayfasi.secimBasligi"), { secenek: secenek.ad })}
                    <strong className="font-en-kalin">{secili.ad}</strong>
                  </>
                )
              }
              ogeler={ogeler}
              deger={secili?.kimlik}
              onDegerDegisti={(deger) => sec(sira, deger)}
              secilemezEki={metin("vitrin.urunSayfasi.tukendiEki")}
              {...(tukenmisVar ? { aciklama: metin("vitrin.urunSayfasi.tukenmisAciklamasi") } : {})}
            />
          );
        })}
        <div aria-live="polite" className="flex min-w-0 flex-col gap-2">
          {eksikSecim ? (
            <span className="text-soluk-yazi">{metin("vitrin.urunSayfasi.secimIstegi")}</span>
          ) : null}
          {bilgi.stok}
        </div>
        {altBilgi}
        {bilgi.stokKodu}
      </div>
    </div>
  );
}
