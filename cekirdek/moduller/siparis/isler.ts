// Sipariş modülünün arka plan işleri (kart 0214, karar 0141). Kayıt: cekirdek/arka-plan-isleri/isler.ts.
import { z } from "zod";
import { isTanimla } from "../../arka-plan-isleri/kuyruk.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { havaleIptalTaramasi } from "./iptal.ts";

// Süresi dolan, bildirimsiz havale siparişleri iptal olur, stokları geri konur. Saatlik çalışır: iptal en geç bir
// saat gecikir (süre gün olarak verilir).
export const havaleIptalIsi = isTanimla({
  tur: "havale-iptali",
  sema: z.strictObject({}),
  calistir: async (_, { vt }) => {
    const iptal = await havaleIptalTaramasi(vt);
    gunluk.bilgi("süresi dolan havale siparişleri iptal edildi", { iptal });
  },
});
