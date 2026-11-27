// Panelin bildirim listesi ekran için, sunucuda (kart 0280, karar 0198): satırın başlığı, alt yazısı, ikonu,
// zamanı ve ilgili ekranın adresi sitenin biçimi ve metinleriyle burada kurulur. Kişisel bilgi satırda saklanmaz,
// okunurken kayıttan gelir: siparişte müşterinin adı kısaltılır (kişisel bilgisi silinmişse yoktur).
import type { PanelIkonAdi } from "../../../bilesenler/ikonlar/panel-sozlugu";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import type { Site } from "../../ayar-semasi/site-klasoru";
import type { YoneticiBildirimi } from "../../kayitlar/yonetici-bildirimi";
import { goreliZaman, takvimGunuYazisi } from "../../metinler/bicimleyici";
import { doldur } from "../../metinler/doldur";
import { type MetinAnahtari, metinOkuyucu } from "../../metinler/metin";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import { yoneticininYetkileri } from "../../moduller/ekip/servis";
import {
  type PanelBildirimSatiri,
  panelBildirimleriniOku,
} from "../../moduller/yonetici-bildirimi/panel";
import type { Veritabani } from "../../veritabani/baglanti";
import {
  siparisAyrintisiAdresi,
  siparislerAdresi,
  urunEkraniAdresi,
  urunlerAdresi,
  yorumlarAdresi,
} from "../adresler";
import { odemeYazisi } from "../siparisler/metinler";

export type PanelBildirimi = {
  kimlik: string;
  baslik: string;
  alt: string;
  ikon: PanelIkonAdi;
  // ISO yazısı (makine) ve göreli yazısı (ekran).
  an: string;
  zaman: string;
  okundu: boolean;
  adres: string;
};
export type PanelBildirimListesi = { okunmamis: number; bildirimler: PanelBildirimi[] };

export const bildirimIkonlari: Record<YoneticiBildirimi, PanelIkonAdi> = {
  "yeni-siparis": "paket",
  "havale-bildirimi": "havale",
  "iade-talebi": "iade",
  iptal: "iptal",
  stok: "urunler",
  yorum: "yorumlar",
  "kartla-odeme-uyusmazligi": "kart",
  "bekleyen-iade": "iade",
};

const anahtar = (yol: string) => `yonetim.bildirimler.${yol}` as MetinAnahtari;

export const panelBildiriminiKur = (
  satir: PanelBildirimSatiri,
  simdi: Date,
  site: Site = calisanSite(),
): PanelBildirimi => {
  const b = siteninBicimleyicisi(site.ayarlar);
  const metin = metinOkuyucu(site.ayarlar.dil);
  const ayrac = metin("yonetim.bildirimler.ayrac");
  const katil = (parcalar: (string | undefined)[]) =>
    parcalar.filter((p): p is string => p !== undefined && p !== "").join(ayrac);
  const siparis = satir.kayit?.tur === "siparis" ? satir.kayit : undefined;
  const numara = siparis?.numara ?? "";
  // Kişisel bilgisi silinmiş siparişte ad boştur: alt yazıda yer almaz.
  const ad = siparis === undefined ? "" : b.kisaAd(`${siparis.ad} ${siparis.soyad}`.trim());
  const tutar = (kurus: number) =>
    siparis === undefined || siparis.paraBirimi === site.ayarlar.paraBirimi ? b.para(kurus) : "";
  const ortak = {
    kimlik: satir.kimlik,
    ikon: bildirimIkonlari[satir.bildirim],
    an: satir.an.toISOString(),
    zaman: goreliZaman(satir.an, simdi, site.ayarlar),
    okundu: satir.okundu,
  };
  const siparisAdresi = numara === "" ? siparislerAdresi : siparisAyrintisiAdresi(numara);
  const baslik = (yol: string, degerler: Record<string, string> = {}) =>
    doldur(metin(anahtar(`baslik.${yol}`)), degerler);
  switch (satir.bildirim) {
    case "yeni-siparis":
      return {
        ...ortak,
        baslik: baslik("yeni-siparis", { numara }),
        alt: katil([
          ad,
          siparis === undefined ? undefined : tutar(siparis.toplam),
          siparis === undefined ? undefined : odemeYazisi(metin, siparis.odemeYontemi, null),
        ]),
        adres: siparisAdresi,
      };
    case "havale-bildirimi":
      return {
        ...ortak,
        baslik: baslik("havale-bildirimi", { numara }),
        alt: katil([ad, tutar(satir.ozet.tutar)]),
        adres: siparisAdresi,
      };
    case "iade-talebi":
      return {
        ...ortak,
        baslik: baslik("iade-talebi", { numara }),
        alt: katil([
          ad,
          doldur(metin("yonetim.bildirimler.urunSayisi"), { sayi: b.sayi(satir.ozet.adet) }),
        ]),
        adres: siparisAdresi,
      };
    case "iptal":
      return {
        ...ortak,
        baslik: baslik("iptal", { numara }),
        alt: katil([ad, metin(anahtar(`iptalNedeni.${satir.ozet.neden}`))]),
        adres: siparisAdresi,
      };
    case "stok": {
      const birim = satir.kayit?.tur === "birim" ? satir.kayit : undefined;
      const urun =
        birim === undefined
          ? ""
          : birim.secim.length === 0
            ? birim.urunAdi
            : doldur(metin("yonetim.bildirimler.secimli"), {
                urun: birim.urunAdi,
                secim: birim.secim.join(metin("yonetim.bildirimler.secimAyiraci")),
              });
      return {
        ...ortak,
        baslik: baslik(`stok.${satir.ozet.tur}`, { urun }),
        alt: doldur(metin(anahtar(`stokAlt.${satir.ozet.tur}`)), {
          miktar: b.sayi(satir.ozet.miktar),
        }),
        adres: birim === undefined ? urunlerAdresi : urunEkraniAdresi(birim.urun),
      };
    }
    case "yorum":
      return {
        ...ortak,
        baslik: baslik("yorum"),
        alt: katil([
          satir.kayit?.tur === "yorum" ? satir.kayit.urunAdi : undefined,
          doldur(metin("yonetim.bildirimler.puan"), { puan: b.sayi(satir.ozet.puan) }),
        ]),
        adres: yorumlarAdresi,
      };
    case "kartla-odeme-uyusmazligi":
      return {
        ...ortak,
        baslik: baslik("kartla-odeme-uyusmazligi"),
        alt: katil([
          takvimGunuYazisi(site.ayarlar.dil, satir.ozet.gun, "kisa"),
          doldur(metin("yonetim.bildirimler.odemeSayisi"), { sayi: b.sayi(satir.ozet.sayi) }),
        ]),
        adres: siparislerAdresi,
      };
    case "bekleyen-iade":
      return {
        ...ortak,
        baslik: baslik("bekleyen-iade", { numara }),
        alt: metin(anahtar(`bekleyenIadeNedeni.${satir.ozet.neden}`)),
        adres: siparisAdresi,
      };
  }
};

export const panelBildirimListesi = async (
  vt: Veritabani,
  yonetici: string,
  site: Site = calisanSite(),
): Promise<PanelBildirimListesi> => {
  const yetkili = await yoneticininYetkileri(vt, yonetici);
  const { okunmamis, satirlar } = await panelBildirimleriniOku(vt, yonetici, yetkili);
  const simdi = new Date();
  return { okunmamis, bildirimler: satirlar.map((s) => panelBildiriminiKur(s, simdi, site)) };
};
