// Sipariş modülünün arka plan işleri (kart 0214, 0234; karar 0141, 0145). Kayıt: cekirdek/arka-plan-isleri/isler.ts.
import { z } from "zod";
import { isEkle, isTanimla } from "../../arka-plan-isleri/kuyruk.ts";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { type SiparisDisaAktarmaIsleri, siparisDisaAktarmaServisi } from "./disa-aktarma.ts";
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

// Siparişlerin dışa aktarması (kart 0316): dosyayı hazırlayan iş ve saatlik temizlik (dosya kişisel veri taşır,
// siparisDisaAktarmaAyari.saklamaSaat dolunca silinir).
export const siparisDisaAktarmaIsi = isTanimla({
  tur: "siparis-disa-aktarma",
  sema: z.strictObject({ kimlik: kimlikSemasi }),
  enCokDeneme: 3,
  calistir: async ({ kimlik }, { vt }) => {
    await calisanDisaAktarmaServisi().hazirla(vt, kimlik);
  },
  sonHata: async ({ kimlik }, vt) => calisanDisaAktarmaServisi().hatali(vt, kimlik),
});

export const siparisDisaAktarmaIsleri: SiparisDisaAktarmaIsleri = {
  hazirla: (vt, kimlik) => isEkle(vt, siparisDisaAktarmaIsi, { kimlik }),
};

export const calisanDisaAktarmaServisi = () =>
  siparisDisaAktarmaServisi(calisanSite(), siparisDisaAktarmaIsleri);

export const siparisDisaAktarmaTemizligiIsi = isTanimla({
  tur: "siparis-disa-aktarma-temizligi",
  sema: z.strictObject({}),
  calistir: async (_, { vt }) => {
    const silinen = await calisanDisaAktarmaServisi().eskileriSil(vt);
    gunluk.bilgi("süresi dolan sipariş dışa aktarmaları silindi", { silinen });
  },
});
