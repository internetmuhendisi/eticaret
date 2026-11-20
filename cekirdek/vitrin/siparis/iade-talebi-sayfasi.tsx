// İade talebi sayfası (kart 0239, karar 0151; Canlı Çarşı taslağı siparis-ve-hesap.html). İki yoldan açılır:
// hesapta /hesabim/siparislerim/<numara>/iade-talebi (girişsiz müşteri girişe gider ve döner), üye olmayanda
// /siparis-takibi/iade-talebi (takip çerezinin siparişi; çerez yoksa ya da süresi dolduysa takip sayfasına gider).
// Sipariş musteriSiparisleri ile okunur, kalem başına talep edilebilir adet ve talebin açılıp açılamayacağı oradan
// gelir. Talep açılamıyorsa (süre doldu, bekleyen talep var, istenecek ürün kalmadı, teslim edilmedi) nedeni ve
// siparişe dönüş yazılır. Sayfa kişiye özeldir, arama motorlarına kapalıdır.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { SayfaBasligi } from "../../../bilesenler/parcalar/sayfa-basligi";
import { SayfaYolu } from "../../../bilesenler/parcalar/sayfa-yolu";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { siparisTakipCerezi } from "../../kayitlar/siparis";
import { doldur } from "../../metinler/doldur";
import { metin, siteninBicimleyicisi } from "../../metinler/site-metni";
import { bulunamadiSayfaBilgisi, sayfaBasligi } from "../../moduller/gorunurluk/sayfa-bilgisi";
import { type MusteriSiparisi, musteriSiparisleri } from "../../moduller/siparis/musteri";
import { siteninVeritabani } from "../../veritabani/baglanti";
import {
  hesapIadeTalebiAdresi,
  hesapSiparisiAdresi,
  siparisTakibiAdresi,
  vitrinAdresleri,
} from "../adresler";
import { hesapSayfasiniAc } from "../hesap/oturum";
import { hesabinSiparisi } from "../hesap/siparisler";
import { musteriSayfasiBilgisi, musteriSayfasiniAc } from "../yalniz-gezinti";
import { IadeTalebiFormu, type IadeTalebiVerisi } from "./iade-talebi-formu";
import { musteriKurallariniOku } from "./kurallar";
import { siparisUrunleri } from "./urunler";

type Bicim = ReturnType<typeof siteninBicimleyicisi>;

const sayfaBilgisi = async (): Promise<Metadata> => ({
  title: await sayfaBasligi(metin("vitrin.iadeTalebi.baslik")),
  robots: { index: false, follow: false },
});

export const hesapIadeTalebiSayfaBilgisi = (numara: string) =>
  musteriSayfasiBilgisi(async (): Promise<Metadata> => {
    const siparis = await hesabinSiparisi(numara);
    return siparis === null ? bulunamadiSayfaBilgisi() : sayfaBilgisi();
  })();

export const takipIadeTalebiSayfaBilgisi = musteriSayfasiBilgisi(sayfaBilgisi);

// Talep açılamıyorsa nedeni; açılabiliyorsa null.
const kapaliNedeni = (siparis: MusteriSiparisi, bicim: Bicim): string | null => {
  const { durum, sonZaman } = siparis.iadeTalebi;
  if (durum === "acik") return null;
  if (durum === "sure-doldu" && sonZaman !== null) {
    return doldur(metin("vitrin.siparis.talepSuresiDoldu"), { tarih: bicim.uzunTarih(sonZaman) });
  }
  if (durum === "bekleyen-var") return metin("vitrin.siparis.talepInceleniyor");
  if (durum === "kalan-yok") return metin("vitrin.iadeTalebi.kalanYok");
  return metin("vitrin.iadeTalebi.teslimEdilmedi");
};

async function Icerik({
  siparis,
  yol,
  siparisAdresi,
}: {
  siparis: MusteriSiparisi;
  yol: "hesap" | "takip";
  siparisAdresi: string;
}) {
  const site = calisanSite();
  const bicim = siteninBicimleyicisi(site.ayarlar);
  const neden = kapaliNedeni(siparis, bicim);
  const ust = (
    <div className="flex flex-col gap-1">
      <SayfaBasligi baslik={metin("vitrin.iadeTalebi.baslik")} />
      <p className="text-soluk-yazi">
        {siparis.teslimZamani === null || siparis.iadeTalebi.sonZaman === null
          ? siparis.numara
          : doldur(metin("vitrin.iadeTalebi.ust"), {
              numara: siparis.numara,
              teslim: bicim.uzunTarih(siparis.teslimZamani),
              sonGun: bicim.uzunTarih(siparis.iadeTalebi.sonZaman),
            })}
      </p>
    </div>
  );
  if (neden !== null) {
    return (
      <div className="mx-auto flex w-full max-w-metin flex-col gap-4">
        {ust}
        <Uyari tur="bilgi">{neden}</Uyari>
        <Baglanti href={siparisAdresi} gorunum="sade" className="self-start">
          {metin("vitrin.iadeTalebi.siparisinizeDonun")}
        </Baglanti>
      </div>
    );
  }
  const urunler = await siparisUrunleri(
    siteninVeritabani(),
    siparis.kalemler.map((kalem) => ({ birim: kalem.birim_kimligi, urun: kalem.urun_kimligi })),
  );
  const veri: IadeTalebiVerisi = {
    numara: siparis.numara,
    yol,
    kalemler: siparis.kalemler.map((kalem) => {
      const gorsel = urunler.get(kalem.birim_kimligi)?.gorsel;
      return {
        sira: kalem.sira,
        ad: kalem.urun_adi,
        secim: kalem.secim.map((secim) => doldur(metin("vitrin.sepet.secim"), secim)).join(" · "),
        adet: kalem.adet,
        enCok: kalem.talepEdilebilir,
        fiyat: bicim.para(kalem.birim_tutari),
        ...(gorsel === undefined ? {} : { gorsel }),
      };
    }),
    kargo: siparis.iadeTalebi.kargo,
    siparisAdresi,
  };
  return (
    <div className="mx-auto flex w-full max-w-metin flex-col gap-4">
      {ust}
      <IadeTalebiFormu veri={veri} />
    </div>
  );
}

// Taslaktaki gibi hesap menüsü olmadan, ortada dar formla çizilir; sayfa yolu hesabın yoludur.
export async function HesapIadeTalebiSayfasi({ numara }: { numara: string }) {
  await hesapSayfasiniAc(hesapIadeTalebiAdresi(numara));
  const siparis = await hesabinSiparisi(numara);
  if (siparis === null) notFound();
  return (
    <main className="mx-auto flex w-full max-w-icerik flex-col gap-4 px-4 pt-5 pb-12 tablet:px-6">
      <SayfaYolu
        etiket={metin("ortak.parca.sayfaYolu")}
        ayrac={metin("ortak.parca.sayfaYoluAyraci")}
        adimlar={[
          { ad: metin("vitrin.sayfa.anasayfa"), adres: vitrinAdresleri.anasayfa },
          { ad: metin("vitrin.hesap.baslik"), adres: vitrinAdresleri.hesabim },
          { ad: metin("vitrin.hesap.siparisler.baslik"), adres: vitrinAdresleri.hesapSiparisleri },
          { ad: siparis.numara, adres: hesapSiparisiAdresi(siparis.numara) },
          { ad: metin("vitrin.iadeTalebi.baslik"), adres: hesapIadeTalebiAdresi(siparis.numara) },
        ]}
      />
      <Icerik siparis={siparis} yol="hesap" siparisAdresi={hesapSiparisiAdresi(siparis.numara)} />
    </main>
  );
}

export async function TakipIadeTalebiSayfasi() {
  musteriSayfasiniAc();
  const vt = siteninVeritabani();
  const anahtar = (await cookies()).get(siparisTakipCerezi.ad)?.value;
  const siparis = await musteriSiparisleri().takipleOku(
    vt,
    anahtar,
    await musteriKurallariniOku(vt, calisanSite()),
  );
  // Takip yoksa ya da süresi dolduysa müşteri numara ve e-postayla yeniden bulur.
  if (siparis === null) redirect(vitrinAdresleri.siparisTakibi);
  const siparisAdresi = siparisTakibiAdresi(siparis.numara);
  return (
    <main className="mx-auto flex w-full max-w-icerik flex-col gap-4 px-4 pt-5 pb-12 tablet:px-6">
      <SayfaYolu
        etiket={metin("ortak.parca.sayfaYolu")}
        ayrac={metin("ortak.parca.sayfaYoluAyraci")}
        adimlar={[
          { ad: metin("vitrin.sayfa.anasayfa"), adres: vitrinAdresleri.anasayfa },
          { ad: metin("vitrin.siparisTakibi.baslik"), adres: vitrinAdresleri.siparisTakibi },
          { ad: siparis.numara, adres: siparisAdresi },
          { ad: metin("vitrin.iadeTalebi.baslik"), adres: vitrinAdresleri.takipIadeTalebi },
        ]}
      />
      <Icerik siparis={siparis} yol="takip" siparisAdresi={siparisAdresi} />
    </main>
  );
}
