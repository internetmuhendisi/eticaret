// Bülten kaydının girdisi (kart 0112): e-posta ve zorunlu pazarlama onayı (kullanıcı kararı). Form ve bülten
// eklentisinin ucu aynı şemayı kullanır. Onayın metni tektir (vitrin.onay.pazarlama, kayıt formuyla aynı); kaydı
// eklenti müşteri onaylarına yazar (cekirdek/kayitlar/musteri-onaylari.ts, "pazarlama").
import { z } from "zod";
import { epostaSemasi } from "../../../moduller/oturum/semalar.ts";

export const bultenKaydiSemasi = z.strictObject({
  eposta: epostaSemasi,
  pazarlamaOnayi: z.literal(true),
});
export type BultenKaydiGirdisi = z.infer<typeof bultenKaydiSemasi>;
