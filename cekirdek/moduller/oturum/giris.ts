// Deneme sınırlı şifre doğrulama ve günlüklü çıkış (kart 0027, karar 0042). Yönetici girişi kullanır,
// müşteri girişi de (kart 0033) aynısını kullanır. Yanlış şifre ile kayıtlı olmayan e-postanın cevabı aynıdır.
// E-posta günlükte kısaltılır (cekirdek/izleme/maskele.ts).
import { gunluk } from "../../izleme/gunluk.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { girisDenemeSiniri, type HesapTuru } from "../../kayitlar/oturum.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { denemeleriSil, denemeyiAyir, denemeyiGeriVer } from "./deneme-siniri.ts";
import { type Anahtarlar, cikisYap, hesapSifresiniDogrula } from "./servis.ts";

// Şifreyi deneme sınırıyla doğrular, oturum açmaz. Şifreden sonra ne olacağı hesap türünün işidir:
// yönetici iki aşamalı girişe geçer (iki-asamali-giris.ts).
export const sinirliSifreDogrula = async (
  vt: Veritabani,
  tur: HesapTuru,
  girdi: { eposta: string; sifre: string },
  baglanti: string,
): Promise<{ hesapKimligi: string }> => {
  // Küçük harfle: şifre doğrulama da e-postayı böyle arar, büyük harfli yazış ayrı sayaç açmasın.
  const hesapAnahtari = `${tur} hesap ${girdi.eposta.trim().toLowerCase()}`;
  const baglantiAnahtari = `${tur} baglanti ${baglanti}`;
  const { eposta } = girdi;

  const bekle = denemeyiAyir([
    { anahtar: hesapAnahtari, ...girisDenemeSiniri.hesap },
    { anahtar: baglantiAnahtari, ...girisDenemeSiniri.baglanti },
  ]);
  if (bekle !== null) {
    gunluk.uyari("Giriş deneme sınırı doldu.", { hesapTuru: tur, eposta });
    throw new BilinenHata("istek-siniri", undefined, { "Retry-After": String(bekle) });
  }

  let sonuc: Awaited<ReturnType<typeof hesapSifresiniDogrula>>;
  try {
    sonuc = await hesapSifresiniDogrula(vt, tur, girdi);
  } catch (hata) {
    // Veritabanı hatası kullanıcının yanlış denemesi değildir.
    denemeyiGeriVer(hesapAnahtari);
    denemeyiGeriVer(baglantiAnahtari);
    throw hata;
  }
  if (sonuc === null) {
    gunluk.uyari("Yanlış giriş denemesi.", { hesapTuru: tur, eposta });
    throw new BilinenHata("giris-hatasi");
  }
  denemeleriSil(hesapAnahtari);
  denemeyiGeriVer(baglantiAnahtari);
  gunluk.bilgi("Şifre doğrulandı.", { hesapTuru: tur, eposta });
  return sonuc;
};

export const gunlukluCikis = async (
  vt: Veritabani,
  tur: HesapTuru,
  anahtarlar: Partial<Anahtarlar>,
): Promise<void> => {
  const hesap = await cikisYap(vt, tur, anahtarlar);
  if (hesap !== null) gunluk.bilgi("Çıkış yapıldı.", { hesapTuru: tur, eposta: hesap.eposta });
};
