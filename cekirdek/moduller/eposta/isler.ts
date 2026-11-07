// E-postanın arka plan işleri (kart 0032, karar 0050); kaydı arka-plan-isleri/isler.ts'tedir. İşin
// girdisinde yalnız kaydın kimliği vardır: alıcı adresi kuyruk tablosuna girmez.
import { lt } from "drizzle-orm";
import { z } from "zod";
import { isTanimla } from "../../arka-plan-isleri/kuyruk.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { kuyrukAyari } from "../../kayitlar/arka-plan.ts";
import { epostaAyari } from "../../kayitlar/eposta.ts";
import { epostaKaydiniGonder } from "./gonderim.ts";
import { epostaKayitlari } from "./model.ts";

export const epostaGonderIsi = isTanimla({
  tur: "eposta-gonder",
  sema: z.strictObject({ kayitKimligi: z.uuid() }),
  calistir: ({ kayitKimligi }, { vt, deneme }) =>
    epostaKaydiniGonder(vt, kayitKimligi, deneme >= kuyrukAyari.enCokDeneme),
});

export const epostaKayitTemizligiIsi = isTanimla({
  tur: "eposta-kayit-temizligi",
  sema: z.strictObject({}),
  calistir: async (_, { vt }) => {
    const sinir = new Date(Date.now() - epostaAyari.kayitSaklamaGun * 86_400_000);
    const silinenler = await vt
      .delete(epostaKayitlari)
      .where(lt(epostaKayitlari.olusturulma_zamani, sinir))
      .returning({ kimlik: epostaKayitlari.kimlik });
    gunluk.bilgi("eski e-posta kayıtları silindi", { silinen: silinenler.length });
  },
});
