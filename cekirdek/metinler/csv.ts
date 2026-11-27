// CSV dosyasının tek yazıcısı (kart 0316, karar 0185): siparişlerin dışa aktarması ve satış raporunun indirmesi
// (kart 0317) bununla yazar.
//
// - UTF-8, başında BOM: tablo programı Türkçe harfleri doğru açar. Satır sonu CRLF (RFC 4180).
// - Ayraç çağırandan gelir (sitenin biçimi, bicimleyici.csvAyraci): ondalık ayırıcısı virgül olan dilde tablo
//   programı noktalı virgül bekler.
// - Ayraç, tırnak ya da satır sonu taşıyan hücre tırnağa alınır, içindeki tırnak ikilenir.
// - Formül hücresi etkisizdir: metin hücresi =, +, -, @, sekme ya da satır başıyla başlıyorsa başına ' konur
//   (tablo programı formül olarak çalıştırmaz). Sayı hücresi (tutar) çağıranın ürettiği sayıdır, dokunulmaz.
// - Dosya parça parça kurulur: çağıran satırları partilerle verir, bütün veri bellekte birlikte tutulmaz.

export type CsvHucresi = { tur: "metin"; deger: string } | { tur: "sayi"; deger: string };

export const metinHucresi = (deger: string | null | undefined): CsvHucresi => ({
  tur: "metin",
  deger: deger ?? "",
});
export const sayiHucresi = (deger: string): CsvHucresi => ({ tur: "sayi", deger });

const formulBaslangici = /^[=+\-@\t\r]/;
// Bayt sırası işareti (U+FEFF).
const bom = String.fromCharCode(0xfeff);
const satirSonu = "\r\n";

const hucreYazisi = (hucre: CsvHucresi, ayrac: string): string => {
  const deger =
    hucre.tur === "metin" && formulBaslangici.test(hucre.deger) ? `'${hucre.deger}` : hucre.deger;
  return deger.includes(ayrac) || /["\r\n]/.test(deger)
    ? `"${deger.replaceAll('"', '""')}"`
    : deger;
};

// Satırlar tek bir büyüyen arabelleğe yazılır (kart 0316): satır başına ayrı parça ve sondaki birleştirme belleği
// ikiye katlıyordu (50.000 siparişte ölçüldü). Dosya arabelleğin dolu kısmıdır, kopyalanmaz.
export const csvYazici = (ayrac: ";" | ",") => {
  let arabellek = Buffer.allocUnsafe(1 << 20);
  let uzunluk = arabellek.write(bom, 0, "utf8");
  let satirSayisi = 0;
  return {
    satir: (hucreler: readonly CsvHucresi[]) => {
      const yazi = `${hucreler.map((hucre) => hucreYazisi(hucre, ayrac)).join(ayrac)}${satirSonu}`;
      const gereken = uzunluk + Buffer.byteLength(yazi, "utf8");
      if (gereken > arabellek.length) {
        const yeni = Buffer.allocUnsafe(Math.max(gereken, Math.ceil(arabellek.length * 1.5)));
        arabellek.copy(yeni, 0, 0, uzunluk);
        arabellek = yeni;
      }
      uzunluk += arabellek.write(yazi, uzunluk, "utf8");
      satirSayisi += 1;
    },
    // Başlık satırı da sayılır.
    satirSayisi: () => satirSayisi,
    dosya: (): Buffer => arabellek.subarray(0, uzunluk),
  };
};
