// Teslimatın şeması (kart 0213, karar 0140): ad, soyad, telefon ve ortak posta adresi (il ve ilçe listeden, karar
// 0056, 0057). Telefon ülke içindeki yazılışla da girilir, ülkenin koduyla uluslararası biçime çevrilir. Telefonun
// zorunluluğu mağaza ayarıdır: şema yalnız biçimi denetler, zorunluluğu servis ayarla denetler (form da ayarı bilir).
//
// Ödeme adımı (semalar.ts) ve müşterinin adres defteri (cekirdek/moduller/musteri/adres-semalari.ts, kart 0237) aynı
// şemayı kullanır. Bu dosya tarayıcıya gider: ödeme şemalarının fatura, sepet ve hesap bağımlılıklarını almaz (kart
// 0248'in dersi, .claude/rules/performans.md).
import { z } from "zod";
import { postaAdresiSemasi, telefonGecerliMi, telefonuDuzelt } from "../../bolgeler/adres.ts";
import { odemeSinirlari } from "../../kayitlar/odeme.ts";
import { duzMetinSemasi } from "../../metinler/duz-metin.ts";

// Boş yazılan isteğe bağlı alan yoktur.
export const bosIseYok = (deger: unknown) =>
  typeof deger === "string" && deger.trim() === "" ? undefined : deger;

export const adSemasi = duzMetinSemasi(odemeSinirlari.adEnCok);

export const teslimatSemasi = z
  .strictObject({
    ad: adSemasi,
    soyad: adSemasi,
    telefon: z.preprocess(bosIseYok, z.string().max(40).optional()),
    adres: postaAdresiSemasi,
  })
  .transform((teslimat, ctx) => {
    if (teslimat.telefon === undefined) return { ...teslimat, telefon: undefined };
    const telefon = telefonuDuzelt(teslimat.adres.ulke, teslimat.telefon);
    if (!telefonGecerliMi(telefon)) {
      ctx.addIssue({ code: "custom", message: "telefon-bicimi", path: ["telefon"] });
      return z.NEVER;
    }
    return { ...teslimat, telefon };
  });
export type Teslimat = z.output<typeof teslimatSemasi>;
