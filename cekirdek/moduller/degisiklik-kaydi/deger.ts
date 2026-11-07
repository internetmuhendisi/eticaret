// Değişiklik kaydına yazılamayan metin değerinin tek tanımı (karar 0045). Servis bu değeri görünce işi
// durdurur; serbest metin alan modüller (ürün adı, açıklama) aynı işlevle girdiyi şemada reddeder,
// böylece mağaza sahibinin yazdığı bir metin beklenmeyen hataya dönmez.
//
// Kalıp değerin tamamına bakar: e-posta adresi, giriş başlığı ya da JWT'nin kendisi. Cümle içinde
// geçen adres takılmaz.
const epostaKalibi = /^[^\s@]+@[^\s@]+$/;
const bearerKalibi = /^bearer\s/i;
const jwtKalibi = /^eyJ[\w-]+\.[\w-]+\./;
// "Basic " başlığı yalnız ardından "kullanıcı:şifre"nin base64 hâli gelirse yakalanır (kart 0076):
// "Basic Tişört" gibi bir ürün adı giriş başlığı değildir.
const basicKalibi = /^basic\s+([A-Za-z0-9+/]+={0,2})$/i;

// Geçerli base64 (uzunluğu dördün katı), çözülünce yalnız yazılabilir ASCII ve içinde ":" var.
const basicBasligiMi = (deger: string): boolean => {
  const kodlu = basicKalibi.exec(deger)?.[1];
  if (kodlu === undefined || kodlu.length % 4 !== 0) return false;
  // atob tarayıcıda da çalışır: ürün şeması ekranla ortaktır.
  let cozulen: string;
  try {
    cozulen = atob(kodlu);
  } catch {
    return false;
  }
  return cozulen.includes(":") && /^[\x20-\x7e]+$/.test(cozulen);
};

export const kayitDegeriYasakMi = (deger: string): boolean =>
  epostaKalibi.test(deger) ||
  bearerKalibi.test(deger) ||
  jwtKalibi.test(deger) ||
  basicBasligiMi(deger);
