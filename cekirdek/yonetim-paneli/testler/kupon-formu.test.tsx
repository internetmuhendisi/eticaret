// @vitest-environment jsdom
// Kupon formu (kart 0313, karar 0188): uca giden girdi (yeni kuponda bütün alanlar; düzenlemede yalnız değişenler,
// indirim türüyle, kapsam seçimiyle birlikte), sunucunun alan hatasının alanın altında yazıp odağı alması, yeni
// kuponun kuponun sayfasına geçmesi, kullanılmış kuponda kilitli alanların kapalı ve nedeninin yazılı olması, para
// simgesi ve yüzde işareti. Uç sahte fetch ile verilir.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { kuponSinirlari } from "../../kayitlar/kampanya.ts";
import { doldur } from "../../metinler/doldur.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { kuponAdresi } from "../adresler.ts";
import { KuponFormuEkrani, kuponGirdisi } from "../kuponlar/kupon-formu.tsx";
import { bosKuponFormu, type KuponEkraniVerisi, type KuponFormu } from "../kuponlar/veri.ts";

const git = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: git }) }));

const metin = metinOkuyucu("tr");

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const istekler: { adres: string; govde: unknown }[] = [];
let yanit: () => Response;
beforeEach(() => {
  istekler.length = 0;
  git.mockClear();
  yanit = () => Response.json({ basarili: true, veri: { kimlik: "kupon-1" } });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (adres: string, secenek?: RequestInit) => {
      istekler.push({
        adres,
        govde: secenek?.body === undefined ? undefined : JSON.parse(String(secenek.body)),
      });
      return yanit();
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const dolu: KuponFormu = {
  ...bosKuponFormu,
  kod: "KASIM50",
  tur: "tutar",
  deger: "50,00",
  enAzTutar: "500,00",
  kapsam: "kategoriler",
  kapsamKayitlari: [{ kimlik: "k1", ad: "Giyim" }],
  bitis: "2026-11-30T23:59",
  toplamSinir: "100",
};

const veri = (ek: Partial<KuponEkraniVerisi> = {}): KuponEkraniVerisi => ({
  kullanildi: false,
  form: bosKuponFormu,
  silinmisKapsam: [],
  paraSimgesi: { simge: "¤", yer: "sonda" },
  saatDilimi: "Europe/Istanbul",
  harfDuyarli: false,
  ...ek,
});

const ciz = (v: KuponEkraniVerisi) =>
  render(
    <MetinSaglayici dil="tr">
      <KuponFormuEkrani veri={v} />
    </MetinSaglayici>,
  );

const alan = (ad: string) => screen.getByRole("textbox", { name: new RegExp(`^${ad}`) });

describe("kuponun girdisi", () => {
  it("yeni kuponda bütün alanlar, kapsam kimlikle; ücretsiz kargoda indirim boş", () => {
    expect(kuponGirdisi(dolu, bosKuponFormu, true)).toEqual({
      kod: "KASIM50",
      ad: "",
      tur: "tutar",
      deger: "50,00",
      enAzTutar: "500,00",
      kapsam: "kategoriler",
      kapsamKayitlari: ["k1"],
      baslangic: "",
      bitis: "2026-11-30T23:59",
      toplamSinir: "100",
      kisiBasiSinir: "",
      indirimdeGecmez: false,
      acik: true,
    });
    expect(kuponGirdisi({ ...dolu, tur: "ucretsiz-kargo" }, bosKuponFormu, true)).toMatchObject({
      tur: "ucretsiz-kargo",
      deger: "",
    });
  });

  it("düzenlemede yalnız değişenler; indirim türüyle, kapsam seçimiyle birlikte gider", () => {
    expect(kuponGirdisi(dolu, dolu, false)).toEqual({});
    expect(kuponGirdisi({ ...dolu, bitis: "" }, dolu, false)).toEqual({ bitis: "" });
    expect(kuponGirdisi({ ...dolu, deger: "60,00" }, dolu, false)).toEqual({
      tur: "tutar",
      deger: "60,00",
    });
    expect(kuponGirdisi({ ...dolu, tur: "yuzde" }, dolu, false)).toEqual({
      tur: "yuzde",
      deger: "50,00",
    });
    expect(
      kuponGirdisi(
        { ...dolu, kapsamKayitlari: [...dolu.kapsamKayitlari, { kimlik: "k2", ad: "Ev" }] },
        dolu,
        false,
      ),
    ).toEqual({ kapsam: "kategoriler", kapsamKayitlari: ["k1", "k2"] });
    expect(kuponGirdisi({ ...dolu, kapsam: "hepsi", kapsamKayitlari: [] }, dolu, false)).toEqual({
      kapsam: "hepsi",
      kapsamKayitlari: [],
    });
  });
});

describe("kupon formu", () => {
  it("yeni kupon gönderilir, kuponun sayfasına geçilir; para simgesi ve yüzde işareti alanda", async () => {
    ciz(veri());
    expect(screen.getByText("%")).toBeTruthy();
    fireEvent.change(alan(metin("yonetim.kupon.kod")), { target: { value: "YAZ10" } });
    fireEvent.change(alan(metin("yonetim.kupon.deger")), { target: { value: "10" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: metin("yonetim.kupon.ekle") }));
    });
    expect(istekler).toHaveLength(1);
    expect(istekler[0]?.adres).toContain("/kapi/yonetici/kupon-ekle");
    expect(istekler[0]?.govde).toMatchObject({
      kupon: { kod: "YAZ10", tur: "yuzde", deger: "10" },
    });
    expect(git).toHaveBeenCalledWith(kuponAdresi("kupon-1"));
    fireEvent.click(screen.getByRole("radio", { name: metin("yonetim.kupon.tur.tutar") }));
    expect(screen.getAllByText("¤").length).toBeGreaterThan(1);
  });

  it("sunucunun alan hatası alanın altında yazar, odak alana gider", async () => {
    yanit = () =>
      Response.json(
        { basarili: false, hata: { kod: "cakisma", ayrinti: [{ alan: "kod", kod: "kod-var" }] } },
        { status: 409 },
      );
    ciz(veri());
    fireEvent.change(alan(metin("yonetim.kupon.kod")), { target: { value: "VAR" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: metin("yonetim.kupon.ekle") }));
    });
    const kod = alan(metin("yonetim.kupon.kod"));
    expect(kod.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(metin("yonetim.kupon.hata.kod-var"))).toBeTruthy();
    expect(document.activeElement).toBe(kod);
    expect(git).not.toHaveBeenCalled();
  });

  it("hata metnindeki sınırlar kayıttan doldurulur", async () => {
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: { kod: "dogrulama", ayrinti: [{ alan: "kod", kod: "kod-gecersiz" }] },
        },
        { status: 400 },
      );
    ciz(veri());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: metin("yonetim.kupon.ekle") }));
    });
    expect(
      screen.getByText(
        doldur(metin("yonetim.kupon.hata.kod-gecersiz"), {
          kodEnAz: String(kuponSinirlari.kodEnAz),
          kodEnCok: String(kuponSinirlari.kodEnCok),
        }),
      ),
    ).toBeTruthy();
    expect(document.body.textContent).not.toContain("{kodEnAz}");
  });

  it("kullanılmış kuponda kod, tür, indirim, kapsam ve indirimde geçmez kapalı; nedeni yazar; süre açık", () => {
    ciz(veri({ kimlik: "k", gorulen: new Date().toISOString(), kullanildi: true, form: dolu }));
    expect(screen.getByText(metin("yonetim.kupon.kilitli.baslik"))).toBeTruthy();
    expect((alan(metin("yonetim.kupon.kod")) as HTMLInputElement).disabled).toBe(true);
    expect((alan(metin("yonetim.kupon.deger")) as HTMLInputElement).disabled).toBe(true);
    expect(
      screen
        .getByRole("checkbox", { name: metin("yonetim.kupon.indirimdeGecmez") })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen
        .getByRole("radio", { name: metin("yonetim.kupon.tur.yuzde") })
        .getAttribute("aria-disabled"),
    ).toBe("true");
    expect((alan(metin("yonetim.kupon.toplamSinir")) as HTMLInputElement).disabled).toBe(false);
    expect((alan(metin("yonetim.kupon.enAzTutar")) as HTMLInputElement).disabled).toBe(false);
  });
});
