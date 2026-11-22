// @vitest-environment jsdom
// Tema ekranının logo bölümü (kart 0094): önizleme ve kaynağın yazısı; dosya seçilince yükleme ucuna dosyanın kendisi
// gider, ilerleme çubuğu oranı söyler, İptal yüklemeyi durdurur; başarıda sayfa yenilenir; reddedilen dosyanın
// metni alanın altında yazar, düğmeye bağlıdır ve odak düğmeye gider; sınırı aşan dosya için istek gitmez; ön kapının
// zarfsız 413'ü aynı metni alır; "Logoyu kaldır" yalnız yüklenen logoda ve onayla; izni olmayana düğme yok. Yükleme
// sahte XMLHttpRequest, kaldırma sahte fetch ile verilir.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dosyaSinirlari } from "../../kayitlar/dosya.ts";
import { doldur } from "../../metinler/doldur.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { LogoBolumu } from "../tema/logo-bolumu.tsx";
import type { EkranLogosu } from "../tema/veri.ts";

const yenile = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: yenile }) }));

const metin = metinOkuyucu("tr");

// Sahte XMLHttpRequest: açılan istekler tutulur, test yanıtı ve ilerlemeyi kendisi verir.
class SahteIstek {
  static son: SahteIstek | undefined;
  static sayi = 0;
  yontem = "";
  adres = "";
  basliklar: Record<string, string> = {};
  govde: unknown;
  status = 0;
  statusText = "";
  response: ArrayBuffer | null = null;
  responseType = "";
  upload: { onprogress: ((olay: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  iptalEdildi = false;
  constructor() {
    SahteIstek.son = this;
    SahteIstek.sayi += 1;
  }
  open(yontem: string, adres: string) {
    this.yontem = yontem;
    this.adres = adres;
  }
  setRequestHeader(ad: string, deger: string) {
    this.basliklar[ad] = deger;
  }
  send(govde: unknown) {
    this.govde = govde;
  }
  abort() {
    this.iptalEdildi = true;
    this.onabort?.();
  }
  getAllResponseHeaders() {
    return "content-type: application/json\r\n";
  }
  ilerle(yuklenen: number, toplam: number) {
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded: yuklenen,
      total: toplam,
    } as ProgressEvent);
  }
  yanitla(durum: number, govde: unknown) {
    this.status = durum;
    this.response = new TextEncoder().encode(
      typeof govde === "string" ? govde : JSON.stringify(govde),
    ).buffer as ArrayBuffer;
    this.onload?.();
  }
}

const kaldirmaIstekleri: string[] = [];
beforeEach(() => {
  SahteIstek.son = undefined;
  SahteIstek.sayi = 0;
  kaldirmaIstekleri.length = 0;
  yenile.mockClear();
  vi.stubGlobal("XMLHttpRequest", SahteIstek);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (adres: string) => {
      kaldirmaIstekleri.push(adres);
      return Response.json({ basarili: true, veri: { kaynak: "ilk", adres: null } });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ilkLogo: EkranLogosu = { kaynak: "ilk", adres: "/kapi/herkese-acik/logo?s=0123456789abcdef" };
const yuklenenLogo: EkranLogosu = {
  kaynak: "yuklenen",
  adres: "/kapi/herkese-acik/logo?s=fedcba9876543210",
};

const ciz = (logo: EkranLogosu, degistirebilir = true) =>
  render(
    <MetinSaglayici dil="tr">
      <LogoBolumu logo={logo} enCokDosyaBoyutu="10 MB" degistirebilir={degistirebilir} />
    </MetinSaglayici>,
  );

const yukleDugmesi = () => screen.getByRole("button", { name: metin("yonetim.tema.logo.yukle") });
const dosyaGirdisi = () => {
  const girdi = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (girdi === null) throw new Error("Dosya girdisi yok.");
  return girdi;
};
const sec = (dosya: File) =>
  act(async () => {
    fireEvent.change(dosyaGirdisi(), { target: { files: [dosya] } });
  });
const png = () =>
  new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "logo.png", { type: "image/png" });

describe("logo bölümü", () => {
  it("önizleme ve kaynağın yazısı; ilk logoda Kaldır yok, yüklenen logoda var", () => {
    ciz(ilkLogo);
    expect(
      screen.getByRole("img", { name: metin("yonetim.tema.logo.onizleme") }).getAttribute("src"),
    ).toBe(ilkLogo.adres);
    expect(screen.getByText(metin("yonetim.tema.logo.ilk"))).toBeDefined();
    expect(screen.queryByRole("button", { name: metin("yonetim.tema.logo.kaldir") })).toBeNull();
    cleanup();
    ciz(yuklenenLogo);
    expect(screen.getByText(metin("yonetim.tema.logo.yuklenen"))).toBeDefined();
    expect(screen.getByRole("button", { name: metin("yonetim.tema.logo.kaldir") })).toBeDefined();
    cleanup();
    ciz({ kaynak: null, adres: null });
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText(metin("yonetim.tema.logo.yok"))).toBeDefined();
  });

  it("izni olmayana yükleme ve kaldırma düğmesi yok, önizleme var", () => {
    ciz(yuklenenLogo, false);
    expect(screen.queryAllByRole("button")).toEqual([]);
    expect(screen.getByRole("img")).toBeDefined();
  });

  it("seçilen dosya yükleme ucuna gider, ilerleme ve İptal görünür; başarıda sayfa yenilenir", async () => {
    ciz(ilkLogo);
    const dosya = png();
    await sec(dosya);
    const istek = SahteIstek.son;
    expect(istek?.yontem).toBe("POST");
    expect(istek?.adres).toBe("/kapi/yonetici/logo-yukle");
    expect(istek?.govde).toBe(dosya);
    expect(istek?.basliklar["content-type"]).toBe("application/octet-stream");
    await act(async () => istek?.ilerle(40, 100));
    const cubuk = screen.getByRole("progressbar", {
      name: doldur(metin("yonetim.dosya.ilerleme"), { ad: metin("yonetim.tema.logo.ad") }),
    });
    expect(cubuk.getAttribute("aria-valuenow")).toBe("40");
    expect(yukleDugmesi().getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("button", { name: metin("yonetim.dosya.iptal") })).toBeDefined();
    // Sürerken ikinci seçim ikinci istek göndermez.
    await sec(png());
    expect(SahteIstek.sayi).toBe(1);
    await act(async () =>
      istek?.yanitla(200, {
        basarili: true,
        veri: { kaynak: "yuklenen", adres: yuklenenLogo.adres },
      }),
    );
    expect(yenile).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(yukleDugmesi().getAttribute("aria-disabled")).toBeNull();
  });

  it("İptal yüklemeyi durdurur, hata yazılmaz", async () => {
    ciz(ilkLogo);
    await sec(png());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: metin("yonetim.dosya.iptal") }));
    });
    expect(SahteIstek.son?.iptalEdildi).toBe(true);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(yukleDugmesi().getAttribute("aria-invalid")).toBeNull();
    expect(yenile).not.toHaveBeenCalled();
  });

  it("reddedilen dosyanın metni alanın altında, düğmeye bağlı; odak düğmede; yeni seçim hatayı kaldırır", async () => {
    ciz(ilkLogo);
    await sec(png());
    await act(async () =>
      SahteIstek.son?.yanitla(400, {
        basarili: false,
        hata: { kod: "dogrulama", ayrinti: [{ alan: "dosya", kod: "tur-izinsiz" }] },
      }),
    );
    const dugme = yukleDugmesi();
    const hata = screen.getByText(metin("yonetim.dosya.hata.tur-izinsiz"));
    expect(dugme.getAttribute("aria-invalid")).toBe("true");
    expect(dugme.getAttribute("aria-describedby")).toBe(hata.id);
    expect(document.activeElement).toBe(dugme);
    await sec(png());
    expect(screen.queryByText(metin("yonetim.dosya.hata.tur-izinsiz"))).toBeNull();
  });

  it("sınırı aşan dosya için istek gitmez; metin sınırı söyler", async () => {
    ciz(ilkLogo);
    const buyuk = new File([new Uint8Array(1)], "buyuk.png", { type: "image/png" });
    Object.defineProperty(buyuk, "size", { value: dosyaSinirlari.enCokBayt + 1 });
    await sec(buyuk);
    expect(SahteIstek.sayi).toBe(0);
    expect(
      screen.getByText(doldur(metin("yonetim.dosya.hata.cok-buyuk"), { boyut: "10 MB" })),
    ).toBeDefined();
  });

  it("ön kapının zarfsız 413'ü sınır metnini alır", async () => {
    ciz(ilkLogo);
    await sec(png());
    await act(async () => SahteIstek.son?.yanitla(413, "Request Entity Too Large"));
    expect(
      screen.getByText(doldur(metin("yonetim.dosya.hata.cok-buyuk"), { boyut: "10 MB" })),
    ).toBeDefined();
  });

  it("Logoyu kaldır onay penceresiyle sorar; Vazgeç istek göndermez, onay kaldırma ucuna gider", async () => {
    ciz(yuklenenLogo);
    const kaldir = () => screen.getByRole("button", { name: metin("yonetim.tema.logo.kaldir") });
    fireEvent.click(kaldir());
    let pencere = screen.getByRole("alertdialog", {
      name: metin("yonetim.tema.logo.kaldirBaslik"),
    });
    await act(async () => {
      fireEvent.click(within(pencere).getByRole("button", { name: metin("ortak.islem.vazgec") }));
    });
    expect(kaldirmaIstekleri).toEqual([]);
    fireEvent.click(kaldir());
    pencere = screen.getByRole("alertdialog", { name: metin("yonetim.tema.logo.kaldirBaslik") });
    await act(async () => {
      fireEvent.click(
        within(pencere).getByRole("button", { name: metin("yonetim.tema.logo.kaldir") }),
      );
    });
    expect(kaldirmaIstekleri).toEqual(["/kapi/yonetici/logo-kaldir"]);
    expect(yenile).toHaveBeenCalledTimes(1);
  });
});
