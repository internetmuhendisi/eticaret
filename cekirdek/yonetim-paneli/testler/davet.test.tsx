// @vitest-environment jsdom
// Ekibe davetin ekranları (kart 0275, karar 0179). Uçlar sahte fetch ile verilir; uçtan uca akış tarayıcı testindedir
// (cekirdek/testler/uctan-uca/ekip.test.ts).
// - Davet penceresi: ilk rol seçili açılır; boş e-posta ve rolsüz gönderim alanın hatasını verir, istek gitmez;
//   gönderilen e-posta ve roller; sunucunun alan kodu alanın altında, alanı olmayan kodu özette; "Davet hazır"
//   bağlantıyı bir kez gösterir, odak bağlantıda, "Kopyala" panoya yazar, "Tamam" kapatır.
// - Daveti geri al: onay penceresinden sonra davetin kimliği gider.
// - Kabul formu: adreste anahtar yoksa istek gitmeden "geçersiz"; anahtar adresten silinir; davetin e-postası
//   değiştirilemez, roller ve mağaza açıklamada; boş ad ve kısa şifre istek göndermez; kabul kurulum ekranına geçer;
//   hesap-var kendi metniyle, öteki is-kurali "geçersiz" ekranıyla.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { davetAyari, sifreSiniri } from "../../kayitlar/oturum.ts";
import { doldur } from "../../metinler/doldur.ts";
import { MetinSaglayici } from "../../metinler/istemci-metni.tsx";
import { metinOkuyucu } from "../../metinler/metin.ts";
import { kurulumAdresi } from "../adresler.ts";
import { DavetKabulFormu } from "../davet-kabul-formu.tsx";
import { DavetEt, DavetiGeriAl } from "../ekip/davet.tsx";

const yenile = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: yenile }) }));

const metin = metinOkuyucu("tr");

// Radix'in onay kutusu boyutu ResizeObserver ile izler; jsdom'da yoktur.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const istekler: { adres: string; govde: Record<string, unknown> }[] = [];
let yanit: (adres: string) => Response;
beforeEach(() => {
  istekler.length = 0;
  yanit = () => Response.json({ basarili: true, veri: {} });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (adres: string, secenek?: RequestInit) => {
      istekler.push({ adres, govde: JSON.parse(String(secenek?.body ?? "{}")) });
      return yanit(adres);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
  window.sessionStorage.clear();
});

const sarmala = (cocuk: React.ReactNode) => <MetinSaglayici dil="tr">{cocuk}</MetinSaglayici>;
const hata = (durum: number, kod: string, ayrinti: { alan: string; kod: string }[] = []) =>
  Response.json({ basarili: false, hata: { kod, ayrinti } }, { status: durum });

const bagla = "https://deneme.example/yonetim/giris/davet#anahtar=abc";
const davetPenceresiniAc = () => {
  render(sarmala(<DavetEt roller={["gorevli", "siparis-gorevlisi", "icerik-editoru"]} />));
  fireEvent.click(screen.getByRole("button", { name: metin("yonetim.eylem.davetEt") }));
};
const epostaAlani = () =>
  screen.getByRole("textbox", { name: new RegExp(metin("yonetim.ekip.davet.eposta")) });
const rolKutusu = (kod: string) =>
  screen.getByRole("checkbox", { name: metin(`yonetim.rol.${kod}` as "yonetim.rol.gorevli") });
const gonder = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: metin("yonetim.ekip.davet.gonder") }));
  });
};

describe("davet penceresi", () => {
  it("ilk rol seçili; boş e-posta ve rolsüz gönderim alanın hatası, istek gitmez", async () => {
    davetPenceresiniAc();
    expect(rolKutusu("gorevli").getAttribute("aria-checked")).toBe("true");
    expect(rolKutusu("siparis-gorevlisi").getAttribute("aria-checked")).toBe("false");
    // Mağaza sahibi rolü sunulmaz.
    expect(screen.queryByRole("checkbox", { name: metin("yonetim.rol.magaza-sahibi") })).toBeNull();
    await gonder();
    expect(screen.getByText(metin("yonetim.ekip.hata.eposta-gecersiz"))).toBeTruthy();
    fireEvent.change(epostaAlani(), { target: { value: "ece@ornek.test" } });
    fireEvent.click(rolKutusu("gorevli"));
    await gonder();
    expect(screen.getByText(metin("yonetim.ekip.hata.rol-gerekli"))).toBeTruthy();
    expect(istekler).toEqual([]);
  });

  it("gönderir; bağlantı bir kez gösterilir, odak bağlantıda, kopyalanır, Tamam kapatır", async () => {
    const yaz = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: yaz },
      configurable: true,
    });
    yanit = () => Response.json({ basarili: true, veri: { kimlik: "k", baglanti: bagla } });
    davetPenceresiniAc();
    fireEvent.change(epostaAlani(), { target: { value: "Ece@Ornek.test" } });
    fireEvent.click(rolKutusu("icerik-editoru"));
    await gonder();
    expect(istekler).toEqual([
      {
        adres: "/kapi/yonetici/ekip-davet",
        govde: { eposta: "ece@ornek.test", roller: ["gorevli", "icerik-editoru"] },
      },
    ]);
    expect(
      screen.getByRole("heading", { name: metin("yonetim.ekip.davet.hazirBaslik") }),
    ).toBeTruthy();
    const alan = screen.getByRole("textbox", { name: metin("yonetim.ekip.davet.baglanti") });
    expect((alan as HTMLInputElement).value).toBe(bagla);
    expect((alan as HTMLInputElement).readOnly).toBe(true);
    expect(document.activeElement).toBe(alan);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: metin("yonetim.ekip.davet.kopyala") }));
    });
    expect(yaz).toHaveBeenCalledWith(bagla);
    fireEvent.click(screen.getByRole("button", { name: metin("yonetim.ekip.davet.tamam") }));
    expect(
      screen.queryByRole("textbox", { name: metin("yonetim.ekip.davet.baglanti") }),
    ).toBeNull();
    // Yeniden açılınca boş form gelir, bağlantı yoktur.
    fireEvent.click(screen.getByRole("button", { name: metin("yonetim.eylem.davetEt") }));
    expect((epostaAlani() as HTMLInputElement).value).toBe("");
  });

  it("yalnız rolü değiştirip Vazgeç'e basınca sorar; seçim geri dönünce sormadan kapanır", async () => {
    davetPenceresiniAc();
    const vazgec = () =>
      fireEvent.click(screen.getByRole("button", { name: metin("ortak.islem.vazgec") }));
    fireEvent.click(rolKutusu("icerik-editoru"));
    vazgec();
    expect(screen.getByText(metin("yonetim.bolumler.form.kaydedilmedi"))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: metin("yonetim.bolumler.form.don") }));
    fireEvent.click(rolKutusu("icerik-editoru"));
    vazgec();
    expect(
      screen.queryByRole("textbox", { name: new RegExp(metin("yonetim.ekip.davet.eposta")) }),
    ).toBeNull();
  });

  it("sunucunun alan kodu alanın altında, alanı olmayan kodu özette", async () => {
    davetPenceresiniAc();
    fireEvent.change(epostaAlani(), { target: { value: "ece@ornek.test" } });
    yanit = () => hata(422, "is-kurali", [{ alan: "eposta", kod: "davet-var" }]);
    await gonder();
    expect(epostaAlani().getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(metin("yonetim.ekip.hata.davet-var"))).toBeTruthy();
    yanit = () => hata(422, "is-kurali", [{ alan: "davet", kod: "davet-siniri" }]);
    await gonder();
    expect(screen.getAllByText(metin("yonetim.ekip.hata.davet-siniri")).length).toBeGreaterThan(0);
    expect(epostaAlani().getAttribute("aria-invalid")).not.toBe("true");
  });
});

describe("daveti geri al", () => {
  it("onaydan sonra davetin kimliği gider", async () => {
    render(sarmala(<DavetiGeriAl kimlik="d1" eposta="ece@ornek.test" />));
    fireEvent.click(
      screen.getByRole("button", {
        name: doldur(metin("yonetim.ekip.davet.geriAlAdi"), { eposta: "ece@ornek.test" }),
      }),
    );
    expect(istekler).toEqual([]);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: metin("yonetim.ekip.davet.geriAlOnay.onay") }),
      );
    });
    expect(istekler).toEqual([
      { adres: "/kapi/yonetici/ekip-davet-geri-al", govde: { kimlik: "d1" } },
    ]);
  });
});

describe("davet kabul formu", () => {
  const ciz = async (gec = vi.fn()) => {
    await act(async () => {
      render(sarmala(<DavetKabulFormu magaza="Deneme Dükkânı" gec={gec} />));
    });
    return gec;
  };
  const okumaYaniti = () =>
    Response.json({
      basarili: true,
      veri: { eposta: "ece@ornek.test", roller: ["gorevli", "siparis-gorevlisi"] },
    });
  const alan = (ad: string) => screen.getByLabelText(new RegExp(`^${ad}`));
  const devam = async () => {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: metin("yonetim.davet.gonder") }));
    });
  };

  it("adreste anahtar yoksa istek gitmeden geçersiz", async () => {
    await ciz();
    expect(
      screen.getByRole("heading", { name: metin("yonetim.davet.gecersizBaslik") }),
    ).toBeTruthy();
    expect(istekler).toEqual([]);
  });

  it("anahtar adresten silinir; e-posta değiştirilemez; boş ad ve kısa şifre istek göndermez; kabul kuruluma geçer", async () => {
    window.history.replaceState(null, "", "/yonetim/giris/davet#anahtar=abc");
    yanit = (adres) =>
      adres.endsWith("davet-oku") ? okumaYaniti() : Response.json({ basarili: true, veri: {} });
    const gec = await ciz();
    expect(window.location.hash).toBe("");
    expect(istekler).toEqual([
      { adres: "/kapi/herkese-acik/yonetici-davet-oku", govde: { anahtar: "abc" } },
    ]);
    const aciklama = doldur(metin("yonetim.davet.aciklama"), {
      magaza: "Deneme Dükkânı",
      roller: "Görevli, Sipariş görevlisi",
    });
    expect(
      screen.getByText((_, oge) => oge?.tagName === "P" && oge.textContent === aciklama),
    ).toBeTruthy();
    expect(screen.getByText("Görevli, Sipariş görevlisi").tagName).toBe("STRONG");
    const eposta = alan(metin("yonetim.davet.eposta")) as HTMLInputElement;
    expect(eposta.value).toBe("ece@ornek.test");
    expect(eposta.readOnly).toBe(true);

    fireEvent.change(alan(metin("yonetim.davet.sifre")), { target: { value: "kisa" } });
    await devam();
    expect(
      screen.getByText(
        doldur(metin("yonetim.davet.hataAd"), { enUzun: String(davetAyari.adEnUzun) }),
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        doldur(metin("yonetim.davet.hataSifre"), {
          enKisa: String(sifreSiniri.enKisa),
          enUzun: String(sifreSiniri.enUzun),
        }),
      ),
    ).toBeTruthy();
    expect(document.activeElement).toBe(alan(metin("yonetim.davet.ad")));
    expect(istekler).toHaveLength(1);

    fireEvent.change(alan(metin("yonetim.davet.ad")), { target: { value: "Ece Deniz" } });
    fireEvent.change(alan(metin("yonetim.davet.sifre")), {
      target: { value: "uzun-bir-deneme-sifresi" },
    });
    await devam();
    expect(istekler.at(-1)).toEqual({
      adres: "/kapi/herkese-acik/yonetici-davet-kabul",
      govde: { anahtar: "abc", ad: "Ece Deniz", sifre: "uzun-bir-deneme-sifresi" },
    });
    expect(gec).toHaveBeenCalledWith(kurulumAdresi);
  });

  it("hesap-var kendi metniyle; öteki is-kurali geçersiz ekranı", async () => {
    window.history.replaceState(null, "", "/yonetim/giris/davet#anahtar=abc");
    let kabul = hata(422, "is-kurali", [{ alan: "eposta", kod: "hesap-var" }]);
    yanit = (adres) => (adres.endsWith("davet-oku") ? okumaYaniti() : kabul);
    const gec = await ciz();
    fireEvent.change(alan(metin("yonetim.davet.ad")), { target: { value: "Ece" } });
    fireEvent.change(alan(metin("yonetim.davet.sifre")), {
      target: { value: "uzun-bir-deneme-sifresi" },
    });
    await devam();
    expect(screen.getByText(metin("yonetim.davet.hataHesapVar"))).toBeTruthy();
    kabul = hata(422, "is-kurali");
    await devam();
    expect(
      screen.getByRole("heading", { name: metin("yonetim.davet.gecersizBaslik") }),
    ).toBeTruthy();
    expect(gec).not.toHaveBeenCalled();
  });

  it("okuma is-kurali alırsa geçersiz; sınırda kendi metni", async () => {
    window.history.replaceState(null, "", "/yonetim/giris/davet#anahtar=abc");
    yanit = () => hata(422, "is-kurali");
    await ciz();
    expect(
      screen.getByRole("heading", { name: metin("yonetim.davet.gecersizBaslik") }),
    ).toBeTruthy();
    cleanup();
    window.history.replaceState(null, "", "/yonetim/giris/davet#anahtar=abc");
    yanit = () => hata(429, "istek-siniri");
    await ciz();
    expect(screen.getByText(metin("yonetim.davet.hataSinir"))).toBeTruthy();
  });
});
