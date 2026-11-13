// @vitest-environment jsdom
// Ürün sayfasının üst kısmı tarayıcıda (kart 0138, karar 0108; bağımsız kontrolün bulguları): tükenmiş değerin
// iki ayarı (seçili değer "gizle"de de görünür), seçimsiz başlangıçta ürünün genel bilgisi ve seçim isteği,
// hiçbir birleşim satılamıyorsa seçim istenmemesi, seçimle birleşimin bilgisinin gösterilmesi, adresin öteki
// parametreleri koruyarak yazılması ve müşterinin elle seçtiği bedenin geri gelmesi.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TukenmisSecenekGosterimi } from "../../../kayitlar/urun.ts";
import { MetinSaglayici } from "../../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../../metinler/metin.ts";
import type { Secim, SecimBirimi, SecimSecenegi } from "../secim.ts";
import { UrunUstKismi } from "../urun-ust.tsx";

const metin = metinOkuyucu("tr");

const secenekler: SecimSecenegi[] = [
  {
    kimlik: "renk",
    anahtar: "renk",
    ad: "Renk",
    degerler: [
      { kimlik: "beyaz", anahtar: "beyaz", ad: "Beyaz" },
      { kimlik: "siyah", anahtar: "siyah", ad: "Siyah" },
    ],
  },
  {
    kimlik: "beden",
    anahtar: "beden",
    ad: "Beden",
    degerler: [
      { kimlik: "s", anahtar: "s", ad: "S" },
      { kimlik: "m", anahtar: "m", ad: "M" },
      { kimlik: "l", anahtar: "l", ad: "L" },
    ],
  },
];
// Beyaz: S var, M tükenmiş, L yok. Siyah: S tükenmiş, M ve L var.
const birimler: SecimBirimi[] = [
  { kimlik: "beyaz-s", degerler: ["beyaz", "s"], satilabilir: true },
  { kimlik: "beyaz-m", degerler: ["beyaz", "m"], satilabilir: false },
  { kimlik: "siyah-s", degerler: ["siyah", "s"], satilabilir: false },
  { kimlik: "siyah-m", degerler: ["siyah", "m"], satilabilir: true },
  { kimlik: "siyah-l", degerler: ["siyah", "l"], satilabilir: true },
];
// Sunucuda çizilmiş bilgilerin yerine düz yazı: hangi birleşimin gösterildiği okunur.
const bilgi = (ad: string) => ({
  fiyat: `fiyat ${ad}`,
  stok: `stok ${ad}`,
  stokKodu: `kod ${ad}`,
});

const ciz = (
  ilkSecim: Secim,
  tukenmisSecenek: TukenmisSecenekGosterimi = "ustu-cizili",
  birimListesi: SecimBirimi[] = birimler,
  tukenmisSecilebilir = false,
  ilkTercih: Secim = [],
) =>
  render(
    <MetinSaglayici dil="tr">
      <UrunUstKismi
        urunAdi="Deneme"
        basliklar={null}
        kisaAciklama={null}
        altBilgi={null}
        eylemler={null}
        galeri={[]}
        anaGorselSirasi={undefined}
        secenekler={secenekler}
        birimler={birimListesi}
        ilkSecim={ilkSecim}
        ilkTercih={ilkTercih}
        bilgiler={Object.fromEntries(birimListesi.map((b) => [b.kimlik, bilgi(b.kimlik)]))}
        genelBilgi={bilgi("genel")}
        tukenmisSecenek={tukenmisSecenek}
        tukenmisSecilebilir={tukenmisSecilebilir}
      />
    </MetinSaglayici>,
  );

const radyolar = (grup: string) =>
  within(screen.getByRole("radiogroup", { name: grup }))
    .getAllByRole("radio")
    .map((r) => r.textContent);

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  window.history.replaceState(null, "", "/urun/deneme?utm_source=bulten");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("tükenmiş değer", () => {
  it("üstü çizili ayarında görünür ve seçilemez; birleşimi olmayan değer hiç görünmez", () => {
    ciz(["beyaz", "s"]);
    expect(radyolar("Beden")).toEqual(["S", `M${metin("vitrin.urunSayfasi.tukendiEki")}`]);
    expect(screen.getByRole("radio", { name: /^M/ }).getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText(metin("vitrin.urunSayfasi.tukenmisAciklamasi"))).toBeTruthy();
  });

  it("gizle ayarında görünmez, seçili tükenmiş değer (adresle) görünür", () => {
    ciz(["beyaz", "s"], "gizle");
    expect(radyolar("Beden")).toEqual(["S"]);
    cleanup();
    ciz(["beyaz", "m"], "gizle");
    expect(radyolar("Beden")).toEqual(["S", `M${metin("vitrin.urunSayfasi.tukendiEki")}`]);
    expect(screen.getByText("stok beyaz-m")).toBeTruthy();
  });
});

describe("seçim", () => {
  it("seçimsiz başlangıçta genel bilgi ve seçim isteği; seçilince birleşimin bilgisi ve adres", () => {
    ciz([undefined, undefined]);
    expect(screen.getByText("fiyat genel")).toBeTruthy();
    expect(screen.getByText(metin("vitrin.urunSayfasi.secimIstegi"))).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Siyah" }));
    expect(screen.getByText("fiyat genel")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "L" }));
    expect(screen.getByText("fiyat siyah-l")).toBeTruthy();
    expect(screen.getByText("kod siyah-l")).toBeTruthy();
    expect(screen.queryByText(metin("vitrin.urunSayfasi.secimIstegi"))).toBeNull();
    // Adresin öteki parametresi korunur.
    expect(window.location.search).toBe("?utm_source=bulten&secenek-renk=siyah&secenek-beden=l");
  });

  it("hiçbir birleşim satılamıyorsa seçim istenmez", () => {
    ciz(
      [undefined, undefined],
      "ustu-cizili",
      birimler.map((b) => ({ ...b, satilabilir: false })),
    );
    expect(screen.getByText("stok genel")).toBeTruthy();
    expect(screen.queryByText(metin("vitrin.urunSayfasi.secimIstegi"))).toBeNull();
  });

  it("tükenmiş değere tıklamak seçimi değiştirmez", () => {
    ciz(["beyaz", "s"]);
    fireEvent.click(screen.getByRole("radio", { name: /^M/ }));
    expect(screen.getByText("fiyat beyaz-s")).toBeTruthy();
    expect(window.location.search).toBe("?utm_source=bulten");
  });

  it("müşterinin seçtiği beden başka renkte yoksa değişir, o renge dönünce geri gelir", () => {
    ciz(["siyah", "m"]);
    fireEvent.click(screen.getByRole("radio", { name: "L" }));
    expect(screen.getByText("fiyat siyah-l")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Beyaz" }));
    expect(screen.getByText("fiyat beyaz-s")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Siyah" }));
    expect(screen.getByText("fiyat siyah-l")).toBeTruthy();
  });

  // Kart 0167: müşterinin elle seçtiği değer sessizce değişmez.
  it("tükenmiş değer seçilebilirken elle seçilen beden başka renkte tükenmişse korunur", () => {
    ciz(["siyah", "l"], "ustu-cizili", birimler, true);
    fireEvent.click(screen.getByRole("radio", { name: "M" }));
    fireEvent.click(screen.getByRole("radio", { name: "Beyaz" }));
    expect(screen.getByText("stok beyaz-m")).toBeTruthy();
    expect(window.location.search).toBe("?utm_source=bulten&secenek-renk=beyaz&secenek-beden=m");
    expect(screen.queryByText(/seçildi\.$/)).toBeNull();
  });

  it("sayfanın kendiliğinden seçtiği beden korunmaz: satılabilir bedene geçilir, satır yok", () => {
    ciz(["beyaz", "s"], "ustu-cizili", birimler, true);
    fireEvent.click(screen.getByRole("radio", { name: "Siyah" }));
    expect(screen.getByText("stok siyah-m")).toBeTruthy();
    expect(screen.queryByText(/seçildi\.$/)).toBeNull();
  });

  it("adresteki beden müşterinin seçimidir: renk değişince korunur", () => {
    ciz(["siyah", "m"], "ustu-cizili", birimler, true, ["siyah", "m"]);
    fireEvent.click(screen.getByRole("radio", { name: "Beyaz" }));
    expect(screen.getByText("stok beyaz-m")).toBeTruthy();
  });

  it("tükenmiş değer seçilemezken elle seçilen beden değişince satırla söylenir, ona dönünce kalkar", () => {
    ciz(["siyah", "l"]);
    fireEvent.click(screen.getByRole("radio", { name: "M" }));
    fireEvent.click(screen.getByRole("radio", { name: "Beyaz" }));
    expect(screen.getByText("fiyat beyaz-s")).toBeTruthy();
    const satir = screen.getByText(
      metin("vitrin.urunSayfasi.secimDegistiTukendi")
        .replace("{secenek}", "Beden")
        .replace("{eski}", "M")
        .replace("{yeni}", "S"),
    );
    // Satır stok bölgesindedir: ekran okuyucuya duyurulur.
    expect(satir.closest("[aria-live]")?.textContent).toContain("stok beyaz-s");
    fireEvent.click(screen.getByRole("radio", { name: "Siyah" }));
    expect(screen.getByText("fiyat siyah-m")).toBeTruthy();
    expect(screen.queryByText(/seçildi\.$/)).toBeNull();
  });
});
