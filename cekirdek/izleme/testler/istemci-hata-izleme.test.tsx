// @vitest-environment jsdom
// Hata izleme aracının tarayıcıda bağlanması (kart 0022, karar 0036).
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Olay } from "../hata-izleme-araci.ts";
import { HataIzlemeBaglantisi } from "../istemci-hata-izleme.tsx";
import { istemciHatasiniKaydet } from "../istemci-hata-katmani.ts";

const bilgi = {
  adres: "https://0123456789abcdef0123456789abcdef@izleme.ornek.com/7",
  site: "deneme-sitesi",
  surum: "0.1.0",
  ortam: "deneme",
};

const bekle = () => new Promise((coz) => setTimeout(coz, 0));

const olaylar = () => {
  const gelenler: Olay[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_: string, istek: RequestInit) => {
      gelenler.push(JSON.parse(String(istek.body)));
      return new Response(null, { status: 200 });
    }),
  );
  return gelenler;
};

describe("tarayıcıdaki hata izleme bağlantısı", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sınırın yakaladığı hata yolu ve etiketleriyle gider, sorgu kısmı gitmez", async () => {
    const gelenler = olaylar();
    window.history.pushState({}, "", "/sifre-yenile?anahtar=cokgizlideger");
    render(<HataIzlemeBaglantisi bilgi={bilgi} />);
    istemciHatasiniKaydet(new Error("bölüm bozuldu ayse@ornek.com"));
    await bekle();
    expect(gelenler).toHaveLength(1);
    const metin = JSON.stringify(gelenler[0]);
    expect(metin).not.toContain("cokgizlideger");
    expect(metin).not.toContain("ayse@ornek.com");
    expect(gelenler[0]?.tags).toMatchObject({ site: "deneme-sitesi", kaynak: "tarayici" });
    expect(gelenler[0]?.platform).toBe("javascript");
    expect(gelenler[0]?.extra).toMatchObject({ baglam: { yol: "/sifre-yenile" } });
  });

  it("hiçbir sınırın yakalamadığı hata ve söz hatası da gider", async () => {
    const gelenler = olaylar();
    render(<HataIzlemeBaglantisi bilgi={bilgi} />);
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("yakalanmadı") }));
    const soz = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(soz, "reason", { value: new Error("söz düştü") });
    window.dispatchEvent(soz);
    await bekle();
    const degerler = gelenler.map((olay) => olay.exception?.values?.[0]?.value);
    expect(degerler).toEqual(["yakalanmadı", "söz düştü"]);
  });

  it("bir sayfada en çok on olay gider", async () => {
    const gelenler = olaylar();
    render(<HataIzlemeBaglantisi bilgi={bilgi} />);
    for (let i = 0; i < 25; i++) istemciHatasiniKaydet(new Error(`döngü ${i}`));
    await bekle();
    expect(gelenler).toHaveLength(10);
  });

  it("kaldırılınca araç çözülür, hata yalnız konsola yazılır", async () => {
    const gelenler = olaylar();
    const konsol = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<HataIzlemeBaglantisi bilgi={bilgi} />);
    unmount();
    istemciHatasiniKaydet(new Error("sonra"));
    await bekle();
    expect(gelenler).toHaveLength(0);
    expect(konsol).toHaveBeenCalled();
  });
});
