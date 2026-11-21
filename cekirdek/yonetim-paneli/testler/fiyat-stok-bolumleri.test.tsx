// @vitest-environment jsdom
// Ürün ekranının fiyat ve stok bölümleri (kart 0265): fiyatı değiştirme izni olmayan (görevli) fiyatı okur, alanları
// kapalıdır; stok düzeltme izni olmayana "Stoğu düzelt" düğmesi yoktur; seçenekli üründe fiyat alanları yerine tabloya
// yönlendiren metin ve stokta birleşimlerin toplamı yazar.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { doldur } from "../../metinler/doldur.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { PanelFormu, usePanelFormu } from "../form/panel-formu.tsx";
import { FiyatBolumu, StokBolumu } from "../urunler/fiyat-stok-bolumleri.tsx";
import type { FiyatStokVerisi } from "../urunler/fiyat-stok-verisi.ts";
import type { UrunFormu } from "../urunler/urun-verisi.ts";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/yonetim/urunler/urun",
}));
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
afterEach(cleanup);

const metin = metinOkuyucu("tr");
const veri: FiyatStokVerisi = {
  fiyatGirisi: "vergi-dahil",
  simge: "¤",
  simgeYeri: "sonda",
  magazaEsigi: 5,
  birimler: {
    "": { kimlik: "b0", satisFiyati: "100,00", indirimliFiyat: "", stok: 9, ayrilan: 2 },
  },
  indirimBaslangici: "",
  indirimBitisi: "",
};
const fiyat = {
  satisFiyati: "100,00",
  indirimliFiyat: "",
  indirimBaslangici: "",
  indirimBitisi: "",
};
const form = { fiyat, stokTakibi: true, dusukStokEsigi: "", baslangicStogu: "" } as UrunFormu;

function Form({ children }: { children: React.ReactNode }) {
  const pf = usePanelFormu({ degisti: false });
  return (
    <PanelFormu durum={pf} gonder={async () => {}}>
      {children}
    </PanelFormu>
  );
}
const Kap = ({ children }: { children: React.ReactNode }) => (
  <MetinSaglayici dil="tr">
    <Form>{children}</Form>
  </MetinSaglayici>
);

describe("fiyat bölümü", () => {
  it("izni olmayan fiyatı okur, alanlar kapalıdır", () => {
    render(
      <Kap>
        <FiyatBolumu
          fiyat={fiyat}
          degistir={() => {}}
          veri={veri}
          izinli={false}
          secenekli={false}
        />
      </Kap>,
    );
    const satis = screen.getByRole("textbox", { name: metin("yonetim.urunEkrani.fiyat.satis") });
    expect(satis).toHaveProperty("value", "100,00");
    expect(satis).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("textbox", { name: metin("yonetim.urunEkrani.fiyat.indirimli") }),
    ).toHaveProperty("disabled", true);
  });

  it("seçenekli üründe fiyat alanı yok, tabloya yönlendirir", () => {
    render(
      <Kap>
        <FiyatBolumu fiyat={fiyat} degistir={() => {}} veri={veri} izinli secenekli />
      </Kap>,
    );
    expect(
      screen.queryByRole("textbox", { name: metin("yonetim.urunEkrani.fiyat.satis") }),
    ).toBeNull();
    expect(screen.getByText(metin("yonetim.urunEkrani.fiyat.secenekli"))).toBeDefined();
  });
});

describe("stok bölümü", () => {
  it("ayrılan miktar yazar; düzeltme izni olmayana 'Stoğu düzelt' yoktur", () => {
    const { rerender } = render(
      <Kap>
        <StokBolumu
          form={form}
          degistir={() => {}}
          veri={veri}
          izinler={{ degistir: true, duzelt: true }}
          secenekli={false}
          yeni={false}
        />
      </Kap>,
    );
    expect(
      screen.getByText(
        doldur(metin("yonetim.urunEkrani.stok.durumAyrilan"), { stok: "9", ayrilan: "2" }),
      ),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: metin("yonetim.urunEkrani.stok.duzelt") }),
    ).toBeDefined();
    rerender(
      <Kap>
        <StokBolumu
          form={form}
          degistir={() => {}}
          veri={veri}
          izinler={{ degistir: false, duzelt: false }}
          secenekli={false}
          yeni={false}
        />
      </Kap>,
    );
    expect(
      screen.queryByRole("button", { name: metin("yonetim.urunEkrani.stok.duzelt") }),
    ).toBeNull();
    expect(
      screen.getByRole("textbox", { name: metin("yonetim.urunEkrani.stok.esik") }),
    ).toHaveProperty("disabled", true);
  });
});
