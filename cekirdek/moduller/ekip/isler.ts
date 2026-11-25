// Ekip modülünün arka plan işleri (kart 0275, karar 0179). Kayıt: cekirdek/arka-plan-isleri/isler.ts.
import { z } from "zod";
import { isTanimla } from "../../arka-plan-isleri/kuyruk.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { davetTemizligi } from "./davet.ts";

// Süresi dolup saklama süresini geçen davetler silinir: e-posta kişisel veridir, gereğinden uzun saklanmaz.
export const davetTemizligiIsi = isTanimla({
  tur: "davet-temizligi",
  sema: z.strictObject({}),
  calistir: async (_, { vt }) => {
    const silinen = await davetTemizligi(vt);
    gunluk.bilgi("saklama süresi dolan davetler silindi", { silinen });
  },
});
