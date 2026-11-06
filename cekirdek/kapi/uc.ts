// Kapıdaki her uç bu tanımla yazılır (karar 0024, .claude/rules/sunucu-arayuzu.md).
// Giriş, Zod şeması, izin beyanı ve istek sınırı zorunludur; biri eksikse tür kontrolü
// geçmez. Uç yalnız yönlendirir: sınırı sayar, girdiyi doğrular, işi servise verir,
// sonucu zarfa koyar. İzin beyanı burada yazılır, kapı her istekte kontrol eder (karar 0040).
import type { z } from "zod";
import { hatayiKaydet } from "../izleme/hata-katmani.ts";
import type { GirisIzni, HerkeseAcik, IzinAdi } from "../kayitlar/izinler.ts";
import type { IstekSiniri, Kapi } from "../kayitlar/kapi.ts";
import { istegiSay, istemciAdresi } from "./istek-siniri.ts";
import { erisimiDenetle, type UcErisimi } from "./izin-kontrolu.ts";
import { sahteIstekMi } from "./sahte-istek.ts";
import { BilinenHata, basariliYanit, hataliYanit } from "./zarf.ts";

// Herkese açık girişteki uç yalnız herkese açık beyanını, öteki girişlerdeki uç yalnız o girişin
// iznini alır.
export type UcIzni<Giris extends Kapi> = Giris extends "herkese-acik"
  ? HerkeseAcik
  : GirisIzni<Giris>;

export type UcTanimi<Giris extends Kapi, Sema extends z.ZodType, Veri> = {
  giris: Giris;
  sema: Sema;
  izin: UcIzni<Giris>;
  sinir: IstekSiniri;
  isle: (
    girdi: z.output<Sema>,
    istek: Request,
    yanit: YanitYazici,
    erisim: UcErisimi<Giris>,
  ) => Promise<Veri>;
};

// Servisin yanıta eklediği çerezler (oturum-cerezi.ts). Hatalı yanıtta da gider: geçersiz oturumun
// çerezleri böyle silinir.
export type YanitYazici = { cerezYaz: (...cerezler: string[]) => void };

export type Uc = ((istek: Request) => Promise<Response>) & {
  readonly tanim: { giris: Kapi; izin: HerkeseAcik | IzinAdi; sinir: IstekSiniri };
};

const govdesizYontemler = new Set(["GET", "HEAD", "DELETE"]);

// Gövdesiz isteklerde girdi adres parametreleridir, ötekilerde JSON gövdedir.
// Gövde JSON değilse undefined döner.
const girdiyiOku = async (istek: Request): Promise<unknown> => {
  if (govdesizYontemler.has(istek.method)) {
    return Object.fromEntries(new URL(istek.url).searchParams);
  }
  const metin = await istek.text();
  if (metin === "") return {};
  try {
    return JSON.parse(metin);
  } catch {
    return undefined;
  }
};

export const ucTanimla = <Giris extends Kapi, Sema extends z.ZodType, Veri>(
  tanim: UcTanimi<Giris, Sema, Veri>,
): Uc => {
  const yanitla = async (istek: Request, yanit: YanitYazici): Promise<Response> => {
    try {
      // Sınırdan önce: başka bir sayfa ziyaretçinin tarayıcısından istek atarak onun sınırını
      // dolduramasın.
      if (sahteIstekMi(istek)) return hataliYanit("yetki");

      const { pathname } = new URL(istek.url);
      const sinir = istegiSay(`${istek.method} ${pathname} ${istemciAdresi(istek)}`, tanim.sinir);
      if (!sinir.izinli) {
        return hataliYanit("istek-siniri", undefined, {
          "Retry-After": String(sinir.bekleSaniye),
        });
      }

      // Doğrulamadan önce: yetkisiz kişi ucun girdi yapısını öğrenemesin.
      const erisim = await erisimiDenetle(tanim.giris, tanim.izin, istek, yanit.cerezYaz);

      const sonuc = tanim.sema.safeParse(await girdiyiOku(istek));
      if (!sonuc.success) {
        return hataliYanit(
          "dogrulama",
          sonuc.error.issues.map(({ path, code }) => ({
            alan: path.map(String).join("."),
            kod: code,
          })),
        );
      }

      return basariliYanit(await tanim.isle(sonuc.data, istek, yanit, erisim as UcErisimi<Giris>));
    } catch (hata) {
      if (hata instanceof BilinenHata) return hataliYanit(hata.kod, hata.ayrinti);
      // Beklenmeyen hata ortak hata katmanına gider, istemciye yalnız kodu döner.
      hatayiKaydet(hata, { yontem: istek.method, yol: new URL(istek.url).pathname });
      return hataliYanit("sunucu-hatasi");
    }
  };
  const isleyici = async (istek: Request): Promise<Response> => {
    const cerezler: string[] = [];
    const yanit = await yanitla(istek, { cerezYaz: (...yeni) => cerezler.push(...yeni) });
    for (const cerez of cerezler) yanit.headers.append("Set-Cookie", cerez);
    return yanit;
  };
  return Object.assign(isleyici, {
    tanim: { giris: tanim.giris, izin: tanim.izin, sinir: tanim.sinir },
  });
};
