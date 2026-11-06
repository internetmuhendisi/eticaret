// Gerçek veritabanı testleri için geçici site veritabanı. Yerel veritabanı kutusu açık olmalı
// (pnpm veritabani-baslat). Değişiklikler uygulanmış olarak açılır, sil() veritabanını ve
// kullanıcısını kaldırır.
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { veritabaniVeKullaniciAc } from "../../../komutlar/site-veritabani.mts";
import { baglan, siteVeritabaniAdi, type Veritabani } from "../baglanti.ts";
import { siteVeritabaniniGuncelle } from "../guncelle.ts";
import { adres, yoneticiAdresi } from "./adresler.ts";

export const denemeSitesiAc = async (
  onEk: string,
): Promise<{ vt: Veritabani; baglantiAdresi: string; sil: () => Promise<void> }> => {
  const kodAdi = `${onEk}-${randomBytes(4).toString("hex")}`;
  const ad = siteVeritabaniAdi(kodAdi);
  const sifre = randomBytes(24).toString("base64url");
  if (!veritabaniVeKullaniciAc(ad, sifre)) {
    throw new Error(`${ad} açılamadı. Veritabanı kutusu açık mı? (pnpm veritabani-baslat)`);
  }
  const baglantiAdresi = adres(ad, sifre, ad);
  const vt = baglan(baglantiAdresi);
  await siteVeritabaniniGuncelle(vt, kodAdi);
  return {
    vt,
    baglantiAdresi,
    sil: async () => {
      await vt.$client.end();
      const yonetici = baglan(yoneticiAdresi("postgres"));
      await yonetici.execute(sql`drop database if exists ${sql.identifier(ad)} with (force)`);
      await yonetici.execute(sql`drop role if exists ${sql.identifier(ad)}`);
      await yonetici.$client.end();
    },
  };
};
