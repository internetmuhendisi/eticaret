// Sitenin vitrin düzenini değiştiren ya da düzenin bölüm sayısına göre bekleyen tarayıcı testleri aynı anda çalışmaz
// (kart 0293). Hatta testler iki işçiyle paralel koşar ve düzen paylaşılır: vitrin çerçevesi testi üst kısmın başına
// bölüm ekleyip silerken vitrin bölümleri testi aynı alanı panelde sıralıyordu. Panel bölümü bir sırada çizdi, test
// sırayı az sonra veritabanından okudu; arada öteki testin bölümü silinmişti, test başka sıradaki adla düğme aradı
// (hatlar 45045593092, 45050882397). Panelin sıralaması da alanın bütün listesini gönderir, arada değişen düzende
// çakışır.
//
// Test başta `duzenKilidiniAl` ile veritabanının oturum kilidini alır, sonunda bırakır. Kilit testin kendi
// bağlantısındadır: bırakınca bağlantı havuza dönmez, kapatılır; test düşüp süreç kapanınca da veritabanı kilidi
// kendisi bırakır. Düzeni değiştiren yeni tarayıcı testi de bu kilidi alır; almaması yalnız disiplindir.
//
// Kilidi beklemek testin süresinden düşmez: süre beklemeden önce en uzun bekleme kadar uzatılır, kilit alınınca
// beklenen kadara indirilir. Bekleme sınırlıdır: sınır dolarsa test düşer, bekleyen sorgu sürmez (yoksa kilidi
// sonradan alıp sahipsiz tutardı; bağımsız kontrolün bulgusu).
import { test } from "@playwright/test";
import type { Veritabani } from "../../veritabani/baglanti";

// Uygulamanın kendi kilitlerinden (pg_advisory_xact_lock(hashtext('duzen'))) ayrı anahtar: testin kilidi
// uygulamanın düzen işlemlerini bekletmez.
const anahtar = "uctan-uca-duzen";
// Kilidi tutan test en çok kendi süresi (düzen testlerinde 60 saniye, kilidin uzatması dahil) ve temizliği kadar
// tutar; sınır bunun birkaç katıdır.
const enUzunBekleme = 300_000;

export const duzenKilidiniAl = async (vt: Veritabani): Promise<() => Promise<void>> => {
  const bilgi = test.info();
  const ilkSure = bilgi.timeout;
  bilgi.setTimeout(ilkSure + enUzunBekleme);
  const baslangic = performance.now();
  const baglanti = await vt.$client.connect();
  try {
    // Oturum ayarı bu bağlantıdadır, bağlantı bırakınca kapatılır.
    await baglanti.query("select set_config('lock_timeout', $1, false)", [String(enUzunBekleme)]);
    await baglanti.query("select pg_advisory_lock(hashtext($1))", [anahtar]);
  } catch (hata) {
    baglanti.release(true);
    throw hata;
  }
  bilgi.setTimeout(ilkSure + Math.ceil(performance.now() - baslangic));
  return async () => {
    try {
      await baglanti.query("select pg_advisory_unlock(hashtext($1))", [anahtar]);
    } finally {
      baglanti.release(true);
    }
  };
};
