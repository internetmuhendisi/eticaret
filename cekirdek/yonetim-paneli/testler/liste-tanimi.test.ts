// Panel listelerinin ortak tanımı (kart 0258): adresin okunması ve yazılması, liste ucunun girdisi. Gerçek tanımlar
// (siparişler, stok bildirimleri) ve bir deneme tanımıyla.
import { describe, expect, it } from "vitest";
import { stokBildirimleriListesiTanimi } from "../../eklentiler/stoga-gelince-haber-ver/panel/liste-tanimi.ts";
import { siparisIslemleri } from "../../kayitlar/siparis.ts";
import {
  type ListeTanimi,
  listeAdresi,
  listeDurumunuOku,
  listeSorgusu,
  listeUcuSemasi,
  suzgecliMi,
} from "../liste/tanim.ts";
import { siparisListesiGirdisi, siparisListesiTanimi } from "../siparisler/liste-tanimi.ts";

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
    expect(listeDurumunuOku(tanim, { durum: ["iade-talebi", "kargoda"] }).suzgecler).toEqual({
      durum: ["iade-talebi"],
    });
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
      sema.parse({ durum: "iade-talebi", odeme: "havale,kart,havale", ara: " ayşe ", sayfa: "2" }),
    ).toEqual({
      suzgecler: { durum: ["iade-talebi"], odeme: ["havale", "kart"] },
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
  it("sekme durum ya da bekleyen iade talebi olur, sayfa başına satır ayardan", () => {
    const oku = (sorgu: Record<string, string>) =>
      siparisListesiGirdisi(listeDurumunuOku(tanim, sorgu), 50);
    expect(oku({ durum: "kargoda", odeme: "kart" })).toEqual({
      durum: "kargoda",
      odeme: ["kart"],
      siralama: "en-yeni",
      sayfa: 1,
      sayfaBoyu: 50,
    });
    expect(oku({ durum: "iade-talebi" })).toMatchObject({ talep: true });
    expect(oku({ durum: "iade-talebi" })).not.toHaveProperty("durum");
  });
});

describe("toplu işlemin izni (bağımsız kontrolün bulgusu)", () => {
  it("her toplu işlemin izni kayıttaki işleminkidir", () => {
    for (const { kod, izin } of siparisListesiTanimi.topluIslemler) {
      expect(izin).toBe(siparisIslemleri[kod].izin);
    }
  });
});
