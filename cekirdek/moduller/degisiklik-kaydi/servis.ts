// Değişiklik kaydının tek yazma yolu (kart 0029, karar 0045, .claude/rules/yetki.md). Yalnız bir veritabanı
// işlemi içinde çağrılır: değişiklik geri alınırsa kaydı da geri alınır, biri olup öteki olmaz.
//
// Değerler maskelenmez: günlüğün maskesi "kararsızsa gizle" der, kimlikleri ve sayıları bozar, kayıt da
// sonradan düzeltilemez. Bunun yerine yasak alan ya da değer işi durdurur: yanlış yazılan kod testte
// kırmızı olur, kayda hiçbir şey girmez.
import type {
  DegisikligiYapan,
  DegisiklikIslemi,
  DegisiklikKayitTuru,
} from "../../kayitlar/degisiklik-islemleri.ts";
import type { VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kayitDegeriYasakMi } from "./deger.ts";
import { degisiklikKayitlari } from "./model.ts";

// Alan adının bu sözcüklerden birini taşıması yasaktır: şifre, anahtar ve kişisel veri kayda girmez.
// Kişiyi kimliğiyle yaz. Alan adı sözcüklerine bölünür: "fiyat_kart_komisyonu" gibi adlar takılmaz.
const yasakSozcukler = new Set([
  "sifre",
  "parola",
  "password",
  "pass",
  "pwd",
  "anahtar",
  "anahtari",
  "anahtarlar",
  "token",
  "secret",
  "jwt",
  "ozet",
  "hash",
  "cvv",
  "cvc",
  "yedek",
  "eposta",
  "email",
  "telefon",
]);

const sozcukler = (alan: string): string[] =>
  alan
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/);

const degeriDenetle = (deger: unknown, yol: string): void => {
  if (typeof deger === "string") {
    if (kayitDegeriYasakMi(deger)) {
      throw new Error(`Değişiklik kaydına gizli ya da kişisel değer yazılamaz: ${yol}`);
    }
    return;
  }
  if (deger === null || typeof deger === "number" || typeof deger === "boolean") return;
  if (Array.isArray(deger)) {
    deger.forEach((oge, sira) => {
      degeriDenetle(oge, `${yol}[${sira}]`);
    });
    return;
  }
  if (typeof deger !== "object" || Object.getPrototypeOf(deger) !== Object.prototype) {
    throw new Error(`Değişiklik kaydına yalnız düz değer yazılır: ${yol}`);
  }
  for (const [alan, alt] of Object.entries(deger)) {
    if (sozcukler(alan).some((sozcuk) => yasakSozcukler.has(sozcuk))) {
      throw new Error(`Değişiklik kaydına gizli ya da kişisel alan yazılamaz: ${yol}.${alan}`);
    }
    degeriDenetle(alt, `${yol}.${alan}`);
  }
};

export const degisikligiKaydet = async (
  islem: VeritabaniIslemi,
  girdi: {
    kim: DegisikligiYapan;
    islem: DegisiklikIslemi;
    kayit: { tur: DegisiklikKayitTuru; kimlik: string };
    eski: Record<string, unknown> | null;
    yeni: Record<string, unknown> | null;
  },
): Promise<void> => {
  const { kim, kayit, eski, yeni } = girdi;
  degeriDenetle(eski, "eski");
  degeriDenetle(yeni, "yeni");
  await islem.insert(degisiklikKayitlari).values({
    kim_turu: kim.tur,
    kim_kimligi: kim.tur === "sistem" ? null : kim.kimlik,
    kim_adi: kim.tur === "sistem" ? kim.ad : null,
    islem: girdi.islem,
    kayit_turu: kayit.tur,
    kayit_kimligi: kayit.kimlik,
    eski_deger: eski,
    yeni_deger: yeni,
  });
};
