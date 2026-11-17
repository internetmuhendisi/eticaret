// Ödeme modülünün arka plan işleri (kart 0213, karar 0140). Kayıt: cekirdek/arka-plan-isleri/isler.ts.
import { z } from "zod";
import { isTanimla } from "../../arka-plan-isleri/kuyruk.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { eskiOdemeOturumlariniSil } from "./servis.ts";

// Süresi dolup saklama süresini geçen ödeme oturumları silinir: kişisel veri gereğinden uzun saklanmaz. Süresi dolan
// stok ayırması zaten sayılmaz; satırı oturumla gider.
export const odemeOturumuTemizligiIsi = isTanimla({
  tur: "odeme-oturumu-temizligi",
  sema: z.strictObject({}),
  calistir: async (_, { vt }) => {
    const silinen = await eskiOdemeOturumlariniSil(vt);
    gunluk.bilgi("süresi dolan ödeme oturumları silindi", { silinen });
  },
});
