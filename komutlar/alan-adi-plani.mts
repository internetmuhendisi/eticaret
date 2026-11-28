// Altyapının alan adındaki kayıtların planı (kart 0344, kararlar 0032 ve 0202). Cloudflare'e dokunmaz:
// istenen kayıtlarla var olanları karşılaştırıp yapılacak işleri ya da durma nedenlerini döndürür.
// pnpm alan-adi ve pnpm alan-adi-denemesi bu planı uygular.
//
// - Deneme adresleri tek joker kayıtla karşılanır (karar 0032).
// - Asıl adresi alt adres olan her sitenin kendi A ve AAAA kaydı vardır, vekil kapalıdır (karar 0202).
// - Komut kendi kayıtlarını açıklamalarından tanır. Aynı adda açıklaması başka olan kayıt, aynı adda başka
//   türde kayıt ya da aynı türde birden çok kayıt varsa elle bakılır, hiçbir şey yapılmaz.
// - Açıklaması komutunkiyle başlayıp artık istenmeyen kayıt silinir; başka kayda dokunulmaz.

import { alanAdiKayitlari, asilAdresAdlari, asilAdresiCoz } from "./on-kapi.mts";

export type KayitIstegi = {
  type: "A" | "AAAA";
  name: string;
  content: string;
  proxied: false;
  comment: string;
};

export type CloudflareKaydi = {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  comment?: string | null;
};

export type AlanAdiIsi =
  | { tur: "ekle"; kayit: KayitIstegi; metin: string }
  | { tur: "degistir"; id: string; kayit: KayitIstegi; metin: string }
  | { tur: "sil"; id: string; metin: string };

export const denemeAciklamasi = "altyapi: deneme adresleri (karar 0032)";
export const siteAciklamaOneki = "altyapi: site ";
export const siteAciklamasi = (kodAdi: string): string =>
  `${siteAciklamaOneki}${kodAdi} (karar 0202)`;

// Joker deneme kayıtları ve alt adresi olan her sitenin kayıtları. Kendi alan adı mağazanın alan adındadır,
// buraya girmez (karar 0202).
export const istenenKayitlar = (
  ipv4: string,
  ipv6: string,
  siteler: { kodAdi: string; adresler: { canli?: string | undefined } }[],
): KayitIstegi[] => [
  ...alanAdiKayitlari(ipv4, ipv6).map(
    (k): KayitIstegi => ({ ...(k as Omit<KayitIstegi, "comment">), comment: denemeAciklamasi }),
  ),
  ...siteler.flatMap(({ kodAdi, adresler }) => {
    if (adresler.canli === undefined) return [];
    const asil = asilAdresiCoz(adresler.canli);
    if ("hata" in asil || asil.tur !== "alt") return [];
    return [
      { type: "A", name: asil.ad, content: ipv4, proxied: false, comment: siteAciklamasi(kodAdi) },
      {
        type: "AAAA",
        name: asil.ad,
        content: ipv6,
        proxied: false,
        comment: siteAciklamasi(kodAdi),
      },
    ] satisfies KayitIstegi[];
  }),
];

export const alanAdiPlani = (
  istenenler: KayitIstegi[],
  mevcut: CloudflareKaydi[],
  sahipOneki: string,
): { isler: AlanAdiIsi[]; hatalar: string[] } => {
  const isler: AlanAdiIsi[] = [];
  const hatalar: string[] = [];
  const tekil = [...new Map(mevcut.map((k) => [k.id, k])).values()];
  for (const ad of new Set(istenenler.map((k) => k.name))) {
    const turler = new Set(istenenler.filter((k) => k.name === ad).map((k) => k.type as string));
    const yabanci = tekil.filter((k) => k.name === ad && !turler.has(k.type));
    if (yabanci.length > 0) {
      hatalar.push(
        `Aynı adda başka kayıt var, elle bakılmalı: ${yabanci.map((k) => `${k.type} ${k.name} ${k.content}`).join(", ")}`,
      );
    }
  }
  for (const istenen of istenenler) {
    const ayniTur = tekil.filter((k) => k.type === istenen.type && k.name === istenen.name);
    if (ayniTur.length > 1) {
      hatalar.push(
        `${istenen.type} ${istenen.name} için ${ayniTur.length} kayıt var, elle bakılmalı.`,
      );
      continue;
    }
    const var_ = ayniTur[0];
    if (!var_) {
      isler.push({
        tur: "ekle",
        kayit: istenen,
        metin: `eklenecek   ${istenen.type} ${istenen.name} → ${istenen.content} (vekil kapalı)`,
      });
      continue;
    }
    if ((var_.comment ?? "") !== istenen.comment) {
      hatalar.push(
        `${istenen.type} ${istenen.name} kaydı başka bir açıklama taşıyor ("${var_.comment ?? ""}"), elle bakılmalı.`,
      );
      continue;
    }
    if (var_.content !== istenen.content || var_.proxied !== istenen.proxied) {
      isler.push({
        tur: "degistir",
        id: var_.id,
        kayit: istenen,
        metin: `değişecek   ${istenen.type} ${istenen.name}: ${var_.content}${var_.proxied ? " (vekil açık)" : ""} → ${istenen.content} (vekil kapalı)`,
      });
    }
  }
  for (const kayit of tekil) {
    const istenir = istenenler.some((i) => i.type === kayit.type && i.name === kayit.name);
    if (!istenir && (kayit.comment ?? "").startsWith(sahipOneki)) {
      isler.push({
        tur: "sil",
        id: kayit.id,
        metin: `silinecek   ${kayit.type} ${kayit.name} → ${kayit.content} (${kayit.comment ?? ""})`,
      });
    }
  }
  return { isler, hatalar };
};

// Kendi alan adı olan sitelerde mağaza sahibinin kendi sağlayıcısında açacağı kayıtlar: www'suz ve www'lu ad için
// A ve AAAA, vekilsiz (karar 0202). Komut bunları yalnız yazar.
export const kendiAlanAdiKayitlari = (
  ipv4: string,
  ipv6: string,
  siteler: { kodAdi: string; adresler: { canli?: string | undefined } }[],
): { kodAdi: string; type: "A" | "AAAA"; name: string; content: string }[] =>
  siteler.flatMap(({ kodAdi, adresler }) => {
    if (adresler.canli === undefined) return [];
    const asil = asilAdresiCoz(adresler.canli);
    if ("hata" in asil || asil.tur !== "kendi") return [];
    return asilAdresAdlari(asil).flatMap((name) => [
      { kodAdi, type: "A" as const, name, content: ipv4 },
      { kodAdi, type: "AAAA" as const, name, content: ipv6 },
    ]);
  });
