// Kuruluş tarifinin kuralları (kart 0343). Var olan iki site tariften yeniden üretilir: girdileri
// aşağıda elle yazılıdır, beklenen sunucu kayıtları 2026-11-28'de Örnek Mağaza'nın sunucusunda ölçülen
// düzendir (yol, sahip, izin). Bir alan klasörde değişip girdide değişmezse ya da tarif başka bir şey
// üretirse kırmızıdır.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type Adim,
  girdiHatalari,
  type KurulusGirdisi,
  kayitHatalari,
  kayitOlcumBetigi,
  kodAdiKullanimHatalari,
  kuruCalistir,
  kurulusAdimlari,
  projedekiKodAdlari,
  siteKlasoruParcalari,
  sunucuKayitlari,
  tarifHatalari,
} from "../kurulus-tarifi.mts";
import { kok } from "../sunucu.mts";

const dosya = (site: string, ad: string): unknown =>
  JSON.parse(readFileSync(join(kok, "siteler", site, ad), "utf8"));

// Çekirdek sürümü her sürüm artışında değiştiği için kimlikten okunur; geri kalan her değer elle yazılıdır.
const surum = (site: string) =>
  (dosya(site, "kimlik.json") as { cekirdekSurumu: string }).cekirdekSurumu;

const ornekMagaza: KurulusGirdisi = {
  kodAdi: "ornek-magaza",
  gorunenAd: "Örnek Mağaza",
  tur: "demo",
  cekirdekSurumu: surum("ornek-magaza"),
  ayarlar: {
    paraBirimi: "TRY",
    siparisOneki: "ORN",
    epostaGonderenAdresi: "ornek-magaza@posta.eticaretmagazasi.com",
    yakindaYazisi: true,
    temalar: ["canli-carsi", "yumusak-mevsim", "keskin-cizgi"],
    eklentiler: ["stoga-gelince-haber-ver", "kartla-odeme", "excel-ile-toplu-urun-islemleri"],
  },
};

const temaGalerisi: KurulusGirdisi = {
  kodAdi: "tema-galerisi",
  gorunenAd: "Tema Galerisi",
  tur: "demo",
  cekirdekSurumu: surum("tema-galerisi"),
  ayarlar: {
    paraBirimi: "TRY",
    siparisOneki: "TGL",
    temalar: ["canli-carsi", "yumusak-mevsim", "keskin-cizgi"],
    temaDemosu: true,
  },
};

// 2026-11-28, sunucu altyapi-1: stat ve docker/psql listeleriyle ölçüldü.
const olculenKayitlar = [
  { tur: "klasor", yol: "/srv/altyapi/gizli/deneme/ornek-magaza", sahip: 0, izin: "700" },
  {
    tur: "dosya",
    yol: "/srv/altyapi/gizli/deneme/ornek-magaza/veritabani_adresi",
    sahip: 30001,
    izin: "400",
  },
  {
    tur: "dosya",
    yol: "/srv/altyapi/gizli/deneme/ornek-magaza/iki_asama_anahtari",
    sahip: 30001,
    izin: "400",
  },
  { tur: "veritabani", ad: "site_ornek_magaza" },
  { tur: "rol", ad: "site_ornek_magaza" },
  { tur: "ag", ad: "site-deneme-ornek-magaza" },
  { tur: "klasor", yol: "/srv/altyapi/yayin/deneme/ornek-magaza", sahip: 0, izin: "755" },
  {
    tur: "dosya",
    yol: "/srv/altyapi/yayin/deneme/ornek-magaza/kayit.jsonl",
    sahip: 0,
    izin: "644",
  },
  { tur: "klasor", yol: "/srv/altyapi/dosyalar/deneme/ornek-magaza", sahip: 30001, izin: "700" },
  {
    tur: "dosya",
    yol: "/srv/altyapi/on-kapi/caddy/siteler/ornek-magaza.caddy",
    sahip: 0,
    izin: "644",
  },
  { tur: "dosya", yol: "/srv/altyapi/yayin/deneme/ornek-magaza/etkin", sahip: 0, izin: "644" },
  { tur: "dosya", yol: "/srv/altyapi/yedek/siteler/deneme/ornek-magaza", sahip: 0, izin: "400" },
];

const kuransiz = <T extends { kuran: unknown }>(kayitlar: T[]) =>
  kayitlar.map(({ kuran: _kuran, ...kalan }) => kalan);

describe("var olan siteler tariften yeniden üretilir", () => {
  it("Örnek Mağaza: kimlik, ayarlar, numara ve sunucu kayıtları bugünküyle aynı", () => {
    const { numaralar } = projedekiKodAdlari();
    const sonuc = kuruCalistir(ornekMagaza, "deneme", numaralar);
    expect(sonuc.dosyalar["kimlik.json"]).toEqual(dosya("ornek-magaza", "kimlik.json"));
    expect(sonuc.dosyalar["ayarlar.json"]).toEqual(dosya("ornek-magaza", "ayarlar.json"));
    expect(sonuc.numara).toBe(1);
    expect(kuransiz(sonuc.kayitlar)).toEqual(expect.arrayContaining(olculenKayitlar));
    expect(sonuc.kayitlar).toHaveLength(olculenKayitlar.length);
  });

  it("Tema Galerisi: kimlik ve ayarlar aynı; numarası yok, sıradaki numarayı alır", () => {
    const { numaralar } = projedekiKodAdlari();
    const sonuc = kuruCalistir(temaGalerisi, "deneme", numaralar);
    expect(sonuc.dosyalar["kimlik.json"]).toEqual(dosya("tema-galerisi", "kimlik.json"));
    expect(sonuc.dosyalar["ayarlar.json"]).toEqual(dosya("tema-galerisi", "ayarlar.json"));
    // Numaralar dosyasında yalnız Örnek Mağaza (1) var.
    expect(numaralar).toEqual({ "ornek-magaza": 1 });
    expect(sonuc.numara).toBe(2);
  });

  it("iki sitenin zorunlu parçaları klasörde var", () => {
    for (const site of ["ornek-magaza", "tema-galerisi"]) {
      for (const parca of siteKlasoruParcalari.filter((p) => p.zorunlu)) {
        expect(() => readFileSync(join(kok, "siteler", site, parca.yol))).not.toThrow();
      }
    }
  });

  it("girdideki bir fark kırmızıdır: başka ayar, başka tür, başka ad", () => {
    const { numaralar } = projedekiKodAdlari();
    const bozuklar: KurulusGirdisi[] = [
      { ...ornekMagaza, ayarlar: { ...ornekMagaza.ayarlar, siparisOneki: "ORM" } },
      { ...ornekMagaza, tur: "gercek" },
      { ...ornekMagaza, gorunenAd: "Ornek Magaza" },
    ];
    for (const girdi of bozuklar) {
      const sonuc = kuruCalistir(girdi, "deneme", numaralar);
      expect([sonuc.dosyalar["kimlik.json"], sonuc.dosyalar["ayarlar.json"]]).not.toEqual([
        dosya("ornek-magaza", "kimlik.json"),
        dosya("ornek-magaza", "ayarlar.json"),
      ]);
    }
  });
});

describe("girdi", () => {
  it("şemaya uymayan girdi hiçbir şey üretmez", () => {
    const bozuklar: [KurulusGirdisi, string][] = [
      [{ ...ornekMagaza, kodAdi: "Örnek" }, "kimlik: kodAdi"],
      [{ ...ornekMagaza, kodAdi: "a--b" }, "kimlik: kodAdi"],
      [{ ...ornekMagaza, cekirdekSurumu: "1.0" }, "kimlik: cekirdekSurumu"],
      [
        { ...ornekMagaza, ayarlar: { ...ornekMagaza.ayarlar, siparisOneki: "orn" } },
        "ayarlar: siparisOneki",
      ],
      [{ ...ornekMagaza, ayarlar: { ...ornekMagaza.ayarlar, bilinmeyen: 1 } }, "ayarlar"],
      // Mağaza sahibinin ayarı ayarlar.json'a yazılmaz (baslangic/ayarlar.json'dadır).
      [{ ...ornekMagaza, ayarlar: { ...ornekMagaza.ayarlar, kargoUcreti: 100 } }, "ayarlar"],
      // Varsayılanıyla aynı değer yazılmaz.
      [
        { ...ornekMagaza, ayarlar: { ...ornekMagaza.ayarlar, siparisBaslangici: 1001 } },
        "ayarlar: siparisBaslangici: varsayılanıyla aynı",
      ],
      [
        { ...ornekMagaza, ayarlar: { ...ornekMagaza.ayarlar, yakindaYazisi: false } },
        "ayarlar: yakindaYazisi: varsayılanıyla aynı",
      ],
    ];
    for (const [girdi, beklenen] of bozuklar) {
      expect(girdiHatalari(girdi).join("\n")).toContain(beklenen);
      expect(() => kuruCalistir(girdi, "deneme", {})).toThrow("Girdi geçersiz");
    }
  });

  it("gerçek mağazanın teslim adımları bekler, demonunki gerekmez", () => {
    const gercek = kuruCalistir(
      { ...ornekMagaza, kodAdi: "yeni-magaza", tur: "gercek" },
      "deneme",
      {},
    );
    expect(gercek.dosyalar["kimlik.json"]).toMatchObject({
      teslimDurumu: { magazaSahibiHesabi: "bekliyor", yurtDisiAktarimBelgeleri: "bekliyor" },
      adresler: { deneme: "https://yeni-magaza.deneme.eticaretmagazasi.com" },
    });
    expect(gercek.numara).toBe(1);
  });
});

describe("kod adı", () => {
  const proje = {
    siteler: ["ornek-magaza", "eski-klasor"],
    numaralar: { "ornek-magaza": 1, silinen: 2 },
  };

  it("klasörde, numara dosyasında ya da ikisinde birden olan ad kullanılmış sayılır", () => {
    expect(kodAdiKullanimHatalari("ornek-magaza", proje)).toHaveLength(2);
    expect(kodAdiKullanimHatalari("eski-klasor", proje)).toEqual([
      "siteler/eski-klasor klasörü var",
    ]);
    expect(kodAdiKullanimHatalari("silinen", proje)[0]).toContain("site numaraları dosyasında var");
    expect(kodAdiKullanimHatalari("seramik", proje)).toEqual([]);
  });

  it("geçersiz ad ve ayrılmış iki tireli adlar reddedilir", () => {
    for (const ad of ["kapi--yoklama", "altyapi--hata", "Seramik", "-a", ""]) {
      expect(kodAdiKullanimHatalari(ad, proje)[0]).toContain("geçersiz kod adı");
    }
  });

  it("projedeki gerçek adlar okunur", () => {
    const gercek = projedekiKodAdlari();
    expect(gercek.siteler).toEqual(expect.arrayContaining(["ornek-magaza", "tema-galerisi"]));
    expect(gercek.numaralar["ornek-magaza"]).toBe(1);
    expect(kodAdiKullanimHatalari("tema-galerisi", gercek)).toEqual([
      "siteler/tema-galerisi klasörü var",
    ]);
  });
});

describe("adımlar", () => {
  it("tarif tutarlı", () => {
    expect(tarifHatalari()).toEqual([]);
  });

  it("bozuk tarif yakalanır: tekrar, sıra, nedensiz adım, kayıtların kuranı", () => {
    const adim = (kod: string, oncekiler: string[] = [], ek: Partial<Adim> = {}): Adim =>
      ({
        kod,
        ad: kod,
        komut: "x",
        yer: "bilgisayar",
        geriAlinamaz: false,
        oncekiler,
        denetim: "",
        geriAlis: "",
        ...ek,
      }) as Adim;
    const tekrar = [...kurulusAdimlari, adim("yayin")];
    expect(tarifHatalari(tekrar)).toContain("yayin iki kez");
    const sira = [
      adim("numara", ["kod-adi"]),
      ...kurulusAdimlari.filter((a) => a.kod !== "numara"),
    ];
    expect(tarifHatalari(sira)).toContain("numara: kod-adi kendisinden önce değil");
    const nedensiz = kurulusAdimlari.map((a): Adim => {
      if (a.kod !== "numara") return a;
      const { komut: _komut, elle: _elle, ...kalan } = a;
      return kalan;
    });
    expect(tarifHatalari(nedensiz)).toContain("numara: ne komutu ne elle nedeni var");
    const yayinsiz = kurulusAdimlari.filter((a) => a.kod !== "yayin");
    expect(tarifHatalari(yayinsiz).some((h) => h.includes("kuran yayin tarifte yok"))).toBe(true);
  });

  it("numara site klasöründen önce, yayın kayıttan sonra, yedek yayından sonra", () => {
    const sira = kurulusAdimlari.map((a) => a.kod);
    expect(sira.indexOf("numara")).toBeLessThan(sira.indexOf("site-klasoru"));
    expect(sira.indexOf("kayit-ve-hat")).toBeLessThan(sira.indexOf("yayin"));
    expect(sira.indexOf("yayin")).toBeLessThan(sira.indexOf("yedek"));
    expect(kurulusAdimlari.find((a) => a.kod === "kayit-ve-hat")?.geriAlinamaz).toBe(true);
    expect(kurulusAdimlari.find((a) => a.kod === "yedek")?.geriAlinamaz).toBe(true);
  });

  it("öteki kayıtların da kuranı tarifte", () => {
    const yedeksiz = kurulusAdimlari.filter((a) => a.kod !== "yedek");
    const hatalar = tarifHatalari(yedeksiz);
    expect(
      hatalar.some((h) => h.includes("sunucu/yedek/ayar.json") && h.includes("kuran yedek")),
    ).toBe(true);
    expect(
      hatalar.some((h) => h.includes("/srv/altyapi/yedek/siteler") && h.includes("kuran yedek")),
    ).toBe(true);
  });
});

describe("sunucu kayıtlarının ölçümü", () => {
  const kayitlar = sunucuKayitlari("deneme", "ornek-magaza", 1);
  // Tarifin beklediği çıktı, ölçülen düzenden yazılır.
  const dogru = olculenKayitlar
    .map((k) => {
      const sira = kayitlar.findIndex(
        (t) => t.tur === k.tur && ("yol" in t ? t.yol : t.ad) === ("yol" in k ? k.yol : k.ad),
      );
      const sonuc =
        k.tur === "klasor"
          ? `${k.sahip} ${k.izin} directory`
          : k.tur === "dosya"
            ? `${k.sahip} ${k.izin} regular file`
            : "var";
      return `K${sira} ${sonuc}`;
    })
    .join("\n");

  it("ölçülen düzen hatasız", () => {
    expect(kayitHatalari(kayitlar, dogru)).toEqual([]);
  });

  it("eksik kayıt, yanlış sahip, yanlış izin, yanlış tür ve gelmeyen satır yakalanır", () => {
    const degistir = (eski: string, yeni: string) => dogru.replace(eski, yeni);
    const gizli = kayitlar.findIndex((k) => "yol" in k && k.yol.endsWith("/veritabani_adresi"));
    const dosyaKlasoru = kayitlar.findIndex((k) => "yol" in k && k.yol.includes("/dosyalar/"));
    const ag = kayitlar.findIndex((k) => k.tur === "ag");
    expect(
      kayitHatalari(kayitlar, degistir(`K${gizli} 30001 400 regular file`, `K${gizli} yok`)),
    ).toEqual(["/srv/altyapi/gizli/deneme/ornek-magaza/veritabani_adresi yok"]);
    expect(
      kayitHatalari(kayitlar, degistir(`K${gizli} 30001 400`, `K${gizli} 30002 400`))[0],
    ).toContain("beklenen 30001 400 regular file");
    expect(
      kayitHatalari(
        kayitlar,
        degistir(`K${dosyaKlasoru} 30001 700`, `K${dosyaKlasoru} 30001 755`),
      )[0],
    ).toContain("beklenen 30001 700 directory");
    expect(
      kayitHatalari(
        kayitlar,
        degistir(`K${dosyaKlasoru} 30001 700 directory`, `K${dosyaKlasoru} 30001 700 regular file`),
      ),
    ).toHaveLength(1);
    expect(kayitHatalari(kayitlar, degistir(`K${ag} var`, `K${ag} yok`))).toEqual([
      "site-deneme-ornek-magaza yok",
    ]);
    expect(kayitHatalari(kayitlar, degistir(`K${ag} var\n`, ""))).toEqual([
      "site-deneme-ornek-magaza: ölçülemedi",
    ]);
    expect(kayitHatalari(kayitlar, "")).toHaveLength(kayitlar.length);
    const veritabani = kayitlar.findIndex((k) => k.tur === "veritabani");
    expect(
      kayitHatalari(kayitlar, degistir(`K${veritabani} var`, `K${veritabani} olculemedi`)),
    ).toEqual(["site_ornek_magaza: ölçülemedi"]);
    const satir = kayitlar.findIndex((k) => "yol" in k && k.yol.endsWith(".caddy"));
    expect(
      kayitHatalari(
        kayitlar,
        degistir(`K${satir} 0 644 regular file`, `K${satir} 0 644 regular empty file`),
      ),
    ).toEqual(["/srv/altyapi/on-kapi/caddy/siteler/ornek-magaza.caddy boş"]);
  });

  it("dosya klasörü yalnız istenince beklenir (0.15.0'dan eski yayın)", () => {
    const eski = sunucuKayitlari("deneme", "ornek-magaza", 1, { dosyaKlasoru: false });
    expect(eski).toHaveLength(kayitlar.length - 1);
    expect(eski.some((k) => "yol" in k && k.yol.includes("/dosyalar/"))).toBe(false);
  });

  it("betik her kayıt için bir satır basar, betiğe girmeyecek adı reddeder", () => {
    const betik = kayitOlcumBetigi("deneme", kayitlar);
    const satirlar = betik.split("\n");
    expect(satirlar).toHaveLength(kayitlar.length);
    kayitlar.forEach((kayit, sira) => {
      const s = satirlar[sira] ?? "";
      expect(s.startsWith(`echo "K${sira} `)).toBe(true);
      if ("yol" in kayit) {
        expect(s).toContain(`sudo stat -c '%u %a %F' ${kayit.yol} `);
      } else if (kayit.tur === "ag") {
        expect(s).toContain(`docker network inspect ${kayit.ad} `);
      } else {
        const { ad, tur } = kayit;
        expect(s).toContain("docker exec veritabani-deneme psql");
        expect(s).toContain(
          tur === "veritabani"
            ? `pg_database where datname = '${ad}'`
            : `pg_roles where rolname = '${ad}'`,
        );
        expect(s).toContain("|| v=olculemedi");
      }
    });
    expect(() =>
      kayitOlcumBetigi("deneme", [{ tur: "ag", ad: "a;rm -rf /", kuran: "yayin" }]),
    ).toThrow("Betiğe girmeyecek ad");
  });
});

describe("asıl adres (kart 0344)", () => {
  const seramik: KurulusGirdisi = {
    ...ornekMagaza,
    kodAdi: "seramik",
    gorunenAd: "Seramik",
    tur: "gercek",
    asilAdres: "https://seramik.eticaretmagazasi.com",
  };

  it("asıl adres kimliğe canli olarak yazılır, deneme adresi kod adından türer", () => {
    const sonuc = kuruCalistir(seramik, "deneme", {});
    expect(sonuc.dosyalar["kimlik.json"]).toMatchObject({
      adresler: {
        deneme: "https://seramik.deneme.eticaretmagazasi.com",
        canli: "https://seramik.eticaretmagazasi.com",
      },
    });
  });

  it("geçersiz ve ayrılmış asıl adres hiçbir şey üretmez", () => {
    for (const asilAdres of [
      "https://www.eticaretmagazasi.com",
      "http://seramik.com",
      "https://www.seramik.com",
    ]) {
      expect(girdiHatalari({ ...seramik, asilAdres }).join("\n")).toContain("asıl adres");
      expect(() => kuruCalistir({ ...seramik, asilAdres }, "deneme", {})).toThrow("Girdi geçersiz");
    }
  });

  it("alan adı adımı kayıttan sonra, yayından önce ve geri alınamaz", () => {
    const sira = kurulusAdimlari.map((a) => a.kod);
    expect(sira.indexOf("kayit-ve-hat")).toBeLessThan(sira.indexOf("alan-adi"));
    expect(sira.indexOf("alan-adi")).toBeLessThan(sira.indexOf("yayin"));
    expect(kurulusAdimlari.find((a) => a.kod === "alan-adi")?.geriAlinamaz).toBe(true);
  });
});
