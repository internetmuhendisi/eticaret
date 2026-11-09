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
  type BolumDegerleri,
  type BolumTarifi,
  bolumAlanHatalari,
  bolumDegerSemasi,
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
      if (alan.tur !== "liste") continue;
      if (alan.enAz < 0 || alan.enCok < Math.max(1, alan.enAz)) {
        sorunlar.push(`${yer}: ${kod}: listenin sınırları yanlış`);
      }
      for (const altKod of Object.keys(alan.alanlar)) {
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
  kip: { baslangic: boolean },
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
// Görünüm verilmezse ilk görünüm, görünürlük verilmezse görünür. Kayda başvuran alanlar boş kalır.
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

// Başlangıç düzeninin kütüphaneye göre sorunları (yer: alan, sıra, alan adı).
export const baslangicDuzeniSorunlari = (
  duzen: BaslangicDuzeni,
  kutuphane: BolumKutuphanesi,
): DuzenSorunu[] =>
  duzenAlanlari.flatMap((alan) =>
    duzen[alan].flatMap((bolum, sira) => {
      const tarif = Object.hasOwn(kutuphane, bolum.tur) ? kutuphane[bolum.tur] : undefined;
      const sonuc = bolumuDenetle(
        kutuphane,
        alan,
        { ...bolum, gorunum: bolum.gorunum ?? tarif?.gorunumler[0].kod ?? "" },
        [alan, sira],
        { baslangic: true },
      );
      return "sorunlar" in sonuc ? sonuc.sorunlar : [];
    }),
  );

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
      const sonuc = bolumuDenetle(kutuphane, alan, bolum, [alan, sira], { baslangic: false });
      if ("sorunlar" in sonuc) sorunlar.push(...sonuc.sorunlar);
      else duzen[alan].push({ ...bolum, degerler: sonuc.degerler });
    });
  }
  return sorunlar.length > 0 ? { sorunlar } : { duzen };
};
