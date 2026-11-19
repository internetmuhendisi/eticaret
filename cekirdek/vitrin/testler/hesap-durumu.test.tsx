// @vitest-environment jsdom
// Müşterinin oturum durumu ve Hesabım öğeleri (kart 0131): sade ana sayfanın hesap alanı, üst satırın Hesabım
// menüsü ve telefondaki yan pencere aynı durumu kullanır; sayfada tek istek gider. Girişsiz ziyaretçi başarılı bir
// "girişsiz" cevabı alır (kart 0187); sunucu ve ağ hatasında girişli müşteri "Giriş yap" görmez (karar 0051). Katalogun
// örnek kipinde istek gitmez.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { temaDemosu } from "../../kayitlar/tema.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { HesapMenusu } from "../bolumler/ust-satir/hesap-menusu.tsx";
import { MenuDugmesi } from "../bolumler/ust-satir/menu-dugmesi.tsx";
import { HesapAlani } from "../hesap-alani.tsx";
import { hesapDurumunuBekle, hesapDurumunuSifirla } from "../hesap-durumu.ts";

const metin = metinOkuyucu("tr");
const hesabimUcu = "/kapi/herkese-acik/hesap-durumu";
const cikisUcu = "/kapi/herkese-acik/musteri-cikis";
const eposta = "musteri@ornek.test";
const etiket = metin("vitrin.bolum.ustSatir.hesap");

const yanit = (durum: number, govde: unknown = {}) =>
  new Response(JSON.stringify(govde), { status: durum });
const girisli = () => yanit(200, { basarili: true, veri: { girisli: true, eposta } });
const girissiz = () => yanit(200, { basarili: true, veri: { girisli: false } });

// Uçlara giden istekleri sayar; cevabı adrese göre verir.
const ucuTaklitEt = (cevaplar: Record<string, () => Response | Promise<Response>>) =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async (hedef) => {
    const cevap = cevaplar[String(hedef)];
    if (cevap === undefined) throw new Error(`beklenmeyen istek: ${String(hedef)}`);
    return cevap();
  });

const ciz = (sorulur = true) =>
  render(
    <MetinSaglayici dil="tr">
      <HesapMenusu
        baglanti={<a href="/giris">{etiket}</a>}
        etiket={etiket}
        className=""
        sorulur={sorulur}
      />
      <MenuDugmesi
        menuler={[]}
        yandakiler={[]}
        hesap={{ adres: "/giris", ikon: "hesap", etiket }}
        hesapSorulur={sorulur}
        metinler={{
          ac: "aç",
          kapat: "kapat",
          baslik: "Menü",
          tumu: "Tümü",
          kategoriler: "Kategoriler",
        }}
      />
      {sorulur ? <HesapAlani /> : null}
    </MetinSaglayici>,
  );

// Cevabın işlenmesini bekler.
const bekle = () => act(async () => {});

beforeEach(() => hesapDurumunuSifirla());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("oturum durumu", () => {
  it("üç kullanan tek istek gönderir; girişli müşteride Hesabım menü düğmesidir", async () => {
    const istek = ucuTaklitEt({ [hesabimUcu]: girisli });
    ciz();
    await bekle();
    expect(istek).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link", { name: etiket })).toBeNull();
    const dugme = screen.getByRole("button", { name: etiket });
    expect(dugme.getAttribute("aria-haspopup")).toBe("menu");
    // Sade sayfanın hesap alanı e-postayı ve çıkışı gösterir.
    expect(screen.getByText(eposta)).toBeDefined();
    expect(screen.getByRole("button", { name: metin("vitrin.hesap.cikis") })).toBeDefined();
  });

  it("menü e-postayı ve çıkışı gösterir; çıkış olmazsa uyarı menüde görünür", async () => {
    ucuTaklitEt({ [hesabimUcu]: girisli, [cikisUcu]: () => yanit(500) });
    ciz();
    await bekle();
    const dugme = screen.getByRole("button", { name: etiket });
    await act(async () => {
      fireEvent.keyDown(dugme, { key: "Enter" });
    });
    const menu = screen.getByRole("menu");
    expect(menu.textContent).toContain(eposta);
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: metin("vitrin.hesap.cikis") }));
    });
    expect(screen.getByRole("menu").textContent).toContain(metin("vitrin.hesap.cikisHata"));
  });

  it("girişsiz cevabında Hesabım bağlantıdır, sade sayfada giriş ve kayıt bağlantısı görünür", async () => {
    const istek = ucuTaklitEt({ [hesabimUcu]: girissiz });
    ciz();
    await bekle();
    expect(istek).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: etiket })).toBeDefined();
    expect(screen.queryByRole("button", { name: etiket })).toBeNull();
    expect(screen.getByRole("link", { name: metin("vitrin.hesap.giris") })).toBeDefined();
    expect(screen.getByRole("link", { name: metin("vitrin.hesap.kayit") })).toBeDefined();
  });

  it.each([
    ["sunucu hatası", () => yanit(500)],
    [
      "ağ hatası",
      () => {
        throw new TypeError("ağ yok");
      },
    ],
  ])(
    "%s girişsiz sayılmaz: 'Giriş yap' ve e-posta yok, Hesabım tarafsız bağlantı",
    async (_ad, cevap) => {
      ucuTaklitEt({ [hesabimUcu]: cevap });
      ciz();
      await bekle();
      expect(screen.queryByRole("link", { name: metin("vitrin.hesap.giris") })).toBeNull();
      expect(screen.queryByText(eposta)).toBeNull();
      expect(screen.getByRole("link", { name: etiket })).toBeDefined();
    },
  );

  it("katalogun örnek kipinde istek gitmez, Hesabım bağlantıdır", async () => {
    const istek = ucuTaklitEt({ [hesabimUcu]: girisli });
    ciz(false);
    await bekle();
    expect(istek).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: etiket })).toBeDefined();
  });

  // Kart 0116: tema demosunda müşteri uçları kapalıdır; sayfa kökündeki işaret varken oturum sorulmaz, ziyaretçi
  // girişsizdir (favoriler üye olmayan müşteri gibi tarayıcıda durur).
  it("tema demosunun işareti varken istek gitmez, ziyaretçi girişsizdir", async () => {
    const istek = ucuTaklitEt({ [hesabimUcu]: girisli });
    document.documentElement.setAttribute(temaDemosu.oznitelik, "");
    try {
      expect(await hesapDurumunuBekle()).toEqual({ tur: "girissiz" });
      expect(istek).not.toHaveBeenCalled();
    } finally {
      document.documentElement.removeAttribute(temaDemosu.oznitelik);
    }
  });

  it("tema demosunda yan pencerede hesap öğesi yoktur", async () => {
    render(
      <MetinSaglayici dil="tr">
        <MenuDugmesi
          menuler={[]}
          yandakiler={[]}
          hesap={undefined}
          hesapSorulur={false}
          metinler={{ ac: "aç", kapat: "kapat", baslik: "Menü", tumu: "Tümü", kategoriler: "K" }}
        />
      </MetinSaglayici>,
    );
    fireEvent.click(screen.getByRole("button", { name: "aç" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.queryByRole("link", { name: etiket })).toBeNull();
  });

  it("telefondaki yan pencerede girişli müşteri e-postayı ve çıkış düğmesini görür", async () => {
    ucuTaklitEt({ [hesabimUcu]: girisli });
    ciz();
    await bekle();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "aç" }));
    });
    const pencere = screen.getByRole("dialog");
    expect(pencere.textContent).toContain(eposta);
    expect(
      [...pencere.querySelectorAll("button")].some(
        (dugme) => dugme.textContent === metin("vitrin.hesap.cikis"),
      ),
    ).toBe(true);
    expect([...pencere.querySelectorAll("a")].some((a) => a.textContent === etiket)).toBe(false);
  });
});
