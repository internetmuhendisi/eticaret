// Dosya modülünün arka plan işleri (kart 0093, karar 0207). Kayıt: cekirdek/arka-plan-isleri/isler.ts.
import { z } from "zod";
import { isTanimla } from "../../arka-plan-isleri/kuyruk.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { dosyaTemizligiAyari } from "../../kayitlar/dosya.ts";
import { dosyaKlasoru } from "./servis.ts";
import { dosyaTemizligi } from "./temizlik.ts";

// Kaydı olmayan ve kaydı olup diskte olmayan dosya hata izleme aracına bildirilir; adlar kaydın kimliğidir,
// kişisel veri taşımaz. Kullanılmayan dosyaların sayısı yalnız günlüğe yazılır.
export const dosyaTemizligiIsi = isTanimla({
  tur: "dosya-temizligi",
  sema: z.strictObject({}),
  calistir: async (_, { vt }) => {
    const sonuc = await dosyaTemizligi(vt, dosyaKlasoru());
    gunluk.bilgi("dosya temizliği yapıldı", {
      isaretlenenBelge: sonuc.isaretlenenBelge,
      kaliciSilinen: sonuc.kaliciSilinen,
      kayitsiz: sonuc.kayitsiz.length,
      eksik: sonuc.eksik.length,
      kullanilmayan: sonuc.kullanilmayan,
    });
    if (sonuc.kayitsiz.length > 0 || sonuc.eksik.length > 0) {
      hatayiKaydet(new Error("dosya deposunda bakılması gereken dosyalar var"), {
        kayitsiz: sonuc.kayitsiz.length,
        eksik: sonuc.eksik.length,
        kayitsizOrnek: sonuc.kayitsiz.slice(0, dosyaTemizligiAyari.ornekSayisi),
        eksikOrnek: sonuc.eksik.slice(0, dosyaTemizligiAyari.ornekSayisi),
      });
    }
  },
});
