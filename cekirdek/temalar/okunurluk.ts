// Renklerin okunurluğu (kart 0105, .claude/rules/erisilebilirlik.md). Temanın kendi değerleri, mağaza
// sahibinin seçtiği renk ve panelin siteden aldığı ana renk aynı ölçüden geçer: tasarım değerlerindeki
// yazı çiftleri en az 4,5:1, işaret çiftleri en az 3:1 (WCAG 2.2 AA).
import {
  isaretCiftleri,
  type RenkAdi,
  yaziCiftleri,
} from "../../bilesenler/tasarim-degerleri/degerler.ts";
import { kontrastOrani, okunurTon } from "../../bilesenler/tasarim-degerleri/kontrast.ts";

export const kontrastEsikleri = { yazi: 4.5, isaret: 3 } as const;

const ciftler: readonly { on: RenkAdi; arka: RenkAdi; esik: number }[] = [
  ...yaziCiftleri.map(([on, arka]) => ({ on, arka, esik: kontrastEsikleri.yazi })),
  ...isaretCiftleri.map(([on, arka]) => ({ on, arka, esik: kontrastEsikleri.isaret })),
];

// En az bir çiftte bulunan, yani okunurluğu ölçülen renkler.
export const olculenRenkler: ReadonlySet<RenkAdi> = new Set(
  ciftler.flatMap(({ on, arka }) => [on, arka]),
);

export type OkunmayanCift = { on: RenkAdi; arka: RenkAdi; oran: number; esik: number };

// Ölçüden geçmeyen çiftler. ilgili verilirse yalnız o rengin bulunduğu çiftler ölçülür.
export const okunmayanCiftler = (
  renkler: Readonly<Record<RenkAdi, string>>,
  ilgili?: RenkAdi,
): OkunmayanCift[] =>
  ciftler
    .filter(({ on, arka }) => ilgili === undefined || on === ilgili || arka === ilgili)
    .map((cift) => ({ ...cift, oran: kontrastOrani(renkler[cift.on], renkler[cift.arka]) }))
    .filter(({ oran, esik }) => oran < esik);

// Rengin, verilen renklerin arasında ad yerine konunca bütün çiftlerinde okunur olan en yakın tonu.
// Renk zaten okunursa kendisi döner; hiçbir tonu okunur değilse undefined.
export const okunurRenk = (
  renkler: Readonly<Record<RenkAdi, string>>,
  ad: RenkAdi,
  renk: string,
): string | undefined =>
  okunurTon(renk, (aday) => okunmayanCiftler({ ...renkler, [ad]: aday }, ad).length === 0);
