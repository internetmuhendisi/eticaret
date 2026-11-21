// İzinlerin tek kaydı (.claude/rules/yetki.md, karar 0040). Her modül kendi izinlerini izinler.ts
// dosyasında yazar, burada toplanır. Roller bu izinlerden oluşur. Liste belgede de yazar:
// cekirdek/moduller/ekip/izinler-ve-roller.md.
import { stokBildirimiIzinleri } from "../eklentiler/stoga-gelince-haber-ver/izinler.ts";
import { dosyaIzinleri } from "../moduller/dosya/izinler.ts";
import { duzenIzinleri } from "../moduller/duzen/izinler.ts";
import { ekipIzinleri } from "../moduller/ekip/izinler.ts";
import { etiketIzinleri } from "../moduller/etiket/izinler.ts";
import { favoriIzinleri } from "../moduller/favori/izinler.ts";
import { fiyatIzinleri } from "../moduller/fiyat/izinler.ts";
import { kategoriIzinleri } from "../moduller/kategori/izinler.ts";
import { magazaAyarlariIzinleri } from "../moduller/magaza-ayarlari/izinler.ts";
import { markaIzinleri } from "../moduller/marka/izinler.ts";
import { menuIzinleri } from "../moduller/menu/izinler.ts";
import { musteriIzinleri } from "../moduller/musteri/izinler.ts";
import { odemeIzinleri, odemeYontemiIzinleri } from "../moduller/odeme/izinler.ts";
import { ozellikIzinleri } from "../moduller/ozellik/izinler.ts";
import { siparisIzinleri } from "../moduller/siparis/izinler.ts";
import { stokIzinleri } from "../moduller/stok/izinler.ts";
import { temaIzinleri } from "../moduller/tema/izinler.ts";
import { urunIzinleri } from "../moduller/urun/izinler.ts";
import { vergiIzinleri } from "../moduller/vergi/izinler.ts";
import { yorumIzinleri } from "../moduller/yorum/izinler.ts";
import type { Kapi } from "./kapi.ts";

// Hesap yalnız kendi kayıtlarını, ekibinin kayıtlarını ya da bütün kayıtları görür.
export const izinKapsamlari = ["kendi", "ekip", "tumu"] as const;
export type IzinKapsami = (typeof izinKapsamlari)[number];

// Müşteri izninin kapsamı yalnız "kendi" olabilir. Sahip izni sahip paneliyle gelir.
export type IzinTanimi =
  | { giris: "musteri"; kapsam: "kendi" }
  | { giris: "yonetici"; kapsam: IzinKapsami };

export const modulIzinleri = {
  // Sitedeki görselleri görmek (kart 0261).
  dosya: dosyaIzinleri,
  duzen: duzenIzinleri,
  ekip: ekipIzinleri,
  etiket: etiketIzinleri,
  favori: favoriIzinleri,
  fiyat: fiyatIzinleri,
  kategori: kategoriIzinleri,
  "magaza-ayarlari": magazaAyarlariIzinleri,
  marka: markaIzinleri,
  menu: menuIzinleri,
  musteri: musteriIzinleri,
  odeme: odemeIzinleri,
  // Ödeme yöntemleri ve banka hesapları (kart 0214): ödeme modülünün ayrı izin adı.
  "odeme-yontemi": odemeYontemiIzinleri,
  ozellik: ozellikIzinleri,
  siparis: siparisIzinleri,
  stok: stokIzinleri,
  // Eklenti (kart 0144, karar 0117).
  "stok-bildirimi": stokBildirimiIzinleri,
  tema: temaIzinleri,
  urun: urunIzinleri,
  vergi: vergiIzinleri,
  yorum: yorumIzinleri,
} as const;

export const izinler = {
  ...dosyaIzinleri,
  ...duzenIzinleri,
  ...ekipIzinleri,
  ...etiketIzinleri,
  ...favoriIzinleri,
  ...fiyatIzinleri,
  ...kategoriIzinleri,
  ...magazaAyarlariIzinleri,
  ...markaIzinleri,
  ...menuIzinleri,
  ...musteriIzinleri,
  ...odemeIzinleri,
  ...odemeYontemiIzinleri,
  ...ozellikIzinleri,
  ...siparisIzinleri,
  ...stokIzinleri,
  ...stokBildirimiIzinleri,
  ...temaIzinleri,
  ...urunIzinleri,
  ...vergiIzinleri,
  ...yorumIzinleri,
} as const satisfies Record<string, IzinTanimi>;
export type IzinAdi = keyof typeof izinler;

// Bir girişin kullanabileceği izinler. Sahip girişinde izin olmadığı için oraya uç yazılamaz.
export type GirisIzni<Giris extends Kapi> = {
  [Ad in IzinAdi]: (typeof izinler)[Ad]["giris"] extends Giris ? Ad : never;
}[IzinAdi];

// Herkese açık girişteki uçların izin beyanı. Başka girişte kullanılamaz.
export const herkeseAcik = "herkese-acik";
export type HerkeseAcik = typeof herkeseAcik;
