// Havale bildirimi sayfası (kart 0214, karar 0141; kart 0211'in taslağı): /havale-bildirimi. Sipariş alındı sayfasının
// "Ödemeyi yaptım, bildir" bağlantısı numarayı adreste getirir (?siparis=ORN-1001); e-posta adrese yazılmaz. Sayfa
// mağazanın banka hesaplarını (gönderilen hesap seçimi) ve tutarın sitenin biçimindeki örneğini hazırlar; müşterinin
// oturumu sayfada okunmaz, form hesap durumunu tarayıcıda sorar. Kişiye özel sayfa: arama motorlarına kapalıdır.
// Tema demosunda bulunamadıdır. Bildirimin panelde görünmesi ve havalenin onayı on üçüncü bölümdedir.
import type { Metadata } from "next";
import { SayfaBasligi } from "../../../bilesenler/parcalar/sayfa-basligi";
import { SayfaYolu } from "../../../bilesenler/parcalar/sayfa-yolu";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { havaleBildirimiSinirlari } from "../../kayitlar/odeme";
import { siparisNumarasiKalibi } from "../../kayitlar/siparis";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { sayfaBasligi } from "../../moduller/gorunurluk/sayfa-bilgisi";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { vitrinAdresleri } from "../adresler";
import { musteriSayfasiBilgisi, musteriSayfasiniAc } from "../yalniz-gezinti";
import { HavaleBildirimiFormu } from "./havale-bildirimi-formu";

export const havaleBildirimiSayfaBilgisi = musteriSayfasiBilgisi(
  async (): Promise<Metadata> => ({
    title: await sayfaBasligi(metin("vitrin.havaleBildirimi.baslik")),
    robots: { index: false, follow: false },
  }),
);

export async function HavaleBildirimiSayfasi({ siparis }: { siparis: string | undefined }) {
  musteriSayfasiniAc();
  const site = calisanSite();
  const ayarlar = await siteninMagazaAyarlari(siteninVeritabani(), site);
  const bicim = siteninBicimleyicisi(site.ayarlar);
  // Adresteki numara yalnız kalıba uyarsa forma yazılır.
  const numara = siparis?.replace(/\s+/g, "").toUpperCase() ?? "";
  return (
    <main className="mx-auto flex w-full max-w-metin flex-col gap-2 px-4 pt-5 pb-12 tablet:px-6">
      <SayfaYolu
        etiket={metin("ortak.parca.sayfaYolu")}
        ayrac={metin("ortak.parca.sayfaYoluAyraci")}
        adimlar={[
          { ad: metin("vitrin.sayfa.anasayfa"), adres: vitrinAdresleri.anasayfa },
          { ad: metin("vitrin.havaleBildirimi.baslik"), adres: vitrinAdresleri.havaleBildirimi },
        ]}
      />
      <SayfaBasligi baslik={metin("vitrin.havaleBildirimi.baslik")} />
      <p className="mb-4 text-soluk-yazi">{metin("vitrin.havaleBildirimi.aciklama")}</p>
      <HavaleBildirimiFormu
        veri={{
          hesaplar: ayarlar.bankaHesaplari.map((hesap) => ({
            kimlik: hesap.kimlik,
            ad: `${hesap.banka} · ${hesap.iban.slice(-4)}`,
          })),
          numara: siparisNumarasiKalibi.test(numara) ? numara : "",
          sinirlar: { not: havaleBildirimiSinirlari.notEnCok },
          tutarOrnegi: bicim.paraYazisi(havaleBildirimiSinirlari.tutarOrnegi),
        }}
      />
    </main>
  );
}
