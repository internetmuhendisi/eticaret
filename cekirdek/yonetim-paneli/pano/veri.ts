// Panonun verisi, sunucuda (kart 0186, karar 0199; taslak: panel.html ve panel-2.html "Pano"). Her kutu kendi
// izniyle okunur, izni olmayanın kutusu yoktur (null); okunamayan kutu "hata" olur ve hata kaydedilir, sayfanın geri
// kalanı açılır. Sayılar çekirdeğin tek kurallarından gelir: siparişler listenin "Bakılması gereken" koşullarından
// (siparisYonetimi.panoSayilari), stok ürün listesinin stok süzgecinden (urunStokSayilari), yorumlar menüdeki
// sayıyla aynı işlevden, satış raporların sayma kuralından (satisRaporu). Bağlantılar ilgili listenin süzülmüş
// adresidir (listeAdresi).

import type { PanelIkonAdi } from "../../../bilesenler/ikonlar/panel-sozlugu";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import type { Site } from "../../ayar-semasi/site-klasoru";
import { eklentiAcikMi } from "../../eklentiler/acik";
import { eklentiPanoSatirlari } from "../../eklentiler/pano-satirlari";
import { hatayiKaydet } from "../../izleme/hata-katmani";
import { gunEkle, takvimGunu, tamTarih, yerelZamana } from "../../metinler/bicimleyici";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { metin } from "../../metinler/site-metni";
import type { YoneticiYetkileri } from "../../moduller/ekip/servis";
import { magazaLogosu } from "../../moduller/magaza-ayarlari/logo";
import { siteninMagazaAyarlari } from "../../moduller/magaza-ayarlari/servis";
import { kullanilabilirYontemler } from "../../moduller/odeme/yontemler";
import { donemGunleri, karsilastirmaDonemi, raporDonemDegeri } from "../../moduller/rapor/donem";
import { satisRaporu } from "../../moduller/rapor/satis";
import { siparisYonetimi } from "../../moduller/siparis/yonetim";
import { siteninStokAyarlari } from "../../moduller/stok/durum";
import { urunStokSayilari, urunVarMi } from "../../moduller/urun/panel-listesi";
import { onayBekleyenYorumOzeti } from "../../moduller/yorum/panel-listesi";
import type { Veritabani } from "../../veritabani/baglanti";
import { raporAdresi, siparisAyrintisiAdresi } from "../adresler";
import type { PanelEylemi } from "../eylemler";
import { listeAdresi, listeDurumunuOku } from "../liste/tanim";
import { kutuKur, type RaporKutusu, raporBicimi, seriVerisi } from "../raporlar/veri";
import { type PanelSayfaKodu, panelSayfalari, sayfaAcikMi, sayfaTanimi } from "../sayfa-agaci";
import { bakilacakSekmesi, siparisListesiTanimi } from "../siparisler/liste-tanimi";
import { urunListesiTanimi } from "../urunler/liste-tanimi";
import { type PanoAdimi, panoAdimlari, panoKisayollari, panoSinirlari } from "./tanim";

export type PanoSatiri = {
  kod: string;
  ikon: PanelIkonAdi;
  baslik: string;
  alt: string | null;
  // Satırın gittiği ekran ve sağdaki eylem yazısı ("Siparişe git"); izni olmayana yoktur.
  adres: string | null;
  eylem: string | null;
};
export type PanoKutusu = RaporKutusu & { adres: string | null };
// Kısayol: eylem kaydındaki eylem ya da menüdeki ad ve ikon.
export type PanoBaglantisi = { kod: string; adres: string } & (
  | { eylem: PanelEylemi }
  | { eylem: null; ad: string; ikon: PanelIkonAdi }
);
type Kutu<T> = T | "hata" | null;

export type PanoVerisi = {
  baslik: string;
  altBaslik: string;
  // Açılış adımları; hepsi tamamsa ya da izin yoksa yok.
  adimlar: Kutu<{
    tamam: number;
    toplam: number;
    // Satır gibi çizilir: tamamlanan adımın ikonu onay, bağlantısı ve açıklaması yoktur.
    adimlar: (PanoSatiri & { kod: PanoAdimi; tamam: boolean })[];
  }>;
  // Bir kaynağı okunamayan kutu öteki satırlarını gösterir ve eksik olduğunu söyler; hiçbiri okunamazsa "hata".
  bakilacaklar: Kutu<{ satirlar: PanoSatiri[]; eksik: boolean }>;
  satis: Kutu<ReturnType<typeof seriVerisi> & { raporAdresi: string }>;
  sayilar: Kutu<{ kutular: PanoKutusu[]; eksik: boolean }>;
  kisayollar: PanoBaglantisi[];
};

const anahtar = (yol: string) => `yonetim.pano.${yol}` as MetinAnahtari;

// Sitede açık ve yöneticinin görebildiği sayfanın tanımı; değilse yok.
const gorulenSayfa = (site: Site, yetkili: YoneticiYetkileri, kod: PanelSayfaKodu) => {
  const sayfa = sayfaTanimi(panelSayfalari, kod);
  if (sayfa === undefined || !sayfaAcikMi(sayfa, (e) => eklentiAcikMi(site, e))) return undefined;
  return sayfa.izin === null || yetkili(sayfa.izin) ? sayfa : undefined;
};

// Kutunun verisini okur; okunamazsa hatayı kaydeder ve "hata" döner.
const kutu = async <T>(ad: string, oku: () => Promise<T>): Promise<T | "hata"> => {
  try {
    return await oku();
  } catch (hata) {
    hatayiKaydet(hata, { ekran: "pano", kutu: ad });
    return "hata";
  }
};

// Günün saatine göre selam: 05–12 günaydın, 12–18 iyi günler, öteki saatler iyi akşamlar (sitenin saat diliminde).
export const selam = (
  simdi: Date,
  saatDilimi: string,
): "gunaydin" | "iyiGunler" | "iyiAksamlar" => {
  const saat = Number(yerelZamana(simdi, saatDilimi).slice(11, 13));
  return saat >= 5 && saat < 12
    ? "gunaydin"
    : saat >= 12 && saat < 18
      ? "iyiGunler"
      : "iyiAksamlar";
};

export const panoVerisi = async (
  vt: Veritabani,
  yetkili: YoneticiYetkileri,
  { site = calisanSite(), simdi = new Date() }: { site?: Site; simdi?: Date } = {},
): Promise<PanoVerisi> => {
  const b = raporBicimi(site);
  const { ornek } = panoSinirlari;
  const bugun = takvimGunu(simdi, site.ayarlar.saatDilimi);
  const sayfasi = (kod: PanelSayfaKodu) => gorulenSayfa(site, yetkili, kod);
  const siparisListesi = (durum: string) =>
    listeAdresi(siparisListesiTanimi, listeDurumunuOku(siparisListesiTanimi, {}), {
      suzgecler: { durum: [durum] },
    });
  const siparisGorur = yetkili("siparis.gor") && sayfasi("siparisler") !== undefined;
  const yorumGorur = yetkili("yorum.gor") && sayfasi("yorumlar") !== undefined;
  // Stok satırı ürün listesine gider: stoğu görme ve ürün listesini görme izni.
  const stokGorur = yetkili("stok.gor") && sayfasi("urunler") !== undefined;
  const raporGorur = sayfasi("raporlar") !== undefined;

  const siparisSayilari = siparisGorur
    ? kutu("siparis", () => siparisYonetimi(site).panoSayilari(vt, ornek))
    : Promise.resolve(null);

  // Bakılması gerekenler: sıfır olan satır yazılmaz. Her kaynak (siparişler, yorum, stok, eklentiler) kendi okunur:
  // okunamayan kaynağın hatası bir kez kaydedilir, öteki satırlar gelir ve kutu eksik olduğunu söyler.
  const bakilacaklar = async (): Promise<PanoVerisi["bakilacaklar"]> => {
    const eklentiler = eklentiPanoSatirlari.flatMap((tanim) => {
      const sayfa = sayfasi(tanim.sayfa);
      return sayfa === undefined ? [] : [{ tanim, sayfa }];
    });
    if (!siparisGorur && !yorumGorur && !stokGorur && eklentiler.length === 0) return null;
    const satirlar: PanoSatiri[] = [];
    let eksik = false;
    const satir = (
      kod: string,
      ikon: PanelIkonAdi,
      adet: number,
      alt: string | null,
      hedef: { adres: string; eylem: string },
    ) => {
      if (adet === 0) return;
      satirlar.push({
        kod,
        ikon,
        baslik: doldur(metin(anahtar(`satir.${kod}`)), { sayi: b.sayi(adet) }),
        alt,
        adres: hedef.adres,
        eylem: hedef.eylem,
      });
    };
    const ayrac = metin("yonetim.pano.ayrac");
    // İlk birkaç örnek; toplam daha çoksa "ve N tane daha".
    const ornekler = (adlar: string[], toplam: number) =>
      adlar.length === 0
        ? null
        : toplam > adlar.length
          ? doldur(metin("yonetim.pano.ornekVeFazlasi"), {
              ornekler: adlar.join(ayrac),
              sayi: b.sayi(toplam - adlar.length),
            })
          : adlar.join(ayrac);
    // Tek siparişte ayrıntısına, birden çokta süzülmüş listeye.
    const siparise = (is: { adet: number; numaralar: string[] }, liste: string) =>
      is.adet === 1 && is.numaralar[0] !== undefined
        ? {
            adres: siparisAyrintisiAdresi(is.numaralar[0]),
            eylem: metin("yonetim.pano.eylem.siparis"),
          }
        : { adres: siparisListesi(liste), eylem: metin("yonetim.pano.eylem.siparisler") };

    const sayilar = await siparisSayilari;
    if (sayilar === "hata") eksik = true;
    else if (sayilar !== null) {
      // Havale, iade talebi ve öteki iade işleri tek satırdır: sayısı "Bakılması gereken" sekmesininkidir (bir sipariş
      // birden çok işte olabilir), alt yazı dökümdür.
      const dokum = (["havale", "talep", "iade"] as const)
        .filter((kod) => sayilar[kod].adet > 0)
        .map((kod) => doldur(metin(anahtar(`dokum.${kod}`)), { sayi: b.sayi(sayilar[kod].adet) }));
      satir(
        "bakilacak",
        "uyari",
        sayilar.bakilacak.adet,
        dokum.length === 0 ? null : dokum.join(ayrac),
        siparise(sayilar.bakilacak, bakilacakSekmesi),
      );
      satir(
        "hazirlanacak",
        "paket",
        sayilar.hazirlanacak.adet,
        sayilar.hazirlanacak.enEski === null
          ? null
          : doldur(metin("yonetim.pano.enEskisi"), {
              zaman: b.tarihSaat(sayilar.hazirlanacak.enEski),
            }),
        siparise(sayilar.hazirlanacak, "hazirlaniyor"),
      );
    }
    if (yorumGorur) {
      const yorum = await kutu("yorum", () => onayBekleyenYorumOzeti(vt, ornek));
      if (yorum === "hata") eksik = true;
      else {
        satir("yorum", "yorumlar", yorum.sayi, ornekler(yorum.urunler, yorum.urunSayisi), {
          adres: sayfasi("yorumlar")?.adres ?? "",
          eylem: metin("yonetim.pano.eylem.yorumlar"),
        });
      }
    }
    if (stokGorur) {
      const stok = await kutu("stok", async () => {
        const stokAyarlari = await siteninStokAyarlari(vt, site);
        return urunStokSayilari(
          vt,
          {
            paraBirimi: stokAyarlari.paraBirimi,
            dusukStokEsigi: stokAyarlari.dusukStokEsigi,
            an: simdi,
            dil: site.ayarlar.dil,
          },
          ornek,
        );
      });
      if (stok === "hata") eksik = true;
      else {
        const urunListesi = (durum: string) => ({
          adres: listeAdresi(urunListesiTanimi, listeDurumunuOku(urunListesiTanimi, {}), {
            suzgecler: { stok: [durum] },
          }),
          eylem: metin("yonetim.pano.eylem.urunler"),
        });
        for (const durum of ["dusuk", "tukendi"] as const) {
          satir(
            durum,
            "urunler",
            stok[durum].adet,
            ornekler(stok[durum].adlar, stok[durum].adet),
            urunListesi(durum),
          );
        }
      }
    }
    for (const { tanim, sayfa } of eklentiler) {
      const okunan = await kutu(tanim.sayfa, () => tanim.oku(vt, site, ornek));
      if (okunan === "hata") eksik = true;
      else {
        satir(
          tanim.sayfa,
          sayfa.ikon,
          okunan.adet,
          ornekler(okunan.ornekler, okunan.ornekToplami),
          {
            adres: sayfa.adres,
            eylem: metin(sayfa.ad),
          },
        );
      }
    }
    return eksik && satirlar.length === 0 ? "hata" : { satirlar, eksik };
  };

  // Son günlerin satış grafiği: raporun sayma kuralıyla, günlük.
  const satis = async (): Promise<PanoVerisi["satis"]> => {
    if (!raporGorur) return null;
    return kutu("satis", async () => {
      const donem = { baslangic: gunEkle(bugun, 1 - panoSinirlari.satisGunu), bitis: bugun };
      const rapor = await satisRaporu(site).rapor(vt, donem, null);
      return {
        ...seriVerisi(b, rapor.seri),
        baslik: doldur(metin("yonetim.pano.satisBasligi"), {
          gun: b.sayi(panoSinirlari.satisGunu),
        }),
        // Rapor grafikteki günlerle açılır.
        raporAdresi: raporAdresi({
          donem: raporDonemDegeri({ tur: "aralik", ...donem }),
          karsilastir: true,
        }),
      };
    });
  };

  // Kısa sayılar: bugün ve son 7 günün satışı (raporun dönemleriyle, son 7 gün önceki 7 günle karşılaştırılır),
  // hazırlanacak ve ödeme bekleyen siparişler.
  const sayilar = async (): Promise<PanoVerisi["sayilar"]> => {
    if (!raporGorur && !siparisGorur) return null;
    const kutular: PanoKutusu[] = [];
    let eksik = false;
    if (raporGorur) {
      const satislar = await kutu("satis-sayilari", async () => {
        const servis = satisRaporu(site);
        const okunan: PanoKutusu[] = [];
        for (const kod of ["bugun", "son-7-gun"] as const) {
          const deger = { tur: "hazir", kod } as const;
          const donem = donemGunleri(deger, bugun);
          const onceki = kod === "bugun" ? null : karsilastirmaDonemi(deger, donem);
          const rapor = await servis.rapor(vt, donem, onceki);
          okunan.push({
            ...kutuKur(b, {
              kod,
              ad: metin(anahtar(`kutu.${kod}`)),
              simdi: rapor.ozet.satis,
              onceki: rapor.onceki === null ? undefined : rapor.onceki.ozet.satis,
              yazi: (sayi) => b.para(sayi),
              artisIyi: true,
              alt: doldur(metin("yonetim.pano.siparisSayisi"), {
                sayi: b.sayi(rapor.ozet.siparisSayisi),
              }),
            }),
            adres: raporAdresi({ donem: kod, karsilastir: true }),
          });
        }
        return okunan;
      });
      if (satislar === "hata") eksik = true;
      else kutular.push(...satislar);
    }
    const okunan = await siparisSayilari;
    if (okunan === "hata") eksik = true;
    else if (okunan !== null) {
      kutular.push({
        ...kutuKur(b, {
          kod: "hazirlanacak",
          ad: metin("yonetim.pano.kutu.hazirlanacak"),
          simdi: okunan.hazirlanacak.adet,
          onceki: undefined,
          yazi: (sayi) => b.sayi(sayi),
          artisIyi: null,
          // Kapıda ödemeli sipariş ödemesi alınmadan da hazırlanır: alt yazı yalnız en eskisinin zamanı.
          alt:
            okunan.hazirlanacak.enEski === null
              ? null
              : doldur(metin("yonetim.pano.enEskisi"), {
                  zaman: b.tarihSaat(okunan.hazirlanacak.enEski),
                }),
        }),
        adres: siparisListesi("hazirlaniyor"),
      });
      kutular.push({
        ...kutuKur(b, {
          kod: "odemeBekleyen",
          ad: metin("yonetim.pano.kutu.odemeBekleyen"),
          simdi: okunan.odemeBekleyen.adet,
          onceki: undefined,
          yazi: (sayi) => b.sayi(sayi),
          artisIyi: null,
          alt: b.para(okunan.odemeBekleyen.toplam),
        }),
        adres: siparisListesi("odeme-bekleniyor"),
      });
    }
    return eksik && kutular.length === 0 ? "hata" : { kutular, eksik };
  };

  // Açılış adımları: yalnız mağaza ayarlarını değiştirebilen (mağaza sahibi) görür; hepsi tamamsa kalkar.
  const adimlar = async (): Promise<PanoVerisi["adimlar"]> => {
    if (!yetkili("magaza-ayarlari.degistir")) return null;
    return kutu("adimlar", async () => {
      const [urun, ayarlar, logo] = await Promise.all([
        urunVarMi(vt),
        siteninMagazaAyarlari(vt, site),
        magazaLogosu(vt, { site }),
      ]);
      const tamam: Record<PanoAdimi, boolean> = {
        urun,
        magaza:
          ayarlar.iletisimTelefonu !== undefined &&
          ayarlar.magazaAdresi !== undefined &&
          ayarlar.saticiBilgileri !== undefined,
        odeme: kullanilabilirYontemler(site, ayarlar).length > 0,
        logo: logo !== undefined,
      };
      const liste = panoAdimlari.map(({ kod, sayfa: sayfaKodu }) => {
        const sayfa = sayfasi(sayfaKodu);
        return {
          kod,
          ikon: (tamam[kod] ? "onay" : (sayfa?.ikon ?? "nokta")) as PanelIkonAdi,
          baslik: metin(anahtar(`adim.${kod}.baslik`)),
          alt: tamam[kod] ? null : metin(anahtar(`adim.${kod}.aciklama`)),
          tamam: tamam[kod],
          // Tamamlanan adımın bağlantısı yoktur.
          adres: tamam[kod] ? null : (sayfa?.adres ?? null),
          eylem: tamam[kod] || sayfa === undefined ? null : metin(anahtar(`adim.${kod}.eylem`)),
        };
      });
      const tamamlanan = liste.filter((adim) => adim.tamam).length;
      return tamamlanan === liste.length
        ? null
        : { tamam: tamamlanan, toplam: liste.length, adimlar: liste };
    }).then((sonuc) => sonuc);
  };

  const [adimVerisi, bakilacakVerisi, satisVerisi, sayiVerisi] = await Promise.all([
    adimlar(),
    bakilacaklar(),
    satis(),
    sayilar(),
  ]);
  return {
    baslik: metin(anahtar(`selam.${selam(simdi, site.ayarlar.saatDilimi)}`)),
    altBaslik: tamTarih(simdi, site.ayarlar),
    adimlar: adimVerisi,
    bakilacaklar: bakilacakVerisi,
    satis: satisVerisi,
    sayilar: sayiVerisi,
    kisayollar: panoKisayollari.flatMap((kisayol): PanoBaglantisi[] => {
      const sayfa = sayfasi(kisayol.sayfa);
      if (sayfa === undefined) return [];
      return "eylem" in kisayol
        ? [{ kod: kisayol.sayfa, adres: sayfa.adres, eylem: kisayol.eylem }]
        : [
            {
              kod: kisayol.sayfa,
              adres: sayfa.adres,
              eylem: null,
              ad: metin(sayfa.ad),
              ikon: sayfa.ikon,
            },
          ];
    }),
  };
};
