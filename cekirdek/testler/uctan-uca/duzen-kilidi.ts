// Sitenin vitrin düzenini değiştiren tarayıcı testleri aynı anda çalışmaz (kart 0293). Hatta testler iki işçiyle
// paralel koşar ve düzen paylaşılır: vitrin çerçevesi testi üst kısmın başına bölüm ekleyip silerken vitrin bölümleri
// testi aynı alanı panelde sıralıyordu. Panel bölümü bir sırada çizdi, test sırayı az sonra veritabanından okudu;
// arada öteki testin bölümü silinmişti, test başka sıradaki adla düğme aradı (hatlar 45045593092, 45050882397).
// Panelin sıralaması da alanın bütün listesini gönderir, arada değişen düzende çakışır.
//
// Düzeni değiştiren test başta `duzenKilidiniAl` ile veritabanının oturum kilidini alır, sonunda bırakır. Kilit
// testin kendi bağlantısındadır: test düşüp bağlantı kapanınca veritabanı kilidi kendisi bırakır. Düzeni değiştiren
// yeni tarayıcı testi de bu kilidi alır; almaması yalnız disiplindir.
//
// Kilidi beklemek testin süresinden düşmez: test beklediği kadar uzatılır (öteki test en çok kendi süresi kadar tutar).
import { test } from "@playwright/test";
import type { Veritabani } from "../../veritabani/baglanti";

// Uygulamanın kendi kilitlerinden (pg_advisory_xact_lock(hashtext('duzen'))) ayrı anahtar: testin kilidi
// uygulamanın düzen işlemlerini bekletmez.
const anahtar = "uctan-uca-duzen";

export const duzenKilidiniAl = async (vt: Veritabani): Promise<() => Promise<void>> => {
  const baslangic = performance.now();
  const baglanti = await vt.$client.connect();
  try {
    await baglanti.query("select pg_advisory_lock(hashtext($1))", [anahtar]);
  } catch (hata) {
    baglanti.release(true);
    throw hata;
  }
  const bilgi = test.info();
  bilgi.setTimeout(bilgi.timeout + Math.ceil(performance.now() - baslangic));
  return async () => {
    try {
      await baglanti.query("select pg_advisory_unlock(hashtext($1))", [anahtar]);
    } finally {
      baglanti.release();
    }
  };
};
