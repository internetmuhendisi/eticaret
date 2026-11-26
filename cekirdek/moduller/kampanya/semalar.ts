// Panelin kupon uçlarının şemaları (kart 0313, karar 0188); ekran ve uç ortak kullanır. Alanlar formun yazılışıyla
// metin gelir (tutar sitenin para biçimiyle, zaman sitenin saat diliminde yerel zaman "2026-12-01T09:00", sınır tam
// sayı); sunucuda panelKuponGirdisi (panel.ts) çevirir, kuralları servis denetler. Boş metin "yok" demektir.
import { z } from "zod";
import {
  type KuponHatasi,
  kuponHatalari,
  kuponKapsamlari,
  kuponSinirlari,
  kuponTurleri,
} from "../../kayitlar/kampanya.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";

// Hata kodlarının metinleri (kodlu form, cekirdek/yonetim-paneli/kodlu-form.ts).
export const kuponHataMetinleri = Object.fromEntries(
  kuponHatalari.map((kod) => [kod, `yonetim.kupon.hata.${kod}`]),
) as Record<KuponHatasi, `yonetim.kupon.hata.${KuponHatasi}`>;

const yazi = (enCok: number) => z.string().max(enCok);

export const kuponPanelAlanlari = {
  kod: yazi(kuponSinirlari.kodEnCok * 4),
  ad: yazi(kuponSinirlari.adEnCok),
  tur: z.enum(kuponTurleri),
  deger: yazi(40),
  enAzTutar: yazi(40),
  kapsam: z.enum(kuponKapsamlari),
  // Sınırın kendisi servisin kuralıdır (kapsam-sinir); şema yalnız aşırı büyük isteği durdurur.
  kapsamKayitlari: z.array(kimlikSemasi).max(kuponSinirlari.kapsamEnCok * 2),
  baslangic: yazi(20),
  bitis: yazi(20),
  toplamSinir: yazi(20),
  kisiBasiSinir: yazi(20),
  indirimdeGecmez: z.boolean(),
  acik: z.boolean(),
};
export type KuponPanelGirdisi = z.infer<z.ZodObject<typeof kuponPanelAlanlari>>;

export const kuponEklemeSemasi = z.strictObject({
  kupon: z.strictObject(kuponPanelAlanlari),
});

// Değişiklik: yalnız değişen alanlar ve ekranın gördüğü değişme anı. İndirim türüyle birlikte gelir (indirimin
// yazılışı türe bağlıdır).
export const kuponDegisikligiSemasi = z.strictObject({
  kimlik: kimlikSemasi,
  gorulen: z.iso.datetime(),
  kupon: z
    .strictObject(kuponPanelAlanlari)
    .partial()
    .refine((kupon) => kupon.deger === undefined || kupon.tur !== undefined, {
      path: ["tur"],
    }),
});
