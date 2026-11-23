// Panel eylemlerinin tek kaydı (kart 0141, .claude/rules/yonetim-paneli.md): aynı eylem her sayfada aynı ikonla
// ve aynı adla durur. Komut çubuğu ve çerçeve eylemi yalnız koduyla ister (EylemDugmesi, EylemBaglantisi).
// "{ne}" taşıyan ad, eylemin nesnesini kullanan sayfadan alır: "Bölüm ekle", "Öğe ekle".
import type { PanelIkonAdi } from "../../bilesenler/ikonlar/panel-sozlugu";
import type { MetinAnahtari } from "../metinler/metin";

export const panelEylemleri = {
  ekle: { ikon: "ekle", ad: "yonetim.eylem.ekle" },
  "onceki-hale-don": { ikon: "iade", ad: "yonetim.eylem.oncekiHaleDon" },
  "vitrine-git": { ikon: "yeni-sekme", ad: "yonetim.eylem.vitrineGit" },
  cikis: { ikon: "cikis", ad: "yonetim.cikis.dugme" },
  // Siparişin durum işlemleri (kart 0234): kodlar siparisIslemleri'ndekiyle aynıdır.
  "havale-onayla": { ikon: "havale", ad: "yonetim.eylem.havaleOnayla" },
  "hazirlamaya-al": { ikon: "paket", ad: "yonetim.eylem.hazirlamayaAl" },
  "kargoya-ver": { ikon: "kargo", ad: "yonetim.eylem.kargoyaVer" },
  "kargo-duzelt": { ikon: "duzenle", ad: "yonetim.eylem.kargoDuzelt" },
  "teslim-edildi": { ikon: "basari", ad: "yonetim.eylem.teslimEdildi" },
  // İptal ve iade (kart 0235).
  "siparis-iptal": { ikon: "iptal", ad: "yonetim.eylem.siparisIptal" },
  "iade-yap": { ikon: "iade", ad: "yonetim.eylem.iadeYap" },
  // Sipariş fişi (kart 0270): ayrıntının ve listenin toplu çubuğunun "Fiş yazdır"ı, fiş sayfasının "Yazdır"ı.
  "fis-yazdir": { ikon: "yazici", ad: "yonetim.eylem.fisYazdir" },
  yazdir: { ikon: "yazici", ad: "yonetim.eylem.yazdir" },
  // Elle sipariş (kart 0236): sipariş listesinin komut çubuğundaki bağlantı.
  "elle-siparis": { ikon: "ekle", ad: "yonetim.eylem.elleSiparis" },
  // Ürünler (kart 0263): listenin "Ürün ekle"si ve ürün ekranının "Vitrinde gör"ü.
  "urun-ekle": { ikon: "ekle", ad: "yonetim.eylem.urunEkle" },
  "vitrinde-gor": { ikon: "yeni-sekme", ad: "yonetim.eylem.vitrindeGor" },
  // Müşteri ayrıntısı (kart 0271): müşterinin kendi e-postasına şifre sıfırlama bağlantısı.
  "sifre-sifirlama-gonder": { ikon: "sifre", ad: "yonetim.eylem.sifreSifirlamaGonder" },
  // Tema (kart 0260): tema sayfası ile tema ayarları arasındaki bağlantılar.
  "tema-ayarlari": { ikon: "duzenle", ad: "yonetim.eylem.temaAyarlari" },
  "tema-degistir": { ikon: "tema", ad: "yonetim.eylem.temaDegistir" },
} as const satisfies Record<string, { ikon: PanelIkonAdi; ad: MetinAnahtari }>;

export type PanelEylemi = keyof typeof panelEylemleri;
