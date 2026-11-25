// @vitest-environment jsdom
// Hesabım'ın yedek kodları (kart 0307): doğru kodla yenilenince odak "Yeni yedek kodlar" başlığına geçer. Sıra
// kurulur: bir sonraki kare (requestAnimationFrame) React'ın çizimi bitmeden gelir. Hattaki düşüşte (45567962785)
// sayfanın yenilenmesi o anda derleniyordu ve başlık odak almadı; eski kod (odak bir sonraki karede) bu sırayla
// kırmızıdır.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { HesabimEkrani } from "../hesabim/ekran.tsx";

const yenile = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: yenile }) }));

const metin = metinOkuyucu("tr");

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ basarili: true, veri: { yedekKodlari: ["11112222", "33334444"] } }),
    ),
  );
  // Kare çizimden önce gelir: geri çağırma hemen çalışır.
  vi.stubGlobal("requestAnimationFrame", (geri: FrameRequestCallback) => {
    geri(0);
    return 0;
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Hesabım'ın yedek kodları", () => {
  it("yenilenince odak yeni kodların başlığına geçer, kare çizimden önce gelse de", async () => {
    render(
      <MetinSaglayici dil="tr">
        <HesabimEkrani
          eposta="sahip@ornek.test"
          roller={["magaza-sahibi"]}
          ikiAsamaKurulu
          yenileyebilir
        />
      </MetinSaglayici>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: metin("yonetim.hesabim.kod") }), {
      target: { value: "123456" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: metin("yonetim.hesabim.yenile") }));
    });
    const baslik = await screen.findByRole("heading", { name: metin("yonetim.hesabim.kodlar") });
    expect(screen.getByText("11112222")).toBeTruthy();
    expect(document.activeElement).toBe(baslik);
  });
});
