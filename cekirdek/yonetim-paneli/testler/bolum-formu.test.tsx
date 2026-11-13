// @vitest-environment jsdom
// Bölümün düzenleme formu (kart 0106): form tariften çıkar, tarife alan eklenince ya da çıkınca form da
// değişir; her alan türü kendi parçasıyla çizilir; yazılan değer şemanın beklediği biçimde döner; liste
// öğesi eklenir ve sınırda düğme kapanır; hata alanın yanında görünür.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { denemeBolumu, denemeSeridi } from "../../katalog/deneme-bolumu/tarif.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { doldur } from "../../moduller/eposta/sablon.ts";
import type { BolumDegerleri, BolumTarifi } from "../../vitrin/bolum-kutuphanesi/tarif.ts";
import { bolumDegerSemasi } from "../../vitrin/bolum-kutuphanesi/tarif.ts";
import { blogYazilari } from "../../vitrin/bolumler/blog-yazilari/tarif.ts";
import { musteriYorumlari } from "../../vitrin/bolumler/musteri-yorumlari/tarif.ts";
import { BolumFormu, type BolumFormuSecenekleri } from "../bolum-formu.tsx";

const metin = metinOkuyucu("tr");

const secenekler: BolumFormuSecenekleri = {
  kategoriler: [{ kimlik: "8d8f4bb1-7d6c-4f3a-9a52-0c5f3d1e2b7a", ad: "Giyim" }],
  markalar: [],
  etiketler: [],
  urunler: [],
  gorseller: [],
  menuler: [],
  blogKategorileri: [{ kimlik: "tarifler", ad: "Tarifler" }],
};

const ciz = (tarif: BolumTarifi, ozellikler: Partial<Parameters<typeof BolumFormu>[0]> = {}) => {
  const son: { degerler?: BolumDegerleri } = {};
  const sonuc = render(
    <MetinSaglayici dil="tr">
      <BolumFormu
        tarif={tarif}
        secenekler={secenekler}
        degisince={(degerler) => {
          son.degerler = degerler;
        }}
        {...ozellikler}
      />
    </MetinSaglayici>,
  );
  return { ...sonuc, son };
};

afterEach(cleanup);

describe("bölümün düzenleme formu", () => {
  it("her alan tarifteki adıyla ve kendi parçasıyla çizilir", () => {
    ciz(denemeBolumu);
    expect(
      (screen.getByLabelText(metin("gelistirme.bolum.alan.baslik")) as HTMLInputElement).type,
    ).toBe("text");
    expect(screen.getByLabelText(metin("gelistirme.bolum.alan.aciklama")).tagName).toBe("TEXTAREA");
    expect(
      (screen.getByLabelText(metin("gelistirme.bolum.alan.bitis")) as HTMLInputElement).type,
    ).toBe("datetime-local");
    // Görsel, görselleri pencerede açan düğmeyle seçilir (kart 0142).
    const gorsel = screen.getByLabelText(metin("gelistirme.bolum.alan.gorsel"));
    expect(gorsel.tagName).toBe("BUTTON");
    expect(gorsel.getAttribute("aria-haspopup")).toBe("dialog");
    // Seçim kutuları: kategori, marka, renk, sabit seçim ve ürünlerin kaynağı.
    for (const ad of ["kategori", "marka", "zemin", "sure"] as const) {
      expect(screen.getByLabelText(metin(`gelistirme.bolum.alan.${ad}`)).getAttribute("role")).toBe(
        "combobox",
      );
    }
    expect(
      screen.getByRole("group", { name: metin("gelistirme.bolum.alan.baglanti") }),
    ).toBeDefined();
    expect(
      screen.getByRole("group", { name: metin("gelistirme.bolum.alan.urunler") }),
    ).toBeDefined();
    expect(
      screen.getByRole("group", { name: metin("gelistirme.bolum.alan.maddeler") }),
    ).toBeDefined();
    // Değeri verilmemiş seçim varsayılanını gösterir (kart 0110).
    expect(screen.getByLabelText(metin("gelistirme.bolum.alan.sure")).textContent).toBe(
      metin("gelistirme.bolum.alan.sureUzun"),
    );
  });

  // Kart 0112: açıklama seçim alanında da görünür ve alana bağlıdır; blog kategorisi adres adıyla seçilir.
  it("seçim ve blog kategorisi alanının açıklaması görünür ve alana bağlıdır", () => {
    ciz(musteriYorumlari);
    const kaynak = screen.getByLabelText(metin("vitrin.bolum.musteriYorumlari.kaynak"));
    expect(kaynak.getAttribute("role")).toBe("combobox");
    const aciklama = screen.getByText(metin("vitrin.bolum.musteriYorumlari.kaynakAciklamasi"));
    expect(kaynak.getAttribute("aria-describedby")).toContain(aciklama.id);
    cleanup();
    ciz(blogYazilari, { ilkDegerler: { kategori: "tarifler" } });
    const kategori = screen.getByLabelText(metin("vitrin.bolum.blogYazilari.kategori"));
    expect(kategori.getAttribute("role")).toBe("combobox");
    expect(kategori.textContent).toBe("Tarifler");
    const kategoriAciklamasi = screen.getByText(
      metin("vitrin.bolum.blogYazilari.kategoriAciklamasi"),
    );
    expect(kategori.getAttribute("aria-describedby")).toContain(kategoriAciklamasi.id);
  });

  it("tarife alan eklenince formda görünür, çıkınca kaybolur", () => {
    const { unmount } = ciz(denemeSeridi);
    expect(screen.queryByLabelText(metin("gelistirme.bolum.alan.aciklama"))).toBeNull();
    unmount();
    const genisletilmis: BolumTarifi = {
      ...denemeSeridi,
      alanlar: {
        ...denemeSeridi.alanlar,
        aciklama: { tur: "uzun-metin", ad: "gelistirme.bolum.alan.aciklama", enCok: 100 },
      },
    };
    ciz(genisletilmis);
    expect(screen.getByLabelText(metin("gelistirme.bolum.alan.aciklama")).tagName).toBe("TEXTAREA");
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    cleanup();
    ciz({ ...denemeSeridi, alanlar: {} });
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("yazılan değerler şemadan geçen biçimde döner, boşaltılan alan değerden çıkar", () => {
    const { son } = ciz(denemeBolumu);
    const baslik = screen.getByLabelText(metin("gelistirme.bolum.alan.baslik"));
    fireEvent.change(baslik, { target: { value: "Haftanın seçkisi" } });
    fireEvent.change(screen.getByLabelText(metin("yonetim.bolumFormu.adres")), {
      target: { value: "/kategori/giyim" },
    });
    expect(son.degerler).toEqual({
      baslik: "Haftanın seçkisi",
      baglanti: { adres: "/kategori/giyim", yeniSekme: false },
    });
    expect(bolumDegerSemasi(denemeBolumu).safeParse(son.degerler).success).toBe(true);
    fireEvent.change(baslik, { target: { value: "" } });
    expect(son.degerler).not.toHaveProperty("baslik");
  });

  it("liste öğesi eklenir, alanları çizilir, sınırda ekleme düğmesi kapanır, öğe kaldırılır", () => {
    const { son } = ciz(denemeBolumu);
    const liste = screen.getByRole("group", { name: metin("gelistirme.bolum.alan.maddeler") });
    const ekle = within(liste).getByRole("button", {
      name: doldur(metin("yonetim.bolumFormu.ogeEkle"), {
        ad: metin("gelistirme.bolum.alan.madde"),
      }),
    });
    for (let i = 0; i < 3; i += 1) fireEvent.click(ekle);
    expect(within(liste).getAllByLabelText(metin("gelistirme.bolum.alan.maddeMetni"))).toHaveLength(
      3,
    );
    expect((ekle as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(
      within(liste).getAllByLabelText(metin("gelistirme.bolum.alan.maddeMetni"))[1] as HTMLElement,
      {
        target: { value: "Kolay iade" },
      },
    );
    expect((son.degerler as { maddeler?: unknown } | undefined)?.maddeler).toEqual([
      {},
      { metin: "Kolay iade" },
      {},
    ]);
    fireEvent.click(
      within(liste).getAllByRole("button", {
        name: metin("yonetim.bolumFormu.kaldir"),
      })[0] as HTMLElement,
    );
    expect((son.degerler as { maddeler?: unknown } | undefined)?.maddeler).toEqual([
      { metin: "Kolay iade" },
      {},
    ]);
    expect((ekle as HTMLButtonElement).disabled).toBe(false);
  });

  it("hata alanın yanında görünür ve alana bağlanır", () => {
    ciz(denemeBolumu, {
      hatalar: { baslik: "Başlık gerekli.", "baglanti.adres": "Bağlantı geçersiz." },
    });
    const baslik = screen.getByLabelText(metin("gelistirme.bolum.alan.baslik"));
    expect(baslik.getAttribute("aria-invalid")).toBe("true");
    expect(baslik.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("Başlık gerekli.")).toBeDefined();
    expect(screen.getByText("Bağlantı geçersiz.")).toBeDefined();
  });

  it("ilk değerler alanlara yazılır", () => {
    ciz(denemeBolumu, { ilkDegerler: { baslik: "Seçkiler", bitis: "2026-12-31T23:59" } });
    expect(
      (screen.getByLabelText(metin("gelistirme.bolum.alan.baslik")) as HTMLInputElement).value,
    ).toBe("Seçkiler");
    expect(
      (screen.getByLabelText(metin("gelistirme.bolum.alan.bitis")) as HTMLInputElement).value,
    ).toBe("2026-12-31T23:59");
  });

  // Kart 0142: görsel sitede kayıtlı görsellerden seçilir. Pencere görselleri ölçüleriyle adlandırır; birine basınca
  // seçilir, pencere kapanır, seçili görselin önizlemesi ve ölçüsü görünür. Zorunlu olmayan görsel kaldırılabilir.
  it("görsel pencereden seçilir ve kaldırılır", () => {
    const kimlik = "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";
    const { son } = ciz(denemeBolumu, {
      secenekler: { ...secenekler, gorseller: [{ kimlik, genislik: 1920, yukseklik: 800 }] },
    });
    fireEvent.click(screen.getByLabelText(metin("gelistirme.bolum.alan.gorsel")));
    const pencere = screen.getByRole("dialog", { name: metin("yonetim.gorselSecimi.baslik") });
    const secenek = within(pencere).getByRole("button", {
      name: doldur(metin("yonetim.gorselSecimi.gorselAdi"), {
        sira: "1",
        genislik: "1920",
        yukseklik: "800",
      }),
    });
    expect(secenek.getAttribute("aria-pressed")).toBe("false");
    expect(secenek.querySelector("img")?.getAttribute("src")).toBe(
      `/kapi/yonetici/panel-gorseli?d=${kimlik}&b=kucuk`,
    );
    fireEvent.click(secenek);
    expect(son.degerler?.["gorsel"]).toBe(kimlik);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("1920 × 800")).toBeDefined();
    expect(screen.getByLabelText(metin("gelistirme.bolum.alan.gorsel")).textContent).toBe(
      metin("yonetim.gorselSecimi.degistir"),
    );
    fireEvent.click(screen.getByRole("button", { name: metin("yonetim.gorselSecimi.kaldir") }));
    expect(son.degerler?.["gorsel"]).toBeUndefined();
    // Kaldır düğmesi kalkar, odak alanın kendi düğmesindedir.
    expect(document.activeElement).toBe(
      screen.getByLabelText(metin("gelistirme.bolum.alan.gorsel")),
    );
    expect(screen.getByText(metin("yonetim.gorselSecimi.secilmedi"))).toBeDefined();
  });

  it("kayıtlı görsel yoksa pencere bunu söyler", () => {
    ciz(denemeBolumu);
    fireEvent.click(screen.getByLabelText(metin("gelistirme.bolum.alan.gorsel")));
    expect(screen.getByText(metin("yonetim.gorselSecimi.bos"))).toBeDefined();
  });
});
