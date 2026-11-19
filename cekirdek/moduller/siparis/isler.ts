// Sipariş modülünün arka plan işleri (kart 0214, 0234; karar 0141, 0145). Kayıt: cekirdek/arka-plan-isleri/isler.ts.
import { z } from "zod";
import { isTanimla } from "../../arka-plan-isleri/kuyruk.ts";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { havaleIptalTaramasi } from "./iptal.ts";
import { kisiselVeriTemizligi } from "./temizlik.ts";

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

// Saklama süresi dolan siparişlerin kişisel bilgileri silinir (kart 0234, karar 0145). Günde bir çalışır.
export const kisiselVeriTemizligiIsi = isTanimla({
  tur: "siparis-kisisel-veri-temizligi",
  sema: z.strictObject({}),
  calistir: async (_, { vt }) => {
    const silinen = await kisiselVeriTemizligi(vt, calisanSite());
    gunluk.bilgi("saklama süresi dolan siparişlerin kişisel bilgileri silindi", { silinen });
  },
});
