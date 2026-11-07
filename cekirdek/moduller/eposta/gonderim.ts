// Kuyruktaki e-postanın gönderilmesi (kart 0032, karar 0050). Yalnız arka plan süreci çağırır.
import { eq } from "drizzle-orm";
import { hataOzeti } from "../../arka-plan-isleri/kuyruk.ts";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { type EpostaSablonu, epostaDurumu } from "../../kayitlar/eposta.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { magazaninAdi } from "../magaza-ayarlari/servis.ts";
import { type EpostaGondericisi, epostaGondericisi } from "./gonderici.ts";
import { epostaKayitlari } from "./model.ts";
import { epostaOlustur } from "./sablon.ts";

export const gonderilmemeNedeni = {
  gondericiYok: "gonderici-yok",
  gonderenAdresiYok: "gonderen-adresi-yok",
} as const;

type Bagimliliklar = {
  site?: Site;
  gonderici?: EpostaGondericisi | undefined;
  sinyal?: AbortSignal;
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
      await guncelle({ durum: epostaDurumu.gonderilmedi, son_hata: neden, degiskenler: null });
      return { tur: "gonderilmedi" as const, neden, sablon: kayit.sablon };
    }
    const icerik = epostaOlustur({
      dil: ayarlar.dil,
      magazaAdi,
      logoAdresi: ayarlar.logoAdresi,
      sablon: kayit.sablon as EpostaSablonu,
      degiskenler: (kayit.degiskenler ?? {}) as Record<string, string>,
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
    .set({ durum: epostaDurumu.basarisiz, degiskenler: null, son_hata: hataOzeti(hata) })
    .where(eq(epostaKayitlari.kimlik, kayitKimligi));
};
