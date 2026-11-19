// Sipariş geçmişinin yazımı (kart 0214, karar 0141): her durum değişikliği kim, ne zaman, neden ile. Satırın zamanı
// yazıldığı andır (clock_timestamp): aynı işlemde yazılan satırların sırası yazılma sırasıdır. Arka plan süreci de
// yükler (iptal.ts): içe aktarmalar uzantılıdır, vitrin bağımlılığı yoktur.
import { sql } from "drizzle-orm";
import { type DegisikligiYapan, sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import type { SiparisDurumu, SiparisGecmisiNedeni } from "../../kayitlar/siparis.ts";
import type { VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { siparisGecmisi } from "./model.ts";

// Süre dolunca iptal eden zamanlı iş.
export const havaleIptalYapani = sistemIslemi("havale-suresi");
// Üye olmayan müşterinin siparişi geçmişe bu adla yazılır (hesabı yoktur).
export const uyeOlmayanMusteri = sistemIslemi("uye-olmayan-musteri");

export const kimSutunlari = (kim: DegisikligiYapan) => ({
  kim_turu: kim.tur,
  kim_kimligi: kim.tur === "sistem" ? null : kim.kimlik,
  kim_adi: kim.tur === "sistem" ? kim.ad : null,
});

export const gecmiseYaz = (
  islem: VeritabaniIslemi,
  g: {
    siparis: string;
    onceki: SiparisDurumu | null;
    sonraki: SiparisDurumu;
    neden: SiparisGecmisiNedeni;
    kim: DegisikligiYapan;
  },
) =>
  islem.insert(siparisGecmisi).values({
    siparis_kimligi: g.siparis,
    zaman: sql`clock_timestamp()`,
    onceki_durum: g.onceki,
    sonraki_durum: g.sonraki,
    neden: g.neden,
    ...kimSutunlari(g.kim),
  });
