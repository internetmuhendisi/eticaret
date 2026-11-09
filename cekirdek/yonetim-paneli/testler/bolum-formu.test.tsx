// @vitest-environment jsdom
// Bölümün düzenleme formu (kart 0106): form tariften çıkar, tarife alan eklenince ya da çıkınca form da
// değişir; her alan türü kendi parçasıyla çizilir; yazılan değer şemanın beklediği biçimde döner; liste
// öğesi eklenir ve sınırda düğme kapanır; hata alanın yanında görünür.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { denemeBolumu, denemeSeridi } from "../../katalog/deneme-bolumu/tarif.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import type { BolumDegerleri, BolumTarifi } from "../../vitrin/bolum-kutuphanesi/tarif.ts";
import { bolumDegerSemasi } from "../../vitrin/bolum-kutuphanesi/tarif.ts";
import { BolumFormu, type BolumFormuSecenekleri } from "../bolum-formu.tsx";

const metin = metinOkuyucu("tr");

const secenekler: BolumFormuSecenekleri = {
  kategoriler: [{ kimlik: "8d8f4bb1-7d6c-4f3a-9a52-0c5f3d1e2b7a", ad: "Giyim" }],
  markalar: [],
  etiketler: [],
  urunler: [],
  gorseller: [],
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
    // Seçim kutuları: görsel, kategori, marka, renk ve ürünlerin kaynağı.
    for (const ad of ["gorsel", "kategori", "marka", "zemin"] as const) {
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
    const ekle = within(liste).getByRole("button", { name: metin("yonetim.bolumFormu.ekle") });
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
});
