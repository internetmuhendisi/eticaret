// @vitest-environment jsdom
// Telefonun yan menüsü (kart 0168, karar 0120): kategori menüsü en üstte tek bir "Kategoriler" dalıdır; birden çok
// kategori menüsü seçilse de bir kez çizilir; öteki menüler altındadır; iç içe akordeonun başlıkları bir düzey aşağıdadır.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import type { BaglamMenuDali } from "../bolum-kutuphanesi/baglam.ts";
import { MenuDugmesi } from "../bolumler/ust-satir/menu-dugmesi.tsx";

afterEach(() => cleanup());

const dal = (kimlik: string, metin: string, altlar: BaglamMenuDali[] = []): BaglamMenuDali => ({
  kimlik,
  metin,
  adres: `/${kimlik}`,
  yeniSekme: false,
  altlar,
});
const kategoriler = [dal("giyim", "Giyim", [dal("kadin", "Kadın")]), dal("ev", "Ev")];

const ciz = () =>
  render(
    <MetinSaglayici dil="tr">
      <MenuDugmesi
        menuler={[
          { kod: "ana", dallar: [dal("a-giyim", "Giyim"), dal("yeni", "Yeni")], kategori: false },
          { kod: "kat-1", dallar: kategoriler, kategori: true },
          { kod: "kat-2", dallar: kategoriler, kategori: true },
        ]}
        yandakiler={[]}
        hesap={{ adres: "/giris", ikon: "hesap", etiket: "Hesabım" }}
        hesapSorulur={false}
        metinler={{
          ac: "Menüyü aç",
          kapat: "Kapat",
          baslik: "Menü",
          tumu: "Tümü",
          kategoriler: "Kategoriler",
        }}
      />
    </MetinSaglayici>,
  );

it("kategori menüsü en üstte tek bir Kategoriler dalı; ana menü altında; iç başlıklar h4", () => {
  ciz();
  fireEvent.click(screen.getByRole("button", { name: "Menüyü aç" }));
  const nav = screen.getByRole("navigation", { name: "Menü" });
  const gruplar = within(nav).getAllByRole("button", { name: "Kategoriler" });
  expect(gruplar).toHaveLength(1);
  // İlk satır "Kategoriler"dir, ana menünün bağlantıları sonra gelir.
  const satirlar = within(nav).getAllByRole("button").concat(within(nav).getAllByRole("link"));
  const ilk = satirlar.sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  )[0];
  expect(ilk?.textContent).toBe("Kategoriler");
  expect(within(nav).getAllByRole("link", { name: "Giyim" })).toHaveLength(1);
  expect(within(nav).getByRole("heading", { name: "Kategoriler" }).tagName).toBe("H3");
  fireEvent.click(gruplar[0] as HTMLElement);
  // Açılınca kategoriler içindedir; alt kategorisi olan dalın başlığı h4.
  expect(within(nav).getByRole("heading", { name: "Giyim" }).tagName).toBe("H4");
  expect(within(nav).getByRole("link", { name: "Ev" })).toBeDefined();
});
