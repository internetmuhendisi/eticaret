// Yayın komutunun karar kuralları ve sunucuda çalışan betikleri (kart 0021, karar 0035).
// Her kuralın bozuk bir örneği yakalanır.
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  denemeSatiri,
  onKapiTanimi,
  siteSatirlari,
  yayindakiSiteleriCoz,
  yayindakiSitelerKomutu,
} from "../on-kapi.mts";
import {
  etkinYigini,
  geriDonusHedefi,
  kayitlariCoz,
  kutuyuAcmaBetigi,
  kutuyuDurdurmaBetigi,
  saglikCoz,
  saglikHatasi,
  saklanacaklar,
  sonrakiNumara,
  type YayinKaydi,
  yayiniSilmeBetigi,
  yayinKutusuTanimi,
} from "../yayin.mts";
import { hatDosyasiAyniMi } from "../yayin-hazirligi.mts";

const kayit = (ek: Partial<YayinKaydi>): YayinKaydi => ({
  no: 1,
  tur: "yayin",
  etkin: 1,
  kayit: "a".repeat(40),
  surum: "0.1.0",
  goruntu: "sha256:1",
  zaman: "2026-11-05T10:00:00.000Z",
  sonuc: "basarili",
  degisiklikToplami: 1,
  degisiklikNotlari: ["geri alınabilir"],
  ...ek,
});

describe("trafiğin geçtiği yayınlar", () => {
  it("başarılı yayın üste eklenir, başarısız sayılmaz, geri dönüş üsttekini kaldırır", () => {
    const kayitlar = [
      kayit({ no: 1, etkin: 1 }),
      kayit({ no: 2, etkin: 2, sonuc: "basarisiz" }),
      kayit({ no: 3, etkin: 3 }),
      kayit({ no: 4, etkin: 4 }),
      kayit({ no: 5, tur: "geri-donus", etkin: 3 }),
    ];
    expect(etkinYigini(kayitlar)).toEqual([1, 3]);
    expect(sonrakiNumara(kayitlar)).toBe(6);
    expect(sonrakiNumara([])).toBe(1);
  });

  it("son üç yayın saklanır", () => {
    const kayitlar = [1, 2, 3, 4, 5].map((no) => kayit({ no, etkin: no }));
    expect(saklanacaklar(kayitlar)).toEqual([3, 4, 5]);
  });
});

describe("geri dönüşün hedefi", () => {
  it("bir önceki başarılı yayına döner", () => {
    const sonuc = geriDonusHedefi([kayit({ no: 1, etkin: 1 }), kayit({ no: 2, etkin: 2 })]);
    expect("hedef" in sonuc && sonuc.hedef.etkin).toBe(1);
    expect("etkin" in sonuc && sonuc.etkin).toBe(2);
  });

  it("art arda iki geri dönüş daha da geriye gider", () => {
    const kayitlar = [
      kayit({ no: 1, etkin: 1 }),
      kayit({ no: 2, etkin: 2 }),
      kayit({ no: 3, etkin: 3 }),
      kayit({ no: 4, tur: "geri-donus", etkin: 2 }),
    ];
    const sonuc = geriDonusHedefi(kayitlar);
    expect("hedef" in sonuc && sonuc.hedef.etkin).toBe(1);
  });

  it.each([
    ["hiç yayın yok", []],
    ["tek başarılı yayın", [kayit({ no: 1 })]],
    ["öncekisi başarısız", [kayit({ no: 1, sonuc: "basarisiz" }), kayit({ no: 2, etkin: 2 })]],
  ])("%s: dönülmez", (_ad, kayitlar) => {
    expect("engel" in geriDonusHedefi(kayitlar)).toBe(true);
  });

  it("aradaki değişiklik geri alınabilirse döner", () => {
    const sonuc = geriDonusHedefi([
      kayit({ no: 1, etkin: 1, degisiklikToplami: 1 }),
      kayit({
        no: 2,
        etkin: 2,
        degisiklikToplami: 2,
        degisiklikNotlari: ["geri alınabilir", "geri alınabilir"],
      }),
    ]);
    expect("hedef" in sonuc).toBe(true);
  });

  it.each([
    ["yedekten", "yedekten"],
    ["notsuz", "notsuz"],
  ] as const)("aradaki değişiklik %s ise dönülmez, yedek söylenir", (_ad, not) => {
    const sonuc = geriDonusHedefi([
      kayit({ no: 1, etkin: 1, degisiklikToplami: 1 }),
      kayit({ no: 2, etkin: 2, degisiklikToplami: 2, degisiklikNotlari: ["geri alınabilir", not] }),
    ]);
    expect("engel" in sonuc && sonuc.engel).toContain("yedekten");
  });

  it("başarısız bir yayının uyguladığı değişiklik de sayılır", () => {
    const sonuc = geriDonusHedefi([
      kayit({ no: 1, etkin: 1, degisiklikToplami: 1 }),
      kayit({ no: 2, etkin: 2, degisiklikToplami: 1 }),
      kayit({
        no: 3,
        etkin: 3,
        sonuc: "basarisiz",
        degisiklikToplami: 2,
        degisiklikNotlari: ["geri alınabilir", "yedekten"],
      }),
    ]);
    expect("engel" in sonuc).toBe(true);
  });

  it("bozuk kayıt satırı okunmaz", () => {
    expect(() => kayitlariCoz('{"no":1}\n{bozuk')).toThrow("2. satırı");
  });
});

describe("sağlık ucunun yanıtı", () => {
  const yanit = (veri: object) => JSON.stringify({ basarili: true, veri });
  it("doğru sürüm ve ayakta veritabanı geçer", () => {
    expect(
      saglikHatasi(saglikCoz(yanit({ cekirdekSurumu: "0.1.0", veritabani: "ayakta" })), "0.1.0"),
    ).toBeUndefined();
  });
  it.each([
    ["başka sürüm", yanit({ cekirdekSurumu: "0.2.0", veritabani: "ayakta" })],
    ["veritabanı yok", yanit({ cekirdekSurumu: "0.1.0", veritabani: "ulasilamiyor" })],
    ["boş yanıt", ""],
    ["bozuk yanıt", "<html>"],
  ])("%s kırmızıdır", (_ad, metin) => {
    expect(saglikHatasi(saglikCoz(metin), "0.1.0")).toBeDefined();
  });
});

describe("sunucudaki site kutusunun tanımı", () => {
  const tanim = yayinKutusuTanimi("deneme", "ornek-magaza", 1, 7);
  const kutu = tanim.services.uygulama;

  it("kendi kullanıcısıyla, kısıtlı, kendi ağında ve kendi yayınının klasörüyle çalışır", () => {
    expect(kutu.container_name).toBe("site-deneme-ornek-magaza-7");
    expect(kutu.image).toBe("altyapi-yayin:deneme-ornek-magaza-7");
    expect(kutu.user).toBe("30001:30001");
    expect(kutu.read_only).toBe(true);
    expect(kutu.cap_drop).toEqual(["ALL"]);
    expect(kutu.security_opt).toEqual(["no-new-privileges:true"]);
    expect(kutu.networks).toEqual(["site-deneme-ornek-magaza"]);
    expect(tanim.networks).toEqual({
      "site-deneme-ornek-magaza": { name: "site-deneme-ornek-magaza", external: true },
    });
    expect(kutu.volumes).toEqual([
      "/srv/altyapi/yayin/deneme/ornek-magaza/7/site:/siteler/ornek-magaza:ro",
    ]);
    expect("ports" in kutu).toBe(false);
  });

  it("gizli bilgiyi dosyadan alır, ortam değişkeninde değer yok", () => {
    expect(kutu.environment).toEqual({
      VERITABANI_ADRESI_DOSYASI: "/run/secrets/veritabani_adresi",
      SITE_KLASORU: "/siteler/ornek-magaza",
    });
    expect(Object.values(tanim.secrets)).toEqual([
      { file: "/srv/altyapi/gizli/deneme/ornek-magaza/veritabani_adresi" },
    ]);
  });

  it.each([0, -1, 1.5])("geçersiz yayın numarası reddedilir: %s", (no) => {
    expect(() => yayinKutusuTanimi("deneme", "ornek-magaza", 1, no)).toThrow();
  });
});

describe("ön kapı ve yayındaki siteler", () => {
  it("sunucudaki etkin dosyaları okunur", () => {
    expect(yayindakiSiteleriCoz("ornek-magaza 3\nyayin-deneme-a 12\n")).toEqual({
      "ornek-magaza": 3,
      "yayin-deneme-a": 12,
    });
    expect(yayindakiSiteleriCoz("")).toEqual({});
  });

  it.each(["ornek-magaza", "ornek-magaza 0", "Ornek 1", "a--b 1", "ornek-magaza 1 2"])(
    "bozuk satır reddedilir: %j",
    (satir) => {
      expect(() => yayindakiSiteleriCoz(satir)).toThrow();
    },
  );

  it("her yayındaki site için etkin kutuyu gösteren satır ve ağ", () => {
    expect(siteSatirlari({ "ornek-magaza": 3 })).toEqual({
      "ornek-magaza": denemeSatiri(
        "ornek-magaza.deneme.eticaretmagazasi.com",
        "site-deneme-ornek-magaza-3:3000",
      ),
    });
    const tanim = onKapiTanimi({ "ornek-magaza": 3 });
    expect(tanim.services.caddy.networks).toEqual({
      altyapi: { gw_priority: 100 },
      "site-deneme-ornek-magaza": {},
    });
    expect((tanim.networks as Record<string, unknown>)["site-deneme-ornek-magaza"]).toEqual({
      name: "site-deneme-ornek-magaza",
      external: true,
    });
    // Yoklama kutusu site ağlarına bağlanmaz.
    expect(tanim.services.yoklama.networks).toEqual(["altyapi"]);
  });

  it("yayın yoksa ön kapı yalnız ortak ağdadır", () => {
    expect(Object.keys(onKapiTanimi().networks)).toEqual(["altyapi"]);
  });
});

describe("sunucuda çalışan betikler", () => {
  const sozdizimi = (betik: string) =>
    spawnSync("bash", ["-n"], { input: betik, encoding: "utf8" });
  it.each([
    [
      "yeni kutuyu açma",
      kutuyuAcmaBetigi(
        "deneme",
        "ornek-magaza",
        2,
        yayinKutusuTanimi("deneme", "ornek-magaza", 1, 2),
        "sha256:abc",
      ),
    ],
    ["dönülen kutuyu açma", kutuyuAcmaBetigi("deneme", "ornek-magaza", 1)],
    ["durdurma", kutuyuDurdurmaBetigi("deneme", "ornek-magaza", 1)],
    ["silme", yayiniSilmeBetigi("deneme", "ornek-magaza", 1)],
    ["yayındaki siteler", yayindakiSitelerKomutu],
  ])("%s betiğinin sözdizimi geçerli", (_ad, betik) => {
    const sonuc = sozdizimi(betik);
    expect(sonuc.stderr).toBe("");
    expect(sonuc.status).toBe(0);
  });
});

describe("hat dosyası kilidi", () => {
  it("aynı kayıtta aynıdır", () => {
    expect(hatDosyasiAyniMi("HEAD", "HEAD")).toBe(true);
  });
  // Hattaki kopya geçmişsizdir; karşılaştırma geçmişe bağlı olmayan nesnelerle yapılır.
  it.each([
    ["hat dosyası olmayan klasör (git'in boş klasörü)", "4b825dc642cb6eb9a060e54bf8d69288fbee4904"],
    ["olmayan kayıt", "0".repeat(40)],
  ])("%s ile aynı değildir", (_ad, oteki) => {
    expect(hatDosyasiAyniMi("HEAD", oteki)).toBe(false);
    expect(hatDosyasiAyniMi(oteki, "HEAD")).toBe(false);
  });
});
