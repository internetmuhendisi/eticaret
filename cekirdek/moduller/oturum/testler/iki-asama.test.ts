// İki aşamalı girişin hesapları (kart 0028, karar 0044): standardın örnekleri, kod tekrarı, gizlinin
// şifrelenmesi ve yedek kodlar. Akış gerçek veritabanıyla: cekirdek/kapi/testler/iki-asamali-giris.test.ts.
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ikiAsamaAyari } from "../../../kayitlar/oturum.ts";
import {
  altiHaneliMi,
  base32Oku,
  base32Yaz,
  gizliyiCoz,
  gizliyiSifrele,
  ikiAsamaGizlisiUret,
  kodAdimi,
  kodunAdimi,
  kurulumAdresiUret,
  yedekKodlariUret,
  yedekKodOzeti,
  zamanliKod,
} from "../iki-asama.ts";

const anahtar = () => randomBytes(32).toString("hex");
const hesap = "11111111-1111-4111-8111-111111111111";

beforeEach(() => vi.stubEnv("IKI_ASAMA_ANAHTARI", anahtar()));
afterEach(() => vi.unstubAllEnvs());

describe("zamanlı kod", () => {
  // RFC 6238 Ek B, SHA-1, 8 haneli kodun son 6 hanesi: uygulamalarla uyumun kanıtı.
  const gizli = base32Yaz(Buffer.from("12345678901234567890"));
  it.each([
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"],
    [1234567890, "005924"],
    [2000000000, "279037"],
    [20000000000, "353130"],
  ])("%i saniyesinde %s", (saniye, kod) => {
    expect(zamanliKod(gizli, kodAdimi(saniye * 1000))).toBe(kod);
  });

  it("base32 yazıp okuyunca aynı bayt çıkar, standardın örneği tutar", () => {
    expect(base32Yaz(Buffer.from("foobar"))).toBe("MZXW6YTBOI");
    const veri = randomBytes(ikiAsamaAyari.gizliBayt);
    expect(base32Oku(base32Yaz(veri)).equals(veri)).toBe(true);
    expect(() => base32Oku("küçük")).toThrow();
  });

  it("yandaki adımın kodu geçer, iki adım ötesi geçmez", () => {
    const yeni = ikiAsamaGizlisiUret();
    const simdi = 1_800_000_000_000;
    const adim = kodAdimi(simdi);
    expect(kodunAdimi(yeni, zamanliKod(yeni, adim), null, simdi)).toBe(adim);
    expect(kodunAdimi(yeni, zamanliKod(yeni, adim - 1), null, simdi)).toBe(adim - 1);
    expect(kodunAdimi(yeni, zamanliKod(yeni, adim + 1), null, simdi)).toBe(adim + 1);
    expect(kodunAdimi(yeni, zamanliKod(yeni, adim - 2), null, simdi)).toBeNull();
    expect(kodunAdimi(yeni, zamanliKod(yeni, adim + 2), null, simdi)).toBeNull();
    expect(kodunAdimi(yeni, "12345", null, simdi)).toBeNull();
  });

  it("geçmiş adımın kodu ikinci kez geçmez, daha eskisi de geçmez", () => {
    const yeni = ikiAsamaGizlisiUret();
    const simdi = 1_800_000_000_000;
    const adim = kodAdimi(simdi);
    expect(kodunAdimi(yeni, zamanliKod(yeni, adim), adim, simdi)).toBeNull();
    expect(kodunAdimi(yeni, zamanliKod(yeni, adim - 1), adim, simdi)).toBeNull();
    expect(kodunAdimi(yeni, zamanliKod(yeni, adim + 1), adim, simdi)).toBe(adim + 1);
  });

  it("yalnız 6 rakam zamanlı kod sayılır", () => {
    expect(altiHaneliMi("123456")).toBe(true);
    for (const kod of ["12345", "1234567", "12345a", "abcde-fghjk"]) {
      expect(altiHaneliMi(kod)).toBe(false);
    }
  });

  it("kurulum adresi uygulamaların beklediği biçimde, boşluk kodlanmış", () => {
    const adres = new URL(kurulumAdresiUret("GIZLI", "Deneme Mağaza", "a+b@ornek.test"));
    expect(adres.protocol).toBe("otpauth:");
    expect(adres.host).toBe("totp");
    expect(decodeURIComponent(adres.pathname)).toBe("/Deneme Mağaza:a+b@ornek.test");
    expect(adres.href).not.toContain("+");
    expect(Object.fromEntries(adres.searchParams)).toEqual({
      secret: "GIZLI",
      issuer: "Deneme Mağaza",
      algorithm: "SHA1",
      digits: "6",
      period: "30",
    });
  });
});

describe("gizlinin şifrelenmesi", () => {
  it("şifreli değer gizliyi taşımaz, açılınca aynısı çıkar, her seferinde farklıdır", () => {
    const gizli = ikiAsamaGizlisiUret();
    const sifreli = gizliyiSifrele(gizli, hesap);
    expect(sifreli).not.toContain(gizli);
    expect(gizliyiSifrele(gizli, hesap)).not.toBe(sifreli);
    expect(gizliyiCoz(sifreli, hesap)).toBe(gizli);
  });

  it("başka hesabın satırına taşınan, değiştirilen ya da başka anahtarla açılan değer açılmaz", () => {
    const sifreli = gizliyiSifrele(ikiAsamaGizlisiUret(), hesap);
    expect(() => gizliyiCoz(sifreli, "22222222-2222-4222-8222-222222222222")).toThrow();
    const parcalar = sifreli.split(".");
    const icerik = Buffer.from(parcalar[2] ?? "", "base64url");
    icerik[0] = (icerik[0] ?? 0) ^ 1;
    parcalar[2] = icerik.toString("base64url");
    expect(() => gizliyiCoz(parcalar.join("."), hesap)).toThrow();
    expect(() => gizliyiCoz("v1.bozuk", hesap)).toThrow();
    // Kısaltılmış kimlik etiketi kabul edilmez.
    const kisa = sifreli.split(".");
    kisa[3] = Buffer.from(kisa[3] ?? "", "base64url")
      .subarray(0, 4)
      .toString("base64url");
    expect(() => gizliyiCoz(kisa.join("."), hesap)).toThrow(/etiket/);
    vi.stubEnv("IKI_ASAMA_ANAHTARI", anahtar());
    expect(() => gizliyiCoz(sifreli, hesap)).toThrow();
  });

  it("anahtar yoksa ya da biçimi bozuksa şifrelemez", () => {
    vi.stubEnv("IKI_ASAMA_ANAHTARI", "");
    expect(() => gizliyiSifrele("GIZLI", hesap)).toThrow(/IKI_ASAMA_ANAHTARI/);
    vi.stubEnv("IKI_ASAMA_ANAHTARI", "kisa");
    expect(() => gizliyiSifrele("GIZLI", hesap)).toThrow(/IKI_ASAMA_ANAHTARI/);
  });
});

describe("yedek kodlar", () => {
  it("istenen sayıda, birbirinden farklı, karışan harfsiz üretilir", () => {
    const kodlar = yedekKodlariUret();
    expect(kodlar).toHaveLength(ikiAsamaAyari.yedekKodSayisi);
    expect(new Set(kodlar).size).toBe(kodlar.length);
    for (const kod of kodlar) expect(kod).toMatch(/^[a-hjkmnp-z2-9]{5}-[a-hjkmnp-z2-9]{5}$/);
  });

  it("yazılış farkları aynı özete düşer, başka kod başka özete", () => {
    expect(yedekKodOzeti("abcde-fghjk")).toBe(yedekKodOzeti("ABCDEFGHJK"));
    expect(yedekKodOzeti("abcde-fghjk")).not.toBe(yedekKodOzeti("abcde-fghjm"));
    expect(yedekKodOzeti("abcde-fghjk")).not.toContain("abcde");
    // Özet anahtarlıdır: veritabanı tek başına kodları çevrim dışı kırmaya yetmez.
    const ilk = yedekKodOzeti("abcde-fghjk");
    vi.stubEnv("IKI_ASAMA_ANAHTARI", anahtar());
    expect(yedekKodOzeti("abcde-fghjk")).not.toBe(ilk);
  });
});
