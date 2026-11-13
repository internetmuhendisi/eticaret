// @vitest-environment jsdom
// Stoğa gelince haber ver formu ürün sayfasının üst kısmında (kart 0144, karar 0117):
// - Eklenti tükenmiş birim isterken tükenmiş değer seçilir ve form yalnız talep alınabilir seçili birimde görünür;
//   seçim satılabilir birime dönünce kalkar, geri gelince baştan kurulur. İstemezken (eklenti kapalı) tükenmiş değer
//   seçilemez, form yoktur.
// - Hesap durumu bilinmeden form çizilmez. Üye olmayan müşteri e-postayla, robot sorusundan sonra herkese açık uca
//   gönderir; bozuk adreste istek gitmez, hata alana bağlanır. Giriş yapmış müşteri e-posta yazmaz, müşteri ucuna
//   yalnız birimi gönderir. Üye olmayana kapalı sitede giriş bağlantısı seçimli sayfaya döner.
// - 422, 429 ve 401 cevaplarının kendi metni; başarıda teşekkür odağı alır.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MetinSaglayici } from "../../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../../metinler/metin.ts";
import { doldur } from "../../../moduller/eposta/sablon.ts";
import { hesapDurumunuSifirla } from "../../../vitrin/hesap-durumu.ts";
import type { Secim, SecimBirimi, SecimSecenegi } from "../../../vitrin/urun-sayfasi/secim.ts";
import { UrunUstKismi } from "../../../vitrin/urun-sayfasi/urun-ust.tsx";
import { StokBildirimiFormu } from "../form.tsx";

const metin = metinOkuyucu("tr");
const hesabimUcu = "/kapi/musteri/hesabim";
const herkeseAcikUc = "/kapi/herkese-acik/stok-bildirimi";
const musteriUcu = "/kapi/musteri/stok-bildirimi";
const baslik = metin("eklenti.stokBildirimi.form.baslik");

const secenekler: SecimSecenegi[] = [
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
const birimler: SecimBirimi[] = [
  { kimlik: "birim-s", degerler: ["s"], satilabilir: true },
  { kimlik: "birim-m", degerler: ["m"], satilabilir: false },
  { kimlik: "birim-l", degerler: ["l"], satilabilir: false },
];
const bilgi = (ad: string) => ({ fiyat: `fiyat ${ad}`, stok: `stok ${ad}`, stokKodu: null });

const ciz = (ilkSecim: Secim, { tukenmisSecilebilir = true, uyeOlmayan = true } = {}) =>
  render(
    <MetinSaglayici dil="tr">
      <UrunUstKismi
        urunAdi="Deneme"
        basliklar={null}
        kisaAciklama={null}
        altBilgi={null}
        eylemler={null}
        yuvalar={<StokBildirimiFormu birimler={["birim-m", "birim-l"]} uyeOlmayan={uyeOlmayan} />}
        galeri={[]}
        anaGorselSirasi={undefined}
        secenekler={secenekler}
        birimler={birimler}
        ilkSecim={ilkSecim}
        bilgiler={Object.fromEntries(birimler.map((b) => [b.kimlik, bilgi(b.kimlik)]))}
        genelBilgi={bilgi("genel")}
        tukenmisSecenek="ustu-cizili"
        tukenmisSecilebilir={tukenmisSecilebilir}
      />
    </MetinSaglayici>,
  );

const yanit = (durum: number, govde: unknown = { basarili: durum === 200, veri: {} }) =>
  new Response(JSON.stringify(govde), { status: durum });

// Uçlara giden istekler; cevap adrese göre. Robot sorusu 503 alır: cevap boş gider (uç taklit edildiği için yeter).
const ucuTaklitEt = (cevaplar: Record<string, () => Response>) =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async (hedef) => {
    const cevap = cevaplar[String(hedef)];
    return cevap === undefined ? new Response("", { status: 503 }) : cevap();
  });
const girissiz = () => yanit(401);
const girisli = () => yanit(200, { basarili: true, veri: { eposta: "uye@ornek.test" } });

const bekle = () => act(async () => {});
const kutu = () => screen.queryByRole("region", { name: baslik });
const gonder = async () => {
  const form = kutu()?.querySelector("form");
  if (form === null || form === undefined) throw new Error("Form yok.");
  await act(async () => {
    fireEvent.submit(form);
  });
};
const epostaYaz = (deger: string) => {
  const alan = kutu()?.querySelector('input[name="eposta"]');
  if (!(alan instanceof HTMLInputElement)) throw new Error("Alan yok.");
  fireEvent.change(alan, { target: { value: deger } });
  return alan;
};
const govdesi = (istek: ReturnType<typeof ucuTaklitEt>, adres: string) =>
  JSON.parse(
    String(istek.mock.calls.find(([hedef]) => String(hedef) === adres)?.[1]?.body),
  ) as Record<string, unknown>;

beforeEach(() => {
  hesapDurumunuSifirla();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  window.history.replaceState(null, "", "/urun/deneme");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("seçim ve görünürlük", () => {
  it("tükenmiş değer seçilir; form yalnız alınabilir seçili birimde, seçim değişince kalkar", async () => {
    ucuTaklitEt({ [hesabimUcu]: girissiz });
    ciz(["s"]);
    await bekle();
    expect(kutu()).toBeNull();
    const m = screen.getByRole("radio", { name: /^M/ });
    expect(m.getAttribute("aria-disabled")).toBeNull();
    expect(m.textContent).toBe(`M${metin("vitrin.urunSayfasi.tukendiEki")}`);
    fireEvent.click(m);
    await bekle();
    expect(screen.getByText("stok birim-m")).toBeTruthy();
    expect(kutu()).not.toBeNull();
    expect(window.location.search).toBe("?secenek-beden=m");
    fireEvent.click(screen.getByRole("radio", { name: "S" }));
    expect(kutu()).toBeNull();
  });

  it("eklenti tükenmiş birim istemezken tükenmiş değer seçilemez, form yoktur", async () => {
    ucuTaklitEt({ [hesabimUcu]: girissiz });
    ciz(["s"], { tukenmisSecilebilir: false });
    await bekle();
    const m = screen.getByRole("radio", { name: /^M/ });
    expect(m.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(m);
    expect(screen.getByText("stok birim-s")).toBeTruthy();
    expect(kutu()).toBeNull();
  });

  it("hesap durumu bilinmeden form çizilmez (başlık görünür, alan yok)", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => undefined));
    ciz(["m"]);
    expect(kutu()).not.toBeNull();
    expect(kutu()?.querySelector("form")).toBeNull();
  });
});

describe("üye olmayan müşteri", () => {
  it("bozuk adreste istek gitmez, hata alana bağlanır ve odaklanır; geçerli adres robot sorusundan sonra gider", async () => {
    const istek = ucuTaklitEt({ [hesabimUcu]: girissiz, [herkeseAcikUc]: () => yanit(200) });
    ciz(["m"]);
    await bekle();
    const alan = epostaYaz("bozuk");
    await gonder();
    expect(alan.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(alan);
    expect(istek.mock.calls.map(([hedef]) => String(hedef))).toEqual([hesabimUcu]);
    epostaYaz("  Ali@Ornek.TEST ");
    await gonder();
    expect(istek.mock.calls.map(([hedef]) => String(hedef))).toEqual([
      hesabimUcu,
      expect.stringMatching(/\/robot-sorusu$/),
      herkeseAcikUc,
    ]);
    expect(govdesi(istek, herkeseAcikUc)).toMatchObject({
      birim: "birim-m",
      eposta: "ali@ornek.test",
    });
    const tamam = await screen.findByText(metin("eklenti.stokBildirimi.form.tamam"));
    expect(document.activeElement).toBe(tamam);
    // Başka bir tükenmiş birime geçilince form o birim için baştan kurulur: teşekkür kalmaz.
    fireEvent.click(screen.getByRole("radio", { name: /^L/ }));
    await bekle();
    expect(screen.queryByText(metin("eklenti.stokBildirimi.form.tamam"))).toBeNull();
    expect(kutu()?.querySelector('input[name="eposta"]')).not.toBeNull();
  });

  it.each([
    [422, "eklenti.stokBildirimi.form.hataStokta"],
    [429, "eklenti.stokBildirimi.form.hataSinir"],
    [500, "eklenti.stokBildirimi.form.hataGenel"],
  ] as const)("%i cevabının kendi metni var", async (durum, anahtar) => {
    ucuTaklitEt({ [hesabimUcu]: girissiz, [herkeseAcikUc]: () => yanit(durum) });
    ciz(["m"]);
    await bekle();
    epostaYaz("ali@ornek.test");
    await gonder();
    expect(within(kutu() as HTMLElement).getByText(metin(anahtar))).toBeTruthy();
  });

  it("üye olmayana kapalıysa ya da uç 401 dönerse giriş bağlantısı seçimli sayfaya döner", async () => {
    window.history.replaceState(null, "", "/urun/deneme?secenek-beden=m");
    ucuTaklitEt({ [hesabimUcu]: girissiz });
    ciz(["m"], { uyeOlmayan: false });
    await bekle();
    expect(kutu()?.querySelector("form")).toBeNull();
    const baglanti = within(kutu() as HTMLElement).getByRole("link", {
      name: metin("eklenti.stokBildirimi.form.girisBaglantisi"),
    });
    expect(baglanti.getAttribute("href")).toBe(
      `/giris?${new URLSearchParams({ donus: "/urun/deneme?secenek-beden=m" })}`,
    );
    cleanup();
    hesapDurumunuSifirla();
    ucuTaklitEt({ [hesabimUcu]: girissiz, [herkeseAcikUc]: () => yanit(401) });
    ciz(["m"]);
    await bekle();
    epostaYaz("ali@ornek.test");
    await gonder();
    expect(
      within(kutu() as HTMLElement).getByRole("link", {
        name: metin("eklenti.stokBildirimi.form.girisBaglantisi"),
      }),
    ).toBeTruthy();
  });
});

describe("giriş yapmış müşteri", () => {
  it("e-posta yazmaz, hesabın adresi görünür; müşteri ucuna yalnız birim gider", async () => {
    const istek = ucuTaklitEt({ [hesabimUcu]: girisli, [musteriUcu]: () => yanit(200) });
    ciz(["m"]);
    await bekle();
    expect(kutu()?.querySelector('input[name="eposta"]')).toBeNull();
    expect(
      within(kutu() as HTMLElement).getByText(
        doldur(metin("eklenti.stokBildirimi.form.girisli"), { eposta: "uye@ornek.test" }),
      ),
    ).toBeTruthy();
    await gonder();
    expect(govdesi(istek, musteriUcu)).toEqual({ birim: "birim-m" });
    expect(istek.mock.calls.map(([hedef]) => String(hedef))).toEqual([hesabimUcu, musteriUcu]);
    expect(await screen.findByText(metin("eklenti.stokBildirimi.form.tamam"))).toBeTruthy();
  });
});
