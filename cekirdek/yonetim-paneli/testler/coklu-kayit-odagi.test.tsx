// @vitest-environment jsdom
// Çoklu kayıt seçiminde kaldırınca odak (kart 0307). Sıra kurulur: bir sonraki kare (requestAnimationFrame) React'ın
// çizimi bitmeden gelir. İlk seçilen kaldırılınca odak sonrakinin "Kaldır"ına, son kalan kaldırılınca arama kutusuna
// geçer. Eski kod (düğmeler bir sonraki karede sayılır) bu sırayla kırmızıdır: kaldırılanın kendi düğmesine odak
// verip onunla birlikte kaybediyordu.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { doldur } from "../../metinler/doldur.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { CokluKayitSecimi, type SecilenKayit } from "../coklu-kayit-secimi.tsx";
import { PanelFormu, usePanelFormu } from "../form/panel-formu.tsx";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/yonetim/urunler/urun",
}));

const metin = metinOkuyucu("tr");

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (geri: FrameRequestCallback) => {
    geri(0);
    return 0;
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Sarmal({ ilk }: { ilk: SecilenKayit[] }) {
  const pf = usePanelFormu({ degisti: false });
  const [secilenler, setSecilenler] = useState(ilk);
  return (
    <PanelFormu durum={pf} gonder={() => undefined}>
      <CokluKayitSecimi
        ad="kategoriler"
        tur="kategori"
        etiket="Kategoriler"
        secilenler={secilenler}
        degisti={setSecilenler}
      />
    </PanelFormu>
  );
}

const kaldir = (ad: string) =>
  screen.getByRole("button", { name: doldur(metin("yonetim.cokluKayit.kaldir"), { ad }) });

describe("çoklu kayıt seçiminde odak", () => {
  it("kaldırınca odak sonrakinin düğmesine, son kalanda arama kutusuna geçer", async () => {
    render(
      <MetinSaglayici dil="tr">
        <Sarmal
          ilk={[
            { kimlik: "a", ad: "Ayakkabı" },
            { kimlik: "b", ad: "Bot" },
          ]}
        />
      </MetinSaglayici>,
    );
    await act(async () => {
      fireEvent.click(kaldir("Ayakkabı"));
    });
    expect(document.activeElement).toBe(kaldir("Bot"));
    await act(async () => {
      fireEvent.click(kaldir("Bot"));
    });
    expect(document.activeElement).toBe(screen.getByRole("combobox"));
  });
});
