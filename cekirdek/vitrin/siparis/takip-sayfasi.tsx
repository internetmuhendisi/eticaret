// Üye olmayanın sipariş takibi sayfası (kart 0238, karar 0145, 0150; Canlı Çarşı taslağı siparis-ve-hesap.html):
// /siparis-takibi. Takip çerezi geçerliyse sipariş, hesaptaki ayrıntıyla aynı görünüşte (SiparisAyrintisi) kısaltılmış
// adresle çizilir; değilse numara ve e-posta formu. Adresteki numara (?siparis=, sipariş alındı sayfasından) formu
// doldurur; çerezdeki siparişten başka bir numarayla gelinirse form açılır. "Başka bir sipariş sorgula" takibi kapatır
// (çerez ve anahtar silinir), kapatılamazsa formu ?yeni ile açar.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { SayfaBasligi } from "../../../bilesenler/parcalar/sayfa-basligi";
import { SayfaYolu } from "../../../bilesenler/parcalar/sayfa-yolu";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { siparisNumarasiKalibi, siparisTakipCerezi } from "../../kayitlar/siparis";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { sayfaBasligi } from "../../moduller/gorunurluk/sayfa-bilgisi";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { musteriSiparisleri } from "../../moduller/siparis/musteri";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { girisAdresiDonuslu, vitrinAdresleri } from "../adresler";
import { musteriSayfasiBilgisi, musteriSayfasiniAc } from "../yalniz-gezinti";
import { SiparisAyrintisi } from "./ayrinti";
import { TakibiKapat } from "./takibi-kapat";
import { SiparisTakibiFormu } from "./takip-formu";
import { siparisUrunleri } from "./urunler";

export const siparisTakibiSayfaBilgisi = musteriSayfasiBilgisi(
  async (): Promise<Metadata> => ({
    title: await sayfaBasligi(metin("vitrin.siparisTakibi.baslik")),
    robots: { index: false, follow: false },
  }),
);

export async function SiparisTakibiSayfasi({
  siparis: adrestekiNumara,
  yeni,
}: {
  siparis: string | undefined;
  yeni: boolean;
}) {
  musteriSayfasiniAc();
  const site = calisanSite();
  const vt = siteninVeritabani();
  // Adresteki numara yalnız kalıba uyarsa forma yazılır.
  const yazilan = adrestekiNumara?.replace(/\s+/g, "").toUpperCase() ?? "";
  const numara = siparisNumarasiKalibi.test(yazilan) ? yazilan : "";
  const anahtar = (await cookies()).get(siparisTakipCerezi.ad)?.value;
  const okunan = yeni ? null : await musteriSiparisleri().takipleOku(vt, anahtar);
  const siparis = okunan !== null && (numara === "" || okunan.numara === numara) ? okunan : null;
  const yol = [
    { ad: metin("vitrin.sayfa.anasayfa"), adres: vitrinAdresleri.anasayfa },
    { ad: metin("vitrin.siparisTakibi.baslik"), adres: vitrinAdresleri.siparisTakibi },
  ];

  if (siparis !== null) {
    const [urunler, ayarlar] = await Promise.all([
      siparisUrunleri(
        vt,
        siparis.kalemler.map((kalem) => ({ birim: kalem.birim_kimligi, urun: kalem.urun_kimligi })),
      ),
      siteninMagazaAyarlari(vt, site),
    ]);
    return (
      <main className="mx-auto flex w-full max-w-icerik flex-col gap-4 px-4 pt-5 pb-12 tablet:px-6">
        <SayfaYolu
          etiket={metin("ortak.parca.sayfaYolu")}
          ayrac={metin("ortak.parca.sayfaYoluAyraci")}
          adimlar={[
            ...yol,
            {
              ad: siparis.numara,
              adres: `${vitrinAdresleri.siparisTakibi}?${new URLSearchParams({ siparis: siparis.numara })}`,
            },
          ]}
        />
        <SiparisAyrintisi
          siparis={siparis}
          urunler={urunler}
          bicim={siteninBicimleyicisi(site.ayarlar)}
          yol="takip"
          bankaHesaplari={ayarlar.bankaHesaplari}
          yorumAcik={false}
        />
        <div className="flex flex-col gap-2 text-kucuk text-soluk-yazi">
          <p>{metin("vitrin.siparisTakibi.kisaltma")}</p>
          <p>
            {doldur(metin("vitrin.siparisTakibi.sure"), {
              dakika: String(siparisTakipCerezi.saniye / 60),
            })}
          </p>
        </div>
        <TakibiKapat etiket={metin("vitrin.siparisTakibi.baskaSiparis")} />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-metin flex-col gap-2 px-4 pt-5 pb-12 tablet:px-6">
      <SayfaYolu
        etiket={metin("ortak.parca.sayfaYolu")}
        ayrac={metin("ortak.parca.sayfaYoluAyraci")}
        adimlar={yol}
      />
      <SayfaBasligi baslik={metin("vitrin.siparisTakibi.baslik")} />
      <p className="mb-4 text-soluk-yazi">{metin("vitrin.siparisTakibi.aciklama")}</p>
      <SiparisTakibiFormu numara={numara} />
      <p className="mt-4 flex flex-wrap items-center gap-x-2 text-kucuk text-soluk-yazi">
        <span>
          {metin("vitrin.siparisTakibi.uyeMisiniz")} {metin("vitrin.siparisTakibi.uyeAciklamasi")}
        </span>
        <Baglanti
          href={girisAdresiDonuslu(vitrinAdresleri.hesapSiparisleri)}
          className="text-kucuk"
        >
          {metin("vitrin.siparisTakibi.girisYapin")}
        </Baglanti>
      </p>
    </main>
  );
}
