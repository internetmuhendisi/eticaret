// Yayın komutunun karar kuralları ve sunucuda çalışan betikleri (kart 0021, karar 0035).
// Her kuralın bozuk bir örneği yakalanır.
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { arkaPlanDosyalari } from "../../cekirdek/kayitlar/arka-plan.ts";
import {
  arkaPlanKutusuVarMi,
  arkaPlanSaglikYoklamasi,
  dosyaKlasoruVarMi,
} from "../kutu-kurali.mts";
import {
  onKapiTanimi,
  siteSatiri,
  siteSatirlari,
  yayindakiSiteleriCoz,
  yayindakiSitelerKomutu,
} from "../on-kapi.mts";
import {
  diskDolulugu,
  dosyaKlasoruHatalari,
  etkinYayinSurumu,
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
import { hatAyarKalibi, hatDosyasiAyniMi, korumaOzeti } from "../yayin-hazirligi.mts";
import { kutuyuDurdurmaBetigi as yedekteKutuyuDurdurmaBetigi } from "../yedek.mts";

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

  // Sunucu denetimi sağlık ucunu etkin yayının kaydındaki sürümle karşılaştırır (kart 0023).
  it("etkin yayının sürümü onu trafiğe veren son başarılı kayıttan okunur", () => {
    const kayitlar = [
      kayit({ no: 1, etkin: 1, surum: "0.1.0" }),
      kayit({ no: 2, etkin: 2, surum: "0.2.0", sonuc: "basarisiz" }),
      kayit({ no: 3, etkin: 3, surum: "0.2.0" }),
      kayit({ no: 4, tur: "geri-donus", etkin: 1, surum: "0.1.0" }),
    ];
    // Başarısız yayının sürümü sayılmaz; geri dönüşte dönülen yayının sürümü geçerlidir.
    expect(etkinYayinSurumu(kayitlar, 1)).toBe("0.1.0");
    expect(etkinYayinSurumu(kayitlar, 3)).toBe("0.2.0");
    expect(etkinYayinSurumu(kayitlar, 2)).toBeUndefined();
    expect(etkinYayinSurumu([], 1)).toBeUndefined();
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
      // Dosya klasörü (kart 0072): yayından bağımsız, yazılabilir.
      "/srv/altyapi/dosyalar/deneme/ornek-magaza:/dosyalar",
    ]);
    expect("ports" in kutu).toBe(false);
  });

  it("gizli bilgiyi dosyadan alır, ortam değişkeninde değer yok", () => {
    expect(kutu.environment).toEqual({
      VERITABANI_ADRESI_DOSYASI: "/run/secrets/veritabani_adresi",
      IKI_ASAMA_ANAHTARI_DOSYASI: "/run/secrets/iki_asama_anahtari",
      SITE_KLASORU: "/siteler/ornek-magaza",
      DOSYA_KLASORU: "/dosyalar",
      SITE_ORTAMI: "deneme",
    });
    expect(Object.values(tanim.secrets)).toEqual([
      { file: "/srv/altyapi/gizli/deneme/ornek-magaza/veritabani_adresi" },
      { file: "/srv/altyapi/gizli/deneme/ornek-magaza/iki_asama_anahtari" },
    ]);
  });

  it("arka plan kutusu aynı görüntü, kısıtlar ve gizli bilgilerle, yalnız adı, komutu ve yoklaması farklı", () => {
    const { container_name, command, healthcheck, ...kalani } = tanim.services["arka-plan"];
    const { container_name: _ad, healthcheck: siteYoklamasi, ...siteninKalani } = kutu;
    expect(container_name).toBe("site-deneme-ornek-magaza-7-arka-plan");
    expect(command).toEqual(["node", arkaPlanDosyalari.surec]);
    expect(healthcheck).toEqual(arkaPlanSaglikYoklamasi);
    expect(healthcheck).not.toEqual(siteYoklamasi);
    expect(kalani).toEqual(siteninKalani);
    expect("ports" in kalani).toBe(false);
  });

  it("geri yüklemede önce site, sonra arka plan kutusu durur", () => {
    const betik = yedekteKutuyuDurdurmaBetigi("site-deneme-x-3");
    const siteSirasi = betik.indexOf("docker stop --timeout 20 site-deneme-x-3 ");
    const arkaSirasi = betik.indexOf("docker stop --timeout 20 site-deneme-x-3-arka-plan");
    expect(siteSirasi).toBeGreaterThan(-1);
    expect(arkaSirasi).toBeGreaterThan(siteSirasi);
  });

  it("durdurma betiği iki kutuyu da kaldırır", () => {
    const betik = kutuyuDurdurmaBetigi("deneme", "ornek-magaza", 7);
    expect(betik).toContain("site-deneme-ornek-magaza-7 site-deneme-ornek-magaza-7-arka-plan");
  });

  it.each([
    ["0.8.1", false],
    ["0.6.1", false],
    ["0.9.0", true],
    ["0.10.0", true],
    ["1.0.0", true],
  ])("%s sürümünün arka plan kutusu beklenir: %s", (surum, beklenen) => {
    expect(arkaPlanKutusuVarMi(surum)).toBe(beklenen);
  });

  it.each([
    ["0.14.0", false],
    ["0.12.1", false],
    ["0.15.0", true],
    ["1.0.0", true],
  ])("%s sürümünün dosya klasörü beklenir: %s", (surum, beklenen) => {
    expect(dosyaKlasoruVarMi(surum)).toBe(beklenen);
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

  it("elle bakımdaki sitenin satırı bakımı, ötekinin satırı siteyi gösterir", () => {
    const satirlar = siteSatirlari(
      { "ornek-magaza": 3, "oteki-site": 2 },
      {},
      new Map([["ornek-magaza", "2026-11-06T10:00:00Z"]]),
    );
    expect(satirlar["ornek-magaza"]).toContain("error 503");
    expect(satirlar["oteki-site"]).not.toContain("error 503");
    expect(satirlar["oteki-site"]).toContain("health_uri");
  });

  it("her yayındaki site için etkin kutuyu gösteren satır ve ağ", () => {
    expect(siteSatirlari({ "ornek-magaza": 3 })).toEqual({
      "ornek-magaza": siteSatiri(
        "ornek-magaza.deneme.eticaretmagazasi.com",
        "site-deneme-ornek-magaza-3:3000",
        { ad: "ornek-magaza" },
      ),
    });
    const tanim = onKapiTanimi({ "ornek-magaza": 3 });
    expect(tanim.services.caddy.networks).toEqual({
      altyapi: { gw_priority: 100 },
      "altyapi-hata-izleme-deneme": {},
      "site-deneme-ornek-magaza": {},
    });
    expect((tanim.networks as Record<string, unknown>)["site-deneme-ornek-magaza"]).toEqual({
      name: "site-deneme-ornek-magaza",
      external: true,
    });
    // Yoklama kutusu site ağlarına bağlanmaz.
    expect(tanim.services.yoklama.networks).toEqual(["altyapi"]);
  });

  // Hata izleme ağı sitelerden ayrıdır; içinde yalnız ön kapı ve hata izleme kutusu durur (kart 0022).
  it("yayın yoksa ön kapı yalnız ortak ağda ve hata izleme ağındadır", () => {
    expect(Object.keys(onKapiTanimi().networks)).toEqual(["altyapi", "altyapi-hata-izleme-deneme"]);
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

describe("hat korumasının özeti", () => {
  const hat = "steps:\n  - run: pnpm birim-testleri\n  - run: pnpm denetim\n";
  const paket = (betikler: Record<string, string>) => JSON.stringify({ scripts: betikler });
  const asil = { "birim-testleri": "vitest run", denetim: "biome check", yayinla: "node a.mts" };
  const alt = { "cekirdek/uygulama/package.json": paket({ "tur-kontrolu": "tsc --noEmit" }) };
  const dosyalar: [string, string][] = [
    ["biome.json", "a"],
    ["cekirdek/uygulama/tsconfig.json", "b"],
  ];
  const ozet = korumaOzeti(hat, paket(asil), alt, dosyalar);

  it.each([
    [
      "hattın çağırdığı test betiği boşaltılırsa",
      () => korumaOzeti(hat, paket({ ...asil, "birim-testleri": "true" }), alt, dosyalar),
    ],
    [
      "hattın çağırdığı betik silinirse",
      () => korumaOzeti(hat, paket({ "birim-testleri": "vitest run" }), alt, dosyalar),
    ],
    [
      "bir alt paketin betiği boşaltılırsa",
      () =>
        korumaOzeti(
          hat,
          paket(asil),
          { "cekirdek/uygulama/package.json": paket({ "tur-kontrolu": "true" }) },
          dosyalar,
        ),
    ],
    [
      "bir ayar dosyası değişirse",
      () =>
        korumaOzeti(hat, paket(asil), alt, [["biome.json", "c"], dosyalar[1] as [string, string]]),
    ],
    [
      "alt klasöre yeni bir ayar dosyası eklenirse",
      () => korumaOzeti(hat, paket(asil), alt, [...dosyalar, ["bilesenler/biome.json", "d"]]),
    ],
    [
      "hat dosyasındaki çağrı değişirse",
      () => korumaOzeti("steps:\n  - run: pnpm denetim\n", paket(asil), alt, dosyalar),
    ],
  ])("%s özet değişir", (_ad, yeni) => {
    expect(yeni()).not.toBe(ozet);
  });

  it("hattın çağırmadığı kök betik eklenir ya da değişirse özet değişmez", () => {
    expect(
      korumaOzeti(hat, paket({ ...asil, yayinla: "node b.mts", yeni: "x" }), alt, dosyalar),
    ).toBe(ozet);
  });

  it("dosyaların sırası özeti değiştirmez", () => {
    expect(korumaOzeti(hat, paket(asil), alt, [...dosyalar].reverse())).toBe(ozet);
  });

  it.each([
    [".github/workflows/kontrol-hatti.yml", true],
    ["biome.json", true],
    ["bilesenler/biome.json", true],
    ["cekirdek/uygulama/tsconfig.json", true],
    ["tsconfig.temel.json", true],
    ["vitest.config.ts", true],
    ["playwright.config.ts", true],
    ["playwright.hiz.config.ts", true],
    ["playwright.config.yedek", false],
    ["denetim/kurallar/ham-renk.grit", true],
    ["pnpm-workspace.yaml", true],
    [".npmrc", true],
    ["cekirdek/uygulama/.npmrc", true],
    ["komutlar/yayin.mts", false],
    ["cekirdek/testler/veri-ayrimi.test.ts", false],
  ])("%s korumada mı: %s", (yol, beklenen) => {
    expect(hatAyarKalibi.test(yol)).toBe(beklenen);
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

describe("dosya klasörü (kart 0072)", () => {
  const klasor = "/srv/altyapi/dosyalar/deneme/ornek-magaza";
  const baglanti = (ek: Record<string, unknown> = {}) =>
    JSON.stringify([
      { Source: "/srv/altyapi/yayin/x", Destination: "/siteler/ornek-magaza", RW: false },
      { Source: klasor, Destination: "/dosyalar", RW: true, ...ek },
    ]);

  it("kutuyu açma betiği klasörü yayının kullanıcısına 0700 kurar, içeriğe dokunmaz", () => {
    const betik = kutuyuAcmaBetigi(
      "deneme",
      "ornek-magaza",
      2,
      yayinKutusuTanimi("deneme", "ornek-magaza", 1, 2),
      "sha256:abc",
    );
    expect(betik).toContain(`sudo install -d -m 0700 -o 30001 -g 30001 ${klasor}\n`);
    expect(betik.indexOf("install -d -m 0700")).toBeLessThan(betik.indexOf("docker compose"));
    expect(betik).not.toMatch(/chown -R|chmod -R|rm -rf \/srv\/altyapi\/dosyalar/);
  });

  it("geri dönüşte klasöre dokunulmaz", () => {
    expect(kutuyuAcmaBetigi("deneme", "ornek-magaza", 1)).not.toContain("dosyalar");
  });

  it("doğru klasör geçer", () => {
    expect(dosyaKlasoruHatalari("700 30001 directory\n", baglanti(), 30001, klasor)).toEqual([]);
  });

  it.each([
    ["herkese açık", "755 30001 directory", baglanti(), "izin 755"],
    ["başka sahip", "700 30002 directory", baglanti(), "sahibi 30002"],
    ["kök sahip", "700 0 directory", baglanti(), "sahibi 0"],
    ["klasör yok", "", baglanti(), "klasör yok"],
    ["dosya", "700 30001 regular file", baglanti(), "klasör değil"],
    ["bağlı değil", "700 30001 directory", "[]", "bağlı değil"],
    ["başka klasör bağlı", "700 30001 directory", baglanti({ Source: "/tmp/x" }), "başka klasöre"],
    ["salt okunur bağlı", "700 30001 directory", baglanti({ RW: false }), "yazılamaz"],
    ["okunamayan bağlantı", "700 30001 directory", "", "okunamadı"],
  ])("%s kırmızıdır", (_ad, stat, baglantilar, beklenen) => {
    const hatalar = dosyaKlasoruHatalari(stat, baglantilar, 30001, klasor);
    expect(hatalar.join("; ")).toContain(beklenen);
  });

  it("disk doluluğu df çıktısından okunur", () => {
    const df =
      "Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/sda1 78425224 30000000 45000000 41% /\n";
    expect(diskDolulugu(df)).toBe(41);
    expect(diskDolulugu("")).toBeUndefined();
    expect(diskDolulugu("bozuk satır")).toBeUndefined();
  });
});
