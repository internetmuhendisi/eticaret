// Site klasörlerinin kimlik ve ayar şemasından geçtiğini, bozuk klasörlerin geçemediğini gösterir (kart 0010).
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { hazirTemalar } from "../../temalar/temalar";
import { ayarBilgileri, ayarSemasi, magazaAyarSemasi, onekTuret } from "../ayarlar";
import { kimlikSemasi } from "../kimlik";
import {
  baslangicDosyasi,
  baslangicDosyasiniDogrula,
  duzenBaslangicDosyasi,
  katalogBaslangicDosyasi,
  menuBaslangicDosyasi,
  siteKlasorunuDogrula,
  temaBaslangicDosyasi,
  vergiBaslangicDosyasi,
} from "../site-klasoru";

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

  it("para biriminin varsayılanı yok, simgesi isteğe bağlı (kart 0081)", () => {
    expect(ayarSemasi.safeParse({}).success).toBe(false);
    expect(ayarSemasi.safeParse({ paraBirimi: "xts" }).success).toBe(false);
    expect(ayarSemasi.parse({ paraBirimi: "XTS" }).paraBicimi.simge).toBeUndefined();
  });

  it("para birimi dışında boş ayar dosyası bütün varsayılanları verir", () => {
    expect(ayarSemasi.parse({ paraBirimi: "XTS" })).toEqual({
      satisUlkeleri: ["TR"],
      teslimatUlkeleri: ["TR"],
      dil: "tr",
      paraBirimi: "XTS",
      paraBicimi: {
        simgeYeri: "sonda",
        simgeBoslugu: true,
        binlikAyirici: ".",
        ondalikAyirici: ",",
        ondalikSayisi: 2,
      },
      saatDilimi: "Europe/Istanbul",
      agirlikBirimi: "kg",
      boyutBirimi: "cm",
      videoSiteleri: ["youtube", "vimeo"],
      siparisBaslangici: 1001,
      temaDegistirilebilir: true,
      vitrindeAltyapiAdi: false,
      yakindaYazisi: false,
      yoneticiOturumuSaat: 24,
      musteriOturumuGun: 30,
      favoriSiniri: 100,
      eklentiler: [],
    });
  });

  it("mağaza adında @ olamaz", () => {
    expect(magazaAyarSemasi.shape.magazaAdi.safeParse("satis@dukkan").success).toBe(false);
    expect(magazaAyarSemasi.shape.magazaAdi.safeParse("Satış Dükkanı").success).toBe(true);
  });

  it("ülke listesinde tekrar ve eski tek ülke ayarı kabul edilmez", () => {
    const para = { paraBirimi: "XTS" };
    expect(ayarSemasi.safeParse({ ...para, satisUlkeleri: ["TR", "TR"] }).success).toBe(false);
    expect(ayarSemasi.safeParse({ ...para, ulke: "TR" }).success).toBe(false);
    expect(ayarSemasi.safeParse({ ...para, satisUlkeleri: ["TR", "DE"] }).success).toBe(true);
  });

  it("tanınmayan saat dilimini kabul etmez", () => {
    expect(ayarSemasi.safeParse({ paraBirimi: "XTS", saatDilimi: "Avrupa/Istanbul" }).success).toBe(
      false,
    );
    expect(ayarSemasi.safeParse({ paraBirimi: "XTS", saatDilimi: "Europe/Berlin" }).success).toBe(
      true,
    );
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
    ["marka-izinsiz-uzanti", "marka/logo.gif: ad logo.png, logo.jpg ya da logo.webp olmalı"],
    ["ulke-listesi-bozuk", "ayarlar.json: teslimatUlkeleri: En az bir ülke olmalı."],
    // Vergi başlangıç verisi (kart 0074): hata iletileri koddur (cekirdek/moduller/vergi/semalar.ts).
    ["vergi-oran-bozuk", `${vergiBaslangicDosyasi}: siniflar.0.oranlar.0.oran: oran-bicimi`],
    ["vergi-oran-sayi", `${vergiBaslangicDosyasi}: siniflar.0.oranlar.0.oran: `],
    ["vergi-bolge-bozuk", `${vergiBaslangicDosyasi}: siniflar.0.oranlar.0.il: il-baska-ulkenin`],
    ["vergi-sinif-tekrar", `${vergiBaslangicDosyasi}: siniflar.1.ad: ad-tekrar`],
    ["vergi-bilinmeyen-alan", `${vergiBaslangicDosyasi}: siniflar.0: `],
    ["vergi-kargo-tekrar", `${vergiBaslangicDosyasi}: siniflar.1.kargo: kargo-tekrar`],
    // Başlangıç kataloğu (kart 0084): hata iletileri koddur (cekirdek/moduller/urun/baslangic-semasi.ts).
    [
      "katalog-kategori-tanimsiz",
      `${katalogBaslangicDosyasi}: urunler.0.kategoriler.1: kategori-tanimsiz`,
    ],
    ["katalog-marka-tanimsiz", `${katalogBaslangicDosyasi}: urunler.0.marka: marka-tanimsiz`],
    [
      "katalog-ilgili-tanimsiz",
      `${katalogBaslangicDosyasi}: urunler.0.ilgiliUrunler.0: ilgili-tanimsiz`,
    ],
    ["katalog-takipsiz-stok", `${katalogBaslangicDosyasi}: urunler.1.stok: takipsiz-stok`],
    [
      "katalog-adres-adi-tekrar",
      `${katalogBaslangicDosyasi}: urunler.1.adresAdi: adres-adi-tekrar`,
    ],
    [
      "katalog-vergi-sinifi-yok",
      `${katalogBaslangicDosyasi}: urunler.0.vergiSinifi: vergi-sinifi-tanimsiz (${vergiBaslangicDosyasi} dosyasında bu adlı sınıf yok)`,
    ],
    // Servislerin alanlar arası kuralları aynı işlevlerle (kart 0084 kontrolü).
    ["katalog-adet-siniri", `${katalogBaslangicDosyasi}: urunler.0.enCokAdet: adet-siniri`],
    [
      "katalog-yayin-zamani-yok",
      `${katalogBaslangicDosyasi}: urunler.0.yayinZamani: yayin-zamani-gerekli`,
    ],
    [
      "katalog-indirim-buyuk",
      `${katalogBaslangicDosyasi}: urunler.0.fiyat.indirimliFiyat: indirim-buyuk`,
    ],
    [
      "katalog-indirimsiz-zaman",
      `${katalogBaslangicDosyasi}: urunler.1.fiyat.indirimBitisi: indirim-zamani-indirimsiz`,
    ],
    [
      "katalog-indirim-sirasi",
      `${katalogBaslangicDosyasi}: urunler.0.fiyat.indirimBitisi: indirim-sirasi`,
    ],
    [
      "katalog-yaz-saati",
      `${katalogBaslangicDosyasi}: urunler.0.fiyat.indirimBaslangici: indirim-zamani-gecersiz`,
    ],
    [
      "katalog-yayin-yaz-saati",
      `${katalogBaslangicDosyasi}: urunler.0.yayinZamani: yayin-zamani-gecersiz`,
    ],
    [
      "katalog-kategori-tekrar",
      `${katalogBaslangicDosyasi}: urunler.0.kategoriler: kategori-tekrar`,
    ],
    [
      "katalog-ilgili-kendisi",
      `${katalogBaslangicDosyasi}: urunler.0.ilgiliUrunler.0: ilgili-kendisi`,
    ],
    ["katalog-ilgili-sinir", `${katalogBaslangicDosyasi}: urunler.0.ilgiliUrunler: `],
    ["katalog-vergi-sinifi-eksik", `${katalogBaslangicDosyasi}: urunler.0.vergiSinifi: `],
    [
      "katalog-fiyat-bozuk",
      `${katalogBaslangicDosyasi}: urunler.0.fiyat.indirimliFiyat: indirim-sifir`,
    ],
    ["katalog-bilinmeyen-alan", `${katalogBaslangicDosyasi}: urunler.0: `],
    // Kataloğun galerisi (kart 0087).
    ["katalog-galeri-gorsel-yok", "baslangic/gorseller/yok.png: dosya yok"],
    [
      "katalog-galeri-uzanti-uyusmuyor",
      "baslangic/gorseller/bir.webp: içeriği uzantısıyla uyuşmuyor",
    ],
    [
      "katalog-galeri-gorsel-tekrar",
      `${katalogBaslangicDosyasi}: urunler.0.galeri.1.gorsel: galeri-gorsel-tekrar`,
    ],
    ["katalog-galeri-gorsel-adi", `${katalogBaslangicDosyasi}: urunler.0.galeri.0.gorsel: `],
    [
      "katalog-galeri-video-gecersiz",
      `${katalogBaslangicDosyasi}: urunler.0.galeri.0.video: video-adresi-gecersiz`,
    ],
    [
      "katalog-galeri-video-izinsiz",
      `${katalogBaslangicDosyasi}: urunler.0.galeri.0.video: video-sitesi-izinsiz`,
    ],
    // Özellikler ve varyantlar (kart 0100).
    ["katalog-ozellik-ad-tekrar", `${katalogBaslangicDosyasi}: ozellikler.2.ad: ozellik-ad-tekrar`],
    [
      "katalog-ozellik-birim-liste",
      `${katalogBaslangicDosyasi}: ozellikler.0.birim: birim-yalniz-sayi`,
    ],
    [
      "katalog-ozellik-secenek-metin",
      `${katalogBaslangicDosyasi}: ozellikler.2.secenekler: secenek-yalniz-liste`,
    ],
    [
      "katalog-ozellik-tanimsiz",
      `${katalogBaslangicDosyasi}: urunler.2.ozellikler.0: ozellik-tanimsiz`,
    ],
    [
      "katalog-ozellik-tekrar",
      `${katalogBaslangicDosyasi}: urunler.2.ozellikler.1: ozellik-tekrar`,
    ],
    [
      "katalog-ozellik-deger-gecersiz",
      `${katalogBaslangicDosyasi}: urunler.2.ozellikler.0: ozellik-deger-gecersiz`,
    ],
    [
      "katalog-ozellik-secenek-gecersiz",
      `${katalogBaslangicDosyasi}: urunler.2.ozellikler.0: ozellik-secenek-gecersiz`,
    ],
    [
      "katalog-varyant-birim-alani",
      `${katalogBaslangicDosyasi}: urunler.2.stokKodu: varyant-birim-alani`,
    ],
    [
      "katalog-birlesimsiz-secenek",
      `${katalogBaslangicDosyasi}: urunler.2.birlesimler: birlesimsiz-secenek`,
    ],
    [
      "katalog-seceneksiz-birlesim",
      `${katalogBaslangicDosyasi}: urunler.2.birlesimler: seceneksiz-birlesim`,
    ],
    [
      "katalog-birlesim-gecersiz",
      `${katalogBaslangicDosyasi}: urunler.2.birlesimler.1.degerler: birlesim-gecersiz`,
    ],
    [
      "katalog-birlesim-eksik-deger",
      `${katalogBaslangicDosyasi}: urunler.2.birlesimler.1.degerler: birlesim-gecersiz`,
    ],
    [
      "katalog-birlesim-tekrar",
      `${katalogBaslangicDosyasi}: urunler.2.birlesimler.1.degerler: birlesim-tekrar`,
    ],
    [
      "katalog-birlesim-gorsel-tanimsiz",
      `${katalogBaslangicDosyasi}: urunler.2.birlesimler.0.gorsel: birlesim-gorsel-tanimsiz`,
    ],
    [
      "katalog-birlesim-indirim",
      `${katalogBaslangicDosyasi}: urunler.2.birlesimler.0.fiyat.indirimliFiyat: indirim-buyuk`,
    ],
    [
      "katalog-birlesim-takipsiz-stok",
      `${katalogBaslangicDosyasi}: urunler.2.birlesimler.0.stok: takipsiz-stok`,
    ],
  ];

  bozuklar.push(
    // Temalar (kart 0105).
    ["tema-tanimsiz", 'ayarlar.json: temalar: "olmayan" diye bir tema yok'],
    ["tema-liste-bos", "ayarlar.json: temalar: En az bir tema olmalı."],
    ["tema-listede-yok", "tema/ozel-tema.json: ayarlar.json dosyasındaki temalar listesinde yok."],
    ["tema-bozuk", "tema/ozel-tema.json: degerler.renkler.acik.yazi: kontrast-yetersiz"],
    ["tema-hazir-kodu", "tema/canli-carsi.json: bu kod hazır bir temanın"],
    ["tema-dosya-adi", "tema/Ozel.json: ad <tema kodu>.json olmalı"],
    [
      "tema-baslangic-listede-yok",
      `${temaBaslangicDosyasi}: tema: "olmayan" sitenin kullanabileceği temalarda yok.`,
    ],
    [
      "tema-baslangic-renk",
      `${temaBaslangicDosyasi}: ayarlar.renkler.birincil: kontrast-yetersiz (öneri #`,
    ],
    [
      "tema-baslangic-acmadigi-renk",
      `${temaBaslangicDosyasi}: ayarlar.renkler.zemin: renk-degistirilemez`,
    ],
  );

  bozuklar.push(
    // Başlangıç düzeni (kart 0106).
    ["duzen-tanimsiz-bolum", `${duzenBaslangicDosyasi}: ana-sayfa.0.tur: bolum-tanimsiz`],
    ["duzen-bozuk-bicim", `${duzenBaslangicDosyasi}: ana-sayfa: `],
    // Kayda adres adıyla başvuru (kart 0114): adres adı başlangıç kataloğunda olmalı. Görsel dosya adıyla
    // başvurulur (kart 0115): dosya baslangic/gorseller/ klasöründe olmalı, ad yol kaçışı içeremez.
    [
      "duzen-katalogda-yok",
      `${duzenBaslangicDosyasi}: ana-sayfa.0.degerler.kategoriler.1.kategori: kategori olmayan: ${katalogBaslangicDosyasi} dosyasında bu adres adı yok`,
    ],
    [
      "duzen-urun-katalogda-yok",
      `${duzenBaslangicDosyasi}: ana-sayfa.0.degerler.urunler.urunler.1: urun olmayan-urun:`,
    ],
    ["duzen-gorselli", "baslangic/gorseller/afis.webp: dosya yok"],
    ["duzen-gorsel-adi", `${duzenBaslangicDosyasi}: ana-sayfa.0.degerler.gorsel: `],
    ["katalog-kategori-gorsel-yok", "baslangic/gorseller/yok.png: dosya yok"],
    ["katalog-kategori-gorsel-adi", `${katalogBaslangicDosyasi}: kategoriler.0.gorsel: `],
    // Başlangıç menüleri (kart 0107): hata iletileri koddur (cekirdek/moduller/menu/semalar.ts).
    ["menu-hedef-tanimsiz", `${menuBaslangicDosyasi}: 0.ogeler.1.hedef.adresAdi: hedef-yok`],
    ["menu-derinlik", `${menuBaslangicDosyasi}: 0.ogeler.0.altlar.0.altlar: derinlik`],
    ["menu-kategori-ogeli", `${menuBaslangicDosyasi}: 0.ogeler: kategori-menusu`],
    ["menu-kod-tekrar", `${menuBaslangicDosyasi}: 1.kod: kod-tekrar`],
    ["menu-metinsiz-baslik", `${menuBaslangicDosyasi}: 0.ogeler.0.metin: metin-gerekli`],
  );

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

describe("vergi başlangıç verisi (kart 0074)", () => {
  it("dosyası olmayan site vergi sınıfı olmadan başlar", () => {
    const sonuc = dogrula("gecerli");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(sonuc.site.vergiBaslangici).toEqual({ siniflar: [] });
  });

  it("dosyadaki sınıflar sırasıyla, oranlar milyonda bir birimiyle okunur", () => {
    const sonuc = dogrula("vergi-dolu");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(sonuc.site.vergiBaslangici).toEqual({
      siniflar: [
        {
          ad: "Genel",
          oranlar: [
            { ulke: "TR", oran: 180_000 },
            { ulke: "TR", il: "TR-34", postaKodu: "34000", oran: 5_000, ad: "Ek" },
          ],
        },
        { ad: "Vergisiz", oranlar: [] },
      ],
    });
  });
});

describe("başlangıç kataloğu (kart 0084)", () => {
  it("dosyası olmayan site boş katalogla başlar", () => {
    const sonuc = dogrula("gecerli");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(sonuc.site.katalogBaslangici).toEqual({
      kategoriler: [],
      markalar: [],
      etiketler: [],
      ozellikler: [],
      urunler: [],
    });
  });

  it("özellikli ve varyantlı katalog doğrulamadan geçer (kart 0100)", () => {
    const sonuc = dogrula("katalog-varyantli");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    const varyantli = sonuc.site.katalogBaslangici.urunler[2];
    expect(varyantli?.birlesimler.map((b) => b.degerler)).toEqual([["S"], ["M"]]);
    expect(sonuc.site.katalogBaslangici.ozellikler.map((o) => o.ad)).toEqual(["Kumaş", "Gramaj"]);
  });

  it("dosyadaki katalog varsayılanlarıyla okunur", () => {
    const sonuc = dogrula("katalog-dolu");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    const [ilk, ikinci] = sonuc.site.katalogBaslangici.urunler;
    expect(ilk).toMatchObject({
      adresAdi: "deneme-urunu",
      vergiSinifi: "Genel",
      kategoriler: ["birinci", "ikinci"],
      fiyat: {
        satisFiyati: 1000,
        indirimliFiyat: 800,
        indirimBaslangici: null,
        indirimBitisi: null,
      },
      stok: 3,
    });
    expect(ikinci).toMatchObject({
      durum: "taslak",
      stokTakibi: false,
      enAzAdet: 1,
      kategoriler: [],
      etiketler: [],
      ilgiliUrunler: [],
    });
    expect(ikinci?.stok).toBeUndefined();
  });

  it("katalog görselleri site klasöründeki tam yollarıyla okunur (kart 0087)", () => {
    const sonuc = dogrula("katalog-galerili");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(Object.keys(sonuc.site.katalogGorselleri)).toEqual(["bir.png"]);
    expect(sonuc.site.katalogGorselleri["bir.png"]).toMatch(
      /katalog-galerili\/baslangic\/gorseller\/bir\.png$/,
    );
    expect(sonuc.site.katalogBaslangici.urunler[0]?.galeri).toEqual([
      { gorsel: "bir.png", alternatifMetin: "Görsel" },
      { video: "https://youtu.be/aqz-KE-bpKQ", alternatifMetin: "Video" },
    ]);
    expect(dogrula("katalog-dolu").gecerli && dogrula("katalog-dolu")).toMatchObject({
      site: { katalogGorselleri: {} },
    });
  });

  it("kategorinin ve başlangıç düzeninin görselleri de site klasöründeki yollarıyla okunur (kart 0115)", () => {
    const sonuc = dogrula("gorselli-duzen");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(Object.keys(sonuc.site.katalogGorselleri).toSorted()).toEqual([
      "afis.png",
      "bir.png",
      "kategori.png",
    ]);
    expect(sonuc.site.katalogBaslangici.kategoriler[0]?.gorsel).toBe("kategori.png");
  });

  it("katalog görseli bağlantı ya da klasör olamaz (kart 0087)", () => {
    const kok = mkdtempSync(join(tmpdir(), "katalog-galeri-"));
    try {
      const klasor = join(kok, "katalog-galerili");
      cpSync(join(ornekler, "katalog-galerili"), klasor, { recursive: true });
      const yol = join(klasor, "baslangic", "gorseller", "bir.png");
      rmSync(yol);
      symlinkSync(join(ornekler, "katalog-galerili", "baslangic", "gorseller", "bir.png"), yol);
      const sonuc = siteKlasorunuDogrula(klasor);
      expect(sonuc.gecerli).toBe(false);
      if (sonuc.gecerli) return;
      expect(sonuc.hatalar).toEqual([
        "baslangic/gorseller/bir.png: düz bir dosya olmalı (bağlantı ya da klasör değil).",
      ]);
    } finally {
      rmSync(kok, { recursive: true, force: true });
    }
  });

  it("katalog görsel klasörü site klasörünün dışına bağlantı olamaz (kart 0087 kontrolü)", () => {
    const kok = mkdtempSync(join(tmpdir(), "katalog-galeri-"));
    try {
      const klasor = join(kok, "katalog-galerili");
      cpSync(join(ornekler, "katalog-galerili"), klasor, { recursive: true });
      const gorseller = join(klasor, "baslangic", "gorseller");
      rmSync(gorseller, { recursive: true });
      symlinkSync(join(ornekler, "katalog-galerili", "baslangic", "gorseller"), gorseller);
      const sonuc = siteKlasorunuDogrula(klasor);
      expect(sonuc.gecerli).toBe(false);
      if (sonuc.gecerli) return;
      expect(sonuc.hatalar).toEqual([
        "baslangic/gorseller/: site klasörünün içinde gerçek bir klasör olmalı.",
      ]);
    } finally {
      rmSync(kok, { recursive: true, force: true });
    }
  });

  it("JSON olmayan katalog dosyası doğrulamadan geçemez", () => {
    const kok = mkdtempSync(join(tmpdir(), "katalog-"));
    const klasor = join(kok, "katalog-dolu");
    try {
      cpSync(join(ornekler, "katalog-dolu"), klasor, { recursive: true });
      writeFileSync(join(klasor, katalogBaslangicDosyasi), "{ bozuk");
      const sonuc = siteKlasorunuDogrula(klasor);
      expect(sonuc.gecerli).toBe(false);
      if (sonuc.gecerli) return;
      expect(sonuc.hatalar.join("\n")).toContain(`${katalogBaslangicDosyasi}: geçerli JSON değil`);
    } finally {
      rmSync(kok, { recursive: true, force: true });
    }
  });
});

describe("temalar (kart 0105)", () => {
  it("temalar verilmezse bütün hazır temalar, ilki başlangıç teması ve kendi değerleriyle", () => {
    const sonuc = dogrula("gecerli");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(sonuc.site.temalar.map((tema) => [tema.kod, tema.kaynak])).toEqual(
      Object.keys(hazirTemalar).map((kod) => [kod, "cekirdek"]),
    );
    expect(sonuc.site.temaBaslangici).toEqual({
      tema: Object.keys(hazirTemalar)[0],
      ayarlar: { renkler: {}, koyuTema: false },
    });
  });

  it("siteye özel tema adıyla okunur, listedeki sırayla", () => {
    const sonuc = dogrula("tema-ozel-ve-hazir");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(sonuc.site.temalar.map(({ kod, kaynak, ad }) => ({ kod, kaynak, ad }))).toEqual([
      { kod: "canli-carsi", kaynak: "cekirdek", ad: { anahtar: "tema.ad.canliCarsi" } },
      { kod: "ozel-tema", kaynak: "site", ad: { metin: "Özel Tema" } },
    ]);
  });

  it("başlangıç dosyasındaki ayarlar okunur", () => {
    const sonuc = dogrula("tema-ozel");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(sonuc.site.temaBaslangici).toEqual({
      tema: "ozel-tema",
      ayarlar: { renkler: {}, kose: "keskin", koyuTema: true },
    });
  });

  it("tema klasöründeki gizli dosya (.DS_Store) tema sayılmaz", () => {
    const kok = mkdtempSync(join(tmpdir(), "tema-"));
    try {
      const klasor = join(kok, "tema-ozel");
      cpSync(join(ornekler, "tema-ozel"), klasor, { recursive: true });
      writeFileSync(join(klasor, "tema", ".DS_Store"), "gizli");
      const sonuc = siteKlasorunuDogrula(klasor);
      expect(sonuc.gecerli ? [] : sonuc.hatalar).toEqual([]);
    } finally {
      rmSync(kok, { recursive: true, force: true });
    }
  });

  it("tema klasöründe bağlantı kabul edilmez", () => {
    const kok = mkdtempSync(join(tmpdir(), "tema-"));
    try {
      const klasor = join(kok, "tema-ozel");
      cpSync(join(ornekler, "tema-ozel"), klasor, { recursive: true });
      const dosya = join(klasor, "tema", "ozel-tema.json");
      const hedef = join(kok, "dis.json");
      writeFileSync(hedef, readFileSync(dosya));
      rmSync(dosya);
      symlinkSync(hedef, dosya);
      const sonuc = siteKlasorunuDogrula(klasor);
      expect(sonuc.gecerli ? [] : sonuc.hatalar.join()).toContain("düz bir dosya olmalı");
    } finally {
      rmSync(kok, { recursive: true, force: true });
    }
  });
});

describe("başlangıç düzeni (kart 0106)", () => {
  it("dosyası olmayan site başlangıç temasının düzeniyle başlar", () => {
    const sonuc = dogrula("gecerli");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    const tema = sonuc.site.temalar.find((aday) => aday.kod === sonuc.site.temaBaslangici.tema);
    expect(sonuc.site.duzenBaslangici).toEqual(tema?.tanim.baslangicDuzeni);
  });

  it("dosyadaki menüler okunur; dosyası olmayan sitenin başlangıç menüsü yoktur (kart 0107)", () => {
    const sonuc = dogrula("menu-dolu");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(
      sonuc.site.menuBaslangici.map((menu) => [menu.kod, menu.tur, menu.ogeler.length]),
    ).toEqual([
      ["ana-menu", "elle", 3],
      ["kategori-menusu", "kategori-agaci", 0],
      ["alt-bilgi", "elle", 1],
    ]);
    // Verilmeyen yeni sekme kapalıdır, verilmeyen altlar boştur.
    expect(sonuc.site.menuBaslangici[2]?.ogeler[0]?.altlar[0]).toEqual({
      metin: "Üyelik sözleşmesi",
      hedef: { tur: "adres", adres: "/yasal/uyelik-sozlesmesi", yeniSekme: false },
      altlar: [],
    });
    const bos = dogrula("katalog-dolu");
    if (!bos.gecerli) throw new Error(bos.hatalar.join("\n"));
    expect(bos.site.menuBaslangici).toEqual([]);
  });

  it("dosyadaki düzen kategori, marka, etiket ve ürüne adres adıyla başvurur (kart 0114)", () => {
    const sonuc = dogrula("duzen-bagli");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(sonuc.site.duzenBaslangici["ana-sayfa"].map((bolum) => bolum.degerler)).toEqual([
      { kategoriler: [{ kategori: "birinci" }, { kategori: "ikinci" }] },
      { urunler: { tur: "elle", urunler: ["deneme-urunu", "vergisiz-urun"] } },
      {
        sekmeler: [
          { baslik: "Etiket", urunler: { tur: "etiket", etiket: "etiket-bir", adet: 4 } },
          { baslik: "Marka", urunler: { tur: "marka", marka: "deneme-markasi", adet: 4 } },
        ],
      },
      { markalar: [{ marka: "deneme-markasi" }] },
    ]);
  });

  it("dosyadaki düzen okunur", () => {
    const sonuc = dogrula("duzen-bos");
    if (!sonuc.gecerli) throw new Error(sonuc.hatalar.join("\n"));
    expect(sonuc.site.duzenBaslangici).toEqual({
      "ust-kisim": [],
      "ana-sayfa": [],
      "alt-kisim": [],
    });
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

describe("ilk logonun adı ve türü (kart 0073)", () => {
  const kopyala = (hazirla: (marka: string) => void) => {
    const kok = mkdtempSync(join(tmpdir(), "marka-"));
    const klasor = join(kok, "marka-logolu");
    cpSync(join(ornekler, "marka-logolu"), klasor, { recursive: true });
    const marka = join(klasor, "marka");
    rmSync(join(marka, "logo.webp"));
    hazirla(marka);
    const sonuc = siteKlasorunuDogrula(klasor);
    rmSync(kok, { recursive: true, force: true });
    return sonuc.gecerli ? [] : sonuc.hatalar;
  };
  const gercekLogo = () => readFileSync(join(ornekler, "marka-logolu", "marka", "logo.webp"));

  it("büyük harfli ad sessizce yok sayılmaz", () => {
    expect(kopyala((m) => writeFileSync(join(m, "Logo.webp"), gercekLogo())).join()).toContain(
      "ad logo.png, logo.jpg ya da logo.webp olmalı",
    );
  });

  it("logo adında klasör kabul edilmez", () => {
    expect(kopyala((m) => mkdirSync(join(m, "logo.webp"))).join()).toContain(
      "düz bir dosya olmalı",
    );
  });

  it("sembolik bağlantı kabul edilmez", () => {
    const hedef = join(mkdtempSync(join(tmpdir(), "hedef-")), "logo.webp");
    writeFileSync(hedef, gercekLogo());
    expect(kopyala((m) => symlinkSync(hedef, join(m, "logo.webp"))).join()).toContain(
      "düz bir dosya olmalı",
    );
  });
});
