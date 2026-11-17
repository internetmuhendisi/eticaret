"use client";
// Vitrinde müşterinin oturum durumu ve çıkışı, tek yerde (kartlar 0033, 0131). Sade ana sayfanın hesap alanı,
// üst kısmın Hesabım menüsü ve telefondaki yan pencere bunu kullanır.
//
// Oturum uçtan sorulur: sayfa çizerken okunursa oturum kapanır (karar 0039). Sayfa yüklemesi başına yalnız bir
// istek gider ve bütün kullananlar onun cevabını paylaşır: yanıt yenilenen oturum anahtarını taşıyabilir, aynı anda
// giden iki istek aynı yenileme anahtarını iki kez kullanırdı. Giriş, kayıt ve çıkış sayfayı baştan yükler.
//
// Cevap gelene kadar durum "bilinmiyor"dur. Yalnız 401 girişsiz sayılır; sunucu ve ağ hatasında durum bilinmiyor
// kalır: girişli müşteri oturumu kapanmış sanmasın (karar 0051).
import { useSyncExternalStore } from "react";
import { kapiyaIstek } from "../kapi/istemci";
import { hataKodlari } from "../kayitlar/kapi";
import { temaDemosu } from "../kayitlar/tema";
import { vitrinAdresleri } from "./adresler";
import { cereziSil } from "./favori-deposu";

// Müşterinin oturum sorusu; girişsiz ziyaretçide 401 alır (ekran ölçümü bu 401'i bekler, kart 0146).
export const hesabimUcu = "/kapi/musteri/hesabim";
const cikisUcu = "/kapi/herkese-acik/musteri-cikis";

export type HesapDurumu =
  | { tur: "bilinmiyor" }
  | { tur: "girissiz" }
  | { tur: "girisli"; eposta: string };

const bilinmiyor: HesapDurumu = { tur: "bilinmiyor" };
let durum: HesapDurumu = bilinmiyor;
const dinleyiciler = new Set<() => void>();

let cevap: Promise<HesapDurumu> | undefined;

const sor = async (): Promise<HesapDurumu> => {
  // Tema demosunda (kart 0116) ziyaretçi yalnız gezer: müşteri uçları kapalıdır, oturum sorulmaz, ziyaretçi girişsizdir.
  // Favoriler üye olmayan müşteri gibi tarayıcıda durur.
  if (document.documentElement.hasAttribute(temaDemosu.oznitelik)) {
    durum = { tur: "girissiz" };
    for (const dinleyici of dinleyiciler) dinleyici();
    return durum;
  }
  // İstek iptal edilmez: yanıtı yenilenen oturum anahtarını taşıyabilir, tarayıcıya ulaşmazsa eski anahtarla
  // kalınır ve oturum kapanır (karar 0039).
  let sonuc: HesapDurumu = bilinmiyor;
  try {
    const yanit = await kapiyaIstek(hesabimUcu, { cache: "no-store" });
    if (yanit.ok) {
      const { veri } = (await yanit.json()) as { veri: { eposta: string } };
      sonuc = { tur: "girisli", eposta: veri.eposta };
    } else if (yanit.status === hataKodlari["oturum-yok"]) {
      sonuc = { tur: "girissiz" };
    }
  } catch {
    // Durum bilinmiyor kalır.
  }
  durum = sonuc;
  for (const dinleyici of dinleyiciler) dinleyici();
  return sonuc;
};

const sorulmadiysaSor = (): Promise<HesapDurumu> => {
  cevap ??= sor();
  return cevap;
};

// Hesap durumunun cevabı (kart 0140): favori durumu oturuma bundan sonra gider, böylece aynı sayfada iki müşteri
// isteği aynı yenileme anahtarını aynı anda kullanmaz. İstek henüz gitmediyse gönderir.
export const hesapDurumunuBekle = (): Promise<HesapDurumu> => sorulmadiysaSor();

// Hesap durumunu yeniden sorar (kart 0140): başka sekmede giriş yapılınca girişsiz sanan sekme favorileri
// hesaptan almalıdır. Bütün kullananlar yeni cevabı görür.
export const hesapDurumunuYenile = (): Promise<HesapDurumu> => {
  cevap = undefined;
  return sorulmadiysaSor();
};

const abone = (dinleyici: () => void) => {
  dinleyiciler.add(dinleyici);
  void sorulmadiysaSor();
  return () => {
    dinleyiciler.delete(dinleyici);
  };
};

const sormadan = () => () => undefined;

// Sunucuda ve hidrasyonda durum bilinmiyordur: sunucunun çizdiğiyle tarayıcının ilk çizimi aynı kalır.
// sorulur false ise (katalogun örnek kipi) istek gitmez, durum bilinmiyor kalır.
export const useHesapDurumu = (sorulur = true): HesapDurumu =>
  useSyncExternalStore(
    sorulur ? abone : sormadan,
    () => (sorulur ? durum : bilinmiyor),
    () => bilinmiyor,
  );

// Çıkış yapar ve ana sayfayı baştan yükler. Favoriler sayfasının çerezi silinir (kart 0140, kullanıcı kararı:
// çıkıştan sonra bu cihazda favoriler boş görünür). Çıkış olmazsa false döner; kullanan uyarıyı gösterir.
export const cikisYap = async (): Promise<boolean> => {
  try {
    const yanit = await kapiyaIstek(cikisUcu, { method: "POST" });
    if (yanit.ok) {
      cereziSil();
      window.location.assign(vitrinAdresleri.anasayfa);
      return true;
    }
  } catch {
    // Aşağıda false döner.
  }
  return false;
};

// Yalnız testler için: bir sonraki kullanan uca yeniden sorar.
export const hesapDurumunuSifirla = (): void => {
  durum = bilinmiyor;
  cevap = undefined;
};
