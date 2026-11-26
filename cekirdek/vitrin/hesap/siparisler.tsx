// Hesabım: Siparişlerim ve sipariş ayrıntısı (kart 0238, karar 0145, 0150; Canlı Çarşı taslağı siparis-ve-hesap.html).
// Siparişler en yeni önce, 10'ar sayfa; her satırda numara, tarih, ürün sayısı, durum, toplam, iade edilen tutar ve
// ilk ürünlerin görselleri. Yalnız hesabın kimliğiyle verilmiş siparişler görünür (karar 0150): üye olmadan verilmiş
// sipariş takip sayfasındadır, liste bunu söyler. Ayrıntı başka müşterinin numarasında bulunamadıdır. Sayfalar
// kişiye özeldir, arama motorlarına kapalıdır; veri sunucuda okunur (uç yoktur).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { Sayfalama } from "../../../bilesenler/parcalar/sayfalama";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { yazilanIslevler } from "../../kayitlar/islevler";
import { musteriSiparisSinirlari } from "../../kayitlar/siparis";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { bulunamadiSayfaBilgisi, sayfaBasligi } from "../../moduller/gorunurluk/sayfa-bilgisi";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { musteriSiparisleri } from "../../moduller/siparis/musteri";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { hesapIadeTalebiAdresi, hesapSiparisiAdresi, vitrinAdresleri } from "../adresler";
import { SatirGorseli } from "../sepet/satir-parcalari";
import { SiparisAyrintisi } from "../siparis/ayrinti";
import { musteriKurallariniOku } from "../siparis/kurallar";
import { SiparisDurumRozeti } from "../siparis/parcalar";
import { siparisUrunleri } from "../siparis/urunler";
import { musteriSayfasiBilgisi } from "../yalniz-gezinti";
import { HesapCercevesi } from "./cerceve";
import { hesapOturumu, hesapSayfasiniAc } from "./oturum";

// Adresteki sayfa numarası: yalnız rakamlardan oluşuyorsa okunur, öteki yazılış ilk sayfadır.
export const sayfaNumarasi = (deger: string | string[] | undefined): number =>
  typeof deger === "string" && /^[1-9][0-9]{0,5}$/.test(deger) ? Number(deger) : 1;

const sayfaAdresi = (sayfa: number): string =>
  sayfa === 1
    ? vitrinAdresleri.hesapSiparisleri
    : `${vitrinAdresleri.hesapSiparisleri}?${new URLSearchParams({ sayfa: String(sayfa) })}`;

export async function SiparislerimSayfasi({ sayfa: istenen }: { sayfa: number }) {
  const oturum = await hesapSayfasiniAc(
    istenen === 1 ? vitrinAdresleri.hesapSiparisleri : sayfaAdresi(istenen),
  );
  const vt = siteninVeritabani();
  const bicim = siteninBicimleyicisi(calisanSite().ayarlar);
  const liste = await musteriSiparisleri().liste(vt, oturum.kimlik, istenen);
  const urunler = await siparisUrunleri(
    vt,
    liste.siparisler.flatMap((siparis) => siparis.kalemler),
  );
  const toplamSayfa = Math.min(
    Math.ceil(liste.toplam / musteriSiparisSinirlari.sayfaBoyu),
    musteriSiparisSinirlari.enCokSayfa,
  );
  return (
    <HesapCercevesi secili="siparisler" eposta={oturum.eposta}>
      {liste.siparisler.length === 0 ? (
        <BosHal
          ikon="paket"
          baslik={metin("vitrin.hesap.siparisler.bosBaslik")}
          aciklama={metin("vitrin.hesap.siparisler.bosAciklama")}
        >
          <Baglanti href={vitrinAdresleri.anasayfa} gorunum="birincil">
            {metin("vitrin.hesap.siparisler.alisveriseBasla")}
          </Baglanti>
        </BosHal>
      ) : (
        <ul aria-label={metin("vitrin.hesap.siparisler.liste")} className="flex flex-col gap-3">
          {liste.siparisler.map((siparis) => (
            <li key={siparis.numara}>
              <Kart className="flex flex-col gap-3 p-4 tablet:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-kalin">{siparis.numara}</span>
                    <time dateTime={siparis.olusturma.toISOString()} className="text-soluk-yazi">
                      {bicim.uzunTarih(siparis.olusturma)}
                    </time>
                    <span className="text-soluk-yazi">
                      {doldur(metin("vitrin.hesap.siparisler.urunSayisi"), {
                        sayi: String(siparis.adet),
                      })}
                    </span>
                  </p>
                  <span className="flex flex-col items-end gap-2">
                    <SiparisDurumRozeti durum={siparis.durum} />
                    <span className="font-kalin text-buyuk">{bicim.para(siparis.toplam)}</span>
                  </span>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {siparis.kalemler.map((kalem) => {
                    const gorsel = urunler.get(kalem.birim)?.gorsel;
                    return (
                      <li key={kalem.birim}>
                        <SatirGorseli
                          satir={gorsel === undefined ? {} : { gorsel }}
                          buyukluk="size-12"
                          alt={kalem.urunAdi}
                        />
                      </li>
                    );
                  })}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-kucuk text-soluk-yazi">
                    {siparis.iadeToplami === 0
                      ? null
                      : doldur(metin("vitrin.hesap.siparisler.iadeEdildi"), {
                          tutar: bicim.para(siparis.iadeToplami),
                        })}
                  </span>
                  <Baglanti href={hesapSiparisiAdresi(siparis.numara)} gorunum="cerceveli">
                    {metin("vitrin.hesap.siparisler.ayrinti")}
                    <span className="sr-only">
                      {doldur(metin("vitrin.hesap.siparisler.ayrintiEki"), {
                        numara: siparis.numara,
                      })}
                    </span>
                    <Ikon ad="sonraki" />
                  </Baglanti>
                </div>
              </Kart>
            </li>
          ))}
        </ul>
      )}
      <Sayfalama
        sayfa={liste.sayfa}
        toplamSayfa={toplamSayfa}
        adres={sayfaAdresi}
        metinler={{
          etiket: metin("ortak.parca.sayfalar"),
          onceki: metin("ortak.parca.oncekiSayfa"),
          sonraki: metin("ortak.parca.sonrakiSayfa"),
          sayfaAdi: (sira) => doldur(metin("ortak.parca.sayfaAdi"), { sira: String(sira) }),
          bosluk: metin("ortak.parca.atlananSayfalar"),
        }}
      />
      <p className="flex flex-wrap items-center gap-x-2 text-kucuk text-soluk-yazi">
        <span>{metin("vitrin.hesap.siparisler.uyeOlmadan")}</span>
        <Baglanti href={vitrinAdresleri.siparisTakibi} className="text-kucuk">
          {metin("vitrin.hesap.siparisler.takipSayfasi")}
        </Baglanti>
      </p>
    </HesapCercevesi>
  );
}

// Sayfa ve sekme bilgisi aynı istekte siparişi bir kez okur. Girişsiz ya da başka müşterinin numarasında null.
const hesabinSiparisi = cache(async (numara: string) => {
  const oturum = await hesapOturumu();
  if (oturum === null) return null;
  const vt = siteninVeritabani();
  return musteriSiparisleri().ayrinti(
    vt,
    oturum.kimlik,
    numara,
    await musteriKurallariniOku(vt, calisanSite()),
  );
});

// İade talebi sayfası da siparişi bu okumayla alır (kart 0239).
export { hesabinSiparisi };

export const siparisAyrintisiSayfaBilgisi = (numara: string) =>
  musteriSayfasiBilgisi(async (): Promise<Metadata> => {
    const siparis = await hesabinSiparisi(numara);
    if (siparis === null && (await hesapOturumu()) !== null) return bulunamadiSayfaBilgisi();
    return {
      title: await sayfaBasligi(
        siparis === null
          ? metin("vitrin.hesap.siparisler.baslik")
          : doldur(metin("vitrin.siparis.baslik"), { numara: siparis.numara }),
      ),
      robots: { index: false, follow: false },
    };
  })();

export async function SiparisAyrintisiSayfasi({ numara }: { numara: string }) {
  const oturum = await hesapSayfasiniAc(hesapSiparisiAdresi(numara));
  const siparis = await hesabinSiparisi(numara);
  if (siparis === null) notFound();
  const vt = siteninVeritabani();
  const site = calisanSite();
  const [urunler, ayarlar] = await Promise.all([
    siparisUrunleri(
      vt,
      siparis.kalemler.map((kalem) => ({ birim: kalem.birim_kimligi, urun: kalem.urun_kimligi })),
    ),
    siteninMagazaAyarlari(vt, site),
  ]);
  return (
    <HesapCercevesi
      secili="siparisler"
      eposta={oturum.eposta}
      basliksiz
      sonAdim={{ ad: siparis.numara, adres: hesapSiparisiAdresi(siparis.numara) }}
    >
      <SiparisAyrintisi
        siparis={siparis}
        urunler={urunler}
        bicim={siteninBicimleyicisi(site.ayarlar)}
        yol="hesap"
        bankaHesaplari={ayarlar.bankaHesaplari}
        yorumAcik={yazilanIslevler.yorum}
        talepAdresi={hesapIadeTalebiAdresi(siparis.numara)}
        saatDilimi={site.ayarlar.saatDilimi}
      />
    </HesapCercevesi>
  );
}
