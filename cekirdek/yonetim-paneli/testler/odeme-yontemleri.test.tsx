// @vitest-environment jsdom
// Ödeme yöntemleri ve banka hesapları ekranları (kart 0214, karar 0141):
// - Ödeme yöntemleri: anahtarlar yöntemin durumunu ve yazısını taşır; kapatılan yöntem "vitrinde görünmüyor" der;
//   kayıt bütün yöntemleri sırasıyla, kapıda seçeneklerini ve süreyi yazı olarak gönderir; "en az bir yöntem" hatası
//   formun üstünde, gün hatası alanın altında yazar; değiştirme izni olmayan yönetici (görevli) anahtarları kapalı,
//   kaydet düğmesini yok görür; havale açık ve hesap yokken uyarı.
// - Banka hesapları: liste ve gruplanmış IBAN; izinli yöneticide düzenle ve sil düğmeleri, izinsizde yok; hesap
//   yokken boş hâl ve (izinliyse) ekleme düğmesi; ekleme penceresinde boş alan sunucuya gitmez, IBAN hatası alanın
//   altında yazar.
// Uç sahte fetch ile verilir.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { doldur } from "../../metinler/doldur.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import type { BankaHesabi } from "../../moduller/odeme/yontemler.ts";
import {
  BankaHesaplariEylemleri,
  BankaHesaplariIcerigi,
  BankaHesaplariSaglayici,
} from "../odeme-yontemleri/banka-hesaplari.tsx";
import { OdemeYontemleriEkrani } from "../odeme-yontemleri/ekran.tsx";
import type { OdemeYontemleriEkraniVerisi } from "../odeme-yontemleri/veri.ts";

const yenile = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: yenile }) }));

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
  yenile.mockClear();
  yanit = () => Response.json({ basarili: true, veri: {} });
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

const veri = (
  degisiklik: Partial<OdemeYontemleriEkraniVerisi> = {},
): OdemeYontemleriEkraniVerisi => ({
  form: {
    yontemler: [
      { kod: "havale", acik: true },
      { kod: "kapida-odeme", acik: false },
    ],
    kapidaOdemeSecenekleri: ["nakit"],
    havaleIptalSuresi: "3",
  },
  bankaHesabiSayisi: 1,
  ...degisiklik,
});

const yontemleriCiz = (v: OdemeYontemleriEkraniVerisi, izinli = true) =>
  render(
    <MetinSaglayici dil="tr">
      <OdemeYontemleriEkrani veri={v} izinli={izinli} />
    </MetinSaglayici>,
  );

const anahtar = (ad: string) =>
  screen.getByRole("switch", {
    name: doldur(metin("yonetim.odemeYontemleri.vitrindeAcik"), { ad }),
  });
const havale = metin("ortak.odemeYontemi.havale");
const kapida = metin("ortak.odemeYontemi.kapidaOdeme");
const kaydet = () => screen.getByRole("button", { name: metin("yonetim.odemeYontemleri.kaydet") });

describe("ödeme yöntemleri ekranı", () => {
  it("anahtarlar durumu taşır; kayıt bütün yöntemleri sırasıyla ve süreyi yazı olarak gönderir", async () => {
    yontemleriCiz(veri());
    expect(anahtar(havale).getAttribute("aria-checked")).toBe("true");
    expect(anahtar(kapida).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(metin("yonetim.odemeYontemleri.vitrindeYok"))).toBeDefined();
    fireEvent.click(anahtar(kapida));
    fireEvent.click(screen.getByRole("checkbox", { name: metin("ortak.odemeYontemi.kart") }));
    fireEvent.change(screen.getByLabelText(metin("yonetim.odemeYontemleri.iptalSuresi")), {
      target: { value: "5" },
    });
    await act(async () => {
      fireEvent.click(kaydet());
    });
    expect(istekler).toEqual([
      {
        adres: "/kapi/yonetici/odeme-yontemleri",
        govde: {
          yontemler: [
            { kod: "havale", acik: true },
            { kod: "kapida-odeme", acik: true },
          ],
          kapidaOdemeSecenekleri: ["nakit", "kart"],
          havaleIptalSuresi: "5",
        },
      },
    ]);
    expect(yenile).toHaveBeenCalled();
  });

  it("en az bir yöntem hatası üstte, gün hatası alanın altında", async () => {
    yontemleriCiz(veri());
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: {
            kod: "dogrulama",
            ayrinti: [
              { alan: "yontemler", kod: "en-az-bir-yontem" },
              { alan: "havaleIptalSuresi", kod: "gun-gecersiz" },
            ],
          },
        },
        { status: 400 },
      );
    await act(async () => {
      fireEvent.click(kaydet());
    });
    expect(screen.getByText(metin("yonetim.odemeYontemleri.hata.enAzBir"))).toBeDefined();
    const sure = screen.getByLabelText(metin("yonetim.odemeYontemleri.iptalSuresi"));
    expect(sure.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(metin("yonetim.odemeYontemleri.hata.gunGecersiz"))).toBeDefined();
  });

  it("izni olmayan yönetici anahtarları kapalı görür, kaydet ve vazgeç yok, liste sıralanmaz", () => {
    yontemleriCiz(veri(), false);
    expect((anahtar(havale) as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.queryByRole("button", { name: metin("yonetim.odemeYontemleri.kaydet") }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: metin("ortak.islem.vazgec") })).toBeNull();
    expect(screen.queryByRole("button", { name: /Taşı/ })).toBeNull();
    const sure = screen.getByLabelText(
      metin("yonetim.odemeYontemleri.iptalSuresi"),
    ) as HTMLInputElement;
    expect(sure.disabled).toBe(true);
  });

  it("havale açık ve hesap yokken uyarı; hesap varken yok", () => {
    yontemleriCiz(veri({ bankaHesabiSayisi: 0 }));
    expect(screen.getByText(metin("yonetim.odemeYontemleri.hesapYok"))).toBeDefined();
    cleanup();
    yontemleriCiz(veri());
    expect(screen.queryByText(metin("yonetim.odemeYontemleri.hesapYok"))).toBeNull();
  });
});

const hesap: BankaHesabi = {
  kimlik: "5a0d6c1e-2f3b-4c8d-9e7a-1b2c3d4e5f01",
  banka: "Deneme Bankası",
  sahip: "Deneme Ticaret",
  iban: "TR420001000000000000000001",
};

const hesaplariCiz = (hesaplar: BankaHesabi[], degistirebilir = true) =>
  render(
    <MetinSaglayici dil="tr">
      <BankaHesaplariSaglayici hesaplar={hesaplar} degistirebilir={degistirebilir}>
        {degistirebilir ? <BankaHesaplariEylemleri /> : null}
        <BankaHesaplariIcerigi />
      </BankaHesaplariSaglayici>
    </MetinSaglayici>,
  );

describe("banka hesapları ekranı", () => {
  it("hesap gruplanmış IBAN ile; izinliye düzenle ve sil, izinsize yok", () => {
    hesaplariCiz([hesap]);
    expect(screen.getByText("TR42 0001 0000 0000 0000 0000 01")).toBeDefined();
    expect(
      screen.getByRole("button", {
        name: doldur(metin("yonetim.bankaHesaplari.sil"), { ad: hesap.banka }),
      }),
    ).toBeDefined();
    cleanup();
    hesaplariCiz([hesap], false);
    expect(screen.getByText("TR42 0001 0000 0000 0000 0000 01")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("hesap yokken boş hâl; izinliye ekleme düğmesi", () => {
    hesaplariCiz([]);
    expect(screen.getByText(metin("yonetim.bankaHesaplari.bosBaslik"))).toBeDefined();
    const ekle = doldur(metin("yonetim.eylem.ekle"), { ne: metin("yonetim.bankaHesaplari.hesap") });
    // Komut çubuğundaki ve boş hâldeki ekleme düğmesi.
    expect(screen.getAllByRole("button", { name: ekle })).toHaveLength(2);
    cleanup();
    hesaplariCiz([], false);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("ekleme penceresinde boş alan gitmez, IBAN hatası alanın altında", async () => {
    hesaplariCiz([hesap]);
    fireEvent.click(
      screen.getByRole("button", {
        name: doldur(metin("yonetim.eylem.ekle"), { ne: metin("yonetim.bankaHesaplari.hesap") }),
      }),
    );
    const pencere = await screen.findByRole("dialog");
    const gonder = within(pencere).getByRole("button", {
      name: metin("yonetim.bankaHesaplari.kaydet"),
    });
    await act(async () => {
      fireEvent.click(gonder);
    });
    expect(istekler).toEqual([]);
    expect(within(pencere).getAllByText(metin("yonetim.bankaHesaplari.hata.gerekli"))).toHaveLength(
      3,
    );
    fireEvent.change(within(pencere).getByLabelText(metin("yonetim.bankaHesaplari.banka")), {
      target: { value: "B" },
    });
    fireEvent.change(within(pencere).getByLabelText(metin("yonetim.bankaHesaplari.sahip")), {
      target: { value: "S" },
    });
    const iban = within(pencere).getByLabelText(metin("yonetim.bankaHesaplari.iban"));
    fireEvent.change(iban, { target: { value: "TR43 0001" } });
    yanit = () =>
      Response.json(
        {
          basarili: false,
          hata: { kod: "dogrulama", ayrinti: [{ alan: "iban", kod: "iban-uzunluk" }] },
        },
        { status: 400 },
      );
    await act(async () => {
      fireEvent.click(gonder);
    });
    expect(istekler).toEqual([
      {
        adres: "/kapi/yonetici/banka-hesabi-ekle",
        govde: { banka: "B", sahip: "S", iban: "TR43 0001" },
      },
    ]);
    expect(
      within(pencere).getByText(metin("yonetim.bankaHesaplari.hata.ibanUzunluk")),
    ).toBeDefined();
    expect(iban.getAttribute("aria-invalid")).toBe("true");
  });
});
