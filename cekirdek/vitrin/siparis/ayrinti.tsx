// Siparişin müşteriye gösterilen ayrıntısı (kart 0238, karar 0145, 0150; Canlı Çarşı taslağı siparis-ve-hesap.html):
// hesaptaki sipariş ayrıntısı ve üye olmayanın sipariş takibi aynı görünüşten çizilir. Veri musteriSiparisleri'nden
// (cekirdek/moduller/siparis/musteri.ts) gelir; takipte teslimat kısaltılmış, fatura ve e-posta yoktur.
//
// Üstte numara, tarih, ödeme yöntemi ve durum; ödeme bekleyen havalede banka hesapları, öteki durumlarda ilerleme
// şeridi (alındı, hazırlanıyor, kargoda, teslim edildi), iptalde uyarı; kargoya verilmiş siparişte firma, takip
// numarası ve takip bağlantısı. Altında ürünler, sipariş geçmişi (durumlar, mağazanın müşteriye notları, iptal ve
// iadeler), tutar ve teslimat. Tutarlar siparişin saklanan değerleridir. Teslim edilmiş siparişte, sayfası açık ürüne
// "Yorum yaz" (yalnız hesapta; yorum yalnız giriş yapmış müşterinindir).
//
// İade talebi ve kendi iptal (kart 0239, karar 0151): talep açılabiliyorsa "İade talebi oluştur" talep sayfasına gider;
// süre dolduysa son gün, bekleyen talep varsa incelendiği yazılır. Talepler ve mağazanın kararı (ret açıklamasıyla)
// geçmişte görünür. Ayar izin veriyorsa "Siparişi iptal et" onay penceresiyle sorulur; ödemesi havaleyle alınmış
// siparişte iptal için mağazayla iletişim söylenir. İki yol da (hesap ve takip) aynıdır.
import type { ReactNode } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import type { MusteriIadeNedeni } from "../../kayitlar/siparis";
import {
  type SiparisDurumu,
  type SiparisGecmisiNedeni,
  satinAlmaDurumlari,
  siparisTakipCerezi,
} from "../../kayitlar/siparis";
import { gununBasi } from "../../metinler/bicimleyici";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin, type siteninBicimleyicisi } from "../../metinler/site-metni";
import type { MusteriSiparisi } from "../../moduller/siparis/musteri";
import { SatirGorseli, SepetOzeti } from "../sepet/sepet-gorunumu";
import { yorumBolumuKimligi } from "../urun-sayfasi/yorumlar";
import {
  adresSatiri,
  faturaSatiri,
  HavaleOdemeKarti,
  kisiSatiri,
  odemeYontemiYazisi,
  SiparisDurumRozeti,
  siparisTutarlari,
} from "./parcalar";
import { SiparisIptali } from "./siparis-iptali";
import type { SiparisUrunu } from "./urunler";

type Bicim = ReturnType<typeof siteninBicimleyicisi>;

// Faturanın PDF'inin uçları (kart 0268): hesapta müşteri ucu, takipte takip anahtarıyla açılan uç (takip çerezinin
// yolunun altında).
const faturaAdresleri = {
  hesap: "/kapi/musteri/siparis-faturasi",
  takip: `${siparisTakipCerezi.kapiYolu}/fatura`,
} as const;

// Geçmişin müşteriye yazılan olayı. İptal ve iade geçmişten değil iade kayıtlarından yazılır (tutarıyla); panelden
// oluşturma müşteriye "Sipariş alındı"dır.
const olaylar: Record<SiparisGecmisiNedeni, MetinAnahtari | null> = {
  olusturuldu: "vitrin.siparis.olay.olusturuldu",
  "panelden-olusturuldu": "vitrin.siparis.olay.olusturuldu",
  "havale-suresi-doldu": "vitrin.siparis.olay.havale-suresi-doldu",
  "havale-bildirildi": "vitrin.siparis.olay.havale-bildirildi",
  "havale-onaylandi": "vitrin.siparis.olay.havale-onaylandi",
  "hazirlamaya-alindi": "vitrin.siparis.olay.hazirlamaya-alindi",
  "kargoya-verildi": "vitrin.siparis.olay.kargoya-verildi",
  "kargo-duzeltildi": "vitrin.siparis.olay.kargo-duzeltildi",
  "teslim-edildi": "vitrin.siparis.olay.teslim-edildi",
  "yonetici-iptali": null,
  "iade-yapildi": null,
  // Talepler ve müşterinin iptali talep ve iade kayıtlarından yazılır (kalemleri ve kararıyla).
  "iade-talebi-alindi": null,
  "iade-talebi-onaylandi": null,
  "iade-talebi-reddedildi": null,
  "musteri-iptali": null,
  // Kart 0269: mağaza teslimat ya da fatura bilgilerini düzeltti.
  "adres-duzeltildi": "vitrin.siparis.olay.adres-duzeltildi",
};

// Müşterinin talep nedenlerinin metni (kayıttaki musteriIadeNedenleri).
export const talepNedenMetinleri: Record<MusteriIadeNedeni, MetinAnahtari> = {
  "beklentiyi-karsilamadi": "vitrin.iadeTalebi.neden.beklentiyi-karsilamadi",
  "kusurlu-hasarli": "vitrin.iadeTalebi.neden.kusurlu-hasarli",
  "yanlis-urun": "vitrin.iadeTalebi.neden.yanlis-urun",
  "beden-uymadi": "vitrin.iadeTalebi.neden.beden-uymadi",
  diger: "vitrin.iadeTalebi.neden.diger",
};

// İlerleme şeridinin adımları ve her durumun şeritteki yeri (son adımdan sonrası hepsi bitmiş).
const adimlar: readonly MetinAnahtari[] = [
  "vitrin.siparis.adim.alindi",
  "vitrin.siparis.adim.hazirlaniyor",
  "vitrin.siparis.adim.kargoda",
  "vitrin.siparis.adim.teslim",
];
const seritYeri: Record<Exclude<SiparisDurumu, "iptal">, number> = {
  "odeme-bekleniyor": 0,
  hazirlaniyor: 1,
  kargoda: 2,
  "teslim-edildi": 4,
  "kismi-iade": 4,
  "iade-edildi": 4,
};

function Bolum({
  kimlik,
  baslik,
  children,
  className,
}: {
  kimlik: string;
  baslik: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Kart
      role="region"
      aria-labelledby={kimlik}
      className={sinif("flex flex-col gap-4 p-4 tablet:p-5", className)}
    >
      <h2 id={kimlik} className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {baslik}
      </h2>
      {children}
    </Kart>
  );
}

function IlerlemeSeridi({ siparis, bicim }: { siparis: MusteriSiparisi; bicim: Bicim }) {
  if (siparis.durum === "iptal") return null;
  const yer = seritYeri[siparis.durum];
  const hazirlanma = siparis.gecmis.find((satir) => satir.durum === "hazirlaniyor")?.zaman;
  const zamanlar = [siparis.olusturma, hazirlanma, siparis.kargo?.zaman, siparis.teslimZamani];
  return (
    <ol
      aria-label={metin("vitrin.siparis.durumSeridi")}
      className="grid grid-cols-2 gap-x-3 gap-y-4 tablet:grid-cols-4"
    >
      {adimlar.map((adim, sira) => {
        // Taslaktaki gibi: biten adımın çizgisi yeşil, bulunulan adımınki ana renkte, gelecek adımlar soluk.
        const simdiki = sira === yer && yer < 4;
        const bitti = !simdiki && (sira < yer || yer === 4);
        const zaman = zamanlar[sira];
        return (
          <li
            key={adim}
            {...(simdiki ? { "aria-current": "step" as const } : {})}
            className={sinif(
              "flex flex-col gap-1 border-t-2 pt-2",
              bitti ? "border-basari-yazi" : simdiki ? "border-birincil" : "border-kenar",
            )}
          >
            <span className={bitti || simdiki ? "font-kalin" : "text-soluk-yazi"}>
              {metin(adim)}
            </span>
            {zaman == null || !(bitti || simdiki) ? null : (
              <time dateTime={zaman.toISOString()} className="text-kucuk text-soluk-yazi">
                {bicim.tarihSaat(zaman)}
              </time>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// not: mağazanın müşteriye notu, taslaktaki gibi zeminli kutuda.
type Olay = { zaman: Date; baslik: string; ayrinti?: string; not?: true };

const olaylariKur = (siparis: MusteriSiparisi, bicim: Bicim): Olay[] => {
  const kalemAdi = new Map(siparis.kalemler.map((kalem) => [kalem.sira, kalem.urun_adi]));
  // Kargo bilgisi siparişin bugünkü hâlidir: yalnız en son kargo olayına yazılır (düzeltilmeden önceki numara
  // geçmişte saklanmaz, bağımsız kontrolün bulgusu).
  const sonKargoOlayi = siparis.gecmis.findLastIndex(
    (satir) => satir.neden === "kargoya-verildi" || satir.neden === "kargo-duzeltildi",
  );
  const liste: Olay[] = [
    ...siparis.gecmis.flatMap((satir, sira): Olay[] => {
      const anahtar = olaylar[satir.neden as SiparisGecmisiNedeni];
      if (anahtar === null || anahtar === undefined) return [];
      const kargo =
        sira === sonKargoOlayi && siparis.kargo !== null
          ? [siparis.kargo.firma, siparis.kargo.takipNumarasi].filter(Boolean).join(" · ")
          : undefined;
      return [{ zaman: satir.zaman, baslik: metin(anahtar), ...(kargo ? { ayrinti: kargo } : {}) }];
    }),
    ...siparis.talepler.flatMap((talep): Olay[] => {
      const ayrinti = [
        ...talep.kalemler.map((kalem) =>
          doldur(metin("vitrin.siparis.iadeKalemi"), {
            adet: String(kalem.adet),
            urun: kalemAdi.get(kalem.sira) ?? "",
          }),
        ),
        metin(talepNedenMetinleri[talep.neden]),
      ].join(" · ");
      const alindi: Olay = {
        zaman: talep.zaman,
        baslik: metin("vitrin.siparis.olay.talepAlindi"),
        ayrinti,
      };
      if (talep.kararZamani === null) return [alindi];
      return [
        alindi,
        talep.durum === "reddedildi"
          ? {
              zaman: talep.kararZamani,
              baslik: metin("vitrin.siparis.olay.talepReddedildi"),
              ...(talep.retAciklamasi === null
                ? {}
                : { ayrinti: talep.retAciklamasi, not: true as const }),
            }
          : {
              zaman: talep.kararZamani,
              baslik: metin("vitrin.siparis.olay.talepOnaylandi"),
              ayrinti: metin("vitrin.siparis.olay.talepOnaylandiAyrinti"),
            },
      ];
    }),
    ...siparis.notlar.map((not) => ({
      zaman: not.zaman,
      baslik: metin("vitrin.siparis.olay.magazadanNot"),
      ayrinti: not.metin,
      not: true as const,
    })),
    ...siparis.iadeler.map((iade): Olay => {
      const tutar = bicim.para(iade.tutar);
      const bekliyor = iade.durum === "bekliyor";
      const baslik =
        iade.tur === "iptal"
          ? iade.tutar === 0
            ? metin("vitrin.siparis.olay.iptal")
            : doldur(
                metin(
                  bekliyor
                    ? "vitrin.siparis.olay.iptalIadeBekliyor"
                    : "vitrin.siparis.olay.iptalIade",
                ),
                { tutar },
              )
          : doldur(
              metin(bekliyor ? "vitrin.siparis.olay.iadeBekliyor" : "vitrin.siparis.olay.iade"),
              { tutar },
            );
      const parcalar = [
        ...(iade.tur === "iade"
          ? iade.kalemler.map((kalem) =>
              doldur(metin("vitrin.siparis.iadeKalemi"), {
                adet: String(kalem.adet),
                urun: kalemAdi.get(kalem.sira) ?? "",
              }),
            )
          : []),
        ...(iade.tur === "iade" && iade.kargoTutari > 0
          ? [metin("vitrin.siparis.kargoUcreti")]
          : []),
      ];
      return {
        zaman: iade.zaman,
        baslik,
        ...(parcalar.length === 0 ? {} : { ayrinti: parcalar.join(" · ") }),
      };
    }),
  ];
  // En yeni önce; aynı anda yazılanlarda yazılma sırası korunur (sıralama kararlıdır).
  return liste
    .map((olay, sira) => ({ olay, sira }))
    .sort((a, b) => b.olay.zaman.getTime() - a.olay.zaman.getTime() || b.sira - a.sira)
    .map(({ olay }) => olay);
};

export function SiparisAyrintisi({
  siparis,
  urunler,
  bicim,
  yol,
  bankaHesaplari,
  yorumAcik,
  talepAdresi,
  saatDilimi,
}: {
  // İade talebi sayfasının adresi (hesapta siparişin, takipte takip sayfasının altında).
  talepAdresi: string;
  siparis: MusteriSiparisi;
  urunler: ReadonlyMap<string, SiparisUrunu>;
  bicim: Bicim;
  yol: "hesap" | "takip";
  bankaHesaplari: readonly { kimlik: string; banka: string; sahip: string; iban: string }[];
  // Yorum işlevi açık mı (cekirdek/kayitlar/islevler.ts).
  yorumAcik: boolean;
  // Sitenin saat dilimi: faturanın takvim günü o dilimde biçimlenir.
  saatDilimi: string;
}) {
  const havaleBekliyor = siparis.odemeYontemi === "havale" && siparis.durum === "odeme-bekleniyor";
  const yorumYazilir =
    yol === "hesap" &&
    yorumAcik &&
    (satinAlmaDurumlari as readonly SiparisDurumu[]).includes(siparis.durum);
  const adet = siparis.kalemler.reduce((toplam, kalem) => toplam + kalem.adet, 0);
  const iadeEdilen = siparis.iadeler
    .filter((iade) => iade.durum === "tamamlandi")
    .reduce((toplam, iade) => toplam + iade.tutar, 0);
  const olayListesi = olaylariKur(siparis, bicim);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-baslik text-baslik-2 font-baslik-kalinligi tablet:text-baslik-1">
            {doldur(metin("vitrin.siparis.baslik"), { numara: siparis.numara })}
          </h1>
          <p className="text-soluk-yazi">
            {doldur(metin("vitrin.siparis.tarihVeOdeme"), {
              tarih: bicim.uzunTarih(siparis.olusturma),
              odeme: odemeYontemiYazisi(siparis.odemeYontemi, siparis.kapidaSecenegi),
            })}
          </p>
        </div>
        <SiparisDurumRozeti durum={siparis.durum} />
      </div>
      {siparis.kisiselVeriSilindi && yol === "hesap" ? (
        <Uyari tur="bilgi">{metin("vitrin.siparis.kisiselSilindi")}</Uyari>
      ) : null}
      {siparis.durum === "iptal" ? (
        <Uyari tur="tehlike">{metin("vitrin.siparis.iptal")}</Uyari>
      ) : havaleBekliyor ? (
        <HavaleOdemeKarti
          bicim={bicim}
          numara={siparis.numara}
          toplam={siparis.toplam}
          sonZaman={siparis.odemeSonZamani}
          hesaplar={bankaHesaplari}
        />
      ) : (
        <IlerlemeSeridi siparis={siparis} bicim={bicim} />
      )}
      {siparis.kargo === null ? null : (
        <Kart className="flex flex-col gap-3 bg-yuzey p-4 tablet:flex-row tablet:items-center tablet:justify-between">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Ikon ad="kargo" />
            <span className="font-kalin">{siparis.kargo.firma}</span>
            {siparis.kargo.takipNumarasi === null ? null : (
              <span className="wrap-anywhere">
                {doldur(metin("vitrin.siparis.takipNumarasi"), {
                  numara: siparis.kargo.takipNumarasi,
                })}
              </span>
            )}
          </p>
          {siparis.kargo.takipAdresi === null ? null : (
            <Baglanti
              href={siparis.kargo.takipAdresi}
              target="_blank"
              rel="noopener noreferrer"
              gorunum="cerceveli"
              className="self-start tablet:self-auto"
            >
              {metin("vitrin.siparis.kargoyuTakipEt")}
              <Ikon ad="yeni-sekme" />
              <span className="sr-only">{metin("vitrin.siparis.yeniSekmede")}</span>
            </Baglanti>
          )}
        </Kart>
      )}
      <div className="flex flex-col gap-5 masaustu:flex-row masaustu:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <Bolum kimlik="siparis-urunleri" baslik={metin("vitrin.siparis.urunler")}>
            <ul className="flex flex-col divide-y divide-kenar">
              {siparis.kalemler.map((kalem) => {
                const urun = urunler.get(kalem.birim_kimligi);
                return (
                  <li
                    key={kalem.sira}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <SatirGorseli
                      satir={urun?.gorsel === undefined ? {} : { gorsel: urun.gorsel }}
                      buyukluk="size-16"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      {urun?.adres === undefined ? (
                        <span className="font-kalin wrap-anywhere">{kalem.urun_adi}</span>
                      ) : (
                        <Baglanti href={urun.adres} className="self-start wrap-anywhere">
                          {kalem.urun_adi}
                        </Baglanti>
                      )}
                      {kalem.secim.length === 0 ? null : (
                        <span className="text-kucuk text-soluk-yazi">
                          {kalem.secim
                            .map((secim) => doldur(metin("vitrin.sepet.secim"), secim))
                            .join(" · ")}
                        </span>
                      )}
                      <span className="text-kucuk text-soluk-yazi">
                        {doldur(metin("vitrin.siparis.adetFiyat"), {
                          adet: String(kalem.adet),
                          fiyat: bicim.para(kalem.birim_tutari),
                        })}
                      </span>
                      {kalem.iadeAdedi === 0 ? null : (
                        <Rozet tur="basari" className="self-start">
                          {doldur(metin("vitrin.siparis.iadeAdedi"), {
                            adet: String(kalem.iadeAdedi),
                          })}
                        </Rozet>
                      )}
                      {yorumYazilir && urun?.adres !== undefined ? (
                        <Baglanti
                          href={`${urun.adres}#${yorumBolumuKimligi}`}
                          aria-label={doldur(metin("vitrin.siparis.yorumYazAdi"), {
                            urun: kalem.urun_adi,
                          })}
                          className="self-start"
                        >
                          <Ikon ad="yildiz" />
                          {metin("vitrin.siparis.yorumYaz")}
                        </Baglanti>
                      ) : null}
                    </span>
                    <span className="whitespace-nowrap font-kalin">{bicim.para(kalem.tutar)}</span>
                  </li>
                );
              })}
            </ul>
          </Bolum>
          {/* Takipte geçmiş yoktur; iade taleplerinin sonucu (ret açıklamasıyla) ayrı bölümde görünür (kart 0239). */}
          {yol === "takip" && siparis.talepler.length > 0 ? (
            <Bolum kimlik="siparis-iade-talepleri" baslik={metin("vitrin.siparis.talepler")}>
              <ul className="flex flex-col gap-4">
                {siparis.talepler.toReversed().map((talep) => (
                  <li key={talep.kimlik} className="flex flex-col gap-1">
                    <span className="font-kalin">
                      {metin(
                        talep.durum === "bekliyor"
                          ? "vitrin.siparis.olay.talepAlindi"
                          : talep.durum === "onaylandi"
                            ? "vitrin.siparis.olay.talepOnaylandi"
                            : "vitrin.siparis.olay.talepReddedildi",
                      )}
                    </span>
                    <span className="text-kucuk text-soluk-yazi">
                      {[
                        ...talep.kalemler.map((kalem) =>
                          doldur(metin("vitrin.siparis.iadeKalemi"), {
                            adet: String(kalem.adet),
                            urun:
                              siparis.kalemler.find((k) => k.sira === kalem.sira)?.urun_adi ?? "",
                          }),
                        ),
                        metin(talepNedenMetinleri[talep.neden]),
                      ].join(" · ")}
                    </span>
                    {talep.retAciklamasi === null ? null : (
                      <span className="rounded-orta bg-yuzey px-3 py-2 whitespace-pre-line wrap-anywhere">
                        {talep.retAciklamasi}
                      </span>
                    )}
                    <time
                      dateTime={(talep.kararZamani ?? talep.zaman).toISOString()}
                      className="text-kucuk text-soluk-yazi"
                    >
                      {bicim.tarihSaat(talep.kararZamani ?? talep.zaman)}
                    </time>
                  </li>
                ))}
              </ul>
            </Bolum>
          ) : null}
          {/* Takipte geçmiş yoktur (taslak; mağazanın notları takipte görünmez, karar 0150). */}
          {yol === "takip" ? null : (
            <Bolum kimlik="siparis-gecmisi" baslik={metin("vitrin.siparis.gecmis")}>
              <ol className="flex flex-col gap-4 border-l-2 border-kenar pl-4">
                {olayListesi.map((olay, sira) => (
                  <li
                    // Olaylar sabit sıradadır; aynı anda yazılan iki olayın zamanı aynı olabilir.
                    // biome-ignore lint/suspicious/noArrayIndexKey: liste sunucuda bir kez çizilir.
                    key={sira}
                    className="relative flex flex-col gap-1"
                  >
                    {/* Çizginin üstündeki nokta; en yeni olay ana renkte. */}
                    <span
                      aria-hidden="true"
                      className={sinif(
                        "absolute top-1 -left-6 size-3 rounded-dugme border-2 border-zemin",
                        sira === 0 ? "bg-birincil" : "bg-soluk-yazi",
                      )}
                    />
                    <span className="font-kalin">{olay.baslik}</span>
                    {olay.ayrinti === undefined ? null : (
                      <span
                        className={sinif(
                          "whitespace-pre-line wrap-anywhere",
                          olay.not
                            ? "rounded-orta bg-yuzey px-3 py-2"
                            : "text-kucuk text-soluk-yazi",
                        )}
                      >
                        {olay.ayrinti}
                      </span>
                    )}
                    <time
                      dateTime={olay.zaman.toISOString()}
                      className="text-kucuk text-soluk-yazi"
                    >
                      {bicim.tarihSaat(olay.zaman)}
                    </time>
                  </li>
                ))}
              </ol>
            </Bolum>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-5 masaustu:w-form masaustu:shrink-0">
          <Bolum kimlik="siparis-tutari" baslik={metin("vitrin.siparis.tutar")}>
            <SepetOzeti
              gorunum={siparisTutarlari(bicim, {
                adet,
                kargoTuru: siparis.kargoTuru,
                gosterim: siparis.gosterim,
                vergiDokumu: siparis.vergiDokumu,
                araToplam: siparis.araToplam,
                kargoTutari: siparis.kargoTutari,
                vergiToplami: siparis.vergiToplami,
                toplam: siparis.toplam,
              })}
            />
            {siparis.tahsilat === null || siparis.tahsilat.odenen === siparis.toplam ? null : (
              <p className="flex justify-between gap-3 text-kucuk">
                <span>
                  {doldur(metin("vitrin.siparis.kartlaOdenen"), {
                    taksit: String(siparis.tahsilat.taksit),
                  })}
                </span>
                <span className="whitespace-nowrap">{bicim.para(siparis.tahsilat.odenen)}</span>
              </p>
            )}
            {iadeEdilen === 0 ? null : (
              <p className="flex justify-between gap-3 font-kalin text-basari-yazi">
                <span>{metin("vitrin.siparis.iadeEdilen")}</span>
                <span className="whitespace-nowrap">
                  {doldur(metin("vitrin.siparis.eksiTutar"), { tutar: bicim.para(iadeEdilen) })}
                </span>
              </p>
            )}
          </Bolum>
          <Bolum kimlik="siparis-teslimati" baslik={metin("vitrin.siparisAlindi.teslimatVeFatura")}>
            <dl className="flex flex-col gap-1">
              <dt className="text-soluk-yazi">{metin("vitrin.siparisAlindi.teslimatAdresi")}</dt>
              <dd className="mb-2 wrap-anywhere">
                {kisiSatiri(siparis.teslimat, siparis.kisaltilmis)}
                <br />
                {adresSatiri(bicim, siparis.teslimat.adres)}
              </dd>
              {siparis.fatura === null ? null : (
                <>
                  <dt className="text-soluk-yazi">{metin("vitrin.siparisAlindi.fatura")}</dt>
                  <dd className="mb-2 wrap-anywhere">{faturaSatiri(bicim, siparis.fatura)}</dd>
                </>
              )}
              {siparis.eposta === null ? null : (
                <>
                  <dt className="text-soluk-yazi">{metin("vitrin.siparisAlindi.eposta")}</dt>
                  <dd className="wrap-anywhere">{siparis.eposta}</dd>
                </>
              )}
            </dl>
          </Bolum>
          {siparis.faturaBelgesi === null ? null : (
            <Bolum kimlik="siparis-faturasi" baslik={metin("vitrin.siparis.fatura.baslik")}>
              <dl className="flex flex-col gap-1">
                <dt className="text-soluk-yazi">{metin("vitrin.siparis.fatura.numara")}</dt>
                <dd className="mb-2 wrap-anywhere">{siparis.faturaBelgesi.numara}</dd>
                <dt className="text-soluk-yazi">{metin("vitrin.siparis.fatura.tarih")}</dt>
                <dd className={siparis.faturaBelgesi.dosya ? "mb-2" : ""}>
                  {bicim.uzunTarih(gununBasi(siparis.faturaBelgesi.tarih, saatDilimi))}
                </dd>
              </dl>
              {siparis.faturaBelgesi.dosya ? (
                <Baglanti
                  href={`${yol === "hesap" ? faturaAdresleri.hesap : faturaAdresleri.takip}?numara=${encodeURIComponent(siparis.numara)}`}
                  download
                  prefetch={false}
                  gorunum="cerceveli"
                  className="w-fit"
                >
                  <Ikon ad="indir" />
                  {metin("vitrin.siparis.fatura.indir")}
                </Baglanti>
              ) : null}
            </Bolum>
          )}
          <IadeVeIptal siparis={siparis} bicim={bicim} yol={yol} talepAdresi={talepAdresi} />
        </div>
      </div>
    </div>
  );
}

// İade talebi ve iptal satırı (taslağın eylem satırı): yalnız yapılabilen ya da söylenmesi gereken durumda çizilir.
function IadeVeIptal({
  siparis,
  bicim,
  yol,
  talepAdresi,
}: {
  siparis: MusteriSiparisi;
  bicim: Bicim;
  yol: "hesap" | "takip";
  talepAdresi: string;
}) {
  const { iadeTalebi, iptal } = siparis;
  const talepYazisi =
    iadeTalebi.durum === "sure-doldu" && iadeTalebi.sonZaman !== null
      ? doldur(metin("vitrin.siparis.talepSuresiDoldu"), {
          tarih: bicim.uzunTarih(iadeTalebi.sonZaman),
        })
      : iadeTalebi.durum === "bekleyen-var"
        ? metin("vitrin.siparis.talepInceleniyor")
        : null;
  if (iadeTalebi.durum !== "acik" && talepYazisi === null && iptal === "yok") return null;
  return (
    <div className="flex flex-col gap-3">
      {iadeTalebi.durum === "acik" ? (
        <Baglanti href={talepAdresi} gorunum="cerceveli" className="self-start">
          <Ikon ad="iade" />
          {metin("vitrin.siparis.iadeTalebiOlustur")}
        </Baglanti>
      ) : null}
      {talepYazisi === null ? null : <p className="text-kucuk text-soluk-yazi">{talepYazisi}</p>}
      {iptal === "acik" ? (
        <SiparisIptali
          numara={siparis.numara}
          durum={siparis.durum}
          odendi={siparis.odemeZamani !== null}
          yol={yol}
        />
      ) : iptal === "magazadan" ? (
        <p className="text-kucuk text-soluk-yazi">{metin("vitrin.siparis.iptalMagazadan")}</p>
      ) : null}
    </div>
  );
}
