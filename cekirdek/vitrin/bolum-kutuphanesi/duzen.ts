// Bölüm kütüphanesi ve düzenin şeması (kart 0106, karar 0081). Düz TypeScript: site klasörü doğrulaması,
// tema şeması, düzen servisi ve vitrin aynı kuralları kullanır.
//
// Düzen: her düzen alanında (üst kısım, ana sayfa, alt kısım) sırasıyla bölümler. Her bölüm bir türün
// örneğidir: kendi kimliği, görünümü, görünürlüğü ve alan değerleri vardır. Aynı türden birden çok bölüm
// aynı düzende olabilir.
import { z } from "zod";
import { type DuzenAlani, duzenAlanlari } from "../../kayitlar/tema.ts";
import { kayitAlaniYasakMi } from "../../moduller/degisiklik-kaydi/deger.ts";
import {
  type AlanTarifi,
  type BolumDegerleri,
  type BolumTarifi,
  bolumAlanHatalari,
  bolumBaglari,
  bolumDegerSemasi,
  type Kip,
  kayitliKip,
} from "./tarif.ts";

export type BolumKutuphanesi = Readonly<Record<string, BolumTarifi>>;

// Bir düzen alanındaki bölüm sayısının üst sınırı.
export const alandakiEnCokBolum = 50;

// Bölüm, görünüm ve alan kodları.
const kodKalibi = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const alanKoduKalibi = /^[a-z][a-zA-Z0-9]*$/;

export const duzenHatalari = [
  "bolum-tanimsiz",
  "bolum-alani-uygun-degil",
  "gorunum-tanimsiz",
  "kimlik-tekrar",
  "alan-dolu",
  ...bolumAlanHatalari,
] as const;
export type DuzenHatasi = (typeof duzenHatalari)[number];

export type DuzenSorunu = { yer: (string | number)[]; kod: string };

export type BolumOrnegi = {
  kimlik: string;
  tur: string;
  gorunum: string;
  gizli: boolean;
  degerler: BolumDegerleri;
};
export type Duzen = Record<DuzenAlani, BolumOrnegi[]>;

export const bosDuzen = (): Duzen => ({ "ust-kisim": [], "ana-sayfa": [], "alt-kisim": [] });

// Kütüphanenin kendi tutarlılığı: kayıt anahtarı türün koduyla aynı, kodlar kalıba uygun, görünüm kodları
// tekil, listenin sınırları doğru. Alan kodları değişiklik kaydına girer: kayıtta yasak bir sözcük
// (telefon, eposta, anahtar...) taşıyamaz, yoksa her kayıt düşerdi. Testte denetlenir (cekirdek/vitrin/bolum-kutuphanesi/testler/).
// Seçim alanının seçenekleri tekil, varsayılanı seçeneklerden biri olmalı (kart 0110).
const secimSorunlari = (alan: AlanTarifi, yer: string): string[] => {
  if (alan.tur !== "secim") return [];
  const kodlar = alan.secenekler.map((secenek) => secenek.kod);
  return [
    ...(new Set(kodlar).size === kodlar.length ? [] : [`${yer}: seçenek tekrarı`]),
    ...(kodlar.includes(alan.varsayilan) ? [] : [`${yer}: varsayılan seçeneklerde yok`]),
  ];
};

export const kutuphaneSorunlari = (kutuphane: BolumKutuphanesi): string[] => {
  const sorunlar: string[] = [];
  for (const [anahtar, tarif] of Object.entries(kutuphane)) {
    const yer = `bolum ${anahtar}`;
    if (anahtar !== tarif.tur) sorunlar.push(`${yer}: kayıt anahtarı türün koduyla aynı değil`);
    if (!kodKalibi.test(tarif.tur)) sorunlar.push(`${yer}: tür kodu kalıba uymuyor`);
    const gorunumler = tarif.gorunumler.map((gorunum) => gorunum.kod);
    if (new Set(gorunumler).size !== gorunumler.length) sorunlar.push(`${yer}: görünüm tekrarı`);
    for (const kod of gorunumler) {
      if (!kodKalibi.test(kod)) sorunlar.push(`${yer}: görünüm kodu kalıba uymuyor: ${kod}`);
    }
    for (const [kod, alan] of Object.entries(tarif.alanlar)) {
      if (!alanKoduKalibi.test(kod)) sorunlar.push(`${yer}: alan kodu kalıba uymuyor: ${kod}`);
      if (kayitAlaniYasakMi(kod)) sorunlar.push(`${yer}: alan kodu kayda yazılamaz: ${kod}`);
      sorunlar.push(...secimSorunlari(alan, `${yer}: ${kod}`));
      if (alan.tur !== "liste") continue;
      if (alan.enAz < 0 || alan.enCok < Math.max(1, alan.enAz)) {
        sorunlar.push(`${yer}: ${kod}: listenin sınırları yanlış`);
      }
      for (const [altKod, alt] of Object.entries(alan.alanlar)) {
        sorunlar.push(...secimSorunlari(alt, `${yer}: ${kod}.${altKod}`));
        if (!alanKoduKalibi.test(altKod) || kayitAlaniYasakMi(altKod)) {
          sorunlar.push(
            `${yer}: ${kod}: alan kodu kalıba uymuyor ya da kayda yazılamaz: ${altKod}`,
          );
        }
      }
    }
  }
  return sorunlar;
};

const sorunlariCevir = (yer: (string | number)[], hata: z.ZodError): DuzenSorunu[] =>
  hata.issues.map((sorun) => ({
    yer: [
      ...yer,
      ...sorun.path.map((parca) => (typeof parca === "symbol" ? String(parca) : parca)),
    ],
    kod: (duzenHatalari as readonly string[]).includes(sorun.message) ? sorun.message : sorun.code,
  }));

// Bir bölümün türü, alanı, görünümü ve değerleri. Değerleri şemadan geçmiş hâliyle döndürür.
export const bolumuDenetle = (
  kutuphane: BolumKutuphanesi,
  alan: DuzenAlani,
  bolum: { tur: string; gorunum: string; degerler: unknown },
  yer: (string | number)[],
  kip: Kip,
): { degerler: BolumDegerleri } | { sorunlar: DuzenSorunu[] } => {
  const tarif = Object.hasOwn(kutuphane, bolum.tur) ? kutuphane[bolum.tur] : undefined;
  if (tarif === undefined) return { sorunlar: [{ yer: [...yer, "tur"], kod: "bolum-tanimsiz" }] };
  const sorunlar: DuzenSorunu[] = [];
  if (!tarif.duzenAlanlari.includes(alan)) {
    sorunlar.push({ yer: [...yer, "tur"], kod: "bolum-alani-uygun-degil" });
  }
  if (!tarif.gorunumler.some((gorunum) => gorunum.kod === bolum.gorunum)) {
    sorunlar.push({ yer: [...yer, "gorunum"], kod: "gorunum-tanimsiz" });
  }
  const degerler = bolumDegerSemasi(tarif, kip).safeParse(bolum.degerler);
  if (!degerler.success) sorunlar.push(...sorunlariCevir([...yer, "degerler"], degerler.error));
  if (sorunlar.length > 0 || !degerler.success) return { sorunlar };
  return { degerler: degerler.data };
};

// Başlangıç düzeni (temanın ve sitenin başlangıç dosyası): bölümlerin kimliği yoktur, kurulumda üretilir.
// Görünüm verilmezse ilk görünüm, görünürlük verilmezse görünür. Temanın düzeninde kayda başvuran alanlar boş
// kalır, sitenin düzeninde adres adıyla yazılır (tarif.ts, Kip).
const baslangicBolumu = z.strictObject({
  tur: z.string().regex(kodKalibi),
  gorunum: z.string().regex(kodKalibi).optional(),
  gizli: z.boolean().default(false),
  degerler: z.record(z.string(), z.unknown()).default({}),
});
export const baslangicDuzeniSemasi = z.strictObject(
  Object.fromEntries(
    duzenAlanlari.map((alan) => [alan, z.array(baslangicBolumu).max(alandakiEnCokBolum)]),
  ) as Record<DuzenAlani, z.ZodArray<typeof baslangicBolumu>>,
);
export type BaslangicDuzeni = z.output<typeof baslangicDuzeniSemasi>;
export type BaslangicDuzeniGirdisi = z.input<typeof baslangicDuzeniSemasi>;

// Başlangıç düzeninin kütüphaneye göre sorunları (yer: alan, sıra, alan adı). kip: temanın düzeni kayda
// başvuramaz ("yok"), sitenin düzeni adres adıyla başvurur ("adres-adi").
export const baslangicDuzeniSorunlari = (
  duzen: BaslangicDuzeni,
  kutuphane: BolumKutuphanesi,
  kip: Kip,
): DuzenSorunu[] =>
  duzenAlanlari.flatMap((alan) =>
    duzen[alan].flatMap((bolum, sira) => {
      const tarif = Object.hasOwn(kutuphane, bolum.tur) ? kutuphane[bolum.tur] : undefined;
      const sonuc = bolumuDenetle(
        kutuphane,
        alan,
        { ...bolum, gorunum: bolum.gorunum ?? tarif?.gorunumler[0].kod ?? "" },
        [alan, sira],
        kip,
      );
      return "sorunlar" in sonuc ? sonuc.sorunlar : [];
    }),
  );

// Sitenin başlangıç düzeninin adres adıyla başvurduğu kayıt türleri (kart 0114). Görsel başvurusu kart 0115'te.
export const baslangicBagTurleri = ["kategori", "marka", "etiket", "urun"] as const;
export type BaslangicBagTuru = (typeof baslangicBagTurleri)[number];

// Bir bölümün adres adı başvuruları: tür, adres adı ve değerlerdeki yolu ("kutular.0.kategori").
const adresAdiBaglari = (tarif: BolumTarifi, degerler: BolumDegerleri) => {
  const baglar = bolumBaglari(tarif, degerler);
  return baslangicBagTurleri.flatMap((tur) =>
    [...baglar[tur]].flatMap(([adresAdi, yollar]) => yollar.map((yol) => ({ tur, adresAdi, yol }))),
  );
};

// Sitenin başlangıç düzeninde başvurulan ama verilen kümelerde olmayan adres adları (site doğrulaması
// kümeleri başlangıç kataloğundan kurar). Düzen önce baslangicDuzeniSorunlari'ndan geçmiş olmalı.
export const baslangicDuzeniBulunamayanlar = (
  duzen: BaslangicDuzeni,
  kutuphane: BolumKutuphanesi,
  varolanlar: Readonly<Record<BaslangicBagTuru, ReadonlySet<string>>>,
): { yer: (string | number)[]; tur: BaslangicBagTuru; adresAdi: string }[] =>
  duzenAlanlari.flatMap((alan) =>
    duzen[alan].flatMap((bolum, sira) => {
      const tarif = Object.hasOwn(kutuphane, bolum.tur) ? kutuphane[bolum.tur] : undefined;
      if (tarif === undefined) return [];
      return adresAdiBaglari(tarif, bolum.degerler)
        .filter(({ tur, adresAdi }) => !varolanlar[tur].has(adresAdi))
        .map(({ tur, adresAdi, yol }) => ({
          yer: [alan, sira, "degerler", ...yol.split(".")],
          tur,
          adresAdi,
        }));
    }),
  );

// Kurulacak düzenin türlere göre başvurduğu adres adları.
export const duzenBaslangicBaglari = (
  duzen: Duzen,
  kutuphane: BolumKutuphanesi,
): Record<BaslangicBagTuru, Set<string>> => {
  const adlar = {
    kategori: new Set<string>(),
    marka: new Set<string>(),
    etiket: new Set<string>(),
    urun: new Set<string>(),
  };
  for (const alan of duzenAlanlari) {
    for (const bolum of duzen[alan]) {
      const tarif = Object.hasOwn(kutuphane, bolum.tur) ? kutuphane[bolum.tur] : undefined;
      if (tarif === undefined) continue;
      for (const { tur, adresAdi } of adresAdiBaglari(tarif, bolum.degerler))
        adlar[tur].add(adresAdi);
    }
  }
  return adlar;
};

const silinecek = Symbol("silinecek");

// Değerlerin içinde silinmek üzere işaretlenmiş liste öğelerini kaldırır.
const isaretlileriKaldir = (deger: unknown): unknown => {
  if (Array.isArray(deger)) {
    return deger.filter((oge) => oge !== silinecek).map(isaretlileriKaldir);
  }
  if (deger !== null && typeof deger === "object") {
    return Object.fromEntries(
      Object.entries(deger).map(([anahtar, alt]) => [anahtar, isaretlileriKaldir(alt)]),
    );
  }
  return deger;
};

// Yolun ucuna yazar. Yolun üstündeki bir öğe silinmek üzere işaretlenmişse (aynı öğenin başka bir bağı
// bulunamamıştı) yazmaz: öğe zaten düşecektir.
const yolaYaz = (kok: Record<string, unknown>, yol: string[], deger: unknown) => {
  let ust: unknown = kok;
  for (const parca of yol.slice(0, -1)) {
    ust = (ust as Record<string, unknown>)[parca];
    if (ust === null || typeof ust !== "object") return;
  }
  (ust as Record<string, unknown>)[yol[yol.length - 1] ?? ""] = deger;
};

const yoldakiDeger = (kok: Record<string, unknown>, yol: string[]): unknown => {
  let deger: unknown = kok;
  for (const parca of yol) {
    if (deger === null || typeof deger !== "object") return undefined;
    deger = (deger as Record<string, unknown>)[parca];
  }
  return deger;
};

const sayiMi = (parca: string | undefined) => parca !== undefined && /^\d+$/.test(parca);

// Kurulan başlangıç düzenindeki adres adlarını kimliğe çevirir (kart 0114). kimlikler: türe göre adres adından
// silinmemiş kaydın kimliğine. Bulunamayan adres adı (kurulumdan önce mağaza sahibi kaydı silmiş ya da adres
// adını değiştirmiş) kendi öğesiyle düşer: elle seçilen listede yalnız o ürün (seçim boş kalırsa onu taşıyan
// liste öğesi, örneğin sekme), bir listenin öğesindeyse o öğe, bölümün kendi alanındaysa bölüm. Önce bulunan
// bütün bağlar yazılır, sonra düşenler işaretlenir: aynı öğenin iki bağı bulunamasa da öğe bir kez düşer.
// Kalan bölüm kayıtlı düzenin kurallarından geçmezse (listenin en az sınırı, boş kalan elle seçim) o da düşer.
// bulunamayanlar hatanın kaydı içindir.
export const baslangicBaglariniCoz = (
  duzen: Duzen,
  kutuphane: BolumKutuphanesi,
  kimlikler: Readonly<Record<BaslangicBagTuru, ReadonlyMap<string, string>>>,
): { duzen: Duzen; bulunamayanlar: string[] } => {
  const bulunamayanlar: string[] = [];
  const cozulen = bosDuzen();
  for (const alan of duzenAlanlari) {
    for (const bolum of duzen[alan]) {
      const tarif = Object.hasOwn(kutuphane, bolum.tur) ? kutuphane[bolum.tur] : undefined;
      if (tarif === undefined) {
        cozulen[alan].push(bolum);
        continue;
      }
      const degerler = structuredClone(bolum.degerler);
      const eksikler: string[][] = [];
      for (const { tur, adresAdi, yol } of adresAdiBaglari(tarif, bolum.degerler)) {
        const kimlik = kimlikler[tur].get(adresAdi);
        if (kimlik !== undefined) yolaYaz(degerler, yol.split("."), kimlik);
        else {
          bulunamayanlar.push(`${alan} ${bolum.tur}: ${tur} ${adresAdi}`);
          eksikler.push(yol.split("."));
        }
      }
      // Bölümün kendi alanındaki bağ (liste ya da elle seçim değil) bulunamadı: bölüm düşer.
      if (
        eksikler.some((parcalar) => !sayiMi(parcalar[parcalar.length - 1]) && !sayiMi(parcalar[1]))
      ) {
        continue;
      }
      // Elle seçimden yalnız o ürün; listenin öğesindeki başka bağda o öğe.
      for (const parcalar of eksikler) {
        if (sayiMi(parcalar[parcalar.length - 1])) yolaYaz(degerler, parcalar, silinecek);
        else yolaYaz(degerler, parcalar.slice(0, 2), silinecek);
      }
      // Bir liste öğesinin içindeki elle seçim boş kaldıysa o öğe de düşer (örneğin sekmeli vitrinin sekmesi).
      for (const parcalar of eksikler) {
        if (!sayiMi(parcalar[parcalar.length - 1]) || !sayiMi(parcalar[1])) continue;
        const secim = yoldakiDeger(degerler, parcalar.slice(0, -1));
        if (Array.isArray(secim) && secim.every((oge) => oge === silinecek)) {
          yolaYaz(degerler, parcalar.slice(0, 2), silinecek);
        }
      }
      const aday = { ...bolum, degerler: isaretlileriKaldir(degerler) as BolumDegerleri };
      const sonuc = bolumuDenetle(kutuphane, alan, aday, [], kayitliKip);
      if ("sorunlar" in sonuc) {
        bulunamayanlar.push(`${alan} ${bolum.tur}: bölüm kurallara uymadığı için yazılmadı`);
        continue;
      }
      cozulen[alan].push({ ...aday, degerler: sonuc.degerler });
    }
  }
  return { duzen: cozulen, bulunamayanlar };
};

// Başlangıç düzeninden kurulacak düzen: her bölüme yeni bir kimlik verilir. Düzen önce
// baslangicDuzeniSorunlari ile denetlenmiş olmalı.
export const baslangictanDuzen = (
  duzen: BaslangicDuzeni,
  kutuphane: BolumKutuphanesi,
  yeniKimlik: () => string,
): Duzen =>
  Object.fromEntries(
    duzenAlanlari.map((alan) => [
      alan,
      duzen[alan].map(
        (bolum): BolumOrnegi => ({
          kimlik: yeniKimlik(),
          tur: bolum.tur,
          gorunum: bolum.gorunum ?? kutuphane[bolum.tur]?.gorunumler[0].kod ?? "",
          gizli: bolum.gizli,
          degerler: bolum.degerler,
        }),
      ),
    ]),
  ) as Duzen;

// Kayıtlı düzenin biçimi. Değerler ayrıca kütüphaneye göre denetlenir (duzenSorunlari).
const bolumOrnegiSemasi = z.strictObject({
  kimlik: z.uuid(),
  tur: z.string(),
  gorunum: z.string(),
  gizli: z.boolean(),
  degerler: z.record(z.string(), z.unknown()),
});
export const duzenSemasi = z.strictObject(
  Object.fromEntries(
    duzenAlanlari.map((alan) => [alan, z.array(bolumOrnegiSemasi).max(alandakiEnCokBolum)]),
  ) as Record<DuzenAlani, z.ZodArray<typeof bolumOrnegiSemasi>>,
);

// Bütün düzenin kütüphaneye göre sorunları: her bölümün türü, alanı, görünümü ve değerleri, kimliklerin
// tekilliği. Sorun yoksa değerleri şemadan geçmiş düzeni döndürür.
export const duzenSorunlari = (
  ham: unknown,
  kutuphane: BolumKutuphanesi,
): { duzen: Duzen } | { sorunlar: DuzenSorunu[] } => {
  const bicim = duzenSemasi.safeParse(ham);
  if (!bicim.success) return { sorunlar: sorunlariCevir([], bicim.error) };
  const sorunlar: DuzenSorunu[] = [];
  const kimlikler = new Set<string>();
  const duzen = bosDuzen();
  for (const alan of duzenAlanlari) {
    bicim.data[alan].forEach((bolum, sira) => {
      if (kimlikler.has(bolum.kimlik)) {
        sorunlar.push({ yer: [alan, sira, "kimlik"], kod: "kimlik-tekrar" });
      }
      kimlikler.add(bolum.kimlik);
      const sonuc = bolumuDenetle(kutuphane, alan, bolum, [alan, sira], kayitliKip);
      if ("sorunlar" in sonuc) sorunlar.push(...sonuc.sorunlar);
      else duzen[alan].push({ ...bolum, degerler: sonuc.degerler });
    });
  }
  return sorunlar.length > 0 ? { sorunlar } : { duzen };
};
