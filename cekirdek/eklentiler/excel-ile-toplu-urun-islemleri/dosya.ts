// Excel dosyasının yazılması ve okunması (kart 0315). Yazarken her metin hücresi metin türündedir, formül hiç
// yazılmaz: "=", "+", "-", "@" ile başlayan ürün adı dosyayı açan bilgisayarda formül olarak çalışmaz (tarif, yasal
// notlar). Okurken dosya açılmadan önce denetlenir: .xlsx (zip) imzası, boyut, açılmış hâlinin boyutu (sıkıştırma
// bombası), satır sınırı; yalnız hücrelerin değerleri okunur, formül ve makro çalıştırılmaz.
import { unzipSync } from "fflate";
import readXlsxFile from "read-excel-file/node";
import writeXlsxFile from "write-excel-file/node";
import { excelAyari } from "../../kayitlar/eklentiler.ts";
import { metin } from "../../metinler/site-metni.ts";
import { type Sutun, sutunlar } from "./sutunlar.ts";

export const sutunBasligi = (sutun: Sutun): string => metin(`eklenti.excel.sutun.${sutun}`);
const urunlerSayfasi = () => metin("eklenti.excel.sayfa.urunler");
const bilgiSayfasi = () => metin("eklenti.excel.sayfa.bilgi");
const kimlikSatiri = () => metin("eklenti.excel.bilgi.kimlik");

// Dosyanın bir satırı: sütundan hücreye. Tutar ve stok sayıdır, gerisi metin.
export type YazilacakHucre = string | number | null;
export type YazilacakSatir = Partial<Record<Sutun, YazilacakHucre>>;

export const dosyaYaz = async (girdi: {
  sutunlar: readonly Sutun[];
  satirlar: readonly YazilacakSatir[];
  kimlik: string;
  tarih: string;
}): Promise<Buffer> => {
  const baslik = girdi.sutunlar.map((sutun) => ({
    value: sutunBasligi(sutun),
    type: String,
    fontWeight: "bold" as const,
  }));
  const satirlar = girdi.satirlar.map((satir) =>
    girdi.sutunlar.map((sutun) => {
      const deger = satir[sutun] ?? null;
      if (deger === null || deger === "") return null;
      return typeof deger === "number"
        ? { value: deger, type: Number, ...(sutun === "stok" ? {} : { format: "0.00" }) }
        : { value: deger, type: String };
    }),
  );
  const bilgi = [
    [
      { value: kimlikSatiri(), type: String },
      { value: girdi.kimlik, type: String },
    ],
    [
      { value: metin("eklenti.excel.bilgi.tarih"), type: String },
      { value: girdi.tarih, type: String },
    ],
    [{ value: metin("eklenti.excel.bilgi.aciklama"), type: String }],
    [{ value: metin("eklenti.excel.bilgi.bos"), type: String }],
    [{ value: metin("eklenti.excel.bilgi.yeni"), type: String }],
  ];
  return writeXlsxFile([
    { data: [baslik, ...satirlar], sheet: urunlerSayfasi(), stickyRowsCount: 1 },
    { data: bilgi, sheet: bilgiSayfasi() },
  ]).toBuffer();
};

// Okunan dosya: başlıktan sütunlar, satırlar (hücreler sütun adıyla; boş hücre yok), dışa aktarmanın kimliği.
export type OkunanHucre = string | number | boolean | Date;
export type OkunanSatir = { no: number; hucreler: Partial<Record<Sutun, OkunanHucre>> };
export type OkunanDosya = {
  sutunlar: Sutun[];
  satirlar: OkunanSatir[];
  disaAktarma: string | null;
};
export type OkumaHatasi =
  | "excel-dosyasi-degil"
  | "excel-cok-buyuk"
  | "excel-satir-siniri"
  | "excel-sayfa-yok"
  | "excel-sutun-eksik"
  | "excel-sutun-tekrar"
  | "excel-bos";

// Arka plan süreci Node ile doğrudan çalışır: yapıcıda kısaltılmış alan yazımı kullanılmaz.
export class DosyaOkunamadi extends Error {
  readonly kod: OkumaHatasi;
  readonly ayrinti: string | undefined;
  constructor(kod: OkumaHatasi, ayrinti?: string) {
    super(kod);
    this.kod = kod;
    this.ayrinti = ayrinti;
  }
}

// Zip imzası ("PK\x03\x04"): .xlsx bir zip arşividir.
const zipImzasi = [0x50, 0x4b, 0x03, 0x04];

export const dosyaOku = async (dosya: Uint8Array, satirSiniri: number): Promise<OkunanDosya> => {
  if (dosya.byteLength > excelAyari.enCokBayt) throw new DosyaOkunamadi("excel-cok-buyuk");
  if (zipImzasi.some((bayt, i) => dosya[i] !== bayt))
    throw new DosyaOkunamadi("excel-dosyasi-degil");
  // Açılmış hâlin boyutu dosyalar açılmadan, arşivin kendi bilgisiyle ölçülür; sınırı aşan dosya açılmaz.
  let acilmis = 0;
  let calisma = false;
  try {
    unzipSync(dosya, {
      filter: (girdi) => {
        acilmis += girdi.originalSize;
        if (girdi.name === "xl/workbook.xml") calisma = true;
        return false;
      },
    });
  } catch {
    throw new DosyaOkunamadi("excel-dosyasi-degil");
  }
  if (acilmis > excelAyari.acilmisEnCokBayt) throw new DosyaOkunamadi("excel-cok-buyuk");
  if (!calisma) throw new DosyaOkunamadi("excel-dosyasi-degil");
  let sayfalar: { sheet: string; data: (OkunanHucre | null)[][] }[];
  try {
    sayfalar = await readXlsxFile(Buffer.from(dosya.buffer, dosya.byteOffset, dosya.byteLength));
  } catch {
    throw new DosyaOkunamadi("excel-dosyasi-degil");
  }
  // Ürünler sayfası adıyla, yoksa ilk sayfa (sayfanın adı değiştirilmiş olabilir).
  const urunSayfasi =
    sayfalar.find((sayfa) => sayfa.sheet === urunlerSayfasi()) ??
    sayfalar.find((sayfa) => sayfa.sheet !== bilgiSayfasi());
  if (urunSayfasi === undefined) throw new DosyaOkunamadi("excel-sayfa-yok");
  const [baslik, ...veri] = urunSayfasi.data;
  if (baslik === undefined) throw new DosyaOkunamadi("excel-bos");
  const basliklar = new Map(
    sutunlar.map((sutun) => [sutunBasligi(sutun).toLocaleLowerCase("tr"), sutun]),
  );
  // Tanınmayan başlıklı sütun yok sayılır (mağaza sahibi kendi notunu yazabilir).
  const yerler: { yer: number; sutun: Sutun }[] = [];
  baslik.forEach((hucre, yer) => {
    if (typeof hucre !== "string") return;
    const sutun = basliklar.get(hucre.trim().toLocaleLowerCase("tr"));
    if (sutun === undefined) return;
    if (yerler.some((y) => y.sutun === sutun))
      throw new DosyaOkunamadi("excel-sutun-tekrar", hucre.trim());
    yerler.push({ yer, sutun });
  });
  for (const zorunlu of ["urunKodu", "ad"] as const) {
    if (!yerler.some((y) => y.sutun === zorunlu)) {
      throw new DosyaOkunamadi("excel-sutun-eksik", sutunBasligi(zorunlu));
    }
  }
  const satirlar: OkunanSatir[] = [];
  veri.forEach((satir, i) => {
    const hucreler: Partial<Record<Sutun, OkunanHucre>> = {};
    for (const { yer, sutun } of yerler) {
      const deger = satir[yer];
      if (deger === null || deger === undefined) continue;
      if (typeof deger === "string" && deger.trim() === "") continue;
      hucreler[sutun] = deger;
    }
    // Tamamen boş satır yok sayılır.
    if (Object.keys(hucreler).length > 0) satirlar.push({ no: i + 2, hucreler });
  });
  if (satirlar.length === 0) throw new DosyaOkunamadi("excel-bos");
  if (satirlar.length > satirSiniri)
    throw new DosyaOkunamadi("excel-satir-siniri", String(satirSiniri));
  const bilgi = sayfalar.find((sayfa) => sayfa.sheet === bilgiSayfasi());
  const kimlikHucresi = bilgi?.data.find((satir) => satir[0] === kimlikSatiri())?.[1];
  return {
    sutunlar: yerler.map((y) => y.sutun),
    satirlar,
    disaAktarma: typeof kimlikHucresi === "string" ? kimlikHucresi.trim() : null,
  };
};
