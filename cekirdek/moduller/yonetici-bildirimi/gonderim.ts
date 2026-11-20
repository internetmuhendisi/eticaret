// Yönetici bildiriminin gönderimi (kart 0241, karar 0154): iş çalışırken bildirimin açıklığı ve alıcılar ayardan
// okunur. Kapalı bildirim yazılmaz. Alıcılar ayardaki adresler, boşsa tam yetkili rolün yöneticileri. Her alıcıya bir
// e-posta, aynı olayın anahtarıyla (anahtar:alıcının özeti): iş yeniden çalışsa da ikinci e-posta yazılmaz.

import { createHash } from "node:crypto";
import type { MagazaAyarlari } from "../../ayar-semasi/ayarlar.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import {
  type YoneticiBildirimi,
  yoneticiBildirimTanimlari,
} from "../../kayitlar/yonetici-bildirimi.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { tamYetkiliYoneticiEpostalari } from "../ekip/servis.ts";
import { epostaGonder } from "../eposta/servis.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";

// Bildirim yalnız kapatılmamışsa gider. Eklentiye bağlı bildirim eklenti kapalıyken de gider (karar 0155): eklentinin
// para işleri (karşılaştırma, iade taraması) kapalıyken de çalışır, mağaza sahibi haberdar olmalı.
export const bildirimAcikMi = (
  ayarlar: Pick<MagazaAyarlari, "kapaliYoneticiBildirimleri">,
  bildirim: YoneticiBildirimi,
): boolean => !ayarlar.kapaliYoneticiBildirimleri.includes(bildirim);

export const bildirimAlicilari = async (
  vt: Veritabani,
  ayarlar: Pick<MagazaAyarlari, "yoneticiBildirimAlicilari">,
): Promise<string[]> =>
  ayarlar.yoneticiBildirimAlicilari.length > 0
    ? ayarlar.yoneticiBildirimAlicilari
    : tamYetkiliYoneticiEpostalari(vt);

export const aliciOzeti = (alici: string): string =>
  createHash("sha256").update(alici.toLowerCase()).digest("hex").slice(0, 32);

// Bildirimin e-postalarını çağıranın işleminde yazar: her alıcıya bir e-posta, olayın anahtarıyla (anahtar:alıcı).
export const bildirimEpostalariniYaz = async (
  islem: VeritabaniIslemi,
  g: {
    bildirim: YoneticiBildirimi;
    anahtar: string;
    veri: Record<string, unknown>;
    alicilar: readonly string[];
  },
): Promise<void> => {
  for (const alici of g.alicilar) {
    await epostaGonder(islem, {
      kime: alici,
      sablon: yoneticiBildirimTanimlari[g.bildirim].sablon,
      veri: g.veri,
      // Adresin özeti: uzun adres anahtarı sınırın üstüne taşırmaz (bağımsız kontrolün bulgusu).
      olayAnahtari: `${g.anahtar}:${aliciOzeti(alici)}`,
    });
  }
};

// Yazılan e-posta sayısını döner (kapalıysa 0).
export const bildirimiGonder = async (
  vt: Veritabani,
  site: Site,
  g: { bildirim: YoneticiBildirimi; anahtar: string; veri: Record<string, unknown> },
): Promise<number> => {
  const ayarlar = await siteninMagazaAyarlari(vt, site);
  if (!bildirimAcikMi(ayarlar, g.bildirim)) return 0;
  const alicilar = await bildirimAlicilari(vt, ayarlar);
  await vt.transaction((islem) => bildirimEpostalariniYaz(islem, { ...g, alicilar }));
  return alicilar.length;
};
