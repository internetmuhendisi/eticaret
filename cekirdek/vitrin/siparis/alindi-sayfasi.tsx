// Sipariş alındı sayfası (kart 0214, karar 0141; kart 0211'in taslağı): /siparis-alindi. Sipariş yalnız siparişi veren
// tarayıcının erişim çereziyle okunur (siparisServisi.erisimleOku); çerez yoksa ya da tutmazsa sayfa bulunamadıdır.
// Üstte numara ve teşekkür; havalede son ödeme anı, tutar, açıklamaya yazılacak numara, mağazanın banka hesapları
// (IBAN'ı kopyala) ve "Ödemeyi yaptım, bildir"; kapıda ödemede seçenek ve kargoya verme süresi; altında teslimat ve
// fatura, yanında siparişin saklanan tutarlarıyla özet. Tutarlar sipariş anındakilerdir, yeniden hesaplanmaz. Üstte
// üyeye "Siparişimi görüntüle" (hesaptaki ayrıntı), üye olmayana "Siparişimi takip et" (takip sayfası, numara dolu) ve
// takip bilgisi (kart 0238). Parçalar ayrıntıyla ortaktır (parcalar.tsx).
// Kişiye özel sayfa: arama motorlarına kapalıdır. Tema demosunda bulunamadıdır.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { siparisErisimCerezi } from "../../kayitlar/siparis";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { sayfaBasligi } from "../../moduller/gorunurluk/sayfa-bilgisi";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { siparisServisi } from "../../moduller/siparis/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { hesapSiparisiAdresi, siparisTakibiAdresi, vitrinAdresleri } from "../adresler";
import { SepetOzeti } from "../sepet/sepet-gorunumu";
import { musteriSayfasiBilgisi, musteriSayfasiniAc } from "../yalniz-gezinti";
import {
  adresSatiri,
  faturaSatiri,
  HavaleOdemeKarti,
  kisiSatiri,
  odemeYontemiYazisi,
  siparisTutarlari,
} from "./parcalar";
import { SepetiTemizle } from "./sepeti-temizle";

export const siparisAlindiSayfaBilgisi = musteriSayfasiBilgisi(
  async (): Promise<Metadata> => ({
    title: await sayfaBasligi(metin("vitrin.siparisAlindi.baslik")),
    robots: { index: false, follow: false },
  }),
);

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
  const yontemYazisi = odemeYontemiYazisi(siparis.odeme_yontemi, siparis.kapida_secenegi);
  // Üyenin siparişi hesabındadır; üye olmayan numara ve e-postayla takip eder (kart 0238).
  const uye = siparis.musteri_kimligi !== null;
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
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Baglanti
            href={uye ? hesapSiparisiAdresi(siparis.numara) : siparisTakibiAdresi(siparis.numara)}
            gorunum="ikincil"
          >
            {metin(uye ? "vitrin.siparisAlindi.goruntule" : "vitrin.siparisAlindi.takipEt")}
          </Baglanti>
        </div>
      </div>
      {uye ? null : (
        <Uyari tur="bilgi" className="mx-auto w-full max-w-metin">
          {metin("vitrin.siparisAlindi.takipBilgisi")}
        </Uyari>
      )}
      <div className="flex flex-col gap-6 masaustu:flex-row masaustu:items-start masaustu:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {iptal ? (
            <Uyari tur="tehlike">{metin("vitrin.siparisAlindi.iptal")}</Uyari>
          ) : havale ? (
            <HavaleOdemeKarti
              bicim={bicim}
              numara={siparis.numara}
              toplam={siparis.toplam}
              sonZaman={siparis.odeme_son_zamani}
              hesaplar={ayarlar.bankaHesaplari}
            />
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
                {kisiSatiri(siparis.teslimat)}
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
            gorunum={siparisTutarlari(bicim, {
              adet,
              kargoTuru: siparis.kargo_turu as "yok" | "ucretsiz" | "ucretli",
              gosterim: siparis.gosterim as "vergi-dahil" | "vergi-haric" | "yok",
              vergiDokumu: siparis.vergi_dokumu,
              araToplam: siparis.ara_toplam,
              kargoTutari: siparis.kargo_tutari,
              vergiToplami: siparis.vergi_toplami,
              toplam: siparis.toplam,
            })}
          />
          <Baglanti href={vitrinAdresleri.anasayfa} gorunum="cerceveli">
            {metin("vitrin.siparisAlindi.alisveriseDevam")}
          </Baglanti>
        </aside>
      </div>
    </main>
  );
}
