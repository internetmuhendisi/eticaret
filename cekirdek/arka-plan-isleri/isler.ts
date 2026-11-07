// Sürecin çalıştırdığı işlerin tek kaydı (kart 0031, karar 0049). Yeni iş: isTanimla ile tanımla ve
// kayitliIsler listesine ekle. Zamanlı iş: zamanliIs ile zamanliIsler listesine de ekle. Modüle ait
// iş kendi modülünde tanımlanır, kaydı buradadır.
import { z } from "zod";
import { gunluk } from "../izleme/gunluk.ts";
import { denemeIsaretiBicimi } from "../kayitlar/arka-plan.ts";
import { epostaGonderIsi, epostaKayitTemizligiIsi } from "../moduller/eposta/isler.ts";
import { type ZamanliIs, zamanliIs } from "./calistirici.ts";
import { bitenIsleriSil, type IsTanimi, isTanimla } from "./kuyruk.ts";

const denemeGirdisi = z.object({ isaret: z.string().regex(denemeIsaretiBicimi) });

// İki deneme işi yalnız `pnpm arka-plan-denemesi` ile, kutunun içinden girer; dışarıdan bir adresle
// tetiklenemez. Veri yazmazlar.
export const basariliDenemeIsi = isTanimla({
  tur: "deneme-basarili",
  sema: denemeGirdisi,
  calistir: async ({ isaret }) => {
    gunluk.bilgi("arka plan denemesi çalıştı", { isaret });
  },
});

export const hataliDenemeIsi = isTanimla({
  tur: "deneme-hatali",
  sema: denemeGirdisi,
  enCokDeneme: 2,
  ilkGecikmeSaniye: 1,
  calistir: async ({ isaret }) => {
    throw new Error(`arka plan denemesi bilerek hata verdi ${isaret}`);
  },
});

export const kuyrukTemizligiIsi = isTanimla({
  tur: "kuyruk-temizligi",
  sema: z.object({}),
  calistir: async (_, { vt }) => {
    const silinen = await bitenIsleriSil(vt);
    gunluk.bilgi("biten arka plan işleri silindi", { silinen });
  },
});

export const kayitliIsler: readonly IsTanimi[] = [
  basariliDenemeIsi,
  hataliDenemeIsi,
  kuyrukTemizligiIsi,
  epostaGonderIsi,
  epostaKayitTemizligiIsi,
];

export const zamanliIsler: readonly ZamanliIs[] = [
  zamanliIs(kuyrukTemizligiIsi, {}, { herDakika: 24 * 60 }),
  zamanliIs(epostaKayitTemizligiIsi, {}, { herDakika: 24 * 60 }),
];
