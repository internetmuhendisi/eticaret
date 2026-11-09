// @vitest-environment jsdom
// Ana sayfanın afiş ve tanıtım bölümleri (kart 0110, karar 0087) sunucuda çizilerek: içerik yalnız alan
// değerlerinden ve bağlamdan gelir; görsel bağlamda yoksa çizilmez; silinen kategori görünmez; güven
// şeridinin yer tutucusu ayardan dolar, değeri olmayan madde çizilmez; kayan afişte yalnız ilk slayt görünür,
// slayt adı "1 / 3", durdurma düğmesi yalnız kendiliğinden geçerken, tek slaytta gezinme yok; katalog örnekleri
// tariften geçer; ana sayfa bölüm yoksa sade hâliyle açılır. Kayan afişin tarayıcıdaki davranışı (geçiş,
// durdurma, klavye, hareket azaltma) cekirdek/testler/uctan-uca/katalog.test.ts'tedir.
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { ikonlar } from "../../../../bilesenler/ikonlar/sozluk.ts";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import {
  ornekAnaSayfa,
  ornekAnaSayfaOtekiGorunumler,
  ornekBaglam,
  ornekGorselKimligi,
  ornekKategoriKimligi,
} from "../../../katalog/ornek-baglam.ts";
import { MetinSaglayici } from "../../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../../metinler/metin.ts";
import { AnaSayfa } from "../../ana-sayfa.tsx";
import { guvenIkonlari, guvenSeridi } from "../../bolumler/guven-seridi/tarif.ts";
import { DuzenAlaniCizimi } from "../../duzen-alani.tsx";
import type { VitrinBaglami } from "../baglam.ts";
import { type BolumOrnegi, bolumuDenetle } from "../duzen.ts";
import { bolumGorunumleri } from "../gorunumler.tsx";
import { bolumKutuphanesi } from "../kutuphane.ts";
import { secimDegeri } from "../tarif.ts";
import { yerTutuculariDoldur } from "../yer-tutucu.ts";

const metin = metinOkuyucu("tr");

beforeAll(() => {
  (globalThis as Record<symbol, unknown>)[Symbol.for("cekirdek.calisanSite")] = siteKlasorunuOku(
    resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
});

let sira = 0;
const bolum = (tur: string, gorunum: string, degerler: Record<string, unknown>): BolumOrnegi => {
  sira += 1;
  return { kimlik: `b-${sira}`, tur, gorunum, gizli: false, degerler };
};

const ciz = (bolumler: BolumOrnegi[], baglam: VitrinBaglami = ornekBaglam()) => {
  const kap = document.createElement("div");
  kap.innerHTML = renderToStaticMarkup(
    <MetinSaglayici dil="tr">
      <DuzenAlaniCizimi bolumler={bolumler} gorunumler={bolumGorunumleri} baglam={baglam} />
    </MetinSaglayici>,
  );
  return kap;
};

const anasayfa = { adres: "/", yeniSekme: false };

describe("tarifler ve katalog örnekleri", () => {
  it("katalogdaki örnekler bölüm kütüphanesinin kurallarından geçer", () => {
    for (const ornek of [...ornekAnaSayfa(), ...ornekAnaSayfaOtekiGorunumler()]) {
      const sonuc = bolumuDenetle(bolumKutuphanesi, "ana-sayfa", ornek, [], { baslangic: false });
      expect(sonuc, `${ornek.tur} ${ornek.gorunum}`).not.toHaveProperty("sorunlar");
    }
  });

  it("beş bölüm yalnız ana sayfaya konur", () => {
    for (const tur of [
      "kayan-afis",
      "guven-seridi",
      "kampanya-afisleri",
      "genis-afis",
      "kategori-kutulari",
    ]) {
      expect(bolumKutuphanesi[tur]?.duzenAlanlari).toEqual(["ana-sayfa"]);
    }
  });

  it("güven şeridinin her ikonu ikon sözlüğünde, seçenekler ikon listesiyle aynı", () => {
    const secenekler = guvenSeridi.alanlar.maddeler.alanlar.ikon.secenekler.map((s) => s.kod);
    expect(secenekler).toEqual([...guvenIkonlari]);
    for (const ikon of guvenIkonlari) expect(Object.hasOwn(ikonlar, ikon), ikon).toBe(true);
  });

  it("seçeneklerde olmayan seçim değeri tariften geçmez", () => {
    const denetle = (gecis: unknown) =>
      bolumuDenetle(
        bolumKutuphanesi,
        "ana-sayfa",
        {
          tur: "kayan-afis",
          gorunum: "yazi-solda",
          degerler: { slaytlar: [{ baslik: "A" }], gecis },
        },
        [],
        { baslangic: false },
      );
    expect(denetle("kisa")).not.toHaveProperty("sorunlar");
    expect(denetle("olmayan")).toHaveProperty("sorunlar");
    const guven = (ikon: unknown) =>
      bolumuDenetle(
        bolumKutuphanesi,
        "ana-sayfa",
        { tur: "guven-seridi", gorunum: "ikonlu", degerler: { maddeler: [{ ikon, metin: "a" }] } },
        [],
        { baslangic: false },
      );
    expect(guven("iade")).not.toHaveProperty("sorunlar");
    expect(guven("menu")).toHaveProperty("sorunlar");
  });

  it("seçimin değeri verilmemişse ya da seçeneklerde değilse varsayılandır", () => {
    const alan = guvenSeridi.alanlar.maddeler.alanlar.ikon;
    expect(secimDegeri(alan, "iade")).toBe("iade");
    expect(secimDegeri(alan, undefined)).toBe("kargo");
    expect(secimDegeri(alan, "olmayan")).toBe("kargo");
  });

  it("yer tutucu ayar değeriyle dolar; bilinmeyen ya da değeri olmayan yer tutucuda metin yoktur", () => {
    const degerler = { kargoyaVermeSuresi: "2" };
    expect(yerTutuculariDoldur("{kargoyaVermeSuresi} iş gününde kargoda", degerler)).toBe(
      "2 iş gününde kargoda",
    );
    expect(yerTutuculariDoldur("Kolay iade", degerler)).toBe("Kolay iade");
    expect(yerTutuculariDoldur("{ucretsizKargoSiniri} üzeri", degerler)).toBeUndefined();
    expect(yerTutuculariDoldur("{kargoyaVermeSuresi}", {})).toBeUndefined();
    // Nesnenin kendi alanı olmayan ad yer tutucu sayılmaz.
    expect(yerTutuculariDoldur("{toString}", degerler)).toBeUndefined();
  });
});

describe("kayan afiş", () => {
  const slaytlar = [
    {
      gorsel: ornekGorselKimligi.kare(0),
      gorselMetni: "Birinci görsel",
      ustYazi: "Üst",
      baslik: "Birinci",
      metin: "Açıklama",
      dugmeYazisi: "İncele",
      baglanti: anasayfa,
    },
    { baslik: "İkinci", dugmeYazisi: "Bağlantısız düğme" },
    { baslik: "Üçüncü", baglanti: anasayfa },
  ];

  it("yalnız ilk slayt görünür, adı 1 / 3; rol tanımları; durdurma, önceki, sonraki ve üç nokta", () => {
    const kap = ciz([bolum("kayan-afis", "yazi-solda", { slaytlar })]);
    const afis = kap.querySelector("section");
    expect(afis?.getAttribute("aria-roledescription")).toBe(
      metin("vitrin.bolum.kayanAfis.rolTanimi"),
    );
    const gruplar = kap.querySelectorAll('[role="group"]');
    expect(gruplar).toHaveLength(1);
    expect(gruplar[0]?.getAttribute("aria-label")).toBe("1 / 3");
    expect(gruplar[0]?.getAttribute("aria-roledescription")).toBe(
      metin("vitrin.bolum.kayanAfis.slaytTanimi"),
    );
    expect(kap.querySelector("h2")?.textContent).toBe("Birinci");
    expect(kap.textContent).not.toContain("İkinci");
    const dugmeler = [...kap.querySelectorAll("button")].map((d) => d.getAttribute("aria-label"));
    expect(dugmeler).toEqual([
      metin("vitrin.bolum.kayanAfis.durdur"),
      metin("vitrin.bolum.kayanAfis.onceki"),
      "1. slaytı göster",
      "2. slaytı göster",
      "3. slaytı göster",
      metin("vitrin.bolum.kayanAfis.sonraki"),
    ]);
    expect(kap.querySelector('[aria-current="true"]')?.getAttribute("aria-label")).toBe(
      "1. slaytı göster",
    );
    // Kendiliğinden geçerken yeni slayt duyurulmaz.
    expect(kap.querySelector("[aria-live]")?.getAttribute("aria-live")).toBe("off");
    const gorsel = kap.querySelector("img");
    expect(gorsel?.getAttribute("alt")).toBe("Birinci görsel");
    expect(gorsel?.getAttribute("loading")).toBe("eager");
    expect(kap.querySelector("a")?.textContent).toBe("İncele");
    // Klavye sırasında afişin ilk denetimi durdurma düğmesidir; slaytın düğmesi denetimlerden sonradır.
    const odaklanabilenler = [...kap.querySelectorAll("a, button")].map(
      (oge) => oge.getAttribute("aria-label") ?? oge.textContent,
    );
    expect(odaklanabilenler[0]).toBe(metin("vitrin.bolum.kayanAfis.durdur"));
    expect(odaklanabilenler.at(-1)).toBe("İncele");
  });

  it("kendiliğinden geçmeyen afişte durdurma düğmesi yok, slayt duyurulur; tek slaytta gezinme yok", () => {
    const kapali = ciz([bolum("kayan-afis", "yazi-solda", { slaytlar, gecis: "kapali" })]);
    const adlar = [...kapali.querySelectorAll("button")].map((d) => d.getAttribute("aria-label"));
    expect(adlar).not.toContain(metin("vitrin.bolum.kayanAfis.durdur"));
    expect(adlar).not.toContain(metin("vitrin.bolum.kayanAfis.baslat"));
    expect(adlar).toContain(metin("vitrin.bolum.kayanAfis.sonraki"));
    expect(kapali.querySelector("[aria-live]")?.getAttribute("aria-live")).toBe("polite");
    const tek = ciz([bolum("kayan-afis", "yazi-solda", { slaytlar: slaytlar.slice(0, 1) })]);
    expect(tek.querySelectorAll("button")).toHaveLength(0);
  });

  it("bağlantısı ya da düğme yazısı olmayan slaytta düğme yok; görseli bağlamda olmayan slaytta görsel yok", () => {
    const kap = ciz([
      bolum("kayan-afis", "gorsel-arkada", {
        slaytlar: [{ baslik: "Tek", dugmeYazisi: "Bağlantısız", gorsel: ornekKategoriKimligi(0) }],
      }),
    ]);
    expect(kap.querySelector("a")).toBeNull();
    expect(kap.querySelector("img")).toBeNull();
    const yalnizBaglanti = ciz([
      bolum("kayan-afis", "yazi-solda", { slaytlar: [{ baslik: "Tek", baglanti: anasayfa }] }),
    ]);
    expect(yalnizBaglanti.querySelector("a")).toBeNull();
  });

  it("telefon görseli verilmişse telefonda o, daha geniş ekranda asıl görsel", () => {
    const kap = ciz([
      bolum("kayan-afis", "yazi-solda", {
        slaytlar: [
          {
            baslik: "Tek",
            gorsel: ornekGorselKimligi.genis(0),
            darEkranGorseli: ornekGorselKimligi.dikey,
          },
        ],
      }),
    ]);
    const kaynaklar = [...kap.querySelectorAll("picture source")];
    expect(kaynaklar).toHaveLength(2);
    expect(kaynaklar[0]?.getAttribute("media")).toBe("(min-width: 40rem)");
    expect(kaynaklar[0]?.getAttribute("srcset")).toBe(
      ornekBaglam()
        .gorseller[ornekGorselKimligi.genis(0)]?.kaynaklar.map((k) => `${k.adres} ${k.genislik}w`)
        .join(", "),
    );
    expect(kaynaklar[1]?.getAttribute("media")).toBeNull();
    expect(kaynaklar[1]?.getAttribute("srcset")).toContain(
      ornekBaglam().gorseller[ornekGorselKimligi.dikey]?.kaynaklar[0]?.adres ?? "-",
    );
  });

  it("zemin rengi okunur çiftiyle; renkli zeminde odak yazının renginde; varsayılan afiş rengi", () => {
    const varsayilan = ciz([bolum("kayan-afis", "yazi-solda", { slaytlar })]);
    expect(varsayilan.firstElementChild?.className).toContain(
      "bg-afis text-afis-ustu odak-yazi-renginde",
    );
    const kutu = ciz([bolum("kayan-afis", "yazi-solda", { slaytlar, zemin: "kutu-3" })]);
    expect(kutu.firstElementChild?.className).toContain("bg-kutu-3 text-yazi odak-yazi-renginde");
  });
});

describe("güven şeridi", () => {
  it("maddeler ikonu ve metniyle; yer tutucu ayardan dolar, değeri olmayan madde çizilmez", () => {
    const kap = ciz([
      bolum("guven-seridi", "ikonlu", {
        maddeler: [
          { ikon: "paket", metin: "{kargoyaVermeSuresi} iş gününde kargoda" },
          { ikon: "iade", metin: "{iadeSuresi} gün içinde iade" },
          { metin: "Kolay iade" },
        ],
      }),
    ]);
    const maddeler = [...kap.querySelectorAll("li")].map((li) => li.textContent);
    expect(maddeler).toEqual(["1 iş gününde kargoda", "Kolay iade"]);
    expect(kap.querySelectorAll("li svg")).toHaveLength(2);
    expect(kap.querySelector("section")?.getAttribute("aria-label")).toBe(
      metin("vitrin.bolum.guvenSeridi.etiket"),
    );
  });

  it("hiçbir madde çizilemiyorsa bölüm yok", () => {
    expect(
      ciz([bolum("guven-seridi", "kutulu", { maddeler: [{ metin: "{olmayan}" }] })]).innerHTML,
    ).not.toContain("<section");
  });
});

describe("kampanya afişleri", () => {
  it("afişin başlığı bağlantıdır ve afişin tamamına yayılır; rozet koyu; düğme yazısı ekran okuyucuda okunmaz", () => {
    const kap = ciz([
      bolum(
        "kampanya-afisleri",
        "yatay",
        (ornekAnaSayfa()[2]?.degerler ?? {}) as { afisler?: unknown },
      ),
    ]);
    const afisler = kap.querySelectorAll("li");
    expect(afisler).toHaveLength(3);
    const baglanti = afisler[0]?.querySelector("h2 a");
    expect(baglanti?.textContent).toBe(metin("gelistirme.bolum.ornek.anaSayfa.kampanya1Baslik"));
    expect(baglanti?.className).toContain("after:inset-0");
    expect(afisler[0]?.className).toContain("relative");
    expect(afisler[0]?.querySelector('[data-slot="rozet"]')?.className).toContain("bg-yazi");
    expect(afisler[0]?.querySelector('[aria-hidden="true"]')?.textContent).toBe(
      metin("gelistirme.bolum.ornek.anaSayfa.kampanyaDugme"),
    );
    // Bağlantısız afişte bağlantı ve düğme yazısı yok, görselsiz afişte görsel yok.
    expect(afisler[2]?.querySelector("a")).toBeNull();
    expect(afisler[2]?.querySelector("img")).toBeNull();
  });

  it("rengi seçilmeyen afiş sırasıyla kutu renklerini alır, seçilen renk kullanılır", () => {
    const kap = ciz([
      bolum("kampanya-afisleri", "dikey", {
        afisler: [{ baslik: "A" }, { baslik: "B" }, { baslik: "C", zemin: "afis" }],
      }),
    ]);
    const siniflar = [...kap.querySelectorAll("li")].map((li) => li.className);
    expect(siniflar[0]).toContain("bg-kutu-1");
    expect(siniflar[1]).toContain("bg-kutu-2");
    expect(siniflar[2]).toContain("bg-afis");
  });
});

describe("geniş afiş", () => {
  it("varsayılan zemin alt kısım rengi, metin onun soluk yazısıyla; bağlantı afişin tamamına yayılır", () => {
    const kap = ciz([bolum("genis-afis", "yan-yana", ornekAnaSayfa()[4]?.degerler ?? {})]);
    expect(kap.querySelector(".bg-alt-kisim")).not.toBeNull();
    expect(kap.querySelector("p")?.className).toContain("text-alt-kisim-soluk");
    expect(kap.querySelector("h2 a")?.className).toContain("after:inset-0");
    expect(kap.querySelector("img")).not.toBeNull();
  });

  it("başlıksız geniş afiş çizilmez", () => {
    expect(ciz([bolum("genis-afis", "tam-genislik", { metin: "a" })]).innerHTML).toBe("");
  });
});

describe("kategori kutuları", () => {
  it("kategoriler adı, adresi ve görseliyle; bağlamda olmayan (silinmiş) kategori görünmez; görselsiz kategoride görsel yok", () => {
    const kap = ciz([
      bolum("kategori-kutulari", "izgara", {
        baslik: "Kategoriler",
        kategoriler: [
          { kategori: ornekKategoriKimligi(0) },
          { kategori: "00000000-0000-4000-8000-999999999999" },
          { kategori: ornekKategoriKimligi(6) },
        ],
      }),
    ]);
    const baglam = ornekBaglam();
    const kutular = [...kap.querySelectorAll("li a")];
    expect(kutular.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      [
        baglam.kategoriler[ornekKategoriKimligi(0)]?.ad,
        baglam.kategoriler[ornekKategoriKimligi(0)]?.adres,
      ],
      [
        baglam.kategoriler[ornekKategoriKimligi(6)]?.ad,
        baglam.kategoriler[ornekKategoriKimligi(6)]?.adres,
      ],
    ]);
    expect(kutular[0]?.querySelector("img")).not.toBeNull();
    expect(kutular[1]?.querySelector("img")).toBeNull();
    expect(kap.querySelector("h2")?.textContent).toBe("Kategoriler");
  });

  it("hiçbir kategori kalmazsa bölüm çizilmez; kaydırmalı görünüm şerittir", () => {
    expect(
      ciz([
        bolum("kategori-kutulari", "izgara", {
          kategoriler: [{ kategori: "00000000-0000-4000-8000-999999999999" }],
        }),
      ]).innerHTML,
    ).toBe("");
    const kaydirmali = ciz([
      bolum("kategori-kutulari", "kaydirmali", ornekAnaSayfa()[3]?.degerler ?? {}),
    ]);
    expect(kaydirmali.querySelector('[aria-roledescription="kaydırmalı şerit"]')).not.toBeNull();
  });
});

describe("ana sayfa", () => {
  const sayfa = (bolumler: BolumOrnegi[]) => {
    const kap = document.createElement("div");
    kap.innerHTML = renderToStaticMarkup(
      <MetinSaglayici dil="tr">
        <AnaSayfa
          magazaAdi="Deneme Dükkânı"
          yakindaYazisi
          duzen={{ bolumler, gorunumler: bolumGorunumleri, baglam: ornekBaglam() }}
        />
      </MetinSaglayici>,
    );
    return kap;
  };

  it("bölüm varsa onları çizer; başlık mağaza adı ve yalnız ekran okuyucuda", () => {
    const kap = sayfa(ornekAnaSayfa());
    const baslik = kap.querySelector("h1");
    expect(baslik?.textContent).toBe("Deneme Dükkânı");
    expect(baslik?.className).toBe("sr-only");
    expect(kap.textContent).not.toContain(metin("vitrin.anasayfa.yakindaAciliyoruz"));
    expect(kap.querySelectorAll("main > *").length).toBeGreaterThan(1);
  });

  it("bölüm yoksa sade sayfa: görünen ad ve yakında yazısı", () => {
    const kap = sayfa([]);
    expect(kap.querySelector("h1")?.className).not.toBe("sr-only");
    expect(kap.textContent).toContain(metin("vitrin.anasayfa.yakindaAciliyoruz"));
  });
});
