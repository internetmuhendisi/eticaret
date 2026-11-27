// Sürecin çalıştırdığı işlerin tek kaydı (kart 0031, karar 0049). Yeni iş: isTanimla ile tanımla ve
// kayitliIsler listesine ekle. Zamanlı iş: zamanliIs ile zamanliIsler listesine de ekle. Modüle ait
// iş kendi modülünde tanımlanır, kaydı buradadır.
import { z } from "zod";
import {
  excelDenetimIsi,
  excelDisaAktarmaIsi,
  excelTaramasiIsi,
  excelTemizligiIsi,
  excelUygulamaIsi,
} from "../eklentiler/excel-ile-toplu-urun-islemleri/isler.ts";
import {
  kartlaIadeTaramasiIsi,
  kartlaOdemeKarsilastirmasiIsi,
  kartlaOdemeTaramasiIsi,
} from "../eklentiler/kartla-odeme/isler.ts";
import {
  stokBildirimiGonderIsi,
  stokBildirimiTaramasiIsi,
  stokBildirimiTemizligiIsi,
} from "../eklentiler/stoga-gelince-haber-ver/isler.ts";
import { gunluk } from "../izleme/gunluk.ts";
import { denemeIsaretiBicimi } from "../kayitlar/arka-plan.ts";
import { excelAyari, kartlaOdemeAyari, stokBildirimiAyari } from "../kayitlar/eklentiler.ts";
import { davetTemizligiIsi } from "../moduller/ekip/isler.ts";
import { epostaGonderIsi, epostaKayitTemizligiIsi } from "../moduller/eposta/isler.ts";
import { odemeOturumuTemizligiIsi } from "../moduller/odeme/isler.ts";
import { havaleIptalIsi, kisiselVeriTemizligiIsi } from "../moduller/siparis/isler.ts";
import { stokUyarisiIsi, yoneticiBildirimiIsi } from "../moduller/yonetici-bildirimi/isler.ts";
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
  // Ödeme oturumlarının temizliği (kart 0213).
  odemeOturumuTemizligiIsi,
  // Ödenmeyen havale siparişinin iptali (kart 0214).
  havaleIptalIsi,
  kisiselVeriTemizligiIsi,
  // Stoğa gelince haber ver eklentisi (kart 0144, karar 0117).
  stokBildirimiGonderIsi,
  stokBildirimiTaramasiIsi,
  stokBildirimiTemizligiIsi,
  // Kartla ödeme eklentisi (kart 0215, karar 0142).
  kartlaOdemeTaramasiIsi,
  kartlaOdemeKarsilastirmasiIsi,
  // İptal ve iade (kart 0235, karar 0147).
  kartlaIadeTaramasiIsi,
  // Yönetici bildirimleri (kart 0241, karar 0154).
  yoneticiBildirimiIsi,
  stokUyarisiIsi,
  // Ekibe davet (kart 0275, karar 0179).
  davetTemizligiIsi,
  // Excel ile toplu ürün işlemleri eklentisi (kart 0315).
  excelDisaAktarmaIsi,
  excelDenetimIsi,
  excelUygulamaIsi,
  excelTaramasiIsi,
  excelTemizligiIsi,
];

export const zamanliIsler: readonly ZamanliIs[] = [
  zamanliIs(kuyrukTemizligiIsi, {}, { herDakika: 24 * 60 }),
  zamanliIs(epostaKayitTemizligiIsi, {}, { herDakika: 24 * 60 }),
  zamanliIs(odemeOturumuTemizligiIsi, {}, { herDakika: 60 }),
  zamanliIs(havaleIptalIsi, {}, { herDakika: 60 }),
  zamanliIs(kisiselVeriTemizligiIsi, {}, { herDakika: 24 * 60 }),
  zamanliIs(stokBildirimiTemizligiIsi, {}, { herDakika: 24 * 60 }),
  zamanliIs(stokBildirimiTaramasiIsi, {}, { herDakika: stokBildirimiAyari.taramaDakika }),
  zamanliIs(kartlaOdemeTaramasiIsi, {}, { herDakika: kartlaOdemeAyari.taramaDakika }),
  zamanliIs(kartlaOdemeKarsilastirmasiIsi, {}, { herDakika: 24 * 60 }),
  zamanliIs(davetTemizligiIsi, {}, { herDakika: 24 * 60 }),
  zamanliIs(kartlaIadeTaramasiIsi, {}, { herDakika: kartlaOdemeAyari.taramaDakika }),
  zamanliIs(excelTaramasiIsi, {}, { herDakika: excelAyari.taramaDakika }),
  zamanliIs(excelTemizligiIsi, {}, { herDakika: 24 * 60 }),
];
