// Tema ayarları ekranının verisi (kart 0260, karar 0168), sunucuda: vitrinin geçerli teması, temanın mağaza sahibine
// açtığı renkler ve seçenekler, kayıtlı ayarlar ve temanın kendi değerleri. Tema yalnız tema servisiyle okunur;
// tarayıcı tema tanımını taşımaz (karar 0129), alanlar bu veriden çıkar: tema bir rengi ya da seçeneği açmıyorsa
// alanı görünmez.
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { temaDemosuBaglantisi } from "../../ayar-semasi/tema-demosu-adresi";
import { dosyaSinirlari, yuklenebilenTurAdlari } from "../../kayitlar/dosya";
import {
  type DugmeBicimiSecenegi,
  dugmeBicimiSecenekleri,
  type KoseSecenegi,
  koseSecenekleri,
  type MagazaRengi,
  magazaRenkleri,
  type UrunFiltresiGorunumu,
  urunFiltresiGorunumleri,
} from "../../kayitlar/tema";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import { ekrandakiLogo, magazaLogosu } from "../../moduller/magaza-ayarlari/logo";
import {
  siteninGecerliTemasi,
  siteninTemaServisi,
  temaDegistirilebilirMi,
} from "../../moduller/tema/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { temaninAdi } from "../../vitrin/tema-demosu-seridi";
import type { SecimGrubu, TemaAyarlariVerisi, YaziTipiOrnegi } from "./ayarlar-formu";

const kayittaMi = <Kod extends string>(kodlar: readonly Kod[], kod: string): kod is Kod =>
  (kodlar as readonly string[]).includes(kod);

// Seçenek grubunu kurar: kayıtta adı olan seçenekler (şema adı olmayanı açtırmaz), kayıtlı seçim ve temanın kendi
// değerine eşit seçenek.
const grupKur = <Kod extends string, Ek>(
  secenekler: Record<string, Ek>,
  kodlar: readonly Kod[],
  kayitli: string | undefined,
  temaninKendi: Ek,
  esitMi: (a: Ek, b: Ek) => boolean,
): SecimGrubu<Kod, Ek> => {
  const liste = Object.entries(secenekler).flatMap(([kod, ek]) =>
    kayittaMi(kodlar, kod) ? [{ kod, ...ek }] : [],
  );
  const eslesen = liste.find((secenek) => esitMi(secenek, temaninKendi))?.kod;
  return {
    secenekler: liste,
    ...(kayitli !== undefined && kayittaMi(kodlar, kayitli) ? { kayitli } : {}),
    ...(eslesen === undefined ? {} : { eslesen }),
    temaninKendi,
  };
};

export const temaAyarlariVerisi = async (): Promise<TemaAyarlariVerisi> => {
  const vt = siteninVeritabani();
  const durum = await siteninTemaServisi().temaDurumu(vt);
  const { tema, ayarlar } = await siteninGecerliTemasi(vt);
  const { degerler, magazaSecenekleri, gorunumler } = tema.tanim;
  const bicim = siteninBicimleyicisi(calisanSite().ayarlar);
  const demo = tema.kaynak === "cekirdek" ? temaDemosuBaglantisi(tema.kod) : undefined;
  const temaninFiltresi = gorunumler["urun-filtresi"];
  const yaziTipleri: Record<string, YaziTipiOrnegi> = magazaSecenekleri.yaziTipleri;
  return {
    logo: ekrandakiLogo(await magazaLogosu(vt)),
    enCokDosyaBoyutu: bicim.dosyaBoyutu(dosyaSinirlari.enCokBayt),
    dosyaTurleri: bicim.veyaListesi(yuklenebilenTurAdlari),
    tema: { kod: tema.kod, ad: temaninAdi(tema), ...(demo === undefined ? {} : { demo }) },
    sira: durum.sira,
    sonYayin: bicim.tarihSaat(durum.zaman),
    degistirilebilir: temaDegistirilebilirMi(),
    temaKullanilamaz: durum.tema !== tema.kod,
    renkler: magazaSecenekleri.renkler.flatMap((ad) => {
      if (!kayittaMi<MagazaRengi>(magazaRenkleri, ad)) return [];
      const kayitli = ayarlar.renkler[ad];
      return [
        {
          ad,
          temaninRengi: degerler.renkler.acik[ad].toUpperCase(),
          ...(kayitli === undefined ? {} : { kayitli }),
        },
      ];
    }),
    yaziTipleri: grupKur<string, YaziTipiOrnegi>(
      yaziTipleri,
      Object.keys(yaziTipleri),
      ayarlar.yaziTipi,
      { baslik: degerler.yaziTipleri.baslik, govde: degerler.yaziTipleri.govde },
      (a, b) => a.baslik === b.baslik && a.govde === b.govde,
    ),
    koseler: grupKur<KoseSecenegi, { kucuk: string; orta: string }>(
      magazaSecenekleri.koseler,
      koseSecenekleri,
      ayarlar.kose,
      { kucuk: degerler.koseler.kucuk, orta: degerler.koseler.orta },
      (a, b) => a.kucuk === b.kucuk && a.orta === b.orta,
    ),
    dugmeBicimleri: grupKur<DugmeBicimiSecenegi, { deger: string }>(
      Object.fromEntries(
        Object.entries(magazaSecenekleri.dugmeBicimleri).map(([kod, deger]) => [kod, { deger }]),
      ),
      dugmeBicimiSecenekleri,
      ayarlar.dugmeBicimi,
      { deger: degerler.koseler.dugme },
      (a, b) => a.deger === b.deger,
    ),
    koyuTema: ayarlar.koyuTema,
    urunFiltresi: {
      ...(ayarlar.urunFiltresi === undefined ? {} : { kayitli: ayarlar.urunFiltresi }),
      temaninki:
        urunFiltresiGorunumleri.find(
          (yer): yer is UrunFiltresiGorunumu => yer === temaninFiltresi,
        ) ?? urunFiltresiGorunumleri[0],
    },
  };
};
