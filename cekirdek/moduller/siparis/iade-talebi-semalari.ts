// Müşterinin iade talebi ve kendi iptali formlarının şemaları (kart 0239, karar 0151; .claude/rules/formlar.md).
// Vitrinin formu ile uç aynı şemayı kullanır. Bu dosya tarayıcıya gider: yalnız hafif şemaları içe aktarır (kart
// 0248). Üye olmayan müşterinin uçları ayrıca robot cevabı alır; sipariş takip anahtarıyla bulunur.
import { z } from "zod";
import {
  iadeTalebiSinirlari,
  musteriIadeNedenleri,
  siparisDurumlari,
} from "../../kayitlar/siparis.ts";
import { duzMetinSemasi } from "../../metinler/duz-metin.ts";
import { robotCevabiSemasi } from "../robot-korumasi/semalar.ts";
import { bosIseYok, siparisNumarasiSemasi } from "./havale-bildirimi-semalari.ts";

export const iadeTalebiFormuSemasi = z.strictObject({
  numara: siparisNumarasiSemasi,
  kalemler: z
    .array(
      z.strictObject({
        sira: z.number().int().min(0),
        adet: z.number().int().min(0).max(1_000_000),
      }),
    )
    .max(1000)
    .refine((kalemler) => new Set(kalemler.map((kalem) => kalem.sira)).size === kalemler.length, {
      message: "kalem-tekrar",
    })
    .refine((kalemler) => kalemler.some((kalem) => kalem.adet > 0), { message: "kalem-yok" }),
  neden: z.enum(musteriIadeNedenleri),
  aciklama: z.preprocess(bosIseYok, duzMetinSemasi(iadeTalebiSinirlari.aciklamaEnCok).optional()),
});
export type IadeTalebiFormu = z.output<typeof iadeTalebiFormuSemasi>;

export const takipIadeTalebiGirdisi = iadeTalebiFormuSemasi.extend({
  robotCevabi: robotCevabiSemasi,
});

// İptal: ekranın gördüğü durumla gelir; arada değiştiyse "cakisma".
export const musteriIptaliSemasi = z.strictObject({
  numara: siparisNumarasiSemasi,
  gorulenDurum: z.enum(siparisDurumlari),
});

export const takipIptaliGirdisi = musteriIptaliSemasi.extend({ robotCevabi: robotCevabiSemasi });
