// @vitest-environment jsdom
// Siparişleri dışa aktarma ekranı (kart 0316, karar 0185): komut çubuğundaki "Dışa aktar" pencereyi listenin
// süzgeçleriyle açar (sayı, aramanın uygulanmadığı, satır düzeni, sütunlar, kişisel veri uyarısı); gönderilen girdi,
// pencerenin kapanıp sayfanın yenilenmesi; kapsam boşsa hata özette ve pencere açık; toplu çubuktaki "Dışa aktar"
// seçili siparişlerle açılır; listenin üstündeki kutu hazırlanırken durum sorar, hazır olunca indirme bağlantısı
// verir, hatalıyı söyler. Uç sahte fetch ile verilir, yönlendirici taklittir.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { listeDurumunuOku } from "../liste/tanim.ts";
import {
  DisaAktarDugmesi,
  DisaAktarmaKutusu,
  type DisaAktarmaKutusuVerisi,
} from "../siparisler/disa-aktarma.tsx";
import { SiparisListesi } from "../siparisler/liste.tsx";
import { siparisListesiTanimi } from "../siparisler/liste-tanimi.ts";
import type { SiparisSatiri } from "../siparisler/veri.ts";

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const yenile = vi.fn();
const bildirim = vi.fn();
vi.mock("../../../bilesenler/parcalar/bildirim.tsx", () => ({
  bildirimGoster: (...degerler: unknown[]) => bildirim(...degerler),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: yenile, push: vi.fn() }),
  usePathname: () => "/yonetim/siparisler",
}));

const metin = metinOkuyucu("tr");
const istekler: { adres: string; govde: unknown }[] = [];
let yanit: () => Response;
beforeEach(() => {
  istekler.length = 0;
  yenile.mockReset();
  yanit = () => Response.json({ basarili: true, veri: { kimlik: "k" } });
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const ciz = (dugum: React.ReactNode) => render(<MetinSaglayici dil="tr">{dugum}</MetinSaglayici>);
const pencere = () =>
  screen.getByRole("dialog", { name: metin("yonetim.siparisDisaAktarma.pencereBasligi") });

describe("dışa aktarma penceresi", () => {
  it("komut çubuğundan listenin süzgeçleriyle açılır, düzen seçilir, gönderilir, kapanır ve sayfa yenilenir", async () => {
    ciz(<DisaAktarDugmesi sorgu="odeme=havale" sayiYazisi="1.240" sinirYazisi="20.000" />);
    fireEvent.click(screen.getByRole("button", { name: metin("yonetim.eylem.disaAktar") }));
    const p = within(pencere());
    expect(p.getByText("Listedeki 1.240 sipariş")).toBeTruthy();
    expect(p.getByText(metin("yonetim.siparisDisaAktarma.aramaYok"))).toBeTruthy();
    expect(p.getByText(metin("yonetim.siparisDisaAktarma.kisiselUyari"))).toBeTruthy();
    expect(p.getByText(metin("yonetim.siparisDisaAktarma.sutunlarIpucu"))).toBeTruthy();
    const siparis = p.getByRole("radio", {
      name: metin("yonetim.siparisDisaAktarma.duzen.siparis"),
    });
    expect(siparis.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(
      p.getByRole("radio", { name: metin("yonetim.siparisDisaAktarma.duzen.kalem") }),
    );
    await act(async () => {
      fireEvent.click(p.getByRole("button", { name: metin("yonetim.siparisDisaAktarma.hazirla") }));
    });
    expect(istekler).toEqual([
      {
        adres: "/kapi/yonetici/siparisler-disa-aktar",
        govde: { kapsam: { tur: "liste", sorgu: "odeme=havale" }, duzen: "kalem" },
      },
    ]);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(yenile).toHaveBeenCalled();
    // Sonuç bildirim alanıyla duyurulur (kutu yenilemeyle sonradan gelir).
    expect(bildirim).toHaveBeenCalledWith("bilgi", metin("yonetim.siparisDisaAktarma.basladi"));
  });

  it("liste okunamadıysa sayısız yazar", () => {
    ciz(<DisaAktarDugmesi sorgu="" sayiYazisi={null} sinirYazisi="20.000" />);
    fireEvent.click(screen.getByRole("button", { name: metin("yonetim.eylem.disaAktar") }));
    expect(within(pencere()).getByText("Listedeki siparişler")).toBeTruthy();
  });

  it("kapsam boşsa ya da sınırı aşıyorsa nedeni özette yazar, pencere açık kalır", async () => {
    ciz(<DisaAktarDugmesi sorgu="durum=kargoda" sayiYazisi="0" sinirYazisi="20.000" />);
    fireEvent.click(screen.getByRole("button", { name: metin("yonetim.eylem.disaAktar") }));
    for (const [kod, beklenen] of [
      ["siparis-yok", metin("yonetim.siparisDisaAktarma.hata.siparis-yok")],
      [
        "cok-fazla-siparis",
        "Bir dosyada en çok 20.000 sipariş olabilir. Tarih süzgeciyle daraltın.",
      ],
    ] as const) {
      yanit = () =>
        Response.json(
          { basarili: false, hata: { kod: "is-kurali", ayrinti: [{ alan: "kapsam", kod }] } },
          { status: 422 },
        );
      await act(async () => {
        fireEvent.click(
          within(pencere()).getByRole("button", {
            name: metin("yonetim.siparisDisaAktarma.hazirla"),
          }),
        );
      });
      expect(within(pencere()).getAllByText(beklenen).length).toBeGreaterThan(0);
    }
    expect(yenile).not.toHaveBeenCalled();
  });

  it("toplu çubuktaki Dışa aktar seçili siparişlerle açılır", async () => {
    const satir = (numara: string): SiparisSatiri => ({
      numara,
      zaman: "27.11.2026 10:00",
      musteri: "Deniz Yılmaz",
      uye: false,
      durum: "hazirlaniyor",
      odeme: { yontem: "havale", secenek: null },
      tutar: "100,00 ¤",
      havaleBildirildi: false,
      iadeTalebi: false,
      iadeBekliyor: false,
      talepOnaylandi: false,
      iadeBasarisiz: false,
    });
    ciz(
      <SiparisListesi
        durum={listeDurumunuOku(siparisListesiTanimi, {})}
        veri={{
          satirlar: [satir("S-1"), satir("S-2"), satir("S-3")],
          toplam: 3,
          sayfa: 1,
          sayfaSayisi: 1,
          sayfaBoyu: 25,
          sekmeSayilari: {},
        }}
        topluIslemler={["disa-aktar"]}
        kayitSecenekleri={{}}
        gunYazilari={{}}
      />,
    );
    const tablo = within(screen.getByRole("table"));
    fireEvent.click(tablo.getByRole("checkbox", { name: "Seç: S-3" }));
    fireEvent.click(tablo.getByRole("checkbox", { name: "Seç: S-1" }));
    const cubuk = within(screen.getByRole("region", { name: metin("yonetim.liste.topluIslem") }));
    fireEvent.click(cubuk.getByRole("button", { name: metin("yonetim.eylem.disaAktar") }));
    const p = within(pencere());
    expect(p.getByText("Seçili 2 sipariş")).toBeTruthy();
    expect(p.queryByText(metin("yonetim.siparisDisaAktarma.aramaYok"))).toBeNull();
    await act(async () => {
      fireEvent.click(p.getByRole("button", { name: metin("yonetim.siparisDisaAktarma.hazirla") }));
    });
    expect(istekler[0]?.govde).toEqual({
      kapsam: { tur: "secili", numaralar: ["S-1", "S-3"] },
      duzen: "siparis",
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("listenin üstündeki kutu", () => {
  const kutu = (veri: DisaAktarmaKutusuVerisi) => ciz(<DisaAktarmaKutusu veri={veri} />);

  it("dosya yoksa çizilmez", () => {
    const { container } = kutu(null);
    expect(container.textContent).toBe("");
  });

  it("hazırlanırken durumu söyler ve sayfayı aralıkla yeniler; indirme bağlantısı yoktur", () => {
    vi.useFakeTimers();
    kutu({ kimlik: "k1", durum: "hazirlaniyor", siparisSayisi: "1.240" });
    expect(screen.getByRole("status").textContent).toContain("Dosya hazırlanıyor.1.240 sipariş.");
    expect(screen.queryByRole("link")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(yenile).toHaveBeenCalledTimes(2);
  });

  it("hazır olunca indirme bağlantısı verir, sayfayı yenilemez", () => {
    vi.useFakeTimers();
    kutu({ kimlik: "k2", durum: "hazir", siparisSayisi: "3" });
    expect(screen.getByRole("status").textContent).toContain("Dosya hazır.3 sipariş.");
    const baglanti = screen.getByRole("link", { name: metin("yonetim.siparisDisaAktarma.indir") });
    expect(baglanti.getAttribute("href")).toBe(
      "/kapi/yonetici/siparisler-disa-aktarma-indir?kimlik=k2",
    );
    expect(baglanti.hasAttribute("download")).toBe(true);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(yenile).not.toHaveBeenCalled();
  });

  it("hazırlanamayan dosyayı söyler", () => {
    kutu({ kimlik: "k3", durum: "hatali", siparisSayisi: "3" });
    expect(screen.getByRole("alert").textContent).toContain(
      metin("yonetim.siparisDisaAktarma.hatali"),
    );
  });
});
