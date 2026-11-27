// E-posta göndermenin tek yolu (kart 0032, karar 0050): kayıt açar, işi kuyruğa koyar. İkisi aynı
// işlemdedir; çağıranın işlemi içinden çağrılırsa e-posta onunla birlikte girer ya da hiç girmez.
// Olay anahtarı verilirse (kart 0240) aynı olayın ikinci e-postası yazılmaz: kayıt tekil indeksle, iş kuyruğun
// tekillik anahtarıyla reddedilir; o zaman ilk kaydın kimliği döner.
// Mağaza sahibinin bu şablon için yazdığı metinler (kart 0279) kayda o anki hâliyle yazılır: sonradan yapılan değişiklik
// kuyrukta bekleyen e-postayı değiştirmez.
import { eq, inArray } from "drizzle-orm";
import { isEkle } from "../../arka-plan-isleri/kuyruk.ts";
import { epostaDurumu } from "../../kayitlar/eposta.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { epostaGonderIsi } from "./isler.ts";
import { type KayitliMetinler, sablonunBirimleri } from "./metin-birimleri.ts";
import { epostaKayitlari, epostaMetinleri } from "./model.ts";
import { type EpostaGirdisi, epostaGirdisi } from "./semalar.ts";

// Şablonun birimlerinin kayıtlı metinleri; yalnız varsayılandan farklı alanlar.
export const kayitliMetinler = async (
  vt: Veritabani | VeritabaniIslemi,
  sablon: string,
): Promise<KayitliMetinler> => {
  const birimler = sablonunBirimleri(sablon);
  if (birimler.length === 0) return {};
  const satirlar = await vt
    .select()
    .from(epostaMetinleri)
    .where(inArray(epostaMetinleri.kod, birimler));
  const sonuc: KayitliMetinler = {};
  for (const satir of satirlar) {
    const alanlar = {
      ...(satir.konu === null ? {} : { konu: satir.konu }),
      ...(satir.giris === null ? {} : { giris: satir.giris }),
      ...(satir.kapanis === null ? {} : { kapanis: satir.kapanis }),
    };
    if (Object.keys(alanlar).length > 0) sonuc[satir.kod as keyof KayitliMetinler] = alanlar;
  }
  return sonuc;
};

export const epostaGonder = async (
  vt: Veritabani | VeritabaniIslemi,
  girdi: EpostaGirdisi,
): Promise<string> => {
  const { kime, sablon, degiskenler, veri, olayAnahtari, metinler } = epostaGirdisi.parse(girdi);
  return vt.transaction(async (islem) => {
    const yazilacak =
      (metinler as KayitliMetinler | undefined) ?? (await kayitliMetinler(islem, sablon));
    const [kayit] = await islem
      .insert(epostaKayitlari)
      .values({
        alici: kime,
        sablon,
        durum: epostaDurumu.bekliyor,
        degiskenler,
        veri: veri ?? null,
        olay_anahtari: olayAnahtari ?? null,
        metinler: Object.keys(yazilacak).length === 0 ? null : yazilacak,
      })
      .onConflictDoNothing({ target: epostaKayitlari.olay_anahtari })
      .returning({ kimlik: epostaKayitlari.kimlik });
    if (!kayit) {
      const [ilk] =
        olayAnahtari === undefined
          ? []
          : await islem
              .select({ kimlik: epostaKayitlari.kimlik })
              .from(epostaKayitlari)
              .where(eq(epostaKayitlari.olay_anahtari, olayAnahtari));
      if (ilk === undefined) throw new Error("E-posta kaydı açılamadı.");
      return ilk.kimlik;
    }
    await isEkle(
      islem,
      epostaGonderIsi,
      { kayitKimligi: kayit.kimlik },
      olayAnahtari === undefined ? {} : { tekillikAnahtari: `eposta:${olayAnahtari}` },
    );
    return kayit.kimlik;
  });
};
