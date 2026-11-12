// Ürünün özellik değerleri (kart 0086, karar 0072). Ürün servisi (cekirdek/moduller/urun/servis.ts)
// bunları kendi işlem kilidi altında, ürünün öteki bağlantıları gibi çağırır; değerler başka yoldan
// yazılmaz.
//
// - Değer, özelliğin türünün şemasıyla doğrulanır (semalar.ts, degerSemalari). Türüne uymayan değer
//   reddedilir; veritabanındaki denetim ikinci ağdır.
// - Yarış: değer yazılmadan önce ilgili özellik ve seçenek satırları paylaşımlı kilitlenir. Aynı anda
//   silinen özelliğe ya da seçeneğe değer yazılmaz, silinmiş seçeneğin değeri geri yazılmaz. Bütün
//   kilitler değer satırlarına dokunmadan önce alınır: özellik silme önce özellik satırını, sonra değer
//   satırlarını kilitler, sıra hep aynıdır.
// - Ürün kaydında değerler özellik kimliğine göre sıralıdır: değişiklik farkı ve kaydı sıraya bağlı
//   olmasın.
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { type OzellikTuru, ozellikDegerAlanlari } from "../../kayitlar/ozellik.ts";
import { adAnahtariSql } from "../../metinler/ad-anahtari.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimligiDuzelt, kimlikMi } from "../../veritabani/kimlik.ts";
import { dogrulamaHatasi, type Sorun } from "../urun/dogrulama.ts";
import { urunHatalari } from "../urun/semalar.ts";
import { ozellikler, ozellikSecenekleri, urunOzellikDegerleri } from "./model.ts";
import { degerSemalari, type OzellikDegeri, type UrunOzellikDegeri } from "./semalar.ts";

const sirala = (liste: UrunOzellikDegeri[]) =>
  liste.toSorted((a, b) => (a.ozellik < b.ozellik ? -1 : a.ozellik > b.ozellik ? 1 : 0));

const degerAlanlari = {
  ozellik: urunOzellikDegerleri.ozellik_kimligi,
  tur: urunOzellikDegerleri.tur,
  metin: urunOzellikDegerleri.metin_degeri,
  sayi: urunOzellikDegerleri.sayi_degeri,
  evetHayir: urunOzellikDegerleri.evet_hayir_degeri,
  secenek: urunOzellikDegerleri.secenek_kimligi,
};
type DegerSatiri = {
  ozellik: string;
  tur: string;
  metin: string | null;
  sayi: number | null;
  evetHayir: boolean | null;
  secenek: string | null;
};

// Satırdaki dolu alan değerdir (cekirdek/kayitlar/ozellik.ts, ozellikDegerAlanlari).
const satirDegeri = (satir: DegerSatiri): OzellikDegeri => {
  const deger = satir.metin ?? satir.sayi ?? satir.evetHayir ?? satir.secenek;
  if (deger === null) throw new Error("Özellik değeri boş.");
  return deger;
};

// Türün alanı kayıttan okunur (ozellikDegerAlanlari); öteki alanlar boştur.
const yazilacakSatir = (urun: string, tur: OzellikTuru, d: UrunOzellikDegeri) => ({
  urun_kimligi: urun,
  ozellik_kimligi: d.ozellik,
  tur,
  metin_degeri: null,
  sayi_degeri: null,
  evet_hayir_degeri: null,
  secenek_kimligi: null,
  [ozellikDegerAlanlari[tur]]: d.deger,
});

// Okuma: ürünün değerleri, özelliklerin sırasıyla. Silinmiş özelliğin değeri gelmez (silme değerleri
// zaten kaldırır, süzgeç ikinci ağdır). Tek sorgu.
export const urununOzellikleri = async (
  vt: Veritabani | VeritabaniIslemi,
  urun: string,
): Promise<UrunOzellikDegeri[]> =>
  (
    await vt
      .select(degerAlanlari)
      .from(urunOzellikDegerleri)
      .innerJoin(ozellikler, eq(ozellikler.kimlik, urunOzellikDegerleri.ozellik_kimligi))
      .where(and(eq(urunOzellikDegerleri.urun_kimligi, urun), isNull(ozellikler.silinme_zamani)))
      .orderBy(asc(ozellikler.sira), asc(ozellikler.olusturma_zamani), asc(ozellikler.kimlik))
  ).map((satir) => ({ ozellik: satir.ozellik, deger: satirDegeri(satir) }));

// Değişecek ürünün değerleri, kayıt biçiminde. Özellik ve seçenek satırları paylaşımlı kilitlenir;
// silinmiş özelliğin ya da seçeneğin değeri listeye girmez.
export const kilitliUrunOzellikleri = async (
  islem: VeritabaniIslemi,
  urun: string,
): Promise<UrunOzellikDegeri[]> => {
  const satirlar = await islem
    .select(degerAlanlari)
    .from(urunOzellikDegerleri)
    .innerJoin(ozellikler, eq(ozellikler.kimlik, urunOzellikDegerleri.ozellik_kimligi))
    .where(and(eq(urunOzellikDegerleri.urun_kimligi, urun), isNull(ozellikler.silinme_zamani)))
    .for("share", { of: ozellikler });
  const secenekler = satirlar.flatMap((satir) => (satir.secenek === null ? [] : [satir.secenek]));
  const gecerliSecenekler =
    secenekler.length === 0
      ? new Set<string>()
      : new Set(
          (
            await islem
              .select({ kimlik: ozellikSecenekleri.kimlik })
              .from(ozellikSecenekleri)
              .where(
                and(
                  inArray(ozellikSecenekleri.kimlik, secenekler),
                  isNull(ozellikSecenekleri.silinme_zamani),
                ),
              )
              .for("share")
          ).map((satir) => satir.kimlik),
        );
  return sirala(
    satirlar
      .filter((satir) => satir.secenek === null || gecerliSecenekler.has(satir.secenek))
      .map((satir) => ({ ozellik: satir.ozellik, deger: satirDegeri(satir) })),
  );
};

// Hata ürün girdisinin hatasıdır: kod ürünün hata listesinden.
const bilinenKodlar = new Set<string>(urunHatalari);

// Ürün girdisindeki değerleri denetler ve kayıt biçimine çevirir (türün şemasıyla, sıralı). Özellik
// ve seçenek satırları paylaşımlı kilitlenir. Bütün sorunlar birlikte döner; alan, girdideki sırayla
// "ozellikler.<sıra>.ozellik" ya da "ozellikler.<sıra>.deger" olur.
export const ozellikDegerleriniDenetle = async (
  islem: VeritabaniIslemi,
  liste: readonly UrunOzellikDegeri[],
): Promise<{ degerler: UrunOzellikDegeri[]; turler: Map<string, OzellikTuru> }> => {
  const turler = new Map<string, OzellikTuru>();
  if (liste.length === 0) return { degerler: [], turler };
  const bulunan = await islem
    .select({ kimlik: ozellikler.kimlik, tur: ozellikler.tur })
    .from(ozellikler)
    .where(
      and(
        inArray(
          ozellikler.kimlik,
          liste.map((d) => d.ozellik),
        ),
        isNull(ozellikler.silinme_zamani),
      ),
    )
    .for("share");
  for (const satir of bulunan) turler.set(satir.kimlik, satir.tur as OzellikTuru);

  const sorunlar: Sorun[] = [];
  const degerler: UrunOzellikDegeri[] = [];
  for (const [i, d] of liste.entries()) {
    const tur = turler.get(d.ozellik);
    if (tur === undefined) {
      sorunlar.push({ alan: `ozellikler.${i}.ozellik`, kod: "ozellik-gecersiz" });
      continue;
    }
    const sonuc = degerSemalari[tur].safeParse(d.deger);
    if (!sonuc.success) {
      const ileti = sonuc.error.issues[0]?.message;
      sorunlar.push({
        alan: `ozellikler.${i}.deger`,
        kod: ileti !== undefined && bilinenKodlar.has(ileti) ? ileti : "ozellik-deger-gecersiz",
      });
      continue;
    }
    degerler.push({ ozellik: d.ozellik, deger: sonuc.data });
  }

  // Liste değerinin seçeneği o özelliğin silinmemiş seçeneği olmalı.
  const listeDegerleri = degerler.filter((d) => turler.get(d.ozellik) === "liste");
  if (listeDegerleri.length > 0) {
    const secenekler = await islem
      .select({ kimlik: ozellikSecenekleri.kimlik, ozellik: ozellikSecenekleri.ozellik_kimligi })
      .from(ozellikSecenekleri)
      .where(
        and(
          inArray(
            ozellikSecenekleri.kimlik,
            listeDegerleri.map((d) => d.deger as string),
          ),
          isNull(ozellikSecenekleri.silinme_zamani),
        ),
      )
      .for("share");
    const sahibi = new Map(secenekler.map((satir) => [satir.kimlik, satir.ozellik]));
    for (const d of listeDegerleri) {
      if (sahibi.get(d.deger as string) !== d.ozellik) {
        const i = liste.findIndex((g) => g.ozellik === d.ozellik);
        sorunlar.push({ alan: `ozellikler.${i}.deger`, kod: "ozellik-secenek-gecersiz" });
      }
    }
  }
  if (sorunlar.length > 0) {
    // Girdinin sırasıyla: seçenek sorunları sonradan bulunur.
    const sira = (sorun: Sorun) => Number(sorun.alan.split(".")[1]);
    throw dogrulamaHatasi(sorunlar.toSorted((a, b) => sira(a) - sira(b)));
  }
  return { degerler: sirala(degerler), turler };
};

// Ürünün değerlerini verilen liste yapar. Çağıran listeyi ozellikDegerleriniDenetle ile denetlemiş,
// türleri ondan almıştır; kilitler alınmıştır.
export const ozellikDegerleriniYaz = async (
  islem: VeritabaniIslemi,
  urun: string,
  degerler: readonly UrunOzellikDegeri[],
  turler: ReadonlyMap<string, OzellikTuru>,
): Promise<void> => {
  await islem.delete(urunOzellikDegerleri).where(eq(urunOzellikDegerleri.urun_kimligi, urun));
  if (degerler.length === 0) return;
  await islem.insert(urunOzellikDegerleri).values(
    degerler.map((d) => {
      const tur = turler.get(d.ozellik);
      if (tur === undefined) throw new Error("Özelliğin türü denetlenmemiş.");
      return yazilacakSatir(urun, tur, d);
    }),
  );
};

// Bir değere sahip ürünleri süzen koşulun parçası: ürün listesi (cekirdek/moduller/urun/liste.ts)
// bunu exists içinde kullanır. Değer türü JavaScript türünden çıkar; metin ad anahtarıyla (büyük
// küçük harf ve noktalı noktasız i ayrımsız) karşılaştırılır, kimlik biçimindeki metin liste
// seçeneği olarak da aranır.
export const degerKosulu = (deger: OzellikDegeri) => {
  if (typeof deger === "boolean") return sql`${urunOzellikDegerleri.evet_hayir_degeri} = ${deger}`;
  if (typeof deger === "number") return sql`${urunOzellikDegerleri.sayi_degeri} = ${deger}`;
  const metin = deger.trim().normalize("NFC");
  const metinKosulu = sql`${adAnahtariSql(urunOzellikDegerleri.metin_degeri)} = ${adAnahtariSql(metin)}`;
  return kimlikMi(metin)
    ? sql`(${urunOzellikDegerleri.secenek_kimligi} = ${kimligiDuzelt(metin)}::uuid or ${metinKosulu})`
    : metinKosulu;
};
