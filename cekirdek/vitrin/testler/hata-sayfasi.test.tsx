// @vitest-environment jsdom
// Vitrinin hata sayfası (kart 0120): sekme başlığı "<hata> | <mağaza>" (mağaza adı yoksa yalnız hata), tek h1 ve
// açıklama, mağazanın telefonu çerçeveden geliyorsa açıklamada, yoksa
// telefonsuz metin; "Yeniden dene" sayfayı yeniden ister; ana sayfa bağlantısı; hata bir kez kaydedilir ve ayrıntısı
// ekranda görünmez.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { doldur } from "../../metinler/doldur.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { vitrinAdresleri } from "../adresler.ts";
import { HataSayfasi } from "../hata-sayfasi.tsx";
import { type VitrinBilgisi, VitrinBilgisiSaglayici } from "../vitrin-bilgisi.tsx";

const kaydet = vi.hoisted(() => vi.fn());
vi.mock("../../izleme/istemci-hata-katmani.ts", () => ({ istemciHatasiniKaydet: kaydet }));

const metin = metinOkuyucu("tr");
const telefon = "+90 000 000 00 00";
const hata = new Error("gizli ayrıntı");

afterEach(() => {
  cleanup();
  kaydet.mockReset();
});

const ciz = (bilgi: VitrinBilgisi | undefined, retry = vi.fn()) => {
  const sayfa = <HataSayfasi error={hata} retry={retry} />;
  render(
    <MetinSaglayici dil="tr">
      {bilgi === undefined ? (
        sayfa
      ) : (
        <VitrinBilgisiSaglayici bilgi={bilgi}>{sayfa}</VitrinBilgisiSaglayici>
      )}
    </MetinSaglayici>,
  );
  return retry;
};

describe("hata sayfası", () => {
  it("telefon çerçeveden geliyorsa açıklamada yazılır", () => {
    ciz({ telefon });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(metin("vitrin.hata.baslik"));
    expect(
      screen.getByText(doldur(metin("vitrin.hata.aciklamaTelefonlu"), { telefon })),
    ).toBeTruthy();
  });

  it("telefon yoksa (ya da çerçeve okunamadıysa) telefonsuz açıklama yazılır", () => {
    for (const bilgi of [{}, undefined]) {
      ciz(bilgi);
      expect(screen.getByText(metin("vitrin.hata.aciklama"))).toBeTruthy();
      expect(screen.queryByText(new RegExp(telefon.replaceAll("+", "\\+")))).toBeNull();
      cleanup();
    }
  });

  it("sekme başlığı mağaza adıyla kalıptan, mağaza adı yoksa yalnız hatanın başlığı", () => {
    ciz({ magazaAdi: "Deneme Mağazası" });
    expect(document.title).toBe(
      doldur(metin("vitrin.sayfaBilgisi.kalip"), {
        baslik: metin("vitrin.hata.sekmeBasligi"),
        magaza: "Deneme Mağazası",
      }),
    );
    cleanup();
    ciz(undefined);
    expect(document.title).toBe(metin("vitrin.hata.sekmeBasligi"));
  });

  it("Yeniden dene sayfayı yeniden ister, ana sayfa bağlantısı var", () => {
    const retry = ciz({});
    fireEvent.click(screen.getByRole("button", { name: metin("vitrin.hata.yenidenDene") }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("link", { name: metin("vitrin.hata.anasayfayaDon") }).getAttribute("href"),
    ).toBe(vitrinAdresleri.anasayfa);
  });

  it("hata bir kez kaydedilir, ayrıntısı ekranda görünmez", () => {
    ciz({});
    expect(kaydet).toHaveBeenCalledTimes(1);
    expect(kaydet).toHaveBeenCalledWith(hata);
    expect(document.body.textContent).not.toContain(hata.message);
  });
});
