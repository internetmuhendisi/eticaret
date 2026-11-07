// E-posta göndermenin tek yolu (kart 0032, karar 0050): kayıt açar, işi kuyruğa koyar. İkisi aynı
// işlemdedir; çağıranın işlemi içinden çağrılırsa e-posta onunla birlikte girer ya da hiç girmez.
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
  const { kime, sablon, degiskenler } = epostaGirdisi.parse(girdi);
  return vt.transaction(async (islem) => {
    const [kayit] = await islem
      .insert(epostaKayitlari)
      .values({ alici: kime, sablon, durum: epostaDurumu.bekliyor, degiskenler })
      .returning({ kimlik: epostaKayitlari.kimlik });
    if (!kayit) throw new Error("E-posta kaydı açılamadı.");
    await isEkle(islem, epostaGonderIsi, { kayitKimligi: kayit.kimlik });
    return kayit.kimlik;
  });
};
