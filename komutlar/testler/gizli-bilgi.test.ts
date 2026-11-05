// Gizli bilgilerin sunucuda saklanmasının kuralları (kart 0019, karar 0031). Her kuralın bozuk
// bir örneği yakaladığı gösterilir.
import { describe, expect, it } from "vitest";
import {
  gizliKlasor,
  kutuGizliTanimi,
  kutuKullanicisi,
  sablonParcalari,
  silmeBetigi,
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
    expect(betik).toContain("= hayir ]");
    expect(uretmeBetigi("canli", "ornek-magaza", 1, { yenile: true })).toContain(
      "[ evet = hayir ]",
    );
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
  ])("%s yakalanır", (_ad, satir, beklenen) => {
    const hatalar = yerlesimHatalari([...dogru, satir], numaralar);
    expect(hatalar.join("\n")).toContain(beklenen);
  });
});
