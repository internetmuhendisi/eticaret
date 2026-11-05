// Gizli bilgilerin sunucuda saklanmasının kuralları (kart 0019, karar 0031). Her kuralın bozuk
// bir örneği yakaladığı gösterilir.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  denemeSiteNumarasi,
  gizliKlasor,
  kayittaAramaKomutu,
  kutuGizliTanimi,
  kutuKullanicisi,
  sablonParcalari,
  silmeBetigi,
  siteNumaralariHatalari,
  siteNumaralariniOku,
  uretmeBetigi,
  yerlesimHatalari,
} from "../gizli-bilgi.mts";

describe("kutu kullanıcıları", () => {
  it("her site her ortamda ayrı numarayla çalışır", () => {
    const numaralar = [
      kutuKullanicisi("canli", 1),
      kutuKullanicisi("canli", 2),
      kutuKullanicisi("deneme", 1),
      kutuKullanicisi("deneme", 2),
    ];
    expect(new Set(numaralar).size).toBe(4);
    expect(numaralar.every((n) => n >= 20000)).toBe(true);
  });

  it.each([0, -1, 1.5, 10000])("geçersiz site numarasını reddeder: %s", (numara) => {
    expect(() => kutuKullanicisi("canli", numara)).toThrow();
  });
});

describe("üretme betiği", () => {
  const betik = uretmeBetigi("canli", "ornek-magaza", 1);

  it("sitenin klasörünü ve kullanıcısını kullanır", () => {
    expect(betik).toContain("/srv/altyapi/gizli/canli/ornek-magaza/veritabani_adresi");
    expect(betik).toContain("chown 20001:20001");
    expect(betik).toContain("chmod 0400");
  });

  it("değer taşımaz: değer sunucuda üretilir", () => {
    expect(betik).toContain("openssl rand -hex 32");
    expect(betik).not.toMatch(/[0-9a-f]{32}/);
  });

  it("var olanı yenilemez, yenile ile yeniler", () => {
    expect(betik).toContain("[ hayir = evet ]");
    expect(uretmeBetigi("canli", "ornek-magaza", 1, { yenile: true })).toContain("[ evet = evet ]");
  });

  it("dosyanın durumu okunamazsa hiçbir şeye dokunmadan durur", () => {
    expect(betik).toContain('case "$durum" in var|yok) ;; *)');
    const durum = betik.indexOf("durum=$(");
    const yazma = betik.indexOf("openssl rand");
    expect(durum).toBeGreaterThan(-1);
    expect(durum).toBeLessThan(yazma);
  });

  it("önce bütün değerleri hazırlar, sonra hepsini yerine koyar", () => {
    const sonUretim = betik.lastIndexOf("openssl rand");
    const ilkYerineKoyma = betik.indexOf("sudo mv -f");
    expect(sonUretim).toBeGreaterThan(-1);
    expect(ilkYerineKoyma).toBeGreaterThan(sonUretim);
  });

  it.each(["../oteki", "a;rm", "A", "a b", "a/b", "$(id)"])(
    "kod adına kabuk ya da yol parçası sokulamaz: %s",
    (kodAdi) => {
      expect(() => uretmeBetigi("canli", kodAdi, 1)).toThrow("Geçersiz kod adı");
      expect(() => silmeBetigi("canli", kodAdi)).toThrow("Geçersiz kod adı");
      expect(() => gizliKlasor("canli", kodAdi)).toThrow("Geçersiz kod adı");
    },
  );

  it("şablonu sitenin adlarıyla doldurur, {rastgele}'yi ayırır", () => {
    expect(sablonParcalari("VERITABANI_ADRESI", "ornek-magaza")).toEqual([
      "postgres://site_ornek_magaza:",
      "@veritabani:5432/site_ornek_magaza",
    ]);
  });
});

describe("site numaraları", () => {
  it("kayıttaki dosya geçerli", () => {
    expect(() => siteNumaralariniOku()).not.toThrow();
    expect(Object.values(siteNumaralariniOku())).not.toContain(denemeSiteNumarasi);
  });

  it("geçerli numaralar geçer", () => {
    expect(siteNumaralariHatalari({ "ornek-magaza": 1, oteki: 2 })).toEqual([]);
  });

  it.each([
    ["aynı numara iki sitede", { a: 1, b: 1 }, "aynı numarayı"],
    ["deneme sitesine ayrılmış numara", { a: denemeSiteNumarasi }, "geçersiz numara"],
    ["sıfır", { a: 0 }, "geçersiz numara"],
    ["kesirli", { a: 1.5 }, "geçersiz numara"],
    ["metin", { a: "1" }, "geçersiz numara"],
    ["geçersiz kod adı", { "Kotu Ad": 1 }, "geçersiz kod adı"],
    ["liste", [1, 2], "nesne olmalı"],
  ])("%s yakalanır", (_ad, numaralar, beklenen) => {
    expect(siteNumaralariHatalari(numaralar).join("\n")).toContain(beklenen);
  });
});

describe("kutunun gizli bilgi tanımı", () => {
  const tanim = kutuGizliTanimi("canli", "ornek-magaza", 1);

  it("yalnız kendi dosyasını, kendi kullanıcısıyla bağlar", () => {
    expect(tanim.servis.user).toBe("20001:20001");
    expect(Object.values(tanim.gizliler)).toEqual([
      { file: "/srv/altyapi/gizli/canli/ornek-magaza/veritabani_adresi" },
    ]);
    expect(tanim.servis.environment).toEqual({
      VERITABANI_ADRESI_DOSYASI: "/run/secrets/veritabani_adresi",
    });
  });

  it("değeri ortam değişkenine koymaz", () => {
    expect(Object.keys(tanim.servis.environment)).not.toContain("VERITABANI_ADRESI");
  });

  it("iki sitenin ve iki ortamın tanımı çakışmaz", () => {
    const adlar = [
      ...Object.keys(tanim.gizliler),
      ...Object.keys(kutuGizliTanimi("deneme", "ornek-magaza", 1).gizliler),
      ...Object.keys(kutuGizliTanimi("canli", "oteki", 2).gizliler),
    ];
    expect(new Set(adlar).size).toBe(adlar.length);
  });
});

// Sunucuda çalışan arama komutunun aynısı, sudo'suz ve geçici bir klasörde çalıştırılır.
// Değerler bu testte üretilen uydurma rastgele değerlerdir.
describe("kayıtta arama", () => {
  const kok = mkdtempSync(join(tmpdir(), "gizli-arama-"));
  const degerler = [randomBytes(32).toString("hex"), randomBytes(32).toString("hex")];
  degerler.forEach((deger, i) => {
    mkdirSync(join(kok, "canli", `site-${i}`), { recursive: true });
    writeFileSync(join(kok, "canli", `site-${i}`, "veritabani_adresi"), `on-${deger}-son`);
  });
  afterAll(() => rmSync(kok, { recursive: true }));
  const ara = (girdi: string) =>
    spawnSync("bash", ["-c", kayittaAramaKomutu(kok, "")], {
      input: girdi,
      encoding: "utf8",
    }).stdout.trim();
  const ilk = degerler[0] as string;

  it("değerleri ve parçaları sayar, değer taşımayan girdide eşleşme yok", () => {
    expect(ara("hicbir-sey")).toBe("deger=2 parca=98 eslesme=0");
  });

  it.each([
    ["değerin tamamı", ilk],
    ["büyük harfe çevrilmiş", ilk.toUpperCase()],
    ["sınıra oturmayan 26 haneli parça", ilk.slice(5, 31)],
    ["tam 16 haneli parça", ilk.slice(40, 56)],
    ["başka metnin içinde", `kayit: x${ilk.slice(10, 30)}y`],
  ])("%s yakalanır", (_ad, girdi) => {
    expect(ara(girdi)).toBe("deger=2 parca=98 eslesme=1");
  });

  it("16 haneden kısa parça yakalanmaz (bilinen sınır)", () => {
    expect(ara(ilk.slice(40, 55))).toBe("deger=2 parca=98 eslesme=0");
  });
});

describe("sunucudaki yerleşimin denetimi", () => {
  const numaralar = { "ornek-magaza": 1 };
  const dogru = [
    "d 700 0 /srv/altyapi/gizli",
    "d 700 0 /srv/altyapi/gizli/canli",
    "d 700 0 /srv/altyapi/gizli/canli/ornek-magaza",
    "f 400 20001 /srv/altyapi/gizli/canli/ornek-magaza/veritabani_adresi",
    "d 700 0 /srv/altyapi/gizli/deneme",
    "d 700 0 /srv/altyapi/gizli/deneme/ornek-magaza",
    "f 400 30001 /srv/altyapi/gizli/deneme/ornek-magaza/veritabani_adresi",
  ];

  it("doğru yerleşim geçer", () => {
    expect(yerlesimHatalari(dogru, numaralar)).toEqual([]);
  });

  it.each([
    ["herkese açık klasör", "d 755 0 /srv/altyapi/gizli/canli", "klasör 755 0"],
    ["başka kullanıcının klasörü", "d 700 1000 /srv/altyapi/gizli/canli", "klasör 700 1000"],
    [
      "okunabilir dosya",
      "f 444 20001 /srv/altyapi/gizli/canli/ornek-magaza/veritabani_adresi",
      "dosya 444",
    ],
    [
      "başka sitenin kullanıcısı",
      "f 400 20002 /srv/altyapi/gizli/canli/ornek-magaza/veritabani_adresi",
      "beklenen 400 20001",
    ],
    [
      "deneme kullanıcısı canlıda",
      "f 400 30001 /srv/altyapi/gizli/canli/ornek-magaza/veritabani_adresi",
      "beklenen 400 20001",
    ],
    ["numarası olmayan site", "d 700 0 /srv/altyapi/gizli/canli/yabanci", "numarası olmayan site"],
    ["bilinmeyen ortam", "d 700 0 /srv/altyapi/gizli/gelistirme", "bilinmeyen ortam"],
    [
      "kayıtta olmayan dosya",
      "f 400 20001 /srv/altyapi/gizli/canli/ornek-magaza/yedek",
      "kayıtta olmayan",
    ],
    [
      "yarım kalmış geçici dosya",
      "f 400 20001 /srv/altyapi/gizli/canli/ornek-magaza/.veritabani_adresi.yeni",
      "kayıtta olmayan",
    ],
    ["yanlış yerdeki dosya", "f 400 0 /srv/altyapi/gizli/canli/sifre", "beklenmeyen dosya"],
    [
      "geride kalmış deneme dosyası",
      "f 600 0 /srv/altyapi/gizli/.deneme.AbC123",
      "beklenmeyen dosya",
    ],
    [
      "adında boşluk olan dosya",
      "f 400 20001 /srv/altyapi/gizli/canli/ornek-magaza/veritabani adresi",
      "kayıtta olmayan",
    ],
  ])("%s yakalanır", (_ad, satir, beklenen) => {
    const hatalar = yerlesimHatalari([...dogru, satir], numaralar);
    expect(hatalar.join("\n")).toContain(beklenen);
  });
});
