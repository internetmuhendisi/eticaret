// Satıcı bilgilerinin şeması (kart 0091, karar 0138): mesafeli satış sözleşmesinin ve ön bilgilendirme formunun
// istediği unvan, vergi kimlik bilgileri, MERSİS ve ticaret sicil numarası, KEP adresi.
//
// - Numaraların biçimi ve kontrol hanesi ülkenin veri dosyasındadır (<ülke>.json, saticiKimligi). Kuralı olmayan
//   ülkede numara yalnız uzunluk ve karakterlerle denetlenir. Kodda ülke adı ya da ülkeye özgü biçim yazmaz; kontrol
//   hanesi hesapları adlarıyla buradadır, hangisinin kullanılacağını veri dosyası söyler.
// - Unvan ve işletme türü zorunludur; öteki alanlar isteğe bağlıdır. Hangilerinin gerçek mağaza açılmadan dolu
//   olması gerektiği yasal metinlerle (kart 0063) kararlaştırılır.
// - Hata iletileri koddur (saticiHatalari).
import { z } from "zod";
import {
  type IsletmeTuru,
  isletmeTurleri,
  type NumaraDenetimi,
  type SaticiHatasi,
} from "../kayitlar/satici.ts";
import { ulkeGecerliMi } from "./bolgeler.ts";
import trVerisi from "./tr.json" with { type: "json" };

type NumaraKurali = { bicim: string; denetim?: NumaraDenetimi };
type SaticiKimligiKurallari = {
  vergiNumarasi?: Partial<Record<IsletmeTuru, NumaraKurali>>;
  mersisNumarasi?: string;
  kepAlanAdi?: string;
};
type UlkeVerisi = { ulke: string; saticiKimligi?: SaticiKimligiKurallari };

// Satıcı kimliği kuralı olan ülkeler. Yeni ülkenin dosyası buraya eklenir (bolgeler.ts'teki listeyle aynı dosyalar).
const ulkeVerileri: readonly UlkeVerisi[] = [trVerisi as UlkeVerisi];
const kurallar = new Map(
  ulkeVerileri.flatMap((veri) =>
    veri.saticiKimligi === undefined ? [] : [[veri.ulke, veri.saticiKimligi] as const],
  ),
);

const rakamlar = (numara: string): number[] => [...numara].map(Number);

// On haneli vergi kimlik numarası: ilk dokuz hanenin ağırlıklı toplamından onuncu hane.
const vergiKimlikNumarasiTutarli = (numara: string): boolean => {
  const h = rakamlar(numara);
  let toplam = 0;
  for (let i = 0; i < 9; i += 1) {
    const ara = ((h[i] ?? 0) + 9 - i) % 10;
    const deger = (ara * 2 ** (9 - i)) % 9;
    toplam += ara !== 0 && deger === 0 ? 9 : deger;
  }
  return (10 - (toplam % 10)) % 10 === h[9];
};

// On bir haneli kimlik numarası: onuncu hane tek ve çift sıradaki hanelerden, on birinci hane ilk onun toplamından.
const kimlikNumarasiTutarli = (numara: string): boolean => {
  const h = rakamlar(numara);
  const hane = (i: number) => h[i] ?? 0;
  const tekler = hane(0) + hane(2) + hane(4) + hane(6) + hane(8);
  const ciftler = hane(1) + hane(3) + hane(5) + hane(7);
  const onuncu = (((tekler * 7 - ciftler) % 10) + 10) % 10;
  const ilkOn = h.slice(0, 10).reduce((a, b) => a + b, 0);
  return onuncu === hane(9) && ilkOn % 10 === hane(10);
};

const denetimler: Record<NumaraDenetimi, (numara: string) => boolean> = {
  "vergi-kimlik-numarasi": vergiKimlikNumarasiTutarli,
  "kimlik-numarasi": kimlikNumarasiTutarli,
};

// Kuralı olmayan ülkede numaranın genel biçimi: harf, rakam, boşluk ve tire, en çok 30 karakter.
const genelNumara = /^[A-Za-z0-9][A-Za-z0-9 -]{0,29}$/;

const hata = (kod: SaticiHatasi) => kod;

// Kurumsal faturadaki vergi numarası (kart 0213): müşterinin işletme türü sorulmaz, numara ülkenin işletme türlerinden
// birinin kuralına uyarsa geçer (şirketin vergi kimlik numarası ya da şahıs işletmesinin kimlik numarası). Biçimi
// tutan ama kontrol hanesi tutmayan numara "vergi-numarasi-kontrol", hiçbir biçime uymayan "vergi-numarasi-bicimi"
// alır. Kuralı olmayan ülkede genel biçim denetlenir.
export const faturaVergiNumarasiHatasi = (
  ulke: string,
  numara: string,
): Extract<SaticiHatasi, "vergi-numarasi-bicimi" | "vergi-numarasi-kontrol"> | undefined => {
  const numaraKurallari = Object.values(kurallar.get(ulke)?.vergiNumarasi ?? {});
  if (numaraKurallari.length === 0) {
    return genelNumara.test(numara) ? undefined : "vergi-numarasi-bicimi";
  }
  const uyanlar = numaraKurallari.filter((kural) => new RegExp(kural.bicim).test(numara));
  if (uyanlar.length === 0) return "vergi-numarasi-bicimi";
  const tutan = uyanlar.some(
    (kural) => kural.denetim === undefined || denetimler[kural.denetim](numara),
  );
  return tutan ? undefined : "vergi-numarasi-kontrol";
};

export const saticiBilgileriSemasi = z
  .strictObject({
    ulke: z.string().trim(),
    isletmeTuru: z.enum(isletmeTurleri),
    unvan: z.string().trim().min(1).max(250),
    vergiDairesi: z.string().trim().min(1).max(100).optional(),
    vergiNumarasi: z.string().trim().min(1).max(30).optional(),
    mersisNumarasi: z.string().trim().min(1).max(30).optional(),
    ticaretSicilNumarasi: z.string().trim().min(1).max(50).optional(),
    kepAdresi: z.email().optional(),
  })
  .superRefine((satici, ctx) => {
    if (!ulkeGecerliMi(satici.ulke)) {
      ctx.addIssue({ code: "custom", message: hata("ulke-gecersiz"), path: ["ulke"] });
      return;
    }
    const kural = kurallar.get(satici.ulke);
    if (satici.vergiNumarasi !== undefined) {
      const numaraKurali = kural?.vergiNumarasi?.[satici.isletmeTuru];
      const bicim = numaraKurali === undefined ? genelNumara : new RegExp(numaraKurali.bicim);
      if (!bicim.test(satici.vergiNumarasi)) {
        ctx.addIssue({
          code: "custom",
          message: hata("vergi-numarasi-bicimi"),
          path: ["vergiNumarasi"],
        });
      } else if (
        numaraKurali?.denetim !== undefined &&
        !denetimler[numaraKurali.denetim](satici.vergiNumarasi)
      ) {
        ctx.addIssue({
          code: "custom",
          message: hata("vergi-numarasi-kontrol"),
          path: ["vergiNumarasi"],
        });
      }
    }
    if (satici.mersisNumarasi !== undefined) {
      const bicim =
        kural?.mersisNumarasi === undefined ? genelNumara : new RegExp(kural.mersisNumarasi);
      if (!bicim.test(satici.mersisNumarasi)) {
        ctx.addIssue({
          code: "custom",
          message: hata("mersis-numarasi-bicimi"),
          path: ["mersisNumarasi"],
        });
      }
    }
    if (
      satici.kepAdresi !== undefined &&
      kural?.kepAlanAdi !== undefined &&
      !new RegExp(kural.kepAlanAdi).test(satici.kepAdresi)
    ) {
      ctx.addIssue({ code: "custom", message: hata("kep-adresi-bicimi"), path: ["kepAdresi"] });
    }
  });
export type SaticiBilgileri = z.output<typeof saticiBilgileriSemasi>;
