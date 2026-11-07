// Mağazanın logosu (kart 0073, karar 0059). Vitrin, panel ve e-posta logoyu tek yerden alır:
//
// 1. Mağaza sahibinin yüklediği logo: `logo` ayarındaki dosya, dosya deposunda (kart 0072).
// 2. Yüklenmemişse sitenin ilk logosu: site klasöründe marka/logo.<uzantı> (site-klasoru.ts).
// 3. O da yoksa logo yoktur, mağaza adı yazı olarak görünür.
//
// Yüklenen logo okunamazsa (dosya silinmiş, bozuk, veritabanı yok) ilk logoya düşülür, ilk logo
// okunamazsa logo yok sayılır; ikisinde de hata kaydedilir: logo görünüştür, sayfa ya da e-posta onun
// yüzünden düşmez.
//
// İçerik süreç başına bellekte tutulur: ilk logo yalnız yayınla değişir, yüklenen logonun içeriği
// kimliği ve özeti aynı kaldıkça değişmez. Logonun hâlâ geçerli olduğu her istekte veritabanından
// sorulur.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { siteAdresi } from "../../ayar-semasi/site-adresi.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import type { DegisikligiYapan } from "../../kayitlar/degisiklik-islemleri.ts";
import { dosyaTurleri } from "../../kayitlar/dosya.ts";
import { siteninVeritabani, type Veritabani } from "../../veritabani/baglanti.ts";
import {
  dosyaKaydet,
  dosyaKaydi,
  dosyaKlasoru,
  dosyaOku,
  dosyaSil,
  type KaydetmeSonucu,
} from "../dosya/servis.ts";
import { siteninServisi } from "./servis.ts";

export type Logo = {
  kaynak: "yuklenen" | "ilk";
  icerik: Buffer;
  mime: string;
  // İçeriğin özeti: tarayıcı önbelleği ve e-postadaki adres logonun değiştiğini bununla anlar.
  etiket: string;
};

const ozet = (icerik: Uint8Array): string => createHash("sha256").update(icerik).digest("hex");

type Secenekler = { site?: Site; klasor?: string };

// Bellekteki son yüklenen logo (anahtar: kimlik ve içerik özeti) ve ilk logolar (anahtar: yol).
let sonYuklenen: { anahtar: string; logo: Logo } | undefined;
const ilkLogolar = new Map<string, Logo>();

const yuklenenLogo = async (
  vt: Veritabani,
  site: Site,
  klasor?: string,
): Promise<Logo | undefined> => {
  try {
    const kimlik = await siteninServisi(site).tekOku(vt, "logo");
    if (kimlik === undefined) return undefined;
    const kayit = await dosyaKaydi(vt, kimlik);
    if (kayit === undefined)
      throw new Error(`Logo ayarındaki dosya yok ya da silinmiş: ${kimlik}.`);
    const anahtar = `${kimlik}:${kayit.icerikOzeti}`;
    if (sonYuklenen?.anahtar === anahtar) return sonYuklenen.logo;
    const dosya = await dosyaOku(vt, kimlik, klasor ?? dosyaKlasoru());
    if (dosya === undefined)
      throw new Error(`Logo ayarındaki dosya yok ya da silinmiş: ${kimlik}.`);
    const logo: Logo = {
      kaynak: "yuklenen",
      icerik: dosya.icerik,
      mime: dosya.mime,
      etiket: ozet(dosya.icerik),
    };
    sonYuklenen = { anahtar, logo };
    return logo;
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "magaza-logosu" });
    return undefined;
  }
};

const ilkLogo = async (site: Site): Promise<Logo | undefined> => {
  const marka = site.markaLogosu;
  if (marka === undefined) return undefined;
  const bilinen = ilkLogolar.get(marka.yol);
  if (bilinen !== undefined) return bilinen;
  try {
    const icerik = await readFile(marka.yol);
    const logo: Logo = {
      kaynak: "ilk",
      icerik,
      mime: dosyaTurleri[marka.tur].mime,
      etiket: ozet(icerik),
    };
    ilkLogolar.set(marka.yol, logo);
    return logo;
  } catch (hata) {
    hatayiKaydet(hata, { kaynak: "magaza-logosu" });
    return undefined;
  }
};

export const magazaLogosu = async (
  vt: Veritabani = siteninVeritabani(),
  { site = calisanSite(), klasor }: Secenekler = {},
): Promise<Logo | undefined> => (await yuklenenLogo(vt, site, klasor)) ?? (await ilkLogo(site));

// Logonun herkese açık adresi (e-posta gibi sitenin dışında görünen yerler için). Sitenin adresi
// istekten değil kimlikten ya da kutunun ortamından gelir (siteAdresi). Adres logonun özetini taşır:
// logo değişince e-posta istemcisinin önbelleği eskisini göstermez. Adres ya da logo yoksa undefined.
export const logoUcuYolu = "/kapi/herkese-acik/logo";
export const logonunAdresi = (site: Site, logo: Logo | undefined): string | undefined => {
  if (logo === undefined) return undefined;
  const adres = siteAdresi(site.kimlik);
  return adres === undefined ? undefined : `${adres}${logoUcuYolu}?s=${logo.etiket.slice(0, 16)}`;
};

// Yeni logoyu kaydeder (kart 0072'deki güvenli yolla) ve ayarı ona çevirir; ayar değişikliği
// değişiklik kaydına girer. Ayar yazılamazsa yeni dosya silinmiş olarak işaretlenir. Eski yüklenen
// logo artık kullanılmadığı için silinmiş olarak işaretlenir; dosyası yerinde kalır (kart 0093).
export const logoyuDegistir = async (
  vt: Veritabani,
  kim: DegisikligiYapan,
  icerik: Uint8Array,
  { site = calisanSite(), klasor }: Secenekler = {},
): Promise<KaydetmeSonucu> => {
  const servis = siteninServisi(site);
  const eski = await servis.tekOku(vt, "logo");
  const sonuc = await dosyaKaydet(vt, icerik, klasor ?? dosyaKlasoru());
  if (!sonuc.tamam) return sonuc;
  try {
    await servis.degistir(vt, kim, { logo: sonuc.dosya.kimlik }, { kendiIslevi: true });
  } catch (hata) {
    await dosyaSil(vt, sonuc.dosya.kimlik);
    throw hata;
  }
  if (eski !== undefined && eski !== sonuc.dosya.kimlik) await dosyaSil(vt, eski);
  return sonuc;
};

// Yüklenen logoyu kaldırır: sitenin ilk logosu, o da yoksa mağaza adı görünür.
export const logoyuKaldir = async (
  vt: Veritabani,
  kim: DegisikligiYapan,
  { site = calisanSite() }: Pick<Secenekler, "site"> = {},
): Promise<void> => {
  const servis = siteninServisi(site);
  const eski = await servis.tekOku(vt, "logo");
  if (eski === undefined) return;
  await servis.degistir(vt, kim, { logo: undefined }, { kendiIslevi: true });
  await dosyaSil(vt, eski);
};
