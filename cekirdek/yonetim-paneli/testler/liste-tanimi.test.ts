// Panel listelerinin ortak tanımı (kart 0258): adresin okunması ve yazılması, liste ucunun girdisi. Gerçek tanımlar
// (siparişler, stok bildirimleri) ve bir deneme tanımıyla.
import { describe, expect, it } from "vitest";
import { stokBildirimleriListesiTanimi } from "../../eklentiler/stoga-gelince-haber-ver/panel/liste-tanimi.ts";
import { siparisIslemleri, siparisTopluIslemleri } from "../../kayitlar/siparis.ts";
import {
  kayitSuzgeciSiniri,
  type ListeTanimi,
  listeAdresi,
  listeDurumunuOku,
  listeSorgusu,
  listeUcuSemasi,
  suzgecliMi,
} from "../liste/tanim.ts";
import { panelSayfalari, sayfaTanimi } from "../sayfa-agaci.ts";
import { siparisListesiGirdisi, siparisListesiTanimi } from "../siparisler/liste-tanimi.ts";
import { urunListesiGirdisi, urunListesiTanimi } from "../urunler/liste-tanimi.ts";

const tanim = siparisListesiTanimi;

describe("adresin okunması", () => {
  it("boş adres varsayılan durumdur", () => {
    expect(listeDurumunuOku(tanim, {})).toEqual({
      suzgecler: {},
      ara: "",
      siralama: "en-yeni",
      sayfa: 1,
    });
  });

  it("sekme tek değer, seçenekler tanımın sırasıyla; tanınmayan değer yok sayılır", () => {
    const durum = listeDurumunuOku(tanim, {
      durum: "kargoda,iptal",
      odeme: "kart,yok,havale,havale",
    });
    expect(durum.suzgecler).toEqual({ durum: ["kargoda"], odeme: ["havale", "kart"] });
    expect(listeDurumunuOku(tanim, { durum: "yok", odeme: "" }).suzgecler).toEqual({});
    expect(listeDurumunuOku(tanim, { durum: ["bakilacak", "kargoda"] }).suzgecler).toEqual({
      durum: ["bakilacak"],
    });
  });

  it("bakılması gereken sekmesi yürüyen durumlardan hemen sonra (taslak, kart 0267)", () => {
    const sekmeler = tanim.suzgecler.find((suzgec) => suzgec.kod === "durum")?.secenekler ?? [];
    expect(sekmeler.indexOf("bakilacak")).toBe(sekmeler.indexOf("kargoda") + 1);
    expect(sekmeler.slice(0, 4)).toEqual([
      "odeme-bekleniyor",
      "hazirlaniyor",
      "kargoda",
      "bakilacak",
    ]);
  });

  it("eski değer yenisine çevrilir: kart 0239'un iade talepleri sekmesi bakılması gerekendir (kart 0267)", () => {
    expect(listeDurumunuOku(tanim, { durum: "iade-talebi" }).suzgecler).toEqual({
      durum: ["bakilacak"],
    });
    // Adrese yalnız yeni değer yazılır.
    expect(listeAdresi(tanim, listeDurumunuOku(tanim, { durum: "iade-talebi" }))).toBe(
      `${tanim.adres}?durum=bakilacak`,
    );
  });

  it("sayfa yalnız rakamla ve en az 1; tanınmayan sıralama varsayılan", () => {
    const sayfa = (deger: string) => listeDurumunuOku(tanim, { sayfa: deger }).sayfa;
    expect(sayfa("3")).toBe(3);
    expect(sayfa("0")).toBe(1);
    expect(sayfa("-2")).toBe(1);
    expect(sayfa("2.5")).toBe(1);
    expect(sayfa("123456")).toBe(1);
    expect(listeDurumunuOku(tanim, { sirala: "tutar-artan" }).siralama).toBe("tutar-artan");
    expect(listeDurumunuOku(tanim, { sirala: "fiyat" }).siralama).toBe("en-yeni");
    // Sayfasız listede sayfa okunmaz.
    expect(listeDurumunuOku(stokBildirimleriListesiTanimi, { sayfa: "3" }).sayfa).toBe(1);
  });

  it("adreste olmayan arama okunmaz; adresteki arama sınırda kesilir (emoji bölünmez)", () => {
    expect(listeDurumunuOku(tanim, { ara: "deniz" }).ara).toBe("");
    const stok = stokBildirimleriListesiTanimi;
    expect(listeDurumunuOku(stok, { ara: "  termos " }).ara).toBe("termos");
    const uzun = `${"a".repeat(stok.arama.enCok - 1)}🙂🙂`;
    expect(Array.from(listeDurumunuOku(stok, { ara: uzun }).ara)).toHaveLength(stok.arama.enCok);
  });

  it("kalıtılmış adlar okunmaz", () => {
    const sorgu = Object.create({ durum: "kargoda", sirala: "en-eski" }) as Record<string, string>;
    expect(listeDurumunuOku(tanim, sorgu)).toEqual(listeDurumunuOku(tanim, {}));
  });
});

describe("adresin yazılması", () => {
  const durum = listeDurumunuOku(tanim, {
    durum: "kargoda",
    odeme: "havale",
    sirala: "en-eski",
    sayfa: "3",
  });

  it("okunan adres aynen yazılır; varsayılanlar yazılmaz", () => {
    expect(listeAdresi(tanim, durum, { sayfa: 3 })).toBe(
      "/yonetim/siparisler?durum=kargoda&odeme=havale&sirala=en-eski&sayfa=3",
    );
    expect(listeAdresi(tanim, listeDurumunuOku(tanim, {}))).toBe("/yonetim/siparisler");
  });

  it("süzgeç ya da sıralama değişince ilk sayfaya dönülür", () => {
    expect(listeAdresi(tanim, durum, { siralama: "en-yeni" })).toBe(
      "/yonetim/siparisler?durum=kargoda&odeme=havale",
    );
    expect(listeAdresi(tanim, durum, { suzgecler: { odeme: ["kart", "havale"] } })).toBe(
      "/yonetim/siparisler?odeme=havale%2Ckart&sirala=en-eski",
    );
  });

  it("adreste olmayan arama adrese yazılmaz, uç sorgusunda yazılır", () => {
    expect(listeAdresi(tanim, durum, { ara: "deniz" })).not.toContain("ara=");
    expect(listeSorgusu(tanim, { ...durum, ara: "deniz" }).get("ara")).toBe("deniz");
    const stok = stokBildirimleriListesiTanimi;
    expect(listeAdresi(stok, listeDurumunuOku(stok, {}), { ara: "termos" })).toBe(
      "/yonetim/stok-bildirimleri?ara=termos",
    );
  });

  it("süzgeç ya da arama seçiliyse liste süzgeçlidir (sonuçsuz hâl), değilse boş hâl", () => {
    expect(suzgecliMi(listeDurumunuOku(tanim, {}))).toBe(false);
    expect(suzgecliMi(listeDurumunuOku(tanim, { sirala: "en-eski", sayfa: "2" }))).toBe(false);
    expect(suzgecliMi(durum)).toBe(true);
  });
});

describe("liste ucunun girdisi", () => {
  const sema = listeUcuSemasi(tanim);

  it("adresle aynı durumu verir; aranan metin de okunur", () => {
    expect(
      sema.parse({ durum: "bakilacak", odeme: "havale,kart,havale", ara: " ayşe ", sayfa: "2" }),
    ).toEqual({
      suzgecler: { durum: ["bakilacak"], odeme: ["havale", "kart"] },
      ara: "ayşe",
      siralama: "en-yeni",
      sayfa: 2,
    });
  });

  it("tanınmayan alan, değer, iki sekme ve uzun aranan metin reddedilir", () => {
    expect(sema.safeParse({ baska: "1" }).success).toBe(false);
    expect(sema.safeParse({ odeme: "cek" }).success).toBe(false);
    expect(sema.safeParse({ durum: "kargoda,iptal" }).success).toBe(false);
    expect(sema.safeParse({ sirala: "fiyat" }).success).toBe(false);
    expect(sema.safeParse({ ara: "a".repeat(tanim.arama.enCok + 1) }).success).toBe(false);
    expect(sema.safeParse({ sayfa: "0" }).success).toBe(false);
  });

  it("aramasız ve süzgeçsiz tanımda ara ve süzgeç alanı yoktur", () => {
    const sade: ListeTanimi = {
      kod: "deneme",
      adres: "/yonetim/deneme",
      suzgecler: [],
      arama: null,
      siralamalar: ["a"],
      sayfali: true,
      siralanabilirSutunlar: {},
      topluIslemler: [],
    };
    expect(listeUcuSemasi(sade).safeParse({ ara: "x" }).success).toBe(false);
    expect(listeUcuSemasi(sade).parse({})).toEqual({
      suzgecler: {},
      ara: "",
      siralama: "a",
      sayfa: 1,
    });
  });
});

describe("sipariş listesinin servis girdisi", () => {
  const oku = (sorgu: Record<string, string>, bugun = "2026-11-23") =>
    siparisListesiGirdisi(listeDurumunuOku(tanim, sorgu), 50, bugun);
  it("sekme durum ya da bakılması gereken olur, sayfa başına satır ayardan", () => {
    expect(oku({ durum: "kargoda", odeme: "kart" })).toEqual({
      durum: "kargoda",
      odeme: ["kart"],
      siralama: "en-yeni",
      sayfa: 1,
      sayfaBoyu: 50,
    });
    expect(oku({ durum: "bakilacak" })).toMatchObject({ bakilacak: true });
    expect(oku({ durum: "bakilacak" })).not.toHaveProperty("durum");
    expect(oku({ durum: "iade-talebi" })).toMatchObject({ bakilacak: true });
  });

  it("tarihin hazır aralığı bugüne göre günlere çevrilir (bugün dahil); aralık aynen gider (kart 0267)", () => {
    expect(oku({ tarih: "bugun" }).tarih).toEqual({ baslangic: "2026-11-23", bitis: "2026-11-23" });
    expect(oku({ tarih: "son-7-gun" }).tarih).toEqual({
      baslangic: "2026-11-17",
      bitis: "2026-11-23",
    });
    // Ay ve yıl sınırı.
    expect(oku({ tarih: "son-30-gun" }, "2026-03-01").tarih).toEqual({
      baslangic: "2026-01-31",
      bitis: "2026-03-01",
    });
    expect(oku({ tarih: "son-7-gun" }, "2027-01-02").tarih).toEqual({
      baslangic: "2026-12-27",
      bitis: "2027-01-02",
    });
    expect(oku({ tarih: "2026-11-01_2026-11-21" }).tarih).toEqual({
      baslangic: "2026-11-01",
      bitis: "2026-11-21",
    });
    expect(oku({ tarih: "_2026-11-21" }).tarih).toEqual({ baslangic: null, bitis: "2026-11-21" });
    expect(oku({ tarih: "2026-11-01_" }).tarih).toEqual({ baslangic: "2026-11-01", bitis: null });
    expect(oku({ kargo: "Hızlı%2C%20Kargo,Yurtiçi" }).kargo).toEqual(["Hızlı, Kargo", "Yurtiçi"]);
  });
});

describe("tarih süzgeci (kart 0267)", () => {
  it("adreste hazır kod ya da iki gün; takvimde olmayan, iki ucu boş, ters ve tanımda olmayan değer yok sayılır", () => {
    const tarih = (deger: string) => listeDurumunuOku(tanim, { tarih: deger }).suzgecler["tarih"];
    expect(tarih("bugun")).toEqual(["bugun"]);
    expect(tarih("son-30-gun")).toEqual(["son-30-gun"]);
    expect(tarih("2026-11-01_2026-11-21")).toEqual(["2026-11-01_2026-11-21"]);
    expect(tarih("2026-11-21_2026-11-21")).toEqual(["2026-11-21_2026-11-21"]);
    expect(tarih("_2026-11-21")).toEqual(["_2026-11-21"]);
    for (const bozuk of [
      "",
      "_",
      "dun",
      "son-90-gun",
      "2026-02-30_",
      "2026-13-01_",
      "2026-11-21_2026-11-01",
      "2026-11-1_",
      "2026-11-01",
      "2026-11-01_2026-11-02_2026-11-03",
      "constructor",
      // Yıl sınırı (bağımsız kontrolün bulgusu: 9999-12-31'in ertesi günü listeyi düşürüyordu).
      "_9999-12-31",
      "1899-12-31_",
    ]) {
      expect(tarih(bozuk), bozuk).toBeUndefined();
    }
    // Tanımda olmayan hazır kod yok sayılır.
    const yalnizBugun: ListeTanimi = {
      ...tanim,
      suzgecler: [{ kod: "tarih", tur: "tarih", secenekler: ["bugun"] }],
    };
    expect(listeDurumunuOku(yalnizBugun, { tarih: "son-7-gun" }).suzgecler).toEqual({});
    expect(listeUcuSemasi(yalnizBugun).safeParse({ tarih: "son-7-gun" }).success).toBe(false);
  });

  it("adres aynen yazılır; liste ucu aynı kuralla okur, bozuğu reddeder", () => {
    const durum = listeDurumunuOku(tanim, { tarih: "2026-11-01_2026-11-21", sayfa: "3" });
    expect(listeAdresi(tanim, durum, { sayfa: 3 })).toBe(
      `${tanim.adres}?tarih=2026-11-01_2026-11-21&sayfa=3`,
    );
    const sema = listeUcuSemasi(tanim);
    expect(sema.parse({ tarih: "son-7-gun" }).suzgecler).toEqual({ tarih: ["son-7-gun"] });
    expect(sema.parse({ tarih: "_2026-11-21" }).suzgecler).toEqual({ tarih: ["_2026-11-21"] });
    for (const bozuk of [
      "",
      "2026-02-30_",
      "2026-11-21_2026-11-01",
      "bugun,son-7-gun",
      "_9999-12-31",
    ]) {
      expect(sema.safeParse({ tarih: bozuk }).success, bozuk).toBe(false);
    }
  });
});

describe("değer süzgeci (kart 0267)", () => {
  it("her değer ayrıca kodlanır: virgüllü ad bölünmez; sayfa ve uç aynı değerleri okur", () => {
    const durum = listeDurumunuOku(tanim, {});
    const adres = listeAdresi(tanim, durum, {
      suzgecler: { kargo: ["Hızlı, Kargo", "Yurtiçi %50"] },
    });
    const sorgu = Object.fromEntries(new URL(adres, "https://ornek.test").searchParams);
    const okunan = listeDurumunuOku(tanim, sorgu);
    expect(okunan.suzgecler).toEqual({ kargo: ["Hızlı, Kargo", "Yurtiçi %50"] });
    expect(listeAdresi(tanim, okunan)).toBe(adres);
    expect(listeUcuSemasi(tanim).parse(sorgu).suzgecler).toEqual({
      kargo: ["Hızlı, Kargo", "Yurtiçi %50"],
    });
  });

  it("boş, uzun, çözülemeyen ve sınırı aşan değer: sayfa yok sayar, uç reddeder", () => {
    const uzun = "a".repeat(61);
    expect(listeDurumunuOku(tanim, { kargo: `${uzun},Aras,,%E0%A4%A` }).suzgecler).toEqual({
      kargo: ["Aras"],
    });
    const sema = listeUcuSemasi(tanim);
    expect(sema.safeParse({ kargo: uzun }).success).toBe(false);
    expect(sema.safeParse({ kargo: "Aras," }).success).toBe(false);
    expect(sema.safeParse({ kargo: "%E0%A4%A" }).success).toBe(false);
    const cok = Array.from({ length: kayitSuzgeciSiniri + 1 }, (_, sira) => `F${sira}`);
    expect(listeDurumunuOku(tanim, { kargo: cok.join(",") }).suzgecler["kargo"]).toHaveLength(
      kayitSuzgeciSiniri,
    );
    expect(sema.safeParse({ kargo: cok.join(",") }).success).toBe(false);
  });
});

describe("toplu işlemin izni (bağımsız kontrolün bulgusu)", () => {
  it("her toplu işlemin izni kayıttaki işleminkidir; fiş yazdırmanınki fiş sayfasınınkidir (kart 0270)", () => {
    for (const { kod, izin } of siparisListesiTanimi.topluIslemler) {
      expect(izin).toBe(
        kod === "fis"
          ? sayfaTanimi(panelSayfalari, "siparis-fisi")?.izin
          : siparisIslemleri[kod].izin,
      );
    }
    expect(siparisListesiTanimi.topluIslemler.map(({ kod }) => kod)).toEqual([
      "fis",
      ...siparisTopluIslemleri,
    ]);
  });
});

describe("kayıt süzgeci (kart 0262)", () => {
  const urun = urunListesiTanimi;
  const a = "5f0c7c2e-6b1d-4f0a-9a43-1f2e3d4c5b6a";
  const b = "0b5e4c3d-2a1f-4e0d-8c9b-7a6f5e4d3c2b";

  it("adreste kimlikle durur: kimlik olmayan değer yok sayılır, büyük harf küçülür, tekrar bir kez", () => {
    const durum = listeDurumunuOku(urun, {
      kategori: `${a.toUpperCase()},yok,${b},${a}`,
      marka: "constructor",
    });
    expect(durum.suzgecler).toEqual({ kategori: [a, b] });
    expect(listeSorgusu(urun, durum).toString()).toBe(`kategori=${a}%2C${b}`);
    // Değer süzgeçten kaldırılınca adresten de kalkar; süzgeç değişince ilk sayfaya dönülür.
    expect(listeAdresi(urun, { ...durum, sayfa: 3 }, { suzgecler: { kategori: [b] } })).toBe(
      `${urun.adres}?kategori=${b}`,
    );
  });

  it("sayfa ve uç aynı kimlik kuralını kullanır; değer sayısı sınırlıdır", () => {
    // Sürüm hanesi 0 olan değer kimlik biçimine benzer ama UUID değildir: sayfa da uç da almaz.
    const surumsuz = "5f0c7c2e-6b1d-0f0a-9a43-1f2e3d4c5b6a";
    expect(listeDurumunuOku(urun, { kategori: surumsuz }).suzgecler).toEqual({});
    expect(listeUcuSemasi(urun).safeParse({ kategori: surumsuz }).success).toBe(false);
    const cok = Array.from(
      { length: kayitSuzgeciSiniri + 5 },
      (_, sira) => `5f0c7c2e-6b1d-4f0a-9a43-${String(sira).padStart(12, "0")}`,
    );
    expect(listeDurumunuOku(urun, { marka: cok.join(",") }).suzgecler["marka"]).toHaveLength(
      kayitSuzgeciSiniri,
    );
    expect(listeUcuSemasi(urun).safeParse({ marka: cok.join(",") }).success).toBe(false);
  });

  it("liste ucu kimliği kabul eder, kimlik olmayanı reddeder; seçenekli süzgeç tanımın değerleriyle", () => {
    const sema = listeUcuSemasi(urun);
    const gecen = sema.safeParse({ kategori: `${a.toUpperCase()},${a}`, stok: "dusuk,tukendi" });
    expect(gecen.success && gecen.data.suzgecler).toEqual({
      kategori: [a],
      stok: ["dusuk", "tukendi"],
    });
    expect(sema.safeParse({ marka: "bozuk" }).success).toBe(false);
    expect(sema.safeParse({ stok: "hepsi" }).success).toBe(false);
  });

  it("ürün listesinin girdisi durumdan kurulur", () => {
    const durum = listeDurumunuOku(urun, {
      durum: "taslak,yayinda",
      marka: a,
      stok: "dusuk",
      ara: " şal ",
      sirala: "fiyat-artan",
      sayfa: "2",
    });
    expect(urunListesiGirdisi(durum, 50)).toEqual({
      ara: "şal",
      // Seçenekler tanımın sırasıyla (urunDurumlari).
      durum: ["taslak", "yayinda"],
      kategori: [],
      marka: [a],
      stok: ["dusuk"],
      siralama: "fiyat-artan",
      sayfa: 2,
      sayfaBoyu: 50,
    });
  });
});
