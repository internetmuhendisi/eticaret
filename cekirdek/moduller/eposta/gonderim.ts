// Kuyruktaki e-postanın gönderilmesi (kart 0032, karar 0050). Yalnız arka plan süreci çağırır.
import { eq } from "drizzle-orm";
import { hataOzeti } from "../../arka-plan-isleri/kuyruk.ts";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { siteAdresi } from "../../ayar-semasi/site-adresi.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { adresYazisi } from "../../bolgeler/adres-yazisi.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { type EpostaSablonu, epostaDurumu } from "../../kayitlar/eposta.ts";
import { siteninBicimleyicisi } from "../../metinler/site-metni.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { logonunAdresi, magazaLogosu } from "../magaza-ayarlari/logo.ts";
import { magazaninAdi, siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { type EpostaGondericisi, epostaGondericisi } from "./gonderici.ts";
import { epostaGorunusu } from "./gorunus.ts";
import type { KayitliMetinler } from "./metin-birimleri.ts";
import { epostaKayitlari } from "./model.ts";
import { epostaOlustur, type IcerikBaglami, veriliSablonMu } from "./sablon.ts";

export const gonderilmemeNedeni = {
  gondericiYok: "gonderici-yok",
  gonderenAdresiYok: "gonderen-adresi-yok",
} as const;

type Bagimliliklar = {
  site?: Site;
  gonderici?: EpostaGondericisi | undefined;
  sinyal?: AbortSignal;
};

// Mağaza ayarları (kart 0240, 0279): gönderen adı, yanıt adresi, alt bilgiye ek ve sipariş e-postasının alt bilgisi
// (satıcının unvanı, mağazanın adresi ve telefonu). Okunamazsa e-posta düşmez: mağaza adıyla, yanıt adresi ve ek
// olmadan, alt bilgi bunlarsız gider ve hata kaydedilir.
type MagazaninEpostaAyarlari = {
  gonderenAdi?: string;
  yanitAdresi?: string;
  altBilgiEki?: string;
  satici: IcerikBaglami["satici"];
};
const magazaninEpostaAyarlari = async (
  vt: Veritabani,
  site: Site,
): Promise<MagazaninEpostaAyarlari> => {
  try {
    const ayarlar = await siteninMagazaAyarlari(vt, site);
    const bicim = siteninBicimleyicisi(site.ayarlar);
    return {
      ...(ayarlar.epostaGonderenAdi === undefined
        ? {}
        : { gonderenAdi: ayarlar.epostaGonderenAdi }),
      ...(ayarlar.epostaYanitAdresi === undefined
        ? {}
        : { yanitAdresi: ayarlar.epostaYanitAdresi }),
      ...(ayarlar.epostaAltBilgiEki === undefined
        ? {}
        : { altBilgiEki: ayarlar.epostaAltBilgiEki }),
      satici: {
        ...(ayarlar.saticiBilgileri === undefined ? {} : { unvan: ayarlar.saticiBilgileri.unvan }),
        ...(ayarlar.magazaAdresi === undefined
          ? {}
          : { adres: adresYazisi(ayarlar.magazaAdresi, bicim.ulkeAdi) }),
        ...(ayarlar.iletisimTelefonu === undefined ? {} : { telefon: ayarlar.iletisimTelefonu }),
      },
    };
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "eposta-alt-bilgisi" });
    return { satici: {} };
  }
};

// Alt bilgiye ek yalnız mağazanın müşteriye giden e-postalarındadır: yöneticiye gidenler (bildirimler, ekibe davet,
// gönderim denemesi) almaz. Yöneticiye giden şablonların adı "yonetici" ile başlar (cekirdek/kayitlar/eposta.ts).
const musteriyeGidenMi = (sablon: string): boolean =>
  sablon !== "deneme" && !sablon.startsWith("yonetici");

// Gönderimin sitedeki bağlamı; gönderim işleminden önce okunur (ilk okuma başlangıç değerini kendi işleminde
// yazabilir). Mağaza adı mağaza sahibinin ayarıdır (kart 0071); logo okunamazsa e-posta logosuz, adla gider
// (kart 0073); renkler ve yazı tipi sitenin temasından, okunamazsa ortak değerler (kart 0240).
export type GonderimBaglami = {
  magazaAdi: string;
  logoAdresi: string | undefined;
  gorunus: Awaited<ReturnType<typeof epostaGorunusu>>;
  magaza: MagazaninEpostaAyarlari;
};
export const gonderimBaglami = async (vt: Veritabani, site: Site): Promise<GonderimBaglami> => {
  const magazaAdi = await magazaninAdi(vt, site);
  const logoAdresi = logonunAdresi(site, await magazaLogosu(vt, { site }));
  const gorunus = await epostaGorunusu(vt, site);
  const magaza = await magazaninEpostaAyarlari(vt, site);
  return { magazaAdi, logoAdresi, gorunus, magaza };
};

// E-postanın içeriği (gönderim ve panelin önizlemesi aynı işlevi kullanır, kart 0279).
export const epostaIceriginiKur = (
  site: Site,
  baglam: GonderimBaglami,
  e: {
    sablon: EpostaSablonu;
    degiskenler: Record<string, string>;
    veri?: unknown;
    metinler?: KayitliMetinler | null;
  },
) =>
  epostaOlustur({
    dil: site.ayarlar.dil,
    magazaAdi: baglam.magazaAdi,
    logoAdresi: baglam.logoAdresi,
    sablon: e.sablon,
    degiskenler: e.degiskenler,
    gorunus: baglam.gorunus,
    metinler: e.metinler ?? null,
    ...(musteriyeGidenMi(e.sablon) ? { altBilgiEki: baglam.magaza.altBilgiEki } : {}),
    ...(veriliSablonMu(e.sablon)
      ? {
          veri: e.veri,
          bicim: siteninBicimleyicisi(site.ayarlar),
          kok: siteAdresi(site.kimlik),
          satici: baglam.magaza.satici,
        }
      : {}),
  });

// Kayıt gönderim boyunca kilitlidir: aynı anda çalışan ikinci deneme bekler, sonra gönderilmiş
// olduğunu görür. Daha önce gönderilmişse bir daha gönderilmez. Hata fırlatan deneme kuyrukta
// yeniden denenir; hak bitince kaydı epostaBasarisizYap kapatır.
export const epostaKaydiniGonder = async (
  vt: Veritabani,
  kayitKimligi: string,
  bagimliliklar: Bagimliliklar = {},
): Promise<void> => {
  const site = bagimliliklar.site ?? calisanSite();
  // Testin "gönderici yok" demesi varsayılana düşmesin.
  const gonderici = "gonderici" in bagimliliklar ? bagimliliklar.gonderici : epostaGondericisi();
  const { ayarlar } = site;
  const baglam = await gonderimBaglami(vt, site);
  const sonuc = await vt.transaction(async (islem) => {
    const [kayit] = await islem
      .select()
      .from(epostaKayitlari)
      .where(eq(epostaKayitlari.kimlik, kayitKimligi))
      .for("update");
    if (!kayit) throw new Error(`E-posta kaydı yok: ${kayitKimligi}`);
    if (kayit.durum !== epostaDurumu.bekliyor) return undefined;
    const guncelle = (alanlar: Partial<typeof epostaKayitlari.$inferInsert>) =>
      islem.update(epostaKayitlari).set(alanlar).where(eq(epostaKayitlari.kimlik, kayit.kimlik));

    if (gonderici === undefined || ayarlar.epostaGonderenAdresi === undefined) {
      const neden = [
        ...(gonderici === undefined ? [gonderilmemeNedeni.gondericiYok] : []),
        ...(ayarlar.epostaGonderenAdresi === undefined
          ? [gonderilmemeNedeni.gonderenAdresiYok]
          : []),
      ].join(",");
      await guncelle({
        durum: epostaDurumu.gonderilmedi,
        son_hata: neden,
        degiskenler: null,
        veri: null,
        metinler: null,
      });
      return { tur: "gonderilmedi" as const, neden, sablon: kayit.sablon };
    }
    const icerik = epostaIceriginiKur(site, baglam, {
      sablon: kayit.sablon as EpostaSablonu,
      degiskenler: (kayit.degiskenler ?? {}) as Record<string, string>,
      veri: kayit.veri,
      metinler: kayit.metinler,
    });
    const alanAdi = ayarlar.epostaGonderenAdresi.split("@")[1];
    try {
      await gonderici(
        {
          kimden: {
            ad: baglam.magaza.gonderenAdi ?? baglam.magazaAdi,
            adres: ayarlar.epostaGonderenAdresi,
          },
          ...(baglam.magaza.yanitAdresi === undefined
            ? {}
            : { yanitAdresi: baglam.magaza.yanitAdresi }),
          kime: kayit.alici,
          ...icerik,
          mesajKimligi: `<${kayit.kimlik}@${alanAdi}>`,
        },
        bagimliliklar.sinyal,
      );
    } catch (hata) {
      await guncelle({ son_hata: hataOzeti(hata) });
      return { tur: "hata" as const, hata };
    }
    await guncelle({
      durum: epostaDurumu.gonderildi,
      gonderilme_zamani: new Date(),
      degiskenler: null,
      veri: null,
      metinler: null,
      son_hata: null,
    });
    return { tur: "gonderildi" as const, alici: kayit.alici, sablon: kayit.sablon };
  });
  if (sonuc === undefined) return;
  if (sonuc.tur === "hata") throw sonuc.hata;
  if (sonuc.tur === "gonderilmedi") {
    // Yeniden denemek düzeltmez: bir kez araca gider, görülsün.
    hatayiKaydet(new Error(`E-posta gönderilmedi: ${sonuc.neden}`), {
      kaynak: "eposta",
      sablon: sonuc.sablon,
      kayitKimligi,
    });
    return;
  }
  gunluk.bilgi("e-posta gönderildi", {
    alici: sonuc.alici,
    sablon: sonuc.sablon,
    kayitKimligi,
  });
};

// İş hakkını bitirdi: kayıt kapanır, değişkenler kalmaz. Süreç iş sırasında öldüyse de çağrılır.
export const epostaBasarisizYap = async (
  vt: Veritabani,
  kayitKimligi: string,
  hata: unknown,
): Promise<void> => {
  await vt
    .update(epostaKayitlari)
    .set({
      durum: epostaDurumu.basarisiz,
      degiskenler: null,
      veri: null,
      metinler: null,
      son_hata: hataOzeti(hata),
    })
    .where(eq(epostaKayitlari.kimlik, kayitKimligi));
};
