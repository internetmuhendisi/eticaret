// Yönetici bildiriminin gönderimi (kart 0241, karar 0154): iş çalışırken bildirimin açıklığı ve alıcılar ayardan
// okunur. Kapalı bildirim yazılmaz. Alıcılar ayardaki adresler, boşsa tam yetkili rolün yöneticileri. Her alıcıya bir
// e-posta, aynı olayın anahtarıyla (anahtar:alıcı): iş yeniden çalışsa da ikinci e-posta yazılmaz.

import type { MagazaAyarlari } from "../../ayar-semasi/ayarlar.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { eklentiAcikMi } from "../../eklentiler/acik.ts";
import {
  type YoneticiBildirimi,
  yoneticiBildirimTanimlari,
} from "../../kayitlar/yonetici-bildirimi.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { tamYetkiliYoneticiEpostalari } from "../ekip/servis.ts";
import { epostaGonder } from "../eposta/servis.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";

export const bildirimAcikMi = (
  site: Site,
  ayarlar: Pick<MagazaAyarlari, "kapaliYoneticiBildirimleri">,
  bildirim: YoneticiBildirimi,
): boolean => {
  const { eklenti } = yoneticiBildirimTanimlari[bildirim];
  return (
    !ayarlar.kapaliYoneticiBildirimleri.includes(bildirim) &&
    (eklenti === null || eklentiAcikMi(site, eklenti))
  );
};

export const bildirimAlicilari = async (
  vt: Veritabani,
  ayarlar: Pick<MagazaAyarlari, "yoneticiBildirimAlicilari">,
): Promise<string[]> =>
  ayarlar.yoneticiBildirimAlicilari.length > 0
    ? ayarlar.yoneticiBildirimAlicilari
    : tamYetkiliYoneticiEpostalari(vt);

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
      olayAnahtari: `${g.anahtar}:${alici.toLowerCase()}`,
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
  if (!bildirimAcikMi(site, ayarlar, g.bildirim)) return 0;
  const alicilar = await bildirimAlicilari(vt, ayarlar);
  await vt.transaction((islem) => bildirimEpostalariniYaz(islem, { ...g, alicilar }));
  return alicilar.length;
};
