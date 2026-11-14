// Renklerin okunurluğu (kart 0105, .claude/rules/erisilebilirlik.md). Temanın kendi değerleri, mağaza
// sahibinin seçtiği renk ve panelin siteden aldığı ana renk aynı ölçüden geçer: tasarım değerlerindeki
// yazı çiftleri en az 4,5:1, işaret çiftleri en az 3:1 (WCAG 2.2 AA).
//
// Bağlı renkler (kart 0124) çözülerek ölçülür: ana renge bağlı vurgu yazısı, mağaza sahibinin seçtiği ana
// renkle zeminde de okunur olmalıdır. Bir rengin çiftleri, ona bağlı renklerin çiftlerini de kapsar.
import {
  type BagliRenkAdi,
  bagKaynagi,
  bagliRenkAdlari,
  isaretCiftleri,
  type RenkAdi,
  type RenkBagi,
  renkleriCoz,
  type TumRenkAdi,
  yaziCiftleri,
} from "../../bilesenler/tasarim-degerleri/degerler.ts";
import { kontrastOrani, okunurTon } from "../../bilesenler/tasarim-degerleri/kontrast.ts";

export const kontrastEsikleri = { yazi: 4.5, isaret: 3 } as const;

const ciftler: readonly { on: TumRenkAdi; arka: TumRenkAdi; esik: number }[] = [
  ...yaziCiftleri.map(([on, arka]) => ({ on, arka, esik: kontrastEsikleri.yazi })),
  ...isaretCiftleri.map(([on, arka]) => ({ on, arka, esik: kontrastEsikleri.isaret })),
];

// En az bir çiftte bulunan, yani okunurluğu ölçülen renkler.
export const olculenRenkler: ReadonlySet<TumRenkAdi> = new Set(
  ciftler.flatMap(({ on, arka }) => [on, arka]),
);

export type OkunmayanCift = { on: TumRenkAdi; arka: TumRenkAdi; oran: number; esik: number };

// Ölçülen renkler: bir temanın (açık ya da koyu) renkleri ve temanın bağları.
export type RenkOlcusu = {
  renkler: Readonly<Record<RenkAdi, string>>;
  baglar: Readonly<Record<BagliRenkAdi, RenkBagi>>;
  mod: "acik" | "koyu";
};

// Rengin kendisi ve bu temada ona bağlı renkler.
const rengeBagliOlanlar = (olcu: RenkOlcusu, ad: RenkAdi): ReadonlySet<TumRenkAdi> =>
  new Set<TumRenkAdi>([
    ad,
    ...bagliRenkAdlari.filter((bagli) => bagKaynagi(olcu.baglar[bagli], olcu.mod) === ad),
  ]);

// Ölçüden geçmeyen çiftler. ilgili verilirse yalnız o rengin (ve ona bağlı renklerin) bulunduğu çiftler
// ölçülür.
export const okunmayanCiftler = (olcu: RenkOlcusu, ilgili?: RenkAdi): OkunmayanCift[] => {
  const renkler = renkleriCoz(olcu.renkler, olcu.baglar, olcu.mod);
  const ilgililer = ilgili === undefined ? undefined : rengeBagliOlanlar(olcu, ilgili);
  return ciftler
    .filter(({ on, arka }) => ilgililer === undefined || ilgililer.has(on) || ilgililer.has(arka))
    .map((cift) => ({ ...cift, oran: kontrastOrani(renkler[cift.on], renkler[cift.arka]) }))
    .filter(({ oran, esik }) => oran < esik);
};

// Rengin, verilen renklerin arasında ad yerine konunca bütün çiftlerinde okunur olan en yakın tonu.
// Renk zaten okunursa kendisi döner; hiçbir tonu okunur değilse undefined.
export const okunurRenk = (olcu: RenkOlcusu, ad: RenkAdi, renk: string): string | undefined =>
  okunurTon(
    renk,
    (aday) =>
      okunmayanCiftler({ ...olcu, renkler: { ...olcu.renkler, [ad]: aday } }, ad).length === 0,
  );
