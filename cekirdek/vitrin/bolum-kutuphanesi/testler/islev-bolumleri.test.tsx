// @vitest-environment jsdom
// İşleve bağlı bölümler (kart 0112, karar 0090) çizilerek: tarifler ve katalog örnekleri, bağlı oldukları işlev,
// yalnız ana sayfaya konmaları; yorumlar seçilen kaynaktan ve adet kadar, puan ekran okuyucuda yazıyla, yorumu
// olmayan bölüm çizilmez; blog yazıları kategoriden ya da son yazılardan, tarih makine biçimiyle, kartın tek
// bağlantısı başlıkta, yazısı olmayan bölüm çizilmez; bülten başlıksız çizilmez, onay metni kayıt formuyla tek,
// form boşken iki hatayı gösterir, adres yokken istek gitmez, adres varken robot korumasıyla gider. Panelin
// çizilmeme nedeni her işlev için ayrı metindir.

import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { siteKlasorunuOku } from "../../../ayar-semasi/site-klasoru.ts";
import {
  ornekBaglam,
  ornekIslevBolumleri,
  ornekIslevBolumleriOtekiGorunumler,
} from "../../../katalog/ornek-baglam.ts";
import { islevler } from "../../../kayitlar/islevler.ts";
import { MetinSaglayici } from "../../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../../metinler/metin.ts";
import { doldur } from "../../../moduller/eposta/sablon.ts";
import { islevYokMetinleri } from "../../../yonetim-paneli/cizilmeme-nedeni.ts";
import { bultenKaydiSemasi } from "../../bolumler/bulten-kaydi/sema.ts";
import { musteriYorumlari } from "../../bolumler/musteri-yorumlari/tarif.ts";
import { BultenFormu } from "../../bulten-formu.tsx";
import { DuzenAlaniCizimi } from "../../duzen-alani.tsx";
import type { VitrinBaglami } from "../baglam.ts";
import { type BolumOrnegi, bolumuDenetle } from "../duzen.ts";
import { bolumGorunumleri } from "../gorunumler.tsx";
import {
  type BaglamBlogYazisi,
  type BaglamYorumu,
  blogKaynagiAnahtari,
  yorumKaynagiAnahtari,
  yorumKaynakTurleri,
} from "../islev-verisi.ts";
import { bolumKutuphanesi } from "../kutuphane.ts";
import { kayitliKip } from "../tarif.ts";

const metin = metinOkuyucu("tr");

// Radix'in onay kutusu formdaki gizli alanın boyutunu ResizeObserver ile izler; jsdom'da yoktur (form-alani.test.tsx
// ile aynı yol). Gerçek tarayıcıdaki davranış cekirdek/testler/uctan-uca/katalog.test.ts'tedir.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

beforeAll(() => {
  (globalThis as Record<symbol, unknown>)[Symbol.for("cekirdek.calisanSite")] = siteKlasorunuOku(
    resolve(import.meta.dirname, "../../../ayar-semasi/testler/ornek-siteler/gecerli"),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

let sira = 0;
const bolum = (tur: string, gorunum: string, degerler: Record<string, unknown>): BolumOrnegi => {
  sira += 1;
  return { kimlik: `b-${sira}`, tur, gorunum, gizli: false, degerler };
};
const ciz = (bolumler: BolumOrnegi[], baglam: VitrinBaglami) => {
  const kap = document.createElement("div");
  kap.innerHTML = renderToStaticMarkup(
    <MetinSaglayici dil="tr">
      <DuzenAlaniCizimi bolumler={bolumler} gorunumler={bolumGorunumleri} baglam={baglam} />
    </MetinSaglayici>,
  );
  return kap;
};

const an = new Date("2030-01-15T12:00:00Z");
const yorum = (no: number, puan = 5): BaglamYorumu => ({
  kimlik: `y-${no}`,
  puan,
  metin: `Yorum ${no}`,
  ad: `Ad ${no}`,
});
const yazi = (no: number, gorselli = false): BaglamBlogYazisi => ({
  kimlik: `b-${no}`,
  baslik: `Yazı ${no}`,
  ozet: `Özet ${no}`,
  adres: `/blog/yazi-${no}`,
  tarih: { yazili: `${no} Ocak 2030`, makine: `2030-01-0${no}` },
  ...(gorselli ? { gorsel: Object.keys(ornekBaglam(an).gorseller)[0] ?? "" } : {}),
});
const baglamIle = (ek: Partial<VitrinBaglami>): VitrinBaglami => ({
  ...ornekBaglam(an),
  yorumlar: {},
  blogYazilari: {},
  ...ek,
});

describe("tarifler ve katalog örnekleri", () => {
  it("katalogdaki örnekler bölüm kütüphanesinin kurallarından geçer", () => {
    for (const ornek of [...ornekIslevBolumleri(), ...ornekIslevBolumleriOtekiGorunumler()]) {
      const sonuc = bolumuDenetle(bolumKutuphanesi, "ana-sayfa", ornek, [], kayitliKip);
      expect(sonuc, `${ornek.tur} ${ornek.gorunum}`).not.toHaveProperty("sorunlar");
    }
  });

  it("üç bölüm yalnız ana sayfaya konur ve kendi işlevine bağlıdır (bülten yalnız ana sayfa, kullanıcı kararı)", () => {
    expect(
      ["musteri-yorumlari", "blog-yazilari", "bulten-kaydi"].map((tur) => [
        bolumKutuphanesi[tur]?.duzenAlanlari,
        bolumKutuphanesi[tur]?.islev,
      ]),
    ).toEqual([
      [["ana-sayfa"], "yorum"],
      [["ana-sayfa"], "blog"],
      [["ana-sayfa"], "bulten"],
    ]);
  });

  it("panelin çizilmeme nedeni her işlev için ayrı metindir; bülten eklentiyi söyler", () => {
    expect(Object.keys(islevYokMetinleri).toSorted()).toEqual([...islevler].toSorted());
    expect(new Set(Object.values(islevYokMetinleri)).size).toBe(islevler.length);
    expect(metin(islevYokMetinleri.bulten)).toContain("eklentisi");
  });
});

describe("müşteri yorumları", () => {
  it("işaretlenen yorumlar, adet kadar; puan ekran okuyucuda yazıyla, yıldızlar dolu", () => {
    const kaynak = yorumKaynagiAnahtari({ tur: "isaretlenenler", adet: 3 });
    const kap = ciz(
      [bolum("musteri-yorumlari", "kartlar", { baslik: "Ne diyorlar" })],
      baglamIle({ yorumlar: { [kaynak]: [yorum(1, 4), yorum(2), yorum(3), yorum(4)] } }),
    );
    expect(kap.querySelector("h2")?.textContent).toBe("Ne diyorlar");
    const kartlar = [...kap.querySelectorAll("figure")];
    expect(kartlar.map((kart) => kart.querySelector("blockquote")?.textContent)).toEqual([
      "Yorum 1",
      "Yorum 2",
      "Yorum 3",
    ]);
    expect(kartlar[0]?.querySelector("figcaption")?.textContent).toContain("Ad 1");
    expect(kartlar[0]?.querySelector(".sr-only")?.textContent).toBe("5 üzerinden 4 puan");
    expect(kartlar[0]?.querySelectorAll(".fill-current")).toHaveLength(4);
  });

  it("bozuk puan 1–5 arasına çekilir, NaN okunmaz; kaynak türleri tarifin seçenekleriyle aynı", () => {
    const kaynak = yorumKaynagiAnahtari({ tur: "isaretlenenler", adet: 3 });
    const kap = ciz(
      [bolum("musteri-yorumlari", "kartlar", {})],
      baglamIle({ yorumlar: { [kaynak]: [yorum(1, Number.NaN), yorum(2, 9), yorum(3, 0)] } }),
    );
    expect([...kap.querySelectorAll("figure .sr-only")].map((oge) => oge.textContent)).toEqual([
      "5 üzerinden 1 puan",
      "5 üzerinden 5 puan",
      "5 üzerinden 1 puan",
    ]);
    expect(musteriYorumlari.alanlar.kaynak.secenekler.map((secenek) => secenek.kod)).toEqual([
      ...yorumKaynakTurleri,
    ]);
  });

  it("en yeniler ve altı yorum seçilince o kaynak okunur; yorum yoksa bölüm çizilmez", () => {
    const kaynak = yorumKaynagiAnahtari({ tur: "en-yeni", adet: 6 });
    const degerler = { kaynak: "en-yeni", adet: "alti" };
    const kap = ciz(
      [bolum("musteri-yorumlari", "kaydirmali", degerler)],
      baglamIle({ yorumlar: { [kaynak]: [yorum(7)] } }),
    );
    expect(kap.querySelector("blockquote")?.textContent).toBe("Yorum 7");
    expect(ciz([bolum("musteri-yorumlari", "kartlar", degerler)], baglamIle({})).innerHTML).toBe(
      "",
    );
  });
});

describe("blog yazıları", () => {
  it("kategori seçilince o kategorinin, seçilmezse son yazılar; adet kadar", () => {
    const kategori = blogKaynagiAnahtari({ tur: "kategori", kategori: "tarifler", adet: 3 });
    const son = blogKaynagiAnahtari({ tur: "son", adet: 3 });
    const baglam = baglamIle({
      blogYazilari: { [kategori]: [yazi(1), yazi(2)], [son]: [yazi(5), yazi(6), yazi(7), yazi(8)] },
    });
    const basliklar = (kap: HTMLElement) =>
      [...kap.querySelectorAll("h3")].map((baslik) => baslik.textContent);
    expect(
      basliklar(ciz([bolum("blog-yazilari", "izgara", { kategori: "tarifler" })], baglam)),
    ).toEqual(["Yazı 1", "Yazı 2"]);
    expect(basliklar(ciz([bolum("blog-yazilari", "izgara", {})], baglam))).toEqual([
      "Yazı 5",
      "Yazı 6",
      "Yazı 7",
    ]);
  });

  it("kartın tek bağlantısı başlıkta; tarih makine biçimiyle; görsel yalnız varsa; yazı yoksa bölüm yok", () => {
    const son = blogKaynagiAnahtari({ tur: "son", adet: 3 });
    const kap = ciz(
      [bolum("blog-yazilari", "izgara", {})],
      baglamIle({ blogYazilari: { [son]: [yazi(1, true), yazi(2)] } }),
    );
    const [ilk, ikinci] = [...kap.querySelectorAll("article")];
    expect([...(ilk?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href"))).toEqual([
      "/blog/yazi-1",
    ]);
    expect(ilk?.querySelector("time")?.getAttribute("datetime")).toBe("2030-01-01");
    expect(ilk?.querySelector("img")).not.toBeNull();
    expect(ikinci?.querySelector("img")).toBeNull();
    expect(ilk?.querySelector('[aria-hidden="true"]')?.textContent).toBe("Devamını oku");
    expect(ciz([bolum("blog-yazilari", "izgara", {})], baglamIle({})).innerHTML).toBe("");
  });
});

describe("bülten kaydı", () => {
  const onayMetni = metin("vitrin.onay.pazarlama");

  it("başlık, metin ve formu çizer; onay metni kayıt formundakiyle tek metindir; başlıksız çizilmez", () => {
    const kap = ciz(
      [bolum("bulten-kaydi", "serit", { baslik: "Bültene katılın", metin: "Haberler" })],
      baglamIle({}),
    );
    const bolumOgesi = kap.querySelector("section");
    expect(bolumOgesi?.getAttribute("aria-labelledby")).toBe(kap.querySelector("h2")?.id);
    // Başlık her genişlikte aynı boyda (taslaktaki gibi, karar 0096).
    expect(kap.querySelector("h2")?.className.split(" ")).toContain("text-baslik-2");
    expect(kap.querySelector("h2")?.className).not.toContain("text-baslik-3");
    expect(kap.textContent).toContain("Haberler");
    expect(kap.querySelector('input[type="email"][autocomplete="email"]')).not.toBeNull();
    expect(kap.textContent).toContain(onayMetni);
    expect(doldur(metin("vitrin.kayit.pazarlamaIzni"), { onay: onayMetni })).toContain(onayMetni);
    expect(
      ciz([bolum("bulten-kaydi", "kutu", { metin: "Haberler" })], baglamIle({})).innerHTML,
    ).toBe("");
    // Eklentisi kurulmamış sitede (bağlamda kayıt yok) işlev açık olsa da çizilmez.
    const { bultenKaydi: _, ...eklentisiz } = baglamIle({});
    expect(ciz([bolum("bulten-kaydi", "serit", { baslik: "Bülten" })], eklentisiz).innerHTML).toBe(
      "",
    );
  });

  it("şeride renkli zeminin odak kuralı verilmez: formdaki öğelerin odağı zemin üstünde ölçülmüş renktir", () => {
    for (const gorunum of ["serit", "kutu"]) {
      const kap = ciz([bolum("bulten-kaydi", gorunum, { baslik: "Bülten" })], baglamIle({}));
      expect(kap.querySelector(".odak-yazi-renginde")).toBeNull();
      expect(kap.querySelector(".bg-birincil")).not.toBeNull();
    }
  });

  it("şema: geçerli e-posta ve işaretli onay ister", () => {
    expect(
      bultenKaydiSemasi.safeParse({ eposta: "a@ornek.test", pazarlamaOnayi: true }).success,
    ).toBe(true);
    expect(
      bultenKaydiSemasi.safeParse({ eposta: "a@ornek.test", pazarlamaOnayi: false }).success,
    ).toBe(false);
    expect(bultenKaydiSemasi.safeParse({ eposta: "ornek", pazarlamaOnayi: true }).success).toBe(
      false,
    );
  });

  const formuCiz = (adres: string | undefined) =>
    render(
      <MetinSaglayici dil="tr">
        <BultenFormu kayit={adres === undefined ? { tur: "ornek" } : { tur: "uc", adres }} />
      </MetinSaglayici>,
    );

  it("boş form gönderilince e-posta ve onay hatası görünür, istek gitmez", async () => {
    const istek = vi.spyOn(globalThis, "fetch");
    const { container } = formuCiz("/kapi/herkese-acik/deneme-bulten");
    const form = container.querySelector("form");
    if (form === null) throw new Error("Form yok.");
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(screen.getByText(metin("vitrin.bolum.bultenKaydi.hataEposta"))).toBeDefined();
    expect(screen.getByText(metin("vitrin.bolum.bultenKaydi.hataOnay"))).toBeDefined();
    expect(istek).not.toHaveBeenCalled();
  });

  it("örnek kipte (katalog) geçerli form da istek göndermez", async () => {
    const istek = vi.spyOn(globalThis, "fetch");
    const { container } = formuCiz(undefined);
    const eposta = container.querySelector('input[name="eposta"]');
    const onay = container.querySelector('button[role="checkbox"]');
    const form = container.querySelector("form");
    if (!(eposta instanceof HTMLInputElement) || onay === null || form === null) {
      throw new Error("Alan yok.");
    }
    fireEvent.change(eposta, { target: { value: "musteri@ornek.test" } });
    fireEvent.click(onay);
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(container.textContent).not.toContain(metin("vitrin.bolum.bultenKaydi.hataEposta"));
    expect(container.textContent).not.toContain(metin("vitrin.bolum.bultenKaydi.hataOnay"));
    expect(istek).not.toHaveBeenCalled();
  });

  it("adres varken form açılınca istek gitmez; gönderince robot sorusu, sonra adres istenir; başarıda teşekkür", async () => {
    const adres = "/kapi/herkese-acik/deneme-bulten";
    const istek = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (hedef) =>
        String(hedef) === adres
          ? new Response(JSON.stringify({ basarili: true, veri: {} }), { status: 200 })
          : new Response("", { status: 503 }),
      );
    const { container } = formuCiz(adres);
    expect(istek).not.toHaveBeenCalled();
    const eposta = container.querySelector('input[name="eposta"]');
    const onay = container.querySelector('button[role="checkbox"]');
    const form = container.querySelector("form");
    if (!(eposta instanceof HTMLInputElement) || onay === null || form === null) {
      throw new Error("Alan yok.");
    }
    fireEvent.change(eposta, { target: { value: "musteri@ornek.test" } });
    fireEvent.click(onay);
    await act(async () => {
      fireEvent.submit(form);
    });
    const adresler = istek.mock.calls.map(([hedef]) => String(hedef));
    // Ertelenmiş robot koruması: gönderirken tek soru istenir, bir sonraki önceden hazırlanmaz.
    expect(adresler).toEqual([expect.stringMatching(/\/robot-sorusu$/), adres]);
    const gonderilen = JSON.parse(String(istek.mock.calls.at(-1)?.[1]?.body)) as Record<
      string,
      unknown
    >;
    expect(gonderilen).toMatchObject({ eposta: "musteri@ornek.test", pazarlamaOnayi: true });
    // Form kalkar, odak teşekkür yazısına geçer (sayfanın başına düşmez).
    const tamam = await screen.findByText(metin("vitrin.bolum.bultenKaydi.tamam"));
    expect(document.activeElement).toBe(tamam);
  });
});
