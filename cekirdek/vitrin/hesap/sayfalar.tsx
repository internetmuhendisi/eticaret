// Hesabım sayfaları (kart 0237, karar 0149; Canlı Çarşı taslağı siparis-ve-hesap.html): Adreslerim, Favorilerim ve
// Hesap bilgileri. Her sayfa önce kapıdan geçer (hesapSayfasiniAc: demoda bulunamadı, girişsiz müşteri girişe gider ve
// döner), verisini sunucuda okur ve çerçevenin içinde çizer. Sayfalar kişiye özeldir, arama motorlarına kapalıdır.
import type { Metadata } from "next";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { yazilanIslevler } from "../../kayitlar/islevler";
import { musteriAdresiSinirlari } from "../../kayitlar/musteri-adresleri";
import { sifreSiniri } from "../../kayitlar/oturum";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin } from "../../metinler/site-metni";
import { favoriServisi } from "../../moduller/favori/servis";
import { sayfaBasligi } from "../../moduller/gorunurluk/sayfa-bilgisi";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { adresServisi } from "../../moduller/musteri/adres";
import { hesapBilgileri } from "../../moduller/musteri/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { vitrinAdresleri } from "../adresler";
import { izgaraSiniflari } from "../bolumler/ortak/urun-izgarasi";
import { FavoriListesi } from "../favori-listesi";
import { teslimatUlkeleri } from "../odeme/ulkeler";
import { vitrinTemasi } from "../tema-secimi";
import { urunKartiGorunumu } from "../urun-karti/gorunum";
import { oncelikliKartSayisi, UrunKarti } from "../urun-karti/urun-karti";
import { urunKartlari } from "../urun-karti/veri";
import { musteriSayfasiBilgisi } from "../yalniz-gezinti";
import { AdresDefteri } from "./adres-defteri";
import { HesapCercevesi } from "./cerceve";
import { HesapBilgileri } from "./hesap-bilgileri";
import { hesapSayfasiniAc } from "./oturum";

// Sekme başlığı; kişiye özel sayfa arama motorlarına kapalıdır. Demoda bulunamadı sayfasınınki.
export const hesapSayfaBilgisi = (baslik: MetinAnahtari) =>
  musteriSayfasiBilgisi(
    async (): Promise<Metadata> => ({
      title: await sayfaBasligi(metin(baslik)),
      robots: { index: false, follow: false },
    }),
  );

export async function AdreslerimSayfasi() {
  const oturum = await hesapSayfasiniAc(vitrinAdresleri.hesapAdresleri);
  const vt = siteninVeritabani();
  const site = calisanSite();
  const [adresler, ayarlar] = await Promise.all([
    adresServisi(site).adresListesi(vt, oturum.kimlik),
    siteninMagazaAyarlari(vt, site),
  ]);
  return (
    <HesapCercevesi secili="adresler" eposta={oturum.eposta}>
      <AdresDefteri
        veri={{
          adresler,
          ulkeler: teslimatUlkeleri(site),
          telefonZorunlu: ayarlar.telefonZorunlu,
          sinir: musteriAdresiSinirlari.enCok,
        }}
      />
    </HesapCercevesi>
  );
}

// Favorilerim: favoriler sayfasının listesi (karar 0110) hesabın çerçevesinde. Liste sunucuda hesabın favorilerinden
// çizilir; sırayı ve görünenleri tarayıcıdaki favori durumu seçer, hesaptan gelen liste aynıysa sayfa yenilenmez.
// Başlığı listenin kendisi çizer (sayısıyla).
export async function FavorilerimSayfasi() {
  const oturum = await hesapSayfasiniAc(vitrinAdresleri.hesapFavorileri);
  const vt = siteninVeritabani();
  const site = calisanSite();
  const kimlikler = await favoriServisi(site).favoriListesi(vt, oturum.kimlik);
  const [kartlar, tema] = await Promise.all([
    urunKartlari(vt, site, kimlikler, { yer: "sayfa" }),
    vitrinTemasi(vt, site),
  ]);
  const gorunum = urunKartiGorunumu(tema.tema.tanim.gorunumler);
  return (
    <HesapCercevesi secili="favoriler" eposta={oturum.eposta} basliksiz>
      <FavoriListesi
        baslik={metin("vitrin.favori.baslik")}
        denetlenenler={kimlikler}
        kartlar={kartlar.map((urun, sira) => ({
          kimlik: urun.kimlik,
          kart: (
            <UrunKarti
              urun={urun}
              gorunum={gorunum}
              islevler={yazilanIslevler}
              baslikDuzeyi={2}
              oncelikli={sira < oncelikliKartSayisi}
              className="h-full"
            />
          ),
        }))}
        izgara={izgaraSiniflari(gorunum, "filtreli")}
        cihazdaBilgisi={null}
        bosHal={
          <BosHal
            ikon="favori"
            baslik={metin("vitrin.favori.bosBaslik")}
            aciklama={metin("vitrin.favori.bosAciklama")}
          >
            <Baglanti href={vitrinAdresleri.anasayfa} gorunum="birincil">
              {metin("vitrin.favori.alisveriseBasla")}
            </Baglanti>
          </BosHal>
        }
      />
    </HesapCercevesi>
  );
}

export async function HesapBilgileriSayfasi() {
  const oturum = await hesapSayfasiniAc(vitrinAdresleri.hesapBilgileri);
  const bilgiler = await hesapBilgileri(siteninVeritabani(), oturum.kimlik);
  return (
    <HesapCercevesi secili="bilgiler" eposta={oturum.eposta}>
      <HesapBilgileri
        eposta={bilgiler?.eposta ?? oturum.eposta}
        pazarlamaIzni={bilgiler?.pazarlamaIzni ?? false}
        sifreEnKisa={sifreSiniri.enKisa}
      />
    </HesapCercevesi>
  );
}
