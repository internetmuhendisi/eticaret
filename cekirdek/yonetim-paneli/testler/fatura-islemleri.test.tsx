// @vitest-environment jsdom
// Siparişin faturası penceresi (kart 0268, karar 0170): "Faturanız hazır" kutusu eklemede işaretli, düzenlemede
// işaretsiz, e-posta gidemezken hiç yok ve istekte gitmez; kayıt pencerenin açıldığında gördüğü faturayı gönderir,
// pencere açıkken sayfa yenilenip fatura değişse de (çakışmadan sonraki ikinci "Kaydet" öteki yöneticinin faturasını
// ezmez; bağımsız kontrolün bulgusu); numara biçiminin hatası sınırı kayıttan yazar. Uç sahte fetch ile verilir.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { siparisSinirlari } from "../../kayitlar/siparis.ts";
import { doldur } from "../../metinler/doldur.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { FaturaIslemleri } from "../siparisler/fatura.tsx";

const yenile = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: yenile }) }));

const metin = metinOkuyucu("tr");

// Radix'in onay kutusu boyutu ResizeObserver ile izler; jsdom'da yoktur, gerçek tarayıcıda vardır (tarayıcı testi
// cekirdek/testler/uctan-uca/siparisler.test.ts).
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const istekler: { adres: string; govde: Record<string, unknown> }[] = [];
let yanit: () => Response;
beforeEach(() => {
  istekler.length = 0;
  yanit = () => Response.json({ basarili: true, veri: {} });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (adres: string, secenek?: RequestInit) => {
      istekler.push({ adres, govde: JSON.parse(String(secenek?.body ?? "{}")) });
      return yanit();
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type Fatura = Parameters<typeof FaturaIslemleri>[0]["fatura"];
const kayitli: Fatura = { numara: "F-1", tarih: "2026-11-17", dosya: null };
const ciz = (fatura: Fatura, epostaGidebilir = true) => {
  const ozellikler = (f: Fatura) => ({
    numara: "ORN-1",
    fatura: f,
    dosyaEklenebilir: true,
    epostaGidebilir,
    belge: { enCokBoyut: "5 MB", turler: "PDF" },
    bugun: "2026-11-23",
  });
  const sonuc = render(
    <MetinSaglayici dil="tr">
      <FaturaIslemleri {...ozellikler(fatura)} />
    </MetinSaglayici>,
  );
  return (yeni: Fatura) =>
    sonuc.rerender(
      <MetinSaglayici dil="tr">
        <FaturaIslemleri {...ozellikler(yeni)} />
      </MetinSaglayici>,
    );
};
const ac = (ad: "ekle" | "duzenle") =>
  fireEvent.click(screen.getByRole("button", { name: metin(`yonetim.siparis.fatura.${ad}`) }));
const kutu = () =>
  screen.queryByRole("checkbox", { name: metin("yonetim.siparis.fatura.pencere.eposta") });
const kaydet = async () => {
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: metin("yonetim.siparis.fatura.pencere.kaydet") }),
    );
  });
};
const numaraAlani = () =>
  screen.getByRole("textbox", { name: new RegExp(metin("yonetim.siparis.fatura.pencere.numara")) });

describe("faturanız hazır kutusu", () => {
  it("eklemede işaretli, düzenlemede işaretsiz", () => {
    ciz(null);
    ac("ekle");
    expect(kutu()?.getAttribute("aria-checked")).toBe("true");
    cleanup();
    ciz(kayitli);
    ac("duzenle");
    expect(kutu()?.getAttribute("aria-checked")).toBe("false");
  });

  it("e-posta gidemezken kutu yok ve istek e-posta istemez", async () => {
    ciz(null, false);
    ac("ekle");
    expect(kutu()).toBeNull();
    fireEvent.change(numaraAlani(), { target: { value: "F-9" } });
    await kaydet();
    expect(istekler.at(-1)?.govde.eposta).toBe(false);
  });
});

describe("pencerenin gördüğü fatura", () => {
  it("açıkken sayfa yenilenip fatura değişse de kayıt açılıştaki faturayı gönderir", async () => {
    const yeniden = ciz(kayitli);
    ac("duzenle");
    // Öteki yöneticinin yazdığı fatura sayfa yenilenince gelir; pencere açık kalır.
    yeniden({ numara: "F-2", tarih: "2026-11-18", dosya: null });
    fireEvent.change(numaraAlani(), { target: { value: "F-3" } });
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: { kod: "cakisma", ayrinti: [{ alan: "fatura", kod: "fatura-degisti" }] },
        },
        { status: 409 },
      );
    await kaydet();
    await kaydet();
    expect(istekler).toHaveLength(2);
    for (const istek of istekler) {
      expect(istek.adres).toContain("siparis-fatura");
      expect(istek.govde.gorulen).toEqual({ numara: "F-1", tarih: "2026-11-17", dosya: null });
    }
    expect(screen.getByText(metin("yonetim.siparis.fatura.hata.cakisma"))).toBeDefined();
  });
});

describe("numaranın hatası", () => {
  it("biçim hatası sınırı kayıttan yazar", async () => {
    ciz(null);
    ac("ekle");
    fireEvent.change(numaraAlani(), { target: { value: "F@1" } });
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: { kod: "dogrulama", ayrinti: [{ alan: "fatura.numara", kod: "invalid_format" }] },
        },
        { status: 400 },
      );
    await kaydet();
    expect(
      screen.getByText(
        doldur(metin("yonetim.siparis.fatura.hata.numaraBicimi"), {
          enCok: String(siparisSinirlari.faturaNumarasiEnCok),
        }),
      ),
    ).toBeDefined();
  });
});
