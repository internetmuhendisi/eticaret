// Gerçek veritabanı testleri için geçici site veritabanı. Yerel veritabanı kutusu açık olmalı
// (pnpm veritabani-baslat). Değişiklikler uygulanmış olarak açılır, sil() veritabanını ve
// kullanıcısını kaldırır.
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { veritabaniVeKullaniciAc } from "../../../komutlar/site-veritabani.mts";
import { baglan, siteVeritabaniAdi, type Veritabani } from "../baglanti.ts";
import { siteVeritabaniniGuncelle } from "../guncelle.ts";
import { adres, yoneticiAdresi } from "./adresler.ts";

export const denemeVeritabaniniKaldir = async (ad: string): Promise<void> => {
  const yonetici = baglan(yoneticiAdresi("postgres"));
  try {
    await yonetici.execute(sql`drop database if exists ${sql.identifier(ad)} with (force)`);
    await yonetici.execute(sql`drop role if exists ${sql.identifier(ad)}`);
  } finally {
    await yonetici.$client.end();
  }
};

// Betik yarıda kalırsa veritabanı ve kullanıcı açılmış olabilir: açan kaldırır, geride artık
// kalmaz. Kaldırma da tutmazsa (kutu kapalı) asıl hata görünsün.
export const denemeVeritabaniAc = async (ad: string, sifre: string): Promise<void> => {
  if (veritabaniVeKullaniciAc(ad, sifre)) return;
  await denemeVeritabaniniKaldir(ad).catch(() => undefined);
  throw new Error(`${ad} açılamadı. Veritabanı kutusu açık mı? (pnpm veritabani-baslat)`);
};

export const denemeSitesiAc = async (
  onEk: string,
): Promise<{ vt: Veritabani; baglantiAdresi: string; sil: () => Promise<void> }> => {
  const kodAdi = `${onEk}-${randomBytes(4).toString("hex")}`;
  const ad = siteVeritabaniAdi(kodAdi);
  const sifre = randomBytes(24).toString("base64url");
  const baglantiAdresi = adres(ad, sifre, ad);
  await denemeVeritabaniAc(ad, sifre);
  const vt = baglan(baglantiAdresi);
  const sil = async () => {
    await vt.$client.end();
    await denemeVeritabaniniKaldir(ad);
  };
  try {
    await siteVeritabaniniGuncelle(vt, kodAdi);
  } catch (hata) {
    await sil().catch(() => undefined);
    throw hata;
  }
  return { vt, baglantiAdresi, sil };
};
