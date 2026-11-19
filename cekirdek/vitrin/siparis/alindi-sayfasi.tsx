// Sipariş alındı sayfası (kart 0214, karar 0141; kart 0211'in taslağı): /siparis-alindi. Sipariş yalnız siparişi veren
// tarayıcının erişim çereziyle okunur (siparisServisi.erisimleOku); çerez yoksa ya da tutmazsa sayfa bulunamadıdır.
// Üstte numara ve teşekkür; havalede son ödeme anı, tutar, açıklamaya yazılacak numara, mağazanın banka hesapları
// (IBAN'ı kopyala) ve "Ödemeyi yaptım, bildir"; kapıda ödemede seçenek ve kargoya verme süresi; altında teslimat ve
// fatura, yanında siparişin saklanan tutarlarıyla özet. Tutarlar sipariş anındakilerdir, yeniden hesaplanmaz.
// Kişiye özel sayfa: arama motorlarına kapalıdır. Tema demosunda bulunamadıdır. Siparişlerim ve sipariş takibi on
// üçüncü bölümdedir.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { adresYazisi } from "../../bolgeler/adres-yazisi";
import { ibanYazisi } from "../../bolgeler/iban-yazisi";
import type { KapidaOdemeSecenegi } from "../../kayitlar/odeme";
import { siparisErisimCerezi } from "../../kayitlar/siparis";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { sayfaBasligi } from "../../moduller/gorunurluk/sayfa-bilgisi";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import type { Fatura, Teslimat } from "../../moduller/odeme/semalar";
import { siparisServisi } from "../../moduller/siparis/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { vitrinAdresleri } from "../adresler";
import { SepetOzeti } from "../sepet/sepet-gorunumu";
import { musteriSayfasiBilgisi, musteriSayfasiniAc } from "../yalniz-gezinti";
import { IbanKopyala } from "./iban-kopyala";
import { SepetiTemizle } from "./sepeti-temizle";

export const siparisAlindiSayfaBilgisi = musteriSayfasiBilgisi(
  async (): Promise<Metadata> => ({
    title: await sayfaBasligi(metin("vitrin.siparisAlindi.baslik")),
    robots: { index: false, follow: false },
  }),
);

type Bicim = ReturnType<typeof siteninBicimleyicisi>;

// Posta adresinin tek satırı: açık adres, posta kodu, ilçe / il, ülke (adresYazisi).
const adresSatiri = (bicim: Bicim, adres: Teslimat["adres"]): string =>
  adresYazisi(adres, bicim.ulkeAdi);

const faturaSatiri = (bicim: Bicim, fatura: Fatura): string => {
  const tur =
    fatura.tur === "kurumsal"
      ? doldur(metin("vitrin.siparisAlindi.kurumsal"), {
          firma: fatura.firma,
          vergiDairesi: fatura.vergiDairesi,
          vergiNumarasi: fatura.vergiNumarasi,
        })
      : metin("vitrin.siparisAlindi.bireysel");
  return fatura.adres === undefined
    ? `${tur} · ${metin("vitrin.siparisAlindi.teslimatAdresiyle")}`
    : `${tur} · ${adresSatiri(bicim, fatura.adres)}`;
};

const secenekAdlari: Record<KapidaOdemeSecenegi, MetinAnahtari> = {
  nakit: "vitrin.odeme.yontem.nakit",
  kart: "vitrin.odeme.yontem.kart",
};

export async function SiparisAlindiSayfasi() {
  musteriSayfasiniAc();
  const site = calisanSite();
  const vt = siteninVeritabani();
  const anahtar = (await cookies()).get(siparisErisimCerezi.ad)?.value;
  const okunan = await siparisServisi(site).erisimleOku(vt, anahtar);
  if (okunan === null) notFound();
  const { siparis, kalemler } = okunan;
  const ayarlar = await siteninMagazaAyarlari(vt, site);
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const toplam = bicim.para(siparis.toplam);
  const havale = siparis.odeme_yontemi === "havale";
  const iptal = siparis.durum === "iptal";
  // Ödemesi sipariş kurulurken alınmış sipariş (kartla ödeme, kart 0215): tahsilat siparişte durur.
  const { tahsilat } = siparis;
  const yontemYazisi = havale
    ? metin("ortak.odemeYontemi.havale")
    : siparis.odeme_yontemi === "kart"
      ? metin("ortak.odemeYontemi.kartla")
      : doldur(metin("vitrin.odeme.yontem.kapida"), {
          secenek: metin(
            // Kapıda ödemede seçenek veritabanında zorunludur (siparisler_odeme_yontemi denetimi).
            secenekAdlari[siparis.kapida_secenegi as KapidaOdemeSecenegi],
          ),
        });
  const adet = kalemler.reduce((toplamAdet, kalem) => toplamAdet + kalem.adet, 0);

  return (
    <main className="mx-auto flex w-full max-w-icerik flex-col gap-6 px-4 pt-5 pb-12 tablet:px-6">
      {tahsilat === null ? null : (
        <SepetiTemizle
          oturum={siparis.oturum_kimligi}
          birimler={kalemler.map((kalem) => kalem.birim_kimligi)}
        />
      )}
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-dugme bg-basari-zemin text-basari-yazi">
          <Ikon ad="basari" className="size-6" />
        </span>
        <h1 className="font-baslik text-baslik-1 font-baslik-kalinligi">
          {metin("vitrin.siparisAlindi.baslik")}
        </h1>
        <p className="font-baslik text-baslik-4 font-baslik-kalinligi">
          {doldur(metin("vitrin.siparisAlindi.numara"), { numara: siparis.numara })}
        </p>
        <p className="text-soluk-yazi">
          {doldur(metin("vitrin.siparisAlindi.tesekkur"), { ad: siparis.teslimat.ad })}
        </p>
      </div>
      <div className="flex flex-col gap-6 masaustu:flex-row masaustu:items-start masaustu:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {iptal ? (
            <Uyari tur="tehlike">{metin("vitrin.siparisAlindi.iptal")}</Uyari>
          ) : havale ? (
            <Kart
              aria-labelledby="havale-basligi"
              className="flex flex-col gap-4 border-2 border-birincil p-4 tablet:p-6"
            >
              <h2 id="havale-basligi" className="font-baslik text-baslik-4 font-baslik-kalinligi">
                {doldur(metin("vitrin.siparisAlindi.havaleBasligi"), {
                  zaman:
                    siparis.odeme_son_zamani === null
                      ? ""
                      : bicim.tarihSaat(siparis.odeme_son_zamani),
                })}
              </h2>
              <p>
                {doldur(metin("vitrin.siparisAlindi.havaleAciklamasi"), {
                  toplam,
                  numara: siparis.numara,
                })}
              </p>
              <ul className="flex flex-col gap-2">
                {ayarlar.bankaHesaplari.map((hesap) => (
                  <li
                    key={hesap.kimlik}
                    className="flex flex-col gap-1 rounded-orta bg-yuzey px-4 py-3"
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-kalin">{hesap.banka}</span>
                      <IbanKopyala iban={hesap.iban} banka={hesap.banka} />
                    </span>
                    <span className="text-kucuk text-soluk-yazi">
                      {doldur(metin("vitrin.siparisAlindi.hesapSahibi"), { sahip: hesap.sahip })}
                    </span>
                    <span className="font-kalin break-all">{ibanYazisi(hesap.iban)}</span>
                  </li>
                ))}
              </ul>
              <Baglanti
                href={`${vitrinAdresleri.havaleBildirimi}?siparis=${encodeURIComponent(siparis.numara)}`}
                gorunum="ikincil"
                className="self-start"
              >
                {metin("vitrin.siparisAlindi.bildir")}
              </Baglanti>
            </Kart>
          ) : tahsilat !== null ? (
            <Kart aria-labelledby="kart-basligi" className="flex flex-col gap-2 p-4 tablet:p-6">
              <h2 id="kart-basligi" className="font-baslik text-baslik-4 font-baslik-kalinligi">
                {metin("vitrin.siparisAlindi.kartBasligi")}
              </h2>
              <p>
                {doldur(
                  metin(
                    tahsilat.taksit > 1
                      ? "vitrin.siparisAlindi.kartTaksitli"
                      : "vitrin.siparisAlindi.kartTekCekim",
                  ),
                  { toplam: bicim.para(tahsilat.odenen), taksit: String(tahsilat.taksit) },
                )}{" "}
                {ayarlar.kargoyaVermeSuresi === 0
                  ? metin("vitrin.siparisAlindi.kargoAyniGun")
                  : doldur(metin("vitrin.siparisAlindi.kargo"), {
                      gun: String(ayarlar.kargoyaVermeSuresi),
                    })}
              </p>
            </Kart>
          ) : (
            <Kart aria-labelledby="kapida-basligi" className="flex flex-col gap-2 p-4 tablet:p-6">
              <h2 id="kapida-basligi" className="font-baslik text-baslik-4 font-baslik-kalinligi">
                {metin("vitrin.siparisAlindi.kapidaBasligi")}
              </h2>
              <p>
                {doldur(
                  metin(
                    siparis.kapida_secenegi === "kart"
                      ? "vitrin.siparisAlindi.kapidaKart"
                      : "vitrin.siparisAlindi.kapidaNakit",
                  ),
                  { toplam },
                )}{" "}
                {ayarlar.kargoyaVermeSuresi === 0
                  ? metin("vitrin.siparisAlindi.kargoAyniGun")
                  : doldur(metin("vitrin.siparisAlindi.kargo"), {
                      gun: String(ayarlar.kargoyaVermeSuresi),
                    })}
              </p>
            </Kart>
          )}
          <Kart aria-labelledby="teslimat-basligi" className="flex flex-col gap-3 p-4 tablet:p-6">
            <h2 id="teslimat-basligi" className="font-baslik text-baslik-4 font-baslik-kalinligi">
              {metin("vitrin.siparisAlindi.teslimatVeFatura")}
            </h2>
            <dl className="grid gap-x-6 gap-y-2 tablet:grid-cols-4">
              <dt className="text-soluk-yazi">{metin("vitrin.siparisAlindi.teslimatAdresi")}</dt>
              <dd className="wrap-anywhere tablet:col-span-3">
                {[`${siparis.teslimat.ad} ${siparis.teslimat.soyad}`, siparis.teslimat.telefon]
                  .filter((parca) => parca !== undefined && parca !== "")
                  .join(" · ")}
                <br />
                {adresSatiri(bicim, siparis.teslimat.adres)}
              </dd>
              <dt className="text-soluk-yazi">{metin("vitrin.siparisAlindi.fatura")}</dt>
              <dd className="wrap-anywhere tablet:col-span-3">
                {faturaSatiri(bicim, siparis.fatura)}
              </dd>
              <dt className="text-soluk-yazi">{metin("vitrin.siparisAlindi.odemeYontemi")}</dt>
              <dd className="tablet:col-span-3">
                {havale && !iptal
                  ? doldur(metin("vitrin.siparisAlindi.odemeBekleniyor"), { yontem: yontemYazisi })
                  : tahsilat !== null && !iptal
                    ? doldur(metin("vitrin.siparisAlindi.kartOdendi"), { yontem: yontemYazisi })
                    : yontemYazisi}
              </dd>
              <dt className="text-soluk-yazi">{metin("vitrin.siparisAlindi.eposta")}</dt>
              <dd className="wrap-anywhere tablet:col-span-3">{siparis.eposta}</dd>
            </dl>
          </Kart>
        </div>
        <aside
          aria-labelledby="siparis-ozeti"
          className="flex flex-col gap-4 rounded-orta border border-kenar bg-zemin p-5 masaustu:w-form masaustu:shrink-0"
        >
          <h2 id="siparis-ozeti" className="font-baslik text-baslik-4 font-baslik-kalinligi">
            {metin("vitrin.siparisAlindi.ozet")}
          </h2>
          <ul
            aria-label={metin("vitrin.sepet.satirlar")}
            className="flex flex-col gap-3 border-b border-kenar pb-4"
          >
            {kalemler.map((kalem) => (
              <li key={kalem.kimlik} className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 flex-col">
                  <span className="font-kalin">{kalem.urun_adi}</span>
                  {kalem.secim.length === 0 ? null : (
                    <span className="text-kucuk text-soluk-yazi">
                      {kalem.secim
                        .map(({ secenek, deger }) =>
                          doldur(metin("vitrin.sepet.secim"), { secenek, deger }),
                        )
                        .join(", ")}
                    </span>
                  )}
                  <span className="text-kucuk text-soluk-yazi">
                    {doldur(metin("vitrin.odeme.adet"), { sayi: String(kalem.adet) })}
                  </span>
                </span>
                <span className="whitespace-nowrap">{bicim.para(kalem.tutar)}</span>
              </li>
            ))}
          </ul>
          <SepetOzeti
            gorunum={{
              adet,
              kargo: siparis.kargo_turu as "yok" | "ucretsiz" | "ucretli",
              gosterim: siparis.gosterim as "vergi-dahil" | "vergi-haric" | "yok",
              vergiDokumu: siparis.vergi_dokumu.map((satir) => ({
                ...(satir.ad === undefined ? {} : { ad: satir.ad }),
                // Oran milyonda bir birimindedir (vergi/semalar.ts).
                oran: bicim.yuzde(satir.oran / 10_000),
                yazili: bicim.para(satir.vergi),
              })),
              yazili: {
                araToplam: bicim.para(siparis.ara_toplam),
                ...(siparis.kargo_turu === "ucretli"
                  ? { kargo: bicim.para(siparis.kargo_tutari) }
                  : {}),
                vergi: bicim.para(siparis.vergi_toplami),
                toplam,
              },
            }}
          />
          <Baglanti href={vitrinAdresleri.anasayfa} gorunum="cerceveli">
            {metin("vitrin.siparisAlindi.alisveriseDevam")}
          </Baglanti>
        </aside>
      </div>
    </main>
  );
}
