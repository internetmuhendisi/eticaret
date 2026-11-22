// Kapıdaki her uç bu tanımla yazılır (karar 0024, .claude/rules/sunucu-arayuzu.md).
// Giriş, Zod şeması, izin beyanı ve istek sınırı zorunludur; biri eksikse tür kontrolü
// geçmez. Uç yalnız yönlendirir: sınırı sayar, girdiyi doğrular, işi servise verir,
// sonucu zarfa koyar. İzin beyanı burada yazılır, kapı her istekte kontrol eder (karar 0040).
import type { z } from "zod";
import { calisanSite } from "../ayar-semasi/calisan-site.ts";
import { hatayiKaydet } from "../izleme/hata-katmani.ts";
import { dosyaSinirlari } from "../kayitlar/dosya.ts";
import type { GirisIzni, HerkeseAcik, IzinAdi } from "../kayitlar/izinler.ts";
import type { IstekSiniri, Kapi } from "../kayitlar/kapi.ts";
import { istegiSay, istemciAdresi, sayacAdresi } from "./istek-siniri.ts";
import { erisimiDenetle, type UcErisimi } from "./izin-kontrolu.ts";
import { sahteIstekMi } from "./sahte-istek.ts";
import {
  BilinenHata,
  basariliYanit,
  DosyaYaniti,
  dosyaYanitla,
  hataliYanit,
  Yonlendirme,
  yonlendir,
} from "./zarf.ts";

// Herkese açık girişteki uç yalnız herkese açık beyanını, öteki girişlerdeki uç yalnız o girişin
// iznini alır.
export type UcIzni<Giris extends Kapi> = Giris extends "herkese-acik"
  ? HerkeseAcik
  : GirisIzni<Giris>;

// Tema demosunda (site ayarı temaDemosu, kart 0116) ziyaretçi yalnız gezer: müşteri girişindeki her uç kapalıdır,
// herkese açık uç açık mı kapalı mı olduğunu beyan eder (tür kontrolü ister). Hesap, sipariş, yorum, bildirim ve
// e-posta doğuran uç kapalıdır; vitrinin okuduğu ve panelin kullandığı uç açıktır.
export type TemaDemosunda = "acik" | "kapali";
type DemoBeyani<Giris extends Kapi> = Giris extends "herkese-acik"
  ? { temaDemosunda: TemaDemosunda }
  : { temaDemosunda?: never };

// Dış kuruluşun kapıya dönüşü (kart 0215): ödeme kuruluşunun sunucudan sunucuya bildirimi ya da müşterinin tarayıcısıyla
// geri gönderdiği form. İstek başka bir siteden gelir: sahte istek denetimi uygulanmaz, gövde JSON ya da form olabilir.
// Yalnız herkese açık girişte ve "bildirim" sınırıyla yazılır; uç çerez okumaz, doğruluğu imzadan ya da kuruluşa
// yapılan sorgudan kurar.
type DisKurulusBeyani<Giris extends Kapi> = Giris extends "herkese-acik"
  ? { disKurulus?: true }
  : { disKurulus?: never };

export type UcTanimi<Giris extends Kapi, Sema extends z.ZodType, Veri> = DemoBeyani<Giris> &
  DisKurulusBeyani<Giris> & {
    // Dosya yükleyen uç (kart 0094, karar 0165): gövde JSON değil dosyanın kendisidir (ham bayt). Girdi
    // `{ dosya: Uint8Array }` olur. Dosya sınırını (dosyaSinirlari.enCokBayt) aşan gövde okunmadan ya da okunurken
    // kesilerek reddedilir.
    govde?: "dosya";
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
  readonly tanim: {
    giris: Kapi;
    izin: HerkeseAcik | IzinAdi;
    sinir: IstekSiniri;
    temaDemosunda: TemaDemosunda;
    // Dosya gövdesi alan uç (kart 0094): ön kapının yükleme sınırı adresine uygulanır (testte denetlenir).
    dosyaGovdesi?: boolean;
  };
};

// Ucun tema demosundaki durumu: müşteri girişi kapalı, yönetici ve sahip girişi açık, herkese açık uç beyanıyla.
const demodakiDurumu = (giris: Kapi, beyan: TemaDemosunda | undefined): TemaDemosunda =>
  giris === "musteri" ? "kapali" : (beyan ?? "acik");

const govdesizYontemler = new Set(["GET", "HEAD", "DELETE"]);

// Gövdesiz isteklerde girdi adres parametreleridir, ötekilerde JSON gövdedir. Dış kuruluşun dönüşünde gövde form da
// olabilir. Gövde okunamazsa undefined döner.
const girdiyiOku = async (istek: Request, formOlabilir: boolean): Promise<unknown> => {
  if (govdesizYontemler.has(istek.method)) {
    return Object.fromEntries(new URL(istek.url).searchParams);
  }
  const tur = istek.headers.get("content-type") ?? "";
  if (formOlabilir && tur.startsWith("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(await istek.text()));
  }
  const metin = await istek.text();
  if (metin === "") return {};
  try {
    return JSON.parse(metin);
  } catch {
    return undefined;
  }
};

// Dosya gövdesi: bildirilen uzunluk sınırı aşıyorsa hiç okunmaz; bildirilmemişse okunurken sınır aşılınca okuma
// kesilir. Böylece sınırdan büyük gövde belleğe alınmaz.
const dosyayiOku = async (istek: Request): Promise<Uint8Array | "cok-buyuk"> => {
  const uzunluk = Number(istek.headers.get("content-length") ?? Number.NaN);
  if (Number.isFinite(uzunluk) && uzunluk > dosyaSinirlari.enCokBayt) return "cok-buyuk";
  if (istek.body === null) return new Uint8Array();
  const parcalar: Uint8Array[] = [];
  let toplam = 0;
  const okuyucu = istek.body.getReader();
  for (;;) {
    const { done, value } = await okuyucu.read();
    if (done) break;
    toplam += value.length;
    if (toplam > dosyaSinirlari.enCokBayt) {
      await okuyucu.cancel();
      return "cok-buyuk";
    }
    parcalar.push(value);
  }
  return Buffer.concat(parcalar);
};

export const ucTanimla = <Giris extends Kapi, Sema extends z.ZodType, Veri>(
  tanim: UcTanimi<Giris, Sema, Veri>,
): Uc => {
  if (tanim.disKurulus === true && tanim.sinir !== "bildirim") {
    throw new Error("Dış kuruluşun dönüşü yalnız bildirim sınırıyla tanımlanır.");
  }
  const temaDemosunda = demodakiDurumu(tanim.giris, tanim.temaDemosunda);
  const yanitla = async (istek: Request, yanit: YanitYazici): Promise<Response> => {
    try {
      // Tema demosunda kapalı uç yokmuş gibi bulunamadı verir (kapalı eklentinin ucu gibi, kart 0144); sınırı
      // saymaz, girdiye bakmaz.
      if (temaDemosunda === "kapali" && calisanSite().ayarlar.temaDemosu) {
        return hataliYanit("bulunamadi");
      }

      // Sınırdan önce: başka bir sayfa ziyaretçinin tarayıcısından istek atarak onun sınırını
      // dolduramasın.
      if (!tanim.disKurulus && sahteIstekMi(istek)) return hataliYanit("yetki");

      const { pathname } = new URL(istek.url);
      const sinir = istegiSay(
        `${istek.method} ${pathname} ${sayacAdresi(istemciAdresi(istek))}`,
        tanim.sinir,
      );
      if (!sinir.izinli) {
        return hataliYanit("istek-siniri", undefined, {
          "Retry-After": String(sinir.bekleSaniye),
        });
      }

      // Doğrulamadan önce: yetkisiz kişi ucun girdi yapısını öğrenemesin.
      const erisim = await erisimiDenetle(tanim.giris, tanim.izin, istek, yanit.cerezYaz);

      let girdi: unknown;
      if (tanim.govde === "dosya") {
        const dosya = await dosyayiOku(istek);
        if (dosya === "cok-buyuk") {
          return hataliYanit("dogrulama", [{ alan: "dosya", kod: "cok-buyuk" }]);
        }
        girdi = { dosya };
      } else {
        girdi = await girdiyiOku(istek, tanim.disKurulus === true);
      }
      const sonuc = tanim.sema.safeParse(girdi);
      if (!sonuc.success) {
        return hataliYanit(
          "dogrulama",
          sonuc.error.issues.map(({ path, code }) => ({
            alan: path.map(String).join("."),
            kod: code,
          })),
        );
      }

      const veri = await tanim.isle(sonuc.data, istek, yanit, erisim as UcErisimi<Giris>);
      if (veri instanceof Yonlendirme) return yonlendir(veri);
      return veri instanceof DosyaYaniti ? dosyaYanitla(veri, istek) : basariliYanit(veri);
    } catch (hata) {
      if (hata instanceof BilinenHata) return hataliYanit(hata.kod, hata.ayrinti, hata.basliklar);
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
    tanim: {
      giris: tanim.giris,
      izin: tanim.izin,
      sinir: tanim.sinir,
      temaDemosunda,
      dosyaGovdesi: tanim.govde === "dosya",
    },
  });
};
