// @vitest-environment jsdom
// Mağaza bilgileri ekranı (kart 0278, karar 0175): dört kart başlığıyla adlanır; tek satış ülkesi yazı olarak
// görünür; her sosyal site için önünde sitenin adresi olan bir alan, aynı sitenin ikinci hesabı kendi alanında;
// şahıs işletmesinde numaranın adı kimlik numarasıdır; kayıt bütün alanları yazı olarak, sosyal hesapları sitelerin
// sırasıyla gönderir; sunucunun sosyal hesap hatası gönderilen sıradan doğru alana bağlanır, tekrar hatası özette;
// değiştirme izni olmayan yönetici alanları kapalı görür, kaydet çubuğu yoktur. Bağımsız kontrolün bulgularıyla:
// "Adresi temizle" adresin dört alanını boşaltır; sosyal alanın açıklaması ekran okuyucuya "yalnız kullanıcı adı"
// der, hatalı sosyal alanın kenarı kırmızıdır; sınırı aşan sosyal hesapların hatası özette kendi metniyle. Uç sahte
// fetch ile verilir.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sosyalSiteler } from "../../kayitlar/sosyal-siteler.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { MagazaBilgileriEkrani } from "../magaza-bilgileri/ekran.tsx";
import type { MagazaBilgileriVerisi } from "../magaza-bilgileri/veri.ts";

const yenile = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: yenile, push: vi.fn() }) }));

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const metin = metinOkuyucu("tr");

const istekler: { adres: string; govde: unknown }[] = [];
let yanit: () => Response;
beforeEach(() => {
  istekler.length = 0;
  yanit = () => Response.json({ basarili: true, veri: {} });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (adres: string, secenek?: RequestInit) => {
      istekler.push({ adres, govde: JSON.parse(String(secenek?.body)) });
      return yanit();
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const bosSosyal = () =>
  Object.fromEntries(
    sosyalSiteler.map((site) => [site, [""]]),
  ) as MagazaBilgileriVerisi["form"]["sosyal"];

const veri = (): MagazaBilgileriVerisi => ({
  ulkeler: [
    {
      kod: "TR",
      ad: "Türkiye",
      iller: [{ kod: "TR-06", ad: "Ankara", ilceler: [{ kod: "TR-06-007", ad: "Çankaya" }] }],
      postaKoduZorunlu: true,
    },
  ],
  form: {
    magazaAdi: "Deneme Dükkânı",
    iletisimEpostasi: "",
    iletisimTelefonu: "+90 312 000 00 00",
    magazaAdresi: {
      ulke: "TR",
      il: "TR-06",
      ilce: "TR-06-007",
      adres: "Deneme Sokak",
      postaKodu: "06420",
    },
    sosyal: { ...bosSosyal(), instagram: ["birinci", "ikinci"] },
    saticiBilgileri: {
      ulke: "TR",
      isletmeTuru: "sirket",
      unvan: "Deneme Ticaret A.Ş.",
      vergiDairesi: "",
      vergiNumarasi: "1111111114",
      mersisNumarasi: "",
      ticaretSicilNumarasi: "",
      kepAdresi: "",
    },
  },
});

const ciz = (izinli = true) =>
  render(
    <MetinSaglayici dil="tr">
      <MagazaBilgileriEkrani veri={veri()} izinli={izinli} />
    </MetinSaglayici>,
  );

const kaydet = () => screen.getByRole("button", { name: metin("yonetim.magazaBilgileri.kaydet") });
const alan = (ad: string) => screen.getByRole("textbox", { name: new RegExp(`^${ad}`) });

describe("mağaza bilgileri ekranı", () => {
  it("dört kart başlığıyla; tek ülke yazı olarak; her site için önekli alan, ikinci hesap kendi alanında", () => {
    ciz();
    for (const baslik of ["magaza", "iletisim", "sosyal", "satici"] as const) {
      expect(
        screen.getByRole("region", { name: metin(`yonetim.magazaBilgileri.${baslik}.baslik`) }),
      ).toBeDefined();
    }
    const satici = within(
      screen.getByRole("region", { name: metin("yonetim.magazaBilgileri.satici.baslik") }),
    );
    expect(satici.getByText("Türkiye")).toBeDefined();
    expect(
      satici.queryByRole("combobox", { name: metin("yonetim.magazaBilgileri.ulke") }),
    ).toBeNull();
    const sosyal = within(
      screen.getByRole("region", { name: metin("yonetim.magazaBilgileri.sosyal.baslik") }),
    );
    expect(sosyal.getAllByRole("textbox")).toHaveLength(sosyalSiteler.length + 1);
    expect(sosyal.getByRole("textbox", { name: /^Instagram(?! \(2)/ })).toHaveProperty(
      "value",
      "birinci",
    );
    expect(sosyal.getByRole("textbox", { name: /^Instagram \(2\. hesap\)/ })).toHaveProperty(
      "value",
      "ikinci",
    );
    expect(sosyal.getAllByText("instagram.com/")).toHaveLength(2);
    expect(sosyal.getByText("youtube.com/@")).toBeDefined();
  });

  it("şahıs işletmesinde numaranın adı kimlik numarasıdır", () => {
    ciz();
    expect(alan(metin("yonetim.magazaBilgileri.vergiNumarasi"))).toBeDefined();
    fireEvent.click(
      screen.getByRole("radio", { name: metin("yonetim.magazaBilgileri.isletme.sahis") }),
    );
    expect(alan(metin("yonetim.magazaBilgileri.kimlikNumarasi"))).toBeDefined();
  });

  it("kayıt bütün alanları yazı olarak, sosyal hesapları sitelerin sırasıyla gönderir", async () => {
    ciz();
    fireEvent.change(alan(metin("yonetim.magazaBilgileri.eposta")), {
      target: { value: "yeni@deneme.test" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /^YouTube/ }), {
      target: { value: "denemetv" },
    });
    await act(async () => {
      fireEvent.click(kaydet());
    });
    expect(istekler).toHaveLength(1);
    expect(istekler[0]?.adres).toBe("/kapi/yonetici/magaza-bilgileri");
    const govde = istekler[0]?.govde as Record<string, unknown>;
    expect(govde).toMatchObject({
      magazaAdi: "Deneme Dükkânı",
      iletisimEpostasi: "yeni@deneme.test",
      iletisimTelefonu: "+90 312 000 00 00",
      magazaAdresi: {
        ulke: "TR",
        il: "TR-06",
        ilce: "TR-06-007",
        adres: "Deneme Sokak",
        postaKodu: "06420",
      },
      saticiBilgileri: {
        isletmeTuru: "sirket",
        unvan: "Deneme Ticaret A.Ş.",
        vergiNumarasi: "1111111114",
      },
    });
    const hesaplar = govde["sosyalHesaplar"] as { site: string; hesap: string }[];
    expect(hesaplar.map((h) => h.site)).toEqual(
      sosyalSiteler.flatMap((site) => (site === "instagram" ? [site, site] : [site])),
    );
    expect(hesaplar.find((h) => h.site === "youtube")?.hesap).toBe("denemetv");
  });

  it("sunucunun sosyal hesap hatası gönderilen sıradan doğru alana bağlanır; tekrar hatası özette", async () => {
    ciz();
    fireEvent.change(screen.getByRole("textbox", { name: /^YouTube/ }), {
      target: { value: "x y" },
    });
    // Gönderilen sırada YouTube: instagram (2), facebook, x, youtube → 4.
    const youtubeSirasi = sosyalSiteler
      .flatMap((site) => (site === "instagram" ? [site, site] : [site]))
      .indexOf("youtube");
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: {
            kod: "dogrulama",
            ayrinti: [
              { alan: `sosyalHesaplar.${youtubeSirasi}.hesap`, kod: "invalid_format" },
              { alan: "saticiBilgileri.vergiNumarasi", kod: "vergi-numarasi-kontrol" },
            ],
          },
        },
        { status: 400 },
      );
    await act(async () => {
      fireEvent.click(kaydet());
    });
    const youtube = screen.getByRole("textbox", { name: /^YouTube/ });
    expect(youtube.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(metin("yonetim.magazaBilgileri.hata.sosyalHesap"))).toBeDefined();
    expect(
      screen.getByText(metin("yonetim.magazaBilgileri.hata.vergiNumarasiKontrol")),
    ).toBeDefined();
    expect(screen.getByRole("textbox", { name: /^X/ }).getAttribute("aria-invalid")).toBeNull();

    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: {
            kod: "dogrulama",
            ayrinti: [{ alan: "sosyalHesaplar", kod: "sosyal-hesap-tekrar" }],
          },
        },
        { status: 400 },
      );
    await act(async () => {
      fireEvent.click(kaydet());
    });
    expect(
      screen.getAllByText(metin("yonetim.magazaBilgileri.hata.sosyalTekrar")).length,
    ).toBeGreaterThan(0);
  });

  it("değiştirme izni olmayan yönetici alanları kapalı görür, kaydet çubuğu yoktur", () => {
    ciz(false);
    // Alanlar kapalı fieldset'in içindedir: alanın kendi özelliği değil, :disabled durumu.
    expect(alan(metin("yonetim.magazaBilgileri.magazaAdi")).matches(":disabled")).toBe(true);
    expect(screen.getByRole("textbox", { name: /^YouTube/ }).matches(":disabled")).toBe(true);
    expect(
      screen.queryByRole("button", { name: metin("yonetim.magazaBilgileri.kaydet") }),
    ).toBeNull();
  });

  it("Adresi temizle adresin dört alanını boşaltır, ülke kalır", async () => {
    ciz();
    fireEvent.click(
      screen.getByRole("button", { name: metin("yonetim.magazaBilgileri.adresiTemizle") }),
    );
    await act(async () => {
      fireEvent.click(kaydet());
    });
    expect((istekler[0]?.govde as { magazaAdresi?: unknown } | undefined)?.magazaAdresi).toEqual({
      ulke: "TR",
      il: "",
      ilce: "",
      adres: "",
      postaKodu: "",
    });
  });

  it("sosyal alanın açıklaması kullanıcı adını söyler; hatalı alanın kenarı kırmızı; sınır hatası özette", async () => {
    ciz();
    const youtube = screen.getByRole("textbox", { name: /^YouTube/ });
    const aciklama = document.getElementById(
      (youtube.getAttribute("aria-describedby") ?? "").split(" ").at(-1) ?? "",
    );
    expect(aciklama?.textContent).toBe(
      metin("yonetim.magazaBilgileri.sosyal.alanAciklamasi").replace("{adres}", "youtube.com/@"),
    );
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: {
            kod: "dogrulama",
            ayrinti: [
              { alan: "sosyalHesaplar", kod: "too_big" },
              { alan: "sosyalHesaplar.0.hesap", kod: "kayda-uygun-degil" },
            ],
          },
        },
        { status: 400 },
      );
    fireEvent.change(alan(metin("yonetim.magazaBilgileri.eposta")), {
      target: { value: "a@b.test" },
    });
    await act(async () => {
      fireEvent.click(kaydet());
    });
    expect(
      screen.getAllByText(metin("yonetim.magazaBilgileri.hata.sosyalSinir")).length,
    ).toBeGreaterThan(0);
    const instagram = screen.getByRole("textbox", { name: /^Instagram(?! \(2)/ });
    expect(instagram.getAttribute("aria-invalid")).toBe("true");
    expect(instagram.parentElement?.className).toContain("border-tehlike");
    expect(screen.getByText(metin("yonetim.magazaBilgileri.hata.kaydaUygunDegil"))).toBeDefined();
  });
});
