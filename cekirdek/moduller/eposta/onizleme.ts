// Panelin e-posta önizlemesi ve deneme e-postası (kart 0279, karar 0197). İkisi de gönderimin işleviyle
// (epostaIceriginiKur) ve örnek siparişle (ornek.ts) çizer: önizlemede görülen, gönderilenle aynıdır.
//
// - Önizleme formun kaydedilmemiş metinlerini çizer; bilinmeyen bilgi yazı olarak görünür ("[İndirim kodu]"), kayıt
//   onu reddeder.
// - Deneme e-postası yöneticinin kendi adresine kuyruktan gider; metinler kayıt kuralından geçmelidir. E-posta
//   gidemeyen sitede (gönderici ya da gönderen adresi yok) "is-kurali" ("eposta-gidemez") alır.
import { siteAdresi } from "../../ayar-semasi/site-adresi.ts";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { siteninMagazaAyarlari } from "../magaza-ayarlari/servis.ts";
import { epostaGidebilirMi } from "./gonderici.ts";
import { epostaIceriginiKur, gonderimBaglami } from "./gonderim.ts";
import { type EpostaMetniGirdisi, metinleriCevir } from "./metin-servisi.ts";
import { ornekEposta } from "./ornek.ts";
import { epostaGonder } from "./servis.ts";

type MetinGirdisi = Pick<EpostaMetniGirdisi, "kod" | "konu" | "giris" | "kapanis">;

const ornegi = async (vt: Veritabani, site: Site, kod: MetinGirdisi["kod"]) => {
  const { fiyatGosterimi } = await siteninMagazaAyarlari(vt, site);
  return ornekEposta(site, kod, { kok: siteAdresi(site.kimlik), gosterim: fiyatGosterimi });
};

export const epostaOnizlemesi = async (
  vt: Veritabani,
  site: Site,
  girdi: MetinGirdisi,
): Promise<{ konu: string; html: string }> => {
  const { alanlar } = metinleriCevir(site.ayarlar.dil, girdi);
  const [baglam, ornek] = await Promise.all([
    gonderimBaglami(vt, site),
    ornegi(vt, site, girdi.kod),
  ]);
  const icerik = epostaIceriginiKur(site, baglam, {
    ...ornek,
    metinler: { [girdi.kod]: alanlar },
  });
  return { konu: icerik.konu, html: icerik.html };
};

export const denemeEpostasiGonder = async (
  vt: Veritabani,
  site: Site,
  kime: string,
  girdi: MetinGirdisi,
): Promise<void> => {
  if (!epostaGidebilirMi(site.ayarlar)) throw new BilinenHata("is-kurali", "eposta-gidemez");
  const { alanlar, sorunlar } = metinleriCevir(site.ayarlar.dil, girdi);
  if (sorunlar.length > 0) throw new BilinenHata("dogrulama", sorunlar);
  const ornek = await ornegi(vt, site, girdi.kod);
  await epostaGonder(vt, {
    kime,
    sablon: ornek.sablon,
    degiskenler: ornek.degiskenler,
    ...(ornek.veri === undefined ? {} : { veri: ornek.veri as unknown as Record<string, unknown> }),
    metinler: { [girdi.kod]: alanlar },
  });
};
