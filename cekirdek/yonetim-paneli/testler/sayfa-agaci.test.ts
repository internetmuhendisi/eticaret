// Panelin sayfa ağacı (kart 0141, karar 0111): ağacın tutarlılığı, adres dosyalarıyla birebir aynı olması, menünün
// izinle süzülmesi ve sayfa yolu. Rol başına menü gerçek veritabanıyla panel-yetkisi.test.ts içindedir.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { type GirisIzni, izinler } from "../../kayitlar/izinler.ts";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { magazaBilgileriAdresi, panelAdresi } from "../adresler.ts";
import {
  menuyuKur,
  type PanelSayfaTanimi,
  panelGruplari,
  panelSayfalari,
  sayfaYoluAdimlari,
  sayfaYolunuKur,
} from "../sayfa-agaci.ts";
import { denemeAgaci } from "./deneme-agaci.ts";

const metin = metinOkuyucu("tr");
const agac: readonly PanelSayfaTanimi[] = panelSayfalari;

const agacTutarli = (sayfalar: readonly PanelSayfaTanimi[]) => {
  const [kok] = sayfalar;
  expect(kok?.adres).toBe(panelAdresi);
  expect(kok?.izin).toBeNull();
  expect(kok?.ust).toBeUndefined();
  expect(new Set(sayfalar.map((s) => s.kod)).size).toBe(sayfalar.length);
  expect(new Set(sayfalar.map((s) => s.adres)).size).toBe(sayfalar.length);
  for (const sayfa of sayfalar) {
    expect(
      sayfa.adres === panelAdresi || sayfa.adres.startsWith(`${panelAdresi}/`),
      sayfa.kod,
    ).toBe(true);
    expect(metin(sayfa.ad), sayfa.kod).not.toBe("");
    expect(metin(sayfa.aciklama), sayfa.kod).not.toBe("");
    if (sayfa.izin !== null) expect(izinler[sayfa.izin].giris, sayfa.kod).toBe("yonetici");
    if (sayfa.ust !== undefined) {
      const ust = sayfalar.find((s) => s.kod === sayfa.ust);
      expect(ust, `${sayfa.kod} üstü`).toBeDefined();
      // Alt sayfa üstünün adresinin altındadır: menüde üstü seçili kalır.
      expect(sayfa.adres.startsWith(`${ust?.adres}/`), sayfa.kod).toBe(true);
      // Döngü yok: kökten yol sayfanın kendisiyle biter ve her sayfa bir kez geçer.
      const yol = sayfaYolunuKur(sayfalar, sayfa.kod);
      expect(yol.at(-1)).toBe(sayfa);
      expect(new Set(yol).size).toBe(yol.length);
    }
  }
};

describe("sayfa ağacı", () => {
  it("panelin ağacı ve deneme ağacı tutarlı: kök başta, kod ve adres tekil, adres panelde, metinler var", () => {
    agacTutarli(agac);
    agacTutarli(denemeAgaci);
  });

  it("her grubun adı var", () => {
    for (const ad of Object.values(panelGruplari)) expect(metin(ad)).not.toBe("");
  });

  // Ağaçtaki her sayfanın adres dosyası var; (panel) altındaki her sayfa ağaçta ve PanelSayfasi'na kendi kodunu
  // verir. Ağaçta olup dosyası olmayan sayfa menüde bulunamadıya giderdi.
  it("ağaç (panel) klasöründeki sayfa dosyalarıyla birebir aynı", () => {
    const klasor = resolve(import.meta.dirname, "../../uygulama/app/yonetim/(panel)");
    const dosyalar = (yer: string): string[] =>
      readdirSync(yer, { withFileTypes: true }).flatMap((girdi) =>
        girdi.isDirectory() ? dosyalar(join(yer, girdi.name)) : [join(yer, girdi.name)],
      );
    const sayfaDosyalari = dosyalar(klasor)
      .filter((yol) => yol.endsWith("page.tsx") && !yol.includes("[..."))
      .map((yol) => {
        const goreli = relative(klasor, yol).replace(/\/?page\.tsx$/, "");
        const adres = goreli === "" ? panelAdresi : `${panelAdresi}/${goreli}`;
        const icerik = readFileSync(yol, "utf8");
        return { adres, kod: /<PanelSayfasi\s+kod="([^"]+)"/.exec(icerik)?.[1] };
      });
    expect(sayfaDosyalari.map(({ adres }) => adres).sort()).toEqual(
      agac.map(({ adres }) => adres).sort(),
    );
    for (const { adres, kod } of sayfaDosyalari) {
      expect(kod, adres).toBe(agac.find((sayfa) => sayfa.adres === adres)?.kod);
    }
  });
});

describe("menü", () => {
  const yalniz =
    (...verilen: GirisIzni<"yonetici">[]) =>
    (izin: GirisIzni<"yonetici">) =>
      verilen.includes(izin);

  it("izni olmayan sayfa ve alt sayfa menüde yok, boş grup yok, gruplar ve sayfalar sırasıyla", () => {
    expect(menuyuKur(denemeAgaci, () => false)).toEqual([
      {
        grup: null,
        sayfalar: [
          { kod: "karsilama", adres: panelAdresi, ad: "yonetim.sayfa.karsilama.ad", ikon: "ev" },
        ],
      },
    ]);
    const hepsi = menuyuKur(denemeAgaci, () => true);
    expect(hepsi.map(({ grup }) => grup)).toEqual([null, "vitrin"]);
    expect(hepsi.flatMap(({ sayfalar }) => sayfalar.map(({ kod }) => kod))).toEqual([
      "karsilama",
      "urunler",
      "bolumler",
      "menuler",
      "tema",
    ]);
    const sinirli = menuyuKur(denemeAgaci, yalniz("duzen.gor", "urun.gor"));
    expect(sinirli.flatMap(({ sayfalar }) => sayfalar.map(({ kod }) => kod))).toEqual([
      "karsilama",
      "urunler",
      "bolumler",
    ]);
  });

  it("eklentinin getirdiği sayfa yalnız eklenti açıkken menüdedir (kart 0144)", () => {
    const kodlar = (acik: boolean) =>
      menuyuKur(
        agac,
        () => true,
        () => acik,
      ).flatMap(({ sayfalar }) => sayfalar.map(({ kod }) => kod));
    expect(kodlar(true)).toContain("stok-bildirimleri");
    expect(kodlar(false)).not.toContain("stok-bildirimleri");
    // Eklenti açıklığı verilmezse kapalı sayılır.
    expect(
      menuyuKur(agac, () => true).flatMap(({ sayfalar }) => sayfalar.map(({ kod }) => kod)),
    ).not.toContain("stok-bildirimleri");
    // Açık eklentinin sayfası izni olmayana yine görünmez.
    expect(
      menuyuKur(
        agac,
        () => false,
        () => true,
      ).flatMap(({ sayfalar }) => sayfalar.map(({ kod }) => kod)),
    ).not.toContain("stok-bildirimleri");
  });

  it("panelin bugünkü menüsü izinsiz yöneticide de karşılamayı gösterir", () => {
    expect(menuyuKur(agac, () => false)[0]?.sayfalar[0]?.kod).toBe("karsilama");
  });
});

describe("sayfa yolu", () => {
  it("kökten başlar, üst sayfaları sırasıyla geçer, kök tek adımdır", () => {
    expect(sayfaYolunuKur(denemeAgaci, "karsilama").map(({ kod }) => kod)).toEqual(["karsilama"]);
    expect(sayfaYolunuKur(denemeAgaci, "menuler").map(({ kod }) => kod)).toEqual([
      "karsilama",
      "menuler",
    ]);
    expect(sayfaYolunuKur(denemeAgaci, "menu-ogesi").map(({ kod }) => kod)).toEqual([
      "karsilama",
      "menuler",
      "menu-ogesi",
    ]);
  });

  it("döngülü ağaçta sonsuza dönmez", () => {
    const dongulu: PanelSayfaTanimi[] = [
      ...denemeAgaci.slice(0, 1),
      { ...denemeAgaci[1], kod: "a", adres: `${panelAdresi}/a`, ust: "b" } as PanelSayfaTanimi,
      { ...denemeAgaci[1], kod: "b", adres: `${panelAdresi}/a/b`, ust: "a" } as PanelSayfaTanimi,
    ];
    expect(sayfaYolunuKur(dongulu, "b").map(({ kod }) => kod)).toEqual(["karsilama", "a", "b"]);
  });
});

// Kart 0301: taslağın (karar 0157) "Ayarlar" grubu. Mağaza ayarlarının ekranları siparişlerden ayrı, taslağın sırasıyla;
// banka hesapları ödeme yöntemlerinin yanında.
describe("gruplar (kart 0301)", () => {
  const kodlar = (grup: string | null) =>
    menuyuKur(
      agac,
      () => true,
      () => true,
    )
      .find((g) => g.grup === grup)
      ?.sayfalar.map(({ kod }) => kod);

  it("gerçek menünün grupları ve Satış ile Ayarlar'ın sayfaları sırasıyla", () => {
    expect(
      menuyuKur(
        agac,
        () => true,
        () => true,
      ).map(({ grup }) => grup),
    ).toEqual([null, "satis", "katalog", "icerik", "vitrin", "ayarlar"]);
    // Kart 0324 (karar 0200): ürün ekranlarının grubu "Katalog"; adı içindeki "Ürünler" sayfasından ayrı.
    expect(kodlar("katalog")?.[0]).toBe("urunler");
    expect(metin(panelGruplari.katalog)).toBe("Katalog");
    expect(Object.values(panelGruplari).map((ad) => metin(ad))).toEqual([
      "Satış",
      "Katalog",
      "İçerik",
      "Vitrin",
      "Ayarlar",
    ]);
    for (const grup of menuyuKur(
      agac,
      () => true,
      () => true,
    )) {
      if (grup.grup === null) continue;
      const grubunAdi = metin(panelGruplari[grup.grup]);
      expect(grup.sayfalar.map(({ ad }) => metin(ad))).not.toContain(grubunAdi);
    }
    // Kuponlar Satış grubundadır, müşterilerden sonra (kart 0313, taslak).
    expect(kodlar("satis")).toEqual(["siparisler", "musteriler", "kuponlar"]);
    expect(kodlar("ayarlar")).toEqual([
      "magaza-bilgileri",
      "siparis-ayarlari",
      "odeme-yontemleri",
      "banka-hesaplari",
      "kargo",
      "vergi",
      // Kart 0279: e-postalar, vergiden sonra (taslak).
      "epostalar",
      "ekip",
      "hesabim",
    ]);
  });

  it("sayfa yolunun kökü Panel, grubun adı kökten sonra, bağlantısız; kökte ve grupsuz sayfada grup yok", () => {
    // Kart 0324 (karar 0200): yolun başı bütün paneldir ("Panel"), kökün menüdeki adı ("Karşılama") değil.
    const kok = { ad: "yonetim.sayfaYoluKok", adres: panelAdresi };
    expect(metin(kok.ad as Parameters<typeof metin>[0])).toBe("Panel");
    expect(sayfaYoluAdimlari(agac, "karsilama")).toEqual([kok]);
    expect(sayfaYoluAdimlari(agac, "magaza-bilgileri")).toEqual([
      kok,
      { ad: "yonetim.grup.ayarlar" },
      { ad: "yonetim.sayfa.magazaBilgileri.ad", adres: magazaBilgileriAdresi },
    ]);
    expect(sayfaYoluAdimlari(agac, "siparis-ayrintisi").map(({ ad }) => ad)).toEqual([
      "yonetim.sayfaYoluKok",
      "yonetim.grup.satis",
      "yonetim.sayfa.siparisler.ad",
      "yonetim.sayfa.siparisAyrintisi.ad",
    ]);
    // Deneme ağacında ürünler grupsuzdur: yol yalnız kök ve sayfanın kendisi.
    expect(sayfaYoluAdimlari(denemeAgaci, "urunler").map(({ adres }) => adres)).toEqual([
      panelAdresi,
      `${panelAdresi}/urunler`,
    ]);
    // Olmayan sayfada sayfaYolunuKur gibi yalnız kök.
    expect(sayfaYoluAdimlari(agac, "olmayan")).toEqual([kok]);
  });
});
