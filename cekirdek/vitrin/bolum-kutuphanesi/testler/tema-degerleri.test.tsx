// @vitest-environment jsdom
// Temadan temaya değişen vitrin değerleri (kart 0124): bölümler bu değerleri temanın değişkenlerinden okuyan
// sınıflarla çizer, elle sabit bir değer yazmaz. Değerlerin üç temadaki karşılığı tasarım değerlerindedir
// (bilesenler/tasarim-degerleri/degerler.ts), sayfaya yazılması css.test.ts'te, derlenmiş kuralı tailwind.test.ts'te.
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { dugmeSiniflari } from "../../../../bilesenler/parcalar/dugme.tsx";
import { rozetSiniflari } from "../../../../bilesenler/parcalar/rozet.tsx";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import { ornekAnaSayfa, ornekBaglam, ornekUrunBolumleri } from "../../../katalog/ornek-baglam.ts";
import { islevler } from "../../../kayitlar/islevler.ts";
import { MetinSaglayici } from "../../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../../metinler/metin.ts";
import { AnaSayfa } from "../../ana-sayfa.tsx";
import { izgaraSiniflari, seritSiniflari } from "../../bolumler/ortak/urun-izgarasi.tsx";
import { DuzenAlaniCizimi } from "../../duzen-alani.tsx";
import type { VitrinBaglami } from "../baglam.ts";
import { bolumGorunumleri } from "../gorunumler.tsx";

beforeAll(() => {
  (globalThis as Record<symbol, unknown>)[Symbol.for("cekirdek.calisanSite")] = siteKlasorunuOku(
    resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
});

const siniflari = (el: Element | null | undefined) => (el?.getAttribute("class") ?? "").split(" ");

const anaSayfa = () => {
  const kap = document.createElement("div");
  kap.innerHTML = renderToStaticMarkup(
    <MetinSaglayici dil="tr">
      <AnaSayfa
        magazaAdi="Deneme Dükkânı"
        yakindaYazisi
        duzen={{
          bolumler: [...ornekAnaSayfa(), ...ornekUrunBolumleri()],
          gorunumler: bolumGorunumleri,
          baglam: ornekBaglam(),
        }}
      />
    </MetinSaglayici>,
  );
  return kap;
};

describe("temanın değerlerini okuyan sınıflar", () => {
  it("ana sayfanın bölüm aralığı temanın boşluğudur, telefonda ve masaüstünde", () => {
    const main = anaSayfa().querySelector("main");
    expect(siniflari(main)).toEqual(
      expect.arrayContaining([
        "gap-bolum",
        "pb-bolum",
        "masaustu:gap-bolum-masaustu",
        "masaustu:pb-bolum-masaustu",
      ]),
    );
  });

  it("kayan afişin düğmesi afiş düğmesi rengi ve başlık biçimiyle çizilir", () => {
    const afis = anaSayfa().querySelector('section[aria-roledescription="kayan afiş"]');
    const dugme = afis?.querySelector('a[data-slot="baglanti"]');
    expect(siniflari(dugme)).toEqual(
      expect.arrayContaining(["bg-afis-dugmesi", "text-afis-dugmesi-ustu", "baslik-bicimi"]),
    );
    // Afişin üst yazısı rozettir: temanın rozet rengi.
    expect(siniflari(afis?.querySelector('[data-slot="rozet"]'))).toContain("bg-rozet");
  });

  it('ürün bölümünün "Tümünü gör" bağlantısı vurgu yazısının rengindedir', () => {
    // Başlık satırındaki bağlantı; yan afişin düğmesi (örnekte yazısı aynı) düğme görünümlüdür, sayılmaz.
    const tumu = [...anaSayfa().querySelectorAll("main a")].filter(
      (a) =>
        a.textContent === metinOkuyucu("tr")("vitrin.bolum.urun.tumunuGor") &&
        !siniflari(a).includes("rounded-dugme"),
    );
    expect(tumu.length).toBeGreaterThan(0);
    for (const baglanti of tumu) expect(siniflari(baglanti)).toContain("text-vurgu-yazi");
  });

  it("güven şeridinin ikonu vurgu yazısının rengindedir", () => {
    const serit = anaSayfa().querySelector('section[aria-label="Alışveriş güvenceleri"]');
    const ikonlar = [...(serit?.querySelectorAll("svg") ?? [])];
    expect(ikonlar.length).toBeGreaterThan(0);
    for (const ikon of ikonlar) expect(siniflari(ikon.parentElement)).toContain("text-vurgu-yazi");
  });

  it("dikey ürün kartının kenarı ve yazı alanının iç boşluğu temanındır", () => {
    const kap = anaSayfa();
    const kartlar = [...kap.querySelectorAll('[data-slot="urun-karti"][data-gorunum="dikey"]')];
    expect(kartlar.length).toBeGreaterThan(0);
    for (const kart of kartlar) {
      expect(siniflari(kart)).toContain("border-kart-kenari");
      expect(siniflari(kart)).not.toContain("border-kenar");
      expect(kart.querySelector(".p-kart-ici")).not.toBeNull();
    }
  });

  it("tam genişlikteki dikey ızgara ve şerit geniş ekranda temanın sütun sayısıdır; yan afişli ızgara dörttür", () => {
    expect(izgaraSiniflari("dikey", "tam").split(" ")).toContain("genis:grid-cols-urun");
    expect(izgaraSiniflari("dikey", "tam")).not.toMatch(/genis:grid-cols-\d/);
    expect(izgaraSiniflari("dikey", "yanli").split(" ")).toContain("genis:grid-cols-4");
    expect(seritSiniflari.dikey.split(" ")).toContain("genis:basis-urun");
  });

  it("rozet temanın rozet rengindedir, afiş düğmesi afiş düğmesi rengindedir", () => {
    expect(rozetSiniflari().split(" ")).toEqual(
      expect.arrayContaining(["bg-rozet", "text-rozet-ustu"]),
    );
    expect(rozetSiniflari().split(" ")).not.toContain("bg-birincil");
    expect(dugmeSiniflari({ tur: "afis" }).split(" ")).toEqual(
      expect.arrayContaining(["bg-afis-dugmesi", "text-afis-dugmesi-ustu", "baslik-bicimi"]),
    );
  });

  it("üst satırdaki sayı rozeti temanın rozet rengindedir", () => {
    const baglam: VitrinBaglami = {
      ...ornekBaglam(),
      islevler: Object.fromEntries(
        islevler.map((islev) => [islev, true]),
      ) as VitrinBaglami["islevler"],
      sayilar: { sepet: 2 },
    };
    const kap = document.createElement("div");
    kap.innerHTML = renderToStaticMarkup(
      <MetinSaglayici dil="tr">
        <DuzenAlaniCizimi
          bolumler={[
            { kimlik: "u-1", tur: "ust-satir", gorunum: "logo-solda", gizli: false, degerler: {} },
          ]}
          gorunumler={bolumGorunumleri}
          baglam={baglam}
        />
      </MetinSaglayici>,
    );
    const sayi = [...kap.querySelectorAll("span")].find((s) => s.textContent === "2");
    expect(siniflari(sayi)).toEqual(expect.arrayContaining(["bg-rozet", "text-rozet-ustu"]));
  });
});
