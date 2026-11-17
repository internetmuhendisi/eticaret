// Banka hesabı numarası (IBAN) doğrulaması (kart 0214, karar 0141). Havalede müşteriye gösterilen banka hesaplarının
// numarası ISO 13616'ya uyar: iki harfli ülke kodu, iki kontrol hanesi ve en çok 30 harf ya da rakam; 97'ye göre
// kalan 1'dir. Ülkenin veri dosyasında uzunluk yazılıysa (ibanUzunlugu) uzunluk da tutar. Kodda ülkeye özgü
// uzunluk yazılmaz. Boşluklu ve küçük harfli yazılış kabul edilir, boşluksuz ve büyük harfle saklanır.
import { z } from "zod";
import { ulkeGecerliMi } from "./bolgeler.ts";
import trVerisi from "./tr.json" with { type: "json" };

const ulkeVerileri: readonly { ulke: string; ibanUzunlugu?: number }[] = [trVerisi];
const uzunluklar = new Map(
  ulkeVerileri.flatMap((veri) =>
    veri.ibanUzunlugu === undefined ? [] : [[veri.ulke, veri.ibanUzunlugu] as const],
  ),
);

// Hata kodları (ekran metni koda göre seçer).
export const ibanHatalari = ["iban-bicimi", "iban-ulke", "iban-uzunluk", "iban-kontrol"] as const;
export type IbanHatasi = (typeof ibanHatalari)[number];

// Yazılıştaki boşluklar atılır, harfler büyür.
export const ibanDuzelt = (yazi: string): string => yazi.replace(/\s+/g, "").toUpperCase();

// 97'ye göre kalan: harfler 10–35 olur, ilk dört karakter sona alınır. Büyük sayı parça parça bölünür.
const kalan = (iban: string): number => {
  const duzen = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let sonuc = 0;
  for (const harf of duzen) {
    const deger = /[0-9]/.test(harf) ? harf : String(harf.charCodeAt(0) - 55);
    for (const rakam of deger) sonuc = (sonuc * 10 + Number(rakam)) % 97;
  }
  return sonuc;
};

export const ibanHatasi = (yazi: string): IbanHatasi | undefined => {
  const iban = ibanDuzelt(yazi);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(iban)) return "iban-bicimi";
  const ulke = iban.slice(0, 2);
  if (!ulkeGecerliMi(ulke)) return "iban-ulke";
  const uzunluk = uzunluklar.get(ulke);
  if (uzunluk !== undefined && iban.length !== uzunluk) return "iban-uzunluk";
  if (kalan(iban) !== 1) return "iban-kontrol";
  return undefined;
};

// Şema: geçerli numara boşluksuz döner; geçersizde ileti hata kodudur.
export const ibanSemasi = z
  .string()
  .max(60)
  .transform((yazi, ctx) => {
    const hata = ibanHatasi(yazi);
    if (hata !== undefined) {
      ctx.addIssue({ code: "custom", message: hata });
      return z.NEVER;
    }
    return ibanDuzelt(yazi);
  });
