// Hazır temaların kaydı ve sitenin kullanabileceği temalar (kart 0105).
//
// Hazır temalar çekirdektedir ve bütün sitelerde ortaktır. Bir müşteriye özel tema o sitenin klasöründe
// durur (siteler/<kod>/tema/<tema kodu>.json) ve yalnız o sitede görünür. Sitenin kullanabileceği temalar
// altyapı sahibinin "temalar" ayarıdır (ayarlar.json); verilmezse bütün hazır temalardır, listenin ilki
// sitenin başlangıç temasıdır. Listeyi site klasörü doğrulaması çözer (site-klasoru.ts) ve her temayı
// şemadan geçirir: bozuk tema kullanan site açılmaz.
import type { z } from "zod";
import type { MetinAnahtari } from "../metinler/metin.ts";
import { canliCarsi } from "./hazir/canli-carsi.ts";
import { keskinCizgi } from "./hazir/keskin-cizgi.ts";
import { yumusakMevsim } from "./hazir/yumusak-mevsim.ts";
import {
  type TemaKutuphanesi,
  type TemaTanimi,
  type TemaTanimiGirdisi,
  temaTanimiSemasi,
} from "./sema.ts";

export const temaKaynaklari = ["cekirdek", "site"] as const;
export type TemaKaynagi = (typeof temaKaynaklari)[number];

// ad: hazır temanın adı metin dosyasındadır, siteye özel temanın adı kendi dosyasında.
export type Tema = {
  kod: string;
  kaynak: TemaKaynagi;
  ad: { anahtar: MetinAnahtari } | { metin: string };
  tanim: TemaTanimi;
};

export const hazirTemalar: Readonly<
  Record<string, { ad: MetinAnahtari; tanim: TemaTanimiGirdisi }>
> = {
  "canli-carsi": { ad: "tema.ad.canliCarsi", tanim: canliCarsi },
  "yumusak-mevsim": { ad: "tema.ad.yumusakMevsim", tanim: yumusakMevsim },
  "keskin-cizgi": { ad: "tema.ad.keskinCizgi", tanim: keskinCizgi },
};

export const hazirTemaKodlari = (): string[] => Object.keys(hazirTemalar);

const sorunlariYaz = (yer: string, sorunlar: z.core.$ZodIssue[]): string[] =>
  sorunlar.map(
    (sorun) =>
      `${yer}: ${sorun.path.length > 0 ? sorun.path.join(".") : "(tamamı)"}: ${sorun.message}`,
  );

// Hazır temayı şemadan geçirir. Kütüphane testlerde değiştirilebilir.
export const hazirTemayiOku = (
  kod: string,
  kayit: Readonly<Record<string, { ad: MetinAnahtari; tanim: unknown }>> = hazirTemalar,
  kutuphane?: TemaKutuphanesi,
): { gecerli: true; tema: Tema } | { gecerli: false; hatalar: string[] } => {
  const hazir = Object.hasOwn(kayit, kod) ? kayit[kod] : undefined;
  if (hazir === undefined) return { gecerli: false, hatalar: [`${kod}: böyle bir tema yok.`] };
  const sonuc = temaTanimiSemasi(kutuphane).safeParse(hazir.tanim);
  if (!sonuc.success) {
    return {
      gecerli: false,
      hatalar: sorunlariYaz(`cekirdek/temalar/hazir (${kod})`, sonuc.error.issues),
    };
  }
  return {
    gecerli: true,
    tema: { kod, kaynak: "cekirdek", ad: { anahtar: hazir.ad }, tanim: sonuc.data },
  };
};
