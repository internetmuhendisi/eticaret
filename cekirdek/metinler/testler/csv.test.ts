// CSV yazıcısı (kart 0316): BOM, CRLF, tırnak kaçışı, ayraç, formül hücresi; tutarın iki para biçiminde yazılışı.
import { describe, expect, it } from "vitest";
import { bicimleyiciOlustur } from "../bicimleyici.ts";
import { csvYazici, metinHucresi, sayiHucresi } from "../csv.ts";

const yaz = (
  ayrac: ";" | ",",
  satirlar: Parameters<ReturnType<typeof csvYazici>["satir"]>[0][],
) => {
  const yazici = csvYazici(ayrac);
  for (const satir of satirlar) yazici.satir(satir);
  return yazici.dosya().toString("utf8");
};

describe("CSV yazıcısı", () => {
  it("UTF-8 BOM ile başlar, satırlar CRLF ile biter, Türkçe harfler korunur", () => {
    const dosya = yaz(";", [[metinHucresi("Sipariş no"), metinHucresi("Müşteri")]]);
    expect(dosya).toBe("﻿Sipariş no;Müşteri\r\n");
  });

  it("ayraç, tırnak ya da satır sonu taşıyan hücre tırnağa alınır, tırnak ikilenir", () => {
    expect(yaz(";", [[metinHucresi("a;b"), metinHucresi('"x"'), metinHucresi("1\n2")]])).toBe(
      '﻿"a;b";"""x""";"1\n2"\r\n',
    );
    // Virgül ayraç değilse tırnaksızdır.
    expect(yaz(";", [[metinHucresi("a,b")]])).toBe("﻿a,b\r\n");
    expect(yaz(",", [[metinHucresi("a,b")]])).toBe('﻿"a,b"\r\n');
  });

  it("formül hücresi etkisizdir; sayı hücresine ve boş değere dokunulmaz", () => {
    const dosya = yaz(";", [
      ["=1+1", "+90 555", "-2", "@SUM(A1)", "\tx", "\rx", "normal"].map(metinHucresi),
      [sayiHucresi("-5,00"), metinHucresi(null), metinHucresi(undefined)],
    ]);
    expect(dosya).toBe("﻿'=1+1;'+90 555;'-2;'@SUM(A1);'\tx;\"'\rx\";normal\r\n-5,00;;\r\n");
  });

  it("satır sayısı başlık dahil sayılır", () => {
    const yazici = csvYazici(";");
    yazici.satir([metinHucresi("a")]);
    yazici.satir([metinHucresi("b")]);
    expect(yazici.satirSayisi()).toBe(2);
  });

  it("tutar binlik ayırıcısız, sitenin ondalık ayırıcısıyla; ayraç ondalık ayırıcıya göre", () => {
    const ayar = (ondalikAyirici: string, binlikAyirici: string) =>
      bicimleyiciOlustur({
        dil: "tr",
        saatDilimi: "Europe/Istanbul",
        sayi: { binlikAyirici, ondalikAyirici },
        para: {
          paraBirimi: "XTS",
          simgeYeri: "sonda",
          simgeBoslugu: true,
          ondalikSayisi: 2,
        },
      });
    const virgullu = ayar(",", ".");
    expect(virgullu.csvTutari(123_456_789)).toBe("1234567,89");
    expect(virgullu.csvTutari(5)).toBe("0,05");
    expect(virgullu.csvTutari(0)).toBe("0,00");
    expect(virgullu.csvAyraci()).toBe(";");
    const noktali = ayar(".", ",");
    expect(noktali.csvTutari(123_456_789)).toBe("1234567.89");
    expect(noktali.csvAyraci()).toBe(",");
    expect(() => virgullu.csvTutari(1.5)).toThrow();
  });
});
