// @vitest-environment jsdom
// Ürün ekranının seçenekler bölümü jsdom'da (kart 0264, karar 0163): silme izni olmayan yönetici kayıtlı değerin ve
// seçeneğin kaldır düğmesini görmez, yeni eklediği değeri kaldırabilir; kayıtlı değeri kaldırmak onay penceresiyle
// sorulur ve kaç birleşimin silineceğini söyler, Vazgeç değiştirmez; yeni değer sorulmadan çıkar; değer eklenince
// birleşim satırları artar; değiştirme izni olmayan yönetici hiçbir düğme görmez.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { doldur } from "../../metinler/doldur.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { PanelFormu, usePanelFormu } from "../form/panel-formu.tsx";
import { SeceneklerBolumu } from "../urunler/secenekler-bolumu.tsx";
import {
  birlesimAnahtari,
  birlesimSatirlari,
  bosBirlesim,
  type VaryantFormu,
} from "../urunler/varyant-formu.ts";

const metin = metinOkuyucu("tr");
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
afterEach(cleanup);

const kayitli: VaryantFormu = {
  secenekler: [
    {
      anahtar: "beden",
      kimlik: "beden",
      ad: "Beden",
      degerler: [
        { anahtar: "s", kimlik: "s", ad: "S" },
        { anahtar: "m", kimlik: "m", ad: "M" },
      ],
    },
    {
      anahtar: "renk",
      kimlik: "renk",
      ad: "Renk",
      degerler: [
        { anahtar: "gri", kimlik: "gri", ad: "Gri" },
        { anahtar: "lcv", kimlik: "lcv", ad: "Lacivert" },
      ],
    },
  ],
  birlesimler: Object.fromEntries(
    [
      ["s", "gri"],
      ["s", "lcv"],
      ["m", "gri"],
      ["m", "lcv"],
    ].map((a) => [birlesimAnahtari(a), bosBirlesim]),
  ),
};

function Deneme({ izinli, silebilir }: { izinli: boolean; silebilir: boolean }) {
  const [varyant, setVaryant] = useState(kayitli);
  const pf = usePanelFormu({ degisti: false });
  return (
    <PanelFormu durum={pf} gonder={async () => {}}>
      <SeceneklerBolumu
        varyant={varyant}
        bilinen={kayitli}
        satirlar={birlesimSatirlari(varyant, kayitli, undefined)}
        degistir={setVaryant}
        izinli={izinli}
        silebilir={silebilir}
        agirlikBirimi="kg"
        galeri={[]}
        fiyatStok={{
          fiyatGor: false,
          fiyatDegistir: false,
          stokGor: false,
          stokDuzelt: false,
          simge: "¤",
          sebep: "sayim",
          not: "",
          sebepDegistir: () => {},
        }}
      />
    </PanelFormu>
  );
}

const ciz = (izinli: boolean, silebilir: boolean) =>
  render(
    <MetinSaglayici dil="tr">
      <Deneme izinli={izinli} silebilir={silebilir} />
    </MetinSaglayici>,
  );

const kaldirAdi = (secenek: string, deger: string) =>
  doldur(metin("yonetim.urunEkrani.secenek.degerKaldir"), { secenek, deger });
const birlesimBasligi = (sayi: number) =>
  doldur(metin("yonetim.urunEkrani.secenek.birlesimler"), { sayi: String(sayi) });

describe("seçenekler bölümü", () => {
  it("silme izni olmayan kayıtlı değeri ve seçeneği kaldıramaz, yeni değeri kaldırır", async () => {
    ciz(true, false);
    expect(screen.queryByRole("button", { name: kaldirAdi("Beden", "S") })).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: doldur(metin("yonetim.urunEkrani.secenek.sil"), { ad: "Beden" }),
      }),
    ).toBeNull();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: doldur(metin("yonetim.urunEkrani.secenek.degerEkle"), { ad: "Beden" }),
        }),
      );
    });
    expect(screen.getByRole("heading", { name: birlesimBasligi(6) })).toBeTruthy();
    // Yeni değerin adı yok: "Değer 3".
    const yeni = screen.getByRole("button", { name: kaldirAdi("Beden", "Değer 3") });
    await act(async () => {
      fireEvent.click(yeni);
    });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("heading", { name: birlesimBasligi(4) })).toBeTruthy();
  });

  it("kayıtlı değeri kaldırmak sorulur, silinecek birleşim sayısı yazar; Vazgeç değiştirmez", async () => {
    ciz(true, true);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: kaldirAdi("Beden", "S") }));
    });
    const onay = screen.getByRole("alertdialog");
    expect(onay.textContent).toContain(
      doldur(metin("yonetim.urunEkrani.secenek.cikarOnay.aciklama"), { sayi: "2" }),
    );
    await act(async () => {
      fireEvent.click(within(onay).getByRole("button", { name: metin("ortak.islem.vazgec") }));
    });
    expect(screen.getByRole("heading", { name: birlesimBasligi(4) })).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: kaldirAdi("Beden", "S") }));
    });
    await act(async () => {
      fireEvent.click(
        within(screen.getByRole("alertdialog")).getByRole("button", {
          name: metin("yonetim.urunEkrani.secenek.cikarOnay.degerOnay"),
        }),
      );
    });
    expect(screen.getByRole("heading", { name: birlesimBasligi(2) })).toBeTruthy();
  });

  it("değiştirme izni olmayan hiçbir düğme görmez, alanlar kapalıdır", () => {
    ciz(false, false);
    expect(
      screen.queryByRole("button", { name: metin("yonetim.urunEkrani.secenek.ekle") }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: kaldirAdi("Beden", "M") })).toBeNull();
    for (const alan of screen.getAllByRole("textbox")) {
      expect((alan as HTMLInputElement).disabled).toBe(true);
    }
  });
});
