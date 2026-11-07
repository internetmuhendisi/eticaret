// Site klasörlerinin kimlik ve ayar şemasından geçtiğini, bozuk klasörlerin geçemediğini gösterir (kart 0010).
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ayarBilgileri, ayarSemasi, magazaAyarSemasi, onekTuret } from "../ayarlar";
import { kimlikSemasi } from "../kimlik";
import { baslangicDosyasi, baslangicDosyasiniDogrula, siteKlasorunuDogrula } from "../site-klasoru";

const siteler = join(import.meta.dirname, "..", "..", "..", "siteler");
const ornekler = join(import.meta.dirname, "ornek-siteler");

const dogrula = (ornek: string) => siteKlasorunuDogrula(join(ornekler, ornek));

describe("siteler/ altındaki her site", () => {
  const klasorler = readdirSync(siteler, { withFileTypes: true }).filter((g) => g.isDirectory());

  it("en az bir site var", () => {
    expect(klasorler.length).toBeGreaterThan(0);
  });

  for (const { name } of klasorler) {
    it(`${name} doğrulamadan geçer`, () => {
      const sonuc = siteKlasorunuDogrula(join(siteler, name));
      expect(sonuc.gecerli ? [] : sonuc.hatalar).toEqual([]);
    });
  }
});

describe("ayar şeması", () => {
  it("her ayarın açıklaması ve sahibi yazılı, ayar sahibinin şemasında durur", () => {
    for (const [ad, sema] of Object.entries(ayarSemasi.shape)) {
      expect(ayarBilgileri.get(sema)?.kimDegistirir, ad).toBe("altyapi-sahibi");
    }
    // Şema bugün boş: türü alanlardan çıkarılamaz, alanlar ZodType olarak okunur.
    const magazaAlanlari: Record<string, z.ZodType> = magazaAyarSemasi.shape;
    for (const [ad, sema] of Object.entries(magazaAlanlari)) {
      expect(ayarBilgileri.get(sema)?.kimDegistirir, ad).toBe("magaza-sahibi");
    }
  });

  it("bir ayar iki şemada birden durmaz", () => {
    const ortak = Object.keys(magazaAyarSemasi.shape).filter((ad) =>
      Object.hasOwn(ayarSemasi.shape, ad),
    );
    expect(ortak).toEqual([]);
  });

  it("mağaza sahibinin her ayarının varsayılanı var ya da boş kalabilir", () => {
    expect(magazaAyarSemasi.safeParse({}).success).toBe(true);
  });

  it("boş ayar dosyası bütün varsayılanları verir", () => {
    expect(ayarSemasi.parse({})).toEqual({
      satisUlkeleri: ["TR"],
      teslimatUlkeleri: ["TR"],
      dil: "tr",
      paraBirimi: "TRY",
      paraBicimi: {
        simge: "₺",
        simgeYeri: "sonda",
        simgeBoslugu: true,
        binlikAyirici: ".",
        ondalikAyirici: ",",
        ondalikSayisi: 2,
      },
      saatDilimi: "Europe/Istanbul",
      agirlikBirimi: "kg",
      boyutBirimi: "cm",
      siparisBaslangici: 1001,
      temaDegistirilebilir: true,
      vitrindeAltyapiAdi: false,
      yakindaYazisi: false,
      yoneticiOturumuSaat: 24,
      musteriOturumuGun: 30,
    });
  });

  it("mağaza adında @ olamaz", () => {
    expect(magazaAyarSemasi.shape.magazaAdi.safeParse("satis@dukkan").success).toBe(false);
    expect(magazaAyarSemasi.shape.magazaAdi.safeParse("Satış Dükkanı").success).toBe(true);
  });

  it("ülke listesinde tekrar ve eski tek ülke ayarı kabul edilmez", () => {
    expect(ayarSemasi.safeParse({ satisUlkeleri: ["TR", "TR"] }).success).toBe(false);
    expect(ayarSemasi.safeParse({ ulke: "TR" }).success).toBe(false);
    expect(ayarSemasi.safeParse({ satisUlkeleri: ["TR", "DE"] }).success).toBe(true);
  });

  it("tanınmayan saat dilimini kabul etmez", () => {
    expect(ayarSemasi.safeParse({ saatDilimi: "Avrupa/Istanbul" }).success).toBe(false);
  });

  it("sipariş önekini görünen addan türetir", () => {
    expect(onekTuret("Öğün Evi")).toBe("OGU");
    expect(onekTuret("ılık çay")).toBe("ILI");
    expect(onekTuret("Şık İş")).toBe("SIK");
  });
});

describe("kimlik şeması", () => {
  it("kod adı en çok 40 harftir", () => {
    const kodAdi = (uzunluk: number) => kimlikSemasi.shape.kodAdi.safeParse("a".repeat(uzunluk));
    expect(kodAdi(40).success).toBe(true);
    expect(kodAdi(41).success).toBe(false);
  });
});

describe("örnek klasörler", () => {
  it("geçerli klasör varsayılanlarla ve türetilmiş önekle okunur", () => {
    const sonuc = dogrula("gecerli");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(sonuc.site.kimlik.gorunenAd).toBe("Deneme Dükkanı");
    expect(sonuc.site.ayarlar.siparisOneki).toBe("DEN");
    expect(sonuc.site.ayarlar.siparisBaslangici).toBe(1001);
  });

  const bozuklar: [ornek: string, beklenenHata: string][] = [
    ["bilinmeyen-ayar", "ayarlar.json: (dosyanın tamamı)"],
    ["yanlis-tur", "ayarlar.json: siparisBaslangici"],
    ["eksik-kimlik-alani", "kimlik.json: cekirdekSurumu"],
    ["kod-adi-farkli", "kimlik.json: kodAdi: klasörün adıyla aynı olmalı"],
    ["ayar-dosyasi-yok", "ayarlar.json: dosya yok."],
    ["baslangic-bilinmeyen-ayar", `${baslangicDosyasi}: (dosyanın tamamı)`],
    ["baslangic-altyapi-ayari", `${baslangicDosyasi}: dil: bu ayar ayarlar.json dosyasına yazılır`],
    ["baslangic-yanlis-tur-gercek", `${baslangicDosyasi}: iletisimTelefonu: `],
    [
      "magaza-ayari-yanlis-dosyada",
      `ayarlar.json: iletisimEpostasi: bu ayar ${baslangicDosyasi} dosyasına yazılır`,
    ],
    ["ulke-listesi-bozuk", "ayarlar.json: satisUlkeleri.1: Ülke listesinde olmayan kod"],
    ["uzun-gorunen-ad", "kimlik.json: gorunenAd: mağaza adı olarak kullanılamaz"],
    // İlk logo (kart 0073).
    ["marka-iki-logo", "marka/: birden çok logo var"],
    ["marka-uzanti-uyusmuyor", "marka/logo.png: içeriği uzantısıyla uyuşmuyor"],
    ["marka-izinsiz-uzanti", "marka/logo.gif: uzantı png, jpg ya da webp olmalı"],
    ["ulke-listesi-bozuk", "ayarlar.json: teslimatUlkeleri: En az bir ülke olmalı."],
  ];

  for (const [ornek, beklenenHata] of bozuklar) {
    it(`${ornek} doğrulamadan geçemez`, () => {
      const sonuc = dogrula(ornek);
      expect(sonuc.gecerli).toBe(false);
      if (sonuc.gecerli) return;
      expect(
        sonuc.hatalar.some((hata) => hata.startsWith(beklenenHata)),
        sonuc.hatalar.join("\n"),
      ).toBe(true);
    });
  }

  // Kart 0069'dan kalan madde: gerçek bir mağaza ayarında yanlış tür, ayarın adı ve tür hatasıyla.
  // İletinin dili ortama göre değişir, iki dilde de beklenen tür ("string") yazar.
  it("mağaza ayarında yanlış tür, tür hatasıyla geçemez", () => {
    const sonuc = dogrula("baslangic-yanlis-tur-gercek");
    expect(sonuc.gecerli).toBe(false);
    if (sonuc.gecerli) return;
    expect(sonuc.hatalar).toHaveLength(1);
    expect(sonuc.hatalar[0]).toMatch(/^baslangic\/ayarlar\.json: iletisimTelefonu: .*string/);
  });

  it("olmayan klasör doğrulamadan geçemez", () => {
    expect(dogrula("olmayan").gecerli).toBe(false);
  });
});

describe("başlangıç dosyası", () => {
  // Çekirdekte henüz mağaza sahibinin ayarı yok; tür denetimi deneme şemasıyla gösterilir.
  const denemeSemasi = z.strictObject({ kapidaOdeme: z.boolean().default(false) });

  it("dosyası olmayan site mağaza ayarlarını varsayılanla başlatır", () => {
    const sonuc = dogrula("gecerli");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    // Mağaza adı verilmezse kimlikteki görünen addır (kart 0071).
    expect(sonuc.site.baslangic).toEqual({
      ...magazaAyarSemasi.parse({}),
      magazaAdi: "Deneme Dükkanı",
    });
    expect(baslangicDosyasiniDogrula(join(ornekler, "gecerli"), denemeSemasi)).toEqual({
      gecerli: true,
      deger: { kapidaOdeme: false },
    });
  });

  it("dosyadaki değer okunur", () => {
    expect(baslangicDosyasiniDogrula(join(ornekler, "baslangic-dolu"), denemeSemasi)).toEqual({
      gecerli: true,
      deger: { kapidaOdeme: true },
    });
  });

  it("yanlış türdeki başlangıç değeri doğrulamadan geçemez", () => {
    const sonuc = baslangicDosyasiniDogrula(join(ornekler, "baslangic-yanlis-tur"), denemeSemasi);
    expect(sonuc.gecerli).toBe(false);
    if (sonuc.gecerli) return;
    expect(sonuc.hatalar.join("\n")).toContain(`${baslangicDosyasi}: kapidaOdeme`);
  });

  it("JSON olmayan başlangıç dosyası doğrulamadan geçemez", () => {
    // Bozuk JSON biçim denetimini düşürdüğü için örnek klasörde durmaz, burada üretilir.
    const kok = mkdtempSync(join(tmpdir(), "baslangic-"));
    const klasor = join(kok, "baslangic-dolu");
    try {
      cpSync(join(ornekler, "baslangic-dolu"), klasor, { recursive: true });
      writeFileSync(join(klasor, baslangicDosyasi), "{ bozuk");
      const sonuc = siteKlasorunuDogrula(klasor);
      expect(sonuc.gecerli).toBe(false);
      if (sonuc.gecerli) return;
      expect(sonuc.hatalar.join("\n")).toContain(`${baslangicDosyasi}: geçerli JSON değil`);
    } finally {
      rmSync(kok, { recursive: true, force: true });
    }
  });
});

describe("ilk logo (kart 0073)", () => {
  it("marka/ klasöründeki logo türüyle okunur", () => {
    const sonuc = dogrula("marka-logolu");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(sonuc.site.markaLogosu?.tur).toBe("webp");
    expect(sonuc.site.markaLogosu?.yol).toMatch(/marka-logolu\/marka\/logo\.webp$/);
  });

  it("marka/ klasörü olmayan sitenin ilk logosu yoktur", () => {
    const sonuc = dogrula("gecerli");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(sonuc.site.markaLogosu).toBeUndefined();
  });
});
