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
import { siparisEpostaIcerikleri } from "../siparis/eposta-icerigi.ts";
import { type EpostaGondericisi, epostaGondericisi } from "./gonderici.ts";
import { epostaGorunusu } from "./gorunus.ts";
import { epostaKayitlari } from "./model.ts";
import { epostaOlustur, type IcerikBaglami } from "./sablon.ts";

export const gonderilmemeNedeni = {
  gondericiYok: "gonderici-yok",
  gonderenAdresiYok: "gonderen-adresi-yok",
} as const;

type Bagimliliklar = {
  site?: Site;
  gonderici?: EpostaGondericisi | undefined;
  sinyal?: AbortSignal;
};

// Sipariş e-postasının alt bilgisi (kart 0240): satıcının unvanı, mağazanın adresi ve telefonu. Okunamazsa e-posta
// düşmez, alt bilgi bunlarsız gider ve hata kaydedilir.
const saticiAltBilgisi = async (vt: Veritabani, site: Site): Promise<IcerikBaglami["satici"]> => {
  try {
    const ayarlar = await siteninMagazaAyarlari(vt, site);
    const bicim = siteninBicimleyicisi(site.ayarlar);
    return {
      ...(ayarlar.saticiBilgileri === undefined ? {} : { unvan: ayarlar.saticiBilgileri.unvan }),
      ...(ayarlar.magazaAdresi === undefined
        ? {}
        : { adres: adresYazisi(ayarlar.magazaAdresi, bicim.ulkeAdi) }),
      ...(ayarlar.iletisimTelefonu === undefined ? {} : { telefon: ayarlar.iletisimTelefonu }),
    };
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "eposta-alt-bilgisi" });
    return {};
  }
};

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
  // Mağaza adı mağaza sahibinin ayarıdır (kart 0071). Gönderim işleminden önce okunur: ilk okuma
  // başlangıç değerini kendi işleminde yazabilir.
  const magazaAdi = await magazaninAdi(vt, site);
  // Logo da işlemden önce okunur (kart 0073); okunamazsa e-posta logosuz, adla gider.
  const logoAdresi = logonunAdresi(site, await magazaLogosu(vt, { site }));
  // Renkler ve yazı tipi sitenin temasından (kart 0240); okunamazsa ortak değerler.
  const gorunus = await epostaGorunusu(vt, site);
  // Sipariş e-postasının alt bilgisi yalnız sipariş e-postasında okunur (kilitsiz bakış; şablon kayıtta değişmez).
  const [bakis] = await vt
    .select({ sablon: epostaKayitlari.sablon })
    .from(epostaKayitlari)
    .where(eq(epostaKayitlari.kimlik, kayitKimligi));
  const siparisEpostasi = bakis !== undefined && bakis.sablon in siparisEpostaIcerikleri;
  const satici = siparisEpostasi ? await saticiAltBilgisi(vt, site) : {};
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
      });
      return { tur: "gonderilmedi" as const, neden, sablon: kayit.sablon };
    }
    const sablon = kayit.sablon as EpostaSablonu;
    const icerik = epostaOlustur({
      dil: ayarlar.dil,
      magazaAdi,
      logoAdresi,
      sablon,
      degiskenler: (kayit.degiskenler ?? {}) as Record<string, string>,
      gorunus,
      ...(siparisEpostasi
        ? {
            veri: kayit.veri,
            bicim: siteninBicimleyicisi(ayarlar),
            kok: siteAdresi(site.kimlik),
            satici,
          }
        : {}),
    });
    const alanAdi = ayarlar.epostaGonderenAdresi.split("@")[1];
    try {
      await gonderici(
        {
          kimden: {
            ad: ayarlar.epostaGonderenAdi ?? magazaAdi,
            adres: ayarlar.epostaGonderenAdresi,
          },
          ...(ayarlar.epostaYanitAdresi === undefined
            ? {}
            : { yanitAdresi: ayarlar.epostaYanitAdresi }),
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
      son_hata: hataOzeti(hata),
    })
    .where(eq(epostaKayitlari.kimlik, kayitKimligi));
};
