// Ürün sayfası (kart 0138, karar 0102 ve 0108; Canlı Çarşı taslağı). Adres dosyası
// (app/(vitrin)/urun/[adresAdi]/page.tsx) yalnız bunu çağırır.
//
// - Adres kayıt sayfasının çözümüyle kayda çevrilir (sayfaninKaydi): gizli ürün yalnız bağlantıyla açılır;
//   taslak, arşiv, silinmiş ve zamanı gelmemiş ürün bulunamadı sayfasına düşer, eski adres yönlenir.
// - Veri urunSayfasiVerisi'nden gelir. Her birleşimin fiyatı, stok yazısı ve stok kodu burada fiyat
//   bileşeniyle ve stok metinleriyle çizilir ve tarayıcıdaki üst kısma verilir; tarayıcı seçime göre gösterir.
// - Sepet, adet, favori, puan ve yorumlar işlevleri yazılınca gelir (yorum kart 0139, favori kart 0140, sepet
//   Sepet bölümü); o güne kadar sayfada görünmezler. Yorumların yeri özellik tablosundan sonra, ilgili ürünlerden öncedir.
// - Seçimli adres (?secenek-beden=m) aynı sayfadır: arama motoruna seçimsiz adres bildirilir (canonical). Gizli
//   ürünün sayfası arama motorlarına kapalıdır.
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { SayfaBasligi } from "../../../bilesenler/parcalar/sayfa-basligi";
import { SayfaYolu } from "../../../bilesenler/parcalar/sayfa-yolu";
import {
  Serit,
  SeritDugmeleri,
  SeritIcerigi,
  SeritOgesi,
} from "../../../bilesenler/parcalar/serit";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import {
  Tablo,
  TabloBasHucresi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
} from "../../../bilesenler/parcalar/tablo";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import {
  tukenmisBirimSecilebilirMi,
  UrunSayfasiYuvalari,
} from "../../eklentiler/urun-sayfasi-yuvalari";
import { Bolum } from "../../izleme/bolum";
import { yazilanIslevler } from "../../kayitlar/islevler";
import { sepetSinirlari } from "../../kayitlar/sepet";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import type { FiyatAraligi } from "../../moduller/fiyat/gosterim";
import { stokGosterimMetinleri } from "../../moduller/stok/semalar";
import { urunler } from "../../moduller/urun/model";
import { vitrinKosulu } from "../../moduller/urun/vitrin";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { kayitAdresleri, vitrinAdresleri } from "../adresler";
import { seritSiniflari } from "../bolumler/ortak/urun-izgarasi";
import { FavoriDugmesi } from "../favori-dugmesi";
import {
  type AdresParametreleri,
  kayitSayfasininBilgisi,
  type SorguParametreleri,
  sayfaninKaydi,
  sorguMetni,
} from "../kayit-sayfasi";
import { SepeteEkleAlani } from "../sepet/sepete-ekle";
import { vitrinTemasi } from "../tema-secimi";
import { FiyatGosterimi } from "../urun-karti/fiyat";
import { urunKartiGorunumu } from "../urun-karti/gorunum";
import { UrunKarti } from "../urun-karti/urun-karti";
import { yalnizGezintiMi } from "../yalniz-gezinti";
import { adrestekiSecim, ilkSecim } from "./secim";
import { type DegisenBilgiler, UrunUstKismi } from "./urun-ust";
import { type StokGosterimiVerisi, type UrunSayfasiVerisi, urunSayfasiVerisi } from "./veri";
import { PuanSatiri, UrunYorumlari, yorumBolumuKimligi, yorumSayfasiParametresi } from "./yorumlar";

const ilkDeger = (deger: string | string[] | undefined) =>
  Array.isArray(deger) ? deger[0] : deger;

export const urunSayfasininBilgisi = async (
  parametreler: AdresParametreleri,
  sorgu: SorguParametreleri,
): Promise<Metadata> => {
  const bilgi = await kayitSayfasininBilgisi("urun", parametreler, sorgu);
  const { adresAdi } = await parametreler;
  const [urun] = await siteninVeritabani()
    // Listede görünür mü: vitrinin tek koşuluyla (tükenmişlik listeden çıkarmaz, sayfa yine dizinlenir).
    .select({ listede: sql<boolean>`${vitrinKosulu("liste", { tukenenUrun: "goster" })}` })
    .from(urunler)
    .where(and(eq(urunler.adres_adi, adresAdi), isNull(urunler.silinme_zamani)))
    .limit(1);
  // Ürün yoksa bilgi "bulunamadı"nındır (eski adres yukarıda yönlenmiştir); kanonik adres verilmez.
  if (urun === undefined) return bilgi;
  return {
    ...bilgi,
    alternates: { canonical: kayitAdresleri.urun(adresAdi) },
    // Listede görünmeyen ama sayfası açılan ürün (gizli, karar 0062) yalnız bağlantıyla açılır: arama motoru
    // dizine almaz (bağımsız kontrolün bulgusu).
    ...(urun.listede ? {} : { robots: { index: false, follow: false } }),
  };
};

const bolumBasligiSiniflari =
  "min-w-0 font-baslik text-baslik-3 font-baslik-kalinligi wrap-anywhere tablet:text-baslik-2";

// Stok yazısı: renk yalnız destekler, durum yazıyla verilir (.claude/rules/erisilebilirlik.md).
const stokSiniflari: Record<StokGosterimiVerisi["tur"], string> = {
  stokta: "text-basari-yazi",
  "son-adet": "text-uyari-yazi",
  tukendi: "text-tehlike-yazi",
};

function StokYazisi({ stok }: { stok: StokGosterimiVerisi }) {
  const yazi =
    stok.tur === "son-adet"
      ? doldur(metin(stokGosterimMetinleri["son-adet"]), {
          adet: siteninBicimleyicisi(calisanSite().ayarlar).sayi(stok.adet),
        })
      : metin(stokGosterimMetinleri[stok.tur]);
  return (
    <span
      data-slot="stok-durumu"
      className={sinif("flex items-center gap-2 font-kalin", stokSiniflari[stok.tur])}
    >
      <span aria-hidden="true" className="size-2 rounded-dugme bg-current" />
      {yazi}
    </span>
  );
}

function FiyatBilgisi({ fiyat }: { fiyat: FiyatAraligi | undefined }) {
  if (fiyat === undefined) return null;
  const bicim = siteninBicimleyicisi(calisanSite().ayarlar);
  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        {fiyat.indirim === undefined ? null : (
          <Rozet>
            {fiyat.indirim.varan
              ? doldur(metin("vitrin.urunKarti.varanIndirim"), {
                  oran: bicim.yuzde(fiyat.indirim.oran),
                  ek: bicim.yonelmeEki(fiyat.indirim.oran),
                })
              : doldur(metin("vitrin.urunKarti.indirim"), {
                  oran: bicim.yuzde(fiyat.indirim.oran),
                })}
          </Rozet>
        )}
        <FiyatGosterimi fiyat={fiyat} boyut="buyuk" className="min-w-0 flex-1" />
      </div>
      {fiyat.indirimBitisi === undefined ? null : (
        <span className="text-kucuk font-kalin text-indirim">
          {doldur(metin("vitrin.urunSayfasi.indirimBitisi"), {
            tarih: bicim.tarihSaat(fiyat.indirimBitisi),
          })}
        </span>
      )}
    </>
  );
}

const stokKodu = (kod: string | undefined): ReactNode =>
  kod === undefined ? null : (
    <span className="text-kucuk text-soluk-yazi">
      {doldur(metin("vitrin.urunSayfasi.stokKodu"), { kod })}
    </span>
  );

function KargoBilgisi({ gun }: { gun: number | undefined }) {
  if (gun === undefined) return null;
  const yazi =
    gun === 0
      ? metin("vitrin.urunSayfasi.ayniGunKargo")
      : doldur(metin("vitrin.urunSayfasi.kargo"), {
          gun: siteninBicimleyicisi(calisanSite().ayarlar).sayi(gun),
        });
  return (
    <div className="flex flex-col gap-2 rounded-orta bg-yuzey px-4 py-3">
      <span className="flex items-center gap-3">
        <Ikon ad="kargo" className="size-5 shrink-0 text-soluk-yazi" />
        {yazi}
      </span>
    </div>
  );
}

const degisenBilgiler = (
  fiyat: FiyatAraligi | undefined,
  stok: StokGosterimiVerisi,
  kod: string | undefined,
): DegisenBilgiler => ({
  fiyat: <FiyatBilgisi fiyat={fiyat} />,
  stok: <StokYazisi stok={stok} />,
  stokKodu: stokKodu(kod),
});

function AltKisim({
  veri,
  kartGorunumu,
  sonrakiYorumAdresi,
}: {
  veri: UrunSayfasiVerisi;
  kartGorunumu: Parameters<typeof UrunKarti>[0]["gorunum"];
  sonrakiYorumAdresi: string | undefined;
}) {
  return (
    <div className="mt-12 flex min-w-0 flex-col gap-12">
      {veri.uzunAciklama === undefined ? null : (
        <section aria-labelledby="urun-aciklamasi" className="flex min-w-0 flex-col gap-4">
          <h2 id="urun-aciklamasi" className={bolumBasligiSiniflari}>
            {metin("vitrin.urunSayfasi.aciklama")}
          </h2>
          <div
            data-slot="bicimli-metin"
            className="bicimli-metin max-w-metin text-govde wrap-anywhere"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: açıklama aciklamayiTemizle'den geçmiştir (karar 0108).
            dangerouslySetInnerHTML={{ __html: veri.uzunAciklama }}
          />
        </section>
      )}
      {veri.ozellikler.length === 0 ? null : (
        <section aria-labelledby="urun-ozellikleri" className="flex min-w-0 flex-col gap-4">
          <h2 id="urun-ozellikleri" className={bolumBasligiSiniflari}>
            {metin("vitrin.urunSayfasi.ozellikler")}
          </h2>
          <Tablo className="max-w-metin text-govde">
            <TabloGovdesi>
              {veri.ozellikler.map((ozellik) => (
                <TabloSatiri key={ozellik.ad}>
                  <TabloBasHucresi
                    scope="row"
                    className="w-2/5 bg-yuzey px-3 py-3 text-left align-top font-kalin text-soluk-yazi wrap-anywhere tablet:px-4"
                  >
                    {ozellik.ad}
                  </TabloBasHucresi>
                  <TabloHucresi className="px-3 py-3 align-top wrap-anywhere tablet:px-4">
                    {ozellik.deger}
                  </TabloHucresi>
                </TabloSatiri>
              ))}
            </TabloGovdesi>
          </Tablo>
        </section>
      )}
      {/* Yorumlar özellik tablosundan sonra, ilgili ürünlerden önce (kart 0139); yorum işleviyle çizilir. */}
      {yazilanIslevler.yorum ? (
        <UrunYorumlari
          urun={veri.kimlik}
          urunAdi={veri.ad}
          puan={veri.puan}
          liste={veri.yorumlar}
          dogrulanmisAliciEtiketi={veri.dogrulanmisAliciEtiketi}
          sonrakiAdres={sonrakiYorumAdresi}
          yorumYazilir={!yalnizGezintiMi()}
        />
      ) : null}
      {veri.ilgili.length === 0 ? null : (
        <section aria-labelledby="ilgili-urunler" className="flex min-w-0 flex-col gap-4">
          <h2 id="ilgili-urunler" className={bolumBasligiSiniflari}>
            {metin("vitrin.urunSayfasi.ilgili")}
          </h2>
          <Bolum>
            <Serit
              className="min-w-0"
              metinler={{
                etiket: metin("vitrin.urunSayfasi.ilgili"),
                seritTanimi: metin("ortak.parca.seritTanimi"),
                ogeTanimi: metin("ortak.parca.seritOgesi"),
                onceki: metin("ortak.parca.onceki"),
                sonraki: metin("ortak.parca.sonraki"),
              }}
            >
              <SeritIcerigi>
                {veri.ilgili.map((urun) => (
                  <SeritOgesi key={urun.kimlik} className={seritSiniflari[kartGorunumu]}>
                    <UrunKarti
                      urun={urun}
                      gorunum={kartGorunumu}
                      islevler={yazilanIslevler}
                      className="h-full"
                    />
                  </SeritOgesi>
                ))}
              </SeritIcerigi>
              <SeritDugmeleri />
            </Serit>
          </Bolum>
        </section>
      )}
    </div>
  );
}

export async function UrunSayfasi({
  parametreler,
  sorgu,
}: {
  parametreler: AdresParametreleri;
  sorgu: SorguParametreleri;
}) {
  const kayit = await sayfaninKaydi("urun", parametreler, sorgu);
  const sorguDegerleri = await sorgu;
  const yorumSayfasi = Number(ilkDeger(sorguDegerleri[yorumSayfasiParametresi]) ?? 1);
  const vt = siteninVeritabani();
  const [veri, tema] = await Promise.all([
    urunSayfasiVerisi(vt, calisanSite(), kayit.kimlik, { yorumSayfasi }),
    vitrinTemasi(vt, calisanSite()),
  ]);
  if (veri === undefined) notFound();
  const secim = ilkSecim(veri.secenekler, veri.birimler, sorguDegerleri, veri.secenekOnSecimi);
  // Yorumların bir sonraki sayfası: adresin öteki parametreleri (seçim) korunur, yorumlara inilir.
  const sonrakiYorumAdresi =
    veri.yorumlar.sayfa < veri.yorumlar.sayfaSayisi
      ? `${kayitAdresleri.urun(veri.adresAdi)}${sorguMetni({
          ...sorguDegerleri,
          [yorumSayfasiParametresi]: String(veri.yorumlar.sayfa + 1),
        })}#${yorumBolumuKimligi}`
      : undefined;
  const kartGorunumu = urunKartiGorunumu(tema.tema.tanim.gorunumler);
  const ustBaglanti = veri.marka ?? veri.kategori;
  const adimlar = [
    { ad: metin("vitrin.sayfa.anasayfa"), adres: vitrinAdresleri.anasayfa },
    ...(veri.kategori === undefined ? [] : [veri.kategori]),
    { ad: veri.ad, adres: kayitAdresleri.urun(veri.adresAdi) },
  ];
  return (
    <main className="mx-auto flex w-full max-w-icerik flex-col gap-3 px-4 pt-5 pb-12 tablet:px-6">
      <SayfaYolu
        etiket={metin("ortak.parca.sayfaYolu")}
        ayrac={metin("ortak.parca.sayfaYoluAyraci")}
        adimlar={adimlar}
      />
      <UrunUstKismi
        urunAdi={veri.ad}
        basliklar={
          <div className="flex min-w-0 flex-col gap-1">
            {/* Başlığın üstünde marka, markasız üründe kategori (Canlı Çarşı taslağı). */}
            {ustBaglanti === undefined ? null : (
              <Baglanti
                href={ustBaglanti.adres}
                // Kısa ad ("Giyim") 44 px'ten dardır: basılan alan dokunma-alani ile 44 × 44 px'tir (kart 0146).
                className="dokunma-alani w-fit text-kucuk font-kalin text-soluk-yazi"
              >
                {ustBaglanti.ad}
              </Baglanti>
            )}
            <SayfaBasligi baslik={veri.ad} />
            {yazilanIslevler.yorum ? <PuanSatiri puan={veri.puan} /> : null}
          </div>
        }
        kisaAciklama={veri.kisaAciklama === undefined ? null : <p>{veri.kisaAciklama}</p>}
        altBilgi={<KargoBilgisi gun={veri.kargoyaVermeSuresi} />}
        eylemler={(() => {
          const favori = yazilanIslevler.favori ? (
            <FavoriDugmesi urun={veri.kimlik} urunAdi={veri.ad} tur="cerceveli" />
          ) : null;
          // Sepete ekle (kart 0212): satılabilir birleşimlerin gösterilen birim fiyatı; seçili birim üst kısımdandır.
          if (!yazilanIslevler.sepet) {
            return favori === null ? null : <div className="flex items-center gap-2">{favori}</div>;
          }
          return (
            <SepeteEkleAlani
              urunAdi={veri.ad}
              birimler={Object.fromEntries(
                veri.birimler.flatMap((birim) =>
                  birim.satilabilir && birim.fiyat !== undefined
                    ? [[birim.kimlik, birim.fiyat.enDusuk.tutar]]
                    : [],
                ),
              )}
              enAz={veri.alimAdedi.enAz}
              enCok={veri.alimAdedi.enCok ?? sepetSinirlari.adetEnCok}
            >
              {favori}
            </SepeteEkleAlani>
          );
        })()}
        yuvalar={
          // Eklentilerin yuvası (karar 0117): her biri kendi parçasını verir ya da çizmez. Bozulan eklenti sayfayı
          // düşürmez.
          <Bolum>
            <UrunSayfasiYuvalari
              vt={vt}
              site={calisanSite()}
              birimler={veri.birimler.map(({ kimlik }) => kimlik)}
            />
          </Bolum>
        }
        galeri={veri.galeri}
        anaGorselSirasi={veri.anaGorselSirasi}
        secenekler={veri.secenekler}
        birimler={veri.birimler.map(({ kimlik, degerler, satilabilir, gorselSirasi }) => ({
          kimlik,
          degerler,
          satilabilir,
          ...(gorselSirasi === undefined ? {} : { gorselSirasi }),
        }))}
        ilkSecim={secim}
        ilkTercih={adrestekiSecim(veri.secenekler, veri.birimler, sorguDegerleri)}
        bilgiler={Object.fromEntries(
          veri.birimler.map((birim) => [
            birim.kimlik,
            degisenBilgiler(birim.fiyat, birim.stok, birim.stokKodu),
          ]),
        )}
        genelBilgi={degisenBilgiler(veri.genel.fiyat, veri.genel.stok, undefined)}
        tukenmisSecenek={veri.tukenmisSecenek}
        tukenmisSecilebilir={tukenmisBirimSecilebilirMi(calisanSite())}
      />
      <AltKisim veri={veri} kartGorunumu={kartGorunumu} sonrakiYorumAdresi={sonrakiYorumAdresi} />
    </main>
  );
}
