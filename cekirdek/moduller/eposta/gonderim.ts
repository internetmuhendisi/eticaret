// Kuyruktaki e-postanın gönderilmesi (kart 0032, karar 0050). Yalnız arka plan süreci çağırır.
import { eq } from "drizzle-orm";
import { hataOzeti } from "../../arka-plan-isleri/kuyruk.ts";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { type EpostaSablonu, epostaDurumu } from "../../kayitlar/eposta.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { type EpostaGondericisi, epostaGondericisi } from "./gonderici.ts";
import { epostaKayitlari } from "./model.ts";
import { epostaOlustur } from "./sablon.ts";

export const gonderilmemeNedeni = {
  gondericiYok: "gonderici-yok",
  gonderenAdresiYok: "gonderen-adresi-yok",
} as const;

type Bagimliliklar = { site?: Site; gonderici?: EpostaGondericisi | undefined };

// Son denemede hata verirse kayıt "başarısız" olur; kuyruk işi zaten hata olarak bırakır. Daha önce
// gönderilmişse (iş yeniden çalıştıysa) bir daha gönderilmez.
export const epostaKaydiniGonder = async (
  vt: Veritabani,
  kayitKimligi: string,
  sonDeneme: boolean,
  bagimliliklar: Bagimliliklar = {},
): Promise<void> => {
  const site = bagimliliklar.site ?? calisanSite();
  // Testin "gönderici yok" demesi varsayılana düşmesin.
  const gonderici = "gonderici" in bagimliliklar ? bagimliliklar.gonderici : epostaGondericisi();
  const [kayit] = await vt
    .select()
    .from(epostaKayitlari)
    .where(eq(epostaKayitlari.kimlik, kayitKimligi));
  if (!kayit) throw new Error(`E-posta kaydı yok: ${kayitKimligi}`);
  if (kayit.durum !== epostaDurumu.bekliyor) return;
  const guncelle = (alanlar: Partial<typeof epostaKayitlari.$inferInsert>) =>
    vt.update(epostaKayitlari).set(alanlar).where(eq(epostaKayitlari.kimlik, kayit.kimlik));

  const { kimlik, ayarlar } = site;
  const nedenler = [
    ...(gonderici === undefined ? [gonderilmemeNedeni.gondericiYok] : []),
    ...(ayarlar.epostaGonderenAdresi === undefined ? [gonderilmemeNedeni.gonderenAdresiYok] : []),
  ];
  if (gonderici === undefined || ayarlar.epostaGonderenAdresi === undefined) {
    const neden = nedenler.join(",");
    await guncelle({ durum: epostaDurumu.gonderilmedi, son_hata: neden, degiskenler: null });
    // Yeniden denemek düzeltmez: bir kez araca gider, görülsün.
    hatayiKaydet(new Error(`E-posta gönderilmedi: ${neden}`), {
      kaynak: "eposta",
      sablon: kayit.sablon,
      kayitKimligi: kayit.kimlik,
    });
    return;
  }
  const icerik = epostaOlustur({
    dil: ayarlar.dil,
    magazaAdi: kimlik.gorunenAd,
    logoAdresi: ayarlar.logoAdresi,
    sablon: kayit.sablon as EpostaSablonu,
    degiskenler: (kayit.degiskenler ?? {}) as Record<string, string>,
  });
  const alanAdi = ayarlar.epostaGonderenAdresi.split("@")[1];
  try {
    await gonderici({
      kimden: {
        ad: ayarlar.epostaGonderenAdi ?? kimlik.gorunenAd,
        adres: ayarlar.epostaGonderenAdresi,
      },
      ...(ayarlar.epostaYanitAdresi === undefined
        ? {}
        : { yanitAdresi: ayarlar.epostaYanitAdresi }),
      kime: kayit.alici,
      ...icerik,
      mesajKimligi: `<${kayit.kimlik}@${alanAdi}>`,
    });
  } catch (hata) {
    await guncelle({
      son_hata: hataOzeti(hata),
      ...(sonDeneme ? { durum: epostaDurumu.basarisiz, degiskenler: null } : {}),
    });
    throw hata;
  }
  await guncelle({
    durum: epostaDurumu.gonderildi,
    gonderilme_zamani: new Date(),
    degiskenler: null,
    son_hata: null,
  });
  gunluk.bilgi("e-posta gönderildi", {
    alici: kayit.alici,
    sablon: kayit.sablon,
    kayitKimligi: kayit.kimlik,
  });
};
