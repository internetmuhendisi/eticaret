// E-posta göndermenin tek yolu (kart 0032, karar 0050): kayıt açar, işi kuyruğa koyar. İkisi aynı
// işlemdedir; çağıranın işlemi içinden çağrılırsa e-posta onunla birlikte girer ya da hiç girmez.
// Olay anahtarı verilirse (kart 0240) aynı olayın ikinci e-postası yazılmaz: kayıt tekil indeksle, iş kuyruğun
// tekillik anahtarıyla reddedilir; o zaman ilk kaydın kimliği döner.
import { eq } from "drizzle-orm";
import { isEkle } from "../../arka-plan-isleri/kuyruk.ts";
import { epostaDurumu } from "../../kayitlar/eposta.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { epostaGonderIsi } from "./isler.ts";
import { epostaKayitlari } from "./model.ts";
import { type EpostaGirdisi, epostaGirdisi } from "./semalar.ts";

export const epostaGonder = async (
  vt: Veritabani | VeritabaniIslemi,
  girdi: EpostaGirdisi,
): Promise<string> => {
  const { kime, sablon, degiskenler, veri, olayAnahtari } = epostaGirdisi.parse(girdi);
  return vt.transaction(async (islem) => {
    const [kayit] = await islem
      .insert(epostaKayitlari)
      .values({
        alici: kime,
        sablon,
        durum: epostaDurumu.bekliyor,
        degiskenler,
        veri: veri ?? null,
        olay_anahtari: olayAnahtari ?? null,
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
