// Stoğa gelince haber ver eklentisinin girdileri (kart 0144, karar 0117). Form ve uçlar aynı şemaları kullanır.
import { z } from "zod";
import { epostaSemasi } from "../../moduller/oturum/semalar.ts";
import { robotCevabiSemasi } from "../../moduller/robot-korumasi/semalar.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";

// Formun alanı: yalnız e-posta (onay kutusu yok, kullanıcı kararı).
export const stokBildirimiFormuSemasi = z.strictObject({ eposta: epostaSemasi });

// Üye olmayan müşterinin talebi: birim, e-posta ve robot cevabı (herkese açık uç).
export const stokBildirimiTalebiSemasi = z.strictObject({
  birim: kimlikSemasi,
  eposta: epostaSemasi,
  robotCevabi: robotCevabiSemasi,
});

// Giriş yapmış müşterinin talebi: e-posta hesaptandır, girdiden alınmaz (müşteri ucu).
export const uyeStokBildirimiTalebiSemasi = z.strictObject({ birim: kimlikSemasi });
